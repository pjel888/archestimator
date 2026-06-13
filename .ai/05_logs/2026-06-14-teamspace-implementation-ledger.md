# Teamspace — Implementation Ledger

**Plan:** `.ai/03_plans/2026-06-14-Teamspace-Improvement-Plan/` (now archived to `.ai/09_archive/`)
**Branch:** `2026-06-14-Teamspace-Improvement-Plan` (worktree `sharp-jones-bd5d63`)
**Date:** 2026-06-14
**Status:** Implemented, verified, merged to `main`. DB migrations applied to `ebxxqidacheyapmmzavr`.

> Honesty standard (plan `12 §3.8`): the claim is **zero known bugs after
> behavioral, build, DB, and review evidence** — not "100% bug-free." Deferred
> items are listed explicitly, never silently skipped.

---

## What shipped (by task)

### Phase 0 — Baseline & guardrails
- **T0.1/T0.5** Baseline + state matrix → `.ai/05_logs/2026-06-14-teamspace-baseline.md`.
- **T0.6** Rollout/observability ledger → `.ai/05_logs/2026-06-14-teamspace-rollout-ledger.md`.
- **T0.2** Rewrote `project-collaboration-realtime.test.ts` from static string checks → fake-channel **behavioral** tests (payload minimization, no path leak, lifecycle).
- **T0.3** Transport seam: injectable `clientFactory`/`identityIssuer` on both realtime hooks → fake-channel unit tests with no live socket.
- **T0.4** Top-level `RealtimeAuthBridge` (`src/components/realtime-auth-bridge.tsx`) calls `supabase.realtime.setAuth()` on `onAuthStateChange`; singleton browser client (`src/lib/supabase/client.ts`) so all channels share one socket.

### Phase 1 — Security (Track A)
- **T1.1** Project-presence payload scoped to coarse allowlisted `activeSurface` enum (`src/lib/collaboration/presence-surface.ts`); removed raw `activeRoute`/`activeEstimateId`/`activeTabId`/`focusedCell`. Proven by a behavioral test asserting the exact tracked key set. (F6/F29, G2/G14)
- **T1.2** Sender-bound identity: Ed25519 signed envelopes (`realtime-identity.ts` isomorphic verify, `realtime-identity-server.ts` sign, `realtime-identity-actions.ts` action). Cursor receivers verify signature+topic+expiry+`sub===payload.userId` before rendering; unknown/spoofed/expired → dropped. Proven by `realtime-identity.test.ts` (7) + `estimate-cursor-identity.test.ts` (member-B-claims-A and unsigned → render nothing). (F7, G3/G19, R-18)
- **T1.3** Server-side realtime rate limit — **documented/pending owner apply** (`max_events_per_second` is a project/dashboard setting, not exposed by the available MCP tools). Value + rationale in the rollout ledger §3.
- **T1.4** DB-atomic membership guards — migration `20260614120000_teamspace_membership_atomic_guards.sql`, **APPLIED** to prod. `enforce_workspace_owner_floor` + `enforce_project_manager_floor` BEFORE triggers; cascade-safe via `pg_trigger_depth()`; the project floor reuses `has_other_project_access_manager` so it mirrors the app invariant exactly (no false blocks). Trigger-only `EXECUTE` revoked. Verified installed + enabled live. (F13, G13)
- **T1.5** Security headers for `/workshop/:path*` + `/invite/:path*` in `next.config.ts`: `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, HSTS enforced now; CSP **Report-Only** (D-9 window). Test updated (replaces the old "workshop not covered" assertion). (F8, G4)
- **T1.6** Origin/same-site guard on `/invite/[token]/accept` (proxy-aware host + Referer fallback). 9-case unit test. (G5)
- **T1.7** Runtime authz regression coverage folded into the behavioral suites above (spoofed identity, restricted-sheet invisibility via payload scoping).

### Phase 2 — Performance (Track E)
- **T2.1** Collaboration summary → TanStack Query (`use-project-collaboration-query.ts`, `summary-actions.ts`) seeded with SSR data; mutations `invalidateQueries` the single key + optimistic role update; dropped the whole-layout `revalidatePath` (only the projects list is revalidated). (F-P6, R-15)
- **T2.2** `project` + `project_members` deduped via `getCurrentWorkspaceProject` reuse + a `cache()`-wrapped `getCachedProjectMembers`, shared by collaboration + publication summaries. (F-P8)
- **T2.3** `workspace_members` + `estimates` waves parallelized. (F-P1)
- **T2.4** `auth.uid()` → `(select auth.uid())` across 10 collaboration RLS helpers + the `profiles` SELECT policy — migration `20260614120100_teamspace_rls_authuid_perf.sql`, **APPLIED**. Verified byte-identical to originals except the wrap (10/10 functions + policy matched). (F-P4/F-P5)

### Phase 3 — Header presence cluster (Track B)
- **T3.1** Unified contrast-correct `CollaboratorAvatar` (white `text:#FFFFFF` on saturated `cursor` bg; wired the dead stacking `offset`/`zIndex`; deleted the conflicting `#F2F2F2` shadow). Contrast proof test (all 8 hues ≥4.5:1; white-on-cursor ≥ old pairing for every hue).
- **T3.2/T3.3/T3.4** Header face cluster replacing the gear: online-first/self-first ordering, `+N` roster popover with coarse per-person activity, focusable tooltip faces, `aria-live` join/leave, responsive face budget (2/3/4 via matchMedia), "Manage access" affordance.

