# 2026-07-04 — Performance Optimization Plan

> **Plan profile:** `standard` (multi-domain, bounded scope, not exhaustive)
> **Plan status:** `CONDITIONALLY READY` *(overall)*. **Phase 1 is `NOT READY`** for implementation until WP-P1-01 produces EXPLAIN artifacts against the corrected schema; Phases 2–4 remain `NOT READY` pending their baselines. See `03_RISK_AND_READINESS.md` §4.2 for the full phase-status table.
> **Revision:** Round 6 (post-Codex-review, 2026-07-04). Round 1 had fabricated schema names (`variant_cost_entries`, `owner_user_id`); Rounds 2–6 progressively corrected schema references (`projects.created_by`, `workspaces.created_by`, `cost_library_item_variant_cost_entries` already indexed in migration `0028`, `collaboration_invitations` 3 indexes in `0007`), severity counts (MED = 9 not 7/8), authz test cases (6, not 5), Phase 1 readiness (NOT READY), Phase 1 finding severity language, F-MIG-02 inclusion in findings index, WP-P4-01 evaluator section, and F-REACT-02 / WP-P3-04 useState count (16, not 15).
> **Verification mode:** `emulated` — author and reviewer are Claude-family. Codex (gpt-5.4) provided independent review (NAUGHTY → fix cycle → Round 2). Per the planning directive this caps overall readiness at 97.
> **Author:** Sisyphus (OpenCode / Claude Opus 4.7), 2026-07-04 (Asia/Manila)
> **Scope owner:** Philip
> **Plan directory:** `.ai/03_plans/2026-07-04-Performance-Optimization/`

---

## 1. What this plan is — and is not

**Is:** a codebase-wide performance audit + a phased remediation plan. It identifies bottlenecks with file:line evidence, ranks them by impact, and proposes work packages with measurable gates.

**Is not:** an implementation. No source, tests, migrations, package manifests, or provider state are modified by this plan. Every fix is described as a future work package that needs a separate implementation pass.

**Is not:** a duplicate of prior perf work. The repository already has a mature perf surface (see §3). This plan extends it; it does not redefine it.

---

## 2. Master goal

Make Archestimator's pre-launch MVP noticeably faster on the three user-perceived hot paths — workshop dashboard first paint, estimate sheet interaction latency, and shared proposal viewer open — without breaking the authz/data-integrity contracts and without enabling paid Cloudflare add-ons.

**Outcome targets (targets, not measurements):**

| Surface | Current | Target | Source |
|---|---|---|---|
| Workshop dashboard TTFB (p95) | unmeasured repo-side | ≤ 300 ms | inferred from `wrangler.jsonc` Worker topology; baseline needed |
| Estimate sheet open, 500-row estimate | unmeasured repo-side | ≤ 1.5 s interaction-to-paint | inferred from `perf:measure-routes` surface; baseline needed |
| Shared proposal viewer open (`/share/[token]`) | unmeasured repo-side | ≤ 800 ms TTFB | inferred from existing P11 CSP/no-store headers; baseline needed |
| Workshop JS bundle (initial) | unmeasured | ≤ 350 KB gzipped (first load) | needs `ANALYZE=true bun run build` baseline |
| D1 round-trips per dashboard render | unmeasured | ≤ 6 | `perf:dashboard-query-count` exists; needs a fresh PERF_TRACE capture |

**Non-goals:**

- Do not enable Cloudflare paid add-ons (D1 paid plan, R2 paid tier, Smart Placement paid, Workers Analytics paid, dedicated egress). Standing cost posture forbids it.
- Do not rewrite the repository layer or the actions layer. Decompose only when a measured hot path justifies it.
- Do not migrate off Better Auth, D1, R2, Durable Objects, Queues, or Cloudflare Email. The Cloudflare migration is complete.
- Do not regress authz. Every D1 query optimization must preserve app-authorization checks (no RLS — D1 is not Postgres).
- Do not regress the proportional-verification policy. Most changes here need targeted tests + a fresh PERF_TRACE run, not broad `validate` loops.

---

## 3. What is already optimized (do not re-do)

