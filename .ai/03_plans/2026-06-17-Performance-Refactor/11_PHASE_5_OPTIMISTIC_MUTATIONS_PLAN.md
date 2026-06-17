# 11 — Phase 5: Optimistic Mutation Lifecycle Standardization

> **Authoring agent:** W10. **Status:** Phase plan (Wave 2). Implements contract `_SYNTHESIS.md §1 State / §3 track 4`, target `04_TARGET_ARCHITECTURE.md §8` (optimistic adapter), §3 (action result envelope), §4 (query/cache contracts). Grounded in dossier `R2-state.md` (optimistic-flow table), audit `A-10`/`A-11`/`A-12`/`A-13`, patterns `PAT-09`/`PAT-10`/`PAT-11`/`PAT-12`/`PAT-26`, decision `D-005`/`D-007`, risk **RISK-07** (rollback bugs from 13→1 consolidation).
>
> **Scope discipline (contract §4):** planning only — no `src/**` edits in this pack. Every helper/file named below is a *target*; new validation scripts are flagged "to be added." Cross-references use the pack's stable IDs.
>
> **Depends on Phase 1** (foundation): the query-key factory (`PAT-10`, `04 §4.1`), the `patchAndMarkStale` helper (`PAT-11`, `04 §4.2`), and the `ActionResult`/`ReconcilePatch` envelope (`04 §3`) are all *primitives Phase 1 ships*. Phase 5 **consumes** them; it does not redefine them. If Phase 1 has not landed the envelope + helper, Phase 5 stalls (sequencing note for `05_PHASED_REFACTOR_PLAN`).
>
> **Soft dependency on Phase 3 (Step 6).** Phase 5's tree-patch reconciliation over `mapNode` (§4, `04 §6.1`) is consumed by `useEstimateRowOperations`, the hook extracted in **Phase 3 Step 6** (sheet decomposition; cross-ref `05 §0.4`). Sequencing rule: **either Phase 3 Step 6 lands first** so the row-mutation family (Step D, #1–#6) migrates into the extracted hook, **OR** Phase 5 must confirm it can centralize the `mapNode` reconciliation independently of the extraction (in `create-optimistic-mutation.ts` + the estimate-domain `reconcile` closures) and have Step 6 adopt it later. This is a soft dependency — only Step D (row family) is affected; Steps B/C (correctness holes + favorites) are unblocked. Flag the chosen order to `05_PHASED_REFACTOR_PLAN`.

---

## 0. Goal & success definition

Collapse the **13 hand-rolled optimistic flows** and **5 divergent rollback mechanisms** (R2 flow table; `A-10`) into **one adapter** (`createOptimisticMutation`, `04 §8`) with a single rollback contract, while:

1. **Closing the two correctness holes first** — notifications (`useNotificationsQuery.ts:83-164`) and collaborator-role (`use-project-collaboration-query.ts:45-63`) currently have **no `onError` rollback** (R2 finding-3; `A-10` correctness gap). A failed mutation leaves the cache showing a write the server rejected. This is a latent data-integrity bug, not just tech debt — so it goes first.
2. **Preserving every load-bearing guard** — the revision-counter race protection (`use-estimate-query.ts:70-75`), the per-row `operationId` ordering queue (`use-estimate-row-mutations.ts:201-202,426-436`), and the existing render-isolation behaviour (`A-08`). Consolidation must not regress ordering or stale-overwrite protection.

**Done when:** all 13 flows route through `createOptimisticMutation`; each has a `rollback` (no flow has `none`); per-flow contract tests (apply / reconcile / rollback / conflict) are green; `bun run test:dom` (361) and `bun run validate` pass.

---

## 1. Current state inventory (the 13 flows, 5 rollbacks, 2 holes)

PINNED from R2 / `A-10` / `PAT-09`. The table is the migration worklist.

