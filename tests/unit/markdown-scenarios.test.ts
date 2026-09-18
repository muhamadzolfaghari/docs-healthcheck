import { describe, it, expect } from "vitest";
import { analyzeMarkdownContent } from "../../src/core/analyzer.js";

describe("Real-world Markdown scenario matrix", () => {
  it("accepts a rich healthy document", () => {
    const md = `# Project

A practical project overview.

## Install

- Node.js 18+
- npm

\`\`\`bash
npm install example
\`\`\`

## API

| Method | Description |
| --- | --- |
| run() | Runs the tool |

### Example

> A blockquote is valid content.

## Links

[Install](#install)
`;
    const result = analyzeMarkdownContent(md, "README.md");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.score).toBe(100);
  });

  it("does not require prose immediately after every heading", () => {
    const md = `# Valid Non-Prose Sections

## List

- one
- two

## Code

\`\`\`ts
console.log("valid");
\`\`\`

## Table

| A | B |
| --- | --- |
| 1 | 2 |

## Image

![Diagram](https://example.com/diagram.png)

## Quote

> This is content.

## Parent
### Nested Child

Nested content.
`;
    const result = analyzeMarkdownContent(md, "non-prose.md");
    expect(result.issues.filter((i) => i.ruleId === "heading-empty-section")).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it("reports a truly empty leaf section only as advisory info", () => {
    const md = `# Project

Intro.

## Empty Leaf

## Working Section

Content.
`;
    const result = analyzeMarkdownContent(md, "empty.md");
    const issue = result.issues.find((i) => i.ruleId === "heading-empty-section");
    expect(issue?.severity).toBe("info");
    expect(result.valid).toBe(true);
  });

  it("handles partially broken Markdown without over-reporting healthy sections", () => {
    const md = `# Project

Intro.

## Install

\`\`\`bash
npm install
\`\`\`

## Usage

[Correct](#install)
[Broken](#instalation)

## Notes

- valid list content
`;
    const result = analyzeMarkdownContent(md, "partial.md");
    const ids = result.issues.map((i) => i.ruleId);
    expect(ids).toContain("anchor-broken");
    expect(ids).not.toContain("heading-empty-section");
    expect(result.valid).toBe(false);
  });

  it("detects a severely broken document across correctness and structure", () => {
    const md = `# Project

#### Skipped hierarchy

[Missing anchor](#does-not-exist)
[Missing file](./definitely-not-here.md)

# Another title

## Duplicate

## Duplicate
`;
    const result = analyzeMarkdownContent(md, "severely-broken.md", process.cwd());
    const ids = new Set(result.issues.map((i) => i.ruleId));
    expect(ids.has("heading-hierarchy")).toBe(true);
    expect(ids.has("anchor-broken")).toBe(true);
    expect(ids.has("link-missing-file")).toBe(true);
    expect(ids.has("heading-multiple-h1")).toBe(true);
    expect(ids.has("heading-duplicate")).toBe(true);
    expect(result.valid).toBe(false);
  });

  it("keeps multiple H1 headings as a style advisory", () => {
    const md = `# First

Content.

# Second

More content.
`;
    const result = analyzeMarkdownContent(md, "multi-h1.md");
    expect(result.issues.find((i) => i.ruleId === "heading-multiple-h1")?.severity).toBe("info");
    expect(result.valid).toBe(true);
  });

  it("supports disabling and overriding advisory rules", () => {
    const md = `# Project

## Empty

## Content

Text.
`;
    const disabled = analyzeMarkdownContent(md, "config.md", process.cwd(), {
      rules: { "heading-empty-section": { enabled: false } },
    });
    expect(disabled.issues.some((i) => i.ruleId === "heading-empty-section")).toBe(false);

    const overridden = analyzeMarkdownContent(md, "config.md", process.cwd(), {
      rules: { "heading-empty-section": { enabled: true, severity: "warning" } },
    });
    expect(overridden.issues.find((i) => i.ruleId === "heading-empty-section")?.severity).toBe("warning");
  });
});
