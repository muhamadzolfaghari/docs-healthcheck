import fs from "fs";
import path from "path";
import { runHealthCheck } from "../core/engine.js";
import { formatLineDiff } from "./diff.js";
import { updateTocInContent } from "../markdown/toc.js";
import { saveFixSession } from "./revert.js";
import {
  AppliedFix,
  FixExecutionOptions,
  FixExecutionReport,
  FixPlan,
  FixProposal,
  FixSnapshotEntry,
} from "./types.js";


/**
 * Validates that target path stays strictly within the root directory (prevents path traversal)
 */
function isSafePath(baseDir: string, targetFile: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.isAbsolute(targetFile)
    ? targetFile
    : path.resolve(resolvedBase, targetFile);

  const relative = path.relative(resolvedBase, resolvedTarget);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * Atomically write content to file
 */
function atomicWriteFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tempPath, content, "utf8");
  fs.renameSync(tempPath, filePath);
}

/**
 * Executes a fix plan against target files on disk
 */
export function executeFixPlan(
  plan: FixPlan,
  options: FixExecutionOptions = {},
  baseDir = process.cwd()
): FixExecutionReport {
  const resolvedBase = path.resolve(baseDir);
  const beforeReport = runHealthCheck(resolvedBase, { minScore: options.minScore });
  const beforeScore = beforeReport.score;

  const applied: AppliedFix[] = [];
  const skipped: FixProposal[] = [];
  const manual: FixProposal[] = [];
  const modifiedFilesSet = new Set<string>();

  // Determine filter policy
  const isDryRun = Boolean(options.dryRun);
  const isSafeOnly = Boolean(options.safeOnly || options.yes);
  const acceptedIds = options.acceptedProposalIds
    ? new Set(options.acceptedProposalIds)
    : null;

  // Group proposals by file
  const fileProposalsMap = new Map<string, FixProposal[]>();
  const newFileProposals: FixProposal[] = [];

  for (const proposal of plan.proposals) {
    if (proposal.safety === "manual") {
      manual.push(proposal);
      continue;
    }

    const isAccepted = acceptedIds
      ? acceptedIds.has(proposal.id)
      : isSafeOnly
      ? proposal.safety === "safe"
      : true;

    if (!isAccepted) {
      skipped.push(proposal);
      continue;
    }

    if (proposal.operation.type === "write-file") {
      newFileProposals.push(proposal);
    } else {
      const targetAbs = path.isAbsolute(proposal.file)
        ? proposal.file
        : path.resolve(resolvedBase, proposal.file);
      const relKey = path.relative(resolvedBase, targetAbs) || proposal.file;
      const list = fileProposalsMap.get(relKey) || [];
      list.push(proposal);
      fileProposalsMap.set(relKey, list);
    }
  }


  const snapshots: FixSnapshotEntry[] = [];
  const appliedFixIds: string[] = [];

  // 1. Process existing file modifications
  for (const [relFile, proposals] of fileProposalsMap.entries()) {
    const targetFileAbs = path.isAbsolute(relFile)
      ? relFile
      : path.resolve(resolvedBase, relFile);

    if (!isSafePath(resolvedBase, targetFileAbs)) {
      for (const p of proposals) {
        applied.push({
          proposal: p,
          success: false,
          error: `Security Violation: Path escapes project root (${relFile})`,
        });
      }
      continue;
    }

    if (isDryRun) {
      for (const p of proposals) {
        let diff = "";
        const op = p.operation;
        if (op.type === "replace-text") {
          diff = formatLineDiff(op.lineContentBefore, op.lineContentAfter);
        } else if (op.type === "replace-heading") {
          diff = formatLineDiff(op.originalHeading, op.replacementHeading);
        } else if (op.type === "update-toc") {
          diff = `Table of Contents in ${p.file} will be regenerated (${op.headingsCount} entries)`;
        }
        applied.push({ proposal: p, success: true, diff });
        modifiedFilesSet.add(p.file);
      }
      continue;
    }

    // Live Execution on existing file
    try {
      if (!fs.existsSync(targetFileAbs)) {
        throw new Error(`File not found: ${relFile}`);
      }

      const originalRaw = fs.readFileSync(targetFileAbs, "utf8");
      let fileContent = originalRaw;

      // 1A. Apply text and heading replacements first
      for (const p of proposals) {
        const op = p.operation;
        if (op.type === "replace-text") {
          if (fileContent.includes(op.originalText)) {
            fileContent = fileContent.replace(op.originalText, op.replacementText);
            applied.push({
              proposal: p,
              success: true,
              diff: formatLineDiff(op.lineContentBefore, op.lineContentAfter),
            });
            appliedFixIds.push(p.id);
          } else {
            applied.push({
              proposal: p,
              success: false,
              error: `Could not locate target text "${op.originalText}" in ${relFile}`,
            });
          }
        } else if (op.type === "replace-heading") {
          if (fileContent.includes(op.originalHeading)) {
            fileContent = fileContent.replace(op.originalHeading, op.replacementHeading);
            applied.push({
              proposal: p,
              success: true,
              diff: formatLineDiff(op.originalHeading, op.replacementHeading),
            });
            appliedFixIds.push(p.id);
          } else {
            applied.push({
              proposal: p,
              success: false,
              error: `Could not locate heading "${op.originalHeading}" in ${relFile}`,
            });
          }
        }
      }

      // 1B. Apply TOC updates if present
      const hasTocOp = proposals.find((p) => p.operation.type === "update-toc");
      if (hasTocOp) {
        const tocResult = updateTocInContent(fileContent);
        if (tocResult.updatedContent) {
          fileContent = tocResult.updatedContent;
          applied.push({
            proposal: hasTocOp,
            success: true,
            diff: `Regenerated Table of Contents in ${relFile} (${tocResult.headingsCount} entries)`,
          });
          appliedFixIds.push(hasTocOp.id);
        }
      }

      if (fileContent !== originalRaw) {
        // Record snapshot before overwriting
        let backupPath: string | undefined = undefined;
        if (options.backup) {
          backupPath = `${targetFileAbs}.bak`;
          fs.writeFileSync(backupPath, originalRaw, "utf8");
        }

        snapshots.push({
          file: path.relative(resolvedBase, targetFileAbs),
          originalContent: originalRaw,
          backupPath,
        });

        // Write updated content back to disk
        atomicWriteFile(targetFileAbs, fileContent);
        modifiedFilesSet.add(relFile);
      }
    } catch (err: any) {
      for (const p of proposals) {
        if (!applied.find((a) => a.proposal.id === p.id)) {
          applied.push({
            proposal: p,
            success: false,
            error: err.message || String(err),
          });
        }
      }
    }
  }

  // 2. Process new file creations (starter templates)
  for (const proposal of newFileProposals) {
    const targetFileAbs = path.isAbsolute(proposal.file)
      ? proposal.file
      : path.resolve(resolvedBase, proposal.file);

    if (!isSafePath(resolvedBase, targetFileAbs)) {
      applied.push({
        proposal,
        success: false,
        error: `Security Violation: Path escapes project root (${proposal.file})`,
      });
      continue;
    }

    if (isDryRun) {
      applied.push({
        proposal,
        success: true,
        diff: `Create new template file: ${proposal.file}`,
      });
      modifiedFilesSet.add(proposal.file);
      continue;
    }

    try {
      if (fs.existsSync(targetFileAbs)) {
        throw new Error(`File already exists: ${proposal.file}`);
      }

      if (proposal.operation.type === "write-file") {
        snapshots.push({
          file: path.relative(resolvedBase, targetFileAbs),
          originalContent: null, // null means newly created file
        });


        atomicWriteFile(targetFileAbs, proposal.operation.content);
        applied.push({
          proposal,
          success: true,
          diff: `Created ${proposal.file}`,
        });
        appliedFixIds.push(proposal.id);
        modifiedFilesSet.add(proposal.file);
      }
    } catch (err: any) {
      applied.push({
        proposal,
        success: false,
        error: err.message || String(err),
      });
    }
  }

  // Save session snapshot manifest if live changes were performed
  if (!isDryRun && snapshots.length > 0) {
    saveFixSession(resolvedBase, plan.target, snapshots, appliedFixIds);
  }


  // Re-run health check to determine actual after score
  let afterReport: any = undefined;
  let afterScore = beforeScore;

  if (!isDryRun && modifiedFilesSet.size > 0) {
    afterReport = runHealthCheck(resolvedBase, { minScore: options.minScore });
    afterScore = afterReport.score;
  } else if (isDryRun) {
    const fixableCount = applied.filter((a) => a.success).length;
    afterScore = Math.min(100, beforeScore + fixableCount * 12);
  }

  return {
    target: plan.target,
    dryRun: isDryRun,
    beforeScore,
    afterScore,
    scoreDelta: afterScore - beforeScore,
    applied,
    skipped,
    manual,
    changedFiles: Array.from(modifiedFilesSet),
    before: beforeReport,
    after: afterReport,
  };
}
