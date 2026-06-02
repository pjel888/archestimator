# 02 — Activity Copywriting System

**Date:** 2026-06-02  
**Status:** Proposed (pending approval)

---

## 1. Activity Sentence Formula

### Primary Line

```
{actor} {verb} {field/object} [for {target}] [from {oldValue} to {newValue}].
```

### Context Line (metadata, secondary)

```
{location} · {timestamp} · {delta}
```

### Expandable Audit Facts

```
Previous: {oldValue}
Current: {newValue}
Field: {humanFieldLabel}
Event ID: {eventId}
Correlation ID: {correlationId}
Event type: {internalEventType}
Source: {eventSource}
```

---

## 2. Copy Hierarchy

| Level | Purpose | Example |
|-------|---------|---------|
| **Primary (always visible)** | Complete action sentence | "Philip changed quantity for Hardwood Oak Flooring from 5 sqm to 10 sqm." |
| **Context (always visible)** | Location, time, delta | "Living Area · May 24, 10:45 AM · +₱ 7,200.00" |
| **Secondary (always visible)** | Comment body, decision note | "Please update the flooring specification." |
| **Audit facts (expandable)** | Before/after diff, event metadata | Previous: 5 sqm, Current: 10 sqm, Event ID: abc-123 |

---

## 3. Tone Principles

- **Active voice** — always. "Philip changed..." not "Quantity was changed..."
- **Present-time reference.** Use past tense for actions: "changed", "added", "approved"
- **Human field names.** "Unit cost" not "unitCost" or "unit_cost"
- **Friendly but professional.** Like a colleague summarizing what happened
- **No exclamation marks.** Activity is informational, not celebratory
- **No emoji in primary copy.** Activity feed is a business tool
- **Philippine PHP currency format.** "₱ 1,200.00" (PHP sign, space, thousands separator, 2 decimals)

---

## 4. Allowed Verbs

| Verb | Used for |
|------|---------|
| changed | Any field modification (quantity, cost, code, name, metadata) |
| added | Row insertion, node creation, blank slot addition, comment |
| removed | Row/node deletion, blank slot removal |
| replaced | Component/library item replacement |
| approved | Proposal acceptance |
| declined | Proposal rejection |
| requested revisions | Revision request |
| commented | Any comment (client or internal) |
| reorganized | Tree reordering |
| inserted | Template insertion |
| created | Node creation |
| renamed | Node renaming |
| deleted | Node/sheet deletion |
| viewed | Shared link page view |
| invited | Recipient invitation |
| resent | Email resend to recipient |
| removed (recipient) | Recipient removal from shared link |

---

## 5. Forbidden Technical Terms (Primary Copy)

These must NEVER appear in user-facing primary copy:

| Forbidden term | Why |
|---|---|
| `row_updated`, `row_replaced`, `row_deleted`, `row_added`, `row_blank_added` | Raw event types |
| `sheet_code_updated`, `sheet_metadata_updated` | Raw event types |
| `node_created`, `node_renamed`, `node_deleted_with_children` | Raw event types |
| `tree_reordered`, `template_inserted` | Raw event types |
| `revision_requested`, `accepted`, `declined` | Raw decision enum values |
| `server_action`, `client`, `system` | Raw event sources |
| `metadata_json`, `sourceSnapshot`, `oldSnapshot`, `newSnapshot` | Raw column names |
| `changedFields`, `correlation_id`, `target_row_id`, `estimate_node_id` | Raw column names |
| `linked-clean`, `linked-overridden`, `source-changed`, `detached` | Raw link states |
| `COMMENT`, `DECISION`, `EVENT` | Raw type labels in uppercase |
| Raw UUIDs | Never user-visible |

---

## 6. Field-Label Dictionary

