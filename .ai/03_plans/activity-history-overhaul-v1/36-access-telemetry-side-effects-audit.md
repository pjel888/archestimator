# 36 — Access Telemetry Side Effects Audit

**Date:** 2026-06-02
**Status:** Fifth pass — final side effects analysis
**Purpose:** Audit what `recordProjectPublicationEvent()` actually does for each event type, and define exactly what should happen for each access stage in V1.1.

---

## Current Behavior of `recordProjectPublicationEvent()`

**File:** `src/lib/publication/public-repository.ts` lines 406-472

### What ALWAYS Happens (All Event Types)

For every call, regardless of `eventType`:
1. Looks up publication by token hash
2. Validates publication is active (published, not revoked, not expired)
3. **Insert into `project_publication_events`** with:
   - `publication_id`
   - `event_type`
   - `metadata_json` (includes recipient_id if provided)
   - `ip_hash` (SHA-256 of x-forwarded-for)
   - `user_agent_hash` (SHA-256 of user-agent)

### What Happens ONLY for `eventType === "open"`

```typescript
// Line 442: Gate condition
if (eventType === "open") {
  // Side effect 1: Increment open_count
  supabase.rpc("increment_project_publication_open", { target_publication_id: publication.id });

  // Side effect 2+3: Only if recipientId is provided
  if (recipientId) {
    // Side effect 2: Update shared_link_recipients
    supabase.from("shared_link_recipients")
      .update({ delivery_status: "opened", last_opened_at, updated_at })
      .eq("id", recipientId)
      .eq("publication_id", publication.id);

    // Side effect 3: Insert into shared_link_events (owner-visible)
    supabase.from("shared_link_events").insert({
      publication_id, recipient_id: recipientId,
      event_type: "open", metadata_json, ip_hash, user_agent_hash
    });
  }
}
```

### What Happens for OTHER Event Types

For `password_success`, `password_failure`, `download_attempt_blocked`, `password_attempt`:
- ONLY the `project_publication_events` insert (side effect 0).
- NO open_count increment.
- NO recipient update.
- NO shared_link_events insert.

---

## The Problem

The planning docs propose using existing event type `"open"` + `metadata_json.access_stage` for:

| Access stage | Proposed event_type | Proposed access_stage |
|---|---|---|
| Page visit (no password) | `"open"` | `"page_visit"` |
| Password gate viewed | `"open"` | `"password_gate_viewed"` |
| Password unlocked | `"open"` | `"password_unlocked"` |
| Proposal content viewed | `"open"` | `"proposal_viewed"` |
| Recipient session started | `"open"` | `"recipient_session_started"` |

**Problem:** If we call `recordProjectPublicationEvent({ eventType: "open" })` for `page_visit`, `password_gate_viewed`, or `password_unlocked`, ALL three side effects fire — incrementing open_count, updating recipient status, and inserting owner-visible shared_link_events — for events that are NOT actual proposal views.

---

## Strategy Options

### Option A — New Helper (RECOMMENDED)

**Keep `recordProjectPublicationEvent()` unchanged.** Only call it with `eventType: "open"` when the proposal content is actually viewed (`proposal_viewed`).

For page/gate/internal tracking events, create a **new helper** `recordProjectPublicationAnalyticsEvent()`:

```typescript
export async function recordProjectPublicationAnalyticsEvent({
  token,
  eventType,
  request,
  metadata = {},
}: {
  token: string;
  eventType: ProjectPublicationEventType;
  request: Request;
  metadata?: Record<string, unknown>;
}) {
  // Same lookup + validation as recordProjectPublicationEvent
  // Insert into project_publication_events ONLY
  // NO open_count increment
  // NO recipient update
  // NO shared_link_events insert
}
```

**Pros:**
- Existing helper behavior unchanged (zero regression risk)
- Explicit separation: analytics events vs business events
- Can reuse existing `ProjectPublicationEventType` values
- No migration needed
- Fits "no migration" constraint

**Cons:**
- New function to maintain
- Event type `open` reused for non-open events (semantically overloaded)
- May need to use `password_attempt` for some stages instead of `open`

### Option B — Modify Existing Helper

Add a check on `metadata.access_stage` inside `recordProjectPublicationEvent()`:

```typescript
if (eventType === "open" && metadata.access_stage === "proposal_viewed") {
  // fire side effects
}
```

**Pros:** Single function.

**Cons:**
- **RISKY** — changes behavior of existing helper that's already used in production
- Any caller not passing `metadata.access_stage` would break
- Side effects become conditional on metadata, which is fragile

### Option C — New Migration

Add new event_type enum values for access stages. Clean but contradicts "no migration for V1.1" constraint (D-008, D-009).

