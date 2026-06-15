---
title: Express Components — Live Supabase Verification (Claude Deep Audit)
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M)
provider_project: ebxxqidacheyapmmzavr
method: read-only SQL + MCP advisors against the LIVE provider (not just migration files)
---

# Live Supabase Verification

This file records **live provider** ground truth captured during the audit, going
beyond the plan's own `evidence/live-supabase-evidence.md` (which was accurate but
incomplete). All queries were **read-only**. Project boundary respected: only
`ebxxqidacheyapmmzavr`. Captured at repo commit `72628d46`.

> Bottom line: the **database layer is materially more ready than the plan implies.**
> Both the insert and update RPCs already accept the full express field set, optimistic
> locking and correlation-id idempotency already exist, and the `link_state` enum already
> contains every value the plan uses. The only genuine DB change the default plan needs is
> narrowing the `row_blank_added` activity classification (an RPC migration). The plan's
> KTD7 "JSON is replaced wholesale" premise is **overstated** for routine field edits.

---

## 1. `estimate_row_items` actual columns (live)

| Column | Type | Nullable | Plan awareness |
|---|---|---|---|
| `id` | uuid | NO | ✓ |
| `estimate_id` | uuid | NO | ✓ |
| `node_id` | uuid | NO | ✓ |
| `sort_order` | integer | NO | ✓ |
| `source_library_item_id` | uuid | **YES** | ✓ |
| `source_snapshot` | jsonb | **YES** | ✓ |
| `material` | text | **NO (NOT NULL)** | partial — NOT NULL not called out |
| `description` | text | **NO (NOT NULL)** | partial |
| `supplier` | text | **NO (NOT NULL)** | partial |
| `unit` | text | **NO (NOT NULL)** | ✓ |
| `quantity` | numeric | NO | ✓ |
| `unit_cost` | numeric | NO | ✓ |
| `discipline` | text | **NO (NOT NULL)** | ✗ **never mentioned in plan** |
| `designation` | text | **NO (NOT NULL)** | ✗ **never mentioned in plan** |
| `link_state` | `estimate_row_link_state` enum | NO | ✓ |
| `metadata` | jsonb | NO | ✓ |
| `misc_cost` | numeric | NO | ✓ |
| `category_node_id` | text | YES | partial |
| `supplier_id` | uuid | YES | ✗ (plan treats supplier as text only) |
| `row_revision` | integer | NO (`> 0` check) | ✓ |
| `contingency_percentage` | numeric | NO (`-100..100` check) | called "adjustment" in doc 01 |
| `created_at`, `updated_at` | timestamptz | NO | n/a |

**Findings for the plan:**
- **No `category` column exists.** Doc 01 (`01-current-state-audit.md:15`) says the blank
  template sets `category "Unassigned"`. The real columns are `discipline`, `designation`,
  `category_node_id`. Verify what the template literally writes; correct the doc.
- **`discipline` and `designation` are NOT NULL and are never named in the plan.** The
  express template and the widened patch must account for them (the RPC defaults them to `''`,
  so this is not a blocker, but downstream grouping/dashboard may key on `discipline`).
- **`material`/`description`/`supplier`/`unit` are NOT NULL.** The RPCs coalesce missing
  values to `''` (or `'unit'`), so an express row with an empty name persists as `''` — but
  the plan should state this so the UI does not send `null`.
- **`supplier_id` (uuid FK) co-exists with `supplier` (text).** Doc 03 scopes supplier to
  inline text; the plan should note the FK exists and decide whether express rows ever set it.

## 2. `link_state` enum — all five plan values are REAL ✓

```
estimate_row_link_state = { unlinked, linked-clean, linked-overridden, detached, source-changed }
```

This **confirms** the plan's terminology. Every `link_state` value used across docs 01–06
(`unlinked`, `linked-clean`, `linked-overridden`, `detached`, `source-changed`) is a valid
enum label. The insert RPC defaults `link_state` to **`unlinked`** when not supplied, which
matches doc 02's choice that express rows use `link_state = "unlinked"`. **No invented enum.**

## 3. RLS — enabled and policy logic confirmed ✓

All four tables have `relrowsecurity = true`. Live policies:

