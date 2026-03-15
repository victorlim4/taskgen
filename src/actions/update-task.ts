import { select } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { loadConfig } from "../config.js";
import Linear from "../integrations/linear.js";
import { genColoredStatusCircle } from "../utils.js";

export async function runUpdateTask(identifier: string) {
    const config = loadConfig();

    const client = new Linear(config);

    if (!config.linearApiKey) {
        console.log(chalk.red("Linear not configured. Run `taskgen setup` first."));
        process.exit(1);
    }

    const fetchSpinner = ora(`Fetching issue ${identifier}...`).start();
    let issue;

    try {
        issue = await client.getIssueByIdentifier(identifier);
        fetchSpinner.stop();
    } catch (err: any) {
        fetchSpinner.fail(`Could not fetch issue: ${err.message}`);
        process.exit(1);
    }

    console.log(chalk.bold(`\n📋 ${issue.identifier} — ${issue.title}\n`));

    const statesSpinner = ora("Fetching statuses...").start();
    let states;

    try {
        states = await client.getTeamStates(issue.teamId);
        statesSpinner.stop();
    } catch (err: any) {
        statesSpinner.fail(`Could not fetch statuses: ${err.message}`);
        process.exit(1);
    }

    const stateId = await select({
        message: "New status:",
        choices: states.map((s) => ({
            name: `${genColoredStatusCircle(s.color)} ${s.name}`,
            value: s.id,
        })),
        default: issue.stateId,
        pageSize: states.length,
    });

    const updateSpinner = ora("Updating...").start();

    try {
        await client.updateIssueStatus(issue.id, stateId);
        const newState = states.find((s) => s.id === stateId)!;
        updateSpinner.succeed(
            `${issue.identifier} updated to ${genColoredStatusCircle(newState.color)} ${newState.name}`
        );
    } catch (err: any) {
        updateSpinner.fail(`Update failed: ${err.message}`);
    }

    console.log();
}
