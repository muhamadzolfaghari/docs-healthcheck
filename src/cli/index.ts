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

export function runCli(argv = process.argv): void {
  const program = new Command();

  program
    .name("docs-healthcheck")
    .description(
      "Documentation quality gate for Markdown repositories. Validate structure, TOC, links, anchors, and health."
    )
    .version("2.0.0");

  // Default Command: full documentation health check
  program
    .command("scan [path]", { isDefault: true })
    .description("Full documentation health check for repository or directory (default)")
    .option("--json", "Output results in JSON format")
    .option("--markdown", "Output results in GitHub Markdown format")
    .option("--ci", "Run in CI mode with strict exit code on any errors")
    .option("--strict", "Treat warnings as errors")
    .option("--min-score <score>", "Minimum acceptable documentation health score (0-100)", "70")
    .option("--silent", "Suppress stdout and only use exit code")
    .action((targetPath = ".", options = {}) => {
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

      if (!report.passed) {
        process.exit(1);
      }
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

      if (!report.passed) {
        process.exit(1);
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
