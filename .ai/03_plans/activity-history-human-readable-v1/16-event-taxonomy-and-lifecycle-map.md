# 16 — Event Taxonomy and Lifecycle Map

**Date:** 2026-06-02  
**Status:** Second-pass proposed — canonical event taxonomy

---

## Purpose

Define every event type across all tables, map them to product actions, assign copy templates, and document visibility rules. This file is the canonical source for composer implementation.

---

## Source Tables

The activity system spans **three event-source categories** across **two database tables**, plus two operational tables that serve as activity sources:

### Event Tables (Dedicated Audit/Activity)

| Table | Purpose | Taxonomy type |
|-------|---------|---------------|
| `estimate_sheet_events` | Audit log for all estimate mutation events | String enum (13 known values, no DB CHECK constraint) |
| `shared_link_events` | Activity events for shared-link recipient actions | DB CHECK constraint: `open`, `comment_add`, `accept_decision`, `decline_decision`, `password_attempt` |
| `project_publication_events` | Internal analytics/security events for publication access | TypeScript type: `open`, `password_success`, `password_failure`, `download_attempt_blocked`, `password_attempt` |

### Operational Tables (Dual-Purpose: Operational + Activity Source)

| Table | Purpose | Activity source |
|-------|---------|----------------|
| `shared_link_comments` | Client/owner comments on shared link | Comment activity items (type=`comment`) |
| `shared_link_responses` | Client decisions (accept/decline/revision) | Decision activity items (type=`decision`) |

---

## Category 1: Estimate Row Events

| Event type | Raw source | Product action | Actor | Target | Visibility | Primary copy template | Audit facts | Current support | Gap |
|-----------|-----------|---------------|-------|--------|-----------|----------------------|-------------|----------------|-----|
| `row_added` | `estimate_sheet_events` | Added a row from the library | Resolved owner name | Material name + location | Owner only | `"{actor} added {material} to the estimate."` | Full snapshot (new row data) | ✅ Full | None |
| `row_blank_added` | `estimate_sheet_events` | Added an empty row slot | Resolved owner name | Location | Owner only | `"{actor} added an empty row slot."` | Row context (location) | ✅ Full, but copy is awkward ("Empty row slot") | Copy improvement: "an empty row slot" → "a placeholder row" |
| `row_updated` | `estimate_sheet_events` | Changed one or more fields on a row | Resolved owner name | Material name + location | Owner only | `"{actor} changed {fields} for {material} from {old} to {new}."` | old_snapshot, new_snapshot, changed_fields, total_delta | ✅ Full | None |
| `row_replaced` | `estimate_sheet_events` | Replaced a row with a different library item | Resolved owner name | Old material → new material | Owner only | `"{actor} replaced {old_material} with {new_material}."` | Old/new material names, library item IDs | ✅ Full | None |
| `row_deleted` | `estimate_sheet_events` | Removed a row from the estimate | Resolved owner name | Material name + location | Owner only | `"{actor} removed {material} from the estimate."` | Row context (preserved via ON DELETE SET NULL for target_row_id) | ✅ Full | Blank row deletion copy could be better |

---

## Category 2: Estimate Sheet Events

| Event type | Raw source | Product action | Actor | Target | Visibility | Primary copy template | Audit facts | Current support | Gap |
|-----------|-----------|---------------|-------|--------|-----------|----------------------|-------------|----------------|-----|
| `sheet_code_updated` | `estimate_sheet_events` | Changed sheet code | Resolved owner name | Sheet code | Owner only | `"{actor} changed sheet code from {old} to {new}."` | Old/new sheet code from snapshot | ✅ Full | None |
| `sheet_metadata_updated` | `estimate_sheet_events` | Changed estimate metadata (name, budget, etc.) | Resolved owner name | Estimate sheet | Owner only | `"{actor} changed {specific_field} from {old} to {new}."` or fallback: `"{actor} updated the estimate sheet."` | changed_fields, old/new snapshots | ⚠️ Partial — copy is vague "Sheet metadata changed" | Composer must detect specific metadata fields (name, budget, etc.) |
| `sheet_version_created` | `estimate_sheet_events` | Created a named version snapshot | Resolved owner name | Version name | Owner only (dormant in UI; filtered from activity feed) | `"{actor} created version '{name}'."` | Version snapshot metadata | ⚠️ Filtered from activity feed currently | If surfaced, needs version name in copy |
| `sheet_restored_as_copy` | `estimate_sheet_events` | Restored from a version snapshot | Resolved owner name | Version name | Owner only (dormant in UI) | `"{actor} restored from version '{name}'."` | Restored version metadata | ⚠️ Filtered from activity feed | Same as above |

