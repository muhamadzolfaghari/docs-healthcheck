import fs from "fs";
import path from "path";
import { DocValidationResult, ValidationIssue } from "../core/types.js";
import { FixProposal } from "./types.js";

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
 * Plans deterministic repairs for broken relative file links
 */
export function planLinkFix(
  issue: ValidationIssue,
  fileResult: DocValidationResult,
  baseDir: string
): FixProposal | null {
  if (issue.ruleId !== "link-missing-file") return null;

  const currentFileAbs = path.isAbsolute(fileResult.file)
    ? fileResult.file
    : path.resolve(baseDir, fileResult.file);
  const currentFileDir = path.dirname(currentFileAbs);

  if (!fs.existsSync(currentFileAbs)) return null;

  const content = fs.readFileSync(currentFileAbs, "utf8");
  const lines = content.split(/\r?\n/);
  const targetLine = lines[issue.line - 1] || "";

  // Extract relative link from line or issue message
  const linkRegex = /\[([^\]]+)\]\(([^)#\s]+)(?:#[^)]+)?\)/g;
  let match: RegExpExecArray | null;
  let brokenPath = "";

  while ((match = linkRegex.exec(targetLine)) !== null) {
    const rawPath = match[2];
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://") || rawPath.startsWith("mailto:")) {
      continue;
    }
    const resolvedCandidate = path.resolve(currentFileDir, rawPath);
    if (!fs.existsSync(resolvedCandidate)) {
      brokenPath = rawPath;
      break;
    }
  }

  if (!brokenPath) {
    const msgMatch = /Referenced local file does not exist: "([^"]+)"/.exec(issue.message);
    if (msgMatch) {
      brokenPath = msgMatch[1];
    }
  }

  if (!brokenPath) {
    return {
      id: `link-missing-file:${fileResult.file}:${issue.line}`,
      ruleId: "link-missing-file",
      file: fileResult.file,
      safety: "manual",
      confidence: "low",
      title: `Broken file link on line ${issue.line}`,
      description: issue.message,
      reason: "Could not identify relative link target accurately",
      line: issue.line,
      deterministic: false,
      operation: {
        type: "manual",
        file: fileResult.file,
        reason: "Manual link inspection required",
        suggestions: [],
      },
    };
  }

  // Determine target directory and filename
  const brokenRelDir = path.dirname(brokenPath);
  const brokenFileName = path.basename(brokenPath);
  const targetDirectoryAbs = path.resolve(currentFileDir, brokenRelDir);

  // Security check: Target directory must remain within the base project directory
  const relativeToBase = path.relative(baseDir, targetDirectoryAbs);
  if (relativeToBase.startsWith("..") && !path.isAbsolute(relativeToBase)) {
    return {
      id: `link-missing-file:${fileResult.file}:${issue.line}:${brokenPath}`,
      ruleId: "link-missing-file",
      file: fileResult.file,
      safety: "manual",
      confidence: "low",
      title: `Path escape link "${brokenPath}"`,
      description: `Link escapes project root (${brokenPath})`,
      reason: "Security: Cannot automatically resolve paths outside project root",
      before: brokenPath,
      line: issue.line,
      deterministic: false,
      operation: {
        type: "manual",
        file: fileResult.file,
        reason: "Path escapes project boundary",
        suggestions: [],
      },
    };
  }

  if (!fs.existsSync(targetDirectoryAbs) || !fs.statSync(targetDirectoryAbs).isDirectory()) {
    return {
      id: `link-missing-file:${fileResult.file}:${issue.line}:${brokenPath}`,
      ruleId: "link-missing-file",
      file: fileResult.file,
      safety: "manual",
      confidence: "low",
      title: `Target directory missing for "${brokenPath}"`,
      description: issue.message,
      reason: `Directory "${brokenRelDir}" does not exist on disk`,
      before: brokenPath,
      line: issue.line,
      deterministic: false,
      operation: {
        type: "manual",
        file: fileResult.file,
        reason: `Directory "${brokenRelDir}" is missing`,
        suggestions: [],
      },
    };
  }

  // Scan target directory for candidate files
  const dirFiles = fs.readdirSync(targetDirectoryAbs).filter((f) => {
    return fs.statSync(path.join(targetDirectoryAbs, f)).isFile();
  });

  const brokenBaseNoExt = brokenFileName.replace(/\.(md|markdown|txt|json|ts|js)$/i, "").toLowerCase();
  const candidates: { file: string; similarity: number }[] = [];

  for (const f of dirFiles) {
    const candidateNoExt = f.replace(/\.(md|markdown|txt|json|ts|js)$/i, "").toLowerCase();
    
    // Exact match disregarding case or slight pluralization/typo
    if (candidateNoExt === brokenBaseNoExt) {
      candidates.push({ file: f, similarity: 1.0 });
      continue;
    }

    const dist = levenshtein(brokenBaseNoExt, candidateNoExt);
    const maxLen = Math.max(brokenBaseNoExt.length, candidateNoExt.length);
    const sim = 1 - dist / maxLen;

    if (dist <= 2 && sim >= 0.75) {
      candidates.push({ file: f, similarity: sim });
    }
  }

  if (candidates.length === 1) {
    const matchedFile = candidates[0].file;
    const replacementPath =
      brokenRelDir === "."
        ? `./${matchedFile}`
        : `${brokenRelDir}/${matchedFile}`.replace(/\\/g, "/");

    const lineContentAfter = targetLine.replace(brokenPath, replacementPath);

    return {
      id: `link-missing-file:${fileResult.file}:${issue.line}:${brokenPath}`,
      ruleId: "link-missing-file",
      file: fileResult.file,
      safety: "safe",
      confidence: "high",
      title: `Fix file link "${brokenPath}" → "${replacementPath}"`,
      description: `Replace broken link with existing file in ${brokenRelDir}/ (${matchedFile})`,
      reason: `File "${matchedFile}" exists in the directory and is an unambiguous single match`,
      before: brokenPath,
      after: replacementPath,
      line: issue.line,
      deterministic: true,
      operation: {
        type: "replace-text",
        file: fileResult.file,
        line: issue.line,
        originalText: brokenPath,
        replacementText: replacementPath,
        lineContentBefore: targetLine,
        lineContentAfter,
      },
    };
  }

  return {
    id: `link-missing-file:${fileResult.file}:${issue.line}:${brokenPath}`,
    ruleId: "link-missing-file",
    file: fileResult.file,
    safety: "manual",
    confidence: candidates.length > 1 ? "medium" : "low",
    title: `Broken file link "${brokenPath}" (Manual resolution required)`,
    description: issue.message,
    reason:
      candidates.length > 1
        ? `Multiple matching files found in ${brokenRelDir}/: ${candidates.map((c) => c.file).join(", ")}`
        : `No matching file found in ${brokenRelDir}/`,
    before: brokenPath,
    line: issue.line,
    deterministic: false,
    operation: {
      type: "manual",
      file: fileResult.file,
      reason:
        candidates.length > 1
          ? `Ambiguous file matches: ${candidates.map((c) => c.file).join(", ")}`
          : "Referenced file does not exist",
      suggestions: candidates.map((c) => `${brokenRelDir}/${c.file}`),
    },
  };
}
