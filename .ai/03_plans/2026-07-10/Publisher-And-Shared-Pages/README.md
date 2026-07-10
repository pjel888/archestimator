# Publisher And Shared Pages

Status tuple: `package_status=CONDITIONALLY_READY`, `implementation_status=NOT_STARTED`,
`release_status=NOT_EVALUATED`, `plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

## Mission

Redesign the Publisher and Shared Link surfaces so a manager can go from "I have
a project" to "my client is reviewing the shared proposal" through a clear,
guided, obvious flow — and a recipient opening the shared link immediately
understands what they're looking at and how to respond. Preserve the existing
hardened backend; fix the UX layer and harden gaps.

## Authority Order

1. `AGENTS.md` and the current planning-prompt suite (`Frontier-Planning-Kernel.md`).
2. `plan-pack.json` for IDs, statuses, hashes, and DAG truth.
3. `IMPLEMENTATION_PLAN.md` for execution packets and acceptance contracts.
4. Numbered documents for detailed analysis and context.

## Canonical Artifacts

- **Machine-readable contract:** [`plan-pack.json`](plan-pack.json)
- **Canonical execution artifact:** [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)

## Current State

- **Profile:** `high-blast-radius` (broad user-facing contract changes + auth-adjacent hardening).
- **Planning stage:** Complete for the current bounded scope, but Program
  `PUB-DELTA-01..04` still require serialized incorporation before affected
  units or final integration can become ready.
- **Implementation:** Not started. `SLICE-001` is the dependency-closed READY
  subset `UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-006`, and `UNIT-010`; the
  other 18 units are `PLANNED` pending their named delta or dependency preconditions.
- **Exact resume point:** `UNIT-001` (bounded request-body reads).
- **Authority:** Last observed scope remains `PLAN_ONLY`; action ceiling remains `IMPLEMENT_LOCAL`.
- **Tied longest paths after delta incorporation:** `UNIT-010` → `UNIT-011`
  → any of `UNIT-012`/`UNIT-013`/`UNIT-014` → `UNIT-022`, and
  `UNIT-010` → `UNIT-017` → `UNIT-023` → `UNIT-022`.

## Scope Summary

**In scope:**
- Publisher: guided publish wizard, prominent share-link display, preview-as-client,
  mobile-responsive roster, plain-language terminology, working pagination, dashboard CTA.
- Shared link: dynamic header, sticky decision CTA, actionable session banner,
  reduced table noise, comment improvements, Print / Save as PDF button, currency fix,
  expiry visibility, sender branding, password gate improvements.
- Recipient inbox: dead-end guidance, fail-closed integrity, empty-state clarification.
- Security: bounded stream reads independent of `Content-Length`, status-code
  consistency, durable D1 rate-limit authority, comment pagination, snapshot
  reentrance, explicit runtime/provider secret readiness, dead code removal.
- Data: FK constraints, GROUP BY roster optimization.

**Out of scope:** Real-time (SSE), server-generated PDF, e-signature, full i18n,
white-label branding, production deploy.

## Decision Summary

All 9 material decisions are resolved as `DEC-AUTO-*`:
- Preview mechanism: dedicated authenticated manager route; no preview bearer
  cookie (DEC-AUTO-001/002/009)
- Link transfer: selectable URL, copy, and native Web Share when supported;
  no QR feature or dependency (DEC-AUTO-003)
- Roster: cards + optional table (DEC-AUTO-004)
- Sidebar label: "Share" (DEC-AUTO-005)
- Comment pagination: cursor-based (DEC-AUTO-006)
- Row actions: row-click selects (DEC-AUTO-007)
- Dead events route and `download_attempt_blocked` type: remove now (DEC-AUTO-008)

No `AUTH-*` records are required for this local pack. The bound Archestimator D1
resource is covered by standing repository authorization, but this `PLAN_ONLY`
run performs no hosted mutation. Production deploy is outside the
`IMPLEMENT_LOCAL` ceiling and remains a release-run boundary.

## Pack Index

| Artifact | Purpose |
|---|---|
| `plan-pack.json` | Versioned manifest, hashes, reciprocal traceability, DAG, ready slice |
| `IMPLEMENTATION_PLAN.md` | Sole canonical implementation plan; 5 READY and 18 PLANNED unit packets |
| `01_EXECUTIVE_SUMMARY.md` | Problem, solution, scope |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Detailed scope and non-goals |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Source audit and current-state findings |
| `04_REQUIREMENTS_SPECIFICATION.md` | All requirements with acceptance criteria |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | UX design, terminology mapping, accessibility |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Component architecture, server-client boundary |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | D1 schema, API route changes, network |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Preserved controls + hardening + threats |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets, optimizations, evaluator |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Affected surfaces, file ownership map |
| `11_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | 9 DEC-AUTO-* + 4 assumptions |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test inventory, adversarial QA, proof plan |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Phased rollout, rollback, operations |
| `14_RISK_REGISTER.md` | Canonical risk records and implementation watch conditions |
| `LOOP_LEDGER.md` | Durable planning loop state |

## Validation

```bash
bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Publisher-And-Shared-Pages
```

Browser automation is required by UX-interactive units (UNIT-011, UNIT-014,
UNIT-016, UNIT-017) to prove the interaction claims. It is not part of
plan-readiness validation.
