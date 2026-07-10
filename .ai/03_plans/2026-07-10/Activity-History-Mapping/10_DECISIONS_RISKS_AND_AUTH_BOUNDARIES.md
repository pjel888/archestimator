# 10 - Decisions, Risks, And Authorization Boundaries

## Decisions (DEC-AUTO-*)

### DEC-AUTO-001: Read-side normalization for event-type vocabulary

```text
Question: How should the event-type naming split be fixed — change all write sites or normalize on read?
Affected IDs: REQ-001, REQ-002, REQ-005, UNIT-001
Evidence and freshness:
  - Write layer verified at d1-action-client.ts:1140-2407 (2026-07-10)
  - Read layer verified at actions.ts:951-971 (2026-07-10)
  - UI vocabularies verified at activity-history.tsx:40-60, activity-copy-dictionary.ts:3-28 (2026-07-10)
Options:
  A. Read-side normalization function that maps all variant spellings to canonical UI names.
  B. Change all ~31 write sites to emit canonical non-prefixed names.
  C. Change UI to accept both prefixed and non-prefixed names.
Decision: A — read-side normalization function.
Why this option:
  - Single change point (read path) vs ~31 write-site changes.
  - No data migration of existing rows required.
  - Backward-compatible with all historical data.
  - Testable with a comprehensive mapping table.
  - Future write sites automatically benefit as long as they add to the map.
Rejected alternatives:
  B: Requires touching 4 files at ~31 sites, risks introducing bugs at each, leaves historical rows needing migration.
  C: Doubles the vocabulary surface in the UI, makes filter matching ambiguous, and doesn't solve the "generic fallback" problem for the composer.
Confidence: High.
Consequences: A normalization function must be maintained as new event types are added. The function must be applied at EVERY read boundary (estimate-sheet modal, project feed, shared-link feed).
Rollback/revision trigger: If a new event type is added without updating the map, it will render as generic fallback — same as today. The map should be the single source of truth.
Responsible role: Lead architect.
```

### DEC-AUTO-002: Restore guard sets use canonical names post-normalization

```text
Question: Should the restore guard sets (RESTORABLE_ROW_DELETE_EVENT_TYPES, RESTORABLE_NODE_DELETE_EVENT_TYPES) use the canonical UI names or the raw DB names?
Affected IDs: REQ-002, UNIT-001, UNIT-002
Evidence and freshness: activity-history.tsx:220-221, d1-action-client.ts:1493,2060 (2026-07-10)
Options:
  A. Use canonical names and ensure normalization happens before the guard check.
  B. Add raw DB names to the guard sets.
Decision: A — use canonical names with normalization before the guard.
Why this option: Consistent with DEC-AUTO-001. One vocabulary everywhere in the UI layer. The normalization function is the single translation point.
Rejected alternatives: B creates a dual-vocabulary in the UI layer and is fragile if write-side names change.
Confidence: High.
Consequences: The normalization function must run before restore-guard evaluation.
Rollback/revision trigger: If normalization is incomplete, restore buttons won't appear — same as today.
Responsible role: Lead architect.
```

### DEC-AUTO-003: Implement durable D1 row restore

```text
Question: Should restore_deleted_estimate_rows_with_history be implemented or removed?
Affected IDs: REQ-003, UNIT-002
Evidence and freshness: d1-action-client.ts:2404-2406 (hard throw), use-estimate-row-mutations.ts:1044 (2026-07-10)
Options:
  A. Implement D1 row restore from old_snapshot (mirroring node restore).
  B. Remove the stub and reconcile the UI to use the existing optimistic/in-memory restore path only.
  C. Keep the stub with a clear "not implemented" error message.
Decision: A — implement D1 row restore from the event `old_snapshot`, mirroring
the node-restore transaction and authorization model.
Why this option:
  - The Activity History modal already advertises restore as a user outcome.
  - A toast-only in-memory path cannot recover after navigation or reload.
  - The stored snapshot is the durable fact required for deterministic recovery.
Rejected alternatives:
  B: Removing the path contradicts the existing restore affordance and loses
  post-navigation recovery.
  C: Keeping a throwing dispatch entry is not an honest executable contract.
Confidence: High after current route/UI/source characterization.
Consequences: UNIT-002 owns authorization, row-ID collision refusal, batch cap,
atomic insert plus history receipt, idempotent replay, and malformed/missing
snapshot denial tests. Failure returns a typed non-destructive error.
Rollback/revision trigger: If legacy snapshots cannot be reconstructed, those
events remain visibly unrestorable; the durable path is not replaced by guessed data.
Responsible role: Lead architect.
```

### DEC-AUTO-004: Keep dormant named-version filtering in place

