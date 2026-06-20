# Consolidated Findings And Upgrade Backlog

Date: 2026-06-20

## Executive Finding

The shared-link feature is substantially implemented, but it had a few sharp readiness gaps across correctness, public API safety, receiver UX, and performance. The most important fixed bug was stale snapshot acceptance: a recipient with an old open page could submit feedback after the manager republished changed proposal content. That is now rejected at the route layer and restored in the database RPC migration contract.

## Fixed In This Iteration

| ID | Severity | Status | Evidence |
|---|---:|---|---|
| SEC-SHARE-01 | P1 | Fixed | `src/app/api/share/[token]/comment/route.ts`, `src/app/api/share/[token]/decision/route.ts`, `supabase/migrations/20260620142000_restore_shared_link_snapshot_equality_lock.sql`, `tests/vitest/project-publication-comments.test.tsx`, `tests/vitest/project-publication-decision.test.tsx`, `tests/vitest/security-findings-publication-contracts.test.ts` |
| QA-P0 decision note safety | P0 | Fixed | `src/lib/share/sanitize-recipient-text.ts`, `src/app/api/share/[token]/decision/route.ts`, `tests/vitest/project-publication-decision.test.tsx` |
| QA-P0 weak comment sanitizer assertion | P0 | Fixed | `tests/vitest/project-publication-comments.test.tsx` now asserts sanitized RPC payload exactly |
| PERF-02 | P1 | Fixed | `src/app/api/share/[token]/route.ts` uses `after()` for open telemetry; `tests/vitest/project-publication-route.test.ts` proves response/failure isolation |
| PERF-01A | P2 | Fixed | `/api/share/[token]/session` now schedules recipient session-start analytics with `after()` and catches failures; `tests/vitest/project-publication-page.test.tsx` proves session creation still succeeds when analytics rejects |
| PERF-11 / RT03 | P3 | Fixed | `src/app/share/[token]/loading.tsx`, guarded by `tests/vitest/share-no-store-invariants.test.ts` |
| RUX-01 | P1 | Fixed | `src/components/share/ShareEstimateTreePanel.tsx`, `tests/vitest/share-estimate-tree-panel-a11y.test.tsx` |
| RUX-02 | P1 | Fixed | `src/components/share/SharePageRecipientSessionInitializer.tsx`, `tests/vitest/share-recipient-session-initializer.test.tsx` |
| RUX-03 | P1 | Fixed | `src/app/share/[token]/not-found.tsx`, guarded by `tests/vitest/share-no-store-invariants.test.ts` |
| RUX-04 | P1 | Fixed | `src/components/share/SharePageTabs.tsx`, `src/app/share/print.css`, `tests/vitest/project-publication-page.test.tsx` |
| SEC-SHARE-02 | P1 | Fixed | `src/app/api/share/[token]/session/route.ts`, `src/components/share/SharePageRecipientSessionInitializer.tsx`, `src/lib/publication/public-repository.ts`, `tests/vitest/project-publication-page.test.tsx`, `tests/vitest/share-recipient-session-initializer.test.tsx` |
| SEC-SHARE-03 | P1 | Fixed | `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/route.ts`, `src/lib/publication/public-repository.ts`, `tests/vitest/project-publication-page.test.tsx`, `tests/vitest/project-publication-route.test.ts` |
| MANAGER-F-01/F-02 | P1 | Covered | `tests/vitest/project-publication-actions.test.ts`, `tests/vitest/project-publication-header.test.tsx` now guard central manager assertion ordering and rotate/revoke duplicate-submit paths |
| SEC-SHARE-04 | P2 | Fixed | `src/lib/publication/public-repository.ts`, `src/app/api/share/[token]/comment/route.ts`, `src/app/api/share/[token]/decision/route.ts`, `tests/vitest/security-findings-publication-contracts.test.ts` |
| RUX-08 | P2 | Fixed | `src/components/share/SharePageComments.tsx`, `tests/vitest/project-publication-comments.test.tsx` |
| RUX-09 | P2 | Fixed | `src/components/share/ProjectPublicationPasswordForm.tsx`, `tests/vitest/project-publication-page.test.tsx` |
| PERF-03 | P1 | Fixed | `src/lib/publication/public-repository.ts` throttles expired rate-limit cleanup; `tests/vitest/project-publication-public-repository.test.ts` guards no per-attempt delete |
| PERF-04 | P2 | Fixed | `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql`, `src/lib/publication/activity-helpers.ts`, `src/app/api/share/[token]/activity/route.ts`, `src/lib/publication/actions.ts`, `tests/vitest/project-publication-activity.test.tsx` |
| SEC-SHARE-05 | P1 | Fixed | Public `/api/share/[token]/activity` no longer selects or returns comment bodies; `tests/vitest/project-publication-activity.test.tsx` guards unauthenticated activity responses against comment text leakage |
| PERF-07 | P2 | Fixed | `src/components/share/ShareEstimateTreeView.tsx`, `src/components/share/ShareEstimateTreePanel.tsx`, `tests/vitest/share-estimate-tree-view-performance.test.tsx` |
| PERF-07B | P2 | Fixed | `src/components/share/SharePageTabs.tsx`, `tests/vitest/project-publication-page.test.tsx` cap Grid Preview rows at 250 with visible refine-filter copy |
| PERF-08 | P2 | Fixed | `src/lib/publication/actions.ts` processes recipient invitation pipelines with bounded concurrency; `tests/vitest/project-publication-rotate-resend.test.ts` proves overlapping sends |
| PERF-13 | P2 | Fixed | `src/lib/publication/actions.ts` selects `source_snapshot->>imageUrl` instead of full `source_snapshot`; `tests/vitest/project-publication-actions.test.ts` pins the narrow projection |
| PERF-14 | P2 | Fixed | `SharePageTabs` defers the full print package until `beforeprint` instead of mounting all estimate rows on first render; `tests/vitest/project-publication-page.test.tsx` covers `beforeprint`/`afterprint` |
| PERF-10 | P3 | Fixed | Public comment POST returns the canonical inserted comment; `SharePageComments` reconciles the optimistic row without reloading the full comments list; `tests/vitest/project-publication-comments.test.tsx` guards both route response and client request count |
| RUX-05 | P1 | Fixed | Informative receiver copy moved from `text-tertiary` to `text-secondary` across shared-link surfaces, including `SharedLinkActivityFeed.tsx` |
| RUX-06 | P2 | Fixed | `SharePageSessionBanner.tsx` uses 44px-class hit areas for receiver recovery/dismiss actions and `tests/vitest/project-publication-page.test.tsx` pins the banner sizing/contrast contract |
| RUX-07 | P2 | Fixed | Mobile grid/tree rows show quantity and unit metadata; `tests/vitest/project-publication-page.test.tsx` and `tests/vitest/share-estimate-tree-panel-a11y.test.tsx` cover this |
| RUX-10 / SHF-01 | P2 | Fixed | Receiver page now mounts the public-safe activity feed through `/api/share/[token]/activity`; `tests/vitest/project-publication-page.test.tsx` verifies the route fetch |
| RUX-15 | P3 | Fixed | `SharedLinkActivityFeed.tsx` uses existing accent tokens instead of one-off orange notice classes |

