# 14 — User Journeys and UX Paths

**Date:** 2026-06-02  
**Status:** Second-pass proposed

---

## Journey 1: Owner Reviews Estimate Sheet Activity

**Trigger:** Owner wants to see recent changes to an estimate sheet.

**User goal:** Understand who changed what, when, and what the cost impact was — at a glance.

**Entry point:** Workshop → Project → Estimate Sheet → "Activity" button in sheet header.

**Screens/components involved:**
- `EstimateSheetContent.tsx` → ActivityHistoryModal (full-screen dialog)
- ActivityScopeTree (left sidebar: Sheet / Groups / Areas / Rows)
- ActivityFilterDropdown (event type, date range, search)
- EventList → ActivityTimelineDayGroup → AuditEventCard

**Data sources involved:**
- `estimate_sheet_events` queried via `fetchEstimateSheetVersionControl()`
- `profiles` table for actor name resolution
- `estimate_nodes` for scope tree

**Primary copy needed:**
- `"{actor} {verb} {field} for {material} from {old} to {new}."` for row changes
- `"{actor} added {material} to the estimate."` for row additions
- `"{actor} removed {material} from the estimate."` for row deletions
- `"{actor} replaced {old} with {new}."` for replacements
- `"{actor} changed sheet code from {old} to {new}."` for sheet code
- `"{actor} created area '{name}'."` for node creation
- `"{actor} renamed '{old}' to '{new}'."` for node renames
- `"{actor} deleted area '{name}' and its contents."` for node deletion
- `"{actor} reorganized the estimate tree."` for reordering
- `"{actor} inserted template rows."` for templates

**Edge cases:**
- Scope filtered to a specific row/node → only shows events for that scope
- Search filters by material name
- Date range filters
- Event type filter (including the `row_inserted` bug — filters never match)

**Success criteria:**
- First card's primary sentence answers "what happened?" in <3 seconds
- Delta badge shows cost direction at a glance
- Expanding audit details shows before/after values
- Load-more works for long histories

**Risks:**
- Large file (~3000 lines) → medium regression risk during composer integration
- Correlation grouping breaks if composer changes event ordering
- Filters stop working if event type values change

---

## Journey 2: Owner Opens Row-Specific Activity

**Trigger:** Owner wants to see change history for a specific row item.

**User goal:** Trace all changes to a specific material/row over its lifetime.

**Entry point:** RowDetailsModal → "Activity" tab (within EstimateSheetContent.tsx).

**Screens/components involved:**
- RowDetailsModal → Activity tab
- Filtered EventList scoped to `targetRowId`

**Data sources involved:**
- `estimate_sheet_events` filtered by `target_row_id`
- Row context from `row_context` JSONB

**Primary copy needed:** Same as Journey 1, but scoped to a single row.

**Edge cases:**
- Row has been deleted → `target_row_id` is NULL; falls back to `row_context.material`
- Row is a blank placeholder → special "empty row slot" label
- Row has no events → empty state "No activity recorded for this row."

**Success criteria:**
- Only events for this specific row appear
- Deleted row context is preserved (material name shown even after deletion)

---

## Journey 3: Owner Filters by Activity Type/Date/Search

**Trigger:** Owner wants to find a specific type of change or search for changes to a specific material.

**User goal:** Narrow down a large activity history to relevant events.

**Entry point:** ActivityHistoryModal → Filter toolbar.

**Screens/components involved:**
- ActivityFilterDropdown → event type checkboxes
- Date range picker (from/to)
- Search input (text, 300ms debounce)

**Data sources involved:**
- Same as Journey 1, with additional WHERE clauses on `event_type`, `created_at`, and `row_context->>'material'`

**Primary copy needed:** "No activity events match your filter." + "Clear filters" button.

**Edge cases:**
- Selecting `row_inserted` filter (bug) → zero results (no events have this type)
- Date range with no events → empty state
- Search with no matches → empty state
- Multiple filters combined → intersection, not union

**Success criteria:**
- Filters apply at query level (not in-memory for large datasets)
- Clear filters button resets all filters
- Search hint text is helpful

**Risks:**
- `row_inserted` filter value is a bug → needs fix before V1 composer
- Search on JSONB `ilike` may be slow without GIN index

