# 23 — Shared Page Access Activity Plan

**Date:** 2026-06-02
**Status:** Third-pass proposed

---

## Purpose

Define the shared page visit/access tracking system — what happens when a client/viewer opens a shared link, encounters the password gate, submits a password, or views the proposal. Cover event concepts, data model, privacy boundaries, and implementation approach.

---

## 1. Current State: Access Flow Map

### 1.1 Route: `/share/[token]` (No Password Required)

```
Client opens /share/[token]
    │
    ▼
resolveProjectPublicationAccessByToken(token)
    │
    ├── publicationAccess.passwordRequired = false
    │
    ▼
[Server] Check session cookie for recipient identity
    │
    ├── Session cookie valid → recipientIdForOpenEvent = resolved
    ├── Session cookie absent/invalid → recipientIdForOpenEvent = undefined
    │
    ▼
resolveProjectPublicationSnapshotByToken(token)
    │
    ▼
recordProjectPublicationEvent({ eventType: "open", request, recipientId })
    │   Stores: ip_hash, user_agent_hash, metadata_json
    │   If recipientId: updates recipient delivery_status, inserts shared_link_events
    │
    ▼
Render <ProjectPublicationView>
    │
    ├── If ?recipient= present: <SharePageRecipientSessionInitializer> (client-side session POST, then reload)
    │
    ▼
User sees proposal content, comments, decision panel, activity feed
```

**GAP:** The `open` event correctly records the page visit. But device/browser/location metadata is minimal — only `ip_hash` and `user_agent_hash`. No parsed device info, no approximate location.

### 1.2 Route: `/share/[token]` (Password Required — No Access Cookie)

```
Client opens /share/[token]
    │
    ▼
resolveProjectPublicationAccessByToken(token)
    │
    ├── publicationAccess.passwordRequired = true
    │
    ▼
Check publication access cookie
    │
    ├── Cookie absent/invalid → return <ProjectPublicationPasswordGate>
    │
    ▼
User sees password form. NO EVENT RECORDED.
```

**GAP:** The password-gate visit is not recorded. The owner has no visibility into whether a client reached the gate page. The first event happens only after password submission.

### 1.3 Password Submission

```
Client submits password via POST /api/share/[token]/password
    │
    ▼
CSRF check → rate limit check → lockout check
    │
    ▼
recordProjectPublicationEvent({ eventType: "password_attempt", metadata: { success, reason } })
    │
    ▼
If success: set access cookie → return 204
If failure: record failure, apply delay, return 401
If locked: return 429
```

**GAP:** Password gate viewed event NOT recorded. Only password_attempt upon submission. The "page visited but password not yet submitted" state is invisible.

### 1.4 Recipient Token First Visit

```
Client opens /share/[token]?recipient=<token>
    │
    ▼
Server: recipientToken = params.recipient
Server: No session cookie exists yet (first visit)
    │
    ▼
recipientIdForOpenEvent = undefined (no session cookie)
    │
    ▼
recordProjectPublicationEvent({ eventType: "open", recipientId: undefined })
    │   → Anonymous open event recorded
    │
    ▼
Render <SharePageRecipientSessionInitializer recipientToken={...}>
    │
    ▼
Client-side: POST /api/share/[token]/session → session cookie created
    │
    ▼
window.location.replace(/share/[token]) → page reloads
    │
    ▼
Second load: session cookie found → recipientIdForOpenEvent = resolved
    │
    ▼
recordProjectPublicationEvent({ eventType: "open", recipientId: resolved })
    │   → Named open event recorded (duplicate of first anonymous open)
```

**GAP:** First visit records anonymous open even though `?recipient=` was present. Recipient identity is unknown at server render time (session init is client-side). This creates a duplicate event on reload. If the owner views activity:
1. "Anonymous viewer opened the shared link."
2. "Maria viewed the proposal." (second load)

This is confusing and double-counts.

### 1.5 `/events` Route Status

`POST /api/share/[token]/events` exists and is rate-limited. It accepts:
- `open`
- `password_success`
- `password_failure`
- `download_attempt_blocked`

It is **not called** from `page.tsx` (which calls `recordProjectPublicationEvent` server-side directly). It's a client-side event endpoint available for future use but currently unused in the share page open flow.

---

## 2. Target State: Access Telemetry Model

### 2.1 Event Concepts

