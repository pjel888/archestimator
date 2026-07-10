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

### UNIT-002 owned files
| File | Scope |
|---|---|
| `src/lib/estimates/d1-action-client.ts` | Restore section only (lines ~2400-2410) |
| `src/hooks/use-estimate-row-mutations.ts` | `restoreDeletedRowsMutation` section |

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
| `tests/vitest/activity-event-type-normalization.test.ts` | NEW |
| `tests/vitest/activity-filter-exhaustiveness.test.ts` | NEW |
| `tests/vitest/estimate-sheet-activity-history-ui.test.tsx` | Extensions |
| `tests/vitest/estimate-sheet-version-control-ui.test.tsx` | Extensions |
| `tests/vitest/estimate-actions-d1-reorder-history.test.ts` | Extensions |

### UNIT-006 owned files
| File | Scope |
|---|---|
| `src/lib/activity/activity-composer.ts` | New composer cases (coordinate with UNIT-001) |
| `src/lib/activity/activity-copy-dictionary.ts` | New entries (coordinate with UNIT-001) |
| `src/components/workshop/estimate-sheet/activity-history.tsx` | Filter list updates (coordinate with UNIT-001) |

### UNIT-007 owned files
| File | Scope |
|---|---|
| `src/app/api/share/[token]/comment/route.ts` | Full ownership |
| `src/app/api/share/[token]/decision/route.ts` | Decision-reset additions |
| `src/lib/publication/actions.ts` | New server actions |
| `src/lib/publication/public-repository.ts` | Comment extensions |
| `src/components/share/SharePageComments.tsx` | Reply/edit/delete UI |

### UNIT-008 owned files
| File | Scope |
|---|---|
| (read-only verifier) | No production code edits |

## Serialization Rules

### Must serialize (shared contracts)
- `d1-action-client.ts` — high-traffic file. UNIT-001 and UNIT-002 both touch it but in different sections. **UNIT-001 owns the dispatch table area; UNIT-002 owns the restore-throw area.** They may NOT run simultaneously on this file. UNIT-002 starts after UNIT-001 is VERIFIED.
- `activity-composer.ts`, `activity-copy-dictionary.ts`, `activity-history.tsx` — UNIT-001 and UNIT-006 both touch these. **UNIT-006 starts after UNIT-001 is VERIFIED.**
- `apply.ts` — UNIT-003 and UNIT-004 both touch it. **Coordinate or serialize.**

### May parallelize (disjoint files)
- UNIT-003 (apply.ts event types) ∥ UNIT-004 (reusable-sources, express-promotion) — after UNIT-001.
- UNIT-005 (test files) ∥ UNIT-007 (share routes) — after UNIT-004.
- UNIT-006 (composer additions) — after UNIT-001.

## Lease Protocol

Before writing to any owned file, acquire a lease:

1. Create directory: `.ai/99_scratch/leases/<sha256-of-canonical-resource-key>.lock/`
2. Write `owner.json` with: `run_id`, `lane`, `resource`, `baseline_hash`, `acquired_at`, `heartbeat_at`, `TTL`, `cleanup`.
3. Mirror receipt to `LOOP_LEDGER.md`.
4. On completion, remove the lease directory and log release.

If `mkdir` fails, the resource is unavailable. Do NOT steal a live lease. After TTL, verify the owning lane is inactive, quarantine the stale directory, record recovery, then retry.

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
