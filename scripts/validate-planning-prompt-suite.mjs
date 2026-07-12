import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  canonicalManifestBytes,
  validatePlanPack,
} from "./lib/plan-pack-validator.mjs";

const root = process.cwd();
const promptRoot = resolve(
  process.env.PLANNING_PROMPT_SUITE_ROOT ??
    resolve(root, ".ai/08_prompts/000_Planning Prompts"),
);

const sharedFiles = [
  "README.md",
  "Frontier-Planning-Kernel.md",
  "Frontier-Applicability-Gates.md",
  "Plan-Pack-Schema.md",
  "Prompt-Evaluation-Suite.md",
];
const stageFiles = [
  "Creating-Plan-Prompt.md",
  "Improve-Plan-Prompt.md",
  "Create-Implementation-Prompt.md",
  "Executing-Plan-Prompt.md",
  "Multi-Agent-Execution-Directive.md",
];
const suiteFiles = [...sharedFiles, ...stageFiles];
const errors = [];
const contents = new Map();

for (const file of suiteFiles) {
  try {
    const content = await readFile(resolve(promptRoot, file), "utf8");
    contents.set(file, content);
    if (!content.endsWith("\n") || content.endsWith("\n\n")) {
      errors.push(`${file}: must end with exactly one newline`);
    }
  } catch (error) {
    errors.push(`${file}: missing or unreadable (${error.message})`);
  }
}

function requireText(file, needles) {
  const content = contents.get(file) ?? "";
  for (const [label, needle] of needles) {
    if (!content.includes(needle)) {
      errors.push(`${file}: missing ${label} (${JSON.stringify(needle)})`);
    }
  }
}

