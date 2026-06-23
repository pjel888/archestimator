# Post-Fix Scenario Tests

Date: 2026-06-22

These are the second-pass user-behavior scenarios requested for the state after the best fixes are implemented. They are written as "as if fixed" tests: if the proposed solution existed, this is what the user would experience and what the test should verify.

## Retest Protocol

1. Start from the relevant row in `canonical-feature-status.csv`.
2. Apply the fix from `ux-logistical-errors-and-fixes.md`.
3. Run the smallest focused automated test for that behavior.
4. When the behavior is UI, perform one browser/user-story smoke only if static/component tests cannot prove the claim.
5. Record the result back in the canonical CSV status columns, not in a second spreadsheet.

## Post-Fix Scenarios

| Issue ID | Post-Fix User Scenario | Verification That Would Prove The Fix | Expected Result If Fixed |
|---|---|---|---|
| UX-001 | Visitor opens public landing/features/pricing pages and sees beta/planned wording aligned with implemented status. | Snapshot or text-contract test against approved feature-maturity labels. | No public claim describes an unavailable feature as generally available. |
| UX-002 | Denied beta user opens `/beta/access-required`, submits/accesses support request status, and sees next step. | Page/component test plus admin queue/action test. | User sees pending/revoked/denied state and recovery path. |
| UX-003 | User accepts Terms while persistence temporarily fails, sees retry/support copy, retries after recovery, and lands on next path. | Terms action failure test and success redirect test. | No silent loop; acceptance either persists or gives actionable recovery. |
| UX-004 | User reaches unknown route or root app failure. | Route-boundary tests for root `not-found`, `error`, and `global-error`. | Branded recovery UI appears with safe navigation. |
| UX-005 | Non-admin opens settings and can see why beta/admin tools are unavailable. | Settings modal/page role test. | Hidden capabilities have role-aware explanation without exposing actions. |
| UX-006 | Manager deletes a project group named Pipeline. | Component test for confirmation copy and server-action success state. | Copy states projects remain and move to Ungrouped; success confirms result. |
| UX-007 | Manager edits project client/currency/image, clicks backdrop, presses Escape, and uses close button. | Project details modal dirty-state test. | Each close path prompts to save, stay, or discard; pending upload cannot vanish silently. |
| UX-008 | Manager starts irreversible delete/archive flow with assistive tech semantics. | Modal role test expects `alertdialog` when destructive tone is used. | Destructive flow has interruption semantics plus typed confirmation. |
| UX-009 | Owner scans project list with one active password-protected share and one private project. | Project card test for shared-link chip, lock status, and no token exposure. | Active shared project is identifiable without leaking token. |
| UX-010 | Estimator with existing estimates sees a visible blank-row create affordance. | Estimate table component test for placeholder/plus affordance and keyboard create. | User can discover and use inline estimate creation. |
| UX-011 | Inline rename or budget save fails. | Component test asserts fixed toast alert behavior, scoped ID update, focus stability, and non-shifting row/cell affordance. | User sees why rollback occurred without hover-only title or layout shift. |
| UX-012 | User accidentally drags an estimate node, then undoes. | DnD test with undo action and keyboard reorder test. | Reorder can be reversed and keyboard path is equivalent. |
| UX-013 | User attempts to replace a row from stale library source. | Insert/replace component test for stale badge and refresh/compare path. | User sees stale status and can refresh or compare before replacement. |
| UX-014 | User opens row history containing malformed old snapshot. | Row details test for unavailable snapshot reason. | History explains missing snapshot rather than silently omitting context. |
| UX-015 | Wave 1 user opens Activity/history while named versions remain dormant. | Test/source review confirms dormant named-version guards remain and no full Versions panel is introduced; later recovery test may assert restore-as-copy explanatory copy if activated. | Dormant versioning is not accidentally productized in Wave 1. |
| UX-016 | User tries exporting a very large proposal workbook. | Export preview/preflight test for size estimate and split guidance. | User receives preflight warning before failed download. |
| UX-017 | User opens proposal export preview. | Focused design lint and preview DOM test. | Dialog passes design lint and keeps actions/readability intact. |
| UX-018 | Planner opens data/charts after chart state refactor. | Focused chart lint plus chart UI/a11y/aggregation tests. | No derived-state lint failure and charts remain semantically correct. |
| UX-019 | Maps provider key is missing or quota fails while editing project location. | Map/provider-missing test and address-only edit test. | User can keep editing address/location fields without map tiles. |
| UX-020 | Owner sends an invite while email delivery is disabled. | Invite composer test for readiness state and copy-link fallback. | Owner sees email is disabled and can copy a reliable invite link. |
| UX-021 | Two collaborators edit while one disconnects/reconnects. | Two-client E2E or realtime integration test. | Stale/offline/reconnected state is visible and cursors do not imply false presence. |
| UX-022 | Recipient opens expired/revoked/password-locked share link or loses session. | Share route/password/session tests for recovery copy and timer. | Recipient sees retry, lockout timer, owner contact, or request-new-link path. |
| UX-023 | Owner opens a long share activity feed. | Activity feed test for count, load more, and terminal state. | User knows how much activity is loaded and can fetch more. |
| UX-024 | AI is disabled, quota-limited, provider-unavailable, or draft expired. | AI UI/route tests for disabled reasons, quota/provider copy, and draft expiry. | User knows why AI cannot continue and how to recover or regenerate. |
| UX-025 | Feedback persistence fails after tester writes a long message. | Feedback action/form test asserts mailto body preserves safe submitted fields. | Tester opens prefilled email and does not retype feedback. |
| UX-026 | Support has more than 50 feedback records. | Feedback review test for pagination/search. | Support can reach older records. |
| UX-027 | Two async operations fail at nearly the same time. | Toast test with distinct scoped IDs, fixed viewport, and no inserted inline error/banner layout shift. | Critical failure is not overwritten by another toast and the page layout stays stable. |
| UX-028 | Operator runs targeted QA manifest after quarantining slow/hanging suites. | Script/CI test proves each route-specific target exits and reports status. | Full-app QA has actionable green/red signals instead of hanging. |
| UX-029 | Operator checks provider readiness before wider beta. | Provider checklist scripts for Resend, Supabase, Vercel, monitoring, legal/support, Maps. | Provider claims are marked proven, blocked, or not tested with evidence. |
| UX-030 | Estimator starts a rough estimate on mobile or poor network, edits values, is interrupted, and returns. | Estimate-sheet mobile/resume test or browser smoke for draft state, pending edits, and recovery copy. | User understands whether edits saved, are pending, or must be retried. |
| UX-031 | Wave 1 planner inspects the selected later shared-link field package slice. | Decision/addendum review confirms `UX-031` is P2/deferred, no field package code is started, and no new roles/RLS are introduced while cohort is estimator/PM-only. | Future field scope is clear without creating Wave 1 authz or product-surface risk. |
| UX-032 | PM or owner runs lightweight readiness review before sharing. | Project dashboard readiness test for checklist items, notes, owner-visible gaps, and no approval/margin/lifecycle workflow. | Publish/export readiness is clearly ready, blocked, or warning-state without a full approval system. |
| UX-033 | Library curator sees stale or conflicting supplier/cost-source data, assigns refresh, reconciles entries, and locks accepted cost. | Library sourcing workflow test for stale queue, reconciliation, and accepted-cost state. | Cost provenance moves from stale/conflicted to reviewed/accepted with audit trail. |
| UX-034 | Reviewer uploads a new spec sheet, ties it to a component variant, approves it, and verifies old revision remains auditable. | Attachment API/component test for version metadata, approval state, and rollback/audit visibility. | Current approved attachment is clear and older revisions are not lost. |
| UX-035 | Non-technical client opens a share link for the first time. | Share recipient component/browser test for plain-language summary, labels, decision meaning, and next steps. | Recipient understands what they are reviewing and what action is expected. |
| UX-036 | Recipient returns with expired session, invalid link, invalid unsubscribe link, or a failed attachment/image. | Share route/API tests for recovery copy and asset-failure states. | Recipient sees retry, unlock, request-new-link, or contact-owner guidance. |
| UX-037 | Recipient prints the packet, loads older activity, submits a comment, and retries after a simulated failure. | Share print/activity/comment/decision tests for completion states and retry persistence. | Printable packet and interactions preserve context without silent loss. |
| UX-038 | Incident, provider, legal/privacy, support, and launch operators each open their assigned readiness/checklist surface. | Operations manifest check that each operator row has owner, evidence field, stop condition, and external proof flag. | Operational work is assignable and not hidden inside one generic `OPS-001` bucket. |
| UX-039 | Release operator validates a seeded/manual announcement row, checks CTA safety, and inspects delivery. | Notification definition/release-row test or manual/provider proof against existing notification surfaces; no rich composer route required. | Manual campaign cannot ship with unsafe link or unknown delivery state. |
| UX-040 | Support diagnoses denied beta access, broken invite, missing workspace, or revoked status. | Admin repair workflow test for lookup, diagnosis, repair action, and audit note. | Blocked user gets a precise support answer and repair is recorded. |
| UX-041 | Auditor opens the canonical CSV and checks a story with related tests, browser proof, provider proof, and missing post-fix proof. | CSV schema validation checks evidence-status vocabulary and targeted verification IDs. | Evidence status accurately distinguishes proof levels. |
| UX-042 | Operator checks invite routes, asset APIs, share events, component/template routes, root recovery, and Resend webhook docs. | Route/API inventory validation plus source path checks. | Routes and webhook path match current code, including `/api/webhooks/resend`. |
| UX-043 | User or support follows auth/account/invite recovery for bad `next`, broken invite, workspace save failure, or missing role access. | Auth/account/invite recovery tests for user copy and admin repair path. | Failure mode is named and recovery action is available. |
| UX-044 | Estimator enters invalid numeric data and navigates/reorders the estimate tree by keyboard. | Estimate validation, fixed toast, focus stability, keyboard reorder, and no-layout-shift tests. | Invalid input and keyboard actions are recoverable and accessible without reflowing transient errors. |

