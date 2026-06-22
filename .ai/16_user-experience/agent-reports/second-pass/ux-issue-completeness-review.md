# Second-Pass UX Issue Completeness Review

Date: 2026-06-22

Scope: read-only review of the first-pass UX issue log, canonical CSV, raw first-pass agent reports, and targeted source/test evidence. Browser automation was not run. This report is advisory only; it does not modify the canonical CSV or issue log.

## Inputs Reviewed

- Canonical issue log: `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md`
- Canonical CSV: `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv`
- Raw reports under `.ai/16_user-experience/agent-reports/`
- Targeted source/tests for auth/invite, settings, projects, estimates, library/images, location, share links, proposal export, AI audit, notifications, and test coverage.

Inventory check: the CSV has 55 feature/story rows; the synthesized issue log has 29 issue rows. Some compression is appropriate, but several material beta-journey risks were dropped or merged too aggressively.

## Executive Assessment

The first-pass issue log is useful and mostly source-backed, but it is incomplete as a closed-beta UX/logistics backlog. It over-represents concrete component-level issues found by the direct UX risk audit and under-represents recovery-state issues already present in the CSV/raw reports.

Highest-priority completeness corrections:

1. Promote missing closed-beta entry/account recovery issues from the CSV: `AUTH-001`, `AUTH-005`, `ACCOUNT-001`, and `ACCOUNT-002`.
2. Split the broad AI issue into at least AI availability/draft UX and AI support/audit operations.
3. Add library/template provenance and image-upload fallback as their own library issues; do not hide them under estimate insert staleness.
4. Add estimate numeric validation and tree keyboard accessibility as explicit estimate issues.
5. Treat share-link recipient recovery as broader than expired/revoked/password states: include personalized recipient session loss and unsubscribe dead ends.
6. Reword or verify the project-card shared-link issue because current source/search text and tests show a mixed state, not a simple absence.

## Missing Material Issues

