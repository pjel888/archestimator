# UX Paths & Happy Paths: Shared Link (View-Only Client Publication)

**Date:** 2026-05-30
**Purpose:** Map every user journey through the Shared Link feature — manager publishing, recipient viewing, commenting, deciding, and receiving email notifications.

---

## User Journey 1: Manager Creates a Shared Link

### Happy Path

```
1. Manager is on a project page, sees "Shared link" button in the header rail
2. Clicks "Shared link" → modal opens with 5 tabs: Link | Sheets | Access | Recipients | Activity
3. Default tab "Sheets": selects which estimate sheets to include
   - Select all / Clear bulk actions
   - Per-sheet checkboxes with sheet code + name
   - Counter: "2 / 3 selected"
4. Switches to "Access" tab (optional):
   - Checks "Require password" → enters a password
5. Switches to "Link" tab → clicks "Generate shared link"
6. Link appears: readonly input with full URL
   - "Copy" button → copies to clipboard
   - "Open" button → opens in new tab
7. Sidebar shows status: "Link live", open count, published date, expiry
8. Optional: "New link" → rotates token (old link stops working)
9. Optional: "Turn off link" → revokes publication

States:
- "Link off" (unpublished) → only "Generate" button active
- "Link live" (published) → "Update shared page", "New link", "Turn off link"
- "Expired" (past expires_at) → "Generate" to create new
- "Turned off" (revoked) → "Generate" to create new
```

### Surface Map

| Step | Component | File |
|------|-----------|------|
| Header button | `ProjectPublicationHeader` | `src/components/workshop/ProjectPublicationHeader.tsx:179-188` |
| Modal shell | `Modal` with sidebar + content grid | lines 195-203 |
| Sidebar stats | Status, open count, latest open, published, expires | lines 206-228 |
| Tab navigation | `WorkshopTreeTabs` (Link/Sheets/Access/Recipients/Activity) | lines 237-246 |
| Sheets picker | `SheetPickerList` component | lines 440-547 |
| Access tab | Password checkbox + input | lines 300-346 |
| Link tab | URL display + Copy/Open buttons | lines 248-298 |
| Link controls | Generate/Update/New Link/Turn Off | lines 356-425 |
| Status message | Action result banner | lines 427-432 |

### Manager Errors & States

| State | What they see | Trigger |
|-------|---------------|---------|
| No project | "Shared link" disabled | Project ID missing |
| Not authorized | "Only project owners and admins can publish shared links." | User is editor/viewer |
| No sheets selected | "Generate" disabled, "0 estimates selected" | All sheets unchecked |
| Password set but empty | "Generate" disabled | "Require password" checked, input empty |
| No sheets exist | Empty state: "No estimate sheets in this project." | Project has zero estimates |
| Invalid sheet IDs | Server filters non-UUID IDs silently | Malformed input |
| Resend API down | Email failures logged non-fatally; link still created | Network/API error |
| Previous link exists | Old link revoked automatically, new one created | Normal republish flow |

### UX Gaps

1. **No confirmation before "Turn off link."** One click immediately revokes with no "Are you sure? This link will stop working for all recipients."
2. **No confirmation before "New link" (rotate).** Old link breaks immediately.
3. **Password field shows no strength indicator.** Industry standard: show strength bar for client-facing passwords.
4. **"Update shared page" silently overwrites the snapshot.** No version history visible to the manager. No "Changes since last publish" diff.
5. **No preview before publishing.** The manager can't see what recipients will see without opening the link in a new tab.
6. **Estimate sheet selection resets on modal reopen.** If the manager closes and reopens the modal, the sheet selection resets to all sheets.

---

## User Journey 2: Recipient Views a Shared Link (Open Access)

### Happy Path

```
1. Recipient receives email with "View Project Estimate" button
2. Clicks → opens /share/<token> in browser
3. Page loads:
   - Archestimator logo + "View-only" badge in header
   - Project name, code, client, location
   - Hero image (if available)
   - Tab bar: one tab per estimate sheet
   - Each sheet: Tree View (hierarchy) or Grid Preview (flat table)
   - Cost donut chart per sheet (discipline-based aggregation)
   - Floating navigation tree (desktop lg+ only)

4. Recipient browses estimates:
   - Click estimate tabs to switch sheets
   - Toggle Tree View / Grid Preview per sheet
   - Hover/focus donut slices for cost breakdown
   - Scroll through rows

5. No login required. No account needed.
```

