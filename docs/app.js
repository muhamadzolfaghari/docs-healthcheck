"use strict";

const editor = document.querySelector("#editor");
const issuesEl = document.querySelector("#issues");
const scoreEl = document.querySelector("#score");
const scoreStatusEl = document.querySelector("#scoreStatus");
const issueSummaryEl = document.querySelector("#issueSummary");
const lineCountEl = document.querySelector("#lineCount");
const fileNameEl = document.querySelector("#fileName");
const statusEl = document.querySelector("#status");
const fileInput = document.querySelector("#fileInput");

const sampleMarkdown = `# Acme Documentation

A deliberately broken document for the docs-healthcheck playground.

<!-- TOC START -->

## Table of Contents

- [Install](#instalation)
- [Usage](#usage-old)

<!-- TOC END -->

### Installation

Install the package:

\`\`\`bash
npm install acme
\`\`\`

See [Installation](#instalation).

## Usage

## Configuration

Use the defaults.

## Configuration

Duplicate heading for demonstration.
`;

let lastBeforeFix = sampleMarkdown;
let currentFileName = "README.md";
let lastReport = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^\`{|}~]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizedSlug(value) {
  return value.toLowerCase().replace(/^#/, "").replace(/[-_\s]/g, "");
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function parseHeadings(lines) {
  const headings = [];
  const occurrences = new Map();

  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) return;

    const level = match[1].length;
    const text = match[2].replace(/\s+#+\s*$/, "").trim();
    const baseSlug = slugify(text);
    const count = occurrences.get(baseSlug) || 0;
    occurrences.set(baseSlug, count + 1);

    headings.push({
      line: index + 1,
      level,
      text,
      baseSlug,
      slug: count === 0 ? baseSlug : `${baseSlug}-${count}`,
    });
  });

  return headings;
}

function generateManagedToc(headings, eol) {
  const filtered = headings.filter((h) =>
    h.level >= 2 &&
    h.level <= 6 &&
    !/^(table\s+of\s+contents|toc|contents|فهرست\s+مطالب|فهرست)$/i.test(h.text.trim())
  );

  if (filtered.length === 0) return "";

  const baseLevel = Math.min(...filtered.map((h) => h.level));
  const entries = filtered.map((h) => {
    const indent = " ".repeat((h.level - baseLevel) * 2);
    return `${indent}- [${h.text}](#${h.slug})`;
  });

  return ["## Table of Contents", "", ...entries].join(eol);
}

function syncManagedToc(text) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const headings = parseHeadings(lines);
  const toc = generateManagedToc(headings, eol);
  const regex = /(^[ \t]*<!--\s*TOC\s+START\s*-->[ \t]*\r?\n)([\s\S]*?)(^[ \t]*<!--\s*TOC\s+END\s*-->[ \t]*$)/im;
  const match = text.match(regex);
  if (!match) return text;

  const startTag = match[1].trim();
  const endTag = match[3].trim();
  return text.replace(regex, `${startTag}${eol}${eol}${toc}${eol}${eol}${endTag}`);
}

function addIssue(issues, issue) {
  issues.push({
    safety: "manual",
    severity: "warning",
    line: null,
    before: null,
    after: null,
    ...issue,
  });
}

function analyzeMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const headings = parseHeadings(lines);
  const issues = [];

  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0) {
    addIssue(issues, {
      id: "heading-missing-h1",
      title: "Missing document title",
      description: "No H1 heading was found.",
      severity: "info",
      safety: "manual",
    });
  } else if (h1s.length > 1) {
    addIssue(issues, {
      id: "heading-multiple-h1",
      title: "Multiple H1 headings",
      description: `Found ${h1s.length} H1 headings. A document normally has one primary title.`,
      safety: "manual",
      severity: "info",
      line: h1s[1].line,
    });
  }

  for (let i = 1; i < headings.length; i++) {
    const previous = headings[i - 1];
    const current = headings[i];
    if (current.level > previous.level + 1) {
      addIssue(issues, {
        id: `heading-hierarchy-${current.line}`,
        title: "Heading hierarchy jump",
        description: `Heading jumps from H${previous.level} to H${current.level}.`,
        safety: "confirm",
        line: current.line,
        before: `${"#".repeat(current.level)} ${current.text}`,
        after: `${"#".repeat(previous.level + 1)} ${current.text}`,
      });
    }
  }

  const duplicates = new Map();
  for (const heading of headings) {
    const key = heading.baseSlug;
    if (!duplicates.has(key)) duplicates.set(key, []);
    duplicates.get(key).push(heading);
  }
  for (const group of duplicates.values()) {
    if (group.length > 1) {
      for (const heading of group.slice(1)) {
        addIssue(issues, {
          id: `heading-duplicate-${heading.line}`,
          title: "Duplicate heading",
          description: `"${heading.text}" appears more than once and may create confusing anchor suffixes.`,
          safety: "manual",
          severity: "info",
          line: heading.line,
        });
      }
    }
  }

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    if (/^(table\s+of\s+contents|toc)$/i.test(heading.text)) continue;
    const start = heading.line;
    const end = i + 1 < headings.length ? headings[i + 1].line - 1 : lines.length;
    const body = lines.slice(start, end).join("\n").trim();
    if (!body) {
      addIssue(issues, {
        id: `heading-empty-${heading.line}`,
        title: "Empty section (advisory)",
        description: `"${heading.text}" has no direct content or nested subsection. This is a docs-healthcheck heuristic, not a Markdown syntax error.`,
        safety: "manual",
        severity: "info",
        line: heading.line,
      });
    }
  }

  const available = new Set(headings.map((h) => h.slug));
  const anchorCandidates = [...available];
  const anchorPatterns = [
    /\[[^\]]*\]\((#[^)\s]+)\)/g,
    /^[ \t]{0,3}\[[^\]]+\]:\s*(#[^\s]+)\s*$/gm,
    /<a\b[^>]*\bhref=["'](#[^"']+)["']/gi,
  ];

  for (const pattern of anchorPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const href = match[1];
      const broken = href.slice(1);
      if (available.has(broken)) continue;

      const prefix = text.slice(0, match.index);
      const line = prefix.split(/\r?\n/).length;
      const normalized = normalizedSlug(broken);
      const matches = anchorCandidates.filter((candidate) => {
        const candidateNormalized = normalizedSlug(candidate);
        if (candidateNormalized === normalized) return true;
        const dist = levenshtein(broken.toLowerCase(), candidate.toLowerCase());
        const maxLen = Math.max(broken.length, candidate.length) || 1;
        return dist <= 2 && 1 - dist / maxLen >= 0.75;
      });

      addIssue(issues, {
        id: `anchor-broken-${line}-${broken}-${match.index}`,
        title: "Broken internal anchor",
        description: matches.length === 1
          ? `"${href}" does not exist; exactly one deterministic heading match was found.`
          : `"${href}" does not match any current heading anchor.`,
        severity: "error",
        safety: matches.length === 1 ? "safe" : "manual",
        line,
        before: href,
        after: matches.length === 1 ? `#${matches[0]}` : null,
      });
    }
  }

  const tocRegex = /(^[ \t]*<!--\s*TOC\s+START\s*-->[ \t]*\r?\n)([\s\S]*?)(^[ \t]*<!--\s*TOC\s+END\s*-->[ \t]*$)/im;
  if (tocRegex.test(text)) {
    const synchronized = syncManagedToc(text);
    if (synchronized !== text) {
      addIssue(issues, {
        id: "toc-outdated",
        title: "Managed TOC is out of date",
        description: "The content between TOC markers does not match the current heading structure.",
        safety: "safe",
        severity: "warning",
        before: "Current managed TOC",
        after: "Regenerated managed TOC",
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;
  const score = Math.max(0, Math.min(100, 100 - errors * 18 - warnings * 9 - info * 3));

  return {
    score,
    issues,
    headings,
    lines: lines.length,
    safe: issues.filter((i) => i.safety === "safe").length,
    confirm: issues.filter((i) => i.safety === "confirm").length,
    manual: issues.filter((i) => i.safety === "manual").length,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render(report) {
  lastReport = report;
  scoreEl.textContent = report.score;
  scoreStatusEl.textContent = report.score >= 90 ? "Healthy" : report.score >= 70 ? "Needs attention" : "Unhealthy";
  lineCountEl.textContent = `${report.lines} line${report.lines === 1 ? "" : "s"}`;

  if (report.issues.length === 0) {
    issueSummaryEl.textContent = "No issues found";
    issuesEl.className = "issues";
    issuesEl.innerHTML = '<div class="clean"><strong>✓ Clean for browser checks</strong><br><br>No single-file Markdown issues were detected by the playground rules.</div>';
    return;
  }

  issueSummaryEl.textContent = `${report.issues.length} issue${report.issues.length === 1 ? "" : "s"} · ${report.safe} SAFE`;
  issuesEl.className = "issues";
  issuesEl.innerHTML = report.issues.map((issue) => {
    const line = issue.line ? `Line ${issue.line}` : "Document";
    const diff = issue.before && issue.after
      ? `<div class="diff"><div class="before">− ${escapeHtml(issue.before)}</div><div class="after">+ ${escapeHtml(issue.after)}</div></div>`
      : "";
    return `
      <article class="issue">
        <div class="issue-top">
          <div>
            <span class="badge ${issue.safety}">${issue.safety.toUpperCase()}</span>
            <span class="issue-title">${escapeHtml(issue.title)}</span>
          </div>
          <span class="issue-meta">${line}</span>
        </div>
        <p>${escapeHtml(issue.description)}</p>
        ${diff}
      </article>
    `;
  }).join("");
}

function runAnalysis(message = "Analysis complete.") {
  const report = analyzeMarkdown(editor.value);
  render(report);
  setStatus(message);
  return report;
}

function applySafeFixes() {
  const report = analyzeMarkdown(editor.value);
  const safe = report.issues.filter((issue) => issue.safety === "safe");

  if (safe.length === 0) {
    render(report);
    setStatus("No SAFE deterministic fixes are available.");
    return;
  }

  lastBeforeFix = editor.value;
  let lines = editor.value.split(/\r?\n/);

  const anchorFixes = safe
    .filter((issue) => issue.id.startsWith("anchor-broken") && issue.line && issue.before && issue.after)
    .sort((a, b) => b.line - a.line);

  for (const issue of anchorFixes) {
    const index = issue.line - 1;
    if (lines[index] && lines[index].includes(issue.before)) {
      lines[index] = lines[index].replace(issue.before, issue.after);
    }
  }

  let repaired = lines.join(editor.value.includes("\r\n") ? "\r\n" : "\n");
  if (safe.some((issue) => issue.id === "toc-outdated")) {
    repaired = syncManagedToc(repaired);
  }

  editor.value = repaired;
  const after = runAnalysis(`Applied ${safe.length} SAFE fix${safe.length === 1 ? "" : "es"} and re-analyzed.`);
  lineCountEl.textContent = `${after.lines} line${after.lines === 1 ? "" : "s"}`;
}

function loadContent(text, name) {
  editor.value = text;
  currentFileName = name || "README.md";
  fileNameEl.textContent = currentFileName;
  lastBeforeFix = text;
  runAnalysis("Content loaded and analyzed.");
}

document.querySelector("#sampleBtn").addEventListener("click", () => loadContent(sampleMarkdown, "README.md"));
document.querySelector("#analyzeBtn").addEventListener("click", () => runAnalysis());
document.querySelector("#fixBtn").addEventListener("click", applySafeFixes);
document.querySelector("#restoreBtn").addEventListener("click", () => {
  editor.value = lastBeforeFix;
  runAnalysis("Restored the Markdown from before the last SAFE fix.");
});
document.querySelector("#uploadBtn").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const text = await file.text();
  loadContent(text, file.name);
  fileInput.value = "";
});

document.querySelector("#copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(editor.value);
    setStatus("Markdown copied to clipboard.");
  } catch {
    editor.select();
    document.execCommand("copy");
    setStatus("Markdown copied.");
  }
});

document.querySelector("#downloadBtn").addEventListener("click", () => {
  const blob = new Blob([editor.value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = currentFileName || "README.md";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus("Markdown file saved.");
});

let debounceTimer;
editor.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  lineCountEl.textContent = `${editor.value.split(/\r?\n/).length} lines`;
  debounceTimer = setTimeout(() => runAnalysis("Auto-analysis updated."), 350);
});

loadContent(sampleMarkdown, "README.md");
