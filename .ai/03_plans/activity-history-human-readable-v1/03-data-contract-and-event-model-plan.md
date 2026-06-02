# 03 — Data Contract and Event Model Plan

**Date:** 2026-06-02 (second pass: 2026-06-02)  
**Status:** Proposed (pending approval) — Second pass: added ActivityAudience, ActivityVisibility, ActivityActor, ActivityTarget, ActivityChange types. Corrected shared-link event_type handling. Noted migration stance nuance.

---

## 1. Current Model Assessment

### estimate_sheet_events — Strong Foundation

The current `estimate_sheet_events` table provides:
- `old_snapshot` / `new_snapshot` — JSONB diffs (nullable but present for most events)
- `changed_fields` — string array of changed field names
- `total_delta` — numeric cost delta
- `correlation_id` — groups related events from same action
- `payload` — JSONB for event-type-specific metadata (node name, template ID, reorder count)
- `row_context` — JSONB containing material name, supplier, etc.
- `actor_user_id` — FK to auth.users (nullable)
- `created_at` — timestamptz

**Verdict: Sufficient for rich human-readable copy for all 13 event types.** No schema changes needed.

### shared_link_comments, shared_link_responses, shared_link_events — Good, Minor Gaps

**shared_link_comments:**
- `author_email`, `body`, `is_internal`, `created_at`, `estimate_id`, `row_id`
- Sufficient for comment activity. No schema changes needed.

**shared_link_responses:**
- `decision` (enum: accepted/declined/revision_requested), `note`, `created_at`, `recipient_id`
- Missing: resolved recipient name/email for display in activity feed without extra join
- **Gap:** No correlation_id for grouping with related events

**shared_link_events:**
- `event_type`, `metadata_json`, `created_at`, `recipient_id`
- **Gap:** `metadata_json` is unstructured. No actor context. `open` event records no meaningful metadata.
- **Gap:** No correlation_id for grouping

---

## 2. Proposed Central View Model

```ts
type ActivityViewModel = {
  id: string;
  source: "estimate" | "share" | "comment" | "decision" | "system";
  visibility: "owner" | "client" | "internal";

  // Actor
  actorLabel: string;
  occurredAt: string; // ISO 8601

  // Target object
  object: {
    type: "row" | "sheet" | "node" | "proposal" | "comment" | "recipient" | "system";
    label: string;      // Human-readable target name
    context?: string;   // Location context (e.g., "Living Area")
  };

  // Action
  action:
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
    | "deleted";

  // Changes (for "changed" actions)
  changes?: Array<{
    field: string;       // Raw field name
    label: string;       // Human-readable field label
    oldValue?: string;   // Formatted old value
    newValue?: string;   // Formatted new value
  }>;

  // Primary copy
  title: string;         // Complete primary sentence

  // Context copy
  summary: string;       // One-line summary / secondary text
  meta: string;          // Timestamp, location, actor context line
  delta?: {              // Cost delta (if applicable)
    value: number;
    formatted: string;
  };

  // Audit facts (expandable)
  facts: Array<{
    label: string;
    previous?: string;
    current?: string;
  }>;

  // Visual hints
  badges?: string[];     // e.g., ["Internal", "Approved", "New"]

  // Comment/note body (for comment/decision events)
  body?: string;

  // Raw reference (owner-only, not client-visible)
  raw?: {
    eventType?: string;
    eventSource?: string;
    correlationId?: string;
    eventId?: string;
    actorUserId?: string;
  };
};
```

---

## 3. Model Evaluation Against Current Codebase

### Does the proposed model fit?

**Yes, with minor adjustments:**

1. The `source` field maps cleanly to existing data sources:
   - `"estimate"` → `EstimateSheetHistoryEvent`
   - `"comment"` → `shared_link_comments`
   - `"decision"` → `shared_link_responses`
   - `"share"` → `shared_link_events`

2. The `action` field provides a normalized verb across all sources — this is the key unification.

3. The `title` field is the composed primary sentence — never raw event_type.

4. The `raw` field preserves audit data for owner-only views without leaking to clients.

### What needs adjustment from the prompt's proposed model?

1. **The prompt's model is solid.** The `action` union is complete. The `changes` array handles multi-field updates. The `facts` array handles audit. The `badges` field enables visual differentiation.

2. **One addition:** `body` field for comment/decision note text — not in prompt's model but needed.

3. **`delta` extraction:** The prompt places delta info in meta. I prefer a structured `delta` field for badge rendering.

---

## 4. Composer Functions

### Proposed Module: `src/lib/activity/activity-view-model.ts`

```ts
// Core composers
function composeEstimateActivity(
  event: EstimateSheetHistoryEvent,
  opts: { visibility?: "owner" | "client" }
): ActivityViewModel;

function composeSharedLinkActivity(
  item: ActivityItem,
  opts: { visibility?: "owner" | "client" }
): ActivityViewModel;

// Field/value formatters
function formatActivityFieldLabel(field: string): string;
function formatActivityValue(
  field: string,
  value: unknown,
  context?: ActivityFormatContext
): string;
function formatActivityActor(
  actorUserId: string | null,
  actorLabel: string | null,
  visibility: "owner" | "client"
): string;

// Visibility filtering
function filterActivityForVisibility(
  events: ActivityViewModel[],
  visibility: "owner" | "client" | "internal"
): ActivityViewModel[];

// Combined activity feed
function mergeActivityFeeds(
  estimateEvents: ActivityViewModel[],
  shareActivity: ActivityViewModel[]
): ActivityViewModel[];
```

### Why `src/lib/activity/`?

