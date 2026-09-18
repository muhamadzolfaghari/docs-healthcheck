import fs from "fs";
import path from "path";
import { DocValidationResult, ValidationIssue } from "../core/types.js";
import { FixProposal } from "./types.js";
import { parseMarkdown } from "../markdown/parser.js";
import { extractAvailableAnchors } from "../markdown/anchors.js";

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
 * Plans deterministic repairs for broken anchor issues
 */
export function planAnchorFix(
  issue: ValidationIssue,
  fileResult: DocValidationResult,
  baseDir: string
): FixProposal | null {
  if (issue.ruleId !== "anchor-broken") return null;

  const resolved = path.isAbsolute(fileResult.file)
    ? fileResult.file
    : path.resolve(baseDir, fileResult.file);

  if (!fs.existsSync(resolved)) return null;

  const content = fs.readFileSync(resolved, "utf8");
  const doc = parseMarkdown(content);
  const availableAnchors = Array.from(extractAvailableAnchors(content, doc.headings));

  // Extract the broken anchor target from the issue message or line
  const lines = content.split(/\r?\n/);
  const targetLine = lines[issue.line - 1] || "";
  
  // Find markdown links on this line: [text](#anchor)
  const linkRegex = /\[([^\]]+)\]\((#[^)]+)\)/g;
  let match: RegExpExecArray | null;
  let brokenHref = "";
  let brokenAnchor = "";

  while ((match = linkRegex.exec(targetLine)) !== null) {
    const href = match[2];
    const anchor = href.slice(1);
    if (!availableAnchors.includes(anchor.toLowerCase())) {
      brokenHref = href;
      brokenAnchor = anchor;
      break;
    }
  }

  if (!brokenAnchor) {
    // Fallback: match from issue message
    const msgMatch = /targeting non-existent anchor #([a-zA-Z0-9_-]+)/.exec(issue.message);
    if (msgMatch) {
      brokenAnchor = msgMatch[1];
      brokenHref = `#${brokenAnchor}`;
    }
  }

  if (!brokenAnchor) {
    return {
      id: `anchor-broken:${fileResult.file}:${issue.line}`,
      ruleId: "anchor-broken",
      file: fileResult.file,
      safety: "manual",
      confidence: "low",
      title: `Broken anchor on line ${issue.line}`,
      description: issue.message,
      reason: "Could not safely determine target link position",
      line: issue.line,
      deterministic: false,
      operation: {
        type: "manual",
        file: fileResult.file,
        reason: "Anchor link needs manual verification",
        suggestions: availableAnchors.map((a) => `#${a}`),
      },
    };
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
    const replacementHref = `#${bestCandidate.anchor}`;
    const lineContentAfter = targetLine.replace(brokenHref, replacementHref);

    return {
      id: `anchor-broken:${fileResult.file}:${issue.line}:${brokenAnchor}`,
      ruleId: "anchor-broken",
      file: fileResult.file,
      safety: "safe",
      confidence: "high",
      title: `Fix broken anchor "${brokenHref}" → "${replacementHref}"`,
      description: `Replace broken internal fragment with matching heading anchor #${bestCandidate.anchor}`,
      reason: `Heading #${bestCandidate.anchor} exists in the document and is an unambiguous match`,
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
        : "No matching heading anchor found in this document",
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
