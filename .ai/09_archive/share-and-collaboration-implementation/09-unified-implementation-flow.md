# 09 - Unified Implementation Flow

## Purpose

This is the canonical implementation flow for the combined Share & Collaboration plan. It resolves dependencies across Collaboration Invites, Shared Link manager hardening, and `/share/[token]` receiver UX so future agents do not implement interrelated slices in a conflicting order.

When this document conflicts with lane-local phase numbers, this document wins.

## Decision Drivers

1. Security and false-positive states must be corrected before more users are directed into collaboration flows.
2. Shared data surfaces should be widened once, not separately for invites and publication badges.
3. Receiver-page UX can move faster when it stays no-API/no-schema and preserves current public security behavior.
4. Public/bearer-token surfaces need durable rate limits before external beta or expanded interactions.
5. Each slice needs a rollback checkpoint and fresh evidence before the next slice starts.

## Canonical Waves

### Wave 0 - Evidence Refresh and Worktree Isolation

**Goal:** Prove the starting state and avoid implementing from stale plans.

**Do:**

- Record `git status --short --branch`.
- Refresh code-review-graph/GitNexus context for each edited symbol/file.
- Re-run the relevant inventory checks for `/share/[token]`, `ProjectPublicationHeader`, `/invite/[token]`, `workspace-repository`, and `LiveProjectCard`.
- Capture or confirm current receiver screenshots before visual edits.
- Identify unrelated dirty-worktree changes and keep them out of this plan's diffs.

**Exit evidence:**

- Current source paths listed.
- Graph/impact evidence recorded.
- Chosen first slice and rollback path stated.

### Wave 1 - External Invite Unblock

**Goal:** Separate human/provider setup from code changes.

**Owner:** Human/provider setup plus agent verification.

**Do:**

- Configure Supabase Auth email for project `ebxxqidacheyapmmzavr`.
- Set `PROJECT_INVITE_ENTRY_ENABLED=true` for the environment being tested.
- Set a non-committed `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`.
- Keep `.env.example` safe with disabled/default values if updated.
- Run the gated invite smoke only when provider/env setup exists.

**Exit evidence:**

- Provider setup evidence or explicit blocker.
- `PROJECT_INVITE_ENTRY_ENABLED` and pepper presence verified without exposing the secret.
- `ARCHESTIMATOR_E2E_INVITE_ENTRY=1 bun run test:e2e -- e2e/project-invite-entry.spec.ts --project=chromium` passes, or the exact external blocker is recorded.

**Important:** This wave is not required for no-API receiver UX work or fixture-backed pending-invite UI work, but it is required before claiming invite flow readiness or shipping live pending-invite UX.

### Wave 2 - Safety Foundation

**Goal:** Close the highest-risk behavior before expanding flows.

**Primary work:**

- Make `/invite/[token]/accept` POST-only; GET must not mutate.
- Replace false-positive invite delivery messaging with accurate created/sent/uncertain states.
  - **2026-05-31 local progress:** disabled app-owned invite entry now returns honest direct-grant messages for existing users and actionable disabled-link errors for new project/sheet invitees instead of reporting email delivery.
- Fix the recipient-token query mismatch before relying on recipient sessions: recipient emails currently append `?rt=...` while `src/app/share/[token]/page.tsx` reads `?recipient=...`. Either emit `?recipient=` from email links or support both query names with tests.
- Add durable rate limiting for invite resolution, invite accept, invite continue, public share password/comment/snapshot/event routes, or explicitly stage this behind a local-only exception. **2026-05-31 progress:** `security_rate_limit_events` plus route/repository/action helpers now cover invite resolve/continue/accept, invite creation, invite-link reissue/copy, and public share snapshot/activity/event/password/comment/decision with route `429`/`Retry-After` or server-action errors. Migration `20260601003000_security_rate_limit_events` is applied and verified on linked Supabase project `ebxxqidacheyapmmzavr`. **2026-06-01 progress:** live `next start` proof at `.ai/09_archive/store/share-collab-live-proof-20260601T103000Z/` verifies shared-link comment rate limiting against linked Supabase: five comments insert, the sixth returns `429` with `Retry-After: 60`, and `security_rate_limit_events` records six durable `shared_link_comment` rows. Live proof at `.ai/09_archive/store/share-collab-public-route-rate-limit-proof-20260601T104500Z/` verifies the non-comment public share routes: password fails five times then returns `429` on the sixth bad attempt, valid password still returns `204`, snapshot/event/activity each return 60 allowed responses followed by five `429`s, and decision returns `201`, four duplicate `409`s, then `429`. Remaining proof is external invite provider/email proof and broader launch readiness, not public shared-link route limiter behavior.
- Add missing audit events for invite lifecycle and publication lifecycle. **2026-05-31 local progress:** email invite sends now record `record_collaboration_invitation_delivery` after Supabase Auth accepts the send, matching copied invite-link delivery auditing. Project and estimate invite-email attempts now write best-effort `invite_email_attempted` rows; role updates write `role_changed`; member removal writes `member_removed`; linked migration `20260601023000_collaboration_invitation_open_audit.sql` now records `collaboration_invite_opened` inside `resolve_collaboration_invitation(text)`. Remaining audit work is broader publication lifecycle coverage and live end-to-end proof.
- Verify raw tokens are not logged or stored in analytics/audit metadata. **2026-05-31 local progress:** collaboration audit metadata excludes raw invite tokens and token hashes in focused regression coverage, and linked remote function verification confirms no `'token_hash'` metadata key in the invite-open audit path.

