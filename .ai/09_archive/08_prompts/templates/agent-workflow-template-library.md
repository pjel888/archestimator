# Agent Workflow Template Library

**Status:** Phase 1A repo-local prompt library.

All templates inherit `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`. Replace
bracketed fields before use. Do not paste secrets into prompts.

## Common Header

```txt
Mode: [plan-only|read-only|implementation|review|debug|release|provider-proof]
Scope: [files/features/providers]
Non-goals: [out of scope]
Allowed writes: [none or exact folders]
Disallowed writes: secrets, unrelated files, provider/GitHub/Notion mutation unless explicitly scoped
Required reading: AGENTS.md, .ai/README.md, DOCS_SOURCE_OF_TRUTH, AGENT_OPERATING_PROTOCOL, AGENT_FRAMEWORK_PROTOCOL, VALIDATION_MATRIX, current-state, decisions, active plan/spec
Graph requirement: use code-review-graph/GitNexus before broad code claims or symbol edits when available
Validation: [commands/checks/manual proof]
Stop condition: [done/blocker/owner decision/destructive approval]
Final report: status, changed files, validation, graph evidence, proof boundary, bugs, risks
```

## Feature Plan Creation

Target agents: Claude/Codex. Mode: plan-only.

```txt
Use the common header. Create an implementation-ready plan under .ai/03_plans.
Read current repo/source truth first. Include requirements, non-goals,
architecture, sequence, tests, risks, rollback, open decisions, and acceptance
criteria. Do not edit source, package files, providers, GitHub settings, or
Notion. Validate referenced paths and run git diff --check.
```

## Feature Implementation

Target agents: Codex/Kimi/agy. Mode: implementation.

```txt
Use the common header. Implement only the approved plan. Use TDD where behavior
changes. Run graph impact before symbol edits. Keep changes small and scoped.
Update .ai logs/state/tasks/bugs. Run targeted checks, then bun run validate and
bun run build when source behavior changes. Do not claim provider readiness from
local checks.
```

## Bug Investigation

Target agents: DeepSeek/Codex. Mode: read-only/debug.

```txt
Use the common header. Reproduce or isolate the issue before proposing a fix.
Prefer logs/tests/source evidence over guesses. If no safe fix is in scope,
create a dated .ai/15_Bugs plan with evidence and stop condition.
```

## Bug Fix Implementation

Target agents: Codex. Mode: implementation.

```txt
Use the common header. Write or identify a failing regression first where
feasible, then implement the smallest root-cause fix. Re-run the failing test
and relevant broader checks. Do not weaken tests.
```

## Hotfix

Target agents: Codex lead. Mode: implementation.

```txt
Use the common header. Keep scope minimal, reversible, and isolated. Record
rollback steps, risk, and owner/provider proof boundary. Run the fastest check
that proves the hotfix plus one broader safety gate when possible.
```

## Release Candidate

Target agents: lead/release sentinel. Mode: release.

```txt
Use the common header. Assemble local, provider, manual, legal, support,
rollback, and smoke proof separately. Mark missing proof honestly. Do not
promote, rollback, mutate providers, or change GitHub settings unless explicitly
authorized.
```

## CI Failure

Target agents: debugger/Codex. Mode: debug.

```txt
Use the common header. Identify the exact failing check and commit range. Re-run
the smallest reproducible command. Fix root cause or create a blocker. Do not
skip, mute, or weaken checks.
```

## Reviews

Target agents: reviewer/CommandCode/Kimi/security/Supabase sentinels.
Mode: review.

```txt
Use the common header. Stay read-only unless assigned. Lead with findings by
severity, with file/line evidence. Separate local code risk from provider proof
gaps. Include residual test or evidence gaps.
```

Review variants: code review, security review, UI/UX review, Supabase/RLS
review, implementation-readiness audit.

## Notion Mirror Prep

Target agents: writer/lead. Mode: plan-only/provider-proof.

```txt
Use the common header. Prepare or perform Notion mirror updates only when
authorized and after repo evidence is current. Every mirrored item must include
source .ai path, commit hash, mirror date, proof boundary, anti-drift notice,
and no secrets. Notion never overrides repo truth.
```

## `.ai` Memory Update

Target agents: writer/Codex. Mode: docs-edit.

```txt
Use the common header. Update the narrowest canonical .ai home. Do not create a
parallel brain. Mark stale historical material as superseded. Validate with
referenced paths and git diff --check.
```

## Self-Diagnostic

Target agents: any. Mode: recovery.

```txt
Use the common header. Run .ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md.
Restate the current goal, non-goals, affected files, validation gate, and stop
condition. Make the smallest corrective change and verify it.
```

## Multi-Agent Orchestration

Target agents: lead/Hermes if approved. Mode: orchestration.

```txt
Use the common header. Split only independent tasks. Give each worker disjoint
write scope, validation, expected output, and escalation rules. The lead owns
integration and final verification.
```

## Loop-Engineered Product Development

Target agents: lead/Codex/Claude/OpenCode/CommandCode/Antigravity/Kimi/DeepSeek.
Mode: plan-only, implementation, review, or provider-proof by phase.

```txt
Use the common header. Treat the work as a loop, not a single prompt:
1. audit current repo/provider truth;
2. create or update the dated .ai/03_plans plan pack;
3. research uncertain claims into .ai/13_research with source dates;
4. choose the loop surface: direct, ultrawork, ultragoal, omo:ulw-loop,
   autopilot, omo:ultraresearch, ultraqa, vercel:agent-browser, or an
   equivalent surface in the active coding agent;
5. execute the next smallest coherent step;
6. verify through the matching real surface and maker/checker separation;
7. persist evidence and decide the next iteration.
Tool-specific payloads are adapters only. Claude, Codex, OpenCode, CommandCode,
Antigravity, Kimi, DeepSeek, Cursor where approved, Gemini only if explicitly
reapproved, and future agents must all follow .ai/00_system as the shared
authority. Do not claim completion from chat memory, worker self-report, or
tests alone when the behavior requires browser, HTTP, provider, DB, CLI, or
manual proof.
```

## Read-Only Audit

Target agents: any reviewer. Mode: read-only.

```txt
Use the common header with allowed writes=none. Gather current evidence, report
ranked findings, and name exact patch targets without editing.
```

## Plan Refinement

Target agents: Codex/Claude. Mode: docs-edit.

```txt
Use the common header. Improve the existing plan in place unless told
otherwise. Add missing contracts, acceptance criteria, validation, risks, and
proof boundaries. Do not fork competing plan trees.
```

## Provider Proof Packet

Target agents: lead. Mode: provider-proof.

```txt
Use the common header. Collect sanitized evidence for Vercel, Supabase, Resend,
GitHub, legal, support, and hosted smoke separately. Record timestamps, IDs,
statuses, and proof paths. Do not print secrets. Paid add-ons require
action-time approval.
```

## GitHub Ruleset Prep

Target agents: release/sre. Mode: plan-only/provider-proof.

```txt
Use the common header. Prepare advisory checks and proposed rulesets only.
Do not mutate GitHub branch protection, rulesets, CODEOWNERS, or required checks
until approval and dry-run evidence exist.
```

## Dry-Run Eval

Target agents: verifier. Mode: review/test.

```txt
Use the common header. Run the eval scenario, score 0-5 for reading, scope,
graph, validation, evidence, .ai updates, safety, and final report. Critical
safety failure fails the run. Log results under .ai/05_logs.
```
