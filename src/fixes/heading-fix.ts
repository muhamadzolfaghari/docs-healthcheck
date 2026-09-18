import fs from "fs";
import path from "path";
import { DocValidationResult, ValidationIssue } from "../core/types.js";
import { FixProposal } from "./types.js";

/**
 * Plans repairs for heading hierarchy skips (CONFIRM safety)
 */
export function planHeadingFix(
  issue: ValidationIssue,
  fileResult: DocValidationResult,
  baseDir: string
): FixProposal | null {
  if (issue.ruleId !== "heading-hierarchy") return null;

  const resolved = path.isAbsolute(fileResult.file)
    ? fileResult.file
    : path.resolve(baseDir, fileResult.file);

  if (!fs.existsSync(resolved)) return null;

  const content = fs.readFileSync(resolved, "utf8");
  const lines = content.split(/\r?\n/);
  const targetLine = lines[issue.line - 1] || "";

  // Match heading line e.g. `### Heading Text`
  const headingMatch = /^(\s*)(#{1,6})(\s+)(.*)$/.exec(targetLine);
  if (!headingMatch) return null;

  const indent = headingMatch[1];
  const hashes = headingMatch[2];
  const space = headingMatch[3];
  const titleText = headingMatch[4];

  // Parse suggested level from issue suggestion, e.g. "Change heading level from H3 to H2"
  let targetLevel = hashes.length - 1;
  const levelMatch = /to H([1-6])/i.exec(issue.suggestion || "");
  if (levelMatch) {
    targetLevel = parseInt(levelMatch[1], 10);
  }

  const newHashes = "#".repeat(Math.max(1, targetLevel));
  const replacementHeading = `${indent}${newHashes}${space}${titleText}`;

  return {
    id: `heading-hierarchy:${fileResult.file}:${issue.line}`,
    ruleId: "heading-hierarchy",
    file: fileResult.file,
    safety: "confirm",
    confidence: "medium",
    title: `Adjust heading hierarchy on line ${issue.line}`,
    description: `Change heading level from H${hashes.length} to H${newHashes.length}: "${titleText}"`,
    reason: `Heading hierarchy was skipped (H${hashes.length}). Adjusting maintains consistent markdown structure.`,
    before: targetLine,
    after: replacementHeading,
    line: issue.line,
    deterministic: true,
    operation: {
      type: "replace-heading",
      file: fileResult.file,
      line: issue.line,
      originalHeading: targetLine,
      replacementHeading,
    },
  };
}
