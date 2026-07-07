# README — AI Safety Leakage And Provider Resilience

Plan folder: `.ai/03_plans/2026-07-07-ai-safety-leakage-and-provider-resilience`
Date: 2026-07-07 (Asia/Manila). Profile: **exhaustive**. Mode: **planning only** — no application code changed.

> **Improve pass applied.** This package was audited and upgraded by `Improve-Plan-Prompt.md`. Two new documents were added (`22_INVENTORY_AND_SOURCE_MAP.md`, `23_READINESS_SCORECARD.md`); the traceability matrix, security/data/test/UX/architecture/readiness/evidence documents were upgraded to the Improve-prompt's required artifact shapes (Source-strength + Gap/decision columns, Attack Surface Inventory, access-path matrix, proof contracts, action-level a11y matrix, route boundary/cache contract, verification matrix + evidence-class table). Status unchanged: **`CONDITIONALLY READY`** (emulated verification cap).

## Plan status

**`CONDITIONALLY READY`** (`verification_mode: emulated`; high-blast-radius cap per the Suite Succession and Authority Contract).

- **Track A (ship-with-AI-OFF, recommended):** implementation-ready — Phase 0 + Phase 7 only; no flag flip; no paid resource.
- **Track B (enable-after-hardening):** conditionally ready — blocked on owner decision OPEN-001 and on Phases 1 + 4 (SEC-001/SEC-002/SEC-004) landing.

To lift the cap to `IMPLEMENTATION-READY`: owner or independent reviewer accepts the package (Track A then proceeds; Track B proceeds after its phases land).

## Implementation start document

`11_IMPLEMENTATION_PLAN.md` — authoritative execution guide with phase order, dependency graph, per-task exact paths/symbols, durable-goal contracts, and validation gates.

## Phase order (Track B; Track A = P0 + P7)

P0 (prove OFF + stop-the-bleed) → P1 (sanitize + Ask scrub) → P2 (provider resilience) → P3 (PB rate limit + apply caps test) → P4 (leakage + injection suites — **launch-blocker for enable**) → P5 (shadow matrix + drill) → P6 (observability + runbooks) → P7 (doc re-anchor + decisions + privacy).

Dependency graph and per-phase durable-goal contracts are in `11_*`.

## Dependency graph

```mermaid
graph TD
  P0 --> P1 --> P2 --> P4
  P1 --> P3 --> P4
  P4 --> P5 --> P6 --> P7
```

## Requirement/task/test traceability

- Requirements: `04_*` (FR/SEC/REL/OPS/DATA/DOC/TEST/UX, stable IDs).
- Traceability matrix: `16_*` (every req → phase → task → code → AC → test → rollout).
- Tests: `12_*` (execution matrix + shadow-path + AQ).

## Blocked decisions table

| Decision | ID | Owner | Impact |
|---|---|---|---|
| Ship AI OFF (Track A) vs ON-after-hardening (Track B) | OPEN-001 | Philip | Determines whether P1–P6 are pre- or post-launch |
| Reject platform-admin AI cross-tenant bypass | DEC-007/SEC-006 | Philip | Behavior change; T-P4-3 owner-gated |

## Stale-plan revalidation checklist (before implementing)

- Re-read `src/lib/ai/**` and `src/app/api/ai/**` (confirm DeepSeek-only, 2 routes, no new provider).
- Confirm `ARCHESTIMATOR_AI_ENABLED` default false and dynamic-import gate intact.
- Confirm `authMode === "better-auth"` in `ai/auth.ts`.
- Confirm no new AI D1 migration since `0038`.
- Recheck `git status` (concurrent-agent safety).
- Confirm test runner/placement (`ai-*` siblings) before adding suites.

## Commands / checks before the first edit

- `git status` (no concurrent AI edits).
- `bun run type-check && bun run lint`.
- `bun run test` (establish baseline; note any pre-existing reds in `ai-*`).
- `bun run build` (confirm AI handler is a dynamic chunk when off).

## Files explicitly off-limits (planning + implementation boundary)

Legacy Supabase project `ebxxqidacheyapmmzavr`; unrelated `archestimator` provider project; Better Auth platform config; D1 RLS (none); Durable Object collaboration logic; proposal XLSX export; cost-library pricing logic; agent-framework model-routing policy.

## Files/systems intentionally unaffected

R2, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Images, Email; cost-library pricing; proposal export; agent-framework adapters.

## External proof still required before production rollout

- DeepSeek subprocessor disclosure (SEC-010) — legal/privacy review.
- Hosted p95/error-rate metrics post-enable (Track B) — Workers Observability.
- Retention-cron hosted proof that AI tables are purged (DATA-002).
- Independent or owner review of this pack to lift the `CONDITIONALLY READY` cap.

## Archive policy

Do **not** archive automatically. Archive after full Track completion (A or B) and post-release verification; or archive only named completed slices (Phase 0, Phase 7) if Track A is chosen and Track B deferred.

## One-line summary

Archestimator's AI surface is narrow (DeepSeek-only, disabled-by-default, 2 routes) and already has strong controls (workspace scoping, metadata-only audit, signed-token apply, deterministic fallback); this pack proves the safe gated-off launch path and specifies the exact hardening (sanitization, outbound scrub, cross-tenant leakage suite, provider resilience) required before any enablement.

## Document map (authoritative per topic)

| Topic | Authoritative doc |
|---|---|
| Coordination / verification mode | `00_AGENT_COORDINATION.md` |
| Overview / current-vs-target | `01_EXECUTIVE_SUMMARY.md` |
| Scope & non-goals | `02_FEATURE_BRIEF_AND_SCOPE.md` |
| Codebase evidence | `03_SOURCE_AND_CODEBASE_AUDIT.md` |
| Requirements (canonical IDs) | `04_REQUIREMENTS_SPECIFICATION.md` |
| UX / a11y | `05_UX_UI_ACCESSIBILITY_PLAN.md` |
| Architecture + route/cache contract | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` |
| Data / D1 / API / network + access-path matrix | `07_DATA_DATABASE_API_NETWORK_PLAN.md` |
| Security / threat model + attack-surface inventory + cred taxonomy depth | `08_SECURITY_PRIVACY_THREAT_MODEL.md` |
| Performance / reliability | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` |
| Blast radius | `10_BLAST_RADIUS_AND_DEPENDENCIES.md` |
| Implementation execution | `11_IMPLEMENTATION_PLAN.md` |
| Test/QA + proof contracts | `12_TEST_AND_VALIDATION_STRATEGY.md` |
| Rollout / rollback / ops | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` |
| Risk register | `14_RISK_REGISTER.md` |
| Decisions / assumptions / alternatives | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` |
| Traceability (Source strength + Gap/decision) | `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` |
| Readiness + verification matrix + evidence-class table | `17_FINAL_READINESS_REVIEW.md` |
| Stack contract | `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` |
| Research / QA / adversarial evidence | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` |
| Cost model | `20_COST_MODEL_AND_PRICING_INPUTS.md` |
| Provider parity | `21_PROVIDER_PARITY_MATRIX.md` |
| **Inventory & source map (Phase 1)** | `22_INVENTORY_AND_SOURCE_MAP.md` |
| **Readiness scorecard (Phase 2)** | `23_READINESS_SCORECARD.md` |
