import path from "path";
import { RepoHealthReport } from "../core/types.js";
import { FixPlan, FixProposal } from "./types.js";
import { planTocFixes } from "./toc-fix.js";
import { planAnchorFix } from "./anchor-fix.js";
import { planLinkFix } from "./link-fix.js";
import { planHeadingFix } from "./heading-fix.js";
import { planTemplateFix } from "./template-fix.js";

export interface FixPlannerOptions {
  rootDir?: string;
}

/**
 * Creates a comprehensive, deterministic fix plan from a health check report
 */
export function createFixPlan(
  report: RepoHealthReport,
  rootDir = process.cwd(),
  _options: FixPlannerOptions = {}
): FixPlan {
  const proposals: FixProposal[] = [];
  const processedProposalIds = new Set<string>();

  // 1. File-level issue analysis & TOC synchronization
  for (const fileResult of report.fileResults) {
    // A. Check for stale managed TOC
    const tocProposals = planTocFixes(fileResult.file, rootDir);
    for (const p of tocProposals) {
      if (!processedProposalIds.has(p.id)) {
        processedProposalIds.add(p.id);
        proposals.push(p);
      }
    }

    // B. Check each detected issue
    for (const issue of fileResult.issues) {
      let proposal: FixProposal | null = null;

      if (issue.ruleId === "anchor-broken") {
        proposal = planAnchorFix(issue, fileResult, rootDir);
      } else if (issue.ruleId === "link-missing-file") {
        proposal = planLinkFix(issue, fileResult, rootDir);
      } else if (issue.ruleId === "heading-hierarchy") {
        proposal = planHeadingFix(issue, fileResult, rootDir);
      } else if (issue.ruleId === "heading-empty-section") {
        proposal = {
          id: `heading-empty-section:${fileResult.file}:${issue.line}`,
          ruleId: "heading-empty-section",
          file: fileResult.file,
          safety: "manual",
          confidence: "low",
          title: `Empty section on line ${issue.line}`,
          description: issue.message,
          reason: "Empty sections require author content or manual section deletion",
          line: issue.line,
          deterministic: false,
          operation: {
            type: "manual",
            file: fileResult.file,
            reason: "Documentation prose cannot be automatically fabricated",
            suggestions: [
              "Add meaningful documentation content under this heading",
              "Or delete the empty heading if it is no longer relevant",
            ],
          },
        };
      } else if (issue.ruleId === "heading-duplicate") {
        proposal = {
          id: `heading-duplicate:${fileResult.file}:${issue.line}`,
          ruleId: "heading-duplicate",
          file: fileResult.file,
          safety: "manual",
          confidence: "low",
          title: `Duplicate heading title on line ${issue.line}`,
          description: issue.message,
          reason: "Renaming headings requires author context to avoid semantic collisions",
          line: issue.line,
          deterministic: false,
          operation: {
            type: "manual",
            file: fileResult.file,
            reason: "Duplicate heading names must be disambiguated manually",
            suggestions: [
              "Add a unique qualifier to the heading text",
              'Or add a custom HTML anchor tag (<a id="unique-name">)',
            ],
          },
        };
      } else {
        proposal = {
          id: `${issue.ruleId}:${fileResult.file}:${issue.line}`,
          ruleId: issue.ruleId,
          file: fileResult.file,
          safety: "manual",
          confidence: "low",
          title: `Manual issue: ${issue.ruleId} on line ${issue.line}`,
          description: issue.message,
          reason: issue.suggestion || "Requires manual revision",
          line: issue.line,
          deterministic: false,
          operation: {
            type: "manual",
            file: fileResult.file,
            reason: issue.message,
            suggestions: issue.suggestion ? [issue.suggestion] : [],
          },
        };
      }

      if (proposal && !processedProposalIds.has(proposal.id)) {
        processedProposalIds.add(proposal.id);
        proposals.push(proposal);
      }
    }
  }

  // 2. Repository-level standards and template checks
  if (report.repoChecks && report.repoChecks.length > 0) {
    for (const check of report.repoChecks) {
      const templateProposal = planTemplateFix(check, rootDir);
      if (templateProposal && !processedProposalIds.has(templateProposal.id)) {
        processedProposalIds.add(templateProposal.id);
        proposals.push(templateProposal);
      }
    }
  }

  // Calculate summary counts
  let safeCount = 0;
  let confirmCount = 0;
  let manualCount = 0;

  for (const p of proposals) {
    if (p.safety === "safe") safeCount++;
    else if (p.safety === "confirm") confirmCount++;
    else manualCount++;
  }

  return {
    target: path.relative(process.cwd(), rootDir) || ".",
    proposals,
    summary: {
      safe: safeCount,
      confirm: confirmCount,
      manual: manualCount,
      total: proposals.length,
    },
  };
}
