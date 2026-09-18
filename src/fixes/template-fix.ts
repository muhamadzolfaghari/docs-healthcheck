import fs from "fs";
import path from "path";
import { RepoHealthCheckItem } from "../core/types.js";
import { FixProposal } from "./types.js";

const GENERIC_CONTRIBUTING = `# Contributing Guide

Thank you for your interest in contributing to this project!

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Create a descriptive feature branch (\`git checkout -b feat/my-new-feature\`).

## Development

<!-- Add project-specific setup and build instructions here -->

\`\`\`bash
# Install dependencies
npm install

# Run tests
npm test
\`\`\`

## Pull Request Guidelines

- Ensure existing tests pass before submitting.
- Write unit tests for new features or bug fixes.
- Follow existing code formatting and documentation standards.
`;

const GENERIC_CODE_OF_CONDUCT = `# Contributor Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, caste, color, religion, or sexual identity
and orientation.

## Our Standards

Examples of behavior that contributes to a positive environment for our community include:

* Demonstrating empathy and kindness toward other people
* Being respectful of differing opinions, viewpoints, and experiences
* Giving and gracefully accepting constructive feedback
* Accepting responsibility and apologizing to those affected by our mistakes

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the project maintainers. All complaints will be reviewed and
investigated promptly and fairly.
`;

const GENERIC_CHANGELOG = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial setup and documentation structure.
`;

/**
 * Plans creation of generic starter repository documents
 */
export function planTemplateFix(
  check: RepoHealthCheckItem,
  rootDir: string
): FixProposal | null {
  if (check.status !== "missing" && check.status !== "warning") {
    return null;
  }

  let fileName = "";
  let templateContent = "";
  let title = "";

  if (check.id === "contributing") {
    fileName = "CONTRIBUTING.md";
    templateContent = GENERIC_CONTRIBUTING;
    title = "Create starter CONTRIBUTING.md template";
  } else if (check.id === "code-of-conduct") {
    fileName = "CODE_OF_CONDUCT.md";
    templateContent = GENERIC_CODE_OF_CONDUCT;
    title = "Create starter CODE_OF_CONDUCT.md template";
  } else if (check.id === "changelog") {
    fileName = "CHANGELOG.md";
    templateContent = GENERIC_CHANGELOG;
    title = "Create starter CHANGELOG.md template";
  } else {
    return null;
  }

  const targetPath = path.join(rootDir, fileName);
  if (fs.existsSync(targetPath)) {
    return null;
  }

  return {
    id: `template-missing:${fileName}`,
    ruleId: `repo-${check.id}-missing`,
    file: fileName,
    safety: "confirm",
    confidence: "medium",
    title,
    description: `Generate a standard generic ${fileName} starter template with setup placeholders`,
    reason: `Repository is missing ${fileName}. A starter template establishes baseline open-source contributor standards.`,
    before: "(File does not exist)",
    after: `New ${fileName} template`,
    deterministic: true,
    operation: {
      type: "write-file",
      file: fileName,
      content: templateContent,
      templateName: fileName,
    },
  };
}
