import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const paths = {
  agents: "AGENTS.md",
  operating: ".ai/00_system/AGENT_OPERATING_PROTOCOL.md",
  validation: ".ai/00_system/VALIDATION_MATRIX.md",
  directive: ".ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md",
  evaluation: ".ai/08_prompts/000_Planning Prompts/Prompt-Evaluation-Suite.md",
  creating: ".ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md",
  improving: ".ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md",
  implementation: ".ai/08_prompts/000_Planning Prompts/Create-Implementation-Prompt.md",
  commit: ".ai/08_prompts/000_Git Commit Prompt/GIt-Commit-Prompt.md",
};

const documents = {};
for (const [key, path] of Object.entries(paths)) {
  documents[key] = await readFile(resolve(root, path), "utf8");
}

const normalize = (value) => value.replace(/\s+/gu, " ").trim();
const includes = (document, value) => ({
  pass: normalize(documents[document]).includes(normalize(value)),
  detail: `${paths[document]} contains ${JSON.stringify(value)}`,
});
const excludes = (document, value) => ({
  pass: !normalize(documents[document]).includes(normalize(value)),
  detail: `${paths[document]} excludes ${JSON.stringify(value)}`,
});

const simulations = [
  {
    id: "SIM-01",
    name: "small single-file fix",
    checks: [
      includes("evaluation", "1. **Direct one-file fix:**"),
      includes("agents", "Use for clear, bounded work."),
      includes("agents", "No written plan, ledger, reviewer, subagent"),
      includes("validation", "`Q1_CHANGE_GATE`"),
      includes("validation", "Default for noncritical production, test, config, build, or generated behavior"),
      includes("validation", "Missing, stale, malformed, skipped, cancelled, flaky, focused, or incomplete"),
    ],
  },
  {
    id: "SIM-02",
    name: "multi-file feature",
    checks: [
      includes("evaluation", "2. **Brief multi-file feature:**"),
      includes("agents", "Use for multi-file, moderately risky, or ambiguous work."),
      includes("agents", "Do not create a dated plan pack."),
      includes("operating", "Brief work records it in-session."),
    ],
  },
  {
    id: "SIM-03",
    name: "bug investigation",
    checks: [
      includes("evaluation", "3. **Bug investigation:**"),
      includes("agents", "start with `bun run ops:agent-debug-snapshot`"),
      includes("operating", "If evidence fails, diagnose, change the hypothesis or implementation"),
      includes("directive", "Classify the failure before retrying"),
    ],
  },
  {
    id: "SIM-04",
    name: "planning-only",
    checks: [
      includes("evaluation", "4. **Planning-only request:**"),
      includes("creating", "does not implement product code"),
      includes("implementation", "This stage is planning-only."),
      includes("improving", "implementing product code"),
    ],
  },
  {
    id: "SIM-05",
    name: "parallel research",
    checks: [
      includes("evaluation", "5. **Parallel research:**"),
      includes("directive", "starts independent reads in parallel"),
      includes("directive", "waits at named dependency or integration barriers"),
      includes("operating", "primary documentation"),
    ],
  },
  {
    id: "SIM-06",
    name: "concurrent agents could edit the same file",
    checks: [
      includes("evaluation", "6. **Concurrent agents could edit the same file:**"),
      includes("directive", "Never allow concurrent writes to the same file"),
      includes("directive", "Assign one writer/integrator"),
      includes("directive", "serialize conflicting writes"),
    ],
  },
  {
    id: "SIM-07",
    name: "failed test retry and escalation",
    checks: [
      includes("evaluation", "7. **Failed test retry and escalation:**"),
      includes("directive", "Retry a transient failure once"),
      includes("directive", "change at least one material dimension"),
      includes("validation", "Rerun only evidence invalidated by later edits"),
      includes("validation", "never omit a required profile layer"),
      includes("directive", "lower acceptance criteria"),
    ],
  },
  {
    id: "SIM-08",
    name: "non-Codex environment without native subagents",
    checks: [
      includes("evaluation", "8. **Non-Codex environment without native subagents:**"),
      includes("directive", "Parallel threads or team panes"),
      includes("directive", "Emulated specialist passes"),
      includes("directive", "Single-agent fallback"),
      includes("directive", "never claims independent review"),
    ],
  },
  {
    id: "SIM-09",
    name: "Git generation in a mixed worktree",
    checks: [
      includes("evaluation", "9. **Git generation in a mixed worktree:**"),
      includes("commit", "staged/unstaged/untracked paths"),
      includes("commit", "separate explicit authorization"),
      includes("commit", "Mixed-purpose hunks"),
      includes("commit", "A clean worktree is not required."),
      excludes("commit", "git add .` is allowed"),
    ],
  },
  {
    id: "SIM-10",
    name: "missing access or external write",
    checks: [
      includes("evaluation", "10. **Missing access or external write:**"),
      includes("operating", "`AUTH_BLOCKED` applies only to the exact prohibited external action"),
      includes("operating", "after every safe local prerequisite is complete"),
      includes("agents", "Actual external deployment"),
      includes("directive", "records the exact external boundary"),
    ],
  },
];

if (simulations.length !== 10) {
  console.error(`workflow simulation harness must define exactly 10 simulations, found ${simulations.length}`);
  process.exit(1);
}

let failures = 0;
for (const simulation of simulations) {
  const failedChecks = simulation.checks.filter((check) => !check.pass);
  if (failedChecks.length === 0) {
    console.log(`PASS ${simulation.id} ${simulation.name}`);
    continue;
  }
  failures += 1;
  console.error(`FAIL ${simulation.id} ${simulation.name}`);
  for (const check of failedChecks) console.error(`- ${check.detail}`);
}

if (failures > 0) {
  console.error(`workflow simulations failed (${10 - failures}/10 passed)`);
  process.exit(1);
}

console.log("workflow simulations passed (10/10)");
