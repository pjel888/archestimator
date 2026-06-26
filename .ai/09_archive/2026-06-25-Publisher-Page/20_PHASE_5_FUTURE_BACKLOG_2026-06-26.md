# 20 — Phase 5 Future Backlog (Non-AI)

**Status.** Future backlog only. Do not implement Phase 5 work in Phase 1-4 unless Philip explicitly re-scopes the Publisher project.

**Purpose.** Preserve the useful "nice later" work without letting it leak into the first-user Publisher build.

**Hard exclusion.** No AI features now. Do not add Ask Flip, Package Builder, AI summaries, AI-generated publication insights, AI activity-feed interpretation, AI triage, or AI audit-table integration to Publisher in Phase 1-5 planning. If AI work is reintroduced later, it needs a separate product/security plan.

---

## Entry Criteria

Phase 5 work may start only after all are true:

1. Phase 1 roster, Phase 2 drawer/actions, Phase 3 RBAC surface, and Phase 4 modal consolidation have shipped or been consciously deferred.
2. Publisher has real closed-beta telemetry or a concrete customer request proving the backlog item is worth the added complexity.
3. Security, privacy, and rollback implications are documented in a fresh plan update.
4. The feature flag can still disable Publisher without breaking existing share-link receiver behavior.

---

## Backlog Items

| ID | Item | Trigger | Notes |
|---|---|---|---|
| P5-01 | Bulk rotate / revoke | Managers operate enough publications that single-row actions become slow | Requires impact preview, per-row atomicity, partial-failure report, audit row per affected publication, and no silent queued destructive intent. |
| P5-02 | Per-recipient capabilities / edit grant | Philip decides clients need edit access, not just view/comment/decision | Requires schema change, receiver-side enforcement, UI grant model, tests for no edit escalation, and migration/rollback plan. |
| P5-03 | Workspace publications summary RPC | Phase 1 roster p95 exceeds budget on 50-project x 5-publication x 10-recipient workspace | Add only after measurement. SECURITY DEFINER must cite force-RLS or explicit rank predicates. |
| P5-04 | Workspace activity feed RPC | Application-layer 5-source union is slow or hard to paginate | Must preserve workspace/project RLS and cursor semantics from existing activity helpers. |
| P5-05 | Notifications integration | Builders need comment/decision/open/grant changes in the workshop notification center | Keep notification work separate from the receiver-side share API. |
| P5-06 | Token lifecycle operations | Token-age dashboard or support events show stale links are a real risk | Includes tokens older than 180 days, optional 90-day auto-rotation research, and compromised-manager recovery automation. |
| P5-07 | DPoP / proof-of-possession research | Capability-token leak incident, enterprise requirement, or 10x scale | Research only unless separately approved. Must weigh recipient friction, browser key storage, recovery, and support burden. |
| P5-08 | Mobile-native Publisher | Telemetry shows real builder usage below 768px | Current plan supports 768px tablet and uses a <768px desktop-first fallback. |
| P5-09 | White-label client portals | Enterprise packaging requires branded domains/client portals | Separate product track; do not fold into builder-side Publisher by default. |
| P5-10 | i18n / localization | Non-English clients become a launch requirement | Separate i18n track; Phase 1-4 ship English-only. |

---

## Non-Goals

- No new AI workflow.
- No new public API for Publisher unless external integration is separately approved.
- No hard-delete publication workflow without a recovery and audit plan.
- No broad dependency additions just to support future backlog items.
- No schema changes without a migration, rollback, generated-types, RLS, and contract-test plan.

---

## Validation Shape

Each Phase 5 item needs its own scoped validation. Minimum expectations:

- Requirement row in `04_REQUIREMENTS_SPECIFICATION.md`.
- Work package in `11_IMPLEMENTATION_PLAN.md`.
- Tests in `12_TEST_AND_VALIDATION_STRATEGY.md`.
- Risk row in `14_RISK_REGISTER.md`.
- Traceability row in `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.
- Readiness update in `17_FINAL_READINESS_REVIEW.md`.