| Optimization | Location | Status |
|---|---|---|
| Server-timing / PERF_TRACE instrumentation | `src/lib/perf/server-timing.ts` | Live; dormant unless `PERF_TRACE=1` |
| Web vitals probe | `src/components/workshop/WebVitalsProbe.tsx` | Live; dormant unless `NEXT_PUBLIC_PERF_TRACE=1` |
| 13 perf scripts (routes, dashboard count, library baseline, peak load, live DB evidence, shared link budgets) | `scripts/measure-*.ts`, `scripts/perf-*` | Live; baseline artifacts in `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/_evidence/` |
| TanStack Query defaults (5-min staleTime, 5-min gcTime, no refetchOnWindowFocus, retry 1) | `src/app/providers.tsx:21-30` | Live; healthy |
| Next.js `staleTimes` (dynamic 60s, static 180s) | `next.config.ts` experimental block | Live; documented as Library Optimization Plan P0 T3 |
| `next/dynamic` lazy imports on 10+ workshop components | workshop `*Client.tsx` files | Live |
| Worker route short-circuits before OpenNext fetch | `worker.ts:64-89` | Live; canonical host, auth state, fast health, malformed share, proof, collaboration room, public page cache |
| CSP + hardening headers, including no-store on `/share` | `next.config.ts` headers block | Live |
| Liquid glass deferred until first paint + idle | `src/components/system/LiquidGlassReady.tsx` | Live |
| `optimizePackageImports` for Phosphor icons | `next.config.ts` experimental | Live |
| D1 runtime performance proof (query budgets, p95) | `scripts/verify-cloudflare-d1-runtime-performance-proof.ts` | Live; uses `cf:d1-runtime-proof` |
| Library perf baseline (100/500/5000 tiers) | `_evidence/phase-0a/library-phase0a-perf-baseline-20260624T152526Z.md` | Live; measured locally |
| Library Optimization Plan (already shipped) | `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/` | Live |
| Cloudflare observability (10% head sampling, traces 5%, logs persist) | `wrangler.jsonc` observability block | Live |
| CI route transition perf smoke | `.github/workflows/ci.yml` last step | Live |

This is a codebase that has already done the first 2–3 rounds of perf work. The findings in `01_FINDINGS.md` are the **next** layer, not the first layer.

---

## 4. Plan shape (4 active phases + 1 deferred, ranked by ROI)

| Phase | Focus | Estimated effort | Blocked? |
|---|---|---|---|
| Phase 1 | D1 indexes + N+1 authz fix | 1–2 days | **NOT READY** — requires fresh EXPLAIN on bound D1 against corrected schema before migration |
| Phase 2 | Server action waterfalls (Promise.all opportunities) | 2–3 days | NOT READY — requires PERF_TRACE baseline of action round-trip counts |
| Phase 3 | Client bundle weight + React hot-path memo/effect audit | 3–5 days | NOT READY — requires `ANALYZE=true` bundle baseline + React Profiler pass on estimate editor |
| Phase 4 | Measurement gaps + CI perf budget gate | 1–2 days | NOT READY — requires Phase 1–3 baselines to set budgets |
| Phase 5 (deferred, not in implementation scope) | `/share/[token]` shared proposal viewer TTFB baseline + remediation | TBD | Out of scope for this plan — see Phase 4 note in `02_IMPLEMENTATION_PLAN.md`. Will be activated after Phase 1–3 baselines exist. |

**Phase order is fixed.** Phase 1 has the highest user-perceived impact (D1 round-trips dominate Worker request latency on a server-actions-first architecture) and the smallest blast radius (a migration + one repository rewrite). Phases 2–4 build on Phase 1's baselines. Phase 5 is a placeholder for the share-viewer follow-up audit.

The detailed work packages, evidence requirements, and gates are in `02_IMPLEMENTATION_PLAN.md`.

---

## 5. Documents in this plan

| File | Purpose |
|---|---|
| `README.md` (this file) | Entrypoint, readiness, phase order, blocked decisions, what's already optimized |
| `01_FINDINGS.md` | The audit — every bottleneck with file:line evidence, ranked by impact |
| `02_IMPLEMENTATION_PLAN.md` | Phase-by-phase work packages, measurement gates, evaluator contracts |
| `03_RISK_AND_READINESS.md` | Risk register, decisions log, alternatives considered, final readiness review |

> **Ponytail note:** the Creating-Plan-Prompt's `exhaustive` profile would produce 21 docs. This plan uses the `standard` profile's smaller-set allowance because (a) ponytail mode is active, (b) the audit audience is Philip + a future implementer, not a multi-team review board, and (c) every finding and gate fits cleanly into 4 focused docs. Adding 17 more docs would not improve implementation readiness.

---

## 6. Readiness status

**Overall:** `CONDITIONALLY READY`

