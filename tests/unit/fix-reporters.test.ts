import { describe, it, expect } from "vitest";
import { renderFixTerminalReport } from "../../src/reporters/fix-terminal.js";
import { renderFixJsonReport } from "../../src/reporters/fix-json.js";
import { renderFixMarkdownReport } from "../../src/reporters/fix-markdown.js";
import { renderRevertTerminalReport } from "../../src/reporters/revert-terminal.js";
import type {
  FixExecutionReport,
  FixProposal,
  RevertExecutionReport,
} from "../../src/fixes/types.js";
import type { RepoHealthReport } from "../../src/core/types.js";

const healthReport: RepoHealthReport = {
  score: 80,
  passed: true,
  totalErrors: 0,
  totalWarnings: 0,
  repoChecks: [],
  fileResults: [],
  summary: {
    scannedFiles: 1,
    totalHeadings: 2,
    totalLinks: 1,
  },
};

const safeProposal: FixProposal = {
  id: "anchor:README.md:3",
  ruleId: "anchor-broken",
  file: "README.md",
  safety: "safe",
  confidence: "high",
  title: "Fix broken anchor",
  description: "Replace the broken anchor with the unique matching heading.",
  reason: "A unique deterministic target exists.",
  before: "#instalation",
  after: "#installation",
  line: 3,
  deterministic: true,
  operation: {
    type: "replace-text",
    file: "README.md",
    line: 3,
    originalText: "#instalation",
    replacementText: "#installation",
    lineContentBefore: "[Install](#instalation)",
    lineContentAfter: "[Install](#installation)",
  },
};

const confirmProposal: FixProposal = {
  id: "heading:README.md:8",
  ruleId: "heading-hierarchy",
  file: "README.md",
  safety: "confirm",
  confidence: "high",
  title: "Normalize heading hierarchy",
  description: "Change H3 to H2.",
  reason: "The heading skips a level.",
  line: 8,
  deterministic: true,
  operation: {
    type: "replace-heading",
    file: "README.md",
    line: 8,
    originalHeading: "### Usage",
    replacementHeading: "## Usage",
  },
};

const manualProposal: FixProposal = {
  id: "link:README.md:12",
  ruleId: "link-missing-file",
  file: "README.md",
  safety: "manual",
  confidence: "low",
  title: "Resolve ambiguous link",
  description: "Multiple candidate files exist.",
  reason: "The target cannot be selected deterministically.",
  line: 12,
  deterministic: false,
  operation: {
    type: "manual",
    file: "README.md",
    reason: "Ambiguous target",
    suggestions: ["docs/guide.md", "docs/guide-v2.md"],
  },
};

function makeFixReport(dryRun = false): FixExecutionReport {
  return {
    target: ".",
    dryRun,
    beforeScore: 70,
    afterScore: 90,
    scoreDelta: 20,
    applied: [
      {
        proposal: safeProposal,
        success: true,
        diff: "-[Install](#instalation)\n+[Install](#installation)\n unchanged",
      },
      {
        proposal: confirmProposal,
        success: false,
        error: "Example failure",
      },
    ],
    skipped: [confirmProposal],
    manual: [manualProposal],
    changedFiles: ["README.md"],
    before: healthReport,
    after: { ...healthReport, score: 90 },
  };
}

describe("fix reporters", () => {
  it("renders a detailed live terminal repair report", () => {
    const output = renderFixTerminalReport(makeFixReport(false));

    expect(output).toContain("DOCUMENTATION HEALTH REPAIR REPORT");
    expect(output).toContain("LIVE REPAIR");
    expect(output).toContain("70/100");
    expect(output).toContain("90/100");
    expect(output).toContain("Fix broken anchor");
    expect(output).toContain("Example failure");
    expect(output).toContain("Skipped Confirmation-Required Changes");
    expect(output).toContain("Manual Action Required");
    expect(output).toContain("docs/guide-v2.md");
  });

  it("renders dry-run terminal output without mutating semantics", () => {
    const report = makeFixReport(true);
    report.scoreDelta = 0;
    report.afterScore = report.beforeScore;
    report.applied = [];

    const output = renderFixTerminalReport(report);

    expect(output).toContain("DRY-RUN PREVIEW");
    expect(output).toContain("No files were modified");
    expect(output).toContain("docs-healthcheck fix --yes");
  });

  it("renders structured JSON for applied, skipped, and manual proposals", () => {
    const parsed = JSON.parse(renderFixJsonReport(makeFixReport(false)));

    expect(parsed.beforeScore).toBe(70);
    expect(parsed.afterScore).toBe(90);
    expect(parsed.appliedCount).toBe(2);
    expect(parsed.skippedCount).toBe(1);
    expect(parsed.manualCount).toBe(1);
    expect(parsed.applied[0].ruleId).toBe("anchor-broken");
    expect(parsed.manual[0].reason).toContain("deterministically");
  });

  it("renders GitHub Markdown for live and dry-run reports", () => {
    const live = renderFixMarkdownReport(makeFixReport(false));
    const dry = renderFixMarkdownReport(makeFixReport(true));

    expect(live).toContain("Documentation Health Repair Report");
    expect(live).toContain("Applied Fixes");
    expect(live).toContain("Skipped Fixes");
    expect(live).toContain("Manual Action Required");
    expect(live).toContain("🟢 SAFE");
    expect(dry).toContain("Dry-Run Preview");
    expect(dry).toContain("Proposed Fixes");
  });

  it("renders revert reports for restored, removed, dry-run, and empty sessions", () => {
    const restored: RevertExecutionReport = {
      target: ".",
      dryRun: true,
      restoredFiles: ["README.md"],
      deletedFiles: ["CONTRIBUTING.md"],
      beforeScore: 92,
      afterScore: 72,
      scoreDelta: -20,
      message: "Previewing the last fix rollback.",
    };

    const empty: RevertExecutionReport = {
      target: ".",
      dryRun: false,
      restoredFiles: [],
      deletedFiles: [],
      beforeScore: 80,
      afterScore: 80,
      scoreDelta: 0,
      message: "No fix session exists.",
    };

    const restoredOutput = renderRevertTerminalReport(restored);
    const emptyOutput = renderRevertTerminalReport(empty);

    expect(restoredOutput).toContain("DOCUMENTATION HEALTH REVERT REPORT");
    expect(restoredOutput).toContain("DRY-RUN PREVIEW");
    expect(restoredOutput).toContain("README.md");
    expect(restoredOutput).toContain("CONTRIBUTING.md");
    expect(emptyOutput).toContain("No fix session exists.");
  });
});