| # | Flow | File:line | Pending-id | Reconcile | Rollback mechanism | Hole? |
|---|---|---|---|---|---|---|
| 1 | Row update (cell edit) | `use-estimate-row-mutations.ts:347-403` | `mutationId` uuid + per-row `operationId` counter + serialized promise queue (`:201-202,426-436`) | `setQueryData` patch via `toServerRowPatch`, gated on `operationId` match (`:382,384`) | **(a)** patch-snapshot `context.previousPatch` (`:395-398`) → else `input.rollback?.()` | — |
| 2 | Row insert (from library) | `:224-262` | `mutationId` only (`:419-424`); no `onMutate` (server source not resident, `:1201`) | `setQueryData` patch on success (`:231-251`) | `input.rollback?.()` (`:257`) | weak |
| 3 | Row replace | `:264-267` (shared `mutationOptions:206-222`) | `mutationId` + `expectedRowRevision` | invalidate-none only | `input.rollback?.()` (`:216`) | weak |
| 4 | Row delete | `:269-272` (shared `mutationOptions`) | `mutationId` + `expectedRowRevision` | invalidate-none | `input.rollback?.()` | weak |
| 5 | Row detach | `:274-322` | `mutationId` + `expectedRowRevision` | `onMutate` patch + `onSuccess toDetachedRowPatch` (`:302-306`) | **(a)** own `context.previousPatch` (`:312-318`) | — |
| 6 | Row promote | `:324-345` | `mutationId` | `onSuccess toPromotedRowPatch` + 4 cross-key invalidations (`:333-336`) | `input.rollback?.()` | weak |
| 7 | Move row item | `use-estimate-query.ts:167-184` | none | `onMutate moveEstimateRowItem` on `detail` key (`:176`); `onSettled` **refetch** (`:182`) | **(b)** whole-tree `context.previous` (`:180`) | — |
| 8 | Tree reorder (drag) | `use-estimate-query.ts:59-79` | revision counter (`:50-58,111-119`) | `setTree` writes cache + bumps revision | **(c)** revision-guarded `restore(prev, expectedRevision)` (`:70-75`) | — |
| 9 | Project favorite toggle | `use-toggle-project-favorite.ts:19-37` | none | `onMutate patchSidebarFavoritesCache`; `onSettled` invalidate (`:36`) | **(d)** cache snapshot `ctx.previousSidebar` (`:35`) | — |
| 10 | Estimate favorite toggle | `use-toggle-estimate-favorite.ts:22-51` | none | `onMutate` patches sidebar cache AND `project-estimates-store` (`:34,43`) | **(d)** dual: `ctx.previousSidebar` + store `patch` (`:46-49`) | — |
| 11 | Project estimate list (create/dup/delete/edit) | `project-estimates-store.ts:50-95` | `pendingInsertIds: Set` (`:38,51-55`) | `reconcileInsert(tempId,row)` (`:57-65`) | **(e)** closure-returning `removeOptimistic` (`:67-95`) | — |
| 12 | Collaborator role | `use-project-collaboration-query.ts:45-63` | none | `setQueryData` map-patch (`:51-62`) | **NONE** | **YES** |
| 13 | Notifications (read/dismiss/ack) | `useNotificationsQuery.ts:83-164` | none | `setQueryData` feed + unread-count + release-modal, then invalidate-none (`:93-105`) | **NONE** (all 3 mutations) | **YES** |

**5 distinct rollback mechanisms** = (a) patch-snapshot, (b) whole-tree snapshot, (c) revision-guarded restore, (d) cache-snapshot, (e) closure-restore. The adapter (`04 §8`) expresses all 5 as different `apply`/`rollback` closures over **one** contract.

