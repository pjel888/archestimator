# 08 — Codebase AI Implementation Prompts

**Date:** 2026-05-30
**Purpose:** Self-contained prompt blocks that can be given to a coding agent to execute one phase at a time. Each prompt includes context, prerequisites, files to touch, behaviour, and acceptance criteria.

---

## Prompt 1: Collaboration Invite — Phase 0 (Unblock)

```markdown
## Task: Unblock Collaboration Invite Flow (Config Only)

### Context
The collaboration invite system is non-functional because:
1. Supabase Auth email is not configured
2. `PROJECT_INVITE_ENTRY_ENABLED` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` are not set
3. The auto-grant trigger (`apply_pending_collaboration_invitations`) was deliberately neutered

This task requires NO code changes. Only configuration.

### Steps
1. Add to `.env.local`:
   - `PROJECT_INVITE_ENTRY_ENABLED=true`
   - `ARCHESTIMATOR_INVITE_TOKEN_PEPPER=<generate with: openssl rand -hex 32>`

2. Add to `.env.example` at the end:
   - `PROJECT_INVITE_ENTRY_ENABLED=false`
   - `ARCHESTIMATOR_INVITE_TOKEN_PEPPER=`

3. Tell the user to configure Supabase Auth email in the dashboard:
   - Open https://supabase.com/dashboard/project/ebxxqidacheyapmmzavr
   - Go to Authentication → Email
   - Configure an email provider (SMTP or Resend integration)
   - Verify the sending domain
   - Customize the invite email template

4. Run the E2E smoke test:
   ```
   ARCHESTIMATOR_E2E_INVITE_ENTRY=1 \
   PROJECT_INVITE_ENTRY_ENABLED=true \
   ARCHESTIMATOR_INVITE_TOKEN_PEPPER=<pepper-value> \
   bun run test:e2e -- e2e/project-invite-entry.spec.ts --project=chromium
   ```

### Acceptance
- [ ] `PROJECT_INVITE_ENTRY_ENABLED` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` in `.env.local` and `.env.example`
- [ ] E2E smoke test passes (or at minimum, `/invite/[token]` pages render instead of showing "invalid")
- [ ] User confirms email configuration in Supabase dashboard
```

---

## Prompt 2: Collaboration Invite — Phase 1 (Security & Messaging)

```markdown
## Task: Harden Collaboration Invite Security and Fix False-Positive Messaging

### Prerequisites
- Phase 0 complete (env vars set, email configured)

### Files to Touch
- `src/app/invite/[token]/accept/route.ts` — POST-only acceptance
- `src/app/invite/[token]/page.tsx` — change Accept link to form POST
- `src/lib/collaboration/actions.ts` — fix success messages, add audit recording
- `src/lib/collaboration/invite-entry.ts` — add config validation with descriptive errors
- `src/app/invite/[token]/page.tsx` — rate limiting on resolve
- New: `src/lib/collaboration/rate-limit.ts` — durable rate limiter using DB table

### Behaviour
1. **POST-only acceptance:** Accept route only mutates on POST. GET renders a confirmation page (project name, role, inviter). "Accept invite" link becomes a form.

2. **Rate limiting (durable):** Create a `rate_limits` table in the DB. Implement rate limiter utility using it.
   - Token resolution: 30/min per IP+token_hash
   - Accept: 5/min per IP+user_id+token_hash
   - Continue (bridge): 10/min per IP+token_hash
   - Return 429 with Retry-After header

3. **Fail-closed messaging:** Change server action messages:
   - "Invite email sent." → "Invitation created. The recipient will receive an email with an acceptance link."
   - When invite entry disabled: "User added directly. They can access the project now."
   - When env var missing: throw with descriptive error, don't silently fail

4. **Audit recording:** Call `record_collaboration_invitation_delivery` after email send (best-effort, wrapped in catch). Add `collaboration_invite_opened` audit event to `resolve_collaboration_invitation` RPC (if not already there).

### Security Acceptance
- [ ] GET /invite/[token]/accept renders confirmation only, no RPC call
- [ ] Rate limiting uses DB storage, survives restart
- [ ] Rate limit exceeded returns 429 with clear message
- [ ] No "Invite email sent." message when delivery is uncertain
- [ ] Audit events recorded for email attempt, email sent, invite opened

### Tests
- [ ] Vitest: verify GET /invite/[token]/accept does not call RPC
- [ ] Vitest: verify POST calls RPC
- [ ] Vitest: verify message strings for each config state
- [ ] Vitest: verify rate limiter returns 429 after threshold
```

