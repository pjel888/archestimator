# 02 — Repo Architecture and Current State

## Product

Archestimator — contractor-first construction estimating/proposal/collaboration SaaS. Pre-launch **closed beta**, owner-only, no external users. Production deploy healthy at `www.archestimator.com`.

## Architecture (server-actions-first + optimistic local state)

1. **Server actions** (`src/lib/*/actions.ts`) handle all writes, triggered from client components.
2. **TanStack Query** caches server state (30s staleTime) with optimistic rollbacks.
3. **Zustand** holds high-frequency UI state (`estimate-ui-store`, `navigation-ui-store`, `project-estimates-store`).
4. **Supabase Realtime** broadcasts cursor positions / presence.
5. **RLS** on every user-data table.

App shell uses `WorkshopPageShell`/`PublicPageShell` React components; only `/workshop/projects/[projectId]` has a dedicated `layout.tsx`.

## Measured shape (HEAD `2f28daf147ac`)

`src/app` 81 files · 73 route-convention files · `src/{components,features,hooks,lib,stores}` 409 files · `tests+e2e+scripts+supabase` 472 files. DB: 54 tables, ~110 RPCs, ~145 policies, 115 indexes, 35 triggers, 3 buckets, 13 enums, 91 migrations. (README's "67 migrations / 115 vitest / 7 e2e / 8 hooks" are stale — CLEAN-F33.)

## Feature status (current truth)

| Feature | Status | Cleanup relevance |
|---|---|---|
| Estimate tree (group/area, DnD) | Available; **single-node unification corridor active (P0–P3 on main, P5/P6/P7 staged)** | Transitional compat code = KEEP / migration-context, not stale |
| Cost component library, templates | Available | live |
| Inline sheet editing (optimistic) | Available | live |
| Project comparison charts (D3) | Available | live; uses `d3-shape` |
| Publication snapshots + shared links (password, P10 lockout) | Available | **security-sensitive — KEEP** |
| Collaboration invites (email, RBAC, Realtime cursors) | Available **but invite email config-gated** | README overstates (CLEAN-F35) |
| Excel proposal export | Available | live; `exceljs` server-only. `features/page.tsx` wrongly says "Planned" (CLEAN-F34) |
| AI Ask-Flip + Package Builder | **Deferred** (fail-closed behind `ARCHESTIMATOR_AI_ENABLED` / `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`) | owner gate (CLEAN-F25) |
| Revision intelligence, Proposal comparisons | **Planned** (doc-only) | speculative remnant (CLEAN-F27) |
| Follow mode, project page cursors | Deferred (flags off; follow-mode helpers 0 callers) | owner gate (CLEAN-F07/F26) |
| A/B testing framework | Live on landing; `results-calculator` test-only | partial cut (CLEAN-F18) |
| AEC classification | Test-only, no runtime callsite | MVP-cut candidate (CLEAN-F17) |

## Active plans / corridors that constrain cleanup

- **Estimate-Tree Single-Node Unification** (`.ai/03_plans/2026-06-13-…`): P5 RELAX-ONLY SQL staged (not applied), with `prove:unify-kinds` harness + write-freeze/rollback runbook. Compat code in `estimate-schema-compat.ts`, `workspace-repository.ts`, `domain/estimate-*.ts`, and `legacy-main`/`__legacy_default_tab__` sentinels are **load-bearing** until P6/P7.
- Active planning packs (docs-only, no code): route-transition-performance, ui-component-optimization, database-indexing, share-and-collaboration, ai-chatbot-agent-readiness, landing-page-improvement, agentic-cicd-standardization. These must not be deleted; some need README listing (CLEAN-F37).
- Standing **pre-launch DB authorization** for project `ebxxqidacheyapmmzavr` (AGENTS.md) — agents may apply migrations, but **this audit does not**; destructive drops still need dump+rollback+owner gate.

## Security/audit surfaces that are off-limits to cleanup

Auth gates + dev-bypass (non-prod), RLS helpers + policies, share/publication (token encryption, hashing, access cookies, P10 lockout, security headers, no-store), collaboration (invite tokens/pepper, membership floors, origin guards, audit events), legal terms acceptance, security/audit tables. All KEEP unless proven obsolete AND replaced.

## Current-state caveats

`current-state.md` (436 KB) and `known-issues.md` carry a long launch-proof journey; many historical "blocked" items are resolved by archived proof artifacts. Two Codex Security history-exposure findings remain **owner-accepted** for single-owner beta (git-history exposure; cleanup of current tree does not purge history). These are out of scope for code cleanup but noted in the risk register.
