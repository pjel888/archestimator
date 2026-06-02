# Production Evidence — Access Telemetry

**Created:** 2026-06-02
**Purpose:** Evidence artifact storage for access telemetry production enablement. Each E-XXX folder contains templates, drafts, and completed evidence as it becomes available.
**Truth lock:** See `68-access-telemetry-production-truth-lock.md` for authoritative current state.

---

## Evidence Status Summary

| Evidence ID | Description | Status | Artifact |
|-------------|-------------|--------|----------|
| E-001 | Privacy notice live URL | Ready for owner action | [privacy-notice-draft.md](E-001-privacy-notice/privacy-notice-draft.md) |
| E-002 | Shared page disclosure screenshot | Repo-local disclosure implemented; production screenshot pending | [screenshot-requirements.md](E-002-shared-page-disclosure/screenshot-requirements.md) |
| E-003 | Password gate disclosure screenshot | Repo-local disclosure implemented; production screenshot pending | [screenshot-requirements.md](E-003-password-gate-disclosure/screenshot-requirements.md) |
| E-004 | DPO / privacy officer designation | Ready for owner action | [dpo-designation-template.md](E-004-dpo-designation/dpo-designation-template.md) |
| E-005 | NPCRS triage result | Ready for owner action | [npcrs-triage-worksheet.md](E-005-npcrs-triage/npcrs-triage-worksheet.md) |
| E-006 | DPS inventory | Ready for owner review | [dps-inventory-draft.md](E-006-dps-inventory/dps-inventory-draft.md) |
| E-007 | DSR process document | Ready for owner review | [dsr-process-ready-for-review.md](E-007-dsr-process/dsr-process-ready-for-review.md) |
| E-008 | Breach response document | Ready for owner review | [breach-response-ready-for-review.md](E-008-breach-response/breach-response-ready-for-review.md) |
| E-009 | Vendor DPA review evidence | Ready for owner action | [vendor-dpa-review-worksheet.md](E-009-vendor-dpa-review/vendor-dpa-review-worksheet.md) |
| E-010 | Retention cleanup proof | Repo-local operator-run procedure documented; production execution proof pending | [retention-operator-procedure.md](E-010-retention-proof/retention-operator-procedure.md) |
| E-011 | Feature flag default-off proof | Repo-local default-off tests pass; production env proof pending | [feature-flag-proof-template.md](E-011-feature-flag-proof/feature-flag-proof-template.md) |
| E-012 | Test run report | Repo-local PR7/PR8B targeted tests pass; full formal report pending | [test-run-report-template.md](E-012-test-run-report/test-run-report-template.md) |
| E-013 | Manual QA report | Ready for QA action | [manual-qa-report-template.md](E-013-manual-qa-report/manual-qa-report-template.md) |
| E-014 | Rollout approval | Ready for owner action | [rollout-approval-template.md](E-014-rollout-approval/rollout-approval-template.md) |
| E-015 | Final production sign-off | Ready for future completion | [final-production-signoff-template.md](E-015-final-production-signoff/final-production-signoff-template.md) |
| E-016 | External counsel review | Recommended / optional | [external-counsel-review-request-template.md](E-016-external-counsel-review/external-counsel-review-request-template.md) |

---

## Evidence Definition

Each evidence item follows the structure defined in `64-access-telemetry-production-evidence-ledger.md`:
- **Artifact required**: What specific document, screenshot, or log must exist
- **Owner**: Who must complete it
- **Completion criteria**: What "done" means
- **Verification method**: How to confirm completeness
- **Blocks production?**: Whether this evidence is required for production GO

---

## Evidence Statuses

| Status | Meaning |
|--------|---------|
| Missing | No artifact exists yet |
| Drafted | A draft exists but is not ready for review |
| Ready for owner action | Template exists; Philip or an external party must complete it |
| Ready for engineering action | Template exists; implementation or tests must happen first |
| Ready for review | Artifact is complete and ready for owner/DPO review |
| Ready for QA action | Template exists; QA testing must be performed |
| Approved | Owner or approver has signed off |
| Complete | Artifact exists and satisfies the gate |
| Not applicable | Evidence item is not required for this deployment |

---

## Cross-References

- `64-access-telemetry-production-evidence-ledger.md` — Master evidence tracker
- `66-production-readiness-final-gate-matrix.md` — Gates that each evidence item unlocks
- `68-access-telemetry-production-truth-lock.md` — Final truth source
- `70-access-telemetry-evidence-preparation-scorecard.md` — Evidence preparation scoring


## Repo-local PR7 implementation evidence — 2026-06-02

Repo-local implementation for privacy-safe access telemetry has been completed on `feat/activity-history-overhaul-v1` but production enablement remains **NO-GO**. Evidence now available in-repo:

- Analytics-only helper: `recordProjectPublicationAnalyticsEvent()` in `src/lib/publication/public-repository.ts`.
- Production-safe flag: `isProjectPublicationAccessTelemetryEnabled()` defaults off unless `ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED=true`; production also requires `ARCHESTIMATOR_ACCESS_TELEMETRY_PRODUCTION_READY=true`.
- Disclosures implemented on `/share/[token]` proposal view and password gate.
- Verification passed: `git diff --check`, `bun run type-check`, `bun run lint`, `bun run test`, `bun run test:dom`, `bun run validate`, `bun run build`.

This is **repo-local evidence only**. It does not replace production screenshots, owner/legal/DPO/provider approvals, retention proof, manual QA, or final sign-off.

## Repo-local PR8B hardening evidence — 2026-06-02

Repo-local PR8B access telemetry operations hardening is implemented on `feat/activity-history-overhaul-v1` with production enablement still **NO-GO**. Evidence now available in-repo:

- Owner/support action path can opt in to access telemetry with composite cursor pagination. Normal owner activity load remains comments/decisions/shared-link events only.
- Bot/email-preview telemetry is hidden by default; `includeBots` is explicit for diagnostic paths.
- Duplicate access telemetry rows are deduped for rendering by event type, timestamp, access stage, recipient-known state, and bot flag.
- Owner query does not select `ip_hash` or `user_agent_hash`; diagnostic hashes remain outside normal owner timeline output.
- `summarizeProjectPublicationAccessTelemetryMetrics()` provides repo-local observability counts by stage and bot/human split.
- E-010 retention path remains the documented 90-day operator-run SQL procedure until a production operator run or cron job is evidenced.

This is **repo-local evidence only**. It does not replace production screenshots, owner/legal/DPO/provider approvals, production retention execution logs, manual QA, or final sign-off.