## Story-Level Retest Groups

- Public and auth: `PUBSITE-001`, `PUBSITE-002`, `PUBSITE-003`, `AUTH-001`, `AUTH-002`, `AUTH-003`, `AUTH-004`, `AUTH-005`.
- Workshop and account: `SHELL-001`, `SHELL-002`, `SHELL-003`, `ACCOUNT-001`, `ACCOUNT-002`.
- Projects and estimates: `PROJECT-001`, `PROJECT-002`, `PROJECT-003`, `PROJECT-004`, `PROJECT-005`, `PROJECT-006`, `EST-001`, `EST-002`, `EST-003`, `EST-004`, `EST-005`, `EST-006`, `EST-007`, `EST-008`, `EST-009`.
- Library, data, and location: `LIB-001`, `LIB-002`, `LIB-003`, `DATA-001`, `DATA-002`, `MAP-001`.
- Collaboration and share links: `COLLAB-001`, `COLLAB-002`, `COLLAB-003`, `SHARE-001`, `SHARE-002`, `SHARE-003`, `SHARE-004`, `SHARE-005`, `SHARE-006`.
- AI, notifications, feedback, and operations: `AI-001`, `AI-002`, `AI-003`, `NOTIF-001`, `NOTIF-002`, `NOTIF-003`, `FEEDBACK-001`, `FEEDBACK-002`, `OPS-001`.
- Second-pass persona stories: `EST-010`, `EST-011`, `EST-012`, `EST-013`, `FIELD-001`, `FIELD-002`, `PM-001`, `PM-002`, `OWNER-001`, `OWNER-002`, `COLLAB-004`, `SHARE-007`, `SHARE-008`, `SHARE-009`, `SHARE-010`, `SHARE-011`, `SHARE-012`, `SHARE-013`, `LIB-004`, `LIB-005`, `LIB-006`, `LIB-007`, `COST-001`, `OPS-002`, `OPS-003`, `OPS-004`, `LEGAL-002`, `SUPPORT-001`, `SUPPORT-002`, `NOTIF-004`, `NOTIF-005`, `ADMIN-002`, `ADMIN-003`, `INVITE-001`, `ROUTE-001`, `API-001`, `API-002`, `PUBSITE-004`.

Each group should be retested after its related issues are fixed. The first retest should be targeted component/action tests; browser/provider proof should be added only for the claim that cannot be proven locally.
