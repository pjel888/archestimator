# 26 — Privacy, Retention, and Client Disclosure Plan

**Date:** 2026-06-02
**Status:** Third-pass proposed

---

## Purpose

Define safe tracking boundaries for shared page access telemetry. Document what is collected, why, who can see it, how long it's retained, what is never collected, and what disclosures are needed.

---

## 1. Data Collection Table

| Data | Example | Stored? | Visible to owner? | Visible to client? | Risk | Recommendation |
|------|---------|---------|-------------------|-------------------|------|---------------|
| Raw IP | `203.0.113.42` | ❌ **No** | ❌ | ❌ | High — PII, GDPR concern | Hash only |
| IP hash | `base64url(SHA-256(ip))` | ✅ Yes | ✅ Audit facts | ❌ | Low — one-way, not reversible | Keep (already implemented) |
| User-agent hash | `base64url(SHA-256(ua))` | ✅ Yes | ✅ Audit facts | ❌ | Low | Keep (already implemented) |
| Raw user-agent | `Mozilla/5.0... Chrome/125...` | ❌ **No** | ❌ | ❌ | Medium — contains version details | Hash only; parse, don't store raw |
| Parsed browser name | `Chrome` | ✅ Yes (metadata_json) | ✅ Audit facts | ❌ | Low | Show in audit only |
| Parsed browser version | `125` | ✅ Yes (metadata_json) | ✅ Audit facts | ❌ | Low | Show in audit only |
| Parsed OS | `macOS` | ✅ Yes (metadata_json) | ✅ Audit facts | ❌ | Low | Show in audit only |
| Parsed device type | `desktop`, `mobile`, `tablet`, `bot` | ✅ Yes (metadata_json) | ✅ Audit facts | ❌ | Low | Show in audit only |
| Country (provider) | `PH`, `US` | ✅ Yes (if available from headers) | ✅ Audit facts | ❌ | Low — coarse, provider-derived | Show as approximate |
| Region (provider) | `NCR`, `CA` | ✅ Yes (if available) | ✅ Audit facts | ❌ | Low | Show as approximate |
| City (provider) | `Makati`, `San Francisco` | ✅ Yes (if available) | ✅ Audit facts | ❌ | Low | Show as approximate |
| Timezone | `Asia/Manila` | ✅ Yes (if available from headers) | ✅ Audit facts | ❌ | Low | Show as approximate |
| Recipient email | `maria@example.com` | ✅ Yes (in `shared_link_recipients`) | ✅ Yes | Own only | Medium — PII | Existing pattern; keep |
| Recipient display name | `Maria Santos` | ✅ Yes (in `shared_link_recipients`) | ✅ Yes | Own only | Low | Keep |
| Password value | `hunter2` | ❌ **Never** | ❌ | ❌ | **CRITICAL** | Never store, never log, never hash |
| Password success/failure | `{ success: true }` | ✅ Yes (metadata) | ✅ Internal | ❌ | Low | Boolean only; reason for locked |
| Exact timestamp (ms) | `2026-06-02T15:45:12.348Z` | ✅ Yes (`timestamptz`) | ✅ Audit | ❌ | Low | Native Postgres precision |
| Request ID | `req_abc123` | ❌ Not stored | N/A | N/A | N/A | Not needed for V1.1 |
| Referrer | `https://mail.google.com/` | ❌ Not stored | ❌ | ❌ | Medium — could reveal email source | Not needed |
| Screen size | `1440x900` | ❌ Not stored | ❌ | ❌ | Low | Not needed for V1.1 |
| Browser GPS location | — | ❌ **Never** | ❌ | ❌ | **CRITICAL** | Never request, never store |
| Session ID hash | `base64url(SHA-256(session))` | ❌ Not stored | N/A | N/A | N/A | Not needed for V1.1 |

---

## 2. What Is Never Collected

- Raw IP addresses
- Raw user-agent strings
- Browser GPS / precise geolocation
- Password values (plaintext or hashed)
- Recipient device/browser details visible to other recipients
- Screen size, color depth, installed fonts, or other fingerprinting data
- Referrer URLs
- Cookies from other domains

---

## 3. Visibility Rules

### Owner View

Owners can see (for their own shared links):
- Whether the shared link was opened (page visit + proposal view)
- Whether the password gate was reached
- Whether a password was attempted (success/failure/locked)
- The approximate location (country/region/city) of the viewer
- The device/browser used (parsed friendly labels)
- The exact timestamp with milliseconds (in audit facts)
- The IP hash (for correlation, in audit facts)
- Whether the viewer was a known recipient or anonymous

### Client/Recipient View