| # | Event concept | Trigger | Known recipient? | Password protected? | Stored where | Owner-visible? | Client-visible? | Primary copy |
|---|---|---------|---------|---------|---------|---------|---------|---------|
| 1 | `page_visited` | Page renders (before password check) | Maybe (cookie exists) | Yes | `project_publication_events` | Yes | No | "Client opened the shared link." |
| 2 | `password_gate_viewed` | Password gate renders | Unknown | Yes | `project_publication_events` | Yes | No | "Client reached the password page." |
| 3 | `password_attempted` | Password form submitted | Unknown | Yes | `project_publication_events` | Yes (success/failure) | No | "Client entered an incorrect password." or internal-only |
| 4 | `password_unlocked` | Password verified, cookie set | Unknown | Yes | `project_publication_events` | Yes | No | "Client unlocked the shared link." |
| 5 | `proposal_viewed` | Proposal content rendered (after password if needed) | Maybe (cookie/resolved) | Either | `shared_link_events` + `project_publication_events` | Yes | Yes (own only) | "Maria viewed the proposal." or "You viewed the proposal." |
| 6 | `recipient_session_started` | Session cookie created | Yes (recipient token verified) | N/A | `project_publication_events` | Yes (internal) | No | "Maria's session started." |
| 7 | `anonymous_viewed` | Proposal viewed without recipient identity | No | Either | `project_publication_events` | Yes | No | "Anonymous viewer opened the shared link." |

### 2.2 Event Routing

| Event concept | Write to `project_publication_events`? | Write to `shared_link_events`? | Write to `shared_link_recipients`? |
|---|---|---|---|
| `page_visited` | ✅ Yes (analytics/security) | ❌ No | ❌ No (no recipient known yet) |
| `password_gate_viewed` | ✅ Yes | ❌ No | ❌ No |
| `password_attempted` | ✅ Yes (already implemented) | ❌ No (or optionally for owner view) | ❌ No |
| `password_unlocked` | ✅ Yes | ❌ No | ❌ No |
| `proposal_viewed` (known recipient) | ✅ Yes | ✅ Yes | ✅ Yes (update `delivery_status`, `last_opened_at`) |
| `proposal_viewed` (anonymous) | ✅ Yes | ❌ No | ❌ No |
| `recipient_session_started` | ✅ Yes | ✅ Yes (optional) | ❌ No |

### 2.3 Implementation Recommendation

**Do not create a new table for V1.1.** Use:
- `project_publication_events` for all access/security events (internal analytics)
- `shared_link_events` for owner-visible activity (proposal_viewed events)
- `metadata_json` for extended metadata (access stage, password protected, device info)
- Add parsed device/location data to `metadata_json` rather than new columns

This avoids migration while still providing structured access telemetry.

---

## 3. Timestamp Requirements

| Requirement | Current state | Target | Implementation |
|---|---|---|---|
| Store canonical timestamp | ✅ `created_at timestamptz` (microsecond precision in Postgres) | No change needed | Already sufficient |
| Primary timeline display | `new Date().toLocaleString()` | "Jun 2, 3:45 PM" | Format in UI |
| Audit detail display | Not shown with ms | `2026-06-02T15:45:12.348+08:00` | Format `created_at` as ISO 8601 with milliseconds in audit view |
| Client clock independence | ✅ Server-side `created_at` (never client clock) | No change needed | Keep server-side |
| Supabase precision | ✅ `timestamptz` = microsecond | Sufficient | Confirmed |

---

## 4. Device/Browser Requirements

| Requirement | Implementation |
|---|---|
| Parse user-agent | Server-side: use a lightweight UA parser (e.g., `ua-parser-js` or similar). Parse into: `browser.name`, `browser.version`, `os.name`, `os.version`, `device.type` (desktop/mobile/tablet/bot/unknown) |
| Store user-agent hash | ✅ Already stored as `user_agent_hash` (SHA-256 base64url). Keep. |
| Store parsed metadata | Store in `metadata_json.device`: `{ browser: "Chrome", browserVersion: "125", os: "macOS", deviceType: "desktop" }` |
| Bot/crawler detection | Check parsed `device.type` for "bot" / "crawler". Flag in metadata. |
| Raw user-agent in UI | **Never** show in regular UI. Hash available for correlation. |
| Owner audit | Show "Chrome 125 on macOS (Desktop)" derived from parsed metadata. |

---

## 5. Location Requirements

