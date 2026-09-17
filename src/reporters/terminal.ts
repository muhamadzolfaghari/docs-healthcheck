import pc from "picocolors";
import { RepoHealthReport } from "../core/types.js";

export function renderTerminalReport(report: RepoHealthReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(
    pc.bold(
      pc.cyan("  ╔═══════════════════════════════════════════════════════════╗")
    )
  );
  lines.push(
    pc.bold(
      pc.cyan("  ║              ") +
        pc.white("DOCUMENTATION HEALTH REPORT") +
        pc.cyan("                  ║")
    )
  );
  lines.push(
    pc.bold(
      pc.cyan("  ╚═══════════════════════════════════════════════════════════╝")
    )
  );
  lines.push("");

  // Score Box
  const scoreColor =
    report.score >= 85
      ? pc.green
      : report.score >= 65
      ? pc.yellow
      : pc.red;

  const statusBadge = report.passed
    ? pc.bgGreen(pc.black(" PASS "))
    : pc.bgRed(pc.white(" FAIL "));

  lines.push(
    `  Health Score: ${scoreColor(pc.bold(`${report.score}/100`))}  ${statusBadge}`
  );
  lines.push(
    pc.dim(
      `  Scanned: ${report.summary.scannedFiles} files | ${report.summary.totalHeadings} headings | ${report.summary.totalLinks} links`
    )
  );
  lines.push("");

  // Repository Level Health Checks
  if (report.repoChecks.length > 0) {
    lines.push(pc.bold(pc.underline("  Repository Documentation Standards:")));
    for (const check of report.repoChecks) {
      let icon = "";
      let msg = "";
      if (check.status === "found") {
        icon = pc.green("  ✔");
        msg = pc.white(check.name) + pc.dim(` — ${check.message}`);
      } else if (check.status === "warning") {
        icon = pc.yellow("  ⚠");
        msg = pc.yellow(check.name) + pc.dim(` — ${check.message}`);
      } else {
        icon = pc.red("  ✖");
        msg = pc.red(check.name) + pc.dim(` — ${check.message}`);
      }
      lines.push(`${icon} ${msg}`);
    }
    lines.push("");
  }

  // File Validation Issues
  const hasIssues = report.fileResults.some((f) => f.issues.length > 0);
  if (hasIssues) {
    lines.push(pc.bold(pc.underline("  Document Issues:")));

    for (const f of report.fileResults) {
      if (f.issues.length === 0) continue;

      lines.push("");
      lines.push(pc.bold(pc.magenta(`  📄 ${f.file}`)) + pc.dim(` (Score: ${f.score}/100)`));

      for (const issue of f.issues) {
        let tag = "";
        let loc = pc.dim(`${f.file}:${issue.line}${issue.col ? `:${issue.col}` : ""}`);

        if (issue.severity === "error") {
          tag = pc.red(pc.bold("  ✖ ERROR  "));
        } else if (issue.severity === "warning") {
          tag = pc.yellow(pc.bold("  ⚠ WARN   "));
        } else {
          tag = pc.blue(pc.bold("  ℹ INFO   "));
        }

        lines.push(`${tag} ${issue.message}`);
        lines.push(`            ${loc} [${pc.cyan(issue.ruleId)}]`);
        if (issue.suggestion) {
          lines.push(pc.dim(`            Suggestion: ${issue.suggestion}`));
        }
      }
    }
    lines.push("");
  } else {
    lines.push(pc.green("  ✔ All markdown files passed validation rules!"));
    lines.push("");
  }

  // Summary
  lines.push("  " + pc.dim("─".repeat(55)));
  if (report.totalErrors > 0) {
    lines.push(
      pc.red(
        pc.bold(`  ✖ Failed with ${report.totalErrors} errors and ${report.totalWarnings} warnings.`)
      )
    );
  } else if (report.totalWarnings > 0) {
    lines.push(
      pc.yellow(
        pc.bold(`  ⚠ Passed with ${report.totalWarnings} warnings.`)
      )
    );
  } else {
    lines.push(
      pc.green(
        pc.bold(`  ✔ All documentation quality checks passed successfully!`)
      )
    );
  }
  lines.push("");

  return lines.join("\n");
}
