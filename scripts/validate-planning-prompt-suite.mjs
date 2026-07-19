import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { canonicalManifestBytes, validatePlanPack } from "./lib/plan-pack-validator.mjs";

const root = process.cwd();
const promptRoot = process.env.PLANNING_PROMPT_SUITE_ROOT
  ? resolve(process.env.PLANNING_PROMPT_SUITE_ROOT)
  : resolve(root, ".ai/08_prompts/000_Planning Prompts");
const files = [
  "README.md",
  "Frontier-Planning-Kernel.md",
  "Frontier-Applicability-Gates.md",
  "Plan-Pack-Schema.md",
  "Prompt-Evaluation-Suite.md",
  "Creating-Plan-Prompt.md",
  "Improve-Plan-Prompt.md",
  "Create-Implementation-Prompt.md",
  "Executing-Plan-Prompt.md",
  "Multi-Agent-Execution-Directive.md",
];
const errors = [];
const contents = new Map();

for (const file of files) {
  try {
    const text = await readFile(resolve(promptRoot, file), "utf8");
    contents.set(file, text);
    if (!text.endsWith("\n") || text.endsWith("\n\n")) {
      errors.push(`${file}: must end with exactly one newline`);
    }
  } catch (error) {
    errors.push(`${file}: missing or unreadable (${error.message})`);
  }
}

function requireText(file, values) {
  const text = contents.get(file) ?? "";
  for (const value of values) {
    if (!text.includes(value)) errors.push(`${file}: missing ${JSON.stringify(value)}`);
  }
}

function requireSections(file, sections) {
  const text = contents.get(file) ?? "";
  for (const section of sections) {
    const escaped = [...section]
      .map((character) => "\\^$.*+?()[]{}|".includes(character) ? "\\" + character : character)
      .join("");
    const pattern = new RegExp("^##\\s+(?:\\d+\\.\\s+)?" + escaped + "(?:\\s|$)", "imu");
    if (!pattern.test(text)) errors.push(`${file}: missing required section ${JSON.stringify(section)}`);
  }
}

requireText("README.md", [
  "Use this suite only",
  "Direct or Brief",
  "Multi-Agent-Execution-Directive.md",
  "canonical lifecycle and handoff contract",
  "validate:planning-prompts",
]);
requireSections("README.md", ["Authority And Load Order", "Progressive Load Router", "Validation"]);

requireText("Frontier-Planning-Kernel.md", [
  "Outcome-First Task Contract",
  "frontier judgment",
  "balanced/read-heavy capability",
  "fast/repeatable capability",
  "TECH_BLOCKED",
  "AUTH_BLOCKED",
  "TEST_PROPOSAL",
  "TEST_TASK",
  "Completion Contract",
]);
requireSections("Frontier-Planning-Kernel.md", [
  "Authority",
  "Outcome-First Task Contract",
  "Capability And Model Policy",
  "Failure, Retry, And Status",
  "Completion Contract",
]);

requireText("Frontier-Applicability-Gates.md", [
  "GATE-UX-01",
  "GATE-NEXT-01",
  "GATE-CONTRACT-01",
  "GATE-DATA-01",
  "GATE-SEC-01",
  "GATE-VERIFY-01",
  "GATE-PERF-01",
  "GATE-OPS-01",
  "GATE-AGENT-01",
  "GATE-CLEAN-01",
  "portable single-agent fallback",
  "circular delegation",
]);

requireText("Plan-Pack-Schema.md", [
  "plan-pack.json",
  "REQ-*",
  "UNIT-*",
  "EVID-*",
  "No orphan IDs",
  "acyclic",
  "NOT_REQUIRED",
  "TEST_PROPOSAL",
  "TEST_TASK",
]);

const stageContracts = {
  "Creating-Plan-Prompt.md": ["Objective", "Method", "Completion"],
  "Improve-Plan-Prompt.md": ["Objective", "Method", "Completion"],
  "Create-Implementation-Prompt.md": ["Objective", "Method", "Ready Means"],
  "Executing-Plan-Prompt.md": ["Objective", "Method", "Execution Rules", "Final Report"],
};
for (const [file, sections] of Object.entries(stageContracts)) {
  requireText(file, ["Frontier-Planning-Kernel.md", "Plan-Pack-Schema.md", "Multi-Agent-Execution-Directive.md"]);
  requireSections(file, ["Load", ...sections]);
}

requireText("Creating-Plan-Prompt.md", ["smallest executable pack", "plan-pack.json"]);
requireText("Improve-Plan-Prompt.md", ["smaller, clearer", "Remove stale paths"]);
requireText("Create-Implementation-Prompt.md", ["planning-only", "IMPLEMENTATION_PLAN.md"]);
requireText("Executing-Plan-Prompt.md", [
  "Continue while safe implementable work remains",
  "explicit current-task user authorization",
  "structured handoffs",
]);

