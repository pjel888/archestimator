import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

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

const paths = [
  "AGENTS.md",
  ".ai/00_system/AGENT_OPERATING_PROTOCOL.md",
  ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md",
  ".ai/00_system/VALIDATION_MATRIX.md",
  ".ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md",
  ".ai/08_prompts/000_Git Commit Prompt/GIt-Commit-Prompt.md",
  ".ai/10_state/current-state.md",
  "wrangler.jsonc",
  "CODEX.md",
  "CLAUDE.md",
  ".commandcode/README.md",
  "GEMINI.md",
  ".gemini/GEMINI.md",
  ".cursorrules",
  ".cursor/rules/00-archestimator-project-brain.mdc",
  ".cursor/commands/santa-loop.md",
  ".cursor/commands/prp-commit.md",
  ".cursor/commands/pr.md",
  ".cursor/commands/prp-pr.md",
  ".cursor/commands/checkpoint.md",
  ".cursor/commands/refactor-clean.md",
  ".cursor/commands/prp-implement.md",
  ".commandcode/taste/taste.md",
  ".ai/12_agents/README.md",
  ".ai/12_agents/codex-role-model-matrix.json",
  ".codex/config.toml",
  ".codex/agents/git-master.toml",
  ".codex/agents/prometheus-strict-metis.toml",
  ".codex/prompts/git-master.md",
];
const docs = new Map();
for (const path of paths) docs.set(path, await read(path));

const agents = docs.get("AGENTS.md");
const operating = docs.get(".ai/00_system/AGENT_OPERATING_PROTOCOL.md");
const framework = docs.get(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md");
const validation = docs.get(".ai/00_system/VALIDATION_MATRIX.md");
const directive = docs.get(".ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md");
const commitPrompt = docs.get(".ai/08_prompts/000_Git Commit Prompt/GIt-Commit-Prompt.md");
const currentState = docs.get(".ai/10_state/current-state.md");
const wrangler = docs.get("wrangler.jsonc");

requireText("AGENTS.md", agents, [
  "alpha/pre-beta",
  "Direct",
  "Brief",
  "Plan Pack",
  "DISCOVER -> DECIDE -> EDIT -> VERIFY -> FINISH",
  "Multi-Agent-Execution-Directive.md",
  "bun run supermemory:ensure",
  "TEST_PROPOSAL",
  "TEST_TASK",
  "TECH_BLOCKED",
  "node_modules/next/dist/docs/",
]);
requireText(".ai/00_system/AGENT_OPERATING_PROTOCOL.md", operating, [
  "Task Contract",
  "Direct",
  "Brief",
  "Plan Pack",
  "Multi-Agent-Execution-Directive.md",
  "Failure And Completion",
  "bun run supermemory:ensure",
  "TECH_BLOCKED",
]);
requireText(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md", framework, [
  "Payloads translate role capabilities",
  "Multi-Agent-Execution-Directive.md",
  "codex-role-model-matrix.json",
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

requireText(".ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md", directive, [
  "canonical orchestration contract",
  "Native subagents",
  "Parallel threads or team panes",
  "Emulated specialist passes",
  "Single-agent fallback",
  "Subagent Assignment Contract",
  "Handoff Contract",
  "Failure, Retry, And Recovery Contract",
  "Never allow concurrent writes to the same file",
  "lead executes the slice sequentially",
]);

requireText(".ai/08_prompts/000_Git Commit Prompt/GIt-Commit-Prompt.md", commitPrompt, [
  "Commit only the current task's evidenced changes",
  "separate explicit authorization",
  "Never infer ownership",
  "git add .",
  "detect_changes()",
  "Mixed-purpose hunks",
  "A clean worktree is not required",
  "Final Report",
]);
const forbiddenCommitPatterns = [
  [/commit and push all current worktree changes/iu, "unconditional commit and push"],
  [/merge the current working branch into `main`/iu, "unconditional main merge"],
  [/finish on local `main`/iu, "forced final branch"],
  [/merge only clearly completed, relevant branches/iu, "repository-wide branch integration"],
  [/delete the original outdated branch only after/iu, "automatic branch deletion"],
];
for (const [pattern, label] of forbiddenCommitPatterns) {
  if (pattern.test(commitPrompt)) errors.push(`Git commit prompt contains forbidden ${label}`);
}

for (const path of ["CODEX.md", "CLAUDE.md", ".commandcode/README.md"]) {
  const text = docs.get(path);
  requireText(path, text, [
    "AGENTS.md",
    ".ai/10_state/current-state.md",
    "Direct",
    "Brief",
    "Plan Pack",
    "NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK",
    "Multi-Agent-Execution-Directive.md",
    "bun run supermemory:ensure",
  ]);
}
for (const path of ["GEMINI.md", ".gemini/GEMINI.md"]) {
  const text = docs.get(path);
  requireText(path, text, ["Deprecated", "AGENTS.md", "Multi-Agent-Execution-Directive.md"]);
}
for (const path of [".cursorrules", ".cursor/rules/00-archestimator-project-brain.mdc"]) {
  const text = docs.get(path);
  requireText(path, text, ["AGENTS.md", "FAST PATH", "Multi-Agent-Execution-Directive.md"]);
}

requireText(".cursor/commands/santa-loop.md", docs.get(".cursor/commands/santa-loop.md"), [
  "optional review adapter",
  "one independent reviewer",
  "PASS|FAIL",
  "hardcode provider model",
  "Do not commit, push",
  "Do not impose dual approval",
]);
requireText(".cursor/commands/prp-commit.md", docs.get(".cursor/commands/prp-commit.md"), [
  "Grounded Commit Adapter",
  "Blank input does not mean all changes",
  "Preserve unfamiliar staged and unstaged work",
  "A clean worktree is not required",
]);
for (const path of [".cursor/commands/pr.md", ".cursor/commands/prp-pr.md"]) {
  requireText(path, docs.get(path), [
    "already committed task-owned work",
    "does not authorize",
    "mixed-worktree",
  ]);
}
requireText(".cursor/commands/prp-implement.md", docs.get(".cursor/commands/prp-implement.md"), [
  "canonical Archestimator workflow",
  "Stay on the current branch/worktree",
  "explicit current-task `TEST_TASK`",
]);

async function collectFiles(directory, suffixes) {
  const files = [];
  let entries = [];
  try {
    entries = await readdir(resolve(root, directory), { withFileTypes: true });
  } catch (error) {
    errors.push(`${directory}: unreadable workflow directory (${error.message})`);
    return files;
  }
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await collectFiles(path, suffixes));
    else if (suffixes.some((suffix) => entry.name.endsWith(suffix))) files.push(path);
  }
  return files;
}

