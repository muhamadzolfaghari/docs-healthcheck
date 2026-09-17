import { RepoHealthReport } from "../core/types.js";

export function renderJsonReport(report: RepoHealthReport): string {
  return JSON.stringify(report, null, 2);
}
