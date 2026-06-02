# 21 — Activity Composer Specification

**Date:** 2026-06-02  
**Status:** Second-pass proposed — implementation-ready spec

---

## Purpose

Define the exact types, functions, input/output contracts, and behavior of the central Activity Composer module. This spec should be detailed enough that implementation can begin without guessing.

---

## 1. Module Structure

Proposed file layout:

```
src/lib/activity/
├── index.ts                     # Barrel export
├── types.ts                     # All ActivityViewModel types
├── activity-composer.ts         # composeEstimateActivity(), composeSharedLinkActivity()
├── activity-formatters.ts       # formatActivityFieldLabel(), formatActivityValue(), formatActivityActor()
├── activity-visibility.ts       # filterActivityForVisibility()
├── activity-copy-dictionary.ts  # Field labels, verb mappings, decision mappings
└── activity-fallback.ts         # createFallbackActivityViewModel(), safeCompose()
```

---

## 2. Core Types

```ts
// src/lib/activity/types.ts

export type ActivitySource = "estimate" | "share" | "comment" | "decision" | "system";

export type ActivityAudience = "owner" | "client" | "support" | "system";

export type ActivityVisibility = "public" | "owner" | "internal";

export type ActivityAction =
  | "changed"
  | "added"
  | "removed"
  | "replaced"
  | "commented"
  | "approved"
  | "declined"
  | "requested_revision"
  | "viewed"
  | "sent"
  | "resent"
  | "invited"
  | "reorganized"
  | "created"
  | "renamed"
  | "deleted"
  | "inserted_template";

export type ActivityActor = {
  id?: string;
  kind: "user" | "recipient" | "client" | "system" | "unknown";
  displayName: string;
  email?: string; // Only for owner visibility and own comments
};

export type ActivityTarget = {
  kind: "row" | "sheet" | "node" | "proposal" | "comment_thread" | "recipient" | "system" | "unknown";
  label: string;
  secondaryLabel?: string;   // Location context (e.g., "Living Area")
  id?: string;
  deleted?: boolean;
};

export type ActivityChange = {
  field: string;              // Raw field name
  label: string;              // Human-readable label
  previous?: string;          // Formatted old value or "—"
  current?: string;           // Formatted new value or "—"
  rawPrevious?: unknown;      // Unformatted old value
  rawCurrent?: unknown;       // Unformatted new value
};

export type ActivityDelta = {
  value: number;
  formatted: string;          // e.g., "+₱ 7,200.00" or "-₱ 1,200.00"
  kind: "increase" | "decrease" | "neutral";
};

export type ActivityFact = {
  label: string;
  previous?: string;
  current?: string;
};

export type ActivityRaw = {
  eventType?: string;
  eventSource?: string;
  correlationId?: string;
  eventId?: string;
  actorUserId?: string;
  oldSnapshot?: unknown;
  newSnapshot?: unknown;
};

export type ActivityViewModel = {
  id: string;
  source: ActivitySource;
  audience: ActivityAudience;
  visibility: ActivityVisibility;
  action: ActivityAction;

  // Actor
  actor: ActivityActor;
  occurredAt: string;

  // Target
  target: ActivityTarget;

  // Changes (for "changed" actions)
  changes?: ActivityChange[];

  // Copy
  title: string;          // Primary sentence
  summary?: string;       // Secondary/supporting text
  meta?: string;          // Timestamp + location line

  // Cost impact
  delta?: ActivityDelta;

  // Visual
  badges?: string[];      // e.g., ["Approved", "Internal", "+₱ 7,200.00"]

  // Body (comment/decision notes)
  body?: string;

  // Expandable audit facts
  facts?: ActivityFact[];

  // Raw reference (owner-only)
  raw?: ActivityRaw;
};
```

---

## 3. Composer Functions

### 3.1 `composeEstimateActivity()`

