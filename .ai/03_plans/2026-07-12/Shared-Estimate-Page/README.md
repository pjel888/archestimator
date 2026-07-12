# Shared Estimate Page Audit — `/share/[token]`

> **Profile:** `standard` · **This is a READ-ONLY AUDIT & READINESS pack.**
> No application code, tests, migrations, config, provider state, or runtime is
> mutated by this pack. It is an evidence-grounded comprehension + bug/perf/UX
> audit of the client-facing shared proposal page that produces a prioritized
> remediation backlog a fresh executor can implement unit-by-unit without
> re-discovery.
> Canonical execution artifact: this `README.md`.

## 1. Outcome

Audit, comprehend, and memorize **everything** about the shared/publication
estimate page — the client-facing URL the recipient opens, e.g.
`http://localhost:3000/share/FNX2rBm6V-wp5PE4CZnd3RSNezyvGfwmlhmBlFX30EE`:

- Route structure, server component data flow, and the full client component tree.
- The publication snapshot data model and how it is built from the live estimate
  sheet (areas → branches → row items).
- The estimate tree rendering + reconstruction pipeline (the area-branch breakdown).
- The commenting feature, the decision (approve/decline/revision) flow, the activity
  feed, and the recipient-session security model.
- Security/privacy, Cloudflare/D1 posture, performance/speed, accessibility,
  UX/UI completeness, and the outdated-code / bug surface.

Produce a prioritized, evidence-cited remediation backlog (`UNIT-*`) for a *future*
implementation run. **This pack does not implement fixes.** Each finding is recorded
with severity, evidence (`file:line`), and a concrete unit for later execution.

The owner's headline concern — *"there should be a way for the proposal to still have
the proper breakdown the same as in the estimate sheet, row items organized by area
branches … commenting based on components, based on row items"* — is treated as the
spine of this audit and is answered explicitly in §6 and in `06-AREA-BRANCH-COMMENTING-DESIGN.md`.

## 2. Scope

**In scope:**

- Route: `src/app/share/[token]/{page,loading,not-found}.tsx`, `src/app/share/print.css`.
- Share components: `src/components/share/**` (21 files, ~4,090 lines).
- Share lib: `src/lib/share/**` (`reconstruct-share-tree.ts`,
  `aggregate-share-chart-buckets.ts`).
- Publication backend the share page depends on:
  `src/lib/publication/{public-repository,d1-store,snapshot,security,types,activity-helpers,actions,image-url,email-links,share-copy,client-csrf,recipient-limits}.ts`.
- API routes: `src/app/api/share/[token]/{route,comment,decision,session,password,activity,unsubscribe}/`.
- Schema: D1 migrations `0014_publication_shared_links.sql`,
  `0015_publication_admin_sidecars.sql`, `0066_publication_foreign_keys.sql`.
- The estimate-sheet source model the snapshot is built from
  (`src/lib/estimates/{types,tree-hierarchy}.ts`,
  `supabase/migrations/20260518090000_archestimator_core_schema.sql`,
  `20260612094734_estimate_tabs_foundation.sql`,
  `20260614003639_unify_estimate_node_kinds.sql`) — read-only, to compare against
  what the share page exposes.

**Non-goals (explicit):**

- Implementing any fix. All fixes are `UNIT-*` proposals for a future run.
- Running tests, builds, browser automation, or visual QA (User Test Authorization
  Gate). Each risky finding records a `TEST_PROPOSAL` only.
- Re-auditing the Publisher workspace or the workshop estimate editor exhaustively —
  those have sibling packs (`2026-07-12/Publisher-Page-Audit`,
  `2026-07-08/Project-Estimate-Sheet-Performance-Optimization`). Only the slices the
  share page reuses are covered.
- Mutating provider/D1/Cloudflare state.

## 3. Current-state architecture (comprehended)

Full map in `01-CURRENT-STATE-MAP.md`. Summary:

### 3.1 The request lifecycle (server component)

`src/app/share/[token]/page.tsx` (`SharePage`, `force-dynamic` RSC):

1. Parse `params.token` + `searchParams`. Trim/canonicalize the token; redirect on
   non-trimmed token (`page.tsx:182-186`).
2. `resolveProjectPublicationAccessByToken(token)` — resolves the publication by
   HMAC token-hash; returns `{publicationId, passwordRequired, credentialVersion}`
   or `notFound()` (`page.tsx:193-194`).
