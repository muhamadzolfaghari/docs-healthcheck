export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationRuleId =
  | "heading-missing-h1"
  | "heading-multiple-h1"
  | "heading-hierarchy"
  | "heading-duplicate"
  | "heading-empty-section"
  | "anchor-broken"
  | "link-missing-file";


export interface HeadingNode {
  level: number;
  raw: string;
  text: string;
  slug: string;
  line: number;
  customAnchor?: string;
}

export interface MarkdownLinkNode {
  raw: string;
  text: string;
  href: string;
  line: number;
  col: number;
  isLocalAnchor: boolean;
  isLocalFile: boolean;
  isExternal: boolean;
  isImage?: boolean;
  isReferenceDef?: boolean;
  refLabel?: string;
  anchorTarget?: string;
  filePath?: string;
}


export interface ValidationIssue {
  ruleId: ValidationRuleId;
  severity: ValidationSeverity;
  message: string;
  file: string;
  line: number;
  col?: number;
  suggestion?: string;
}

export interface DocValidationResult {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
  headings: HeadingNode[];
  links: MarkdownLinkNode[];
  tocFound: boolean;
  score: number;
}

export interface RepoHealthCheckItem {
  id: string;
  name: string;
  required: boolean;
  weight: number;
  status: "found" | "missing" | "warning";
  foundPath?: string;
  message: string;
}

export interface RepoHealthReport {
  score: number;
  passed: boolean;
  totalErrors: number;
  totalWarnings: number;
  repoChecks: RepoHealthCheckItem[];
  fileResults: DocValidationResult[];
  summary: {
    scannedFiles: number;
    totalHeadings: number;
    totalLinks: number;
  };
}

export interface TocOptions {
  minDepth?: number;
  maxDepth?: number;
  ordered?: boolean;
  includeTitle?: boolean;
  title?: string;
  slugPrefix?: string;
  indentSize?: number;
}

export interface TocResult {
  tocMarkdown: string;
  updatedContent?: string;
  inserted: boolean;
  headingsCount: number;
}

export interface ValidationConfig {
  minScore?: number;
  strict?: boolean;
  rules?: Partial<Record<ValidationRuleId, { enabled: boolean; severity?: ValidationSeverity }>>;
  ignorePaths?: string[];
  maxHeadingDepth?: number;
}