Clients can see:
- Their own comments and decisions (with human-readable copy)
- "You viewed the proposal." (if they are a known recipient)
- **Nothing else** — no device/location/browser data, no other visitors' access events, no anonymous visit logs, no IP hashes, no password attempt history

### Internal/Support View

Support staff (with appropriate access) can see:
- All access events for debugging
- IP hash, user-agent hash, device/browser details
- Location data
- Full timestamps
- Used for: dispute resolution, security incident investigation, abuse detection

---

## 4. Retention Policy

| Data type | Retention | Rationale |
|-----------|-----------|-----------|
| `project_publication_events` | Indefinite (current) | Security/audit trail. Evaluate 90-day retention for access events in V2. |
| `shared_link_events` | Indefinite (current) | Activity history for owner. |
| `shared_link_recipients` | Indefinite (current) | Operational data (recipient management). |
| IP hash | Same as parent event row | Hashed, no PII concern. |
| User-agent hash | Same as parent event row | Hashed, no PII concern. |
| Location data | Same as parent event row | Coarse, provider-derived. Low privacy risk. |
| Parsed device/browser | Same as parent event row | Aggregated data, not PII. |

**No automated deletion is planned for V1.1.** Events are append-only. Future retention policy (V2+):
- Access events: 90-day retention (GDPR-friendly)
- Estimate events: 1-year retention (audit purposes)
- Data deletion on project deletion (cascade from FK constraints)

---

## 5. Client Disclosure Requirements

### Privacy Notice Updates

The existing privacy policy or terms should be updated to include:

> **Activity Logging:** When a shared project link is opened, Archestimator records the visit including the approximate city and country (based on network provider data), device type, and browser used. This information is visible to the project owner. Raw IP addresses and precise locations are never stored. Your activity (comments, decisions, views) is visible to the project owner. Other recipients cannot see your device or location information.

### In-Product Disclosure

For V1.1, consider adding a small notice on the shared page footer or password gate:

> "Visits to this page are logged. The project owner can see when this link was opened, from what approximate location, and what device was used."

This is optional — many SaaS products log access without in-product disclosure. The decision should be made with legal/compliance input.

---

## 6. Bot/Crawler Handling

| Scenario | Behavior |
|----------|----------|
| User-agent indicates bot (Googlebot, Bingbot, etc.) | Flag `device.is_bot: true` in metadata. Still record event (for security/abuse detection). Do NOT show in owner activity feed by default. |
| Email preview bot (Apple Mail, Gmail image proxy) | Treat as bot. Record but do not surface. Prevents false "Client opened the link" from email previews. |
| Browser prefetch (link rel=prefetch) | If detectable via `Sec-Purpose: prefetch` header, skip event recording entirely. |
| Security scanner / pentest tool | Record as bot. Helps owner distinguish real client visits from automated traffic. |

### Bot Detection Strategy

- Use parsed user-agent device type detection
- Check `Sec-Purpose: prefetch` header (skip recording)
- Check `X-Purpose: preview` header (some email clients)
- Check common bot user-agent patterns

---

## 7. Do-Not-Track Consideration

The `DNT` (Do Not Track) header is deprecated and not reliably supported. Archestimator should not implement DNT-specific logic. The access logging is essential for the product (owners need to know if their shared links were opened) and is disclosed in the privacy notice.

---

## 8. Security Incident Implications

If a security incident occurs (e.g., unauthorized access to publication data):

| Data at risk | Impact | Mitigation |
|-------------|--------|-----------|
| IP hash | Low — one-way hash, not reversible | No raw IP to leak |
| User-agent hash | Low — one-way hash | No raw UA to leak |
| Location data | Low — coarse, city-level at most | Approximate only |
| Recipient emails | Medium — PII in `shared_link_recipients` | Already hashed tokens for access |
| Password values | None — never stored | N/A |

---

## 8. Open Decisions

| Decision | Status | Recommendation |
|----------|--------|---------------|
| In-product disclosure of access logging | Open | Consult legal. Optional for V1.1 — many SaaS skip. Add to privacy notice at minimum. |
| Bot/crawler event filtering in UI | Open | Filter by default in owner activity feed. Show in advanced/support view. |
| Retention policy timeline | Open | No automated deletion in V1.1. Define policy before V2. |
| Location data granularity | Open | City-level from provider headers. If headers unavailable, omit entirely. Do not use fallback IP geolocation services. |

---

## Cross-References

- See `23-shared-page-access-activity-plan.md` for implementation plan
- See `25-access-event-data-model-and-migration-plan.md` for schema decisions
- See `07-security-privacy-readiness.md` for broader security context
- See `20-edge-case-and-failure-mode-matrix.md` for edge cases including bot traffic