- **Phase 1** is `NOT READY` for implementation. Originally drafted as `CONDITIONALLY READY`, downgraded after Codex review (2026-07-04) caught fabricated schema names (`variant_cost_entries`, `owner_user_id`). Corrected schema (`projects.created_by`, `workspaces.created_by`, `cost_library_item_variant_cost_entries` already indexed in `0028`) is in `01_FINDINGS.md` §1.1 and `02_IMPLEMENTATION_PLAN.md` WP-P1-01/02. Phase 1 becomes `CONDITIONALLY READY` again only after WP-P1-01 produces real EXPLAIN artifacts on the bound D1.
- **Phase 2** is `NOT READY` for implementation. It needs a fresh `PERF_TRACE=1` capture of the top 5 server-action paths to know which awaits are actually sequential vs. already parallel.
- **Phase 3** is `NOT READY` for implementation. It needs a fresh `ANALYZE=true bun run build` artifact to know the actual bundle composition and the top 10 modules by size.
- **Phase 4** is `NOT READY` until Phases 1–3 land their baselines, because budgets can only be set against measurements.

**Verification mode cap:** because verification was `emulated` (same Claude family authored and reviewed), the overall plan readiness is capped at 97 per the planning directive. A future independent reviewer (Codex was used for review-only on Round 1; a fresh Codex/Gemini/human pass on Round 2 can lift the cap).

---

## 7. Blocked decisions (owner: Philip)

| ID | Decision | Default if owner does not respond |
|---|---|---|
| OPEN-PERF-01 | Allow `EXPLAIN` queries against the bound D1 (`ARCH_DB`) to confirm missing-index hypothesis before Phase 1 migration. Philip grants standing Cloudflare-resource authorization in `AGENTS.md`, so `EXPLAIN` (read-only) is in scope. | Proceed with `EXPLAIN` under the standing authorization. |
| OPEN-PERF-02 | Accept the new D1 indexes proposed in Phase 1 as additive (no DROP/RECREATE of existing indexes). | Additive only; safe default. |
| OPEN-PERF-03 | Allow `ANALYZE=true bun run build` locally to capture bundle composition for Phase 3. | Yes; local-only, no provider impact. |
| OPEN-PERF-04 | Set Wrangler observability head sampling from 0.1 to 0.5 during the Phase 2 measurement window, then back to 0.1. (Free-tier bounded; sampling is not a paid add-on.) | Bump to 0.5 for the measurement window. |
| OPEN-PERF-05 | Approve a CI perf-budget gate as a non-blocking advisory in Phase 4 (warn, not fail) for the first two weeks. | Advisory-only for two weeks, then promote to blocking. |

---

## 8. Files off-limits to this plan

