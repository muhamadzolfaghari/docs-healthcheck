import { RepoHealthCheckItem } from "../core/types.js";
import { checkReadme } from "./readme.js";
import { checkLicense, checkDocsDirectory, checkExamplesDirectory } from "./metadata.js";
import { checkChangelog } from "./changelog.js";
import { checkContributing, checkCodeOfConduct } from "./contributing.js";
import { checkPackageJson } from "./package.js";

export function evaluateRepoHealth(rootDir: string): {
  items: RepoHealthCheckItem[];
  score: number;
} {
  const items: RepoHealthCheckItem[] = [
    checkReadme(rootDir),
    checkLicense(rootDir),
    checkPackageJson(rootDir),
    checkChangelog(rootDir),
    checkContributing(rootDir),
    checkCodeOfConduct(rootDir),
    checkDocsDirectory(rootDir),
    checkExamplesDirectory(rootDir),
  ];

  let earned = 0;
  let totalWeight = 0;

  for (const item of items) {
    totalWeight += item.weight;
    if (item.status === "found") {
      earned += item.weight;
    } else if (item.status === "warning") {
      // Partial credit for warning
      earned += item.weight * 0.4;
    }
  }

  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

  return {
    items,
    score,
  };
}

