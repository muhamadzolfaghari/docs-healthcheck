/**
 * Simple unified line-diff utility for repair previews
 */
export function formatLineDiff(before: string, after: string): string {
  return `-${before}\n+${after}`;
}

export function formatInlineReplacementDiff(
  fullLine: string,
  targetSubstring: string,
  replacementSubstring: string
): string {
  const beforeLine = fullLine;
  const afterLine = fullLine.replace(targetSubstring, replacementSubstring);
  return `-${beforeLine}\n+${afterLine}`;
}
