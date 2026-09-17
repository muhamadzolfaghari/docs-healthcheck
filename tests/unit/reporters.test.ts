import { describe, it, expect } from "vitest";
import { renderTerminalReport } from "../../src/reporters/terminal.js";
import { renderJsonReport } from "../../src/reporters/json.js";
import { renderMarkdownReport } from "../../src/reporters/markdown.js";
import { RepoHealthReport } from "../../src/core/types.js";

describe("Reporters", () => {
  const mockReport: RepoHealthReport = {
    score: 85,
    passed: true,
    totalErrors: 0,
    totalWarnings: 1,
    repoChecks: [
      {
        id: "readme",
        name: "README File",
        required: true,
        weight: 30,
        status: "found",
        message: "Found README.md",
      },
      {
        id: "contributing",
        name: "Contributing Guide",
        required: false,
        weight: 10,
        status: "warning",
        message: "Missing CONTRIBUTING.md",
      },
      {
        id: "license",
        name: "License File",
        required: true,
        weight: 20,
        status: "missing",
        message: "Missing LICENSE",
      },
    ],
    fileResults: [
      {
        file: "README.md",
        valid: true,
        score: 90,
        issues: [
          {
            ruleId: "heading-hierarchy",
            severity: "warning",
            message: "Heading hierarchy skipped",
            file: "README.md",
            line: 12,
            suggestion: "Change to H2",
          },
        ],
        headings: [],
        links: [],
        tocFound: true,
      },
    ],
    summary: {
      scannedFiles: 1,
      totalHeadings: 10,
      totalLinks: 5,
    },
  };

  it("renders terminal report with score and formatting", () => {
    const output = renderTerminalReport(mockReport);
    expect(output).toContain("DOCUMENTATION HEALTH REPORT");
    expect(output).toContain("85/100");
    expect(output).toContain("PASS");
    expect(output).toContain("README File");
    expect(output).toContain("Heading hierarchy skipped");
  });

  it("renders JSON report accurately", () => {
    const jsonStr = renderJsonReport(mockReport);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.score).toBe(85);
    expect(parsed.summary.scannedFiles).toBe(1);
  });

  it("renders Markdown report table", () => {
    const md = renderMarkdownReport(mockReport);
    expect(md).toContain("# Documentation Health Check Report");
    expect(md).toContain("`85/100`");
    expect(md).toContain("| **README File** |");
    expect(md).toContain("`heading-hierarchy`");
  });
});
