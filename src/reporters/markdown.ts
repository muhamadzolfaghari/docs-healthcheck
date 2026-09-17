import { RepoHealthReport } from "../core/types.js";

export function renderMarkdownReport(report: RepoHealthReport): string {
  const lines: string[] = [];

  const status = report.passed ? "🟢 PASS" : "🔴 FAIL";
  lines.push(`# Documentation Health Check Report (${status})`);
  lines.push("");
  lines.push(`**Health Score:** \`${report.score}/100\``);
  lines.push(`**Files Scanned:** ${report.summary.scannedFiles} | **Headings:** ${report.summary.totalHeadings} | **Links:** ${report.summary.totalLinks}`);
  lines.push("");

  if (report.repoChecks.length > 0) {
    lines.push("## Repository Standards");
    lines.push("");
    lines.push("| Standard | Status | Details |");
    lines.push("| :--- | :---: | :--- |");
    for (const item of report.repoChecks) {
      const icon = item.status === "found" ? "✅" : item.status === "warning" ? "⚠️" : "❌";
      lines.push(`| **${item.name}** | ${icon} | ${item.message} |`);
    }
    lines.push("");
  }

  const hasIssues = report.fileResults.some((f) => f.issues.length > 0);
  if (hasIssues) {
    lines.push("## Document Issues");
    lines.push("");
    lines.push("| File | Line | Severity | Rule | Message |");
    lines.push("| :--- | :---: | :---: | :--- | :--- |");

    for (const f of report.fileResults) {
      for (const issue of f.issues) {
        const sev = issue.severity === "error" ? "🛑 Error" : issue.severity === "warning" ? "⚠️ Warning" : "ℹ️ Info";
        lines.push(`| \`${f.file}\` | ${issue.line} | ${sev} | \`${issue.ruleId}\` | ${issue.message} |`);
      }
    }
    lines.push("");
  } else {
    lines.push("✅ **All markdown documents passed validation rules!**");
    lines.push("");
  }

  return lines.join("\n");
}
