import fs from "fs";
import path from "path";
import { RepoHealthCheckItem } from "../core/types.js";

const CONTRIBUTING_CANDIDATES = [
  "CONTRIBUTING.md",
  "contributing.md",
  ".github/CONTRIBUTING.md",
  "docs/CONTRIBUTING.md",
];

const CODE_OF_CONDUCT_CANDIDATES = [
  "CODE_OF_CONDUCT.md",
  "code_of_conduct.md",
  ".github/CODE_OF_CONDUCT.md",
  "docs/CODE_OF_CONDUCT.md",
];

export function checkContributing(rootDir: string): RepoHealthCheckItem {
  for (const name of CONTRIBUTING_CANDIDATES) {
    const fullPath = path.join(rootDir, name);
    if (fs.existsSync(fullPath)) {
      return {
        id: "contributing",
        name: "Contributing Guide",
        required: false,
        weight: 10,
        status: "found",
        foundPath: name,
        message: `Found ${name}`,
      };
    }
  }

  return {
    id: "contributing",
    name: "Contributing Guide",
    required: false,
    weight: 10,
    status: "warning",
    message: "Missing CONTRIBUTING.md guide for open-source contributors",
  };
}

export function checkCodeOfConduct(rootDir: string): RepoHealthCheckItem {
  for (const name of CODE_OF_CONDUCT_CANDIDATES) {
    const fullPath = path.join(rootDir, name);
    if (fs.existsSync(fullPath)) {
      return {
        id: "code-of-conduct",
        name: "Code of Conduct",
        required: false,
        weight: 5,
        status: "found",
        foundPath: name,
        message: `Found ${name}`,
      };
    }
  }

  return {
    id: "code-of-conduct",
    name: "Code of Conduct",
    required: false,
    weight: 5,
    status: "warning",
    message: "Missing CODE_OF_CONDUCT.md community standards guide",
  };
}