| Requirement | Implementation |
|---|---|
| Data source | Provider geo headers: `x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city` (Vercel) or `cf-ipcountry` (Cloudflare). Check which headers are available in production. |
| Stored fields | `country`, `region`, `city` — only if available from headers. Store in `metadata_json.location`. |
| Raw IP | **Never** store. Already hashed as `ip_hash` (SHA-256). |
| Browser GPS | **Never** use for this feature. |
| Approximate only | All location data is derived from network/provider metadata. Include `approximate: true` flag in metadata. |
| Absent fallback | Show "Location unavailable" or omit location field entirely. |
| Privacy note | Add disclosure: "Location shown is approximate, based on network provider data." |

---

## 6. Privacy/Security Boundaries

| Data | Stored? | Visible to owner? | Visible to client? | Risk |
|------|---------|-------------------|-------------------|------|
| Raw IP | ❌ No | ❌ No | ❌ No | **Safe** — hashed only |
| IP hash | ✅ Yes (SHA-256) | ✅ In audit facts | ❌ No | Low — one-way hash, not reversible |
| User-agent hash | ✅ Yes (SHA-256) | ✅ In audit facts | ❌ No | Low |
| Raw user-agent | ❌ No | ❌ No | ❌ No | **Safe** |
| Parsed browser/OS/device | ✅ Yes (metadata_json) | ✅ Friendly display | ❌ No | Low |
| Country/region/city | ✅ Yes (if available, metadata_json) | ✅ Approximate | ❌ No | Low — coarse, provider-derived |
| Timezone | ✅ Yes (if available from headers) | ✅ Display | ❌ No | Low |
| Password value | ❌ **Never** | ❌ No | ❌ No | **CRITICAL** — must never be stored |
| Password success/failure | ✅ Yes (event+metadata) | ✅ Internal | ❌ No | Low |
| Recipient email | ✅ Already in `shared_link_recipients` | ✅ Yes | Own only | Medium |
| Recipient name | ✅ Already resolved | ✅ Yes | Own only | Low |
| Exact timestamp (with ms) | ✅ Yes (`timestamptz`) | ✅ Audit facts | ❌ No | Low |
| Request ID | ❌ Not stored | N/A | N/A | N/A |

**Critical rules:**
- Never store raw password values — not in metadata, not in request headers, not anywhere
- Password attempts record `success: true/false` and `reason: "locked"` only
- Never expose raw IP or raw user-agent in any UI
- Location is approximate only, from provider headers, never browser GPS

---

## 7. Implementation Options Compared

### Option A — Server-side logging in `page.tsx` (Page Visit + Proposal View)

**Pros:**
- Reliable (server-side, no client JS dependency)
- One place to see all access logic
- Can use existing `recordProjectPublicationEvent()`

**Cons:**
- Does not handle password-gate view (gate renders before event recording path)
- First recipient visit still anonymous (session init is client-side)
- No client-side-only events (time-on-page, scroll, tab visibility)

**Verdict:** Use for `proposal_viewed` event (already implemented). Add `page_visited` event BEFORE password gate check.

### Option B — Client-side beacon/event route

**Pros:**
- Can fire after page render (covers password gate view)
- Can include client-side context (timezone, screen size)

**Cons:**
- `fetch` beacon not guaranteed (page close during password gate)
- Adds additional network request on page load
- Timezone from client clock is unreliable

**Verdict:** Use sparingly. Good for `password_gate_viewed` beacon from the gate component.

### Option C — Dedicated `recordSharedPageAccessEvent()` helper

**Pros:**
- Clear API for access telemetry
- Encapsulates device/location parsing
- Can write to both `project_publication_events` and `shared_link_events` with consistent schema

**Cons:**
- New abstraction to maintain
- Must integrate with existing `recordProjectPublicationEvent()`

**Verdict: RECOMMENDED.** Create a dedicated helper that wraps `recordProjectPublicationEvent()` and adds device/location metadata enrichment.

### Option D — New `shared_link_access_events` table

**Pros:**
- Clean separation
- Purpose-built for access telemetry
- Easier retention policy

**Cons:**
- Migration needed
- More query plumbing
- Overkill for V1.1

**Verdict:** Defer to V2. Use existing tables + `metadata_json` for V1.1.

### Hybrid Recommendation (Best Fit for Archestimator)

