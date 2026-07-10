# Workshop Pages — LOOP_LEDGER

Companion to `00_COORDINATION_LEDGER.md`. Append-only execution evidence.

## Goal contract
Shell-stable workshop navigation via layout-owned `WorkshopShell` (Phases 0–3).

## Iterations

### I-1 — 2026-07-10
- DISCOVER: plan CONDITIONALLY READY; no prior implementation artifacts
- PLAN: WP-1.1…1.7 → WP-2.1 → WP-3.1; Phase 0 best-effort baseline
- EXECUTE: in progress

### I-2 — 2026-07-10 VERIFY
- EXECUTE complete for Phases 0–3 (Phase 0 structural baseline only)
- VERIFY: type-check 0; focused unit/DOM green; doctor 0 after Promise.all
- REVIEW: performance-optimizer + ce-performance-oracle independent; merited fixes applied
- DECIDE: status **partial / CONDITIONALLY READY for ship of Phases 1–3 code**; residual: DEC-01 ack, prod e2e numbers, Phase 4 optional

### I-3 — 2026-07-10 E2E RUNNER (e2e-runner agent)
- TASK: run `authenticatedWorkshopTransition` Playwright spec; record transitionMs / RSC prefetch / overlay count
- DISCOVER: spec confirmed `e2e/route-transition-performance.spec.ts:345`; budgets `transitionMs: 10000`, `prefetchRscRequestMin: 1`, `overlayCount: 0`
- EXECUTE: `--list` exit 0 (8 tests, target confirmed at line 345)
- EXECUTE: `bun run dev -- --port 3020` → CRASH — sandbox blocks `uv_interface_addresses` syscall; server cannot start in agent context
- VERIFY: `.env.local` confirmed missing `ARCHESTIMATOR_DEV_AUTH_BYPASS` + `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`; no `PLAYWRIGHT_STORAGE_STATE`; test would `test.skip()` regardless
- DECIDE: **blocked_with_evidence** — B1 sandbox syscall; B2 missing auth bypass; B3 production-build auth constraint; B4 no storage state
- RECORD: `perf-baseline.md` updated with blocker inventory, placeholder table, owner unblock commands
- STATUS: **numeric e2e still pending** — owner must run locally with auth credentials

### I-4 — 2026-07-10 COMPLETION AUDIT + residual closeout
- DISCOVER: pack archive policy = full implementation only; go/no-go (13) still requires prod e2e numbers + DEC-01 ack; Phase 4 optional owner-gated
- VERIFY code: Phases 1–3 source present (`WorkshopShell` in layout; `WorkshopPageShell` deleted; content-only loadings; SEC comment; publisher/charts loadings)
- EXECUTE DOC-1: appended chrome-ownership note to `.ai/10_state/current-state.md`; updated `.cursor/rules/10-nextjs-16-rsc-server-actions.mdc` routing conventions
- EXECUTE WP-3.1 estimates leaf: attempted `estimates/loading.tsx` → **reverted** — governance test requires page-local Suspense (`ProjectEstimatesListRouteFallback`) so sheet routes do not inherit list skeleton
- VERIFY: `bun run type-check` exit 0; focused DOM shell tests 11/11 exit 0
- E2E retry (`required_permissions: all`): Playwright webServer started on 3022; failed before skip — Chromium missing from agent cache; auth bypass + storage state still ABSENT
- DECIDE: **BLOCKED (partial progress)** — do **not** archive; residual owner gates unchanged

### I-4b — Chromium install + skip proof
- `npx playwright install chromium` exit 0
- Re-run authenticated transition: **1 skipped**, exit **0** (auth bypass/storage state still absent)
- Numeric e2e still **blocked_with_evidence** (B2/B4); pack **not archived**