```ts
// src/lib/activity/activity-composer.ts

import type { EstimateSheetHistoryEvent } from "@/lib/estimates/actions";

export type ComposeEstimateOptions = {
  visibility?: "owner" | "client";
  locale?: string; // Future; default "en-PH"
};

export function composeEstimateActivity(
  event: EstimateSheetHistoryEvent,
  opts: ComposeEstimateOptions = {}
): ActivityViewModel;
```

**Input:** `EstimateSheetHistoryEvent` (from `src/lib/estimates/actions.ts`)

**Behavior:**
1. Determine `action` from `event.eventType` using event-to-action mapping
2. Resolve actor using `formatActivityActor(event.actor_user_id, event.actorLabel, visibility)`
3. Build `target` from `event.row_context`, `event.payload`, or `event.estimate_id`
4. Build `changes[]` from `event.old_snapshot`, `event.new_snapshot`, `event.changed_fields`
5. Compose `title` using sentence template for the action type
6. Build `facts[]` for expandable audit
7. Build `raw` if `visibility !== "client"`
8. Build `delta` if `event.total_delta` is non-null

**Event-to-Action Mapping:**

```ts
const EVENT_ACTION_MAP: Record<string, ActivityAction> = {
  row_updated: "changed",
  row_added: "added",
  row_blank_added: "added",
  row_deleted: "removed",
  row_replaced: "replaced",
  template_inserted: "inserted_template",
  sheet_code_updated: "changed",
  sheet_metadata_updated: "changed",
  sheet_version_created: "created",
  sheet_restored_as_copy: "created",
  node_created: "created",
  node_renamed: "renamed",
  node_deleted_with_children: "deleted",
  tree_reordered: "reorganized",
};
```

**Sentence Templates by Action:**

```
row_updated:
  Single field, with before/after:
    "{actor} changed {field} for {target} from {old} to {new}."
  Single field, no before:
    "{actor} changed {field} for {target} to {new}."
  Single field, no after:
    "{actor} changed {field} for {target} from {old}."
  Single field, neither:
    "{actor} changed {field} for {target}."
  Multiple fields (2-3):
    "{actor} changed {field1}, {field2}, and {field3} for {target}."
  Multiple fields (4+):
    "{actor} changed {count} fields for {target}."
  No fields in changed_fields:
    "{actor} updated {target}."

row_added:
  From library:
    "{actor} added {target} to the estimate."
  Blank:
    "{actor} added an empty row slot."

row_blank_added:
  "{actor} added an empty row slot."

row_deleted:
  Regular:
    "{actor} removed {target} from the estimate."
  Blank:
    "{actor} removed an empty row slot."

row_replaced:
  "{actor} replaced {old_target} with {new_target}."

template_inserted:
  With template name:
    "{actor} inserted {template_name} template."
  Without name:
    "{actor} inserted template rows."

sheet_code_updated:
  "{actor} changed sheet code from {old} to {new}."

sheet_metadata_updated:
  Known metadata field:
    "{actor} changed {field} from {old} to {new}."
  Unknown field:
    "{actor} updated the estimate sheet."

node_created:
  "{actor} created area '{name}'."

node_renamed:
  "{actor} renamed '{old}' to '{new}'."

node_deleted_with_children:
  With name:
    "{actor} deleted area '{name}' and its contents."
  Without name:
    "{actor} deleted an area and its contents."

tree_reordered:
  "{actor} reorganized the estimate tree."

Unknown event type:
  "Activity recorded."
```

### 3.2 `composeSharedLinkActivity()`

```ts
import type { ActivityItem } from "@/lib/publication/actions";

export type ComposeSharedLinkOptions = {
  visibility?: "owner" | "client";
  recipientDisplayName?: string;   // Resolved recipient name
  recipientEmail?: string;         // Resolved email (for owner visibility only)
};

export function composeSharedLinkActivity(
  item: ActivityItem,
  opts: ComposeSharedLinkOptions = {}
): ActivityViewModel;
```

