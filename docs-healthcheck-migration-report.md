# Migration Report: `readme-toc-generator` to `docs-healthcheck`

**Author:** Muhamad Zolfaghari  
**Date:** September 2026  
**Target Package:** `docs-healthcheck` (v2.0.0)  
**Target Repository:** `github.com/muhamadzolfaghari/docs-healthcheck`

---

## 1. Executive Summary

This report outlines the migration and architectural evolution of the original utility project **`readme-toc-generator`** into **`docs-healthcheck`**—a professional, zero-dependency CLI developer tool, documentation quality gate, and programmatic TypeScript library.

Rather than merely renaming a repository, the project has been fundamentally re-architected from a single-file interactive prompt script into an extensible documentation analyzer that validates Markdown structure, link and anchor integrity, heading hierarchy, repository-level standards, and table-of-contents consistency before code releases.

All original git history and attribution have been strictly preserved.

---

## 2. Current Project State & Inspection

### 2.1 Git History & Lineage Inspection
- **Origin Repository:** `https://github.com/muhamadzolfaghari/readme-toc-generator.git`
- **Original Commits:** 16 commits from `7e15f3a` (*Initial commit*) to `ed80dfb` (*fix(readme.md): put the table of contents in readme file*).
- **Commit Pedigree:** 100% preserved. Evolution commits are layered continuously on top of original commits (`3387c2c` and subsequent refinement commits).

### 2.2 Original Architecture Review (`readme-toc-generator`)
- **Core file:** Single CommonJS script `index.js`.
- **User Interface:** Synchronous `readline` interactive prompt (`rl.question(...)`).
- **Parsing Strategy:** Basic line-by-line regex matching:
  ```regex
  ^(#+)(?: |)(.+?)(?: |)(?:<a.*?id="(.+?)".*?>(?:<\/a>)?|)$
  ```
- **Slug Generation:** Custom replacements (`.split(" ").map(...).join("-").replace(/\./g, "")` and forbidden characters array `FORBIDDEN_CHARS = [":"]`).
- **Output:** Wrote a duplicate file named `<filename>-TOC.md`.
- **Test Suite:** No automated tests, test runner, or CI test workflows existed.

---

## 3. Reusable Code vs. Technical Debt

### 3.1 Existing Reusable Elements
1. **Heading extraction concepts:** The foundational requirement to detect markdown headings (`#` through `######`) and extract custom HTML anchor tags (`<a id="...">`).
2. **Hierarchical indentation mapping:** Nesting logic for bullet points based on relative heading depths (`Math.max(0, level - 2) * 2`).
3. **Numbered heading support:** Parsing headings with version prefixes and dotted notation (`1.1`, `2.0`).

