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

function rel(path) {
  return relative(repoRoot, path) || ".";
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
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
  const resolvedOutput = runOpenCodeResolver();
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
}

function checkCodexAgentRoles() {
  const dir = join(repoRoot, ".codex/agents");
  for (const file of walkFiles(dir, (path) => path.endsWith(".toml"))) {
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
      if (data.model === "gpt-5.5") {
        fail(`${rel(file)} uses stale frontier model gpt-5.5; use gpt-5.6 or the role's existing specialist/fast-lane model.`);
      }
      const resolvedModel = data.developer_instructions?.match(/^- resolved_model:\s*(\S+)\s*$/m)?.[1];
      if (resolvedModel && resolvedModel !== data.model) {
        fail(`${rel(file)} resolved_model ${resolvedModel} does not match top-level model ${data.model}.`);
      }
    } catch (error) {
      fail(error.message);
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
    ".claude/README.md",
    ".codex/README.md",
    ".commandcode/README.md",
    ".ai/00_system/AGENT_OPERATING_PROTOCOL.md",
    ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md",
    ".ai/00_system/VALIDATION_MATRIX.md",
    ".ai/08_prompts/000_Planning Prompts",
    ".ai/08_prompts/templates/codebase-ai-loop-task.md",
    ".ai/12_agents",
    ".codex/agents",
    ".codex/prompts",
    ".commandcode/agents",
    ".commandcode/taste",
    ".cursor/rules/02-validation-and-evidence.mdc",
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

checkOpenCodeConfig();
checkCodexConfig();
checkCodexAgentRoles();
checkActiveGuidancePolicyDrift();
checkAgentPayloadContracts();
checkSupermemoryBootstrapContract();
checkActiveGuidanceReferences();
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
