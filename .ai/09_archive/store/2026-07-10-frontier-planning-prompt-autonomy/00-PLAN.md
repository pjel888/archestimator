# Frontier Planning Prompt Autonomy

**Status:** archived - implementation, verification, and archive proof complete
**Profile:** high-blast-radius agent-framework contract
**Canonical execution artifact:** `IMPLEMENTATION_PLAN.md`

## Goal

Upgrade every prompt in `.ai/08_prompts/000_Planning Prompts/` so the suite
produces evidence-grounded, implementation-ready plan packs and then executes
them from start to finish without routine owner involvement.

## Scope

- Audit and revise all five planning-suite prompts.
- Normalize their authority, readiness, decision, evidence, orchestration,
  execution, QA, and completion contracts.
- Close all reversible, no-cost, in-scope decisions inside the agent workflow.
- Preserve hard boundaries imposed by repository policy: secrets, unrelated
  providers/projects, paid enablement, unauthorized production actions, and
  irreversible destructive actions without a recovery path.
- Add a focused regression contract for the prompt suite when that is the
  smallest durable way to prevent the autonomy rules from drifting.
- Record the durable policy change in current project state.

## Non-goals

- Implement a product feature described by any existing plan pack.
- Mutate Cloudflare/provider state, deploy, or change application runtime code.
- Rewrite unrelated agent adapters or the user's concurrent Workshop work.
- Promise that prompting alone can guarantee perfect output; require measurable
  artifacts, independent review, and completion evidence instead.

## Decision Policy

The suite must never leave an ordinary product, architecture, UX, testing, or
implementation choice for the owner merely because multiple reasonable options
exist. It must resolve those choices from source authority, current code,
official guidance, project patterns, reversibility, blast radius, and an
evidence-backed council. The selected decision, alternatives, reversal trigger,
and evidence are recorded under stable IDs.

When a true external authorization boundary exists, the suite must not stop at
"ask the owner." It must complete every safe path, choose and implement the
best reversible/free/local fallback, isolate the unavailable external proof or
action, and emit an exact machine-executable continuation packet. It must never
bypass higher-priority safety or provider boundaries.

## Workstreams

| Lane | Ownership | Write scope | Evidence |
|---|---|---|---|
| Lead | Suite synthesis and edits | Five prompt files, this plan pack, current-state record | Diffs, contract matrix, validation |
| Planning audit | Planning quality and artifact schema | Read-only | File/section findings and normalized plan contract |
| Autonomy audit | Execution, decisions, blocking, orchestration | Read-only | Gate inventory and autonomous fallback hierarchy |
| Research | Current primary-source frontier practices | Read-only | Source-backed rubric and local implications |
| Final checker | Adversarial cross-document and completion review | Read-only | Requirement-by-requirement verdict |

## Acceptance Criteria

- `AC-01`: Every one of the five prompt files is materially revised and remains
  internally coherent.
- `AC-02`: The suite has one explicit stage/handoff contract and one artifact
  authority order.
- `AC-03`: Planning prompts require current-repo discovery, primary-source
  research when claims are unstable, alternatives, stable traceability, risk,
  tests, rollout, recovery, and real-surface evidence.
- `AC-04`: Planning prompts resolve all internally resolvable decisions and do
  not use owner acceptance, owner assignment, or owner input as a readiness
  shortcut.
- `AC-05`: Execution recomputes `current_run_scope` from higher-priority policy,
  the active requested workflow, stage allowance, and package boundary; within
  that scope it repairs stale/incomplete plan artifacts and continues through
  implementation, integration, review, adversarial QA, evidence, state update,
  and archive. A plan never grants authority.
- `AC-06`: Multi-agent execution uses capability-aware role routing, bounded
  concurrency, explicit write ownership, maker/checker separation, failure
  recovery, and lead-owned integration.
- `AC-07`: True authorization boundaries trigger an autonomous fallback and
  continuation packet, never unsafe action or a vague owner question.
- `AC-08`: Readiness/completion is determined by requirement evidence, not
  arbitrary numeric caps, document length, agent count, or claims of using a
  named workflow.
- `AC-09`: Shared-worktree and current Cloudflare provider boundaries remain
  intact.
- `AC-10`: A fresh adversarial review finds no unresolved P0/P1 contradiction,
  owner-decision dead end, false-proof path, or cross-document handoff gap.
- `AC-11`: Focused prompt-contract verification and `git diff --check` pass.
- `AC-12`: Current project state records the new durable suite contract.

## Verification

- Inventory and compare all prompt headings and normative terms.
- Search for owner/user approval, question, blocker, and readiness-cap language.
- Run the focused prompt-contract regression test if added.
- Run `bun run validate:agents` because `.ai/08_prompts` participates in the
  shared agent workflow surface.
- Run `git diff --check` on all changed files.
- Use an independent final checker to audit every acceptance criterion against
  current file contents and command output.

## Stop Condition

Stop only when all acceptance criteria are proven, no required work remains,
and the active durable goal can pass its final cleanup/review/completion audit.

## Outcome

`AC-01..AC-12` pass. The final deterministic gate set, 28-test adversarial
suite, three-trial semantic evaluation, and independent post-fix review found no
unresolved P0/P1. The complete pack was moved to its canonical archive location,
and destination integrity, references, path rules, and source absence passed.
