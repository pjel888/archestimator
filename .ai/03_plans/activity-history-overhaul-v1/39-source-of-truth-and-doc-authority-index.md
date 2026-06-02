# 39 — Source of Truth and Document Authority Index

**Date:** 2026-06-02
**Status:** Fifth pass — resolves document hierarchy
**Purpose:** When implementation begins, the engineer/AI needs to know which document is authoritative for each topic. This index resolves the hierarchy.

---

## Authoritative Documents by Topic

| Topic | Authoritative doc | Supporting docs | Notes |
|-------|------------------|----------------|-------|
| **North Star** | `13-north-star-and-product-principles.md` | `14-user-journeys-and-ux-paths.md` | Product direction unchanged |
| **Decision log** | `29-final-decision-log-and-approval-matrix.md` | `28-fourth-pass-stakeholder-review-packet.md` | 29 is canonical for ALL decision statuses |
| **PR sequence** | `11-pr-sequencing-plan.md` + `37-final-blast-radius-and-rollback-map.md` | `27-third-pass-master-implementation-blueprint.md` | 11 + 37 are authoritative for final sequence |
| **PR 2 execution** | `31-pr2-preflight-implementation-brief.md` + `38-pr2-test-command-and-fixture-plan.md` | `35-code-truth-map.md` | 31 for scope, 38 for test plan |
| **Activity composer spec** | `21-activity-composer-spec.md` | `02-activity-copywriting-system.md`, `16-event-taxonomy-and-lifecycle-map.md` | 21 is canonical implementation spec |
| **Event taxonomy** | `16-event-taxonomy-and-lifecycle-map.md` | `00-current-state-audit.md` | 16 is canonical event type reference |
| **Access telemetry** | `23-shared-page-access-activity-plan.md` + `36-access-telemetry-side-effects-audit.md` | `25-access-event-data-model-and-migration-plan.md` | 23 for plan, 36 for side effects matrix |
| **Privacy/retention** | `26-privacy-retention-and-client-disclosure-plan.md` | `07-security-privacy-readiness.md` | 26 is canonical privacy doc |
| **Blast radius** | `37-final-blast-radius-and-rollback-map.md` | `05-blast-radius-analysis.md` | 37 supersedes 05 for final risk assessment |
| **Test strategy** | `08-test-strategy.md` + `38-pr2-test-command-and-fixture-plan.md` | `18-manual-qa-and-acceptance-matrix.md` | 08 for overall, 38 for PR 2 specifics |
| **Manual QA** | `18-manual-qa-and-acceptance-matrix.md` | None | Canonical QA matrix |
| **Readiness/go-no-go** | `42-98-100-readiness-scorecard.md` + `34-final-preimplementation-audit.md` | `32-final-implementation-readiness-scorecard.md`, `10-readiness-checklist.md` | 42 for current scoring (sixth pass), 34 for audit summary |
| **Risks** | `43-final-risk-burndown-register.md` | `37-final-blast-radius-and-rollback-map.md` | 43 for risk register, 37 for blast radius |
| **Certification** | `44-final-plan-certification.md` | `40-final-implementation-handoff.md` | 44 is sign-off; 40 is entry point |
| **Loop audit** | `41-autonomous-readiness-loop-log.md` | — | Audit trail of this autonomous readiness loop |
| **Code truth** | `35-code-truth-map.md` | None | When docs and code disagree, 35 is authority |
| **Implementation handoff** | `40-final-implementation-handoff.md` | All above | Last doc to read before coding |
| **Stakeholder review** | `28-fourth-pass-stakeholder-review-packet.md` + `33-stakeholder-review-script.md` | None | For stakeholder meetings |

---

## Superseded Documents

These documents contain useful historical context but are NO LONGER authoritative for final implementation:

| Doc | Status | Superseded by | Reason |
|-----|--------|--------------|--------|
| `04-implementation-plan.md` | **Superseded** | `11-pr-sequencing-plan.md`, `27-third-pass-master-implementation-blueprint.md`, `37-final-blast-radius-and-rollback-map.md` | PR sequence and blast radius have been refined through multiple passes |
| `10-readiness-checklist.md` | **Partially superseded** | `32-final-implementation-readiness-scorecard.md`, `34-final-preimplementation-audit.md` | Go/no-go and HEAD stale. Checklist items still valid for execution. |
| `27-third-pass-master-implementation-blueprint.md` | **Partially superseded** | `34-final-preimplementation-audit.md`, `37-final-blast-radius-and-rollback-map.md` | Still useful for full 9-PR overview, but go/no-go per PR 32/34 is authoritative. |
| `30-final-technical-reconciliation-audit.md` | **Superseded** | `34-final-preimplementation-audit.md`, `35-code-truth-map.md`, `36-access-telemetry-side-effects-audit.md` | 34–36 are the final reconciliation pass. 30 is historical reference for what was found in fourth pass. |
| `22-third-pass-verification-audit.md` | **Historical** | `34-final-preimplementation-audit.md` | Third-pass specific. 34 is the current pass. |
| `12-second-pass-verification-audit.md` | **Historical** | `22`, `34` | Second-pass specific. Retained for audit trail. |

