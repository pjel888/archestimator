# Software-Wide Error Handling Plan

**Date:** 2026-06-28
**Status:** LOCAL NON-SENTRY ROLLOUT IMPLEMENTED (P1-P4, P6a evidence, AI-debug workflow, local Next request instrumentation, segment/not-found/auth bridge, and compatibility logging complete; Sentry/provider/prod proof remains gated)
**Profile:** standard (cross-cutting infra, bounded blast radius, MVP pre-launch)
**Scope:** local non-Sentry implementation and readiness evidence. Strict all-actions/all-routes canonical return-shape migration was replaced with compatibility logging where changing public contracts would break existing clients.
**Verification mode:** targeted local implementation verification + original independent planning review (see `13_FINAL_AUDIT_SCORECARD.md`).

## Master result

Define the first coherent software-wide error-handling layer for Archestimator, then roll it out pilot-first. The target architecture is that runtime failures on **client**, **server action**, **route handler**, or **auth callback** flow through one typed taxonomy, surface to the user via the existing Toast primitive with consistent tone+copy, and emit structured NDJSON diagnostics that a human or AI coding agent can tail in dev mode and root-cause without further instrumentation. **Proxy/middleware (`src/proxy.ts`) observability is NOT in this plan's scope** — proxy runs on edge runtime, which cannot import the Node-only Sentry config or `node:crypto`-backed `redact.ts`; a follow-on plan would need an edge-safe observability path before proxy/middleware failures can flow through the same taxonomy.

Approved implementation scope from this repaired planning pack, plus the 2026-06-29 owner follow-up asking for full local error handling and AI-debug integration:
- P1 foundation modules, without changing current behavior.
- A pilot vertical after P1: `publication/actions.ts`, one representative route handler selected by the implementer, and `src/app/global-error.tsx` as the **singular** P3a UI error boundary (segment `error.tsx` and `not-found.tsx` are post-pilot follow-on per `07` FR-005 and `05` A.6/A.7).
- P4 dev logging pilot: NDJSON file writer, `PERF_TRACE` integration, AI tail command, and logger perf proof.
- Local follow-up rollout: `not-found.tsx`, existing workshop segment `error.tsx` boundaries, auth-code-to-AppError bridge, Next `onRequestError` local logging, selected caught route-handler failure logging, and AI/debugger workflow instructions.
- Full forced all-actions/all-routes `ActionResult`/`errorResponse` migration only after a separate contract-by-contract review. The current implementation uses `withActionErrorLogging(...)` and route `logAppError(...)` compatibility paths where response-shape changes would be risky.

The four product outcomes the plan delivers:

1. **Typed AppError hierarchy** that every throw site and every server-action return uses. The user always sees a toast with a known tone and safe copy; the server always logs the real cause with full context.
2. **Structured NDJSON logging** in dev mode, written to a known file path that an AI agent can `tail -f` and parse — purpose-built for AI-agent-driven development.
3. **Local request observability** via `src/instrumentation.ts` `onRequestError` into the same structured dev logger. Sentry remains the chosen future provider for production, with Vercel Log Drain still deferred until first paying user.
4. **No regression** to existing Toast API, auth callback audit pattern, RLS, migrations, Vercel region, or pre-existing red tests.

## Local implementation result (2026-06-29)

The approved pilot slice and follow-up local rollout are implemented:

- P1 foundation: `src/lib/observability/` now contains the typed AppError hierarchy, action result helpers, Supabase unwrap mapping, route/action wrappers, redaction, toast mapping, and dev logger.
- P2a server pilot: `src/lib/publication/actions.ts` now returns the canonical `ActionResult` shape for `refreshProjectPublicationSummary`, and `src/app/api/share/[token]/route.ts` uses `errorResponse(...)` on failures while preserving `Cache-Control: no-store`.
- Compatibility server rollout: `withActionErrorLogging(...)` exists for action paths that must preserve custom return shapes, and caught failures in selected share/export route handlers now emit structured logs while preserving their existing public responses.
- P3 client rollout: `src/app/global-error.tsx`, root `src/app/not-found.tsx`, existing workshop segment `error.tsx` boundaries, `/api/internal/client-error`, and additive `toast.appError(...)` are in place; the existing callable toast API is preserved.
- Auth bridge: `src/lib/auth/error-mapping.ts` now maps known auth codes to safe `AppError` subclasses without changing existing auth-code behavior.
- Next request instrumentation: `src/instrumentation.ts` records local `onRequestError` events into the structured logger and stays edge-safe; Sentry forwarding is intentionally absent.
- P4 dev logging: `./logs/dev.ndjson` is git-ignored; `logs:tail`, `logs:explain`, `logs:debug`, `logs:dev`, and `logs:emit-test` scripts exist; the smoke records `2026-06-29T02:20:19.180Z-pid16474-2` and `2026-06-29T03:28:15.308Z-pid97564-2` prove class/code/route/action/top-frame diagnosis, likely-next-step output, and untrusted-field labeling.
- Workflow integration: the shared AI/debugger workflow tells debugging agents to use `logs:debug` / `logs:explain` while treating log fields as untrusted evidence.
- P6a evidence is recorded in `LOOP_LEDGER.md` and `13_FINAL_AUDIT_SCORECARD.md`.