---

## Prompt 3: Collaboration Invite — Phase 2 (Visibility)

```markdown
## Task: Surface Pending Invites Across All UI Surfaces

### Prerequisites
- Phase 1 complete

### Files to Touch
- `src/lib/repositories/workspace-repository.ts` — add pending-invite queries to `listCurrentWorkspaceProjects()`
- `src/lib/collaboration/types.ts` — add `pending-invite` to `WorkshopProjectAccessKind`
- `src/components/workshop/LiveProjectCard.tsx` — pending-invite card variant
- `src/components/workshop/projects-page-client.tsx` — handle pending projects in filter
- `src/components/sidebar/MainSidebar.tsx` — pending-invite badge on Projects nav
- `src/components/workshop/WorkshopHomebaseClient.tsx` — persistent pending-invite banner
- New: `supabase/migrations/YYYYMMDDHHMMSS_accept_invitation_by_id.sql` — new RPC
- New: `src/app/api/invite/[invitationId]/accept/route.ts` — new accept route

### Behaviour
1. **Project list (invitee):** Show projects with pending invites. Card has amber left-border, "Pending invite" badge, role, inviter name, expiry. "Accept →" action triggers a `POST` to a new authenticated route at `/api/invite/{invitationId}/accept`. Raw invite tokens are NOT available (stored as hashes), so cards cannot link to `/invite/[token]`. Instead, the new route verifies `auth.email === invitation.email` server-side and calls the new `accept_collaboration_invitation_by_id(invitation_id)` RPC. New `accessKind: "pending-invite"`.

2. **New RPC:** `accept_collaboration_invitation_by_id(invitation_id uuid)` — accepts a pending invitation for the currently authenticated user if their JWT email matches the invitation's email. Same grants as existing `accept_collaboration_invitation` (`authenticated` only). Returns same `jsonb` with `state` field.

3. **Project list (inviter):** Show "N pending" chip on owned project cards. Aggregated count from `collaboration_invitations WHERE project_id = X AND lifecycle_state = 'pending'`.

4. **Sidebar:** Red dot/badge on "Projects" nav item showing pending invite count. Client-side: fetch count via TanStack Query or server-rendered prop.

5. **Homebase:** Persistent banner "You have N pending invites" with inline per-invite info and Accept action. Rendered below existing `InviteResolutionBanner`.

### UX
- [ ] Pending-invite cards visually distinct (amber, not green/blue)
- [ ] Accept action is a form POST, not a GET link
- [ ] Sidebar badge updates when invites accepted/expired
- [ ] Homebase banner dismissible? Decision: persistent until all accepted

### Tests
- [ ] Vitest: verify `WorkshopProjectAccessKind` includes `"pending-invite"`
- [ ] Vitest: verify `LiveProjectCard` renders pending-invite variant
- [ ] Vitest: verify sidebar badge renders with count
- [ ] Vitest: verify new RPC contract and grants
- [ ] Vitest: verify new accept route blocks wrong-email acceptance
```

---

## Prompt 4: Collaboration Invite — Phase 3 (UX Improvements)

```markdown
## Task: Improve Invite Acceptance UX

### Prerequisites
- Phase 2 complete

### Files to Touch
- `src/app/invite/[token]/page.tsx` — wrong-account current email display
- `src/app/invite/[token]/continue/route.ts` — consolidate redirect chain
- `src/app/workshop/pending-invite/route.ts` — consolidate bridge consumption
- `src/app/workshop/page.tsx` — success banner for accepted invites
- `src/components/workshop/ProjectTeamspaceHeader.tsx` — resend button

### Behaviour
1. **Consolidate signed-out acceptance:** Replace 4-redirect dance with 2-step flow.
   - Invite page → "Sign in to accept" button → login → callback → single server-side accept on workshop load → project page
   - Show "Accepting your invite..." progress/loading page during the final step

2. **Wrong-account page:** Show "You are signed in as {currentEmail}. This invite is for {invitedEmail}."

3. **Success after acceptance:** Banner persists until user navigates to project. Same existing pattern: "You've been added as {role} to {project}" with "Open project" link.

4. **Resend invite:** "Resend" button next to pending invitation in Teamspaces modal. Rate-limited: 1 resend per invitation per 5 minutes.

5. **Expired/revoked:** Add sender email or "Contact sender" link. V1: informational only.

### UX
- [ ] Redirect chain ≤3 redirects (target: 2)
- [ ] Progress page visible during bridge acceptance
- [ ] Wrong-account shows both current and invited email
- [ ] Resend button with rate-limit feedback

### Tests
- [ ] Vitest: verify wrong-account page includes current email
- [ ] Vitest: verify continue route sets bridge cookie correctly after changes
```

