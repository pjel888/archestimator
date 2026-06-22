# Overall Site Performance & Optimization — Audit Pack

**Date:** 2026-06-14
**Status:** **AUDIT / PLANNING / READINESS ONLY** — not an implementation.
**Readiness decision:** **CONDITIONALLY READY FOR CLOSED BETA — not for public launch.**
**Scope:** whole-app performance, speed, perceived latency, bundle weight, DB/API efficiency, and production-readiness for Archestimator (Next.js 16 / React 19 / Bun / Supabase-Postgres / Vercel).

---

## Purpose

A source-grounded performance audit + optimization-readiness plan for the **whole app**. It
identifies where Archestimator is slow and why, reconciles the 5+ pre-existing performance plans
against the live code, proposes a readiness-grade speed matrix + budgets, lays out an owner-gated
phased backlog, and renders an honest readiness decision. It is built to be acted on without
repeating already-completed work and without mistaking loose smoke budgets for readiness.

## Explicit non-goals

- **No** application source changed, **no** dependencies added, **no** migrations created.
- **No** Supabase / Vercel / GitHub / DNS / env / provider / secret mutations.
- **No** destructive DB commands, **no** deploy, **no** promote, **no** production mutation.
- Documentation + planning artifacts only, all inside this folder. (See `_STATUS.md`.)

## Files in this pack

| # | File | What it is |
|---|------|-----------|
| — | `_STATUS.md` | Generation status + concurrent-agent data-safety protocol |
| — | `README.md` | This file |
| — | `CURRENT_CANONICAL_PLAN.md` | **Single source of truth** for this pack |
| 00 | `00_EXECUTIVE_SUMMARY.md` | Honest whole-app posture + findings at a glance |
| 01 | `01_AUDIT_SCOPE_AND_METHOD.md` | Scope, method, evidence discipline, measurement environment |
| 02 | `02_REPO_AND_ARCHITECTURE_INVENTORY.md` | Full route/surface inventory + architecture risks |
| 03 | `03_ROUTE_SPEED_MATRIX.md` | Per-surface speed matrix (current vs target, all columns) |
| 04 | `04_RENDERING_STATE_AND_CLIENT_PERFORMANCE_AUDIT.md` | Client render/state/editor/tree/charts |
| 05 | `05_BUNDLE_JS_CSS_ASSET_AUDIT.md` | Bundle / JS / CSS / fonts / images (re-audited fresh) |
| 06 | `06_DATABASE_API_AND_SERVER_ACTION_PERFORMANCE_AUDIT.md` | Repositories, queries, server actions, APIs |
| 07 | `07_SUPABASE_RLS_RPC_QUERY_READINESS.md` | RLS / RPC / initplan / index readiness |
| 08 | `08_CACHING_PREFETCH_AND_ROUTE_TRANSITION_AUDIT.md` | Prefetch, overlay, cache, route transitions |
| 09 | `09_IMAGES_FONTS_THIRD_PARTIES_AND_ANALYTICS_AUDIT.md` | Images, fonts, GA/Clarity, Vercel analytics/RUM |
| 10 | `10_TESTING_AND_BENCHMARK_PROTOCOL.md` | What's measured vs not + the runnable protocol |
| 11 | `11_SPEED_MATRIX_TARGETS_AND_BUDGETS.md` | Budget critique + 3-tier readiness budgets |
| 12 | `12_OPTIMIZATION_BACKLOG.md` | Prioritized P0–P5 backlog (every item owner-gate/beta/measure flagged) |
| 13 | `13_RISK_REGISTER_AND_BLAST_RADIUS.md` | Risk register + do-not-touch surfaces + prior-plan reconciliation |
| 14 | `14_IMPLEMENTATION_PHASE_PLAN.md` | Phased plan with entry/exit gates + next prompt |
| 15 | `15_READINESS_DECISION.md` | The decision, blockers, wins, missing measurements, risks |
| 16 | `16_OPEN_QUESTIONS_OWNER_GATES.md` | Decisions only Philip can make |
| — | `evidence/README.md` | How to read the evidence layer |
| — | `evidence/command-log.md` | Brutally-honest command record (run + blocked) |
| — | `evidence/route-inventory.md` | Raw route + boundary coverage |
| — | `evidence/current-budgets.md` | Existing budgets + critique + readiness budgets |
| — | `evidence/findings-index.md` | Traceability: every finding ID → owning doc + evidence |

## Recommended reading order

1. `CURRENT_CANONICAL_PLAN.md` (the source of truth) → `00_EXECUTIVE_SUMMARY.md`
2. `15_READINESS_DECISION.md` (decision + next prompt) → `16_OPEN_QUESTIONS_OWNER_GATES.md`
3. `03_ROUTE_SPEED_MATRIX.md` + `11_SPEED_MATRIX_TARGETS_AND_BUDGETS.md` (the targets)
4. `12_OPTIMIZATION_BACKLOG.md` + `14_IMPLEMENTATION_PHASE_PLAN.md` (what to do)
5. Deep dives `02`, `04`–`10` as needed; `13_RISK_REGISTER` before touching anything.

## Readiness decision summary

Perceived-speed work a beta cohort hits first is **landed and confirmed** (route transitions +
the four 2026-06-14 surfaces). Readiness **proof** is missing: production RUM is off (and was
removed as a security fix), heavy authed surfaces are unmeasured, DB is unproven at scale
(`is_platform_admin` bare `auth.uid()`, indexes unbuilt, no seed-at-volume), and the only budgets
are loose smoke tripwires. Closed beta is the right gate — it produces the field RUM + at-scale
evidence that converts lab/inference into proof.

## Top findings (headline)

- **0 Critical / 18 High / 46 Medium / 32 Low** (96 total). Highs cluster in measurement/observability, not broken code.
- **RUM physically off** (AS01/GOV02) — the master unblock.
- **No readiness-grade budgets** (TG01) — smoke ≠ readiness.
- **Heavy authed surfaces unmeasured** (TG02/INV08) — editor/charts/project-detail.
- **DB unproven at scale + `is_platform_admin` bare `auth.uid()`** (RLS01/DB03/GOV03).
- **2.7MB `sidebar-BG.png` on every cold authed page** (AS04) — top no-regret win.

## Next action

Execute backlog **P0 (Measurement & Truth)** + owner-gate-free **P1 no-regret wins**. The exact
next prompt is at the end of `15_READINESS_DECISION.md`. **Do not implement from stale docs; do
not mutate production/provider/database from this plan.**
