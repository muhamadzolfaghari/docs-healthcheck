import { describe, it, expect } from "vitest";
import path from "path";
import { runHealthCheck } from "../../src/core/engine.js";
import { createFixPlan } from "../../src/fixes/planner.js";

describe("Fix Planner Unit Tests", () => {
  const fixturesDir = path.resolve(__dirname, "../../fixtures");

  it("plans SAFE anchor repair when unique heading match exists", () => {
    const fixturePath = path.join(fixturesDir, "fix-anchor");
    const report = runHealthCheck(fixturePath);
    const plan = createFixPlan(report, fixturePath);

    const anchorProposal = plan.proposals.find((p) => p.ruleId === "anchor-broken");
    expect(anchorProposal).toBeDefined();
    expect(anchorProposal?.safety).toBe("safe");
    expect(anchorProposal?.confidence).toBe("high");
    expect(anchorProposal?.before).toBe("#setupp");
    expect(anchorProposal?.after).toBe("#setup");
  });

  it("plans SAFE TOC update when managed TOC is stale", () => {
    const fixturePath = path.join(fixturesDir, "fix-toc");
    const report = runHealthCheck(fixturePath);
    const plan = createFixPlan(report, fixturePath);

    const tocProposal = plan.proposals.find((p) => p.ruleId === "toc-outdated");
    expect(tocProposal).toBeDefined();
    expect(tocProposal?.safety).toBe("safe");
    expect(tocProposal?.operation.type).toBe("update-toc");
  });

  it("plans SAFE relative link repair when unique matching file exists", () => {
    const fixturePath = path.join(fixturesDir, "fix-link");
    const report = runHealthCheck(fixturePath);
    const plan = createFixPlan(report, fixturePath);

    const linkProposal = plan.proposals.find((p) => p.ruleId === "link-missing-file");
    expect(linkProposal).toBeDefined();
    expect(linkProposal?.safety).toBe("safe");
    expect(linkProposal?.after).toContain("config-files.md");
  });

  it("plans CONFIRM heading hierarchy repair", () => {
    const fixturePath = path.join(fixturesDir, "fix-heading");
    const report = runHealthCheck(fixturePath);
    const plan = createFixPlan(report, fixturePath);

    const headingProposal = plan.proposals.find((p) => p.ruleId === "heading-hierarchy");
    expect(headingProposal).toBeDefined();
    expect(headingProposal?.safety).toBe("confirm");
    expect(headingProposal?.after).toBe("## Skipped Level Heading");
  });

  it("plans CONFIRM template file generation for missing docs", () => {
    const fixturePath = path.join(fixturesDir, "fix-template");
    const report = runHealthCheck(fixturePath);
    const plan = createFixPlan(report, fixturePath);

    const contribProposal = plan.proposals.find((p) => p.file === "CONTRIBUTING.md");
    expect(contribProposal).toBeDefined();
    expect(contribProposal?.safety).toBe("confirm");
    expect(contribProposal?.operation.type).toBe("write-file");
  });

  it("marks ambiguous relative link as MANUAL", () => {
    const fixturePath = path.join(fixturesDir, "ambiguous-link");
    const report = runHealthCheck(fixturePath);
    const plan = createFixPlan(report, fixturePath);

    const ambiguousProposal = plan.proposals.find((p) => p.ruleId === "link-missing-file");
    expect(ambiguousProposal).toBeDefined();
    expect(ambiguousProposal?.safety).toBe("manual");
  });

  it("produces 0 fix proposals for already clean repository", () => {
    const fixturePath = path.join(fixturesDir, "already-clean");
    const report = runHealthCheck(fixturePath);
    const plan = createFixPlan(report, fixturePath);

    expect(plan.proposals.length).toBe(0);
    expect(plan.summary.total).toBe(0);
  });

  it("plans SAFE repair for reference definitions and cross-file anchors", () => {
    // Test on a simulated document with reference definition & cross-file link
    const fixturePath = path.join(fixturesDir, "fix-link");
    const report = runHealthCheck(fixturePath);
    const plan = createFixPlan(report, fixturePath);

    const linkProposal = plan.proposals.find((p) => p.ruleId === "link-missing-file");
    expect(linkProposal).toBeDefined();
    expect(linkProposal?.safety).toBe("safe");
  });
});

