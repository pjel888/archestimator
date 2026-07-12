---
name: ultraqa
description: "[OMX] Explicitly authorized, scoped adversarial QA with bounded diagnose-fix-recheck loops"
---

# UltraQA Skill

## Activation Gate

UltraQA is an opt-in evidence surface. Execute it only when the current user explicitly:

- invokes `$ultraqa` or `/ultraqa` with a goal; or
- asks to run tests, QA, E2E, a build gate, browser automation, screenshots, or another named automated validation surface.

A bare workflow mention, plan reference, handoff, risk label, nearby test file, prior authorization, or statement such as "bug-free" does not activate UltraQA. If activation is absent, record a `TEST_PROPOSAL` when useful and continue with non-test evidence.

## Lean Operating Contract

- Parse the exact authorized claim and evidence surfaces before running commands.
- Budget tokens, context, tools, generated artifacts, scenarios, cycles, agents, and cleanup work.
- Inspect only the direct and evidence-backed transitive blast radius; do not invent hypothetical systems or future features.
- Select the smallest scenario set that can falsify the claim. No universal hostile matrix or minimum scenario count exists.
- Run only the flags and surfaces the user authorized. `$ultraqa --tests` does not silently add build, browser, lint, typecheck, screenshots, or full-suite work.
- Create or modify tests, fixtures, or harnesses only when the user's current authorization covers that work and the artifact materially improves proof.
- Stop on the first decisive pass. There is no minimum cycle count, reviewer count, or command count.

## Goal Parsing

| Invocation | Authorized surface |
|---|---|
| `$ultraqa --tests` | The narrowest relevant existing tests; create or repair tests only when needed for the requested QA goal |
| `$ultraqa --build` | The named build command and only the smoke probe explicitly included in the goal |
| `$ultraqa --lint` | The relevant lint surface |
| `$ultraqa --typecheck` | The relevant typecheck surface |
| `$ultraqa --interactive` | The bounded CLI/service interactions named by the goal |
| `$ultraqa --custom "..."` | Only the specified claim and cheapest decisive runnable evidence |

If the invocation is unstructured, derive a narrow goal from the user's words. Do not expand it into all available QA surfaces.

## Scenario Selection

Create a compact scenario matrix only when multiple behavioral scenarios are necessary. Each selected row records:

- claim or risk;
- setup and command/harness;
- expected signal;
- actual result and evidence;
- cleanup status.

Choose only relevant scenarios. Candidate classes include normal path, malformed input, authorization denial, stale state, interruption/resume, misleading success output, concurrency, or cleanup. Omit irrelevant classes with no ceremony.

## Bounded QA Loop

### 1. Scope

- Restate the authorized goal, success condition, safety bounds, and stop condition.
- Identify the exact commands or artifacts allowed by the request.
- Capture dirty-worktree context without overwriting unrelated work.

### 2. Run the smallest proof

- Prefer the narrowest relevant test, command, interaction, or harness.
- Use explicit timeouts for commands that may hang.
- Check exit status and meaningful output; do not trust success-looking text alone.
- Do not add a baseline build, full suite, browser run, screenshot pass, or generated harness unless it is authorized and necessary.

### 3. Diagnose only failures

- Distinguish product failures from harness, environment, fixture, or authorization failures.
- Use an architect/debugger lane only when the failure is materially ambiguous; otherwise diagnose locally.
- Fix the smallest root cause while preserving unrelated work.

### 4. Recheck the failed claim

- Rerun the minimal failing proof after a fix.
- Expand one step only when new evidence shows the current proof is insufficient.
- Stop immediately when the authorized success condition is proven.

### 5. Clean up

- Remove temporary harnesses, processes, fixtures, state, and logs unless they are intentional deliverables.
- Record residual risks and skipped surfaces; do not call unrequested work a blocker.

## Generated Harness Guardrails

- Prefer existing project-native surfaces over new harnesses.
- Keep temporary artifacts in ignored scratch locations and list them in the report.
- Resolve repo imports from the verified repo root; do not rely on a temporary file's relative cwd.
- Use non-interpolating writers for source containing backticks, template markers, or shell metacharacters.
- Sanitize ambient runtime variables for isolation probes.
- Treat setup failures as harness evidence, not product defects, until product behavior is exercised.

## Safety Bounds

- No destructive cleanup, force resets, secret extraction, credential dumping, production writes, paid actions, or unbounded processes.
- No external-production or network side effects unless explicitly authorized.
- Never hide or overwrite unrelated dirty work.
- Stop and report when the same failure repeats without a materially different recovery path, a safety boundary blocks the proof, or the authorized claim is proven.

## Report

```markdown
# UltraQA Report

## Authorized goal
- Claim:
- Evidence surfaces:
- Stop condition:

## Evidence
| ID | Scenario | Command or harness | Expected | Actual | Status | Cleanup |
|---|---|---|---|---|---|---|

## Fixes
- Root cause, changed files, and narrow rerun evidence

## Gaps
- Unrequested, blocked, or still-unproven surfaces and remaining risk
```

## State

Use `omx state ... --json` only while UltraQA is active:

- Start: `omx state write --input '{"mode":"ultraqa","active":true,"current_phase":"scope","iteration":1}' --json`
- Update only on meaningful phase/cycle changes.
- Finish or cancel: run `$cancel` or `omx state clear --input '{"mode":"ultraqa"}' --json`.

Do not activate or begin cycling until the activation gate is satisfied.
