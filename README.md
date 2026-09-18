# docs-healthcheck

[![npm version](https://img.shields.io/npm/v/docs-healthcheck.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/docs-healthcheck)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI Status](https://img.shields.io/github/actions/workflow/status/muhamadzolfaghari/docs-healthcheck/test.yml?branch=main&style=flat-square)](https://github.com/muhamadzolfaghari/docs-healthcheck/actions)
[![Coverage](https://img.shields.io/badge/Coverage-90%25-brightgreen.svg?style=flat-square)](https://github.com/muhamadzolfaghari/docs-healthcheck)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

> **Documentation quality gate and auto-repair engine for Markdown repositories.** Analyze documentation health, catch broken links and anchors, validate heading structure, generate TOCs, and safely repair deterministic issues.

```
  ╔═══════════════════════════════════════════════════════════╗
  ║          DOCUMENTATION HEALTH REPAIR REPORT               ║
  ╚═══════════════════════════════════════════════════════════╝

  Mode:  LIVE REPAIR 
  Health Score: 73/100 → 91/100 (+18 health points)

  Applied Repairs:
  ✔  SAFE  Regenerate Table of Contents in README.md [README.md]
  ✔  SAFE  Fix broken anchor "#instalation" → "#installation" [README.md]
  ✔  SAFE  Fix file link "./docs/guide-doc.md" → "./docs/guide-docs.md" [README.md]

  Skipped Confirmation-Required Changes:
  ○ Create starter CHANGELOG.md template (Requires interactive confirmation)
```

---

<!-- TOC START -->

## Table of Contents

- [Auto-Fix & Deterministic Repair Engine](#auto-fix--deterministic-repair-engine)
- [Fix Safety Classification](#fix-safety-classification)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [1. Read-Only Health Analysis](#1-read-only-health-analysis)
  - [2. Preview Proposed Repairs (Dry-Run)](#2-preview-proposed-repairs-dry-run)
  - [3. Interactive Repair](#3-interactive-repair)
  - [4. Apply Safe Deterministic Fixes](#4-apply-safe-deterministic-fixes)
- [CLI Reference](#cli-reference)
  - [Exit Codes](#exit-codes)
- [Validation Rules](#validation-rules)
- [Programmatic API](#programmatic-api)
  - [Fix Documentation Programmatically](#fix-documentation-programmatically)
  - [Check Documentation](#check-documentation)
  - [Validate Markdown Content](#validate-markdown-content)
  - [Generate Table of Contents](#generate-table-of-contents)
- [CI/CD & GitHub Actions Integration](#cicd--github-actions-integration)
- [Unicode & RTL Support](#unicode--rtl-support)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)

<!-- TOC END -->

---

## Auto-Fix & Deterministic Repair Engine

`docs-healthcheck` v2.1.0 introduces an interactive and deterministic auto-repair engine following the core principle:

> **Detect problems → Explain them → Offer safe fixes → Apply approved changes → Rerun validation → Show score improvement.**

`docs-healthcheck` **never invents or rewrites documentation prose**. It performs strictly deterministic, reviewable, and testable repairs.

```bash
# Read-only analysis
npx docs-healthcheck

# Preview proposed fixes without touching any files
npx docs-healthcheck fix --dry-run

# Interactive repair (prompts for confirmation)
npx docs-healthcheck fix

# Non-interactive / CI safe auto-repair (applies only SAFE deterministic fixes)
npx docs-healthcheck fix --yes

# Root shortcut alias
npx docs-healthcheck --fix --yes
```

---

## Fix Safety Classification

Every proposed repair is classified into one of three safety levels:

| Fix Type | Safety Classification | Auto-Applied with `--yes`? | Description |
| :--- | :---: | :---: | :--- |
| **Managed TOC Sync** | `SAFE` | **Yes** | Re-indexes headings and synchronizes `<!-- TOC START -->` blocks |
| **Unique Broken Anchor** | `SAFE` | **Yes** | Repairs misspelled fragment (e.g. `#instalation` → `#installation`) when exactly one heading matches |
| **Unique Broken Relative Link** | `SAFE` | **Yes** | Fixes local relative path (e.g. `./docs/guide-doc.md` → `./docs/guide-docs.md`) when single candidate matches |
| **Heading Hierarchy Skip** | `CONFIRM` | **No** | Adjusts skipped levels (e.g. H1 → H3 to H1 → H2). Requires interactive confirmation |
| **Missing Standard Doc Template** | `CONFIRM` | **No** | Creates generic starter `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, or `CHANGELOG.md` with placeholders |
| **Ambiguous Broken Link** | `MANUAL` | **No** | Lists potential candidates for manual author resolution |
| **Empty Section / Duplicate Heading**| `MANUAL` | **No** | Requires human decision; no synthetic prose is ever generated |

---

## Features

- 🛠️ **Deterministic Repair Engine:** Safe, reviewable, and idempotent auto-repairs for anchors, links, and TOCs.
- 🎯 **Documentation Health Gate:** Computes an actionable 0–100 documentation score evaluating repository standards (`README.md`, `LICENSE`, `package.json`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `docs/`, `examples/`).
- 📑 **Advanced Table of Contents Generator:** Automated TOC creation with in-place marker synchronization (`<!-- TOC START -->` ... `<!-- TOC END -->`).
- 🔗 **Broken Anchor & Dead Link Detection:** Catches broken internal fragment links (`#missing-anchor`) and nonexistent relative file paths (`./docs/guide.md`).
- 🏷️ **Cross-File Anchor Resolution:** Verifies that anchors referenced in other markdown files (`./api.md#endpoints`) actually exist.
- 📐 **Heading Hierarchy Linter:** Detects missing document titles, multiple H1s, heading level jumping (e.g., H1 -> H3), and duplicate headings causing anchor collisions.
- 🌍 **Full Unicode & RTL/Persian Support:** 100% GitHub-compatible slugification supporting Persian, Arabic, Cyrillic, CJK, and emojis.
- ⚡ **Blazing Fast & Ultra-Lean:** Zero heavy runtime dependencies, native Node APIs, sub-30ms execution.

---

## Installation

```bash
# Global CLI
npm install -g docs-healthcheck

# Local Project Dependency
npm install --save-dev docs-healthcheck

# Direct execution via npx
npx docs-healthcheck .
```

---

## Quick Start

### 1. Read-Only Health Analysis

```bash
npx docs-healthcheck .
```

### 2. Preview Proposed Repairs (Dry-Run)

```bash
npx docs-healthcheck fix . --dry-run
```

### 3. Interactive Repair

```bash
npx docs-healthcheck fix .
```

### 4. Apply Safe Deterministic Fixes

```bash
npx docs-healthcheck fix . --yes
```

---

## CLI Reference

```
Usage: docs-healthcheck [command] [options]

Documentation quality gate and auto-repair engine for Markdown repositories.

Commands:
  scan [path]        Full documentation health check for repository or directory (default)
  fix [path]         Analyze and deterministically repair documentation issues
  check <file>       Validate a specific Markdown file for broken links, anchors, and heading structure
  toc <file>         Generate or update Table of Contents for a Markdown file
  help [command]     Display help for command

Options:
  -V, --version      Output the version number
  --fix              Shortcut to repair documentation issues (equivalent to fix [path])
  --dry-run          Preview proposed repairs without modifying files
  -y, --yes          Automatically apply all safe deterministic repairs
  --safe-only        Apply only safe deterministic repairs (alias for --yes)
  --json             Output results in JSON format
  --markdown         Output results in GitHub Markdown format
  --verbose          Show detailed verbose diagnostic information
  --ci               Run in CI mode with strict exit code (2) on any errors
  --strict           Treat warnings as errors (exit code 2)
  --min-score <n>    Minimum acceptable health score (0-100, default: 70)
  --silent           Suppress stdout and only use exit code
  -h, --help         Display help for command
```

### Exit Codes

| Code | Status | Meaning |
| :---: | :--- | :--- |
| `0` | **Healthy** | All documentation checks passed with zero errors or warnings (or within warning tolerance) |
| `1` | **Warnings** | Passed with non-blocking warnings (e.g. missing optional docs or skipped heading depths) |
| `2` | **Errors** | Failed with critical errors (broken links, missing required files, or score below threshold) |

---

## Validation Rules

| Rule ID | Severity | Description | Fix Safety |
| :--- | :---: | :--- | :---: |
| `toc-outdated` | `warning` | Managed TOC block is out of sync with current headings | `SAFE` |
| `anchor-broken` | `error` | Internal link `[Text](#anchor)` targets non-existent section | `SAFE` (if unique) / `MANUAL` |
| `link-missing-file` | `error` | Relative markdown link references a file that does not exist on disk | `SAFE` (if unique) / `MANUAL` |
| `heading-hierarchy` | `warning` | Heading levels jump unexpectedly (e.g. `H1` followed directly by `H3`) | `CONFIRM` |
| `repo-*-missing` | `warning` | Repository missing standard guides (`CONTRIBUTING.md`, etc.) | `CONFIRM` |
| `heading-missing-h1` | `warning` | Document lacks a primary `# Document Title` | `MANUAL` |
| `heading-multiple-h1`| `warning` | Document contains more than one top-level `# Title` | `MANUAL` |
| `heading-duplicate` | `info` | Identical heading titles causing anchor collision or ambiguity | `MANUAL` |
| `heading-empty-section` | `warning` | Heading has no body content or description under it | `MANUAL` |

---

## Programmatic API

```ts
import {
  checkDocumentation,
  fixDocumentation,
  createFixPlan,
  executeFixPlan,
  validateMarkdown,
  generateToc,
  updateToc,
  slugify,
} from "docs-healthcheck";
```

### Fix Documentation Programmatically

```ts
// Execute safe deterministic repairs
const report = fixDocumentation("./my-project", {
  safeOnly: true,
  dryRun: false,
});

console.log(`Before: ${report.beforeScore}/100`);
console.log(`After:  ${report.afterScore}/100 (+${report.scoreDelta})`);
console.log(`Applied: ${report.applied.length} fixes`);
```

### Check Documentation

```ts
const report = checkDocumentation("./my-project", {
  minScore: 80,
  strict: false,
});

console.log(`Score: ${report.score}/100`);
console.log(`Passed: ${report.passed}`);
```

### Validate Markdown Content

```ts
const result = validateMarkdown(`
# API Docs
## Endpoints
[Missing](#does-not-exist)
`);

console.log(result.valid); // false
console.log(result.issues); // [{ ruleId: 'anchor-broken', ... }]
```

### Generate Table of Contents

```ts
const toc = generateToc(markdownContent, {
  minDepth: 2,
  maxDepth: 4,
  ordered: false,
});
```

---

## CI/CD & GitHub Actions Integration

```yaml
name: Documentation Quality & Repair Smoke Test

on: [push, pull_request]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      # Quality gate validation
      - run: npx --yes docs-healthcheck . --ci --min-score 80
```

---

## Unicode & RTL Support

`docs-healthcheck` has native support for right-to-left (RTL) scripts such as Persian and Arabic:

```markdown
# راهنمای استفاده

## نصب و راه‌اندازی
## پیکربندی سیستم
```

Generates exact GitHub-compliant slugs:
- `#نصب-و-راهاندازی`
- `#پیکربندی-سیستم`

---

## Future Roadmap

- 🎯 **v2.2:** External URL liveness validation (`http`/`https` checking with rate limiting and caching) and PR inline annotation reporter.
- 🤖 **v2.3:** Model Context Protocol (MCP) Server integration allowing AI agents to query documentation health and apply deterministic auto-fixes.

---

## Contributing

Contributions are always welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

---

## License

MIT © [Mohammad Zolfaghari](https://github.com/muhamadzolfaghari)