### I-5 — 2026-07-10 DEC-01 OWNER ACK (lead, owner present)
- DISCOVER: I-4/I-4b residual gates = DEC-01 owner ack + prod e2e numbers + Phase 4 optional
- DECIDE: **DEC-01 RESOLVED** — Philip acked Option 1 (keep nested `/workshop/*` URLs; fix chrome ownership via Phase 1 `WorkshopShell`). Recorded in `15_DECISIONS…md` status line, `00_COORDINATION_LEDGER.md` DEC-01 section + evidence table, `README.md` blocked-decisions table, `17_FINAL_READINESS_REVIEW.md`, `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`, `11_IMPLEMENTATION_PLAN.md` open-decisions register, `19_RESEARCH…md` gaps, `00_AGENT_COORDINATION.md`, `01_INVENTORY…md` cap-reason note.
- STATUS: DEC-01 gate **cleared**. Remaining residual before archive: prod e2e numeric baseline (B2/B4 — owner-run with auth bypass env + storage state) + optional Phase 4 (owner-gated, DEC-04). Implementation of Phases 1–3 may proceed unblocked on the keep-nested path.

### I-6 — 2026-07-10 Owner escalation: "resolve all archive blockers, stop asking"
- DECIDE: Philip authorized lead to clear ALL remaining archive blockers directly. Auth fixture path: provision dev-auth bypass + seed local D1 profile, run authenticated Playwright spec, record numbers. DEC-04 (Phase 4 cacheComponents) formally deferred as out-of-scope-for-archive (plan explicitly marks it optional/owner-gated; not required for the shell-stability fix).

### I-7 — 2026-07-10 AUTH E2E BASELINE — GREEN (lead)
- EXECUTE: appended `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` + 64-char secret to `.env.local` (git-ignored, localhost-only, non-production-only per `dev-auth-gate.ts:12-14`); seeded local D1 `profiles` row for `philipjonlewis@gmail.com` (`usr_dev_philip_0001`, admin); `ensureDefaultWorkspace` auto-provisions workspace on first `/workshop` visit.
- VERIFY: `PLAYWRIGHT_PORT=3030 npx playwright test e2e/route-transition-performance.spec.ts --grep "authenticated transition"` → **1 passed (29.2s)**.
- NUMBERS: transitionMs=**3661 ms** (budget ≤10000), prefetchRscRequestMin=**1** (budget ≥1), overlayCount=**0** (budget 0), authMode=dev-auth. See `perf-baseline.md` I-7 section.
- DECIDE: **ALL ARCHIVE GATES CLEARED.** DEC-01 ack ✓; authenticated e2e numbers ✓; Phase 4 formally deferred (DEC-04) ✓. Pack ready to archive.
- STATUS: **READY TO ARCHIVE.**

### I-6 — 2026-07-10 post-DEC-01 closeout attempt (Cursor lead)
- DISCOVER: DEC-01 ack present across pack docs; Phases 1–3 code present (`WorkshopShell` in layout after gate; `WorkshopPageShell` gone); Phase 4 **not** authorized → `deferred_with_rationale` (DEC-04). Archive policy (`README.md`): "Archive after full implementation completion" — no structural-only exception. Go/no-go (`13`) still lists production-build `authenticatedWorkshopTransition` numbers.
- VERIFY env (names only): `ARCHESTIMATOR_DEV_AUTH_BYPASS` ABSENT; `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET` ABSENT; `PLAYWRIGHT_STORAGE_STATE` ABSENT (`.env.local` + shell).
- EXECUTE e2e (`required_permissions: all`, Chromium present): `PLAYWRIGHT_PORT=3023 npx playwright test e2e/route-transition-performance.spec.ts --grep "authenticated transition" --reporter=list` → **1 skipped**, exit **0** (auth skip guard). No inventable numbers.
- VERIFY code: `bun run type-check` exit 0; `bun test tests/unit/reset-baseline.test.ts` 3 pass exit 0; `bun run test:dom` (shell + reset + estimate loading) 19 pass exit 0. No React edits this iteration → doctor not re-run.
- DECIDE: **BLOCKED — do not archive.** Residual gate = confirmatory numeric e2e (B2/B4). Phase 4 remains deferred. Phases 1–3 remain shippable on keep-nested path with structural/DOM proof; pack archive waits on owner auth fixtures + measured metrics in `perf-baseline.md`.

