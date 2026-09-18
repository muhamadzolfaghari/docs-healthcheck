import { ValidationRuleId, ValidationSeverity } from "./types.js";

export type RuleAuthority =
  | "platform-correctness"
  | "accessibility-best-practice"
  | "markdown-style-convention"
  | "repository-policy"
  | "docs-healthcheck-heuristic";

export interface RuleReference { label: string; url: string; }

export interface MarkdownRuleDefinition {
  id: ValidationRuleId;
  title: string;
  scope: "markdown";
  authority: RuleAuthority;
  defaultSeverity: ValidationSeverity;
  rationale: string;
  references: RuleReference[];
}

export const MARKDOWN_RULE_CATALOG: Record<ValidationRuleId, MarkdownRuleDefinition> = {
  "heading-missing-h1": {
    id: "heading-missing-h1",
    title: "Document has no top-level H1 title",
    scope: "markdown",
    authority: "markdown-style-convention",
    defaultSeverity: "info",
    rationale: "A top-level title is a common documentation convention and accessibility aid, but Markdown syntax does not require every file to start with H1.",
    references: [
      { label: "markdownlint MD041", url: "https://github.com/DavidAnson/markdownlint/blob/main/doc/md041.md" },
      { label: "W3C WAI Headings", url: "https://www.w3.org/WAI/tutorials/page-structure/headings/" },
    ],
  },
  "heading-multiple-h1": {
    id: "heading-multiple-h1",
    title: "Multiple top-level H1 headings",
    scope: "markdown",
    authority: "markdown-style-convention",
    defaultSeverity: "info",
    rationale: "A single document title is a common convention, but multiple H1 headings are valid Markdown and are advisory rather than a correctness error.",
    references: [
      { label: "markdownlint MD025", url: "https://github.com/DavidAnson/markdownlint/blob/main/doc/md025.md" },
      { label: "W3C WAI Headings", url: "https://www.w3.org/WAI/tutorials/page-structure/headings/" },
    ],
  },
  "heading-hierarchy": {
    id: "heading-hierarchy",
    title: "Heading rank skips a level",
    scope: "markdown",
    authority: "accessibility-best-practice",
    defaultSeverity: "warning",
    rationale: "Logical heading nesting improves navigation and accessibility. Skipping ranks is valid Markdown but can make document structure confusing.",
    references: [
      { label: "W3C WAI Headings", url: "https://www.w3.org/WAI/tutorials/page-structure/headings/" },
      { label: "markdownlint MD001", url: "https://github.com/DavidAnson/markdownlint/blob/main/doc/md001.md" },
    ],
  },
  "heading-duplicate": {
    id: "heading-duplicate",
    title: "Duplicate heading text",
    scope: "markdown",
    authority: "markdown-style-convention",
    defaultSeverity: "info",
    rationale: "GitHub disambiguates duplicate generated anchors with numeric suffixes, so duplicates are not invalid. They can still reduce clarity and make links fragile when headings are reordered.",
    references: [
      { label: "GitHub section links", url: "https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links" },
      { label: "markdownlint MD024", url: "https://github.com/DavidAnson/markdownlint/blob/main/doc/md024.md" },
    ],
  },
  "heading-empty-section": {
    id: "heading-empty-section",
    title: "Section has no direct content or subsections",
    scope: "markdown",
    authority: "docs-healthcheck-heuristic",
    defaultSeverity: "info",
    rationale: "This is a documentation usefulness heuristic, not a Markdown syntax rule. Lists, code blocks, tables, images, blockquotes, HTML, and nested subsections all count as content.",
    references: [
      { label: "GitHub Docs writing best practices", url: "https://docs.github.com/en/contributing/writing-for-github-docs/best-practices-for-github-docs" },
      { label: "CommonMark specification", url: "https://spec.commonmark.org/current/" },
    ],
  },
  "anchor-broken": {
    id: "anchor-broken",
    title: "Broken local or cross-file heading anchor",
    scope: "markdown",
    authority: "platform-correctness",
    defaultSeverity: "error",
    rationale: "The link resolves to an anchor that GitHub cannot find in the target document, so navigation is objectively broken.",
    references: [
      { label: "GitHub section links", url: "https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links" },
    ],
  },
  "link-missing-file": {
    id: "link-missing-file",
    title: "Relative file or image target does not exist",
    scope: "markdown",
    authority: "platform-correctness",
    defaultSeverity: "error",
    rationale: "A relative repository link or image source that resolves to no file is objectively broken.",
    references: [
      { label: "GitHub relative links and image paths", url: "https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#relative-links" },
    ],
  },
};

