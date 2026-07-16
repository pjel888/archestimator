# Audit and Disposition

## 1. Audit Contract

This is a fresh current-source audit of the two predecessor packs, not a merge-by-concatenation. The audit used:

- repository source frozen at clean baseline `68b869c8f42c6894af7e6379be98b84013650916` after all previously active codebase-agent owners finished;
- scoped product-source working-tree status hash `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;
- scoped product-source diff hash `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;
- both predecessor plan packs and their validator receipts, frozen at:
  - `.ai/09_archive/store/2026-07-16-Codebase-Architecture-Deepening-Plan-Pack-superseded/plan-pack.json`, SHA-256 `92dcf393247ec15ba698ba531227fee3df539653168a342d29a2b39696e3b395`; and
  - `.ai/09_archive/store/2026-07-16-Codebase-Improve-Audit-Plan-Pack-superseded/plan-pack.json`, SHA-256 `2c05e8f8f0c3c611a63f212bed854ad0a012af51b001f3174e4a96c0d7760fc0`;
- three independent read-only audit/critic lanes;
- GitNexus impact analysis, treated as directional because its index was 67 commits stale at the current-source freeze; and
- React Doctor as a heuristic diagnostic only, not an automatic backlog generator.

The previously contested paths and all master-pack artifacts were clean at the final source freeze:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/lib/estimates/d1-action-client.ts`

Their landed changes preserved the audited seams: the Estimate façade remains 6,281 lines, the component move queue remains shallow, and the existing editable-row store remains the correct client-side nucleus. The earlier formal leases and Admin-owner handoff are obsolete: the prior tasks are terminal, `main` equals `origin/main`, and the worktree is clean at this freeze. The future implementation must nevertheless run in an exclusive write window. New agent contention or owned-path dirtiness invalidates the affected unit baseline and pauses that unit; it does not revive a historical lease.

Commit `866cbedc7` landed after the original consolidation and hardened duplicate-row retry convergence in `use-estimate-row-handlers.ts` and `use-estimate-row-mutations.ts`. It retains one mutation ID, source revision, target node/tab, and optimistic row across ambiguous retry; prevents duplicate optimistic insertion; and rolls back only the failed duplicate. `UNIT-008` now names those invariants and the source-contract test that must be maintained if selector/comparator ownership changes.

## 2. Current Architecture Evidence

### 2.1 Component category resolution

`src/lib/component-library/category-folders.ts:24-67` constructs `folderById` inside every `resolveComponentCategory` call. Batch callers repeat that construction in:

- `src/lib/repositories/component-library-repository.ts:616-627` and the item loop at `:1033-1045`;
- `src/lib/ai/package-builder/read-tools.ts:902-909`; and
- `src/lib/ai/package-builder/apply.ts:338-347` plus the component-create loop at `:1830-1846`.

This is a small, real deepening opportunity: compile one resolver per folder set, keep identical fallback/cycle/workspace behavior, and preserve the existing convenience function for isolated calls.

### 2.2 Internal Bearer authorization

Three production upload routes duplicate secret collection and compare the complete authorization header with ordinary string equality:

- `src/app/api/internal/upload-cleanup/route.ts:38-50`;
- `src/app/api/internal/upload-scan/route.ts:31-43`; and
- `src/app/api/internal/upload-runtime/route.ts:61-73`.

All three currently return `503` when no secret is configured and `401` when the supplied credential is invalid. `src/lib/publication/security.ts:58-60` supplies the repo's existing timing-safe comparison precedent. This is retained as an auxiliary cross-cutting improvement, bounded to the three production upload routes first.

### 2.3 Estimate-tree read implementation

`src/lib/repositories/workspace-repository.ts` is 4,441 lines. The cohesive Estimate-tree slice begins around `:3648` and includes tree construction, tab/tree D1 reads, batched tab grouping, subtree reads, and route-target reads. It is mixed with workspace membership, project resolution, and current-user authorization.

The correct boundary is not “move every exported function.” The new concrete read module owns D1 queries, load limits, legacy tab normalization, tree construction, subtree construction, and tab grouping. Workspace/auth orchestration remains in `workspace-repository.ts`, preventing a circular dependency and preserving intent-named public entrypoints.

GitNexus rated `getEstimateTabTree` `CRITICAL` directionally: eight direct callers, roughly three dozen total impacted symbols, and multiple export/reusable-source processes. That risk is why `UNIT-003` uses a move-first boundary and no compatibility re-export.

### 2.4 Component-folder move concurrency

`src/components/workshop/component-library/per-item-mutation-queue.ts` only serializes promises. The two real adapters duplicate generation, confirmed-target, stale-success, stale-failure, rollback, and cleanup mechanics:

- `src/components/workshop/component-library/index.tsx:2671-2713`; and
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:2905-2953`.

