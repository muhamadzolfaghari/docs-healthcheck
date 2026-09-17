import { HeadingNode, MarkdownLinkNode } from "../core/types.js";
import { extractHeadings } from "./headings.js";
import { extractLinks } from "./links.js";
import { extractAvailableAnchors } from "./anchors.js";

export interface ParsedMarkdownDocument {
  raw: string;
  headings: HeadingNode[];
  links: MarkdownLinkNode[];
  availableAnchors: Set<string>;
  hasTocMarkers: boolean;
  hasTocHeading: boolean;
  lineCount: number;
  wordCount: number;
}

/**
 * Parses a markdown document and extracts structured AST metadata
 */
export function parseMarkdown(markdown: string): ParsedMarkdownDocument {
  const headings = extractHeadings(markdown);
  const links = extractLinks(markdown);
  const availableAnchors = extractAvailableAnchors(markdown, headings);

  const hasTocMarkers = /<!--\s*(?:TOC\s+START|toc|START\s+doctoc|TOC)\s*-->/i.test(markdown);
  const hasTocHeading = headings.some(
    (h) => /^(table\s+of\s+contents|contents|toc|فهرست\s+مطالب|فهرست)$/i.test(h.text.trim())
  );

  const lines = markdown.split(/\r?\n/);
  const wordCount = markdown
    .replace(/[#*`_~[\]()<>!-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return {
    raw: markdown,
    headings,
    links,
    availableAnchors,
    hasTocMarkers,
    hasTocHeading,
    lineCount: lines.length,
    wordCount,
  };
}
