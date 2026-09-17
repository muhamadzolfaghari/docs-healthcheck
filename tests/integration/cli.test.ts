import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

describe("CLI Integration Tests", () => {
  const binPath = path.resolve(__dirname, "../../bin/docs-healthcheck.js");
  const cleanDoc = path.resolve(__dirname, "../fixtures/clean-doc.md");
  const brokenDoc = path.resolve(__dirname, "../fixtures/broken-doc.md");

  it("prints version", () => {
    const output = execSync(`node ${binPath} --version`, { encoding: "utf8" });
    expect(output.trim()).toBe("2.0.0");
  });

  it("checks clean documentation with JSON output", () => {
    const output = execSync(`node ${binPath} check "${cleanDoc}" --json`, {
      encoding: "utf8",
    });
    const parsed = JSON.parse(output);
    expect(parsed.passed).toBe(true);
    expect(parsed.totalErrors).toBe(0);
    expect(parsed.fileResults[0].valid).toBe(true);
  });

  it("detects errors in broken documentation", () => {
    try {
      execSync(`node ${binPath} check "${brokenDoc}" --json`, {
        encoding: "utf8",
      });
      // Should have thrown exit code 1
      expect.unreachable();
    } catch (err: any) {
      expect(err.status).toBe(1);
      const parsed = JSON.parse(err.stdout);
      expect(parsed.passed).toBe(false);
      expect(parsed.totalErrors).toBeGreaterThan(0);
    }
  });

  it("generates TOC for a file", () => {
    const output = execSync(`node ${binPath} toc "${cleanDoc}"`, {
      encoding: "utf8",
    });
    expect(output).toContain("Table of Contents");
    expect(output).toContain("[Installation](#installation)");
  });
});