| Table | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `estimate_row_items` | `is_platform_admin() OR can_edit_estimate(estimate_id) OR can_access_estimate(estimate_id)` | `is_platform_admin() OR can_edit_estimate(estimate_id)` |
| `cost_library_items` | member/editor/admin | editor/admin (`is_workspace_editor` / `is_platform_admin`) |
| `cost_library_item_price_options` | `is_workspace_member(workspace_id)` | **no direct write policy — writes are RPC-only (SECURITY DEFINER)** |
| `library_folders` | `is_workspace_member` | `is_workspace_editor` |

Plan's RLS claims (doc 01 §Live Supabase State, doc 02 table) are **accurate** (it omitted
`is_platform_admin` and the price-options "no direct write policy" nuance — minor).

## 4. `update_estimate_row_item_with_history` — corrects KTD7

Signature: `(target_project_id, target_estimate_id, target_row_id, expected_row_revision int, row_patch jsonb, acting_user_id, correlation_id)`.

**The RPC already writes the full express field set** (keyed on `row_patch ? 'field'`):
`quantity, unitCost, contingencyPercentage, miscCost, material, description, supplier, unit,
discipline, designation, linkState, categoryNodeId, supplierId, sourceLibraryItemId,
sourceSnapshot, metadata`. It bumps `row_revision + 1` and emits a `row_updated` event with a
computed `changed_fields` array over exactly those keys.

- **KTD7 ("the RPC replaces metadata/source_snapshot wholesale") is half-true and overstated.**
  The actual semantics:
  - `metadata = case when row_patch ? 'metadata' then coalesce(row_patch->'metadata','{}') else row_item.metadata end`
  - `source_snapshot = case when row_patch ? 'sourceSnapshot' then row_patch->'sourceSnapshot' else row_item.source_snapshot end`
  - i.e. **if the patch omits the key, the existing value is preserved.** Replacement only
    happens when you *send* the key. So **routine field edits that omit `metadata`/`sourceSnapshot`
    are already safe.** The merge concern applies *only* when you intentionally update a sub-key
    of `metadata`/`source_snapshot`. Correct U3/KTD7 to: "omit `metadata`/`sourceSnapshot` from
    routine field patches; build a fully server-merged object only when changing them."
- **Optimistic locking is real:** mismatched `expected_row_revision` raises
  `estimate_sheet_row_revision_conflict` (P0001) with `currentRowRevision` in the detail. This
  **validates** the plan's "rapid edits split into multiple RPCs can stale-conflict" risk
  (doc 05). Ordered, revision-aware commits (U3/R3/RSK2) are genuinely required.
- **Implication:** "Widen Row Update Contract" (U3) is **largely an app-layer typing change**
  (server action input at `actions.ts:80` + mutation hook), **not a migration.** Doc 04 U3
  hedges "`supabase/migrations/* only if RPC payload validation needs a compatibility change`"
  — live truth: **no migration needed for the update path.**

## 5. `insert_estimate_row_item_with_history` — confirms `row_blank_added`, needs migration to fix

- **Classification confirmed exactly as the plan claims:**
  `event_type = case when inserted_row.source_library_item_id is null then 'row_blank_added' else 'row_added' end`.
  Express rows are source-less, so **they would be recorded as `row_blank_added`** (RSK9 / U2 /
  U8 are **correct**). **Fixing this requires editing this RPC = a migration.** This contradicts
  the headline "no migration by default"; doc 05's escape clause covers it, but the messaging
  should be unified (see audit doc 01, finding on migration honesty).
- **Insert already accepts the full field set** (same columns as the update patch) and defaults
  `link_state` to `'unlinked'`, NOT-NULL text to `''`, numerics to `0`, `unit` to `'unit'`.
- **Idempotent by `correlation_id`:** `estimate_sheet_event_result(estimate_id, correlation_id)`
  short-circuits and returns the prior result. **The plan's draft-retry-dedup worry (U2/RSK)
  is already solved at the DB layer if the client reuses the correlation id** — the plan does
  not credit this existing mechanism.
- **Return includes `rowRevision`:** the RPC returns `'row', estimate_row_item_snapshot(inserted_row)`,
  and the snapshot includes `rowRevision`, `lineTotal`, `subTotal`, `contingencyValue`. So the
  A1/U2 worry "does insert return row_revision?" is a **DB non-issue**; it is purely whether the
  app-layer mutation surfaces it.

## 6. Promotion: `create_cost_library_component(workspace_id, component jsonb, price_options jsonb)`

