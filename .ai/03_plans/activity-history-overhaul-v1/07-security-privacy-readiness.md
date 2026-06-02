# 07 — Security and Privacy Readiness

**Date:** 2026-06-02 (second pass: 2026-06-02; third pass: 2026-06-02)

---

## 1. Core Security Requirements

### Internal Comments Must Never Appear in Public/Client View

**Current state:** ✅ Implemented. Public API route filters `is_internal = false` for comments. Owner server action includes them with RBAC gate.

**Phase 3 risk:** When adding the composer to the public API route, MUST ensure `visibility: "internal"` items are still filtered out. The `filterActivityForVisibility()` function must strip them.

**Defense in depth:**
1. Database query filters `is_internal = false` (current)
2. Composer marks internal items with `visibility: "internal"` 
3. `filterActivityForVisibility(events, "client")` strips them

### Owner/Admin View May Include Internal Activity

**Current state:** ✅ Implemented via `loadSharedLinkActivity` with RBAC.

**Phase 3 risk:** Internal activity must remain visible in owner view with "Internal" badge. Must NOT accidentally become visible in public view.

| Public Route Must Not Leak Raw Metadata

**Current state:** ⚠️ Partial. `shared_link_events.metadata_json` is returned verbatim as `metadata` in the public API response.  
**Second-pass verification:** Confirmed. The route returns `metadata: e.metadata_json` directly. The composer must strip/transform this for client visibility.

### Public Route Uses Service-Role, Not Anon RLS

**First-pass claim:** "service client (anon RLS)" — INCORRECT.  
**Current state:** `createPublicationServiceClient()` uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses all RLS policies. Protection for public activity reads is entirely application-level: query filtering (`is_internal = false`), response shape construction, and rate limiting.  
**Phase 3 risk:** When composing on the public route, all sanitization must happen in application code since RLS provides no protection.  
**Defense in depth:** Query filter + composer visibility stripping + response shape allowlist.

### Public Route Must Not Leak Actor UUIDs

