import { input, select, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { loadConfig } from "../config.js";
import { generateTask } from "../ai.js";
import Linear from "../integrations/linear.js";
import { genColoredStatusCircle, loadLocalTemplates } from "../utils.js";
import { PRIORITY_MAP } from "../constants.js";
export async function runCreateTask() {
    console.log(chalk.bold.cyan("\n✨ Create a new task\n"));
    const config = loadConfig();
    const client = new Linear(config);
    if (!config.aiApiKey) {
        console.log(chalk.red("No AI API key configured. Run `taskgen setup` first."));
        process.exit(1);
    }
    const hasLinear = !!config.linearApiKey;
    let teamId;
    let assigneeId;
    if (hasLinear) {
        const teamsSpinner = ora("Fetching Linear teams...").start();
        let teams;
        try {
            teams = await client.getTeams();
            teamsSpinner.stop();
        }
        catch (err) {
            teamsSpinner.fail(`Could not fetch teams: ${err.message}`);
            process.exit(1);
        }
        teamId = await select({
            message: "Which team is this task for?",
            choices: teams.map((t) => ({ name: `${t.name} (${t.key})`, value: t.id })),
            pageSize: teams.length,
        });
    }
    const stateId = await (async () => {
        const statesSpinner = ora("Fetching states...").start();
        let states;
        try {
            states = await client.getTeamStates(teamId);
            statesSpinner.stop();
        }
        catch (err) {
            statesSpinner.fail(`Could not fetch states: ${err.message}`);
            process.exit(1);
        }
        return select({
            message: "Task status:",
            choices: states.map((s) => ({
                name: `${genColoredStatusCircle(s.color)} ${s.name}`,
                value: s.id,
            })),
            pageSize: states.length,
        });
    })();
    const what = await input({
        message: "Describe what you want to do:",
        validate: (v) => v.trim().length > 5 || "Please provide more details",
    });
    const changes = await input({
        message: "What will you change:",
        validate: (v) => v.trim().length > 3 || "Please provide more details",
    });
    const impact = await input({
        message: "What will be affected:",
        validate: (v) => v.trim().length > 3 || "Please provide more details",
    });
    const type = await select({
        message: "Task type:",
        choices: [
            { name: "Feature", value: "feature" },
            { name: "Bug", value: "bug" },
            { name: "Chore / Refactor", value: "chore" },
            { name: "Documentação", value: "docs" },
        ],
        pageSize: 4,
    });
    const priority = await select({
        message: "Priority:",
        choices: [
            { name: "🔴 Urgent", value: "urgent" },
            { name: "🟠 High", value: "high" },
            { name: "🟡 Medium", value: "medium" },
            { name: "🟢 Low", value: "low" },
        ],
        default: "medium",
        pageSize: 4,
    });
    let templateContent;
    const localTemplates = loadLocalTemplates();
    let linearTemplates = [];
    if (hasLinear && teamId) {
        try {
            linearTemplates = await client.getLinearTemplates(teamId);
        }
        catch {
            linearTemplates = [];
        }
    }
    const hasTemplates = localTemplates.length > 0 || linearTemplates.length > 0;
    if (hasTemplates) {
        const templateChoices = [
            { name: "None (default)", value: "__none__" },
            ...localTemplates.map((t) => ({
                name: `📄 ${t.name} (local)`,
                value: `local:${t.name}`,
            })),
            ...linearTemplates.map((t) => ({
                name: `🔗 ${t.name} (Linear)`,
                value: `linear:${t.name}`,
            })),
        ];
        const templateChoice = await select({
            message: "Want to use a template?",
            choices: templateChoices,
            pageSize: templateChoices.length,
        });
        if (templateChoice !== "__none__") {
            if (templateChoice.startsWith("local:")) {
                const name = templateChoice.replace("local:", "");
                templateContent = localTemplates.find((t) => t.name === name)?.content;
            }
            else {
                const name = templateChoice.replace("linear:", "");
                const lt = linearTemplates.find((t) => t.name === name);
                templateContent = lt?.description;
            }
        }
    }
    if (hasLinear && teamId) {
        const membersSpinner = ora("Fetching team members...").start();
        let viewer;
        let members;
        try {
            [viewer, members] = await Promise.all([
                client.getViewer(),
                client.getTeamMembers(teamId),
            ]);
            membersSpinner.stop();
        }
        catch (err) {
            membersSpinner.fail(`Could not fetch members: ${err.message}`);
            process.exit(1);
        }
        const assignToOther = await confirm({
            message: `Assignee: ${chalk.cyan(viewer.name)} (you). Change?`,
            default: false,
        });
        if (assignToOther) {
            const others = members.filter((m) => m.id !== viewer.id);
            if (others.length === 0) {
                console.log(chalk.yellow("No other members found in the team. Keeping you as the assignee."));
                assigneeId = viewer.id;
            }
            else {
                assigneeId = await select({
                    message: "Choose assignee:",
                    choices: others.map((m) => ({ name: `${m.name} (${m.email})`, value: m.id })),
                    pageSize: others.length,
                });
            }
        }
        else {
            assigneeId = viewer.id;
        }
    }
    const spinner = ora("Generating task with AI...").start();
    let task;
    try {
        task = await generateTask({ what, changes, impact, type, priority, template: templateContent }, config);
        spinner.succeed("Task generated!");
    }
    catch (err) {
        spinner.fail(`AI error: ${err.message}`);
        process.exit(1);
    }
    console.log(chalk.bold("\n📋 Task generated:\n"));
    console.log(chalk.bold("Title:    ") + chalk.white(task.title));
    console.log(chalk.bold("Description:\n") + chalk.dim(task.description));
    const editTitle = await confirm({ message: "Edit the title?", default: false });
    if (editTitle) {
        task.title = await input({ message: "New title:", default: task.title });
    }
    if (hasLinear && teamId) {
        const push = await confirm({ message: "Create issue in Linear?", default: true });
        if (push) {
            const pushSpinner = ora("Creating issue in Linear...").start();
            try {
                const issue = await client.createIssue(task, PRIORITY_MAP[priority], assigneeId, teamId, stateId);
                pushSpinner.succeed(`Issue created: ${chalk.cyan(issue.identifier)} — ${issue.url}`);
                const branchName = `${issue.identifier}-${task.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, "")
                    .trim()
                    .replace(/\s+/g, "-")}`;
                console.log(chalk.bold("\n🌿 Branch suggested:"));
                console.log(chalk.cyan(`  ${branchName}`));
                console.log(chalk.dim(`  git switch -c ${branchName}`));
            }
            catch (err) {
                pushSpinner.fail(`Linear error: ${err.message}`);
            }
        }
    }
    else {
        console.log(chalk.dim("\n(Linear not configured — run `taskgen setup` to connect)\n"));
    }
    console.log();
}
