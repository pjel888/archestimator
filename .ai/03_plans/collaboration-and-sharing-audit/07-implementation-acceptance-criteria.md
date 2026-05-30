# 07 — Implementation Acceptance Criteria

**Date:** 2026-05-30
**Purpose:** Every roadmap item converted into testable acceptance criteria. Organized by phase. Used by implementation agents and QA.

---

## Collaboration Invite — Phase 0: Unblock (Config Only)

### P0.1: Configure Supabase Auth Email

- **Objective:** Configure an email provider so `admin.inviteUserByEmail()` actually delivers emails.
- **Files:** Supabase dashboard only (zero code changes).
- **Done when:**
  - [ ] SMTP provider or Supabase built-in email configured in dashboard for project `ebxxqidacheyapmmzavr`
  - [ ] Test email sent and received from dashboard
  - [ ] Invite email template customized (branded, not Supabase default)
  - [ ] `enable_confirmations` verified (can remain false — invite emails don't require confirmation)

### P0.2: Enable Invite Entry Env Vars

- **Objective:** Enable the `/invite/[token]` route and token generation.
- **Files:** `.env.local`, `.env.example`
- **Behaviour:**
  - [ ] `PROJECT_INVITE_ENTRY_ENABLED=true` in `.env.local`
  - [ ] `ARCHESTIMATOR_INVITE_TOKEN_PEPPER=<64-char random hex>` in `.env.local`
  - [ ] Both vars added to `.env.example` with safe defaults (`false` and empty)
  - [ ] After restart, `/invite/[token]` pages render (not "invite entry disabled")
  - [ ] `issueInviteEntryLink()` succeeds and returns valid `invitePath`
- **Security:**
  - [ ] Pepper is at least 64 hex characters (32 bytes)
  - [ ] Pepper is not hardcoded in source
  - [ ] If pepper is missing but `PROJECT_INVITE_ENTRY_ENABLED=true`, `isProjectInviteEntryEnabled()` returns `false` (fail-closed)
- **Tests:**
  - [ ] `tests/vitest/project-invite-feature-flag.test.ts` — all tests pass with new config

### P0.3: E2E Smoke Test

- **Objective:** Prove the full invite flow works against the linked remote.
- **Done when:**
  - [ ] `ARCHESTIMATOR_E2E_INVITE_ENTRY=1 bun run test:e2e -- e2e/project-invite-entry.spec.ts --project=chromium` passes all tests
  - [ ] Signed-out invitee flow works: email → invite page → bridge → login → workshop → banner
  - [ ] Signed-in invitee flow works: email → invite page → accept → project
  - [ ] Wrong-account flow works: shows wrong-account page, sign-out works
  - [ ] Terminal states render correctly: expired, revoked, already-used, invalid
  - [ ] Cleanup removes all test users and data

---

## Collaboration Invite — Phase 1: Security & Messaging

### P1.1: POST-Only Invite Acceptance

- **Objective:** Prevent browser pre-fetch from triggering invite acceptance.
- **Files:** `src/app/invite/[token]/accept/route.ts`, `src/app/invite/[token]/page.tsx`
- **Behaviour:**
  - [ ] `GET /invite/[token]/accept` renders confirmation page (does not call RPC)
  - [ ] `POST /invite/[token]/accept` calls RPC and redirects
  - [ ] "Accept invite" on invite page is a `<form>` with `method="POST"`
  - [ ] Confirmation page shows: project name, role, inviter, "Confirm acceptance" button
- **Security:**
  - [ ] No state mutation on GET requests
  - [ ] Browser pre-fetch of the page does not grant access
- **Negative tests:**
  - [ ] `GET /invite/[token]/accept` does not create `project_members` row
  - [ ] Two rapid POSTs do not double-insert (RPC handles idempotency)

### P1.2: Rate Limiting — Invite Resolution & Acceptance

- **Objective:** Prevent brute-force token scanning and rapid-fire acceptance attempts.
- **Files:** `src/app/invite/[token]/page.tsx`, `src/app/invite/[token]/accept/route.ts`, `src/app/invite/[token]/continue/route.ts`
- **Behaviour:**
  - [ ] Token resolution (invite page load) rate-limited: 30/min per IP+token_hash
  - [ ] Invite acceptance rate-limited: 5/min per IP+user_id+token_hash
  - [ ] Continue (bridge creation) rate-limited: 10/min per IP+token_hash
  - [ ] 429 response with `Retry-After` header
- **Security:**
  - [ ] Rate limiter uses durable storage (DB table, not in-memory)
  - [ ] Rate limit exceeded returns clear error: "Too many attempts. Please wait X seconds."
- **Negative tests:**
  - [ ] 31 rapid resolution requests → 429
  - [ ] 6 rapid accept attempts → 429
  - [ ] Rate limiter survives server restart

### P1.3: Fail-Closed Config Messaging

- **Objective:** Never show false-positive "sent" messages. Reflect actual state.
- **Files:** `src/lib/collaboration/actions.ts`, `src/lib/collaboration/invite-entry.ts`
- **Behaviour:**
  - [ ] When Supabase email is not configured: message reads "Invitation created. Share the invite link manually." NOT "Invite email sent."
  - [ ] When invite entry is disabled: message reads "User added directly. They can access the project now." for existing users
  - [ ] When invite entry is disabled and user is new: message explains that link-based invites are unavailable
  - [ ] Missing env vars return descriptive errors, not generic "Something went wrong"
- **UX:**
  - [ ] No green "success" styling when actual delivery is uncertain
  - [ ] Use amber/warning messaging for "attempted but unverified" states
- **Tests:**
  - [ ] Vitest: verify message strings for each config state
  - [ ] Vitest: verify error messages for missing env vars

### P1.4: Audit Event Recording

- **Objective:** Record all security-relevant events per the audit event matrix (doc 05).
- **Files:** `src/lib/collaboration/actions.ts`
- **Behaviour:**
  - [ ] Invite email attempted: write to `collaboration_audit_events`
  - [ ] Invite email sent (API success): write to `collaboration_audit_events` via `record_collaboration_invitation_delivery`
  - [ ] Invite opened: already handled by RPC (`last_opened_at`) — add explicit audit row
  - [ ] Role changed: write to `collaboration_audit_events`
  - [ ] Member removed: write to `collaboration_audit_events`
  - [ ] All audit events best-effort (don't block success response)
  - [ ] No raw tokens in audit event metadata

---

## Collaboration Invite — Phase 2: Visibility

### P2.1: Pending-Invite Cards on Project List (Invitee)

- **Objective:** Invitee sees projects they were invited to but haven't accepted.
- **Files:** `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/LiveProjectCard.tsx`, `src/components/workshop/projects-page-client.tsx`, new `src/app/api/invite/[invitationId]/accept/route.ts`
- **Behaviour:**
  - [ ] `listCurrentWorkspaceProjects()` includes projects with pending invites for current user (query `collaboration_invitations WHERE email = currentUserEmail AND lifecycle_state = 'pending'`)
  - [ ] Pending-invite projects have `accessKind: "pending-invite"` in the type
  - [ ] Card shows: project name, inviter, role, expiry, "Accept →" action
  - [ ] Card has distinct visual treatment (amber/yellow border, "Pending invite" badge)
  - [ ] Accept button triggers `POST /api/invite/{invitationId}/accept` — a new authenticated route that verifies `auth.email === invitation.email` server-side, then calls the existing `accept_collaboration_invitation` RPC (or a new `accept_collaboration_invitation_by_id` RPC). Raw invite tokens are NOT required for this path — the server verifies the authenticated user's email matches the invitation's email.
  - [ ] New RPC `accept_collaboration_invitation_by_id(invitation_id uuid)` — accepts the pending invitation for the currently authenticated user if their JWT email matches the invitation email (same logic as existing `accept_collaboration_invitation` but using `invitation_id` + `auth.jwt()->>'email'` instead of token hash)
- **Edge cases:**
  - [ ] Expired pending invite: shown but disabled with "Expired" state
  - [ ] User also has accepted access: prioritizes accepted state over pending
  - [ ] No pending invites: no change to existing UI
  - [ ] Wrong-email acceptance blocked: RPC returns `wrong_account` if `auth.email !== invitation.email`

### P2.2: Pending-Invite Badge on Main Sidebar

- **Objective:** Red dot/count on "Projects" nav item when user has pending invites.
- **Files:** `src/components/sidebar/MainSidebar.tsx`
- **Behaviour:**
  - [ ] Pending count fetched server-side (layout-level or TanStack Query)
  - [ ] `Projects 🔴 1` when 1+ pending
  - [ ] Clear on acceptance or all invites expired

### P2.3: Owner-Side Pending Count on Project Cards

- **Objective:** Project card shows "2 pending" chip when owner has pending invites out.
- **Files:** `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/LiveProjectCard.tsx`
- **Behaviour:**
  - [ ] Aggregated pending count per owned project in `listCurrentWorkspaceProjects()`
  - [ ] Card renders amber chip: `[2 pending]`

### P2.4: Pending-Invite Banner on Workshop Homebase

- **Objective:** Persistent banner when user has pending invites to accept.
- **Files:** `src/components/workshop/WorkshopHomebaseClient.tsx`
- **Behaviour:**
  - [ ] "You have N pending project invites" with per-invite info
  - [ ] Inline "Accept" action per invite
  - [ ] Banner dismissible? Or persistent until all accepted? Decision: persistent until all accepted or expired.

---

## Collaboration Invite — Phase 3: UX Improvements

### P3.1: Consolidate Signed-Out Invite Acceptance

- **Objective:** Reduce 4-redirect chain to 2-step flow with progress indicator. Raw invite token must remain in the signed HttpOnly bridge cookie — never placed back into query params.
- **Files:** `src/app/invite/[token]/continue/route.ts`, `src/app/workshop/pending-invite/route.ts`, `src/lib/collaboration/pending-invite.ts`
- **Behaviour:**
  - [ ] Flow: invite page → "Sign in to accept" → login → callback → `/workshop` (bridge cookie consumed server-side) → accept RPC called immediately → project page
  - [ ] Max 2 server redirects in the flow (invite page → login → workshop)
  - [ ] Workshop page detects bridge cookie → calls `acceptPendingInviteBridge()` server-side → renders success banner
  - [ ] Progress page or loading state visible during the single accept step
  - [ ] Raw token never appears in browser URL after initial `/invite/[token]` page load
  - [ ] Bridge cookie consumed and cleared in same request that performs acceptance

### P3.2: Wrong-Account Page Shows Current Email

- **Objective:** User sees "You are signed in as X. This invite is for Y."
- **Files:** `src/app/invite/[token]/page.tsx`
- **Behaviour:**
  - [ ] Shows current signed-in email
  - [ ] Shows invited email
  - [ ] "Sign out and continue" opens that email's sign-in flow

### P3.3: Success Banner After Acceptance

- **Objective:** After accepting, user sees confirmation, not silent redirect.
- **Files:** `src/app/invite/[token]/accept/route.ts`, `src/app/workshop/page.tsx`
- **Behaviour:**
  - [ ] Redirect includes `?invite=accepted` query param (already implemented)
  - [ ] Banner shows: "You've been added as {role} to {project}" with "Open project" link

### P3.4: Re-Invite Request for Expired/Revoked

- **Objective:** Invitee has in-app path when invite is expired or revoked.
- **Files:** `src/app/invite/[token]/page.tsx`
- **Behaviour:**
  - [ ] Expired page: "Ask the sender for a new invite" with link to contact
  - [ ] Revoked page: same pattern
  - [ ] V1: just informational text with the sender's email. V2: in-app "Request new invite" button.

### P3.5: Resend Invite on Pending List

- **Objective:** Manager can resend an invite from the Teamspaces modal.
- **Files:** `src/components/workshop/ProjectTeamspaceHeader.tsx`, `src/lib/collaboration/actions.ts`
- **Behaviour:**
  - [ ] "Resend" button next to pending invitation
  - [ ] Calls `sendSupabaseInviteEmail()` again
  - [ ] Rate-limited: 1 resend per invitation per 5 minutes

---

## Collaboration Invite — Phase 4: Removal UX

### P4.1: Removal Confirmation Dialog

- **Objective:** Manager confirms before removing collaborator.
- **Files:** `src/components/workshop/ProjectTeamspaceHeader.tsx`
- **Behaviour:**
  - [ ] Trash icon click opens confirmation modal
  - [ ] Modal shows: "Remove {name}? They will lose access to this project and all estimate sheets."
  - [ ] [ ] "Notify {name} of removal" checkbox
  - [ ] [Cancel] [Remove] buttons

### P4.2: Favorite Cleanup on Removal

- **Objective:** Removed user's project favorites are cleaned up.
- **Files:** `src/lib/collaboration/actions.ts`
- **Behaviour:**
  - [ ] `removeProjectCollaborator` also deletes `project_favorites` row for that user+project
  - [ ] Idempotent: safe if no favorites exist

### P4.3: "You Were Removed" Banner

- **Objective:** Removed user sees notification on next workshop visit.
- **Files:** `src/components/workshop/WorkshopHomebaseClient.tsx`
- **Behaviour:**
  - [ ] Banner: "You no longer have access to {project}."
  - [ ] "Remove from favorites" action
  - [ ] V1: only for projects the user had favorited. V2: notification table makes all removals visible.

---

## Shared Link — Phase 1: Visibility

### SL-P1.1: Shared Badge on Project Cards

- **Objective:** Project card shows when a live shared link exists.
- **Files:** `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/LiveProjectCard.tsx`
- **Behaviour:**
  - [ ] Aggregated publication status in project list query (when `status = 'published'`)
  - [ ] Card renders "Shared" badge (emerald, same color family as shared-project badge)
  - [ ] Optional prop: doesn't break cards where publication data is absent
- **Edge cases:**
  - [ ] Expired publication: not shown (status != 'published')

### SL-P1.2: One-Click Copy from Header Rail

- **Objective:** Copy shared link without opening modal.
- **Files:** `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [ ] When live link exists: split button — left = modal, right = copy
  - [ ] Copy shows brief "Copied!" feedback (not modal status message)
  - [ ] When no live link: button opens modal as before

### SL-P1.3: New-Activity Dot on Header Rail

- **Objective:** Orange dot when unseen activity exists.
- **Files:** `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [ ] Dot shown when most recent activity timestamp > `lastSeenAt`
  - [ ] `lastSeenAt` persisted in component state or localStorage
  - [ ] Dot cleared when Activity tab is opened

---

## Shared Link — Phase 2: Tracking & Identity

### SL-P2.1: Per-Recipient View Tracking

- **Objective:** Track which recipient opened the link.
- **Files:** `src/lib/publication/public-repository.ts`, `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [ ] When session cookie is valid, record open event with `recipient_id`
  - [ ] Modal sidebar: "Last opened by [email] at [time]" instead of generic "Latest open"
  - [ ] Recipient `last_opened_at` updated on each open
- **Schema:** No schema change needed if `shared_link_events.metadata_json` includes `recipient_id`

### SL-P2.2: Recipient Identity Banner

- **Objective:** Show "You are viewing as [email]" on share page.
- **Files:** `src/components/share/SharePageSessionBanner.tsx`
- **Behaviour:**
  - [ ] When session active: "Viewing as {email}" with email from companion cookie
  - [ ] When session inactive: no banner (existing behaviour)
  - [ ] "Not you?" link → clear session, reload

### SL-P2.3: Real Owner Email for Digests

- **Objective:** Owner digests go to actual owner, not placeholder.
- **Files:** `src/lib/publication/actions.ts`
- **Behaviour:**
  - [ ] Resolve owner: project → workspace → workspace_members (role = 'owner') → profile.email
  - [ ] Fallback: project.created_by → profile.email  
  - [ ] If no owner found: log warning, skip digest

---

## Shared Link — Phase 3: Content & Polish

### SL-P3.1: Stale Snapshot Warning

- **Objective:** Warn manager when shared snapshot is out of date.
- **Files:** `src/lib/publication/actions.ts`, `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [ ] Compare `snapshot_json->>'generatedAt'` with latest `estimates.updated_at`
  - [ ] If stale > 7 days: amber warning in modal sidebar
  - [ ] Warning: "Snapshot is {N} days behind current data. Update shared page."
- **Performance:**
  - [ ] Compare timestamps only (no full diff)
  - [ ] Cache comparison result for 5 minutes

### SL-P3.2: Search/Filter in Shared Estimates

- **Objective:** Recipient can filter rows by text.
- **Files:** `src/components/share/SharePageTabs.tsx`
- **Behaviour:**
  - [ ] Search input above grid in Grid Preview mode
  - [ ] Client-side filter on description, designation, material (case-insensitive)
  - [ ] Empty state: "No rows match '{query}'"

### SL-P3.3: Print Stylesheet

- **Objective:** Share page prints cleanly.
- **Files:** New `src/app/share/print.css` or co-located styles
- **Behaviour:**
  - [ ] Hide: header nav, decision/comments sidebar, password gate
  - [ ] Show: project name, estimate tables, tree view
  - [ ] Monochrome-optimized
  - [ ] Page breaks at estimate boundaries

### SL-P3.4: Destructive Action Confirmations

- **Objective:** Confirm before turn-off, rotate, clear password.
- **Files:** `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [ ] "Turn off link" → confirmation: "This link will stop working. Recipients will see an error page."
  - [ ] "New link" → confirmation: "The current link will stop working. Share the new link with recipients."
  - [ ] "Clear password" → confirmation: "Anyone with the link can view it without a password."

---

## Shared Link — Phase 4: Email & Compliance

### SL-P4.1: Real Sender Name in Emails

- **Objective:** Emails show manager's display name, not "A team member."
- **Files:** `src/lib/publication/actions.ts`
- **Behaviour:**
  - [ ] Sender resolved from `context.currentUserId` profile `display_name`
  - [ ] Fallback: "An Archestimator user"

### SL-P4.2: Unsubscribe Link

- **Objective:** CAN-SPAM/GDPR compliance.
- **Files:** `src/lib/publication/actions.ts` email template
- **Behaviour:**
  - [ ] Footer: "You received this because you were added as a recipient. [Unsubscribe]"
  - [ ] Unsubscribe link toggles a flag on `shared_link_recipients`
  - [ ] Unsubscribed recipients not sent further emails for that publication

### SL-P4.3: Resend Email for Recipients

- **Objective:** Manager can resend email to a recipient.
- **Files:** `src/components/workshop/publication/RecipientEmailComposer.tsx`, `src/lib/publication/actions.ts`
- **Behaviour:**
  - [ ] "Resend" button per recipient in the Recipients tab
  - [ ] Same template and link as original send
  - [ ] Rate-limited: 1 resend per recipient per 5 minutes

### SL-P4.4: Resend Webhook-Driven Delivery Status

- **Objective:** `delivery_status` updated based on actual delivery events.
- **Files:** New API route for Resend webhook, `src/lib/publication/actions.ts`
- **Behaviour:**
  - [ ] Webhook endpoint receives delivery events from Resend
  - [ ] Updates `shared_link_recipients.delivery_status` on bounce/open
  - [ ] Delivery failures surfaced in Recipients tab as "Failed" chips