### States

| State | What recipient sees | Trigger |
|-------|-------------------|---------|
| Active link | Full estimate view with all tabs/sheets | Token valid, publication published |
| Password protected | Password gate form: "Enter publication password" | Publication has password_hash |
| Wrong password | "Password is invalid." | Incorrect password submitted |
| Locked out | "Too many attempts. Please try again later." | 5 failed password attempts |
| Expired link | 404 page | expires_at < now |
| Revoked link | 404 page | Manager turned off link |
| Invalid token | 404 page | Token doesn't match any publication |
| No estimates | Empty tab bar, "No estimate sheets" | Snapshot has zero estimates |

### UX Gaps

1. **No loading state for large snapshots.** The page is server-rendered so this is mitigated, but if rehydration takes time there's no skeleton.
2. **No search/filter for estimate rows.** Large estimates are hard to navigate without search.
3. **No sortable columns in Grid Preview.** Rows are in fixed order from the snapshot.
4. **No "scroll to top" or "back to tabs" affordance** when scrolling through a long estimate.
5. **No print stylesheet.** Browser print of the share page is unstyled.
6. **No dark mode.** Always white background.
7. **Mobile: Tree View can be cramped.** The floating nav tree is desktop-only, which is correct, but mobile tree navigation is limited.

---

## User Journey 3: Recipient Views a Shared Link (Password Protected)

### Happy Path

```
1. Recipient opens link → sees password gate instead of estimates
2. Form: "Enter publication password" with password input + "Unlock" button
3. CSRF token generated client-side, sent with request
4. POST /api/share/<token>/password → server verifies against scrypt hash
5. On success: 204 No Content → page reloads → access cookie set → shows estimates
6. On failure: "Password is invalid." (401) or "Unable to unlock publication." (500)
7. After 5 failures: "Too many attempts. Please try again later." → input disabled, 15-min lockout
```

### Security

| Layer | Detail |
|-------|--------|
| CSRF | Client-generated token in cookie + custom header |
| Rate limiting | Progressive delay (1s/2s/4s/8s...) per IP+token |
| Lockout | 5 attempts → 15-min hard lockout |
| Cookie | HttpOnly, SameSite=Lax, signed HMAC with expiry |
| Password storage | scrypt hash in DB (not plaintext) |

### UX Gaps

1. **No "forgot password" or "contact sender" link** on the password gate. If the recipient doesn't know the password, they have no recourse.
2. **No password hint.** Some systems allow the publisher to set a hint like "Our project code."
3. **Lockout message doesn't say how long.** "Too many attempts. Please try again later." should say "Please try again in 15 minutes."

---

## User Journey 4: Recipient Comments & Decides (Session-Enabled)

### Happy Path

```
1. Manager adds recipient email → sends email with ?recipient=<token> link
2. Recipient opens link with ?recipient= parameter
3. Session cookie set → comment/decision sections appear
4. Right column shows:
   ┌─ Decision ────────────────────────┐
   │ [Accept] [Decline] [Request Rev.]  │
   │ Once submitted, locks to badge     │
   └────────────────────────────────────┘
   ┌─ Comments ────────────────────────┐
   │ [Existing comments list]           │
   │ [Text input + character counter]   │
   │ [Post comment button]              │
   └────────────────────────────────────┘

5. Recipient submits a decision → confirmation modal → POST → locks
6. Recipient posts comments → appears immediately (optimistic) → server confirms
```

### Decision States

| State | UI | Behavior |
|-------|----|---------|
| No session | Decision hidden | `useSharedLinkSession().isValid === false` |
| Not yet decided | Three buttons visible | Accept/Decline/Request Revision |
| Confirming | Modal with note field + Confirm/Cancel | "You are about to accept this estimate" |
| Submitted | Read-only badge: "Accepted" / "Declined" / "Revision Requested" | Comments still usable |
| 409 duplicate | "Decision already submitted." | If user revisits after submitting |

