# Publication & Version Truth

> Companion to `commercial-truth-model.md` §8-9. Records what is snapshotted,
> what stays live, and how comments/decisions bind to a version.

## What is snapshotted at publish time

`buildProjectPublicationSnapshot` (`src/lib/publication/snapshot.ts:594`)
builds a frozen JSON document, schemaVersion `1.6`:

- **Project block:** `id, name, projectCode, clientName, location` (sanitised
  by `locationVisibility`), `currencyCode, senderName,
  showArchestimatorBranding, coverImageUrl`.
- **Per estimate** (`buildSnapshotEstimate:530`): `id, name, sheetCode,
  updatedAt, rowCount, totalCost, totalCostMinorUnits, rows, treeNodes, tabs`.
  - `totalCostMinorUnits` is INTEGER canonical.
  - `totalCost` is REAL derived for display.
- **Per row** (`buildSnapshotRow:271`): every cost input field PLUS the
  **canonical recomputed** `rowTotal` and `rowTotalMinorUnits` from
  `computeEstimateRowCostParts`. Also `calculationVersion`,
  `calculationBasis: "proposal_included_direct"`, `currencyCode`,
  `scopeStatus`, `imageUrl`, `nodeId`, category path, component/variant
  anchors.
- **Per tab** (`buildSnapshotEstimateTab:507`): `rowCount, totalCost,
  totalCostMinorUnits, rowIds, treeNodes`.
- **Top-level totals:** `totalCost` and `totalCostMinorUnits` summed from
  per-estimate minor units.
- **Scope filter:** only `scopeStatus === "included"` rows are snapshotted.
  `excluded` and `by_owner` are dropped at publish.
- **Opaque ID hashing:** every internal UUID is mapped to `proj_/est_/row_/...`
  opaque tokens via `createOpaqueSnapshotId`. Public reads re-map via
  `createPublicationSnapshotIdMaps`.

## What stays live vs frozen

- **Live data:** `estimate_row_items, estimate_nodes, estimate_tabs,
  cost_library_items, estimate_templates`. Mutated by user actions; optimistic
  guards (`row_revision`, `current_version_number`) protect concurrent edits.
- **Frozen snapshots:** `estimate_template_versions` (trigger-immutable),
  `cost_library_item_versions` (trigger-immutable),
  `project_publications.snapshot_json` (immutable by row replacement),
  `client_portal_issues.decision_policy_snapshot_json` (immutable).

## Whether a later edit changes a shared artifact

**No.** The publication snapshot is immutable post-publish. The publisher
refresh path (`publication/actions.ts:700-790`) rebuilds a NEW snapshot only
when `normalizePublicationSourceRevision(...) === sourceRevision` AND the user
explicitly re-publishes. Editing estimate rows after publish does NOT change
the published artifact until a new issue is created.

## Stale-snapshot signaling

- Every estimate write batch includes
  `buildProjectPublicationRevisionForEstimate(projectId, workspaceId,
  estimateId)` — bumps `projects.publication_source_revision += 1` only if the
  estimate still belongs to the project. This is the invalidation signal.
- The share page calls `readPublicationRevisionStaleness`
  (`publication/source-revision.ts:10`) and surfaces `staleSnapshotWarning`
  when `currentSourceRevision > issued sourceRevision`.

## Publication replace vs rotate

- **Replace** (`admin-d1-client.ts:522`): atomic 2-statement batch — UPDATE
  old row to `'revoked'` (guarded by source revision) + INSERT new row at
  `snapshot_version = MAX + 1`. `results[1].meta.changes === 0` throws
  `"Publication source changed before commit. Publish again."` — the
  optimistic concurrency control.
- **Rotate credentials** (`admin-d1-client.ts:664`): atomic 2-statement batch —
  UPDATE publication IN PLACE for new token/snapshot/password (guarded by
  source revision + old encrypted_token) + UPDATE
  `shared_link_recipients.recipient_token_hash` to
  `'revoked:'+publication_id+':'+id+':'+nextVersion`. FK-bound recipients are
  preserved (the MOD-ROT-01 pattern).

## Comments / decisions binding

- Client Portal decisions (`client_portal_decisions`) carry
  `UNIQUE(recipient_id, idempotency_key)` and a partial UNIQUE active decision
  per `issue+recipient`. `voided_at` and `supersedes_decision_id` support
  decision revision.
- Comments bind to the publication snapshot via `publication_id`; they do not
  bind to a specific `snapshot_version` (the publication row IS the version).
- A later re-publish creates a new `snapshot_version` on the same publication
  row (replace) — comments survive because they reference `publication_id`,
  not `snapshot_version`.

## Publication-related findings

- **F-06:** `client_portal_issues.total_cost` is REAL NOT NULL. Should be
  minor-unit INTEGER at rest to match the snapshot's canonical money.
- **D-12:** Client Portal financial sections fall back to
  `Math.round(rowTotal * 100)` when `rowTotalMinorUnits` is absent. If
  `rowTotal` was itself a float sum (see F-04), the reconstructed minor unit
  drifts.
- No publication/version integrity defect beyond these. The snapshot is the
  most canonical surface in the codebase.
