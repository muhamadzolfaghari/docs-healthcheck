import fs from "fs";
import path from "path";
import { RepoHealthCheckItem } from "../core/types.js";

const LICENSE_CANDIDATES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE",
  "LICENCE.md",
  "UNLICENSE",
];

export function checkLicense(rootDir: string): RepoHealthCheckItem {
  for (const name of LICENSE_CANDIDATES) {
    const fullPath = path.join(rootDir, name);
    if (fs.existsSync(fullPath)) {
      return {
        id: "license",
        name: "License File",
        required: true,
        weight: 20,
        status: "found",
        foundPath: name,
        message: `Found ${name}`,
      };
    }
  }

  return {
    id: "license",
    name: "License File",
    required: true,
    weight: 20,
    status: "missing",
    message: "Missing LICENSE file in repository root",
  };
}

export function checkDocsDirectory(rootDir: string): RepoHealthCheckItem {
  const docsPath = path.join(rootDir, "docs");
  if (fs.existsSync(docsPath) && fs.statSync(docsPath).isDirectory()) {
    const files = fs.readdirSync(docsPath);
    return {
      id: "docs-dir",
      name: "Documentation Directory",
      required: false,
      weight: 10,
      status: "found",
      foundPath: "docs/",
      message: `Found docs/ directory with ${files.length} items`,
    };
  }

  return {
    id: "docs-dir",
    name: "Documentation Directory",
    required: false,
    weight: 10,
    status: "warning",
    message: "Missing docs/ directory for in-depth documentation",
  };
}

export function checkExamplesDirectory(rootDir: string): RepoHealthCheckItem {
  const candidates = ["examples", "example", "samples", "demo"];
  for (const name of candidates) {
    const fullPath = path.join(rootDir, name);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      const files = fs.readdirSync(fullPath);
      return {
        id: "examples-dir",
        name: "Examples Directory",
        required: false,
        weight: 10,
        status: "found",
        foundPath: `${name}/`,
        message: `Found ${name}/ directory with ${files.length} items`,
      };
    }
  }

  return {
    id: "examples-dir",
    name: "Examples Directory",
    required: false,
    weight: 10,
    status: "warning",
    message: "Missing examples/ or demo/ directory for practical code samples",
  };
}