- **Atomic within the library aggregate.** One SECURITY DEFINER plpgsql function (single txn)
  creates: `cost_library_items` row → price options → variant cost entries → variant attachments
  → sets `active_price_option_id` and back-fills item pricing → price history → state history →
  version 1. Returns `{ itemId, versionNumber, activePriceOptionId, priceOptions[] }`.
- **Preconditions the plan must satisfy:** requires non-empty `name` (raises "Component name is
  required"), **exactly one** `isDefault` price option, and a valid `library_folder_id`
  (validated by `validate_cost_library_component_refs`). **Doc 04 U7 / KTD4 do not specify which
  library folder an express promotion targets, nor that name must be non-empty** — both are gaps.
- **NOT idempotent by itself.** It mints a new `id` each call unless the caller passes a stable
  `component.id` (and a repeat with the same id would PK-conflict, not cleanly return). It also
  **does not touch `estimate_row_items`.** Therefore promotion = `create_cost_library_component`
  (txn A) **+** `update_estimate_row_item_with_history` relink (txn B) = **two transactions,
  not atomic across aggregates.** The plan's A7/U7/RSK8 concern is **valid and honest.** To make
  it safe, either (a) app-layer idempotency guard (check `metadata.expressComponent.promotedLibraryItemId`
  before create) + compensation if relink fails, or (b) a **new** wrapper RPC
  `promote_estimate_row_to_library(...)` for true cross-aggregate atomicity (a migration, again
  in tension with "no migration by default"). The plan should name `create_cost_library_component`
  explicitly and state which option it chooses.

## 7. Live data — back-compat is real, not hypothetical

```
total estimate_row_items ............ 127
source-less rows (no source_library_item_id) ... 31
  └ of which link_state='unlinked' .. 29
  └ source-less but NOT unlinked .... 2   ← edge state worth investigating
rows with metadata ? 'expressComponent' ... 0
link_state='detached' rows ......... 0
```

- **29 existing `unlinked` source-less rows** already exist. The plan's "legacy blank rows must
  remain readable" (RSK doc 05) and the projection rule "include rows that are unlinked but no
  longer blank placeholders" (doc 02) must classify these **real** rows correctly. The boundary
  between "legacy blank placeholder" (excluded) and "unlinked non-blank express-like row"
  (included) rests entirely on `isBlankEstimateRowItem` heuristics (placeholder material text /
  `manual-row-placeholder` tag). This needs an explicit, tested rule — see audit doc on data model.
- **2 source-less rows are not `unlinked`** (some other `link_state` with null source) — an
  inconsistent state the projection/classification logic should defensively handle.

## 8. Security advisors (live)

72 advisories, **0 ERROR**, all WARN. 71 are `authenticated_security_definer_function_executable`
(the codebase-wide posture: SECURITY DEFINER RPCs are executable by authenticated users and do
their own access checks). The 4 express-relevant RPCs (`insert_/update_/unlink_estimate_row_item_with_history`,
`create_cost_library_component`) sit in that same existing bucket. **The default (no-new-table)
plan introduces no new security advisory.** A new promotion RPC, if added, would inherit the same
WARN — acceptable and consistent, provided it performs `can_edit_estimate` + workspace-editor checks.

---

## Net effect on the plan's DB posture

| Plan position | Live verdict |
|---|---|
| No new table needed for requested scope | **Supported** ✓ |
| Update RPC too narrow → must widen | **Overstated** — RPC already wide; widen the *app layer* only |
| KTD7: JSON replaced wholesale, must server-merge | **Overstated** — omit the key and it's preserved; merge only when mutating metadata/snapshot |
| Express inserts mislabeled `row_blank_added` | **Confirmed** — and the fix needs an RPC migration |
| Promotion needs atomicity/idempotency | **Confirmed & honest** — library-create is atomic; cross-aggregate relink is not |
| `link_state="unlinked"` for express | **Confirmed** — real enum value + RPC default |
| RLS sufficient, no new provider blast radius | **Confirmed** ✓ |
| (unstated) discipline/designation/supplier_id/category_node_id columns | **Gap** — plan omits them |
| (unstated) correlation-id idempotency already exists | **Gap** — plan re-invents it |
| (unstated) 29 legacy unlinked rows already in prod | **Gap** — back-compat is concrete |
