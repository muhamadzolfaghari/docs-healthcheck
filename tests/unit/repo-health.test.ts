import { describe, it, expect } from "vitest";
import path from "path";
import { evaluateRepoHealth } from "../../src/checks/repo-health.js";
import { checkReadme } from "../../src/checks/readme.js";
import { checkLicense } from "../../src/checks/metadata.js";

describe("Repository Health Evaluation", () => {
  const currentRepoDir = path.resolve(__dirname, "../../");

  it("evaluates current repository health standards", () => {
    const health = evaluateRepoHealth(currentRepoDir);
    expect(health.items.length).toBeGreaterThanOrEqual(7);
    expect(health.score).toBeGreaterThan(0);
  });

  it("checks presence of README", () => {
    const readmeCheck = checkReadme(currentRepoDir);
    expect(readmeCheck.status).toBe("found");
  });

  it("checks presence of LICENSE", () => {
    const licenseCheck = checkLicense(currentRepoDir);
    expect(licenseCheck.status).toBe("found");
  });
});