---

## Journey 4: Owner Investigates a Cost Delta

**Trigger:** Owner notices a significant cost change and wants to understand what drove it.

**User goal:** Trace from delta badge → specific fields changed → before/after values → actor.

**Entry point:** Activity card with a large +/- delta badge.

**Screens/components involved:**
- AuditEventCard → delta badge
- Expandable audit facts → diff table (Previous | Current)

**Data sources involved:**
- `total_delta` column on `estimate_sheet_events`
- `changed_fields` array
- `old_snapshot` / `new_snapshot` JSONB columns

**Primary copy needed:** Already covered by Journey 1 primary sentence. Audit facts expand to show: "Previous: 5 sqm, Current: 10 sqm".

**Edge cases:**
- Delta is zero → badge suppressed
- Delta is negative → red badge
- Multiple fields changed → "Changed quantity, unit cost, and misc cost"

**Success criteria:**
- Delta badge matches total_delta value
- Expanding audit shows each changed field with before/after
- Actor attribution is clear

---

## Journey 5: Owner Reviews Client Comments from Shared Link

**Trigger:** Owner receives email digest about new activity, or opens shared-link modal.

**User goal:** See what clients have commented on, any decisions they've made, and any internal notes the team has added.

**Entry point:** Project → Publication Modal → "Activity" tab (owner view).

**Screens/components involved:**
- `SharedLinkActivityFeed.tsx` (isOwner=true)
- ProjectPublicationHeader → Activity tab

**Data sources involved:**
- `shared_link_comments`, `shared_link_responses`, `shared_link_events` via `loadSharedLinkActivity()`
- Owner RBAC enforced at server action level

**Primary copy needed:**
- `"{name} commented on {location}."` for client comments
- `"{name} approved the proposal."` for acceptance
- `"{name} declined the proposal."` for declination
- `"{name} requested revisions."` for revision request
- `"{name} added an internal note on {location}."` + "Internal" badge for internal notes
- `"Client viewed the proposal."` for shared-link open events

**Edge cases:**
- Decision with note → note renders as secondary text
- Comment without location context → omits "on {location}"
- Internal comment from owner → shows with "Internal" badge
- Recipient name not resolved → shows "Client" as actor (current: hardcoded "recipient")

**Success criteria:**
- Internal comments visible with "Internal" badge
- Decision copy is human-readable, not raw enum values
- Comment body renders safely (no XSS)
- Realtime updates refresh the feed

**Risks:**
- Realtime subscription uses empty filter → fires on all publication inserts
- Pagination is flawed (in-memory merge, cursor applied after merge)
- Decision actor shows "recipient" not a resolved name

---

## Journey 6: Client Opens Shared Proposal

**Trigger:** Client receives invitation email and clicks the shared link.

**User goal:** View the proposal, understand the estimate, and optionally comment or make a decision.

**Entry point:** `/share/[token]` page.

**Screens/components involved:**
- Shared proposal page (password gate if applicable)
- SharedLinkActivityFeed (isOwner=false) — public view
- Decision buttons (Accept / Decline / Request Revision)
- Comment input

**Data sources involved:**
- Public activity API: `GET /api/share/[token]/activity`
- Project publication snapshot (estimate data, not activity data)
- Rate-limited endpoints for comment/decision submission

**Primary copy needed (activity feed):**
- `"Client commented on {location}."` → safe actor label
- Decision copy → from the client's own actions
- `"Client viewed the proposal."` → open events

**Edge cases:**
- Publication expired/revoked → 404 with safe message
- Password required → password gate before activity loads
- Client has recipient session → verified via cookie
- Rate limit hit → 429 with retry-after

**Success criteria:**
- Activity feed shows only non-internal comments
- Activity feed shows client's own decisions with human-readable copy
- No raw UUIDs in response
- No internal comments leaked
- Author email shown for own comments only

---

## Journey 7: Client Leaves Comment

**Trigger:** Client wants to ask a question or provide feedback on the estimate.

**User goal:** Submit a comment that the owner will see, potentially tied to a specific estimate or row.

**Entry point:** Shared proposal page → comment input.

**Screens/components involved:**
- Comment form on shared page
- CSRF token validation
- Rate limiting (5/min per recipient)