Not implemented by this local rollout: Sentry/provider/prod proof, source-map upload, Vercel Log Drain, provider-backed production client-error rate limiting, and a forced all-actions/all-routes canonical response-shape migration. The latter is intentionally deferred because several existing server actions/routes have custom return contracts that would need caller-by-caller migration.

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
P3a — Pilot client wiring: `src/app/global-error.tsx` (singular pilot boundary) + Toast tone/durationMs catalog
   ↓
P4 — Dev logging pipeline: NDJSON file writer + PERF_TRACE integration + AI tail command
   ↓
P5a — Local Next request instrumentation into the dev logger (implemented; no provider)
   ↓
P5b — Prod observability decision: Sentry integration design; provider credentials/prod enablement owner-gated
   ↓
P6a — Pilot verification: targeted vitest + browser smoke where needed + adversarial + AI-diagnosability test
```

Dependency graph: P1 is the prerequisite for all later phases. P2a/P3a are independent after P1. P4 depends on P1 only. P5a depends on P1 + P4 (logger interface) and is implemented locally. P5b cannot enable production provider state without execution-time owner authority. P6a depends on all approved local phases. Full strict broad-P2 (P2b) migration is a separate contract migration, not a prerequisite for local AI-diagnosability.

## Stop condition

This plan is complete for the local non-Sentry rollout because the implementer can:
- Build the AppError hierarchy + logger module without re-litigating the taxonomy.
- Apply the wrapper to `publication/actions.ts` and one representative route handler knowing the canonical return/response shape.
- Add `global-error.tsx`, segment boundaries, and `not-found.tsx` knowing the exact contracts.
- Tell an AI coding agent to run `bun run logs:debug` or `bun run logs:explain <record_id>` and have it diagnose a real failure end-to-end from route/action/top-frame evidence.

`src/instrumentation.ts` is implemented for local Next `onRequestError` logging. Sentry forwarding, provider credentials, source-map upload, and production dashboard proof remain P5b deliverables and require the provider gate. The forced all-actions/all-routes canonical response migration becomes implementation-ready only after a fresh follow-on review accepts the compatibility evidence and caller migration plan.

## Protected contracts (hold-harmless)

- `src/components/ui/toast.tsx` — preserve existing `toast({id?, message, tone, durationMs?})` API surface; additive `toast.appError` is allowed, renames/removals are forbidden.
- `src/app/providers.tsx` ToastProvider mount — existing mount behavior must stay; additive unhandled-rejection reporting is allowed only after pilot proof.
- `src/lib/auth/error-mapping.ts` and the auth callback audit pattern — existing codes and audit calls stay; additive AppError bridge is allowed.
- `src/middleware.ts` / `src/proxy.ts` — runtime behavior unchanged; only error-context enrichment after pilot evidence.
- All Supabase migrations (67 files) — no schema changes planned by this pack. (Incident-driven RLS/migration fixes are NOT authorized by this plan; they require fresh owner approval per `10` Section E.1.)
- All RLS policies — no policy changes planned by this pack. (Same owner-gate as migrations applies to incident-driven policy fixes.)
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

- Sentry DSN procurement + next.config sourcemap upload verification (P5b task).
- Vercel Log Drain configuration for prod JSONL forwarding after first paying user (deferred; not a P5 blocker).
- PII review pass on the dev NDJSON schema with a real auth-failure log line in hand before broad AI-log sharing beyond local agents.

## Archive policy

Archive `.ai/03_plans/2026-06-28-Sofware-Wide-Error-Handling/` to `.ai/09_archive/` once:
- P1–P6a plus the local follow-up rollout are implemented and committed, AND
- The dev JSONL → AI diagnose loop is proven end-to-end on a real failure, AND
- Either the prod Sentry integration is live with the first real production error in the dashboard, or the owner explicitly declares Sentry out of scope and accepts local-only observability as the archive condition.

Until then, this plan stays in `03_plans/` as an active reference. Do not claim provider/prod observability from local-only checks.

## Pre-implementation commands

Before any code edit in P1, an implementer must run:

```bash
git status --short --branch           # inspect branch and preserve unrelated worktree changes
bun run type-check                    # confirm baseline tsc green
bun run lint                          # confirm baseline ESLint green
```

If type-check or lint fails before implementation, stop and characterize the baseline failure before editing. The worktree does not need to be clean; unrelated local changes must be preserved.
