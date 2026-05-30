# Feature Analysis: Shared Link (View-Only Client Publication)

**Date:** 2026-05-30
**Purpose:** Technical deep-dive into the "Shared link" feature (the one that produces URLs like `/share/vTePfd...`). Covers architecture, data flow, security, email delivery, and all failure modes.

---

## Architecture Overview

The Shared Link is a **snapshot-based, view-only, optionally password-protected public page** that a project manager publishes for external clients/stakeholders. It is fundamentally different from the collaboration invite system — this is for public-facing view-only sharing, not for granting authenticated workspace access.

### Core Concept

```
Manager clicks "Generate shared link"
  → Server builds immutable JSON snapshot of project + selected estimates + all rows
  → Creates a random 32-byte token (base64url), hashes + encrypts it
  → Stores snapshot + hashed token + optional password hash in project_publications
  → Returns /share/<token> URL

External recipient opens /share/<token>
  → Server resolves token → loads snapshot → renders public page
  → If password-protected: shows password gate
  → If recipient has a ?recipient= token: sets session cookie, enables comments/decisions
  → Recipient can: view estimates, post comments, submit decision (Accept/Decline/Request Revision)
```

---

## Full Data Flow

### Publish Flow (Manager Side)

```
1. UI: ProjectPublicationHeader "Shared link" button → modal opens
2. Modal tabs: Link | Sheets | Access | Recipients | Activity
3. Manager selects estimate sheets → clicks "Generate shared link"
4. Server action: createProjectPublication()
   ├─ assertProjectPublicationManager() — RBAC: owner/admin only
   ├─ buildSnapshotForProject() — reads estimates + rows + nodes from DB
   │   └─ Immutable JSON snapshot captured at publish time
   ├─ Creates random token → hashPublicationToken(token, secret) → stores hash
   ├─ encryptPublicationToken(token, secret) → stores encrypted (for regenerating clientLinkPath)
   ├─ Optional: hashPublicationPassword(password) → stores scrypt hash
   ├─ Revokes previous publication (if any)
   └─ Inserts new publication row
5. Client receives clientLinkPath = "/share/<token>"
6. Shows readonly input with the URL, Copy/Open buttons
```

### View Flow (Recipient Side)

```
1. Recipient opens /share/<token>
2. Server: resolveProjectPublicationAccessByToken(token)
   ├─ Hash incoming token → query project_publications by token_hash
   ├─ Check status = "published", not revoked, not expired
   └─ Returns { publicationId, passwordRequired, snapshotVersion }
3. If passwordRequired and no valid access cookie → show password gate
4. If password gate: POST /api/share/<token>/password
   ├─ Verifies password against stored scrypt hash
   ├─ Sets signed HttpOnly publication-access cookie
   └─ Redirects to reload
5. Server: resolveProjectPublicationSnapshotByToken(token) → loads full snapshot
6. recordProjectPublicationEvent() → increments open_count via RPC
7. Renders ProjectPublicationView:
   ├─ Header: Archestimator logo + "View-only" badge
   ├─ Project name, code, client, location
   ├─ Hero image (if available)
   ├─ Per-estimate tabs with Tree View / Grid Preview sub-tabs
   ├─ Cost donut charts per sheet
   └─ Right column: Decision + Comments (gated on recipient session)
```

### Recipient Session Flow (Comments & Decisions)

