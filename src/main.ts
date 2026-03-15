#!/usr/bin/env node

import chalk from "chalk";
import { runSetup } from "./setup.js";
import { runCreateTask } from "./actions/create-task.js";
import { runUpdateTask } from "./actions/update-task.js";

const command = process.argv[2];

const HELP = `
${chalk.bold.cyan("taskgen")} — AI-powered task creator

${chalk.bold("Usage:")}
  taskgen setup          Configure AI provider and Linear API keys
  taskgen create-task    Generate and create a new task
  taskgen update-task <ID>   Update task status  (ex: taskgen update-task TEST-01)
  taskgen help           Show this help

${chalk.bold("First time?")}
  Run ${chalk.cyan("taskgen setup")} to get started.
`;

async function main() {
    switch (command) {
        case "setup":
            await runSetup();
            break;

        case "create-task":
            await runCreateTask();
            break;

        /* eslint-disable no-case-declarations */
        case "update-task":
            const identifier = process.argv[3];

            if (!identifier) {
                console.log(
                    chalk.red(
                        "Usage: taskgen update-task <IDENTIFIER>  (ex: taskgen update-task TEST-01)"
                    )
                );
                process.exit(1);
            }

            await runUpdateTask(identifier);
            break;

        case "help":
        case "--help":
        case "-h":
        case undefined:
            console.log(HELP);
            break;

        default:
            console.log(chalk.red(`Unknown command: ${command}`));
            console.log(HELP);
            process.exit(1);
    }
}

main().catch((err) => {
    console.error(chalk.red("Unexpected error:"), err.message);
    process.exit(1);
});
