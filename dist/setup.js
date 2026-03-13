import { input, select, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { loadConfig, saveConfig } from "./config.js";
import { fetchAvailableModels } from "./ai.js";
import ora from "ora";
export async function runSetup() {
    console.log(chalk.bold.cyan("\n⚙️  taskgen setup\n"));
    const config = loadConfig();
    const aiProvider = await select({
        message: "Which AI provider do you want to use?",
        choices: [
            { name: "Anthropic (Claude)", value: "anthropic" },
            { name: "OpenAI (GPT)", value: "openai" },
            { name: "Google (Gemini)", value: "gemini" },
        ],
        default: config.aiProvider ?? "gemini",
    });
    const providerLabel = {
        anthropic: "Anthropic",
        openai: "OpenAI",
        gemini: "Google AI (Gemini)",
    };
    const aiApiKey = await input({
        message: `Enter your ${providerLabel[aiProvider]} API key:`,
        default: config.aiApiKey,
        validate: (v) => v.trim().length > 0 || "API key is required",
    });
    const useDefaultModel = await confirm({
        message: "Use default model for the selected provider?",
        default: true,
    });
    let aiModel;
    if (!useDefaultModel) {
        const modelsSpinner = ora("Fetching available models...").start();
        const models = await fetchAvailableModels(aiProvider, aiApiKey.trim());
        modelsSpinner.stop();
        if (models.length > 0) {
            aiModel = await select({
                message: "Which model do you want to use?",
                choices: models.map((model) => ({ name: model.name, value: model.id })),
                default: config.aiModel,
                pageSize: Math.min(models.length, 10),
            });
        }
        else {
            console.log(chalk.yellow("Could not fetch models. Using default."));
        }
    }
    const useLinear = await confirm({
        message: "Do you want to connect Linear?",
        default: !!config.linearApiKey,
    });
    let linearApiKey;
    if (useLinear) {
        linearApiKey = await input({
            message: "Enter your Linear API key:",
            default: config.linearApiKey,
            validate: (v) => v.trim().length > 0 || "API key is required",
        });
    }
    saveConfig({
        aiProvider: aiProvider,
        aiApiKey: aiApiKey.trim(),
        ...(aiModel ? { aiModel } : {}),
        ...(useLinear && linearApiKey ? { linearApiKey: linearApiKey.trim() } : {}),
    });
    console.log(chalk.green("\n✅ Config saved to ~/.taskgen/config.json\n"));
}