| Recommended ID | Area | Missing Issue | Evidence | Why It Matters | Recommended Fix Shape |
|---|---|---|---|---|---|
| ADD-001 | Auth/login | Unsafe or stale `next` redirects are silently sanitized to `/workshop`, so a user can feel like login lost their destination. | CSV `AUTH-001`; raw auth report `AUTH-001`; `src/app/login/page.tsx` sanitizes `next`; `src/app/auth/callback/route.ts` resolves post-auth destination; `src/lib/auth/redirects.ts` owns sanitization. | Closed-beta invite/share users often arrive through deep links. A silent destination drop looks like broken auth or missing access. | Add user-facing copy when a requested destination is not available, with a safe path back to projects/workshop and support context. |
| ADD-002 | Invite/onboarding | Broken invited workspace or membership data can hard-fail or strand invitees without an admin repair path. | CSV `AUTH-005`; raw auth report `AUTH-006`; `tests/vitest/auth-onboarding-guard.test.ts` includes unavailable parent/workspace cases; invite route has terminal states in `src/app/invite/[token]/page.tsx`. | Invitees are a core beta acquisition path. Existing invite terminal copy covers expired/revoked/used/wrong-account, but not broken membership repair ownership. | Add explicit broken-invite repair copy and an owner/admin support action; include admin queue/status visibility where possible. |
| ADD-003 | Account/settings | Profile settings only show generic saved/error states; users may not know which fields were accepted, rejected, or ignored. | CSV `ACCOUNT-001`; `src/app/workshop/settings/profile/page.tsx:29-37`; `src/lib/auth/account-actions.ts:97-114`. | Beta users will update company/profile data during setup; ambiguous saves create support churn and trust issues. | Add per-field validation summary and saved-state detail for changed fields. |
| ADD-004 | Workspace/settings | Missing default workspace or role/membership failure collapses to generic "could not be saved" / "complete account setup" copy. | CSV `ACCOUNT-002`; `src/app/workshop/settings/workspace/page.tsx:39-56`; `src/lib/auth/account-actions.ts:130-137`. | Workspace repair is an operator-heavy beta support path. The current UI does not distinguish no workspace, forbidden role, or incomplete setup. | Map `no_workspace`, `forbidden`, and missing setup to distinct recovery copy with owner/admin/support guidance. |
| ADD-005 | Projects/favorites | Favorite availability can be unclear in shared/access-limited views. | CSV `PROJECT-005`; raw workshop report `WS-03`; `LiveProjectCard` conditionally renders favorite controls and shared access badges. | Favorites are a navigation shortcut; inconsistent visibility across owned/shared projects can make collaboration work feel missing. | Add explicit disabled/explainer state where a role cannot favorite, or make favorite behavior consistent across access types. |
| ADD-006 | Estimate sheet | Numeric cost/quantity inputs can silently coerce malformed or negative values to zero, while DB constraints may reject different bounds. | CSV `EST-004`; raw workshop report `WS-08`; `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:73-79`; `row-table.tsx` sends parsed editable values on blur. | Incorrect quantities/costs are central estimating errors, not cosmetic UI defects. Silent coercion can change totals without explaining why. | Add visible per-cell validation/normalization feedback and align UI parser bounds with action/DB constraints. |
| ADD-007 | Estimate sheet | Deep tree keyboard and focus behavior is a risk distinct from drag/drop accidental reorder. | CSV `EST-002`; raw workshop report `WS-07`; test map recommends keyboard-focused tree interaction tests. | Keyboard-only estimators need hierarchy navigation, not just pointer DnD. | Add keyboard test coverage and visible focus/drop target states for depth, selected node, expand/collapse, and reorder alternatives. |
| ADD-008 | Library | Library context discoverability, component image upload fallback, and project-source vs template provenance are missing as standalone issues. | CSV `LIB-001`, `LIB-002`, `LIB-003`; raw test map component-library row; `src/app/api/component-library/images/route.ts` has detailed upload errors; `TemplatesTree.tsx:1044-1061` distinguishes read-only project sources and disabled insertion reasons. | Closed-beta estimating depends on trust in reusable costs. Users need to know whether they are inserting a library component, project source, or template, and how to recover from image/provider failures. | Add three library issues or one grouped library issue with sub-scenarios: visible insert entry points, inline upload validation preserving edits, and source/provenance labels plus conversion/promotion copy. |
| ADD-009 | Project data/maps | Coordinate/manual-location validation is missing from the maps issue. | CSV `LOC-011` from raw publication report; `src/lib/projects/location-actions.ts:34-56`; `tests/vitest/project-location-actions.test.ts` rejects invalid lat/lng before Supabase writes. | Maps can fail externally, but users can also mistype coordinates locally. Provider fallback alone does not cover repeated edit failures. | Extend map issue to include manual coordinate validation messages near fields and address-only recovery. |
| ADD-010 | Share/publication | Personalized recipient session loss and unsubscribe dead ends are not fully represented. | CSV `SHARE-005`; raw publication report `PUB-003`, `PUB-005`; `SharePageDecision.tsx:200-218`, `SharePageComments.tsx:357-362`, `src/app/api/share/[token]/unsubscribe/route.ts:71-123`. | Public recipients are not app users. If their personalized link/session/unsubscribe path fails, they need owner contact/request-new-link guidance. | Add explicit recipient-session recovery and unsubscribe-invalid/expired copy to the share-link issue, not just password/expired/revoked link copy. |
| ADD-011 | AI operations | AI audit data exists, but support/admin inspection is missing from the issue log. | CSV `AI-003`; raw publication report `AI-014`; `src/lib/ai/audit.ts` writes metadata-only action/data-access rows; `tests/vitest/ai-audit-schema.test.ts` asserts admin-viewable audit tables. | AI support cannot explain failed or blocked actions if audit records require ad hoc DB access. | Add admin/support audit viewer or a documented query/runbook before AI beta expansion. |
| ADD-012 | Notifications | Notification scope and release-announcement campaign safety are missing. | CSV `NOTIF-001`, `NOTIF-002`; raw auth report `NOTIF-011`, `NOTIF-012`; test map notifications/feedback/legal row. | Beta users may expect notification items before entering workshop, and release campaigns can create unsafe or confusing CTAs. | Add route-scope explanation or deliberate product note for workshop-only notifications; keep campaign preview and href allowlist checks as a release issue. |

## Duplicate, Overlapping, Or Stale Entries

