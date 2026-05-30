# UX Paths & Happy Paths: Collaboration Invite Flow

**Date:** 2026-05-30
**Purpose:** Map every user journey through the collaboration invite system — inviter and invitee perspectives, happy paths, edge cases, and the currently broken state.

---

## User Journey 1: Project Manager Invites a Collaborator

### Happy Path (Intended Design)

```
1. Manager is on a project page, sees "Teamspaces" rail with settings gear
2. Clicks gear → "Teamspace settings" modal opens
3. Sees "Project access" section with invite form
4. Types email, selects role (Editor default), clicks "Send invite"
5. Sees green status: "Invite email sent."
6. Invitee receives email with "View Project Estimate" button
7. (Invitee flow continues in Journeys 2-4)
```

### Visual Surface Map

| Step | Component | File |
|------|-----------|------|
| Header rail | `ProjectTeamspaceHeader` avatar bubbles + gear icon | `src/components/workshop/ProjectTeamspaceHeader.tsx:218-237` |
| Modal trigger | `Button` with `GearSix` icon, `onClick={() => setOpen(true)}` | line 230-237 |
| Modal shell | `Modal` with sidebar + main grid layout | line 240-252 |
| Invite form | `<form>` with email input, role dropdown, "Send invite" button | line 276-325 |
| Status message | `actionMessage` rendered as a status `<p>` at modal bottom | line 539-545 |
| Pending invites | List of pending invitations with "Copy invite link" button | line 335-358 |
| Collaborator list | Each collaborator row with role dropdown + remove button | line 293-333 |
| Sheet access | Per-sheet invite form + access mode toggle | line 404-498 |
| Private link | Read-only project path + Copy button | line 500-525 |

### Error States & Feedback

| State | What user sees | Trigger |
|-------|---------------|---------|
| Success (new user) | "Invite email sent." | Email not found in profiles |
| Success (existing user) | "Existing user added. Copy invite link to let them confirm access." | Email found in profiles → direct grant, no email |
| Not authorized | "Only project owners and admins can manage access." | User lacks admin/owner rank |
| Invalid email | "Enter a valid email address." | Email doesn't match regex |
| Too-high role | "Cannot assign a role above your own access level." | Trying to invite as admin when you're editor |
| Server action error | "Access update failed." | Generic catch-all in `runAccessAction()` |
| Network/server error | Error message from thrown exception | Any uncaught error in server action |

### UX Issues

1. **No loading state on the "Send invite" button.** `isPending` from `useTransition` disables the button but there's no spinner or "Sending..." text. The user clicks and waits with no feedback until the status message appears.

2. **"Invite email sent." message is misleading when Supabase email isn't configured.** The server action returns `ok: true` with "Invite email sent." even when no email was actually delivered — it only checks if the GoTrue API call succeeded, not delivery.

3. **"Existing user added. Copy invite link to let them confirm access." is confusing.** No email is sent, no notification. The existing user gets silently added. The manager has to manually copy the invite link and send it through another channel.

4. **Invite email input doesn't clear on error.** If the invite fails, the email stays in the input. If it succeeds, the email clears (line 153: `if (result.ok) setInviteEmail("")`).

5. **No duplicate-email prevention for the same invite.** `upsertInvitation()` re-activates expired/revoked invites with the same email instead of warning "already invited this email."

6. **The "Copy invite link" button on pending invitations only works when `PROJECT_INVITE_ENTRY_ENABLED=true`.** If disabled, `copyProjectInviteLink()` returns `{ ok: false, message: "Invite links are disabled." }` — the user sees "Invite links are disabled." with no guidance on what to do instead.

7. **No "resend" action on pending invitations.** Only "Copy invite link" is available.

---

## User Journey 2: Invitee — Signed Out, Clicks Email Link

### Happy Path (Intended Design — requires PROJECT_INVITE_ENTRY_ENABLED=true)

```
1. Invitee receives email from Supabase Auth
2. Clicks "View Project Estimate" / verification link in email
3. Browser opens → GoTrue verifies token → redirects to /invite/<rawToken>
4. Invitee sees invite page: "Project invite" heading, project name,
   inviter name, role, expiry, "Continue to Archestimator" button
5. Clicks "Continue to Archestimator" → bridge cookie set → redirected to /login?next=/workshop
6. Invitee signs in (Google OAuth or magic link)
7. Auth callback → exchangeCodeForSession → resolvePostAuthDestination returns /workshop
8. Redirected to /workshop
9. Workshop page detects archestimator_pending_invite cookie → redirects to /workshop/pending-invite
10. /workshop/pending-invite reads bridge cookie → calls accept_collaboration_invitation RPC
11. RPC matches JWT email to invitation email → inserts project_members row
12. Redirected to /workshop?invite=accepted&scope=project&targetHref=/workshop/projects/...
13. Workshop page renders banner: "[Project name] added" with "Open project" link
```

