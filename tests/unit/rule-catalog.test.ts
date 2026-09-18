import { describe, it, expect } from "vitest";
import { VALIDATION_RULE_IDS } from "../../src/core/types.js";
import {
  MARKDOWN_RULE_CATALOG,
  REPO_HEALTH_RULE_CATALOG,
  REPO_HEALTH_RULE_IDS,
  getRuleSeverity,
} from "../../src/core/rule-catalog.js";

describe("Rule Catalog", () => {
  it("documents every Markdown rule with verifiable references", () => {
    expect(Object.keys(MARKDOWN_RULE_CATALOG).sort()).toEqual([...VALIDATION_RULE_IDS].sort());
    for (const id of VALIDATION_RULE_IDS) {
      const rule = MARKDOWN_RULE_CATALOG[id];
      expect(rule.id).toBe(id);
      expect(rule.rationale.length).toBeGreaterThan(10);
      expect(rule.references.length).toBeGreaterThan(0);
      for (const reference of rule.references) {
        expect(reference.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("documents every repository-health policy rule", () => {
    expect(Object.keys(REPO_HEALTH_RULE_CATALOG).sort()).toEqual([...REPO_HEALTH_RULE_IDS].sort());
    for (const id of REPO_HEALTH_RULE_IDS) {
      expect(REPO_HEALTH_RULE_CATALOG[id].weight).toBeGreaterThan(0);
      expect(REPO_HEALTH_RULE_CATALOG[id].references.length).toBeGreaterThan(0);
    }
  });

  it("uses strongest enforcement only for objective broken navigation", () => {
    expect(getRuleSeverity("anchor-broken")).toBe("error");
    expect(getRuleSeverity("link-missing-file")).toBe("error");
  });

  it("does not present style conventions or heuristics as Markdown errors", () => {
    expect(getRuleSeverity("heading-missing-h1")).toBe("info");
    expect(getRuleSeverity("heading-multiple-h1")).toBe("info");
    expect(getRuleSeverity("heading-duplicate")).toBe("info");
    expect(getRuleSeverity("heading-empty-section")).toBe("info");
  });

  it("keeps heading hierarchy as an accessibility warning", () => {
    expect(getRuleSeverity("heading-hierarchy")).toBe("warning");
    expect(MARKDOWN_RULE_CATALOG["heading-hierarchy"].authority).toBe("accessibility-best-practice");
  });

  it("labels empty-section detection explicitly as a heuristic", () => {
    const rule = MARKDOWN_RULE_CATALOG["heading-empty-section"];
    expect(rule.authority).toBe("docs-healthcheck-heuristic");
    expect(rule.rationale).toContain("not a Markdown syntax rule");
  });
});