**Behavior:**
1. Determine `source` and `action` from `item.type` + (for decisions) `item.decision`
2. Resolve actor:
   - Comments: use `item.author` (email) → for owner, use as-is; for client, use "You" if matches session
   - Decisions: use `recipientDisplayName` or "Client"
   - Events: use "Client" or resolved recipient name
3. Build `target` from `item.estimate_id`/`item.row_id` context (TBD — may need location resolving)
4. Compose `title` based on type + decision
5. Set `body` from item.body (comments) or item.note (decisions)
6. Set `visibility` based on `item.is_internal`
7. Set badges: "Internal" for internal, "Approved"/"Declined"/"Revision"

**Decision-to-Action Mapping:**

```ts
const DECISION_ACTION_MAP: Record<string, ActivityAction> = {
  accepted: "approved",
  declined: "declined",
  revision_requested: "requested_revision",
};
```

**Sentence Templates:**

```
Comment (public):
  With location:
    "{actor} commented on {location}."
  Without location:
    "{actor} commented on the proposal."

Comment (internal):
  With location:
    "{actor} added an internal note on {location}."
  Without location:
    "{actor} added an internal note."

Decision (accepted):
  "{actor} approved the proposal."

Decision (declined):
  "{actor} declined the proposal."

Decision (revision_requested):
  "{actor} requested revisions."

Shared-link event (open):
  Known recipient:
    "{actor} viewed the proposal."
  Unknown:
    "Client viewed the proposal."

Shared-link event (password_attempt):
  "Client entered the shared link password."
  (Verify: is this surfaced in activity feed? May be owner-only or filtered.)

Unknown type:
  "Activity recorded."
```

---

## 4. Formatter Functions

### 4.1 `formatActivityFieldLabel()`

```ts
// src/lib/activity/activity-formatters.ts

export function formatActivityFieldLabel(field: string): string;
```

**Mapping:**

```ts
const FIELD_LABEL_MAP: Record<string, string> = {
  quantity: "Quantity",
  unitCost: "Unit cost",
  unit_cost: "Unit cost",
  miscCost: "Misc cost",
  misc_cost: "Misc cost",
  contingencyPercentage: "Adjustment",
  contingency_percentage: "Adjustment",
  discountPercentage: "Discount",
  discount_percentage: "Discount",
  lineTotal: "Line total",
  line_total: "Line total",
  material: "Material",
  supplier: "Supplier",
  unit: "Unit",
  linkState: "Library status",
  link_state: "Library status",
  sheetCode: "Sheet code",
  sheet_code: "Sheet code",
  name: "Name",
  description: "Description",
};

// Fallback: field.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
// Capitalize first letter
```

### 4.2 `formatActivityValue()`

```ts
export type FormatContext = {
  unit?: string;
  currency?: string; // Default "PHP"
  locale?: string;   // Default "en-PH"
};

export function formatActivityValue(
  field: string,
  value: unknown,
  context?: FormatContext
): string;
```

**Rules:**
- `null` or `undefined` → `"—"`
- `quantity`: `{number} {unit}` e.g., "5 sqm"
- `unitCost`, `miscCost`, `lineTotal`: `₱ {number with commas, 2dp}` e.g., "₱ 1,200.00"
- `contingencyPercentage`, `discountPercentage`: `{number}%` e.g., "10%"
- `linkState`: labels: `linked-clean` → "Using library values", `linked-overridden` → "Customized from library", `source-changed` → "Library source changed", `detached` → "Detached from library"
- Default: `String(value)`

### 4.3 `formatActivityActor()`

```ts
export function formatActivityActor(
  actorUserId: string | null,
  actorLabel: string | null,
  visibility: "owner" | "client",
  options?: { sessionEmail?: string; sessionRecipientName?: string }
): ActivityActor;
```

**Rules:**

| Condition | Owner view | Client view |
|-----------|-----------|------------|
| Resolved display name exists | `{displayName}` | `"Client"` or `{recipientName}` if matches session |
| Email only (no display name) | `{email}` | `"Client"` (never email) |
| No actor (system/backfill) | `"System/backfill"` | `"System"` |
| Unresolvable actor (UUID but no profile) | `"Unknown user"` | `"Client"` |

