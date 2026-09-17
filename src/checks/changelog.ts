import fs from "fs";
import path from "path";
import { RepoHealthCheckItem } from "../core/types.js";

const CHANGELOG_CANDIDATES = [
  "CHANGELOG.md",
  "changelog.md",
  "HISTORY.md",
  "RELEASES.md",
  "NEWS.md",
];

export function checkChangelog(rootDir: string): RepoHealthCheckItem {
  for (const name of CHANGELOG_CANDIDATES) {
    const fullPath = path.join(rootDir, name);
    if (fs.existsSync(fullPath)) {
      return {
        id: "changelog",
        name: "Changelog File",
        required: false,
        weight: 15,
        status: "found",
        foundPath: name,
        message: `Found ${name}`,
      };
    }
  }

  return {
    id: "changelog",
    name: "Changelog File",
    required: false,
    weight: 15,
    status: "warning",
    message: "Missing CHANGELOG.md to track version history and changes",
  };
}
