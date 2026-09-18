# docs-healthcheck

[![npm version](https://img.shields.io/npm/v/docs-healthcheck.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/docs-healthcheck)
[![CI](https://img.shields.io/github/actions/workflow/status/muhamadzolfaghari/docs-healthcheck/test.yml?branch=main&style=flat-square)](https://github.com/muhamadzolfaghari/docs-healthcheck/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Online Playground](https://img.shields.io/badge/Online-Playground-4ade80.svg?style=flat-square)](https://muhamadzolfaghari.github.io/docs-healthcheck/)

> **Documentation quality gate and deterministic auto-repair engine for Markdown repositories.**

Analyze documentation health, find broken links and anchors, validate heading structure, keep managed TOCs synchronized, repair deterministic issues, and use the same rules from the CLI, CI, or TypeScript API.

**Online playground:** https://muhamadzolfaghari.github.io/docs-healthcheck/

The browser playground runs locally in the tab: paste Markdown or open a local `.md` file, inspect issues, apply deterministic SAFE fixes, restore the pre-fix text, and save the result.

---

<!-- TOC START -->

## Table of Contents

- [Why docs-healthcheck?](#why-docs-healthcheck)
- [Rule Sources & Single Source of Truth](#rule-sources--single-source-of-truth)
  - [Evidence levels](#evidence-levels)
  - [Markdown rules and references](#markdown-rules-and-references)
  - [A heading does not need a prose paragraph](#a-heading-does-not-need-a-prose-paragraph)
  - [Repository-health rule sources](#repository-health-rule-sources)
  - [Verification contract](#verification-contract)
- [Quick Start](#quick-start)
- [Repair Safety Model](#repair-safety-model)
- [Deterministic Repair Capabilities](#deterministic-repair-capabilities)
- [Online Playground](#online-playground)
- [CLI Reference](#cli-reference)
  - [Read-only analysis](#read-only-analysis)
  - [Repair](#repair)
  - [Revert](#revert)
  - [Single-file validation](#single-file-validation)
  - [TOC generation](#toc-generation)
  - [Exit codes](#exit-codes)
- [Validation Coverage](#validation-coverage)
- [Programmatic API](#programmatic-api)
- [CI/CD Integration](#cicd-integration)
- [Safety & File-System Guarantees](#safety--file-system-guarantees)
- [Unicode & RTL](#unicode--rtl)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

<!-- TOC END -->

---

## Why docs-healthcheck?

Markdown repositories accumulate problems that normal formatting tools do not always catch:

- broken internal anchors
- missing relative files
- broken cross-file anchors
- stale managed tables of contents
- heading hierarchy jumps
- duplicate headings (advisory)
- truly empty leaf sections (advisory heuristic)
- missing repository documentation
- moved or misspelled image paths
- broken reference-style link definitions
- case and extension mismatches in relative paths

`docs-healthcheck` treats documentation as an engineering artifact with a repeatable quality gate.

The core workflow is:

```text
Detect
  ↓
Explain
  ↓
Classify safety
  ↓
Preview
  ↓
Apply deterministic fixes
  ↓
Re-run validation
  ↓
Report the result
```

It does **not** use an LLM to invent documentation content.

---

## Rule Sources & Single Source of Truth

The authoritative metadata for validation rules is **`src/core/rule-catalog.ts`**.

That catalog is the single source of truth for:

- rule IDs
- default severity
- evidence/authority class
- rationale
- external references
- repository-health weights
- whether a repository-health check is required

`src/core/rules.ts` implements detection; it does not define the default policy severity.
`src/checks/*` detects repository state; `src/checks/repo-health.ts` applies the central catalog's weights and required/optional policy.

The catalog is exported through the public TypeScript API so CLIs, agents, IDE integrations, and future MCP tooling can inspect the same rule metadata used by the package.

### Evidence levels

| Evidence class | What it means | Default enforcement |
| --- | --- | --- |
| **Platform correctness** | GitHub navigation/file behavior is objectively broken | `error` |
| **Accessibility best practice** | Supported by W3C/WAI structural guidance | `warning` |
| **Markdown style convention** | Established convention such as markdownlint, but valid Markdown may differ | `info` by default |
| **Repository policy** | GitHub Community Standards–informed repository-health policy | weighted repository check |
| **docs-healthcheck heuristic** | Useful quality signal owned by this project, not presented as Markdown law | `info` |

### Markdown rules and references

| Rule | Default | Evidence | References |
| --- | :---: | --- | --- |
| `anchor-broken` | ERROR | Platform correctness | [GitHub section links](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links) |
| `link-missing-file` | ERROR | Platform correctness | [GitHub relative links and image paths](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#relative-links) |
| `heading-hierarchy` | WARNING | Accessibility best practice | [W3C WAI headings](https://www.w3.org/WAI/tutorials/page-structure/headings/), [markdownlint MD001](https://github.com/DavidAnson/markdownlint/blob/main/doc/md001.md) |
| `heading-missing-h1` | INFO | Style convention | [markdownlint MD041](https://github.com/DavidAnson/markdownlint/blob/main/doc/md041.md), [W3C WAI headings](https://www.w3.org/WAI/tutorials/page-structure/headings/) |
| `heading-multiple-h1` | INFO | Style convention | [markdownlint MD025](https://github.com/DavidAnson/markdownlint/blob/main/doc/md025.md) |
| `heading-duplicate` | INFO | Style convention | [GitHub duplicate-anchor behavior](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links), [markdownlint MD024](https://github.com/DavidAnson/markdownlint/blob/main/doc/md024.md) |
| `heading-empty-section` | INFO | docs-healthcheck heuristic | [GitHub Docs writing best practices](https://docs.github.com/en/contributing/writing-for-github-docs/best-practices-for-github-docs), [CommonMark](https://spec.commonmark.org/current/) |

### A heading does not need a prose paragraph

`docs-healthcheck` does **not** require paragraph text immediately after a heading.

All of these count as valid section content:

- prose
- lists and task lists
- fenced code blocks
- tables
- images
- blockquotes
- HTML blocks
- nested subsections

A truly empty **leaf** section is only an `INFO` advisory. It is deliberately not a warning/error because CommonMark does not require every heading to contain a prose paragraph.

### Repository-health rule sources

README, LICENSE, CONTRIBUTING, and CODE_OF_CONDUCT checks are informed by
[GitHub Community Profiles](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories).

Checks such as `docs/`, examples/demo, and CHANGELOG are explicitly identified as docs-healthcheck policy/heuristics rather than universal Markdown or GitHub requirements.

### Verification contract

The rule documentation is executable rather than aspirational:

- `tests/unit/rule-catalog.test.ts` fails if a Markdown rule is missing from the catalog or has no reference URL.
- `tests/unit/markdown-scenarios.test.ts` exercises fully healthy, partially broken, severely broken, non-prose, nested-section, and configurable-policy cases.
- `ValidationConfig.rules` can disable a rule or override its severity for project-specific policy.
- CI exercises the package across Node 18/20/22 on Linux, macOS, and Windows.
- The browser playground mirrors a useful subset, but the CLI/library catalog is authoritative for release gating.

See [docs/rule-scenarios.md](./docs/rule-scenarios.md) for the executable scenario philosophy.

---

## Quick Start

Install it globally:

```bash
npm install -g docs-healthcheck
```

Or run it directly:

```bash
npx docs-healthcheck
```

Read-only health analysis:

```bash
npx docs-healthcheck
npx docs-healthcheck lint
npx docs-healthcheck scan .
```

All three commands above are read-only. `lint` is an alias for `scan`.

Preview deterministic repairs without changing files:

```bash
npx docs-healthcheck fix --dry-run
```

Run interactive repair:

```bash
npx docs-healthcheck fix
```

Apply only SAFE deterministic fixes without prompts:

```bash
npx docs-healthcheck fix --yes
```

Revert the last applied fix session:

```bash
npx docs-healthcheck revert
```

---

## Repair Safety Model

Every proposal is classified before mutation.

| Safety | Meaning | Applied by `--yes`? |
| --- | --- | :---: |
| **SAFE** | Deterministic target with sufficiently strong evidence | **Yes** |
| **CONFIRM** | Technically repairable but may affect author intent | No |
| **MANUAL** | Ambiguous or semantic decision required | No |

The guiding rule is:

> **Automate certainty. Ask before changing intent. Never invent documentation.**

Typical classifications:

| Repair | Safety |
| --- | :---: |
| Managed TOC synchronization | SAFE |
| Unique broken internal anchor | SAFE |
| Unique broken relative path | SAFE |
| Unique cross-file anchor correction | SAFE |
| Unique reference-style definition correction | SAFE |
| Unique image/media source correction | SAFE |
| Heading hierarchy adjustment | CONFIRM |
| Starter repository-document template | CONFIRM |
| Ambiguous file/link target | MANUAL |
| Duplicate heading rename | MANUAL |
| Empty section content | MANUAL |

---

## Deterministic Repair Capabilities

### Managed TOCs

Synchronizes content inside managed markers:

```markdown
<!-- TOC START -->

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)

<!-- TOC END -->
```

Line endings are preserved, including CRLF repositories on Windows.

### Internal anchors

Repairs a broken anchor when there is one deterministic heading target:

```diff
- [Install](#instalation)
+ [Install](#installation)
```

### Cross-file anchors

Validates the referenced Markdown file and repairs a uniquely resolvable target:

```diff
- [Deployment](./docs/guide.md#deploymnt)
+ [Deployment](./docs/guide.md#deployment)
```

### Relative Markdown paths

Repairs deterministic path problems including:

- missing Markdown extensions
- path depth changes
- moved files
- case mismatches
- uniquely resolvable filename typos

Example:

```diff
- [Troubleshooting](./troubleshootng.md)
+ [Troubleshooting](./docs/guides/troubleshooting.md)
```

### Reference-style definitions

Validates and repairs reference definitions directly:

```diff
- [guide]: ./docs/confg.md
+ [guide]: ./docs/config.md
```

### Images and HTML media sources

Validates Markdown images and HTML `<img>` sources:

```diff
- ![Architecture](./assets/archtecture-diagram.png)
+ ![Architecture](./assets/architecture-diagram.png)
```

### Revert sessions

Applied fix sessions are journaled so the most recent repair can be reverted:

```bash
npx docs-healthcheck revert
npx docs-healthcheck revert --dry-run
```

---

## Online Playground

The browser playground is a lightweight companion to the CLI:

**https://muhamadzolfaghari.github.io/docs-healthcheck/**

It supports:

- paste/edit Markdown
- open a local Markdown file
- built-in broken example
- live browser health score
- heading hierarchy checks
- duplicate and empty-section checks
- internal-anchor validation
- managed TOC validation
- SAFE / CONFIRM / MANUAL classification
- SAFE repair
- restore-before-fix
- copy and save Markdown

The browser version intentionally operates on one Markdown document at a time.

Repository-wide checks such as filesystem traversal, cross-file validation, repository standards, fix-session journaling, and CI quality gates remain CLI responsibilities.

The playground source lives in `docs/`, matching the repository's GitHub Pages structure.

---

## CLI Reference

### Read-only analysis

```bash
docs-healthcheck
docs-healthcheck lint
docs-healthcheck scan [path]
```

Common options:

```text
--json
--markdown
--verbose
--ci
--strict
--min-score <n>
--silent
```

### Repair

Interactive repair:

```bash
docs-healthcheck fix [path]
```

Preview only:

```bash
docs-healthcheck fix [path] --dry-run
```

Apply SAFE fixes without prompting:

```bash
docs-healthcheck fix [path] --yes
docs-healthcheck fix [path] --safe-only
```

Optional backup files:

```bash
docs-healthcheck fix [path] --backup
```

Root-command shortcut:

```bash
docs-healthcheck --fix --yes
```

### Revert

```bash
docs-healthcheck revert [path]
docs-healthcheck revert [path] --dry-run
docs-healthcheck fix revert [path]
```

### Single-file validation

```bash
docs-healthcheck check README.md
docs-healthcheck check README.md --json
docs-healthcheck check README.md --markdown
```

### TOC generation

Print a generated TOC:

```bash
docs-healthcheck toc README.md
```

Write/update it in the file:

```bash
docs-healthcheck toc README.md --write
```

Additional options:

```text
--min-depth <n>
--max-depth <n>
--ordered
--title <title>
--no-title
```

### Exit codes

| Code | Meaning |
| :---: | --- |
| `0` | Healthy / command completed successfully |
| `1` | Non-blocking warnings |
| `2` | Errors, failed health threshold, or warnings under `--strict` |

---

## Validation Coverage

The current engine covers repository-level and Markdown-level checks including:

| Area | Examples |
| --- | --- |
| Headings | missing/multiple H1 advisories, hierarchy warnings, duplicate-heading advisories, empty-leaf heuristics |
| Anchors | internal anchors, reference anchors, cross-file fragments |
| Files | broken relative paths, extension mismatches, case mismatches, moved files |
| Media | Markdown image sources and HTML `img src` paths |
| TOC | managed marker synchronization and deterministic regeneration |
| Repository health | README, LICENSE, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, docs, examples |
| Reporting | terminal, JSON, GitHub Markdown |
| Repair | dry-run, interactive, SAFE-only, backup, revert |
| Unicode | Persian, Arabic and other Unicode headings |

The quality workflow currently exercises Node 18, 20 and 22 across Linux, macOS and Windows.

---

## Programmatic API

```ts
import {
  checkDocumentation,
  fixDocumentation,
  revertDocumentation,
  createFixPlan,
  executeFixPlan,
  revertFixes,
  validateMarkdown,
  generateToc,
  updateToc,
  slugify,
  Slugger,
} from "docs-healthcheck";
```

Check a repository:

```ts
const report = checkDocumentation("./my-project", {
  minScore: 80,
  strict: false,
});

console.log(report.score);
console.log(report.passed);
```

Validate Markdown content:

```ts
const result = validateMarkdown(`
# API

## Endpoints

[Missing](#does-not-exist)
`);

console.log(result.valid);
console.log(result.issues);
```

Preview or apply deterministic repairs:

```ts
const report = fixDocumentation("./my-project", {
  dryRun: true,
  safeOnly: true,
});

console.log(report.beforeScore);
console.log(report.afterScore);
console.log(report.applied);
```

Revert the last repair session:

```ts
const revert = revertDocumentation("./my-project", {
  dryRun: false,
});

console.log(revert.restoredFiles);
console.log(revert.deletedFiles);
```

Generate a TOC:

```ts
const toc = generateToc(markdownContent, {
  minDepth: 2,
  maxDepth: 4,
  ordered: false,
});
```

---

## CI/CD Integration

A minimal documentation quality gate:

```yaml
name: Documentation Health

on:
  push:
  pull_request:

jobs:
  docs:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 22

      - run: npx --yes docs-healthcheck . --ci --min-score 80
```

Preview repairs in CI without mutating files:

```yaml
- run: npx --yes docs-healthcheck fix . --dry-run --markdown
```

For automated mutation in controlled workflows, use SAFE-only mode:

```bash
npx docs-healthcheck fix . --yes
```

This repository's own quality workflow uses a 3 × 3 matrix:

```text
Node: 18 / 20 / 22
OS:   Linux / macOS / Windows
```

The browser playground is statically validated as part of the same quality workflow.

---

## Safety & File-System Guarantees

The repair engine is designed to avoid broad or speculative mutation.

It includes:

- root-boundary checks
- path traversal protection
- symlink-aware safety checks
- atomic file writes
- UTF-8 handling
- line-ending preservation
- optional `.bak` backups
- dry-run mode with zero writes
- fix-session rollback
- no execution of Markdown content
- no network or AI requirement for deterministic fixes

`--yes` does **not** mean "change everything." It applies SAFE proposals only.

---

## Unicode & RTL

Persian and Arabic headings are supported alongside other Unicode text.

Example:

```markdown
# راهنمای استفاده

## نصب و راه‌اندازی

## پیکربندی سیستم
```

The slugger preserves Unicode content while producing stable Markdown anchors.

---

## Project Structure

```text
docs-healthcheck/
├── bin/                 CLI entrypoint
├── demo/                healthy, broken and fixable examples
├── docs/                GitHub Pages playground + project docs
├── fixtures/            deterministic repair fixtures
├── src/
│   ├── checks/          repository health checks
│   ├── cli/             command-line interface
│   ├── core/            analysis engine and rules
│   ├── fixes/           planner, executor, revert and safety logic
│   ├── markdown/        parser, headings, links, anchors and TOC
│   └── reporters/       terminal, JSON and Markdown reporters
└── tests/
    ├── integration/
    └── unit/
```

---

## Roadmap

### v2.2

- external URL liveness validation
- rate limiting and caching for network checks
- richer pull-request annotations

### v2.3

- MCP server integration
- agent-friendly documentation health queries
- deterministic repair actions exposed to AI engineering workflows

---

## Contributing

Contributions are welcome.

Please read:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

---

## License

MIT © [Mohammad Zolfaghari](https://github.com/muhamadzolfaghari)