```
1. Manager adds recipient email → generates per-recipient token
   ├─ addSharedLinkRecipients() → inserts into shared_link_recipients with recipient_token_hash
   └─ Sends email via Resend with link: /share/<token>?recipient=<rawToken>
2. Recipient opens link with ?recipient= param
3. Server: verifySharedLinkRecipientToken(token, recipientToken)
   ├─ Hash recipient token → query shared_link_recipients
   └─ Returns { publicationId, snapshotVersion, recipientId }
4. Server sets shared_link_session_[token] HttpOnly cookie (signed, 24h expiry)
5. Server sets shared_link_session_*_ok companion flag cookie (non-HttpOnly, for client hook)
6. useSharedLinkSession() hook reads companion cookie → isValid = true
7. SharePageDecision and SharePageComments render (gated on isValid)
8. POST /api/share/<token>/comment
   ├─ Same-origin + CSRF check
   ├─ Validates session cookie (crypto verify)
   ├─ Rate limit: 5/min, 20/hour per recipient
   ├─ Sanitize + truncate (strip HTML, 1000 char limit)
   ├─ Insert into shared_link_comments
   └─ Best-effort owner digest email (rate-limited 1/15min)
9. POST /api/share/<token>/decision
   ├─ Same validation path
   ├─ Decision: accepted | declined | revision_requested
   ├─ Once submitted, locks (409 on duplicate)
   └─ Best-effort owner digest email
```

---

## File Inventory

### Server Actions & API Routes

| File | Role |
|------|------|
| `src/lib/publication/actions.ts` | Server actions: create, republish, rotate, revoke publication; add/remove recipients; load activity; owner digest triggers |
| `src/lib/publication/public-repository.ts` | DB queries: resolve access, resolve snapshot, record events, insert comments/responses |
| `src/lib/publication/security.ts` | Crypto: token generation, hashing, encryption, password hashing, cookie signing |
| `src/lib/publication/snapshot.ts` | Snapshot builder: aggregates project + estimates + rows + nodes into immutable JSON |
| `src/lib/publication/types.ts` | Types: ProjectPublicationSummary, PublicationSnapshot, etc. |
| `src/app/share/[token]/page.tsx` | Public share page (RSC): resolves access, password gate, renders view |
| `src/app/api/share/[token]/route.ts` | API route: returns snapshot JSON (for potential API consumers) |
| `src/app/api/share/[token]/password/route.ts` | Password verification: validates + sets access cookie |
| `src/app/api/share/[token]/comment/route.ts` | Comment submission: session-validated, rate-limited, sanitized |
| `src/app/api/share/[token]/decision/route.ts` | Decision submission: accept/decline/revision request |
| `src/app/api/share/[token]/activity/route.ts` | Activity feed: owner-only load of comments + decisions + events |
| `src/app/api/share/[token]/events/route.ts` | Event recording |

### UI Components

| File | Role |
|------|------|
| `src/components/workshop/ProjectPublicationHeader.tsx` | Manager modal: 5-tab UI (Link, Sheets, Access, Recipients, Activity) |
| `src/components/workshop/publication/RecipientEmailComposer.tsx` | Email chip input + send/remove recipients |
| `src/components/share/SharePageTabs.tsx` | Recipient view: per-estimate tabs with Tree View / Grid Preview |
| `src/components/share/SharePageHero.tsx` | Hero cover image from project metadata |
| `src/components/share/SharePageComments.tsx` | Comment list + composer (recipient side) |
| `src/components/share/SharePageDecision.tsx` | Accept/Decline/Request Revision buttons |
| `src/components/share/SharePageSessionBanner.tsx` | Session status banner for recipients |
| `src/components/share/ShareEstimateTreePanel.tsx` | Floating navigation tree |
| `src/components/share/ShareEstimateTreeView.tsx` | Tree view of estimate hierarchy |
| `src/components/share/SharedLinkActivityFeed.tsx` | Owner activity feed in manager modal |
| `src/components/share/ProjectPublicationPasswordForm.tsx` | Password gate form |
| `src/hooks/use-shared-link-session.ts` | Client hook: reads companion cookie for interactive features |

### Database Tables (from migration)

