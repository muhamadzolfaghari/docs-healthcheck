import fs from "fs";
import path from "path";
import { Command } from "commander";
import pc from "picocolors";
import { runHealthCheck } from "../core/engine.js";
import { analyzeMarkdownFile } from "../core/analyzer.js";
import { updateTocInContent, generateTocMarkdown } from "../markdown/toc.js";
import { extractHeadings } from "../markdown/headings.js";
import { renderTerminalReport } from "../reporters/terminal.js";
import { renderJsonReport } from "../reporters/json.js";
import { renderMarkdownReport } from "../reporters/markdown.js";
import { createFixPlan } from "../fixes/planner.js";
import { executeFixPlan } from "../fixes/executor.js";
import { revertFixes, hasFixSession } from "../fixes/revert.js";
import { promptUserForProposals } from "../fixes/prompts/interactive.js";
import { renderFixTerminalReport } from "../reporters/fix-terminal.js";
import { renderFixJsonReport } from "../reporters/fix-json.js";
import { renderFixMarkdownReport } from "../reporters/fix-markdown.js";
import { renderRevertTerminalReport } from "../reporters/revert-terminal.js";

declare const __DOCS_HEALTHCHECK_VERSION__: string;

const CLI_VERSION =
  typeof __DOCS_HEALTHCHECK_VERSION__ === "string"
    ? __DOCS_HEALTHCHECK_VERSION__
    : process.env.npm_package_version ?? "0.0.0-dev";


