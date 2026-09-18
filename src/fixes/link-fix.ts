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
 * Recursively find all files in a directory (excluding common ignored folders)
 */
function findFilesInDir(dir: string, baseDir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".git", "dist", ".docs-healthcheck"].includes(entry.name)) {
        files.push(...findFilesInDir(fullPath, baseDir));
      }
    } else if (entry.isFile()) {
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
}

/**
 * Plans deterministic repairs for broken relative file links, inline image sources, and reference definitions
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

  // Extract relative link from line: markdown link, image, reference definition, or HTML
  const linkRegex = /(?:!\[([^\]]*)\]\(([^)#\s]+)(?:#[^)]+)?\)|\[([^\]]+)\]\(([^)#\s]+)(?:#[^)]+)?\)|^[ \t]{0,3}\[([^\]]+)\]:\s*(\S+)|<a\b[^>]*\bhref=["']([^"'#]+)["']|<img\b[^>]*\bsrc=["']([^"'#]+)["'])/g;
  let match: RegExpExecArray | null;
  let brokenPath = "";

  while ((match = linkRegex.exec(targetLine)) !== null) {
    const rawPath = match[2] || match[4] || match[6] || match[7] || match[8];
    if (!rawPath) continue;
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://") || rawPath.startsWith("mailto:") || rawPath.startsWith("#")) {
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

  // Security check: Check if path traversal attempts to escape root
  const brokenRelDir = path.dirname(brokenPath);
  const brokenFileName = path.basename(brokenPath);
  const targetDirectoryAbs = path.resolve(currentFileDir, brokenRelDir);
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

  // Candidate matching strategy
  const candidates: { replacementRelPath: string; similarity: number }[] = [];
  const brokenBaseNoExt = brokenFileName.replace(/\.(md|markdown|txt|json|ts|js|png|jpg|jpeg|gif|svg)$/i, "").toLowerCase();

  // Strategy 1: Check target directory if it exists on disk
  if (fs.existsSync(targetDirectoryAbs) && fs.statSync(targetDirectoryAbs).isDirectory()) {
    const dirFiles = fs.readdirSync(targetDirectoryAbs).filter((f) => {
      return fs.statSync(path.join(targetDirectoryAbs, f)).isFile();
    });

    for (const f of dirFiles) {
      const candidateNoExt = f.replace(/\.(md|markdown|txt|json|ts|js|png|jpg|jpeg|gif|svg)$/i, "").toLowerCase();
      const candidateRelPath =
        brokenRelDir === "."
          ? `./${f}`
          : `${brokenRelDir}/${f}`.replace(/\\/g, "/");

      // Exact match without extension (e.g. missing .md) or case difference
      if (candidateNoExt === brokenBaseNoExt) {
        candidates.push({ replacementRelPath: candidateRelPath, similarity: 1.0 });
        continue;
      }

      const dist = levenshtein(brokenBaseNoExt, candidateNoExt);
      const maxLen = Math.max(brokenBaseNoExt.length, candidateNoExt.length);
      const sim = 1 - dist / maxLen;

      if (dist <= 2 && sim >= 0.75) {
        candidates.push({ replacementRelPath: candidateRelPath, similarity: sim });
      }
    }
  }

  // Strategy 2: If no candidate in targetDirectory, scan project workspace for unique matching filename
  if (candidates.length === 0 && fs.existsSync(baseDir)) {
    try {
      const allProjectFiles = findFilesInDir(baseDir, baseDir);
      const projectMatches: { relPath: string; similarity: number }[] = [];

      for (const relFile of allProjectFiles) {
        const basename = path.basename(relFile);
        const nameNoExt = basename.replace(/\.(md|markdown|txt|json|ts|js|png|jpg|jpeg|gif|svg)$/i, "").toLowerCase();

        // Compute relative path from current file's directory to the candidate
        const candidateAbs = path.resolve(baseDir, relFile);
        let relFromCurrent = path.relative(currentFileDir, candidateAbs).replace(/\\/g, "/");
        if (!relFromCurrent.startsWith(".")) {
          relFromCurrent = `./${relFromCurrent}`;
        }

        if (nameNoExt === brokenBaseNoExt) {
          projectMatches.push({ relPath: relFromCurrent, similarity: 1.0 });
        } else {
          const dist = levenshtein(brokenBaseNoExt, nameNoExt);
          const maxLen = Math.max(brokenBaseNoExt.length, nameNoExt.length);
          const sim = 1 - dist / maxLen;
          if (dist <= 2 && sim >= 0.8) {
            projectMatches.push({ relPath: relFromCurrent, similarity: sim });
          }
        }
      }

      // If exactly ONE file in the entire workspace matches, accept it
      if (projectMatches.length === 1) {
        candidates.push({ replacementRelPath: projectMatches[0].relPath, similarity: projectMatches[0].similarity });
      }
    } catch {
      // Ignore directory scan errors
    }
  }

  // Deterministic single candidate resolution
  if (candidates.length === 1) {
    const matched = candidates[0];
    const replacementPath = matched.replacementRelPath;
    const lineContentAfter = targetLine.replace(brokenPath, replacementPath);

    return {
      id: `link-missing-file:${fileResult.file}:${issue.line}:${brokenPath}`,
      ruleId: "link-missing-file",
      file: fileResult.file,
      safety: "safe",
      confidence: "high",
      title: `Fix file link "${brokenPath}" → "${replacementPath}"`,
      description: `Replace broken path with existing file (${replacementPath})`,
      reason: `File "${replacementPath}" exists and is an unambiguous single match`,
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

  // Ambiguous candidates or not found
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
        ? `Multiple potential file matches found: ${candidates.map((c) => c.replacementRelPath).join(", ")}`
        : `No matching file found for "${brokenPath}"`,
    before: brokenPath,
    line: issue.line,
    deterministic: false,
    operation: {
      type: "manual",
      file: fileResult.file,
      reason:
        candidates.length > 1
          ? `Ambiguous file matches: ${candidates.map((c) => c.replacementRelPath).join(", ")}`
          : "Referenced file does not exist",
      suggestions: candidates.map((c) => c.replacementRelPath),
    },
  };
}