---

## Still Authoritative

| Doc | Status | Notes |
|-----|--------|-------|
| `00-current-state-audit.md` | **Authoritative** (with noted corrections) | HEAD stale (`d78686f`→current `65b21eb` via multiple passes), "13 event types" → "14". Otherwise accurate. |
| `01-research-basis.md` | **Authoritative** | Research unchanged |
| `02-activity-copywriting-system.md` | **Authoritative** | Copy model unchanged |
| `03-data-contract-and-event-model-plan.md` | **Authoritative** | Data contract unchanged |
| `05-blast-radius-analysis.md` | **Authoritative** (supporting) | High-level blast radius still valid; see 37 for per-PR detail |
| `06-performance-analysis-plan.md` | **Authoritative** | Performance plan unchanged |
| `07-security-privacy-readiness.md` | **Authoritative** (supporting) | See 26 for canonical privacy doc |
| `09-ui-ux-plan.md` | **Authoritative** | UI/UX plan unchanged |
| `13-north-star-and-product-principles.md` | **Authoritative** | North Star unchanged |
| `14-user-journeys-and-ux-paths.md` | **Authoritative** | Journeys unchanged |
| `15-information-architecture-and-surface-map.md` | **Authoritative** | IA unchanged |
| `17-observability-analytics-and-quality-plan.md` | **Authoritative** | Observability plan unchanged |
| `19-migration-and-backfill-decision-matrix.md` | **Authoritative** | Migration decisions unchanged |
| `20-edge-case-and-failure-mode-matrix.md` | **Authoritative** | Edge cases unchanged |
| `24-activity-history-overhaul-roadmap.md` | **Authoritative** | V1→V3 roadmap unchanged |
| `25-access-event-data-model-and-migration-plan.md` | **Authoritative** (with noted update) | Reconcile side effects per doc 36 |
| `29-final-decision-log-and-approval-matrix.md` | **Authoritative** (with noted corrections) | Approval statuses corrected in this pass. See doc 34 Finding 9. |
| `31-pr2-preflight-implementation-brief.md` | **Authoritative** (with noted updates) | event_type exposure and CSRF coverage updated per this pass. |
| `32-final-implementation-readiness-scorecard.md` | **Superseded** | `42-98-100-readiness-scorecard.md` | 42 is the final sixth-pass scorecard with HEAD `65b21eb` and complete 10-category scoring. |

---

## Document Reading Order for Implementation

### For PR 2 Implementer
1. `40-final-implementation-handoff.md` — what to do, where to start
2. `31-pr2-preflight-implementation-brief.md` — exact scope of 5 fixes
3. `38-pr2-test-command-and-fixture-plan.md` — test plan per fix
4. `35-code-truth-map.md` — verify code behavior before editing
5. `37-final-blast-radius-and-rollback-map.md` — risk awareness
6. `43-final-risk-burndown-register.md` — risk register for context

### For PR 3 Implementer
1. `40-final-implementation-handoff.md` — PR 3 scope
2. `21-activity-composer-spec.md` — composer implementation spec
3. `16-event-taxonomy-and-lifecycle-map.md` — event types and copy templates
4. `02-activity-copywriting-system.md` — copy rules and forbidden terms

### For Stakeholder Review
1. `44-final-plan-certification.md` — certified readiness summary (SIXTH PASS — authoritative)
2. `28-fourth-pass-stakeholder-review-packet.md` — stakeholder-friendly summary
3. `29-final-decision-log-and-approval-matrix.md` — pending decisions
4. `33-stakeholder-review-script.md` — meeting agenda
5. `42-98-100-readiness-scorecard.md` — final go/no-go scoring
6. `43-final-risk-burndown-register.md` — risk register

---

## Cross-References

- `34-final-preimplementation-audit.md` — Current audit status and findings
- `41-autonomous-readiness-loop-log.md` — Autonomous loop audit trail
- `42-98-100-readiness-scorecard.md` — Final scoring by category
- `43-final-risk-burndown-register.md` — Risk burndown register
- `44-final-plan-certification.md` — Certified sign-off
- `40-final-implementation-handoff.md` — Handoff packet for implementation
