import { HeadingNode } from "../core/types.js";

/**
 * Extracts all valid anchor targets from headings and HTML tags throughout the markdown document.
 */
export function extractAvailableAnchors(markdown: string, headings: HeadingNode[]): Set<string> {
  const anchors = new Set<string>();

  // Add all heading slugs and custom anchors
  for (const h of headings) {
    if (h.slug) {
      anchors.add(h.slug.toLowerCase());
    }
    if (h.customAnchor) {
      anchors.add(h.customAnchor.toLowerCase());
    }
  }

  // Find all HTML elements with id or name attributes across the document
  const htmlIdRegex = /<(?:a|div|span|section|header|h\d)\b[^>]*\b(?:id|name)=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = htmlIdRegex.exec(markdown)) !== null) {
    const id = match[1].trim();
    if (id) {
      anchors.add(id.toLowerCase());
    }
  }

  return anchors;
}

/**
 * Checks if a target anchor exists within the available anchors set
 */
export function isAnchorValid(target: string, availableAnchors: Set<string>): boolean {
  const normalized = target.toLowerCase().trim();
  return availableAnchors.has(normalized);
}
