# Software-Wide Error Handling Plan

**Date:** 2026-06-28
**Status:** IMPLEMENTATION-READY (planning/audit only — no code, tests, migrations, provider state, or runtime data changed in this pack)
**Profile:** standard (cross-cutting infra, bounded blast radius, MVP pre-launch)
**Scope:** planning, audit, and readiness only.
**Verification mode:** `independent-council-improved` (the original pack was lead-authored; this 2026-06-28 Codex pass used native read-only council reviewers plus a final verifier gate before completion — see `13_FINAL_AUDIT_SCORECARD.md`).

## Master result

Establish the first coherent software-wide error-handling layer for Archestimator so that every runtime failure — on client, server action, route handler, middleware, edge runtime, or auth callback — flows through one typed taxonomy, surfaces to the user via the existing Toast primitive with consistent tone+copy, and emits a structured NDJSON log record that a human or AI coding agent can tail in dev mode and root-cause without further instrumentation.

The four product outcomes the plan delivers:

1. **Typed AppError hierarchy** that every throw site and every server-action return uses. The user always sees a toast with a known tone and safe copy; the server always logs the real cause with full context.
2. **Structured NDJSON logging** in dev mode, written to a known file path that an AI agent can `tail -f` and parse — purpose-built for AI-agent-driven development.
3. **Production observability** via `instrumentation.ts` `onRequestError` + Sentry (chosen for free-tier fit + Next.js 16 first-class integration + private source-map upload), with Vercel Log Drain still deferred until first paying user.
4. **No regression** to existing Toast API, auth callback audit pattern, RLS, migrations, Vercel region, or pre-existing red tests.

## Package map

| File | Purpose |
|---|---|
| `LOOP_LEDGER.md` | In-session DISCOVER→PLAN→EXECUTE→VERIFY→RECORD→DECIDE loop state per `AGENT_OPERATING_PROTOCOL.md`. |
| `00_AGENT_COORDINATION.md` | Master goal, lane assignments, framework routing, skill discipline. |
| `01_SOURCE_AUDIT.md` | Current client + server + infra error-handling inventory, grounded in real file paths. |
| `02_INDUSTRY_RESEARCH.md` | Next.js 16, React 19, Sentry, OTel logs, GenAI observability — with source URLs. |
| `03_ERROR_TAXONOMY_AND_TOAST_PLAN.md` | Typed `AppError` hierarchy, tone+copy mapping per class. |
| `04_LOGGING_PIPELINE_AND_AI_LOOP.md` | Dev NDJSON schema + file path + AI tail command; prod forwarder choice. |
| `05_ARCHITECTURE_AND_TECH_DESIGN.md` | Logger location, Server Action wrapper, route handler wrapper, boundary tree. |
| `06_SECURITY_PRIVACY_THREAT_MODEL.md` | PII redaction, OWASP log risks, source-map handling. |
| `07_REQUIREMENTS_SPEC.md` | Stable requirement IDs (`FR-*`, `ARCH-*`, `LOG-*`, `OBS-*`, `SEC-*`, `UX-*`, `A11Y-*`, `TEST-*`). |
| `08_IMPLEMENTATION_PLAN.md` | Phased plan with ultragoal-style per-phase contract. |
| `09_TEST_QA_ULTRAQA_PLAN.md` | Test execution matrix + adversarial scenarios. |
| `10_ROLLOUT_ROLLBACK_OPS.md` | Feature flags, rollout rings, runbook. |
| `11_RISKS_DECISIONS_ALTERNATIVES.md` | Risk register + ADRs with rejected alternatives. |
| `12_TRACEABILITY_AND_READINESS_REVIEW.md` | Requirement-to-source-to-test traceability; readiness verdict. |
| `13_FINAL_AUDIT_SCORECARD.md` | Requirement-by-requirement scorecard + verification mode declaration. |

## Phase order

```
P1 — Foundation: typed AppError + logger module (no behavior change; pure addition)
   ↓
P2 — Server unification: actionErrors wrapper applied to all 22 server action modules + 22 route handlers
   ↓
P3 — Client wiring: error.tsx uses AppError; add root global-error.tsx; Toast copy catalog
   ↓
P4 — Dev logging pipeline: NDJSON file writer + PERF_TRACE integration + AI tail command
   ↓
P5 — Prod observability: instrumentation.ts onRequestError + Sentry integration behind flag
   ↓
P6 — Verification: targeted vitest + Playwright smoke + adversarial + AI-diagnosability test
```

Dependency graph: P1 is the prerequisite for all later phases. P2/P3 are independent after P1. P4 depends on P1 only. P5 depends on P1 + P4 (logger interface). P6 depends on all prior.

## Stop condition

This plan is complete when an implementer can:
- Build the AppError hierarchy + logger module without re-litigating the taxonomy.
- Apply the wrapper to server actions knowing exactly which 22 files + which return shape is canonical.
- Add `global-error.tsx` + `instrumentation.ts` knowing the exact contract.
- Tell an AI coding agent the dev log path + tail command and have it diagnose a real failure end-to-end.

## Files off-limits (hold-harmless)

- `src/components/ui/toast.tsx` — preserve existing `toast({id?, message, tone, durationMs?})` API surface; only extend, never rename.
- `src/app/providers.tsx` ToastProvider mount — unchanged.
- `src/lib/auth/error-mapping.ts` and the auth callback audit pattern — unchanged (the plan *extends* it via AppError, never replaces).
- `src/middleware.ts` / `src/proxy.ts` — runtime behavior unchanged; only error-context enrichment.
- All Supabase migrations (67 files) — no schema changes planned.
- All RLS policies — no policy changes planned.
- `vercel.json` regions/crons — unchanged.
- `next.config.ts` CSP / headers / redirects — unchanged.
- `.github/workflows/*` — may add a step in P5, but no removal/rewrite of existing.

## Files and systems intentionally unaffected

- `src/lib/supabase/*` generated types (no schema change).
- `src/lib/perf/server-timing.ts` (the plan *uses* it as foundation, not modify).
- All Storybook stories (`src/stories/*`).
- All existing vitest DOM tests + Bun unit tests + Playwright E2E specs.
- The landing page A/B testing infrastructure.
- `data/local/*` seed/runtime JSON.

## External proof that remains required before production rollout

- Sentry DSN procurement + next.config sourcemap upload verification (P5 task).
- Vercel Log Drain configuration for prod JSONL forwarding after first paying user (deferred; not a P5 blocker).
- PII review pass on the dev NDJSON schema with a real auth-failure log line in hand (P4 task).

## Archive policy

Archive `.ai/03_plans/2026-06-28-Sofware-Wide-Error-Handling/` to `.ai/09_archive/` once:
- P1–P6 are implemented and committed, AND
- The dev JSONL → AI diagnose loop is proven end-to-end on a real failure, AND
- The prod Sentry integration is live and the first real production error appears in the dashboard with a useful stack trace.

Until then, this plan stays in `03_plans/` as the active reference.

## Pre-implementation commands

Before any code edit in P1, an implementer must run:

```bash
git status --short --branch           # inspect branch and preserve unrelated worktree changes
bun run type-check                    # confirm baseline tsc green
bun run lint                          # confirm baseline ESLint green
```

If type-check or lint fails before implementation, stop and characterize the baseline failure before editing. The worktree does not need to be clean; unrelated local changes must be preserved.