### Comment States

| State | UI | Behavior |
|-------|----|---------|
| No session | Comments hidden | `useSharedLinkSession().isValid === false` |
| Idle | Input + Post button + char counter (1000 max) | Draft in local state |
| Posting | Button shows loading, input disabled | Optimistic comment appears |
| Posted | Comment appears in list | Fetched from server on next load |
| Rate limited | "Too many comments. Please slow down." | 5/min, 20/hour |
| Offline | Queued in sessionStorage, retry on reconnect | 3 retry attempts (immediate, +2s, +5s) |
| Circuit open | "Service temporarily unavailable" | >50% errors over 5-min window |

### UX Gaps

1. **No comment threading/replies.** Comments are flat — can't reply to a specific comment.
2. **No comment editing or deletion.** Once posted, a comment is permanent.
3. **No typing indicator.** No realtime feedback that others are typing.
4. **No decision change after submission.** Once accepted/declined, it's locked forever. No "undo" or "change my decision."
5. **No email notification to recipient after decision.** Only the owner gets a digest. The recipient gets no confirmation email.
6. **No attachment support in comments.** Can't attach screenshots or files to comments.
7. **No @mention support.** Can't tag specific people in comments.
8. **Decision note is hidden after submission.** If the recipient writes a note with their decision, it's stored but not clearly displayed after submission.

---

## User Journey 5: Manager Views Recipient Activity

### Happy Path

```
1. Manager opens Shared Link modal → "Activity" tab
2. Sees timeline of:
   - Comments from recipients (with email, timestamp)
   - Decisions (Accepted/Declined/Revision Requested with note)
   - Events (opens, password attempts)
   - Internal-only comments visible to manager
3. "Load more" for pagination
4. Real-time updates (Realtime subscription)
```

### UX Gaps

1. **No "mark as seen" for new activity.** The activity feed shows all items but there's no read/unread state.
2. **No badge/notification outside the modal.** The manager only knows about new activity if they open the modal.
3. **No email digest for non-rate-limited periods.** The digest is hardcoded to 1/15min — if 10 comments come in 15 minutes, the manager gets 1 email.
4. **No reply-to-comment from the Activity tab.** The manager can see comments but can't respond inline — they'd need to use the collaboration invite system or external communication.

---

## User Journey 6: Recipient Email Flow

### Email Sent When

| Trigger | Email type | Recipient |
|---------|-----------|-----------|
| Manager adds recipient | Invite email: "Project Estimate: {name} shared by {sender}" + CTA button | External recipient |
| Recipient posts comment | Activity digest: "New activity on your shared project link" | Owner (hardcoded to owner@archestimator.test) |
| Recipient submits decision | Activity digest: same format | Owner |

### Email Template (Recipient Invite)

```
Subject: Project Estimate: Lewis Residence shared by Philip Lewis

Hello,

Philip Lewis has shared a view-only estimate for the project "Lewis Residence" with you.

You can view the estimate using the following link:
http://localhost:3000/share/abc123?recipient=xyz789

If you have any questions, please contact Philip Lewis directly.

Best regards,
The Archestimator Team
```

**HTML version:** Dark "View Project Estimate" CTA button, system-ui font stack, project name, sender info.

### Email Delivery Status

| Status | Meaning | Set when |
|--------|---------|---------|
| `pending` | Not yet sent or send attempted | Initial insert |
| `sent` | Resend API returned success | After `sendEmail()` returns ok |
| `bounced` | (reserved) Email bounced | Not yet implemented |
| `opened` | (reserved) Recipient opened | Not yet implemented |
| `responded` | (reserved) Recipient commented/decided | Not yet implemented |

### UX Gaps

1. **No sender name in email.** The template says "A team member" — should use the manager's actual name.
2. **No unsubscribe link.** CAN-SPAM/GDPR compliance gap.
3. **No email preview in the manager UI.** The manager can't preview what the recipient will see.
4. **"Bounced" and "opened" statuses are never set.** Delivery tracking is incomplete.
5. **No resend capability.** If an email bounces or a recipient didn't receive it, there's no "Resend" button.
6. **No CC/BCC for the sender.** The manager doesn't get a copy of the invite email.
