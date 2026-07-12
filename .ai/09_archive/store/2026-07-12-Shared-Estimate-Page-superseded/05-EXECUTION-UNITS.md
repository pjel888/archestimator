# 05 — Execution Units (remediation DAG for a FUTURE implementation run)

> Each `UNIT-*` is a self-contained packet a fresh executor can run from bounded
> context. **Nothing here is auto-executed.** Owner picks a subset; each requires its
> own explicit authorization before code changes (and an explicit `TEST_TASK` before
> any test/build/browser run). Dependencies noted; otherwise independent.

```
UNIT-1 (node review-target enabler)        ← enabler
   ├── UNIT-2 (node commenting UI in tree)
   └── UNIT-3 (row commenting from tree)
UNIT-4 (tree "show more" per node)          ── independent
UNIT-5 (>500-row degradation signal/cap)    ── independent
UNIT-6 (cross-widget query invalidation)    ── independent
UNIT-7 (decision undo + draft persistence)  ── independent
UNIT-8 (SEC Cache-Control no-store)         ── independent  ← recommended first
UNIT-9 (PERF virtualize large trees)        ── independent
UNIT-10 (nav panel totals + area donut + activity feed on recipient page)
UNIT-11 (P2/P3 cleanup bundle)              ── independent
UNIT-12 (feature backlog: threading/resolve/edit/mentions/realtime)
UNIT-13 (wide-canvas split-pane at xl/2xl + per-node roll-up)  [D4/D5]
UNIT-14 (mobile persistent decision CTA + decision/audit record)  [D2/D3]
```

Design rationale and prioritization for the design-driven units (UNIT-13/14) live in
`09-DESIGN-AND-UX-TARGET.md`. They are client-perceived-value priorities, not blockers
for the headline node-commenting feature (UNIT-1/2/3).

---

## UNIT-1 — Node-level review target (enabler) [GAP-1]

**Goal:** Allow a comment/decision to target an estimate **node** (area/branch), not
just proposal/estimate/row.

**Linked findings:** GAP-1. **Depends on:** none. **Unblocks:** UNIT-2, UNIT-3.

**Exact paths / current symbols:**
- `src/components/share/share-review-target.ts:1` — `ShareReviewTargetKind = "proposal" | "estimate" | "row"`.
- `src/lib/publication/activity-helpers.ts:18` — `SharedLinkTargetKind` type; `:140-165` `validateSharedLinkReviewTarget`; label maps.
- `src/lib/publication/public-repository.ts:67` — `SharedLinkPublicComment.targetKind`; `:158-173` `resolveSubmittedReviewTargetIds`.
- `src/app/api/share/[token]/comment/route.ts:165-166` — `PUBLIC_REVIEW_TARGET_ID_PATTERN = /^(?:est|row)_[A-Za-z0-9_-]{8,40}$/`.
- `src/app/api/share/[token]/decision/route.ts` — same pattern duplicated.
- `migrations/0066_publication_foreign_keys.sql:223,265` — `CHECK (target_kind IN ('proposal','estimate','row'))` on comments + responses.
- `src/lib/publication/snapshot.ts:72-83,160-166` — opaque `node_*` id namespace already exists and is reversible.

**Approach (additive, backward-compatible):**
1. New D1 migration `./migrations/00NN_share_node_target_kind.sql`:
   - `ALTER TABLE shared_link_comments` … rebuild with CHECK including `'node'` (D1
     can't alter a CHECK in place — use the `__00NN` rebuild pattern from migration
     0066). Add nullable `node_id TEXT` column.
   - Same for `shared_link_responses`.
2. TS: add `"node"` to `ShareReviewTargetKind`; add `nodeId?` to `ShareReviewTarget`;
   update `normalizeShareReviewTarget` / `serializeShareReviewTarget` to carry `nodeId`.
3. `activity-helpers.ts`: extend `SharedLinkTargetKind`, the label maps
   (`nodeLabels`), and `validateSharedLinkReviewTarget` to accept a node target whose
   `nodeId` is in the publication's node id set.
