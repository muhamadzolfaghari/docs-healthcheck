# Markdown Rule Scenario Verification

The purpose of this matrix is to prevent docs-healthcheck from confusing Markdown syntax with opinionated documentation style.

## Content after headings

A heading does **not** require a prose paragraph immediately after it.

The following are all valid section content:

- paragraphs
- lists and task lists
- fenced code blocks
- tables
- images
- blockquotes
- HTML blocks
- nested subsections

A leaf heading with no direct content at all is reported as informational only.

## Scenario matrix

| Scenario | Expected result |
| --- | --- |
| Rich healthy README | No issues, score 100 |
| Heading followed by list/code/table/image/blockquote | Healthy |
| Parent heading followed immediately by nested subsection | Healthy |
| Truly empty leaf section | INFO advisory |
| One broken anchor inside otherwise healthy Markdown | ERROR only for the broken anchor |
| Missing relative file | ERROR |
| Skipped heading rank | WARNING |
| Multiple H1 headings | INFO convention |
| Duplicate heading text | INFO convention |
| Severe mixed document | Correctness + structural findings together |
| Disabled advisory rule | No issue emitted |
| Severity override | Project-defined severity is used |

## Executable verification

The scenario matrix is enforced by:

- `tests/unit/markdown-scenarios.test.ts`
- `tests/unit/rule-catalog.test.ts`

The authoritative metadata is:

- `src/core/rule-catalog.ts`

The detector implementation is:

- `src/core/rules.ts`

The distinction matters: the catalog defines policy and provenance; detector code only identifies conditions.
