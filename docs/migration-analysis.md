# Migration Analysis: `readme-toc-generator` to `docs-healthcheck`

## 1. Executive Summary

`readme-toc-generator` was initially conceived as an interactive Node.js script for parsing Markdown files, extracting heading lines, and outputting an updated document or a standalone `-TOC.md` file with generated table-of-contents links.

The goal of this migration is to rebrand and architect the project into **`docs-healthcheck`**—a production-ready, extensible CLI tool, CI quality gate, and programmatic library for validating documentation health across software repositories.

---

## 2. Current Architecture & Codebase Assessment

### Original Code Review (`index.js`)

- **Design:** Single-file procedural script using `readline` prompts (`rl.question(...)`) and synchronous file I/O (`fs.readFileSync`, `fs.writeFileSync`).
- **Parsing Strategy:** Basic regular expression `^(#+)(?: |)(.+?)(?: |)(?:<a.*?id="(.+?)".*?>(?:<\/a>)?|)$` evaluated line-by-line.
- **Slug Generation:** Custom string replacements (`.split(" ").map(...).join("-").replace(/\./g, "")` and a `FORBIDDEN_CHARS = [":"]` array).
- **Target Output:** Writes a new file named `<name>-TOC.md` next to the source file instead of integrating in-place or behaving as a CLI filter.
- **Dependencies:** Legacy dependencies including `inquirer` (partially unused in runtime) and lack of formal build or test pipelines.

### Strengths & Reusable Elements
1. **Heading extraction logic:** The concept of parsing heading levels (1–6) and detecting embedded anchor tags (`<a id="...">`) provides the baseline for our AST parser.
2. **Indentation model:** The hierarchical indentation mapping (`Math.max(0, level - 2) * 2`) for nested bullet points in TOCs.
3. **Historical intent:** Support for numbered headings (`1. `, `1.1 `) and nested sections.

### Limitations & Technical Debt
1. **Regex Brittleness:** Line-by-line regex fails when headings exist inside fenced code blocks (` ``` `), blockquotes, or multi-line HTML comments.
2. **Incomplete Slug Logic:** Does not fully conform to GitHub Flavored Markdown (GFM) anchor generation rules—specifically lacking support for Unicode/Persian scripts, emoji stripping/handling, punctuation stripping (e.g., `?`, `!`, `(`, `)`, `/`), and duplicate heading deduplication (`-1`, `-2`).
3. **No Validation Capabilities:** Missing all quality gate capabilities (e.g., broken anchors, broken relative links, missing document titles, multiple H1s, heading skips).
4. **Interactive Prompt Limitation:** Requires terminal interaction, preventing smooth CI/CD pipeline automation and headless execution.
5. **No Programmatic API:** Lacks module exports for consumption in JavaScript/TypeScript toolchains.
6. **Zero Automated Tests:** No test runner or coverage metrics existed in the original repo.

---

## 3. Migration & Architecture Decisions

| Area | Legacy (`readme-toc-generator`) | Modernized (`docs-healthcheck`) | Rationale |
| :--- | :--- | :--- | :--- |
| **Language** | Plain CommonJS JavaScript | TypeScript 5 (Strict ESM + D.TS) | Type safety, maintainability, modern developer ergonomics |
| **Parsing** | Single regex per line | Code-block aware Tokenizer & AST Parser | Accurately ignores code blocks, tables, comments |
| **Slugification** | Custom colon replace | GitHub-compliant Slugifier | Full support for Unicode, Persian, Emojis, duplicate suffixes |
| **TOC Injection** | Writes to separate `-TOC.md` | In-place marker replacement (`<!-- TOC START -->` ... `<!-- TOC END -->`) or stdout | Standard industry practice (matches prettier/doctoc conventions) |
| **Validation** | None | Modular Rule Engine (H1, hierarchy, duplicates, anchors, links) | Transforms utility into a documentation quality gate |
| **Repository Health** | None | Weighted scoring engine (0–100) for standard repo docs | Enables pre-commit checks and CI documentation compliance |
| **CLI Framework** | Manual `readline` prompt | `commander` + `picocolors` + `--json` + `--ci` flags | Non-blocking, flexible, CI-friendly, rich formatting |
| **Test Suite** | None | Vitest with unit, integration, and fixture tests (>80% coverage) | High reliability and regression prevention |
| **Build & Packaging** | Raw JS execution | `tsup` bundler + dual export declarations | Fast, zero-config bundling with dual tree-shaking |

---

## 4. Preserved Lineage & Commit Heritage

All 16 original commits (from initial commit `7e15f3a` to `ed80dfb`) are preserved in the git history of `docs-healthcheck`. Subsequent development commits build directly on top of this foundation to maintain open-source pedigree and attribution.