The deep interface is a narrow move coordinator, not a universal component-library mutation hook. Each UI keeps its own optimistic cache update, selection, toast, and wording.

### 2.5 Component-library D1 writes

`src/lib/component-library/actions.ts` is 5,545 lines. It mixes auth, parsing, SQL statement construction, linked-row fanout, atomic writes, receipts, error translation, and revalidation. Relevant concentrations include linked-row synchronization around `:563-657`, create/fanout planning around `:2539-3005`, update orchestration from `:3007`, and folder mutations around `:3822-4008`.

The retained design creates two concrete D1 implementation modules inside one bounded unit:

- component/variant/attachment mutations; and
- folder create/rename/delete/reorder/move mutations.

Server actions keep auth, input parsing, public errors, and revalidation. D1 modules own statement ordering, atomicity, receipts, authoritative reads, and linked-row fanout. Templates remain with their current template modules.

### 2.6 Durable public rate limits

`src/lib/publication/public-repository.ts:290-840` owns the durable record/count/check/clear engine and policy wrappers for publications, proposals, shared links, and Client Portal. `src/lib/client-portal/public-session-handler.ts:9-16` imports its security limiter through a publication-specific boundary. Storage methods live in `src/lib/publication/d1-store.ts:297-344` even though `security_rate_limit_events` is shared infrastructure.

The retained unit relocates existing behavior before any semantic change. A shared D1 store and engine own hashing, cleanup, record/count/check/clear mechanics. Publication and Client Portal retain separate policy wrappers. Invite, AI, privacy, and admin rate-limit algorithms are explicitly out of this unit because their reservation and consumption semantics differ. The owned product paths are clean and uncontested at the final freeze. The unit remains `PLANNED` because deleting the publication-owned exports requires exact import/mock/source-contract maintenance across the focused test sources named in the canonical plan.

GitNexus rated the current recorded-limit path `CRITICAL` directionally. The plan therefore forbids policy unification during the relocation unit.

### 2.7 Estimate D1 action façade

`src/lib/estimates/d1-action-client.ts` is 6,281 lines. A concurrent fix expanded several hard-coded Library projections, but `EstimateActionD1Query` at `:1127-1331` still accepts `.select(columns)` without making that selection authoritative. `EstimateActionsD1Client.call()` at `:1378` delegates to `callEstimateAction` at `:6199-6280`, which dispatches more than 30 string action names. `src/lib/estimates/actions.ts` uses the façade for access checks, direct table inserts, tab/node/template/sheet operations, and row mutations; `src/lib/cloudflare/estimate-history-proof-router.ts:418-454` constructs the client directly. The Admin Estimate System knowledge map also hard-codes this façade at `src/lib/admin/estimate-system-knowledge-data.ts:13` as its `sources.persistence` pointer.

The shallow interface failed its stated responsibility: callers appear typed while table, projection, and mutation intent are not enforced. The retained target deletes `.from(table)`, `.select(columns)`, `.call(name,args)`, both façade classes, and the file after all three consumer families move to concrete typed intent modules. `UNIT-007` owns the exact `sources.persistence` retarget to `src/lib/estimates/d1-intents/database.ts`, with a note that the file owns shared execution primitives while sibling intent modules own guarded mutations, history, cascades, and template materialization. `src/lib/estimates/mutation-receipts.ts` already exists and is not re-planned.

GitNexus rated the façade `CRITICAL` transitively and `MEDIUM` at direct depth. The landed projection patch fixed a symptom but left the shallow interface intact. The historical owner gate is clear; execution remains planned only because its exact test-source maintenance is not authorized by this authoring task.

### 2.8 Estimate row editing

The current row-editing responsibility is distributed across:

- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`;
- `src/components/workshop/EstimateSheetContent.tsx`;
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`; and
- the existing vanilla-Zustand `src/components/workshop/estimate-sheet/rows/editable-row-store.ts`.

The store is the correct nucleus. The master rejects a second `RowMutationCoordinator`, a second context, and a new global store. `UNIT-008` deepens the existing per-sheet store without importing server-only D1 intents. It preserves quantity and selected variant as row-owned state, while one discriminated shared-component-definition intent covers both linked Library updates and shared project component/variant-definition updates through their existing mutation paths.

`tests/vitest/estimate-sheet-unit-003-contracts.test.ts:37-59` asserts the current reconciliation and memo-comparator source shape, so comparator removal cannot be treated as production-only editing. The current duplicate-row behavior contract in `tests/vitest/estimate-sheet-library-insert.test.tsx:1044-1151` also supplies the exact regression surface for retained mutation identity, ambiguity retry, and isolated rollback.

React Doctor reported 13 errors and 413 warnings across 208 files. Large-component and prop-surface heuristics corroborate this seam, but unrelated warnings and its current three source errors are not promoted into this architecture plan.

### 2.9 Upload-removal result integrity

`src/lib/uploads/removal-claims.ts:239-267` currently applies one whole-set `NOT EXISTS` predicate: if any matched asset is referenced, the update claims none of the otherwise-free assets. Its diagnostic then collapses the remaining set to one status. The three route handlers at `src/app/api/projects/images/route.ts:553-568`, `src/app/api/component-library/attachments/route.ts:695-710`, and `src/app/api/component-library/images/route.ts:362-377` report requested paths as `removedPaths` when the claim is merely `already_claimed`.

This is a verified predecessor finding, not a desired all-or-nothing domain rule. The narrowed correction makes eligibility correlated per asset, returns separate claimed, referenced, and already-removed sets, and keeps the cleanup job's final reference re-check. The predecessor's speculative matching-index addition is not retained without query-plan or scale evidence. The existing focused contract asserts the old result shape, so the unit stays `PLANNED` until that one test-source update is authorized; execution remains a separate decision.

## 3. Master Candidate Set

| Candidate | Master unit | Role | Status at authoring | Decision |
|---|---|---|---|---|
| Compiled category resolver | `UNIT-001` | Core | `READY` | Retain; exact next unit. |
| Internal Bearer boundary | `UNIT-002` | Auxiliary | `READY` | Retain narrowly for three production upload routes. |
| Estimate-tree D1 read module | `UNIT-003` | Core | `PLANNED` | Retain with workspace/auth orchestration left in place; required test-import/source-contract maintenance needs explicit test-source authorization. |
| Component-folder move coordinator | `UNIT-004` | Core | `PLANNED` | Retain narrowly; the prior owner is finished, but one exact test-source retarget still needs authorization. |
| Component-library D1 mutations | `UNIT-005` | Core | `READY` | Retain as two concrete aggregate modules; the former action lease is clear. |
| Durable public rate limits | `UNIT-006` | Core | `PLANNED` | Retain; no lease, but exact test-source retarget authorization is required before old exports are deleted. |
| Typed Estimate D1 intents | `UNIT-007` | Core | `PLANNED` | Highest leverage; prior owners are finished, exact test-source maintenance remains gated, and the narrow Admin map retarget is owned by this unit. |
| Provider-owned row editing | `UNIT-008` | Core | `PLANNED` | Retain with exact comparator-contract maintenance authorization; inject client-safe action adapters, never server-only D1 intents. |
| Per-asset upload-removal results | `UNIT-009` | Core | `PLANNED` | Restore the verified correctness finding after its one-file test-source contract update is authorized; exclude the unmeasured index proposal. |

## 4. Architecture Predecessor Crosswalk

