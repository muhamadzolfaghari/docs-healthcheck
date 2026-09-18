import fs from "fs";
import path from "path";
import { runHealthCheck } from "../core/engine.js";
import {
  FixSessionManifest,
  FixSnapshotEntry,
  RevertExecutionOptions,
  RevertExecutionReport,
} from "./types.js";

const BACKUP_DIR_NAME = ".docs-healthcheck";
const MANIFEST_FILE_NAME = "last-fix.json";

/**
 * Resolves the backup journal manifest path for a given root directory
 */
export function getManifestPath(baseDir: string): string {
  return path.join(path.resolve(baseDir), BACKUP_DIR_NAME, MANIFEST_FILE_NAME);
}

/**
 * Saves a fix session snapshot before modifying files
 */
export function saveFixSession(
  baseDir: string,
  target: string,
  snapshots: FixSnapshotEntry[],
  appliedFixIds: string[]
): void {
  const dir = path.join(path.resolve(baseDir), BACKUP_DIR_NAME);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const manifest: FixSessionManifest = {
    id: `fix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    target,
    files: snapshots,
    appliedFixIds,
  };

  const manifestPath = getManifestPath(baseDir);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

/**
 * Checks whether a previous fix session is available to revert
 */
export function hasFixSession(baseDir: string): boolean {
  const manifestPath = getManifestPath(baseDir);
  return fs.existsSync(manifestPath);
}

/**
 * Reads the last fix session manifest if it exists
 */
export function readFixSession(baseDir: string): FixSessionManifest | null {
  const manifestPath = getManifestPath(baseDir);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    return JSON.parse(raw) as FixSessionManifest;
  } catch {
    return null;
  }
}

/**
 * Reverts all changes applied during the last fix session
 */
export function revertFixes(
  targetPath = ".",
  options: RevertExecutionOptions = {}
): RevertExecutionReport {
  const resolvedBase = path.resolve(process.cwd(), targetPath);
  const isTargetFile =
    fs.existsSync(resolvedBase) && fs.statSync(resolvedBase).isFile();
  const rootDir = isTargetFile ? path.dirname(resolvedBase) : resolvedBase;

  const beforeReport = runHealthCheck(rootDir, { minScore: options.minScore });
  const beforeScore = beforeReport.score;

  const manifest = readFixSession(rootDir);
  if (!manifest || manifest.files.length === 0) {
    return {
      target: targetPath,
      dryRun: Boolean(options.dryRun),
      restoredFiles: [],
      deletedFiles: [],
      beforeScore,
      afterScore: beforeScore,
      scoreDelta: 0,
      message: "No previous fix session found to revert.",
    };
  }

  const restoredFiles: string[] = [];
  const deletedFiles: string[] = [];

  if (options.dryRun) {
    for (const entry of manifest.files) {
      if (entry.originalContent === null) {
        deletedFiles.push(entry.file);
      } else {
        restoredFiles.push(entry.file);
      }
    }

    return {
      target: targetPath,
      dryRun: true,
      restoredFiles,
      deletedFiles,
      beforeScore,
      afterScore: beforeScore,
      scoreDelta: 0,
      message: `Dry-run preview: Revert will restore ${restoredFiles.length} file(s) and remove ${deletedFiles.length} created file(s).`,
    };
  }

  // Live revert
  for (const entry of manifest.files) {
    const targetFileAbs = path.isAbsolute(entry.file)
      ? entry.file
      : path.resolve(rootDir, entry.file);

    try {
      if (entry.originalContent === null) {
        // File was newly created by the fix, delete it
        if (fs.existsSync(targetFileAbs)) {
          fs.unlinkSync(targetFileAbs);
          deletedFiles.push(entry.file);
        }
      } else {
        // File was modified by the fix, restore original content
        fs.writeFileSync(targetFileAbs, entry.originalContent, "utf8");
        restoredFiles.push(entry.file);

        // Clean up .bak file if present
        if (entry.backupPath && fs.existsSync(entry.backupPath)) {
          fs.unlinkSync(entry.backupPath);
        }
      }
    } catch {
      // Continue reverting other files
    }
  }

  // Clean up manifest file
  const manifestPath = getManifestPath(rootDir);
  if (fs.existsSync(manifestPath)) {
    try {
      fs.unlinkSync(manifestPath);
    } catch {}
  }

  // Re-run health check after revert
  const afterReport = runHealthCheck(rootDir, { minScore: options.minScore });
  const afterScore = afterReport.score;

  return {
    target: targetPath,
    dryRun: false,
    restoredFiles,
    deletedFiles,
    beforeScore,
    afterScore,
    scoreDelta: afterScore - beforeScore,
    message: `Successfully reverted ${restoredFiles.length} file(s) and removed ${deletedFiles.length} created file(s).`,
  };
}
