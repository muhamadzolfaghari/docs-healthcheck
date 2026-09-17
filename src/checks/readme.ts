import fs from "fs";
import path from "path";
import { RepoHealthCheckItem } from "../core/types.js";

const README_CANDIDATES = [
  "README.md",
  "readme.md",
  "README.markdown",
  "Readme.md",
];

export function checkReadme(rootDir: string): RepoHealthCheckItem {
  for (const name of README_CANDIDATES) {
    const fullPath = path.join(rootDir, name);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const hasLength = content.trim().length > 100;
      return {
        id: "readme",
        name: "README File",
        required: true,
        weight: 30,
        status: hasLength ? "found" : "warning",
        foundPath: name,
        message: hasLength
          ? `Found ${name} (${content.split(/\r?\n/).length} lines)`
          : `Found ${name} but content is very short (< 100 chars)`,
      };
    }
  }

  return {
    id: "readme",
    name: "README File",
    required: true,
    weight: 30,
    status: "missing",
    message: "Missing README.md in repository root",
  };
}