4. Routes: extend `PUBLIC_REVIEW_TARGET_ID_PATTERN` to include `node_` prefix;
   `readOptionalReviewTargetId` to read `nodeId`; resolve public node id → internal.
5. `public-repository.ts`: `resolveSubmittedReviewTargetIds` to resolve node ids.

**Invariants:** Existing proposal/estimate/row comments untouched. Old snapshots
without `treeNodes` simply have no node targets available (validation rejects unknown
node ids).

**Test decision:** `TARGETED` / `MVP_CRITICAL_INVARIANT` — schema CHECK +
target-validation is a data-integrity boundary. `TEST_PROPOSAL` only (named risk:
"node-target comment accepted/rejected correctly"; exact command TBD by executor) —
**await explicit user `TEST_TASK` before running.**

**Failure response:** Migration rebuild assertion (count check) must pass before
rename; mirror the 0066 assertion pattern.

---

## UNIT-2 — Node-level commenting UI affordance in tree [GAP-1]

**Goal:** A reviewer can click an area/branch node header in the tree and comment on it.

**Linked findings:** GAP-1, UX-8. **Depends on:** UNIT-1.

**Exact paths:**
- `src/components/share/ShareEstimateTreeView.tsx:74` (`TreeNodeRenderer`), `:198-256` (header), `:212-218` (onToggle only).
- `src/components/share/ShareEstimateTreePanel.tsx:121` (`TreeNodeRenderer`), `:141-159` (onToggle + onNavigate).
- `src/components/share/SharePageTabs.tsx:501-530` (`createRowReviewTarget`/`createEstimateReviewTarget`/handlers) — add `createNodeReviewTarget`.

**Approach:**
1. Add a "Comment on this area" affordance to node headers in both the view and panel
   (an icon button or a header click modifier). Must not conflict with
   expand/collapse (caret) or navigate (scroll).
2. Construct `{ kind: "node", label: node.label, secondaryLabel: activeContentLabel,
   estimateId: activeEstimate.id, nodeId: node.id }` and emit via
   `onReviewTargetChange`.
3. Visually indicate which node is the active review target (reuse the dead
   `activeNodeId` path — see BUG-5/UNIT-11).

**Test decision:** `NOT_REQUIRED` (UI wiring; static + type evidence). Browser proof
only on explicit user request.

---

## UNIT-3 — Row-level commenting from inside the tree view [GAP-2]

**Goal:** Tree-view inline rows are clickable to set a row review target (parity with
the collated table).

**Linked findings:** GAP-2, UX-8. **Depends on:** none (independent of UNIT-1, but
natural to ship with UNIT-2).

**Exact paths:**
- `src/components/share/ShareEstimateTreeView.tsx:148-188` (inline rows are non-interactive `<div>`s).
- `src/components/share/SharePageTabs.tsx:848` (`handleRowReview` — the collated handler to mirror).

**Approach:** Make tree-view rows call a passed `onRowReview(row)` (mirror
`createRowReviewTarget`). Add hover affordance + keyboard activation (Enter/Space) +
`data-review-target-selected` parity with the collated table (`:851`).

**Test decision:** `NOT_REQUIRED`.

---

## UNIT-4 — Tree "show more" per node [GAP-2 variant]

**Goal:** A node with >250 rows (desktop) / >100 (mobile) can be expanded instead of
silently truncated.

**Exact paths:** `src/components/share/ShareEstimateTreeView.tsx:20-21,190-194`.