requireText("Multi-Agent-Execution-Directive.md", [
  "canonical orchestration contract",
  "Task Contract",
  "Native subagents",
  "Parallel threads or team panes",
  "Emulated specialist passes",
  "Single-agent fallback",
  "Subagent Assignment Contract",
  "timeout behavior",
  "Handoff Contract",
  "Completion Contract",
  "Independent Review",
  "Failure, Retry, And Recovery Contract",
  "exact validation commands",
  "agent_type",
  "Never allow concurrent writes to the same file",
  "actual artifacts",
]);
requireSections("Multi-Agent-Execution-Directive.md", [
  "Canonical Scope",
  "Task Contract",
  "Selection And Portability",
  "Subagent Assignment Contract",
  "Ownership And Synchronization",
  "Handoff Contract",
  "Completion Contract",
  "Independent Review",
  "Failure, Retry, And Recovery Contract",
  "Capability And Model Fallback",
]);

requireText("Prompt-Evaluation-Suite.md", ["Ten Simulations", "Hard Fails", "PASS|FAIL"]);
const evaluationText = contents.get("Prompt-Evaluation-Suite.md") ?? "";
const simulationNames = [
  "Direct one-file fix",
  "Brief multi-file feature",
  "Bug investigation",
  "Planning-only request",
  "Parallel research",
  "Concurrent agents could edit the same file",
  "Failed test retry and escalation",
  "Non-Codex environment without native subagents",
  "Git generation in a mixed worktree",
  "Missing access or external write",
];
for (const [index, name] of simulationNames.entries()) {
  const heading = `${index + 1}. **${name}:**`;
  if (!evaluationText.includes(heading)) {
    errors.push(`Prompt-Evaluation-Suite.md: missing exact simulation ${JSON.stringify(heading)}`);
  }
}
const simulationCount = [...evaluationText.matchAll(/^\d+\. \*\*/gmu)].length;
if (simulationCount !== 10) {
  errors.push(`Prompt-Evaluation-Suite.md: expected exactly 10 simulations, found ${simulationCount}`);
}

const combined = [...contents.values()].join("\n");
const wordCount = combined.trim().split(/\s+/u).length;
const lineCount = combined.split("\n").length - 1;
if (wordCount > 7000) errors.push(`suite word budget exceeded: ${wordCount} (max 7000)`);
if (lineCount > 1400) errors.push(`suite line budget exceeded: ${lineCount} (max 1400)`);

const forbidden = [
  [/owner acceptance is required/iu, "owner approval gate"],
  [/at least three trials/iu, "mandatory model trial ritual"],
  [/\.ai\/99_scratch\/leases/iu, "mandatory lease registry"],
  [/LOOP_LEDGER\.md/iu, "mandatory legacy ledger"],
  [/DISCOVER\s*(?:→|->)\s*PLAN\s*(?:→|->)\s*EXECUTE/iu, "obsolete six-stage loop"],
  [/always run (?:all )?tests/iu, "automatic testing"],
  [/gpt-5\.6-(?:sol-)?(?:ultra|pro)\b/iu, "fabricated model identifier"],
];
for (const [pattern, label] of forbidden) {
  if (pattern.test(combined)) errors.push(`suite contains forbidden ${label}`);
}

if (!process.env.PLANNING_PROMPT_SUITE_ROOT) {
  const legacyFixture = resolve(root, "tests/fixtures/planning-prompt-suite/valid-plan-pack");
  const legacyResult = await validatePlanPack(legacyFixture);
  if (!legacyResult.ok) {
    errors.push(`legacy semantic fixture failed: ${legacyResult.errors.join("; ")}`);
  }

  const tempRoot = await mkdtemp(join(tmpdir(), "archestimator-plan-pack-v12-"));
  try {
    const currentFixture = join(tempRoot, "valid-plan-pack");
    await cp(legacyFixture, currentFixture, { recursive: true });
    const manifestPath = join(currentFixture, "plan-pack.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.suite_version = "2026-07-12";
    manifest.criteria = manifest.criteria.map((criterion) => ({
      ...criterion,
      test_requirement: "TEST_PROPOSAL",
      test_trigger: "MVP_CRITICAL_INVARIANT",
      test_rationale: "A critical workflow invariant would benefit from a test because cheaper non-test evidence is insufficient; this remains proposal-only.",
      test_ids: [],
    }));
    manifest.manifest_sha256 = createHash("sha256").update(canonicalManifestBytes(manifest)).digest("hex");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    const currentResult = await validatePlanPack(currentFixture);
    if (!currentResult.ok) {
      errors.push(`2026-07-12 semantic fixture failed: ${currentResult.errors.join("; ")}`);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

if (errors.length) {
  console.error(`planning prompt suite validation failed (${errors.length} issues):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`planning prompt suite validation passed (${files.length} documents, ${wordCount} words, ${lineCount} lines, orchestration contracts and ten simulation definitions valid)`);
