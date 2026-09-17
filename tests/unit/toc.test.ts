import { describe, it, expect } from "vitest";
import { generateTocMarkdown, updateTocInContent } from "../../src/markdown/toc.js";
import { extractHeadings } from "../../src/markdown/headings.js";

describe("TOC Generator", () => {
  const sampleMd = `
# Project Title

A great project.

## Installation
How to install.

### Prerequisites
Requirements.

## Usage
How to use.

### Basic Examples
Quick start.

#### Advanced Config
Details.
`;

  it("generates markdown TOC with correct indentation and slugs", () => {
    const headings = extractHeadings(sampleMd);
    const toc = generateTocMarkdown(headings, { minDepth: 2, maxDepth: 4 });

    expect(toc).toContain("## Table of Contents");
    expect(toc).toContain("- [Installation](#installation)");
    expect(toc).toContain("  - [Prerequisites](#prerequisites)");
    expect(toc).toContain("- [Usage](#usage)");
    expect(toc).toContain("  - [Basic Examples](#basic-examples)");
    expect(toc).toContain("    - [Advanced Config](#advanced-config)");
  });

  it("generates ordered TOC when requested", () => {
    const headings = extractHeadings(sampleMd);
    const toc = generateTocMarkdown(headings, { ordered: true, minDepth: 2, maxDepth: 3 });

    expect(toc).toContain("1. [Installation](#installation)");
    expect(toc).toContain("  1. [Prerequisites](#prerequisites)");
    expect(toc).toContain("2. [Usage](#usage)");
  });

  it("updates TOC between markers", () => {
    const inputWithMarkers = `
# Title

<!-- TOC START -->
Old TOC Content
<!-- TOC END -->

## Section 1
## Section 2
`;
    const res = updateTocInContent(inputWithMarkers);
    expect(res.inserted).toBe(true);
    expect(res.updatedContent).toContain("<!-- TOC START -->");
    expect(res.updatedContent).toContain("- [Section 1](#section-1)");
    expect(res.updatedContent).toContain("- [Section 2](#section-2)");
    expect(res.updatedContent).not.toContain("Old TOC Content");
  });

  it("handles Persian & RTL headings in TOC", () => {
    const persianMd = `
# راهنمای جامع

## نصب و پیکربندی
## ساختار پروژه
### مستندات فارسی
`;
    const headings = extractHeadings(persianMd);
    const toc = generateTocMarkdown(headings);

    expect(toc).toContain("[نصب و پیکربندی](#نصب-و-پیکربندی)");
    expect(toc).toContain("[ساختار پروژه](#ساختار-پروژه)");
    expect(toc).toContain("[مستندات فارسی](#مستندات-فارسی)");
  });
});
