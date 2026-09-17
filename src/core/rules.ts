import fs from "fs";
import path from "path";
import { ParsedMarkdownDocument } from "../markdown/parser.js";
import { ValidationIssue } from "./types.js";
import { isAnchorValid } from "../markdown/anchors.js";
import { extractHeadings } from "../markdown/headings.js";

/**
 * Validates heading structure: missing H1, multiple H1s, hierarchy skips, and duplicates.
 */
export function validateHeadings(
  doc: ParsedMarkdownDocument,
  filePath: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const h1Headings = doc.headings.filter((h) => h.level === 1);

  // 1. Check Missing H1
  if (h1Headings.length === 0 && doc.headings.length > 0) {
    issues.push({
      ruleId: "heading-missing-h1",
      severity: "warning",
      message: "Document is missing a top-level H1 (#) title heading.",
      file: filePath,
      line: doc.headings[0]?.line ?? 1,
      suggestion: `Add a top-level '# Title' heading at the beginning of the file.`,
    });
  }

  // 2. Check Multiple H1s
  if (h1Headings.length > 1) {
    for (let i = 1; i < h1Headings.length; i++) {
      issues.push({
        ruleId: "heading-multiple-h1",
        severity: "warning",
        message: `Multiple H1 headings detected: "${h1Headings[i].text}". Documents should typically have a single H1.`,
        file: filePath,
        line: h1Headings[i].line,
        suggestion: `Consider changing this heading level to H2 ('## ${h1Headings[i].text}').`,
      });
    }
  }

  // 3. Check Heading Hierarchy Skips (e.g. H1 -> H3)
  let prevLevel = 0;
  for (const h of doc.headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) {
      issues.push({
        ruleId: "heading-hierarchy",
        severity: "warning",
        message: `Heading hierarchy skipped from H${prevLevel} to H${h.level} for "${h.text}".`,
        file: filePath,
        line: h.line,
        suggestion: `Change heading level from H${h.level} to H${prevLevel + 1} to maintain consistent hierarchy.`,
      });
    }
    prevLevel = h.level;
  }

  // 4. Check Duplicate Headings
  const headingOccurrences = new Map<string, number[]>();
  for (const h of doc.headings) {
    const key = h.text.trim().toLowerCase();
    const list = headingOccurrences.get(key) ?? [];
    list.push(h.line);
    headingOccurrences.set(key, list);
  }

  for (const [title, lines] of headingOccurrences.entries()) {
    if (lines.length > 1) {
      for (let i = 1; i < lines.length; i++) {
        issues.push({
          ruleId: "heading-duplicate",
          severity: "info",
          message: `Duplicate heading title "${title}" detected (also on line ${lines[0]}). May cause anchor collision.`,
          file: filePath,
          line: lines[i],
          suggestion: `Add a unique qualifier or custom HTML anchor tag (<a id="...">) to disambiguate.`,
        });
      }
    }
  }

  return issues;
}

/**
 * Validates internal anchor links and relative local file references.
 */
export function validateLinksAndAnchors(
  doc: ParsedMarkdownDocument,
  filePath: string,
  baseDir?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const currentFileDir = baseDir ?? path.dirname(filePath);

  for (const link of doc.links) {
    // 1. Internal Document Anchor: #anchor-target
    if (link.isLocalAnchor && link.anchorTarget) {
      if (!isAnchorValid(link.anchorTarget, doc.availableAnchors)) {
        issues.push({
          ruleId: "anchor-broken",
          severity: "error",
          message: `Broken internal anchor link: href="${link.href}" targeting non-existent anchor #${link.anchorTarget}.`,
          file: filePath,
          line: link.line,
          col: link.col,
          suggestion: `Verify heading spelling or check available anchors in this document.`,
        });
      }
    }

    // 2. Relative Local File Link: ./docs/guide.md
    if (link.isLocalFile && link.filePath) {
      // Resolve path relative to the markdown file location
      const resolvedTarget = path.resolve(currentFileDir, link.filePath);

      if (!fs.existsSync(resolvedTarget)) {
        issues.push({
          ruleId: "link-missing-file",
          severity: "error",
          message: `Referenced local file does not exist: "${link.filePath}" (resolved to ${resolvedTarget}).`,
          file: filePath,
          line: link.line,
          col: link.col,
          suggestion: `Ensure the referenced file exists or correct the relative path.`,
        });
      } else if (link.anchorTarget && resolvedTarget.endsWith(".md")) {
        // Target file exists and has an anchor: verify anchor inside target markdown file
        try {
          const targetContent = fs.readFileSync(resolvedTarget, "utf8");
          const targetHeadings = extractHeadings(targetContent);
          const targetAnchors = new Set<string>();
          for (const th of targetHeadings) {
            if (th.slug) targetAnchors.add(th.slug.toLowerCase());
            if (th.customAnchor) targetAnchors.add(th.customAnchor.toLowerCase());
          }

          if (!targetAnchors.has(link.anchorTarget.toLowerCase())) {
            issues.push({
              ruleId: "anchor-broken",
              severity: "error",
              message: `Cross-file anchor broken: "${link.href}" target anchor #${link.anchorTarget} not found in ${link.filePath}.`,
              file: filePath,
              line: link.line,
              col: link.col,
              suggestion: `Check heading anchors in ${link.filePath}.`,
            });
          }
        } catch {
          // File reading error ignored
        }
      }
    }
  }

  return issues;
}
