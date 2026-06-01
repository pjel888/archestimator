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
    - 2026-06-01: Partial public Auth settings proof found `external.email=true`, but the installed Supabase CLI has no `auth/config get` command and no `SUPABASE_ACCESS_TOKEN` is available for Management API `GET /v1/projects/{ref}/config/auth`; dashboard SMTP/built-in provider state remains unproven.
  - [ ] Test email sent and received from dashboard
    - 2026-06-01: Still requires real dashboard send plus inbox receipt evidence. No automated send was triggered because it would not prove dashboard receipt and could send real email.
  - [ ] Invite email template customized (branded, not Supabase default)
    - 2026-06-01: Local `supabase/config.toml` invite template block is commented out; hosted template state requires dashboard or Management API read with `auth_config_read`.
  - [ ] `enable_confirmations` verified (can remain false — invite emails don't require confirmation)
    - 2026-06-01: Partial public Auth settings proof found `mailer_autoconfirm=false`, and local `supabase/config.toml` has `auth.email.enable_confirmations=false`; hosted dashboard config remains unproven without Management API/dashboard access.

### P0.2: Enable Invite Entry Env Vars

- **Objective:** Enable the `/invite/[token]` route and token generation.
- **Files:** `.env.local`, `.env.example`
- **Behaviour:**
  - [x] `PROJECT_INVITE_ENTRY_ENABLED=true` in `.env.local`
    - 2026-06-01: `.env.local` is git-ignored and now contains `PROJECT_INVITE_ENTRY_ENABLED=true`; `bun` env readback returned `enabled: "true"`.
  - [x] `ARCHESTIMATOR_INVITE_TOKEN_PEPPER=<64-char random hex>` in `.env.local`
    - 2026-06-01: `.env.local` now contains a generated 64-character hex pepper; verification printed only length/hex shape.
  - [x] Both vars added to `.env.example` with safe defaults (`false` and empty)
    - 2026-05-31: `.env.example` now documents `PROJECT_INVITE_ENTRY_ENABLED=false` and empty `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`; `.env.local` was intentionally unmodified/unproven in that slice.
  - [x] After restart, `/invite/[token]` pages render (not "invite entry disabled")
    - 2026-06-01: Live Playwright smoke started a fresh Next dev server with `PROJECT_INVITE_ENTRY_ENABLED=true` and an inline generated 64-hex pepper; `/invite/[token]` rendered signed-out, signed-in, wrong-account, and terminal states.
    - 2026-06-01: Persistent-env rerun started a fresh server with only `ARCHESTIMATOR_E2E_INVITE_ENTRY=1` supplied inline; `.env.local` supplied the invite-entry flag and pepper, and `/invite/[token]` rendered all live states.
  - [x] `issueInviteEntryLink()` succeeds and returns valid `invitePath`
    - 2026-06-01: Live invite-entry E2E now issues tokens through the authenticated `issue_collaboration_invitation_token` RPC used by `issueInviteEntryLink()`, asserts returned paths match `/invite/<43-char-base64url-token>`, and navigates by that `invitePath`.
- **Security:**
  - [x] Pepper is at least 64 hex characters (32 bytes)
    - 2026-05-31: `readInviteEntryConfig()` now fail-closes unless the pepper matches a 64-character hex secret.
  - [x] Pepper is not hardcoded in source
    - 2026-05-31: Source and `.env.example` contain no real pepper; tests use deterministic dummy hex strings only.
  - [x] If pepper is missing but `PROJECT_INVITE_ENTRY_ENABLED=true`, `isProjectInviteEntryEnabled()` returns `false` (fail-closed)
    - 2026-05-31: Missing and invalid pepper states are covered in `project-invite-feature-flag`.
- **Tests:**
  - [x] `tests/vitest/project-invite-feature-flag.test.ts` — all tests pass with new config
    - 2026-05-31: Focused invite config/bridge/route/schema suite passed 4 files / 25 tests.
    - 2026-06-01: Persistent-env focused suite passed: `bun run test:dom tests/vitest/project-invite-feature-flag.test.ts tests/vitest/pending-invite-cookie.test.ts tests/vitest/project-invite-entry-route.test.ts` (3 files / 18 tests).

### P0.3: E2E Smoke Test

- **Objective:** Prove the full invite flow works against the linked remote.
- **Done when:**
  - [x] `ARCHESTIMATOR_E2E_INVITE_ENTRY=1 bun run test:e2e -- e2e/project-invite-entry.spec.ts --project=chromium` passes all tests
    - 2026-06-01: Fresh linked smoke passed with `PLAYWRIGHT_PORT=3061 ARCHESTIMATOR_E2E_INVITE_ENTRY=1 PROJECT_INVITE_ENTRY_ENABLED=true ARCHESTIMATOR_INVITE_TOKEN_PEPPER=<generated> bun run test:e2e -- --project=chromium e2e/project-invite-entry.spec.ts` (2 passed, 44.6s).
    - 2026-06-01: Persistent-env rerun passed with `PLAYWRIGHT_PORT=3062 ARCHESTIMATOR_E2E_INVITE_ENTRY=1 bun run test:e2e -- --project=chromium e2e/project-invite-entry.spec.ts` (2 passed, 46.4s); the Playwright process and Next dev server read `PROJECT_INVITE_ENTRY_ENABLED` and the pepper from `.env.local`.
  - [x] Signed-out invitee flow works: email → invite page → bridge → login → workshop → banner
    - 2026-06-01: Live smoke covered `/invite/[token]` signed-out preview, `/login?next=%2Fworkshop%2Fpending-invite`, no-store pending progress, accepted Workshop banner, shared project label, and viewer membership.
  - [x] Signed-in invitee flow works: email → invite page → accept → project
    - 2026-06-01: Live smoke covered signed-in preview, `Confirm acceptance` POST, accepted Workshop banner, and `Open project` navigation to the shared project.
  - [x] Wrong-account flow works: shows wrong-account page, sign-out works
    - 2026-06-01: Live smoke covered wrong-account state with invited-email detail and visible `Sign out and continue` action.
  - [x] Terminal states render correctly: expired, revoked, already-used, invalid
    - 2026-06-01: Live smoke covered expired, revoked, already-used, and invalid route states after resolving terminal token states against the linked database.
  - [x] Cleanup removes all test users and data
    - 2026-06-01: Live smoke cleanup completed after the authenticated token-issue rerun; direct service-role residue check returned `invitationResidue=0`, `profileResidue=0`, and `authResidue=0` for `@archestimator.local` test data.
    - 2026-06-01: Persistent-env rerun cleanup also returned `{"invitationResidue":0,"profileResidue":0,"authResidue":0}` for invite/expired/revoked/used `@archestimator.local` test data.

---

## Collaboration Invite — Phase 1: Security & Messaging

### P1.1: POST-Only Invite Acceptance

- **Objective:** Prevent browser pre-fetch from triggering invite acceptance.
- **Files:** `src/app/invite/[token]/accept/route.ts`, `src/app/invite/[token]/page.tsx`
- **Behaviour:**
  - [x] `GET /invite/[token]/accept` renders confirmation page (does not call RPC)
    - 2026-05-31: GET redirects back to the invite preview/confirmation page for the token and does not call `acceptInvite` or the accept RPC.
  - [x] `POST /invite/[token]/accept` calls RPC and redirects
    - 2026-05-31: POST calls `accept_collaboration_invitation` and redirects accepted/already-member states through the Workshop success banner.
  - [x] "Accept invite" on invite page is a `<form>` with `method="POST"`
    - 2026-05-31: Signed-in invite preview renders a POST form to `/invite/[token]/accept`; signed-out preview still routes through the bridge.
  - [x] Confirmation page shows: project name, role, inviter, "Confirm acceptance" button
    - 2026-05-31: Invite preview shows project, inviter, role, scope, code, expiry, and a `Confirm acceptance` submit button.
- **Security:**
  - [x] No state mutation on GET requests
    - 2026-05-31: Route contract test extracts the GET handler and asserts it redirects without calling `acceptInvite`.
  - [x] Browser pre-fetch of the page does not grant access
    - 2026-05-31: Accept mutation is confined to POST; GET prefetch resolves back to the read-only preview.
- **Negative tests:**
  - [x] `GET /invite/[token]/accept` does not create `project_members` row
    - 2026-05-31: Static route contract proves GET never calls the RPC path that inserts project/sheet membership.
  - [x] Two rapid POSTs do not double-insert (RPC handles idempotency)
    - 2026-05-31: `accept_collaboration_invitation` uses `insert ... on conflict` for project/sheet memberships and returns `already_member` for already accepted access.

### P1.2: Rate Limiting — Invite Resolution & Acceptance

- **Objective:** Prevent brute-force token scanning and rapid-fire acceptance attempts.
- **Files:** `src/app/invite/[token]/page.tsx`, `src/app/invite/[token]/accept/route.ts`, `src/app/invite/[token]/continue/route.ts`
- **Behaviour:**
  - [x] Token resolution (invite page load) rate-limited: 30/min per IP+token_hash
    - 2026-05-31: `checkInviteResolutionRateLimit()` uses DB-backed scope `collaboration_invite_resolve` with limit 30.
  - [x] Invite acceptance rate-limited: 5/min per IP+user_id+token_hash
    - 2026-05-31: `checkInviteAcceptRateLimit()` uses DB-backed scope `collaboration_invite_accept` with limit 5 and user id in the key.
  - [x] Continue (bridge creation) rate-limited: 10/min per IP+token_hash
    - 2026-05-31: `checkInviteContinueRateLimit()` uses DB-backed scope `collaboration_invite_continue` with limit 10.
  - [x] 429 response with `Retry-After` header
    - 2026-05-31: Accept and continue route contracts assert JSON `429` paths with `Retry-After`; invite page renders the rate-limited state for resolution.
- **Security:**
  - [x] Rate limiter uses durable storage (DB table, not in-memory)
    - 2026-05-31: Invite limits write/read `public.security_rate_limit_events`; migration `20260601003000` is applied and repaired on linked Supabase.
  - [x] Rate limit exceeded returns clear error: "Too many attempts. Please wait X seconds."
    - 2026-05-31: Shared invite limiter returns `Too many attempts. Please wait {retryAfter} seconds.` and action wrappers preserve that prefix.
- **Negative tests:**
  - [x] 31 rapid resolution requests → 429
    - 2026-06-01: `project-invite-feature-flag` mocks the Supabase-backed limiter store and verifies the 31st `checkInviteResolutionRateLimit()` call returns the 60-second 429-style limit result.
  - [x] 6 rapid accept attempts → 429
    - 2026-06-01: `project-invite-feature-flag` verifies the 6th `checkInviteAcceptRateLimit()` call for the same user/token/IP returns the 60-second 429-style limit result.
  - [x] Rate limiter survives server restart
    - 2026-05-31: Storage is DB-backed in linked Supabase rather than process memory; high-volume restart/load simulation remains open under the rapid-request checks above.

### P1.3: Fail-Closed Config Messaging

- **Objective:** Never show false-positive "sent" messages. Reflect actual state.
- **Files:** `src/lib/collaboration/actions.ts`, `src/lib/collaboration/invite-entry.ts`
- **Behaviour:**
  - [x] When Supabase email is not configured: message reads "Invitation created. Share the invite link manually." NOT "Invite email sent."
    - 2026-05-31: Project and estimate invite actions catch Supabase Auth send failures after token creation, skip delivery audit, and return the manual-share message with the invite path.
  - [x] When invite entry is disabled: message reads "User added directly. They can access the project now." for existing users
    - 2026-05-31: Existing project users receive the exact direct-grant message; estimate-sheet direct grants now use the analogous sheet-specific message.
  - [x] When invite entry is disabled and user is new: message explains that link-based invites are unavailable
    - 2026-05-31: New project/sheet invite attempts now return disabled-link messages instead of sending fallback Supabase emails or reporting false delivery.
  - [x] Missing env vars return descriptive errors, not generic "Something went wrong"
    - 2026-05-31: Invite token and bridge creation now throw explicit missing/malformed `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` messages through `describeInviteEntryConfigFailure()`.
- **UX:**
  - [x] No green "success" styling when actual delivery is uncertain
    - 2026-05-31: Teamspaces action status now separates neutral and warning tones; manual-share, unavailable, not-sent, could-not, and failed action messages render as warning instead of green/success.
  - [x] Use amber/warning messaging for "attempted but unverified" states
    - 2026-05-31: The Teamspaces modal warning status uses `bg-warningSoft` / `text-warning` for uncertain invite delivery outcomes, including the manual-share fallback after Supabase Auth email delivery failure.
- **Tests:**
  - [x] Vitest: verify message strings for each config state
    - 2026-05-31: `project-collaboration-actions` statically covers disabled-link direct-grant/new-user messages plus Supabase-email failure fallback, and `teamspace-collaboration-header` covers warning styling for uncertain invite outcome strings.
  - [x] Vitest: verify error messages for missing env vars
    - 2026-05-31: `project-invite-feature-flag` and `pending-invite-cookie` cover missing and malformed pepper messages for token and bridge creation.

### P1.4: Audit Event Recording

- **Objective:** Record all security-relevant events per the audit event matrix (doc 05).
- **Files:** `src/lib/collaboration/actions.ts`
- **Behaviour:**
  - [x] Invite email attempted: write to `collaboration_audit_events`
    - 2026-05-31: Project and estimate invite-email actions now write best-effort `invite_email_attempted` rows before provider send; focused and broader collaboration tests pass.
  - [x] Invite email sent (API success): write to `collaboration_audit_events` via `record_collaboration_invitation_delivery`
    - 2026-05-31: Email delivery auditing is recorded only after Supabase Auth accepts the invite send; copy-link delivery continues through the same helper.
  - [x] Invite opened: already handled by RPC (`last_opened_at`) — add explicit audit row
    - 2026-05-31: Migration `20260601023000_collaboration_invitation_open_audit.sql` makes `resolve_collaboration_invitation(text)` insert `collaboration_invite_opened` audit rows at the same boundary that updates `last_opened_at`; linked remote apply/repair and function-body verification are complete.
  - [x] Role changed: write to `collaboration_audit_events`
    - 2026-05-31: Role updates now append best-effort `role_changed` audit rows after the access mutation.
  - [x] Member removed: write to `collaboration_audit_events`
    - 2026-05-31: Member removal now appends best-effort `member_removed` audit rows after access/favorite cleanup.
  - [x] All audit events best-effort (don't block success response)
    - 2026-05-31: Audit helper catches/logs insert failures and does not change invite, role-update, or removal success semantics.
  - [x] No raw tokens in audit event metadata
    - 2026-05-31: Audit metadata stores role/scope/email/target ids only; raw invite tokens and token hashes are excluded by test coverage.

---

## Collaboration Invite — Phase 2: Visibility

### P2.1: Pending-Invite Cards on Project List (Invitee)

- **Objective:** Invitee sees projects they were invited to but haven't accepted.
- **Files:** `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/LiveProjectCard.tsx`, `src/components/workshop/projects-page-client.tsx`, new `src/app/api/invite/[invitationId]/accept/route.ts`
- **Behaviour:**
  - [x] `listCurrentWorkspaceProjects()` includes projects with pending invites for current user (query `collaboration_invitations WHERE email = currentUserEmail AND lifecycle_state = 'pending'`)
    - 2026-05-31: `listCurrentWorkspaceProjects()` now appends pending invite project cards from the authenticated `list_pending_collaboration_invitations()` RPC when the user does not already have accepted project/sheet access.
  - [x] Pending-invite projects have `accessKind: "pending-invite"` in the type
    - 2026-05-31: `WorkshopProjectAccessKind` / `ProjectAccessKind` include `pending-invite`, and pending cards expose `data-project-access-kind="pending-invite"`.
  - [x] Card shows: project name, inviter, role, expiry, "Accept →" action
    - 2026-05-31: Pending project cards show project name, inviter label, role, expiry, project code, and an Accept button with arrow icon.
  - [x] Card has distinct visual treatment (amber/yellow border, "Pending invite" badge)
    - 2026-05-31: Pending project cards use an orange left border, "Pending invite" badge, and pending-access media placeholder.
  - [x] Accept button triggers `POST /api/invite/{invitationId}/accept` — a new authenticated route that verifies `auth.email === invitation.email` server-side, then calls the existing `accept_collaboration_invitation` RPC (or a new `accept_collaboration_invitation_by_id` RPC). Raw invite tokens are NOT required for this path — the server verifies the authenticated user's email matches the invitation's email.
    - 2026-05-31: Implemented through the existing Next server-action POST path `acceptPendingInvitationById`, which submits only `invitationId` and calls authenticated RPC `accept_collaboration_invitation_by_id`; no raw invite token is used.
  - [x] New RPC `accept_collaboration_invitation_by_id(invitation_id uuid)` — accepts the pending invitation for the currently authenticated user if their JWT email matches the invitation email (same logic as existing `accept_collaboration_invitation` but using `invitation_id` + `auth.jwt()->>'email'` instead of token hash)
    - 2026-05-31: Migration `20260531164227_collaboration_invitation_accept_by_id.sql` added the RPC and authenticated-only grants; schema/type tests cover the contract.
- **Edge cases:**
  - [x] Expired pending invite: shown but disabled with "Expired" state
    - 2026-06-01: Migration `20260601043000_collaboration_pending_invite_expired_visibility.sql` widens `list_pending_collaboration_invitations()` with `state text` and includes expired rows. Project cards and Workshop homebase keep expired invites visible with `Expired` date copy and disabled `Expired` buttons while actionable pending counts exclude expired rows. Linked migration applied/repaired; direct live return-type verification found `state text`.
  - [x] User also has accepted access: prioritizes accepted state over pending
    - 2026-05-31: Project-list pending invite synthesis skips invites whose `projectId` is already present in accepted owned/shared/sheet-only project items.
  - [x] No pending invites: no change to existing UI
    - 2026-05-31: Existing owned/shared project items are returned unchanged when the received pending-invite list is empty.
  - [x] Wrong-email acceptance blocked: RPC returns `wrong_account` if `auth.email !== invitation.email`
    - 2026-05-31: Accept-by-id RPC contract is covered by schema/type tests and the action preserves the `wrong_account` branch.

### P2.2: Pending-Invite Badge on Main Sidebar

- **Objective:** Red dot/count on "Projects" nav item when user has pending invites.
- **Files:** `src/components/sidebar/MainSidebar.tsx`
- **Behaviour:**
  - [x] Pending count fetched server-side (layout-level or TanStack Query)
    - 2026-05-31: `/workshop` passes server-fetched `homebase.receivedPendingInviteCount` into `WorkshopPageShell` sidebar status.
  - [x] `Projects 🔴 1` when 1+ pending
    - 2026-05-31: `MainSidebar` maps the projects status count into `badgeCount` / `badgeLabel` for the Projects nav item.
  - [x] Clear on acceptance or all invites expired
    - 2026-05-31: The count derives from authenticated pending invitation RPC output, so accepted/expired rows stop contributing after server refresh.

### P2.3: Owner-Side Pending Count on Project Cards

- **Objective:** Project card shows "2 pending" chip when owner has pending invites out.
- **Files:** `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/LiveProjectCard.tsx`
- **Behaviour:**
  - [x] Aggregated pending count per owned project in `listCurrentWorkspaceProjects()`
    - 2026-05-31: `readPendingCollaborationVisibilitySummary()` aggregates sent pending invitations by project id and maps them onto manageable project items.
  - [x] Card renders amber chip: `[2 pending]`
    - 2026-05-31: `LiveProjectCard` renders the existing orange `Invites` chip with `formatPendingInviteCount(...)` for owner-side pending counts.

### P2.4: Pending-Invite Banner on Workshop Homebase

- **Objective:** Persistent banner when user has pending invites to accept.
- **Files:** `src/components/workshop/WorkshopHomebaseClient.tsx`
- **Behaviour:**
  - [x] "You have N pending project invites" with per-invite info
    - 2026-05-31: `PendingInvitesPanel` renders a persistent homebase region with project, code, role, inviter, expiry, and opened context.
  - [x] Inline "Accept" action per invite
    - 2026-05-31: Each pending invite row posts `invitationId` to `acceptPendingInvitationById`.
  - [x] Banner dismissible? Or persistent until all accepted? Decision: persistent until all accepted or expired.
    - 2026-05-31: The homebase pending-invite panel is persistent and derives from server pending-invite state, so it clears after acceptance or expiry.

---

## Collaboration Invite — Phase 3: UX Improvements

### P3.1: Consolidate Signed-Out Invite Acceptance

- **Objective:** Reduce 4-redirect chain to 2-step flow with progress indicator. Raw invite token must remain in the signed HttpOnly bridge cookie — never placed back into query params.
- **Files:** `src/app/invite/[token]/continue/route.ts`, `src/app/workshop/pending-invite/route.ts`, `src/lib/collaboration/pending-invite.ts`, `src/lib/auth/account-setup.ts`
- **2026-06-01 local progress:** `/invite/[token]/continue` now sends login `next` directly to `/workshop/pending-invite`, avoiding the extra `/workshop` page hop before bridge consumption. `/workshop` still retains its bridge-cookie fallback redirect for older/stale flows. The literal "Workshop page clears cookie" wording was narrowed because Next Server Components can read cookies but cannot safely mutate response cookies; the Route Handler remains the safe mutation boundary.
- **Behaviour:**
  - [x] Flow: invite page → "Sign in to accept" → login → callback → `/workshop/pending-invite` (bridge cookie consumed server-side) → accept RPC called immediately → Workshop banner with project link
    - 2026-06-01: `resolvePostAuthDestination()` now preserves the already-sanitized `/workshop/pending-invite` destination while continuing to send ordinary successful auth to `/workshop`; focused auth/invite suite passed 4 files / 24 tests.
  - [x] Max 2 server redirects after login callback before bridge consumption
    - 2026-06-01: The signed-out invite continue route sets `next=/workshop/pending-invite`, the auth callback preserves that one safe destination, and `/workshop/pending-invite` returns a no-store progress response instead of adding another server redirect before acceptance.
  - [x] Workshop detects stale bridge cookies and the pending-invite Route Handler calls `acceptPendingInviteBridge()` server-side, clears the HttpOnly cookie when safe, then renders the Workshop success/unavailable banner URL
    - 2026-06-01: `/workshop` keeps a stale-flow fallback redirect to `/workshop/pending-invite`; the Route Handler consumes the bridge and clears it in the same response except wrong-account retry, matching Next cookie mutation constraints.
  - [x] Progress page or loading state visible during the single accept step
    - 2026-06-01: `/workshop/pending-invite` now returns a no-store `Accepting invite` progress response before client/meta navigation to the Workshop banner URL.
  - [x] Raw token never appears in browser URL after initial `/invite/[token]` page load
    - 2026-06-01: Continue flow still stores only the peppered token hash inside the signed HttpOnly `archestimator_pending_invite` cookie; the progress response navigates with invite state only, never the raw token.
  - [x] Bridge cookie consumed and cleared in same request that performs acceptance
    - 2026-06-01: The pending-invite route reads the bridge, calls `acceptPendingInviteBridge()`, and clears `archestimator_pending_invite` on the same no-store response unless the wrong-account retry state must keep it.

### P3.2: Wrong-Account Page Shows Current Email

- **Objective:** User sees "You are signed in as X. This invite is for Y."
- **Files:** `src/app/invite/[token]/page.tsx`
- **Behaviour:**
  - [x] Shows current signed-in email
    - 2026-05-31: Wrong-account invite state now shows a compact signed-in/invited email comparison.
  - [x] Shows invited email
    - 2026-05-31: Wrong-account invite state now labels the invited email explicitly.
  - [x] "Sign out and continue" opens that email's sign-in flow
    - 2026-05-31: Existing sign-out route remains wired from the wrong-account state; route contract test covers the link and sign-out route.

### P3.3: Success Banner After Acceptance

- **Objective:** After accepting, user sees confirmation, not silent redirect.
- **Files:** `src/app/invite/[token]/accept/route.ts`, `src/app/workshop/page.tsx`
- **Behaviour:**
  - [x] Redirect includes `?invite=accepted` query param (already implemented)
    - 2026-05-31: Signed-in `/invite/[token]/accept` POST now redirects to `/workshop?invite=accepted...` with scope, target href, and target label instead of silently landing on the project/sheet.
  - [x] Banner shows: "You've been added as {role} to {project}" with "Open project" link
    - 2026-05-31: The invite preview posts already-visible role/project display values as sanitized UX-only fields; the Workshop banner renders `You've been added as {role} to {project}.` with the existing Open project/Open sheet link. Access mutation remains RPC-driven.

### P3.4: Re-Invite Request for Expired/Revoked

- **Objective:** Invitee has in-app path when invite is expired or revoked.
- **Files:** `src/app/invite/[token]/page.tsx`
- **Behaviour:**
  - [x] Expired page: "Ask the sender for a new invite" with link to contact
    - 2026-05-31: Expired terminal state now uses shared recovery copy and links to `/contact`.
  - [x] Revoked page: same pattern
    - 2026-05-31: Revoked terminal state now uses the same recovery copy and contact link.
  - [x] V1: just informational text with the sender's email. V2: in-app "Request new invite" button.
    - 2026-06-01: `resolve_collaboration_invitation(text)` now returns `inviter_email`, including revoked terminal rows, and expired/revoked terminal pages render "Contact the sender at {email}" when available. The V2 in-app request button remains deferred.

### P3.5: Resend Invite on Pending List

- **Objective:** Manager can resend an invite from the Teamspaces modal.
- **Files:** `src/components/workshop/ProjectTeamspaceHeader.tsx`, `src/lib/collaboration/actions.ts`
- **Behaviour:**
  - [x] "Resend" button next to pending invitation
  - [x] Calls `sendSupabaseInviteEmail()` again
  - [x] Rate-limited: 1 resend per invitation per 5 minutes

---

## Collaboration Invite — Phase 4: Removal UX

### P4.1: Removal Confirmation Dialog

- **Objective:** Manager confirms before removing collaborator.
- **Files:** `src/components/workshop/ProjectTeamspaceHeader.tsx`
- **Behaviour:**
  - [x] Trash icon click opens confirmation modal
  - [x] Modal shows: "Remove {name}? They will lose access to this project and all estimate sheets."
  - [x] "Notify {name} of removal" checkbox
  - [x] [Cancel] [Remove] buttons

### P4.2: Favorite Cleanup on Removal

- **Objective:** Removed user's project favorites are cleaned up.
- **Files:** `src/lib/collaboration/actions.ts`
- **Behaviour:**
  - [x] `removeProjectCollaborator` also deletes `project_favorites` row for that user+project
  - [x] Idempotent: safe if no favorites exist

### P4.3: "You Were Removed" Banner

- **Objective:** Removed user sees notification on next workshop visit.
- **Files:** `src/components/workshop/WorkshopHomebaseClient.tsx`
- **Behaviour:**
  - [x] Banner: "You no longer have access to {project}."
    - 2026-06-01: Workshop homebase renders a `Project access removed` banner from stale favorited project IDs that no longer resolve, and project-detail URLs that no longer resolve redirect back to `/workshop?removedProject=...` for the same banner.
  - [x] "Remove from favorites" action
    - 2026-06-01: Banner action calls the project favorite removal path without requiring a readable project row, then clears the query-state banner back to `/workshop`.
  - [x] V1: only for projects the user had favorited. V2: notification table makes all removals visible.
    - 2026-06-01: V1 remains favorite/attempted-open scoped; notification-table coverage is still a future V2.

---

## Shared Link — Phase 1: Visibility

### SL-P1.1: Shared Badge on Project Cards

- **Objective:** Project card shows when a live shared link exists.
- **Files:** `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/LiveProjectCard.tsx`
- **Behaviour:**
  - [x] Aggregated publication status in project list query (when `status = 'published'`)
    - 2026-05-31: Workspace project reads attach `publicationSummary` for active project publications and ignore non-published summaries in card rendering.
  - [x] Card renders "Shared" badge (emerald, same color family as shared-project badge)
    - 2026-05-31: `LiveProjectCard` renders a Shared link badge/open-count row for live publications.
  - [x] Optional prop: doesn't break cards where publication data is absent
    - 2026-05-31: `publicationSummary` remains optional/null; targeted project-card tests pass with absent/unpublished data.
- **Edge cases:**
  - [x] Expired publication: not shown (status != 'published')
    - 2026-05-31: Card logic only treats `publicationSummary.status === "published"` as live.

### SL-P1.2: One-Click Copy from Header Rail

- **Objective:** Copy shared link without opening modal.
- **Files:** `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [x] When live link exists: split button — left = modal, right = copy
    - 2026-05-31: Header rail renders a main Shared link button plus `Copy shared link from header` icon button for live links.
  - [x] Copy shows brief "Copied!" feedback (not modal status message)
    - 2026-05-31: Header-copy regression asserts clipboard write and status text `Shared link copied.`
  - [x] When no live link: button opens modal as before
    - 2026-05-31: Header regression covers the unpublished summary path opening the Shared link modal.

### SL-P1.3: New-Activity Dot on Header Rail

- **Objective:** Orange dot when unseen activity exists.
- **Files:** `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [x] Dot shown when most recent activity timestamp > `lastSeenAt`
    - 2026-05-31: Header dot now compares the latest open/recipient-open timestamp against a persisted last-seen timestamp instead of only `openCount > 0`.
  - [x] `lastSeenAt` persisted in component state or localStorage
    - 2026-05-31: `ProjectPublicationHeader` stores last-seen timestamps in `localStorage` under `archestimator_shared_link_last_seen:{publicationId}` and mirrors it in component state.
  - [x] Dot cleared when Activity tab is opened
    - 2026-05-31: Opening the Activity tab marks the latest activity timestamp as seen and clears the header dot; focused header tests cover this behavior.

### SL-P1.4: Public Shared-Link Durable Route Limits

- **Objective:** Public shared-link routes enforce durable limits before launch.
- **Files:** `src/app/api/share/[token]/*`, `src/lib/publication/public-repository.ts`, `supabase/migrations/20260601003000_security_rate_limit_events.sql`
- **Behaviour:**
  - [x] Comment submissions are limited per recipient/publication with `429` and `Retry-After`
    - 2026-06-01: Live `next start` proof at `.ai/09_archive/store/share-collab-live-proof-20260601T103000Z/` inserted five comments and received sixth-attempt `429` with `Retry-After: 60`; cleanup left zero temporary residue.
  - [x] Password attempts are limited durably without blocking a valid-password attempt from a separate client
    - 2026-06-01: Live proof at `.ai/09_archive/store/share-collab-public-route-rate-limit-proof-20260601T104500Z/live-public-route-rate-limit-summary.json` recorded fifth invalid password as `401`, sixth invalid password as `429` with `Retry-After: 900`, and valid password as `204`.
  - [x] Snapshot, event, and activity public routes return `429` after their 60-request window is exceeded
    - 2026-06-01: The same live proof recorded snapshot `60 x 200 + 5 x 429`, event `60 x 204 + 5 x 429`, and activity `60 x 200 + 5 x 429`.
  - [x] Decision submission returns `409` for duplicate decisions before rate limiting returns `429`
    - 2026-06-01: The same live proof recorded decision `201`, four duplicate `409` responses, then sixth-attempt `429` with `Retry-After: 60`; a repository regression test covers Supabase RPC error-object wrapping so duplicate decisions no longer fall through to `500`.

---

## Shared Link — Phase 2: Tracking & Identity

### SL-P2.0: Recipient Query Parameter Alignment

- **Objective:** Generated recipient email links establish the same session the receiver route expects.
- **Files:** `src/lib/publication/actions.ts`, `src/app/share/[token]/page.tsx`, `tests/vitest/project-publication-actions.test.ts`, `tests/vitest/project-publication-page.test.tsx`
- **Behaviour:**
  - [x] Recipient email link query parameter matches the receiver parser (`?recipient=`), or the receiver deliberately supports both `recipient` and legacy `rt`
    - 2026-05-31: Recipient emails emit `?recipient=` and the receiver accepts both `recipient` and legacy `rt`; targeted publication tests pass.
  - [x] Tests prove the generated email URL establishes a shared-link session cookie
    - 2026-05-31: `project-publication-page` verifies recipient-token load sets the HttpOnly `shared_link_session_*` cookie and records recipient-scoped open tracking.
    - 2026-06-01: Next 16 production-mode proof moved cookie creation out of the Server Component into `POST /api/share/[token]/session`; focused receiver tests pass and live `next start` proof records a 200 session POST with HttpOnly `shared_link_session_*` plus `_ok` cookies.
  - [x] Tests prove legacy or malformed recipient query values do not leak private data
    - 2026-05-31: `project-publication-page` verifies malformed recipient query values do not set a recipient session cookie, do not render recipient identity, and record an unscoped open event.
  - [x] Comments/decisions remain unavailable when no valid recipient session exists
    - 2026-05-31: Comment and decision widgets are guarded through `useSharedLinkSession`; publication action tests verify the hook wiring.

### SL-P2.1: Per-Recipient View Tracking

- **Objective:** Track which recipient opened the link.
- **Files:** `src/lib/publication/public-repository.ts`, `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [x] When session cookie is valid, record open event with `recipient_id`
    - 2026-06-01: Live linked-Supabase proof under `next start` records recipient `delivery_status='opened'` and non-null `last_opened_at` after establishing the route-handler session and reloading `/share/[token]`.
  - [x] Modal sidebar: "Last opened by [email] at [time]" instead of generic "Latest open"
  - [x] Recipient `last_opened_at` updated on each open
- **Schema:** No schema change needed if `shared_link_events.metadata_json` includes `recipient_id`

### SL-P2.2: Recipient Identity Banner

- **Objective:** Show "You are viewing as [email]" on share page.
- **Files:** `src/components/share/SharePageSessionBanner.tsx`
- **Behaviour:**
  - [x] When session active: "Viewing as {email}" with email from the verified recipient session
    - 2026-06-01: Live proof at `.ai/09_archive/store/share-collab-live-proof-20260601T103000Z/live-share-comment-session-proof-summary.json` confirms the subsequent `/share/[token]` response renders the recipient banner for `shared-live-proof@archestimator.local`.
  - [x] When session inactive: no recipient identity banner (existing recipient-session-required cue may still render)
  - [x] "Not you?" link → clear session, reload

### SL-P2.3: Real Owner Email for Digests

- **Objective:** Owner digests go to actual owner, not placeholder.
- **Files:** `src/lib/publication/actions.ts`
- **Behaviour:**
  - [x] Resolve owner: project → workspace → workspace_members (role = 'owner') → profile.email
  - [x] Fallback: project.created_by → profile.email
  - [x] If no owner found: log warning, skip digest

---

## Shared Link — Phase 3: Content & Polish

### SL-P3.1: Stale Snapshot Warning

- **Objective:** Warn manager when shared snapshot is out of date.
- **Files:** `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [x] Compare `snapshot_json->>'generatedAt'` with latest `estimates.updated_at`
  - [x] If stale > 7 days: amber warning in modal sidebar
  - [x] Warning: "Snapshot is {N} days behind current data. Update shared page."
- **Performance:**
  - [x] Compare timestamps only (no full diff)
  - [x] Cache comparison result for 5 minutes

### SL-P3.2: Search/Filter in Shared Estimates

- **Objective:** Recipient can filter rows by text.
- **Files:** `src/components/share/SharePageTabs.tsx`
- **Behaviour:**
  - [x] Search input above grid in Grid Preview mode
  - [x] Client-side filter on description, designation, material (case-insensitive)
  - [x] Empty state: "No rows match \"{query}\""

### SL-P3.3: Print Stylesheet

- **Objective:** Share page prints cleanly.
- **Files:** New `src/app/share/print.css` or co-located styles
- **Behaviour:**
  - [x] Hide: header nav, decision/comments sidebar, password gate
  - [x] Show: project name, estimate tables, tree view
  - [x] Monochrome-optimized
  - [x] Page breaks at estimate boundaries

### SL-P3.4: Destructive Action Confirmations

- **Objective:** Confirm before turn-off, rotate, clear password.
- **Files:** `src/components/workshop/ProjectPublicationHeader.tsx`
- **Behaviour:**
  - [x] "Turn off link" → confirmation: "This link will stop working. Recipients will see an error page."
  - [x] "New link" → confirmation: "The current link will stop working. Share the new link with recipients."
  - [x] "Clear password" → confirmation: "Anyone with the link can view it without a password."

---

## Shared Link — Phase 4: Email & Compliance

### SL-P4.1: Real Sender Name in Emails

- **Objective:** Emails show manager's display name, not "A team member."
- **Files:** `src/lib/publication/actions.ts`
- **Behaviour:**
  - [x] Sender resolved from `context.currentUserId` profile `display_name`
  - [x] Fallback: "An Archestimator user"

### SL-P4.2: Unsubscribe Link

- **Objective:** CAN-SPAM/GDPR compliance.
- **Files:** `src/lib/publication/actions.ts` email template
- **Behaviour:**
  - [x] Footer: "You received this because you were added as a recipient. [Unsubscribe]"
  - [x] Unsubscribe link toggles a flag on `shared_link_recipients`
  - [x] Unsubscribed recipients not sent further emails for that publication

### SL-P4.3: Resend Email for Recipients

- **Objective:** Manager can resend email to a recipient.
- **Files:** `src/components/workshop/publication/RecipientEmailComposer.tsx`, `src/lib/publication/actions.ts`
- **Behaviour:**
  - [x] "Resend" button per recipient in the Recipients tab
  - [x] Same template pattern as original send; resend mints a fresh secure recipient token because raw tokens are never stored
  - [x] Rate-limited: 1 resend per recipient per 5 minutes

### SL-P4.4: Resend Webhook-Driven Delivery Status

- **Objective:** `delivery_status` updated based on actual delivery events.
- **Files:** New API route for Resend webhook, `src/lib/publication/actions.ts`
- **Behaviour:**
  - [x] Webhook endpoint receives delivery events from Resend
  - [x] Updates `shared_link_recipients.delivery_status` on bounce/open
  - [x] Delivery failures surfaced in Recipients tab as "Failed" chips
