# Publisher And Shared Pages — Plan Pack

Status tuple: `package_status=NOT_READY`, `implementation_status=NOT_STARTED`,
`release_status=NOT_EVALUATED`, `plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

## Mission

Redesign the Publisher and Shared Link surfaces so a manager can go from "I have
a project" to "my client is reviewing the shared proposal" through a clear,
guided, obvious flow — and a recipient opening the shared link immediately
understands what they're looking at and how to respond. Preserve the existing
hardened backend; fix the UX layer and harden gaps.

The user's directive: *"What we have now is ridiculously so bad. I am unable to
understand the whole UX and UI of everything. I can't even get to the shared link
page that we are supposed to share to our clients."*

This plan pack was created from a comprehensive five-agent parallel audit of the
entire Publisher + Shared Link feature: roster, drawer, wizard, shared link page,
API routes, D1 schema, security model, data flow, navigation, recipient inbox,
and every UX friction point. See `03_SOURCE_AND_CODEBASE_AUDIT.md` for the full
evidence.

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
- **Planning stage:** Complete. The pack is evidence-grounded against git HEAD `081a0757a`.
- **Implementation:** Not started. 22 execution units in a layered DAG.
- **First unit:** `UNIT-001` (body-size limits), part of Layer 0 (security hardening).
- **Critical path:** `UNIT-010` (terminology) → `UNIT-011` (wizard) → `UNIT-014` (preview) → `UNIT-022` (integration).

## Scope Summary

**In scope:**
- Publisher: guided publish wizard, prominent share-link display, preview-as-client,
  mobile-responsive roster, plain-language terminology, working pagination, dashboard CTA.
- Shared link: dynamic header, sticky decision CTA, actionable session banner,
  reduced table noise, comment improvements, Download PDF button, currency fix,
  expiry visibility, sender branding, password gate improvements.
- Recipient inbox: dead-end fix, skip-bad-rows, empty-state clarification.
- Security: body-size limits, status-code consistency, circuit breaker parity,
  comment pagination, snapshot reentrance, startup secrets, dead code removal.
- Data: FK constraints, GROUP BY roster optimization.

**Out of scope:** Real-time (SSE), server-generated PDF, e-signature, full i18n,
white-label branding, production deploy.

## Decision Summary

All 8 material decisions resolved as `DEC-AUTO-*` (no owner gates):
- Preview mechanism: manager-auth-gated cookie (DEC-AUTO-001/002)
- QR code: `qrcode` package with fallback (DEC-AUTO-003)
- Roster: cards + optional table (DEC-AUTO-004)
- Sidebar label: "Share" (DEC-AUTO-005, Philip has final say)
- Comment pagination: cursor-based (DEC-AUTO-006)
- Row actions: row-click selects (DEC-AUTO-007)
- Dead events route: remove (DEC-AUTO-008)

No `AUTH-*` boundaries in this plan. Local implementation + browser proof. Hosted
D1 migration and production deploy are explicit release boundaries (not performed).

## Pack Index

| Artifact | Purpose |
|---|---|
| `plan-pack.json` | Versioned manifest, hashes, reciprocal traceability, DAG, ready slice |
| `IMPLEMENTATION_PLAN.md` | Sole canonical implementation plan and 22 unit packets |
| `01_EXECUTIVE_SUMMARY.md` | Problem, solution, scope |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Detailed scope and non-goals |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | **Comprehensive audit** of the existing feature |
| `04_REQUIREMENTS_SPECIFICATION.md` | All requirements with acceptance criteria |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | UX design, terminology mapping, accessibility |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Component architecture, server-client boundary |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | D1 schema, API route changes, network |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Preserved controls + hardening + threats |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets, optimizations, evaluator |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Affected surfaces, file ownership map |
| `11_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | 8 DEC-AUTO-* + 4 assumptions |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test inventory, adversarial QA, proof plan |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Phased rollout, rollback, operations |
| `14_RISK_REGISTER.md` | 15 risks with mitigations |
| `LOOP_LEDGER.md` | Durable planning loop state |

## Validation

```bash
bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Publisher-And-Shared-Pages
```

Browser automation is required by UX-interactive units (UNIT-011, UNIT-014,
UNIT-016, UNIT-017) to prove the interaction claims. It is not part of
plan-readiness validation.