---

## Category 3: Estimate Tree/Node Events

| Event type | Raw source | Product action | Actor | Target | Visibility | Primary copy template | Audit facts | Current support | Gap |
|-----------|-----------|---------------|-------|--------|-----------|----------------------|-------------|----------------|-----|
| `node_created` | `estimate_sheet_events` | Created an area/group node | Resolved owner name | Node name | Owner only | `"{actor} created area '{name}'."` | Node name, kind, parent | ✅ Full, but node_created title is "Node created" not showing name | Composer should show node name in primary copy |
| `node_renamed` | `estimate_sheet_events` | Renamed an area/group node | Resolved owner name | Old name → new name | Owner only | `"{actor} renamed '{old_name}' to '{new_name}'."` | Old/new node names | ✅ Full | None |
| `node_deleted_with_children` | `estimate_sheet_events` | Deleted an area/group and all nested rows | Resolved owner name | Node name | Owner only | `"{actor} deleted area '{name}' and its contents."` | deletedRowCount, deletedNodeCount | ⚠️ Partial — node name may be missing from payload; current shows "Area deleted" without name | Composer needs node name from payload; fallback: "an area" |
| `tree_reordered` | `estimate_sheet_events` | Reorganized the estimate tree structure | Resolved owner name | Estimate tree | Owner only | `"{actor} reorganized the estimate tree."` | updatedCount (nodes reordered) | ⚠️ "Tree reordered" is vague; no before/after order | Acceptable for V1 |

---

## Category 4: Component/Library Events

| Event type | Raw source | Product action | Actor | Target | Visibility | Primary copy template | Audit facts | Current support | Gap |
|-----------|-----------|---------------|-------|--------|-----------|----------------------|-------------|----------------|-----|
| `template_inserted` | `estimate_sheet_events` | Inserted template rows | Resolved owner name | Template name + target location | Owner only | `"{actor} inserted template rows."` or `"{actor} inserted {template_name} template."` | Template source ID, target parent node | ⚠️ Partial — "Template rows inserted" is passive; no template name | Composer should include template name if available in payload |

---

## Category 5: Client Comment Events

| Event type | Raw source | Product action | Actor | Target | Visibility | Primary copy template | Audit facts | Current support | Gap |
|-----------|-----------|---------------|-------|--------|-----------|----------------------|-------------|----------------|-----|
| Comment (public) | `shared_link_comments` | Client or owner commented on proposal/row | Recipient name or "Client", or owner name for owner's own comments | Location context (estimate name, row material, or generic) | Owner + Client | `"{actor} commented on {location}."` + comment body as secondary | Comment body, author_email, estimate_id, row_id | ⚠️ Owner view shows `"COMMENT · date"` + author_email; client view shows same | Replace with composed copy; resolve actor name for owner view |
| Comment (internal) | `shared_link_comments` (is_internal=true) | Owner added an internal note | Owner name | Location context | Owner only | `"{actor} added an internal note on {location}."` + amber "Internal" badge | Comment body, author_email | ⚠️ Shows same raw `"COMMENT"` label as public comments; "Internal" badge at small text size | Replace with composed copy; amber badge must be visible |

---

## Category 6: Client Decision Events

