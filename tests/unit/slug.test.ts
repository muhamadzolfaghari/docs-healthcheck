import { describe, it, expect } from "vitest";
import { slugify, Slugger, cleanHeadingText } from "../../src/markdown/slug.js";

describe("slugify & cleanHeadingText", () => {
  it("cleans basic markdown formatting", () => {
    expect(cleanHeadingText("**Bold** and *Italic* and `Code`")).toBe("Bold and Italic and Code");
    expect(cleanHeadingText("[Link Title](https://example.com)")).toBe("Link Title");
    expect(cleanHeadingText('Custom Heading <a id="my-anchor"></a>')).toBe("Custom Heading");
  });

  it("generates standard GitHub-compatible slugs", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("1. Introduction & Overview")).toBe("1-introduction--overview");
    expect(slugify("API Reference (v2.0)")).toBe("api-reference-v20");
    expect(slugify("How does it work?")).toBe("how-does-it-work");
  });

  it("handles Persian and Arabic Unicode characters", () => {
    expect(slugify("نصب و راه‌اندازی")).toBe("نصب-و-راهاندازی");
    expect(slugify("فهرست مطالب")).toBe("فهرست-مطالب");
    expect(slugify("راهنمای استفاده ۱")).toBe("راهنمای-استفاده-۱");
  });

  it("handles emojis and symbols", () => {
    expect(slugify("Features 🚀 & Enhancements 🎉")).toBe("features---enhancements");
    expect(slugify("🚀 Quick Start")).toBe("quick-start");
  });

  it("disambiguates duplicate slugs with Slugger", () => {
    const slugger = new Slugger();
    expect(slugger.slug("Installation")).toBe("installation");
    expect(slugger.slug("Installation")).toBe("installation-1");
    expect(slugger.slug("Installation")).toBe("installation-2");
    expect(slugger.slug("Configuration")).toBe("configuration");
    expect(slugger.slug("Configuration")).toBe("configuration-1");

    slugger.reset();
    expect(slugger.slug("Installation")).toBe("installation");
  });

  it("respects custom anchor tags in Slugger", () => {
    const slugger = new Slugger();
    expect(slugger.slug("My Section", "custom-id-123")).toBe("custom-id-123");
  });
});