export function runCli(argv = process.argv): void {
  const program = new Command();

  program
    .name("docs-healthcheck")
    .description(
      "Documentation quality gate and auto-repair engine for Markdown repositories."
    )
    .version(CLI_VERSION);

  // Default Command: scan (or --fix)
  program
    .command("scan [path]", { isDefault: true })
    .alias("lint")
    .description("Full documentation health check for repository or directory (default; lint is an alias)")
    .option("--fix", "Shortcut to repair documentation issues (equivalent to fix [path])")
    .option("--dry-run", "Preview proposed repairs without modifying files (used with --fix)")
    .option("-y, --yes", "Automatically apply all safe deterministic repairs (used with --fix)")
    .option("--safe-only", "Apply only safe deterministic repairs (used with --fix)")
    .option("--json", "Output results in JSON format")
    .option("--markdown", "Output results in GitHub Markdown format")
    .option("--verbose", "Show detailed verbose diagnostic information")
    .option("--ci", "Run in CI mode with strict exit code on any errors")
    .option("--strict", "Treat warnings as errors (exit code 2)")
    .option("--min-score <score>", "Minimum acceptable documentation health score (0-100)", "70")
    .option("--silent", "Suppress stdout and only use exit code")
    .action(async (targetPath = ".", options = {}) => {
      if (options.fix) {
        // Execute fix workflow
        await handleFixCommand(targetPath, options);
        return;
      }

      const minScore = parseInt(options.minScore, 10) || 70;
      const report = runHealthCheck(targetPath, {
        minScore,
        strict: options.strict,
      });

      if (!options.silent) {
        if (options.json) {
          console.log(renderJsonReport(report));
        } else if (options.markdown) {
          console.log(renderMarkdownReport(report));
        } else {
          console.log(renderTerminalReport(report));
        }
      }

      // Exit codes: 0 = Healthy, 1 = Warnings, 2 = Errors / Failed
      if (report.totalErrors > 0 || !report.passed) {
        process.exit(2);
      } else if (report.totalWarnings > 0) {
        if (options.strict) {
          process.exit(2);
        } else {
          process.exit(1);
        }
      } else {
        process.exit(0);
      }
    });

  // fix Command: interactive or automatic deterministic repairs
  program
    .command("fix [args...]")
    .description("Analyze and deterministically repair documentation issues")
    .option("--dry-run", "Preview proposed repairs without modifying files")
    .option("-y, --yes", "Automatically apply all safe deterministic repairs")
    .option("--safe-only", "Apply only safe deterministic repairs (alias for --yes)")
    .option("--backup", "Create .bak backup files before modifying documentation")
    .option("--revert", "Revert changes from the previous fix session")
    .option("--json", "Output repair results in JSON format")
    .option("--markdown", "Output repair results in GitHub Markdown format")
    .option("--verbose", "Show detailed unified diffs")
    .option("--min-score <score>", "Target score threshold", "70")
    .option("--silent", "Suppress stdout")
    .action(async (args: any, options = {}) => {
      let targetPath = ".";
      let isRevert = Boolean((options as any).revert);
      if (Array.isArray(args) && args.length > 0) {
        if (args[0] === "revert") {
          isRevert = true;
          targetPath = args[1] || ".";
        } else {
          targetPath = args[0] || ".";
        }
      } else if (typeof args === "string") {
        if (args === "revert") {
          isRevert = true;
          targetPath = ".";
        } else {
          targetPath = args;
        }
      }

      if (isRevert) {
        handleRevertCommand(targetPath, options);
        return;
      }
      await handleFixCommand(targetPath, options);
    });


  // revert Command: revert the last fix session
  program
    .command("revert [path]")
    .description("Revert all changes applied during the last fix session")
    .option("--dry-run", "Preview files that would be restored without modifying files")
    .option("--json", "Output results in JSON format")
    .option("--markdown", "Output results in GitHub Markdown format")
    .option("--min-score <score>", "Target score threshold", "70")
    .option("--silent", "Suppress stdout")
    .action((targetPath = ".", options = {}) => {
      handleRevertCommand(targetPath, options);
    });


  // check Command: checks a single markdown file
  program
    .command("check <file>")
    .description("Validate a specific Markdown file for broken links, anchors, and heading structure")
    .option("--json", "Output results in JSON format")
    .option("--markdown", "Output results in GitHub Markdown format")
    .option("--ci", "Exit with non-zero code on any errors")
    .option("--strict", "Treat warnings as errors")
    .action((file, options) => {
      const resolved = path.resolve(process.cwd(), file);
      if (!fs.existsSync(resolved)) {
        console.error(pc.red(`Error: File not found "${file}"`));
        process.exit(1);
      }

      const result = analyzeMarkdownFile(file, {
        strict: options.strict,
      });

      const report = {
        score: result.score,
        passed:
          result.valid &&
          (!options.strict ||
            result.issues.filter((i) => i.severity === "warning").length === 0),
        totalErrors: result.issues.filter((i) => i.severity === "error").length,
        totalWarnings: result.issues.filter((i) => i.severity === "warning").length,
        repoChecks: [],
        fileResults: [result],
        summary: {
          scannedFiles: 1,
          totalHeadings: result.headings.length,
          totalLinks: result.links.length,
        },
      };

      if (options.json) {
        console.log(renderJsonReport(report));
      } else if (options.markdown) {
        console.log(renderMarkdownReport(report));
      } else {
        console.log(renderTerminalReport(report));
      }

      // Exit codes: 0 = Healthy, 1 = Warnings, 2 = Errors / Failed
      if (report.totalErrors > 0 || !report.passed) {
        process.exit(2);
      } else if (report.totalWarnings > 0) {
        if (options.strict) {
          process.exit(2);
        } else {
          process.exit(1);
        }
      } else {
        process.exit(0);
      }
    });

  // toc Command: generates or updates TOC
  program
    .command("toc <file>")
    .description("Generate or update Table of Contents for a Markdown file")
    .option("-w, --write", "Write generated TOC directly into the file")
    .option("--min-depth <depth>", "Minimum heading depth to include (default: 2)", "2")
    .option("--max-depth <depth>", "Maximum heading depth to include (default: 6)", "6")
    .option("--ordered", "Generate ordered (numbered) list instead of bullet list", false)
    .option("--title <title>", "Custom title for TOC section", "## Table of Contents")
    .option("--no-title", "Omit TOC section title heading")
    .action((file, options) => {
      const resolved = path.resolve(process.cwd(), file);
      if (!fs.existsSync(resolved)) {
        console.error(pc.red(`Error: File not found "${file}"`));
        process.exit(1);
      }

      const content = fs.readFileSync(resolved, "utf8");
      const tocOptions = {
        minDepth: parseInt(options.minDepth, 10) || 2,
        maxDepth: parseInt(options.maxDepth, 10) || 6,
        ordered: Boolean(options.ordered),
        includeTitle: options.title !== false,
        title: typeof options.title === "string" ? options.title : undefined,
      };

      if (options.write) {
        const updateResult = updateTocInContent(content, tocOptions);
        if (updateResult.updatedContent) {
          fs.writeFileSync(resolved, updateResult.updatedContent, "utf8");
          console.log(
            pc.green(
              `✔ Table of Contents written to ${file} (${updateResult.headingsCount} headings indexed)`
            )
          );
        }
      } else {
        const headings = extractHeadings(content);
        const tocOutput = generateTocMarkdown(headings, tocOptions);
        console.log(tocOutput);
      }
    });

  program.parse(argv);
}

