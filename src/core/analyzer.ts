import fs from "fs";
import path from "path";
import { parseMarkdown } from "../markdown/parser.js";
import { validateHeadings, validateLinksAndAnchors } from "./rules.js";
import { DocValidationResult, ValidationIssue, ValidationConfig } from "./types.js";

/**
 * Calculates a 0-100 quality score for an individual document based on issues
 */
export function calculateDocumentScore(
  issues: ValidationIssue[],
  hasHeadings: boolean,
  hasToc: boolean
): number {
  let score = 100;

  // Deduct for errors and warnings
  for (const issue of issues) {
    if (issue.severity === "error") {
      score -= 20;
    } else if (issue.severity === "warning") {
      score -= 10;
    } else if (issue.severity === "info") {
      score -= 3;
    }
  }

  // Deduct if document has no headings at all
  if (!hasHeadings) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Analyzes markdown content directly
 */
export function analyzeMarkdownContent(
  content: string,
  filePath = "README.md",
  baseDir = process.cwd(),
  _config: ValidationConfig = {}
): DocValidationResult {
  const doc = parseMarkdown(content);
  const headingIssues = validateHeadings(doc, filePath);
  const linkIssues = validateLinksAndAnchors(doc, filePath, baseDir);

  const issues = [...headingIssues, ...linkIssues];
  const hasHeadings = doc.headings.length > 0;
  const score = calculateDocumentScore(
    issues,
    hasHeadings,
    doc.hasTocMarkers || doc.hasTocHeading
  );

  const valid = issues.filter((i) => i.severity === "error").length === 0;

  return {
    file: filePath,
    valid,
    issues,
    headings: doc.headings,
    links: doc.links,
    tocFound: doc.hasTocMarkers || doc.hasTocHeading,
    score,
  };
}

/**
 * Analyzes a markdown file on disk
 */
export function analyzeMarkdownFile(
  filePath: string,
  config: ValidationConfig = {}
): DocValidationResult {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    return {
      file: filePath,
      valid: false,
      issues: [
        {
          ruleId: "link-missing-file",
          severity: "error",
          message: `File not found: ${filePath}`,
          file: filePath,
          line: 1,
        },
      ],
      headings: [],
      links: [],
      tocFound: false,
      score: 0,
    };
  }

  const content = fs.readFileSync(resolved, "utf8");
  return analyzeMarkdownContent(
    content,
    filePath,
    path.dirname(resolved),
    config
  );
}
