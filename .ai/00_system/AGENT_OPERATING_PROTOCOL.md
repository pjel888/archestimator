# Agent Operating Protocol

## Purpose

Turn a user request into a correct repository result with the least process that
preserves quality. `AGENTS.md` is the entry contract; this file defines the
execution mechanics.

## Lean Engineering

Archestimator is alpha/pre-beta. Ordinary local edits are not production change
events. Analyze the real blast radius, then prefer direct replacement, deletion,
current utilities, and fix-forward repair. Do not add compatibility, flags,
rollout, rollback, hosted proof, or approvals without a proven current user,
persisted-data, integration, external-side-effect, or explicit requirement.

Tokens, elapsed time, tool calls, context, artifacts, agents, and repeated checks
are engineering costs. More process is justified only when it changes a decision,
reduces a named risk, or proves a required claim.

## Lane Selection

### Direct

Default for clear bounded work. Read the relevant files, edit, verify, finish.

### Brief

Use an in-session plan for multi-file, moderately risky, or ambiguous work. Keep
it to target, scope, sequence, evidence, and stop condition.

### Plan Pack

Use only when explicitly requested or for genuinely expensive-to-reverse work:
destructive data migration, live auth/token compatibility, material security
boundaries, broad architecture replacement, or coordinated multi-owner work.
Follow `.ai/00_system/PLAN_PACK_EXECUTION_POLICY.md`.

## Task Contract

For non-trivial work establish: objective and intent; scope and exclusions;
inputs and authoritative paths; constraints, dependencies, assumptions, and
authorization boundaries; owner and capability class; tool and write
permissions; required outputs; acceptance criteria; validation commands and
evidence/test decision; stop condition; and escalation condition.

Direct work may keep this contract mental. Brief work records it in-session.
Plan Pack work persists it. Do not create an artifact merely to restate a clear
request.

## Execution

Use `DISCOVER -> DECIDE -> EDIT -> VERIFY -> FINISH`.

### Discover

- Read the FAST PATH and relevant source.
- Map affected callers, contracts, persisted state, external effects, and failure
  paths only until the solution can be chosen confidently.
- Verify unstable external claims from primary documentation when necessary.
- Treat plans, memory, logs, and worker reports as leads until checked against
  current source or authoritative external state.

### Decide

- Resolve ordinary reversible choices autonomously.
- On equal evidence, choose the simpler, faster fix-forward path.
- Ask only when an irreversible, destructive, paid, credential-gated, external-
  production, or materially scope-changing choice cannot be derived safely.
- Record durable decisions only when future work would otherwise repeat or
  contradict them.

### Edit

- Make the smallest coherent change that completes the requested behavior.
- Prefer deletion and reuse over new abstractions.
- Preserve concurrent work; reread shared files immediately before editing.
- Do not widen scope for adjacent cleanup unless required by the current change.

### Verify

Use the cheapest decisive authorized evidence. Start with source/diff/reference
checks, then type/LSP/lint/static/dry-run/narrow runtime evidence when relevant.
Automated product tests, builds-as-tests, browser automation, screenshots,
Storybook, and visual QA require explicit current-task user authorization under
`.ai/00_system/VALIDATION_MATRIX.md`.

If evidence fails, diagnose, change the hypothesis or implementation, and retry.
Do not repeat an exhausted tactic or lower the objective.

### Finish

- Reconcile every requested requirement to evidence.
- Update canonical `.ai` truth only when project reality changed.
- Leave auxiliary gaps visible without downgrading completed implementation.
- Report result, changed files, evidence, and real remaining risk.

## Collaboration

Work directly by default. Delegate only independent bounded slices where the
expected time, context-isolation, or coverage gain exceeds coordination cost.
The lead owns scope, integration, decisions, verification, and the final claim.
When orchestration is used, follow
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` for
assignments, ownership, synchronization, handoffs, portability, and recovery.

Use one writer per shared file or contract. A lightweight ownership note is
enough for ordinary work. Formal leases/heartbeats are plan-pack-only and only
for actual concurrent contention.

Maker/checker separation is optional. Use it only when independent judgment
materially reduces a named risk; deterministic self-checks are sufficient for
routine work.

## Blockers

Internally resolvable dependencies are continuation work. Reorder, repair,
substitute, or implement them. Optional tools, agents, reviewers, memory,
unapproved tests, hosted proof, and release evidence cannot block safe local work.

`AUTH_BLOCKED` applies only to the exact prohibited external action after every
safe local prerequisite is complete. `TECH_BLOCKED` applies only when a core
deliverable remains impossible after materially different local fallbacks fail
and no runnable next unit remains.

## Failure And Completion

Classify failure before retrying. Retry a transient tool or transport failure
once; on recurrence refresh context and use a materially different tactic,
capability, lane, or serialization strategy. Then take over locally or isolate
the exact external boundary. Never repeat an exhausted tactic, lower the
objective, or turn an optional-lane failure into a blocker.

Completion requires every core criterion reconciled to a current artifact and
fresh evidence, the final source/diff reviewed, authorized validation completed
or an honest test decision recorded, failures and proof gaps disclosed, and no
safe in-scope work, ownership, handoff, or cleanup left.

## Supermemory

<!-- supermemory-bootstrap: required -->
Run `bun run supermemory:ensure` at session start. Search before broad,
non-trivial, or recovery work. Add one sanitized durable memory only when project
truth materially changes. Verify memory against current source. Failure is a
degraded capability, not an unrelated implementation blocker.

## Provider Authority

Standing authorization covers resources currently bound in `wrangler.jsonc`:
Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, Durable Objects
`COLLAB_ROOMS`/`GLOBAL_PRESENCE`/`SUPPORT_INBOX`, Queues
`UPLOAD_JOBS_QUEUE`/`CLIENT_PORTAL_NOTIFICATIONS_QUEUE`, Email `EMAIL`, and Images
`IMAGES`. Agents may change active migrations, scoped SQL, schema/index/query
behavior, and bound integration configuration, and may fix mistakes forward.

No paid add-ons, unbound resources, unrelated accounts/projects, legacy Supabase
mutation, actual external deploy, secrets exposure, or irreversible destructive
action without exact authority.

## Repository Safety

Stay in the current shared checkout. Preserve unfamiliar changes. Never reset,
clean, stash, revert, overwrite, branch, worktree, commit, push, or rewrite Git
history unless explicitly requested. These rules protect shared state; they do
not gate ordinary local implementation.