3. **Password gate**: if `passwordRequired`, verify the `ae_publication_access_*`
   cookie (HMAC-signed, bound to credential version). Missing/invalid → render
   `<ProjectPublicationPasswordGate>` and defer a `password_gate_viewed` analytics
   event via `after()` (`page.tsx:196-231`).
4. **Recipient session boundary**: if a `?recipient=` (or legacy `?rt=`) param is
   present, redirect to `/api/share/[token]/session` which sets the
   `shared_link_session_*` cookie and redirects back to the clean URL
   (`page.tsx:238-240`).
5. On subsequent loads, validate the existing session cookie to recover
   `recipientIdForOpenEvent` (`page.tsx:246-258`).
6. `Promise.all([resolveProjectPublicationSnapshotByToken(token), recipientIdentity?])`
   — parallel snapshot read + (conditional) recipient identity read (`page.tsx:264-272`).
7. `createPublicationViewToken(...)` binds the viewer to the snapshot version
   (`page.tsx:275-279`).
8. Defer three telemetry writes via `after()` (rate-limit check, analytics event,
   raw event) — all best-effort, try/caught (`page.tsx:288-341`).
9. Render `<ProjectPublicationView>` which composes:
   `SharePageSessionBanner` → `SharePageProposalHeader` → `SharePageSummaryCard`
   → `SharePageHero` → `ShareReviewWorkspace` → `<noscript>` fallback
   (`page.tsx:42-86`).

**Critical rendering fact:** the **entire snapshot is embedded in the server-rendered
HTML** — `snapshot.estimates` is passed straight into `ShareReviewWorkspace` →
`SharePageTabs`. There is no client fetch of the snapshot on first paint; the data
ships inline. The separate JSON endpoint `/api/share/[token]` (route.ts) exists but
is a distinct surface (used for programmatic/open-event reads), not the page's data
source.

### 3.2 The client review workspace

`ShareReviewWorkspace.tsx` is the client container. It owns one piece of state —
the active **review target** (`ShareReviewTarget`) — and threads it to:

- `SharePageTabs` (estimate tree + collated table) via `onReviewTargetChange`.
- `SharePageComments` (flat comment list + inline composer).
- `SharePageDecision` (approve / request changes / decline + confirm dialog).
- `StickyDecisionBar` (desktop floating quick-actions; talks to the decision
  component via a `window` `CustomEvent` bus, not props).

The three widgets (comments / decision / activity) are **independent** — no shared
store, no cross-widget query invalidation, no realtime channel. See
`03-FINDINGS-COMMENTING-DECISION.md`.

### 3.3 The estimate tree (the area-branch breakdown)

The tree IS rendered as the **default view** (labeled "Summary"), side by side with
a "Details" collated table (`SharePageTabs.tsx:276,629`). The pipeline:

```
snapshot.estimates[n]
  ├ estimate.treeNodes (recursive group/area, from workshop estimate_nodes)  ─┐
  ├ estimate.tabs[m].treeNodes                                               │  best
  └ estimate.rows[] (each carries nodeId + tabId)                            │  path
                                                                             ▼
getBestShareTree(rows, treeNodes)        src/lib/share/reconstruct-share-tree.ts
  rung 1: buildShareTreeFromSnapshotNodes   ← faithful workshop hierarchy
  rung 2: reconstructTreeByDiscipline       ← >500 rows → flat discipline buckets
  rung 3: reconstructTreeFromRows           ← parse row.designation text (fragile)
  rung 4: reconstructTreeByDiscipline       ← fallback when (3) yields nothing
        ▼
wrapTreeWithRoot(...)   ← synthetic "Estimate · Tab" root
        ▼
ShareEstimateTreePanel (260px nav rail, desktop) + ShareEstimateTreeView (main)
```

So the data layer **preserves** the area-branch hierarchy, and the UI **renders** it —
but the review/comment affordance does **not** reach the node/area level (see §6).

### 3.4 The snapshot data model (what the client actually receives)

All ids are opaque per-publish (`est_…`, `row_…`, `node_…`, `tab_…`, `proj_…`).
Full type detail in `01-CURRENT-STATE-MAP.md`. Key shapes:

