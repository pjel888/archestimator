# Workshop Pages Routing & Performance — Plan Pack

**Date:** 2026-07-09 (revised, Improve-Plan-Prompt cycle 1)
**Plan status:** `CONDITIONALLY READY` (verification_mode: `emulated` — behavior-bearing package; needs real independent verifier or owner acceptance for `IMPLEMENTATION-READY`)
**Owner:** Philip Lewis
**Profile:** `standard` (frontend/routing-focused; no DB/provider/migration scope)

---

## TL;DR — the headline finding

**The user's hypothesis ("should `/workshop/proposals` become flat `/proposals` for performance?") is the wrong lever.** Next.js App Router nesting is *not* the cause of the perceived slowness, and flattening the URL would make it *worse* (lose shared layout + SPA transitions), not better.

The real root causes of the "workshop skeleton flashes when loading `/workshop/proposals`" are three local architectural facts:

1. **The workshop chrome is NOT rendered by `workshop/layout.tsx`.** The layout is a pure auth/terms gate that returns bare `children`. Every top-level workshop page renders its own `WorkshopPageShell` (which mounts `MainSidebar`), and every top-level `loading.tsx` renders its own `StaticWorkshopLoadingShell` (also mounts `MainSidebar`). **Result: the entire shell + sidebar unmounts and remounts on every cross-page navigation.** This is the dominant cost, and it has nothing to do with the URL shape.
2. **`workshop/layout.tsx` calls uncached `await headers()` (plus conditional DB/auth reads).** With `cacheComponents` OFF, the installed Next.js 16 docs are explicit: a layout that reads request-time data *blocks navigation* and *suppresses its own `loading.tsx` fallback*.
3. **The full-page skeleton (`workshop/loading.tsx`, 9.3 KB) can appear on full page loads / hard refreshes / direct entry** to `/workshop/proposals`.

> **⚠️ Security correction this cycle (P0):** The original draft mischaracterized the auth/terms gate as a "backstop" behind middleware. Verified from source — it is the **sole production auth+terms verifier**. The gate MUST stay synchronous-first; Phase 2 was rewritten accordingly. See `08_SECURITY_PRIVACY_THREAT_MODEL.md`.

See `03_SOURCE_AND_CODEBASE_AUDIT.md` §"Root-cause analysis" for the doc-cited mechanism.

---

## Master goal

Produce an implementation-ready plan that (a) answers the routing-shape question with doc-backed evidence, (b) identifies the *real* performance levers, and (c) gives a phased, dependency-aware implementation path to make workshop cross-page navigation feel instant and shell-stable. **No application code is changed by this plan pack** (planning-only).

### Non-goals
- Changing public/marketing routes, share/invite routes, or the auth provider.
- Any D1/R2/Durable Object/Queue/migration change.
- Any Git branch/worktree operation.
- React Compiler / View Transitions (explicit non-goals — see 18/20).

---

## Plan status and start document

- **Status:** `CONDITIONALLY READY` (emulated verification on a behavior-bearing package → capped per Improve-Plan-Prompt:77-85). Phases 1–3 are fully specified and executable; `IMPLEMENTATION-READY` requires (1) a real independent verifier OR owner acceptance, (2) ~~DEC-01 owner ack~~ **RESOLVED 2026-07-10 — Philip acked Option 1 (keep nested)**, (3) Phase 0 baseline.
- **Implementation start document:** `11_IMPLEMENTATION_PLAN.md`.
- **Phase order:** Phase 0 (verify baseline) → Phase 1 (shell split + migrate pages + reconcile nested + tests) → Phase 2 (gate-doc comment) → Phase 3 (content skeletons) → Phase 4 (optional cacheComponents).

### Dependency graph
```
Phase 0 (baseline measurement)
   └─> Phase 1 (WorkshopShell + WorkshopRouteHeader split + page migration + nested reconciliation + test updates)  [critical fix]
          └─> Phase 2 (document gate as intentional; no defer)
                 └─> Phase 3 (content-only skeletons for all leaves)
                        └─> Phase 4 (optional cacheComponents + <Activity> eval, owner-gated)
```

---

## Blocked decisions table

