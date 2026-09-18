import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { runHealthCheck } from "../../src/core/engine.js";
import { createFixPlan } from "../../src/fixes/planner.js";
import { executeFixPlan } from "../../src/fixes/executor.js";

describe("Fix References, Inline Sources, and Relative Paths", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-references-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("repairs broken relative paths in reference-style link definitions", () => {
    const docsDir = path.join(tempDir, "docs");
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, "configuration.md"), "# Configuration\n\nConfig details.", "utf8");

    const readmePath = path.join(tempDir, "README.md");
    const originalContent = `# Project

See the [Configuration Guide][config-ref] for setup details.

[config-ref]: ./docs/configuraton.md
`;
    fs.writeFileSync(readmePath, originalContent, "utf8");

    const report = runHealthCheck(tempDir);
    const plan = createFixPlan(report, tempDir);

    const linkProposal = plan.proposals.find((p) => p.ruleId === "link-missing-file");
    expect(linkProposal).toBeDefined();
    expect(linkProposal?.safety).toBe("safe");
    expect(linkProposal?.after).toBe("./docs/configuration.md");

    executeFixPlan(plan, { yes: true }, tempDir);
    const updated = fs.readFileSync(readmePath, "utf8");
    expect(updated).toContain("[config-ref]: ./docs/configuration.md");
  });

  it("repairs broken cross-file anchors pointing to other markdown files", () => {
    const docsDir = path.join(tempDir, "docs");
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(
      path.join(docsDir, "api.md"),
      "# API Reference\n\n## Authentication Flow\n\nAuth docs.",
      "utf8"
    );

    const readmePath = path.join(tempDir, "README.md");
    const originalContent = `# Project

Read about [Authentication](./docs/api.md#authentiction-flow).
`;
    fs.writeFileSync(readmePath, originalContent, "utf8");

    const report = runHealthCheck(tempDir);
    const plan = createFixPlan(report, tempDir);

    const anchorProposal = plan.proposals.find((p) => p.ruleId === "anchor-broken");
    expect(anchorProposal).toBeDefined();
    expect(anchorProposal?.safety).toBe("safe");
    expect(anchorProposal?.after).toBe("./docs/api.md#authentication-flow");

    executeFixPlan(plan, { yes: true }, tempDir);
    const updated = fs.readFileSync(readmePath, "utf8");
    expect(updated).toContain("./docs/api.md#authentication-flow");
  });

  it("repairs broken inline image sources and HTML img tags", () => {
    const assetsDir = path.join(tempDir, "assets");
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, "architecture-diagram.png"), "dummy-png", "utf8");

    const readmePath = path.join(tempDir, "README.md");
    const originalContent = `# Project

![Architecture](./assets/archtecture-diagram.png)

<img src="./assets/archtecture-diagram.png" width="500" />
`;
    fs.writeFileSync(readmePath, originalContent, "utf8");

    const report = runHealthCheck(tempDir);
    const plan = createFixPlan(report, tempDir);

    const imgProposals = plan.proposals.filter((p) => p.ruleId === "link-missing-file");
    expect(imgProposals.length).toBeGreaterThan(0);
    expect(imgProposals[0].safety).toBe("safe");
    expect(imgProposals[0].after).toBe("./assets/architecture-diagram.png");

    executeFixPlan(plan, { yes: true }, tempDir);
    const updated = fs.readFileSync(readmePath, "utf8");
    expect(updated).toContain("./assets/architecture-diagram.png");
  });

  it("repairs missing file extensions in relative links", () => {
    const docsDir = path.join(tempDir, "docs");
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, "deployment.md"), "# Deployment\n\nDeploy docs.", "utf8");

    const readmePath = path.join(tempDir, "README.md");
    const originalContent = `# Project

[Deployment Guide](./docs/deployment)
`;
    fs.writeFileSync(readmePath, originalContent, "utf8");

    const report = runHealthCheck(tempDir);
    const plan = createFixPlan(report, tempDir);

    const linkProposal = plan.proposals.find((p) => p.ruleId === "link-missing-file");
    expect(linkProposal).toBeDefined();
    expect(linkProposal?.safety).toBe("safe");
    expect(linkProposal?.after).toBe("./docs/deployment.md");

    executeFixPlan(plan, { yes: true }, tempDir);
    const updated = fs.readFileSync(readmePath, "utf8");
    expect(updated).toContain("./docs/deployment.md");
  });

  it("resolves unique workspace files when relative directory depth is missing", () => {
    const guidesDir = path.join(tempDir, "docs", "guides");
    fs.mkdirSync(guidesDir, { recursive: true });
    fs.writeFileSync(path.join(guidesDir, "troubleshooting.md"), "# Troubleshooting", "utf8");

    const readmePath = path.join(tempDir, "README.md");
    const originalContent = `# Project

Check [Troubleshooting](./troubleshootng.md).
`;
    fs.writeFileSync(readmePath, originalContent, "utf8");

    const report = runHealthCheck(tempDir);
    const plan = createFixPlan(report, tempDir);

    const linkProposal = plan.proposals.find((p) => p.ruleId === "link-missing-file");
    expect(linkProposal).toBeDefined();
    expect(linkProposal?.safety).toBe("safe");
    expect(linkProposal?.after).toBe("./docs/guides/troubleshooting.md");

    executeFixPlan(plan, { yes: true }, tempDir);
    const updated = fs.readFileSync(readmePath, "utf8");
    expect(updated).toContain("./docs/guides/troubleshooting.md");
  });
});
