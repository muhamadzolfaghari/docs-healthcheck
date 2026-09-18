import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  saveFixSession,
  readFixSession,
  hasFixSession,
  revertFixes,
  getManifestPath,
} from "../../src/fixes/revert.js";
import { executeFixPlan } from "../../src/fixes/executor.js";
import { createFixPlan } from "../../src/fixes/planner.js";
import { runHealthCheck } from "../../src/core/engine.js";

describe("Fix Revert Engine", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-healthcheck-revert-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should handle empty or nonexistent fix sessions gracefully", () => {
    expect(hasFixSession(tempDir)).toBe(false);
    expect(readFixSession(tempDir)).toBeNull();

    const report = revertFixes(tempDir);
    expect(report.restoredFiles.length).toBe(0);
    expect(report.deletedFiles.length).toBe(0);
    expect(report.message).toContain("No previous fix session found");
  });

  it("should save and restore modified files and delete newly created files", () => {
    const readmePath = path.join(tempDir, "README.md");
    const originalReadme = "# My Project\n\n[Install](#instalation)\n\n## Installation\n";
    fs.writeFileSync(readmePath, originalReadme, "utf8");

    const packageJsonPath = path.join(tempDir, "package.json");
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify({ name: "revert-test", version: "1.0.0" }, null, 2),
      "utf8"
    );

    // 1. Run healthcheck and fix
    const checkReport = runHealthCheck(tempDir);
    const plan = createFixPlan(checkReport, tempDir);
    const fixResult = executeFixPlan(plan, { yes: true }, tempDir);

    expect(fixResult.applied.length).toBeGreaterThan(0);
    expect(hasFixSession(tempDir)).toBe(true);

    const modifiedContent = fs.readFileSync(readmePath, "utf8");
    expect(modifiedContent).toContain("#installation");

    // 2. Preview revert in dry-run
    const dryRunReport = revertFixes(tempDir, { dryRun: true });
    expect(dryRunReport.dryRun).toBe(true);
    expect(dryRunReport.restoredFiles).toContain("README.md");
    // File content should still be the modified version
    expect(fs.readFileSync(readmePath, "utf8")).toBe(modifiedContent);

    // 3. Live revert
    const revertReport = revertFixes(tempDir);
    expect(revertReport.dryRun).toBe(false);
    expect(revertReport.restoredFiles).toContain("README.md");
    expect(hasFixSession(tempDir)).toBe(false);

    // File content should be restored exactly
    expect(fs.readFileSync(readmePath, "utf8")).toBe(originalReadme);
  });

  it("should remove newly created template files on revert", () => {
    const readmePath = path.join(tempDir, "README.md");
    fs.writeFileSync(readmePath, "# Clean Project\n\n## Overview\n\nClean docs.", "utf8");
    const packageJsonPath = path.join(tempDir, "package.json");
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify({ name: "template-revert-test", version: "1.0.0" }, null, 2),
      "utf8"
    );

    // Manually create plan for missing template
    const checkReport = runHealthCheck(tempDir);
    const plan = createFixPlan(checkReport, tempDir);
    const contributingProposal = plan.proposals.find((p) => p.file === "CONTRIBUTING.md");
    expect(contributingProposal).toBeDefined();

    // Accept and apply creating CONTRIBUTING.md
    const fixResult = executeFixPlan(
      plan,
      { acceptedProposalIds: [contributingProposal!.id] },
      tempDir
    );

    const contributingPath = path.join(tempDir, "CONTRIBUTING.md");
    expect(fs.existsSync(contributingPath)).toBe(true);

    // Revert fix
    const revertReport = revertFixes(tempDir);
    expect(revertReport.deletedFiles).toContain("CONTRIBUTING.md");
    expect(fs.existsSync(contributingPath)).toBe(false);
  });

  it("should create and clean up .bak files when --backup option is used", () => {
    const readmePath = path.join(tempDir, "README.md");
    const originalReadme = "# Project\n\n[Setup](#instalation)\n\n## Installation\n";
    fs.writeFileSync(readmePath, originalReadme, "utf8");

    const checkReport = runHealthCheck(tempDir);
    const plan = createFixPlan(checkReport, tempDir);
    executeFixPlan(plan, { yes: true, backup: true }, tempDir);

    const bakPath = `${readmePath}.bak`;
    expect(fs.existsSync(bakPath)).toBe(true);
    expect(fs.readFileSync(bakPath, "utf8")).toBe(originalReadme);

    // Reverting should restore file and remove .bak
    revertFixes(tempDir);
    expect(fs.readFileSync(readmePath, "utf8")).toBe(originalReadme);
    expect(fs.existsSync(bakPath)).toBe(false);
  });
});
