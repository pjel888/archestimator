import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const argv = process.argv.slice(2);
const valueOf = (name) => {
  const inline = argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
};
const root = resolve(valueOf("root") ?? process.cwd());
const errors = [];

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

async function collectFiles(directory, suffixes) {
  const files = [];
  let entries = [];
  try {
    entries = await readdir(resolve(root, directory), { withFileTypes: true });
  } catch (error) {
    errors.push(`${directory}: unreadable adapter directory (${error.message})`);
    return files;
  }
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await collectFiles(path, suffixes));
    else if (suffixes.some((suffix) => entry.name.endsWith(suffix))) files.push(path);
  }
  return files;
}

const canonicalFiles = {
  "AGENTS.md": [
    "Beta Quality Gate",
    "Q0_CONTRACT_ONLY",
    "Q1_CHANGE_GATE",
    "Q2_CRITICAL_CHANGE_GATE",
    "Q3_RELEASE_GATE",
    ".ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md",
    "machine-readable `PASS`",
  ],
  ".ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md": [
    "Standing Authorization And Boundaries",
    "Mandatory Risk Profiles",
    "No-Gaming Contract",
    "PASS|FAIL|QUALITY_BLOCKED",
    "MUTATE/ADVERSARIAL",
  ],
  ".ai/00_system/VALIDATION_MATRIX.md": [
    "Q0_CONTRACT_ONLY",
    "Q1_CHANGE_GATE",
    "Q2_CRITICAL_CHANGE_GATE",
    "Q3_RELEASE_GATE",
    "100% critical changed-branch coverage",
    "Unknown paths",
  ],
  ".ai/00_system/AGENT_OPERATING_PROTOCOL.md": [
    "BETA_QUALITY_ENGINEERING_PROTOCOL.md",
    "Q2_CRITICAL_CHANGE_GATE",
    "machine-readable",
  ],
  ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md": [
    "BETA_QUALITY_ENGINEERING_PROTOCOL.md",
    "Q2_CRITICAL_CHANGE_GATE",
    "machine-readable",
  ],
  ".ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md": [
    "BETA_QUALITY_ENGINEERING_PROTOCOL.md",
    "Q0_CONTRACT_ONLY",
    "Handoff Contract",
  ],
  ".ai/10_state/current-state.md": ["FAST PATH:START", "FAST PATH:END", "Beta quality gate"],
};
const canonicalTexts = new Map();
for (const [path, required] of Object.entries(canonicalFiles)) {
  const text = await read(path);
  canonicalTexts.set(path, text);
  requireText(path, text, required);
}

const policyEntrypoints = [
  ".agents/README.md",
  ".ai/12_agents/README.md",
  ".codex/README.md",
  ".commandcode/README.md",
  ".cursor/rules/00-archestimator-project-brain.mdc",
  "CODEX.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".gemini/GEMINI.md",
  ".cursorrules",
];
const activePolicyDirectories = [
  ".agents",
  ".ai/00_system",
  ".ai/08_prompts/000_Planning Prompts",
  ".ai/08_prompts/templates",
  ".ai/11_skills",
  ".ai/12_agents",
  ".codex/agents",
  ".codex/prompts",
  ".commandcode",
  ".cursor/commands",
  ".cursor/rules",
];
const activePolicyFiles = [];
for (const directory of activePolicyDirectories) {
  activePolicyFiles.push(...await collectFiles(directory, [".md", ".mdc", ".toml"]));
}
activePolicyFiles.push(...policyEntrypoints);

const legacyPatterns = [
  [/\bNOT_REQUIRED\b/gu, "legacy NOT_REQUIRED taxonomy"],
  [/\bTEST_PROPOSAL\b/gu, "legacy TEST_PROPOSAL taxonomy"],
  [/\bTEST_TASK\b/gu, "legacy TEST_TASK taxonomy"],
  [/\bTARGETED\b/gu, "legacy TARGETED taxonomy"],
  [/\bBROADER\b/gu, "legacy BROADER taxonomy"],
  [/User Test Authorization Gate/giu, "legacy user test gate"],
  [/tests? (?:are|is) user-controlled/giu, "legacy user-controlled testing"],
  [/do not (?:create|run|repair|expand)[^\n]{0,80}tests? unless/giu, "blanket test prohibition"],
  [
    /(?:tests?|builds?|browser automation|screenshots?|visual QA)[^\n]{0,100}(?:only|require)[^\n]{0,50}(?:explicit user|user explicitly)/giu,
    "legacy explicit-user test authorization",
  ],
  [
    /(?:do not|never|may not) (?:create or )?(?:run|execute)[^\n]{0,100}(?:tests?|builds?|browser automation|screenshots?|visual QA)[^\n]{0,80}(?:unless|without) (?:the )?user/giu,
    "legacy user-gated local evidence",
  ],
  [/alpha\/pre-beta/giu, "legacy alpha/pre-beta posture"],
];
const pointer = ".ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md";
const details = [];
for (const path of [...new Set(activePolicyFiles)].sort()) {
  const text = await read(path);
  const findings = [];
  for (const [pattern, label] of legacyPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`contains ${label}`);
  }
  findings.forEach((finding) => errors.push(`${path}: ${finding}`));
  details.push({ path, status: findings.length === 0 ? "PASS" : "FAIL", findings });
}

for (const path of policyEntrypoints) {
  const text = await read(path);
  if (!text.includes(pointer)) errors.push(`${path}: missing canonical pointer ${pointer}`);
  for (const profile of [
    "Q0_CONTRACT_ONLY",
    "Q1_CHANGE_GATE",
    "Q2_CRITICAL_CHANGE_GATE",
    "Q3_RELEASE_GATE",
  ]) {
    if (!text.includes(profile)) errors.push(`${path}: missing canonical profile ${profile}`);
  }
}

const rootWords = canonicalTexts.get("AGENTS.md").trim().split(/\s+/u).filter(Boolean).length;
if (rootWords > 3000) errors.push(`AGENTS.md: instruction budget exceeded (${rootWords}/3000)`);
const canonicalWords = [...canonicalTexts.entries()]
  .filter(([path]) => path !== ".ai/10_state/current-state.md")
  .map(([, text]) => text)
  .join("\n")
  .trim()
  .split(/\s+/u)
  .length;
if (canonicalWords > 14000) {
  errors.push(`canonical contract budget exceeded (${canonicalWords}/14000)`);
}

const report = {
  schema_version: 1,
  kind: "ai-workflow-adapter-validation",
  status: errors.length === 0 ? "PASS" : "FAIL",
  generated_at: new Date().toISOString(),
  summary:
    errors.length === 0
      ? `Adapter validation PASS for ${details.length} active adapter(s)`
      : `Adapter validation FAIL with ${errors.length} finding(s)`,
  findings: errors.map((message) => ({ code: "ADAPTER_CONTRACT", message })),
  data: {
    active_adapters: details,
    root_words: rootWords,
    canonical_words: canonicalWords,
    historical_archives_scanned: false,
  },
};
const output = resolve(root, valueOf("output") ?? "artifacts/quality/adapter-validation.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report)}\n${report.summary}\n`);
for (const error of errors) process.stderr.write(`FAIL ${error}\n`);
if (errors.length > 0) process.exit(1);
