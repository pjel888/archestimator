# 04 — Implementation Phases & Goal Cards

Each card is an atomic, independently revertible unit with its own exit gate. Phases 1–2 are app-only (low blast radius). Phase 3 is the only DB lane and is conditional on Phase 0/1 evidence. U-IDs are stable.

---

## Phase 0 — Measurement harness + baseline (no optimization)

### U1. Build per-branch + per-wave instrumentation
- **Goal:** Replace estimate with evidence — know which of the 5 dashboard branches is slowest and how many waves it contains.
- **Files:** `src/lib/repositories/workspace-repository.ts`, `src/lib/repositories/component-library-repository.ts`, `src/app/workshop/page.tsx`, `src/lib/perf/server-timing.ts` (existing `traced` helper).
- **Approach:** Implement the `08-…` harness: request-correlated `PERF_TRACE`/structured logs as the minimum, optional `Server-Timing` only through a response-capable surface, plus an actual Supabase round-trip counter tagged by safe branch labels.
- **Verification:** A single dashboard render reports per-branch durations + total round-trip count; concurrent renders can be correlated by request id.
- **Test expectation:** harness smoke test or script assertion; instrumentation is guarded/dev-only and must not alter visible output, auth, cookies, or Supabase session behavior.

### U2. Seed Small + Medium + Large fixtures and capture baseline
- **Goal:** Three realistic data volumes so conclusions that flip on size are caught.
- **Files:** a seed script under `scripts/` (new), run against a Supabase **branch** DB (never prod).
- **Approach:** Small (~5 projects / ~10 estimates / ~20 library items); Medium (~25 / ~250 / ~500); Large (~200 / ~2k / ~5k, with publications + invites). Capture round-trip count, per-branch timing, payload row/byte estimates, `pg_stat_statements`, and `EXPLAIN` of the homebase reads when branch DB is available.
- **Verification:** Baseline numbers recorded in `LOOP_LEDGER.md`. **Gate:** no Phase 3 starts without branch-DB evidence. Phase 1/2 may start from a recorded minimum viable baseline only as described in `08-…`.
- **Test expectation:** none — fixture/measurement scaffolding.

---

## Phase 1 — Homebase wave-merge (app-only, OPP-1)

### U3. Merge the homebase estimate latency wave
- **Goal:** Collapse serial H3 + H4 into one bounded latency wave.
- **Requirements:** Advances A-23 (Performance-Refactor) app-only path.
- **Dependencies:** U1, U2.
- **Files:** `src/lib/repositories/workspace-repository.ts`; tests under the existing `tests/vitest` structure, likely `tests/vitest/workshop-homebase-query-batching.test.ts`.
- **Approach:** Follow `09-…`: preferred two bounded arms in one `Promise.all` wave; single `OR` only if proven safe. Preserve ordering + limits.
- **Test scenarios:** all cases in `09-…`, including favorite estimate outside the recent window and favorite project not in recent projects.
- **Verification:** identical `WorkshopHomebaseData` shape vs baseline for the same fixture; round-trip count for Branch A drops by 1.

### U4. Merge the homebase project backfills
- **Goal:** Collapse H2 + H5 `projects` reads into one id-batched read.
- **Dependencies:** U3.
- **Files:** `src/lib/repositories/workspace-repository.ts` + tests.
- **Approach:** after the estimate arms, union `favoriteProjectIds + missingProjectIds`, single `IN`, Map-dedupe, re-apply current ordering. Recent-estimate project ids were already computed from `recentProjectIds ∪ favoriteProjectIds`.
- **Test scenarios:** favorite project not in recent set; invisible/deleted favorite project; estimate referencing a project absent from recent+favorite (the "missing" path); no favorites; no missing.
- **Verification:** same projects set as baseline; Branch A round-trips drop by 1.