`project-estimates-store` (#11) is a *second optimistic engine in Zustand* holding server state (`A-13`, `PAT-26`). Phase 5 retires its row ownership into the TanStack cache + adapter; the Zustand store keeps only UI concerns. This couples to Phase 3 (sheet decomposition) and the Phase 5 store-merge work in §9.

---

## 2. The canonical lifecycle (from `04 §8`)

One path for all flows. The adapter is `src/lib/query/create-optimistic-mutation.ts` (Phase 1 primitive; consumed here):

```
onMutate(input):
  ctx = apply(client, input)        // optimistic patch via patchAndMarkStale (§4.2) → returns rollback snapshot
  return ctx
mutationFn(input) -> ActionResult<TData>   // §3 envelope (ok:true{data,reconcile} | ok:false{error})
onSuccess(result, input, ctx):
  if result.ok: reconcile(client, result.data, input)   // server-id swap, revision set, canonical fields
  else:         rollback(client, ctx); toast(result.error)
onError(err, input, ctx):
  rollback(client, ctx); toast(mapError(err))
onSettled(input):
  optional invalidate({refetchType:"active"}) ONLY when server computed something the client can't derive
```

**Lifecycle stages (the test-matrix axes):**

- **apply** — optimistic patch; captures snapshot. Uses `patchAndMarkStale` (`PAT-11`) which already returns `{previous}` for rollback.
- **reconcile** — on `ok:true`, swap temp-id→server-id, set revision, apply canonical field corrections from `ReconcilePatch` (`04 §3`).
- **rollback** — on `ok:false`/throw, restore the snapshot from `apply`. **One contract** replaces the 5 mechanisms.
- **conflict** — server revision ≠ expected, or a concurrent edit raced; handled via `identity.revisionKey` (see §6).

---

## 3. Pending-ID strategy

Two identifiers, unified across all flows (`04 §8`):

1. **`mutationId` (uuid)** — per-mutation identity, generated in `onMutate`. Already standard in the row-mutation hooks (`withMutationIdentity`, `:411-436`). Used to correlate the optimistic write with its server response and to deduplicate retries.
2. **Optimistic placeholder id (`tempId`)** — for *inserts* (#2 row insert, #11 list create/dup). The client mints `temp_<uuid>`; the row renders immediately keyed on `tempId`. On reconcile, `ReconcilePatch.tempId → serverId` swaps it (§4). This formalizes `project-estimates-store`'s `pendingInsertIds` Set (`:38`) and the row-insert path's deferred-source pattern (`:1201`).

**Rule:** `tempId` is never persisted, never sent to the server, and is always replaced on `ok:true` reconcile or removed on rollback. A unit test asserts no `temp_` id survives a settled mutation (§8 matrix).

**Ordering guard (`operationId`):** the per-row `operationId` counter + serialized promise queue (`:201-202,426-436`) is **retained behind `identity.revisionKey`** for the row-update flow only (#1), *pending measurement* — see Q-row-ordering in §10. It guarantees that two fast keystrokes on the same cell reconcile in submit order, not response order. The adapter does not delete it until a render-isolation test proves the revision guard alone is sufficient.

---

## 4. Server-ID reconciliation

On `ok:true`, the server returns `ReconcilePatch` (`04 §3`): `{ tempId?, serverId?, revision?, fields? }`.

- **Insert flows (#2, #11):** `reconcile` finds the row keyed on `tempId` and replaces its id with `serverId`, merging server-computed fields (codes, derived totals). Today this is `reconcileInsert(tempId, row)` (`project-estimates-store.ts:57-65`) and the row-insert `setQueryData` patch (`:231-251`) — both become one `reconcile` closure over `mapNode` (`04 §6.1`, kernel item 3) for the tree case and a list-splice for the list case.
- **Update/detach/promote flows (#1, #5, #6):** `reconcile` applies the server patch (`toServerRowPatch` / `toDetachedRowPatch` / `toPromotedRowPatch`) gated on revision/operationId match (`:382,384`). These become the estimate-domain `reconcile` implementations; the `toXxxRowPatch` builders centralize as the optimistic-vs-server patch pair (`PAT-12`, `04 §8`).
- **Tree reorder (#8):** reconcile is the revision bump on `setTree` (`use-estimate-query.ts`); server confirms structure → revision advances; a stale response (lower revision) is dropped.
- **Reconcile must be idempotent and revision-monotone:** a late `ok:true` for a superseded mutation must not overwrite a newer optimistic state. The revision counter (`A-12`) enforces this; the adapter routes it through `identity.revisionKey`.

`mergeEstimateTreeStructureWithCachedNodes` (`estimate-tree-reorder.ts:222-251`) — which rebuilds a Map index + clones every node per call (`PAT-12`) — is **fed off the shared `TreeIndex`** (Phase 2) rather than re-indexing on every reconcile. This is the Phase-2↔Phase-5 seam; until Phase 2 lands, the existing merge stays and Phase 5 only standardizes the surrounding lifecycle.

---

## 5. Rollback strategy (standardize; add the 2 missing)

**Single contract:** `rollback(client, ctx)` restores the snapshot captured by `apply`. The 5 mechanisms map onto it:

| Old mechanism | Flows | How it becomes one `rollback` |
|---|---|---|
| (a) patch-snapshot `context.previousPatch` | #1, #5 | `apply` returns the pre-patch row via `patchAndMarkStale`'s `{previous}`; `rollback` re-sets it. |
| (b) whole-tree `context.previous` | #7 | `apply` snapshots the whole `detail` tree; `rollback` re-sets it. (Coarsest; acceptable — move is infrequent.) |
| (c) revision-guarded `restore` | #8 | `apply` snapshots tree + revision; `rollback` = `restore(prev, expectedRevision)` — **kept guarded** (RISK-07: a naive snapshot here reintroduces the stale-overwrite race). |
| (d) cache snapshot `ctx.previousSidebar` | #9, #10 | `apply` returns the sidebar (and store) snapshot; `rollback` re-sets both. |
| (e) closure-restore `removeOptimistic` | #11 | `apply` returns a position-restoring closure as `ctx`; `rollback` invokes it. Preserves insertion-position fidelity. |

**Add the 2 missing rollbacks (DO THESE FIRST — §7):**

- **#13 Notifications:** `apply` snapshots feed + unread-count + release-modal (the same 3 keys it currently patches, `:93-105`); `rollback` restores all three. Closes the "marked-read then server-fails → stays read in cache" bug.
- **#12 Collaborator role:** `apply` snapshots the collaboration query map (`:51-62`); `rollback` restores it. Closes "role shows changed but server rejected (RLS/permission)".

**Rollback ordering rule:** when `apply` patches **multiple** keys (notifications ×3, estimate-favorite sidebar+store), `rollback` restores **all** of them atomically — partial rollback is itself a bug class (RISK-07). The adapter captures a `ctx` array of `{key, previous}` and restores in reverse.

---

## 6. Conflict strategy

A "conflict" = the server's current revision/state differs from what the optimistic write assumed (concurrent editor, stale tab, RLS change).

- **Revision-guarded flows (#1, #3, #4, #5, #8):** `expectedRowRevision` / tree revision counter detects it. On mismatch the server returns `ok:false { error.code:"CONFLICT", retryable:true }` (`04 §3`); the adapter rolls back and **refetches the canonical state** (`invalidate({refetchType:"active"})`) rather than re-applying the optimistic patch. The reorder revision guard (`:70-75`) is the existing precedent — generalize it.
- **Non-revisioned flows (#9–#13):** last-writer-wins on the server; the client reconciles to server truth on `onSettled` invalidate. No explicit conflict UI, but rollback + refetch guarantees eventual consistency.
- **`SCHEMA_MISSING` fail-open edge (`04 §3`, decisions.md `isEstimateTabsSchemaMissing`):** treated as a typed `ActionError`; the adapter fails **closed** by default (rollback) except where a flow explicitly opts into fail-open probing. Document each fail-open site.

Conflict is the 4th test-matrix axis (§8): every revisioned flow gets a test that simulates a server revision ahead of the client and asserts rollback + refetch, not silent overwrite.

---

## 7. Toast / status strategy

- **Errors:** the adapter toasts `result.error.message` (typed `ActionError`, `04 §3`) on `ok:false`, and a generic mapped message on thrown/network errors. Uses the existing `ToastProvider` (root provider; stays global per `04 §1.1`). One `mapError(code) → message` table so messaging is consistent (no per-flow ad-hoc strings).
- **Retryable vs terminal:** `ActionError.retryable` drives whether the toast offers a "Retry" affordance. `CONFLICT`/`VALIDATION` are non-retryable-as-is (the optimistic state was wrong); `UNKNOWN`/network are retryable.
- **Success:** silent by default (optimistic UI already reflects the change). Explicit success toasts only for discrete user actions that aren't visually self-evident (e.g. "Estimate duplicated") — keep the existing few, do not add noise.
- **In-flight status:** the adapter exposes `isPending` per `mutationId`; surfaces (e.g. pending-insert dimming via `pendingInsertIds`) read it instead of maintaining a parallel Set. Notifications/collaborator gain no new UI — just the rollback.

---

## 8. URL sync strategy

Mutations in this phase do **not** own URL state, but two seams matter:

- **`router.refresh()` (`PAT-22`, `A-02`, 12 files):** several optimistic flows are today followed by a `router.refresh()` (e.g. `ProjectEstimatesClient.tsx:215` after a list mutation). **Target rule (`04 §1.4`):** once a flow reconciles through the adapter + `patchAndMarkStale`, its trailing `router.refresh()` is removed unless a fresh RSC payload is genuinely required (auth/permission/route-structure change). Each retained refresh carries a one-line justification. *Audit + reclassify is Phase 4's job (`10_PHASE_4`); Phase 5 only ensures the adapter makes the refresh removable by giving the cache the canonical state.*
- **Active-tab / selected-node URL params:** owned by the workspace UI store / route, not the mutation adapter. A mutation that deletes the selected row triggers the existing fallback-selection logic (`estimate-tree-edit.ts:54-123`); the adapter does not touch the URL. No change in Phase 5.

No new URL-sync mechanism is introduced. This section exists to record the explicit non-ownership and the `router.refresh()` removability contract.

---

## 9. Store-merge coupling (PAT-26 / A-13)

Phase 5 retires `project-estimates-store`'s **server-state ownership** (#11) into the TanStack cache + adapter:

- Estimate-list rows move to a TanStack query; the store keeps only `pendingInsertIds` → reframed as adapter `tempId` tracking, or dropped if `isPending` suffices.
- `dragState` (high-frequency, `estimate-ui-store.ts:49`) is split into its own atom so optimistic-mutation subscribers don't re-render per pointer move — but this is primarily **Phase 3/Phase 5 coordinated** (`PAT-26` addressed in Phase 5 mutations + Phase 3 sheet). 
- **Do not** merge the local `bulkSelectedRowIds` Set (`EstimateSheetContent.tsx:1099`, already correct) into a shared store without regression coverage (open Q, contract §5; Q-bulk-merge).

This is the lowest-priority slice of Phase 5; it can trail the adapter migration. Flag for `05_PHASED_REFACTOR_PLAN` that #11's store retirement depends on Phase 3 sheet decomposition landing the list-query boundary.

---

## 10. Migration order (correctness first, then collapse incrementally)

**Feature-flag rollout (`24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md`, `perf-refactor-flags`):** the adapter migration ships **behind a flag** so each flow can be cut over (and reverted) independently. Per doc 24, convert the **no-rollback flows first for correctness** — notifications (#13) and collaborator-role (#12) — behind the flag, validate in the field, then progressively enable the row family and tree flows. The flag is the kill-switch: a rollback regression on any flow (RISK-07) reverts that flow to its legacy path without reverting the whole phase.

**Step A — Phase 1 prerequisites must be green:** query-key factory (`PAT-10`), `patchAndMarkStale` (`PAT-11`), `ActionResult`/`ReconcilePatch` envelope (`04 §3`). Block if absent.

**Step B — Close the correctness holes (highest value, lowest blast radius):**
1. **#13 Notifications** — adopt the adapter, add the 3-key snapshot rollback. Pure correctness win; isolated feature; no tree/revision complexity.
2. **#12 Collaborator role** — adopt the adapter, add the map snapshot rollback. Equally isolated.

Both are doable before the adapter is fully proven on the hard flows, and each independently improves data integrity.

**Step C — Migrate the simple cache-snapshot flows (validate the adapter shape):**
3. **#9 Project favorite**, **#10 Estimate favorite** — already have clean `ctx.previousSidebar` rollback; mechanical port to `apply`/`rollback`. Estimate-favorite's dual sidebar+store patch validates the multi-key rollback contract (§5).

**Step D — Migrate the row-mutation family (the bulk; preserve guards):**
4. **#3 replace, #4 delete, #6 promote** (shared `mutationOptions`) — port, give each a real `apply`/`rollback` (upgrading the weak `input.rollback?.()` to snapshot-backed).
5. **#2 insert** — port with `tempId` reconciliation.
6. **#1 update, #5 detach** — port last in this family; they carry the patch-snapshot + `operationId` ordering. Keep the ordering queue behind `identity.revisionKey` until §3 measurement clears it.

**Step E — Migrate the tree-cache-as-state flows (highest risk, RISK-07):**
7. **#7 move row item** — whole-tree snapshot rollback.
8. **#8 tree reorder** — revision-guarded restore; **do not** flatten into a naive snapshot (RISK-07; `A-10` unsafe move).

**Step F — Retire the second engine (#11):** migrate `project-estimates-store` server state to the cache + adapter (couples to Phase 3, §9).

After each step: run the per-flow contract tests + `bun run test:dom`. Never migrate more than one flow family per commit (RISK-07 mitigation — isolate any rollback regression).

**Open questions (cross-ref `19_OPEN_QUESTIONS.md`):**
- *Q-row-ordering* — Is the per-row `operationId` + promise queue still needed once the adapter's revision guard handles ordering? (R2 open Q). Decides whether Step D6 deletes the queue.
- *Q-areaTree* — Can `areaTree` be retired from the key resolver? (contract §5 Q-B). Affects every estimate flow's key.
- *Q-notif-rollback* — Was notifications' no-rollback intentional (eventually-consistent) or a latent bug? (R2 open Q). Step B1 treats it as a bug; confirm with feature owner.
- *Q-bulk-merge* — Can the local bulk Set merge into the workspace store without regression? (contract §5).

---

## 11. Test matrix (per-flow: apply / reconcile / rollback / conflict)

PINNED axes. Each of the 13 flows gets a contract test asserting all applicable axes. New tests live alongside the existing row-mutation DOM suite; run under `bun run test:dom` (serial, `--maxWorkers=1`).

| # | Flow | apply | reconcile | rollback | conflict | forbidden |
|---|---|---|---|---|---|---|
| 1 | Row update | cell patches cache optimistically | server `toServerRowPatch` applied, operationId-gated | failed write restores prior row | revision-ahead → rollback + refetch (not overwrite) | n/a |
| 2 | Row insert | `temp_` row renders immediately | `tempId→serverId` swap, no `temp_` survives | failed insert removes temp row | n/a (insert) | n/a |
| 3 | Row replace | optimistic replace | revision-confirmed | restore original | revision mismatch → rollback+refetch | n/a |
| 4 | Row delete | optimistic remove | revision-confirmed | restore deleted row at position | revision mismatch → rollback+refetch | n/a |
| 5 | Row detach | optimistic detach patch | `toDetachedRowPatch` | restore attached state | revision mismatch | n/a |
| 6 | Row promote | optimistic promote | `toPromotedRowPatch` + cross-key invalidations fire | restore demoted state | n/a / last-writer | **`ok:false {code:"FORBIDDEN"}` → rollback fires, demoted state restored, no cross-key invalidation leaks** |
| 7 | Move row item | optimistic move on `detail` | settle refetch confirms | whole-tree restore | concurrent move → refetch wins | n/a |
| 8 | Tree reorder | `setTree` + revision bump | structure confirmed, revision advances | **revision-guarded restore**; stale response dropped | concurrent reorder: lower-revision response ignored | **`ok:false {code:"FORBIDDEN"}` → revision-guarded restore to pre-reorder tree+revision** |
| 9 | Project favorite | sidebar cache patched | settle invalidate | sidebar restored | last-writer | n/a |
| 10 | Estimate favorite | sidebar + store patched | settle invalidate | **both** restored (multi-key) | last-writer | n/a |
| 11 | List create/dup/delete/edit | optimistic list mutation, `tempId` for create/dup | `reconcileInsert` swap | position-restoring `rollback` | last-writer | n/a |
| 12 | **Collaborator role** | map patch | settle invalidate | **NEW: map restored** | RLS-reject → rollback + toast `FORBIDDEN` | **`ok:false {code:"FORBIDDEN"}` → map restored to pre-mutation roles, toast `FORBIDDEN`** |
| 13 | **Notifications ×3** | feed+count+modal patched | settle invalidate-none | **NEW: all 3 restored** | last-writer | n/a |

**Forbidden-path axis (security; RISK-21, cross-ref `22_SECURITY_AND_RLS_THREAT_PLAN.md`):** flows that cross a permission boundary — collaborator-role (#12), row-promote (#6), tree-reorder (#8) — get an explicit test where the server returns `ok:false { code:"FORBIDDEN" }` (RLS/role denial, not a network throw). The assertion: `rollback` fires and the **exact pre-mutation state is restored** (no partial optimistic write survives an authz rejection). This guards RISK-21 — that the `ActionResult<T>` envelope must surface an interior authz denial as `ok:false`, never swallow it into a silent `ok:true`. Maps to the `prove:*` gates in doc 22.

**Cross-cutting assertions:**
- No `temp_` id survives any settled mutation (§3 rule).
- Multi-key rollback is atomic (all-or-nothing) (§5 rule).
- A simulated server revision ahead of client → rollback + refetch, never silent overwrite (RISK-07; §6).
- A server `ok:false {code:"FORBIDDEN"}` on a permission-boundary flow (#6/#8/#12) → rollback to exact pre-mutation state (forbidden axis; RISK-21; doc 22).
- Focus lands deterministically after insert/delete/move per GATE-FOCUS-AFTER-MUTATION (`20_UX_UI_AND_INTERACTION_PLAN.md`; see below).
- Render isolation preserved: an optimistic row-A write does not re-render rows B…N (`A-08`; reuse `estimate-sheet-render-relief.test.tsx` shape).

**Focus-after-mutation (UX; `20_UX_UI_AND_INTERACTION_PLAN.md` GATE-FOCUS-AFTER-MUTATION):** insert/delete/move must define where focus lands — insert focuses the new row's first editable cell; delete moves focus to the next sibling (or parent if last); move keeps focus on the moved row at its new position. The contract test asserts the focused element after each settled mutation (and after a rollback, focus returns to the pre-mutation target). Reconcile must not steal focus from an in-progress edit.

**New gate (to be added, Phase 5/9):** an `optimistic-mutation-contract.test.tsx` parametrized over the 13 flows asserting the matrix. Wire into the Phase 9 aggregate, not `validate` directly (contract §0 — `validate` runs no new perf surface unless explicitly added).

---

## 12. Validation & risk

- **Commands (existing vocabulary only, contract §4):** `bun run type-check`, `bun run test:dom` (361 incl. row-mutation + the new contract tests), `bun run validate`. The new contract test file is a `test:dom` addition.
- **RISK-07 (rollback bugs from 13→1):** mitigated by (a) migrating one flow family per commit, (b) the per-flow matrix gate, (c) keeping the revision-guarded restore and ordering queue until measurement clears them, (d) atomic multi-key rollback. Severity stays Medium only if migration order (§10) is respected.
- **RISK reference:** also touches RISK-14 (shared-seam collision) — `use-estimate-row-mutations.ts` and `use-estimate-query.ts` are edited by both Phase 4 (keys/invalidation) and Phase 5 (adapter); sequence Phase 4's key-factory adoption before Phase 5's adapter migration on those files.
- **Decision refs:** `D-005` (one adapter, pluggable rollback), `D-007` (key factory + `patchAndMarkStale`).
