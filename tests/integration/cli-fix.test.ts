import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

describe("CLI Fix Integration Tests", () => {
  const binPath = path.resolve(__dirname, "../../bin/docs-healthcheck.js");
  const demoFixable = path.resolve(__dirname, "../../demo/fixable-docs");
  let tempDir = "";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-healthcheck-cli-test-"));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("runs fix with --dry-run without modifying files", () => {
    fs.cpSync(demoFixable, tempDir, { recursive: true });

    const output = execSync(`node ${binPath} fix "${tempDir}" --dry-run`, {
      encoding: "utf8",
    });

    expect(output).toContain("DOCUMENTATION HEALTH REPAIR REPORT");
    expect(output).toContain("DRY-RUN PREVIEW");
    expect(output).toContain("Proposed Repairs to Apply");

    // File content should remain original
    const content = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
    expect(content).toContain("#instalation");
  });

  it("applies safe repairs with --yes and improves health score", () => {
    fs.cpSync(demoFixable, tempDir, { recursive: true });

    const output = execSync(`node ${binPath} fix "${tempDir}" --yes`, {
      encoding: "utf8",
    });

    expect(output).toContain("LIVE REPAIR");
    expect(output).toContain("Applied Repairs");

    const content = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
    expect(content).toContain("#installation");
    expect(content).toContain("./docs/guide-docs.md");
  });

  it("is idempotent on consecutive fix executions", () => {
    fs.cpSync(demoFixable, tempDir, { recursive: true });

    // First execution
    execSync(`node ${binPath} fix "${tempDir}" --yes`);

    // Second execution must apply 0 changes
    const outputSecond = execSync(`node ${binPath} fix "${tempDir}" --yes --json`, {
      encoding: "utf8",
    });
    const parsedSecond = JSON.parse(outputSecond);
    expect(parsedSecond.appliedCount).toBe(0);
    expect(parsedSecond.changedFiles.length).toBe(0);
  });

  it("supports --json output mode", () => {
    fs.cpSync(demoFixable, tempDir, { recursive: true });

    const output = execSync(`node ${binPath} fix "${tempDir}" --dry-run --json`, {
      encoding: "utf8",
    });

    const parsed = JSON.parse(output);
    expect(parsed.dryRun).toBe(true);
    expect(Array.isArray(parsed.applied)).toBe(true);
    expect(parsed.applied.length).toBeGreaterThan(0);
  });

  it("supports --markdown output mode", () => {
    fs.cpSync(demoFixable, tempDir, { recursive: true });

    const output = execSync(`node ${binPath} fix "${tempDir}" --dry-run --markdown`, {
      encoding: "utf8",
    });

    expect(output).toContain("## 🛠️ Documentation Health Repair Plan");
    expect(output).toContain("| File | Issue / Action | Safety | Details |");
  });

  it("supports root alias --fix option", () => {
    fs.cpSync(demoFixable, tempDir, { recursive: true });

    const output = execSync(`node ${binPath} "${tempDir}" --fix --dry-run`, {
      encoding: "utf8",
    });

    expect(output).toContain("DOCUMENTATION HEALTH REPAIR REPORT");
    expect(output).toContain("DRY-RUN PREVIEW");
  });

  it("supports fix revert workflow via fix revert and revert commands", () => {
    fs.cpSync(demoFixable, tempDir, { recursive: true });
    const originalReadme = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");

    // Apply fixes
    execSync(`node ${binPath} fix "${tempDir}" --yes`);
    const modifiedReadme = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
    expect(modifiedReadme).toContain("#installation");

    // Dry-run revert
    const dryRunOutput = execSync(`node ${binPath} revert "${tempDir}" --dry-run`, {
      encoding: "utf8",
    });
    expect(dryRunOutput).toContain("DOCUMENTATION HEALTH REVERT REPORT");
    expect(dryRunOutput).toContain("DRY-RUN PREVIEW");
    expect(fs.readFileSync(path.join(tempDir, "README.md"), "utf8")).toBe(modifiedReadme);

    // Live revert via fix revert
    const revertOutput = execSync(`node ${binPath} fix revert "${tempDir}"`, {
      encoding: "utf8",
    });
    expect(revertOutput).toContain("DOCUMENTATION HEALTH REVERT REPORT");
    expect(revertOutput).toContain("Restored Files:");
    expect(revertOutput).toContain("README.md");

    // File content should match original
    expect(fs.readFileSync(path.join(tempDir, "README.md"), "utf8")).toBe(originalReadme);
  });
});

