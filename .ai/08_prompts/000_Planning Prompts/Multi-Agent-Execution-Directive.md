# Multi-Agent Execution Directive

## Canonical Scope

This is Archestimator's canonical orchestration contract whenever work uses
native subagents, parallel threads, emulated specialist passes, or coordinated
multi-owner execution. It does not override platform instructions,
`AGENTS.md`, the Task Contract in
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, or the Validation Matrix.

Load `Frontier-Planning-Kernel.md`, applicable
`Frontier-Applicability-Gates.md`, this directive, and
`Plan-Pack-Schema.md` only when a pack is involved.

## Task Contract

Before coordinated work begins, the lead establishes one parent Task Contract:

- objective and user intent;
- scope, exclusions, authoritative inputs, and current evidence;
- constraints, dependencies, assumptions, and authorization boundaries;
- owner, required capability classes, tool permissions, and write permissions;
- required outputs and acceptance criteria;
- exact validation commands, test decision, and proof boundaries;
- completion condition, stop condition, and escalation condition.

Direct work may keep this contract mental. Brief work records it in-session.
Plan Pack work persists it. A material objective or assumption change refreshes
the parent contract and invalidates dependent assignments and handoffs.

## Selection And Portability

Use the fewest agents or logical passes that materially improve elapsed time,
context isolation, specialist accuracy, or named-risk coverage.

- **Native subagents:** assign installed roles with bounded packets. Respect the
  runtime depth and thread limits in current configuration.
- **Parallel threads or team panes:** use the same assignment IDs, ownership,
  synchronization, and handoff contracts; one named lead synthesizes.
- **Emulated specialist passes:** one agent performs isolated sequential passes,
  labels each role and evidence boundary, and never claims independent review.
- **Single-agent fallback:** inventory, decide, implement, verify, review, and
  synthesize sequentially without fake worker artifacts.

Short, ordered, tightly coupled, or same-file work stays with one owner.
Unavailable agents or models trigger a portable fallback, not a blocker.

## Topology And Lifecycle

Default to a flat lead-and-workers topology. Native recursion is limited by the
configured runtime; child workers do not delegate unless the assignment and
runtime explicitly permit it. Prevent cycles by rejecting any assignment that
depends on its own result directly or transitively.

The lead:

1. establishes the Task Contract and dependency graph;
2. selects independent workstreams and capability classes;
3. assigns IDs, ownership, permissions, evidence, and stop rules;
4. starts independent reads in parallel and dependent work sequentially;
5. waits at named dependency or integration barriers;
6. consumes structured handoffs and inspects actual artifacts;
7. resolves conflicts, integrates, verifies, cleans up, and owns completion.

Normal parallel fan-out is three lanes. The configured thread ceiling is a hard
runtime limit, not a target. More lanes require a concrete elapsed-time or
coverage benefit.

## Subagent Assignment Contract

Every assignment includes:

- assignment ID, parent Task Contract, and bounded workstream;
- installed `agent_type` or semantic capability class;
- exact read scope, write scope, files/resources owned, and permissions;
- dependencies, inputs, assumptions, and synchronization barrier;
- timeout behavior, including that expiry releases no ownership or authority;
- prohibited side effects, Git/provider limits, and spawn-depth permission;
- expected artifact, evidence, and return shape;
- authorized commands and explicit test decision;
- completion condition, stop condition, retry budget, and escalation path.

Workers receive only the context needed for their slice. They do not broaden
scope, rewrite policy, mutate unowned files, wait on internally solvable work, or
report completion for the parent task.

## Ownership And Synchronization

Never allow concurrent writes to the same file, generated contract, database
resource, Git index, or other mutable state. Assign one writer/integrator and
parallelize read-only analysis around that owner. Reread shared files before
editing and preserve unfamiliar changes.

This repository stays in the current shared checkout unless the user explicitly
authorizes worktrees or branch changes. When isolated worktrees are unavailable,
serialize conflicting writes. Formal leases are only for genuine concurrent
Plan Pack contention; ordinary work uses explicit file ownership and barriers.

