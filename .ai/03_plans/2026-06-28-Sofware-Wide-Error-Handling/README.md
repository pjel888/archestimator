# Software-Wide Error Handling Plan

**Date:** 2026-06-28
**Status:** CONDITIONALLY READY (planning/audit only — no code, tests, migrations, provider state, or runtime data changed in this pack)
**Profile:** standard (cross-cutting infra, bounded blast radius, MVP pre-launch)
**Scope:** planning, audit, and readiness only.
**Verification mode:** `independent` (council-improved: the original pack was lead-authored; this 2026-06-28 Codex pass used native read-only council reviewers plus a final verifier gate before completion — see `13_FINAL_AUDIT_SCORECARD.md`).

## Master result

Define the first coherent software-wide error-handling layer for Archestimator, then roll it out pilot-first. The target architecture is that runtime failures on client, server action, route handler, middleware, edge runtime, or auth callback flow through one typed taxonomy, surface to the user via the existing Toast primitive with consistent tone+copy, and emit structured NDJSON diagnostics that a human or AI coding agent can tail in dev mode and root-cause without further instrumentation.

Approved implementation scope from this repaired planning pack:
- P1 foundation modules, without changing current behavior.
- A pilot vertical after P1: `publication/actions.ts`, one representative route handler selected by the implementer, and one root/segment UI error surface.
- P4 dev logging pilot: NDJSON file writer, `PERF_TRACE` integration, AI tail command, and logger perf proof.
- Full all-actions/all-routes migration only after pilot evidence is captured and this plan is upgraded.

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
P2a — Pilot server unification: publication/actions.ts + one representative route handler
   ↓
P3a — Pilot client wiring: one root/segment error surface + Toast copy catalog
   ↓
P4 — Dev logging pipeline: NDJSON file writer + PERF_TRACE integration + AI tail command
   ↓
P5 — Prod observability decision: Sentry integration design; provider credentials/prod enablement owner-gated
   ↓
P6a — Pilot verification: targeted vitest + browser smoke where needed + adversarial + AI-diagnosability test
```

Dependency graph: P1 is the prerequisite for all later phases. P2a/P3a are independent after P1. P4 depends on P1 only. P5 depends on P1 + P4 (logger interface) but cannot enable production provider state without execution-time owner authority. P6a depends on all approved pilot phases. Full P2/P3 migration is a follow-on plan update after pilot pass.

## Stop condition

This conditionally ready plan is complete for the approved pilot when an implementer can:
- Build the AppError hierarchy + logger module without re-litigating the taxonomy.
- Apply the wrapper to `publication/actions.ts` and one representative route handler knowing the canonical return/response shape.
- Add `global-error.tsx` + `instrumentation.ts` knowing the exact contract.
- Tell an AI coding agent the dev log path + tail command and have it diagnose a real failure end-to-end.

The all-actions/all-routes migration becomes implementation-ready only after the pilot evidence is recorded and this pack is updated.

## Protected contracts (hold-harmless)

- `src/components/ui/toast.tsx` — preserve existing `toast({id?, message, tone, durationMs?})` API surface; additive `toast.appError` is allowed, renames/removals are forbidden.
- `src/app/providers.tsx` ToastProvider mount — existing mount behavior must stay; additive unhandled-rejection reporting is allowed only after pilot proof.
- `src/lib/auth/error-mapping.ts` and the auth callback audit pattern — existing codes and audit calls stay; additive AppError bridge is allowed.
- `src/middleware.ts` / `src/proxy.ts` — runtime behavior unchanged; only error-context enrichment after pilot evidence.
- All Supabase migrations (67 files) — no schema changes planned.
- All RLS policies — no policy changes planned.
- `vercel.json` regions/crons — unchanged.
- `next.config.ts` CSP / headers / redirects — unchanged; Sentry config additions require P5 owner/provider gate.
- `.github/workflows/*` — no removal/rewrite of existing; sourcemap upload step requires P5 owner/provider gate.

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
- P1–P6a are implemented and committed, AND
- The dev JSONL → AI diagnose loop is proven end-to-end on a real failure, AND
- The prod Sentry integration is live and the first real production error appears in the dashboard with a useful stack trace.

Until then, this plan stays in `03_plans/` as a conditionally ready reference. Upgrade it to `IMPLEMENTATION-READY` only after the P1+pilot slice passes and a fresh independent review accepts the full migration.

## Pre-implementation commands

Before any code edit in P1, an implementer must run:

```bash
git status --short --branch           # inspect branch and preserve unrelated worktree changes
bun run type-check                    # confirm baseline tsc green
bun run lint                          # confirm baseline ESLint green
```

If type-check or lint fails before implementation, stop and characterize the baseline failure before editing. The worktree does not need to be clean; unrelated local changes must be preserved.
