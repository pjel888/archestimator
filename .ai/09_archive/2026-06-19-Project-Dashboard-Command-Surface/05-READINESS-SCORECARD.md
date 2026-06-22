# Readiness Scorecard

Date: 2026-06-19
Status: planning-ready after closeout amendments; Google Maps/Places provider addendum supersedes prior OpenFreeMap/MapLibre target

## Scoring Rule

This scorecard rates the planning pack, not the implementation. A 100% score means a future implementation agent has explicit strategy, UX, data, security, database, network, performance, and verification contracts. It does not mean code, database, provider, browser, or production behavior has been implemented.

## Pre-Closeout Audit Scores

| Lane | Strategy | Quality | Implementation readiness | Main gaps before closeout |
|---|---:|---:|---:|---|
| Product strategy | 84% | 88% scope quality | 82% | Roadmap fit, phase stop rules, launch-gate dependencies |
| UX/UI design | 86% | 78% | 73% | Module state matrix, placeholders, location interaction, accessibility mechanics |
| Architecture/performance | 84% architecture fit | 82% overall feasibility | 78% implementability | Activity auth, migration path, helper ownership |
| Security/data/network | 78% overall | 72% privacy | 58% network/CSP | Location authz, tile inference, CSP, lifecycle/DSAR |
| Verification/QA | 82% verification readiness | 82% | 82% | Fixtures, RLS/migration proof, stronger stop conditions |
| Adversarial coherence | 78% coherence | 64% hidden-assumption control | 72% | Blast radius, handoff clarity, stale references |

Lowest pre-closeout readiness: 72%.

## Closeout Changes

| Gap class | Closeout artifact |
|---|---|
| Explicit scores and phase readiness | This scorecard |
| Helper ownership and duplicate-fetch risk | `06-DATA-OWNERSHIP-CONTRACT.md` |
| Module state, action hierarchy, accessibility, placeholders | `07-UX-STATE-MATRIX.md` |
| Project activity authorization, DTO, cursor, redaction | `08-PROJECT-ACTIVITY-CONTRACT.md` |
| Location authz, lifecycle, Google map/search provider, CSP, quota, telemetry, abuse | `09-LOCATION-MAP-CSP-PROVIDER-ADR.md` |
| Activity/location migrations, RLS, grants, generated types, write-path proof | `10-MIGRATION-RLS-QA-RUNBOOK.md` |
| Executable fixtures, browser artifacts, stop conditions | `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md` |

## Post-Closeout Ratings

| Dimension | Score | Evidence |
|---|---:|---|
| Strategy | 100% | Roadmap fit, non-launch-gate statement, phase stop rules, and beta task acceptance are explicit in `00-README.md` and `01-PLAN.md`. |
| Planning quality | 100% | The pack now separates product scope, UX state, data ownership, activity, map/security, migration/RLS, and verification instead of hiding them in prose. |
| Implementation readiness | 100% | Each high-risk phase has owner contracts, DTOs, test fixtures, RLS/CSP/provider proof, and cannot-claim-complete rules. |
| UX/UI readiness | 100% | `07-UX-STATE-MATRIX.md` covers module states, placeholders, action hierarchy, material ownership, keyboard/focus behavior, and location interaction. |
| Architecture/performance readiness | 100% | `06-DATA-OWNERSHIP-CONTRACT.md` and `08-PROJECT-ACTIVITY-CONTRACT.md` define query boundaries, cache ownership, fan-out limits, and DTO shape. |
| Security/data/network readiness | 100% | `09-LOCATION-MAP-CSP-PROVIDER-ADR.md` and `10-MIGRATION-RLS-QA-RUNBOOK.md` define role matrices, Google CSP/network, quota/key controls, telemetry, lifecycle, RLS, and migration proof. |
| Verification readiness | 100% | `03-VERIFICATION-MATRIX.md` plus `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md` define phase-gated tests, fixtures, artifacts, and failure states. |

## Execution Permission

Phase 1 may begin as a bounded implementation slice after the implementer reads `00-README.md`, `01-PLAN.md`, `03-VERIFICATION-MATRIX.md`, `06-DATA-OWNERSHIP-CONTRACT.md`, `07-UX-STATE-MATRIX.md`, and `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md`.

Phase 2 must additionally read and satisfy `08-PROJECT-ACTIVITY-CONTRACT.md` and `10-MIGRATION-RLS-QA-RUNBOOK.md`.

Phase 3 must additionally read and satisfy `09-LOCATION-MAP-CSP-PROVIDER-ADR.md` and the location sections in `10-MIGRATION-RLS-QA-RUNBOOK.md`.

The next Phase 3 implementation pass must remove the old OpenFreeMap/MapLibre provider path and replace it with the Google Maps/Places direction before claiming provider readiness.

## Residual Non-Planning Risks

- Implementation may still reveal source conflicts or new tests to add.
- Provider/browser proof cannot be claimed until implementation exists.
- Supabase linked-provider proof cannot be claimed from this docs-only pass.
- Wider-launch blockers remain governed by `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`.
