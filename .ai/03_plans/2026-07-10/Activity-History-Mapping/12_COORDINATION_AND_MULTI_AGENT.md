# 12 - Coordination And Multi-Agent Safety

This repository has multiple AI coding agents and humans working simultaneously. This document defines the file-scope ownership, serialization rules, and conflict-avoidance protocol for implementing this plan pack.

## Authority Order

1. `AGENTS.md` — repo-wide coordination rules.
2. `plan-pack.json` — IDs, statuses, hashes, DAG truth.
3. `11_IMPLEMENTATION_PLAN.md` — execution packets.
4. This document — file-scope ownership and lease protocol.

## Shared-Worktree Rules

- **Stay on the current branch/worktree.** Do not create, switch, checkout, rename, delete, or push branches unless explicitly requested.
- Re-run `git status --short -- <owned paths>` immediately before editing.
- Never revert or overwrite existing unrelated changes.
- Report unexpected owned-path changes to the lead and integrate them deliberately.
- Only the lead edits `README.md`, `11_IMPLEMENTATION_PLAN.md`, `plan-pack.json`, `LOOP_LEDGER.md`.

## File-Scope Ownership Map

Each file is owned by exactly ONE unit at a time. A unit may not start until its files are free.

### UNIT-001 owned files (CRITICAL PATH — serialized)
| File | Scope |
|---|---|
| `src/lib/activity/event-type-normalization.ts` | NEW — full ownership |
| `src/lib/estimates/actions.ts` | Read-path section only (`normalizeHistoryEvent` and nearby) |
| `src/components/workshop/estimate-sheet/activity-history.tsx` | Filter constants + restore guard constants only |
| `src/lib/activity/activity-copy-dictionary.ts` | Full ownership |
| `src/lib/activity/activity-composer.ts` | `estimateTitle` switch section |
| `src/lib/repositories/project-activity-feed-repository.ts` | `estimateBucketEventTypes` section |
| `tests/vitest/activity-event-type-normalization.test.ts` | NEW — full ownership |
| `tests/vitest/activity-filter-exhaustiveness.test.ts` | NEW — full ownership |

### UNIT-002 owned files
| File | Scope |
|---|---|
| `src/lib/estimates/d1-action-client.ts` | Restore section only (lines ~2400-2410) |
| `src/hooks/use-estimate-row-mutations.ts` | `restoreDeletedRowsMutation` section |
| `tests/vitest/estimate-actions-d1-row-restore-history.test.ts` | NEW focused direct-D1 restore proof |

### UNIT-003 owned files
| File | Scope |
|---|---|
| `src/lib/ai/package-builder/apply.ts` | Event-type constants and `insertEstimateEvent` only |

### UNIT-004 owned files
| File | Scope |
|---|---|
| `src/lib/reusable-sources/actions.ts` | INSERT section (line ~748) |
| `src/lib/estimates/express-promotion-actions.ts` | INSERT section (line ~455) |
| `src/lib/ai/package-builder/apply.ts` | `insertEstimateEvent` serialization (coordinate with UNIT-003) |

### UNIT-005 owned files
| File | Scope |
|---|---|
| `tests/vitest/activity-event-type-normalization.test.ts` | Extensions only; created by UNIT-001 |
| `tests/vitest/activity-filter-exhaustiveness.test.ts` | Extensions only; created by UNIT-001 |
| `tests/vitest/estimate-sheet-activity-history-ui.test.tsx` | Extensions |
| `tests/vitest/estimate-sheet-version-control-ui.test.tsx` | Extensions |
| `tests/vitest/estimate-actions-d1-reorder-history.test.ts` | Extensions |

### UNIT-006 owned files
| File | Scope |
|---|---|
| `src/components/workshop/estimate-sheet/activity-history.tsx` | Delete only the proven-dead `row_blank_added` filter after UNIT-001 |
| `tests/vitest/activity-composer.test.ts` | Regression extensions only |
| `tests/vitest/activity-copy-regression.test.ts` | Regression extensions only |
| `tests/vitest/estimate-sheet-activity-history-ui.test.tsx` | Regression extensions only |
| `tests/vitest/activity-filter-exhaustiveness.test.ts` | Regression extensions only; created by UNIT-001 |

### UNIT-007

Superseded. Publisher-And-Shared-Pages owns public interaction mutation and UI.
This pack has no write lease on its routes, actions, repository, or components.

### UNIT-008 owned files
| File | Scope |
|---|---|
| (read-only verifier) | No production code edits |