### Phase 4 — Share modal (Track D)
- **T4.1–T4.4** Modal → "Share": top invite field with inline email validation (`noValidate` + `aria-invalid` + reserved helper row), unified member rows with per-row optimistic spinner→check, demoted estimate zone, pending-invite expander + `expiresAt`, "Live presence & cursors enabled" line replacing the transport panel, empty/checking/degraded states, polite + assertive live regions, destructive removal `alertdialog`, single-column responsive.

### Phase 5 — Cursors (Track C)
- **T5.1** Sheet cursor upgrades: row/cell **fractional anchoring** (drift-free across expansion/scroll) with absolute fallback + selector-injection guard; **rAF spline interpolation** with `prefers-reduced-motion` snap; **screen-reader** "editing a row" announcements; verified identity (T1.2).
- **T5.2** Project presence detail wired — real `activeSurface` flows into the header roster activity.
- **T5.3** Project-wide page-cursor layer **built** (`ProjectCursorLayer.tsx`, page-relative coords, reuses the verified engine via `channelTopic`) and mounted in the project layout, but **OFF by default** behind `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS` + restricted to the overview surface + suppressed on touch — held pending **D-1** tier confirmation, exactly as the plan gates it.

### Phase 6 — Verification
- See "Verification evidence" below.

---

## Owner decisions taken (had authority to decide)
- **D-1** (tier → T5.3): ship the layer behind an OFF kill-switch; do not enable project-wide page cursors until the Supabase tier is confirmed.
- **D-4** (viewer cursors): **No** — viewers remain presence-only.
- **D-6** (follow mode, T5.4): **Deferred** — not in the user's stated ask; the `06 §4.5` edge contract remains the prerequisite if later enabled.

## Deferred (explicit, not silent)
- **T5.4 follow mode** — deferred per D-6.
- **T1.3 server-side rate limit** — documented value/rationale; apply via Supabase dashboard/management API (not available through the MCP toolset in-session).
- **CSP enforcement on `/workshop`+`/invite`** — Report-Only first per D-9 (≥1 week observation), coordinate with the Shared-Link CSP-nonce work.

---

## Corrections to the plan found during implementation (honesty)
- **F3 contrast was overstated.** Measured, the OLD `cursor`-on-`cursorSoft` avatar pairing actually clears WCAG 4.5:1 for all 8 hues (amber marginal at 4.51), not the "≈3.3:1 fail" the audit claimed. The white-on-`cursor` fix is still a real improvement (more headroom: 5.02–7.90; uses the intended `text` token) and is a guaranteed non-regression — but it was not closing a hard failure.
- **T1.4 project floor would have over-blocked.** The first-pass trigger counted only project-level managers; since a workspace owner manages every project, that would falsely block removing the last project-level admin. Fixed to reuse `has_other_project_access_manager` (workspace OR project), mirroring the app exactly. Also added a `pg_trigger_depth()` guard so FK-cascade teardown (project/workspace deletion) is never blocked.
- **Roster activity is coarse, by design.** The plan aspired to show "editing Estimate A2" in the header roster, but the project channel must not carry sheet identity (R-14). The roster shows coarse activity ("active now · in an estimate"); specific sheet names stay on the sheet channel.

---

## Verification evidence (Node v25.8.0; PATH node is v14 and too old — memory)
- `bun run type-check`: **0 errors**.
- `bun run build`: **success** (full route tree compiled; server-action / `server-only` boundaries clean).
- `bun run test` (bun unit): **9 passed**.
- `bun run test:dom` (full Vitest DOM suite, integrated with the merged charts work): **2100 passed, 3 skipped, 7 todo, 0 failed** across 273 files.
- `bun run lint`: **0 errors in all Teamspace-touched files** (the 1 remaining error is pre-existing charts code — `ProjectChartsClient.tsx` setState-in-effect — already on `main`; not introduced here).
- DB: both migrations applied to `ebxxqidacheyapmmzavr`; `get_advisors(security)` → **0 ERROR** (115 WARN / 5 INFO pre-existing schema-wide); triggers verified installed + enabled.

**Pre-existing reds NOT introduced by this work** (documented, not owned here):
- `lint:design-system` violations in `ProposalExportPreviewDialog.tsx` (spreadsheet-export plan's file, present on the base commit).
- `lint` setState-in-effect in `project-charts/ProjectChartsClient.tsx` (charts plan, merged to `main` before this branch).

## Integration / concurrency note
Another agent landed the Project Charts plan on `main` (commits `6ad5b456`, `9fbde599`, `083e07ce`) while this branch was in flight. `main` was merged into this branch — **no conflicts** (disjoint files). Final verification ran on the integrated tree.
