import pc from "picocolors";
import { RevertExecutionReport } from "../fixes/types.js";

/**
 * Renders the revert execution report in terminal format
 */
export function renderRevertTerminalReport(report: RevertExecutionReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(
    pc.cyan(
      "  ╔═══════════════════════════════════════════════════════════╗"
    )
  );
  lines.push(
    pc.cyan(
      "  ║          DOCUMENTATION HEALTH REVERT REPORT               ║"
    )
  );
  lines.push(
    pc.cyan(
      "  ╚═══════════════════════════════════════════════════════════╝"
    )
  );
  lines.push("");

  if (report.dryRun) {
    lines.push(
      `  Mode:  ${pc.yellow(pc.bold("DRY-RUN PREVIEW"))}  (No files were modified)`
    );
  }

  lines.push(
    `  Health Score: ${pc.bold(`${report.beforeScore}/100`)} → ${pc.bold(
      `${report.afterScore}/100`
    )} (${
      report.scoreDelta >= 0
        ? pc.green(`+${report.scoreDelta}`)
        : pc.red(`${report.scoreDelta}`)
    } health points)`
  );
  lines.push("");

  if (report.restoredFiles.length > 0) {
    lines.push(pc.bold("  Restored Files:"));
    for (const file of report.restoredFiles) {
      lines.push(`  ${pc.green("✔")}  ${file}`);
    }
    lines.push("");
  }

  if (report.deletedFiles.length > 0) {
    lines.push(pc.bold("  Removed Created Files:"));
    for (const file of report.deletedFiles) {
      lines.push(`  ${pc.yellow("✔")}  ${file}`);
    }
    lines.push("");
  }

  if (report.restoredFiles.length === 0 && report.deletedFiles.length === 0) {
    lines.push(`  ${pc.yellow("ℹ")}  ${report.message}`);
    lines.push("");
  }

  lines.push(
    pc.dim("  ───────────────────────────────────────────────────────")
  );
  lines.push(
    `  Summary: Restored: ${report.restoredFiles.length} | Removed: ${report.deletedFiles.length}`
  );
  lines.push("");

  return lines.join("\n");
}
