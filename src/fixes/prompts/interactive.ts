import readline from "readline";
import pc from "picocolors";
import { FixPlan, FixProposal } from "../types.js";

/**
 * Prompts user interactively for each repair proposal
 */
export async function promptUserForProposals(plan: FixPlan): Promise<string[]> {
  if (!process.stdin.isTTY) {
    console.error(
      pc.yellow("\n⚠ Interactive input is unavailable in non-interactive environment.")
    );
    console.error(
      pc.dim("Use: ") +
        pc.cyan("docs-healthcheck fix --yes") +
        pc.dim(" (safe repairs) or ") +
        pc.cyan("docs-healthcheck fix --dry-run") +
        pc.dim(" (preview changes).\n")
    );
    process.exit(1);
  }

  const acceptedIds: string[] = [];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

  try {
    for (const proposal of plan.proposals) {
      if (proposal.safety === "manual") {
        continue;
      }

      console.log("");
      const tag =
        proposal.safety === "safe"
          ? pc.bgGreen(pc.black(" SAFE "))
          : pc.bgYellow(pc.black(" CONFIRM "));

      console.log(`  ${tag} ${pc.bold(proposal.title)}`);
      console.log(`         ${pc.dim(proposal.description)}`);
      console.log(`         ${pc.dim(`Reason: ${proposal.reason}`)}`);

      if (proposal.before && proposal.after) {
        console.log(`         ${pc.red(`-${proposal.before}`)}`);
        console.log(`         ${pc.green(`+${proposal.after}`)}`);
      }

      const promptText =
        proposal.safety === "safe"
          ? `  ${pc.cyan("?")} Apply this fix? ${pc.dim("(Y/n)")}: `
          : `  ${pc.yellow("?")} Apply this change? ${pc.dim("(y/N)")}: `;

      const answer = (await question(promptText)).trim().toLowerCase();

      if (proposal.safety === "safe") {
        // Safe: Default is YES
        if (answer === "" || answer === "y" || answer === "yes") {
          acceptedIds.push(proposal.id);
          console.log(`  ${pc.green("✔ Accepted")}`);
        } else {
          console.log(`  ${pc.dim("○ Skipped")}`);
        }
      } else {
        // Confirm: Default is NO
        if (answer === "y" || answer === "yes") {
          acceptedIds.push(proposal.id);
          console.log(`  ${pc.green("✔ Confirmed")}`);
        } else {
          console.log(`  ${pc.dim("○ Skipped")}`);
        }
      }
    }
  } finally {
    rl.close();
  }

  return acceptedIds;
}