### 3.2 Technical Debt Identified
1. **Regex Brittleness:** Parsing line-by-line using regular expressions failed to ignore headings inside fenced code blocks (` ```markdown `), blockquotes, and HTML comments.
2. **Slugifier Deficiencies:** Did not conform to GitHub Flavored Markdown (GFM) anchor specifications (lacked Unicode/Persian support, emoji stripping, punctuation removal, duplicate anchor suffixing `-1`, `-2`).
3. **No Non-Interactive / CI Mode:** Prompt-based input prevented headless CI/CD execution and pre-commit hooks.
4. **Lack of Validation Rules:** Could only generate links, but could not detect broken anchors, dead file links, skipped heading levels, or missing repository files.
5. **No Modular Architecture / Programmatic API:** Could not be imported as an npm library or integrated into MCP servers.
6. **No Test Coverage:** No regression suite existed.

---

## 4. Preservation & Rewriting Strategy

### 4.1 What Was Preserved
- **Complete Git History:** Full lineage from the first commit to preserve open-source contributions.
- **TOC Generation Capability:** Preserved and upgraded to support in-place markers (`<!-- TOC START -->` ... `<!-- TOC END -->`), custom depth filters, ordered lists, and direct stdout streaming.
- **Numbered and Custom Anchor Support:** Enhanced HTML anchor identification.

### 4.2 What Was Rewritten
- **Core Engine:** Rebuilt from scratch using TypeScript with structured AST parsing and modular validation rules.
- **CLI Subsystem:** Built on `commander` and `picocolors` with full support for `--json`, `--markdown`, `--verbose`, and strict CI exit codes.
- **Slug Engine:** Built compliant with GitHub GFM slug specifications (handling Unicode, Persian/Arabic, Chinese, emojis, punctuation, and deduplication).
- **Reporters:** Dedicated terminal, JSON, and Markdown formatters.

---

## 5. Migration Strategy

The migration proceeded in structured phases:

1. **Investigation & Heritage Locking:** Audited git history and confirmed commit lineage retention.
2. **TypeScript & Build Tooling Foundation:** Configured `tsconfig.json`, `tsup` for dual ESM/CJS bundling, and `vitest` for test runner infrastructure.
3. **Markdown AST & Parser Subsystem:** Created code-block aware tokenizer in `src/markdown/` to extract headings, links, and anchors.
4. **Validation Rules & Quality Gate:** Created rules for heading hierarchy, duplicate titles, empty sections, broken anchors, missing files, and repository standards (`LICENSE`, `README`, `CONTRIBUTING`, `package.json`).
5. **Scoring Engine:** Developed a 0–100 weighted quality scoring algorithm.
6. **CLI & Reporters:** Implemented `docs-healthcheck scan`, `check`, and `toc` with colored terminal output and CI exit codes (`0` = Healthy, `1` = Warnings, `2` = Errors).
7. **Comprehensive Test Suite & Fixtures:** Created unit tests and 5 fixture repositories (`healthy-project`, `missing-readme`, `broken-links`, `bad-headings`, `missing-license`).
8. **CI/CD Automation:** Added GitHub Actions workflows for PR testing, semantic versioning, and npm release with provenance.

---

## 6. Target Architecture

```
docs-healthcheck/
├── bin/
│   └── docs-healthcheck.js          # Executable CLI entrypoint
├── src/
│   ├── index.ts                     # Public programmatic library exports
│   ├── cli/
│   │   └── index.ts                 # Commander CLI definitions and handlers
│   ├── core/
│   │   ├── analyzer.ts              # Document scoring and analysis
│   │   ├── engine.ts                # Multi-file directory crawler & composite evaluation
│   │   ├── rules.ts                 # Heading, link, anchor, and empty section rules
│   │   └── types.ts                 # TypeScript interfaces and rule definitions
│   ├── checks/
│   │   ├── repo-health.ts           # Composite repository standards evaluator
│   │   ├── readme.ts                # README presence and length check
│   │   ├── license.ts (metadata.ts) # LICENSE file verification
│   │   ├── package.ts               # package.json validation check
│   │   ├── contributing.ts          # CONTRIBUTING.md & CODE_OF_CONDUCT checks
│   │   └── changelog.ts             # CHANGELOG.md verification
│   ├── markdown/
│   │   ├── parser.ts                # Code-block aware tokenizer
│   │   ├── headings.ts              # Heading extractor
│   │   ├── links.ts                 # Markdown link & reference extractor
│   │   ├── anchors.ts               # Anchor indexer & validator
│   │   ├── slug.ts                  # GitHub-compliant Unicode slugifier
│   │   └── toc.ts                   # In-place TOC generator & updater
│   └── reporters/
│       ├── terminal.ts              # Colored rich terminal reporter
│       ├── json.ts                  # Machine-readable JSON reporter
│       └── markdown.ts              # GitHub Summary / PR Comment Markdown reporter
├── fixtures/                        # Integration test fixture repositories
│   ├── healthy-project/
│   ├── missing-readme/
│   ├── broken-links/
│   ├── bad-headings/
│   └── missing-license/
└── tests/
    ├── unit/                        # Unit tests for slug, headings, links, rules, reporters
    └── integration/                 # End-to-end CLI and programmatic API tests
```

---

## 7. Risk Analysis & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Loss of Git History** | High (Loss of OSS lineage & attribution) | Performed migration by refactoring the existing repository history rather than creating a disconnected repository. |
| **Breaking Existing TOC Users** | Medium (CLI syntax incompatibility) | Retained `toc <file>` command with enhanced options (`--write`, `--min-depth`, `--ordered`). |
| **Performance on Large Monorepos** | Medium (Slow scans) | Lightweight synchronous scanning with standard ignore lists (`node_modules`, `.git`, `dist`, `coverage`). Sub-second scan times for large repositories. |
| **False Positive Anchor Failures** | Low (Markdown custom anchors) | Supported both GFM auto-slugs and custom HTML `<a id="...">` and `<a name="...">` tags. |

---

## 8. Conclusion

`docs-healthcheck` successfully transforms `readme-toc-generator` from a simple script into an enterprise-grade developer tool, establishing a robust quality gate for documentation across open-source and commercial software repositories.