### Redirect Chain (4 server redirects)
```
/invite/[token]/continue → /login?next=/workshop → /workshop → /workshop/pending-invite → /workshop?invite=accepted
```

### Surface Map

| Step | Component/Route | File |
|------|----------------|------|
| Email click | GoTrue `/auth/v1/verify` | Supabase-managed |
| Invite page | `InviteEntryPage` server component | `src/app/invite/[token]/page.tsx` |
| Continue route | `continueToAuth()` | `src/app/invite/[token]/continue/route.ts` |
| Bridge cookie | `createPendingInviteBridge()` | `src/lib/collaboration/pending-invite.ts` |
| Login page | Supabase Auth UI | `/login` route |
| Auth callback | `GET` handler | `src/app/auth/callback/route.ts` |
| Workshop page | `WorkshopPage` server component | `src/app/workshop/page.tsx` |
| Pending-invite route | `GET` handler | `src/app/workshop/pending-invite/route.ts` |
| Accept RPC | `accept_collaboration_invitation()` | DB function |
| Success banner | `WorkshopHomebaseClient` prop | `src/components/workshop/WorkshopHomebaseClient.tsx` |

### Error States

| State | What user sees | Trigger |
|-------|---------------|---------|
| Invalid token | "This invite link is invalid or no longer available. Ask the sender to invite this email again." | `resolveInviteEntryState` returns `kind: "invalid"` |
| Expired invite | "Invite expired. Ask the sender to send a new invite for this email." | Token or invitation past `expires_at` |
| Revoked invite | "This invite was revoked. Ask the sender for a new link." | Token or invitation `revoked_at` is set |
| Already used | "You already have access" with "Open project" link | Token `used_at` is set, matching user |
| Bridge cookie missing | Shows "invalid" banner on workshop | Cookie lost between redirects |
| Bridge cookie expired | Shows "invalid" banner | >30 minutes since bridge creation |
| HMAC mismatch | Shows "invalid" banner | Pepper changed or cookie tampered |
| Wrong account after bridge | "This invite is for [email]" banner | RPC returns `wrong_account` |
| Config disabled mid-flow | `continue` route catches error → redirects back to `/invite/[token]` | `createPendingInviteBridge` throws |

### UX Issues

1. **4-redirect dance is fragile.** Any step can break: cookie not set due to SameSite, cookie lost due to redirect clearing, HMAC fails if server restarts with different pepper, etc.

2. **No progress indication during the redirect chain.** The user sees flashing pages with no spinner or "Processing your invite..." indicator.

3. **If bridge cookie is lost, the user is silently stuck.** They land on `/workshop` with no banner, no project access, and no explanation. The invite was technically already accepted by the RPC at step 10, so a retry shows "already_used" — but they have no project_members row because the RPC failed.

4. **The bridge cookie is server-readable only (HttpOnly).** The client can't check if the bridge exists or show a loading state.

5. **The login page doesn't show invite context.** The user goes to `/login` with no indication they're in the middle of accepting an invite. If they get distracted and close the tab, the bridge cookie expires in 30 minutes.

6. **The `resolvePostAuthDestination` hardcodes `/workshop` regardless of `next`.** Line 8 of `account-setup.ts`: `void requestedNext; return DEFAULT_AUTH_DESTINATION;` — so even if the bridge cookie flow passed `?next=/workshop/projects/xxx`, the callback ignores it.

---

## User Journey 3: Invitee — Already Signed In, Matching Email

### Happy Path (Intended Design)

```
1. Invitee clicks email link (already signed into Archestimator)
2. GoTrue verifies → redirected to /invite/<rawToken>
3. Invite page detects signed-in user, shows "Accept invite" button
4. Clicks "Accept invite" → /invite/<token>/accept
5. accept route calls accept_collaboration_invitation RPC
6. RPC: JWT email matches invitation email → inserts project_members → returns "accepted"
7. Redirected to project page (/workshop/projects/<id>)
```

### Surface Map