### UNIT-009 through UNIT-012

| Unit | Exclusive/serialized scope |
|---|---|
| UNIT-009 | Variant/propagation event facts and activity rendering; serialize `d1-action-client.ts` |
| UNIT-010 | ActivityHistoryModal, ProjectActivityClient, and SharedLinkActivityFeed accessibility only; starts after UNIT-006 releases shared UI files. Publisher owns SharePageComments/public decision accessibility and returns it in its incorporated-delta receipt. |
| UNIT-011 | Activity query/index/rendering performance; `migrations/0057_activity_history_indexes.sql` remains PLANNED until the durable Program migration-generation receipt validates |
| UNIT-012 | Workspace isolation, durable event/outbox helpers, and retention registry; serialize shared D1/compliance files |

## Serialization Rules

### Must serialize (shared contracts)
- `d1-action-client.ts` — high-traffic file. UNIT-001 and UNIT-002 both touch it but in different sections. **UNIT-001 owns the dispatch table area; UNIT-002 owns the restore-throw area.** They may NOT run simultaneously on this file. UNIT-002 starts after UNIT-001 is VERIFIED.
- `activity-history.tsx` — UNIT-001 adds the four required filter entries;
  UNIT-006 later deletes only the proven-dead `row_blank_added` option.
  **UNIT-006 starts after UNIT-001 is VERIFIED.** Composer and dictionary files
  remain exclusive UNIT-001 production scope.
- `estimate-sheet-activity-history-ui.test.tsx` and
  `activity-filter-exhaustiveness.test.ts` — UNIT-005 completes and releases
  both extension leases before UNIT-006 starts its regression extensions.
- `apply.ts` — UNIT-003 and UNIT-004 both touch it. **Coordinate or serialize.**

### May parallelize (disjoint files)
- UNIT-003 (apply.ts event types) ∥ UNIT-004 (reusable-sources, express-promotion) — after UNIT-001.
- UNIT-005 test-only work may run with disjoint repository/compliance work after
  its producer contracts are frozen.
- UNIT-006 (dead-filter deletion plus regression extensions) — after UNIT-001,
  UNIT-004, and VERIFIED UNIT-005.

### Publisher accessibility handoff

`Publisher-And-Shared-Pages` exclusively owns `SharePageComments`, public decision
UI, and their accessibility changes. Activity may cite those surfaces as audit
inputs but may not lease or edit them. The Publisher incorporated-delta receipt
must carry the applicable comment/decision findings, changed paths, tests, and
verifier result before Activity `UNIT-008` accepts the integrated handoff.

## Lease Protocol

Before writing to any owned file, acquire a lease:

1. Create directory: `.ai/99_scratch/leases/<sha256-of-canonical-resource-key>.lock/`
2. Write `owner.json` with: `run_id`, `lane`, `resource`, `baseline_hash`, `acquired_at`, `heartbeat_at`, `TTL`, `cleanup`.
3. Mirror receipt to `LOOP_LEDGER.md`.
4. On completion, remove the lease directory and log release.

If `mkdir` fails, the resource is unavailable. Do NOT steal a live lease. After TTL, verify the owning lane is inactive, quarantine the stale directory, record recovery, then retry.

Before `UNIT-011` edits `migrations/0057_activity_history_indexes.sql`, it must
also validate the durable Program `MIGRATION_LEASE_GENERATION.json` receipt against
the current migration tail, Activity owner-manifest digest, allocation digest,
receipt digest, exact planned path, and `unclaimed` status. Any mismatch blocks
the edit and returns allocation reissue to the Program owner.

## Maker/Checker Separation

- The agent that implements a unit should be distinct from the agent that verifies it, when practical.
- Reviewer identity is recorded as provenance, not a score cap.
- The checker verifies:
  - Source/input hashes match the evidence.
  - Owned paths stayed within scope.
  - Tests use the exact packet contract.
  - Failures were not hidden by retries, skips, or stale artifacts.
  - Cleanup and resume state are complete.

## Conflict Detection

Before starting any unit:
1. `git status --short -- <owned paths>` — check for unexpected changes.
2. `git diff --stat` — check for overlapping unstaged work.
3. If another agent has unstaged changes in your owned files, STOP and coordinate.

## Communication

- Log STARTED, conflicts, and COMPLETE in `LOOP_LEDGER.md`.
- Never edit another lane's ledger entry.
- Report unexpected changes to the lead immediately.
