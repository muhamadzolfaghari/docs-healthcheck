import { FixExecutionReport } from "../fixes/types.js";

export function renderFixMarkdownReport(report: FixExecutionReport): string {
  const lines: string[] = [];

  const title = report.dryRun
    ? "## 🛠️ Documentation Health Repair Plan (Dry-Run Preview)"
    : "## 🛠️ Documentation Health Repair Report";

  lines.push(title);
  lines.push("");
  lines.push(
    `**Health Score:** \`${report.beforeScore}/100\` → \`${report.afterScore}/100\` (**${
      report.scoreDelta >= 0 ? `+${report.scoreDelta}` : report.scoreDelta
    } points**)`
  );
  lines.push(
    `**Summary:** ${report.applied.length} Applied | ${report.skipped.length} Skipped | ${report.manual.length} Manual Required`
  );
  lines.push("");

  if (report.applied.length > 0) {
    lines.push(report.dryRun ? "### Proposed Fixes" : "### Applied Fixes");
    lines.push("");
    lines.push("| File | Issue / Action | Safety | Details |");
    lines.push("| :--- | :--- | :---: | :--- |");

    for (const applied of report.applied) {
      const p = applied.proposal;
      const safetyIcon = p.safety === "safe" ? "🟢 SAFE" : "🟡 CONFIRM";
      const details = applied.diff
        ? `\`${applied.diff.replace(/`/g, "'").replace(/\n/g, "<br>")}\``
        : p.description;
      lines.push(`| \`${p.file}\` | **${p.title}** | ${safetyIcon} | ${details} |`);
    }
    lines.push("");
  }

  if (report.skipped.length > 0) {
    lines.push("### Skipped Fixes (Confirmation Required)");
    lines.push("");
    lines.push("| File | Proposal | Reason |");
    lines.push("| :--- | :--- | :--- |");
    for (const s of report.skipped) {
      lines.push(`| \`${s.file}\` | ${s.title} | Requires manual or interactive confirmation |`);
    }
    lines.push("");
  }

  if (report.manual.length > 0) {
    lines.push("### Manual Action Required");
    lines.push("");
    lines.push("| File | Issue | Action Required |");
    lines.push("| :--- | :--- | :--- |");
    for (const m of report.manual) {
      lines.push(`| \`${m.file}\` | ${m.title} | ${m.reason} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
