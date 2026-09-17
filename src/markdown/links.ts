import { MarkdownLinkNode } from "../core/types.js";

/**
 * Extracts markdown links from document text, ignoring code blocks.
 */
export function extractLinks(markdown: string): MarkdownLinkNode[] {
  const lines = markdown.split(/\r?\n/);
  const links: MarkdownLinkNode[] = [];

  let inCodeBlock = false;
  let codeFenceChar = "";

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

    // Mask inline code blocks `...` so example links inside code spans are not parsed as real links
    const sanitizedLine = line.replace(/`[^`]+`/g, (code) => " ".repeat(code.length));

    // Match Markdown standard links: [text](href) but NOT images ![alt](href)
    // We regex match all links on this line
    const linkRegex = /(?<!!)(?:\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\))/g;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(sanitizedLine)) !== null) {
      const text = match[1];
      const href = match[2];
      const col = match.index + 1;

      // Skip empty or javascript links
      if (!href || href.startsWith("javascript:")) {
        continue;
      }

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

      links.push({
        raw: match[0],
        text,
        href,
        line: i + 1,
        col,
        isExternal,
        isLocalAnchor,
        isLocalFile,
        anchorTarget,
        filePath,
      });
    }

    // Also match HTML anchor links: <a href="#anchor">link</a> or <a href="./file.md">
    const htmlAnchorRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let htmlMatch: RegExpExecArray | null;
    while ((htmlMatch = htmlAnchorRegex.exec(line)) !== null) {
      const href = htmlMatch[1];
      const text = htmlMatch[2].replace(/<[^>]+>/g, "").trim();
      const col = htmlMatch.index + 1;

      if (!href || href.startsWith("javascript:")) {
        continue;
      }

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

      links.push({
        raw: htmlMatch[0],
        text: text || href,
        href,
        line: i + 1,
        col,
        isExternal,
        isLocalAnchor,
        isLocalFile,
        anchorTarget,
        filePath,
      });
    }
  }

  return links;
}
