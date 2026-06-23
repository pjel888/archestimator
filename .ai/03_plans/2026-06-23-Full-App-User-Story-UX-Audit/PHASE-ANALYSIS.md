# Phase Analysis — Full App User Story UX Audit

Date: 2026-06-23 (redistributed for balanced implementation)
Parent: [00-README-INDEX.md](00-README-INDEX.md)

---

## Executive Summary

All 44 UX audit issues redistributed into **6 balanced implementation phases** (6-8 issues each).
Designed for one-phase-per-session execution. Dependencies respected, conflict groups separated,
P0 beta-blockers front-loaded across phases 1-3.

**Total:** 44 issues | 6 phases | 10 conflict groups | 3 decision gates

---

## Phase Map

| Phase | Count | Focus | P0 | P1 | P2 |
|-------|-------|-------|----|----|-----|
| [1](phase-1/README.md) | 6 | Auth & Shell (beta gate) | 5 | 1 | 0 |
| [2](phase-2/README.md) | 7 | Projects & QA | 3 | 3 | 1 |
| [3](phase-3/README.md) | 7 | Estimates Core | 2 | 4 | 1 |
| [4](phase-4/README.md) | 8 | Share & Export | 3 | 3 | 2 |
| [5](phase-5/README.md) | 8 | Collab, Maps, Feedback | 2 | 6 | 0 |
| [6](phase-6/README.md) | 8 | Provider & New Foundations | 2 | 5 | 1 |

---

## Phase 1 — Auth & Shell (6 issues) — BETA GATE

Ship first. Without these, users can't reliably enter, stay, or recover.

| UX | P | Folder |
|----|---|--------|
| UX-002 | P0 | [phase-1/UX-002-beta-access-status](phase-1/UX-002-beta-access-status/) |
| UX-003 | P0 | [phase-1/UX-003-terms-persistence-retry](phase-1/UX-003-terms-persistence-retry/) |
| UX-004 | P0 | [phase-1/UX-004-root-recovery-boundaries](phase-1/UX-004-root-recovery-boundaries/) |
| UX-040 | P0 | [phase-1/UX-040-admin-repair-workflow](phase-1/UX-040-admin-repair-workflow/) |
| UX-042 | P1 | [phase-1/UX-042-route-api-inventory](phase-1/UX-042-route-api-inventory/) |
| UX-043 | P0 | [phase-1/UX-043-auth-invite-workspace-recovery](phase-1/UX-043-auth-invite-workspace-recovery/) |

**Conflict group:** Auth/support boundary. Single lead required.

---

## Phase 2 — Projects & QA (7 issues)

Modal safety, destructive semantics, QA infrastructure.

| UX | P | Folder |
|----|---|--------|
| UX-007 | P0 | [phase-2/UX-007-dirty-modal-close-intercept](phase-2/UX-007-dirty-modal-close-intercept/) |
| UX-028 | P0 | [phase-2/UX-028-qa-route-manifest](phase-2/UX-028-qa-route-manifest/) |
| UX-041 | P0 | [phase-2/UX-041-evidence-status-vocabulary](phase-2/UX-041-evidence-status-vocabulary/) |
| UX-005 | P2 | [phase-2/UX-005-settings-role-explanations](phase-2/UX-005-settings-role-explanations/) |
| UX-006 | P1 | [phase-2/UX-006-group-delete-copy](phase-2/UX-006-group-delete-copy/) |
| UX-008 | P1 | [phase-2/UX-008-destructive-modal-tone](phase-2/UX-008-destructive-modal-tone/) |
| UX-009 | P1 | [phase-2/UX-009-shared-link-chip-card](phase-2/UX-009-shared-link-chip-card/) |

**Conflict groups:** Project/dashboard (UX-005-UX-009), Evidence/schema (UX-028, UX-041).

---

## Phase 3 — Estimates Core (7 issues)

The estimate sheet is the primary workspace. Save, validation, discoverability, charts.

| UX | P | Folder |
|----|---|--------|
| UX-011 | P0 | [phase-3/UX-011-visible-save-errors](phase-3/UX-011-visible-save-errors/) |
| UX-044 | P0 | [phase-3/UX-044-numeric-validation-a11y](phase-3/UX-044-numeric-validation-a11y/) |
| UX-010 | P1 | [phase-3/UX-010-blank-row-create-affordance](phase-3/UX-010-blank-row-create-affordance/) |
| UX-012 | P1 | [phase-3/UX-012-dnd-undo-keyboard](phase-3/UX-012-dnd-undo-keyboard/) |
| UX-013 | P1 | [phase-3/UX-013-stale-source-badge](phase-3/UX-013-stale-source-badge/) |
| UX-014 | P2 | [phase-3/UX-014-history-unavailable-reason](phase-3/UX-014-history-unavailable-reason/) |
| UX-018 | P1 | [phase-3/UX-018-chart-derived-state-lint](phase-3/UX-018-chart-derived-state-lint/) |

**Conflict group:** Estimate sheet.

---

## Phase 4 — Share & Export (8 issues)

Shared link delivery, recipient UX, export preflight, proposal preview.