**Data sources involved:**
- `POST /api/share/[token]/comment`
- `insertSharedLinkComment()` → `insert_client_comment` RPC
- `shared_link_comments` table (insert only)
- Digest trigger: `maybeTriggerSharedLinkActivityDigest()` for "comment"

**Primary copy needed (activity feed after submission):**
- `"You commented on {location}."` for the client
- `"{email/name} commented on {location}."` for the owner

**Edge cases:**
- Empty comment body → validation error "Comment cannot be empty."
- Comment >1000 chars → truncated to 1000
- Rate limit hit → 429, must wait
- Invalid session → 401
- HTML/script in comment → sanitized (defense in depth: RPC truncates, client sanitizes on input)
- Comment tied to estimate_id/row_id → context label "on {material}" or "on {estimate name}"

**Success criteria:**
- Comment appears in activity feed after submission
- Owner digest email fires (rate-limited to 15 min)
- Client sees their own comment with "You" or their name

---

## Journey 8: Client Approves Proposal

**Trigger:** Client is satisfied with the estimate and wants to accept it.

**User goal:** Submit an approval decision, optionally with a note.

**Entry point:** Shared proposal page → "Accept" button → confirmation modal.

**Screens/components involved:**
- Decision buttons (Accept / Decline / Request Revision)
- Confirmation modal
- Note input (optional)

**Data sources involved:**
- `POST /api/share/[token]/decision`
- `submitSharedLinkDecision()` → `submit_client_response` RPC
- `shared_link_responses` table (upsert — unique on recipient+publication)
- Digest trigger: `maybeTriggerSharedLinkActivityDigest()` for "decision"

**Primary copy needed:**
- `"Maria approved the proposal."` (with resolved recipient name)
- Current: `"Decision: accepted"` in green text — must change

**Edge cases:**
- Already submitted → 409 "Decision already submitted."
- No session → 401
- Rate limit → 429
- Note >2000 chars → truncated
- Invalid decision value → 400

**Success criteria:**
- Decision appears in owner activity feed with human-readable copy
- Decision appears in client activity feed
- Owner digest email fires
- Further decision attempts return 409
- Confirmation modal prevents accidental submission

---

## Journey 9: Client Declines Proposal

**Trigger:** Client rejects the estimate.

**User goal:** Decline with optional explanatory note.

**Entry point:** Same as Journey 8 → "Decline" button.

**Data sources involved:** Same as Journey 8.

**Primary copy needed:**
- `"Maria declined the proposal."` with optional note shown as secondary text
- Current: `"Decision: declined"` in green text — must change

**Edge cases:** Same as Journey 8. Additionally: note may contain reasons for declination.

---

## Journey 10: Client Requests Revisions

**Trigger:** Client wants changes before accepting.

**User goal:** Request revisions with a note describing what needs to change.

**Entry point:** Same as Journey 8 → "Request Revision" button.

**Data sources involved:** Same as Journey 8.

**Primary copy needed:**
- `"Maria requested revisions."` with note as secondary text
- Current: `"Decision: revision_requested"` in green text — must change

**Edge cases:** Same as Journey 8. Revision request is distinct from decline — the proposal is still active.

---

## Journey 11: Owner Receives New Activity Notification/Digest

**Trigger:** Client submits a comment or decision.

**User goal:** Be notified of new activity without manually checking.

**Entry point:** Email inbox → digest email → link to project workspace → Publication Modal → Activity tab.

**Screens/components involved:**
- Email digest (generated by `triggerOwnerDigestIfAllowed()`)
- Publication Modal → Activity tab (owner view)

**Data sources involved:**
- Rate-limited digest (15 min cooldown per publication)
- `resolvePublicationDigestOwner()` for owner email lookup
- `sendEmail()` via Resend

**Primary copy needed (email):**
- Comment: "There is new comment activity on your shared project link."
- Decision: "There is new decision activity on your shared project link."

**Edge cases:**
- Digest cooldown → skipped if recent digest was sent
- Owner email unavailable → digest skipped
- Resend delivery failure → best-effort, non-blocking

**Success criteria:**
- Comment and decision both trigger digest (verified — both already do)
- Digest is rate-limited to prevent spam
- Digest copy is improved to be more specific about what happened

---

