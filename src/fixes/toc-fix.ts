import fs from "fs";
import path from "path";
import { FixProposal } from "./types.js";
import { updateTocInContent } from "../markdown/toc.js";

/**
 * Detects if a markdown file has stale managed TOC markers
 */
export function planTocFixes(filePath: string, baseDir: string): FixProposal[] {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath);
  if (!fs.existsSync(resolved)) return [];

  const content = fs.readFileSync(resolved, "utf8");
  const markerRegex = /(^[ \t]*<!--\s*(?:TOC\s+START|toc|START\s+doctoc|TOC)\s*-->[ \t]*\r?\n)([\s\S]*?)(^[ \t]*<!--\s*(?:TOC\s+END|\/toc|END\s+doctoc|\/TOC)\s*-->[ \t]*$)/im;
  
  if (!markerRegex.test(content)) {
    return [];
  }


  const result = updateTocInContent(content);
  if (result.updatedContent && result.updatedContent !== content) {
    const relFile = path.relative(baseDir, resolved) || filePath;
    return [
      {
        id: `toc-outdated:${relFile}`,
        ruleId: "toc-outdated",
        file: relFile,
        safety: "safe",
        confidence: "high",
        title: `Regenerate Table of Contents in ${relFile}`,
        description: `Synchronize stale managed Table of Contents with ${result.headingsCount} current headings`,
        reason: "Managed TOC markers <!-- TOC START --> are out of sync with current heading hierarchy",
        before: "Outdated Table of Contents block",
        after: `Synchronized Table of Contents (${result.headingsCount} entries)`,
        deterministic: true,
        operation: {
          type: "update-toc",
          file: relFile,
          updatedContent: result.updatedContent,
          headingsCount: result.headingsCount,
        },
      },
    ];
  }

  return [];
}