**Critical files:**

- `src/app/invite/[token]/accept/route.ts`
- `src/app/invite/[token]/page.tsx`
- `src/app/invite/[token]/continue/route.ts`
- `src/app/api/share/[token]/*`
- `src/lib/collaboration/actions.ts`
- `src/lib/publication/actions.ts`
- `src/lib/publication/public-repository.ts`
- New migration only if durable limiter/audit work requires it

**Exit evidence:**

- Negative test proves GET accept does not mutate.
- Test proves emailed recipient links establish the shared-link session cookie using the emitted query parameter.
- Rate-limit tests prove 429 behavior.
- Audit tests or direct SQL evidence prove events without raw token values.
- Existing share password/comment/decision tests still pass.

### Wave 3 - Shared Project-List Data Layer

**Goal:** Make one coordinated data extension for all project-card/homebase/sidebar signifiers.

**Why this comes before most UI badges:** Collaboration invite visibility, shared-link status badges, pending invite counts, and homebase/sidebar indicators all converge on the same project-list and homebase surfaces.

**Primary work:**

- Extend `listCurrentWorkspaceProjects()` without N+1 queries.
- Add publication status/link metadata needed by `LiveProjectCard`.
- Add owner-side pending invite counts.
- Add invitee-side pending invite records only after acceptance-by-id is planned or implemented.
- Preserve owned/shared/sheet-only access semantics.

**2026-05-31 local progress:** `listCurrentWorkspaceProjects()` and `getWorkshopHomebaseData()` now share owned/shared/sheet-only access semantics, batch publication summaries, batch pending invitation counts, expose owner-side `pendingInviteCount`, expose `receivedPendingInviteCount` for the Workshop Projects sidebar badge, and expose invitee-side `pendingInvites` records from `list_pending_collaboration_invitations()`. Accept-by-id semantics are implemented through `accept_collaboration_invitation_by_id(uuid)` so pending cards do not need raw invite tokens.

**Critical files:**

- `src/lib/repositories/workspace-repository.ts`
- `src/lib/collaboration/types.ts`
- `src/components/workshop/LiveProjectCard.tsx`
- `src/components/workshop/projects-page-client.tsx`
- `src/components/sidebar/MainSidebar.tsx`
- `src/components/workshop/WorkshopHomebaseClient.tsx`

**Exit evidence:**

- Project list tests cover owned, shared project, sheet-only, pending invite, and published-link combinations.
- No sample/empty-state regression when only shared or pending projects exist.
- No N+1 query pattern is introduced.

### Wave 4 - Shared Link Manager Visibility

**Goal:** Improve sender/manager visibility without changing receiver security.

**2026-05-31 local progress:** Project-list cards and Workshop favorite-project rows now render live shared-link status/open-count signifiers from a batched publication lookup, and the project header now has one-click copy plus an activity dot. Linked/browser smoke is still required before launch claims.
**2026-05-31 confirmation progress:** Project header destructive shared-link actions now open confirmation dialogs before creating a replacement link or turning off the current link; Vitest and local dev-auth Playwright visual smoke passed.

**Primary work:**

- Project-card shared badge.
- One-click copy from project header.
- Header activity dot.
- Confirmation dialogs for destructive shared-link actions if included in this wave.

**Critical files:**

- `src/components/workshop/ProjectPublicationHeader.tsx`
- `src/components/workshop/LiveProjectCard.tsx`
- `src/lib/repositories/workspace-repository.ts`

**Exit evidence:**

- Manager UI tests prove badge/copy/activity states.
- Copy/open actions degrade safely without a live link.
- Design-system lint passes for UI changes.

### Wave 5 - Shared Link Receiver UX

**Goal:** Turn `/share/[token]` into an adaptive receiver workspace without changing public API/security behavior.

**Canonical receiver slice order:**

1. Receiver shell and layout rebalance.
2. Estimate workspace extraction.
3. Navigation and search.
4. Context rail and response UX.
5. Route state polish.

