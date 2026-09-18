import fs from "fs";
import path from "path";
import { DocValidationResult, ValidationIssue } from "../core/types.js";
import { FixProposal } from "./types.js";
import { parseMarkdown } from "../markdown/parser.js";
import { extractAvailableAnchors } from "../markdown/anchors.js";
import { extractHeadings } from "../markdown/headings.js";

/**
 * Computes simple Levenshtein edit distance
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Plans deterministic repairs for broken anchor issues (local and cross-file)
 */
export function planAnchorFix(
  issue: ValidationIssue,
  fileResult: DocValidationResult,
  baseDir: string
): FixProposal | null {
  if (issue.ruleId !== "anchor-broken") return null;

  const currentFileAbs = path.isAbsolute(fileResult.file)
    ? fileResult.file
    : path.resolve(baseDir, fileResult.file);
  const currentFileDir = path.dirname(currentFileAbs);

  if (!fs.existsSync(currentFileAbs)) return null;

  const content = fs.readFileSync(currentFileAbs, "utf8");
  const lines = content.split(/\r?\n/);
  const targetLine = lines[issue.line - 1] || "";

  // Check if this is a cross-file anchor or a local anchor
  const crossFileMatch = /Cross-file anchor broken: "([^"]+)" target anchor #([a-zA-Z0-9_-]+) not found in ([^.]+)/i.exec(
    issue.message
  );

  let targetFileForAnchors = currentFileAbs;
  let brokenAnchor = "";
  let brokenHref = "";
  let targetFilePath = "";

  if (crossFileMatch) {
    brokenHref = crossFileMatch[1];
    brokenAnchor = crossFileMatch[2];
    const hashIdx = brokenHref.indexOf("#");
    if (hashIdx !== -1) {
      targetFilePath = brokenHref.slice(0, hashIdx);
      targetFileForAnchors = path.resolve(currentFileDir, targetFilePath);
    }
  } else {
    // Look for link in target line: [text](#anchor) or [text](./file.md#anchor) or [label]: #anchor
    const linkRegex = /(?:\[([^\]]+)\]\(([^)\s]+)\)|^[ \t]{0,3}\[([^\]]+)\]:\s*(\S+)|<a\b[^>]*\bhref=["']([^"']+)["'])/g;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(targetLine)) !== null) {
      const href = match[2] || match[4] || match[5];
      if (!href) continue;

      if (href.startsWith("#")) {
        brokenHref = href;
        brokenAnchor = href.slice(1);
        targetFileForAnchors = currentFileAbs;
        break;
      } else if (href.includes("#") && !href.startsWith("http://") && !href.startsWith("https://")) {
        const hashIdx = href.indexOf("#");
        targetFilePath = href.slice(0, hashIdx);
        brokenAnchor = href.slice(hashIdx + 1);
        brokenHref = href;
        targetFileForAnchors = path.resolve(currentFileDir, targetFilePath);
        break;
      }
    }

    if (!brokenAnchor) {
      const msgMatch = /targeting non-existent anchor #([a-zA-Z0-9_-]+)/.exec(issue.message);
      if (msgMatch) {
        brokenAnchor = msgMatch[1];
        brokenHref = `#${brokenAnchor}`;
        targetFileForAnchors = currentFileAbs;
      }
    }
  }

  if (!brokenAnchor || !fs.existsSync(targetFileForAnchors)) {
    return {
      id: `anchor-broken:${fileResult.file}:${issue.line}`,
      ruleId: "anchor-broken",
      file: fileResult.file,
      safety: "manual",
      confidence: "low",
      title: `Broken anchor on line ${issue.line}`,
      description: issue.message,
      reason: "Could not safely locate anchor destination file",
      line: issue.line,
      deterministic: false,
      operation: {
        type: "manual",
        file: fileResult.file,
        reason: "Anchor link needs manual verification",
        suggestions: [],
      },
    };
  }

  // Extract available anchors from the target file
  let availableAnchors: string[] = [];
  if (targetFileForAnchors === currentFileAbs) {
    const doc = parseMarkdown(content);
    availableAnchors = Array.from(extractAvailableAnchors(content, doc.headings));
  } else {
    try {
      const targetContent = fs.readFileSync(targetFileForAnchors, "utf8");
      const targetHeadings = extractHeadings(targetContent);
      availableAnchors = Array.from(extractAvailableAnchors(targetContent, targetHeadings));
    } catch {
      availableAnchors = [];
    }
  }

  // Find candidate matches among available anchors
  const normalizedTarget = brokenAnchor.toLowerCase().replace(/[-_]/g, "");
  const candidates: { anchor: string; score: number; exactNormalized: boolean }[] = [];

  for (const anchor of availableAnchors) {
    const normAnchor = anchor.toLowerCase().replace(/[-_]/g, "");
    if (normAnchor === normalizedTarget) {
      candidates.push({ anchor, score: 100, exactNormalized: true });
      continue;
    }

    const dist = levenshtein(brokenAnchor.toLowerCase(), anchor.toLowerCase());
    const maxLen = Math.max(brokenAnchor.length, anchor.length);
    const similarity = 1 - dist / maxLen;

    if (dist <= 2 && similarity >= 0.75) {
      candidates.push({ anchor, score: similarity * 100, exactNormalized: false });
    }
  }

  // Exactly ONE strong deterministic candidate
  if (candidates.length === 1) {
    const bestCandidate = candidates[0];
    const replacementHref = targetFilePath
      ? `${targetFilePath}#${bestCandidate.anchor}`
      : `#${bestCandidate.anchor}`;
    const lineContentAfter = targetLine.replace(brokenHref, replacementHref);

    return {
      id: `anchor-broken:${fileResult.file}:${issue.line}:${brokenAnchor}`,
      ruleId: "anchor-broken",
      file: fileResult.file,
      safety: "safe",
      confidence: "high",
      title: `Fix broken anchor "${brokenHref}" → "${replacementHref}"`,
      description: `Replace broken fragment with matching heading anchor #${bestCandidate.anchor}`,
      reason: `Heading #${bestCandidate.anchor} exists in ${path.basename(targetFileForAnchors)} and is an unambiguous match`,
      before: brokenHref,
      after: replacementHref,
      line: issue.line,
      deterministic: true,
      operation: {
        type: "replace-text",
        file: fileResult.file,
        line: issue.line,
        originalText: brokenHref,
        replacementText: replacementHref,
        lineContentBefore: targetLine,
        lineContentAfter,
      },
    };
  }

  // Ambiguous or zero candidates
  return {
    id: `anchor-broken:${fileResult.file}:${issue.line}:${brokenAnchor}`,
    ruleId: "anchor-broken",
    file: fileResult.file,
    safety: "manual",
    confidence: candidates.length > 1 ? "medium" : "low",
    title: `Broken anchor "${brokenHref}" (Manual resolution required)`,
    description: issue.message,
    reason:
      candidates.length > 1
        ? `Multiple potential heading targets found: ${candidates.map((c) => `#${c.anchor}`).join(", ")}`
        : `No matching heading anchor found in ${path.basename(targetFileForAnchors)}`,
    before: brokenHref,
    line: issue.line,
    deterministic: false,
    operation: {
      type: "manual",
      file: fileResult.file,
      reason:
        candidates.length > 1
          ? `Ambiguous anchor matches: ${candidates.map((c) => `#${c.anchor}`).join(", ")}`
          : "No corresponding heading exists",
      suggestions: candidates.length > 0 ? candidates.map((c) => `#${c.anchor}`) : availableAnchors.map((a) => `#${a}`),
    },
  };
}