## Remaining P1 Backlog

No P1 findings from this audit pass remain open after the implementation and regression coverage above.

## Remaining P2 Backlog

| ID | Finding | Impact | Recommended next action |
|---|---|---|---|
| PERF-05 | Comment/decision writes repeat app-layer and RPC-layer publication/recipient lookups. | Extra serial DB round trips on recipient interactions. | Prototype one secure RPC path only after security review. |
| PERF-01 | Recipient link personalization still needs first render + client session POST + reload, though session analytics no longer blocks the POST response. | First personalized paint/TTI remains slower than an ideal server cookie redirect. | Evaluate a server route/redirect session flow only after token-leakage and cookie-setting review. |
| PERF-06 | Snapshot JSON still duplicates row data across shapes and grows linearly with package size. | Publish/public payload size can grow quickly for very large projects. | Measure snapshot bytes and publish duration before a normalized snapshot redesign. |
| RUX-11 | Storybook share receiver coverage is still fixture-only. | Designers cannot inspect full password/recipient/comment/activity state matrix in Storybook. | Add mocked integrated component stories for the real receiver surfaces. |

## Deployment Constraints

- `activity_target_labels_json` is a migration-before-code dependency. Old code is safe against the new schema because the column has a non-null default, but new code selecting/writing the column requires `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql` to be applied first.
- Local migration listing could not be proven because local Supabase Postgres was not running on `127.0.0.1:54322`.

## Database Hardening Backlog

Pending-review migrations remain useful but should be promoted deliberately:
- `AC-MOD-06_one_published_publication_per_project.sql`
- `AC-MOD-04_shared_link_responses_recipient_set_null.sql`
- `AC-MOD-T4-P3_project_publication_events_manager_rls.sql`
- `AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql`
- `AC-MOD-T4-P5_fk_covering_indexes.sql`
- `AC-MOD-T4-P6_snapshot_size_guardrail.sql` (provider-applied on 2026-06-19 per pending-review README, but still not promoted into canonical local migration history)

Priority:
1. One live published publication per project after duplicate preflight.
2. Preserve decisions when recipients are removed, if product wants historical decision retention.
3. Activity/comment/index hygiene and snapshot-size guardrails before larger beta traffic.

## Product Decisions Needed

- Should content-only republish require recipient reload before comments/decisions? Current implementation now says yes for correctness.
- Should public snapshots expose exact `project.location`, `clientName`, and public IDs? Current implementation does.
- Is in-memory digest throttling acceptable through closed beta, or should it move to durable storage before scale-out?
- How should the provider-applied-but-local-pending migration set be reconciled without re-applying already-present objects?