| Issue(s) | Assessment | Recommendation |
|---|---|---|
| `UX-020` collaboration invite email delivery and share recipient email delivery from CSV `SHARE-002` | Related but not true duplicates. Collaboration invites and publication recipient delivery have different actors, fallback links, and state copy. | Keep separate user-journey rows if possible, but share a common provider-readiness checklist for Resend/config/inbox proof. |
| `UX-019` maps provider readiness and `UX-029` operations/provider readiness | Overlap is acceptable because map fallback is user-workflow-specific while operations is release-governance-specific. | Keep both, but make `UX-029` point to provider proof checklists and `UX-019` point to the user-facing map/address fallback. |
| `UX-016` export 413 and `UX-017` preview design lint | Not duplicates even though CSV `EST-009` combines them. One is workflow failure/preflight; one is preview hierarchy/design-system validation. | Keep split. Add audience mismatch (`EXP-008`) if export UX is expanded. |
| `UX-009` project cards do not surface active shared-link status | Potentially stale or too absolute in current source. `projects-page-client.tsx:185` includes "shared link published" in search text, but `LiveProjectCard` status chips omit a visible shared-link chip and `tests/vitest/projects-page-shared-access.test.tsx:167-169` still expects no explicit indicator. | Reword to "active shared-link status is searchable but not visually scannable on cards" unless current branch intentionally adds the chip elsewhere. |
| `UX-001` public marketing copy drift | This compresses CSV `PUBSITE-001` and `PUBSITE-002`. That is acceptable; both are copy/readiness governance rather than separate UI bugs. | Keep one issue, but mention public pricing/contact pages explicitly if the owner wants a checklist. |

## Too Vague Or Under-Specified Entries

| Issue | Problem | Tightened Wording |
|---|---|---|
| `UX-004` root global error/not-found boundaries | It names launch-readiness gaps but not the user scenarios or route scope. | "Add branded root `global-error`, root `error`, and root `not-found` fallbacks for public/auth/workshop entry failures; verify login, workshop, project, and share unknown-route recovery." |
| `UX-012` accidental drag/drop reorder | "Clearer drop targets, keyboard reorder, and undo" is directionally right but not testable. | Specify scenarios: accidental cross-area drop, same-area reorder, stale rollback failure, keyboard move up/down/indent/outdent, and undo toast expiry. |
| `UX-013` stale library metadata or thumbnail mismatch | It does not define stale relative to what. | Name the stale signals: source library item revision/version, pricing date, source URL/supplier, thumbnail URL mismatch, and project-specific/unlinked state. |
| `UX-019` Google Maps provider failures | It stops at external provider readiness and address-only fallback. | Include local coordinate validation and manual edit failures, with field-level errors for invalid latitude/longitude and provider fallback copy. |
| `UX-024` AI feature flags/quota/provider/draft expiry | This merges three separate failure classes: availability, package apply lifecycle, and support auditability. | Split into `AI availability/quota/provider disabled states`, `AI draft/apply expiry and confirmation`, and `AI support/audit inspection path`. |
| `UX-029` operations provider proof | The issue lists many operational domains in one sentence, making ownership unclear. | Break into checklist rows or owner columns: monitoring/error sink, Resend/inbox delivery, legal/DSAR, Supabase/RLS/provider migrations, Vercel/hosted smoke, Maps key/quota/billing. |

## CSV Rows That Should Not Automatically Become Issues

Some CSV rows describe validation strategy rather than a current user-facing defect. Keep them in testing plans unless a concrete user scenario is identified:

- `EST-001` authenticated route layout proof absent: important validation gap, but not itself a UX issue unless a blank/stuck route is observed.
- `EST-003` full tab workflow fixture dependency: test fragility unless tied to a user-visible tab failure.
- `PROJECT-001` shared/owned tabs can drift if roles change: keep as contract-test guard unless current role display is wrong.
- `ADMIN-001` status query-string handling easy to regress: useful test note, not a current beta user issue unless filters are currently confusing.
- `SHARE-006` future third-party assets can break CSP/cache posture: keep in security/change checklist unless a current asset integration is failing.

## Recommended Next Synthesis Pass

1. Add the missing issues above to the canonical issue log or CSV only after owner-approved synthesis; this report intentionally did not edit canonical files.
2. For each added issue, require one of: source line, existing test, raw report ID, or explicit "provider/manual proof needed" status.
3. Normalize issue granularity: one issue should map to one actor-facing failure and one fixable product/logistics outcome.
4. Update `post-fix-scenario-tests.md` only after canonical issue changes, so retest scenarios do not drift ahead of the official backlog.

## Validation Notes

- No browser automation was run.
- Source/test evidence was sampled with targeted `rg`, `sed`, `nl`, and CSV parsing only.
- This pass wrote only this report path.
