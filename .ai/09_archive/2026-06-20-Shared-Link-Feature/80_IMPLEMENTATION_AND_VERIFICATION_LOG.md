# Implementation And Verification Log

Date: 2026-06-20 · **As-of remediation: 2026-06-21**

Status: **Landed (code + focused tests + provider readback + code review) — app deploy/live-QA/visual/perf gates OUTSTANDING.** Finding IDs/severities/statuses are bound to [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md) (canonical; 75 wins on any disagreement). Deploy ordering, drift reconciliation, and rollback live in [`90_DEPLOY_AND_MIGRATION_RUNBOOK.md`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md). Ratified decisions are in [`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md). Codex review-gate status belongs in [`LOOP_LEDGER.md`](LOOP_LEDGER.md) (see §Codex Review-Gate Status below).

## Files Changed

Source:
- `next.config.ts`
- `src/proxy.ts`
- `src/app/api/share/[token]/comment/route.ts`
- `src/app/api/share/[token]/decision/route.ts`
- `src/app/api/share/[token]/route.ts`
- `src/app/api/share/[token]/session/route.ts`
- `src/app/share/[token]/loading.tsx`
- `src/app/share/[token]/not-found.tsx`
- `src/app/share/print.css`
- `src/app/share/[token]/page.tsx`
- `src/app/api/share/[token]/activity/route.ts`
- `src/components/share/SharedLinkActivityFeed.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/share/ProjectPublicationPasswordForm.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/components/share/SharePageRecipientSessionInitializer.tsx`
- `src/components/share/SharePageSessionBanner.tsx`
- `src/components/share/SharePageSummaryCard.tsx`
- `src/components/share/SharePageTabs.tsx`
- `src/components/workshop/ProjectPublicationHeader.tsx`
- `src/components/workshop/publication/RecipientEmailComposer.tsx`
- `src/stories/domain/share/receiver-states.stories.tsx`
- `src/lib/publication/actions.ts` (owner server actions — implements items 15/18/20: `activity_target_labels_json` persist on publish/republish/rotate at `actions.ts:567,637,698`, compact-label read in `loadSharedLinkActivity` at `actions.ts:1392,1458`, bounded-concurrency recipient sends at `actions.ts:786-791,1038`, and `imageUrl:source_snapshot->>imageUrl` row projection at `actions.ts:399`)
- `src/lib/publication/activity-helpers.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/share-copy.ts`
- `src/lib/publication/snapshot.ts`
- `src/lib/publication/types.ts`
- `src/lib/share/sanitize-recipient-text.ts`
- `scripts/check-storybook-component-coverage.mjs`
- `scripts/measure-shared-link-perf-budgets.ts`
- `scripts/smoke-share-headers.mjs`
- `scripts/seed-shared-link-smoke.ts`
- `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql`
- `supabase/migrations/20260620142000_restore_shared_link_snapshot_equality_lock.sql`

Tests:
- `tests/vitest/project-publication-actions.test.ts`
- `tests/vitest/auth-proxy.test.ts`
- `tests/vitest/project-publication-comments.test.tsx`
- `tests/vitest/project-publication-decision.test.tsx`
- `tests/vitest/project-publication-header.test.tsx`
- `tests/vitest/project-publication-page.test.tsx`
- `tests/vitest/project-publication-route.test.ts`
- `tests/vitest/project-publication-public-repository.test.ts`
- `tests/vitest/project-publication-rotate-resend.test.ts`
- `tests/vitest/recipient-email-composer.test.tsx`
- `tests/vitest/security-findings-publication-contracts.test.ts`
- `tests/vitest/project-publication-security-hardening.test.ts`
- `tests/vitest/project-publication-security-headers.test.ts`
- `tests/vitest/landing-security-headers.test.ts`
- `tests/vitest/proxy-sensitive-cache-headers.test.ts`
- `tests/vitest/share-no-store-invariants.test.ts`
- `tests/vitest/share-estimate-tree-panel-a11y.test.tsx`
- `tests/vitest/share-estimate-tree-view-performance.test.tsx`
- `tests/vitest/share-recipient-session-initializer.test.tsx`
- `tests/vitest/share/recipient-content-escaping.test.tsx`
- `tests/vitest/design-enforcer-share-allowlist.test.ts`
- `tests/vitest/shared-link-perf-budgets-script.test.ts`
- `tests/vitest/shared-link-header-smoke-script.test.ts`
- `tests/vitest/shared-link-smoke-seed-script.test.ts`
- `tests/vitest/storybook-component-coverage.test.ts`
- `tests/vitest/storybook-provider-boundary.test.ts`

Audit artifacts:
- `00_INDEX.md`
- `10_SECURITY_PRIVACY_API_AUDIT.md`
- `20_RECEIVER_UX_UI_ACCESSIBILITY_AUDIT.md`
- `30_MANAGER_WORKFLOW_AUDIT.md`
- `40_TEST_QA_ULTRAQA_MATRIX.md`
- `50_PERFORMANCE_SPEED_AUDIT.md`
- `60_SPEC_TRACEABILITY_ARCHITECTURE_AUDIT.md`
- `70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md`
- `80_IMPLEMENTATION_AND_VERIFICATION_LOG.md`
- `85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md`
- `99_QUALITY_SCORECARD_AND_SIGNOFF.md`
- `LOOP_LEDGER.md`
- `evidence/perf-budgets.md`
- `evidence/shared-link-activity-benchmark.md`
- `evidence/review/codex-review-shared-link-2026-06-21.md`

## Implementation Details

### 1. Stale Snapshot Write Rejection

Problem:
- The latest RPC migration accepted old `p_expected_snapshot_version` values as long as they were not greater than the current snapshot version.
- Routes accepted a signed view token from an older rendered proposal after a content-only republish.

Change:
- Comment and decision POST routes now return `409` when `viewedSnapshotVersion !== access.snapshotVersion`.
- New migration restores `v_snapshot_version is distinct from p_expected_snapshot_version` equality in `insert_client_comment` and `submit_client_response`.
- Tests now prove stale view tokens fail and current view tokens pass.

### 2. Public Recipient Text Sanitization

Problem:
- Comment body sanitization existed but had weak test assertions.
- Decision notes could be sent directly to the API with HTML/script-like content and only client textarea limits protected normal UI use.

Change:
- Added `sanitizeSharedLinkRecipientText(input, maxLength)` shared helper.
- Comment route reuses the helper with a 1000-character limit.
- Decision route sanitizes/truncates notes with a 2000-character limit before RPC.
- Tests assert sanitized RPC payloads directly, including raw and entity-encoded markup.

### 3. Snapshot API Telemetry Off Response Path

Problem:
- `/api/share/[token]` returned only after `recordProjectPublicationEvent`.
- The page route already used `after()` for the equivalent telemetry path.

Change:
- Snapshot GET schedules event recording with `after(async () => ...)` and catches telemetry failures.
- Route tests capture the `after()` callback and prove JSON response is returned before event insertion runs.

Local Next.js 16 doc checked:
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`
- It explicitly supports `after()` in Route Handlers for non-blocking logging/analytics.

### 4. Share Loading Boundary

Problem:
- `/share/[token]` is dynamic and had no segment loading boundary, so slow token/snapshot resolution could blank during navigation.

Change:
- Added `src/app/share/[token]/loading.tsx` with a proposal-shaped status/skeleton shell.
- Static invariant test now checks for the loading boundary.

### 5. Branded Unavailable Link State

Problem:
- Invalid/revoked/expired links used generic segment 404 behavior.

Change:
- Added `src/app/share/[token]/not-found.tsx`.
- Existing `notFound()` calls stay fail-closed and keep 404/noindex behavior while rendering branded recovery copy without project/client/snapshot details.

### 6. Receiver Tree Keyboard Access

Problem:
- Sidebar tree leaf nodes were clickable but not keyboard-focusable because `tabIndex` was tied only to `hasChildren`.

Change:
- Navigable leaf rows now receive `tabIndex=0`.
- Enter/Space activate navigation for leaves and continue toggling/navigating groups.
- New a11y test renders the sidebar tree and exercises keyboard activation on a leaf.

### 7. Recipient Session Failure State

Problem:
- Personalized recipient links that failed session creation were silently left in anonymous/read-only mode.
- The UI did not explain why commenting and response actions were unavailable.

Change:
- `SharePageRecipientSessionInitializer` now renders a non-printing alert band when session creation fails.
- The alert gives recovery copy without rendering the raw share token or recipient token.
- A focused component test proves the failed POST path, alert copy, and token non-disclosure.

### 8. Full-Package Print Output

Problem:
- The receiver UI only mounts the active estimate tab, so browser print could omit non-active estimate sheets.

Change:
- `SharePageTabs` now renders a `share-print-only` package containing every shared estimate and every estimate tab only on browser print intent, resolving compact v1.3 `rowIds` and legacy v1.2 tab rows.
- `print.css` hides interactive tab chrome during print and shows the full print package instead.
- The page test proves `beforeprint` mounts all included estimate content and `afterprint` removes the package from normal browsing DOM.

### 9. Recipient Session POST Hardening

Problem:
- Recipient session creation used only same-origin checking and had no durable limiter before recipient-token verification.

Change:
- Session POST now reuses `assertSameOriginPublicPost`, requiring the public CSRF header/cookie pair.
- `SharePageRecipientSessionInitializer` now sends `createPublicationCsrfHeaders()`.
- Added `checkSharedLinkSessionStartRateLimit` with a durable `shared_link_session_start` scope before token verification.
- Tests prove missing CSRF fails before verification and rate-limit denial returns `429` without verifying the recipient token.

### 10. Public Open-Event Write Limiting

Problem:
- Page and JSON snapshot opens could still write public open telemetry under repeated reloads even after moving writes off the response path.

Change:
- Deferred page open analytics/event writes now share `checkProjectPublicationEventRateLimit`.
- Deferred JSON snapshot open-event writes also check the event limiter before insertion.
- Tests prove the page/API response still succeeds while limiter denial skips telemetry writes.

### 11. Manager Regression Coverage

Problem:
- Manager mutations already used central authorization and revoke had an in-flight latch test, but rotate duplicate-submit and manager-assertion ordering were not pinned.

Change:
- Added static regression coverage proving every shared-link mutation calls `assertProjectPublicationManager` before writes.
- Added a rotate-confirm double-click test matching the existing revoke guard.

### 12. HMAC-Peppered Structured Log Hashes

Problem:
- Public comment and decision route structured logs used raw SHA-256 hashes of request IP values.
- Unsalted IPv4 hashes are reversible with small dictionary scans.

Change:
- Added exported `hashPublicTelemetryValue()` in the public repository, backed by the existing HMAC telemetry pepper.
- Comment and decision route log helpers now use the HMAC-peppered helper and no longer import `crypto` directly.
- Static contract tests pin the helper and ensure those routes do not reintroduce unsalted IP hashing.

### 13. Receiver Form Accessibility And Comment Ergonomics

Problem:
- Password validation errors were visible text but were not associated with the password input.
- Plain Enter submitted comments, which made multiline note entry error-prone.

Change:
- Password feedback now has a stable alert id, and the input receives `aria-invalid` plus `aria-describedby` when invalid, error, or locked feedback is present.
- The comment textarea now preserves plain Enter for multiline input and submits via button or Ctrl/Command+Enter.
- Component tests cover both contracts.

### 14. Rate-Limit Cleanup Throttle

Problem:
- Durable public rate-limit checks performed expired-row cleanup on every recorded attempt.
- At beta traffic, repeated `delete` work can dominate p95 and write load even when the protected action is small.

Change:
- Added a one-minute in-process cleanup throttle around `cleanupExpiredRateLimitEvents`.
- Made cleanup single-flight in-process so concurrent protected attempts share one cleanup promise.
- Rate-limit insert/count behavior remains durable and unchanged; only opportunistic cleanup frequency changed.
- Repository tests prove repeated and concurrent attempts do not issue repeated deletes.

### 15. Compact Activity Target Labels

Problem:
- Public and owner activity reads selected full `snapshot_json` only to resolve estimate/row display labels.
- Large proposal snapshots made every activity refresh transfer and deserialize a heavy JSON blob.

Change:
- Added `activity_target_labels_json` to `project_publications` with a backfill migration and rotate-RPC update.
- Publish, republish, and rotate now persist compact `{ estimateLabels, rowLabels }` metadata alongside `snapshot_json`.
- Public activity route and owner `loadSharedLinkActivity` select the compact column and no longer project `snapshot_json`.
- Route/action tests prove activity labels still render while the projection excludes `snapshot_json`.

### 16. Large Tree Row Guard

Problem:
- The existing reconstructed-tree row guard could be bypassed when snapshots already had `treeNodes`.
- Large inline tree rows could inflate receiver DOM count and interaction cost.

Change:
- Added desktop/mobile inline row limits in `ShareEstimateTreeView` and `ShareEstimateTreePanel`.
- Overflow rows are summarized with a status line instead of rendered inline.
- Tests prove rows beyond the cap are omitted and mobile inline summaries keep quantity/unit visible.

### 17. Mobile Review Context And Contrast

Problem:
- Mobile grid/tree rows hid quantity and unit context.
- Several informative small receiver labels used `text-tertiary`, which missed AA contrast on white/proposal-paper surfaces.

Change:
- Mobile grid/tree row summaries now show `Qty ... · unit`.
- Informative small copy moved to `text-secondary`; tertiary remains only for less critical/decorative uses.
- Focused page/tree tests prove quantity/unit presence on mobile-rendered content.

### 18. Recipient Failure Tone And Bounded Sends

Problem:
- Recipient composer failure messages could render with success/status styling.
- Adding multiple recipients sent emails and status updates in a strict serial loop.

Change:
- Recipient composer messages now carry structured `success`/`error` tone and render failed sends as alerts.
- `addSharedLinkRecipients` now processes recipient insert-send-status pipelines with bounded concurrency (`4`) while preserving per-recipient ordering and partial-failure reporting.
- Tests prove failed recipient sends are error-toned and multi-recipient sends overlap instead of waiting strictly serially.

### 19. Receiver Activity Handling

Problem:
- V1 specs and public route support described receiver-visible activity, but that exposed an owner-style feed on the client-facing proposal surface.
- The activity component also used one-off orange notice classes and low-contrast tertiary text when used owner-side.

Change:
- The receiver page no longer mounts `SharedLinkActivityFeed`; owner activity remains in the workshop publication manager activity tab.
- The public activity route now redacts comment bodies entirely, so it does not bypass the stricter recipient-session comment API.
- Activity notice and muted text now use existing accent/secondary tokens.
- Page tests prove the receiver page does not render `activity-feed` and does not fetch `/api/share/:token/activity`.

### 20. Review-Discovered Performance And Privacy Fixes

Problem:
- Read-only review found that the public activity feed exposed comment bodies without a recipient session.
- Review also found the full print package and Grid Preview could render large row sets during normal browsing.
- Publish snapshot generation fetched full `source_snapshot` JSON only to read thumbnail `imageUrl`.

Change:
- Public activity no longer selects or returns comment bodies.
- Grid Preview caps matching rows at 250 and shows explicit refine-filter copy.
- The full print package is deferred to `beforeprint` and removed on `afterprint`.
- Publish snapshot row queries select `imageUrl:source_snapshot->>imageUrl` instead of full `source_snapshot`.

### 21. Recipient Session Initializer Lint Fix

Problem:
- Review found `setFailed(false)` ran synchronously in `useEffect`, triggering the `react-hooks/set-state-in-effect` rule.

Change:
- Failure state is now keyed by `token` + `recipientToken`, so prop changes clear the alert naturally without synchronous effect reset.

### 22. Canonical Comment POST Reconciliation

Problem:
- Successful public comment submits optimistically appended, then reloaded the full bounded comments list.
- Active threads paid an extra GET and payload even though the server had just created the inserted row.

Change:
- `insertSharedLinkComment` performs a best-effort confirmation read for the inserted public comment row.
- The comment POST route returns `{ id, comment, created: true }`.
- `SharePageComments` maps the canonical returned row into the optimistic list and no longer reloads comments after a successful POST.
- Route/component tests prove the canonical response and one-GET submit path.

### 23. Receiver Session Banner Touch Targets

Problem:
- The remaining recipient recovery/dismiss controls in the session banner were visually small and used tertiary text on client-facing copy.

Change:
- The reviewer pill and banner copy now use secondary text.
- The "Not you?" and dismiss controls use 44px-class hit areas without changing the dense proposal layout.
- A page-level static regression test pins the session-banner touch/contrast contract.

### 24. Recipient Session Analytics Deferral

Problem:
- Recipient-specific links still need a client session POST before redirecting to the clean shared URL.
- That POST also awaited recipient session-start analytics before returning.

Change:
- The session route now schedules recipient session-start analytics with `after()`.
- Analytics failures are caught so recipient session creation is not converted into a public error.
- A route test proves the session response stays successful when analytics recording rejects.

### 25. Per-Recipient Partial Send Retry Surface

Problem:
- The recipient composer could report partial send failures globally, but individual failed recipients did not have their own failed chip or retry CTA.
- Successfully-sent recipients could be visually mixed with failed recipients, weakening manager recovery flow.

Change:
- `RecipientEmailComposer` now merges per-recipient email results into each chip.
- Successful recipients keep their sent state; failed recipients show a danger-state "failed" chip plus a per-row Retry action.
- Retry uses resend for persisted recipients and add-recipient retry for local-only failed entries.
- `recipient-email-composer.test.tsx` proves a mixed success/failure batch preserves the sent recipient and retries only the failed recipient.

### 26. Real-Component Receiver Storybook Matrix

Problem:
- RUX-11 required a receiver state matrix that imports real share components with mocked seams rather than fixture-only panels or public route imports.

Change:
- Added `Domain/Share/ReceiverStates` stories for password, anonymous/session banner, decision, comments, scope-group/fallback, trust-block, not-found, loading, print, and sticky-mobile states.
- Storybook-local seams set a test cookie and replace `globalThis.fetch`; the story does not import `src/app/share/[token]/page.tsx` or provider/repository code.
- `scripts/check-storybook-component-coverage.mjs` now requires the new story exports, and provider-boundary tests remain green.

### 27. Targeted Test-Rigor Gap Closure

Problem:
- QA-G03/G04/G08/G09 were test-rigor gaps: real DOM escaping, recipient-session redirect/cookie integration, comments-after-decision behavior, and broad status-array assertions.

Change:
- Added `tests/vitest/share/recipient-content-escaping.test.tsx`.
- Extended `share-recipient-session-initializer.test.tsx` to cover POST, CSRF, cookie setup, and sanitized clean-link navigation.
- Replaced the comments-after-decision stub with a real decision lock plus follow-up comment submission through `SharePageComments`.
- Tightened broad status-array assertions in comments/activity/decision tests to exact status/payload expectations.

### 28. Performance Budget Helper And Evidence

Problem:
- The plan required `scripts/measure-shared-link-perf-budgets.ts`, but the helper did not exist; PERF-06 was still "measure first".

Change:
- Added `scripts/measure-shared-link-perf-budgets.ts` with modes for `recipient-session-tti`, `snapshot-bytes`, `password-unlock`, and `rotate-cost`.
- Added regression coverage for the helper.
- Initial local snapshot-byte evidence showed 100 rows PASS, 1k rows PASS, and 10k rows FAIL at 4.87 MiB vs the 4 MiB budget; §29 records the compact v1.3 fix and refreshed PASS evidence.
- Captured local activity composition/query fan-out evidence in `evidence/shared-link-activity-benchmark.md`.

### 29. Compact Snapshot v1.3 Tab Row IDs

Problem:
- PERF-06 was a real payload-size failure: active tab snapshots duplicated each row at `estimate.rows` and again at `estimate.tabs[].rows`.

Change:
- Added compact snapshot schema v1.3. New tabbed snapshots keep `estimate.rows` for legacy readers and store tab membership as `tabs[].rowIds` instead of duplicated row objects.
- Kept legacy v1.2 public-read support for stored snapshots that still include `tabs[].rows`.
- Updated `SharePageTabs` to resolve either v1.3 `rowIds` or legacy v1.2 `rows`.
- Updated the perf-budget helper note and regression tests.

### 30. Receiver Tab Typography Test-Comment Cleanup

Problem:
- RUX-12 was a documentation/test accuracy gap: comments still referred to older `text-[10/9/11px]` scale while the current receiver tabs use `text-[13px]`.

Change:
- `project-publication-page.test.tsx` now asserts the actual `text-[13px]` tab class.
- The path-scoped `/share` Client Portal type-scale exemption is documented in the test where the assertion lives.

### 31. Header-Smoke Helpers

Problem:
- QA-G10 needed a repeatable live header-smoke path, but the repo had no redacted helper for checking public share security headers.

Change:
- Added `scripts/smoke-share-headers.mjs` for HEAD/GET fallback and redacted JSON/Markdown evidence.
- Added `scripts/seed-shared-link-smoke.ts` for local smoke URL creation, with hosted execution explicitly gated.
- Added unit coverage for both helpers; live SHARE_URL execution and visual proof remain open.

### 32. Local Perf Measurement Append Support

Problem:
- PERF-09/PERF-12 evidence needed to coexist with snapshot-byte rows in one perf budget ledger.

Change:
- `scripts/measure-shared-link-perf-budgets.ts` supports append mode and Markdown row rendering.
- `evidence/perf-budgets.md` now includes local CPU-only password-unlock and rotate-cost rows alongside snapshot-byte evidence.

### 33. Unified Unavailable-Link Copy

Problem:
- MANAGER-F-03 had branded not-found page copy and API 404 envelopes that could drift independently.

Change:
- Added `src/lib/publication/share-copy.ts`.
- Public share not-found and API 404 paths now import the same unavailable-link copy contract.
- Route and no-store tests assert the shared contract.

### 34. Behavioral Action-Contract Tests

Problem:
- MANAGER-F-05 tests were still too close to symbol-presence smoke and did not assert action return/write/RPC/revalidation contracts.

Change:
- `project-publication-actions.test.ts` now imports the actual server action module under mocked Supabase/server dependencies.
- It covers republish success/invalid password, rotate success/stale-token conflict, and owner activity-load success/inactive-token failure.

### 35. Full Manager RBAC Role-Rejection Matrix

Problem:
- MANAGER-F-01 still lacked proof that every publication mutation rejected non-manager actors and public/recipient-token visitors, and project/workspace `member` roles could fall through the rank comparison because `member` was absent from `roleRank`.

Change:
- Added `member` to `src/lib/publication/actions.ts` `roleRank` below manager rank.
- Added a 7 mutation actions × 5 actor classes matrix in `project-publication-actions.test.ts`.
- Each matrix case asserts the shared authorization error plus zero publication writes, RPC calls, and revalidations.

### 36. Offline Queue Flush Test Hardening

Problem:
- QA-G07 still had a soft placeholder for offline comment queue behavior.

Change:
- Replaced the placeholder with assertions that an offline comment persists in `sessionStorage`, shows queued UI, retries three failed POST attempts, flushes once on reconnect, clears the queue, sends the queued body/viewToken, and uses a fresh CSRF header instead of a hard-coded token.

### 37. Dashboard Shared-Link Quick Actions

Problem:
- MANAGER-F-06 still required managers to open project detail before common shared-link actions were available.

Change:
- Added `PublishedProjectQuickActions` to the dashboard published-project list.
- Each published row now exposes copy and preview controls with tooltip semantics; manager rows also expose rotate and revoke.
- Rotate and revoke reuse the existing publication server actions, require modal confirmation before mutation, render `ok:false` results as errors, and refresh the dashboard only after success.
- `workshop-reset.test.tsx` now covers keyboard tooltip behavior, absolute-link copy, preview href/target, destructive confirmation gates, server-action payloads, manager-only destructive visibility, `ok:false` errors, and router refresh-on-success.
- `ProjectPublicationHeader` now also treats publication action `{ ok: false }` results as errors before applying local optimistic state; `project-publication-header.test.tsx` covers the stale-rotate path.

## Verification Evidence

Final focused shared-link suite (CANONICAL run — covers the 23 test files that pin the shared-link page, manager,
API, schema, decision-copy, compact snapshot, perf-helper, and smoke-helper contracts):

```bash
bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-route.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/share-estimate-tree-panel-a11y.test.tsx tests/vitest/share-estimate-tree-view-performance.test.tsx tests/vitest/share-recipient-session-initializer.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-rotate-resend.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/project-publication-security-hardening.test.ts tests/vitest/project-publication-schema.test.ts tests/vitest/share/share-page-decision-anonymous.test.tsx tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx tests/vitest/project-publication-snapshot.test.ts tests/vitest/shared-link-perf-budgets-script.test.ts tests/vitest/shared-link-header-smoke-script.test.ts tests/vitest/shared-link-smoke-seed-script.test.ts --maxWorkers=1
```

Result — **CANONICAL run re-executed 2026-06-21 after MANAGER-F-01 five-actor RBAC + QA-G07 offline-queue hardening + MANAGER-F-06 dashboard quick actions** (verbatim vitest summary):

```
 Test Files  23 passed (23)
      Tests  353 passed (353)
   Duration  34.48s
```

- **VERIFIED:** the 23-file canonical command exits `0`, `Test Files 23 passed (23)` / `Tests 353 passed (353)`, zero failed/skipped. Binary gate: **PASS**.
- Historical `15 files / 295 tests`, `16 files / 302 tests`, `16 files / 313 tests`, `19 files / 328 tests`, `21 files / 340 tests`, and `23 files / 352 tests` figures are superseded by the 23-file command above; the current file enumeration, command, and count agree.

Additional checks:
- Focused ESLint passed for `SharePageRecipientSessionInitializer`, `SharePageTabs`, `SharePageComments`, `SharePageSessionBanner`, public comment/session/activity routes, public repository, publication actions, and the touched shared-link tests.
- `bun run type-check` passed again 2026-06-21 after the MANAGER-F-01/QA-G07/MANAGER-F-06 changes.
- Targeted ESLint passed for the MANAGER-F-06 dashboard files:
  `bun run lint src/components/workshop/dashboard/PublishedProjectQuickActions.tsx src/components/workshop/dashboard/WorkshopDashboard.tsx tests/vitest/workshop-reset.test.tsx`.
- `git diff --check` passed again 2026-06-21 after the MANAGER-F-01/QA-G07/MANAGER-F-06 changes.
- MANAGER-F-06 dashboard/header quick-action regression passed 2026-06-21 after review fixes:
  `bunx vitest run tests/vitest/workshop-reset.test.tsx tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx --maxWorkers=1`
  → **3 files / 107 tests passed**.
- Targeted ESLint passed for the MANAGER-F-06 dashboard/header/repository files; ESLint reported two pre-existing warnings in `workspace-repository.ts` (`_workspaceId`, `_createdBy`) and no errors.
- Dashboard follow-up code review findings were resolved and recorded at
  `evidence/review/codex-review-shared-link-dashboard-followup-2026-06-21.md`.
- `rg -n "#FFFDF8" src/components/share src/app/share` returned no matches.
- `rg -n "\bfetch\s*\(" src/stories/domain/share/receiver-states.stories.tsx` returned no matches.
- The no-broad-status-array scan over public share route tests returned no matches for `toContain(res.status)`, numeric `.includes(res.status)`, or `expect([status...])` patterns.
- The canonical command above folds in the formerly separate compact snapshot, perf-helper, header-smoke-helper, and smoke-seed-helper tests. jsdom printed the expected `Not implemented: navigation to another Document` warnings from the intentional `window.location.replace` paths.
- Perf helper coverage passed 2026-06-21:
  `bunx vitest run tests/vitest/shared-link-perf-budgets-script.test.ts --maxWorkers=1`
  → **1 file / 4 tests passed**.
- Storybook source/provider gates passed 2026-06-21:
  `node scripts/check-storybook-component-coverage.mjs`
  → **88 story files/titled stories, 473 exports, 43 required titles, Storybook component coverage OK**.
- Activity benchmark evidence captured:
  `SHARED_LINK_ACTIVITY_BENCHMARK_ROWS=100,500,1000,2500,10000 SHARED_LINK_ACTIVITY_BENCHMARK_LIMIT=100 MARKDOWN_FILE=.ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-activity-benchmark.md bun scripts/benchmark-shared-link-activity.ts`
  → local 10k synthetic activity composition: owner 56.33 ms, public anonymous 40.42 ms, public recipient 40.07 ms.
- Snapshot byte budget evidence captured:
  `bun scripts/measure-shared-link-perf-budgets.ts --mode snapshot-bytes --rows 100,1000,10000 --samples 5 --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md`
  → 100 rows 29.7 KiB PASS, 1k rows 263.1 KiB PASS, 10k rows 2.55 MiB **PASS** vs 4 MiB.
- QA-G10 live header smoke captured against a production-mode local server:
  `PUBLICATION_TOKEN_ENCRYPTION_SECRET=... PUBLICATION_TOKEN_HASH_SECRET=... PUBLICATION_ACCESS_COOKIE_SECRET=... bun run start`,
  then `SHARE_URL="$SHARE_URL" bun scripts/smoke-share-headers.mjs`
  → **PASS 200 HEAD** with CSP, `private, no-cache, no-store, max-age=0, must-revalidate`,
  frame denial, `nosniff`, `no-referrer`, and `noindex`; evidence:
  `evidence/shared-link-smoke/headers-2026-06-21.md`. A matching `curl` GET returned `200`.
- Header/cache regression tests passed after the QA-G10 runtime finding:
  `bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/proxy-sensitive-cache-headers.test.ts tests/vitest/project-publication-security-headers.test.ts tests/vitest/landing-security-headers.test.ts tests/vitest/shared-link-header-smoke-script.test.ts --maxWorkers=1`
  → **5 files / 30 tests passed**. `bun run build` also passed.
- Linked-provider DB performance inventory captured:
  `bun scripts/collect-live-db-performance-evidence.ts --mode linked --run-sql --output-dir .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/live-db-performance-2026-06-21`
  → read-only SQL ran against `ebxxqidacheyapmmzavr`; evidence report + raw JSON written under
  `evidence/live-db-performance-2026-06-21/`. This is provider inventory evidence, not route TTI or EXPLAIN proof.
- Native `code-reviewer` gate passed 2026-06-21; artifact:
  `evidence/review/codex-review-shared-link-2026-06-21.md`.

Provider readback (project `ebxxqidacheyapmmzavr`, 2026-06-21):
- `SUPABASE_CLI_TELEMETRY_OPTOUT=1 supabase migration list --linked` showed `20260620064601`,
  `20260620142000`, `20260621042221`, and `20260621051701` present in both Local and Remote.
- SQL probe: `project_publications` publication count = 11; complete `estimateLabels` object count = 11;
  complete `rowLabels` object count = 11; complete `rowEstimateIds` object count = 11.
- SQL probe: `row_comment_estimate_mismatches = 0`; `row_response_estimate_mismatches = 0`.
- SQL probe: `shared_link_comments` has all 6 target-context columns; `shared_link_responses` has all 5
  target-context columns.
- SQL probe: target-aware `insert_client_comment` and `submit_client_response` are `security_definer = true`,
  `service_role_can_execute = true`, `anon_can_execute = false`, `authenticated_can_execute = false`.

Earlier incremental runs:
- 3 files / 55 tests passed after stale snapshot fix.
- 3 files / 56 tests passed after text sanitizer fix.
- 4 files / 67 tests passed after API telemetry deferral.
- 5 files / 77 tests passed after share loading boundary.
- 6 files / 78 tests passed after tree accessibility fix.
- `bunx vitest run tests/vitest/project-publication-public-repository.test.ts --maxWorkers=1` passed: 11 tests.
- `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1` passed: 31 tests.
- `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1` passed: 32 tests.
- `bunx vitest run tests/vitest/project-publication-rotate-resend.test.ts --maxWorkers=1` passed: 20 tests.
- `bunx vitest run tests/vitest/recipient-email-composer.test.tsx --maxWorkers=1` passed: 14 tests.
- `bunx vitest run tests/vitest/share-estimate-tree-view-performance.test.tsx --maxWorkers=1` passed: 1 test. (Corrected from a `.test.ts` typo; the file on disk is `.test.tsx`.)
- `bunx vitest run tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/share-recipient-session-initializer.test.tsx tests/vitest/project-publication-page.test.tsx --maxWorkers=1` passed: 4 files / 78 tests after the review-discovered fixes.
- `bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-rotate-resend.test.ts --maxWorkers=1` passed: 2 files / 41 tests after the row-image JSON-path query narrowing.
- `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-security-hardening.test.ts --maxWorkers=1` passed: 4 files / 83 tests after canonical comment POST reconciliation and session-banner touch fixes.
- `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1` passed: 1 file / 35 tests after recipient session analytics deferral.

## Per-Item Severity And Canonical 75 Cross-Link

Each implementation item above maps to one or more canonical finding ids in
[`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md). **75 is canonical** for id/severity/status;
the Sev/Status columns here are copied from 75 and corrected to match if they ever drift.

| § | Implementation item | Canonical 75 id(s) | Sev | Status (per 75) |
|---|---|---|:--:|---|
| 1 | Stale snapshot write rejection (route 409 + RPC equality) | SEC-SHARE-01 | P1 | Fixed (gated by **D1**) |
| 2 | Public recipient text sanitization | QA-G01 / QA-G02 | P2 | QA-G01 Stale-invalid · QA-G02 Stale-invalid→Fixed |
| 3 | Snapshot API telemetry off response path | PERF-02 | P1 | Fixed |
| 4 | Share loading boundary | PERF-11 | P3 | Fixed |
| 5 | Branded unavailable link state | RUX-03 | P1 | Fixed |
| 6 | Receiver tree keyboard access | RUX-01 | P1 | Fixed |
| 7 | Recipient session failure state | RUX-02 | P1 | Fixed |
| 8 | Full-package print output | RUX-04 / PERF-14 | P1/P2 | Fixed |
| 9 | Recipient session POST hardening | SEC-SHARE-02 | **P2** | Fixed (70 listed P1 — canonical P2) |
| 10 | Public open-event write limiting | SEC-SHARE-03 | **P2** | Fixed (70 listed P1 — canonical P2) |
| 11 | Manager regression coverage | MANAGER-F-01 / MANAGER-F-02 | P1 | **MANAGER-F-01 Fixed** · MANAGER-F-02 Fixed |
| 12 | HMAC-peppered structured log hashes | SEC-SHARE-04 | P2 | Fixed |
| 13 | Receiver form a11y + comment ergonomics | RUX-08 / RUX-09 | P2 | Fixed |
| 14 | Rate-limit cleanup throttle | PERF-03 | P1 | Fixed |
| 15 | Compact activity target labels | PERF-04 | P2 | Fixed (code) / measure-open |
| 16 | Large tree row guard | PERF-07 | P2 | Fixed |
| 17 | Mobile review context + contrast | RUX-05 / RUX-07 | P1/P2 | Fixed |
| 18 | Recipient failure tone + bounded sends | MANAGER-F-04 (UX) / PERF-08 | P2 | MANAGER-F-04 Fixed · PERF-08 Fixed |
| 19 | Receiver activity handling | RUX-10 / SEC-SHARE-09 / RUX-15 | P2/P1/P3 | Fixed by V2 removal from public receiver; owner activity remains manager-side; **SHF-01 Open** |
| 20 | Review-discovered perf + privacy fixes | SEC-SHARE-09 / PERF-07B / PERF-13 / PERF-14 | P1/P2 | Fixed |
| 21 | Recipient session initializer lint fix | — (review hygiene) | P3 | Fixed |
| 22 | Canonical comment POST reconciliation | PERF-10 | P3 | Fixed |
| 23 | Receiver session banner touch targets | RUX-06 | P2 | Fixed |
| 24 | Recipient session analytics deferral | PERF-01A (partial) | P2 | PERF-01A Open (analytics deferral only; server-redirect gated on **D2**) |
| 25 | Per-recipient partial send retry surface | MANAGER-F-04 | P2 | Fixed |
| 26 | Real-component receiver Storybook matrix | RUX-11 | P2 | Fixed |
| 27 | Targeted test-rigor gap closure | QA-G03 / QA-G04 / QA-G08 / QA-G09 | P1/P2 | Fixed |
| 28 | Performance budget helper + evidence | PERF-06 / PERF-09 / PERF-12 | P2/P3 | Helper landed; PERF-06 fixed in §29 · PERF-09/12 local CPU-only measurements pass; hosted/provider evidence remains open |
| 29 | Compact snapshot v1.3 tab row IDs | PERF-06 | P2 | Fixed locally; hosted/provider perf evidence remains separate |
| 30 | Receiver tab typography test-comment cleanup | RUX-12 | P3 | Fixed locally; project-publication-page test now asserts `text-[13px]` and documents the path-scoped `/share` Client Portal type-scale exemption |
| 31 | Header-smoke helpers | QA-G10 | P2 | Helper scripts landed with unit coverage; production-mode local SHARE_URL smoke passed; visual matrix remains open |
| 32 | Local perf measurement append support | PERF-09 / PERF-12 | P3 | `evidence/perf-budgets.md` now keeps snapshot + password-unlock + rotate-cost rows in one table |
| 33 | Unified unavailable-link copy | MANAGER-F-03 | P2 | Fixed locally; branded not-found page and share API 404 envelopes import one copy contract |
| 34 | Behavioral action-contract tests | MANAGER-F-05 | P3 | Fixed locally; republish, rotate, and owner activity-load success/error branches now assert observable outcomes in `project-publication-actions.test.ts` |
| 35 | Full manager RBAC role-rejection matrix | MANAGER-F-01 | P1 | Fixed locally; `project-publication-actions.test.ts` rejects 7 mutation actions × 5 actor classes with zero write/RPC/revalidate side effects, and `actions.ts` ranks `member` below manager |
| 36 | Offline queue flush test hardening | QA-G07 | P1 | Fixed locally; `project-publication-comments.test.tsx` asserts sessionStorage persistence, reconnect flush, queue clearing, body/viewToken payload, and fresh CSRF headers |
| 37 | Dashboard shared-link quick actions | MANAGER-F-06 | P3 | Fixed locally; `PublishedProjectQuickActions` adds copy/preview plus manager-only rotate/revoke with tooltip semantics, destructive confirms, `ok:false` error handling, and refresh-on-success, covered by `workshop-reset.test.tsx` |

Notes binding to 75 (do not contradict):
- §9 and §10 are **canonical P2** (origin-audit severity); doc 70 listed them P1. This is register-accuracy, both are Fixed — no open risk. See [75 §1](75_FINDING_ID_REGISTRY.md) and [_COORDINATION §4.9](_COORDINATION.md).
- §11 originally closed only assertion-ordering + rotate double-click; §35 now closes the full five-actor-class × every-mutation **RBAC matrix (MANAGER-F-01)**.
- §18/§25 land both bounded sends (PERF-08 Fixed) and the per-recipient partial-send retry UX (MANAGER-F-04 Fixed).
- §19 removes the owner-style activity feed from the public receiver page (RUX-10 Fixed) and preserves the comment-body leak fix (**SEC-SHARE-09**, the review-discovered id — NOT the unsubscribe SEC-SHARE-05). **Owner-feed realtime (SHF-01) is GA backlog** → **D7**.
- §34 closes MANAGER-F-05; §35 closes the separate MANAGER-F-01 role-rejection matrix.
- §36 closes QA-G07's remaining offline-queue hardening gap; QA-G06 remains the only P1-class QA test-rigor gate.
- §37 closes MANAGER-F-06; the review-found manager-only visibility and `ok:false` result-handling gaps are now covered, and all MANAGER-F source/test gaps are fixed locally.

## Iteration Definition-of-Done

This implementation iteration is **DONE** only when every box is green; until then it is **Landed-pending**:

1. **Tests green.** The canonical 23-file command (see Verification Evidence) exits `0` with `Test Files 23 passed (23)`, verbatim summary pasted. Gate: PASS/FAIL on exit code.
   - Verify: `bunx vitest run <23 files> --maxWorkers=1`
2. **Type-check green.** Gate: `bun run type-check` exits `0`.
3. **Diff hygiene.** Gate: `git diff --check` exits `0`.
4. **DB reconciled pre-deploy.** Shared-link migrations `20260620064601`, `20260620142000`, `20260621042221`, `20260621051701`, D1-D11 hardening, and atomic publish/digest-slot RPCs are applied/repaired and read back on provider BEFORE the app revision ships; app deploy smoke still pending. Gate: see [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) Go/No-Go. Owner-lane: DB/release.
5. **Codex review-gate satisfied.** HIGH-BLAST-RADIUS (DB/RPC/security) → native `code-reviewer` report recorded at
   `evidence/review/codex-review-shared-link-2026-06-21.md`, with status logged in [`LOOP_LEDGER.md`](LOOP_LEDGER.md).
   Gate: **PASS** for this code-review gate.
6. **No canonical-P1 source-fix finding regressed.** Gate: 75 §8 roll-up still shows "No P1 source-fix finding is open" after this diff.

Remaining P1-class **test-rigor** gap (QA-G06 provider-backed race) and **SHF-01** are tracked separately in
[`91_FORWARD_EXECUTION_PLAN.md`](91_FORWARD_EXECUTION_PLAN.md) and are NOT part of this iteration's DoD —
"ready" is therefore conditional (see [`99_QUALITY_SCORECARD_AND_SIGNOFF.md`](99_QUALITY_SCORECARD_AND_SIGNOFF.md)).

## Rollback

Rollback is **per-layer** and must respect deploy ordering (app reads/writes the new column and
expects route-409 + RPC-equality behavior). Authoritative deploy/Go-No-Go in
[`90_DEPLOY_AND_MIGRATION_RUNBOOK.md`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md); this section records the
exact prior bodies to restore and the blast radius of each.

### A. Snapshot-equality lock (SEC-SHARE-01) — RPC-revertible

- **Forward (current):** `supabase/migrations/20260620142000_restore_shared_link_snapshot_equality_lock.sql`
  redefines `public.insert_client_comment` and `public.submit_client_response` with
  `if p_expected_snapshot_version is null or v_snapshot_version is distinct from p_expected_snapshot_version` (rejects stale AND null) — `:38` / `:101`.
- **Prior bodies to restore on rollback:** the immediately preceding definitions of both functions in
  `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql`
  (`insert_client_comment` at `:114`, `submit_client_response` at `:178`), which used the looser
  `<= ` / non-equality guard. Restore by authoring a new forward migration that re-creates those prior
  bodies (do NOT delete the 142000 migration row; reconcile the ledger per `90`).
- **App-side rollback:** also revert the route 409s — `comment/route.ts:228-234` and
  `decision/route.ts:186-192` (`viewedSnapshotVersion !== access.snapshotVersion`). Belt-and-suspenders:
  reverting only one layer leaves the other enforcing; revert both to fully roll back D1 behavior.
- **Blast radius (callers):** `insert_client_comment` ← public comment route (`api/share/[token]/comment/route.ts`); `submit_client_response` ← public decision route (`api/share/[token]/decision/route.ts`). No owner/manager caller. Rolling back re-opens the stale-snapshot write window (SEC-SHARE-01) — owner decision **D1**.

### B. Rotate credentials RPC (`rotate_project_publication_credentials`) — RPC-revertible

- **Forward (current):** redefined in
  `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql:96` to accept the
  new `p_activity_target_labels_json jsonb` parameter and persist it (`:136`).
- **Prior body to restore on rollback:** the definition in
  `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:3` (signature
  without `p_activity_target_labels_json`). NOTE the signature change — the new function adds a
  parameter, so a clean revert must `drop function` the new overload and re-create the prior signature.
- **App-side coupling:** `src/lib/publication/actions.ts:698` passes
  `p_activity_target_labels_json` to the rotate RPC; reverting the RPC signature REQUIRES reverting this
  call (and the publish/republish writes at `actions.ts:567,637`) first, or rotate fails. **Revert app before changing the RPC signature.**
- **Blast radius (callers):** rotate RPC ← `rotateSharedLinkCredentials` in `src/lib/publication/actions.ts` (manager modal "Access" tab rotate action, surfaced via `ProjectPublicationHeader.tsx`). No public-route caller.

### C. `activity_target_labels_json` column — FORWARD-ONLY (data, not RPC)

- **Forward-only:** the column add + backfill in
  `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql:2` (NOT NULL with a
  default) is **not** safely droppable while the deployed app selects/writes it
  (`actions.ts:567,637,698,1392,1458`; public activity route).
- **Rollback rule:** **revert the app revision FIRST, then** (only if truly necessary) drop the column in
  a later migration. Dropping the column under a live app that selects it will 500 the owner activity
  read and publish/republish/rotate writes. Treat as forward-only for beta; do not include a column-drop
  in any hot rollback.
- **Blast radius (readers/writers):** owner `loadSharedLinkActivity` (`actions.ts:1392,1458`), public
  activity route (`api/share/[token]/activity/route.ts`), and publish/republish/rotate writers
  (`actions.ts:567,637,698`).

Rollback gate (binary): a rollback is **complete** iff (a) the app revision deployed matches the schema
state (no live caller references a reverted RPC signature or dropped column), and (b)
`bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-rotate-resend.test.ts tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx --maxWorkers=1`
passes against the rolled-back code. Else FAIL.

## Pre-Deploy Checklist (pointer to 90)

The authoritative, runnable pre-deploy sequence — migration `repair`/`apply` commands, the
local↔remote `schema_migrations` drift reconciliation, the duplicate-named-migration flags, and the
**RPC equality-contract test** — lives in
[`90_DEPLOY_AND_MIGRATION_RUNBOOK.md`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md). Minimum gates before
shipping this app revision:

1. **Migration ledger reconciled** (drift is REAL per [_COORDINATION §4.5](_COORDINATION.md)). Use
   `supabase migration repair --status applied <version>` for already-applied-but-unlogged rows —
   **do NOT** re-`apply` them. Confirm with `supabase migration list`. Gate: local and remote ledgers agree; see `90`.
2. **`activity_target_labels_json` present remotely BEFORE app deploy** (new code selects/writes it).
   Gate: column exists on `project_publications` (verify via `list_tables` / `supabase migration list`). FAIL-CLOSED: do not deploy app first.
3. **RPC equality contract verified live** — `insert_client_comment` / `submit_client_response` reject a
   stale `p_expected_snapshot_version` (the SEC-SHARE-01 lock). Gate: the equality contract test in `90`
   passes against the live/branch DB. UNVERIFIED here — exact command in `90`.
4. **Duplicate-named migration pairs flagged** (`allow_project_deletion_with_active_publications`,
   `project_groups`) per [_COORDINATION §4.5](_COORDINATION.md) — confirm the intended one is applied; see `90`.

Owner-lane: DB/release. Binary go/no-go is owned by [`90`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) and
the launch verdict in [`99`](99_QUALITY_SCORECARD_AND_SIGNOFF.md).

## Codex Review-Gate Status

This shared-link diff is **HIGH-BLAST-RADIUS** (public-facing routes, RPC redefinitions, security/privacy
fixes), so the Codex review gate applies per `CLAUDE.md` / `.ai/12_agents/payloads/claude.md`.

- **Status: SATISFIED (PASS).** Native `code-reviewer` subagent review found 0 blocking findings and
  approved the scoped shared-link code-review gate.
- **Artifact:** [`evidence/review/codex-review-shared-link-2026-06-21.md`](evidence/review/codex-review-shared-link-2026-06-21.md).
- **Boundary:** this clears the code-review gate only. It does not clear app deploy/post-deploy smoke,
  QA-G06 real DB proof, QA-G10 hosted proof, or hosted/provider performance budget gates.

## 38. QA-G06 Duplicate-Decision Race Harness

- Added `tests/vitest/share/duplicate-decision-race.provider.test.ts`.
- Added `evidence/provider-race/duplicate-decision-race.md`.
- The test is gated by `SUPABASE_DB_URL`, seeds deterministic disposable rows, runs two concurrent
  `submit_client_response(...)` calls for the same publication/recipient, asserts one success plus one
  duplicate failure, checks one persisted response row, and cleans up in `finally`.
- Verification:
  - `bunx vitest run tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1` passed
    as 1 skipped file because `SUPABASE_DB_URL` was not set.
  - `bun run lint tests/vitest/share/duplicate-decision-race.provider.test.ts` passed.
  - `supabase status` failed locally because Docker was not running, so this does **not** prove the
    provider/local-Supabase race yet.
- Status: QA-G06 is **Partial**, not Fixed, until this harness passes against local Supabase or the linked
  Archestimator provider database.

## 39. D1-D11 Atomic Publish + Durable Digest Slot

- Added `supabase/migrations/20260621133000_shared_link_atomic_publish_and_digest_slot.sql`.
- `createProjectPublication` now calls service-role RPC `replace_project_publication(...)` instead of
  issuing a separate revoke update and insert from the app layer.
- Owner digest throttling now reserves a durable slot through `reserve_security_rate_limit_slot(...)`
  instead of count-then-insert app logic.
- Public comment/decision routes now schedule digest work with `after(...)` so successful receiver POSTs
  return quickly while Next can still drain the digest/log side effect. The small synchronous fallback keeps
  route unit tests and non-request harnesses from turning a scheduling error into a receiver-facing 500.
- Provider readback evidence:
  [`evidence/provider-readback/d1-d11-atomic-publish-digest-2026-06-21.md`](evidence/provider-readback/d1-d11-atomic-publish-digest-2026-06-21.md).
- Verification:
  - `bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-resolved-ids.test.ts tests/vitest/project-publication-rotate-resend.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/project-publication-schema.test.ts tests/vitest/security-findings-publication-contracts.test.ts --maxWorkers=1` passed 8 files / 157 tests.
  - `bunx vitest run tests/vitest/project-publication-one-published-index.test.ts tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1` passed 2 files / 8 tests with 1 provider-race skip.
  - `bun run type-check` passed.
  - `git diff --check` passed.
  - Supabase MCP apply/readback on `ebxxqidacheyapmmzavr` passed: 0 duplicate published projects, one partial unique published index, `replace_project_publication(...)` present/service-role-only, `reserve_security_rate_limit_slot(...)` present/service-role-only.

## Validation Not Run

- Browser/Playwright/visual QA: intentionally skipped in this pass because Product Design/browser guidance requires a chosen browser/approval for Playwright-style proof, and static/component/route tests prove the source changes. The client-ship visual gate remains open in [85](85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md).
- App deploy/post-deploy smoke: not run. Provider shared-link migration/readback and D1-D11 atomic hardening readback are green, but the app revision still needs the [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md) Go/No-Go.
- Hosted/provider performance: not complete. Local activity and snapshot-byte evidence is recorded, and PERF-06 snapshot bytes now pass locally; public page p95, password unlock, rotate cost, and provider `EXPLAIN` remain open.
- Local Supabase migration listing/provider race: local Supabase could not run because Docker was not
  available (`supabase status` could not connect to the Docker daemon). QA-G06 harness exists but real DB
  execution remains pending; the latest QA-G06 run still skipped because `SUPABASE_DB_URL` was not set.
- Full `bun run validate`: skipped because the worktree has substantial unrelated dirty changes outside the shared-link scope. Focused tests plus type-check covered the modified behavior.
