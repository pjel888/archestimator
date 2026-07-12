import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { canonicalManifestBytes, validatePlanPack } from "./lib/plan-pack-validator.mjs";

const root = process.cwd();
const promptRoot = resolve(root, ".ai/08_prompts/000_Planning Prompts");
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

requireText("README.md", [
  "Use this suite only",
  "Direct or Brief",
  "Frontier-Planning-Kernel.md",
  "Plan-Pack-Schema.md",
  "validate:planning-prompts",
]);
requireText("Frontier-Planning-Kernel.md", [
  "alpha/pre-beta",
  "TECH_BLOCKED",
  "AUTH_BLOCKED",
  "TEST_PROPOSAL",
  "TEST_TASK",
  "fewest materially useful capabilities",
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
  "actual external operations/release claims",
]);
requireText("Plan-Pack-Schema.md", [
  "plan-pack.json",
  "REQ-*",
  "UNIT-*",
  "No orphan IDs",
  "acyclic",
  "NOT_REQUIRED",
  "TEST_PROPOSAL",
  "TEST_TASK",
]);
requireText("Prompt-Evaluation-Suite.md", [
  "Clear one-file fix chooses Direct lane",
  "Multi-file bounded feature chooses Brief lane",
  "Destructive data migration uses a minimal Plan Pack",
  "Alpha/pre-beta",
  "Hard Fails",
]);

for (const file of [
  "Creating-Plan-Prompt.md",
  "Improve-Plan-Prompt.md",
  "Create-Implementation-Prompt.md",
  "Executing-Plan-Prompt.md",
  "Multi-Agent-Execution-Directive.md",
]) {
  requireText(file, ["Frontier-Planning-Kernel.md", "Plan-Pack-Schema.md"]);
  const text = contents.get(file) ?? "";
  if (!text.includes("Frontier-Applicability-Gates.md") && !text.includes("applicable gates")) {
    errors.push(`${file}: missing applicability-gate reference`);
  }
}

requireText("Creating-Plan-Prompt.md", ["smallest executable pack", "plan-pack.json"]);
requireText("Improve-Plan-Prompt.md", ["smaller, clearer", "Remove stale paths"]);
requireText("Create-Implementation-Prompt.md", ["planning-only", "IMPLEMENTATION_PLAN.md"]);
requireText("Executing-Plan-Prompt.md", ["Continue while safe implementable work remains", "explicit current-task user authorization"]);
requireText("Multi-Agent-Execution-Directive.md", ["fewest agents", "agent_type", "actual artifacts"]);

const combined = [...contents.values()].join("\n");
const wordCount = combined.trim().split(/\s+/u).length;
const lineCount = combined.split("\n").length - 1;
if (wordCount > 6000) errors.push(`suite word budget exceeded: ${wordCount} (max 6000)`);
if (lineCount > 1200) errors.push(`suite line budget exceeded: ${lineCount} (max 1200)`);

const forbidden = [
  [/owner acceptance is required/iu, "owner approval gate"],
  [/at least three trials/iu, "mandatory model trial ritual"],
  [/\.ai\/99_scratch\/leases/iu, "mandatory lease registry"],
  [/score threshold/iu, "numeric readiness threshold"],
  [/always run (?:all )?tests/iu, "automatic testing"],
  [/protect production/iu, "production paralysis"],
];
for (const [pattern, label] of forbidden) {
  if (pattern.test(combined)) errors.push(`suite contains forbidden ${label}`);
}

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

if (errors.length) {
  console.error(`planning prompt suite validation failed (${errors.length} issues):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`planning prompt suite validation passed (${files.length} documents, ${wordCount} words, ${lineCount} lines, legacy and 2026-07-12 semantic fixtures valid)`);
