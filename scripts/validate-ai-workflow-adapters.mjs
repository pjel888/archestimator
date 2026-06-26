#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const repoRoot = process.cwd();
const failures = [];
const warnings = [];

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
      out.push(...walkFiles(path, predicate));
    } else if (entry.isFile() && predicate(path)) {
      out.push(path);
    }
  }
  return out;
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
    } catch (error) {
      fail(error.message);
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
    "opencode.json",
    "package.json",
  ];
  const files = roots.flatMap((root) => {
    const full = join(repoRoot, root);
    if (!existsSync(full)) return [];
    if (statSync(full).isFile()) return [full];
    return walkFiles(full, (path) => /\.(json|jsonc|md|mjs|toml)$/.test(path));
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

console.log("AI workflow adapter validation passed.");
