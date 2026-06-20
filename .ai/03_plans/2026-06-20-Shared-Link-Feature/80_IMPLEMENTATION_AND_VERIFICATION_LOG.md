# Implementation And Verification Log

Date: 2026-06-20

## Files Changed

Source:
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
- `src/lib/publication/activity-helpers.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/share/sanitize-recipient-text.ts`
- `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql`
- `supabase/migrations/20260620142000_restore_shared_link_snapshot_equality_lock.sql`

Tests:
- `tests/vitest/project-publication-actions.test.ts`
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
- `tests/vitest/share-no-store-invariants.test.ts`
- `tests/vitest/share-estimate-tree-panel-a11y.test.tsx`
- `tests/vitest/share-estimate-tree-view-performance.test.tsx`
- `tests/vitest/share-recipient-session-initializer.test.tsx`

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
- `SharePageTabs` now renders a `share-print-only` package containing every shared estimate and every v1.2 estimate tab only on browser print intent.
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

### 19. Receiver Activity Feed

Problem:
- Specs and public route support described receiver-visible activity, but `/share/[token]` did not render it.
- The activity component also used one-off orange notice classes and low-contrast tertiary text.

Change:
- The receiver page now mounts `SharedLinkActivityFeed` in a print-hidden section after comments.
- The feed uses the existing public-safe activity route, which filters internal content and recipient-scopes decisions/events.
- The public activity route now redacts comment bodies entirely, so it does not bypass the stricter recipient-session comment API.
- Activity notice and muted text now use existing accent/secondary tokens.
- Page tests prove the receiver page fetches `/api/share/:token/activity`.

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

## Verification Evidence

Final focused shared-link suite:

```bash
bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-header.test.tsx tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-route.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/share-estimate-tree-panel-a11y.test.tsx tests/vitest/share-estimate-tree-view-performance.test.tsx tests/vitest/share-recipient-session-initializer.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-rotate-resend.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/security-findings-publication-contracts.test.ts --maxWorkers=1
```

Result:
- 15 test files passed.
- 295 tests passed.

Additional checks:
- Focused ESLint passed for `SharePageRecipientSessionInitializer`, `SharePageTabs`, `SharePageComments`, `SharePageSessionBanner`, public comment/session/activity routes, public repository, publication actions, and the touched shared-link tests.
- `bun run type-check` passed.
- `git diff --check` passed.

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
- `bunx vitest run tests/vitest/share-estimate-tree-view-performance.test.ts --maxWorkers=1` passed: 1 test.
- `bunx vitest run tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/share-recipient-session-initializer.test.tsx tests/vitest/project-publication-page.test.tsx --maxWorkers=1` passed: 4 files / 78 tests after the review-discovered fixes.
- `bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-rotate-resend.test.ts --maxWorkers=1` passed: 2 files / 41 tests after the row-image JSON-path query narrowing.
- `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-security-hardening.test.ts --maxWorkers=1` passed: 4 files / 83 tests after canonical comment POST reconciliation and session-banner touch fixes.
- `bunx vitest run tests/vitest/project-publication-page.test.tsx --maxWorkers=1` passed: 1 file / 35 tests after recipient session analytics deferral.

## Validation Not Run

- Browser/Playwright/visual QA: intentionally skipped because static/component/route tests prove the changed behavior and the Codex App speed guardrail says browser automation is not a default gate.
- Linked Supabase migration apply: migration files were authored locally; provider mutation was not run in this pass. Live Supabase definitions for comment/decision strict equality were inspected and already had equality/null rejection, but remote migration history is drifted from local history.
- Deployment ordering: `activity_target_labels_json` must be applied before deploying this app revision because new code selects/writes that column.
- Local Supabase migration listing: `supabase migration list --local` could not connect because local Postgres on `127.0.0.1:54322` was not running.
- Full `bun run validate`: skipped because the worktree has substantial unrelated dirty changes outside the shared-link scope. Focused tests plus type-check covered the modified behavior.
