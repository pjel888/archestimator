# Archestimator Project & Estimate Versioning System

**Date:** 2026-05-29<br />
**Status:** Implemented / Active<br />
**Purpose:** Outlines the architecture for tracking edits, audits, revisions, and structural history inside estimate sheets.

---

## 1. Database-Level History Engine

Archestimator uses an **append-only event logging model** instead of destructive database updates. Transactions are wrapped in history-recording RPCs that write metadata to `estimate_sheet_events` in the same transaction as the raw table mutations.

### Table: `estimate_sheet_events`
Every create, update, delete, rename, or reorder writes a row to this ledger:
*   `id`: unique event uuid.
*   `estimate_id`: parent estimate.
*   `actor_user_id`: references the editor's profile.
*   `event_type`: describes the action (`row_created` | `row_updated` | `row_deleted` | `node_created` | `node_renamed` | `node_deleted` | `tree_reordered` | `template_applied`).
*   `old_snapshot` / `new_snapshot`: JSON logs capturing changed values.
*   `changed_fields`: array of fields affected by edits (e.g. `['quantity', 'misc_cost']`).
*   `total_delta`: numeric shift in the estimate sheet grand total.
*   `correlation_id`: client-provided token to group related events.

---

## 2. Row Revision Conflict Protection

To prevent concurrent editors from overwriting sibling changes:
*   Each row in `estimate_row_items` contains a `row_revision` integer (defaults to `1`).
*   Edits to cost inputs (quantity, contingency, misc cost) send the client's current `expectedRowRevision`.
*   The database update fails if the current `row_revision` in storage does not match the client's expected revision (optimistic concurrency lock).
*   Successful edits increment the `row_revision` count atomically.

---

## 3. Transaction-Safe History RPCs

Mutations bypass generic updates and invoke Postgres functions to write audit logs safely:
*   `public.create_estimate_node_with_history()`: creates nodes and logs a `node_created` event.
*   `public.rename_estimate_node_with_history()`: updates titles and logs a `node_renamed` event.
*   `public.insert_estimate_template_into_estimate()`: copies template nodes/rows and logs a `template_applied` event.

---

## 4. UI Layer: Unified Activity History Modal

History browsing is exposed via the **Activity History Modal** triggered from the estimate sheet header.

### 4.1 Scope Tree Navigation
*   The modal features a left-side hierarchy tree representing the estimate structure.
*   Selecting a node in this tree filters the right timeline list to that node's scope (including descendant events).
*   The tree utilizes shared workshop tree row styles but hides cost totals to keep focus on historical audits.

### 4.2 Timeline Ledger
*   **Day Grouping:** Events are grouped under static date headers.
*   **Audit Cards:** Detail the event action, actor avatar/label (e.g., Philip Lewis, or System/backfill fallbacks), and time.
*   **Diff Indicators:** Shows structured tables displaying Previous vs. Current values with formatted labels (e.g. `Quantity: 10 -> 12`, `Misc Cost: PHP 0 -> PHP 1,500`).
*   **Component Snapshot Cards:** Component replacements or creations display thumbnail previews, manufacturer details, and pricing parameters.
*   **Cursor Pagination:** Queries are retrieved in blocks with validated `(created_at, id)` cursors, displaying a "Load more" trigger for older logs.