| Predecessor requirement | Disposition in master |
|---|---|
| `REQ-001 / UNIT-ARCH-01` Estimate-tree carve | Reauthored as `UNIT-003`; pure D1 read implementation moves, workspace/auth orchestration stays. |
| `REQ-002 / UNIT-ARCH-02` generic component write repository | Reauthored as `UNIT-005`; two concrete D1 aggregate modules, no generic repository factory. |
| `REQ-003 / UNIT-ARCH-03` RowMutationCoordinator | Rejected; one caller and a giant coordinator would preserve a shallow dependency record. |
| `REQ-004 / UNIT-ARCH-04` row commit rules | Merged into `UNIT-008` as explicit commit intents inside the existing row store. |
| `REQ-005 / UNIT-ARCH-05` prop drilling/comparators | Merged into `UNIT-008`; deletion is a consequence of selector isolation, not an independent goal. |
| `REQ-006 / UNIT-ARCH-06` reducer-to-many-useState rewrite | Rejected; interface count and hook choice are not depth, and batching/identity could regress. |
| `REQ-007 / UNIT-ARCH-07` broad component mutation layer | Narrowed to `UNIT-004` for the duplicated move protocol; server persistence belongs to `UNIT-005`. |
| `REQ-008 / UNIT-ARCH-08` one last-owner home | Rejected as proposed; DB triggers and atomic SQL remain authoritative and legitimately differ by operation. |
| `REQ-009 / UNIT-ARCH-09` Beta snapshot adapters | Excluded because the source shapes are weakly cohesive and the work is Admin product guidance, not this architecture program. |
| `REQ-010 / AUX-A1` display transform | Deferred as `FOLLOWUP-UI-001`; the boundary is not independently proven and should be refreshed only when row display/edit shaping is next changed. |
| `REQ-011 / AUX-A2` project-activity repositories | Rejected; they serve different pages and a merge would create a larger repository. |
| `REQ-012 / AUX-A3` source sanitizer | Deferred as `FOLLOWUP-ARCH-001`; it is lower leverage and not part of the D1 façade retirement. |
| `REQ-013 / AUX-A4` image upload extraction | Deferred as `FOLLOWUP-UPLOAD-001`; plausible but lower leverage until the upload entrypoints are next changed. |
| `REQ-014 / AUX-A5` helper grab-bag cleanup | Routed to Legacy Cleanup; dead-code deletion is not this architecture program. |
| `REQ-015 / AUX-A6` corporate action row leakage | Rejected as underspecified and low leverage. |

## 5. Improve-Audit Predecessor Crosswalk

| Predecessor unit | Disposition in master |
|---|---|
| `UNIT-001` migration replay safety | Rejected as an implementation unit. `0084-0087` are immutable historical migrations. The broader FK concern survives only as `FOLLOWUP-DATA-001`, a future migration-execution preflight; it is not a gate or authority to edit applied migrations in this architecture pack. |
| `UNIT-002` category map rebuild | Reauthored as `UNIT-001`. |
| `UNIT-003` timing-safe Bearer secret | Reauthored narrowly as auxiliary `UNIT-002`. |
| `UNIT-004` test gate | Rejected; current `validate` already includes Bun unit and Vitest, and tests remain user-controlled. |
| `UNIT-005` D1 batch limit | Rejected; the 1,000-statement assertion already exists and the cited batch does not prove a current limit breach. |
| `UNIT-006` API auth source-string test | Rejected; source-string presence does not prove route authorization. |
| `UNIT-007` upload removal semantics | Reauthored narrowly as core correctness `UNIT-009`: per-asset eligibility and truthful result sets survive; the unmeasured composite-index proposal does not. |
| `UNIT-008` Action Inbox snooze | Excluded; typed callers require the value and the already-completed Founder Homebase program owns the product decision. |
| `UNIT-009` publication password floor | Rejected; product security policy, not an architecture defect. |
| `UNIT-010` active-recipient query dedup | Rejected as broad architecture work; only two exact duplicates exist and other queries have different semantics. |
| `UNIT-011` pagehide listener | Valid quick fix preserved as `FOLLOWUP-RUNTIME-001`; it is intentionally not an architecture unit. |
| `UNIT-012` D1 null observability | Deferred as `FOLLOWUP-OBS-001`; `getCloudflareD1Database` has a huge blast radius and needs a measured fail-open/fail-closed migration map first. |
| `UNIT-013` component hard-cap load | Rejected as written; current Library UI uses keyset paging and silent truncation would break exhaustive callers. |
| `UNIT-014` estimate god module | Reauthored completely as `UNIT-007`; receipts are already extracted and no compatibility façade remains. |
| `UNIT-015` hosted lockout proof | Routed to security/release follow-up; no hosted proof is part of this plan. |
| `UNIT-016` upload reference table | Rejected/YAGNI without measured query-plan or latency evidence. |
| `UNIT-017` access-security extraction | Reauthored only as `UNIT-006`; crypto already lives in `publication/security.ts` and stays there. |
| `UNIT-018` Estimate System Map | Feature/content work stays excluded as already implemented by the completed Admin program. `UNIT-007` owns only a one-entry `sources.persistence` retarget because it deletes the referenced façade. |
| `UNIT-019` estimate import | Excluded as product capability work. |
| `UNIT-020` Action Inbox direction | Excluded as already implemented/owned by Founder Homebase. |