export const REPO_HEALTH_RULE_IDS = [
  "readme", "license", "package-json", "changelog",
  "contributing", "code-of-conduct", "docs-dir", "examples-dir",
] as const;
export type RepoHealthRuleId = (typeof REPO_HEALTH_RULE_IDS)[number];

export interface RepoHealthRuleDefinition {
  id: RepoHealthRuleId;
  title: string;
  scope: "repository";
  authority: RuleAuthority;
  required: boolean;
  weight: number;
  rationale: string;
  references: RuleReference[];
}

export const REPO_HEALTH_RULE_CATALOG: Record<RepoHealthRuleId, RepoHealthRuleDefinition> = {
  readme: {
    id: "readme", title: "README", scope: "repository", authority: "repository-policy",
    required: true, weight: 30,
    rationale: "README is the primary repository entry point and is recommended by GitHub.",
    references: [{ label: "GitHub About READMEs", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes" }],
  },
  license: {
    id: "license", title: "License", scope: "repository", authority: "repository-policy",
    required: true, weight: 20,
    rationale: "A license communicates reuse terms and is part of GitHub community-profile guidance.",
    references: [{ label: "GitHub community profiles", url: "https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories" }],
  },
  "package-json": {
    id: "package-json", title: "Package metadata", scope: "repository", authority: "repository-policy",
    required: false, weight: 10,
    rationale: "Useful for npm projects and intentionally optional for non-npm repositories.",
    references: [{ label: "npm package.json", url: "https://docs.npmjs.com/cli/configuring-npm/package-json" }],
  },
  changelog: {
    id: "changelog", title: "Changelog", scope: "repository", authority: "docs-healthcheck-heuristic",
    required: false, weight: 15,
    rationale: "Version history is useful for maintained packages but is not required by Markdown or GitHub.",
    references: [{ label: "Keep a Changelog", url: "https://keepachangelog.com/en/1.1.0/" }],
  },
  contributing: {
    id: "contributing", title: "Contributing guide", scope: "repository", authority: "repository-policy",
    required: false, weight: 10,
    rationale: "GitHub recognizes CONTRIBUTING.md as a recommended community health file.",
    references: [{ label: "GitHub contributing guidelines", url: "https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors" }],
  },
  "code-of-conduct": {
    id: "code-of-conduct", title: "Code of Conduct", scope: "repository", authority: "repository-policy",
    required: false, weight: 5,
    rationale: "GitHub recognizes CODE_OF_CONDUCT.md as a recommended community health file.",
    references: [{ label: "GitHub code of conduct guidance", url: "https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-code-of-conduct-to-your-project" }],
  },
  "docs-dir": {
    id: "docs-dir", title: "Documentation directory", scope: "repository", authority: "docs-healthcheck-heuristic",
    required: false, weight: 10,
    rationale: "A docs/ directory is useful for larger projects but is not universally required.",
    references: [{ label: "GitHub README guidance", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes" }],
  },
  "examples-dir": {
    id: "examples-dir", title: "Examples or demo directory", scope: "repository", authority: "docs-healthcheck-heuristic",
    required: false, weight: 10,
    rationale: "Runnable examples improve usability for developer tools but are a docs-healthcheck heuristic.",
    references: [{ label: "GitHub README guidance", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes" }],
  },
};

export function getMarkdownRule(id: ValidationRuleId): MarkdownRuleDefinition {
  return MARKDOWN_RULE_CATALOG[id];
}
export function getRuleSeverity(id: ValidationRuleId): ValidationSeverity {
  return MARKDOWN_RULE_CATALOG[id].defaultSeverity;
}
export function getRepoHealthRule(id: RepoHealthRuleId): RepoHealthRuleDefinition {
  return REPO_HEALTH_RULE_CATALOG[id];
}
export function isRepoHealthRuleId(value: string): value is RepoHealthRuleId {
  return (REPO_HEALTH_RULE_IDS as readonly string[]).includes(value);
}