- `PublicationSnapshotRow` (`types.ts:67-81`): `id, description, designation,
  discipline, material, quantity, unit, rowTotal, imageUrl?, nodeId?, tabId?`.
  **Drops** `unitCost`, `miscCost`, `contingencyPercentage`,
  `adjustmentPercentage` — only the precomputed `rowTotal` survives.
- `PublicationSnapshotTreeNode` (`types.ts:59-65`): `id, name, kind:"group"|"area",
  tabId?, children[]`.
- `PublicationSnapshotEstimate` (`types.ts:100-112`): carries **both** flat
  `rows[]` and `treeNodes?` and `tabs?` (each tab may have its own `treeNodes?`).

## 4. Status tuple

| Field | Value | Why |
|---|---|---|
| `package_status` | `IMPLEMENTATION_READY` | Audit deliverable complete; remediation units are concrete and evidence-cited |
| `implementation_status` | `COMPLETE` | The **audit** (comprehension + findings + remediation backlog) is complete. Remediation itself is future, separately-authorized work. |
| `release_status` | `NOT_EVALUATED` | No release claim (read-only audit) |
| `plan_lifecycle` | `N/A` | Audit pack; no implementation lifecycle to archive |
| `terminal_status` | `ACHIEVED` | The requested audit outcome is fully delivered |
| `package_action_ceiling` | `IMPLEMENT_LOCAL` | Describes the future remediation units' reach |
| `last_observed_run_scope` | `PLAN_ONLY` | This run only read source/docs/migrations and wrote this folder |

`package_action_ceiling: IMPLEMENT_LOCAL` describes the **remediation units** the
pack proposes, not anything this audit run performed. The audit run itself was
strictly `PLAN_ONLY` (read source/docs/migrations, wrote only this folder).

## 5. Findings summary (full detail in numbered docs)

Severity legend: **P0** = correctness/security/data bug · **P1** = real bug with
user impact or notable perf · **P2** = quality/consistency/tech-debt · **P3** =
minor/nit. Counts: see `04-FINDINGS-REGISTRY.md`.

**Top issues (P0/P1):**