### Deferred valid follow-up register

| ID | Preserved finding | Exact destination and activation trigger |
|---|---|---|
| `FOLLOWUP-DATA-001` | Upload-migration FK ordering | Before the next upload-related migration executes, inspect the then-current active D1 foreign-key topology and ordering assumptions. This does not authorize editing applied migrations. |
| `FOLLOWUP-RUNTIME-001` | Anonymous `pagehide` listener is not removed | One-file direct task in `src/components/web-vitals-collector.ts` when telemetry/web-vitals code is next edited or listener accumulation is reproduced; use one named handler for add/remove symmetry. |
| `FOLLOWUP-OBS-001` | `getCloudflareD1Database` collapses binding failures to `null` | Before changing failure semantics, inventory every caller as intentionally optional, fail-open, or fail-closed and measure affected runtime paths. |
| `FOLLOWUP-ARCH-001` | Source sanitizer boundary remains shallow | Re-audit when the Estimate reusable-source import path is next changed or a third independently maintained sanitizer appears. |
| `FOLLOWUP-UI-001` | Estimate display transform remains mixed with editing shape | Re-audit after `UNIT-008` stabilizes or when another row display consumer needs the same transform. |
| `FOLLOWUP-UPLOAD-001` | Estimate image-upload orchestration remains inline | Re-audit when either upload entrypoint is next changed; extract only if two real callers still share the same lifecycle. |
| `FOLLOWUP-COMP-001` | Component UI adapters still leak persistence-shaped row details | Re-audit after `UNIT-004` and `UNIT-005`; promote only a repeated boundary that remains after those deeper modules land. |
| `FOLLOWUP-ACTIVITY-001` | Actor-label helpers duplicate a personal-email display special case | Re-audit `src/lib/estimates/actions.ts`, `project-activity-repository.ts`, and `project-activity-feed-repository.ts` when activity attribution is next changed; use one domain helper, not a repository merge. |
| `FOLLOWUP-TREE-001` | Estimate-tree no-op cache clearing and test-only repository seams remain | Re-audit after `UNIT-003`; delete only with the exact caller and test-source inventory refreshed and authorized. |

## 6. Fixed Decisions and Non-Goals

- No product code changes occur during this plan-pack task.
- No new dependency, feature flag, compatibility re-export, generic repository interface, or parallel state store is introduced by the plan.
- No applied migration is edited.
- No hosted D1 query, deployment, browser proof, screenshot, test, build, or provider mutation is a mandatory plan gate.
- No Admin Estimate System feature/content work, Founder Homebase, compliance, or Legacy Cleanup work is implementation scope; the exact `sources.persistence` retarget owned by `UNIT-007` is the sole admin-file exception.
- No rate-limit policy, threshold, key shape, or consumption/reservation behavior changes during relocation.
- No row-owned selected variant becomes shared definition state.
- No route reports requested upload paths as removed unless the claim result identifies them as claimed; already-removed and referenced paths remain distinct.
- Implementation runs as a standalone architecture program with no other write-capable codebase agent active. Any newly dirty owned path pauses and invalidates only the affected unit baseline.

## 7. Staleness Triggers

Refresh this pack before execution if any of the following occur:

- another write-capable codebase agent starts or an owned path becomes dirty;
- `d1-action-client.ts`, `component-library/actions.ts`, `workspace-repository.ts`, or `editable-row-store.ts` changes materially;
- the Admin Estimate System `sources.persistence` pointer changes;
- a second storage implementation is introduced;
- row ownership versus shared-definition semantics change;
- rate-limit table or policy semantics change;
- `removal-claims.ts` or any of its three route consumers changes materially;
- the planning schema/validator changes; or
- the scoped status or diff hash no longer matches the unit's execution surface.
