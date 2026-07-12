import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const errors = [];
const fullResolverValidation = process.argv.includes("--resolver=all");

async function read(path) {
  try {
    return await readFile(resolve(root, path), "utf8");
  } catch (error) {
    errors.push(`${path}: missing or unreadable (${error.message})`);
    return "";
  }
}

function requireText(path, text, values) {
  for (const value of values) {
    if (!text.includes(value)) errors.push(`${path}: missing ${JSON.stringify(value)}`);
  }
}

const agents = await read("AGENTS.md");
const operating = await read(".ai/00_system/AGENT_OPERATING_PROTOCOL.md");
const framework = await read(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md");
const validation = await read(".ai/00_system/VALIDATION_MATRIX.md");
const currentState = await read(".ai/10_state/current-state.md");
const wrangler = await read("wrangler.jsonc");
const codexEntry = await read("CODEX.md");
const claudeEntry = await read("CLAUDE.md");
const commandCodeEntry = await read(".commandcode/README.md");

requireText("AGENTS.md", agents, [
  "alpha/pre-beta",
  "Direct",
  "Brief",
  "Plan Pack",
  "DISCOVER -> DECIDE -> EDIT -> VERIFY -> FINISH",
  "bun run supermemory:ensure",
  "TEST_PROPOSAL",
  "TEST_TASK",
  "TECH_BLOCKED",
  "node_modules/next/dist/docs/",
]);
requireText(".ai/00_system/AGENT_OPERATING_PROTOCOL.md", operating, [
  "Direct",
  "Brief",
  "Plan Pack",
  "Delegate only independent bounded slices",
  "bun run supermemory:ensure",
  "TECH_BLOCKED",
]);
requireText(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md", framework, [
  "Payloads translate role capabilities",
  "Use the fewest roles needed",
  "bun run supermemory:ensure",
  "validate:agents",
]);
requireText(".ai/00_system/VALIDATION_MATRIX.md", validation, [
  "User Test Authorization Gate",
  "NOT_REQUIRED",
  "TEST_PROPOSAL",
  "TEST_TASK",
  "do not run",
]);
requireText(".ai/10_state/current-state.md", currentState, [
  "FAST PATH:START",
  "FAST PATH:END",
  "Pre-release posture",
  "Cloudflare/D1 is active",
]);
for (const [path, text] of [
  ["CODEX.md", codexEntry],
  ["CLAUDE.md", claudeEntry],
  [".commandcode/README.md", commandCodeEntry],
]) {
  requireText(path, text, [
    "AGENTS.md",
    ".ai/10_state/current-state.md",
    "Direct",
    "Brief",
    "Plan Pack",
    "NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK",
    "bun run supermemory:ensure",
  ]);
}

const bindingMatches = [...wrangler.matchAll(/"binding"\s*:\s*"([A-Z0-9_]+)"/gu)];
for (const [, binding] of bindingMatches) {
  if (binding === "ASSETS") continue;
  if (!agents.includes(binding)) errors.push(`AGENTS.md: missing wrangler binding ${binding}`);
}

const payloadDir = resolve(root, ".ai/12_agents/payloads");
let payloadFiles = [];
try {
  payloadFiles = (await readdir(payloadDir)).filter((file) => file.endsWith(".md") && !file.startsWith("_") && file !== "README.md");
} catch (error) {
  errors.push(`payload directory unreadable (${error.message})`);
}
for (const file of payloadFiles) {
  const path = `.ai/12_agents/payloads/${file}`;
  const text = await read(path);
  requireText(path, text, [
    "Status:",
    "Primary lane:",
    "Secondary lane:",
    "Prohibited lanes:",
    "AGENTS.md",
    ".ai/00_system",
    ".ai/10_state/current-state.md",
    "Direct",
    "Brief",
    "Plan Pack",
    "NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK",
  ]);
}

const combined = [agents, operating, framework, validation].join("\n");
const forbidden = [
  [/always run (?:all )?tests/iu, "automatic tests"],
  [/must create a plan pack for (?:all|every) non-trivial/iu, "universal plan packs"],
  [/production-safe by default/iu, "production paralysis"],
  [/owner acceptance is required/iu, "routine owner approval"],
];
for (const [pattern, label] of forbidden) {
  if (pattern.test(combined)) errors.push(`canonical contracts contain forbidden ${label}`);
}

const wordCount = combined.trim().split(/\s+/u).length;
if (wordCount > 9000) errors.push(`canonical contract word budget exceeded: ${wordCount} (max 9000)`);

function runResolver(command, args, checks) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 45_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`;
    errors.push(`${command} ${args.join(" ")} failed: ${detail}`);
    return;
  }
  const output = `${result.stdout}\n${result.stderr}`;
  for (const [label, value] of checks) {
    if (!output.includes(value)) errors.push(`${command} resolver missing ${label} (${JSON.stringify(value)})`);
  }
}

if (fullResolverValidation) {
  runResolver("codex", ["debug", "prompt-input", "Validate a small Direct-lane task."], [
    ["three-lane contract", "Three Execution Lanes"],
    ["test authority", "TEST_TASK"],
    ["pre-beta posture", "alpha/pre-beta"],
  ]);
  runResolver("opencode", ["debug", "config"], [
    ["repo authority", "AGENTS.md"],
    ["role payload", ".ai/12_agents/payloads/opencode.md"],
  ]);
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}

console.log(`AI workflow validation passed (${wordCount} canonical words, ${payloadFiles.length} payloads${fullResolverValidation ? ", Codex/OpenCode resolvers" : ""})`);