- It's a shared library, not a component or route
- It produces structured data, not React components
- It can be imported by server actions, API routes, and client components
- It's testable independently of UI

---

## 5. Key Design Decisions

### Decision 1: Where should formatting happen?

**Recommendation: Server-side for public API, shared library for both server and client.**

- Public API route (`GET /api/share/[token]/activity`) should return **already-composed** `ActivityViewModel[]` — the response is the formatted product.
- Owner server action (`loadSharedLinkActivity`) can return raw + composed, or composed-only since owners also deserve human-readable copy that they can expand for audit details.
- Estimate history formatting should stay client-side (to preserve reactivity with filters, scope, and pagination) but use the shared composer module.

**Reasoning:** Public API should not return raw data that then needs reformatting on the client — that defeats the purpose of the API as a contract. But the estimate history modal has complex filtering/grouping/pagination that benefits from client-side composition using the same formatting library.

### Decision 2: Should public API return raw events, formatted events, or both?

**Recommendation: Formatted only. Never both for public route.**

The public route currently returns a union of raw comment/decision/event shapes. It should return `ActivityViewModel[]` where each item is already:
- Human-readable sentence as `title`
- Formatted values in `changes[]`
- Client-safe actor labels
- No raw IDs, no raw event types, no internal metadata

**Should NOT include `raw` field for client visibility.**

### Decision 3: How to prevent public/client leakage?

1. `composeSharedLinkActivity()` accepts `visibility` parameter
2. `visibility: "client"` strips `raw` field entirely
3. `visibility: "client"` filters out `visibility === "internal"` items entirely
4. `visibility: "client"` anonymizes actor labels
5. Server-side enforcement: the composition function is the single gate.

### Decision 4: How to preserve audit fidelity?

- `raw` field is present in `ActivityViewModel` only when `visibility !== "client"`
- Audit facts (the `facts[]` array) contain formatted diff values but no raw UUIDs
- The internal event ID, correlation ID, and event type live only in `raw`
- The database row remains untouched — the view model is a projection, not a replacement

### Decision 5: How to handle unknown event types?

- `composeEstimateActivity()` has a catch-all fallback
- Fallback title: `"Activity recorded."`
- Fallback summary: `"An activity event was recorded but the details are not available."`
- Fallback facts: Whatever fields are present
- `raw.eventType` is preserved for debugging

### Decision 6: How to handle old events with incomplete snapshots?

- Check for null `oldSnapshot` / `newSnapshot` before accessing fields
- If both are null, omit "from X to Y" clause — just show "changed {field}"
- If one is null, show only the available side: "changed... to X" or "changed... from X"
- Graceful fallback title structure handles this automatically

### Decision 7: How to handle future event types?

- The `action` union covers current needs
- New event types from `estimate_sheet_events` fall into the catch-all handler
- New decision types would need a new `action` value — add to the union
- The composer is extensible: add a new case in the switch/if chain

### Decision 8: How to handle localization/currency/unit formatting?

**Phase 1 (MVP): Philippines locale only, PHP currency only.**
- Currency: `formatPeso()` using `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`
- Numbers: `Intl.NumberFormat("en-PH")` with appropriate fraction digits
- Percentages: append `%` after formatted number
- Units: from snapshot `unit` field (e.g., "sqm", "pcs")

**Phase 2 (future):** Extract locale from user profile. Add locale-aware formatters.

### Decision 9: How to avoid duplicating copy logic between estimate and shared-link?

**The `ActivityViewModel` type and composer functions are the single source of truth.**

- `EstimateSheetContent.tsx` imports from `src/lib/activity/` for formatting
- `SharedLinkActivityFeed.tsx` imports from `src/lib/activity/` for formatting
- `GET /api/share/[token]/activity` uses composer server-side
- `loadSharedLinkActivity` can optionally return composed items
- The copy dictionary (`formatActivityFieldLabel`, etc.) lives in the library module

---

## 6. Type Connections to Existing Code

| Existing Type | Composer Function | Output |
|---|---|---|
| `EstimateSheetHistoryEvent` (from `actions.ts:127`) | `composeEstimateActivity()` | `ActivityViewModel` |
| `ActivityItem` (from `publication/actions.ts:1089`) | `composeSharedLinkActivity()` | `ActivityViewModel` |
| `PublicActivityItem` (from API route) | **Replaced** — API route returns `ActivityViewModel[]` directly |
| `LoadActivityResult` (from `publication/actions.ts:1099`) | Can optionally include composed items alongside raw |

---

## 7. Migration Path

**V1: No database migration required.** The view model is a projection layer using existing columns. All composer functions read from current schema.

**V2/V3: Additive migrations likely needed.** See `19-migration-and-backfill-decision-matrix.md` for detailed analysis.

1. Add `src/lib/activity/` with all types and composer functions
2. Import in existing UI components and API routes
3. Replace inline copy logic incrementally

**Note on migration stance:** First pass stated "No database migration required" as definitive. Second pass clarifies: true for V1 copy-only work. V2 features need additive migrations. See `19-migration-and-backfill-decision-matrix.md`.

---

## 8. Open Questions for Approval

1. Should `loadSharedLinkActivity` return pre-composed `ActivityViewModel[]` or keep returning `ActivityItem[]` and let the client compose? (Recommendation: let client compose for consistency with estimate history pattern)
2. Should the public API return `ActivityViewModel[]` with the `title` already computed, or just the structured data? (Recommendation: pre-computed title — it's the API's job to provide the presentable data)
3. Should the `raw` field be completely absent in client visibility, or present but with values redacted? (Recommendation: completely absent — don't send data you don't want leaked)
