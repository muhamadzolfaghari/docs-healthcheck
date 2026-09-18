import pc from "picocolors";
import { FixExecutionReport } from "../fixes/types.js";

export function renderFixTerminalReport(report: FixExecutionReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(
    pc.bold(
      pc.cyan("  ╔═══════════════════════════════════════════════════════════╗")
    )
  );
  lines.push(
    pc.bold(
      pc.cyan("  ║          ") +
        pc.white("DOCUMENTATION HEALTH REPAIR REPORT") +
        pc.cyan("               ║")
    )
  );
  lines.push(
    pc.bold(
      pc.cyan("  ╚═══════════════════════════════════════════════════════════╝")
    )
  );
  lines.push("");

  // Mode & Score Progression
  if (report.dryRun) {
    lines.push(
      `  Mode: ${pc.bgYellow(pc.black(" DRY-RUN PREVIEW "))} ${pc.dim("(No files were modified)")}`
    );
  } else {
    lines.push(`  Mode: ${pc.bgGreen(pc.black(" LIVE REPAIR "))}`);
  }

  const deltaSign = report.scoreDelta >= 0 ? `+${report.scoreDelta}` : `${report.scoreDelta}`;
  const deltaColor =
    report.scoreDelta > 0
      ? pc.green
      : report.scoreDelta === 0
      ? pc.dim
      : pc.red;

  lines.push(
    `  Health Score: ${pc.yellow(pc.bold(`${report.beforeScore}/100`))} → ${pc.green(
      pc.bold(`${report.afterScore}/100`)
    )} (${deltaColor(pc.bold(`${deltaSign} health points`))})`
  );
  lines.push("");

  // Applied Fixes
  if (report.applied.length > 0) {
    lines.push(
      pc.bold(
        pc.underline(
          report.dryRun ? "  Proposed Repairs to Apply:" : "  Applied Repairs:"
        )
      )
    );

    for (const applied of report.applied) {
      const p = applied.proposal;
      const icon = applied.success ? pc.green("  ✔") : pc.red("  ✖");
      const safetyBadge =
        p.safety === "safe"
          ? pc.bgGreen(pc.black(" SAFE "))
          : pc.bgYellow(pc.black(" CONFIRM "));

      lines.push(`${icon} ${safetyBadge} ${pc.bold(p.title)} ${pc.dim(`[${p.file}]`)}`);
      if (applied.diff) {
        const diffLines = applied.diff.split("\n");
        for (const dl of diffLines) {
          if (dl.startsWith("+")) {
            lines.push(`       ${pc.green(dl)}`);
          } else if (dl.startsWith("-")) {
            lines.push(`       ${pc.red(dl)}`);
          } else {
            lines.push(`       ${pc.dim(dl)}`);
          }
        }
      }
      if (applied.error) {
        lines.push(`       ${pc.red(`Error: ${applied.error}`)}`);
      }
    }
    lines.push("");
  }

  // Skipped Fixes
  if (report.skipped.length > 0) {
    lines.push(pc.bold(pc.underline("  Skipped Confirmation-Required Changes:")));
    for (const s of report.skipped) {
      lines.push(
        `  ○ ${pc.yellow(s.title)} ${pc.dim(`(${s.file} — Requires interactive confirmation)`)}`
      );
    }
    lines.push("");
  }

  // Manual Issues
  if (report.manual.length > 0) {
    lines.push(pc.bold(pc.underline("  Manual Action Required (No auto-fix possible):")));
    for (const m of report.manual) {
      lines.push(`  ⚠ ${pc.yellow(pc.bold(m.title))} ${pc.dim(`[${m.file}]`)}`);
      lines.push(`     ${pc.dim(`Reason: ${m.reason}`)}`);
      if (m.operation.type === "manual" && m.operation.suggestions.length > 0) {
        for (const sugg of m.operation.suggestions) {
          lines.push(`     ${pc.cyan("→")} ${sugg}`);
        }
      }
    }
    lines.push("");
  }

  // Summary footer
  lines.push("  " + pc.dim("─".repeat(55)));
  lines.push(
    `  ${pc.bold("Summary:")} Applied: ${pc.green(report.applied.length)} | Skipped: ${pc.yellow(
      report.skipped.length
    )} | Manual: ${pc.red(report.manual.length)} | Changed Files: ${pc.cyan(
      report.changedFiles.length
    )}`
  );

  if (report.dryRun) {
    lines.push(
      pc.dim("\n  Run ") +
        pc.cyan("docs-healthcheck fix --yes") +
        pc.dim(" to apply all safe deterministic fixes.")
    );
  }
  lines.push("");

  return lines.join("\n");
}
