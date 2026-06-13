# 08 — Decisions & Open Questions

Resolved design decisions (with rationale) plus the few owner calls that should be confirmed. Each open question has a **default assumed** so implementation is not blocked.

---

## Resolved decisions

### D1 — Sequence by felt-impact, not by "most architecturally wrong"
The DB work (4-hop waterfall, over-fetch, RLS initplan) is real but **invisible at today's 154-item / 3-template volume** (`02 §B`). The felt slowness is the overlay + server-route tabs + skeletons. **P0 fixes the felt problem; P2 closes the cliff.** Doing DB first would burn effort on an invisible problem and not change what the user feels.

### D2 — Fix the overlay by changing its *trigger*, not with a `suppressOverlay` flag
A `suppressOverlay` opt-out was implemented and **removed as flawed** (obs 4623). The plan converts the overlay from "show-immediately + 250 ms floor" to "show-only-if-nav-exceeds-150 ms" and drops the refresh trigger (`07 T1`). This makes all prefetched/cached navigations silent without a per-call flag.

### D3 — `initialData` alone cannot prove no-skeleton route revisits
The first audit assumed the lowest-blast-radius path was to keep server routes and seed TanStack Query from the server fetch. Deeper review corrected that: `LibraryComponentsRoute` awaits `getCurrentWorkspaceComponentRowsLibrary()` before the manager can mount, so a warm client cache cannot prevent route-level `loading.tsx` if the route still suspends. P0 therefore splits into P0a safe fixes and P0b architecture. P0b must choose either an immediate client shell route or client-panel tabs with URL sync before claiming no warm-revisit skeleton.

### D4 — Reuse the existing app-wide `QueryClient`; share query keys only where the data shape matches
No new query infra. The editor dock already proves the pattern (`TemplateEditorClient.tsx:121-123`, key `["workspace-component-library"]`, loader `loadCurrentWorkspaceComponentLibrary`). **Caveat:** the Components *management* tab fetches a richer shape (`getCurrentWorkspaceComponentRowsLibrary` — rows + tree + suppliers + brands + folders), so T3 must define its own namespaced key unless `07 T3 Step 1` confirms the shapes are identical. The editor dock + the editor page (T5) genuinely share the dock's key because they use the same loader. Goal: each distinct dataset is fetched once per session, not once per tab visit — not necessarily one key for everything.

### D5 — Mutations stay optimistic; replace `router.refresh()` with cache writes
Optimistic UI with rollback already exists in all three managers (`04 §D`). The only defect is the trailing `router.refresh()` (full-segment re-render + overlay). Switch to `setQueryData`/`invalidateQueries` (`07 T4`).

### D6 — P2 DB changes are gated on the PG17 prove-harness; RLS rewrite needs an access-decision proof
EXPLAIN could not run during the audit (`02 §method note`). No DB change ships without a captured before/after plan on the prove-harness, and the `is_workspace_member` rewrite (highest blast radius) needs a proof that the same principal sees the same rows before/after (`06 §G`, `07 T15`). New RPCs must be `security definer set search_path = public` and filter the **caller-resolved** `workspace_id` (`05 cross-check`).

### D7 — Ship the three non-CSP `/workshop` headers immediately; CSP starts Report-Only
`X-Frame-Options`/`nosniff`/`Referrer-Policy` are zero-risk and go in now. CSP on `/workshop` risks breaking on dynamic Next chunks + user content, so it starts Report-Only (as `/share` did) and is enforced only after reports are clean (`07 T18`).

### D8 — Viewer-write authZ closes at BOTH app and RLS layers, based on current policy inventory
Add `assertCanManageLibrary` to template/component actions for app-layer fail-fast behavior. For RLS, preserve the already-split component item policies, add the missing template write split (`SELECT` for members, writes for editors), and harden the confirmed component child-table write gaps (`cost_library_item_versions`, `cost_library_item_variant_cost_entries`, `cost_library_item_variant_attachments`, plus any policy inventory discoveries). Low urgency only because no viewer principals exist pre-launch (`05 F19`).

---

## Open questions (owner calls — defaults assumed)

### Q1 — P0b route shell or client-panel tabs?
To satisfy no warm-revisit skeletons, the implementation must avoid route-level suspension on normal tab switches. Two viable options remain: (a) route pages return immediate client shells that read warmed query data; or (b) the persistent Library shell owns client-panel tabs with URL sync/back-button preservation. **Default assumed:** start with **route client shells** because it preserves URLs and route file ownership with less layout rewrite; switch to client-panel tabs only if the shell path cannot prove no route `loading.tsx` on warm revisits.