### Option D — Use Different Event Types

Use `password_attempt` for password-related stages and `open` only for proposal_viewed. But `password_attempt` already has specific meaning in the password route.

---

## Recommended Final Strategy: Option A

**Record proposal views (`proposal_viewed`) with existing `recordProjectPublicationEvent({ eventType: "open" })`** — this preserves all existing side effects (open_count, recipient status, shared_link_events) which are correct for actual proposal views.

**Record all other access stages with new `recordProjectPublicationAnalyticsEvent()`** — no side effects. Writes to `project_publication_events` only. Use `password_attempt` for password-related analytics events where the event_type enum supports it.

---

## Final Side Effects Matrix

| Access stage | Event to record | Event type | Helper | Increment open_count? | Update recipient? | Insert shared_link_events? | Owner visible? |
|---|---|---|---|---|---|---|---|
| `page_visit` (no password) | First page load before proposal render | `"open"` | `recordProjectPublicationAnalyticsEvent()` | ❌ No | ❌ No | ❌ No | ❌ No (analytics only) |
| `password_gate_viewed` | Password gate rendered | `"password_attempt"` or `"open"` | `recordProjectPublicationAnalyticsEvent()` | ❌ No | ❌ No | ❌ No | ❌ No |
| `password_unlocked` | Password accepted, cookie set | `"password_attempt"` | `recordProjectPublicationAnalyticsEvent()` | ❌ No | ❌ No | ❌ No | ❌ No (already recorded by password route) |
| `proposal_viewed` | Proposal content rendered (after any gate) | `"open"` | `recordProjectPublicationEvent()` | ✅ Yes | ✅ Yes (if recipient) | ✅ Yes (if recipient) | ✅ Yes (if recipient) |
| `recipient_session_started` | Session cookie established | `"open"` | `recordProjectPublicationAnalyticsEvent()` | ❌ No | ❌ No | ❌ No | ❌ No |

**Note:** The password route (`POST /api/share/[token]/password`) already records `password_attempt` events with success/failure metadata via `recordProjectPublicationEvent()`. These existing events are sufficient for password attempt tracking. Additional analytics-only `password_gate_viewed` and `password_unlocked` events are supplemental.

---

## `project_publication_events` vs `shared_link_events`

| Table | Purpose | Visibility | Written by |
|-------|---------|-----------|-----------|
| `project_publication_events` | Internal analytics/security audit trail | Engineering/analytics only | `recordProjectPublicationEvent()` for ALL event types |
| `shared_link_events` | Owner-visible recipient activity | Owner (via activity feed) | `recordProjectPublicationEvent()` ONLY when eventType="open" AND recipientId present |

---

## Implementation Path for V1.1 (PR 7)

1. Create `recordProjectPublicationAnalyticsEvent()` in `public-repository.ts`
   - Same signature as `recordProjectPublicationEvent()` but no side effects
   - Only inserts into `project_publication_events`
2. In `share/[token]/page.tsx`:
   - **Before password gate:** Call `recordProjectPublicationAnalyticsEvent()` for `password_gate_viewed`
   - **After password gate / no-password flow:** Call `recordProjectPublicationAnalyticsEvent()` for `page_visit`
   - **After proposal render:** Call existing `recordProjectPublicationEvent({eventType:"open"})` for `proposal_viewed`
3. Keep existing `recordProjectPublicationEvent("open")` at current location for proposal views
4. No migration required — pure application code changes

---

## Tests Required for Side Effects Audit

| Test | What it verifies |
|------|-----------------|
| `recordProjectPublicationEvent("open")` with recipientId | open_count increments, recipient updated, shared_link_events inserted |
| `recordProjectPublicationEvent("open")` without recipientId | open_count increments, NO recipient update, NO shared_link_events insert |
| `recordProjectPublicationEvent("password_attempt")` | ONLY project_publication_events insert, no side effects |
| `recordProjectPublicationAnalyticsEvent("open")` | ONLY project_publication_events insert, no side effects |
| `recordProjectPublicationAnalyticsEvent("password_attempt")` | ONLY project_publication_events insert, no side effects |
| Multiple page_visit events per session | No open_count inflation, no duplicate recipient updates |

---

## Cross-References

- `23-shared-page-access-activity-plan.md` — Access telemetry plan (update with this strategy)
- `25-access-event-data-model-and-migration-plan.md` — Data model plan (update with no-migration strategy)
- `29-final-decision-log-and-approval-matrix.md` — D-009 (access telemetry storage strategy)
- `34-final-preimplementation-audit.md` — Overall audit summary (Finding 4)
- `35-code-truth-map.md` — Code truth map (recordProjectPublicationEvent section)
