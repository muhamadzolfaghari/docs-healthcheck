# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.2] - 2026-09-19

### Fixed
- CLI `--version` now derives from `package.json` at build time instead of a hardcoded value.
- Release CI now verifies the built CLI version matches the package version before publishing.
- Corrected the post-publish smoke-test failure discovered after the verified `2.1.1` provenance release.

## [2.1.1] - 2026-09-19

### Changed
- Published through npm Trusted Publishing with GitHub Actions provenance.
- No functional rule-engine changes from `2.1.0`.

## [2.1.0] - 2026-09-18

### ✨ Added — Interactive & Deterministic Auto-Fix Engine
- **`docs-healthcheck fix` Command:**
  - Interactive repair workflow with single-prompt confirmation per issue.
  - `--dry-run` flag to preview all proposed repairs without modifying files.
  - `--yes` (`-y`) / `--safe-only` flag to automatically apply only safe deterministic repairs in CI and headless environments.
  - `--backup` flag to automatically generate `.bak` backup files alongside modified files.
  - Root command shortcut alias `--fix` (e.g. `docs-healthcheck --fix --yes`).
  - Formats: Pretty Terminal (`renderFixTerminalReport`), `--json` (`renderFixJsonReport`), and `--markdown` (`renderFixMarkdownReport`).
- **Fix Session Revert Engine (`docs-healthcheck revert` / `docs-healthcheck fix revert`):**
  - Instant rollback of the last applied fix session.
  - Safely restores all modified files back to their exact pre-fix states.
  - Automatically removes any newly created template files.
  - Supports `--dry-run`, `--json`, and `--markdown` output modes for revert operations.
- **Deterministic Fix Planner (`src/fixes/`):**
  - Explicit three-tier safety classification: `SAFE`, `CONFIRM`, and `MANUAL`.
  - **TOC Synchronizer:** Automatically regenerates out-of-sync managed TOC blocks (`<!-- TOC START -->`).
  - **Anchor Auto-Fixer:** Resolves misspelled or case/format mismatched internal anchors when exactly one heading target matches.
  - **Relative Link Auto-Fixer:** Automatically resolves misspelled relative markdown paths when a unique candidate exists in the target directory.
  - **Heading Hierarchy Adjuster:** Suggests normalized heading level jumps under `CONFIRM` safety.
  - **Starter Document Templates:** Generates generic starter templates for missing repository standards (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`) with placeholders (never fabricating metadata).
- **Safe Atomic Executor:**
  - Atomic write strategy preventing corrupted or half-written documentation.
  - Strict path traversal guard preventing any writes outside the project root.
  - Full idempotency guarantee: repeated fix executions apply 0 changes.
- **Programmatic Repair & Revert API:**
  - `fixDocumentation(path, options)`
  - `revertDocumentation(path, options)`
  - `createFixPlan(report, rootDir, options)`
  - `executeFixPlan(plan, options, rootDir)`
  - `revertFixes(path, options)`
- **Demos & Fixtures:**
  - Added `demo/fixable-docs` demonstrating before/after score progression.
  - Added test fixtures: `fix-anchor`, `fix-toc`, `fix-link`, `fix-heading`, `fix-template`, `ambiguous-link`, and `already-clean`.


---

## [2.0.0] - 2026-09-18


### 🚀 Major Transformation & Rebranding
- Rebranded repository and npm package from `readme-toc-generator` to `docs-healthcheck`.
- Preserved full commit lineage and authorship from original project.
- Complete architectural redesign into a production-grade TypeScript package with dual ESM/CJS distribution and full type definitions.

### ✨ Added
- **Core Documentation Quality Gate:**
  - Heading structure validation: missing H1, multiple H1s, hierarchy skips (e.g. H1 -> H3), duplicate headings.
  - Link & anchor validation: catches broken local hash anchors (`#anchor`) and missing relative file links (`./docs/guide.md`).
  - Cross-file anchor resolution: checks whether anchors exist inside referenced markdown files.
- **Enhanced Table of Contents Generator:**
  - Full GitHub Flavored Markdown (GFM) slug compatibility.
  - Full support for Persian/Arabic/Unicode alphabets, emojis, and numbers.
  - In-place marker replacement (`<!-- TOC START -->` ... `<!-- TOC END -->`) or standalone CLI formatting.
  - Configurable minimum/maximum heading depth, ordered/bullet list modes, custom title headings.
- **Repository Health Score Engine:**
  - Automated scanning of repository standards (`README.md`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `docs/`, `examples/`).
  - Composite 0–100 documentation quality score with actionable suggestions.
- **Modern CLI:**
  - `docs-healthcheck .` (full workspace health gate)
  - `docs-healthcheck check <file>` (single-file validation)
  - `docs-healthcheck toc <file> [--write]` (TOC insertion)
  - Formats: Pretty Terminal (`picocolors`), `--json`, `--markdown` for GitHub Actions PR comments.
  - Exit codes: 0 (pass), 1 (failed validation or below threshold score).
- **Programmatic TypeScript API:**
  - `checkDocumentation(path, options)`
  - `validateMarkdown(content, options)`
  - `generateToc(headingsOrMarkdown, options)`
  - `updateToc(content, options)`
  - `slugify(text)` and `Slugger` class
- **GitHub Action Wrapper:**
  - Ready-to-use composite action in `.github/action.yml`.
  - CI workflows for automated multi-OS testing and semantic release.

---

## [1.1.1] - 2024-07-06
- Added forbidden characters filtering for anchor links.

## [1.1.0] - 2024-07-06
- Added support for numbered headings.
- Improved error handling for interactive file input.
- Added support for nested headings in table of contents.

## [1.0.0] - 2024-07-05
- Initial release of `readme-toc-generator`.
