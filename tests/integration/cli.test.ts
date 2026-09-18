import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

describe("CLI Integration Tests", () => {
  const binPath = path.resolve(__dirname, "../../bin/docs-healthcheck.js");
  const fixturesDir = path.resolve(__dirname, "../../fixtures");
  const healthyProject = path.join(fixturesDir, "healthy-project");
  const missingReadme = path.join(fixturesDir, "missing-readme");
  const brokenLinks = path.join(fixturesDir, "broken-links");
  const badHeadings = path.join(fixturesDir, "bad-headings");
  const missingLicense = path.join(fixturesDir, "missing-license");

  it("prints version", () => {
    const output = execSync(`node ${binPath} --version`, { encoding: "utf8" });
    expect(output.trim()).toBe("2.0.0");
  });

  it("evaluates healthy project with exit code 0", () => {
    const output = execSync(`node ${binPath} scan "${healthyProject}" --json`, {
      encoding: "utf8",
    });
    const parsed = JSON.parse(output);
    expect(parsed.passed).toBe(true);
    expect(parsed.totalErrors).toBe(0);
    expect(parsed.score).toBeGreaterThanOrEqual(80);
  });

  it("evaluates missing-readme fixture correctly", () => {
    try {
      execSync(`node ${binPath} scan "${missingReadme}" --json`, {
        encoding: "utf8",
      });
    } catch (err: any) {
      expect([1, 2]).toContain(err.status);
      const parsed = JSON.parse(err.stdout);
      const readmeCheck = parsed.repoChecks.find((c: any) => c.id === "readme");
      expect(readmeCheck.status).toBe("missing");
    }
  });

  it("evaluates broken-links fixture with exit code 2 (errors)", () => {
    try {
      execSync(`node ${binPath} scan "${brokenLinks}" --json`, {
        encoding: "utf8",
      });
      expect.unreachable();
    } catch (err: any) {
      expect(err.status).toBe(2);
      const parsed = JSON.parse(err.stdout);
      expect(parsed.passed).toBe(false);
      expect(parsed.totalErrors).toBeGreaterThan(0);
    }
  });

  it("evaluates bad-headings fixture and detects heading issues", () => {
    try {
      execSync(`node ${binPath} scan "${badHeadings}" --json`, {
        encoding: "utf8",
      });
    } catch (err: any) {
      const parsed = JSON.parse(err.stdout);
      const allIssues = parsed.fileResults.flatMap((f: any) => f.issues);
      expect(allIssues.some((i: any) => i.ruleId === "heading-multiple-h1")).toBe(true);
      expect(allIssues.some((i: any) => i.ruleId === "heading-hierarchy")).toBe(true);
      expect(allIssues.some((i: any) => i.ruleId === "heading-empty-section")).toBe(true);
    }
  });

  it("evaluates missing-license fixture correctly", () => {
    try {
      execSync(`node ${binPath} scan "${missingLicense}" --json`, {
        encoding: "utf8",
      });
    } catch (err: any) {
      const parsed = JSON.parse(err.stdout);
      const licenseCheck = parsed.repoChecks.find((c: any) => c.id === "license");
      expect(licenseCheck.status).toBe("missing");
    }
  });

  it("supports --markdown report output", () => {
    const output = execSync(`node ${binPath} scan "${healthyProject}" --markdown`, {
      encoding: "utf8",
    });
    expect(output).toContain("# Documentation Health Check Report");
    expect(output).toContain("Health Score:");
    expect(output).toContain("Repository Standards");
  });

  it("supports --verbose terminal output", () => {
    const output = execSync(`node ${binPath} scan "${healthyProject}" --verbose`, {
      encoding: "utf8",
    });
    expect(output).toContain("DOCUMENTATION HEALTH REPORT");
    expect(output).toContain("Health Score:");
  });

  it("generates TOC for a file using toc command", () => {
    const sampleMd = path.join(healthyProject, "README.md");
    const output = execSync(`node ${binPath} toc "${sampleMd}"`, {
      encoding: "utf8",
    });
    expect(output).toContain("Table of Contents");
    expect(output).toContain("[Installation](#installation)");
    expect(output).toContain("[Usage](#usage)");
  });
});