## Journey 12: Owner Sees Internal Note

**Trigger:** Owner or team member adds an internal note on the shared link.

**User goal:** See team-only notes in the activity feed, visually distinguished from public comments.

**Entry point:** Publication Modal → Activity tab (owner view) → internal comment card.

**Screens/components involved:**
- `SharedLinkActivityFeed.tsx` (isOwner=true)
- Internal note card with "Internal" amber badge

**Data sources involved:**
- `shared_link_comments` with `is_internal = true`
- Visible via owner server action (RBAC-gated), NOT via public API

**Primary copy needed:**
- `"Philip added an internal note on {location}."` + amber "Internal" badge + note body

**Edge cases:**
- Internal comment with no location → omits "on {location}"
- Internal comment body → rendered with `whitespace-pre-wrap`

**Success criteria:**
- Internal notes never visible in public API
- Internal notes never visible in client view
- Internal badge is visually distinct (amber)
- Internal note body is formatted same as public comments

---

## Journey 13: Support/Admin Audits a Disputed Change

**Trigger:** Client or owner disputes a change, and support needs to verify what happened.

**User goal:** Trace the exact event with event ID, correlation ID, timestamp, actor, and before/after snapshots.

**Entry point:** Workshop → Estimate Sheet → Activity History → expand audit facts on specific event.

**Screens/components involved:**
- AuditEventCard → expand audit facts
- Diff table: Previous | Current with field labels and formatted values
- Event metadata: Event ID, Correlation ID, Event type, Source

**Data sources involved:**
- Full `estimate_sheet_events` row with `old_snapshot`, `new_snapshot`, `changed_fields`, `actor_user_id`, `correlation_id`
- `raw` field in `ActivityViewModel` (owner-only)

**Primary copy needed:** Not needed for support — they need raw details. Copy should still be human-readable for initial scan.

**Edge cases:**
- Event with no snapshots → "—" values in diff table
- Event with deleted target → "(removed)" label on target name

**Success criteria:**
- Event ID visible and copyable
- Correlation ID links to grouped events
- Timestamp is in ISO format with timezone
- Before/after values are formatted correctly
- Actor user ID is visible for internal tracing

---

## Journey 14: Unknown/Deleted Target Event Appears

**Trigger:** An event references a row or node that has since been deleted.

**User goal:** Understand what happened even though the target no longer exists.

**Entry point:** Any activity surface where a deleted target event appears.

**Screens/components involved:**
- AuditEventCard → primary sentence includes "(removed)" label

**Data sources involved:**
- `estimate_sheet_events` with `target_row_id = null` (ON DELETE SET NULL)
- `row_context` JSONB preserved with original material name

**Primary copy needed:**
- `"Philip changed quantity for Hardwood Oak Flooring (removed) from 5 sqm to 10 sqm."`

**Edge cases:**
- Row context also missing → generic "Unknown item" label
- Node deleted → node name may be preserved in payload, or use generic "area"

**Success criteria:**
- Deleted target name appears with "(removed)" label
- Event is still identifiable and useful
- Audit facts remain accessible

---

## Journey 15: Future Unified Project Timeline

**Trigger (V2+):** User opens "Project Activity" from project dashboard.

**User goal:** See all activity across all estimates, shared links, and comments in one chronological view.

**Entry point:** Project dashboard → "Project Activity" tab.

**Screens/components involved:** To be designed (V2).

**Data sources involved:**
- All current sources merged: `estimate_sheet_events`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`
- Potentially a unified view/RPC for pagination

**Primary copy needed:** Same as current per-source copy, but merged and sorted by timestamp.

**Edge cases:**
- Cross-reference between estimate change and client comment on same row
- Filter by estimate, date range, actor, activity type
- Large project with 10,000+ events → pagination and performance critical

**Success criteria:** TBD in V2 planning.

**Risks:** Requires additive migrations (correlation_id on shared-link tables, unified view). Do not attempt in V1.

---

## Cross-References

- See `13-north-star-and-product-principles.md` for product direction
- See `15-information-architecture-and-surface-map.md` for surface mapping
- See `18-manual-qa-and-acceptance-matrix.md` for QA scripts per journey
- See `20-edge-case-and-failure-mode-matrix.md` for edge case coverage