- Any file under `supabase/**` — historical migration archaeology, retained only.
- Any file under `src/lib/supabase/**` — legacy; current-state log says zero active runtime blockers but the files are not to be touched by this perf plan.
- Cloudflare accounts/projects outside the bindings in `wrangler.jsonc` (Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`).
- The historical Supabase project `ebxxqidacheyapmmzavr` — read-only provider-exit evidence only.

---

## 9. Stale-plan revalidation checklist

Before implementing any phase, the implementer must verify:

- [ ] `git status --short --branch` is on the expected branch and there is no unexpected dirty state.
- [ ] The specific files cited in the chosen work package still exist and the cited line numbers are still accurate.
- [ ] The migrations directory still matches the index inventory in `01_FINDINGS.md` §1.1.
- [ ] `wrangler.jsonc` still binds the same D1/R2/DO/Queue/Email resources.
- [ ] `package.json` still has the `perf:*` and `cf:d1-runtime-proof` scripts this plan relies on.
- [ ] The Library Optimization Plan's evidence file (`_evidence/phase-0a/...`) is still present and unchanged, OR a newer baseline exists that supersedes it.
- [ ] No newer plan under `.ai/03_plans/` supersedes this one (sort by date).

If any check fails, stop and re-plan.

---

## 10. Commands to run before the first edit

```bash
# Confirm clean state and current branch
git status --short --branch

# Confirm the perf infrastructure this plan depends on is still present
ls scripts/measure-*.ts scripts/verify-cloudflare-d1-runtime-performance-proof.ts
grep -E "perf:|cf:d1-runtime-proof" package.json

# Confirm the migrations index inventory is unchanged
ls migrations/ | wc -l   # expected: 30 files (0001–0030)
```

---

## 11. Final report shape (for the implementer)

When implementation of any phase completes, the implementer's final report must include:

- The before/after PERF_TRACE snapshots for the affected surfaces.
- The `EXPLAIN` outputs (Phase 1) or bundle analyzer artifact (Phase 3) that prove the change.
- Confirmation that no authz check was bypassed (every repository function still calls its `canAccess*` guard).
- The exact migration filename(s) applied (Phase 1).
- The new p95 / INP / LCP numbers vs. the baseline.
- Confirmation that `bun run validate` and `bun run cf:d1-runtime-proof` still pass on the affected surfaces.

Without that evidence, the phase is not done.

---

## 12. Baseline capture pass (2026-07-05)

> **Captured by:** Sisyphus (OpenCode / Claude Opus 4.7) under the Multi-Agent Execution Directive. Read-only / measurement-only. Zero source files modified.

### Work packages executed

| WP | Status | Evidence |
|---|---|---|
| WP-P1-01 (EXPLAIN baselines) | ✅ DONE | `_evidence/phase-1/explain-before-20260705.md` |
| WP-P3-01 (Bundle baseline) | ✅ DONE — Turbopack-native route-bundle stats used; all routes meet ≤ 350 KB gzipped target | `_evidence/phase-3/bundle-baseline-20260705/source-attribution.md` |
| WP-P2-01 prep (Action inventory) | ✅ DONE — corrected 4 of 5 estimate action names | `_evidence/phase-2/action-inventory.md` |
| WP-P2-03 (Invalidation audit) | ✅ CLOSED — NO ACTION. 44 sites all OK. | `_evidence/phase-2/invalidation-audit.md` |
| WP-P3-04 (AddComponentModal audit) | ✅ CLOSED — NO ACTION. Plan over-counted hooks (15/5, not 16/6). All effects SYNC. Modal not on hot path. | `_evidence/phase-3/add-component-modal-effect-audit.md` |

### Critical plan corrections surfaced by baselines

1. **Phase 1 index shape was wrong.** The plan proposed `(workspace_id, created_at DESC)`. Actual hot-path queries ORDER BY `updated_at` (lines 1405-1406 and 2044-2045 of `workspace-repository.ts`; current as of 2026-07-05). Corrected to `(workspace_id, updated_at DESC)`. The 2 of 3 proposed indexes on `created_by` are disproven (no SQL filter uses `created_by`). Migration collapses to a single 1-line `CREATE INDEX`.
2. **Phase 2 estimate action names were wrong.** `loadEstimateSheet` → `fetchEstimateTree`; `createEstimateRow` → `insertEstimateRowItemFromLibrary`; `updateEstimateRow` → `updateEstimateRowItem`; `deleteEstimateRow` → `deleteEstimateRowItem`. Only `reorderEstimateNodes` was close (actual: `reorderEstimateTreeNodes`). All 5 library action names verified correct.
3. **WP-P2-03 can be closed.** All 44 invalidation sites use narrow `estimateQueryKeys.detail/tabTree/areaTree` keys. The plan's hypothesis ("broad `['estimates']` keys") does not apply.
4. **WP-P3-04 can be closed.** All 5 effects in AddComponentModal are SYNC (ref-mirroring + focus + cleanup). Component is a modal, not on per-keystroke hot path.

### Updated phase readiness (supersedes §6 for phases where baselines landed)

| Phase | Pre-baseline (§6) | Post-baseline (this section) | Next step to IMPLEMENTATION-READY |
|---|---|---|---|
| Phase 1 | NOT READY | **CONDITIONALLY READY** — EXPLAIN confirms missing index, corrected shape accepted | Owner accepts corrected `(workspace_id, updated_at DESC)` migration; 1-line `CREATE INDEX`, additive-only |
| Phase 2 (WP-P2-01 prep) | NOT READY | **CONDITIONALLY READY for action names** — 10 actions verified, top target = `loadCurrentWorkspaceComponentLibrary` | Run PERF_TRACE=1 baselines per WP-P2-01 (needs `bun run cf:preview` + Playwright) |
| Phase 2 (WP-P2-02 refactors) | NOT READY | NOT READY — needs PERF_TRACE timing data | Awaits WP-P2-01 PERF_TRACE artifacts |
| Phase 2 (WP-P2-03 audit) | NOT READY | **CLOSED — NO ACTION** | None |
| Phase 3 (WP-P3-01 bundle) | NOT READY | **CLOSED — TARGET MET** — all 40 routes measured via Turbopack-native `.next/diagnostics/route-bundle-stats.json`; all under 350 KB gzipped first-load target | None needed — see `_evidence/phase-3/bundle-baseline-20260705/source-attribution.md` |
| Phase 3 (WP-P3-02/03 Profiler) | NOT READY | NOT READY — needs React Profiler traces on estimate editor | Run dev server with Profiler enabled against 100-row × 5-col fixture (per WP-P3-02) |
| Phase 3 (WP-P3-04 AddComponentModal) | NOT READY | **CLOSED — NO ACTION** | None |
| Phase 4 | NOT READY | NOT READY — still depends on Phase 1-3 baselines | Awaits Phase 1 promotion + Phase 2 PERF_TRACE + Phase 3 analyzer |

### Decision points for Philip

The baselines reduced the plan's complexity substantially. Three paths forward:

1. **Implement Phase 1 only** (recommended, smallest-coherent-change / ponytail). Apply the corrected 1-line additive index migration locally + remotely, re-run EXPLAIN-after, run `cf:d1-runtime-proof`. Defer Phases 2-4. Estimated effort: 2 hours. **Zero UI/UX changes.** Zero authz changes.
2. **Implement Phase 1 + Phase 2 PERF_TRACE capture** (medium). Adds the WP-P2-01 PERF_TRACE baselines for the 10 verified actions. Estimated effort: 1 day. Still zero source changes — measurement-only.
3. **Full plan** (heavy). Implement Phase 1 + Phase 2 + Phase 3 + Phase 4. Requires React Profiler traces + Turbopack-native bundle diagnostics (via `.next/diagnostics/route-bundle-stats.json`) + CI gate. Estimated effort: 7-12 days per plan §4.

**Recommendation: Path 1.** Phase 1 alone addresses the highest-impact finding (D1 round-trips dominate Worker request latency) at the smallest blast radius. Phase 2 / 3 baselines can proceed in parallel without blocking Phase 1 ship.

### Concurrent-agent safety

- All work confined to `.ai/03_plans/2026-07-04-Performance-Optimization/_evidence/`.
- Zero source files modified (verified via `git diff --name-only -- src/ migrations/ package.json next.config.ts worker.ts wrangler.jsonc` → empty).
- Zero remote D1 mutations (all EXPLAIN queries used `--local`).
- Concurrent agent activity observed: `.ai/03_plans/2026-07-02-API-Rate-Limiting-Security-Consolidation/README.md` was modified during this pass — different plan, no conflict.

### Santa-loop round 1 → round 2 fixes (2026-07-05)

After the first implementation pass shipped Phase 1 (authz batched fix + migration), an independent Codex Reviewer B (santa-loop) returned **NAUGHTY** with 5 critical issues. Round 2 fixes applied:

1. **Fail-closed parity restored** — `filterAccessibleSidebarProjectIds` now wraps the batched SQL in try/catch returning `[]` on error, preserving the `runAllowedProbe` contract from `src/lib/authz/d1-access.ts:27-38`.
2. **`PERF_BUDGET_STRICT=1` env var honored** — `scripts/check-performance-budgets.mjs` now treats both `--strict` arg and `PERF_BUDGET_STRICT=1` env as strict mode.
3. **Overage math fixed** — was `(r.gzKb / 1024 - BUDGET_KB)` (double-divided); corrected to `(r.gzKb - BUDGET_KB)`.
4. **`ProfileRow` import removed** — test now uses a local `TestProfileRow` type matching only the fields exercised (`id`, `role`), avoiding the file-private-type import.
5. **Stale evidence corrected** — `bundle-baseline-20260705/baseline.md` no longer claims "no analyzer wired" (the analyzer IS wired, it just no-ops under Turbopack). Migration SQL line refs corrected (1398→1405, 2034→2044) to match current line numbers.
6. **Two regression tests added** — fail-closed parity test (D1-outage scenario) + platform-admin-no-SQL test.

### Scope clarification on ship commit `73fe69019`

Philip committed the Phase 1 source changes (migration `0031_performance_indexes_additive.sql`, the batched authz rewrite in `workspace-repository.ts`, and the two test files) as part of broader commit `73fe69019 "Make project-group ordering deployable on D1"` (2026-07-05 12:39 +0800). That commit **also** contains unrelated project-group work (migration `0032_project_group_membership_positions.sql`, UI changes in `src/components/workshop/ProjectGroupSection.tsx`, `LiveProjectCard.tsx`, `projects-page-client.tsx`, and `globals.css`). The UI changes in that commit are **not** part of this performance plan — they are the project-group-ordering feature work. The perf-plan-attributable changes are scoped properly within the commit (the 4 perf files); reviewers evaluating "no UI changes" should diff `73fe69019` filtered to only the perf-plan file paths.

