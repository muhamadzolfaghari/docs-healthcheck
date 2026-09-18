import { HeadingNode } from "../core/types.js";
import { cleanHeadingText, Slugger } from "./slug.js";

/**
 * Extracts all headings from markdown source text while properly
 * ignoring headings inside fenced code blocks and comments.
 */
export function extractHeadings(markdown: string): HeadingNode[] {
  const lines = markdown.split(/\r?\n/);
  const headings: HeadingNode[] = [];
  const slugger = new Slugger();

  let inCodeBlock = false;
  let codeFenceChar = "";
  let inHtmlComment = false;
  let inTocBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track TOC marker blocks
    if (!inCodeBlock) {
      if (/^\s*<!--\s*(?:TOC\s+START|toc|START\s+doctoc|TOC)\s*-->\s*$/i.test(line)) {
        inTocBlock = true;
        continue;
      }
      if (inTocBlock) {
        if (/<!--\s*(?:TOC\s+END|\/toc|END\s+doctoc|\/TOC)\s*-->/i.test(trimmed)) {
          inTocBlock = false;
        }
        continue;
      }
    }


    // Track HTML comment blocks
    if (!inCodeBlock) {
      if (trimmed.startsWith("<!--") && !trimmed.endsWith("-->")) {
        inHtmlComment = true;
        continue;
      }
      if (inHtmlComment) {
        if (trimmed.includes("-->")) {
          inHtmlComment = false;
        }
        continue;
      }
      if (trimmed.startsWith("<!--") && trimmed.endsWith("-->")) {
        continue;
      }
    }


    // Track fenced code blocks (``` or ~~~)
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

    // Check ATX headings: # Heading
    const atxMatch = line.match(/^(\s{0,3})(#{1,6})\s+(.+)$/);
    if (atxMatch) {
      const sharps = atxMatch[2];
      const level = sharps.length;
      let rawHeadingText = atxMatch[3].trim();

      // Remove trailing hashes (e.g. `## Heading ##`)
      rawHeadingText = rawHeadingText.replace(/\s+#+$/, "");

      // Check for inline HTML custom anchor <a id="custom-id"></a> or <a name="custom-id">
      let customAnchor: string | undefined;
      const anchorMatch = rawHeadingText.match(/<a\b[^>]*\b(?:id|name)=["']([^"']+)["'][^>]*>(?:<\/a>)?/i);
      if (anchorMatch) {
        customAnchor = anchorMatch[1];
      }

      const text = cleanHeadingText(rawHeadingText);
      const slug = slugger.slug(rawHeadingText, customAnchor);

      headings.push({
        level,
        raw: line,
        text,
        slug,
        line: i + 1,
        customAnchor,
      });
      continue;
    }

    // Check Setext headings (Line followed by === or ---)
    if (i < lines.length - 1 && trimmed.length > 0) {
      const nextLine = lines[i + 1].trim();
      const isSetextH1 = /^={2,}$/.test(nextLine);
      const isSetextH2 = /^-{2,}$/.test(nextLine);

      if ((isSetextH1 || isSetextH2) && !trimmed.startsWith("#")) {
        const level = isSetextH1 ? 1 : 2;
        let customAnchor: string | undefined;
        const anchorMatch = trimmed.match(/<a\b[^>]*\b(?:id|name)=["']([^"']+)["'][^>]*>(?:<\/a>)?/i);
        if (anchorMatch) {
          customAnchor = anchorMatch[1];
        }

        const text = cleanHeadingText(trimmed);
        const slug = slugger.slug(trimmed, customAnchor);

        headings.push({
          level,
          raw: `${line}\n${lines[i + 1]}`,
          text,
          slug,
          line: i + 1,
          customAnchor,
        });

        // Skip next line because it was the setext underline
        i++;
      }
    }
  }

  return headings;
}