| Raw DB field | User-facing label | Context |
|---|---|---|
| `quantity` | Quantity | Row change |
| `unitCost` | Unit cost | Row change |
| `miscCost` | Misc cost | Row change |
| `contingencyPercentage` | Adjustment | Row change |
| `contingencyValue` | Adjustment amount | Row change (audit only) |
| `discountPercentage` | Discount | Row change |
| `lineTotal` | Line total | Row change (audit only) |
| `material` | (material name itself) | Row identity |
| `supplier` | Supplier | Row metadata |
| `unit` | (unit label, e.g. sqm) | Value formatting |
| `linkState` | Library status | Row change (audit only) |
| `sourceLibraryItemId` | Library component | Row metadata |
| `sourceSnapshot` | Component snapshot | Row metadata (audit only) |
| `sheetCode` | Sheet code | Sheet change |
| `metadata` | Metadata | Sheet change (audit only) |
| `name` | Name | Node/estimate rename |
| `kind` | Type | Node metadata |
| `parentId` | Parent | Node metadata |

---

## 7. Value-Formatting Rules

| Field | Format | Example |
|-------|--------|---------|
| Quantity | `{number} {unit}` | "5 sqm", "12 pcs" |
| Currency (PHP) | `₱ {number with commas, 2 decimals}` | "₱ 1,200.00", "₱ 0.00" |
| Percentage | `{number}%` | "10%", "-5%" |
| Adjustment | `{percentage} ({amount})` | "10% (₱ 500.00)" |
| Missing value | `—` (em dash) | "—" |
| Zero delta | not shown | suppressed in badge |
| Sheet code | literal, as-is | "ES-001" |
| Node name | literal, as-is | "Living Area" |
| Material name | literal, as-is | "Hardwood Oak Flooring" |
| Blank row material | "Empty row slot" | "Empty row slot" (current, acceptable) |

---

## 8. Actor-Label Rules

### Owner/Admin View

- Resolved display name from profiles if available: "Philip Lewis"
- Email fallback: "philipjonlewis@gmail.com" (only if display name unavailable)
- System/backfill: "System/backfill" for events with null `actor_user_id`
- Unknown: "Unknown user" for events with non-null but unresolved `actor_user_id`

### Client/Public View

- Client actions: "Client"
- Known recipient name (if resolved from recipient session): "Maria"
- Unknown: "Unknown user"
- System: "System"
- **Never:** raw UUID, email address, service role name

### Actor Label Resolution Logic

```ts
function formatActivityActor(
  actorUserId: string | null,
  actorLabel: string | null,
  visibility: "owner" | "client"
): string {
  if (visibility === "owner") {
    return actorLabel || (actorUserId ? "Unknown user" : "System/backfill");
  }
  // Client view: anonymize
  if (!actorUserId) return "System";
  // If we have a recipient context, use their name
  // Otherwise: "Client" or "Unknown user"
  return actorLabel && !actorLabel.includes("@") ? actorLabel : "Client";
}
```

---

## 9. Client-Visible vs Owner Copy Rules

| Aspect | Owner/Admin View | Client/Public View |
|--------|-----------------|-------------------|
| Actor | "Philip Lewis" (resolved name) | "Client" or recipient name |
| Internal comments | Visible with "Internal" badge | **Never visible** |
| Audit facts | Full diff, event ID, correlation ID | Expandable diff only (no IDs) |
| Raw event types | Visible in audit facts | Never visible |
| Total delta | "+₱ 7,200.00" in badge | Suppressed or simplified |
| Event source | Visible in audit facts | Never visible |

---

## 10. Internal Audit Copy Rules

Audit facts (expandable, owner-only or owner-audit) may include:

- Event ID (UUID): for debugging and support
- Correlation ID (UUID): for related-event tracing
- Event type (raw): `row_updated`, `revision_requested`, etc.
- Event source: `server_action`, `client`
- Timestamp: ISO format with timezone
- Full diff table: field name, previous value, current value
- Actor user ID: for internal audit tracing
- Component snapshot evidence: source library item ID, snapshot version

---

## 11. Copy Examples — Full Set

### Row Changes

#### Quantity changed
**Primary:** "Philip changed quantity for Hardwood Oak Flooring from 5 sqm to 10 sqm."
**Context:** "Living Area · May 24, 10:45 AM · +₱ 7,200.00"
**Audit:** Previous: 5 sqm, Current: 10 sqm

#### Unit cost changed
**Primary:** "Philip changed unit cost for Chroma Sink from ₱ 3,500.00 to ₱ 4,200.00."
**Context:** "Kitchen · May 24, 11:00 AM · +₱ 700.00"

