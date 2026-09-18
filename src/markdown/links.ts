import { MarkdownLinkNode } from "../core/types.js";

/**
 * Parses target destination into anchor target and relative file path
 */
function parseHrefDetails(href: string): {
  isExternal: boolean;
  isLocalAnchor: boolean;
  isLocalFile: boolean;
  anchorTarget?: string;
  filePath?: string;
} {
  const isExternal = /^(https?:|mailto:|ftp:|data:|\/\/)/i.test(href);
  const isLocalAnchor = href.startsWith("#");
  const isLocalFile = !isExternal && !isLocalAnchor;

  let anchorTarget: string | undefined;
  let filePath: string | undefined;

  if (isLocalAnchor) {
    anchorTarget = decodeURIComponent(href.slice(1));
  } else if (isLocalFile) {
    const hashIdx = href.indexOf("#");
    if (hashIdx !== -1) {
      filePath = href.slice(0, hashIdx);
      anchorTarget = decodeURIComponent(href.slice(hashIdx + 1));
    } else {
      filePath = href;
    }
  }

  return {
    isExternal,
    isLocalAnchor,
    isLocalFile,
    anchorTarget,
    filePath,
  };
}

/**
 * Extracts markdown links, image sources, HTML references, and reference definitions from document text.
 */
export function extractLinks(markdown: string): MarkdownLinkNode[] {
  const lines = markdown.split(/\r?\n/);
  const links: MarkdownLinkNode[] = [];
  const refDefs = new Map<string, { href: string; line: number; raw: string }>();

  let inCodeBlock = false;
  let codeFenceChar = "";

  // Pass 1: Extract reference-style definitions [label]: href
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const codeBlockMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (codeBlockMatch) {
      const fence = codeBlockMatch[2];
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeFenceChar = fence[0];
      } else if (fence[0] === codeFenceChar && fence.length >= 3) {
        inCodeBlock = false;
        codeFenceChar = "";
      }
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    const refDefMatch = line.match(/^[ \t]{0,3}\[([^\]]+)\]:\s*(\S+)(?:\s+["'(].*["')])?/);
    if (refDefMatch) {
      const label = refDefMatch[1].trim().toLowerCase();
      const href = refDefMatch[2];
      refDefs.set(label, { href, line: i + 1, raw: refDefMatch[0] });

      const details = parseHrefDetails(href);
      links.push({
        raw: refDefMatch[0],
        text: refDefMatch[1],
        href,
        line: i + 1,
        col: line.indexOf(href) + 1,
        isReferenceDef: true,
        refLabel: label,
        ...details,
      });
    }
  }

  // Pass 2: Extract inline links, images, HTML anchors/images, and reference usages
  inCodeBlock = false;
  codeFenceChar = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check code blocks
    const codeBlockMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (codeBlockMatch) {
      const fence = codeBlockMatch[2];
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeFenceChar = fence[0];
      } else if (fence[0] === codeFenceChar && fence.length >= 3) {
        inCodeBlock = false;
        codeFenceChar = "";
      }
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    // Ignore reference definitions on this line since they were already recorded in Pass 1
    if (/^[ \t]{0,3}\[([^\]]+)\]:\s*(\S+)/.test(line)) {
      continue;
    }

    // Mask inline code spans `...`
    const sanitizedLine = line.replace(/`[^`]+`/g, (code) => " ".repeat(code.length));

    // 1. Standard Markdown links: [text](href) (excluding image ! prefix)
    const linkRegex = /(?<!!)(?:\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\))/g;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(sanitizedLine)) !== null) {
      const text = match[1];
      const href = match[2];
      const col = match.index + 1;

      if (!href || href.startsWith("javascript:")) {
        continue;
      }

      const details = parseHrefDetails(href);
      links.push({
        raw: match[0],
        text,
        href,
        line: i + 1,
        col,
        ...details,
      });
    }

    // 2. Markdown Images: ![alt](href)
    const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
    let imgMatch: RegExpExecArray | null;

    while ((imgMatch = imageRegex.exec(sanitizedLine)) !== null) {
      const alt = imgMatch[1];
      const href = imgMatch[2];
      const col = imgMatch.index + 1;

      if (!href || href.startsWith("javascript:")) {
        continue;
      }

      const details = parseHrefDetails(href);
      links.push({
        raw: imgMatch[0],
        text: alt || "image",
        href,
        line: i + 1,
        col,
        isImage: true,
        ...details,
      });
    }

    // 3. HTML anchor links: <a href="...">...</a>
    const htmlAnchorRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let htmlMatch: RegExpExecArray | null;
    while ((htmlMatch = htmlAnchorRegex.exec(line)) !== null) {
      const href = htmlMatch[1];
      const text = htmlMatch[2].replace(/<[^>]+>/g, "").trim();
      const col = htmlMatch.index + 1;

      if (!href || href.startsWith("javascript:")) {
        continue;
      }

      const details = parseHrefDetails(href);
      links.push({
        raw: htmlMatch[0],
        text: text || href,
        href,
        line: i + 1,
        col,
        ...details,
      });
    }

    // 4. HTML image tags: <img src="...">
    const htmlImgRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
    let htmlImgMatch: RegExpExecArray | null;
    while ((htmlImgMatch = htmlImgRegex.exec(line)) !== null) {
      const href = htmlImgMatch[1];
      const col = htmlImgMatch.index + 1;

      if (!href || href.startsWith("javascript:")) {
        continue;
      }

      const details = parseHrefDetails(href);
      links.push({
        raw: htmlImgMatch[0],
        text: "image",
        href,
        line: i + 1,
        col,
        isImage: true,
        ...details,
      });
    }

    // 5. Reference-style link usages: [text][ref-label]
    const refUsageRegex = /(?<!!)(?:\[([^\]]+)\]\[([^\]]*)\])/g;
    let refUsageMatch: RegExpExecArray | null;
    while ((refUsageMatch = refUsageMatch = refUsageRegex.exec(sanitizedLine)) !== null) {
      const text = refUsageMatch[1];
      const refLabel = (refUsageMatch[2] || text).trim().toLowerCase();
      const col = refUsageMatch.index + 1;

      const def = refDefs.get(refLabel);
      if (def) {
        const details = parseHrefDetails(def.href);
        links.push({
          raw: refUsageMatch[0],
          text,
          href: def.href,
          line: i + 1,
          col,
          refLabel,
          ...details,
        });
      }
    }
  }

  return links;
}