| Event type | Raw source | Product action | Actor | Target | Visibility | Primary copy template | Audit facts | Current support | Gap |
|-----------|-----------|---------------|-------|--------|-----------|----------------------|-------------|----------------|-----|
| `accepted` | `shared_link_responses` | Approved the proposal | Recipient name or "Client" | Proposal | Owner + Client | `"{actor} approved the proposal."` + optional note | Decision value, note, snapshot_version_at_decision, timestamp | ❌ Shows `"Decision: accepted"` in green text; actor is hardcoded "recipient" | Resolve recipient name; replace with composed sentence |
| `declined` | `shared_link_responses` | Declined the proposal | Recipient name or "Client" | Proposal | Owner + Client | `"{actor} declined the proposal."` + optional note | Decision value, note, snapshot_version_at_decision, timestamp | ❌ Shows `"Decision: declined"` in green text | Same as above |
| `revision_requested` | `shared_link_responses` | Requested revisions | Recipient name or "Client" | Proposal | Owner + Client | `"{actor} requested revisions."` + optional note | Decision value, note, snapshot_version_at_decision, timestamp | ❌ Shows `"Decision: revision_requested"` in green text | Same as above |

---

## Category 7: Shared-Link Access/Security Events

### 7A: `shared_link_events` (Recipient-Visible)

| Event type | Raw source | Product action | Actor | Target | Visibility | Primary copy template | Audit facts | Current support | Gap |
|-----------|-----------|---------------|-------|--------|-----------|----------------------|-------------|----------------|-----|
| `open` | `shared_link_events` (inserted during `recordProjectPublicationEvent`) | Viewed the proposal | "Client" or recipient name | Proposal | Owner + Client | `"Client viewed the proposal."` or `"{name} viewed the proposal."` | IP hash, user agent hash, recipient_id | ⚠️ Shows raw `"EVENT · date"` + raw metadata JSON; no event_type returned in public API | Replace with composed copy; include event_type or compose into human-readable title |
| `password_attempt` | `shared_link_events` | Attempted password entry | "Client" or recipient name | Proposal | Owner only | `"Client entered the shared link password."` | IP hash, user agent hash | ⚠️ May or may not be inserted (check password route); render unknown in V1 | Verify insertion path; add to composer |
| `comment_add` | `shared_link_events` CHECK constraint | Commented on the proposal | — Defined in CHECK but NOT inserted | — | — | Not used — comments come from `shared_link_comments` table instead | — | ❌ No code inserts this event type | Either insert on comment or remove from CHECK constraint |
| `accept_decision` | `shared_link_events` CHECK constraint | Approved the proposal | — Defined in CHECK but NOT inserted | — | — | Not used — decisions come from `shared_link_responses` table instead | — | ❌ No code inserts this event type | Either insert on decision or remove from CHECK constraint |
| `decline_decision` | `shared_link_events` CHECK constraint | Declined the proposal | — Defined in CHECK but NOT inserted | — | — | Not used — decisions come from `shared_link_responses` table instead | — | ❌ No code inserts this event type | Same as above |

### 7B: `project_publication_events` (Internal Analytics/Security)

| Event type | Raw source | Product action | Actor | Target | Visibility | Primary copy template | Current support | Gap |
|-----------|-----------|---------------|-------|--------|-----------|----------------------|----------------|-----|
| `open` | `project_publication_events` | Publication opened | System | Publication | Internal only (not in activity feed) | Not user-facing | ✅ Inserted by `recordProjectPublicationEvent()` | Not surfaced in activity feed; acceptable |
| `password_success` | `project_publication_events` | Password verified | System | Publication | Internal only | Not user-facing | ✅ Defined in TypeScript type; verify insertion path | Check if inserted in password route |
| `password_failure` | `project_publication_events` | Password failed | System | Publication | Internal only | Not user-facing | ✅ Defined in TypeScript type | Check insertion |
| `download_attempt_blocked` | `project_publication_events` | Download blocked | System | Publication | Internal only | Not user-facing | ✅ Defined in TypeScript type | Verify insertion |
| `password_attempt` | `project_publication_events` | Password attempt (any) | System | Publication | Internal only | Not user-facing | ✅ Defined in TypeScript type; also exists in `shared_link_events` CHECK | Cross-table duplication — clarify which events go where |

---

## Category 8: Recipient Management Events

