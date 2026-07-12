#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

import {
  hasRequiredSupermemoryBootstrap,
  SUPERMEMORY_BOOTSTRAP_COMMAND,
} from "./lib/supermemory-guidance.mjs";

const repoRoot = process.cwd();
const failures = [];
const warnings = [];
const agentPayloadRequiredFields = [
  "Status",
  "Primary lane",
  "Secondary lane",
  "Prohibited lanes",
  "Orchestrator authority",
  "Model/effort assignment",
  "Loop role",
  "Fail-safe",
];
const agentPayloadStatuses = new Set(["approved", "conditional", "deprecated", "unapproved", "non-agent"]);
const failClosedStatuses = new Set(["deprecated", "unapproved", "non-agent"]);
const supportedCodexAgentModels = new Set([
  "gpt-5.6",
  "gpt-5.6-terra",
]);
const resolverModes = new Set(["none", "opencode", "all"]);
let resolverMode = "none";

function rel(path) {
  return relative(repoRoot, path) || ".";
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function parseCliOptions() {
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--resolver=(none|opencode|all)$/u);
    if (match) {
      resolverMode = match[1];
    } else {
      fail(`Unknown validator argument ${JSON.stringify(arg)}; use --resolver=none|opencode|all.`);
    }
  }
  if (!resolverModes.has(resolverMode)) {
    fail(`Unsupported resolver mode ${JSON.stringify(resolverMode)}.`);
  }
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function readRepoText(path) {
  return readText(join(repoRoot, path));
}

function repoExists(path) {
  return existsSync(join(repoRoot, path));
}

function walkFiles(dir, predicate = () => true) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isLocalOnlyAdapterDirectory(path)) continue;
      out.push(...walkFiles(path, predicate));
    } else if (entry.isFile() && predicate(path)) {
      out.push(path);
    }
  }
  return out;
}

function isLocalOnlyAdapterDirectory(path) {
  const normalized = rel(path).replaceAll("\\", "/");
  return (
    normalized === ".codex/cache" ||
    normalized === ".codex/logs" ||
    normalized === ".codex/sessions" ||
    normalized === ".codex/state" ||
    normalized === ".codex/tmp" ||
    normalized === ".codex/local" ||
    normalized === ".opencode/node_modules"
  );
}

function isGeneratedOpenCodePath(path) {
  const normalized = rel(path).replaceAll("\\", "/");
  return (
    normalized === ".opencode/opencode.json" ||
    normalized === ".opencode/package.json" ||
    normalized === ".opencode/package-lock.json" ||
    normalized === ".opencode/.package-lock.json" ||
    normalized === ".opencode/.gitignore" ||
    normalized.startsWith(".opencode/node_modules/")
  );
}

function stripJsonComments(text) {
  let out = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inString) {
      out += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = "";
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      quote = char;
      out += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
        if (text[i] === "\n") out += "\n";
        i += 1;
      }
      i += 1;
      continue;
    }

    out += char;
  }

  return out;
}

function parseJsonc(path) {
  const withoutComments = stripJsonComments(readText(path));
  const withoutTrailingCommas = withoutComments.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(withoutTrailingCommas);
}

function runOpenCodeResolver() {
  try {
    return execFileSync("opencode", ["debug", "config"], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = error.stderr?.toString?.() ?? "";
    const detail = stderr.trim() || error.message;
    fail(`opencode debug config failed: ${detail}`);
    return null;
  }
}

function gitLsFiles(pathspecs) {
  try {
    const output = execFileSync("git", ["ls-files", "--", ...pathspecs], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output.split(/\r?\n/).filter(Boolean);
  } catch (error) {
    const stderr = error.stderr?.toString?.() ?? "";
    const detail = stderr.trim() || error.message;
    fail(`git ls-files failed while checking adapter hygiene: ${detail}`);
    return [];
  }
}

function parseCodexAgentToml(path) {
  const text = readText(path);
  const data = {};
  let multilineKey = null;
  let multilineValue = [];

  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const lineNumber = index + 1;

    if (multilineKey) {
      const end = rawLine.indexOf('"""');
      if (end === -1) {
        multilineValue.push(rawLine);
      } else {
        multilineValue.push(rawLine.slice(0, end));
        data[multilineKey] = multilineValue.join("\n");
        const remainder = rawLine.slice(end + 3).trim();
        if (remainder && !remainder.startsWith("#")) {
          throw new Error(`${path}:${lineNumber} has content after multiline string terminator.`);
        }
        multilineKey = null;
        multilineValue = [];
      }
      continue;
    }

    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const table = trimmed.match(/^\[([^\]]+)\]$/);
    if (table) {
      throw new Error(`${path}:${lineNumber} contains table [${table[1]}]; agent role files must stay top-level.`);
    }

    const multiline = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*"""(.*)$/);
    if (multiline) {
      const [, key, rest] = multiline;
      const end = rest.indexOf('"""');
      if (end === -1) {
        multilineKey = key;
        multilineValue = [rest];
      } else {
        data[key] = rest.slice(0, end);
        const remainder = rest.slice(end + 3).trim();
        if (remainder && !remainder.startsWith("#")) {
          throw new Error(`${path}:${lineNumber} has content after multiline string terminator.`);
        }
      }
      continue;
    }

    const stringValue = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*(?:#.*)?$/);
    if (stringValue) {
      const [, key, value] = stringValue;
      data[key] = JSON.parse(`"${value}"`);
      continue;
    }

    const booleanValue = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*(true|false)\s*(?:#.*)?$/);
    if (booleanValue) {
      const [, key, value] = booleanValue;
      data[key] = value === "true";
      continue;
    }

    throw new Error(`${path}:${lineNumber} is not valid supported Codex agent TOML.`);
  }

  if (multilineKey) {
    throw new Error(`${path} has unterminated multiline string for ${multilineKey}.`);
  }

  return data;
}

function parseAgentPayloadFields(path) {
  const fields = {};
  const duplicateFields = [];
  const invalidMetadataLines = [];
  const misplacedFields = [];
  const lines = readText(path).split(/\r?\n/);
  let sawH1 = false;
  let startedMetadata = false;
  let endedMetadata = false;

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    if (!sawH1) {
      if (line.startsWith("# ")) sawH1 = true;
      continue;
    }

    if (line.startsWith("## ")) {
      endedMetadata = true;
    }

    const field = agentPayloadRequiredFields.find((candidate) => line.startsWith(`${candidate}:`));
    if (endedMetadata) {
      if (field) misplacedFields.push({ field, lineNumber });
      continue;
    }

    if (!startedMetadata) {
      if (!line.trim()) continue;
      startedMetadata = true;
    } else if (!line.trim()) {
      endedMetadata = true;
      continue;
    }

    if (!field) {
      invalidMetadataLines.push(lineNumber);
      continue;
    }

    if (Object.hasOwn(fields, field)) {
      duplicateFields.push({ field, lineNumber });
    }
    const prefix = `${field}:`;
    fields[field] = line.slice(prefix.length).trim();
  }

  return { duplicateFields, fields, invalidMetadataLines, misplacedFields, sawH1 };
}

