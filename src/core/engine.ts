import fs from "fs";
import path from "path";
import { DocValidationResult, RepoHealthReport, ValidationConfig } from "./types.js";
import { analyzeMarkdownFile } from "./analyzer.js";
import { evaluateRepoHealth } from "../checks/repo-health.js";

const DEFAULT_IGNORE = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  "fixtures",
  "tests/fixtures",
];

/**
 * Recursively find all markdown files in directory
 */
export function findMarkdownFiles(
  dir: string,
  ignoreList: string[] = DEFAULT_IGNORE
): string[] {
  const mdFiles: string[] = [];

  function scan(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (ignoreList.includes(entry.name) || entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && /\.(md|markdown|mdown|mkd)$/i.test(entry.name)) {
        mdFiles.push(fullPath);
      }
    }
  }

  scan(dir);
  return mdFiles;
}

/**
 * Runs complete documentation health check on a target directory or file
 */
export function runHealthCheck(
  targetPath = ".",
  config: ValidationConfig = {}
): RepoHealthReport {
  const resolvedTarget = path.resolve(process.cwd(), targetPath);
  const isTargetFile =
    fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isFile();
  const rootDir = isTargetFile ? path.dirname(resolvedTarget) : resolvedTarget;

  const repoEvaluation = evaluateRepoHealth(rootDir);
  const fileResults: DocValidationResult[] = [];

  if (isTargetFile) {
    fileResults.push(analyzeMarkdownFile(resolvedTarget, config));
  } else {
    const mdFiles = findMarkdownFiles(rootDir, config.ignorePaths ?? DEFAULT_IGNORE);
    for (const f of mdFiles) {
      const rel = path.relative(rootDir, f);
      fileResults.push(analyzeMarkdownFile(f, config));
    }
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalHeadings = 0;
  let totalLinks = 0;
  let fileScoreSum = 0;

  for (const res of fileResults) {
    totalHeadings += res.headings.length;
    totalLinks += res.links.length;
    fileScoreSum += res.score;

    for (const issue of res.issues) {
      if (issue.severity === "error") {
        totalErrors++;
      } else if (issue.severity === "warning") {
        totalWarnings++;
      }
    }
  }

  const avgFileScore =
    fileResults.length > 0 ? fileScoreSum / fileResults.length : 100;
  
  // Composite score: 50% repository structural health, 50% markdown content validation quality
  const compositeScore = isTargetFile
    ? Math.round(fileResults[0]?.score ?? 0)
    : Math.round(repoEvaluation.score * 0.4 + avgFileScore * 0.6);

  const minScoreThreshold = config.minScore ?? 70;
  const passed =
    totalErrors === 0 &&
    (config.strict ? totalWarnings === 0 : true) &&
    compositeScore >= minScoreThreshold;

  return {
    score: compositeScore,
    passed,
    totalErrors,
    totalWarnings,
    repoChecks: isTargetFile ? [] : repoEvaluation.items,
    fileResults,
    summary: {
      scannedFiles: fileResults.length,
      totalHeadings,
      totalLinks,
    },
  };
}
