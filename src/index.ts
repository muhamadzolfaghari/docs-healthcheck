import fs from "fs";
import path from "path";
import {
  DocValidationResult,
  HeadingNode,
  MarkdownLinkNode,
  RepoHealthReport,
  TocOptions,
  TocResult,
  ValidationConfig,
} from "./core/types.js";
import { runHealthCheck } from "./core/engine.js";
import { analyzeMarkdownContent, analyzeMarkdownFile } from "./core/analyzer.js";
import { generateTocMarkdown, updateTocInContent } from "./markdown/toc.js";
import { extractHeadings } from "./markdown/headings.js";
import { extractLinks } from "./markdown/links.js";
import { extractAvailableAnchors } from "./markdown/anchors.js";
import { parseMarkdown, ParsedMarkdownDocument } from "./markdown/parser.js";
import { slugify, Slugger } from "./markdown/slug.js";
import { evaluateRepoHealth } from "./checks/repo-health.js";
import { createFixPlan } from "./fixes/planner.js";
import { executeFixPlan } from "./fixes/executor.js";
import { revertFixes, hasFixSession, readFixSession } from "./fixes/revert.js";
import { RevertExecutionOptions } from "./fixes/types.js";


/**
 * Programmatic API for checking documentation health of a repository or file
 */
export function checkDocumentation(
  targetPath = ".",
  config: ValidationConfig = {}
): RepoHealthReport {
  return runHealthCheck(targetPath, config);
}

/**
 * Programmatic API for validating markdown content or file
 */
export function validateMarkdown(
  input: string,
  options: { isFile?: boolean; filePath?: string; config?: ValidationConfig } = {}
): DocValidationResult {
  if (options.isFile) {
    return analyzeMarkdownFile(input, options.config);
  }
  return analyzeMarkdownContent(
    input,
    options.filePath ?? "README.md",
    process.cwd(),
    options.config
  );
}

/**
 * Programmatic API for generating a Table of Contents from markdown or headings
 */
export function generateToc(
  input: string | HeadingNode[],
  options: TocOptions = {}
): string {
  if (Array.isArray(input)) {
    return generateTocMarkdown(input, options);
  }
  const headings = extractHeadings(input);
  return generateTocMarkdown(headings, options);
}

/**
 * Programmatic API for updating TOC within markdown content in-place
 */
export function updateToc(
  content: string,
  options: TocOptions = {}
): TocResult {
  return updateTocInContent(content, options);
}

/**
 * Programmatic API for fixing documentation issues
 */
export function fixDocumentation(
  targetPath = ".",
  options: {
    dryRun?: boolean;
    yes?: boolean;
    safeOnly?: boolean;
    minScore?: number;
    verbose?: boolean;
    backup?: boolean;
    acceptedProposalIds?: string[];
  } = {}
) {
  const resolvedTarget = path.resolve(process.cwd(), targetPath);
  const report = runHealthCheck(resolvedTarget, { minScore: options.minScore });
  const plan = createFixPlan(report, resolvedTarget);
  return executeFixPlan(plan, options, resolvedTarget);
}

/**
 * Programmatic API for reverting the last fix session
 */
export function revertDocumentation(
  targetPath = ".",
  options: RevertExecutionOptions = {}
) {
  return revertFixes(targetPath, options);
}

// Export all core types and functions
export * from "./core/types.js";
export * from "./core/engine.js";
export * from "./core/analyzer.js";
export * from "./core/rules.js";
export * from "./core/rule-catalog.js";
export * from "./markdown/slug.js";
export * from "./markdown/headings.js";
export * from "./markdown/anchors.js";
export * from "./markdown/links.js";
export * from "./markdown/parser.js";
export * from "./markdown/toc.js";
export * from "./checks/repo-health.js";
export * from "./fixes/types.js";
export * from "./fixes/planner.js";
export * from "./fixes/executor.js";
export * from "./fixes/revert.js";
export * from "./fixes/diff.js";
export * from "./reporters/terminal.js";
export * from "./reporters/json.js";
export * from "./reporters/markdown.js";
export * from "./reporters/fix-terminal.js";
export * from "./reporters/fix-json.js";
export * from "./reporters/fix-markdown.js";
export * from "./reporters/revert-terminal.js";