**Approach:** Replace the static cap with incremental "Show N more rows" (mirror the
collated view's `collatedRowsExpanded` reducer action, `SharePageTabs.tsx:78-82,
791-796`).

**Test decision:** `NOT_REQUIRED`.

---

## UNIT-5 — Silent tree degradation at >500 rows [BUG-2, BUG-4]

**Goal:** The tree no longer silently flips to flat discipline grouping for large
sheets; either remove the cap for the snapshot-nodes path or surface a clear notice.

**Exact paths:** `src/lib/share/reconstruct-share-tree.ts:29,344-360`.

**Approach (preferred):** The `MAX_ROWS_FOR_TREE` cap was a guard for the fragile
**designation parser** (rung 3). The snapshot-nodes path (rung 1) has no such cost.
Gate the cap on the fallback rungs only: if `treeNodes` present → always use rung 1
(no cap); apply the cap only when falling through to rungs 3/4. Optionally tighten
the designation delimiter regex (`BUG-4`) to `/\s+[>\/\-–—]\s+/`.

**Test decision:** `NOT_REQUIRED` (pure function; type + source evidence). If
behavior regressions are a concern, `TEST_PROPOSAL` for the reconstruction function.

---

## UNIT-6 — Cross-widget query invalidation [BUG-1]

**Goal:** Comments/decisions/activity stay mutually consistent without manual refresh.

**Exact paths:** `SharePageComments.tsx` (no invalidate), `SharePageDecision.tsx:330-341`, `SharedLinkActivityFeed.tsx`.

**Approach:** Inject `useQueryClient` into comments + decision components. On
successful comment POST → `invalidateQueries({ queryKey: ["share-activity"] })`. On
successful decision POST → `invalidateQueries` for `["share-comments"]` +
`["share-activity"]`.

**Test decision:** `NOT_REQUIRED`.

---

## UNIT-7 — Decision undo + draft persistence [BUG-3, DEC-3]

**Goal:** (a) Decision drafts (note + signer name) persist across forced reload.
(b) Owner-decided policy on undo/change-response.

**Exact paths:** `SharePageDecision.tsx:277-348` (confirm), `:311` (reload on stale), `:350-377` (locked state).

**Approach (a):** Mirror the comment draft pattern — sessionStorage keyed by token,
restore on mount. (b) Record an owner product decision: the server keeps "latest"
decision and the unique index permits one row. Options: (i) allow recipient to
"revise" via an UPDATE path until a cutoff, (ii) allow owner to "reopen" the decision
remotely, (iii) leave immutable (current). Default to (iii) unless owner says
otherwise — surface as `DEC-AUTO` in the implementing run.

**Test decision:** `NOT_REQUIRED` for (a). (b) needs a product decision before code.

---

## UNIT-8 — SEC: Cache-Control no-store on page route [SEC-1]  ← recommended first

**Goal:** The HTML page response is never CDN-cached.

**Exact paths:** `src/app/share/[token]/page.tsx:35` (`force-dynamic` only).

**Approach:** Add a `headers()` export (Next.js static headers) or set
`Cache-Control: no-store` in the response. Verify it doesn't break the OG metadata
fetch (bots still get the generic metadata).

**Test decision:** `NOT_REQUIRED` (header inspection).

---

## UNIT-9 — PERF: virtualize large trees [PERF-1]

**Goal:** Large expanded trees don't balloon DOM.

**Exact paths:** `src/components/workshop/workshop-tree.tsx:237-259`; `ShareEstimateTreeView.tsx:100-196`; `ShareEstimateTreePanel.tsx:356-358`.

**Approach:** Flatten the expanded-node forest into a virtualized list
(`@tanstack/react-virtual` — already a TanStack shop). Cap "Expand All" or make it
lazy. **Measure first** per budget rule #2/#3 — state bundle impact (KB gzipped).

**Test decision:** `NOT_REQUIRED` (perf; benchmark only on explicit user request).

---

## UNIT-10 — Nav panel totals + area donut + activity feed on recipient page [ACT-1, UX completeness]

**Goal:** (a) Nav panel shows node totals/counts (`showInlineRows` is currently false).
(b) Area-level donut (or discipline↔area toggle) so chart and tree corroborate.
(c) Activity feed rendered on the recipient page (filtered to recipient-visible).

**Exact paths:**
- `src/components/share/SharePageTabs.tsx:907,916` (`showInlineRows={false}`).
- `src/lib/share/aggregate-share-chart-buckets.ts:37-89` (discipline-only).
- `src/components/share/SharedLinkActivityFeed.tsx` (exists, not wired into `ShareReviewWorkspace`).

**Approach:** (a) Pass `showInlineRows` (or a new `showTotals`) to the panel. (b) Add
`aggregateRowsByNode` or a toggle. (c) Import + render `SharedLinkActivityFeed` in
`ShareReviewWorkspace` with recipient-appropriate filtering.

**Test decision:** `NOT_REQUIRED`.

---

## UNIT-11 — P2/P3 cleanup bundle [BUG-5, BUG-7, BUG-9, BUG-10, BUG-11, BUG-12, PERF-3/4/5, SEC-2, UX-1, DEC-7]

Bundle of independent low-risk cleanups; pick any subset:
- Wire `activeNodeId` highlight (BUG-5) — `SharePageTabs.tsx:923`.
- Drop/cap password backoff sleep (BUG-7) — `password/route.ts:103-105`.
- Resolve `issuance`/v1.2 dead schema (BUG-9) — populate or remove + document.
- Delete dead store methods after grep confirmation (BUG-10).
- Add snapshot-read runtime guard (SEC-2/BUG-11).
- Extract duplicated route helpers (BUG-12) into `src/lib/publication/route-helpers.ts`.
- Fix loading skeleton widths (PERF-5).
- Surface signature hash in decision UI (DEC-7).
- Make the comment composer target explicit / add a "change target" control (UX-1).
- Pass already-resolved snapshot into store methods (PERF-3).

**Test decision:** `NOT_REQUIRED` per item; `TEST_PROPOSAL` for the snapshot guard if
treated as a security control.

---

## UNIT-12 — Feature backlog (larger product scope) [UX-2…UX-10, DEC-4/5/6, ACT-2]

Sequence after the headline (UNIT-1/2/3) lands. Each is a meaningful feature in its
own right; group into a separate planning run when the owner prioritizes:
- Comment threading/replies (schema `parent_id`) — UX-2. **Design basis: D1** (Figma/Linear/Docs anchored comments).
- Resolve/unresolve (schema `is_resolved`) — UX-3. **Design basis: D1** (Open/Resolved/All filter).
- Edit/delete comments — UX-4.
- @mentions — UX-5.
- Attachments / rich text — UX-6.
- Comment filtering/sorting — UX-7.
- Unread/new-since-last-visit — UX-9.
- Reply notifications — UX-10.
- Multi-stakeholder decision workflow — DEC-4.
- RFI / question-as-first-class — DEC-5.
- Mark-as-reviewed per section — DEC-6.
- Realtime updates (SSE / WebSocket / Cloudflare DO `COLLAB_ROOMS`) — ACT-2.

**Test decision:** Varies; most warrant `TEST_PROPOSAL` at minimum given schema/auth
surface. Await explicit owner prioritization + `TEST_TASK`.

---

## UNIT-13 — Wide-canvas split-pane + per-node roll-up [D4/D5, design-driven]

**Goal:** At `xl`/`2xl`, use the reserved 1440px canvas as a sticky Summary tree rail +
content pane (industry WBS/CBS norm), and make per-node cost roll-up the dominant
hierarchy so tree / donut / table feel like one coherent model.

**Design basis:** `09-DESIGN-AND-UX-TARGET.md` §4 D4/D5 (Tier 2). The codebase already
explicitly defers the split-pane (`ShareContainer.tsx` inline comment).

**Depends on:** none (independent), but delivers more after UNIT-10a/10b (nav totals +
area donut) since it promotes those into a persistent layout.

**Exact paths / current symbols:**
- `src/components/share/ShareContainer.tsx:17-18` — single-column width ladder;
  `lg:max-w-[1120px] xl:max-w-[1280px] 2xl:max-w-[1440px]` reserved but unused for split.
- `src/components/share/SharePageTabs.tsx:898-927` — the tree panel is `hidden lg:flex
  lg:w-[260px]` beside the view, inside the single column. At xl/2xl the panel should
  become a **sticky rail** and the layout should become a two-pane grid.
- `src/components/share/SharePageTabs.tsx:472-480` — `wrapTreeWithRoot` already provides
  the virtual root; per-node totals come from `node.total`/`rowCount` (already computed
  by reconstruction).
- `src/components/share/SharePageTabs.tsx:654-685` — donut + bucket list currently scoped
  to the whole active content; D5 wants a node click to **retarget** the donut + Details
  table to the selected node's scope.

**Approach:**
1. At `xl`/`2xl`, switch `ShareContainer` (or a new share-specific layout wrapper) to a
   `grid-cols-[260px_minmax(0,1fr)]` (or wider rail) with the tree panel `sticky` and
   persistent. Keep the single column at `<xl`.
2. Make every tree node's roll-up total visually prominent (tabular-nums, `text-ink`) —
   the data already exists (`node.total`); it's just not rendered in the panel today
   (`showInlineRows={false}`, UNIT-10a flips this).
3. Add a "selected node" concept: clicking a node retargets the donut aggregation and
   the Details table to that node's row scope (new `activeNodeId` state — partially
   exists as the dead `activeNodeId` prop, BUG-5/UNIT-11).

**Design invariants (do not regress):** keep the paper/document-like feel; do not turn
into a "dashboard." Defer to Philip on final visual language (DESIGN.md is alpha).

**Test decision:** `NOT_REQUIRED` (layout/IA; static + type evidence). Browser/visual
proof only on explicit user request — and recommended here since this is a visual change
(record as `TEST_PROPOSAL` if the implementing agent judges regression risk).

---

## UNIT-14 — Mobile persistent decision CTA + decision/audit record [D2/D3, design-driven]

**Goal:** (a) A sub-md sticky bottom **"Review & respond"** primary CTA so a phone client
never hunts for how to respond (currently `StickyDecisionBar` is desktop-only). (b) Once
decided, a durable **Decision record** block (signer, timestamp, decision type, note,
estimate version) + an honest e-approval-vs-e-signature one-liner.

**Design basis:** `09-DESIGN-AND-UX-TARGET.md` §4 D2/D3 (Tier 1). Research: ACM
"Accountability" pattern; mobile-first "one primary action visible"; e-approval honesty.

**Depends on:** none (independent). (b) partly depends on populating `issuance`
(BUG-9/UNIT-11) for the version number, but can ship without it initially.

**Exact paths / current symbols:**
- `src/components/share/StickyDecisionBar.tsx:31` — `hidden … sm:block` (desktop only).
- `src/components/share/ShareReviewWorkspace.tsx:68-77` — mobile bottom nav (`sm:hidden`),
  `grid-cols-4` anchor jumps. D3 adds a persistent primary CTA to this surface.
- `src/components/share/SharePageDecision.tsx:350-377` — locked decision badge. D2
  replaces/augments with a durable Decision record block.
- `src/lib/publication/public-repository.ts:959` — `signature_intent_hash` already stored
  but not surfaced (DEC-7). D2 surfaces it as a trust artifact.

**Approach:**
1. (D3) Add a sub-md sticky bottom CTA — single primary "Review & respond" → scrolls to /
   opens the decision surface. Keep the existing `grid-cols-4` nav; elevate the decision.
2. (D2) Render a durable Decision record block once decided: signer name, timestamp,
   decision type, optional note, estimate version/issue (from `issuance` once populated).
   Add a calm one-liner distinguishing e-approval from a legally binding e-signature.
3. (D2) Optionally surface the `signature_intent_hash` (truncated) as a trust artifact.

**Design invariants:** tap targets ≥44px (`min-h-11`); keep the calm, paper feel; do not
over-claim legal weight.

**Test decision:** `NOT_REQUIRED` (UI; static evidence). Browser proof only on explicit
request.
