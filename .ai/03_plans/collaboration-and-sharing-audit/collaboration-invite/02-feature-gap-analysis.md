# 02 — Feature Gap Analysis: Collaboration Invite System

**Date:** 2026-05-30
**Purpose:** Ranked inventory of every gap, missing state, broken path, and deficiency. Severity: Critical (broken), High (fails silently or misleading, or security-critical), Medium (significantly degrades UX), Low (polish).

---

## Critical — System Non-Functional

| # | Gap | Severity | Evidence | Fix Complexity |
|---|-----|----------|----------|-----------------|
| 1 | **Emails not delivered** — `admin.inviteUserByEmail()` API call succeeds even when Supabase email provider is not configured | **Critical** | `sendSupabaseInviteEmail()` (actions.ts:349) only catches API errors, not delivery failures. SMTP block is fully commented out in `config.toml`. Remote project email config state unknown. | Config-only if Supabase dashboard email is configured. Otherwise: configure SMTP provider in Supabase dashboard. |
| 2 | **No invite acceptance path exists without `PROJECT_INVITE_ENTRY_ENABLED=true`** — the auto-grant trigger was deliberately neutered; the `/invite/[token]` route is the only acceptance path and it's disabled | **Critical** | `apply_pending_collaboration_invitations` is a no-op (migration `20260527115342` lines 119-130). Both env vars missing from `.env.local`. | Add two env vars. |
| 3 | **No fallback when both email delivery and invite entry fail** — the system has no mechanism for granting access outside these two paths | **Critical** | `inviteProjectCollaborator()` (actions.ts:369) has exactly two branches: direct grant (if profile exists) or email (if not). No third path. | Add a "share invite link manually" path that works without email. |

---

## High — Silently Misleading, Security-Critical, or Completely Invisible

| # | Gap | Severity | Evidence | Fix Complexity |
|---|-----|----------|----------|-----------------|
| 4 | **No rate limiting on invite endpoints** — token resolution, acceptance, and bridge creation have zero rate limiting | **High** | `src/app/invite/[token]/page.tsx` resolves token with no rate check. `accept/route.ts` has no rate limiting. Any attacker can brute-force tokens or flood the system. | Medium — implement durable rate limiting using DB table |
| 5 | **No rate limiting on invite creation/resend** — manager-side actions unthrottled | **High** | `inviteProjectCollaborator()` and `copyProjectInviteLink()` have no rate limits. Repeated invites to the same email are allowed without cooldown. | Medium — per-user+project rate limits |
| 6 | **GET mutation risk in accept route** — both GET and POST trigger RPC call | **High** | `src/app/invite/[token]/accept/route.ts:25-35` — both `export async function POST` and `export async function GET` call `acceptInvite()`. Browser pre-fetch of `<a>` tag could trigger acceptance. | Low — make GET render confirmation only, POST-only mutation |
| 7 | **Missing audit events** — many security-relevant actions not recorded | **High** | `collaboration_audit_events` table exists but is only written by RPCs for token issuance, acceptance, wrong_account, and revocation. No audit for: email send, invite open, role change, member removal, expiry. | Medium — add audit recording to server actions |
| 8 | **"Invite email sent." is a false positive** — the server action returns this message even when no email was actually delivered | **High** | actions.ts:445 — `return { ok: true, message: "Invite email sent." }` after `sendSupabaseInviteEmail()` which only checks API errors | Change message to reflect uncertainty, or verify delivery |
| 9 | **Pending invites invisible outside Teamspaces modal** — inviter can only see pending invites inside the project detail modal, never on project cards or homebase | **High** | `readOptionalCollaborationInvitations()` only called in `getProjectCollaborationSummary()` (project detail layout). Not called by `listCurrentWorkspaceProjects()` or `getWorkshopHomebaseData()`. | Add pending-invite count to project list query and card component |
| 10 | **Invited-but-unaccepted projects invisible to invitee** — projects the user was invited to but hasn't accepted don't appear anywhere in the UI | **High** | `listCurrentWorkspaceProjects()` queries `project_members` and `estimate_sheet_members` only — never `collaboration_invitations`. Invitee has zero visibility until they find and click the email link. | Add invitation query to project list, render as "Pending invite" cards with invitation-id-based accept path (raw tokens not available from DB). |
| 11 | **Existing user gets no notification when added** — direct-grant path silently adds user to `project_members` with zero notification | **High** | actions.ts:416-424 — direct grant branch; no email, no in-app notification, no badge | Add in-app notification or at minimum a workshop banner on next visit |
| 12 | **`last_opened_at` exists but is invisible** — the RPC sets it when the invitee opens the link, but the app never reads or displays it | **High** | DB columns exist on both `collaboration_invitations` and `collaboration_invitation_tokens`. Set by `resolve_collaboration_invitation`. Not in any SELECT query or UI component. | Add `last_opened_at` to `readOptionalCollaborationInvitations()` SELECT and `CollaborationInvitationSummary` type |
| 13 | **"Copy invite link" fails silently when invite entry is disabled** — returns "Invite links are disabled." with no guidance | **High** | `copyProjectInviteLink()` (actions.ts:549) — returns `{ ok: false, message: "Invite links are disabled." }` — no alternative action offered | Show guidance: "Copy the project link instead" or "Share the project URL directly" |

---

## Medium — Significantly Degrades UX