```text
Question: Should the dormant sheet_version_created / sheet_restored_as_copy event types and their filters be cleaned up?
Affected IDs: N/A (constraint acknowledgment)
Evidence and freshness: VALIDATION_MATRIX.md:289 prohibits revival without new approved slice (2026-07-10)
Options:
  A. Remove the dormant types from filters, dictionary, and composer (dead code cleanup).
  B. Keep them as-is (they're filtered out of reads anyway).
Decision: B — keep as-is. The prohibition is on REINTRODUCING the feature, not on keeping the type definitions. Removing them is low-value cleanup that could confuse a future revival effort.
Why this option: The types are already filtered out of every read path. They cause no user-visible harm. Removing them adds risk for zero MVP value.
Confidence: High.
Responsible role: Lead architect.
```

### DEC-AUTO-005: Publisher owns public interaction mutation

```text
Question: Which pack owns owner-reply, comment edit/delete, and decision reset?
Affected IDs: REQ-008, UNIT-007
Evidence and freshness: See 07_SHARED_LINK_AND_CLIENT_COLLABORATION.md §8 (2026-07-10)
Options:
  A. Include in MVP (P0/P1).
  B. Defer to post-MVP (P2).
Decision: Publisher-And-Shared-Pages exclusively owns the public routes,
publication repository/actions, and shared-page UI. Activity consumes the
resulting immutable event contract only; REQ-008 is deferred here and UNIT-007
is superseded.
Why this option: It eliminates overlapping writers. Any future edit/delete/reset
is represented as an append-only tombstone/reset event; historical decision rows
are never destructively deleted to make the UI look reset.
Confidence: High.
Responsible role: Publisher integrator for mutation; Activity integrator for read/composition.
```

### DEC-AUTO-008: One bounded propagation event, complete revision facts

Project-component fan-out records one source event containing a bounded list of
authorized affected row IDs and typed before/after facts. Oversized fan-out is
chunked under one correlation ID. This preserves audit and revision truth without
an unbounded event-per-row explosion. The UI shows the count and authorized rows.

### DEC-AUTO-009: Compliance work is executable, export remains deferred

Actor fallback, workspace isolation, retention integration, and durable event
write/reconciliation are first-user requirements owned by UNIT-012. Audit-log
CSV/JSON/PDF export is useful but remains a separately traceable deferred
requirement and cannot block this implementation slice.

## Risk Register

| ID | Status | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|---|
| RISK-001 | OPEN | Normalization map becomes stale when new event types are added without updating it | Medium — new events render as generic fallback | Medium — requires developer discipline | Add a contract test that asserts every event type in the write layer has a mapping entry |
| RISK-002 | CLOSED | The history read path was mislabeled as legacy Supabase | High | Resolved by current source recheck | `fetchEstimateSheetVersionControl` constructs the D1 action client; retain a regression source check |
| RISK-003 | OPEN | Concurrent agents editing `d1-action-client.ts` and `activity-composer.ts` simultaneously | Medium — merge conflicts | Medium — both are high-traffic files | File-scope ownership in UNIT packets; serialize shared-contract edits |
| RISK-004 | MITIGATED | Named-version revival without approved slice | High — violates VALIDATION_MATRIX constraint | Low — DEC-AUTO-004 explicitly keeps the prohibition | Documented; filter remains in place |
| RISK-005 | OPEN | Dual project-activity repositories create maintenance burden | Low — both work, just divergent | High — already divergent | `UNIT-008` tracks `REQ-017`/`AC-026` as deferred and rejects undeclared consolidation edits; no current READY implementation unit owns it |
| RISK-006 | OPEN | Hardcoded actor email→name mapping in project-activity-repository.ts:156 | Low — cosmetic | Low — only affects one user | Noted for cleanup |
| RISK-007 | OPEN | Bulk-delete row restore is broken and users may expect it | Medium — data loss perception | Medium — bulk delete is a common operation | UNIT-002 fixes this; P0 priority |
| RISK-008 | OPEN | A domain mutation can commit while a separate history insert fails | High — silent audit gaps | Medium | UNIT-012 uses same-D1 batch/outbox semantics plus reconciliation and crash-window tests |
| RISK-009 | OPEN | A missing workspace predicate can expose activity across tenants | Critical | Low | Mandatory workspace-scoped repository APIs and cross-workspace denial tests in UNIT-012 |

## Authorization Boundaries

This pack is planning-only. No `AUTH-*` boundaries are needed for the planning stage. All implementation is local (`IMPLEMENT_LOCAL`).

UNIT-008 may collect local and authorized bound-resource proof under the standing
Cloudflare mandate. Production deployment is outside this package action ceiling
and is handed to `Release-Integrity-And-Golden-Path`; it is not an internal owner
question and does not block local implementation completion.