| Decision | Owner | Status | Notes |
|---|---|---|---|
| Keep `/workshop/*` nested URLs vs flatten (DEC-01) | Philip | **RESOLVED 2026-07-10 — acked Option 1 (keep nested).** | Doc-backed; flattening loses shared-layout reuse + SPA transitions (`15_DECISIONS…md`). |
| `sidebarStatus` data-flow: client store vs layout fetch (OPEN-1) | impl lead | Default: client store | Minor; reuses existing nav store. |
| Enable `cacheComponents` + `unstable_instant` (DEC-04) | Philip | Phase 4 optional, owner-gated | Build-time instant-nav validation; separate change. |
| Upgrade to `IMPLEMENTATION-READY` | Philip / verifier | Needs independent verifier OR owner acceptance | Emulated cap on behavior-bearing package. |

---

## Files explicitly off-limits during implementation
- `supabase/migrations/*` (legacy; never active).
- Any Cloudflare binding/migration: `wrangler.jsonc`, `migrations/*`, `cloudflare-env.d.ts`.
- `src/middleware.ts`, `src/lib/auth/request-proxy.ts` auth-gate logic (gate logic in `workshop/layout.tsx` stays synchronous-first — see 08).
- React Compiler / View Transitions config (non-goals).

## Files/systems intentionally unaffected
- Auth/terms gating behavior (must be preserved exactly).
- Share/invite/public routes.
- D1/R2/DO/Queue/Email.

## External proof required before production rollout
- None mandatory for Phases 1–3 (client-perceived performance; existing e2e perf harness + lab CWV is the declared evaluator). Prod RUM for CWV is a flagged gap (P2-1), recommended as a follow-up.

## Archive policy
Archive after full implementation completion. Do not auto-archive slices.

---

## Document index (revised pack)

| Doc | Purpose | Status |
|---|---|---|
| `00_AGENT_COORDINATION.md` | Goal, orchestration, ledger | — |
| `01_INVENTORY_AND_SCORECARD.md` | **NEW** — inventory, baseline scores, findings register | — |
| `README.md` | This entrypoint | — |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, scope, non-goals | — |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Current architecture, file map, root-cause, doc cites | line-cite fixed; SEC note added |
| `04_REQUIREMENTS_SPECIFICATION.md` | Requirements + acceptance | SEC-1 corrected |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | **NEW** — state matrix + a11y proof matrix | — |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current vs target + route cache contracts | P0-3/P0-4 resolved; contracts added |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | **NEW** — threat model; corrects P0-2 | — |
| `09_PERFORMANCE…` | Perf evaluator + CWV/bundle/bfcache | upgraded |
| `10_BLAST_RADIUS…` | Impact map | — |
| `11_IMPLEMENTATION_PLAN.md` | Phased units w/ IDs + concrete contracts | rewritten |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix + breaking-test inventory | upgraded |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | **NEW** — go/no-go, rollback, ops | — |
| `14_RISK_REGISTER.md` | Risks | RISK-2 corrected |
| `15_DECISIONS…` | Decisions | DEC-03 resolved |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | **NEW** — traceability + proof-contract rows | — |
| `17_FINAL_READINESS_REVIEW.md` | Scores + verdict (CONDITIONALLY READY) | rewritten |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | **NEW** — stack/config/boundary contracts | — |
| `19_RESEARCH…` | Doc research + QA matrix | — |
| `20_INDUSTRY_STANDARD_FACETS_ANALYSIS.md` | **NEW** — INP/CLS/bfcache/ViewTransitions/ReactCompiler/route-config | — |

---

## Stale-plan revalidation checklist (re-run before implementing)
- [ ] Confirm `next` still 16.x and `cacheComponents` still OFF (`next.config.ts` experimental block ~lines 93-106).
- [ ] Confirm `workshop/layout.tsx` still does NOT render the shell; gate still synchronous-first.
- [ ] Confirm `WorkshopPageShell`/`StaticWorkshopLoadingShell` still each render `MainSidebar`.
- [ ] Confirm `experimental.staleTimes` unchanged.
- [ ] Confirm `tests/vitest/project-dashboard-route-shell-ui.test.ts` assertions still as described (WP-1.7).
- [ ] Re-read `11_IMPLEMENTATION_PLAN.md` task paths + the consumer list against current `src/app/workshop/` tree.

## Commands to run before the first edit
```bash
git status --short --branch
bun run type-check
rg -l "WorkshopPageShell" src/app/workshop --glob "*.tsx"   # confirm consumer list
```
