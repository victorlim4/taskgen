# TaskGen

AI-powered task creator via CLI.

Describe what needs to be done → AI generates title + description → task is created automatically

---

## Install

```bash
npm install -g taskgen
# or run locally:
npm install
```

## Quick Start

**1. Configure:**
```bash
taskgen setup
```
You'll be prompted for:
- AI provider (Anthropic, OpenAI or Gemini) + API key
- Linear API key (optional) + team selection

**2. Create a task:**
```bash
taskgen create-task
```
You'll answer a few questions, the AI generates a title and description, and the issue is created in Linear.

---

## Commands

| Command | Description |
|---|---|
| `taskgen setup` | Configure API keys and Linear |
| `taskgen create-task` | Generate and push a new task |
| `taskgen help` | Show help |

---

## Config

Stored in `~/.taskgen/config.json`:

```json
{
  "aiProvider": "anthropic",
  "aiApiKey": "sk-ant-...",
  "linearApiKey": "lin_api_...",
  "linearTeamId": "abc123"
}
```

You can edit this file directly if needed.

---

## Development

```bash
npm install
npm run dev setup       # run setup
npm run dev create-task # run create-task
npm run build           # compile to dist/
```

## Requirements

- Node.js 18+
- An Anthropic or OpenAI API key
- A Linear account (optional, for auto-creating issues)