#### Adjustment changed
**Primary:** "Philip changed adjustment for Transport Allowance from 0% to 10%."
**Context:** "Project Summary · May 24, 9:30 AM · +₱ 500.00"
**Audit:** Previous: 0% (₱ 0.00), Current: 10% (₱ 500.00)

#### Discount changed
**Primary:** "Philip changed discount for Bulk Ceiling Paint from 5% to 0%."
**Context:** "Master Bedroom · May 24, 2:15 PM · +₱ 350.00"

#### Misc cost changed
**Primary:** "Philip changed misc cost for Delivery Charge from ₱ 0.00 to ₱ 500.00."
**Context:** "Project Summary · May 24, 3:45 PM · +₱ 500.00"

#### Total changed (computed)
**Primary:** "Total for Hardwood Oak Flooring changed from ₱ 12,000.00 to ₱ 19,200.00."
**Context:** "Living Area · May 24, 10:45 AM · +₱ 7,200.00"

#### Multiple fields changed
**Primary:** "Philip changed quantity, unit cost, and misc cost for Hardwood Oak Flooring."
**Context:** "Living Area · May 24, 10:45 AM · +₱ 8,500.00"

#### Single field changed, no before/after available
**Primary:** "Philip changed unit cost for Hardwood Oak Flooring."
**Context:** "Living Area · May 24, 10:45 AM"

### Row Insertion/Deletion

#### Row inserted from library
**Primary:** "Philip added Hardwood Oak Flooring to the estimate."
**Context:** "Living Area · May 24, 10:30 AM · +₱ 12,000.00"

#### Blank row slot added
**Primary:** "Philip added an empty row slot."
**Context:** "Living Area · May 24, 10:30 AM"

#### Blank row slot removed
**Primary:** "Philip removed an empty row slot."
**Context:** "Living Area · May 24, 11:30 AM"

#### Row deleted
**Primary:** "Philip removed Hardwood Oak Flooring from the estimate."
**Context:** "Living Area · May 24, 11:30 AM · -₱ 12,000.00"

### Row Replacement

#### Component replaced
**Primary:** "Philip replaced Hardwood Oak Flooring with HEMLINGBY Loveseat."
**Context:** "Living Area · May 24, 1:00 PM · +₱ 2,500.00"
**Audit:** Previous: Hardwood Oak Flooring (Brand: X, Supplier: Y), Current: HEMLINGBY Loveseat (IKEA)

#### Component detached from library
**Primary:** "Philip detached Hardwood Oak Flooring from the library."
**Context:** "Living Area · May 24, 1:30 PM"
**Audit:** Library status: Customized from library

#### Library status changed
**Primary:** "Library status for Hardwood Oak Flooring changed to custom."
**Context:** "Living Area · May 24, 2:00 PM"
**Audit:** Previous: Using library values, Current: Customized from library

### Sheet Changes

#### Sheet code changed
**Primary:** "Philip changed sheet code from ES-001 to ES-002."
**Context:** "Estimate Sheet · May 24, 3:00 PM"

#### Estimate name changed
**Primary:** "Philip changed estimate name from 'Kitchen Renovation' to 'Kitchen & Dining Renovation'."
**Context:** "Estimate Sheet · May 24, 4:00 PM"

#### Project budget changed
**Primary:** "Philip changed project budget from ₱ 500,000.00 to ₱ 750,000.00."
**Context:** "Estimate Sheet · May 24, 4:30 PM"