---

## 5. Visibility Filtering

```ts
// src/lib/activity/activity-visibility.ts

export function filterActivityForVisibility(
  events: ActivityViewModel[],
  visibility: ActivityAudience
): ActivityViewModel[];
```

**Rules:**
- `visibility === "client"`: 
  - Remove all items with `visibility === "internal"`
  - Strip `raw` field from all items
  - Anonymize actor emails (replace with "Client" or safe name)
- `visibility === "owner"`:
  - Keep all items including internal
  - Preserve `raw` field
- `visibility === "support"`:
  - Same as owner, plus additional debug metadata

---

## 6. Fallback Behavior

```ts
// src/lib/activity/activity-fallback.ts

export function createFallbackActivityViewModel(
  id: string,
  occurredAt: string,
  rawEventType?: string
): ActivityViewModel;

export function safeCompose<T extends ActivityViewModel>(
  composer: () => T,
  fallbackId: string,
  fallbackOccurredAt: string
): T;
```

**`safeCompose()`** wraps any compose call in try/catch:
- On success: returns composed view model
- On exception: logs error, returns `createFallbackActivityViewModel()` with safe default

---

## 7. Banned Terms (Must Never Appear in title, summary, or actor.displayName)

```
row_updated, row_replaced, row_deleted, row_added, row_blank_added
sheet_code_updated, sheet_metadata_updated
node_created, node_renamed, node_deleted_with_children
tree_reordered, template_inserted
revision_requested, accepted, declined
server_action, client, system (as event source)
metadata_json, sourceSnapshot, oldSnapshot, newSnapshot
changedFields, correlation_id, target_row_id, estimate_node_id
linked-clean, linked-overridden, source-changed, detached
COMMENT, DECISION, EVENT (uppercase type labels)
UUID patterns (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
"User <uuid>" pattern
```

---

## 8. Unit Test List (Implementation Reference)

See `08-test-strategy.md` for full test list. Key composer test categories:

1. Formatting: field labels, value formatting, actor formatting (~20 tests)
2. Compose estimate: one test per event type × normal case + edge cases (~40 tests)
3. Compose shared-link: one test per type × visibility + edge cases (~15 tests)
4. Visibility filtering: owner/client/internal stripping (~6 tests)
5. Fallback: unknown event type, exception handling (~5 tests)
6. Copy regression: banned terms absent (~15 tests)
7. Merged feed: interleaving, sorting (~3 tests)

Total: ~100+ composer unit tests.

---

## 9. File Paths (Reference During Implementation)

| Existing type | Imported from |
|--------------|---------------|
| `EstimateSheetHistoryEvent` | `@/lib/estimates/actions` (line ~127) |
| `ActivityItem` | `@/lib/publication/actions` (line ~1089) |
| `formatPeso` | `@/lib/utils` (if exists) or inline via `Intl.NumberFormat` |
| Profile types | `@/lib/supabase/types` |

**Do NOT import from:**
- Any `.tsx` file (avoids component coupling)
- Any route handler (avoids server-only imports in shared module)
- Any client component

---

## 10. Error Handling Contract

The composer must never throw to the caller. All errors are caught internally:

```ts
try {
  // ... compose logic ...
} catch (error) {
  console.error("[activity-composer] compose failed", {
    eventId: input.id,
    eventType: input.eventType ?? input.type,
    error: error instanceof Error ? error.message : String(error),
  });
  return createFallbackActivityViewModel(input.id, input.created_at, input.eventType);
}
```

---

## Cross-References

- See `02-activity-copywriting-system.md` for full copy templates
- See `03-data-contract-and-event-model-plan.md` for view model design rationale
- See `16-event-taxonomy-and-lifecycle-map.md` for event-to-action mapping
- See `20-edge-case-and-failure-mode-matrix.md` for edge case handling
