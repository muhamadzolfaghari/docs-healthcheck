# docs-healthcheck

[![npm version](https://img.shields.io/npm/v/docs-healthcheck.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/docs-healthcheck)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI Status](https://img.shields.io/github/actions/workflow/status/muhamadzolfaghari/docs-healthcheck/test.yml?branch=main&style=flat-square)](https://github.com/muhamadzolfaghari/docs-healthcheck/actions)
[![Coverage](https://img.shields.io/badge/Coverage-86%25-brightgreen.svg?style=flat-square)](https://github.com/muhamadzolfaghari/docs-healthcheck)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

> **Documentation quality gate for Markdown repositories.** Validate heading structure, generate TOCs, catch broken links and anchors, and evaluate repository documentation health scores in CI/CD.

```
  ╔═══════════════════════════════════════════════════════════╗
  ║              DOCUMENTATION HEALTH REPORT                  ║
  ╚═══════════════════════════════════════════════════════════╝

  Health Score: 96/100  PASS 
  Scanned: 6 files | 38 headings | 24 links

  Repository Documentation Standards:
  ✔ README File — Found README.md (180 lines)
  ✔ License File — Found LICENSE
  ✔ Changelog File — Found CHANGELOG.md
  ✔ Contributing Guide — Found CONTRIBUTING.md
  ✔ Code of Conduct — Found CODE_OF_CONDUCT.md
  ✔ Documentation Directory — Found docs/ directory with 4 items

  ✔ All markdown files passed validation rules!
```

---

<!-- TOC START -->

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [1. Full Repository Healthcheck](#1-full-repository-healthcheck)
  - [2. Generate / Update Table of Contents](#2-generate--update-table-of-contents)
  - [3. Validate a Specific Markdown File](#3-validate-a-specific-markdown-file)
- [CLI Reference](#cli-reference)
  - [Global Options & Flags](#global-options--flags)
  - [Commands](#commands)
    - [docs-healthcheck toc](#docs-healthcheck-toc)
  - [Exit Codes](#exit-codes)
- [Validation Rules](#validation-rules)
- [Programmatic API](#programmatic-api)
  - [Check Documentation](#check-documentation)
  - [Validate Markdown Content](#validate-markdown-content)
  - [Generate Table of Contents](#generate-table-of-contents)
- [CI/CD & GitHub Actions Integration](#cicd--github-actions-integration)
  - [As a GitHub Action](#as-a-github-action)
  - [In GitHub Actions Workflow](#in-github-actions-workflow)
- [Unicode & RTL Support](#unicode--rtl-support)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)

<!-- TOC END -->

---

## Features

- 🎯 **Documentation Health Gate:** Computes an actionable 0–100 documentation score evaluating repository standards (`README.md`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `docs/`, `examples/`).
- 📑 **Advanced Table of Contents Generator:** Automated TOC creation with in-place marker synchronization (`<!-- TOC START -->` ... `<!-- TOC END -->`).
- 🔗 **Broken Anchor & Dead Link Detection:** Catches broken internal fragment links (`#missing-anchor`) and nonexistent relative file paths (`./docs/guide.md`).
- 🏷️ **Cross-File Anchor Resolution:** Verifies that anchors referenced in other markdown files (`./api.md#endpoints`) actually exist.
- 📐 **Heading Hierarchy Linter:** Detects missing document titles, multiple H1s, heading level jumping (e.g., H1 -> H3), and duplicate headings causing anchor collisions.
- 🌍 **Full Unicode & RTL/Persian Support:** 100% GitHub-compatible slugification supporting Persian, Arabic, Cyrillic, CJK, and emojis.
- ⚡ **Blazing Fast & Ultra-Lean:** Zero heavy dependencies, written in modern TypeScript, with sub-30ms execution.

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

### 1. Full Repository Healthcheck

Run in the root of your project:

```bash
docs-healthcheck .
```

### 2. Generate / Update Table of Contents

Add markers to your `README.md`:

```markdown
<!-- TOC START -->
<!-- TOC END -->
```

Then run:

```bash
docs-healthcheck toc README.md --write
```

### 3. Validate a Specific Markdown File

```bash
docs-healthcheck check docs/guide.md
```

---

## CLI Reference

```
Usage: docs-healthcheck [command] [options]

Documentation quality gate for Markdown repositories.

Commands:
  scan [path]        Full documentation health check for repository or directory (default)
  check <file>       Validate a specific Markdown file for broken links, anchors, and heading structure
  toc <file>         Generate or update Table of Contents for a Markdown file
  help [command]     Display help for command

Options:
  -V, --version      Output the version number
  --json             Output results in JSON format
  --markdown         Output results in GitHub Markdown format
  --ci               Run in CI mode with strict exit code (1) on any errors
  --strict           Treat warnings as errors
  --min-score <n>    Minimum acceptable health score (0-100, default: 70)
  --silent           Suppress stdout and only use exit code
  -h, --help         Display help for command
```

### Global Options & Flags

| Flag | Description |
| :--- | :--- |
| `--json` | Outputs report as a machine-readable JSON object |
| `--markdown` | Outputs report as a GitHub-flavored Markdown table (ideal for PR comments) |
| `--ci` | Returns exit code `1` if any validation error occurs or score is below threshold |
| `--strict` | Fails even on warnings |
| `--min-score <n>` | Customizes passing score threshold (default: `70`) |

### Commands

#### `docs-healthcheck toc <file>`

| Option | Description | Default |
| :--- | :--- | :--- |
| `-w, --write` | Injects/updates TOC directly inside the file | `false` |
| `--min-depth <n>` | Minimum heading level to include | `2` |
| `--max-depth <n>` | Maximum heading level to include | `6` |
| `--ordered` | Generate numbered list (`1. `, `2. `) instead of bullets | `false` |
| `--title <string>`| Custom heading title for TOC section | `## Table of Contents` |
| `--no-title` | Omit section title heading | `false` |

---

### Exit Codes

| Code | Status | Meaning |
| :---: | :--- | :--- |
| `0` | **Healthy** | All documentation checks passed with zero errors or warnings (or within warning tolerance) |
| `1` | **Warnings** | Passed with non-blocking warnings (e.g. missing optional docs or skipped heading depths) |
| `2` | **Errors** | Failed with critical errors (broken links, missing required files, or score below threshold) |

---

## Validation Rules

| Rule ID | Severity | Description |
| :--- | :---: | :--- |
| `heading-missing-h1` | `warning` | Document lacks a primary `# Document Title` |
| `heading-multiple-h1` | `warning` | Document contains more than one top-level `# Title` |
| `heading-hierarchy` | `warning` | Heading levels jump unexpectedly (e.g. `H1` followed directly by `H3`) |
| `heading-duplicate` | `info` | Identical heading titles causing anchor collision or ambiguity |
| `heading-empty-section` | `warning` | Heading has no body content or description under it |
| `anchor-broken` | `error` | Internal link `[Text](#anchor)` targets non-existent section |
| `link-missing-file` | `error` | Relative markdown link references a file that does not exist on disk |


---

## Programmatic API

`docs-healthcheck` is fully typed and exports standard ESM & CommonJS modules:

```ts
import {
  checkDocumentation,
  validateMarkdown,
  generateToc,
  updateToc,
  slugify,
} from "docs-healthcheck";
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

### As a GitHub Action

```yaml
- name: Check Documentation Quality Gate
  uses: muhamadzolfaghari/docs-healthcheck@v2
  with:
    path: "."
    ci: "true"
    min-score: "80"
```

### In GitHub Actions Workflow

```yaml
name: Docs Quality Gate

on: [push, pull_request]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx --yes docs-healthcheck . --ci --min-score 75
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

- 🎯 **v0.2:** External URL liveness validation, custom configuration files (`.docsrc.json` / `docs-healthcheck.config.js`), and documentation completeness heuristics.
- 🚀 **v0.3:** Official GitHub Action release on GitHub Marketplace with PR inline annotations and automated summary comments.
- 🤖 **v0.4:** Model Context Protocol (MCP) Server integration allowing AI agents (like Claude Desktop and Gemini) to query documentation quality and auto-apply suggested fixes.

---

## Contributing

Contributions are always welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

---

## License

MIT © [Muhamad Zolfaghari](https://github.com/muhamadzolfaghari)

