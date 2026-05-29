# Notification System Plan — Shared Link Overhaul

**Date:** 2026-05-28
**Status:** Proposed Planning

This document defines how project owners are informed when clients interact with a shared link.

---

## 1. Notification Types

| Event | Urgency | Owner Action |
|-------|---------|--------------|
| Link opened by recipient | Low | Awareness only |
| Comment posted by recipient | High | Respond to question |
| Decision submitted (accepted) | Critical | Proceed with contract |
| Decision submitted (declined/revision) | Critical | Revise estimate and republish |
| Email bounced | Medium | Fix email address and resend |

---

## 2. Delivery Channels

### 2.1 In-App Activity Feed (Primary)

**Location**: Inside the `ProjectPublicationHeader` modal, on a new "Activity" tab.

**Data Source**: `shared_link_events` table (or `shared_link_comments` + `shared_link_responses` joined).

**UI**: Chronological list with iconography:
- 👁️ Open
- 💬 Comment
- ✅ Accepted
- ❌ Declined
- 🔄 Revision Requested
- ⚠️ Bounced

**Real-time Option**: Use Supabase Realtime to broadcast new events on the `project:projectId` channel. This allows the activity feed to update without a page refresh.

```typescript
// Realtime subscription sketch
supabase
  .channel(`project:${projectId}:shared-link-activity`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "shared_link_events",
    filter: `publication_id=eq.${publicationId}`,
  }, (payload) => {
    // Append to activity feed
  })
  .subscribe();
```

**Fallback**: If Realtime is unavailable, poll every 30 seconds while the modal is open.

---

### 2.2 Owner Email Digest (Secondary)

**Trigger**: When a comment or decision is submitted, send a lightweight email to the project owner (the `published_by` profile).

**Template**:
```
Subject: [Client Name] commented on [Project Name]

[Client Name] (client@example.com) posted a comment on the shared proposal for [Project Name]:

"Is the marble tile selection imported or local?"

View and respond: [Link to Workshop project]
```

**Rate Limiting**: Do not send more than 1 email per 15 minutes per publication to avoid inbox flooding. Use a simple `last_notified_at` column on `project_publications` or a separate `shared_link_notification_queue` table.

**Implementation**: Reuse the same transactional email provider chosen in Phase 2 (SMTP or Resend).

---

### 2.3 Project Sidebar Badge (Ambient)

**Location**: `ProjectMiniSidebar` or `ProjectWorkspaceHeaderRow`.

**Behavior**: Display a small red dot or number badge when there is unseen activity on the shared link.

**State**: Track "last seen activity timestamp" per user (could be stored in `localStorage` or a new `user_notification_state` table).

---

## 3. Notification Data Model

### Option A: Extend `shared_link_events`
Use the existing `shared_link_events` table as the single source of truth. Query it for the activity feed and use it to trigger emails.

### Option B: Add `shared_link_notification_log`
If we need more granular control (e.g., per-owner read states, email delivery tracking), add:

```sql
create table if not exists public.shared_link_notification_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.shared_link_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email')),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
```

**Decision for V2**: Use **Option A** (events table only) to keep complexity low. Upgrade to Option B if multi-owner notification tracking becomes a requirement.

---

## 4. Implementation Sequence

1. **Phase 3 (Parallel)**: Build the in-app activity feed inside the modal. This only requires reading from `shared_link_comments` and `shared_link_responses`.
2. **Phase 4**: Add Realtime subscription for live updates.
3. **Phase 4**: Add owner email digest using the transactional email provider.
4. **Phase 5**: Add sidebar badge and read-state tracking.

---

## 5. Privacy Considerations

- Do not include the full comment text in email notifications if the comment contains sensitive pricing details (optional — may be configurable per workspace).
- Always link back to the secure Workshop page rather than exposing detail in the email body.
- Respect the owner's email preferences (if we add a "notification settings" feature later).
