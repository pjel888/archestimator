# 08 — Agentic Development Standardization Plan

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Existing foundation

The archived 2026-06-03 framework rollout implemented repo-local agent framework artifacts. This plan standardizes how future AI work flows through branches, CI, PRs, release proof, and evidence.

## Agent modes

| Mode | Writes | Branch required? | Required evidence |
|---|---|---:|---|
| `read-only` | none | no | command/source citations |
| `plan-only` | `.ai/03_plans` and related `.ai` docs | yes for durable work | `git diff --check`, graph/repo audit |
| `implementation` | scoped source/tests/docs | yes | impact analysis, tests, build/validate |
| `review` | normally none | no | findings with file refs |
| `release` | workflows/evidence/provider proof | yes | CI + provider evidence |
| `provider-proof` | evidence docs only unless authorized | yes | redacted provider proof |

## Worktree rules

1. Before edits: `git status --short --branch`, `git worktree list --porcelain`, and current branch/remote check.
2. If another Codex app/worktree is active, create a separate worktree.
3. Do not edit `main` directly after this authorized planning merge.
4. Name AI branches `codex/<date-or-type>-<slug>` unless otherwise scoped.
5. Preserve unrelated dirty files and sibling worktrees.
6. Commit coherent batches with Lore commit messages.

## Agent receipt

Every non-trivial run should carry:

```txt
AGENT_RECEIPT:
mode=
scope=
non_goals=
writes=
validation=
proof_boundary=
stop_condition=
```

## Multi-agent coordination

Use parallel agents only for independent slices. Read-only audit agents remain read-only. Implementation agents need disjoint write scopes. The leader owns integration and final evidence.

## Graph/code-intelligence

Use code-review-graph before broad exploration and impact analysis before symbol edits. If GitNexus is unavailable, record blocker and fallback evidence.

## Anti-overclaim terms

Use `planned`, `advisory`, `locally implemented`, `ci-proven`, `provider-proven`, and `production-promoted` precisely. Do not say “complete” for global workflow while any gate is advisory or blocked.
<!-- 98-100-UPGRADE:START -->
## CI integration for agent standards

Future governance/docs-health checks should verify that every non-trivial PR contains an agent receipt, a proof boundary, validation evidence, provider authority status, and no false docs-only claim. Agent framework docs/payloads must point back to `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and `.ai/12_agents/`.

## Adoption proof

Agentic standardization is adopted only after representative dry-runs exist for read-only audit, docs-only plan, source change, Supabase migration, provider-proof evidence, release workflow, and emergency bypass. Until then this pack is implementation-ready but not enforced.
<!-- 98-100-UPGRADE:END -->