#### Sheet metadata changed (unknown fields)
**Primary:** "Philip updated the estimate sheet."
**Context:** "Estimate Sheet · May 24, 5:00 PM"
(This fallback for when `changed_fields` doesn't contain a known label)

### Node Changes

#### Node created
**Primary:** "Philip created area 'Kitchen'."
**Context:** "Estimate Sheet · May 24, 10:00 AM"

#### Node renamed
**Primary:** "Philip renamed 'Kitchen' to 'Master Kitchen'."
**Context:** "Estimate Sheet · May 24, 10:15 AM"

#### Node deleted
**Primary:** "Philip deleted area 'Kitchen' and its contents."
**Context:** "Estimate Sheet · May 24, 10:30 AM · -₱ 45,000.00"

#### Tree reordered
**Primary:** "Philip reorganized the estimate tree."
**Context:** "Estimate Sheet · May 24, 10:45 AM"
**Audit:** 3 nodes reordered

### Template

#### Template inserted
**Primary:** "Philip inserted template rows."
**Context:** "Living Area · May 24, 11:00 AM · +₱ 25,000.00"
**Audit:** Template: Kitchen Template, Target: Living Area

### Comments

#### Client comment
**Primary:** "Client commented on Living Area."
**Context:** "Shared Link · May 24, 10:45 AM"
**Secondary:** "Could we use a lighter finish for the oak flooring?"

#### Internal comment (owner only)
**Primary:** "Philip added an internal note on Living Area." (owner-only badge)
**Context:** "Shared Link · May 24, 10:50 AM"
**Secondary:** "Check with supplier about bulk discount."
**Badge:** Internal

### Decisions

#### Proposal approved
**Primary:** "Maria approved the proposal."
**Context:** "Shared Link · May 24, 11:00 AM"
**Badge:** Approved

#### Proposal declined
**Primary:** "Maria declined the proposal."
**Context:** "Shared Link · May 24, 11:30 AM"
**Secondary (if note):** "The budget is too high for our current phase."

#### Revision requested
**Primary:** "Maria requested revisions."
**Context:** "Shared Link · May 24, 12:00 PM"
**Secondary (if note):** "Please reduce the quantity of hardwood flooring and use a more affordable alternative."

### Shared Link Events

#### Shared link viewed
**Primary:** "Client viewed the proposal."
**Context:** "Shared Link · May 24, 9:00 AM"

#### Recipient invited
**Primary:** "Philip invited maria@example.com to view the proposal."
**Context:** "Shared Link · May 24, 8:00 AM"

#### Recipient email resent
**Primary:** "Philip resent invitation to maria@example.com."
**Context:** "Shared Link · May 24, 8:30 AM"

#### Recipient removed
**Primary:** "Philip removed maria@example.com from the shared link."
**Context:** "Shared Link · May 24, 9:00 AM"

### Edge Cases

#### Unknown actor
**Primary:** "Unknown user changed quantity for Hardwood Oak Flooring from 5 sqm to 10 sqm."
**Context:** "Living Area · May 24, 10:45 AM"

#### System/backfill event
**Primary:** "Sheet code was changed from ES-OLD to ES-001."
**Context:** "Estimate Sheet · Jan 1, 2024"
(Actor omitted or "System")

#### Missing old value
**Primary:** "Philip changed unit cost for Hardwood Oak Flooring to ₱ 1,500.00."
**Context:** "Living Area · May 24, 10:45 AM"

#### Missing new value
**Primary:** "Philip changed unit cost for Hardwood Oak Flooring from ₱ 1,200.00."
**Context:** "Living Area · May 24, 10:45 AM"
(This is unusual — should typically have a current value. Falls back gracefully.)

#### Missing both values
**Primary:** "Philip changed unit cost for Hardwood Oak Flooring."
**Context:** "Living Area · May 24, 10:45 AM"

#### Deleted target object
**Primary:** "Philip changed quantity for Hardwood Oak Flooring (removed) from 5 sqm to 10 sqm."
**Context:** "Living Area · May 24, 10:45 AM"
(If row was subsequently deleted but event remains in history)

#### Unknown event type
**Primary:** "Activity recorded."
**Context:** "Estimate Sheet · May 24, 10:45 AM"
**Audit (expandable):** Raw event type: `custom_event_type`, show available fields

#### Correlated/batch events
**Primary:** "Philip made 3 changes to Hardwood Oak Flooring."
**Context:** "Living Area · May 24, 10:45 AM · +₱ 8,500.00"
**Summary:** "Changed quantity, unit cost, and misc cost"
(Grouped under one entry with expandable per-event detail)

---

## 12. Raw-to-Human Copy Dictionary

| Raw value | User-facing label | Internal/audit label | Notes |
|---|---|---|---|
| `row_updated` | (not used in copy) | `row_updated` | Composed into "Changed {fields} for {material}" |
| `row_replaced` | (not used in copy) | `row_replaced` | Composed into "Replaced {old} with {new}" |
| `row_deleted` | (not used in copy) | `row_deleted` | Composed into "Removed {material}" |
| `row_added` | (not used in copy) | `row_added` | Composed into "Added {material}" |
| `row_blank_added` | (not used in copy) | `row_blank_added` | Composed into "Added an empty row slot" |
| `template_inserted` | (not used in copy) | `template_inserted` | Composed into "Inserted template rows" |
| `sheet_code_updated` | (not used in copy) | `sheet_code_updated` | Composed into "Changed sheet code from X to Y" |
| `sheet_metadata_updated` | (not used in copy) | `sheet_metadata_updated` | Composed into specific or "Updated the estimate sheet" |
| `sheet_version_created` | (not used in copy) | `sheet_version_created` | Dormant in activity feed; if surfaced: "Created version snapshot" |
| `node_created` | (not used in copy) | `node_created` | Composed into "Created area 'Name'" |
| `node_renamed` | (not used in copy) | `node_renamed` | Composed into "Renamed 'Old' to 'New'" |
| `node_deleted_with_children` | (not used in copy) | `node_deleted_with_children` | Composed into "Deleted area 'Name' and its contents" |
| `tree_reordered` | (not used in copy) | `tree_reordered` | Composed into "Reorganized the estimate tree" |
| `accepted` | "Approved" | `accepted` | Decision: "approved the proposal" |
| `declined` | "Declined" | `declined` | Decision: "declined the proposal" |
| `revision_requested` | "Requested revisions" | `revision_requested` | Decision: "requested revisions" |
| `linked-clean` | "Using library values" | `linked-clean` | Link state label (audit only) |
| `linked-overridden` | "Customized from library" | `linked-overridden` | Link state label (audit only) |
| `source-changed` | "Library source changed" | `source-changed` | Link state label (audit only) |
| `detached` | "Detached from library" | `detached` | Link state label (audit only) |
| `server_action` | (not shown) | `server_action` | Internal event source |
| `client` | (not shown) | `client` | Internal event source |
| `system` | (not shown) | `system` | Internal event source |
| `comment` | "Comment" | `comment` | Activity item type badge |
| `decision` | "Decision" | `decision` | Activity item type badge |
| `event` | "Event" | `event` | Activity item type badge |

---

## 13. Empty-State Copy

| Surface | Empty state copy |
|---------|-----------------|
| Estimate Activity History (empty) | "Activity events will appear here when rows are added, updated, or removed." (keep current) |
| Estimate Activity History (no results after filter) | "No activity events match your filter." |
| Shared Link Activity (empty, owner) | "Activity will appear here when comments are added or the proposal is approved, declined, or revised." |
| Shared Link Activity (empty, client) | "Activity will appear here when you comment or make a decision on the proposal." |
| Shared Link Activity (no results after search) | "No activity matches your search." |
| Row Activity tab (empty) | "No activity recorded for this row." |
| Node Activity scope (empty) | "No activity recorded for this area." |

## 14. Loading-State Copy

| Surface | Loading copy |
|---------|-------------|
| Activity feed loading | "Loading activity…" (current — keep for content, but wrap in skeleton cards) |
| Activity feed error | "{error message} · Retry" (current — keep) |

## 15. Realtime/New Activity Copy

| State | Copy |
|-------|------|
| New activity available | "New activity" (banner at top of feed) |
| New activity loaded (sr-only) | "2 new activity events loaded." (aria-live announcement) |

## 16. Email/Digest Copy

| Event | Subject | Body |
|-------|---------|------|
| New comment | "New comment on your shared project link" | "A new comment was added to your shared project link. Open the Shared link modal and select the Activity tab to review." |
| New decision | "New decision on your shared project link" | "A recipient has made a decision on your shared project link. Open the Shared link modal and select the Activity tab to review." |

---

## 17. Copy Engineering Rules

1. **All formatting must be deterministic.** Same event + same locale = same copy. No randomness.
2. **No HTML in primary copy.** Primary sentence is plain text only. Badges are rendered separately.
3. **Truncate long values.** Material names >100 chars get truncated with ellipsis in primary copy, full value in audit.
4. **Empty comment body** renders nothing — don't show "No comment body."
5. **Decision without note** renders no secondary body — just the primary sentence.
6. **Internal comments must never appear** in public API responses, client views, or client email digests.
7. **Correlation-grouped events** show aggregated primary sentence, then expandable per-event detail.