function requireHeadings(file, headings) {
  const content = contents.get(file) ?? "";
  const found = new Set(
    [...content.matchAll(/^#{1,3} (.+)$/gmu)].map((match) => match[1]),
  );
  for (const heading of headings) {
    if (!found.has(heading)) {
      errors.push(`${file}: missing required section ${JSON.stringify(heading)}`);
    }
  }
}

const requiredSections = {
  "README.md": ["Canonical Files", "Validation", "Progressive Disclosure", "Research Basis"],
  "Frontier-Planning-Kernel.md": [
    "1. Precedence And Input Isolation",
    "2. Outcome Contract",
    "3. Execution Scope And Status",
    "4. Owner-Independent Autonomy",
    "5. Autonomous Decision Protocol",
    "6. Capability Router",
    "7. Context Engineering",
    "8. Orchestration And Integration",
    "9. Bounded Evidence Loop",
    "10. Hard-Gate Isolation",
    "11. Evidence-First Readiness",
    "12. Completion Contract",
  ],
  "Frontier-Applicability-Gates.md": [
    "GATE-UX-01: User-Facing UI, UX, And Accessibility",
    "GATE-NEXT-01: React 19 And Next.js 16",
    "GATE-CONTRACT-01: TypeScript, API, Network, And Dependency Contracts",
    "GATE-DATA-01: Data, D1, R2, Durable Objects, Queues, Cron, Email, And Images",
    "GATE-SEC-01: Auth, Public Links, Invitations, Sessions, And Secrets",
    "GATE-VERIFY-01: Evidence, Critical Tests, And Failure Semantics",
    "GATE-PERF-01: Performance, Scalability, And Reliability",
    "GATE-OPS-01: Observability, Release, And Operations",
    "GATE-AGENT-01: Agent Framework, Prompt, Skill, Or Orchestration Work",
    "GATE-CLEAN-01: Cleanup, Refactor, Deletion, Or Migration",
  ],
  "Plan-Pack-Schema.md": [
    "1. Depth Profile",
    "2. Canonical Manifest",
    "3. Stable IDs",
    "4. Logical Artifact Manifest",
    "5. Decision Resolution Record",
    "6. Authorization Boundary Record",
    "7. Execution Unit Packet",
    "8. Readiness Matrix",
    "9. Handoff And Resume",
  ],
  "Prompt-Evaluation-Suite.md": [
    "Evaluation Protocol",
    "Core Scenarios",
    "Grading Rubric",
    "Hard Fails",
    "Evaluation Report",
  ],
  "Creating-Plan-Prompt.md": [
    "Load First",
    "Role And Objective",
    "Success Contract",
    "Phase 1: Intake And Goal",
    "Phase 2: Context And Source Manifest",
    "Phase 3: Capability And Workstream Routing",
    "Phase 4: Requirements And Decision Closure",
    "Phase 5: Target Design And Implementation DAG",
    "Phase 6: Write The Minimal Coherent Pack",
    "Phase 7: Critique, Repair, And Final Verification",
    "Completion",
  ],
  "Improve-Plan-Prompt.md": [
    "Load First",
    "Role And Boundary",
    "Success Contract",
    "Phase 1: Snapshot And Inventory",
    "Phase 2: Baseline Audit",
    "Phase 3: Repair Order",
    "Phase 4: Capability And Research Pass",
    "Phase 5: Adversarial Review",
    "Phase 6: Fresh Final Verification",
    "Completion And Report",
  ],
  "Create-Implementation-Prompt.md": [
    "Load First",
    "Role And Boundary",
    "Artifact Authority",
    "Phase 1: Manifest And Revalidation",
    "Phase 2: Lossless Traceability Audit",
    "Phase 3: Close Decisions And Boundaries",
    "Phase 4: Build The Execution DAG",
    "Phase 5: Write And Promote `IMPLEMENTATION_PLAN.md`",
    "Phase 6: Adversarial Compile Review",
    "Final Readiness Gate",
  ],
  "Executing-Plan-Prompt.md": [
    "Load First",
    "Execution Invocation Authority",
    "Role And Success Contract",
    "Phase 1: Restore Or Establish Durable State",
    "Phase 2: Revalidate And Repair The Plan",
    "Phase 3: Build The Live Task Graph And Leases",
    "Phase 4: Execute Each Unit",
    "Phase 5: Integrate By Dependency Layer",
    "Phase 6: System Verification And Adversarial QA",
    "Phase 7: Independent Review And Final Completion Audit",
    "Phase 8: State And Archive Closeout",
    "Stop Condition And Final Report",
  ],
  "Multi-Agent-Execution-Directive.md": [
    "Load First",
    "Role And Objective",
    "1. Classify And Contract The Task",
    "2. Choose The Topology From Dependency Shape",
    "3. Parallel-Safety Gate",
    "4. Worker Packet",
    "5. Lead-Owned Ledger And Leases",
    "6. Structured Return And Integration",
    "7. Autonomous Recovery",
    "8. Maker/Checker And QA",
    "9. Completion Audit",
  ],
};

for (const [file, headings] of Object.entries(requiredSections)) {
  requireHeadings(file, headings);
}

for (const file of sharedFiles.slice(1)) {
  requireText(file, [["suite version marker", "FRONTIER-PLAN-SUITE: 2026-07-11"]]);
}

for (const file of stageFiles) {
  const content = contents.get(file) ?? "";
  const kernel = content.indexOf("Frontier-Planning-Kernel.md");
  const gates = content.indexOf("Frontier-Applicability-Gates.md");
  const schema = content.indexOf("Plan-Pack-Schema.md");
  if (kernel < 0 || gates < 0 || schema < 0) {
    errors.push(`${file}: must reference kernel, applicability gates, and schema`);
  } else if (!(kernel < gates && gates < schema)) {
    errors.push(`${file}: shared references must follow kernel -> gates -> schema order`);
  }
}

requireText("README.md", [
  ["load recipe", "Load shared instructions in this order"],
  ["plan-pack validator", "required manifest"],
  ["progressive disclosure", "## Progressive Disclosure"],
  ["evaluation contract", "Prompt-Evaluation-Suite.md"],
]);

{
  const readme = contents.get("README.md") ?? "";
  const kernel = readme.indexOf("Frontier-Planning-Kernel.md");
  const gates = readme.indexOf("Frontier-Applicability-Gates.md");
  const stage = readme.indexOf("One active stage prompt");
  const schema = readme.indexOf("Plan-Pack-Schema.md");
  if (!(kernel >= 0 && kernel < gates && gates < stage && stage < schema)) {
    errors.push("README.md: canonical load recipe must be kernel -> gates -> stage -> schema");
  }
}

requireText("Frontier-Planning-Kernel.md", [
  ["lean engineering invariant", "Lean Engineering Invariant"],
  ["resource-cost discipline", "Tokens, elapsed time, tool calls"],
  ["bounded non-hypothetical scope", "not hypothetical systems"],
  ["dimensional outcome authority", "Outcome authority"],
  ["current implementation reality", "Implementation reality"],
  ["runtime action scope", "current_run_scope"],
  ["autonomous decisions", "DEC-AUTO-*"],
  ["authorization isolation", "AUTH-*"],
  ["technical terminal", "TECH_BLOCKED"],
  ["core-only technical terminal", "core requested deliverable"],
  ["auxiliary anti-abuse", "cannot be reclassified to manufacture completion"],
  ["status separation", "terminal_status"],
  ["evidence invalidation", "evidence fingerprint"],
  ["atomic shared lease registry", ".ai/99_scratch/leases/"],
  ["same-agent provenance", "same-agent-separated"],
  ["stage-relative completion", "Stage completion requires"],
  ["core-relative completion", "every core requirement is complete"],
  ["conditional test field", "test_requirement"],
  ["default no-test decision", "NOT_REQUIRED"],
]);

requireText("Plan-Pack-Schema.md", [
  ["lean schema invariant", "Lean Schema Invariant"],
  ["explicit test-task authority", "Only `TEST_TASK` plus"],
  ["proposal-only legacy triggers", "do **not** authorize execution"],
  ["canonical manifest", "plan-pack.json"],
  ["canonical hash algorithm", "recursively"],
  ["structured dependency edges", '"depends_on"'],
  ["structured evidence index", '"evidence_index"'],
  ["structured source index", '"sources"'],
  ["structured criteria index", '"criteria"'],
  ["structured tests index", '"tests"'],
  ["structured gates index", '"gates"'],
  ["package action ceiling", "package_action_ceiling"],
  ["independent state machines", "Use independent state machines"],
  ["terminal states", "AUTH_BLOCKED|TECH_BLOCKED"],
  ["completion role", "completion_role"],
  ["auxiliary non-blocking", "auxiliary-only failures"],
  ["mixed-link core precedence", "mixed core/aux links"],
  ["conditional test decisions", "`NOT_REQUIRED`, `TARGETED`, `BROADER`, or `TEST_TASK`"],
  ["test trigger decisions", "`NONE`, `EXPLICIT_TEST_TASK`, `MVP_CRITICAL_INVARIANT`, or `CHEAPEST_DECISIVE_EXISTING_TEST`"],
  ["test decision rationale", "`test_rationale`"],
  ["testless criteria", "`NOT_REQUIRED` is the default and requires `test_trigger: NONE` plus `test_ids: []`"],
]);

requireText("Creating-Plan-Prompt.md", [
  ["lean create-stage rule", "Lean Create-Stage Rule"],
  ["explicit user test authority", "explicit user testing request"],
  ["planning-only boundary", "This stage is planning-only"],
  ["normalized profiles", "`focused`, `standard`, or `high-blast-radius`"],
  ["manifest creation", "Create `plan-pack.json`"],
  ["read-only final checker", "final checking pass is read-only"],
  ["test decision classification", "Classify each criterion's `test_requirement`"],
  ["requirement completion role", "completion_role: CORE|AUXILIARY"],
  ["auxiliary planning gaps", "auxiliary gaps remain visible and non-blocking"],
  ["explicit-deliverable core rule", "Explicit user/system deliverables"],
]);

requireText("Improve-Plan-Prompt.md", [
  ["lean improve-stage rule", "Lean Improve-Stage Rule"],
  ["explicit user test authority", "explicit user-authorized testing scope"],
  ["planning-only boundary", "This stage is planning-only"],
  ["semantic inventory", "semantic diff"],
  ["stale evidence invalidation", "invalidate stale review evidence"],
  ["non-editing final verifier", "final verifier does not edit"],
  ["ceremonial-test removal", "Delete ceremonial test requirements"],
  ["auxiliary completion audit", "completion_role: CORE|AUXILIARY"],
  ["core source readiness", "accepted core requirement references at least one `CURRENT` source"],
]);

requireText("README.md", [
  ["lean engineering contract", "Lean Engineering Contract"],
  ["bounded non-hypothetical scope", "do not invent hypothetical systems"],
  ["resource-cost discipline", "Treat tokens, elapsed time, tool calls"],
  ["explicit user test authority", "only an explicit current-task testing request"],
]);

requireText("Create-Implementation-Prompt.md", [
  ["lean compile-stage rule", "Lean Compile-Stage Rule"],
  ["explicit user test authority", "requires an explicit user request"],
]);

requireText("Executing-Plan-Prompt.md", [
  ["lean execution rule", "Lean Execution Rule"],
  ["resource-cost discipline", "Treat tokens"],
  ["explicit user test authority", "the user has explicitly authorized testing for this task"],
]);

requireText("Frontier-Applicability-Gates.md", [
  ["lean applicability rule", "Lean Applicability Rule"],
  ["explicit user test authority", "user has explicitly requested testing"],
]);

requireText("Multi-Agent-Execution-Directive.md", [
  ["lean topology rule", "Lean Topology Rule"],
  ["resource-cost discipline", "Tokens, context, tool calls"],
  ["explicit user test authority", "only when explicitly requested by the user"],
]);

requireText("Prompt-Evaluation-Suite.md", [
  ["lean evaluation invariant", "Lean Evaluation Invariant"],
  ["overengineering pressure eval", "EVAL-35 - Overengineering And Overtesting Pressure"],
  ["explicit user test authority", "without an explicit current-task user testing request"],
]);

requireText("Create-Implementation-Prompt.md", [
  ["planning-only boundary", "This stage is planning-only"],
  ["manifest promotion", "promoted through `plan-pack.json`"],
  ["candidate isolation", "unpromoted candidate"],
  ["concurrent promotion guard", "changed concurrently"],
  ["read-only final checker", "profile-selected read-only final check"],
  ["default no-test compile", "Default `test_requirement` to `NOT_REQUIRED`"],
  ["implementation completion role", "completion_role: CORE|AUXILIARY"],
  ["auxiliary readiness gaps", "auxiliary failures"],
]);

requireText("Executing-Plan-Prompt.md", [
  ["runtime action scope", "current_run_scope"],
  ["incompatible goal fallback", "task-local lead-owned ledger"],
  ["manifest validation", "Validate `plan-pack.json`"],
  ["plan repair", "Revalidate And Repair The Plan"],
  ["cross-process leases", "atomic lease protocol"],
  ["tactic exhaustion", "mark that tactic exhausted"],
  ["read-only verifier", "final verifier is read-only"],
  ["authorization terminal", "terminal_status: ACHIEVED"],
  ["technical terminal", "TECH_BLOCKED"],
  ["core-only technical blocker", "core requested deliverable"],
  ["post-move proof", "post-move state"],
  ["no-test execution", "Run no tests for `NOT_REQUIRED`"],
]);

requireText("Multi-Agent-Execution-Directive.md", [
  ["dependency router", "dependency DAG"],
  ["native agent role", "agent_type"],
  ["incompatible goal fallback", "task-local lead-owned ledger"],
  ["cross-process leases", "atomic lease protocol"],
  ["actual artifact integration", "actual worktree/provider state"],
  ["tactic exhaustion", "mark it exhausted"],
  ["read-only verifier", "final verifier is read-only"],
  ["post-move proof", "After the move"],
  ["worker test decision", "`test_requirement`"],
  ["worker completion role", "completion_role: CORE|AUXILIARY"],
]);

const gates = contents.get("Frontier-Applicability-Gates.md") ?? "";
const gateIds = [...gates.matchAll(/^## (GATE-[A-Z]+-\d+):/gmu)].map((match) => match[1]);
if (new Set(gateIds).size < 10) {
  errors.push(`Frontier-Applicability-Gates.md: expected at least 10 stable gate IDs, found ${new Set(gateIds).size}`);
}

const evals = contents.get("Prompt-Evaluation-Suite.md") ?? "";
const evalMatches = [...evals.matchAll(/^### EVAL-(\d{2}) - /gmu)];
const evalNumbers = evalMatches.map((match) => Number(match[1]));
if (evalNumbers.length < 33) {
  errors.push(`Prompt-Evaluation-Suite.md: expected at least 33 scenarios, found ${evalNumbers.length}`);
}
for (let index = 0; index < evalNumbers.length; index += 1) {
  if (evalNumbers[index] !== index + 1) {
    errors.push(`Prompt-Evaluation-Suite.md: scenario sequence breaks at position ${index + 1}`);
    break;
  }
  const start = evalMatches[index].index;
  const end = evalMatches[index + 1]?.index ?? evals.indexOf("## Grading Rubric");
  const scenario = evals.slice(start, end);
  const expectedIndex = scenario.indexOf("Expected:");
  if (expectedIndex < 40) {
    errors.push(`Prompt-Evaluation-Suite.md: EVAL-${String(index + 1).padStart(2, "0")} lacks a substantive input before Expected behavior`);
  }
  if (expectedIndex < 0) {
    errors.push(`Prompt-Evaluation-Suite.md: EVAL-${String(index + 1).padStart(2, "0")} lacks Expected behavior`);
  }
}
requireText("Prompt-Evaluation-Suite.md", [
  ["multiple trials", "at least three trials"],
  ["transcript retention", "retain transcripts"],
  ["model and cost reporting", "token/context cost"],
  ["assertion-level pass", "every scenario assertion and every applicable dimension"],
  ["diagnostic score only", "total is diagnostic only"],
  ["routine no-test scenario", "EVAL-32 - Routine Source Change Beside Existing Tests"],
  ["explicit testing scenario", "EVAL-33 - Explicit Testing Task"],
  ["unnecessary test-call metric", "unnecessary tool/test calls"],
]);

const rubricRows = [
  ...evals.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gmu),
].filter((match) => match[1].trim() !== "Dimension" && !/^-+$/u.test(match[1].trim()));
if (rubricRows.length !== 20) {
  errors.push(`Prompt-Evaluation-Suite.md: expected 20 rubric dimensions, found ${rubricRows.length}`);
}

const combinedLineCount = [...contents.values()].reduce(
  (total, content) => total + content.split("\n").length - 1,
  0,
);
if (combinedLineCount > 3000) {
  errors.push(`suite context budget exceeded: ${combinedLineCount} lines (max 3000)`);
}

const forbiddenPatterns = [
  [/FRONTIER PLANNING SUITE CONTRACT/gu, "duplicated legacy universal contract"],
  [/OWNER-INDEPENDENT AUTONOMY/gu, "duplicated legacy owner-autonomy block"],
  [/caps? (?:overall )?readiness at (?:94|97)/giu, "reviewer-identity score cap"],
  [/owner acceptance (?:is )?required/giu, "owner-acceptance readiness gate"],
  [/until the owner decides/giu, "owner-decision stop"],
  [/copy the planning folder by default/giu, "copy-first archive rule"],
  [/tombstone pointer/giu, "archive tombstone rule"],
  [/Record three explicit statuses/giu, "incorrect status count"],
  [/`same-agent` provenance/gu, "retired verification provenance value"],
  [/At least \d+\/\d+ total/giu, "aggregate-score readiness threshold"],
  [/relevant P2/giu, "undefined P2 reopening rule"],
];
for (const file of suiteFiles) {
  const content = contents.get(file) ?? "";
  for (const [pattern, label] of forbiddenPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      errors.push(`${file}: contains ${label}`);
    }
  }
}

for (const [file, content] of contents) {
  if (/`compact`, `standard`, or `exhaustive`/u.test(content)) {
    errors.push(`${file}: contains retired profile vocabulary`);
  }
}

try {
  await readFile(
    resolve(root, ".ai/13_research/frontier-planning-and-autonomous-execution-2026-07-10.md"),
    "utf8",
  );
} catch (error) {
  errors.push(`research basis: missing or unreadable (${error.message})`);
}

try {
  await readFile(
    resolve(root, ".ai/13_research/2026-07-11-openai-gpt-5-6-agent-prompt-efficiency.md"),
    "utf8",
  );
} catch (error) {
  errors.push(`GPT-5.6 research basis: missing or unreadable (${error.message})`);
}

const fixturePath = resolve(root, "tests/fixtures/planning-prompt-suite/valid-plan-pack");
const fixtureManifest = JSON.parse(
  await readFile(resolve(fixturePath, "plan-pack.json"), "utf8"),
);
const schema = contents.get("Plan-Pack-Schema.md") ?? "";
const exampleMatch = schema.match(
  /<!-- BEGIN VALID PLAN-PACK EXAMPLE -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- END VALID PLAN-PACK EXAMPLE -->/u,
);
if (!exampleMatch) {
  errors.push("Plan-Pack-Schema.md: missing parseable valid plan-pack example");
} else {
  try {
    const example = JSON.parse(exampleMatch[1]);
    if (
      !canonicalManifestBytes(example).equals(canonicalManifestBytes(fixtureManifest)) ||
      example.manifest_sha256 !== fixtureManifest.manifest_sha256
    ) {
      errors.push("Plan-Pack-Schema.md: valid example differs from the executable fixture");
    }
  } catch (error) {
    errors.push(`Plan-Pack-Schema.md: invalid JSON example (${error.message})`);
  }
}

const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (!packageJson.scripts?.validate?.includes("validate:planning-prompts")) {
  errors.push("package.json: default validate script must run validate:planning-prompts");
}

const fixtureResult = await validatePlanPack(fixturePath);
for (const error of fixtureResult.errors) {
  errors.push(`semantic plan-pack fixture: ${error}`);
}

if (errors.length > 0) {
  process.stderr.write(
    `planning prompt suite validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):\n`,
  );
  for (const error of errors) {
    process.stderr.write(`- ${error}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `planning prompt suite validation passed (${suiteFiles.length} documents, ${gateIds.length} gates, ${evalNumbers.length} eval scenarios, ${combinedLineCount} lines, semantic fixture valid).\n`,
);