---

## Prompt 5: Collaboration Invite — Phase 4 (Removal UX)

```markdown
## Task: Add Removal Confirmation, Notification, and Cleanup

### Prerequisites
- Phase 3 complete

### Files to Touch
- `src/components/workshop/ProjectTeamspaceHeader.tsx` — removal confirmation modal
- `src/lib/collaboration/actions.ts` — add favorite cleanup to `removeProjectCollaborator()`
- `src/components/workshop/WorkshopHomebaseClient.tsx` — "you were removed" banner

### Behaviour
1. **Removal confirmation:** Before calling `removeProjectCollaborator()`, show confirmation:
   - "{name} ({role}) will lose access to {project} and all its estimate sheets."
   - [Cancel] [Remove] buttons

2. **Favorite cleanup:** After removing `project_members` row, delete `project_favorites` row for that user+project. Idempotent.

3. **Removed-user banner:** When a user whose favorite project is no longer accessible visits workshop, show:
   - "You no longer have access to {project}. The project owner may have changed your access."
   - "Remove from favorites" action

### UX
- [ ] Removal requires explicit confirmation
- [ ] Favorites cleaned up automatically
- [ ] Removed user sees a banner, not silent disappearance

### Tests
- [ ] Vitest: verify confirmation dialog renders
- [ ] Vitest: verify favorite cleanup called in remove action
```

---

## Prompt 6: Shared Link — Phase 1 (Visibility)

```markdown
## Task: Add Shared-Link Visibility Signifiers

### Prerequisites
- Shared link feature is already functional

### Files to Touch
- `src/lib/repositories/workspace-repository.ts` — add publication status to project list query
- `src/components/workshop/LiveProjectCard.tsx` — "Shared" badge
- `src/components/workshop/ProjectPublicationHeader.tsx` — one-click copy, activity dot

### Behaviour
1. **Project card badge:** When `project_publications.status = 'published'`, show "Shared" badge (emerald). Add optional `publicationStatus` prop to card.

2. **One-click copy:** When live link exists, header rail button becomes split button: left opens modal, right copies link. Show brief "Copied!" feedback.

3. **New-activity dot:** Orange dot on header rail button when most recent activity timestamp > `lastSeenAt`. Store `lastSeenAt` in component state (or localStorage). Clear dot when Activity tab opens.

### Performance
- [ ] Publication status aggregated in single query, not per-card
- [ ] Activity dot: compare timestamps, no DB query needed

### Tests
- [ ] Vitest: verify "Shared" badge renders when prop is "published"
- [ ] Vitest: verify badge does NOT render for "unpublished"/"revoked"/"expired"
```

---

## Prompt 7: Shared Link — Phase 2 (Tracking & Identity)

```markdown
## Task: Add Per-Recipient Tracking and Recipient Identity

### Prerequisites
- Shared Link Phase 1 complete

### Files to Touch
- `src/lib/publication/public-repository.ts` — enrich open events with recipient_id
- `src/components/workshop/ProjectPublicationHeader.tsx` — per-recipient last opened
- `src/components/share/SharePageSessionBanner.tsx` — viewing identity
- `src/lib/publication/actions.ts` — resolve real owner for digests

### Behaviour
1. **Per-recipient opens:** When session cookie is valid on page load, include `recipient_id` in the open event. Show "Last opened by [email] at [time]" in modal sidebar instead of generic date.

2. **Recipient identity:** When session is active on share page, show banner: "Viewing as {email}". "Not you?" link clears session. Banner always visible (sticky).

3. **Real owner email:** Resolve project owner email from workspace members. Replace hardcoded `"owner@archestimator.test"` with resolved email. Fallback: skip digest if no owner found.

### Tests
- [ ] Vitest: verify recipient identity banner renders with email
- [ ] Vitest: verify "Not you?" link clears cookie
- [ ] Vitest: verify owner digest uses resolved email
```

