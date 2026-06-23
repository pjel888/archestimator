# Full App User Story UX Audit — Per-Issue Plan Index

Date: 2026-06-23

This folder is the **executable plan pack** derived from the canonical UX audit at
[`.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/).
It contains **one folder per `UX-*` issue** (44 issues total: `UX-001` through `UX-044`),
each with a complete, ready-to-execute plan covering definition, current-state analysis,
target experience, implementation, acceptance, verification, blast radius, and decisions.

## How To Use This Pack

1. **Start with the [Loop Ledger](LOOP_LEDGER.md)** for current execution status of every issue.
2. **Read the [Decision Application And Feedback Contract](04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md)** before coding. It applies the 2026-06-23 owner decisions and the no-shift toast feedback rule.
3. **Pick an issue folder** by priority or implementation unit (see mapping below).
4. **Read the folder's `00-README.md` first** for the issue overview, then drill into the
   numbered plan files in order.
5. **Honor the [Conflict Matrix](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md)**
   before parallel execution — no two agents in the same conflict group without the lead
   integration owner.
6. **Record execution status back to the [Loop Ledger](LOOP_LEDGER.md)** — never to the
   canonical audit folder, which is the read-only source of truth for the issues themselves.

## Canonical Source

Every plan in this pack is derived from and bound to:

| Source doc | Purpose |
|---|---|
| [04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md](04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md) | Binding 2026-06-23 owner decision application, Wave 1 scope locks, no-shift toast feedback contract, and observability/redaction boundary for this executable pack. |
| [canonical-feature-status.csv](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv) | Single canonical spreadsheet (93 rows × 22 cols) of feature status, user stories, evidence, issue IDs, and severity. |
| [ux-logistical-errors-and-fixes.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md) | Issue-by-issue error, evidence, best fix, post-fix scenario. |
| [02-implementation-decomposition.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md) | Maps every `UX-*` to Implementation Unit (IU), owner lane, scope posture, verification. |
| [03-sequencing-dependencies-and-conflicts.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md) | Phase order, dependency graph, conflict groups, parallelization rules. |
| [04-ux-state-accessibility-and-content-contracts.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/04-ux-state-accessibility-and-content-contracts.md) | IA, state matrices, a11y, content contracts. |
| [05-security-data-and-provider-blast-radius.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/05-security-data-and-provider-blast-radius.md) | Trust boundaries, authz/RLS, data classification, blast radius. |
| [06-verification-matrix-and-proof-runbook.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) | `TV-*` verification IDs and proof runbook. |
| [09-decision-ledger.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/09-decision-ledger.md) | Decision-gated work items and stop/go status. |
| [12-keystone-code-binding-and-drift-protection.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md) | Authority for cited paths/counts/scripts — drift guard. |
| [13-performance-engagement-and-observability.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/13-performance-engagement-and-observability.md) | Performance budgets and observability bindings. |
| [14-security-primitive-and-rls-binding.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/14-security-primitive-and-rls-binding.md) | Security primitives and RLS bindings per high-risk surface. |

## Implementation Units (19) → UX Issues (44) → Per-Issue Folders

| IU | Owner Lane | Phase | UX Issues | Folder(s) |
|---|---|---|---|---|
| IU-01 | Public/legal | 1 | UX-001 | [UX-001-public-copy-readiness](phase-5/UX-001-public-copy-readiness/) |
| IU-02 | Auth/support | 1, 4 | UX-002, UX-003, UX-040, UX-043 | [UX-002-beta-access-status](phase-1/UX-002-beta-access-status/), [UX-003-terms-persistence-retry](phase-1/UX-003-terms-persistence-retry/), [UX-040-admin-repair-workflow](phase-1/UX-040-admin-repair-workflow/), [UX-043-auth-invite-workspace-recovery](phase-1/UX-043-auth-invite-workspace-recovery/) |
| IU-03 | App shell/routing | 1, 2 | UX-004, UX-042 | [UX-004-root-recovery-boundaries](phase-1/UX-004-root-recovery-boundaries/), [UX-042-route-api-inventory](phase-1/UX-042-route-api-inventory/) |
| IU-04 | Settings/admin | 1 | UX-005 | [UX-005-settings-role-explanations](phase-2/UX-005-settings-role-explanations/) |
| IU-05 | Projects | 1 | UX-006, UX-007, UX-008, UX-009 | [UX-006-group-delete-copy](phase-2/UX-006-group-delete-copy/), [UX-007-dirty-modal-close-intercept](phase-2/UX-007-dirty-modal-close-intercept/), [UX-008-destructive-modal-tone](phase-2/UX-008-destructive-modal-tone/), [UX-009-shared-link-chip-card](phase-2/UX-009-shared-link-chip-card/) |
| IU-06 | Estimates | 1 | UX-010 – UX-014, UX-044 | [UX-010-blank-row-create-affordance](phase-3/UX-010-blank-row-create-affordance/), [UX-011-visible-save-errors](phase-3/UX-011-visible-save-errors/), [UX-012-dnd-undo-keyboard](phase-3/UX-012-dnd-undo-keyboard/), [UX-013-stale-source-badge](phase-3/UX-013-stale-source-badge/), [UX-014-history-unavailable-reason](phase-3/UX-014-history-unavailable-reason/), [UX-044-numeric-validation-a11y](phase-3/UX-044-numeric-validation-a11y/) |
| IU-07 | Proposal/export | 1, 4 | UX-015, UX-016, UX-017 | [UX-015-versions-panel-decision](phase-4/UX-015-versions-panel-decision/), [UX-016-export-preflight](phase-4/UX-016-export-preflight/), [UX-017-preview-design-lint](phase-4/UX-017-preview-design-lint/) |
| IU-08 | Charts/data | 2 | UX-018 | [UX-018-chart-derived-state-lint](phase-3/UX-018-chart-derived-state-lint/) |
| IU-09 | Maps/location | 1, 3 | UX-019 | [UX-019-maps-location-fallback](phase-5/UX-019-maps-location-fallback/) |
| IU-10 | Collaboration | 1, 3 | UX-020, UX-021 | [UX-020-invite-email-readiness](phase-5/UX-020-invite-email-readiness/), [UX-021-realtime-presence-indicators](phase-5/UX-021-realtime-presence-indicators/) |
| IU-11 | Publication/share | 1, 3 | UX-022, UX-023, UX-035, UX-036, UX-037 | [UX-022-share-recovery-copy](phase-4/UX-022-share-recovery-copy/), [UX-023-activity-load-more](phase-4/UX-023-activity-load-more/), [UX-035-recipient-first-open-summary](phase-4/UX-035-recipient-first-open-summary/), [UX-036-recipient-recovery-paths](phase-4/UX-036-recipient-recovery-paths/), [UX-037-recipient-action-retry](phase-4/UX-037-recipient-action-retry/) |
| IU-12 | AI | 1, 3 | UX-024 | [UX-024-ai-disabled-quota-draft-states](phase-5/UX-024-ai-disabled-quota-draft-states/) |
| IU-13 | Support/feedback | 1 | UX-025, UX-026, UX-027 | [UX-025-feedback-mailto-payload](phase-5/UX-025-feedback-mailto-payload/), [UX-026-feedback-review-pagination](phase-5/UX-026-feedback-review-pagination/), [UX-027-toast-scoped-ids](phase-5/UX-027-toast-scoped-ids/) |
| IU-14 | QA/release | 2 | UX-028, UX-041 | [UX-028-qa-route-manifest](phase-2/UX-028-qa-route-manifest/), [UX-041-evidence-status-vocabulary](phase-2/UX-041-evidence-status-vocabulary/) |
| IU-15 | Field/collaboration | 4, 5 | UX-030, UX-031 | [UX-030-mobile-interrupted-estimate](phase-6/UX-030-mobile-interrupted-estimate/), [UX-031-field-handoff-slice](phase-6/UX-031-field-handoff-slice/) |
| IU-16 | PM/owner governance | 4, 5 | UX-032 | [UX-032-pm-readiness-governance](phase-6/UX-032-pm-readiness-governance/) |
| IU-17 | Library/cost | 4, 5 | UX-033, UX-034 | [UX-033-stale-cost-refresh-queue](phase-6/UX-033-stale-cost-refresh-queue/), [UX-034-attachment-review-lifecycle](phase-6/UX-034-attachment-review-lifecycle/) |
| IU-18 | Notifications/ops | 3, 4 | UX-039 | [UX-039-notification-campaign-authoring](phase-6/UX-039-notification-campaign-authoring/) |
| IU-19 | Operations/provider | 3 | UX-029, UX-038 | [UX-029-provider-proof-owners](phase-6/UX-029-provider-proof-owners/), [UX-038-operations-persona-split](phase-6/UX-038-operations-persona-split/) |

## Per-Issue Folder Structure (canonical)

Every `UX-NNN-<slug>/` folder follows the same shape so any agent can navigate any plan:

```
UX-NNN-<slug>/
├── 00-README.md                       # Overview, priority, scope, status
├── 01-ISSUE-DEFINITION.md             # Full problem statement, evidence, current error
├── 02-CURRENT-STATE-ANALYSIS.md       # Codebase current state with file paths
├── 03-TARGET-EXPERIENCE.md            # Target UX, copy, flows
├── 04-IMPLEMENTATION-PLAN.md          # Concrete steps, waves, files
├── 05-ACCEPTANCE-CRITERIA.md          # Given/When/Then scenarios (3+)
├── 06-VERIFICATION-AND-PROOF.md       # TV-* IDs, test surfaces, evidence
├── 07-BLAST-RADIUS-AND-ROLLBACK.md    # Affected files, risks, rollback
└── 08-DECISIONS-AND-DEPENDENCIES.md   # Decisions needed, dependencies
```

## Priority Tiers

| Tier | Issues | Beta-blocking? |
|---|---|---|
| **P0** (18) | UX-002, UX-003, UX-004, UX-007, UX-011, UX-019, UX-020, UX-022, UX-025, UX-028, UX-029, UX-035, UX-036, UX-038, UX-040, UX-041, UX-043, UX-044 | Yes — beta cannot widen without these resolved. |
| **P1** (21) | UX-001, UX-006, UX-008, UX-009, UX-010, UX-012, UX-013, UX-016, UX-017, UX-018, UX-021, UX-024, UX-026, UX-027, UX-030, UX-032, UX-033, UX-034, UX-037, UX-039, UX-042 | Beta-pain; resolve before public launch. |
| **P2** (5) | UX-005, UX-014, UX-015, UX-023, UX-031 | Post-beta or productization-gated. |

## Execution Phase Order

Followed strictly per
[03-sequencing-dependencies-and-conflicts.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md):

| Phase | Units | Why |
|---|---|---|
| 0 | Plan and schema lock | Prevent stale evidence, priority drift, ambiguous decisions. |
| 1 | IU-01 – IU-06 (and low-schema parts of IU-07/09/11/13) | High value, low blast radius. |
| 2 | IU-08, IU-14 | Validation signal repair. |
| 3 | IU-10, IU-12, IU-18, IU-19 | Provider and operation proof. |
| 4 | IU-15, IU-16, IU-17 | New workflow foundations. |
| 5 | IU-15 – IU-18 surfaces | New workflow UI. |
| 6 | All units | Status update and release readout. |

## Conflict Groups (parallelization hazard map)

Before parallel execution, consult
[03-sequencing-dependencies-and-conflicts.md § Conflict Groups](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md).
Issues in the same conflict group MUST NOT be implemented concurrently without the named
lead integration owner. The 10 groups:

1. **Auth/support boundary** — UX-002, UX-003, UX-040, UX-043
2. **Project/dashboard/readiness** — UX-006, UX-007, UX-009, UX-032 (+ secondary UX-008)
3. **Estimate sheet** — UX-010–UX-014, UX-030, UX-044 (+ secondary UX-014, UX-015)
4. **Publication/share recipient** — UX-022, UX-023, UX-035–UX-037 (+ secondary UX-016)
5. **Collaboration/access paths** — UX-020, UX-021, UX-031
6. **Library/cost/storage** — UX-033, UX-034
7. **Operations/provider** — UX-028, UX-029, UX-038, UX-039
8. **Evidence/schema** — UX-041, UX-042
9. **Copy/settings/notification read-only surfaces** — UX-001, UX-004, UX-005, UX-024–UX-027
10. **Export/charts/maps/data-viz surfaces** — UX-016–UX-019

## Resolved Decision Scope Locks

Per
[09-decision-ledger.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/09-decision-ledger.md)
and [04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md](04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md),
the blocking owner decisions for this pass are resolved, but the accepted scope is narrow:

- **UX-015** — Named versions stay dormant for Wave 1; no full Versions panel.
- **UX-031** — Shared-link field package is the selected later slice, but Wave 1 closed beta is estimator/PM-only, so `UX-031` remains P2/deferred and no field package code starts yet.
- **UX-032** — Lightweight project readiness checklist, notes, and owner-visible gaps only; no approval workflow, owner margin alerts, or final-package lifecycle audit.
- **UX-039** — Seeded/manual release campaign rows, CTA validation, and delivery inspection only; no rich campaign composer.
- **Rate limits** — Policy B accepted: share comments and decisions first, while preserving already-implemented Postgres durable limiters on broader share/invite/landing paths.
- **Analytics** — Vercel Web Analytics + Speed Insights now; minimal Postgres event rows only for core support/operator audit needs.
- **Any issue requiring new permission/RLS roles** still requires a fresh RBAC/RLS plan before code.

## Conventions

- **Status vocabulary**: `planned` → `in-progress` → `implemented` → `verified` → `released`. Do not invent intermediate states.
- **Evidence vocabulary**: `not-run`, `local-only`, `browser-verified`, `provider-verified`, `manual-verified`. Match the canonical CSV's "Evidence Status" column.
- **Transient feedback**: use fixed toast notifications with scoped IDs; do not add reflowing inline errors or banners for transient validation, save, provider, quota, rate-limit, recovery, or async failures.
- **Cross-references**: When an issue's plan references another issue, use the form `UX-NNN` (no folder path) so renames don't break links.
- **Code citations**: Always include `src/...` paths, never bare filenames.
- **Drift**: If a cited path/count drifts from the
  [Keystone Registry](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/12-keystone-code-binding-and-drift-protection.md),
  follow the Drift Remediation Protocol before merging.