### U5. Parallelize the independent tail
- **Goal:** Run publications + pending-invite summary + estimate-nodes as one `Promise.all` wave.
- **Dependencies:** U3, U4.
- **Files:** `src/lib/repositories/workspace-repository.ts` + tests.
- **Approach:** wrap H6/H7/H8 in `Promise.all`; keep each one's existing try/tolerate path so a missing optional table still degrades to null/0 independently.
- **Test scenarios:** missing `project_publications` table → publications null, rest intact; pending-invite RPC missing → invite summary degrades, rest intact; no estimates → nodes wave skipped; **a recent project where the user's role cannot manage collaboration (viewer-not-manager) → that project contributes 0 to `sentPendingInviteCount` and is absent from the H7 invite-query input** (proves the `canManageCollaborationRole` filter survived the parallelize).
- **Verification:** Branch A wave count drops by ~2; error-isolation behavior unchanged (kill one optional table, others still resolve).

---

## Phase 2 — Dashboard-lean library fetch (app-only, OPP-2 + OPP-5)

### U6. Add `getLibraryDashboardSpotlight` and switch the page to it
- **Goal:** Fetch only what the dashboard renders; stop computing discarded health stats on the dashboard path.
- **Dependencies:** U1, U2.
- **Files:** `src/lib/repositories/component-library-repository.ts`, `src/app/workshop/page.tsx`; tests under the existing `tests/vitest` structure, likely `tests/vitest/library-dashboard-spotlight.test.ts`.
- **Approach:** new function per `03-…` §B; `loadDashboardLibrarySpotlight` calls it; `getLibraryOverview` untouched; preserve `try/catch → null`. Do not fetch recent template detail or row counts in v1 because the current dashboard does not render them; return `recentTemplates: []` to satisfy the existing type.
- **Test scenarios:** populated library (component count, recent components, template count correct); empty library → null-safe zeros; missing optional table → null (dashboard still renders); Library page remains on `getLibraryOverview`.
- **Verification:** Branch C query count drops from 11(+conditional) to <=3 for the dashboard path; Library page output unchanged.

### U7. Fix the caching comment + optional request-dedupe
- **Goal:** Remove the inaccurate "all React-cached" comment; optionally `React.cache`-wrap the lean fetch.
- **Dependencies:** U6.
- **Files:** `src/app/workshop/page.tsx`.
- **Test expectation:** none — comment/dedupe only; no behavior change.

---

## Phase 3 — `workspace_homebase_summary` RPC (DB lane, GATED, OPP-3)

> **Do not start** until U1–U5 are measured and the residual homebase tail still dominates the slow branch on Medium/Large, the decision tree in `12-…` says RPC is justified, and the DB lane stays inside the standing Archestimator project authorization. If Phase 3 proceeds, this pack is the canonical owner for `workspace_homebase_summary`; Performance-Refactor Phase 8 must back-point here for this RPC.

### U8. Author the RPC migration (branch DB only)
- **Goal:** Collapse the residual dependent chain to one round-trip.
- **Files:** `supabase/migrations/<YYYYMMDDHHmmss>_workspace_homebase_summary.sql` (new), `src/lib/supabase/types.ts` (additive splice — see `06-…`).
- **Approach:** per `03-…` §C and `11-…` — `security invoker`, membership-joined sub-selects, user-scoped favorites, clamped `recent_limit`, `set search_path = public`, `jsonb` return; publications + invites stay app-side.
- **Test scenarios:** `EXPLAIN (ANALYZE, BUFFERS)` on Small/Medium/Large fixtures (index use, no seq scan on large, buffers ≤ sum of replaced reads); parity vs the app-only result; Small/Medium non-regression.
- **Execution note:** characterization-first — assert the new RPC returns byte-identical homebase data to the Phase-1 app path before switching the caller.

### U9. Cross-tenant denial proof + caller switch
- **Goal:** Prove no cross-tenant leak, then route `getWorkshopHomebaseData` through the RPC behind the measurement.
- **Files:** `src/lib/repositories/workspace-repository.ts`, a fresh `prove:*` cross-tenant denial test modelled on the EXISTING `prove:estimate-list-summaries` gate (NOT `prove:project-chart-buckets`, which does not exist yet and whose RPC is itself unproven).
- **Test scenarios:** authenticated user A cannot read workspace B's summary via a guessed `workspace_id` (denial returns empty); RLS advisor pass; parity preserved.
- **Verification:** cross-tenant denial proof green; same-workspace user-favorite isolation green; Codex review pass; Branch A collapses to ~1 dependent wave on Medium/Large with measured improvement; rollout follows `12-…`.
