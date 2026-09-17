import { describe, it, expect } from "vitest";
import { extractHeadings } from "../../src/markdown/headings.js";

describe("extractHeadings", () => {
  it("extracts standard ATX headings", () => {
    const md = `
# Title
## Section 1
### Subsection 1.1
#### Deep section
`;
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(4);
    expect(headings[0]).toMatchObject({ level: 1, text: "Title", slug: "title", line: 2 });
    expect(headings[1]).toMatchObject({ level: 2, text: "Section 1", slug: "section-1", line: 3 });
    expect(headings[2]).toMatchObject({ level: 3, text: "Subsection 1.1", slug: "subsection-11", line: 4 });
  });

  it("ignores headings inside code blocks and comments", () => {
    const md = `
# Real Title

\`\`\`markdown
# Fake Heading in Code Block
## Another Fake
\`\`\`

<!--
# Fake Heading in Comment
-->

## Real Subtitle
`;
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(2);
    expect(headings[0].text).toBe("Real Title");
    expect(headings[1].text).toBe("Real Subtitle");
  });

  it("detects custom HTML anchors", () => {
    const md = `
## Features <a id="my-custom-features"></a>
### Persian Heading <a name="persian-guide">راهنما</a>
`;
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(2);
    expect(headings[0].customAnchor).toBe("my-custom-features");
    expect(headings[0].slug).toBe("my-custom-features");
    expect(headings[1].customAnchor).toBe("persian-guide");
    expect(headings[1].slug).toBe("persian-guide");
  });

  it("extracts setext headings", () => {
    const md = `
Main Setext Title
=================

Second Level
------------
`;
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(2);
    expect(headings[0]).toMatchObject({ level: 1, text: "Main Setext Title", slug: "main-setext-title" });
    expect(headings[1]).toMatchObject({ level: 2, text: "Second Level", slug: "second-level" });
  });
});
