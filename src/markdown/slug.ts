/**
 * GitHub Flavored Markdown (GFM) compatible slug generator.
 * Supports Unicode, Persian/RTL characters, numbers, and emojis.
 */

/**
 * Remove markdown inline formatting, links, images, and HTML tags from heading text
 */
export function cleanHeadingText(raw: string): string {
  return raw
    // Remove custom anchors e.g. <a id="..."></a> or <a name="...">
    .replace(/<a\b[^>]*>(?:<\/a>)?/gi, "")
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Replace markdown links [text](url) with just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove inline code ticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove bold/italic asterisks & underscores
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // Remove strikethrough
    .replace(/~~(.*?)~~/g, "$1")
    // Strip other HTML tags
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Converts a string to a GitHub-compatible anchor slug
 */
export function slugify(text: string): string {
  const cleaned = cleanHeadingText(text);

  let slug = cleaned
    .toLowerCase()
    // Remove characters that are not letters, numbers, spaces, hyphens, or underscores
    .replace(/[^\p{L}\p{N}\s\-_]/gu, "")
    // Trim leading/trailing whitespace left by removed symbols
    .trim()
    // Replace whitespace with hyphens
    .replace(/\s/g, "-");

  return slug;
}

/**
 * Slugger class to maintain counts of duplicate heading slugs
 */
export class Slugger {
  private occurrences: Map<string, number> = new Map();

  public slug(text: string, customAnchor?: string): string {
    if (customAnchor && customAnchor.trim().length > 0) {
      return customAnchor.trim();
    }

    const baseSlug = slugify(text);
    const count = this.occurrences.get(baseSlug) ?? 0;
    this.occurrences.set(baseSlug, count + 1);

    if (count === 0) {
      return baseSlug;
    }

    return `${baseSlug}-${count}`;
  }

  public reset(): void {
    this.occurrences.clear();
  }
}
