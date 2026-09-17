import { describe, it, expect } from "vitest";
import { extractLinks } from "../../src/markdown/links.js";

describe("extractLinks", () => {
  it("extracts internal anchor links, relative files, and external links", () => {
    const md = `
Check [Installation](#installation) and [Setup](#setup).
Read [Guide](./docs/guide.md) or [API](./docs/api.md#endpoints).
Visit [Website](https://example.com).
`;
    const links = extractLinks(md);
    expect(links).toHaveLength(5);

    expect(links[0]).toMatchObject({
      text: "Installation",
      href: "#installation",
      isLocalAnchor: true,
      anchorTarget: "installation",
    });

    expect(links[2]).toMatchObject({
      text: "Guide",
      href: "./docs/guide.md",
      isLocalFile: true,
      filePath: "./docs/guide.md",
    });

    expect(links[3]).toMatchObject({
      text: "API",
      href: "./docs/api.md#endpoints",
      isLocalFile: true,
      filePath: "./docs/api.md",
      anchorTarget: "endpoints",
    });

    expect(links[4]).toMatchObject({
      text: "Website",
      href: "https://example.com",
      isExternal: true,
    });
  });

  it("ignores links inside code blocks", () => {
    const md = `
[Real Link](#real)

\`\`\`markdown
[Fake Link](#fake)
\`\`\`
`;
    const links = extractLinks(md);
    expect(links).toHaveLength(1);
    expect(links[0].text).toBe("Real Link");
  });

  it("extracts HTML anchor tags", () => {
    const md = `<a href="#html-anchor">Go to HTML anchor</a>`;
    const links = extractLinks(md);
    expect(links).toHaveLength(1);
    expect(links[0].anchorTarget).toBe("html-anchor");
  });
});