| Event type | Raw source | Product action | Actor | Target | Visibility | Primary copy template | Current support | Gap |
|-----------|-----------|---------------|-------|--------|-----------|----------------------|----------------|-----|
| Recipient invited | None (no event table entry) | Invited a recipient | Owner name | Recipient email | Owner only (in recipient tab, not activity feed) | `"{actor} invited {email} to view the proposal."` | ❌ No activity event created — only stored in `shared_link_recipients` | V2: create activity events for recipient management actions |
| Recipient removed | None | Removed a recipient | Owner name | Recipient email | Owner only | `"{actor} removed {email} from the shared link."` | ❌ No activity event created | V2: same as above |
| Recipient email resent | None | Resent invitation | Owner name | Recipient email | Owner only | `"{actor} resent invitation to {email}."` | ❌ No activity event created | V2: same as above |

---

## Category 9: Notification/Digest Events

| Event type | Source | Action | Actor | Target | Current support | Gap |
|-----------|--------|--------|-------|--------|----------------|-----|
| Comment digest | `maybeTriggerSharedLinkActivityDigest("comment")` | Owner receives email | System | Publication digest | ✅ Implemented | Copy improvement: more specific subject and body |
| Decision digest | `maybeTriggerSharedLinkActivityDigest("decision")` | Owner receives email | System | Publication digest | ✅ Implemented (first-pass incorrectly claimed missing) | Same as above |

---

## Category 10: System/Backfill Events

| Event type | Source | Action | Actor | Target | Current support | Gap |
|-----------|--------|--------|-------|--------|----------------|-----|
| Unknown event | Fallback composer handler for unrecognized event_type | Activity recorded (generic) | System or null actor | Unknown | ⚠️ Current: `event_type.replace(/_/g, " ")` → fallback label | Composer should return `"Activity recorded."` with expandable raw event type |

---

## Event Lifecycle

```
User action (edit row, submit comment, etc.)
    │
    ▼
Database trigger / RPC / route handler
    │
    ├── estimate_sheet_events ──► INSERT with old_snapshot, new_snapshot, etc.
    │
    ├── shared_link_comments ──► INSERT with body, is_internal, author_email
    │
    ├── shared_link_responses ─► UPSERT with decision, note, recipient_id
    │
    ├── shared_link_events ────► INSERT (mainly `open` events via recipient path)
    │
    └── project_publication_events ─► INSERT (internal analytics, not activity feed)
    │
    ▼
Activity reads:
    │
    ├── fetchEstimateSheetVersionControl() ──► compose → ActivityViewModel
    ├── loadSharedLinkActivity() ──► compose → ActivityViewModel
    └── GET /api/share/[token]/activity ──► compose → ActivityViewModel (client-safe)
    │
    ▼
UI rendering:
    ├── EstimateSheetContent.tsx (owner estimate activity)
    ├── SharedLinkActivityFeed.tsx (owner shared-link activity)
    └── SharedLinkActivityFeed.tsx (client shared-link activity)
```

---

## Notes

1. **`shared_link_events.event_type` CHECK constraint** includes `comment_add`, `accept_decision`, `decline_decision` but these are NEVER inserted. Comments use `shared_link_comments`, decisions use `shared_link_responses`. Consider removing them from the CHECK or inserting shadow events for audit completeness.

2. **`project_publication_events` vs `shared_link_events`**: `project_publication_events` is internal analytics (not surfaced in activity feeds). `shared_link_events` is the owner/client-visible activity source. The `open` event is written to BOTH tables (via `recordProjectPublicationEvent()`).

3. **`password_attempt`**: Exists in BOTH `shared_link_events` CHECK constraint AND `project_publication_events` TypeScript type. Verify which table actually receives the insert.

4. **Missing event types for V2**: Recipient management (invite, remove, resend), publication lifecycle (publish, republish, revoke, rotate), and estimate version management (create version, restore, delete version) should generate activity events in a future version.

---

## Cross-References

- See `02-activity-copywriting-system.md` for copy templates per event type
- See `03-data-contract-and-event-model-plan.md` for view model mapping
- See `21-activity-composer-spec.md` for implementation mapping per event
