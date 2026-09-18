import { RepoHealthReport, ValidationRuleId } from "../core/types.js";

export type FixSafety = "safe" | "confirm" | "manual";

export type FixConfidence = "high" | "medium" | "low";

export interface ReplaceTextOperation {
  type: "replace-text";
  file: string;
  line: number;
  originalText: string;
  replacementText: string;
  lineContentBefore: string;
  lineContentAfter: string;
}

export interface ReplaceHeadingOperation {
  type: "replace-heading";
  file: string;
  line: number;
  originalHeading: string;
  replacementHeading: string;
}

export interface UpdateTocOperation {
  type: "update-toc";
  file: string;
  updatedContent: string;
  headingsCount: number;
}

export interface WriteFileOperation {
  type: "write-file";
  file: string;
  content: string;
  templateName: string;
}

export interface ManualOperation {
  type: "manual";
  file: string;
  reason: string;
  suggestions: string[];
}

export type FixOperation =
  | ReplaceTextOperation
  | ReplaceHeadingOperation
  | UpdateTocOperation
  | WriteFileOperation
  | ManualOperation;

export interface FixProposal {
  id: string;
  ruleId: ValidationRuleId | string;
  file: string;
  safety: FixSafety;
  confidence: FixConfidence;
  title: string;
  description: string;
  reason: string;
  before?: string;
  after?: string;
  line?: number;
  operation: FixOperation;
  deterministic: boolean;
}

export interface FixPlan {
  target: string;
  proposals: FixProposal[];
  summary: {
    safe: number;
    confirm: number;
    manual: number;
    total: number;
  };
}

export interface AppliedFix {
  proposal: FixProposal;
  success: boolean;
  error?: string;
  diff?: string;
}

export interface FixExecutionOptions {
  dryRun?: boolean;
  yes?: boolean;
  safeOnly?: boolean;
  interactive?: boolean;
  verbose?: boolean;
  json?: boolean;
  markdown?: boolean;
  minScore?: number;
  acceptedProposalIds?: string[];
}

export interface FixExecutionReport {
  target: string;
  dryRun: boolean;
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  applied: AppliedFix[];
  skipped: FixProposal[];
  manual: FixProposal[];
  changedFiles: string[];
  before: RepoHealthReport;
  after?: RepoHealthReport;
}