This order follows `shared-link-receiver-ux/13-implementation-prd-and-slice-contract.md` and `shared-link-receiver-ux/15-implementation-test-spec.md`. The older order in `shared-link-receiver-ux/10-agent-handoff-and-execution-sequence.md` is historical where it conflicts.

**Critical files:**

- `src/app/share/[token]/page.tsx`
- `src/app/share/[token]/loading.tsx`
- `src/app/share/[token]/error.tsx`
- `src/components/share/SharePageTabs.tsx`
- `src/components/share/SharePageSessionBanner.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/lib/share/reconstruct-share-tree.ts`

**Exit evidence per receiver slice:**

- Focused baseline:
  ```bash
  bunx vitest run \
    tests/vitest/project-publication-page.test.tsx \
    tests/vitest/project-publication-comments.test.tsx \
    tests/vitest/project-publication-decision.test.tsx \
    tests/vitest/share/reconstruct-share-tree.test.ts \
    --maxWorkers=1
  ```
- `bun run lint:design-system` for UI changes.
- `bun run type-check` before closeout.
- Desktop and mobile screenshots for visual changes.
- Explicit preservation note for password/session/comment/decision behavior.

### Wave 6 - Collaboration Invite Visibility

**Goal:** Make pending and accepted invite states visible across the workshop.

**Prerequisites:**

- Wave 1 live data available, or fixture-backed implementation with no readiness claim.
- Wave 2 POST-only accept complete.
- Wave 2 durable rate-limit slice complete for invite resolve/continue/accept, invite creation/link reissue, and public share snapshot/activity/event/password/comment/decision. Linked migration apply proof for `20260601003000_security_rate_limit_events` is complete; live public shared-link route proof is complete for comment, password, snapshot, event, activity, and decision. External invite provider/email proof remains open.
- Accept-by-invitation-id route/RPC designed before pending invite cards ship, because raw invite tokens are not recoverable from hashed storage. **2026-05-31 progress:** `20260531164227_collaboration_invitation_accept_by_id.sql` implements and links `list_pending_collaboration_invitations()` plus `accept_collaboration_invitation_by_id(uuid)` as authenticated-only security-definer RPCs; linked verification found authenticated execute grants, anon revoked, and `last_opened_at` in the list RPC return shape.
- Wave 3 shared data extension complete or intentionally staged.

**Primary work:**

- Pending-invite project cards. **2026-05-31 local progress:** `/workshop` renders fixture/test-backed pending invite cards from `homebase.pendingInvites` with project, role, inviter, expiry, and an accept form posting only `invitationId`.
- Sidebar pending invite badge. **2026-05-31 local progress:** Workshop shell supports a Projects badge and `/workshop` feeds it from `receivedPendingInviteCount`.
- Homebase pending invite banner/panel. **2026-05-31 local progress:** The Workshop homebase now renders a compact `Pending invites` panel when signed-in pending invites exist.
- Owner-side pending count indicators. **2026-05-31 local progress:** Workshop favorite-project rows and project cards can render batched owner-side pending invite counts.
- `last_opened_at` in pending invite list. **2026-05-31 local progress:** Pending invite records carry `lastOpenedAt`, and the Workshop pending-invite panel renders opened context when present.
- Pending invitation resend. **2026-05-31 local progress:** The Teamspaces pending-invite row now has a Resend action that reissues an app-owned invite token, calls Supabase Auth invite email again, records email delivery, and uses the existing durable per-invitation resend rate limit.
- Removal confirmation/favorites cleanup. **2026-05-31 local progress:** Teamspaces removal now opens an explicit confirmation dialog with optional notification intent, and `removeProjectCollaborator()` deletes the removed user's `project_favorites` row for that project after access removal.

**Exit evidence:**

- Invitee cannot accept another email's invite.
- Expired/revoked/already-used states are visible and non-mutating.
- Pending card does not require raw invite token.
- Project-list and homebase UI maintain shared-project/sheet-only badges.

**2026-05-31 verification:** Red/green `project-invite-entry-schema` + `workshop-pending-invite` passed 17 tests; focused collaboration/homebase regression set passed 7 files / 38 tests; `bun run type-check`, focused ESLint, `bun run lint:design-system`, and `git diff --check` passed. Linked migration apply/repair and remote grant/return-shape verification passed for `20260531164227`.

### Wave 7 - Recipient Identity, Tracking, Email, and Compliance

**Goal:** Improve notification fidelity and recipient accountability after safety and visibility are stable.

