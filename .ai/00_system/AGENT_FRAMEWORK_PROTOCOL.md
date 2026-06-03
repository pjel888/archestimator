# Agent Framework Protocol

**Date:** 2026-06-04
**Status:** Phase 1A repo-local framework protocol.

## Purpose

This document makes the agent operating framework executable without turning
every tool into a separate source of truth. It applies to Codex, Claude,
OpenCode, CommandCode, Antigravity CLI (`agy`), Kimi, DeepSeek, Hermes if
approved, Cursor if approved, Gemini, Ollama, and any future agent or harness.

`.ai/00_system`, `.ai/12_agents`, `.ai/08_prompts`, `.ai/11_skills`, current
source files, tests, package scripts, and provider evidence remain the
authoritative surfaces. Tool-specific files are adapters only.

## Agent Receipt

Every non-trivial agent run should begin internally with this receipt:

```txt
AGENT_RECEIPT:
mode=<plan-only|read-only|implementation|review|debug|release|provider-proof|recovery>
scope=<files/features/providers in scope>
non_goals=<explicitly out of scope>
writes=<allowed write folders or none>
validation=<commands/checks/manual proof required>
proof_boundary=<local-only|provider-proven|manual-proof-pending>
stop_condition=<done/blocker/owner-decision/destructive-approval>
```

The receipt is a discipline aid, not a new chat ritual. Record it in run logs
when the run produces durable `.ai` evidence.

## Required Preflight

Before editing files, an agent must verify:

1. Current path, git root, branch, status, worktrees, remotes, and recent log.
2. Relevant `.ai` source-of-truth chain from `DOCS_SOURCE_OF_TRUTH.md`.
3. Current package/runtime facts from `package.json` when stack facts matter.
4. Code-review-graph or GitNexus evidence before broad code exploration and
   before symbol edits when available.
5. Dirty files and ownership boundaries. Unrelated dirty files must not be
   overwritten, staged, or reformatted.
6. Provider, GitHub, Notion, legal, support, and launch claims are backed by
   actual provider/manual evidence, not plan text.

## Modes

| Mode | Writes | Required proof |
|---|---:|---|
| plan-only | `.ai/03_plans`, related `.ai` state/log/task docs | path checks, graph/repo-truth where relevant, `git diff --check` |
| read-only | none | command/source citations and no writes |
| implementation | scoped source/tests/docs | graph impact where applicable, targeted tests, `bun run validate`/`bun run build` when meaningful |
| review | none unless explicitly assigned | findings with severity and file references |
| debug | usually none until root cause known | reproduction or documented blocker |
| release/provider-proof | evidence docs only unless action approved | local/provider/manual proof separated |
| recovery | smallest corrective docs/source change | self-diagnostic chain and validation |

## Agent Status Rules

- Approved agents may work in their payload lanes.
- Conditional agents require an explicit task fit and isolated write scope.
- Deprecated agents fail closed unless Philip explicitly reapproves them.
- Unapproved agents do not receive work.
- Non-agent tools may be used only for their approved non-agent function.

When a lane is ambiguous, choose the fail-closed status and document the
decision instead of silently activating the lane.

## Multi-Agent Rules

- Use the smallest number of agents that materially improves quality or speed.
- The lead owns scope, integration, validation, and final evidence.
- Write-capable agents need disjoint file scopes and usually separate
  branches/worktrees.
- Shared policy files are edited sequentially.
- Workers report blockers and recommended handoffs upward; they do not widen
  scope or re-plan the whole task.

## Evidence And Run Logs

Durable work should create or update a run log under
`.ai/05_logs/YYYY-MM-DD-<task-slug>-<mode>-run.md` with:

- goal, mode, branch, commit, and dirty status before/after;
- source-of-truth docs read;
- graph/GitNexus/tool evidence;
- commands with exit codes and key output;
- files changed;
- validation result;
- provider/manual proof boundary;
- bug plans created;
- final status and remaining risks.

Use `local-only`, `provider-proven`, and `manual-proof-pending` labels
precisely. Never call a local check provider proof.

## Provider, GitHub, Notion, And Secrets

Provider, GitHub settings, Notion mutation, branch protection, paid add-ons,
and destructive external actions are approval-gated unless Philip explicitly
authorized the exact action in the active task and the action is not paid.

Secrets must not be printed, committed, copied into `.ai`, pasted into run
logs, or placed in prompt templates. Evidence files may record variable names,
hashes, IDs, statuses, and sanitized metadata only.

## Bug Protocol

Create a dated bug plan in `.ai/15_Bugs` when a blocker, stale source-of-truth
claim, tool failure, validation failure, provider proof gap, merge conflict, or
security concern is discovered and cannot be resolved immediately inside the
same scoped change.

The bug plan must include classification, evidence, impact, blocking status,
proposed fix, verification plan, and a link back to the active plan/run.

## Adoption Boundary

This protocol is Phase 1A repo-local framework implementation. It does not by
itself enforce GitHub rulesets, CI blocking checks, provider readiness, Notion
truth, or closed-beta readiness. Global enforcement requires dry-run evidence,
green advisory checks, and explicit approval.
