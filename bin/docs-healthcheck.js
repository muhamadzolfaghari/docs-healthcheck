#!/usr/bin/env node

import("../dist/cli.mjs").then((cli) => {
  if (typeof cli.runCli === "function") {
    cli.runCli();
  }
}).catch((err) => {
  console.error("Failed to run docs-healthcheck:", err);
  process.exit(1);
});
