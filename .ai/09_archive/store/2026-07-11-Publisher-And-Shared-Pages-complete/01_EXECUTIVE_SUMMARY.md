# 01 — Executive Summary

## Problem

The Archestimator Publisher and Shared Link feature has a powerful, well-hardened
backend (layered token/password/CSRF/rate-limit security, snapshot sanitization,
D1-backed rate limiting) but the **user experience is severely broken**:

- **No primary CTA.** There is no "Share" button anywhere. Publishing is a
  side-effect of saving sheet scope in a buried tab of a 6-tab drawer.
- **Product-internal jargon everywhere.** "Publisher," "Publication," "Scope
  outline," "Sheet scope" — none are words a user or client uses.
- **Desktop-only with no mobile fallback.** Screens under 768px see "Publisher
  needs more width." A manager on a phone cannot share.
- **Dead-end states.** The recipient "sign in as a recipient" banner is
  non-actionable text. Expired proposals in the inbox have no recovery path.
- **Buried decision CTA.** The recipient's Approve/Decline buttons are at the
  very bottom of the page; the header always says "Awaiting your review" even
  after deciding.
- **No preview.** Managers cannot preview what the recipient will see without
  emailing themselves.
- **Visual noise.** The estimate table has a button on every single row (250
  rows = 250 buttons).

The user stated: *"What we have now is ridiculously so bad. I am unable to
understand the whole UX and UI of everything. I can't even get to the shared
link page that we are supposed to share to our clients."*

## Solution

A redesign that **preserves the backend** and **fixes the UX layer**:

1. **Guided publish wizard** (REQ-001): A step-by-step flow — select estimates →
   set access → generate link → send/invite → success — replacing the buried-tab
   drawer for first-time publishing.
2. **Prominent share-link display** (REQ-002): Selectable URL, copy button, and
   native Web Share on supported devices, with no QR dependency.
3. **Preview-as-client** (REQ-003): Managers use a dedicated authenticated route
   that rechecks project-manager RBAC on every read and creates no preview bearer
   credential.
4. **Plain-language terminology** (REQ-004): "Publisher" → "Share," "Scope
   outline" → "Summary," etc.
5. **Mobile-responsive publisher** (REQ-005): Card layout works on phones.
6. **Shared link improvements** (UX-001 through UX-012): Dynamic header, sticky
   decision CTA, actionable session banner, reduced table noise, comment dates,
   visible Print / Save as PDF button, currency fix, expiry visibility, sender branding.
7. **Technical hardening** (SEC-001 through SEC-009): Stream-enforced body limits,
   status-code consistency, durable rate-limit authority, comment pagination,
   snapshot reentrance, runtime/provider secret readiness, dead code removal,
   authenticated preview isolation, and unsubscribe coverage.
8. **Data optimization** (DATA-001, DATA-002): FK constraints, GROUP BY roster
   query.

## Scope

**In scope:** Publisher UX redesign, shared link UX improvements, recipient inbox
fixes, security hardening, data optimization. Local implementation + browser proof.

**Out of scope:** Real-time updates (SSE), server-generated PDF, e-signature,
full i18n, white-label branding, production deploy.

## Profile

`high-blast-radius` — changes broad user-facing contracts (navigation, publish
flow, terminology) and touches auth-adjacent security hardening.

## Status Tuple

`package_status=IMPLEMENTATION_READY`, `implementation_status=COMPLETE`,
`release_status=NOT_EVALUATED`, `plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.
Five unaffected units are `READY`; 18 affected, downstream, or final-integration
units remain `PLANNED` until the Program's `PUB-DELTA-01..04` contracts and
durable migration-generation preconditions are incorporated and revalidated.

## Pack Index

| Artifact | Purpose |
|---|---|
| `plan-pack.json` | Versioned manifest, hashes, reciprocal traceability, DAG, ready slice |
| `IMPLEMENTATION_PLAN.md` | Sole canonical implementation plan; 5 READY and 18 PLANNED unit packets |
| `README.md` | Execution entrypoint |
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
