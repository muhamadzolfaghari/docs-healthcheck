import { describe, it, expect } from "vitest";
import path from "path";
import {
  checkDocumentation,
  validateMarkdown,
  generateToc,
  updateToc,
  slugify,
} from "../../src/index.js";

describe("Programmatic API", () => {
  it("exports checkDocumentation and runs health check", () => {
    const report = checkDocumentation(path.resolve(__dirname, "../../"));
    expect(report).toBeDefined();
    expect(typeof report.score).toBe("number");
    expect(Array.isArray(report.fileResults)).toBe(true);
  });

  it("exports validateMarkdown for string content", () => {
    const result = validateMarkdown(`
# API Document
## Section 1
[Link to Section 1](#section-1)
`);
    expect(result.valid).toBe(true);
    expect(result.headings.length).toBe(2);
    expect(result.links.length).toBe(1);
  });

  it("exports generateToc and updateToc", () => {
    const markdown = `
# Title
## First Topic
## Second Topic
`;
    const toc = generateToc(markdown);
    expect(toc).toContain("- [First Topic](#first-topic)");
    expect(toc).toContain("- [Second Topic](#second-topic)");

    const updated = updateToc(markdown);
    expect(updated.updatedContent).toContain("<!-- TOC START -->");
  });

  it("exports slugify utility", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("راهنمای فارسی")).toBe("راهنمای-فارسی");
  });
});
