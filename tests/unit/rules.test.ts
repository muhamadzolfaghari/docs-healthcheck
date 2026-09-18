import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../../src/markdown/parser.js";
import { validateHeadings, validateLinksAndAnchors } from "../../src/core/rules.js";
import { analyzeMarkdownContent } from "../../src/core/analyzer.js";

describe("Validation Rules", () => {
  it("detects missing H1 heading", () => {
    const md = `
## Section Without Title
Some content
`;
    const doc = parseMarkdown(md);
    const issues = validateHeadings(doc, "test.md");
    expect(issues.some((i) => i.ruleId === "heading-missing-h1")).toBe(true);
  });

  it("detects multiple H1 headings", () => {
    const md = `
# Title One
# Title Two
`;
    const doc = parseMarkdown(md);
    const issues = validateHeadings(doc, "test.md");
    expect(issues.some((i) => i.ruleId === "heading-multiple-h1")).toBe(true);
  });

  it("detects skipped heading hierarchy levels", () => {
    const md = `
# Main Title
#### Skipped To Level 4
`;
    const doc = parseMarkdown(md);
    const issues = validateHeadings(doc, "test.md");
    expect(issues.some((i) => i.ruleId === "heading-hierarchy")).toBe(true);
  });

  it("detects duplicate headings", () => {
    const md = `
# Main Title
## Installation
Some text
## Installation
Another install
`;
    const doc = parseMarkdown(md);
    const issues = validateHeadings(doc, "test.md");
    expect(issues.some((i) => i.ruleId === "heading-duplicate")).toBe(true);
  });

  it("detects empty sections", () => {
    const md = `
# Main Title
Intro

## Empty Heading Section

## Next Section
Content here
`;
    const doc = parseMarkdown(md);
    const issues = validateHeadings(doc, "test.md");
    expect(issues.some((i) => i.ruleId === "heading-empty-section")).toBe(true);
  });

  it("detects broken internal anchors", () => {
    const md = `
# Main Title
[Broken Link](#non-existent-section)
## Real Section
`;
    const doc = parseMarkdown(md);
    const issues = validateLinksAndAnchors(doc, "test.md");
    expect(issues.some((i) => i.ruleId === "anchor-broken")).toBe(true);
  });

  it("calculates quality score accurately", () => {
    const cleanMd = `
# Perfect Documentation
A short intro.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)

## Installation
How to install.

## Usage
How to use.
`;
    const res = analyzeMarkdownContent(cleanMd, "clean.md");
    expect(res.valid).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(90);
  });
});