**2026-05-31 local progress:** Recipient opens are recipient-scoped, verified recipient links render "Viewing as {email}", verified recipients can use "Not you?" to clear the server-owned recipient session and `_ok` companion flag, subsequent valid HttpOnly sessions can resolve recipient identity by id, the manager sidebar shows the latest recipient open identity when available, owner digests resolve workspace owner profile email with project creator / publisher fallback before skipping with a warning, recipient emails use the acting manager's resolved display name with "An Archestimator user" fallback instead of placeholders, recipient invitations plus owner digests include a compliance footer, recipient invitation footers now include a direct unsubscribe path that persists `shared_link_recipients.email_unsubscribed_at` and suppresses future recipient resends, existing recipients can be resent a fresh secure recipient link under durable 5-minute rate limiting, Resend webhooks can reconcile recipient `delivery_status` from verified raw-body events, and the local P3 polish items are implemented: stale snapshot sidebar warning with a five-minute timestamp-comparison cache, Grid Preview row filtering, `/share/[token]` print styles, and destructive-action confirmations including password clearing. **2026-06-01 live proof:** recipient session creation now happens in `POST /api/share/[token]/session` because Next 16 production mode rejects cookie mutation inside Server Components; live `next start` proof verifies the session POST, HttpOnly session cookie, `_ok` flag, subsequent recipient banner render, recipient opened tracking, and durable comment limiter behavior. Linked apply/repair is complete for the shared-link V2 base migration, password-attempt enum migration, recipient unsubscribe migration, and Resend webhook metadata migration after remote verification showed the base shared-link tables had not yet been applied. Live provider proof remains open.

**Primary work:**

- Receiver "Viewing as {email}" identity banner.
- Receiver "Not you?" session recovery. **Implemented locally 2026-05-31 with a no-store DELETE route that expires both recipient-session cookies.**
- Per-recipient open tracking.
- Real owner/sender email resolution.
- Resend recipient email.
- Recipient resend. **Implemented locally 2026-05-31 with a fresh recipient token and `shared_link_recipient_resend` durable rate-limit scope.**
- Resend webhooks for delivery statuses. **Implemented locally and applied to linked Supabase 2026-05-31; live dashboard/provider proof remains open.**
- Unsubscribe/compliance footer. **Implemented locally 2026-05-31.**
- Direct recipient unsubscribe suppression. **Implemented and linked 2026-05-31 via `email_unsubscribed_at`; recipient resends skip opted-out rows.**
- Stale snapshot warning, Grid Preview filtering, and print styles. **Implemented locally 2026-05-31.**

**Exit evidence:**

- Owner digest uses real owner email.
- Recipient view events map to recipient session without leaking tokens.
- Recipient session setup is proven from the same query parameter used in generated recipient emails.
- Latest recipient open tests assert sidebar identity display from `shared_link_recipients.last_opened_at`.
- Recipient identity-banner tests assert the "Not you?" control and server-side cookie expiry route.
- Email tests assert no placeholder owner/sender in production paths.
- Email tests assert recipient invitations and owner digests include unsubscribe/compliance footer copy.
- Unsubscribe tests assert the direct route, durable recipient flag, and resend suppression.
- Resend webhook tests assert raw-body signature verification, recipient email tags, provider message-id persistence, and event-to-delivery-status mapping.
- Recipient resend tests assert the Recipients tab button calls the server action, the server action mints a new recipient token, and durable rate-limit storage is used.
- P3 polish tests assert stale snapshot detection, sidebar warning text, grid filtering/no-match state, print stylesheet hooks, and share page build compatibility.

### Wave 8 - Advanced / Deferred

These are not beta-hardening prerequisites:

- Comment threading.
- PDF export.
- Attachments.
- Dark mode.
- Decision undo/change windows.
- Full version-diff UI.

They require separate PRDs before implementation.

## Parallelization Rules

Safe parallel lanes:

- Wave 1 provider setup can run while Wave 2 code safety work is planned.
- No-API receiver shell/layout work can run independently of invite provider setup.
- Email compliance work can be audited while manager visibility work proceeds.

Do not parallelize:

- Multiple agents editing `workspace-repository.ts`, `LiveProjectCard.tsx`, `MainSidebar.tsx`, or `WorkshopHomebaseClient.tsx` at the same time.
- Invite acceptance route changes and pending invite card acceptance unless ownership is explicit.
- Receiver `SharePageTabs` extraction and search/navigation in separate write lanes.

## Stop Conditions

Stop and re-plan if:

- A slice requires schema/API/security work that this flow scheduled later.
- GitNexus/code-review-graph impact returns HIGH or CRITICAL for a symbol and the blast radius was not reviewed.
- Invite provider/env setup is missing but the implementation is about to claim live invite readiness.
- Receiver UX edits require changing token, password, recipient session, comment, or decision APIs.
- Validation cannot distinguish unrelated dirty-worktree failures from this plan's delta.