const activeTaxonomyFiles = [
  ...await collectFiles(".codex/agents", [".toml"]),
  ...await collectFiles(".codex/prompts", [".md"]),
  ...await collectFiles(".commandcode", [".md"]),
];
for (const path of activeTaxonomyFiles) {
  const text = docs.get(path) ?? await read(path);
  if (/\b(?:TARGETED|BROADER)\b/u.test(text)) {
    errors.push(`${path}: contains legacy test taxonomy; use NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK`);
  }
}

const guardedCursorAdapters = [
  ".cursor/commands/santa-loop.md",
  ".cursor/commands/prp-commit.md",
  ".cursor/commands/pr.md",
  ".cursor/commands/prp-pr.md",
  ".cursor/commands/checkpoint.md",
  ".cursor/commands/refactor-clean.md",
  ".cursor/commands/prp-implement.md",
];
const forbiddenCursorPatterns = [
  [/\bgit add -A\b/iu, "broad staging"],
  [/\bgit push -u\b/iu, "automatic push command"],
  [/\bgit (?:pull --rebase|rebase|checkout -b)\b/iu, "automatic branch/history mutation"],
  [/create a git stash or commit/iu, "automatic checkpoint mutation"],
  [/immediately revert with `git checkout/iu, "shared-worktree overwrite"],
  [/Claude Opus|Gemini 2\.5|gpt-5\.[0-5]/iu, "hardcoded stale reviewer model"],
];
for (const path of guardedCursorAdapters) {
  const text = docs.get(path);
  for (const [pattern, label] of forbiddenCursorPatterns) {
    if (pattern.test(text)) errors.push(`${path}: contains forbidden ${label}`);
  }
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

const supportedCodexAgentModels = new Set([
  "gpt-5.6",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
]);
const supportedReasoningEfforts = new Set(["low", "medium", "high", "xhigh"]);
const matrixPath = ".ai/12_agents/codex-role-model-matrix.json";
let matrix = {};
try {
  matrix = JSON.parse(docs.get(matrixPath));
} catch (error) {
  errors.push(`${matrixPath}: invalid JSON (${error.message})`);
}

if (matrix.schema_version !== 2) errors.push(`${matrixPath}: expected schema_version 2`);
for (const capability of ["frontier_judgment", "balanced_read_heavy", "fast_repeatable"]) {
  if (!matrix.capability_classes?.[capability]) errors.push(`${matrixPath}: missing capability class ${capability}`);
}
if (!Array.isArray(matrix.fallback_order) || matrix.fallback_order.length !== 4) {
  errors.push(`${matrixPath}: fallback_order must contain four portable fallbacks`);
}
for (const [role, config] of Object.entries(matrix.roles ?? {})) {
  if (!supportedCodexAgentModels.has(config.model)) {
    errors.push(`${matrixPath}: role ${role} uses unsupported model ${config.model}`);
  }
  if (!supportedReasoningEfforts.has(config.reasoning_effort)) {
    errors.push(`${matrixPath}: role ${role} uses unsupported effort ${config.reasoning_effort}`);
  }
  const agentPath = `.codex/agents/${role}.toml`;
  const agentText = await read(agentPath);
  docs.set(agentPath, agentText);
  const model = agentText.match(/^model = "([^"]+)"$/mu)?.[1];
  const effort = agentText.match(/^model_reasoning_effort = "([^"]+)"$/mu)?.[1];
  if (model !== config.model) errors.push(`${agentPath}: model ${model} does not match matrix ${config.model}`);
  if (effort !== config.reasoning_effort) errors.push(`${agentPath}: effort ${effort} does not match matrix ${config.reasoning_effort}`);
}

const activeModelGuidance = [
  [matrixPath, JSON.stringify(matrix.roles ?? {})],
  [".codex/config.toml", docs.get(".codex/config.toml")],
  [".ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md", directive],
  ...Object.keys(matrix.roles ?? {}).map((role) => [`.codex/agents/${role}.toml`, docs.get(`.codex/agents/${role}.toml`) ?? ""]),
];
for (const [path, text] of activeModelGuidance) {
  for (const match of text.matchAll(/\bgpt-5\.\d+(?:-[a-z0-9][a-z0-9.-]*)?\b/giu)) {
    const model = match[0].toLowerCase();
    if (!supportedCodexAgentModels.has(model)) errors.push(`${path}: unsupported GPT-5 model ${model}`);
  }
}

const codexConfig = docs.get(".codex/config.toml");
requireText(".codex/config.toml", codexConfig, [
  'model = "gpt-5.6"',
  "max_depth = 1",
  "max_threads = 6",
  "agent_type",
]);
requireText(".codex/agents/git-master.toml", docs.get(".codex/agents/git-master.toml"), [
  "explicitly authorizes that exact operation",
  "Preserve unfamiliar staged, unstaged, and untracked work",
]);
for (const path of [".codex/agents/git-master.toml", ".codex/prompts/git-master.md"]) {
  const text = docs.get(path);
  requireText(path, text, [
    "Only explicitly authorized, task-owned changes are committed",
    "a clean worktree",
    "unauthorized history or remote mutation",
  ]);
  if (/Stash dirty files|Always use --force-with-lease|Did I use --force-with-lease/iu.test(text)) {
    errors.push(`${path}: forbidden automatic history recovery`);
  }
}
requireText(".codex/agents/prometheus-strict-metis.toml", docs.get(".codex/agents/prometheus-strict-metis.toml"), [
  "native_subagent_delegation: lead-only; forbidden when this role is a child",
]);

const combined = [agents, operating, framework, validation, directive, commitPrompt].join("\n");
const forbidden = [
  [/always run (?:all )?tests/iu, "automatic tests"],
  [/must create a plan pack for (?:all|every) non-trivial/iu, "universal plan packs"],
  [/production-safe by default/iu, "production paralysis"],
  [/owner acceptance is required/iu, "routine owner approval"],
  [/DISCOVER\s*(?:→|->)\s*PLAN\s*(?:→|->)\s*EXECUTE/iu, "obsolete six-stage loop"],
];
for (const [pattern, label] of forbidden) {
  if (pattern.test(combined)) errors.push(`canonical contracts contain forbidden ${label}`);
}

const wordCount = combined.trim().split(/\s+/u).length;
if (wordCount > 11000) errors.push(`canonical contract word budget exceeded: ${wordCount} (max 11000)`);

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

console.log(`AI workflow validation passed (${wordCount} canonical words, ${payloadFiles.length} payloads, orchestration/Git/model contracts valid${fullResolverValidation ? ", Codex/OpenCode resolvers" : ""})`);
