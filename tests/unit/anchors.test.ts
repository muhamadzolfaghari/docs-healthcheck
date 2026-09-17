import { describe, it, expect } from "vitest";
import { extractAvailableAnchors, isAnchorValid } from "../../src/markdown/anchors.js";
import { extractHeadings } from "../../src/markdown/headings.js";

describe("anchors", () => {
  it("extracts anchors from headings and HTML id tags", () => {
    const md = `
# My Title
## Getting Started
### Setup <a id="custom-setup-anchor"></a>

<div id="section-extra"></div>
`;
    const headings = extractHeadings(md);
    const anchors = extractAvailableAnchors(md, headings);

    expect(isAnchorValid("my-title", anchors)).toBe(true);
    expect(isAnchorValid("getting-started", anchors)).toBe(true);
    expect(isAnchorValid("custom-setup-anchor", anchors)).toBe(true);
    expect(isAnchorValid("section-extra", anchors)).toBe(true);
    expect(isAnchorValid("non-existent", anchors)).toBe(false);
  });
});