| # | Gap | Severity | Evidence | Fix Complexity |
|---|-----|----------|----------|-----------------|
| 14 | **Bridge cookie signed but `continue` route not rate-limited** — could be flooded | **Medium** | `continue/route.ts` creates HMAC-signed cookie but has no rate limit per IP or token | Low — add rate limiting to continue route |
| 15 | **PENDING INVITE CARDS REQUIRE NEW ACCEPT MECHANISM** — raw tokens are stored as hashes, not retrievable for `/invite/[token]` link construction. Cards must use a new authenticated accept-by-invitation-id route instead. | **Medium** | `collaboration_invitation_tokens.token_hash` is the only stored form; raw token is destroyed after creation. Invitation cards cannot link to `/invite/[token]`. | Medium — add `POST /api/invite/:invitationId/accept` route that verifies `auth.email === invitation.email` via RPC, or issue fresh token on invitee's request. |
| 16 | **No loading state on "Send invite" button** — `isPending` disables the button but there's no spinner or "Sending..." text | **Medium** | `ProjectTeamspaceHeader.tsx:318` — `disabled={...isPending...}` — no visual feedback beyond disabled state | Add spinner or text change on isPending |
| 17 | **No confirmation before accepting an invite** — one click accepts, no "Are you sure?" or "Accept as [role]?" step | **Medium** | `accept/route.ts` — handles both GET and POST, immediate RPC call with no confirmation UI | Add confirmation middleware or client-side confirm step |
| 18 | **4-redirect bridge dance has no progress indication** — signed-out invitees see flashing pages with no spinner | **Medium** | Journey: continue → login → workshop → pending-invite → workshop. Four server redirects. | Show "Processing your invite..." loading state during the dance |
| 19 | **Wrong-account page doesn't show current email** — only shows invited email, not "You're signed in as X" | **Medium** | `page.tsx:192-200` — shows `state.row.invited_email` but not `currentEmail` | Add "You are currently signed in as {currentEmail}" |
| 20 | **Sign-out in wrong-account flow is app-wide destructive** — signs user out of all tabs/sessions | **Medium** | `sign-out/route.ts` — calls `supabase.auth.signOut()` globally | Consider session-scoped sign-out or warning |
| 21 | **No "Request re-invite" for expired/revoked states** — invitee has no in-app path to contact the sender | **Medium** | `page.tsx` — terminal states show copy with no action | Add "Contact sender" or "Request new invite" path |
| 22 | **No success message after invite acceptance** — silent redirect to project | **Medium** | `accept/route.ts` — immediate redirect after RPC success, no banner or toast | Pass success query param or set flash message |
| 23 | **No duplicate-email warning** — `upsertInvitation()` re-activates old invites instead of warning | **Medium** | actions.ts:259 — upsert on duplicate key re-states the old invitation as `lifecycle_state: "pending"` — manager doesn't know they already invited this email | Detect re-activation and show "Already invited this email. Invite extended to {date}." |

---

## Low — Polish & Edge Cases

| # | Gap | Severity | Evidence | Fix Complexity |
|---|-----|----------|----------|-----------------|
| 24 | **No "resend" on pending invitations** — only "Copy invite link" is available | **Low** | `ProjectTeamspaceHeader.tsx:385-413` — pending invites show email + role + "Copy invite link" — no resend button | Add "Resend" button that calls `sendSupabaseInviteEmail` again |
| 25 | **No pending-invite badge on main sidebar** — no notification dot/badge on Projects nav item | **Low** | `MainSidebar.tsx` — static nav links, no badges | Add pending-invite count badge |
| 26 | **Invite email input doesn't clear on error** — only clears on success | **Low** | `ProjectTeamspaceHeader.tsx:153` — `if (result.ok) setInviteEmail("")` — no clear on failure | Always clear on submit, restore on error via ref |
| 27 | **No removal confirmation dialog** — trash icon immediately removes collaborator | **Low** | `ProjectTeamspaceHeader.tsx` — `onClick={() => runAccessAction(() => removeProjectCollaborator({...}))}` — no confirmation | Add confirmation modal before removal |
| 28 | **No removal notification to removed user** — project silently disappears from their list | **Low** | `removeProjectCollaborator()` — deletes `project_members` row, calls `revalidatePath` — no notification | Add banner on next workshop visit or email |
| 29 | **Favorites not cleaned up on removal** — removed user's project favorites persist | **Low** | `removeProjectCollaborator()` — does not touch `project_favorites` table | Delete favorite row on removal |
| 30 | **Workshop homebase favorites show no collaboration context** — owned vs shared projects look identical | **Low** | `WorkshopHomebaseClient.tsx` — `ProjectList` uses `WorkshopProjectSummary` which has no `accessKind` or role fields | Add collaboration metadata to homebase query |
| 31 | **No invite expiry warning to inviter** — invitations silently expire after 14 days | **Low** | `collaboration_invitations.expires_at` — no warning before expiry, no notification after | Show "Expires in X days" on pending invites, "Expired" badge after |

---

## Gap Summary by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security & rate limiting | 0 | 4 | 1 | 0 | 5 |
| Email delivery & messaging | 1 | 2 | 0 | 0 | 3 |
| Visibility (inviter) | 0 | 2 | 0 | 3 | 5 |
| Visibility (invitee) | 0 | 2 | 1 | 1 | 4 |
| Invite acceptance flow | 2 | 1 | 5 | 0 | 8 |
| Removal flow | 0 | 0 | 0 | 3 | 3 |
| Config/documentation | 0 | 1 | 0 | 0 | 1 |
| Polish/fit-and-finish | 0 | 0 | 3 | 1 | 4 |
| **Total** | **3** | **12** | **10** | **8** | **33** |

**Note:** Gap 15 (pending-invite cards need new accept mechanism) is a design feasibility gap — the raw invite token is not available for link construction, so card-based acceptance requires a new authenticated `invitation_id` route or fresh-token issuance. See `05-security-threat-model-and-hardening.md` and `07-implementation-acceptance-criteria.md` for the chosen approach.
