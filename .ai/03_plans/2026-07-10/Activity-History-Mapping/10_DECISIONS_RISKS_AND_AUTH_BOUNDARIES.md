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

### DEC-AUTO-003: D1 row restore — implement vs remove

```text
Question: Should restore_deleted_estimate_rows_with_history be implemented or removed?
Affected IDs: REQ-003, UNIT-002
Evidence and freshness: d1-action-client.ts:2404-2406 (hard throw), use-estimate-row-mutations.ts:1044 (2026-07-10)
Options:
  A. Implement D1 row restore from old_snapshot (mirroring node restore).
  B. Remove the stub and reconcile the UI to use the existing optimistic/in-memory restore path only.
  C. Keep the stub with a clear "not implemented" error message.
Decision: B — remove the stub and document the current restore path. If the optimistic path proves insufficient, implement D1 row restore as a new unit.
Why this option:
  - The existing row-restore mutation (`restoreDeletedRowsMutation`) already works for the toast-undo path.
  - Implementing D1 row restore is significant work (old_snapshot reconstruction, collision guards, batch limits) for unclear current value.
  - The throw is misleading — it suggests the feature is partially built when it isn't.
Rejected alternatives:
  A: Significant implementation effort for unclear MVP value. Node restore covers the harder case (subtree reconstruction).
  C: A misleading stub is worse than an honest removal.
Confidence: Medium. If users report that row restore from the Activity History modal (not just toast undo) is needed, escalate to implementation.
Consequences: The UI row-restore button in the Activity History modal may need to use the same path as the toast undo, or be hidden if no restore path exists for the event type.
Rollback/revision trigger: User feedback or QA finding that row restore from history is needed.
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

### DEC-AUTO-005: Shared-link interaction improvements are P2

```text
Question: When should owner-reply, comment-edit/delete, and decision-reset be implemented?
Affected IDs: REQ-008, UNIT-007
Evidence and freshness: See 07_SHARED_LINK_AND_CLIENT_COLLABORATION.md §8 (2026-07-10)
Options:
  A. Include in MVP (P0/P1).
  B. Defer to post-MVP (P2).
Decision: B — defer to post-MVP.
Why this option: The current comment/decision system is complete and hardened for the core MVP flow (client views, comments, decides). Owner-reply, edit/delete, and decision-reset are enhancements that add complexity (threading, mutation semantics, audit trail for edits). MVP users can work without them.
Confidence: Medium. If beta users specifically request these, escalate.
Responsible role: Lead architect.
```

## Risk Register

| ID | Status | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|---|
| RISK-001 | OPEN | Normalization map becomes stale when new event types are added without updating it | Medium — new events render as generic fallback | Medium — requires developer discipline | Add a contract test that asserts every event type in the write layer has a mapping entry |
| RISK-002 | OPEN | The legacy Supabase read path (`fetchEstimateSheetVersionControl` via `dataStore`) and the D1 path diverge | High — events recorded via D1 but read via Supabase would be invisible | Low — likely both point at D1 after migration | UNIT-004 verifies the dataStore binding |
| RISK-003 | OPEN | Concurrent agents editing `d1-action-client.ts` and `activity-composer.ts` simultaneously | Medium — merge conflicts | Medium — both are high-traffic files | File-scope ownership in UNIT packets; serialize shared-contract edits |
| RISK-004 | MITIGATED | Named-version revival without approved slice | High — violates VALIDATION_MATRIX constraint | Low — DEC-AUTO-004 explicitly keeps the prohibition | Documented; filter remains in place |
| RISK-005 | OPEN | Dual project-activity repositories create maintenance burden | Low — both work, just divergent | High — already divergent | P2 consolidation in UNIT-006 |
| RISK-006 | OPEN | Hardcoded actor email→name mapping in project-activity-repository.ts:156 | Low — cosmetic | Low — only affects one user | Noted for cleanup |
| RISK-007 | OPEN | Bulk-delete row restore is broken and users may expect it | Medium — data loss perception | Medium — bulk delete is a common operation | UNIT-002 fixes this; P0 priority |

## Authorization Boundaries

This pack is planning-only. No `AUTH-*` boundaries are needed for the planning stage. All implementation is local (`IMPLEMENT_LOCAL`).

### Future AUTH (for UNIT-008 hosted proof)

If `UNIT-008` requires hosted D1 proof or provider mutations, it will need:
- Standing Cloudflare-resource authorization (granted in `AGENTS.md` for bound resources).
- Hosted proof artifacts for shared-link activity changes.
- No production deploy without explicit owner approval.

These are runtime evidence requirements, not planning-stage gates.
