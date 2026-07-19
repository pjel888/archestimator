---
name: archestimator-estimate-mutation-integrity
description: "Preserve Archestimator estimate mutation integrity across client handlers, server actions, D1 intents, atomic batches, mutation receipts, revision conflicts, history events, cache invalidation, and collaboration updates. Do not use for read-only estimate work, bypass existing intent boundaries, or run builds, browser automation, or automated tests unless the user explicitly requests them."
---

# Archestimator Estimate Mutation Integrity

## Authority

- Read `AGENTS.md` and `.ai/00_system/VALIDATION_MATRIX.md`.
- Trace the current path through `src/hooks/use-estimate-row-mutations.ts`, `src/lib/estimates/actions.ts`, `src/lib/estimates/d1-intents/`, `src/lib/estimates/mutation-receipts.ts`, `src/lib/estimates/row-revision-conflict.ts`, and `src/lib/estimates/d1-intents/history-events.ts` as applicable.
- Treat current D1 schema in `migrations/` and repository/query code as truth; do not reconstruct invariants from archived plans alone.

## Workflow

1. State the mutation command, actor and workspace boundary, affected entities, concurrency or retry risk, evidence decision, and stop condition.
2. Inspect `git status --short --branch` and trace callers and downstream effects. For broad, high-risk, or unfamiliar shared-symbol changes, use available Code Review Graph or GitNexus impact analysis when configured; for narrow reversible work, targeted source, `rg`, and LSP inspection is sufficient.
3. Preserve authorization, validation, stable intent identity, request fingerprinting, statement limits, atomic writes, committed receipts, revision-conflict handling, history and outbox events, and cache or collaboration propagation wherever the existing path requires them.
4. Keep canonical server state authoritative. Make optimistic client state reversible and reconcile it with receipts, conflicts, refetch, invalidation, or broadcast contracts already used by the surface.
5. Prefer the existing D1 intent and mutation helpers. Do not add a second mutation path, silently drop audit history, weaken actor scoping, or convert conflicts into last-write-wins behavior without an explicit product decision.

## Boundaries

- Stay on the current branch and shared worktree. Do not reset, clean, stash, revert, commit, push, or overwrite unfamiliar estimate changes.
- Keep provider work inside current `wrangler.jsonc` bindings. Never touch legacy `supabase/migrations/`, unrelated Cloudflare projects, paid services, destructive external data, or deployment without explicit authority.
- Default to `NOT_REQUIRED`. Do not create or run tests, builds, browser automation, screenshots, Storybook, or visual QA unless explicitly requested. Record a precise `TEST_PROPOSAL` when concurrency, idempotency, or atomicity risk warrants testing.

## Evidence And Stop

- Verify the full changed mutation path with source, focused diff, type or LSP, lint, static SQL, and other authorized non-test evidence. Check failure paths as well as success paths.
- Stop when one coherent path preserves actor scope, idempotency or retry semantics, atomic persistence, conflict handling, history, and client reconciliation, with any untested concurrency risk disclosed.
