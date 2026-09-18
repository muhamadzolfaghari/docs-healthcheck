import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { runHealthCheck } from "../../src/core/engine.js";
import { createFixPlan } from "../../src/fixes/planner.js";
import { executeFixPlan } from "../../src/fixes/executor.js";

describe("Fix Executor Unit Tests", () => {
  const fixturesDir = path.resolve(__dirname, "../../fixtures");
  let tempDir = "";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-healthcheck-test-"));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("dry-run modifies zero files", () => {
    const src = path.join(fixturesDir, "fix-anchor");
    fs.cpSync(src, tempDir, { recursive: true });

    const beforeReport = runHealthCheck(tempDir);
    const plan = createFixPlan(beforeReport, tempDir);
    const result = executeFixPlan(plan, { dryRun: true }, tempDir);

    expect(result.dryRun).toBe(true);
    expect(result.applied.length).toBeGreaterThan(0);

    // Verify content on disk remains unchanged
    const readmeContent = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
    expect(readmeContent).toContain("#setupp");
  });

  it("applies safe fixes with safeOnly option", () => {
    const src = path.join(fixturesDir, "fix-anchor");
    fs.cpSync(src, tempDir, { recursive: true });

    const beforeReport = runHealthCheck(tempDir);
    const plan = createFixPlan(beforeReport, tempDir);
    const result = executeFixPlan(plan, { safeOnly: true }, tempDir);

    expect(result.applied.some((a) => a.proposal.ruleId === "anchor-broken")).toBe(true);

    const readmeContent = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
    expect(readmeContent).toContain("#setup");
    expect(readmeContent).not.toContain("#setupp");
  });

  it("prevents path traversal outside project root", () => {
    const src = path.join(fixturesDir, "already-clean");
    fs.cpSync(src, tempDir, { recursive: true });

    const plan = {
      target: ".",
      proposals: [
        {
          id: "malicious-proposal",
          ruleId: "malicious",
          file: "../escaped-file.md",
          safety: "safe" as const,
          confidence: "high" as const,
          title: "Malicious write",
          description: "Path traversal attempt",
          reason: "Security test",
          deterministic: true,
          operation: {
            type: "write-file" as const,
            file: "../escaped-file.md",
            content: "malicious",
            templateName: "escaped",
          },
        },
      ],
      summary: { safe: 1, confirm: 0, manual: 0, total: 1 },
    };

    const result = executeFixPlan(plan, { safeOnly: true }, tempDir);
    expect(result.applied[0].success).toBe(false);
    expect(result.applied[0].error).toContain("Security Violation");
  });
});
