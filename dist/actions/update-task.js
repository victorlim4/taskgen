import { select } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { loadConfig } from "../config.js";
import Linear from "../integrations/linear.js";
function coloredCircle(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return chalk.rgb(r, g, b)("●");
}
export async function runUpdateTask(identifier) {
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
    }
    catch (err) {
        fetchSpinner.fail(`Could not fetch issue: ${err.message}`);
        process.exit(1);
    }
    console.log(chalk.bold(`\n📋 ${issue.identifier} — ${issue.title}\n`));
    const statesSpinner = ora("Fetching statuses...").start();
    let states;
    try {
        states = await client.getTeamStates(issue.teamId);
        statesSpinner.stop();
    }
    catch (err) {
        statesSpinner.fail(`Could not fetch statuses: ${err.message}`);
        process.exit(1);
    }
    const stateId = await select({
        message: "New status:",
        choices: states.map((s) => ({
            name: `${coloredCircle(s.color)} ${s.name}`,
            value: s.id,
        })),
        default: issue.stateId,
        pageSize: states.length,
    });
    const updateSpinner = ora("Updating...").start();
    try {
        await client.updateIssueStatus(issue.id, stateId);
        const newState = states.find((s) => s.id === stateId);
        updateSpinner.succeed(`${issue.identifier} updated to ${coloredCircle(newState.color)} ${newState.name}`);
    }
    catch (err) {
        updateSpinner.fail(`Update failed: ${err.message}`);
    }
    console.log();
}