| Table | Purpose |
|-------|---------|
| `project_publications` | Core publication: token_hash, encrypted_token, snapshot_json, password_hash, status, open_count |
| `shared_link_recipients` | Per-recipient tracking: email, recipient_token_hash, delivery_status, invited_by |
| `shared_link_comments` | Recipient comments: body, is_internal, author_email |
| `shared_link_responses` | Recipient decisions: decision, note |
| `shared_link_events` | Event log: open, password_attempt, etc. |

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| URL token | 32 random bytes → base64url → unguessable (256-bit entropy) |
| Token storage | HMAC-SHA256 hash stored in DB, AES-256-GCM encrypted version stored for recovery |
| Password protection | Optional scrypt hash; verified via signed HttpOnly cookie with expiry |
| Comment/decision auth | Signed shared_link_session cookie (HMAC + expiry), requires ?recipient= token |
| Same-origin | All POSTs to /api/share/* are same-origin gated |
| CSRF | Password form generates client-side CSRF token; comment/decision routes check Origin header |
| Rate limiting | Comments: 5/min + 20/hour per recipient (in-memory LRU) |
| Password lockout | 5 failed attempts → 15-min progressive lockout (in-memory, per IP+token) |
| Sanitization | Comments: strip HTML tags + script/style + truncate to 1000 chars |
| CSP | Enforced Content-Security-Policy on /share/:path* |
| Security headers | X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy on share API |
| No tracking | GA4/Clarity scripts excluded from /share/[token] routes |
| No-store cache | All share API responses carry Cache-Control: no-store |

---

## Email Integration (Resend)

The shared link uses **Resend** (not Supabase Auth email) for recipient notifications.

| Variable | Where | Status |
|----------|-------|--------|
| `RESEND_API_KEY` | `.env.local` | ✅ Set (`re_3fcXAg32...`) |
| `RESEND_FROM` | `.env.local` | ❌ Not set (falls back to "Archestimator <no-reply@archestimator.com>") |

**Email sent when:**
- Manager adds a recipient in the "Recipients" tab → `addSharedLinkRecipients()` → `sendEmail()` per recipient
- A recipient posts a comment or decision → `maybeTriggerSharedLinkActivityDigest()` → rate-limited owner digest (1/15min)

**Graceful degradation:** Email failures are non-fatal. If Resend is down, the recipient is still added to the DB with `delivery_status: "pending"` and the link is created successfully. Circuit breaker prevents cascading failures after >50% error rate.

**No email sent when:**
- Recipient already has a `shared_link_recipients` row for that publication (duplicate → "already invited")
- No recipients are added (link works without email — manager can share the URL directly)

---

## Known Issues & Gaps

### 1. Recipient Email Delivery Not Verified
The app marks `delivery_status: "sent"` optimistically after the Resend API call returns success. Actual delivery (inbox vs spam, bounce) is not tracked. Resend webhooks are not configured.

### 2. Owner Digest Uses Hardcoded Email
```typescript
const res = await sendEmail({ to: "owner@archestimator.test", ... });
```
The owner email is a placeholder. It should resolve from the project's owner profile.

### 3. No Password Recovery Flow
If a manager sets a password and forgets it, there's no way to reset it without creating a new link (rotate/republish).

### 4. No Expiry Notification
When `expires_at` is set, the link becomes inactive but no notification is sent to the manager or recipients.

### 5. Snapshot Is Immutable After Publish
Changes to the project estimates after publishing are not reflected until the manager clicks "Update shared page." There's no "auto-update" or "live sync." This is by design (explicit versioning) but could surprise managers.

### 6. No "Viewed By" Tracking Per Recipient
`open_count` is global (per publication). There's no way to see which specific recipient opened the link, or how many times each recipient viewed it.

### 7. Recipients Cannot Be Edited After Adding
Once a recipient is added, only removal is supported. There's no "resend email" or "change email" action.

### 8. No Email Unsubscribe/Tracking
Recipients cannot opt out of future emails. No unsubscribe link in the email template.

### 9. Comment/Decision Disabled Without Session
View-only (non-recipient) visitors cannot comment or submit decisions. The decision/comments section is hidden entirely. This means password-only visitors (without ?recipient=) have no interactive capability.

### 10. No PDF/Export for Recipients
The shared page is view-only in the browser. No "Download as PDF" or "Export to Excel" for recipients.
