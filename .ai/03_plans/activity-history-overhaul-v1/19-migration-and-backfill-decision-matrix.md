# 19 — Migration and Backfill Decision Matrix

**Date:** 2026-06-02  
**Status:** Second-pass proposed

---

## Purpose

Clarify whether database migrations are needed for V1, V1.1, and V2 of the Activity History human-readable system.

---

## Stance

- **V1 (human-readable projection): No migration required.** The composer is a pure projection layer that reads existing columns and produces view models. All current columns have sufficient data for rich human-readable copy.
- **V1.1/V2 (enriched activity, unified timeline, improved audit): Additive migrations required.** New columns and indexes are optional enhancements.
- **V3+ (activity search, cross-project timelines, analytics): May require dedicated activity warehouse/views.**

---

## Decision Matrix

| Need | Can V1 solve without migration? | Migration option | Risk | Recommendation |
|------|-------------------------------|-----------------|------|----------------|
| Human-readable copy for all 14 raw estimate event types (12 active + 2 dormant) | ✅ Yes — old/new snapshots, changed_fields, payload, row_context all present | None needed | None | No migration |
| Human-readable copy for shared-link comments | ✅ Yes — author_email, body, is_internal all present | None needed | None | No migration |
| Human-readable copy for shared-link decisions | ✅ Yes — decision, note, recipient_id present | None needed, but joining recipients table for name/email needed at query level | None | No migration — join at query level |
| Human-readable copy for shared-link events | ✅ Yes — event_type, metadata_json present | None needed | None | No migration |
| Resolved recipient names for decision actors | ⚠️ Partially — `recipient_id` FK exists; needs batched join to `shared_link_recipients` table | None needed for V1 batched lookup. Optional: denormalize `recipient_name`/`recipient_email` snapshot for performance | Low — query-level join adds latency on hot path | V1: batched join. V2: consider `recipient_name`/`recipient_email` snapshot on insert |
| `correlation_id` on shared-link tables | ❌ No column exists | Add `correlation_id uuid` column to `shared_link_comments`, `shared_link_responses`, `shared_link_events` | Low — additive column, nullable, no existing data to backfill | V2 recommendation |
| Unified activity pagination (single query across all sources) | ❌ No view/RPC exists | Create `project_activity_view` or `get_project_activity` RPC that unions all sources | Medium — new DB object, needs perf testing | V2 recommendation |
| Richer shared-link event metadata | ⚠️ Current `metadata_json` is unstructured | Add structured columns: `actor_email`, `actor_name`, `target_label`, `target_kind` | Medium — schema change to active table | V2 recommendation |
| Stable target references (comments tied to rows/nodes that may be deleted) | ⚠️ Partially — `row_id` FK is ON DELETE SET NULL | Add `row_context_snapshot` or `target_label` column to preserve label after deletion | Low — additive, similar to `row_context` pattern | V2 recommendation |
| Visibility classification on DB rows | ❌ No `visibility` column | Add `visibility` column (owner/client/internal) for query-level filtering instead of application-level | Medium — data migration for existing rows | V3 recommendation |
| Activity event insertion for recipient management (invite, remove, resend) | ❌ No events created | Create events in `shared_link_events` or new `shared_link_recipient_events` table | Low — new data, no backfill | V2 recommendation |
| Activity event insertion for decisions (accept_decision, decline_decision) | ❌ No events created (CHECK allows it, no insert) | Insert into `shared_link_events` when decision is submitted | Low — new data, no backfill; or remove from CHECK if not used | V2 decision: either start inserting or clean up CHECK |
| Backfill old events with missing snapshot data | N/A — V1 composer handles null snapshots gracefully | Not recommended — old events without snapshots will show fallback copy "changed {field}" without before/after | Low risk — old events are for reference only | No backfill needed for V1 |
| Backfill old events with missing node names | N/A — V1 composer handles missing names gracefully | Not recommended — old events show "an area" instead of specific name | Low risk | No backfill needed for V1 |
| Backfill old events with missing recipient names | N/A — old recipient records exist in `shared_link_recipients` | None — names are resolved at query time | None | No backfill needed |
| Backfill old events with `correlation_id` | N/A | Not possible — correlation IDs must be generated at event creation time | N/A | No backfill — old events remain ungrouped |
| Schema changes for future localization | N/A | Add `locale` column if multi-locale formatting needed; currently PH-only | Medium | V3 |

---

## Migration Risk Assessment

| Migration | Risk | Why |
|-----------|------|-----|
| Add `correlation_id` to shared-link tables | LOW | Additive, nullable, no backfill needed. Index optional. |
| Add `recipient_name`/`recipient_email` snapshot | LOW | Additive, nullable. Populated on insert only, no backfill. |
| Add `target_label`/`target_kind` snapshot | LOW | Additive, nullable. Populated on insert only. |
| Create `project_activity_view` | MEDIUM | New DB object, needs perf testing with production data volumes. |
| Add `visibility` column | MEDIUM | Requires data migration to classify existing rows ("owner" for all existing estimate events, "public"/"internal" for shared-link items). |
| Insert `shared_link_events` for decisions | LOW | New data, no existing rows to migrate. |
| Remove unused CHECK constraint values | LOW | If `comment_add`, `accept_decision`, `decline_decision` are never inserted, removing them from CHECK is safe if verified. |

---

## When Migration Becomes Necessary

| Trigger | Migration needed |
|---------|-----------------|
| Unified project activity timeline (V2) | Yes — view/RPC for merged pagination |
| Performance degradation on large activity feeds | Yes — indexes on new columns |
| Client-visible estimate change feed | Yes — visibility classification, possibly dedicated activity tables |
| Cross-project activity search | Yes — activity warehouse or denormalized search table |
| Activity analytics | Yes — dedicated analytics tables or materialized views |
| Multi-locale support | Yes — locale column on profile; locale-aware formatting stored or computed |

---

## V1 Implementation Without Migration

The V1 composer can produce rich copy using ONLY existing columns:

1. `estimate_sheet_events.old_snapshot` + `new_snapshot` → before/after values
2. `estimate_sheet_events.changed_fields` → field names to mention
3. `estimate_sheet_events.row_context` → material name, supplier, etc.
4. `estimate_sheet_events.payload` → node names, template IDs, counts
5. `estimate_sheet_events.total_delta` → cost impact badge
6. `estimate_sheet_events.actor_user_id` → resolved via profiles table
7. `shared_link_comments.author_email` → comment author
8. `shared_link_comments.body` → comment content
9. `shared_link_comments.is_internal` → visibility filter
10. `shared_link_responses.decision` → action type
11. `shared_link_responses.note` → decision justification
12. `shared_link_responses.recipient_id` → join to `shared_link_recipients` for name/email
13. `shared_link_events.event_type` → action type
14. `shared_link_events.metadata_json` → contextual data (minimal for now)

**Verdict: Sufficient for V1 human-readable projection. No migration required.**

---

## Cross-References

- See `03-data-contract-and-event-model-plan.md` for view model design
- See `04-implementation-plan.md` for phased implementation
- See `06-performance-analysis-plan.md` for performance implications of migration