---

## Prompt 8: Shared Link — Phase 3 (Content & Polish)

```markdown
## Task: Add Stale Snapshot Warning, Search, Print, and Confirmations

### Prerequisites
- Shared Link Phase 2 complete

### Files to Touch
- `src/lib/publication/actions.ts` — staleness check helper
- `src/components/workshop/ProjectPublicationHeader.tsx` — stale warning, confirmations
- `src/components/share/SharePageTabs.tsx` — search/filter
- New: `src/app/share/print.css` — print stylesheet

### Behaviour
1. **Stale snapshot warning:** Compare `snapshot_json->>'generatedAt'` with latest `estimates.updated_at`. If >7 days stale: amber warning in modal sidebar: "Snapshot is N days behind current data. Update shared page."

2. **Search/filter:** Text input above grid in Grid Preview mode. Client-side filter on description, designation, material. Empty state: "No rows match."

3. **Print stylesheet:** `@media print` styles. Hide header, sidebar, comments. Show project name, estimate tables, tree view. Page breaks at estimate boundaries.

4. **Destructive confirmations:** Confirmation before: turn off, rotate/new link, clear password. Shows what will happen. [Cancel] [Confirm] pattern.

### Tests
- [ ] Vitest: verify stale warning renders when snapshot >7 days old
- [ ] Vitest: verify search/filter works on flat row data
- [ ] Vitest: verify confirmation dialog renders for destructive actions
```

---

## Prompt 9: Shared Link — Phase 4 (Email & Compliance)

```markdown
## Task: Fix Email Identity, Add Unsubscribe, Resend, Webhooks

### Prerequisites
- Shared Link Phase 3 complete

### Files to Touch
- `src/lib/publication/actions.ts` — real sender name, unsubscribe link, resend, real owner email
- `src/components/workshop/publication/RecipientEmailComposer.tsx` — resend button
- New: `src/app/api/share/webhook/route.ts` — Resend webhook handler

### Behaviour
1. **Real sender name:** Resolve `display_name` from profile for `context.currentUserId`. Replace "A team member" in email template.

2. **Unsubscribe link:** Footer: "You received this email because you were added as a recipient. [Unsubscribe]". Link toggles a flag on `shared_link_recipients`.

3. **Resend email:** "Resend" button per recipient in Recipients tab. Same template. Rate-limited: 1/5min per recipient.

4. **Webhook-driven status:** New webhook endpoint receives Resend delivery events. Updates `delivery_status` on bounce/open. Shows "Bounced" or "Opened" chips in Recipients tab.

### Tests
- [ ] Vitest: verify sender name resolved from profile
- [ ] Vitest: verify unsubscribe link present in email template
- [ ] Vitest: verify resend rate-limited
```

---

## Prompt 10: Testing & Hardening Pass

```markdown
## Task: Comprehensive Testing and Security Hardening Pass

### Prerequisites
- All phases complete

### Scope
Run a full testing and hardening pass across both systems. Fix any issues found.

### Steps
1. Run all existing tests:
   - `bun run test` (Bun unit tests)
   - `bun run test:dom` (Vitest DOM tests)
   - `bun run type-check`
   - `bun run lint`
   - `bun run lint:design-system`

2. Fix any broken tests from the implementation phases.

3. Add negative security tests:
   - Invalid tokens return 404
   - Revoked tokens return appropriate error
   - Expired tokens return appropriate error  
   - Tampered cookies rejected
   - Rate limits enforce correctly
   - GET mutations blocked
   - Role escalation blocked
   - XSS in comments sanitized
   - CSRF tokens enforced
   - Raw tokens not in error messages or logs

4. Run E2E smoke tests with env vars:
   - `ARCHESTIMATOR_E2E_INVITE_ENTRY=1 bun run test:e2e -- e2e/project-invite-entry.spec.ts`
   - `ARCHESTIMATOR_E2E_SHARED_LINK=1 bun run test:e2e -- e2e/shared-link-receiver.spec.ts`

5. Performance check:
   - No N+1 queries in project list
   - Activity feeds paginated
   - Rate limiters durable

6. Design lint check:
   - `bun run lint:design-system`

### Acceptance
- [ ] All tests pass
- [ ] No security test regressions
- [ ] E2E smoke tests pass (or documented as skipped with valid reason)
- [ ] Design lint: 0 violations from our changes
```