| Step | Component/Route | File |
|------|----------------|------|
| Invite page (signed-in) | `InviteEntryPage` → `InvitePreview` with `signedIn={true}` | `src/app/invite/[token]/page.tsx:149-161` |
| Accept route | `acceptInvite()` | `src/app/invite/[token]/accept/route.ts` |
| RPC | `accept_collaboration_invitation()` | DB function |
| Destination | Project page or estimate sheet | Redirect logic in accept route |

### UX Issues

1. **Accepts both GET and POST requests.** The accept route handles both methods (line 29-35 of `accept/route.ts`). The "Accept invite" link on the page is an `<a>` tag (GET), not a `<form>` with POST. This means a browser pre-fetch or accidental click could trigger acceptance.

2. **No confirmation step before accepting.** One click and the user is added. There's no "Are you sure?" or "Accept as [role]?" confirmation.

3. **No success message.** After acceptance, the user is silently redirected to the project. No "You've been added to [project] as [role]" banner or toast.

---

## User Journey 4: Invitee — Signed In, Wrong Account

### Path

```
1. Invitee clicks email link (signed into Archestimator with different email)
2. GoTrue verifies → redirected to /invite/<rawToken>
3. resolveInviteEntryState detects currentEmail !== invitedEmail
4. Returns kind: "wrong-account"
5. Invite page shows: "This invite is for another account"
   "Sign out and continue with [invited email] to accept this invite."
6. Clicks "Sign out and continue" → /invite/<token>/sign-out
7. Sign-out route: supabase.auth.signOut() → redirects back to /invite/<token>
8. Now a signed-out user → sees signed-out preview with "Continue to Archestimator"
9. Proceeds through Journey 2
```

### UX Issues

1. **Signing out is destructive in a multi-tab context.** The user may have other work open. `supabase.auth.signOut()` signs them out everywhere.

2. **The "wrong account" page doesn't show which account they're currently signed in as.** It only shows which email the invite is for. Helpful for context: "You're currently signed in as [current email], but this invite is for [invited email]."

---

## User Journey 5: Existing User — No Email Sent (Direct Grant)

### Path

```
1. Manager enters email of someone who already has a profiles row
2. Clicks "Send invite"
3. Server action: profiles query finds the user → direct grant into project_members
4. No email sent, no notification
5. Manager sees: "Existing user added. Copy invite link to let them confirm access."
6. If invite entry is enabled: token is created, manager can copy invite link
7. If invite entry is disabled: invitePath is null, "Copy invite link" shows "Invite links are disabled."
```

### UX Issues

1. **The existing user gets no notification.** No email, no in-app notification, no badge. They only discover they've been added when they next visit the project.

2. **The "Copy invite link" path is confusing.** The manager has to manually copy a link and send it through another channel (Slack, DM, etc.).

3. **If invite entry is disabled, the manager is stuck.** They see "Invite links are disabled." with no fallback action. The user is already added to `project_members` but has no way to know.

---

## User Journey 6: Terminal Invite States

### Expired Invite

```
Manager invites → 14 days pass → invitee clicks link
→ resolve_collaboration_invitation: checks expires_at < now() → returns "expired"
→ Invite page: "Invite expired. Ask the sender to send a new invite for this email."
```

**UX issue:** No "Request new invite" button. The invitee has to contact the manager outside the app.

### Revoked Invite

```
Manager clicks "Remove" on a pending invitation → RPC sets lifecycle_state = "revoked"
→ Invitee clicks old link → page: "This invite was revoked. Ask the sender for a new link."
```

**UX issue:** Same — no in-app path to request re-invitation.

### Already Used (by same user)

```
Invitee accepted → comes back to the link later
→ resolve_collaboration_invitation: token.used_at is set → "already_used"
→ Invite page: "You already have access" with "Open project" link
→ Links to project or estimate sheet
```

**UX issue:** Good recovery path. But if `already_used` by a DIFFERENT user (someone else used the link), the page shows a generic "invalid" message, which is confusing — the link was used, just not by you.

---

## User Journey 7: The Currently Broken State (PROJECT_INVITE_ENTRY_ENABLED not set)

### What Actually Happens Right Now