1. **[GAP-1, P1 → the owner's headline ask]** Reviewers **cannot comment on an area
   / branch / component node**. `target_kind` is hard-locked to
   `proposal | estimate | row` in the TS type, the route validator, and the D1
   `CHECK` constraint (`share-review-target.ts:1`, `activity-helpers.ts:18`,
   `migrations/0066…sql:223,265`). The tree renders nodes but node headers fire no
   review handler (`ShareEstimateTreeView.tsx:212-218`). The opaque `node_*` id
   namespace already exists and is reversible, so the data plumbing is 90% there.
2. **[GAP-2, P1]** Tree view has **no per-node "show more"** — a branch with >250
   rows (desktop) / >100 (mobile) is silently truncated with a one-line note and no
   way to expand (`ShareEstimateTreeView.tsx:20-21,190-194`). The collated view has
   Show-more/Load-all; the tree does not.
3. **[BUG-1, P1]** **Cross-widget cache staleness.** Posting a comment updates the
   comments list (optimistic) but never invalidates `["share-activity"]` /
   `["share-decision"]`; recording a decision never refreshes comments/activity.
   Zero `invalidateQueries` calls across all three widgets
   (`SharePageComments.tsx`, `SharePageDecision.tsx`, `SharedLinkActivityFeed.tsx`).
4. **[BUG-2, P1]** **Silent tree degradation at >500 rows.**
   `MAX_ROWS_FOR_TREE = 500` flips the tree to flat discipline grouping with **no
   user-facing signal** (`reconstruct-share-tree.ts:29,352-354`). A 499-row and a
   501-row sheet render structurally completely different.
5. **[BUG-3, P1]** **Decision has no undo / change-response.** Once submitted, the
   UI hard-locks (`SharePageDecision.tsx:350-377`). The server keeps "latest"
   decision and the unique index permits only one row, but no recipient-side
   affordance exists to revise. Also: **decision drafts (note + signer name) are
   NOT persisted** across a forced reload (unlike comment drafts) — a stale-snapshot
   409 mid-decision loses the typed note.
6. **[SEC-1, P1]** The HTML page route sends **no explicit `Cache-Control: no-store`**,
   relying only on `force-dynamic` + Cloudflare defaults. A password-unlocked page's
   HTML could be CDN-cached if edge rules are loose. (Flagged as SEC-1 in the sibling
   Publisher pack; the fix belongs on the share page.) API routes already set
   `no-store`; the page route does not.
7. **[PERF-1, P1]** **No virtualization.** Both tree views mount every expanded node
   + every inline row. "Expand All" is one click and uncapped. On a sheet with
   hundreds of nodes / thousands of rows, DOM size balloons. (Performance budget
   doc rule #2/#3: large trees must not bloat the share receiver route.)
8. **[BUG-4, P2]** **Designation-text delimiter fragility** in reconstruction rung 3.
   The regex `/\s*[>\/\-–—]\s*/` splits on hyphens/slashes, so `"2-Drawer Cabinet"`
   or `"Half-bath"` produce bogus branches. Masked for modern snapshots (rung 1) but
   bites pre-v1.1 snapshots or any case where `treeNodes` is absent.
9. **[BUG-5, P2]** **`activeNodeId` highlight path is dead in production.**
   `ShareEstimateTreeView` supports `activeNodeId` but `SharePageTabs` always passes
   `activeNodeId={undefined}` (`SharePageTabs.tsx:923`). Panel→view scroll works,
   but the destination node is never visually highlighted.

**Notable feature gaps (the "so much lacking" the owner flagged):** comment
threading/replies, resolve/unresolve, edit/delete, @mentions, attachments, comment
filtering/sorting, per-area donut, realtime updates, activity feed not on the
recipient page, no export of discussion, decision drafts not persisted, hardcoded
`en-PH` locale. Full list in `03-FINDINGS-COMMENTING-DECISION.md` §8 and
`07-FEATURE-GAP-BACKLOG.md`.

## 6. The owner's headline ask — answered

> *"there should be a way for the proposal to still have the proper breakdown the
> same with in the estimate sheet … row items organized by area branches … commenting
> based on components, based on row items."*

**Current reality:** the area-branch breakdown **is already shipped to the client and
rendered** as a tree (default "Summary" view) for modern snapshots. The gap is
**commenting granularity**:

- ✅ Comment on the **whole proposal** — works.
- ✅ Comment on a **whole estimate/sheet** — works (collated "Details" view "Ask about
  estimate" button, `SharePageTabs.tsx:806`).
- ✅ Comment on an **individual row / line item** — works in the **collated** table
  (row click → `handleRowReview`, `SharePageTabs.tsx:848`). Does **not** work from
  the tree view (rows there are non-interactive `<div>`s).
- ❌ Comment on an **area / branch / component node** — **impossible**. No `node`
  target kind exists; tree node headers navigate/expand only.

The opaque `node_*` ids are already minted and reversible in the snapshot id map
(`snapshot.ts:160-166`), so enabling node-level commenting is primarily a
**schema-CHECK relaxation + type/route extension + UI affordance** change, not a
snapshot rebuild. Full target design in
`06-AREA-BRANCH-COMMENTING-DESIGN.md`.

**Secondary breakdown-quality gaps** (so the share tree matches the estimate sheet):

- The nav panel shows **no node totals/counts** in production
  (`showInlineRows={false}` at both call sites). The estimate-sheet sidebar does.
- The cost donut is **discipline-only**, not area-only — so chart and tree tell two
  different stories and cannot corroborate each other.
- Tree rows have no "show more" (GAP-2).
- Old snapshots (pre-v1.1) silently fall to fragile designation parsing (BUG-4).

## 7. Execution DAG (remediation units — for a FUTURE implementation run)

Units are proposed for a separately-authorized run. Dependencies:

```
UNIT-1 (node-level review target: schema + type + route)   ← enabler
   │
   ├── UNIT-2 (node-level commenting UI affordance in tree)
   ├── UNIT-3 (row-level commenting from inside the tree view)
   │
UNIT-4 (tree "show more" per node)              ── independent
UNIT-5 (silent-degradation signal at >500 rows) ── independent
UNIT-6 (cross-widget query invalidation)        ── independent
UNIT-7 (decision undo + draft persistence)      ── independent
UNIT-8 (SEC: Cache-Control no-store on page)    ── independent
UNIT-9 (PERF: virtualize large trees)           ── independent
UNIT-10 (nav panel totals + area donut)         ── independent
UNIT-11 (P2/P3 cleanup bundle)                  ── independent
```

Details: `05-EXECUTION-UNITS.md`. Owner can pick any subset; nothing is auto-executed.

## 8. Test policy (User Test Authorization Gate)

All criteria are `NOT_REQUIRED` (audit; cheapest decisive evidence = source
inspection + type/schema inspection). Risky remediation units record
**`TEST_PROPOSAL`** only — they do not authorize running anything. Explicit user
`TEST_TASK` required before any test/build/browser execution. See
`08-TEST-POLICY.md`.

## 9. Authorization boundaries

**None active.** This audit touched only local source/docs/migrations (read) and
wrote only this plan folder. No `AUTH-*`. A future implementation run that touches
D1/Cloudflare uses the standing Cloudflare-resource authorization in `AGENTS.md`
(bound resources only); the node-target schema relaxation is a new D1 migration in
`./migrations/` under that standing authorization. No new boundary is created here.

## 10. Resume / handoff

- **Resume point:** read this README, then `04-FINDINGS-REGISTRY.md` for the
  prioritized list, then `05-EXECUTION-UNITS.md` for the unit to execute.
- **First unit (recommended):** `UNIT-1` (node-level review target) — it is the
  enabler for the owner's headline ask (UNIT-2/UNIT-3) and is self-contained
  (schema + type + route validator + label maps).
- **Design authority for the headline feature:** `06-AREA-BRANCH-COMMENTING-DESIGN.md`.
- **Evidence freshness:** all citations are vs. current `main` at audit time
  (commit `2dab33405d`). Re-read cited files immediately before implementing.
- **Canonical manifest:** `plan-pack.json`.

## 11. Artifact map

| File | Role |
|---|---|
| `README.md` | Entrypoint (this file) |
| `01-CURRENT-STATE-MAP.md` | Architecture, data model, request lifecycle, render chain |
| `02-FINDINGS-PERF-AND-BUGS.md` | Performance + correctness bugs with evidence |
| `03-FINDINGS-COMMENTING-DECISION.md` | Commenting/decision/activity UX audit + feature gaps |
| `04-FINDINGS-REGISTRY.md` | Consolidated, deduplicated, severity-ranked finding list |
| `05-EXECUTION-UNITS.md` | `UNIT-*` remediation packets (dependency DAG) |
| `06-AREA-BRANCH-COMMENTING-DESIGN.md` | Target design for the headline node/area commenting feature |
| `07-FEATURE-GAP-BACKLOG.md` | The "so much lacking" feature backlog (beyond headline) |
| `08-TEST-POLICY.md` | User Test Authorization Gate decisions per unit |
| `09-DESIGN-AND-UX-TARGET.md` | Research-backed design/UX target (2025-2026 best practices) |
| `10-VARIANTS-CLARIFICATION.md` | Confirms "variants" is a non-gap on this surface |
| `evidence/audit-sources.txt` | Source files inspected |
| `plan-pack.json` | Canonical machine-readable manifest |

## 12. Improve-pass changelog (frontier-readiness repair)

This pack was improved via `Improve-Plan-Prompt.md`. Repairs (semantic, not prose churn):

- **Added `09-DESIGN-AND-UX-TARGET.md`** — closes the design/UX-depth gap. Grounds the
  target experience in 2025-2026 best-practice research (Figma/Linear/Docs anchored
  comments; ACM approval-process patterns; WBS/CBS cost-tree norms; mobile-first review;
  trust-signal research) and the alpha `DESIGN.md` language. Adds prioritized design
  targets D1–D8 mapped to units.
- **Added `10-VARIANTS-CLARIFICATION.md`** — closes the "variants should be
  accommodated" question with evidence: no estimate-variant concept exists; component
  variants are a Workshop-Library concern (sibling pack); estimate tabs are already fully
  shipped. Records `DEC-AUTO-006`.
- **Added UNIT-13/UNIT-14** to the execution DAG — design-driven units for the
  wide-canvas split-pane + per-node roll-up (D4/D5) and the mobile decision CTA +
  decision/audit record (D2/D3).
- **Extended `07-FEATURE-GAP-BACKLOG.md`** — 8 new design-driven items (#27–34) + an
  explicit "NOT a gap" row for variants, + revised sequencing that front-loads the
  research-backed premium-feel work.

No application code, tests, migrations, or config were touched. Only the plan folder
changed. The improve pass was strictly `PLAN_ONLY`.