### Q2 — Is a brief (>150 ms) overlay on genuinely slow navigations acceptable, or should it never appear inside `/workshop`?
The T1 design still shows the overlay if a navigation truly takes >150 ms (e.g. a cold cross-area jump). Alternative: suppress it entirely within `/workshop` and rely on per-segment `loading.tsx` only.
**Default assumed:** **Keep the delayed overlay** — it's a genuine "this is taking a moment" signal and no longer fires for fast/cached nav. Revisit if testers still report blur.

### Q3 — Out-of-band folder seeding (F10): trigger-on-workspace-create vs. hybrid virtual folders?
Two ways to get the 685-folder mirror off the read path: (a) a DB trigger that seeds folders when a workspace is created, or (b) derive the taxonomy folders virtually from `component_category_nodes` and stop materializing them per workspace.
**Revised default assumed:** **hybrid, not pure virtual.** Current code does write user-specific folder state: create/rename/delete handlers live in `ComponentLibraryManager.tsx:1343-1395`, persisted folder rows include `source_category_node_id` (`component-library-repository.ts:315-378`), and the reorder RPC has editor-only semantics. Therefore T13 must first classify taxonomy-backed rows vs user-custom rows. Prefer a hybrid model that virtualizes unchanged taxonomy folders but preserves customized per-workspace folder rows; fall back to trigger-on-workspace-create if the hybrid would make move/reorder/delete semantics ambiguous. → resolve in `07 T13 Step 1` before migration work.

**Invariant:** `library_folders` remains the canonical persisted source of truth for every item-addressable `library_folder_id` and every customized folder row. Any taxonomy virtualization is view-layer only for unchanged taxonomy nodes and must not replace persisted folder IDs that component items can reference.

### Q4 — Approve the P2 DB program now, or hold until P0/P1 measurements land?
P2 is gated on the prove-harness regardless, but the owner may want to see the P0 felt-impact win before authorizing the migration work (RPCs, index, initplan rewrite, denormalization).
**Default assumed:** **Proceed to plan/prove P2 in parallel** (write migrations + prove-harness EXPLAINs) but **do not apply to hosted** until P0 ships and the owner approves the RLS rewrite specifically (D6). This keeps the cliff work ready without front-loading risk.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| `initialData` caching shows stale data after a mutation in another tab | `invalidateQueries` on every mutation (T4); `staleTime` 5 min is acceptable for a single-user-per-workspace product today |
| `cache()`-wrapping `ensureDefaultWorkspace` masks its auto-provision side-effect | Split read (cached) from provision (uncached) in T6; verify with the impact analysis in T6 Step 1 |
| RLS initplan rewrite changes a row-visibility decision | Before/after access-decision proof on prove-harness, gated (D6, T15) |
| New aggregation RPC drifts from the JS aggregation it replaces | Golden-master test: assert RPC output equals the old JS-folded output for the seed workspace before cutover (T10/T11) |
| CSP on `/workshop` breaks dynamic chunks / user content | Report-Only first; enforce only after clean reports (D7, T18) |
| Removing `router.refresh()` loses a needed server revalidation somewhere | Audit each call site in T4; use `invalidateQueries` (silent refetch) where a true server reconcile is required, not a blind drop |
| Query cache split creates mixed fresh/stale UI | T3 must cache a whole dataset or explicitly pair keys for folders/categories/suppliers/brands/items; T4 must invalidate every paired key |
| P0 cache plan cannot suppress route `loading.tsx` | P0b must use an immediate client shell or client-panel tabs; Playwright warm-revisit skeleton proof is the gate |
| Folder optimization erases customized user state | T13 must prove taxonomy-backed vs user-custom folder behavior before choosing virtual folders; customized names/order/deletes must survive |
| "100% bug free" becomes an overclaim | Success language is zero known bugs after adversarial matrix, measured deltas, review, and rollback evidence; unknown future bugs are not claimed impossible |

---

## Status

**Implementation-ready after `09` readiness gates are closed.** P0 can start without new owner input once baseline, query-key/data-shape, dirty-worktree, and adversarial-matrix gates are recorded. P2 needs Q3 resolved by evidence and Q4 confirmation before hosted apply. P3 RLS/headers gated per D6/D7.