**Current state:** ✅ Not currently leaked (public route doesn't include `actor_user_id`).  
**Second-pass verification:** Confirmed — public route returns `author: c.author_email` for comments (submitter's own email) and no actor for decisions/events.  
**Phase 3 risk:** When composing, ensure `raw.actorUserId` is stripped for client visibility. Actor label rules for client views must be explicit (see `02-activity-copywriting-system.md`).

### Public Route Must Not Leak Internal Event Source Names

**Current state:** ⚠️ `event_source` is not in the public API response today, but it exists in the database.

**Phase 3 risk:** Compose must NOT include `raw.eventSource` when `visibility === "client"`.

### Rate Limiting

**Current state:** ✅ Durable rate limiter on public activity API, in-memory + durable on comment/decision endpoints.

**Phase 3 risk:** No change to rate limiting — same endpoints, same limits.

### Token/Session Validation

**Current state:** ✅ Publication token hashed, verified. Recipient session cookie verified.

**Phase 3 risk:** No change to session logic.

### Recipient Session Visibility

**Current state:** ✅ `recipientSession: boolean` returned but does not grant additional access.

**Phase 3 risk:** If recipient session grants any additional visibility, must ensure it does NOT expose internal comments.

### Comment Body Sanitization

**Current state:** ✅ Comments are sanitized on insertion (HTML strip, 1000 char limit, XSS prevention).

**Phase 3 risk:** Comment body rendering uses `whitespace-pre-wrap` with React default escaping — safe.

### PII Handling

**Current state:** ⚠️ Comments show `author_email` in public API. This is intentional (client submitted the comment via authenticated session). Decisions show no author.

**Phase 3 risk:** Actor label resolution for client views must never expose internal email addresses or user IDs. Use "Client" or resolved recipient name.

---

## 2. Security Scenarios Matrix

| Scenario | Owner View | Client View | Stored Audit | Risk |
|----------|-----------|-------------|-------------|------|
| Public comment | Full body visible, author email visible | Same as owner (public comment) | Stored in `shared_link_comments` | LOW |
| Internal comment | Visible with "Internal" badge | **Not visible** | Stored with `is_internal = true` | **CRITICAL** — must never leak |
| Approval | "Maria approved the proposal." | Same as owner | Stored in `shared_link_responses` | LOW |
| Decline | "Maria declined the proposal." + note | Same as owner (public decision) | Stored in `shared_link_responses` | LOW |
| Revision request | "Maria requested revisions." + note | Same as owner (public decision) | Stored in `shared_link_responses` | LOW |
| Shared link open event | "Client viewed the proposal." | Same as owner | Stored in `shared_link_events` as `event_type = 'open'` | LOW |
| Recipient invite | "Philip invited maria@example.com..." | Not visible (no client activity feed for recipient management) | Stored in `shared_link_recipients` | LOW |
| Deleted row event | Full event visible with "(removed)" label if row deleted | Not visible to clients (no estimate history access) | Stored in `estimate_sheet_events` with null `target_row_id` (ON DELETE SET NULL) | LOW |
| Unknown actor event | "Unknown user changed..." | "Client changed..." | Stored with null or unresolvable `actor_user_id` | MEDIUM — must anonymize for client |
| Expired/revoked publication | 404 on public API route | 404 on public API route | Events remain but unreachable | LOW |

---

## 3. Defense-in-Depth Visibility Gates

```
Raw DB Data
    ↓
[Gate 1] Database query filtering (is_internal = false for public)
    ↓
[Gate 2] Composer visibility parameter (strip raw, anonymize actor)
    ↓
[Gate 3] filterActivityForVisibility() (remove internal-only items)
    ↓
[Gate 4] API response shape (ActivityViewModel without raw field)
    ↓
Client Component (renders only what's in the response)
```

Each gate is independently testable. Failure at any gate should not cause data leakage if subsequent gates work.

---

## 4. Audit Completeness

### What's Logged

| Event | Table | Fields Logged | Gaps |
|-------|-------|--------------|------|
| Row change | `estimate_sheet_events` | old_snapshot, new_snapshot, changed_fields, total_delta, actor_user_id, correlation_id | None — comprehensive |
| Row add/delete | `estimate_sheet_events` | row_context, payload, actor_user_id | None |
| Node CRUD | `estimate_sheet_events` | payload (name, kind, counts), actor_user_id | Missing node name on delete (stored in payload but may be lost after ON DELETE SET NULL on estimate_nodes) |
| Tree reorder | `estimate_sheet_events` | payload (updatedCount), actor_user_id | Missing before/after order details |
| Template insert | `estimate_sheet_events` | payload (sourceTemplateId, targetParentNodeId), actor_user_id | None |
| Sheet code/name change | `estimate_sheet_events` | changed_fields, old_snapshot, new_snapshot, actor_user_id | None |
| Client comment | `shared_link_comments` | author_email, body, is_internal, created_at | Missing correlation_id |
| Client decision | `shared_link_responses` | decision, note, recipient_id, created_at | Missing correlation_id; missing snapshot_version reference |
| Shared link open | `shared_link_events` | event_type, metadata_json (IP hash, user agent hash), recipient_id, created_at | Acceptable for now |

**Gap: correlation_id on shared_link tables.** Adding `correlation_id` to `shared_link_comments`, `shared_link_responses`, and `shared_link_events` would enable future audit grouping.

---

## 5. OWASP-Style Logging Considerations

| Principle | Implementation | Status |
|-----------|---------------|--------|
| Log integrity | Append-only tables; no user-facing delete for events | ✅ |
| PII minimization | IP hashes instead of raw IPs in shared_link_events | ✅ |
| Event structure | Consistent schema across estimate_sheet_events | ✅ |
| Tamper evidence | No update paths for activity events (only INSERT) | ✅ |
| Correlation | `correlation_id` groups related estimate events | ⚠️ Missing for shared-link events |
| Actor attribution | `actor_user_id` FK to auth.users | ✅ |
| Timestamp precision | `timestamptz` (microsecond) | ✅ |
| Log retention | Activity retention metrics RPC exists | ⚠️ No automated cleanup policy |

---

## 6. Safe Fallback Behavior

| Error Condition | Current Behavior | Proposed Composer Behavior |
|----------------|-----------------|---------------------------|
| Unknown event type | `event_type.replace(/_/g, " ")` | "Activity recorded." with expandable raw event type |
| Missing actor | "System/backfill" or "Unknown user" | Same (acceptable) |
| Missing old/new values | "—" (em dash) | Same (acceptable) |
| Corrupted JSONB snapshot | Type error | Try/catch → "Activity recorded." with no diff |
| Deleted target row | Falls back to `row_context.material` | "Hardwood Oak Flooring (removed)" |
| Rate limit hit | 429 with retry-after | Unchanged |
| Publication not found | 404 | Unchanged |
| Composer exception | N/A (no composer yet) | Catch and return fallback `ActivityViewModel` with `title: "Activity recorded."` |

---

## 7. Error Copy That Does Not Leak Internals

| Error Scenario | User-Facing Copy | Must NOT Include |
|---------------|-----------------|-----------------|
| Activity load failure | "Unable to load activity. Retry?" | Error stack, SQL error message, query details |
| Rate limit hit | "Too many requests. Please wait a moment." | Rate limit window, internal counter |
| Publication expired | "This link is no longer active." | Token details, expiration timestamp |
| Composer failure | "Activity recorded." (individual event fallback) | Raw exception message |
| Network error | "Connection lost. Retry?" | Raw fetch error, URL details |

---

## 8. Security Test Checklist

See `08-test-strategy.md` for full test plan. Key security-specific tests:

- [ ] Public API does not return internal comments
- [ ] Public API does not return raw UUIDs
- [ ] Public API does not return raw event types
- [ ] Public API does not return `server_action` source
- [ ] Client view strips `raw` field entirely
- [ ] Client view anonymizes actor labels (no emails)
- [ ] Owner view includes internal comments with badge
- [ ] Owner view includes `raw` field for audit
- [ ] Rate limiting functions after composer addition
- [ ] Comment body rendering is XSS-safe
- [ ] Error responses do not leak internals