```
1. Manager opens Teamspace settings, enters email, clicks "Send invite"
2. Server action: inviteProjectCollaborator()
3. isProjectInviteEntryEnabled() → false
4. inviteLink = null  (no token created, no /invite/[token] URL)
5. profiles query for the email
   a. IF user has profile → direct grant, NO email sent
      Manager sees: "Existing user added. Copy invite link to let them confirm access."
      "Copy invite link" button shows "Invite links are disabled."
      Result: User is added but never notified. ❌

   b. IF user has no profile → calls sendSupabaseInviteEmail()
      admin.auth.admin.inviteUserByEmail(email, { redirectTo: fallback project URL })
      GoTrue creates user in auth.users, attempts to send email
      IF Supabase email not configured → API succeeds silently, no email sent ❌
      IF Supabase email IS configured → email sent with link to bare project URL
      Invitee clicks link → GoTrue verifies → redirects to /workshop/projects/<id>
      User has no project_members row (auto-grant neutered) ❌
      User sees the project page with no access ❌
      Manager sees: "Invite email sent." (false positive) ❌
```

### The Triple Failure (Most Likely Scenario)

1. **Supabase email not configured** → no email sent
2. **Invite entry disabled** → no `/invite/[token]` acceptance path
3. **Auto-grant neutered** → no fallback acceptance mechanism

Result: **Invite is completely non-functional.** No email, no acceptance mechanism, no fallback. The manager sees a success message that's false.

---

## Cross-Surface Map: Every Touchpoint

### Inviter Side

| Surface | File | States |
|---------|------|--------|
| Project page header rail | `ProjectTeamspaceHeader.tsx:218-237` | Normal |
| Teamspace settings modal | `ProjectTeamspaceHeader.tsx:240-541` | Open |
| Modal sidebar (collaborator list) | lines 252-271 | Shows names, emails, online status |
| Project access section | lines 273-358 | Invite form, collaborator roles, pending invites |
| Estimate sheet access | lines 400-498 | Per-sheet invite forms, access mode toggle |
| Private link section | lines 500-525 | Read-only path, copy button |
| Realtime section | lines 527-537 | Transport info |
| Status banner | lines 539-545 | Success/error messages |

### Invitee Side

| Surface | File | States |
|---------|------|--------|
| Email (GoTrue) | Supabase-managed | Sent (or silently not sent) |
| Invite landing page | `src/app/invite/[token]/page.tsx` | Active preview, expired, revoked, already-used, invalid, wrong-account |
| Continue route | `src/app/invite/[token]/continue/route.ts` | Sets bridge cookie, redirects to login |
| Accept route | `src/app/invite/[token]/accept/route.ts` | Calls RPC, redirects to project |
| Sign-out route | `src/app/invite/[token]/sign-out/route.ts` | Signs out, redirects back to invite |
| Login page | `/login` | No invite context shown |
| Auth callback | `src/app/auth/callback/route.ts` | No invite awareness |
| Workshop page | `src/app/workshop/page.tsx` | Detects bridge cookie, redirects |
| Pending-invite route | `src/app/workshop/pending-invite/route.ts` | Accepts via bridge, clears cookie |
| Workshop banner | `WorkshopHomebaseClient` | "Project added", "Sheet shared", "This invite is for...", "Invite unavailable" |

---

## UX Audit Summary: Critical Friction Points

| # | Friction | Severity | Location |
|---|---------|----------|----------|
| 1 | "Invite email sent." is a false positive when Supabase email isn't configured | **Critical** | `actions.ts:449` — `return { ok: true, message: "Invite email sent." }` |
| 2 | No in-app notification when existing user is direct-granted | **High** | `actions.ts:416-424` — direct grant branch |
| 3 | "Invite links are disabled." with no guidance | **High** | `actions.ts:550` — `copyProjectInviteLink` |
| 4 | 4-redirect bridge dance with no progress indication | **High** | Journey 2, steps 5-12 |
| 5 | GET-based invite acceptance (browser pre-fetch risk) | **Medium** | `accept/route.ts` — handles GET |
| 6 | No confirmation step before accepting invite | **Medium** | `accept/route.ts` — immediate RPC call |
| 7 | Wrong-account page doesn't show current email | **Medium** | `page.tsx:192-200` — wrong-account UI |
| 8 | No "Request re-invite" for expired/revoked states | **Medium** | `page.tsx` — terminal states |
| 9 | No loading state on "Send invite" button | **Low** | `ProjectTeamspaceHeader.tsx:318-325` |
| 10 | No success message after invite acceptance | **Low** | `accept/route.ts` — silent redirect |
| 11 | Sign-out in wrong-account flow is app-wide | **Low** | `sign-out/route.ts` |
| 12 | Login page doesn't show invite context | **Low** | `/login` route |