function formatFieldLine(fieldLine) {
  return `${fieldLine.field} at line ${fieldLine.lineNumber}`;
}

function formatLineNumbers(lineNumbers) {
  return lineNumbers.map((lineNumber) => `line ${lineNumber}`).join(", ");
}

function normalizePayloadStatus(status) {
  return status?.replaceAll("`", "").trim().toLowerCase() ?? "";
}

function checkAgentPayloadContracts() {
  const dir = join(repoRoot, ".ai/12_agents/payloads");
  const template = join(dir, "_template.md");
  if (!existsSync(template)) {
    fail("Missing .ai/12_agents/payloads/_template.md.");
    return;
  }

  const payloadFiles = walkFiles(dir, (path) => path.endsWith(".md")).filter((path) => {
    const fileName = basename(path);
    return fileName !== "README.md" && fileName !== "_template.md";
  });

  if (payloadFiles.length === 0) {
    fail(".ai/12_agents/payloads must contain at least one agent payload.");
  }

  for (const file of payloadFiles) {
    const text = readText(file);
    const { duplicateFields, fields, invalidMetadataLines, misplacedFields, sawH1 } =
      parseAgentPayloadFields(file);

    if (!sawH1) {
      fail(`${rel(file)} must start with an H1 title before payload metadata.`);
    }

    if (invalidMetadataLines.length > 0) {
      fail(`${rel(file)} has non-field lines in the payload metadata block: ${formatLineNumbers(invalidMetadataLines)}.`);
    }

    if (duplicateFields.length > 0) {
      fail(`${rel(file)} has duplicate payload metadata fields: ${duplicateFields.map(formatFieldLine).join(", ")}.`);
    }

    if (misplacedFields.length > 0) {
      fail(
        `${rel(file)} has payload metadata fields outside the header block: ${misplacedFields
          .map(formatFieldLine)
          .join(", ")}.`,
      );
    }

    for (const field of agentPayloadRequiredFields) {
      const value = fields[field] ?? "";
      if (!value) {
        fail(`${rel(file)} missing required payload field: ${field}.`);
      } else if (/[<>]/.test(value)) {
        fail(`${rel(file)} field ${field} still contains template placeholder syntax.`);
      }
    }

    const status = normalizePayloadStatus(fields.Status);
    if (!agentPayloadStatuses.has(status)) {
      fail(`${rel(file)} has unsupported Status: ${fields.Status ?? "(missing)"}.`);
    }

    const failSafe = fields["Fail-safe"]?.toLowerCase() ?? "";
    if (!failSafe.includes("fail closed")) {
      fail(`${rel(file)} Fail-safe must explicitly say fail closed.`);
    }

    const authority = fields["Orchestrator authority"] ?? "";
    if (!authority.includes(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md")) {
      fail(`${rel(file)} Orchestrator authority must point to AGENT_FRAMEWORK_PROTOCOL.md.`);
    }

    for (const requiredReference of ["AGENTS.md", ".ai/00_system", ".ai/10_state/current-state.md"]) {
      if (!text.includes(requiredReference)) {
        fail(`${rel(file)} must reference ${requiredReference}.`);
      }
    }

    if (failClosedStatuses.has(status) && !/fail[- ]closed/i.test(text)) {
      fail(`${rel(file)} must state fail-closed behavior for ${status} payloads.`);
    }
  }
}

function checkSupermemoryBootstrapContract() {
  const requiredSurfaces = [
    "AGENTS.md",
    "CODEX.md",
    "CLAUDE.md",
    "GEMINI.md",
    ".codex/README.md",
    ".claude/README.md",
    ".agents/README.md",
    ".commandcode/README.md",
    ".cursor/rules/00-archestimator-project-brain.mdc",
    ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md",
    ".ai/12_agents/README.md",
    ".ai/12_agents/payloads/README.md",
    ...[
      "_template",
      "antigravity",
      "claude",
      "codex",
      "commandcode",
      "deepseek",
      "gemini",
      "hermes",
      "kimi",
      "ollama",
      "opencode",
    ].map((name) => `.ai/12_agents/payloads/${name}.md`),
  ];

  for (const file of requiredSurfaces) {
    if (!repoExists(file)) {
      fail(`Missing Supermemory agent entry surface: ${file}.`);
    } else if (!hasRequiredSupermemoryBootstrap(readRepoText(file))) {
      fail(`${file} must carry the required Supermemory bootstrap marker and non-negated ${SUPERMEMORY_BOOTSTRAP_COMMAND} command.`);
    }
  }

  let packageJson;
  try {
    packageJson = JSON.parse(readRepoText("package.json"));
  } catch (error) {
    fail(`package.json is not valid JSON: ${error.message}`);
    return;
  }
  for (const [name, command] of Object.entries({
    "supermemory:configure": "node scripts/configure-supermemory-server.mjs --install-launch-agent",
    "supermemory:ensure": "node scripts/ensure-supermemory-server.mjs",
    "supermemory:start": "node scripts/start-verified-supermemory-server.mjs",
    "supermemory:search": "node scripts/supermemory-memory.mjs search",
    "supermemory:add": "node scripts/supermemory-memory.mjs add",
  })) {
    if (packageJson.scripts?.[name] !== command) {
      fail(`package.json script ${name} must be ${command}.`);
    }
  }
}

function checkOpenCodeConfig() {
  if (repoExists(".opencode.json")) {
    fail("Legacy .opencode.json exists; use documented root opencode.json instead.");
  }

  if (!repoExists("opencode.json")) {
    fail("Missing root opencode.json.");
    return;
  }

  let config;
  const resolvedOutput = resolverMode === "opencode" || resolverMode === "all"
    ? runOpenCodeResolver()
    : null;
  try {
    config = parseJsonc(join(repoRoot, "opencode.json"));
  } catch (error) {
    fail(`opencode.json is not valid JSONC: ${error.message}`);
    return;
  }

  const instructions = config.instructions;
  if (!Array.isArray(instructions)) {
    fail("opencode.json must define an instructions array.");
  } else {
    for (const required of ["AGENTS.md", ".ai/12_agents/payloads/opencode.md"]) {
      if (!instructions.includes(required)) {
        fail(`opencode.json instructions must include ${required}.`);
      }
    }
  }

  if (Object.hasOwn(config, "mcpServers")) {
    fail("opencode.json uses stale mcpServers; use OpenCode's mcp key.");
  }

  const crg = config.mcp?.["code-review-graph"];
  if (!crg) {
    fail("opencode.json must configure mcp.code-review-graph.");
    return;
  }

  const command = Array.isArray(crg.command) ? crg.command : [];
  if (crg.type !== "local") {
    fail("opencode.json mcp.code-review-graph.type must be local.");
  }
  if (command[0] !== "uvx") {
    fail("opencode.json code-review-graph command must start with uvx.");
  }
  if (!command.includes("code-review-graph==2.3.5")) {
    fail("opencode.json must pin code-review-graph==2.3.5.");
  }
  if (!command.includes("serve")) {
    fail("opencode.json code-review-graph command must include serve.");
  }
  if (crg.enabled !== true) {
    fail("opencode.json mcp.code-review-graph.enabled must be true.");
  }

  if (resolvedOutput) {
    for (const required of [
      '"instructions"',
      '"AGENTS.md"',
      '".ai/12_agents/payloads/opencode.md"',
      '"mcp"',
      '"code-review-graph"',
      '"code-review-graph==2.3.5"',
    ]) {
      if (!resolvedOutput.includes(required)) {
        fail(`opencode debug config output did not include ${required}.`);
      }
    }
  }

  const generatedOpenCodePaths = [
    ".opencode/opencode.json",
    ".opencode/node_modules",
    ".opencode/package.json",
    ".opencode/package-lock.json",
    ".opencode/.package-lock.json",
  ];
  for (const path of generatedOpenCodePaths) {
    if (repoExists(path)) {
      fail(`Generated/local OpenCode artifact must not be present in repo: ${path}`);
    }
  }
}

function checkCodexConfig() {
  if (!repoExists(".codex/config.toml")) {
    fail("Missing .codex/config.toml.");
    return;
  }

  const config = readRepoText(".codex/config.toml");
  if (!config.includes("[mcp_servers.code-review-graph]")) {
    fail(".codex/config.toml must configure mcp_servers.code-review-graph.");
  }
  if (!config.includes('"code-review-graph==2.3.5"')) {
    fail(".codex/config.toml must pin code-review-graph==2.3.5.");
  }
  if (!config.includes("AGENTS.md is the orchestration brain")) {
    fail(".codex/config.toml developer_instructions must route through AGENTS.md.");
  }
  if (!config.includes("child_agents_md = true")) {
    fail(".codex/config.toml should keep child_agents_md enabled.");
  }
  if (!/^model = "gpt-5\.6"$/mu.test(config)) {
    fail(".codex/config.toml must pin the current frontier default model gpt-5.6.");
  }
  if (/^model_(?:context_window|auto_compact_token_limit)\s*=/mu.test(config)) {
    fail(".codex/config.toml must use current model metadata/default compaction instead of manual context caps.");
  }
  const agentsStart = config.indexOf("[agents]");
  const agentsTable = agentsStart === -1
    ? ""
    : config.slice(agentsStart + "[agents]".length).split(/\n(?=\[)/u, 1)[0];
  if (!/^max_depth\s*=\s*1\s*$/mu.test(agentsTable)) {
    fail(".codex/config.toml [agents].max_depth must stay at the native depth-one contract.");
  }
  if (!/^max_threads\s*=\s*6\s*$/mu.test(agentsTable)) {
    fail(".codex/config.toml [agents].max_threads must stay at the six-thread ceiling.");
  }
}

function checkCodexAgentRoles() {
  const matrixPath = ".ai/12_agents/codex-role-model-matrix.json";
  let matrix;
  try {
    matrix = JSON.parse(readRepoText(matrixPath));
  } catch (error) {
    fail(`${matrixPath} is missing or invalid JSON: ${error.message}`);
    return;
  }
  const expectedRoles = matrix?.roles;
  if (!expectedRoles || typeof expectedRoles !== "object" || Array.isArray(expectedRoles)) {
    fail(`${matrixPath} must define a roles object.`);
    return;
  }

  const dir = join(repoRoot, ".codex/agents");
  const files = walkFiles(dir, (path) => path.endsWith(".toml")).sort();
  const actualRoleNames = files.map((file) => basename(file, ".toml"));
  const expectedRoleNames = Object.keys(expectedRoles).sort();
  if (JSON.stringify(actualRoleNames) !== JSON.stringify(expectedRoleNames)) {
    fail(`${matrixPath} roles must exactly match .codex/agents/*.toml; expected ${actualRoleNames.join(", ")}.`);
  }

  for (const file of files) {
    try {
      const data = parseCodexAgentToml(file);
      const name = typeof data.name === "string" ? data.name.trim() : "";
      if (!name) {
        fail(`${rel(file)} must define a non-empty top-level name.`);
      } else if (name !== basename(file, ".toml")) {
        fail(`${rel(file)} name must match the role filename (${basename(file, ".toml")}).`);
      }
      if (typeof data.developer_instructions !== "string" || !data.developer_instructions.trim()) {
        warn(`${rel(file)} has no non-empty developer_instructions field.`);
      }
      if (!supportedCodexAgentModels.has(data.model)) {
        fail(`${rel(file)} uses unsupported model ${JSON.stringify(data.model)}; use the current frontier or approved specialist/fast-lane model.`);
      }
      const expected = expectedRoles[name];
      if (!expected) continue;
      const instructionMetadata = Object.fromEntries(
        ["posture", "model_class", "routing_role", "resolved_model"].map((key) => [
          key,
          data.developer_instructions?.match(new RegExp(`^- ${key}:\\s*(\\S+)\\s*$`, "m"))?.[1],
        ]),
      );
      for (const [field, actual] of [
        ["model", data.model],
        ["reasoning_effort", data.model_reasoning_effort],
        ["posture", instructionMetadata.posture],
        ["model_class", instructionMetadata.model_class],
        ["routing_role", instructionMetadata.routing_role],
      ]) {
        if (actual !== expected[field]) {
          fail(`${rel(file)} ${field} ${JSON.stringify(actual)} does not match ${matrixPath} ${JSON.stringify(expected[field])}.`);
        }
      }
      if (instructionMetadata.resolved_model !== data.model) {
        fail(`${rel(file)} resolved_model ${instructionMetadata.resolved_model} does not match top-level model ${data.model}.`);
      }
    } catch (error) {
      fail(error.message);
    }
  }
}

function checkFastPathContract() {
  const path = ".ai/10_state/current-state.md";
  const text = readRepoText(path);
  const startMarker = "<!-- FAST PATH:START -->";
  const endMarker = "<!-- FAST PATH:END -->";
  const count = (needle) => text.split(needle).length - 1;
  if (count(startMarker) !== 1 || count(endMarker) !== 1) {
    fail(`${path} must contain exactly one explicit FAST PATH:START/FAST PATH:END marker pair.`);
    return;
  }
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end <= start) {
    fail(`${path} FAST PATH markers are out of order.`);
    return;
  }
  const block = text.slice(start, end + endMarker.length);
  const lineCount = block.split(/\r?\n/u).length;
  const byteCount = Buffer.byteLength(block, "utf8");
  if (lineCount > 150) {
    fail(`${path} FAST PATH is ${lineCount} lines; the startup contract allows at most 150.`);
  }
  if (byteCount > 16 * 1024) {
    fail(`${path} FAST PATH is ${byteCount} bytes; the startup contract allows at most 16 KiB.`);
  }
  for (const required of [
    "Cloudflare/D1 is active",
    "migrations/",
    "supabase/migrations/",
    "historical provider-exit evidence",
    "must not be mutated or extended",
  ]) {
    if (!block.includes(required)) {
      fail(`${path} FAST PATH must contain current provider posture phrase ${JSON.stringify(required)}.`);
    }
  }
  if (/standing authorization.{0,120}Supabase|Supabase project.{0,120}(?:create|edit|apply) migrations/is.test(block)) {
    fail(`${path} FAST PATH contains superseded active Supabase mutation authority.`);
  }
}

function checkCloudflareSourceTruth() {
  let wrangler;
  try {
    wrangler = parseJsonc(join(repoRoot, "wrangler.jsonc"));
  } catch (error) {
    fail(`wrangler.jsonc is not valid JSONC: ${error.message}`);
    return;
  }
  const bindingNames = [
    ...(wrangler.d1_databases ?? []).map((entry) => entry.binding),
    ...(wrangler.r2_buckets ?? []).map((entry) => entry.binding),
    ...(wrangler.durable_objects?.bindings ?? []).map((entry) => entry.name),
    ...(wrangler.queues?.producers ?? []).map((entry) => entry.binding),
    wrangler.images?.binding,
    ...(wrangler.send_email ?? []).map((entry) => entry.name),
  ].filter(Boolean);
  const crons = wrangler.triggers?.crons ?? [];
  const agents = readRepoText("AGENTS.md");
  for (const value of [...bindingNames, ...crons]) {
    if (!agents.includes(value)) {
      fail(`AGENTS.md is missing current wrangler.jsonc fact ${JSON.stringify(value)}.`);
    }
  }
  const cursorBrain = readRepoText(".cursor/rules/00-archestimator-project-brain.mdc");
  if (!cursorBrain.includes("wrangler.jsonc") || !cursorBrain.includes("migrations/")) {
    fail(".cursor/rules/00-archestimator-project-brain.mdc must point to source-defined Cloudflare bindings and migrations.");
  }
  if (/\b\d+\s+(?:active\s+)?(?:D1\s+)?migrations\b/iu.test(cursorBrain)) {
    fail(".cursor/rules/00-archestimator-project-brain.mdc must not copy a mutable migration count.");
  }
}

function checkCursorRules() {
  const ruleDir = join(repoRoot, ".cursor/rules");
  const alwaysLoaded = walkFiles(ruleDir, (path) => path.endsWith(".mdc"))
    .filter((path) => /^alwaysApply:\s*true\s*$/mu.test(readText(path)));
  if (alwaysLoaded.length !== 1 || rel(alwaysLoaded[0]) !== ".cursor/rules/00-archestimator-project-brain.mdc") {
    fail(`Cursor must have exactly one alwaysApply rule at .cursor/rules/00-archestimator-project-brain.mdc; found ${alwaysLoaded.map(rel).join(", ") || "none"}.`);
  } else if (statSync(alwaysLoaded[0]).size > 8 * 1024) {
    fail(`${rel(alwaysLoaded[0])} exceeds the 8 KiB always-loaded context budget.`);
  }
  for (const removed of [
    ".cursor/rules/01-shared-worktree-safety.mdc",
    ".cursor/rules/02-validation-and-evidence.mdc",
    ".cursor/rules/03-agent-orchestration.mdc",
  ]) {
    if (repoExists(removed)) fail(`${removed} must remain consolidated into the compact Cursor brain rule.`);
  }
}

function checkCursorHooks() {
  const path = ".cursor/hooks.json";
  let config;
  try {
    config = JSON.parse(readRepoText(path));
  } catch (error) {
    fail(`${path} is not valid JSON: ${error.message}`);
    return;
  }
  const expectedEvents = [
    "beforeReadFile",
    "beforeShellExecution",
    "beforeSubmitPrompt",
    "beforeTabFileRead",
    "sessionStart",
  ];
  const actualEvents = Object.keys(config.hooks ?? {}).sort();
  if (JSON.stringify(actualEvents) !== JSON.stringify(expectedEvents)) {
    fail(`${path} must register only the five truthful local events: ${expectedEvents.join(", ")}.`);
  }
  const configuredScripts = new Set();
  for (const [event, entries] of Object.entries(config.hooks ?? {})) {
    if (!Array.isArray(entries) || entries.length !== 1) {
      fail(`${path} ${event} must contain exactly one handler.`);
      continue;
    }
    const entry = entries[0];
    if (entry.event !== event || typeof entry.description !== "string" || !entry.description.trim()) {
      fail(`${path} ${event} must have a matching event and truthful non-empty description.`);
    }
    const match = typeof entry.command === "string"
      ? entry.command.match(/^node\s+(\.cursor\/hooks\/[A-Za-z0-9._-]+\.js)$/u)
      : null;
    if (!match) {
      fail(`${path} ${event} must execute one repo-local Node hook script.`);
      continue;
    }
    if (["beforeShellExecution", "beforeTabFileRead"].includes(event) && entry.failClosed !== true) {
      fail(`${path} ${event} must declare failClosed: true because it enforces a security boundary.`);
    }
    if (event === "sessionStart" && entry.failClosed !== false) {
      fail(`${path} sessionStart must declare failClosed: false so auxiliary memory availability cannot block implementation.`);
    }
    configuredScripts.add(match[1]);
    if (!repoExists(match[1])) {
      fail(`${path} ${event} references missing script ${match[1]}.`);
    } else if (/runExistingHook|getPluginRoot|scripts\/hooks\//u.test(readRepoText(match[1]))) {
      fail(`${match[1]} delegates to the removed missing-hook adapter contract.`);
    }
  }
  const allowedScripts = new Set([".cursor/hooks/adapter.js", ...configuredScripts]);
  for (const file of walkFiles(join(repoRoot, ".cursor/hooks"), (file) => file.endsWith(".js"))) {
    if (!allowedScripts.has(rel(file))) {
      fail(`${rel(file)} is an unregistered Cursor hook wrapper; delete dead lifecycle work or register a truthful handler.`);
    }
  }
  const adapter = readRepoText(".cursor/hooks/adapter.js");
  if (/runExistingHook|getPluginRoot|scripts\/hooks\//u.test(adapter)) {
    fail(".cursor/hooks/adapter.js must stay local and must not delegate to missing scripts/hooks targets.");
  }
  const sessionStart = readRepoText(".cursor/hooks/session-start.js");
  if (!sessionStart.includes("supermemory:ensure") || !sessionStart.includes("DEGRADED") || sessionStart.includes("BLOCKED: Supermemory")) {
    fail(".cursor/hooks/session-start.js must report degraded Supermemory availability without blocking session startup.");
  }
  const shell = readRepoText(".cursor/hooks/before-shell-execution.js");
  for (const required of ["--no-verify", "commitShortClusterHasNoVerify", "bunx", "npx", "background", "nestedShellClauses", "tmux", "process.exit(2)"]) {
    if (!shell.includes(required)) fail(`.cursor/hooks/before-shell-execution.js is missing ${JSON.stringify(required)}.`);
  }
  for (const readHook of [".cursor/hooks/before-read-file.js", ".cursor/hooks/before-tab-file-read.js"]) {
    if (!readRepoText(readHook).includes("file_path")) {
      fail(`${readHook} must consume Cursor's official top-level file_path input.`);
    }
  }
  if (!readRepoText(".cursor/hooks/before-tab-file-read.js").includes("process.exit(2)")) {
    fail(".cursor/hooks/before-tab-file-read.js must fail closed when its input cannot be inspected.");
  }
}

function checkCursorAgents() {
  const agentDir = join(repoRoot, ".cursor/agents");
  const triggerPattern = /\b(?:PROACTIVELY|MUST BE USED|automatically activated|automatically invoke[ds]?|always use this agent)\b/iu;
  for (const file of walkFiles(agentDir, (path) => path.endsWith(".md"))) {
    const text = readText(file);
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? "";
    const description = frontmatter.match(/^description:\s*(.+)$/mu)?.[1] ?? "";
    if (!description) {
      fail(`${rel(file)} must define a frontmatter description.`);
    } else if (triggerPattern.test(description)) {
      fail(`${rel(file)} frontmatter contains unconditional activation language: ${description}`);
    }
  }
  const staleCorePatterns = [
    [".cursor/agents/ecc-architect.md", /Next\.js 15|Vercel\s*\/\s*Postgres\s*\/\s*Supabase/iu],
    [".cursor/agents/ecc-planner.md", /(?:create|add|write).{0,80}supabase\/migrations|row[- ]level security|\bRLS policies\b/iu],
    [".cursor/agents/ecc-database-reviewer.md", /PostgreSQL\s*\/\s*Supabase|\bRLS policies\b|active migrations.{0,80}supabase\/migrations/iu],
  ];
  for (const [file, pattern] of staleCorePatterns) {
    if (pattern.test(readRepoText(file))) {
      fail(`${file} contains stale active project architecture/provider guidance.`);
    }
  }
  const projectFacingFiles = [
    ".cursor/agents/ecc-architect.md",
    ".cursor/agents/ecc-code-reviewer.md",
    ".cursor/agents/ecc-database-reviewer.md",
    ".cursor/agents/ecc-e2e-runner.md",
    ".cursor/agents/ecc-planner.md",
    ".cursor/agents/ecc-security-reviewer.md",
    ".cursor/agents/ecc-tdd-guide.md",
  ];
  const staleProjectPrescription = /Next\.js 15|Vercel\s*\/\s*Postgres\s*\/\s*Supabase|active migrations.{0,100}supabase\/migrations|(?:create|add|write).{0,100}supabase\/migrations/iu;
  for (const file of projectFacingFiles) {
    if (staleProjectPrescription.test(readRepoText(file))) {
      fail(`${file} contains stale project-specific provider or framework guidance.`);
    }
  }

  const tddGuide = readRepoText(".cursor/agents/ecc-tdd-guide.md").replace(/\s+/gu, " ");
  for (const required of ["explicitly requested testing and TDD", "TEST_TASK", "never authorize test execution or edits"]) {
    if (!tddGuide.includes(required)) {
      fail(`.cursor/agents/ecc-tdd-guide.md must preserve explicit user authorization for TDD: missing ${JSON.stringify(required)}.`);
    }
  }
  const e2eGuide = readRepoText(".cursor/agents/ecc-e2e-runner.md").replace(/\s+/gu, " ");
  for (const required of ["explicitly requests E2E/browser proof", "do not grant authority", "separate opt-in boundary"]) {
    if (!e2eGuide.includes(required)) {
      fail(`.cursor/agents/ecc-e2e-runner.md must keep browser work explicitly user-authorized: missing ${JSON.stringify(required)}.`);
    }
  }
  const designRule = readRepoText(".cursor/rules/14-design-system-components.mdc").replace(/\s+/gu, " ");
  for (const required of ["specific browser-only claim", "cannot be proved more cheaply", "Prefer static, type/LSP, lint, unit, or DOM evidence"]) {
    if (!designRule.includes(required)) {
      fail(`.cursor/rules/14-design-system-components.mdc must preserve proportional browser evidence: missing ${JSON.stringify(required)}.`);
    }
  }

  for (const testEngineerPath of [".codex/agents/test-engineer.toml", ".codex/prompts/test-engineer.md"]) {
    const testEngineer = readRepoText(testEngineerPath).replace(/\s+/gu, " ");
    for (const required of ["explicit user-authorized `TEST_TASK`", "proposal-only metadata", "do not run or edit tests", "only when the user explicitly requests TDD"]) {
      if (!testEngineer.includes(required)) {
        fail(`${testEngineerPath} must keep all test work behind explicit current-task user authorization: missing ${JSON.stringify(required)}.`);
      }
    }
  }
}

function checkStaleModelGuidance() {
  const roots = [
    ".codex/agents",
    ".codex/prompts",
    ".agents/skills/prometheus-strict",
    ".agents/skills/ce-code-review",
    ".agents/skills/ce-simplify-code",
  ];
  for (const root of roots) {
    const full = join(repoRoot, root);
    const files = statSync(full).isFile() ? [full] : walkFiles(full, (path) => /\.(?:md|toml)$/u.test(path));
    for (const file of files) {
      const hardcodedModels = [...readText(file).matchAll(/\bgpt-5\.\d+(?:-[a-z0-9][a-z0-9.-]*)?\b/giu)]
        .map((match) => match[0].toLowerCase());
      for (const model of hardcodedModels) {
        if (!supportedCodexAgentModels.has(model)) {
          fail(`${rel(file)} contains stale hardcoded model guidance ${JSON.stringify(model)}; use the current role matrix or session inheritance.`);
        }
      }
    }
  }
}

function checkTestGateSummaryContract() {
  const paths = [
    "AGENTS.md",
    "CODEX.md",
    "CLAUDE.md",
    ".ai/00_system/AGENT_OPERATING_PROTOCOL.md",
    ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md",
    ".ai/00_system/VALIDATION_MATRIX.md",
    ".ai/10_state/current-state.md",
    ".ai/12_agents/README.md",
    ".ai/12_agents/payloads/README.md",
    ".ai/12_agents/payloads/_template.md",
    ".ai/12_agents/payloads/antigravity.md",
    ".ai/12_agents/payloads/claude.md",
    ".ai/12_agents/payloads/codex.md",
    ".ai/12_agents/payloads/commandcode.md",
    ".ai/12_agents/payloads/deepseek.md",
    ".ai/12_agents/payloads/gemini.md",
    ".ai/12_agents/payloads/hermes.md",
    ".ai/12_agents/payloads/kimi.md",
    ".ai/12_agents/payloads/ollama.md",
    ".ai/12_agents/payloads/opencode.md",
    ".cursor/rules/00-archestimator-project-brain.mdc",
  ];
  for (const path of paths) {
    const text = readRepoText(path).replace(/\s+/gu, " ");
    const mapsExplicitToTestTask =
      /TEST_TASK.{0,160}explicit (?:test|testing|QA)/iu.test(text) ||
      /explicit (?:test|testing|QA).{0,160}TEST_TASK/iu.test(text);
    const keepsTargetedProposalOnly =
      /TARGETED.{0,280}(?:propos|not authoriz|never authoriz|does not authoriz)/iu.test(text) ||
      /(?:propos|not authoriz|never authoriz|does not authoriz).{0,280}TARGETED/iu.test(text);
    const withdrawsExistingTestSelfAuthorization =
      /CHEAPEST_DECISIVE_EXISTING_TEST.{0,320}(?:withdrawn|propos|not authoriz|never authoriz|does not authoriz)/iu.test(text) ||
      /(?:withdrawn|propos|not authoriz|never authoriz|does not authoriz).{0,320}CHEAPEST_DECISIVE_EXISTING_TEST/iu.test(text);
    if (!mapsExplicitToTestTask) {
      fail(`${path} must map explicit testing/QA output to TEST_TASK.`);
    }
    if (!keepsTargetedProposalOnly) {
      fail(`${path} must keep TARGETED proposal-only without test execution authority.`);
    }
    if (!withdrawsExistingTestSelfAuthorization) {
      fail(`${path} must withdraw CHEAPEST_DECISIVE_EXISTING_TEST self-authorization.`);
    }
  }
}

function checkActiveGuidancePolicyDrift() {
  const roots = [
    "AGENTS.md",
    "CODEX.md",
    "CLAUDE.md",
    "GEMINI.md",
    ".agents/README.md",
    ".agents/skills/archestimator-plan-pack/SKILL.md",
    ".agents/skills/autopilot/SKILL.md",
    ".agents/skills/autoresearch/SKILL.md",
    ".agents/skills/autoresearch-goal/SKILL.md",
    ".agents/skills/ultragoal/SKILL.md",
    ".agents/skills/ultraqa/SKILL.md",
    ".agents/skills/ultrawork/SKILL.md",
    ".claude/README.md",
    ".codex/README.md",
    ".commandcode/README.md",
    ".ai/00_system/AGENT_OPERATING_PROTOCOL.md",
    ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md",
    ".ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md",
    ".ai/00_system/VALIDATION_MATRIX.md",
    ".ai/08_prompts/000_Planning Prompts",
    ".ai/08_prompts/templates/codebase-ai-loop-task.md",
    ".ai/12_agents",
    ".codex/agents",
    ".codex/prompts",
    ".commandcode/agents",
    ".commandcode/taste",
    ".cursor/rules/00-archestimator-project-brain.mdc",
    ".cursor/rules/14-design-system-components.mdc",
    ".cursor/rules/17-testing-discipline.mdc",
  ];
  const files = [...new Set(roots.flatMap((root) => {
    const full = join(repoRoot, root);
    if (!existsSync(full)) return [];
    if (statSync(full).isFile()) return [full];
    return walkFiles(full, (path) => /\.(md|mdc|toml)$/.test(path));
  }))];

  const blanketMandates = [
    /\b(?:always|must|required to)\s+(?:write|add|create)\s+(?:a\s+|the\s+)?(?:failing\s+)?tests?\s+(?:first|before)\b/i,
    /\b(?:always|must|required to)\s+run\s+(?:all\s+)?tests?\b/i,
    /\brun all tests after (?:any |every )?changes?\b/i,
    /\bfor (?:all|every|any|behavior-bearing) (?:changes?|tasks?|features?).{0,100}\b(?:tdd|test[- ]first|write (?:a|the) failing test first)\b/i,
    /\bwriting code before (?:a|the|its) failing test\b/i,
    /\b(?:never skip (?:the )?red(?: phase)?|do not write (?:implementation|code) before (?:a|the|its) failing test)\b/i,
    /\b(?:diagnostics,?\s*)?tests?\s*(?:,?\s*and\s*)?build evidence (?:is|are) mandatory\b/i,
    /\b(?:always|must|required to)\s+run\s+(?:the\s+)?(?:full|entire|broad)\s+(?:test\s+)?suite\b/i,
    /\b(?:always|must|required to)\s+run\s+(?:a\s+|the\s+)?(?:full\s+)?build\b/i,
  ];
  const metaOrHistorical = /\b(?:historical|legacy|archaeology|deprecated|stale|superseded|previous|former|earlier|older|reject(?:ed|s)?|forbid(?:den|s)?|anti[- ]pattern|do not require|don't require|never require|must not require|not a mandate|does not require)\b/i;
  const negatedSupabase = /\b(?:do not|don't|never|must not|cannot|can't|prohibited|historical|legacy|archaeology|deprecated|stale|superseded|forbidden|avoid|read-only)\b/i;
  const activeSupabaseMutation = [
    /\b(?:bunx\s+|npx\s+)?supabase\s+(?:db\s+(?:push|reset)|migration\s+(?:up|repair|new)|functions\s+deploy|secrets\s+set)\b/i,
    /\b(?:run|execute|apply|extend|create|edit|write|push|reset|repair|deploy|mutate|modify|update|delete)\b.{0,100}\bsupabase\/migrations\b/i,
    /\bsupabase\b.{0,120}\b(?:mutat(?:e|ion)|database write|schema change|migration|migrate|deploy|push|reset|rpc|sql changes?)\b/i,
  ];
  const commandCodeAgentPrefix = ".commandcode/agents/";
  const commandCodeGuidancePrefix = ".commandcode/";

  for (const file of files) {
    const text = readText(file);
    const normalizedPath = rel(file).replaceAll("\\", "/");
    if (
      (normalizedPath === "AGENTS.md" || normalizedPath === "CLAUDE.md") &&
      (
        text.includes("<!-- gitnexus:start -->") ||
        text.includes("<!-- code-review-graph MCP tools -->") ||
        text.includes("MUST run impact analysis before editing any symbol")
      )
    ) {
      fail(`${normalizedPath} contains a regenerated absolute graph mandate; keep only the proportional graph policy.`);
    }
    if (normalizedPath.startsWith(commandCodeAgentPrefix)) {
      const lineCount = text.split(/\r?\n/).length;
      if (lineCount > 80) {
        fail(`${normalizedPath} is ${lineCount} lines; CommandCode role briefs must stay at or below 80 lines.`);
      }
      if (!text.includes("test_requirement")) {
        fail(`${normalizedPath} must carry the shared test_requirement decision.`);
      }
      for (const required of ["Cloudflare", "D1"]) {
        if (!text.includes(required)) {
          fail(`${normalizedPath} must identify ${required} as current project context.`);
        }
      }
    }

    for (const [index, line] of text.split(/\r?\n/).entries()) {
      if (!line.trim() || metaOrHistorical.test(line)) continue;
      if (blanketMandates.some((pattern) => pattern.test(line))) {
        fail(`${rel(file)}:${index + 1} contains a blanket test/build mandate; verification must use the shared test gate.`);
      }
      if (
        normalizedPath.startsWith(commandCodeGuidancePrefix) &&
        /\b(?:Supabase|Postgres(?:SQL)?|RLS|row[- ]level security)\b/i.test(line)
      ) {
        fail(`${normalizedPath}:${index + 1} contains stale active provider guidance; use Cloudflare D1 and application authorization predicates.`);
      }
      if (!negatedSupabase.test(line) && activeSupabaseMutation.some((pattern) => pattern.test(line))) {
        fail(`${rel(file)}:${index + 1} contains active Supabase mutation guidance; Supabase is historical and read-only.`);
      }
    }
  }
}

function checkActiveGuidanceReferences() {
  const roots = [
    "AGENTS.md",
    ".ai/00_system",
    ".ai/08_prompts",
    ".ai/12_agents",
    ".codex",
    ".opencode",
    "opencode.json",
    "package.json",
  ];
  const files = roots.flatMap((root) => {
    const full = join(repoRoot, root);
    if (!existsSync(full)) return [];
    if (statSync(full).isFile()) return [full];
    return walkFiles(
      full,
      (path) => !isGeneratedOpenCodePath(path) && /\.(json|jsonc|md|mjs|toml)$/.test(path),
    );
  });

  for (const file of files) {
    const text = readText(file);
    if (text.includes(".opencode/opencode.json")) {
      fail(`${rel(file)} references stale .opencode/opencode.json.`);
    }
    if (text.includes("mcpServers")) {
      fail(`${rel(file)} references stale OpenCode mcpServers schema.`);
    }
  }
}

function checkCompoundEngineeringLeanOverrides() {
  const requirements = new Map([
    [".agents/skills/ce-plan/SKILL.md", ["Archestimator lean override", "TEST_PROPOSAL", "test scenarios only for an explicit"]],
    [".agents/skills/ce-work/SKILL.md", ["Archestimator lean override", "Test Authorization", "stay on the current branch/worktree"]],
    [".agents/skills/ce-debug/SKILL.md", ["Archestimator lean override", "TEST_PROPOSAL", "Evidence-first fix"]],
    [".agents/skills/ce-simplify-code/SKILL.md", ["Select a proportionate review path", "Tests are opt-in", "do not auto-run the full suite"]],
    [".agents/skills/ce-code-review/SKILL.md", ["Archestimator lean override", "Reviewer count is a cost", "no persona or CE agent is automatic"]],
    [".agents/skills/ce-test-browser/SKILL.md", ["Archestimator Activation Gate", "explicitly requests browser/E2E/visual proof", "Pipeline membership never grants browser authority"]],
    [".agents/skills/lfg/SKILL.md", ["Archestimator lean override", "does not by itself authorize tests", "explicitly authorized browser/E2E/visual proof"]],
  ]);

  for (const [path, phrases] of requirements) {
    const text = readRepoText(path).replace(/\s+/gu, " ");
    for (const phrase of phrases) {
      if (!text.includes(phrase)) {
        fail(`${path} must preserve the Compound Engineering lean override: missing ${JSON.stringify(phrase)}.`);
      }
    }
  }
}

function checkCursorTestingRuleGates() {
  const rulesRoot = join(repoRoot, ".cursor/rules");
  if (!existsSync(rulesRoot)) return;
  const testingRules = walkFiles(rulesRoot, (path) => path.endsWith("-testing.mdc"));
  for (const file of testingRules) {
    const text = readText(file).replace(/\s+/gu, " ");
    if (!text.includes("explicit current-task user-authorized `TEST_TASK`")) {
      fail(`${rel(file)} must preserve the explicit current-task TEST_TASK activation gate.`);
    }
  }
}

function checkGitignoreAdapterHygiene() {
  if (!repoExists(".gitignore")) {
    fail("Missing .gitignore.");
    return;
  }
  const text = readRepoText(".gitignore");
  for (const required of [
    "/.codex/*.sqlite*",
    "/.codex/cache",
    "/.codex/sessions",
    "!.codex/README.md",
    "!.codex/config.toml",
    "!.codex/hooks.json",
    "!.codex/agents/",
    "!.codex/prompts/",
    "/.opencode/node_modules/",
    "/.opencode/package-lock.json",
  ]) {
    if (!text.includes(required)) {
      fail(`.gitignore must include ${required}.`);
    }
  }
}

function checkNoTrackedLocalState() {
  const localOnlyPathspecs = [
    ".codex/.DS_Store",
    ".codex/*.sqlite*",
    ".codex/cache/**",
    ".codex/logs/**",
    ".codex/sessions/**",
    ".codex/state/**",
    ".codex/tmp/**",
    ".codex/local/**",
    ".codex/*.local.*",
    ".opencode/node_modules/**",
    ".opencode/package.json",
    ".opencode/package-lock.json",
    ".opencode/.package-lock.json",
    ".opencode/.gitignore",
  ];
  const tracked = gitLsFiles(localOnlyPathspecs);
  for (const path of tracked) {
    fail(`Local-only adapter artifact is tracked by Git: ${path}`);
  }
}

parseCliOptions();
checkOpenCodeConfig();
checkCodexConfig();
checkCodexAgentRoles();
checkFastPathContract();
checkCloudflareSourceTruth();
checkCursorRules();
checkCursorHooks();
checkCursorAgents();
checkStaleModelGuidance();
checkTestGateSummaryContract();
checkActiveGuidancePolicyDrift();
checkAgentPayloadContracts();
checkSupermemoryBootstrapContract();
checkActiveGuidanceReferences();
checkCompoundEngineeringLeanOverrides();
checkCursorTestingRuleGates();
checkGitignoreAdapterHygiene();
checkNoTrackedLocalState();

for (const message of warnings) {
  console.warn(`WARN ${message}`);
}

if (failures.length > 0) {
  for (const message of failures) {
    console.error(`FAIL ${message}`);
  }
  process.exit(1);
}

console.log("AI workflow validation passed.");
