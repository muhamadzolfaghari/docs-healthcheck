import { HeadingNode, TocOptions, TocResult } from "../core/types.js";
import { extractHeadings } from "./headings.js";

export const TOC_START_MARKERS = [
  "<!-- TOC START -->",
  "<!-- toc -->",
  "<!-- START doctoc -->",
  "<!-- TOC -->",
];

export const TOC_END_MARKERS = [
  "<!-- TOC END -->",
  "<!-- /toc -->",
  "<!-- END doctoc -->",
  "<!-- /TOC -->",
];

const DEFAULT_TOC_OPTIONS: Required<TocOptions> = {
  minDepth: 2,
  maxDepth: 6,
  ordered: false,
  includeTitle: true,
  title: "## Table of Contents",
  slugPrefix: "",
  indentSize: 2,
};

/**
 * Generates TOC markdown from a list of headings
 */
export function generateTocMarkdown(
  headings: HeadingNode[],
  options: TocOptions = {}
): string {
  const opts = { ...DEFAULT_TOC_OPTIONS, ...options };
  const filteredHeadings = headings.filter(
    (h) => h.level >= opts.minDepth && h.level <= opts.maxDepth
  );

  if (filteredHeadings.length === 0) {
    return "";
  }

  const lines: string[] = [];

  if (opts.includeTitle && opts.title) {
    lines.push(opts.title);
    lines.push("");
  }

  const baseLevel = Math.min(...filteredHeadings.map((h) => h.level));
  const countsByLevel = new Map<number, number>();

  for (const h of filteredHeadings) {
    const depth = h.level - baseLevel;
    const indent = " ".repeat(depth * opts.indentSize);
    const targetAnchor = opts.slugPrefix ? `${opts.slugPrefix}${h.slug}` : h.slug;

    if (opts.ordered) {
      const currentCount = (countsByLevel.get(h.level) ?? 0) + 1;
      countsByLevel.set(h.level, currentCount);

      // Reset deeper level counts
      for (const level of countsByLevel.keys()) {
        if (level > h.level) {
          countsByLevel.delete(level);
        }
      }

      lines.push(`${indent}${currentCount}. [${h.text}](#${targetAnchor})`);
    } else {
      lines.push(`${indent}- [${h.text}](#${targetAnchor})`);
    }
  }

  return lines.join("\n");
}

/**
 * Inserts or updates TOC in markdown content.
 * Checks for existing TOC markers (<!-- TOC START --> ... <!-- TOC END -->).
 */
export function updateTocInContent(
  content: string,
  options: TocOptions = {}
): TocResult {
  const headings = extractHeadings(content);
  const tocBody = generateTocMarkdown(headings, options);

  // Check if markers exist
  const markerRegex = /(<!--\s*(?:TOC\s+START|toc|START\s+doctoc|TOC)\s*-->)([\s\S]*?)(<!--\s*(?:TOC\s+END|\/toc|END\s+doctoc|\/TOC)\s*-->)/i;
  const match = content.match(markerRegex);

  if (match) {
    const startTag = match[1];
    const endTag = match[3];
    const replacement = `${startTag}\n\n${tocBody}\n\n${endTag}`;
    const updatedContent = content.replace(markerRegex, replacement);

    return {
      tocMarkdown: tocBody,
      updatedContent,
      inserted: true,
      headingsCount: headings.length,
    };
  }

  // If no markers exist, find insertion point (after first H1 or at the top)
  const lines = content.split(/\r?\n/);
  let insertIndex = 0;
  let firstH1Index = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*#\s+/.test(lines[i])) {
      firstH1Index = i;
      break;
    }
  }

  if (firstH1Index !== -1) {
    // Look for blank line after H1 or introductory paragraph
    insertIndex = firstH1Index + 1;
    // Advance past consecutive non-empty lines if needed or blank line
    if (insertIndex < lines.length && lines[insertIndex].trim() === "") {
      insertIndex++;
    }
  }

  const wrappedToc = `<!-- TOC START -->\n\n${tocBody}\n\n<!-- TOC END -->`;
  const updatedLines = [...lines];
  updatedLines.splice(insertIndex, 0, wrappedToc);

  return {
    tocMarkdown: tocBody,
    updatedContent: updatedLines.join("\n"),
    inserted: true,
    headingsCount: headings.length,
  };
}
