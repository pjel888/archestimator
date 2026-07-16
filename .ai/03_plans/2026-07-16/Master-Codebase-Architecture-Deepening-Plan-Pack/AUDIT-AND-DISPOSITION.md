# Audit and Disposition

## 1. Audit Contract

This is a fresh current-source audit of the two predecessor packs, not a merge-by-concatenation. The audit used:

- current repository source at baseline `01b9a507225c0552ab7291c2c62ebdc2ef7f938c`;
- scoped working-tree status hash `d11fa888172f01724325b3d51e51ff6a253f25608ac953d05e1384fcf51bfd31`;
- scoped diff hash `3e85e837ccf692252988562f583be850ab95e2fd59dd0b6876828862393bfeff`;
- both predecessor plan packs and their validator receipts;
- three independent read-only audit/critic lanes;
- GitNexus impact analysis, treated as directional because its index was more than 40 commits stale while HEAD continued to advance; and
- React Doctor as a heuristic diagnostic only, not an automatic backlog generator.

The scoped dirty paths at freeze were:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/lib/estimates/d1-action-client.ts`

Those paths create explicit lease gates for `UNIT-004`, `UNIT-007`, and `UNIT-008`. Concurrent unrelated admin work is excluded entirely.

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

The retained design creates two concrete D1 implementation modules inside one leased unit:

- component/variant/attachment mutations; and
- folder create/rename/delete/reorder/move mutations.

Server actions keep auth, input parsing, public errors, and revalidation. D1 modules own statement ordering, atomicity, receipts, authoritative reads, and linked-row fanout. Templates remain with their current template modules.

### 2.6 Durable public rate limits

`src/lib/publication/public-repository.ts:290-840` owns the durable record/count/check/clear engine and policy wrappers for publications, proposals, shared links, and Client Portal. `src/lib/client-portal/public-session-handler.ts:9-16` imports its security limiter through a publication-specific boundary. Storage methods live in `src/lib/publication/d1-store.ts:297-344` even though `security_rate_limit_events` is shared infrastructure.

The retained unit relocates existing behavior before any semantic change. A shared D1 store and engine own hashing, cleanup, record/count/check/clear mechanics. Publication and Client Portal retain separate policy wrappers. Invite, AI, privacy, and admin rate-limit algorithms are explicitly out of this unit because their reservation and consumption semantics differ.

GitNexus rated the current recorded-limit path `CRITICAL` directionally. The plan therefore forbids policy unification during the relocation unit.

### 2.7 Estimate D1 action façade

`src/lib/estimates/d1-action-client.ts` is 6,281 lines. `EstimateActionD1Query` at `:1127-1331` accepts `.select(columns)` but hard-codes projections. `EstimateActionsD1Client.call()` at `:1378` delegates to `callEstimateAction` at `:6199-6280`, which dispatches more than 30 string action names. `src/lib/estimates/actions.ts` uses the façade for access checks, direct table inserts, tab/node/template/sheet operations, and row mutations; `src/lib/cloudflare/estimate-history-proof-router.ts:418-454` constructs the client directly.

The shallow interface failed its stated responsibility: callers appear typed while table, projection, and mutation intent are not enforced. The retained target deletes `.from(table)`, `.select(columns)`, `.call(name,args)`, both façade classes, and the file after all three consumer families move to concrete typed intent modules. `src/lib/estimates/mutation-receipts.ts` already exists and is not re-planned.

GitNexus rated the façade `CRITICAL` transitively and `MEDIUM` at direct depth. The file is currently dirty, so execution waits for the active Estimate owner.

### 2.8 Estimate row editing

The current row-editing responsibility is distributed across:

- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`;
- `src/components/workshop/EstimateSheetContent.tsx`;
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`; and
- the existing vanilla-Zustand `src/components/workshop/estimate-sheet/rows/editable-row-store.ts`.

The store is the correct nucleus. The master rejects a second `RowMutationCoordinator`, a second context, and a new global store. `UNIT-008` deepens the existing per-sheet store after typed server intents land. It preserves quantity and selected variant as row-owned state, while shared variant-definition edits continue through the linked shared-component mutation branch.

React Doctor reported 13 errors and 413 warnings across 208 files. Large-component and prop-surface heuristics corroborate this seam, but unrelated warnings and its current three source errors are not promoted into this architecture plan.

### 2.9 Upload-removal result integrity

`src/lib/uploads/removal-claims.ts:239-267` currently applies one whole-set `NOT EXISTS` predicate: if any matched asset is referenced, the update claims none of the otherwise-free assets. Its diagnostic then collapses the remaining set to one status. The three route handlers at `src/app/api/projects/images/route.ts:553-568`, `src/app/api/component-library/attachments/route.ts:695-710`, and `src/app/api/component-library/images/route.ts:362-377` report requested paths as `removedPaths` when the claim is merely `already_claimed`.

This is a verified predecessor finding, not a desired all-or-nothing domain rule. The narrowed correction makes eligibility correlated per asset, returns separate claimed, referenced, and already-removed sets, and keeps the cleanup job's final reference re-check. The predecessor's speculative matching-index addition is not retained without query-plan or scale evidence.

## 3. Master Candidate Set

| Candidate | Master unit | Role | Status at authoring | Decision |
|---|---|---|---|---|
| Compiled category resolver | `UNIT-001` | Core | `READY` | Retain; exact next unit. |
| Internal Bearer boundary | `UNIT-002` | Auxiliary | `READY` | Retain narrowly for three production upload routes. |
| Estimate-tree D1 read module | `UNIT-003` | Core | `PLANNED` | Retain with workspace/auth orchestration left in place; required test-import/source-contract maintenance needs explicit test-source authorization. |
| Component-folder move coordinator | `UNIT-004` | Core | `PLANNED` | Retain narrowly; wait for current UI owner. |
| Component-library D1 mutations | `UNIT-005` | Core | `PLANNED` | Retain as two concrete aggregate modules under one server-action lease. |
| Durable public rate limits | `UNIT-006` | Core | `PLANNED` | Retain; relocate byte-for-byte before policy change. |
| Typed Estimate D1 intents | `UNIT-007` | Core | `PLANNED` | Highest leverage; wait for active Estimate owner. |
| Provider-owned row editing | `UNIT-008` | Core | `PLANNED` | Retain behind its UI lease; inject client-safe action adapters, never server-only D1 intents. |
| Per-asset upload-removal results | `UNIT-009` | Auxiliary | `READY` | Restore the verified correctness finding; exclude the unmeasured index proposal. |

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
| `REQ-009 / UNIT-ARCH-09` Beta snapshot adapters | Excluded due active admin ownership and weak cohesion across source shapes. |
| `REQ-010 / AUX-A1` display transform | Deferred; current sheet files are leased and the boundary is not independently proven. |
| `REQ-011 / AUX-A2` project-activity repositories | Rejected; they serve different pages and a merge would create a larger repository. |
| `REQ-012 / AUX-A3` source sanitizer | Deferred as lower leverage; it is not part of the D1 façade retirement. |
| `REQ-013 / AUX-A4` image upload extraction | Deferred; plausible but lower leverage and actively adjacent to Estimate work. |
| `REQ-014 / AUX-A5` helper grab-bag cleanup | Routed to Legacy Cleanup; dead-code deletion is not this architecture program. |
| `REQ-015 / AUX-A6` corporate action row leakage | Rejected as underspecified and low leverage. |

## 5. Improve-Audit Predecessor Crosswalk

| Predecessor unit | Disposition in master |
|---|---|
| `UNIT-001` migration replay safety | Rejected as an implementation unit. `0084-0087` are immutable historical migrations; the DB-wide FK check is a separately recorded environment/applicability gate, not authority to edit them. |
| `UNIT-002` category map rebuild | Reauthored as `UNIT-001`. |
| `UNIT-003` timing-safe Bearer secret | Reauthored narrowly as auxiliary `UNIT-002`. |
| `UNIT-004` test gate | Rejected; current `validate` already includes Bun unit and Vitest, and tests remain user-controlled. |
| `UNIT-005` D1 batch limit | Rejected; the 1,000-statement assertion already exists and the cited batch does not prove a current limit breach. |
| `UNIT-006` API auth source-string test | Rejected; source-string presence does not prove route authorization. |
| `UNIT-007` upload removal semantics | Reauthored narrowly as auxiliary `UNIT-009`: per-asset eligibility and truthful result sets survive; the unmeasured composite-index proposal does not. |
| `UNIT-008` Action Inbox snooze | Excluded; typed callers require the value and the active Admin plan owns the surface. |
| `UNIT-009` publication password floor | Rejected; product security policy, not an architecture defect. |
| `UNIT-010` active-recipient query dedup | Rejected as broad architecture work; only two exact duplicates exist and other queries have different semantics. |
| `UNIT-011` pagehide listener | Valid quick fix, but routed outside the master because it has no architecture leverage. |
| `UNIT-012` D1 null observability | Deferred; `getCloudflareD1Database` has a huge blast radius and needs a measured fail-open/fail-closed migration map first. |
| `UNIT-013` component hard-cap load | Rejected as written; current Library UI uses keyset paging and silent truncation would break exhaustive callers. |
| `UNIT-014` estimate god module | Reauthored completely as `UNIT-007`; receipts are already extracted and no compatibility façade remains. |
| `UNIT-015` hosted lockout proof | Routed to security/release follow-up; no hosted proof is part of this plan. |
| `UNIT-016` upload reference table | Rejected/YAGNI without measured query-plan or latency evidence. |
| `UNIT-017` access-security extraction | Reauthored only as `UNIT-006`; crypto already lives in `publication/security.ts` and stays there. |
| `UNIT-018` Estimate System Map | Excluded as already implemented/owned by the active admin program. |
| `UNIT-019` estimate import | Excluded as product capability work. |
| `UNIT-020` Action Inbox direction | Excluded as already implemented/owned by Founder Homebase. |

## 6. Fixed Decisions and Non-Goals

- No product code changes occur during this plan-pack task.
- No new dependency, feature flag, compatibility re-export, generic repository interface, or parallel state store is introduced by the plan.
- No applied migration is edited.
- No hosted D1 query, deployment, browser proof, screenshot, test, build, or provider mutation is a mandatory plan gate.
- No admin Estimate System Map, Founder Homebase, compliance, or Legacy Cleanup files are implementation scope.
- No rate-limit policy, threshold, key shape, or consumption/reservation behavior changes during relocation.
- No row-owned selected variant becomes shared definition state.
- No route reports requested upload paths as removed unless the claim result identifies them as claimed; already-removed and referenced paths remain distinct.
- No component UI unit starts while `component-library/index.tsx` is dirty under another owner.
- No Estimate backend or row-editing unit starts while `d1-action-client.ts` or `EstimateSheetContent.tsx` is dirty under another owner.

## 7. Staleness Triggers

Refresh this pack before execution if any of the following occur:

- one of the scoped dirty paths changes owner or lands;
- `d1-action-client.ts`, `component-library/actions.ts`, `workspace-repository.ts`, or `editable-row-store.ts` changes materially;
- a second storage implementation is introduced;
- row ownership versus shared-definition semantics change;
- rate-limit table or policy semantics change;
- `removal-claims.ts` or any of its three route consumers changes materially;
- the planning schema/validator changes; or
- the scoped status or diff hash no longer matches the unit's execution surface.