At a barrier, the lead confirms required handoffs, current file state, and
dependency evidence before starting downstream work. A timeout releases no
ownership automatically.

## Handoff Contract

Every worker or logical pass returns:

- assignment ID and `COMPLETE|PARTIAL|FAILED|CANCELLED` status;
- completed work, incomplete work, and acceptance criteria addressed;
- files/resources inspected and changed;
- decisions, assumptions, and scope deviations;
- commands/evidence with exact results and fresh artifact references;
- explicitly unrun tests and unproved external boundaries;
- conflicts, limitations, cleanup state, remaining risk, and confidence;
- recommended next action or escalation.

The lead treats the handoff as an index. It verifies the cited artifacts and
does not substitute the summary for evidence.

## Completion Contract

The lead completes the parent task only when every requested requirement and
acceptance criterion maps to a current artifact and fresh evidence; the final
source and diff are reviewed; exact authorized validation commands succeeded or
their honest gaps are recorded; failures, external proof limits, and unrun tests
are disclosed; integrated handoffs are reconciled; and no safe in-scope work,
orphan lane, ownership claim, or cleanup remains.

Worker completion never implies parent completion. `PARTIAL`, `FAILED`, or
`CANCELLED` handoffs must be reassigned, completed by the lead, or isolated to an
exact external boundary before the parent can finish.

## Independent Review

Use an independent reviewer only when it materially reduces a named risk or the
Task Contract requires one. Give the reviewer the original requirements,
acceptance criteria, scoped final diff, decisive artifacts, validation results,
and known proof gaps. The reviewer checks actual artifacts, reports
`PASS|FAIL` with severity and exact repair, and does not edit the reviewed
surface. One reviewer is sufficient unless the Task Contract names a concrete
reason for more. A failed review returns to implementation; the final lead
re-verifies invalidated evidence before completion.

## Failure, Retry, And Recovery Contract

Classify the failure before retrying:

- transient tool/model/transport failure;
- weak or incorrect evidence/implementation;
- dependency, scope, or ownership conflict;
- missing authority or credentials;
- cancellation or technical impasse.

Retry a transient failure once with the same bounded assignment. On recurrence,
refresh context and change at least one material dimension: tactic, capability,
model, tool, scope partition, or serialization. If it still fails, the lead
takes over, reduces concurrency, or records the exact external boundary.

Do not retry identically, lower acceptance criteria, discard shared work, bypass
validation, create recursive replacement agents, or label an optional worker
failure `TECH_BLOCKED`. Preserve useful evidence and clean up only owned
ephemeral state.

## Capability And Model Fallback

Select capability first; resolve implementation through
`.ai/12_agents/codex-role-model-matrix.json`:

1. configured role and model;
2. repository default model at suitable effort;
3. nearest available capability class with any judgment-critical downgrade
   disclosed;
4. lead executes the slice sequentially.

Use frontier judgment for ambiguity and synthesis, balanced/read-heavy models
for exploration and research, and fast/repeatable models for bounded mechanical
work. Preserve the configured reasoning baseline unless representative evidence
supports a lower or higher setting. API Pro mode, reasoning effort, and
orchestration are not model-name suffixes.

## Context, Progress, And Integration

Keep stable instructions first and volatile task evidence last. Preserve
reasoning only while the objective and assumptions remain stable. After a
material direction change, refresh the Task Contract and invalidate dependent
handoffs.

Use one concise preamble before tool-heavy work and progress only at major phase
changes, material findings, blockers, or long waits. Do not narrate every tool
call.

The lead integrates by dependency boundary, reviews the final source and diff,
reruns only invalidated authorized evidence, audits the original request, and
applies this Completion Contract and the Planning Kernel Completion Contract.
Multi-agent activity ends when the parent task is achieved, cancelled, or
honestly blocked; no orphan lane, ownership claim, or cleanup may remain.