/**
 * Shared helper to execute fix command
 */
async function handleFixCommand(targetPath: string, options: any): Promise<void> {
  if (targetPath === "revert" || options.revert) {
    const actualTarget = targetPath === "revert" ? "." : targetPath;
    handleRevertCommand(actualTarget, options);
    return;
  }

  const resolvedTarget = path.resolve(process.cwd(), targetPath);
  const isTargetFile =
    fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isFile();
  const rootDir = isTargetFile ? path.dirname(resolvedTarget) : resolvedTarget;

  const minScore = parseInt(options.minScore, 10) || 70;
  const report = runHealthCheck(targetPath, { minScore });
  const plan = createFixPlan(report, rootDir);

  if (plan.proposals.length === 0) {
    if (!options.silent) {
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              target: targetPath,
              dryRun: Boolean(options.dryRun),
              beforeScore: report.score,
              afterScore: report.score,
              scoreDelta: 0,
              appliedCount: 0,
              skippedCount: 0,
              manualCount: 0,
              changedFiles: [],
              applied: [],
              skipped: [],
              manual: [],
            },
            null,
            2
          )
        );
      } else {
        console.log(
          pc.green("\n  ✔ No repairable documentation issues detected. Everything is healthy!\n")
        );
      }
    }
    process.exit(0);
  }

  let acceptedProposalIds: string[] | undefined = undefined;
  const isNonInteractive = Boolean(
    options.yes || options.safeOnly || options.dryRun || options.json || options.markdown
  );

  if (!isNonInteractive) {
    // Interactive prompt
    console.log(
      pc.bold(
        pc.cyan(`\n  Found ${plan.proposals.length} issue(s) across documentation in ${targetPath}:`)
      )
    );
    acceptedProposalIds = await promptUserForProposals(plan);
  }

  const fixReport = executeFixPlan(
    plan,
    {
      dryRun: options.dryRun,
      yes: options.yes || options.safeOnly,
      safeOnly: options.safeOnly || options.yes,
      backup: options.backup,
      acceptedProposalIds,
      verbose: options.verbose,
      minScore,
    },
    rootDir
  );

  if (!options.silent) {
    if (options.json) {
      console.log(renderFixJsonReport(fixReport));
    } else if (options.markdown) {
      console.log(renderFixMarkdownReport(fixReport));
    } else {
      console.log(renderFixTerminalReport(fixReport));
    }
  }

  process.exit(0);
}

/**
 * Shared helper to execute revert command
 */
function handleRevertCommand(targetPath: string, options: any): void {
  const minScore = parseInt(options.minScore, 10) || 70;
  const revertReport = revertFixes(targetPath, {
    dryRun: options.dryRun,
    minScore,
    verbose: options.verbose,
    silent: options.silent,
  });

  if (!options.silent) {
    if (options.json) {
      console.log(JSON.stringify(revertReport, null, 2));
    } else if (options.markdown) {
      const lines = [
        "## Documentation Health Revert Report\n",
        `**Target:** \`${revertReport.target}\` | **Health Score:** ${revertReport.beforeScore}/100 → ${revertReport.afterScore}/100\n`,
        `**Message:** ${revertReport.message}\n`,
      ];
      if (revertReport.restoredFiles.length > 0) {
        lines.push("### Restored Files");
        for (const file of revertReport.restoredFiles) {
          lines.push(`- \`${file}\``);
        }
        lines.push("");
      }
      if (revertReport.deletedFiles.length > 0) {
        lines.push("### Removed Files");
        for (const file of revertReport.deletedFiles) {
          lines.push(`- \`${file}\``);
        }
        lines.push("");
      }
      console.log(lines.join("\n"));
    } else {
      console.log(renderRevertTerminalReport(revertReport));
    }
  }

  process.exit(0);
}