| UX | P | Folder |
|----|---|--------|
| UX-022 | P0 | [phase-4/UX-022-share-recovery-copy](phase-4/UX-022-share-recovery-copy/) |
| UX-035 | P0 | [phase-4/UX-035-recipient-first-open-summary](phase-4/UX-035-recipient-first-open-summary/) |
| UX-036 | P0 | [phase-4/UX-036-recipient-recovery-paths](phase-4/UX-036-recipient-recovery-paths/) |
| UX-016 | P1 | [phase-4/UX-016-export-preflight](phase-4/UX-016-export-preflight/) |
| UX-017 | P1 | [phase-4/UX-017-preview-design-lint](phase-4/UX-017-preview-design-lint/) |
| UX-037 | P1 | [phase-4/UX-037-recipient-action-retry](phase-4/UX-037-recipient-action-retry/) |
| UX-015 | P2 | [phase-4/UX-015-versions-panel-decision](phase-4/UX-015-versions-panel-decision/) — GATED |
| UX-023 | P2 | [phase-4/UX-023-activity-load-more](phase-4/UX-023-activity-load-more/) |

**Conflict groups:** Publication/share recipient, Export/charts.

---

## Phase 5 — Collab, Maps, Feedback (8 issues)

| UX | P | Folder |
|----|---|--------|
| UX-019 | P0 | [phase-5/UX-019-maps-location-fallback](phase-5/UX-019-maps-location-fallback/) |
| UX-020 | P0 | [phase-5/UX-020-invite-email-readiness](phase-5/UX-020-invite-email-readiness/) |
| UX-001 | P1 | [phase-5/UX-001-public-copy-readiness](phase-5/UX-001-public-copy-readiness/) |
| UX-021 | P1 | [phase-5/UX-021-realtime-presence-indicators](phase-5/UX-021-realtime-presence-indicators/) |
| UX-024 | P1 | [phase-5/UX-024-ai-disabled-quota-draft-states](phase-5/UX-024-ai-disabled-quota-draft-states/) |
| UX-025 | P1 | [phase-5/UX-025-feedback-mailto-payload](phase-5/UX-025-feedback-mailto-payload/) |
| UX-026 | P1 | [phase-5/UX-026-feedback-review-pagination](phase-5/UX-026-feedback-review-pagination/) |
| UX-027 | P1 | [phase-5/UX-027-toast-scoped-ids](phase-5/UX-027-toast-scoped-ids/) |

**Conflict groups:** Collaboration/access, Maps, Feedback, Notifications.

---

## Phase 6 — Provider & New Foundations (8 issues)

Provider-facing work, field/PM/library foundations.

| UX | P | Folder |
|----|---|--------|
| UX-038 | P0 | [phase-6/UX-038-operations-persona-split](phase-6/UX-038-operations-persona-split/) |
| UX-029 | P0 | [phase-6/UX-029-provider-proof-owners](phase-6/UX-029-provider-proof-owners/) |
| UX-030 | P1 | [phase-6/UX-030-mobile-interrupted-estimate](phase-6/UX-030-mobile-interrupted-estimate/) |
| UX-032 | P1 | [phase-6/UX-032-pm-readiness-governance](phase-6/UX-032-pm-readiness-governance/) — SCOPE LOCKED |
| UX-033 | P1 | [phase-6/UX-033-stale-cost-refresh-queue](phase-6/UX-033-stale-cost-refresh-queue/) |
| UX-034 | P1 | [phase-6/UX-034-attachment-review-lifecycle](phase-6/UX-034-attachment-review-lifecycle/) |
| UX-039 | P1 | [phase-6/UX-039-notification-campaign-authoring](phase-6/UX-039-notification-campaign-authoring/) — GATED |
| UX-031 | P2 | [phase-6/UX-031-field-handoff-slice](phase-6/UX-031-field-handoff-slice/) — GATED |

**Conflict groups:** Operations/provider, Estimate sheet, Library/cost, PM governance.

---

## Conflict Group Map

| Group | Issues | Phase |
|-------|--------|-------|
| Auth/support | UX-002, UX-003, UX-040, UX-043 | 1 |
| Project/dashboard | UX-005-UX-009 | 2 |
| Estimate sheet | UX-010-UX-014, UX-044 | 3 |
| Publication/share | UX-022, UX-023, UX-035-UX-037 | 4 |
| Export/charts | UX-015-UX-018 | 3-4 |
| Collaboration/access | UX-020, UX-021 | 5 |
| Library/cost | UX-033, UX-034 | 6 |
| Operations/provider | UX-029, UX-038, UX-039 | 6 |
| Evidence/schema | UX-028, UX-041 | 2 |
| Copy/settings/feedback | UX-001, UX-024-UX-027 | 5 |

---

## Decision Gates

| Issue | Gate | Resolution |
|-------|------|------------|
| UX-015 | Versions panel | Dormant for Wave 1 |
| UX-031 | Field handoff | P2/deferred |
| UX-039 | Notification campaign | Seeded/manual only |

---

## Implementation Order

```
Phase 1 -> Auth & Shell (6)       [beta gate, ship first]
Phase 2 -> Projects & QA (7)      [after Phase 1]
Phase 3 -> Estimates (7)          [after Phase 1, can parallel with Phase 2]
Phase 4 -> Share & Export (8)     [after Phase 1, needs Phase 2 QA infrastructure]
Phase 5 -> Collab & Feedback (8)  [after Phase 1, independent of 2-4]
Phase 6 -> Provider & Foundations [last, provider context needed]
```

**Parallel opportunities:** After Phase 1, Phases 2+3 can run in parallel (different conflict groups). Phase 5 is independent. Phases 4 and 6 should be sequential.