1. **Create `enrichAccessEventMetadata(request)` helper** — parses user-agent into device/browser/OS, reads provider geo headers, returns structured metadata.
2. **Record `page_visited` in `page.tsx` BEFORE password gate check** — calls `recordProjectPublicationEvent({ eventType: "page_visit" })` with enriched metadata.
3. **Record `password_gate_viewed` from `ProjectPublicationPasswordGate` component** — client-side beacon to `/events` route (or server-side if we restructure the gate to be a client component that fires a server action).
4. **Record `password_unlocked` in password route** — add after successful password verification, before returning 204.
5. **Record `proposal_viewed` in `page.tsx` AFTER password/proposal content** — rename current `open` or add alongside it. Keep `open` for backward compatibility.
6. **Record `recipient_session_started` in session route** — POST handler writes event after creating session cookie.

**Event recording path:**

```
page_visited       → recordProjectPublicationEvent() in page.tsx (BEFORE password check)
password_gate_viewed → recordProjectPublicationEvent() from password-gate component
password_attempted → Already implemented in password route
password_unlocked  → Add to password route after success
proposal_viewed    → recordProjectPublicationEvent() in page.tsx (AFTER password/content)
recipient_session_started → Add to session route POST handler
```

### First-Recipient Visit Fix

**Option A (recommended):** Resolve recipient token server-side in `page.tsx` before recording access events:
1. If `?recipient=` is present, call `verifySharedLinkRecipientToken()` server-side during page render.
2. If verified, create session cookie server-side (via response header) AND use `recipientId` in the access event.
3. Remove `SharePageRecipientSessionInitializer` client component (no longer needed) OR keep for legacy.

**Option B (simpler but dual events):** Accept the double-event pattern:
1. First anonymous `page_visited` event.
2. Client-side session init.
3. Reload with `proposal_viewed` (named).
4. Group/merge duplicate events in UI by correlation.

**Option C (hybrid):** Record `page_visited` as anonymous, then `recipient_session_started` on session creation. Do NOT record a second `proposal_viewed` on reload. Use dedup logic.

**Recommendation: Option A** — resolve server-side. It's cleaner and the code path already exists (`verifySharedLinkRecipientToken` is implemented). Moving session creation server-side avoids the client-side redirect dance entirely.

---

## 8. Tests Required

### Unit/Integration Tests

- [ ] `enrichAccessEventMetadata()` parses user-agent correctly (Chrome, Safari, Firefox, bot)
- [ ] `enrichAccessEventMetadata()` parses device type (desktop, mobile, tablet)
- [ ] `enrichAccessEventMetadata()` extracts geo headers when present
- [ ] `enrichAccessEventMetadata()` handles missing headers gracefully
- [ ] No-password anonymous visit records `page_visited` + `proposal_viewed`
- [ ] No-password recipient visit records `page_visited` (anonymous) + `recipient_session_started` + `proposal_viewed` (named)
- [ ] Password-protected gate visit records `page_visited` + `password_gate_viewed`
- [ ] Password success records `password_attempted` + `password_unlocked` + `proposal_viewed`
- [ ] Password failure records `password_attempted` only
- [ ] Password locked records `password_attempted` with `reason: "locked"`
- [ ] Recipient token verified server-side → session cookie set → recipient known at `proposal_viewed` time
- [ ] Device/browser metadata present in `metadata_json.device`
- [ ] Location metadata present in `metadata_json.location` when headers available
- [ ] Location metadata absent/omitted when headers unavailable
- [ ] Timestamp includes microsecond precision (Postgres native)
- [ ] UI audit details show ISO 8601 with milliseconds
- [ ] No raw IP stored (only `ip_hash`)
- [ ] No raw user-agent stored (only `user_agent_hash` + parsed metadata)
- [ ] No password value stored
- [ ] `password_attempt` metadata contains only `success` boolean and optional `reason`

### Component Tests

- [ ] `ProjectPublicationPasswordGate` fires event on mount (or via server action)
- [ ] Page does not fire duplicate `proposal_viewed` on normal reload

---

## Cross-References

- See `25-access-event-data-model-and-migration-plan.md` for schema decisions
- See `26-privacy-retention-and-client-disclosure-plan.md` for privacy boundaries
- See `16-event-taxonomy-and-lifecycle-map.md` for expanded event taxonomy
- See `20-edge-case-and-failure-mode-matrix.md` for access telemetry edge cases
