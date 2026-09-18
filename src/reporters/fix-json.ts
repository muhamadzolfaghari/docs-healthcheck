import { FixExecutionReport } from "../fixes/types.js";

export function renderFixJsonReport(report: FixExecutionReport): string {
  return JSON.stringify(
    {
      target: report.target,
      dryRun: report.dryRun,
      beforeScore: report.beforeScore,
      afterScore: report.afterScore,
      scoreDelta: report.scoreDelta,
      appliedCount: report.applied.length,
      skippedCount: report.skipped.length,
      manualCount: report.manual.length,
      changedFiles: report.changedFiles,
      applied: report.applied.map((a) => ({
        id: a.proposal.id,
        ruleId: a.proposal.ruleId,
        file: a.proposal.file,
        safety: a.proposal.safety,
        confidence: a.proposal.confidence,
        title: a.proposal.title,
        diff: a.diff,
        success: a.success,
        error: a.error,
      })),
      skipped: report.skipped.map((s) => ({
        id: s.id,
        ruleId: s.ruleId,
        file: s.file,
        safety: s.safety,
        title: s.title,
      })),
      manual: report.manual.map((m) => ({
        id: m.id,
        ruleId: m.ruleId,
        file: m.file,
        safety: m.safety,
        title: m.title,
        reason: m.reason,
      })),
    },
    null,
    2
  );
}
