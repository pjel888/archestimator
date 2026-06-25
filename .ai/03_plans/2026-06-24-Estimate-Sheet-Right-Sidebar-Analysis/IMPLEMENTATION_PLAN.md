# IMPLEMENTATION_PLAN — Estimate Sheet Right Sidebar

> **Canonical implementation plan** produced by applying
> [`.ai/08_prompts/000_Planning Prompts/Create-Implementation-Prompt.md`](../../08_prompts/000_Planning%20Prompts/Create-Implementation-Prompt.md)
> to the documents in this plan pack. Satisfies the template's 22-section
> contract (template lines 119-312).
>
> **Pass**: Create-Implementation-Prompt (2026-06-25)
> **Lead**: Sisyphus orchestrator
> **Master goal**: [GOAL.md](./GOAL.md)
> **Coordination log**: [LOOP_LEDGER.md](./LOOP_LEDGER.md)
> **Source documents**: 31 docs in this pack (00-README through 30-HANDOFF)
>
> ## Production notes
>
> Six Wave-1 specialist planning agents (L1-L6) were dispatched in
> parallel. **Five lanes (L1, L2, L3, L4, L6) exceeded the 30-minute
> infrastructure queue limit** — the same systemic pattern documented in
> [30-HANDOFF.md](./30-HANDOFF.md) Track 1 from the prior
> `Improve-Plan-Prompt` pass. Lane L5 was still running at time of
> writing; its sections (§10, §14, §15, §16) were also lead-authored to
> unblock synthesis.
>
> Per template line 70: *"If native subagents are unavailable, execute
> the same workstreams separately and preserve independent review."*
> Each section marked **Lead-authored fallback** was produced by the
> lead directly from the source docs the corresponding lane was
> assigned. Wave 3 (adversarial reviewer R1 + independent verifier R2)
> provides the independent-review guarantee required by template
> lines 314-344.
>
> ## Relationship to existing [18-IMPLEMENTATION-PLAN.md](./18-IMPLEMENTATION-PLAN.md)
>
> The existing 96-line `18-IMPLEMENTATION-PLAN.md` is a Phase 1-4 task
> stub. This canonical `IMPLEMENTATION_PLAN.md` (template-mandated
> filename per template line 113-115) **expands** doc 18 into the full
> 22-section plan the template requires. Doc 18 is preserved as a
> historical artifact; it is referenced (not replaced) by §12 Phased
> Implementation.
>
> ## How to navigate this plan
>
> - **§1-§5**: Executive summary, source refs, scope, current-state,
>   target-state.
> - **§6-§11**: UX, architecture, data, security, performance,
>   blast-radius.
> - **§12-§17**: Phased implementation (most-detailed), testing,
>   deployment, observability, risk register.
> - **§18-§22**: Pros/cons, SWOT, definition of done, traceability,
>   open decisions.
>
> Each section ends with a `---` separator. Every factual claim cites
> its source doc via relative link. Lane fallbacks are disclosed inline.

## 1. Executive Summary

### Feature objective

The Estimate Sheet Right Sidebar is a **functionally broad but
persistence-dishonest** feature surface
([00-README.md](./00-README.md)). Three top-level tabs (Library /
Project / Templates) provide extensive browsing, insertion, and
management capabilities — but several actions that look like CRUD are
**local-only mutations** that disappear on refresh. The most
consequential gaps: Component Edit, Duplicate, and Delete operate on
local React state without server persistence, while the UI implies
database operations. The most misleading affordance: "Live source" /
"Read-through source" chips on reusable project-source previews
suggest ongoing sync that does not exist — insertion is a snapshot
copy.

This canonical implementation plan converts the 31-doc forensic audit
in this pack into one executable plan that closes every P1 finding in
Phase 1, every in-scope P2 finding in Phases 2 and 3, and the lone P3
finding in Phase 3.

### User value

After this plan ships:

- Every sidebar CRUD action **persists server-side or honestly labels
  itself as local-only.** User trust no longer erodes on refresh.
- Every Delete is **reversible** via Restore (archive, not hard delete).
- Every Duplicate creates a real DB row with a real UUID, not a
  `custom-${Date.now()}` placeholder.
- Every Edit via the canonical `AddComponentModal` preserves variants,
  attachments, and price history across the edit.
- Reusable project sources are **honestly labeled** as snapshot copies.
  The misleading "Live source" chip is gone.
- Template Groups stop pretending to be persistent — categories emerge
  from template data.
- Project-source search stops racing — stale responses are dropped
  silently.
- Phase 1 ships behind a feature flag
  (`NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`) so the change is
  reversible in one redeploy.

### Technical approach

The plan wires existing RPCs to existing UI affordances — no new
infrastructure, no new dependencies, no new abstractions, no schema
changes. The four RPCs needed for Phase 1
(`executeBulkArchiveLibraryComponents`,
`changeCostLibraryComponentLifecycleState`,
`createCostLibraryComponent`, `updateCostLibraryComponent`) already
exist in `src/lib/component-library/actions.ts`
([01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) line 83) and
have verified auth guards
([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
§ Authorization).

Phase 1 is six tasks of S/M complexity (~1-2 engineering weeks,
[22-RISK-REGISTER.md](./22-RISK-REGISTER.md) deadlines T0+1w to
T0+2w). Phase 2 is four tasks (S complexity). Phase 3 is five tasks
(one L refactor, four S/M). Phase 4 (mobile drawer) is future work,
deferred per RR-12.

The plan uses the project's established discipline: Vitest jsdom for
unit/DOM tests, Playwright for E2E, axe for a11y, TanStack Query for
cache invalidation, Radix for context menus, feature flag for
reversibility, telemetry for adoption measurement, and the existing
`AddComponentModal` (shared with the Components page) as the canonical
create/edit surface.

### Expected outcome

- All 5 P1 findings closed (F-01, F-03, F-04, F-05, F-06, F-10, F-11).
- All in-scope P2 findings closed (F-02, F-09, F-12 partial, F-13,
  F-14).
- The lone P3 finding closed (F-15).
- Two P2 findings explicitly accepted (F-07 favorites, F-08 ordering —
  multi-device sync deferred per RR-09, RR-10).
- One P2 finding explicitly deferred (F-12 mobile portion — Phase 4
  per RR-12).
- Plan-pack score (per [28-SCORECARD.md](./28-SCORECARD.md) baseline
  83.2) rises to ≥90 weighted overall after implementation; launch
  readiness explicitly conditional on closing RR-18 (RLS verification)
  before public launch.

### Pass notes

This canonical plan was produced by the Sisyphus lead orchestrator
running the `Create-Implementation-Prompt.md` template against this
pack. Five of six Wave-1 specialist lanes (L1 Source/Requirements, L2
Architecture/Tech, L3 UX/A11y, L4 Backend/DB/Security, L6 Risk/Phased)
exceeded the 30-minute infrastructure queue limit — the same
systemic pattern documented in [30-HANDOFF.md](./30-HANDOFF.md) Track
1 from the prior `Improve-Plan-Prompt` pass. Template line 70
authorizes lead-authored fallback: *"If native subagents are
unavailable, execute the same workstreams separately and preserve
independent review."* Wave 3 (adversarial reviewer R1 + independent
verifier R2) is dispatched after synthesis to provide the
independent-review guarantee.

---

---

## 2. Source References

> Lane L1 was dispatched to produce this section but exceeded the
> 30-minute infrastructure queue limit (see
> [LOOP_LEDGER.md](./LOOP_LEDGER.md) Wave 1 L1 entry). Lead-authored
> fallback per template line 70.

### Documents reviewed

This plan is built from all 31 documents in this plan pack plus the
project-level `AGENTS.md`. Every doc is in
`.ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/`.

| Doc | Purpose | Authority | Conflicts | Key requirements contributed |
|---|---|---|---|---|
| [00-README.md](./00-README.md) | Executive summary, finding count, recommended Phase 1 | Primary — pack orientation | None | Phase 1 scope, top 5 findings |
| [01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) | File inventory, query-key map, Mermaid diagrams | Primary — code map | None | All file paths in §13 |
| [02-TERMINOLOGY-AND-DOMAIN-CONTRACT.md](./02-TERMINOLOGY-AND-DOMAIN-CONTRACT.md) | Domain glossary, tab-naming gate | Primary — domain | None | F-02 disambiguation |
| [03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) | Every user-visible action, trigger → handler → persistence | Primary — behavior | None | §6 user journeys |
| [04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md) | Persistence matrix per entity/action | Primary — data | None | §8 data plan; F-01/F-03/F-06 evidence |
| [05-SIDEBAR-SHELL-AND-LIFECYCLE-AUDIT.md](./05-SIDEBAR-SHELL-AND-LIFECYCLE-AUDIT.md) | Dynamic import, lazy load, resize, collapse | Primary — shell | None | §4 current state |
| [06-LIBRARY-TAB-CRUD-AUDIT.md](./06-LIBRARY-TAB-CRUD-AUDIT.md) | Component + folder CRUD lifecycle | Primary — library | None | §6 library screen |
| [07-PROJECT-TAB-AUDIT.md](./07-PROJECT-TAB-AUDIT.md) | Projection model, read-only intent | Primary — project | None | §6 project screen |
| [08-TEMPLATES-CRUD-AUDIT.md](./08-TEMPLATES-CRUD-AUDIT.md) | Template create/rename/delete + groups | Primary — templates | None | §6 templates screen; F-10 |
| [09-REUSABLE-PROJECT-SOURCES-AUDIT.md](./09-REUSABLE-PROJECT-SOURCES-AUDIT.md) | Progressive source loading, search, insertion | Primary — sources | None | F-04, F-11 |
| [10-INSERTION-DRAG-DROP-AND-BULK-AUDIT.md](./10-INSERTION-DRAG-DROP-AND-BULK-AUDIT.md) | Target eligibility, drag payloads, bulk | Primary — DnD | None | §6 drag journeys |
| [11-SEARCH-FILTER-VIEW-AND-PREFERENCES-AUDIT.md](./11-SEARCH-FILTER-VIEW-AND-PREFERENCES-AUDIT.md) | Search, facets, view modes | Primary — search | None | §6 J7 |
| [12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) | IA, typography, keyboard, screen reader | Primary — a11y | None | §6.6 a11y requirements |
| [13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md) | State machine, query/mutation inventory, races | Primary — state | None | §7 tech architecture; F-04 |
| [14-PERFORMANCE-AUDIT.md](./14-PERFORMANCE-AUDIT.md) | Bundle, render, complexity | Primary — perf | None | §10 perf; F-13, F-15 |
| [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) | Auth, RLS, uploads, drag payload validation | Primary — security | ⏳ RLS verification pending (RR-18) | §9 security plan |
| [16-EDGE-CASE-AND-TEST-MATRIX.md](./16-EDGE-CASE-AND-TEST-MATRIX.md) | State transitions, concurrency, test gaps | Primary — testing | None | §14 testing strategy |
| [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md) | All 13 findings with severity, evidence, corrections | Primary — findings | None | All sections; §17 risk register |
| [18-IMPLEMENTATION-PLAN.md](./18-IMPLEMENTATION-PLAN.md) | Existing 96-line stub (Phase 1-4 task list) | Primary — task list | None — this canonical plan EXPANDS doc 18; it does NOT replace it | §12 phased implementation |
| [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md) | Verification strategy | Primary — validation | None | §14, §20 testing/DoD |
| [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) | 30 product decisions with recommended defaults | Primary — decisions | None | §22 open decisions |
| [21-TRACEABILITY-MATRIX.md](./21-TRACEABILITY-MATRIX.md) | Finding → decision → task → test mapping | Primary — traceability | None | §21 requirements traceability |
| [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) | 22 risks (15 finding-derived + 7 cross-cutting) | Primary — risks | None | §17 risk register |
| [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md) | Per-task rollback paths, feature flag, staged release | Primary — rollout | None | §15 deployment |
| [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) | Phase 1 telemetry events, metrics, alerts, dashboards | Primary — observability | None | §16 ops; RR-21 |
| [25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) | Per-surface loading/empty/error/success/partial/permission states | Primary — UX states | None | §6.4 state coverage |
| [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md) | P50/P95/P99 latency, bundle, payload, memory ceilings | Primary — perf budget | None | §10 perf; §20 DoD |
| [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) | STRIDE per surface, assets, threat agents, controls | Primary — threat model | Depends on RR-18 close | §9 security; §11 blast-radius |
| [28-SCORECARD.md](./28-SCORECARD.md) | Quality scoring 80.9 → 83.2 baseline | Secondary — meta-audit | None | §1 executive summary |
| [29-AUDIT-REPORT.md](./29-AUDIT-REPORT.md) | Narrative audit report | Secondary — synthesis | None | §1 executive summary |
| [30-HANDOFF.md](./30-HANDOFF.md) | Open work + verification gaps (6 tracks) | Primary — handoff | None | §22 open decisions; §20 DoD |
| [GOAL.md](./GOAL.md) | This pass's master goal | Primary — pass charter | None | All sections |
| [LOOP_LEDGER.md](./LOOP_LEDGER.md) | Lane coordination log for this pass | Primary — pass log | None | §20.8 documentation |
| `AGENTS.md` (repo root) | Project entry point, DB-autonomy mandate, validation policy | Primary — repo rules | None | All sections |
| `.ai/10_state/current-state.md` (FAST PATH block) | Current stage, stack, DB-autonomy, known reds | Primary — state | None | §1, §3 scope |

### Authority conventions

- **Primary** = direct evidence from this plan pack's audit work.
- **Secondary** = synthesis or meta-audit of primary sources.
- **Derived** = lead-authored fallback when the lane timed out (template line 70). Marked inline per section.

### Assumptions

- `> Assumption:` the RPCs listed in [01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) line 83 (`executeBulkArchiveLibraryComponents`, `changeCostLibraryComponentLifecycleState`, `createCostLibraryComponent`, `updateCostLibraryComponent`) behave as documented in their migration files and have the auth guards doc 15 verifies. This is not re-verified at runtime in this planning pass.
- `> Assumption:` Phase 1 ships behind `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1` per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md). The flag default (ON) is an open decision for Philip (item 1 in [30-HANDOFF.md](./30-HANDOFF.md) "Open decisions that need Philip").
- `> Assumption:` the worktree's 30+ unrelated file modifications (see `git status` row in [01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) audit window) remain stable through Phase 1 execution. Re-check before each merge.
- `> Assumption:` vitest full-DOM suite may hang per `.ai/10_state/current-state.md` FAST PATH; Phase 1 uses targeted matrices.

### Conflicts and resolutions

- **No source conflicts identified.** All 31 docs are internally consistent. The Improve-Plan pass (see [30-HANDOFF.md](./30-HANDOFF.md) "What this audit completed") cross-linked finding → risk → rollout → observability so every claim has a durable reference.
- The only open verification is RR-18 (RLS on 8 tables) which is Track 2 in [30-HANDOFF.md](./30-HANDOFF.md). It is not a conflict; it is an open work item.

---

---

## 3. Scope

### In scope

**Phase 1 — Persistence Honesty** (P1 findings, all 5):

- F-01 + F-06: wire component Delete to `executeBulkArchiveLibraryComponents` (Task 1.1, [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md))
- F-03 + F-05: route component Edit through `AddComponentModal` edit mode (Task 1.2)
- F-03: wire component Duplicate through `AddComponentModal` pre-fill (Task 1.3)
- F-11: replace "Live source" / "Read-through source" chips with "Snapshot copy" (Task 1.4)
- F-10: remove "New Template Group" affordance (Task 1.5)
- F-04: add request-identity guard to project-source search (Task 1.6)

**Phase 2 — Terminology + UX Corrections** (P2 findings):

- F-02: rename Project tab to "Project Components" (Task 2.1)
- F-09: add folder Delete to sidebar context menu (Task 2.2) or "Manage in Library" deep link (Task 2.3 — alternative)
- F-12 (persistence portion): persist panel collapse state (Task 2.4)

**Phase 3 — A11y + Performance** (P2/P3 findings):

- a11y hit targets to WCAG 2.2 24×24 minimum (Task 3.1)
- use `thumbnailPath` for sidebar images (Task 3.2)
- extract giant reducer into tab-scoped hooks — F-13 (Task 3.3)
- hover-prefetch dedup — F-15 (Task 3.4)
- fix folder-rename focus race — F-14 (Task 3.5)

**Cross-cutting (every phase)**:

- Feature flag wiring (`NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`)
- Phase 1 telemetry events from [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md)
- Tests for every task per [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md)
- Documentation updates per §20.8

### Out of scope

- Mobile / tablet sidebar drawer (Phase 4, deferred per RR-12 and [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) Q24)
- Multi-device favorites / recents / ordering sync (F-07, F-08 — accepted per RR-09, RR-10)
- Folder reparent / nesting / component-move via sidebar (F-09 partial — full feature is on the Library page; sidebar gets Delete only)
- Live-link project sources (Q15 — snapshots are the honest model)
- Comfortable density toggle (P3 typography — Phase 3+ future)
- Command palette keyboard shortcut (Q29 — current `/` opens search; no change)

### Non-goals

- **No new abstractions.** Phase 1 wires existing RPCs to existing UI affordances. No new interfaces, factories, or layers.
- **No new dependencies.** Use what's installed (Next.js, React, TanStack Query, Zustand, Radix, Phosphor).
- **No design-system changes.** SF Pro / 12px / xs radius / zero letter-spacing / Phosphor regular are owner-gated (DESIGN.md alpha).
- **No production deployment.** This plan ships to a preview environment for the 48-hour hold; production deploy is a separate owner decision per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md).
- **No GitHub/Vercel/Supabase provider changes.** Provider work is release-gated and out of scope for code phases.
- **No redefinition of the Area/Group model.** Q23 keeps "Area" as canonical; migrating legacy "group" copy is future work.

### Deferred work

- **Phase 4 mobile drawer** — deferred per RR-12 until user feedback warrants.
- **RR-18 RLS verification** — Track 2 in [30-HANDOFF.md](./30-HANDOFF.md); separate work session; not blocking Phase 1 implementation but blocks public launch.
- **Performance-budget CI enforcement script** — Track 4 in [30-HANDOFF.md](./30-HANDOFF.md); separate work session.
- **Server-side MIME / size enforcement on upload routes** — Track 3 in [30-HANDOFF.md](./30-HANDOFF.md); separate work session.
- **External image Referer leakage (`referrerPolicy="no-referrer"`)** — Track 3 in [30-HANDOFF.md](./30-HANDOFF.md).
- **Independent verification of this plan's scorecard** — Track 1 in [30-HANDOFF.md](./30-HANDOFF.md); the prior `Improve-Plan-Prompt` pass had 7 subagent timeouts that prevented independent verification; this canonical plan will receive independent verification in Wave 3 of this pass (R2 lane).

---

---

## 4. Current-State Analysis

> Lane L2 was dispatched to produce this section but exceeded the 30-minute
> infrastructure queue limit (see [LOOP_LEDGER.md](./LOOP_LEDGER.md) Wave 1
> L2 entry). Lead-authored fallback per template line 70, using
> [01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md),
> [03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md),
> [04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md),
> [05-SIDEBAR-SHELL-AND-LIFECYCLE-AUDIT.md](./05-SIDEBAR-SHELL-AND-LIFECYCLE-AUDIT.md), and
> [13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md).

### Existing behavior

The Estimate Sheet Right Sidebar (`EstimateRightSidebar` in
`src/components/workshop/component-library/index.tsx`) is the right-hand
panel of the three-pane Estimate Workshop, dynamically imported by
`EstimateSheetContent` with `ssr: false` and a
`ComponentLibrarySidebarFallback` placeholder
([01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) "Feature boundary").

It mounts three top-level tabs and a progressive reusable-source browser:

```
Library (components) → Project (projection) → Templates (custom + reusable project sources)
```

The sidebar's heavy library dataset loads lazily via the
`loadProjectComponentLibraryLite` server action (U4/U18) — the fallback
reserves panel width so the center sheet stays usable while chunk + data
load ([01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) "Feature
boundary").

### Existing architecture

- **Three-pane shell.** `EstimateWorkspaceClient` orchestrates
  `EstimateSheetTree` (left) | `EstimateSheetContent` (center) |
  `EstimateRightSidebar` (right).
- **Single reducer.** `estimateRightSidebarReducer` drives ~40 state fields
  via one action type (`fieldChanged`). Every field update causes a
  full-state clone. React Doctor flags the component with a disable
  comment at line 934 ([17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md) F-13).
- **TanStack Query cache.** Lite library dataset, estimate templates,
  estimate tabs, tab tree, area tree — all keyed per
  [01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) "Query-key map".
  `staleTime` 5 min across the board
  ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
  "Query inventory").
- **Zustand UI store.** `useEstimateUiStore` for cross-component UI state
  (drag intent, focused cell).
- **Browser localStorage.** Favorites, recents, tree ordering, panel
  width, preferences ([01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md)
  "Storage-key map").
- **Server actions.** All writes go through `"use server"` functions in
  `src/lib/component-library/actions.ts` and
  `src/lib/reusable-sources/actions.ts`, each gated by
  `assertCanManageLibrary` / `assertCanManageLibraryFolders` /
  `assertCanEditEstimate` / `assertCanEditProject` RPC guards
  ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
  § Authorization).
- **Optimistic local-state mutations.** Most sidebar mutations update
  `libraryItems` / `templateList` / `libraryFolders` optimistically, then
  reconcile with cache invalidation via `onLibraryDataChanged()`
  ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
  "Mutation inventory").

### Relevant code paths

The single giant reducer at `src/components/workshop/component-library/index.tsx`
is the orchestrator for every sidebar tab + sub-surface. Tree
implementations live in
`src/components/workshop/component-library/tree/` (`LibraryTree.tsx`,
`TemplatesTree.tsx`, `TemplatesTreeModel.ts`, `buildLibraryTree.ts`,
`helpers.ts`, `types.ts`). The canonical persisted create surface is
`src/components/workshop/component-library-manager/AddComponentModal.tsx`,
shared with the Components page. See
[01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) "Primary entry
points" for the complete file map.

### Current limitations

The headline limitation is **persistence dishonesty**
([04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md)):

1. **Component Edit, Duplicate, Delete** all use the `createComponent()`
   helper (`src/components/workshop/component-library/helpers.ts:220-294`)
   which produces local-only items with `custom-${Date.now()}` IDs. They
   never hit a server action, never insert a DB row. They survive sidebar
   remount but **NOT** page refresh or device change
   ([04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md)
   Library Components table).
2. **False invalidation signal.** Local-only Delete calls
   `onLibraryDataChanged?.()`, which invalidates the React Query lite key
   and triggers a background refetch. The refetch returns the original
   data (item still in DB). The sidebar's `libraryItems` is seeded once
   from `initialLibraryItems` and evolves locally — it does NOT re-read
   from cache on invalidation. On remount, `initialLibraryItems` is
   re-derived from the refetched cache → item reappears
   ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
   "The false-signal problem").
3. **Template Groups** are local-only state (`customTemplateGroups`
   field). The "New Template Group" affordance appends to this array.
   Empty groups vanish on refresh because categories are derived purely
   from template `category` strings at render time
   ([04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md)
   Template Groups section).
4. **Misleading "Live source" / "Read-through source" chips** on
   reusable-source previews imply ongoing sync. The RPC
   `insert_estimate_subtree_into_estimate_with_history` copies the source
   subtree as a snapshot — there is no live link
   ([04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md)
   Reusable Project Sources).
5. **Project-source search has no request cancellation.** A slow earlier
   response can overwrite a newer query's results
   ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
   § Race conditions #1; F-04).
6. **Giant reducer (~2,000+ lines)** causes broad re-renders on every
   field update (F-13).
7. **Folder-rename focus race** — context-menu rename uses `setTimeout(0)`
   vs Radix menu close, producing a fragile focus hand-off (F-14).
8. **Hover prefetch dedup missing** — rapid hover on the same project
   source row can issue duplicate prefetch RPCs (F-15).
9. **Sidebar hidden below 1024px** with no mobile entry point (F-12).

The honest paths that **do** work today: component create via
`AddComponentModal` → `createCostLibraryComponent` RPC; folder
create/rename/reorder; template create/rename/delete; project-source
browse + snapshot insert. Each of these enforces server-side auth via the
`is_workspace_editor` / `can_edit_estimate` RPC guards
([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
§ Authorization).

---

---

## 5. Target-State Design

> Lead-authored synthesis from L2 architecture work + L3 UX work + L4
> backend work. Lane L5 (Perf/Test/Deploy) was still running at time
> of writing; if it returns, its outputs replace any conflicting
> statements in §10/§14/§15/§16.

### Target user experience

After Phase 1+2 ship:

- The sidebar's three tabs (Library / **Project Components** /
  Templates) work as users already expect — every visible action
  persists.
- Component **Edit** opens the same `AddComponentModal` used for
  Create, pre-filled with the component's current fields. Variants,
  attachments, and price history are preserved. Save calls
  `updateCostLibraryComponent`. On success the row updates in place
  and the cache invalidates; on failure the modal stays open with an
  inline error.
- Component **Duplicate** opens the same modal pre-filled with
  "(copy)" suffix on the name. Save calls
  `createCostLibraryComponent`. The new row appears at the correct
  position in the tree.
- Component **Delete** (single or bulk) calls
  `executeBulkArchiveLibraryComponents({ itemIds, expectedPreviewHash })`.
  On success a toast "{name} archived." with a **Restore** action
  appears; the Restore action calls
  `changeCostLibraryComponentLifecycleState({ lifecycleState:
  "available" })`. Bulk delete shows a confirm dialog with explicit
  reversibility copy.
- **Template Groups**: the "New Template Group" affordance is gone.
  Categories emerge from template `category` strings — no empty
  groups, no vanishing on refresh.
- **Reusable project sources**: chips say **Snapshot copy**. Insert
  toast reads "Inserted a copy of {source}. Changes to the source
  will not propagate."
- **Project-source search**: stale responses are dropped silently;
  the latest query wins. No UI visible to the user beyond correct
  results.
- **Folder operations**: sidebar context menu exposes Delete via
  `deleteLibraryFolder`. Reparent and nesting remain on the Library
  page.
- **Panel state**: collapse persists across refresh.

### Target system behavior

```
┌─────────────────────────────────────────────────────────────────┐
│ EstimateRightSidebar (orchestrator)                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tablist: Library | Project Components | Templates           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│ │ LibraryTree      │  │ LibraryTree      │  │ TemplatesTree  │ │
│ │ (components)     │  │ (projection,     │  │ (custom +      │ │
│ │                  │  │  read-only)      │  │  reusable      │ │
│ │ Context menu:    │  │                  │  │  sources)      │ │
│ │  - Preview       │  │ Context menu:    │  │                │ │
│ │  - Edit (modal)  │  │  - Preview       │  │ Snapshot copy  │ │
│ │  - Duplicate     │  │  - Add           │  │ chip replaces  │ │
│ │    (modal)       │  │                  │  │ "Live source"  │ │
│ │  - Favorite      │  │                  │  │                │ │
│ │  - Delete        │  │                  │  │                │ │
│ │    (archive RPC) │  │                  │  │                │ │
│ │  - Restore       │  │                  │  │                │ │
│ │    (lifecycle    │  │                  │  │                │ │
│ │     RPC)         │  │                  │  │                │ │
│ └──────────────────┘  └──────────────────┘  └────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PreviewPanel — image, price, trust chips, insert qty, CRUD  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ AddComponentModal — create + edit + duplicate (canonical)   │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server Actions (src/lib/component-library/actions.ts)           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ createCostLibraryComponent  →  cost_library_items INSERT    │ │
│ │ updateCostLibraryComponent  →  cost_library_items UPDATE    │ │
│ │ executeBulkArchiveLibrary   →  cost_library_items UPDATE    │ │
│ │   Components                   lifecycle_state='archived'   │ │
│ │ changeCostLibraryComponent  →  cost_library_items UPDATE    │ │
│ │   LifecycleState               lifecycle_state='available'  │ │
│ │ deleteLibraryFolder         →  library_folders DELETE       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Defense in depth                                                │
│ 1. requireCurrentUserContext (auth)                             │
│ 2. assertCanManageLibrary / assertCanEditEstimate (RPC guard)   │
│ 3. RLS on cost_library_items, library_folders, ... (verify      │
│    RR-18 — Track 2 in 30-HANDOFF.md)                            │
│ 4. expectedPreviewHash on bulk archive (optimistic concurrency) │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture and component boundaries

- **Sidebar** owns: tab state, tree state, preview state, modal
  state, optimistic local cache.
- **Sidebar delegates to center sheet**: every insert intent via
  window CustomEvent (`archestimator:insert-estimate-template`,
  `archestimator:insert-project-source`). The sidebar never writes
  to `estimate_row_items` directly.
- **Server actions** own: every DB mutation. The sidebar never calls
  Supabase directly.
- **RPCs** own: every auth check (`is_workspace_editor`,
  `can_edit_estimate`, `can_edit_project`) + idempotency
  (`correlation_id` on `insert_estimate_subtree_into_estimate_with_history`).
- **Feature flag** (`NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`)
  gates every Phase 1 task. Default ON per
  [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md).

### Data and request flow

**Create flow** (unchanged in Phase 1):
1. User clicks "Add Component" → `AddComponentModal` opens (dynamic import).
2. User fills form, uploads images/attachments (existing flow).
3. Save → `createCostLibraryComponent` RPC → DB insert.
4. Toast "Component created." + cache invalidation.

**Edit flow** (new in Phase 1 Task 1.2):
1. User right-clicks component → "Edit" (or clicks Edit in PreviewPanel).
2. `AddComponentModal` opens in edit mode, pre-filled by component id.
3. User edits fields, variants, attachments.
4. Save → `updateCostLibraryComponent` RPC → DB update.
5. Modal closes on success; stays open on failure with inline error.
6. Toast "{name} updated." + cache invalidation.

**Duplicate flow** (new in Phase 1 Task 1.3):
1. User right-clicks component → "Duplicate".
2. `AddComponentModal` opens pre-filled, name + " (copy)".
3. User reviews and saves.
4. Save → `createCostLibraryComponent` RPC → DB insert (new UUID).
5. Toast "{name} (copy) created." + cache invalidation.

**Delete flow** (rewired in Phase 1 Task 1.1):
1. User right-clicks component → "Delete" (or clicks Delete in PreviewPanel).
2. **Single delete**: no confirm dialog (Restore is the undo).
3. **Bulk delete**: confirm dialog with count + reversibility copy.
4. Confirm → `executeBulkArchiveLibraryComponents({ itemIds, expectedPreviewHash })`.
5. On success: row disappears; toast "{name} archived." with Restore action.
6. Restore action → `changeCostLibraryComponentLifecycleState({ lifecycleState: "available" })` → row reappears; toast "{name} restored."

**Search flow** (rewired in Phase 1 Task 1.6):
1. User types in search box → debounced effect fires
   `searchReusableProjectSources`.
2. Each request stamped with monotonic `requestId` (useRef).
3. On response: `if (requestId !== latestRequestId.current) return;`
4. Only the latest query's response writes to
   `projectSourceSearchResults`.

**Source insert flow** (copy unchanged; chip + toast updated in Task 1.4):
1. User expands project source → outline loads.
2. User clicks "Add to estimate".
3. `insertProjectSourceIntoEstimate` RPC (with `correlation_id`).
4. Toast "Inserted a copy of {source}. Changes to the source will not propagate."

### External integrations

- **Supabase Auth**: session cookie, OAuth/magic-link. Unchanged.
- **Supabase Postgres**: project `ebxxqidacheyapmmzavr`. RPCs +
  RLS. Unchanged.
- **Supabase Storage**: component images + attachments. Upload routes
  unchanged in this plan (Track 3 in [30-HANDOFF.md](./30-HANDOFF.md)
  is separate work).
- **Resend** (email): not used in sidebar scope.
- **Vercel** (hosting): production deploy is a separate owner decision;
  Phase 1 ships to a preview environment for the 48-hour hold.
- **No new third-party services introduced.**

### Phase 1 invariants

The plan preserves these invariants throughout Phase 1:

1. Every server action enforces `is_workspace_editor` or
   `can_edit_estimate` (no client-trust leaks).
2. Every persisted mutation has an undo path (archive → restore; the
   feature flag → legacy behavior).
3. Every Phase 1 task ships behind
   `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`.
4. Every Phase 1 task ships its own telemetry events in the same PR
   (RR-21).
5. No new TypeScript `as any` / `@ts-ignore` introduced.
6. No schema changes (Phase 1-3). The DB-autonomy mandate is not
   invoked except for the optional `library_telemetry_events` table
   creation if missing.
7. No provider (GitHub / Vercel / Supabase settings) changes.

---

## 6. User Experience and Interface Plan

> Lead-authored fallback after Lane L3 (UX/UI/A11y specialist) exceeded the
> 30-minute infrastructure queue limit. Built directly from
> [03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md),
> [12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md),
> and
> [25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md).
> Template line 70 fallback clause: *"If native subagents are unavailable,
> execute the same workstreams separately and preserve independent review."*

### 6.1 User journeys

The right sidebar is a **source browser**, not a destination. Every journey
ends with an insert into the center estimate sheet. Eight journeys cover the
sidebar surface:

**J1 — Browse Library and insert a component.** User clicks the "Library"
tab, optionally searches with `/` or filters via facets, expands folders,
single-clicks a row to preview, then either double-clicks the row or clicks
the `+` affordance to insert at the default quantity ([03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) Library tab rows 14-26).
The sidebar's role ends at the insert callback — the center sheet owns the
estimate_row_items write and the success toast.

**J2 — Edit a component from the sidebar.** Today: right-click → "Edit"
opens the legacy `NewComponentForm` pre-filled, save calls `createComponent()`
which is local-only, the edit disappears on refresh ([03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) row 28 — Persistence `L only`).
**Target (Phase 1 Task 1.2):** Edit opens `AddComponentModal` in edit mode;
save calls `updateCostLibraryComponent`; row updates in place; cache
invalidates; toast "{name} updated." ([25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) Library tree "Success (after Edit)").

**J3 — Duplicate a component.** Today: right-click → "Duplicate" calls
`createComponent()` → local append with `custom-${Date.now()}` ID, never
persisted ([03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) row 29).
**Target (Phase 1 Task 1.3):** Duplicate opens `AddComponentModal` pre-filled
with the source fields + "(copy)" suffix on name; user reviews and saves;
`createCostLibraryComponent` runs; new row appears with toast "{name} (copy)
created." ([25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) Library tree "Success (after Duplicate)").

**J4 — Delete (archive) a component and undo.** Today: right-click → "Delete"
filters local state and fires `onLibraryDataChanged()` (a false invalidation
signal); item reappears on refresh; the undo toast calls no restore RPC
([03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) rows 31, 35, 44).
**Target (Phase 1 Task 1.1):** Delete calls `executeBulkArchiveLibraryComponents`
with `expectedPreviewHash`; on success, toast "{name} archived." with a
**Restore** action that calls `changeCostLibraryComponentLifecycleState({
lifecycleState: "available" })`. Bulk delete shows a confirm dialog:
"Archive {N} components? This can be undone via Restore."
([25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) Library tree "Success (after archive)", Bulk actions "Confirmation (bulk delete)").

**J5 — Browse reusable project sources and insert a snapshot copy.** User
clicks "Templates" tab → workspace loads `listReusableProjectEstimateSources`;
user expands a project row (150 ms delayed skeleton) → loads estimates;
expands an estimate → loads outline via `getReusableEstimateOutline`; clicks
"Add to estimate" on a source → `insertProjectSourceIntoEstimate` runs.
**Today:** chip says "Live source" / "Read-through source" — misleading
([09-REUSABLE-PROJECT-SOURCES-AUDIT.md](./09-REUSABLE-PROJECT-SOURCES-AUDIT.md), F-11).
**Target (Phase 1 Task 1.4):** chip says **Snapshot copy**; on insert, toast
"Inserted a copy of {sourceName}. Changes to the source will not propagate."
([25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) Reusable project sources "Success (source insert)").

**J6 — Create, rename, delete a template; manage template groups.** Create
paths (from Area, from Tab, from scratch) all hit persisted RPCs
([03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) Templates tab rows 65-67).
Rename via `renameEstimateTemplate`, delete via `deleteEstimateTemplate` —
both persisted. **However**, "New Template Group" appends to
`customTemplateGroups` local state only; empty groups vanish on refresh
([03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) row 81, F-10).
**Target (Phase 1 Task 1.5):** remove the "New Template Group" affordance;
categories emerge from template creation only; delete the
`customTemplateGroups` local state.

**J7 — Search and filter sidebar content.** User presses `/` (or clicks the
magnifier) → search dropdown opens, deferred filter on the tree. Facets via
the filter popover. Reusable-source search hits `searchReusableProjectSources`.
**Today:** no request cancellation; a slow response can overwrite a newer
result (F-04). **Target (Phase 1 Task 1.6):** stamp each request with a
monotonic id; reject responses where `requestId !== latestRequestId`. Or use
`AbortController`. ([25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) Search "Stale-response-dropped".)

**J8 — Collapse and resize the panel.** Resize drag persists width to
localStorage + cookie on mouseup ([03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) Panel shell rows 88-89).
**However**, collapse toggle state is local-only — collapses reset on refresh
(F-12 partial, [03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) row 90).
**Target (Phase 2 Task 2.4):** persist panel collapse state.

### 6.2 Roles and permissions

Three effective roles operate on the sidebar surface. Authorization is
enforced server-side via the `is_workspace_editor` RPC guard on every
component-library server action, and `can_edit_estimate` on every
estimate-mutating RPC. RLS enforces the same membership at the database
layer ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)).

| Role | Library tab | Project tab | Templates tab | Source insert |
|---|---|---|---|---|
| **Editor** (`is_workspace_editor = true`) | Full CRUD | Browse + insert | Full CRUD | Allowed |
| **Viewer / Commenter** (`is_workspace_editor = false`) | Browse-only (CRUD affordances hidden client-side; server rejects if bypassed) | Browse-only | Browse-only | Blocked server-side |
| **Non-member** (no project membership) | Sidebar route unreachable (auth gate) | — | — | — |

The "Permission denied" row of every surface in
[25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md)
documents the silent-degrade pattern: viewers see the library without CRUD
buttons; if a viewer bypasses the client gate, the server returns a
standard 403 and the toast surfaces "Couldn't add. You may not have edit
access." ([25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) Drag and drop "Drop (permission denied)").

### 6.3 Screen and component behavior

The sidebar is a three-tab shell rendered inside `ResizableSidePanel`
(`<aside aria-label="…" aria-hidden={collapsed}>`). Each tab owns a toolbar,
a tree, and an optional preview pane. A bulk-action dock floats at the
bottom when checkboxes are selected ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Information architecture").

**Library tab.** Toolbar: search (`/` shortcut), filter facets, view-mode
toggle (Default / Suppliers / Brand — persisted to localStorage),
"Add Component", "Add folder". Tree: shared `Tree` component with folder
expand/collapse, component rows showing name + supplier + price + unit.
Right-click context menu exposes Preview / Edit / Duplicate / Favorite /
Delete. Bulk dock surfaces "Add selected" and "Delete selected".

**Project tab.** Renamed **"Project Components"** in Phase 2 Task 2.1
([02-TERMINOLOGY-AND-DOMAIN-CONTRACT.md](./02-TERMINOLOGY-AND-DOMAIN-CONTRACT.md), F-02).
Read-only projection of the current project's `estimate_row_items` regrouped
by component. Context menu is Preview / Add only — no edit, duplicate, or
delete. This is by design: the Project tab reflects what is *already in the
estimate*, not a CRUD surface.

**Templates tab.** Three sub-sections: custom templates, reusable project
sources, and (legacy) custom template groups. Template CRUD is fully
persisted. Project sources are read-only browse + insert-snapshot-copy.

**AddComponentModal (edit mode, new in Phase 1 Task 1.2).** Shared `Modal`
component using native `showModal()`. Edit mode pre-fills all fields
including variants, attachments, price history — preserved across the edit.
Save calls `updateCostLibraryComponent`; the modal does NOT close until the
RPC resolves (success → close + toast; failure → inline error, modal stays
open). Cancel discards. Same modal serves Create and Duplicate pre-fill
flows.

**Delete confirmation (bulk).** Native `Modal` with summary count and the
explicit reversibility copy. Single-item delete uses a lightweight toast
with Restore action (no modal) — the undo affordance IS the confirmation.

### 6.4 Loading, empty, success, error, degraded states

[25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md)
specifies these for nine surfaces. Phase 1 implementation must close the
`N/S — gap` items in the surfaces it touches.

| Surface | Key states (post-Phase-1) | Gap to close in Phase 1 |
|---|---|---|
| Library tree | Loading / Loaded / Empty (no components) / Empty (no search matches) / Error (load) / Error (RLS denial) / Success (Create, Edit, Duplicate, archive) / Partial-success (bulk archive) / Permission denied / Offline | Empty (no components) copy; RLS denial browse-only mode |
| Project tree | Loading / Loaded / Empty (no estimates) / Empty (search) / Error / Success (insert) | Empty (no estimates) copy |
| Templates tree | Loading (custom) / Loading (sources, 150ms-delayed) / Loaded / Empty (no templates) / Empty (no sources) / Error / Success (create/rename/delete) / Partial-success (bulk insert) | Empty templates copy; Empty sources copy; Delete confirm dependent-count |
| Reusable sources | Loading (expand project) / Loading (expand estimate) / Loaded / Empty (no estimates) / Empty (no nodes) / Error (expand) / Error (search) / Success (snapshot insert) / Permission denied | Empty project/estimate copy |
| Preview panel | Loading / Loaded / Empty (no preview) / Error (stale id) / Trust-chip states | Stale-preview handling (clear + empty state) |
| Folder create/rename | Idle / Creating / Saving / Saved / Save failed / Cancelled / Name empty / Name too long | Name empty inline validation; maxlength=120 |
| Search | Closed / Open empty / Typing / No matches / Error (server) / Stale-response-dropped | Stale-response-dropped is new in Phase 1 Task 1.6 |
| Facets | Closed / Open / Active / No options / Clear-all | Hide facet row when no options |
| Bulk actions | None / Some / All / Acting / Partial failure / Confirmation | Confirmation copy for archive |
| Drag and drop | Drag start / Drag over valid / Drag over invalid / Drop success / Drop invalid payload / Drop permission denied | (no gaps) |
| Panel shell | Expanded / Resizing / Collapsed / Hidden (mobile) | Hidden (mobile) fallback message |

**Operational copy rules.** Toasts use past tense + the entity name ("{name}
archived.", "{name} (copy) created."). Error toasts include a Retry CTA when
the failure is retryable. Bulk partial-success surfaces the failed-item
count in the toast body. Template delete confirmation must show dependent
count (templates that include the deleted template's nodes) — currently a
gap.

### 6.5 Responsive requirements

Per [12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Responsive behavior":

| Viewport | Behavior |
|---|---|
| Below 1024px (`lg`) | Sidebar `display: none`. No fallback message. (F-12, RR-12) |
| 1024px–1366px | Sidebar renders at min width (360px). Dense but usable. |
| 1366px+ | Sidebar renders at saved width (up to 560px max). |
| Browser zoom | CSS-based layout adapts. Text sizes are px (not rem), so zoom scales proportionally. |

**Phase 4 (future, not in scope for this plan's Phase 1-3):** add a
responsive sidebar drawer for below-1024px viewports
([18-IMPLEMENTATION-PLAN.md](./18-IMPLEMENTATION-PLAN.md) Phase 4 Task 4.1).
Currently accepted as **desktop-first** per
[25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) "Panel shell" row.

A minimum responsive Phase 1 concession is to add a fallback message below
1024px (the "Hidden (mobile) N/S — gap" row) so users on tablets know the
feature exists.

### 6.6 Accessibility requirements

[12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md)
is the canonical reference. Verified-correct items and known gaps:

**Verified correct (no change).**

- Tree keyboard pattern: Tab/Shift+Tab, Arrow Up/Down, Arrow Left/Right,
  Home/End, Enter, Space — full APG tree pattern at
  `src/components/workshop/component-library/tree/tree.tsx:1088-1154`
  ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Tree keyboard").
- Inline folder rename stops arrow-key propagation
  (`LibraryTree.tsx:298-342`).
- `/` shortcut is guarded against firing while `AddComponentModal` is open.
- Landmarks, tablist semantics, tree semantics (`role="tree"`,
  `aria-level`/`aria-expanded`/`aria-selected`/`aria-setsize`/`aria-posinset`)
  all verified.
- Drag announcements via `aria-grabbed` and `aria-dropeffect`.
- Loading skeleton has `role="status"` + `aria-label`.
- Error toast has `role="alert"` + `aria-live="assertive"`; success toast
  has `role="status"` + `aria-live="polite"`.
- Visible focus indicators on all interactive elements
  (`border-l-focus`, `focus-visible:ring-2 focus-visible:ring-focus`).
- Reduced motion respected via `motion-reduce:transition-none` and
  `motion-reduce:animate-none`.

**Gaps to close (Phase 1-3).**

- **Hit targets below WCAG 2.2 24×24px minimum** ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Hit targets"): row `+` button 20×20, tree caret 14×14, checkbox ~14×14, preview close 20×20. **P2 a11y defect — Phase 3 Task 3.1.**
- **Context-menu rename focus race** (F-14) — Phase 3 Task 3.5. The inline
  rename input loses focus when the context menu closes; sequence the focus
  hand-off explicitly.
- **Small text below WCAG legibility** ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Typography"): 8px
  source-trust chips and 9px supplier/unit/price labels are below the 10px
  practical minimum. **P3 — Phase 3 future "comfortable density" toggle.**
- **Escape does not close the preview panel** ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Escape hierarchy" item 4).
  **P3.**
- **`aria-controls` missing on tabs** ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Tablist"). **P3.**
- **Nested `<aside>` may produce redundant landmarks** ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Landmarks"). **P3.**
- **Enter during IME composition commits prematurely** ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Enter during IME composition"). **P3 — low risk for English-first product.**
- **`text-tertiary` contrast on 9px labels may fail WCAG AA 4.5:1**
  ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Contrast"). **Not measured** — flag
  for visual QA. High-contrast mode untested.
- **Mobile fallback message** — sidebar disappears silently below 1024px
  with no announcement. Add a `<details>` disclosure or similar on the
  estimate route at mobile widths.

### 6.7 UX acceptance criteria

For each P1 / P2 finding, the user-visible behavior that proves the fix at
the real surface (browser or Playwright proof per the validation plan):

| Finding | UX acceptance proof |
|---|---|
| **F-01/F-06** Component Delete (Phase 1 Task 1.1) | Delete a component → refresh page → component does NOT reappear. Click Restore in toast → refresh → component reappears. Server-side `lifecycle_state = 'archived'` and `available` confirmed via Supabase studio or RPC probe. |
| **F-03/F-05** Component Edit + Duplicate (Phase 1 Tasks 1.2, 1.3) | Edit a component's price → refresh → new price persists. Duplicate → modal pre-filled with "(copy)" name → save → new component appears at the correct place in the tree → refresh → still there. Server `cost_library_items` row created/updated confirmed. |
| **F-10** Template Groups (Phase 1 Task 1.5) | "New Template Group" affordance is gone. Existing local-only groups are removed without data loss (they were never persisted). |
| **F-11** Live source / Read-through source chips (Phase 1 Task 1.4) | Chips say "Snapshot copy". Insert a source → toast text reads "Inserted a copy of {source}. Changes to the source will not propagate." Modify the source estimate → previously-inserted copy does NOT change. |
| **F-04** Project-source search race (Phase 1 Task 1.6) | Two searches in quick succession (fast then slow) → results match the LATER query, not the earlier one. Verified via a deferred-resolution-in-reverse-order Playwright spec. |
| **F-02** Project tab rename (Phase 2 Task 2.1) | Tab label reads "Project Components". |
| **F-09** Folder delete (Phase 2 Task 2.2 or 2.3) | Either: folder delete via sidebar context menu works server-side, OR a "Manage in Library" deep link is reachable. |
| **F-12** Panel collapse persistence (Phase 2 Task 2.4) | Collapse panel → refresh → panel stays collapsed. |
| **F-12 a11y hit-targets (Phase 3 Task 3.1)** | All interactive elements meet WCAG 2.2 24×24px minimum. axe scan returns zero target-size violations on the sidebar. |
| **F-13** Giant reducer extraction (Phase 3 Task 3.3) | React DevTools profiler shows re-renders scoped to the active tab only; interacting with Library does NOT re-render Templates. |
| **F-14** Folder rename focus race (Phase 3 Task 3.5) | Right-click folder → Rename → input receives focus within one animation frame; arrow keys edit cursor position, not tree navigation. |
| **F-15** Hover prefetch dedup (Phase 3 Task 3.4) | Hovering the same source N times triggers at most 1 prefetch RPC. Network panel confirms dedup. |

**Acceptance evidence format.** Each criterion requires (a) a passing test
in the focused vitest or Playwright matrix, AND (b) a real-surface artifact
per the validation plan
([19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md))
— for user-visible behavior, that means a Playwright trace or a Supabase
studio screenshot, not a unit test alone.

---

## 7. Technical Architecture

> Lead-authored fallback (L2 timed out). Source:
> [01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md),
> [13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md),
> [04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md).

### Components and services (target state)

The component boundaries stay as they are today — Phase 1 wires new
behaviors into existing components, no new layers.

```
EstimateRightSidebar (orchestrator)
├── Tablist (Library / Project / Templates)
├── LibraryTree (component rows + folders + context menu + inline rename)
├── TemplatesTree (custom templates + reusable project sources)
├── PreviewPanel (image, price, trust chips, insert qty, edit/dup/fav/delete)
├── AddComponentModal (canonical create + Phase 1 edit/duplicate modes)
├── NewTemplateModal (template create flows)
└── ResizableSidePanel (mouse + keyboard resize, collapse, persistence)
```

Server-side components:

- `src/lib/component-library/actions.ts` — all `"use server"` library CRUD
  + bulk archive preview/execute
- `src/lib/reusable-sources/actions.ts` — all `"use server"` reusable
  source browse + insert
- `src/lib/repositories/component-library-repository.ts` — data access
- `src/lib/repositories/workspace-repository.ts` — workspace + project
  queries
- Supabase RPCs: `is_workspace_editor`, `can_edit_estimate`,
  `can_edit_project`, `create_cost_library_component`,
  `update_cost_library_component`, `executeBulkArchiveLibraryComponents`,
  `changeCostLibraryComponentLifecycleState`,
  `insert_estimate_subtree_into_estimate_with_history`,
  `reorder_library_folders`, `delete_library_folder`

### Interfaces and contracts

**`executeBulkArchiveLibraryComponents({ itemIds, expectedPreviewHash })`**

- `itemIds: string[]` — UUID array of `cost_library_items.id`
- `expectedPreviewHash: string` — server-generated hash from the bulk
  archive preview call; optimistic concurrency guard
- Returns `{ archivedCount: number, failedItems: { id, reason }[] }` (or
  throws on auth failure / hash mismatch)

**`changeCostLibraryComponentLifecycleState({ itemId, lifecycleState })`**

- `lifecycleState: "available" | "archived"` — Restore = `"available"`
- Used by the Restore action in the Delete toast

**`createCostLibraryComponent({ targetWorkspaceId, …fields })`**

- Used by Phase 1 Task 1.3 (Duplicate)

**`updateCostLibraryComponent({ targetItemId, …fields })`**

- Used by Phase 1 Task 1.2 (Edit via modal)

**`searchReusableProjectSources({ …query })` → request-identity guarded**

- Phase 1 Task 1.6 wraps this in a `useRef`-stamped monotonic id check
  before writing results to state. Alternative: `AbortController`.

### API behavior

- All RPCs are `INVOKER` security except `insert_estimate_subtree_into_estimate_with_history`
  which is `SECURITY DEFINER` (verified by convention; pending migration
  check in [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) ⏳).
- All server actions enforce auth via `requireCurrentUserContext()` /
  `ensureDefaultWorkspace()` then the appropriate `assertCanManage…` RPC.
- Drag payloads (`application/x-archestimator-estimate-template`,
  `application/x-archestimator-project-source`) are treated as untrusted
  input at the receiving boundary — `readEstimateTemplateDragPayload` /
  `readProjectSourceDragPayload` validate structure and reject malformed
  data silently ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
  § Drag payload validation).

### Events and asynchronous processing

- **Window CustomEvents** carry insert intents between sidebar and center
  sheet: `archestimator:insert-estimate-template`,
  `archestimator:insert-project-source`,
  `archestimator:create-template-from-node` ([01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md)
  "Event + MIME map").
- **TanStack Query** manages server cache. The lite library key +
  workspace-component-library key + workspace-estimate-templates key
  are the cache invalidation targets after every mutation.
- **Server actions** are async; the sidebar uses optimistic updates +
  rollback-on-failure for every persisted mutation
  ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
  "Mutation inventory").

### Concurrency and idempotency

- **`executeBulkArchiveLibraryComponents`** uses `expectedPreviewHash`
  for optimistic concurrency — if the workspace state changed between
  preview and execute, the RPC throws and the client re-fetches. **Phase
  1 Task 1.1 must surface this failure as a toast, not silent.**
- **`insert_estimate_subtree_into_estimate_with_history`** uses a
  deterministic `correlation_id` (SHA-256-derived UUID) for replay-safe
  dedup. **Verified idempotent**
  ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
  § Idempotency).
- **Template insert** has no idempotency key; double-submit is prevented
  by `pending` state. React Query retry is disabled for mutations in the
  test config; production depends on QueryClient defaults
  ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
  § Idempotency). Low risk — flag for future hardening.
- **Concurrent template insertion** uses a revision-counter guard
  (`getTreeRevision` / `bumpTreeRevision`) verified at
  `EstimateSheetTree.tsx:752-758`
  ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
  § Race conditions #2).

### Failure handling

- **Archive RPC failure** (Phase 1 Task 1.1) → toast "Couldn't archive.
  {error}." + state rollback to pre-mutation. **The current Delete
  implementation does NOT handle failure** because it's local-only —
  Phase 1 must add this.
- **Edit RPC failure** (Phase 1 Task 1.2) → modal stays open with inline
  error, no state change.
- **Duplicate RPC failure** (Phase 1 Task 1.3) → modal stays open with
  inline error, no state change.
- **Search RPC failure** (Phase 1 Task 1.6) → toast "Search failed.
  Retry." Existing behavior; the new request-identity guard doesn't
  change error handling.
- **`onLibraryDataChanged()` false signal** is removed for any genuinely
  local-only path (none remain after Phase 1).

### Dependency boundaries

- **Sidebar → center sheet**: insert intents via window CustomEvents.
  Sidebar never writes to `estimate_row_items` directly — that's the
  sheet's responsibility.
- **Sidebar → server actions**: via `"use server"` functions in
  `src/lib/component-library/actions.ts` and
  `src/lib/reusable-sources/actions.ts`. No direct Supabase client
  calls from the sidebar component.
- **Server actions → RPCs**: RPCs enforce auth; server actions enforce
  input validation. Defense in depth per
  [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md).
- **Sidebar → localStorage**: preferences, favorites, recents, tree
  ordering, panel width. Documented as device-local
  ([04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md)
  Preferences table).

---

---

## 8. Data and Database Plan

> Lane L4 was dispatched to produce this section but exceeded the 30-minute
> infrastructure queue limit (see [LOOP_LEDGER.md](./LOOP_LEDGER.md) Wave 1
> L4 entry). Lead-authored fallback per template line 70, using
> [04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md),
> [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md),
> and [27-THREAT-MODEL.md](./27-THREAT-MODEL.md).

### Schema changes

**None required for Phase 1.** All RPCs
(`executeBulkArchiveLibraryComponents`,
`changeCostLibraryComponentLifecycleState`,
`createCostLibraryComponent`, `updateCostLibraryComponent`) already exist
and operate against existing tables
([01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) line 83). The
archive lifecycle uses `cost_library_items.lifecycle_state` which is
already in the schema.

`> Inference:` if Phase 1 telemetry wiring (Track 5 in
[30-HANDOFF.md](./30-HANDOFF.md)) discovers that
`library_telemetry_events` table does not exist, create it under the
standing DB-autonomy mandate. Verify existence first.

### Data ownership

| Table | Owned by | Scope |
|---|---|---|
| `cost_library_items` | workspace (`workspace_id`) | All library components |
| `cost_library_item_price_options` | workspace via parent component | Variant pricing |
| `cost_library_item_variant_cost_entries` | workspace via parent component | Variant costs |
| `library_folders` | workspace (`workspace_id`) | Folder hierarchy |
| `estimate_templates` | workspace (`workspace_id`) | Custom templates |
| `estimate_template_nodes` | workspace via parent template | Template tree |
| `estimate_template_row_items` | workspace via parent template | Template rows |
| `estimate_nodes` | project via parent estimate | Estimate tree |
| `estimate_row_items` | project via parent estimate | Estimate rows |
| `estimate_tabs` | project via parent estimate | Estimate tabs |
| `library_telemetry_events` | workspace + user | Phase 1 telemetry (verify exists) |

Source: [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) § Assets.

### Validation rules

- **`executeBulkArchiveLibraryComponents`**: requires `itemIds: string[]`
  (UUID array) + `expectedPreviewHash: string`. Server validates hash
  against current state; throws on mismatch (optimistic concurrency).
- **`changeCostLibraryComponentLifecycleState`**: requires
  `itemId: string` + `lifecycleState: "available" | "archived"`.
- **`createCostLibraryComponent`**: enforces
  `LIBRARY_COMPONENT_CAP = 10_000` per workspace (checked via head count
  before insert; see [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) § Quotas).
- **`updateCostLibraryComponent`**: requires `targetItemId`, fields. RPC
  internally re-validates workspace membership.
- **Upload MIME** (existing, unchanged in this plan):
  `ALLOWED_UPLOAD_TYPES = Set(["image/jpeg", "image/png", "image/webp", "image/avif"])`
  and `MAX_CLIENT_SOURCE_IMAGE_BYTES = 20MB`; attachments limited to
  PDF/XLS/XLSX with `MAX_CLIENT_ATTACHMENT_BYTES = 20MB`
  ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) § File uploads).

### Indexing

- The existing `cost_library_items_workspace_browse_active_idx` on
  `(workspace_id, category, name, id) where lifecycle_state <> 'archived'`
  was added by migration `20260625024500_library_component_rows_seed_browse_index.sql`
  per `.ai/10_state/current-state.md` FAST PATH. Phase 1 archive
  operations flip `lifecycle_state` from `available` to `archived`,
  which **removes the row from this index** — exactly the desired
  behavior (archived items disappear from browse).
- No new indexes needed for Phase 1. If Phase 1 telemetry creates
  `library_telemetry_events`, an index on
  `(workspace_id, event_name, created_at)` is recommended for the
  dashboard queries in [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md).

### Migration sequencing

- **Phase 1: NO migrations.** Existing RPCs + existing tables + existing
  indexes cover the work.
- **If `library_telemetry_events` is missing**: a single migration
  creates it (under DB-autonomy mandate). This is a Phase 1 operational
  dependency, not a Phase 1 code dependency — Phase 1 ships behind the
  feature flag regardless; telemetry wiring tracks separately.
- **Phase 2: NO migrations.** Phase 2 tasks are wiring + copy changes.
- **Phase 3: NO migrations.** Pure refactor + perf.

### Backfill

**None.** Archive is a lifecycle_state change on existing rows. No new
columns, no data migration. Existing components stay in
`lifecycle_state = 'available'`.

### Compatibility

- **Archive is reversible** via `lifecycle_state = 'available'`. The
  Restore action in the Delete toast performs this transition. No data
  loss on rollback.
- **Local-only items created before Phase 1 ship** (`custom-${Date.now()}`
  IDs from F-03 helper) are NOT migrated to DB rows — they vanish on
  first refresh after Phase 1 ships. This is the honesty transition
  (RR-17) and must be communicated in release notes. There is no way to
  recover them because they were never persisted.

### Rollback and recovery

- **Feature flag rollback** (`NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1=false`):
  local-only behavior returns; DB archive rows created before the
  rollback remain archived (RR-20 — no auto-un-archive).
- **Per-task rollback paths** are specified in
  [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md).
- **Manual recovery** of a wrongly-archived item: Supabase studio or RPC
  call to `changeCostLibraryComponentLifecycleState({ itemId,
  lifecycleState: "available" })`. This is what the Restore toast does
  automatically.

### Data integrity verification

- Phase 1 acceptance proof for each task requires DB-row confirmation
  (per §6.7 and §14): delete → refresh → row in DB has
  `lifecycle_state='archived'`; restore → refresh → row has
  `lifecycle_state='available'`.
- [04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md) is the
  canonical reference for which entity/action is persisted vs local-only.
  After Phase 1, every row in that table's Library Components section
  should read `PERSISTED` (no more `LOCAL-ONLY` rows for Edit /
  Duplicate / Delete).

---

---

## 9. Security and Privacy

> Lead-authored fallback (L4 timed out). Source:
> [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md),
> [27-THREAT-MODEL.md](./27-THREAT-MODEL.md).

### Authentication

- **Supabase Auth** session cookie is required for every sidebar server
  action. Every function in
  `src/lib/component-library/actions.ts` and
  `src/lib/reusable-sources/actions.ts` begins with
  `await requireCurrentUserContext()` or destructures
  `const { workspace } = await ensureDefaultWorkspace()` (which
  internally requires auth)
  ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) § Authentication).
- Supabase supports Google OAuth and magic link per
  `AGENTS.md` Stack table. No change in Phase 1.

### Authorization

- **Client gating**: sidebar CRUD affordances render based on
  `canEditEstimate` (passed from page) and workspace role. Read-only
  users see fewer buttons
  ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
  § Client gating).
- **Server gating (defense-in-depth)**: every mutating server action
  enforces:
  1. `assertCanManageLibrary` → RPC `is_workspace_editor({ target_workspace_id })` (returns true for editor/admin/owner only)
  2. `assertCanManageLibraryFolders` → same RPC
  3. `assertCanEditEstimate` → RPC `can_edit_estimate({ target_estimate_id })`
  4. `assertCanEditProject` → RPC `can_edit_project({ target_project_id })`
- **VERIFIED** in [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) § Authorization: all 12 mutating actions in `component-library/actions.ts` call the appropriate guard.
- **Phase 1 preserves this**: each Phase 1 task routes through existing
  server actions, so the auth chain is unchanged. No new client-trust
  assumptions introduced.

### Input validation

- **`expectedPreviewHash`** on bulk archive: server-generated hash
  compared against current state. Mismatch throws — guards against
  concurrent workspace mutations.
- **`itemIds: string[]`** UUID array: validated by the RPC.
- **Drag payloads** (`application/x-archestimator-estimate-template`,
  `application/x-archestimator-project-source`): treated as untrusted
  input. `readEstimateTemplateDragPayload` /
  `readProjectSourceDragPayload` validate JSON structure and reject
  malformed data silently
  ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
  § Drag payload validation).
- **Upload MIME** (existing, unchanged):
  `ALLOWED_UPLOAD_TYPES = Set(["image/jpeg", "image/png", "image/webp", "image/avif"])`
  and `MAX_CLIENT_SOURCE_IMAGE_BYTES = 20MB`; attachments limited to
  PDF/XLS/XLSX with `MAX_CLIENT_ATTACHMENT_BYTES = 20MB`
  ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) § File uploads).

### Sensitive data

- **No PII in sidebar scope.** Component cost data, supplier names,
  images, attachments, and template content are workspace-confidential
  but not PII.
- **User preferences (favorites, recents, ordering)**: device-local,
  low sensitivity
  ([27-THREAT-MODEL.md](./27-THREAT-MODEL.md) § Assets).
- **Audit trail**: `estimate_sheet_events`, `library_telemetry_events`
  are integrity-critical.

### Threat model summary

Per [27-THREAT-MODEL.md](./27-THREAT-MODEL.md), the highest-priority open threats:

1. **RR-18: RLS not verified on 8 sidebar tables** — every "Information
   disclosure" row in the STRIDE table depends on RLS being enabled.
   Mitigation: Track 2 in [30-HANDOFF.md](./30-HANDOFF.md) (separate
   work session, not in this plan's scope).
2. **Server-side MIME / size enforcement on upload routes** — client-side
   checks are bypassable. Mitigation: Track 3 in [30-HANDOFF.md](./30-HANDOFF.md).
3. **Storage bucket RLS for images and attachments** — verify bucket
   policies require workspace membership. Mitigation: Track 3.
4. **External image Referer leakage** — add `referrerPolicy="no-referrer"`
   to external `<img>` tags. Mitigation: Track 3.

Phase 1 does not introduce new threats above these. Phase 1's archive
wiring uses the same auth chain as the existing create flow.

### Abuse cases

- **Mass-archive**: a malicious or careless user could archive the entire
  library in one bulk action. Mitigation: confirm dialog with count +
  reversibility copy; Restore per item or via Supabase studio.
- **Malicious drag payload**: rejected by payload readers
  ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
  § Drag payload validation).
- **Cross-workspace ID injection**: rejected because server actions
  validate source ids under RLS-scoped client
  ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
  § Cross-workspace ID injection).
- **Quota bypass**: `LIBRARY_COMPONENT_CAP = 10_000` checked in action,
  not DB. Race could exceed by 1 (RR-22 — accepted risk for
  pre-first-users).

### Auditability

- `estimate_sheet_events` captures estimate mutations.
- `library_telemetry_events` captures library interactions (verify
  exists; create under DB-autonomy if missing).
- `account_security_events` captures auth-related events.
- `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events` capture AI
  tool usage (out of sidebar scope but exist for AI-deferred features).
- `collaboration_audit_events` capture collaboration actions.
- Phase 1 adds 7 telemetry events per [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md)
  (RR-21) — these become the audit trail for persistence-honesty
  adoption.

### Security acceptance criteria

- RR-18 Closed (RLS verified on all 8 sidebar tables) OR explicitly
  waived with documented reason (blocks public launch; does NOT block
  Phase 1 preview ship per item 14 in §22).
- Every Phase 1 task uses an existing server action with verified auth
  guards (no new client-trust surface).
- No new env vars, secrets, or credentials introduced.
- [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) "Highest-priority open
  threats" reviewed; closed or carried forward with explicit owner.
- Upload routes unchanged (Track 3 in [30-HANDOFF.md](./30-HANDOFF.md)
  is separate work).
- Drag-payload validation paths unchanged.

---

---

## 10. Performance and Reliability

> Lane L5 was still running at time of writing. Lead-authored fallback
> per template line 70, using
> [13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md),
> [14-PERFORMANCE-AUDIT.md](./14-PERFORMANCE-AUDIT.md),
> [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md), and
> [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md).

### Performance budgets

Concrete ceilings per [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md). All latencies P50/P95/P99 over a 7-day rolling window; production only.

| Operation | P50 | P95 | P99 | Ceiling |
|---|---|---|---|---|
| Sidebar chunk load (dynamic import) | 200ms | 500ms | 800ms | 1200ms |
| Library lite data load | 300ms | 800ms | 1500ms | 2500ms |
| Templates list load | 250ms | 700ms | 1200ms | 2000ms |
| Reusable project sources list | 300ms | 800ms | 1500ms | 2500ms |
| Project expand | 250ms | 700ms | 1200ms | 2000ms |
| Estimate expand | 400ms | 1000ms | 1800ms | 3000ms |
| Reusable-source search | 400ms | 1200ms | 2500ms | 4000ms |
| Library search (client filter) | 50ms | 150ms | 300ms | 500ms |
| Component create | 500ms | 1500ms | 3000ms | 5000ms |
| Component edit save (Phase 1 Task 1.2 — new) | 400ms | 1200ms | 2500ms | 4000ms |
| Component duplicate save (Phase 1 Task 1.3 — new) | 500ms | 1500ms | 3000ms | 5000ms |
| Component archive (Phase 1 Task 1.1 — new) | 300ms | 900ms | 1800ms | 3000ms |
| Component restore (Phase 1 Task 1.1 — new) | 300ms | 900ms | 1800ms | 3000ms |
| Folder create / rename / reorder | 250-300ms | 700-800ms | 1200-1500ms | 2000-2500ms |
| Template create from node | 600ms | 1800ms | 3500ms | 6000ms |
| Template create from tab | 800ms | 2500ms | 5000ms | 8000ms |
| Template insert into estimate | 500ms | 1500ms | 3000ms | 5000ms |
| Project source insert | 600ms | 1800ms | 3500ms | 6000ms |

**Render budget** per [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md):

| Interaction | Budget |
|---|---|
| Search keystroke to painted filter | 100ms |
| Tab switch | 150ms |
| Tree expand/collapse | 50ms |
| Bulk-select toggle | 50ms |
| Modal open | 100ms |
| Preview panel update | 80ms |

**Bundle size budget** (gzipped):

| Asset | Budget | Enforcement |
|---|---|---|
| Sidebar dynamic chunk | 60KB | CI check (Track 4 in [30-HANDOFF.md](./30-HANDOFF.md)) |
| AddComponentModal nested chunk | 30KB | same |
| Shared `Tree` component | 15KB | same |
| Initial JS for `/workshop/projects/[id]/estimates/[nodeId]` route | 250KB | same |
| Per-route total | 350KB | same |

**Network payload budget:**

| Payload | Budget |
|---|---|
| Library lite dataset | 150KB JSON |
| Templates list | 150KB JSON |
| Reusable project sources (initial) | 50KB JSON |
| Project expand (estimates) | 30KB JSON |
| Estimate expand (outline) | 200KB JSON |
| Search response (ceiling, not target) | 250KB JSON |
| Image thumbnail | 5KB (currently broken — Phase 3 Task 3.2) |

**Memory ceiling:**

| Metric | Ceiling |
|---|---|
| Sidebar JS heap after load | 25MB |
| Sidebar JS heap after 5 min active use | 50MB |
| Long-lived vnode count | 5000 |

### Expected load

- **Single-user edit session** is the dominant pattern. Sidebar is one
  per estimate sheet, per browser tab. Multiple browser tabs multiply
  the load linearly per user.
- **Collaboration edge case**: Realtime cursor broadcast (per
  `use-estimate-cursor-broadcast.ts`) and user presence (per
  `use-project-presence.ts`) — out of Phase 1 scope but documented.
- **Library item limit**: `SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT = 50`,
  `SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT = 100`
  ([14-PERFORMANCE-AUDIT.md](./14-PERFORMANCE-AUDIT.md) "Item limit").
  Sidebar loads at most 100 most-recently-updated non-archived items.
- **Workspace caps**: `LIBRARY_COMPONENT_CAP = 10_000` per workspace;
  `LIBRARY_TEMPLATE_CAP = 2_000`; `REUSABLE_SOURCE_SEARCH_PROJECT_SCAN_LIMIT = 50`.
- **Phase 1 increases RPC count per Delete / Edit / Duplicate by 1
  each** (was 0 RPCs local-only; now 1 RPC + 1 refetch). Total network
  increase per active session: minimal — sidebar interactions are
  bursty, not high-frequency.

### Query and request behavior

- **Library lite dataset**: `loadProjectComponentLibraryLite` skips the
  unbounded audit-graph tables when `includeDetailGraph: false`. For a
  workspace with 1,000 components × 5 variants × 3 cost entries × 2
  attachments, the lite path skips ~10,000 rows of audit/attachment
  data. Cost-determining queries always loaded so lite cost is
  byte-identical to full dataset
  ([14-PERFORMANCE-AUDIT.md](./14-PERFORMANCE-AUDIT.md) "Lite dataset").
- **Project-source search**: two bounded ILIKE pre-filters (U5/PERF-1)
  reduce materialization set. Caps: 25 estimates, 75 tabs/estimate,
  600 nodes, 1200 row items
  ([14-PERFORMANCE-AUDIT.md](./14-PERFORMANCE-AUDIT.md) "Project-source
  search").
- **Indexing**: existing `cost_library_items_workspace_browse_active_idx`
  on `(workspace_id, category, name, id) where lifecycle_state <>
  'archived'` (added by migration
  `20260625024500_library_component_rows_seed_browse_index.sql` per
  FAST PATH in current-state.md). Phase 1 archive flips `lifecycle_state`
  which **drops the row from this index** — desired behavior.
- **Algorithmic complexity**:
  - `buildLibraryTreeWithComponentRows`: O(n) folder mode, O(n × suppliers)
    supplier mode, O(n × brands) brand mode. Acceptable at sidebar
    limit (50-100 items).
  - `searchComponents`: O(n) per query, not indexed.
  - `filterTree`: recursive O(nodes).
  - `buildComponentFacetOptions`: O(n) scan, runs on every dataset
    change.
  - Bulk selection: O(nodes) per toggle; O(selected × tree) prune in
    queueMicrotask.

### Caching

- **TanStack Query** with `staleTime` 5 min across all sidebar queries
  ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
  "Query inventory").
- **`onLibraryDataChanged()`** invalidates the lite key + workspace
  component library key. With `refetchType: "none"` — marks stale but
  does NOT trigger immediate refetch. Next mount/refresh re-fetches.
  Phase 1 preserves this pattern for persisted archive/edit/duplicate;
  removes it for local-only paths (none remain after Phase 1).
- **Cache reuse on remount** is verified in
  `tests/vitest/estimate-sheet-library-lazy-load.test.tsx` (the U4
  lazy-load contract).

### Rate limiting

- **None in sidebar scope** — server actions are auth-gated via
  `is_workspace_editor`. Rate limits are enforced at the project /
  workspace level (per Supabase defaults), not per-action.
- **Quota caps**: `LIBRARY_COMPONENT_CAP = 10_000`,
  `LIBRARY_TEMPLATE_CAP = 2_000` checked in actions (not DB — RR-22
  race-acceptable for pre-first-users).

### Timeouts and retries

- **Server-action timeouts**: Supabase client default (10s).
- **Client retry**: TanStack Query retry is disabled for mutations in
  test config; production depends on QueryClient defaults
  ([13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md)
  § Idempotency).
- **Phase 1 task 1.6 search** has no explicit timeout — relies on the
  request-identity guard to make late responses harmless.
- **Pending-state guards**: every mutation path uses `useTransition` or
  a `pending` ref to disable submit during flight (double-submit
  prevention verified in
  [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
  § Duplicate submission prevention).

### Availability expectations

- **Supabase SLA**: covered by the platform. No sidebar-specific SLO.
- **Vercel SLA**: same.
- **No additional availability work** in this plan.

### Resource constraints

- **Mobile/tablet** (below 1024px): sidebar hidden — RR-12 accepted,
  Phase 4 deferred.
- **Bundle size**: 60KB sidebar chunk + 30KB AddComponentModal. Phase 3
  Task 3.3 (extract reducer) targets no growth or shrinkage.
- **Memory**: 25MB heap after load, 50MB after 5 min active use.
- **Database**: workspace-level quota caps prevent runaway growth.

### Degraded-mode behavior

- **Archive RPC failure** (Phase 1 Task 1.1): toast "Couldn't archive.
  {error}." + state rollback to pre-mutation. **New failure path** —
  current local-only Delete has no failure mode.
- **Edit RPC failure** (Phase 1 Task 1.2): modal stays open with inline
  error.
- **Duplicate RPC failure** (Phase 1 Task 1.3): modal stays open with
  inline error.
- **Search RPC failure**: existing behavior — toast "Search failed.
  Retry." Phase 1 Task 1.6 doesn't change this; the request-identity
  guard is for **late responses**, not errors.
- **Network offline**: existing behavior — toast "Offline. Try again
  when connected." per [25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md).
- **RLS denial**: existing behavior — actions hidden client-side;
  server returns 403 if bypassed.

---

---

## 11. Blast-Radius Analysis

> Lead-authored fallback (L4 timed out). Format per template lines
> 200-206.

### Affected users

- **All editors** using the Estimate Sheet Right Sidebar (every
  authenticated user with `is_workspace_editor = true` on at least one
  workspace).
- **Viewers / Commenters**: not directly affected — they don't see CRUD
  affordances. They benefit from the honesty fix when reading shared
  estimates that reference archived components (the components remain
  visible in the estimate because lifecycle_state doesn't break
  references).
- **Non-members**: unaffected — they cannot reach the sidebar route.

### Affected modules and services

- **`src/components/workshop/component-library/`** — sidebar shell,
  trees, modals, helpers. Every Phase 1 task touches
  `index.tsx` (HIGH edit-conflict risk per §13).
- **`src/components/workshop/component-library-manager/AddComponentModal.tsx`**
  — gains edit mode (Phase 1 Tasks 1.2, 1.3).
- **`src/components/workshop/EstimateSheetContent.tsx`** — owns the
  `onLibraryDataChanged()` callback. Phase 1 may reduce the number of
  call sites (after removing false signals) but does not change the
  callback itself.
- **Server actions in `src/lib/component-library/actions.ts`** —
  consumed unchanged. RPCs already exist.
- **Center estimate sheet** — receives the same insert CustomEvents as
  before. No change.
- **`src/lib/reusable-sources/actions.ts`** — Phase 1 Task 1.6 changes
  client-side guard only; server action unchanged.

### Database impact

- **`cost_library_items.lifecycle_state`** transitions from `'available'`
  to `'archived'` on every Delete, and back to `'available'` on Restore.
- Reversible — no data loss.
- No schema changes.
- Existing index `cost_library_items_workspace_browse_active_idx`
  automatically reflects the lifecycle_state change (archived rows drop
  from the partial index).
- No new tables unless `library_telemetry_events` is missing (Phase 1
  operational dependency; create under DB-autonomy if needed).

### Network impact

- **+1 RPC per Delete** (Phase 1 Task 1.1):
  `executeBulkArchiveLibraryComponents`. Was: 0 RPCs (local-only). Now:
  1 archive RPC + 1 refetch (background React Query refresh).
- **+1 RPC per Edit** (Phase 1 Task 1.2): `updateCostLibraryComponent`.
  Was: 0 RPCs (local-only). Now: 1 update RPC + 1 refetch.
- **+1 RPC per Duplicate** (Phase 1 Task 1.3):
  `createCostLibraryComponent`. Was: 0 RPCs (local-only). Now: 1 create
  RPC + 1 refetch.
- **+1 RPC per Restore** (Phase 1 Task 1.1):
  `changeCostLibraryComponentLifecycleState`. Net new — was not possible
  before.
- Phase 1 Task 1.4 (chip text) and Task 1.5 (template groups) add zero
  RPCs.
- Phase 1 Task 1.6 (search guard) may slightly reduce RPCs (cancels
  stale searches).
- Total network increase per active session: minimal — sidebar
  interactions are bursty, not high-frequency.

### Third-party impact

- **None.** The sidebar surface has no external API integrations.
  Reusable project sources pull from in-workspace Supabase data; upload
  routes hit Supabase Storage. No third-party services touched.

### Backward-compatibility risk

- **Old client state vs new server truth**. Users with sidebar open
  during the deploy will have local-only items in their session. On
  refresh, the server-truth replaces local-truth — local-only items
  (Edit / Duplicate / Delete-via-local-hide) vanish. This is the
  **honesty transition** (RR-17).
  - Risk: users may report "lost edits" or "lost components". The
    components were never real (they were `custom-${Date.now()}` local
    IDs); the loss is perceived, not actual, for the user's
    server-persisted library.
  - Mitigation: release notes explain the fix; in-app toast on first
    interaction explains the persistence change.
- **Old cached React Query data**. The lite library key data shape is
  unchanged. No cache migration needed.
- **Old localStorage preferences**. Favorites, recents, tree ordering
  remain valid (they reference real component UUIDs; if a component is
  later archived, the favorite/recent references a hidden row — which
  is acceptable, the row is not deleted).
- **Feature flag fallback**. If Phase 1 introduces a regression,
  `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1=false` reverts to legacy
  behavior in one redeploy. No data loss; archive rows created before
  rollback remain archived (RR-20).

### Operational risk

- **Archive RPC silent failure** (RR-16). If the RPC fails and the toast
  doesn't surface the error, items appear deleted but aren't.
  Mitigation: error toast on failure; integration test "archive fails →
  item visible after refresh"; alert on archive-RPC error rate > 1%.
- **Phase 1 transition confusion** (RR-17). Users accustomed to
  local-only behavior may report "lost edits". Mitigation: release
  notes + in-app explainer.
- **Local-only items surfacing as "still in library"**. Some users may
  have local-only items that they thought were deleted (the UI said
  "removed from this sidebar view"). After Phase 1, these items
  reappear because they were never actually archived. This is the
  inverse of RR-17 — users see "undeleted" items. Mitigation: release
  notes explain; users can bulk-archive the reappeared items.
- **Edit-modal pre-fill data integrity**. Phase 1 Task 1.2 must
  preserve variants, attachments, price history across the edit.
  Risk: data loss if the modal doesn't fully pre-fill. Mitigation:
  characterization test pins old behavior; new test verifies all fields
  preserved.
- **Concurrent edit + delete race**. Two users editing the same
  component from different devices: server actions enforce
  workspace-editor membership but do not have a per-row lock. Last
  write wins. Mitigation: acceptable for pre-first-users; document as
  known limitation; revisit with optimistic-concurrency tokens if
  conflicts arise.

---

## 12. Phased Implementation

> This section expands the task list in
> [18-IMPLEMENTATION-PLAN.md](./18-IMPLEMENTATION-PLAN.md) into full
> work-packages per the template's phase contract (lines 209-226). The
> existing doc 18 is **preserved as historical context**; this section is
> the authoritative phased plan for the executing codebase AI.
>
> Every task identifier (`1.1`, `1.2`, …) matches the existing doc 18
> numbering. Phase boundaries match doc 18. No new phases invented.

### Common provisions (apply to every phase)

- **Feature flag**: `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1` gates every
  Phase 1 task. Default ON per
  [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md).
  Rollback = set flag OFF; legacy local-only behavior is restored.
- **Stack discipline**: Next.js 16 App Router, React 19, Bun, Vitest (jsdom)
  for unit/DOM, Playwright for E2E. Strict TypeScript — no `as any`, no
  `@ts-ignore`.
- **Design system**: SF Pro, 12px max in-app font, xs-only 3px radius, zero
  letter-spacing, Phosphor Icons regular weight. Reuse
  `src/components/ui/` primitives first.
- **Validation commands** (per the project's CI contract):
  - `bun run type-check` — tsc --noEmit
  - `bun run lint` — ESLint flat config
  - `bun run lint:design-system` — custom design-system enforcement
  - `bun run test` — Bun unit tests (tests/unit/)
  - `bun run test:dom` — Vitest jsdom (tests/vitest/) — prefer targeted
    matrices; full suite can hang per `.ai/10_state/current-state.md` FAST
    PATH block
  - `bun run build` — Next.js production build (release gate)
- **Concurrent-repository safety**: the worktree has 30+ unrelated file
  modifications from other agents. Re-check `git status` before each commit;
  touch only files in this plan's scope.
- **DB-autonomy**: per `AGENTS.md`, the standing Supabase/Postgres
  authorization covers project `ebxxqidacheyapmmzavr`. Phase 1 should not
  need migrations — the RPCs exist. If a missing migration is discovered,
  label it `> Inference:` and do not block.

---

### Phase 1 — Persistence Honesty (P1 findings)

- **Objective**: close every P1 finding (F-01, F-03, F-04, F-05, F-06, F-10,
  F-11). After Phase 1, every sidebar CRUD action persists server-side or
  honestly labels itself as local-only.
- **Requirements addressed**: F-01, F-03, F-04, F-05, F-06, F-10, F-11
  ([17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md) P1 row).
- **Inputs**: the existing RPCs (`executeBulkArchiveLibraryComponents`,
  `changeCostLibraryComponentLifecycleState`,
  `createCostLibraryComponent`, `updateCostLibraryComponent`) are
  implemented in `src/lib/component-library/actions.ts` and have RLS
  guards. The current `AddComponentModal` already supports create mode
  end-to-end. The legacy `NewComponentForm` exists and has test coverage
  that will need updating.
- **Work packages** (6 tasks, S/M complexity):

#### Task 1.1 — Wire component Delete to server-side archive

- **Files**: `src/components/workshop/component-library/index.tsx`
  (delete handlers, single + bulk + preview + row),
  `src/lib/component-library/actions.ts` (RPC already exists).
- **Work**: replace `setLibraryItems(filter)` with
  `executeBulkArchiveLibraryComponents({ itemIds, expectedPreviewHash })`.
  On success → toast "{name} archived." + cache invalidation. On failure
  → toast "Couldn't archive. {error}." + state rollback. Restore action
  in the toast calls
  `changeCostLibraryComponentLifecycleState({ lifecycleState: "available" })`.
  Remove the false `onLibraryDataChanged()` call for hide-only paths.
- **Dependencies**: none — the RPC is live.
- **Parallelizable?** YES — fully independent of Tasks 1.2-1.6.
- **Expected outputs**: archive integration works on single + bulk paths;
  Restore works; refresh confirms persistence.
- **Validation**: `bun run type-check && bun run lint`; targeted vitest
  spec for `executeBulkArchiveLibraryComponents` round-trip; Playwright
  spec `e2e/sidebar-archive-restore.spec.ts` (delete → refresh → not
  visible; undo → refresh → visible).
- **Tests** (per [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md)):
  - Vitest jsdom: `tests/vitest/sidebar-archive.spec.tsx` — covers single
    + bulk + failure + Restore
  - Playwright E2E: `e2e/sidebar-archive-restore.spec.ts`
  - RPC contract test: `tests/vitest/rpc-archive.spec.ts`
- **Exit criteria**: F-01 and F-06 acceptance proof in §6.7 passes; RR-01
  in [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) marked Closed.
- **Risks**: RR-16 (archive RPC silent failure) → mitigated by error
  toast + integration test + alerting.
- **Rollback**: set `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1=false`;
  local-only Delete returns; user archive actions already in DB are
  preserved (RR-20).
- **Complexity**: M.

#### Task 1.2 — Remove legacy `NewComponentForm`; route Edit through `AddComponentModal`

- **Files**: `src/components/workshop/component-library/index.tsx`
  (context-menu Edit handler, preview Edit button),
  `src/components/workshop/component-library/NewComponentForm.tsx` (delete
  or repurpose; tests will need updating),
  `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  (add edit mode).
- **Work**: Edit opens `AddComponentModal` in edit mode; pre-fills all
  fields including variants, attachments, price history; save calls
  `updateCostLibraryComponent`; modal stays open until RPC resolves;
  failure shows inline error. All variant/attachment/history data
  preserved.
- **Dependencies**: `AddComponentModal` must gain edit-mode support
  (read component by id, pre-fill, switch submit handler).
- **Parallelizable?** YES with Task 1.3 — both touch `AddComponentModal`
  edit/pre-fill mechanics; coordinate to avoid edit conflicts.
- **Expected outputs**: Edit via modal persists; refresh confirms;
  variants preserved.
- **Validation**: `bun run type-check && bun run lint`; vitest spec for
  `updateCostLibraryComponent` round-trip; Playwright spec for
  edit-and-refresh.
- **Tests**:
  - Vitest jsdom: `tests/vitest/sidebar-edit-modal.spec.tsx`
  - Playwright E2E: `e2e/sidebar-edit-persists.spec.ts`
- **Exit criteria**: F-03 and F-05 acceptance proof in §6.7 passes; RR-02
  marked Closed.
- **Risks**: `NewComponentForm` test coverage must be migrated or removed
  — flag in PR description.
- **Rollback**: feature flag OFF.
- **Complexity**: M.

#### Task 1.3 — Wire Duplicate to server-side create

- **Files**: `src/components/workshop/component-library/index.tsx`
  (context-menu Duplicate, preview Duplicate button),
  `AddComponentModal.tsx` (reuses edit-mode pre-fill from Task 1.2).
- **Work**: Duplicate opens `AddComponentModal` pre-filled with the
  component's fields + "(copy)" suffix on name. User reviews and saves →
  `createCostLibraryComponent`. New row appears with toast "{name} (copy)
  created."
- **Dependencies**: Task 1.2 (shares modal pre-fill logic).
- **Parallelizable?** YES with Task 1.2 (same author recommended).
- **Expected outputs**: Duplicate persists; refresh confirms; new
  component at correct tree position.
- **Validation**: `bun run type-check && bun run lint`; vitest spec for
  duplicate + create RPC.
- **Tests**:
  - Vitest jsdom: `tests/vitest/sidebar-duplicate.spec.tsx`
  - Playwright E2E: `e2e/sidebar-duplicate-persists.spec.ts`
- **Exit criteria**: F-03 acceptance proof in §6.7 passes; RR-03 marked
  Closed.
- **Risks**: low — RPC exists; modal pre-fill already designed for this.
- **Rollback**: feature flag OFF.
- **Complexity**: S.

#### Task 1.4 — Replace "Live source" / "Read-through source" chips

- **Files**: `src/components/workshop/component-library/index.tsx`
  (lines ~517-523 — preview chip rendering).
- **Work**: replace `<span>Live source</span>` and
  `<span>Read-through source</span>` with `<span>Snapshot copy</span>`
  (+ optional "Captured at [timestamp]" subtitle). On insert, toast:
  "Inserted a copy of {source name}. Changes to the source will not
  propagate."
- **Dependencies**: none.
- **Parallelizable?** YES — fully independent.
- **Expected outputs**: chips say "Snapshot copy"; insert toast matches
  the new copy; modifying source does not change inserted copies.
- **Validation**: vitest snapshot test for chip text; Playwright spec
  verifies toast text.
- **Tests**:
  - Vitest jsdom: `tests/vitest/sidebar-snapshot-chip.spec.tsx`
  - Playwright E2E: `e2e/sidebar-snapshot-toast.spec.ts`
- **Exit criteria**: F-11 acceptance proof in §6.7 passes; RR-06 marked
  Closed.
- **Risks**: none.
- **Rollback**: feature flag OFF (or string revert).
- **Complexity**: S.

#### Task 1.5 — Remove "New Template Group" affordance

- **Files**: `src/components/workshop/component-library/index.tsx`
  (toolbar button + input flow + `customTemplateGroups` state field).
- **Work**: remove the "New Template Group" toolbar button. Remove the
  `customTemplateGroups` state field and any code that reads it.
  Categories emerge purely from template `category` strings
  (`TemplatesTreeModel.ts:226-235`).
- **Dependencies**: none.
- **Parallelizable?** YES — fully independent.
- **Expected outputs**: "New Template Group" button is gone; existing
  local-only groups disappear without data loss (they were never
  persisted).
- **Validation**: `bun run type-check && bun run lint`; vitest spec
  verifies the toolbar button is removed and the tree still renders
  derived categories.
- **Tests**:
  - Vitest jsdom: `tests/vitest/sidebar-template-groups.spec.tsx`
- **Exit criteria**: F-10 acceptance proof in §6.7 passes; RR-05 marked
  Closed.
- **Risks**: existing local-only groups vanish — communicate in release
  notes if any user has them (RR-17).
- **Rollback**: feature flag OFF (state field can be re-added if needed).
- **Complexity**: S.

#### Task 1.6 — Add request-identity guard to project-source search

- **Files**: `src/components/workshop/component-library/index.tsx`
  (search effect in the Templates tab project-sources section).
- **Work**: stamp each `searchReusableProjectSources` request with a
  monotonically increasing id (use `useRef`). On response, check
  `if (requestId !== latestRequestId.current) return;` before writing to
  `projectSourceSearchResults`. Alternative: `AbortController` with
  `signal` cancellation.
- **Dependencies**: none.
- **Parallelizable?** YES — fully independent.
- **Expected outputs**: stale responses dropped silently; only the latest
  query's results render.
- **Validation**: vitest spec for deferred-resolution-in-reverse-order;
  Playwright spec for rapid-search-then-result.
- **Tests**:
  - Vitest jsdom: `tests/vitest/sidebar-search-race.spec.tsx`
  - Playwright E2E: `e2e/sidebar-search-race.spec.ts`
- **Exit criteria**: F-04 acceptance proof in §6.7 passes; RR-04 marked
  Closed.
- **Risks**: low — well-understood pattern.
- **Rollback**: feature flag OFF.
- **Complexity**: S.

#### Phase 1 exit gate

- All 6 tasks merged behind `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`.
- All P1 acceptance proofs in §6.7 captured (test artifact + real-surface
  artifact).
- RR-01..RR-06 marked Closed in
  [22-RISK-REGISTER.md](./22-RISK-REGISTER.md).
- Focused vitest matrix green; `bun run type-check`, `bun run lint`,
  `bun run lint:design-system`, `bun run build` all green.
- Phase 1 telemetry events from
  [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) wired.
- 48-hour hold per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md).

---

### Phase 2 — Terminology + UX Corrections (P2 findings)

- **Objective**: close the P2 findings that are pure UX/copy/label
  changes (F-02, F-09, F-12-partial). After Phase 2, terminology is
  honest and the sidebar offers the missing folder Delete affordance.
- **Requirements addressed**: F-02, F-09, F-12 (persistence-of-collapse
  portion only).
- **Inputs**: existing RPC `deleteLibraryFolder` already exists for
  Task 2.2. Tab label is a string in `LIBRARY_TREE_TABS`.
- **Work packages** (4 tasks, all S complexity):

#### Task 2.1 — Rename Project tab to "Project Components"

- **Files**: `src/components/workshop/component-library/index.tsx`
  (`LIBRARY_TREE_TABS` constant) — string-only change.
- **Work**: change the label from "Project" to "Project Components". No
  internal id change (`id: "project"` stays) to avoid localStorage
  preference migration.
- **Dependencies**: none.
- **Parallelizable?** YES with 2.2-2.4.
- **Validation**: `bun run type-check && bun run lint`; vitest spec
  asserts the rendered label.
- **Tests**: Vitest jsdom: `tests/vitest/sidebar-tab-label.spec.tsx`.
- **Exit criteria**: F-02 acceptance proof in §6.7 passes; RR-08 Closed.
- **Rollback**: string revert.
- **Complexity**: S.

#### Task 2.2 — Add folder Delete to sidebar context menu

- **Files**:
  `src/components/workshop/component-library/tree/LibraryTree.tsx`
  (add Delete action to `createFolderActionGroups`),
  `src/lib/component-library/actions.ts` (`deleteLibraryFolder` already
  exists).
- **Work**: surface a "Delete folder" item in the folder context menu.
  On click, show a confirm dialog ("Delete folder '{name}'? Components
  inside will be unassigned, not deleted."). On confirm, call
  `deleteLibraryFolder`. Toast on success/failure.
- **Dependencies**: none.
- **Parallelizable?** YES with 2.1, 2.3, 2.4.
- **Validation**: vitest spec for the new menu item; Playwright spec for
  delete-and-refresh.
- **Tests**: Vitest jsdom: `tests/vitest/sidebar-folder-delete.spec.tsx`.
- **Exit criteria**: F-09 acceptance proof in §6.7 passes (option A); RR-11
  Closed.
- **Rollback**: menu-item removal.
- **Complexity**: S.

#### Task 2.3 — Add "Manage in Library" deep link (alternative to 2.2)

- **Files**: `src/components/workshop/component-library/tree/LibraryTree.tsx`.
- **Work**: alternative to Task 2.2. Add a "Manage in Library" context
  menu item that deep-links to
  `/workshop/library?folder={folderId}`. Choose EITHER 2.2 OR 2.3 — both
  is redundant.
- **Dependencies**: none.
- **Parallelizable?** NO with 2.2 (mutually exclusive alternatives).
- **Complexity**: S.
- **Note**: doc 18 marks 2.3 as alternative. Recommendation: ship 2.2
  (in-context is faster for users); 2.3 is a fallback if 2.2 grows scope.

#### Task 2.4 — Persist panel collapse state

- **Files**: `src/components/workshop/component-library/index.tsx`
  (collapse state),
  `src/components/workshop/component-library/ResizableSidePanel.tsx`
  (or the parent that owns the collapsed boolean),
  `src/lib/...` for the persistence helper (cookie or
  `user_preferences` RPC).
- **Work**: persist `collapsed` boolean. On mount, read the persisted
  value. On toggle, write through. Use a cookie (SSR-readable) or the
  existing `user_preferences` pattern.
- **Dependencies**: none.
- **Parallelizable?** YES with 2.1, 2.2/2.3.
- **Validation**: vitest spec for collapse-toggle-then-refresh.
- **Tests**: Vitest jsdom: `tests/vitest/sidebar-collapse-persist.spec.tsx`.
- **Exit criteria**: F-12 acceptance proof (persistence portion) in §6.7
  passes.
- **Rollback**: state field revert.
- **Complexity**: S.

#### Phase 2 exit gate

- Tasks 2.1, 2.2 OR 2.3, 2.4 merged.
- Applicable acceptance proofs captured.
- Focused vitest matrix green; type-check + lint + build green.

---

### Phase 3 — Accessibility + Performance (P2/P3 findings)

- **Objective**: close the remaining P2 a11y/perf findings (F-13, F-14)
  and the lone P3 (F-15). After Phase 3, the sidebar meets WCAG 2.2 hit
  targets, the giant reducer is split, and hover prefetch is deduped.
- **Requirements addressed**: F-13, F-14, F-15, plus the a11y gaps
  documented in [12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md)
  (hit targets, focus race).
- **Inputs**: the `EstimateSheetTree` has a robust `onCloseAutoFocus`
  pattern (lines 593-639) that Task 3.5 can port. React Doctor warning
  cleanup is tracked separately in
  `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md`.
- **Work packages** (5 tasks, mixed complexity):

#### Task 3.1 — Increase hit target sizes to WCAG minimum

- **Files**: `src/components/workshop/component-library/...` (row `+`
  button, tree caret, checkbox, preview close).
- **Work**: bump the 20×20 / 14×14 / 14×14 / 20×20 elements to ≥24×24px.
  Use hit-target padding (`p-1.5` extension) without changing the visual
  icon size if density must be preserved.
- **Dependencies**: design review (owner: Philip) on whether visual size
  also changes.
- **Parallelizable?** YES with 3.2-3.5.
- **Validation**: axe scan in Playwright returns zero target-size
  violations on the sidebar.
- **Tests**: Playwright + axe: `e2e/sidebar-a11y-hit-targets.spec.ts`.
- **Exit criteria**: F-12-a11y acceptance proof in §6.7 passes; axe
  violation count = 0 on sidebar.
- **Rollback**: CSS class revert.
- **Complexity**: S.

#### Task 3.2 — Use `thumbnailPath` for sidebar images

- **Files**: `src/components/workshop/component-library/...` (image
  rendering in tree row + preview).
- **Work**: prefer `thumbnailPath` over full `imagePath` when both exist.
  Falls back to full image if thumbnail missing.
- **Dependencies**: verify `thumbnailPath` is generated on upload (per
  [14-PERFORMANCE-AUDIT.md](./14-PERFORMANCE-AUDIT.md)).
- **Parallelizable?** YES.
- **Validation**: Network panel in Playwright shows thumbnail-sized
  responses, not full images.
- **Tests**: Playwright: `e2e/sidebar-thumbnail-usage.spec.ts`.
- **Exit criteria**: thumbnail payload budget from
  [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md) met.
- **Rollback**: path preference revert.
- **Complexity**: S.

#### Task 3.3 — Extract giant reducer into tab-scoped hooks

- **Files**: `src/components/workshop/component-library/index.tsx`
  (~2,000+ lines, the giant reducer).
- **Work**: extract `useLibraryTabState`, `useProjectTabState`,
  `useTemplatesTabState` hooks. Move modal/preview state into a context.
  Remove the React Doctor disable comment at line 934. Each hook owns
  its slice of state; the parent component composes them.
- **Dependencies**: this is a large refactor. Tracks against
  `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md`. Sequence
  AFTER Phase 1 + Phase 2 to avoid merge conflicts.
- **Parallelizable?** NO — refactor of the same component Tasks 1.1-1.6
  touch. Must serialize after Phase 1.
- **Validation**: React DevTools profiler shows re-renders scoped to
  active tab only; bundle size unchanged or smaller.
- **Tests**: existing vitest + Playwright specs must remain green
  (characterization tests pin behavior before refactor).
- **Exit criteria**: F-13 acceptance proof in §6.7 passes; React Doctor
  report clean for the sidebar.
- **Risks**: high — refactor of working code. Use
  `tests/vitest/sidebar-*.spec.tsx` as characterization suite. Run
  characterization tests GREEN against old code FIRST, then refactor.
- **Rollback**: git revert the refactor commits.
- **Complexity**: L.

#### Task 3.4 — Add hover-prefetch dedup

- **Files**: `src/components/workshop/component-library/tree/TemplatesTree.tsx`
  (line 516 `onMouseEnter` handler).
- **Work**: add a `Set<string>` of already-prefetched project ids. Skip
  `onPrefetchNode` if the id is in the set. Clear on tab switch or route
  change.
- **Dependencies**: none.
- **Parallelizable?** YES with 3.1, 3.2, 3.5.
- **Validation**: Network panel in Playwright shows at most 1 prefetch
  per project id across N hovers.
- **Tests**: Playwright: `e2e/sidebar-hover-prefetch-dedup.spec.ts`.
- **Exit criteria**: F-15 acceptance proof in §6.7 passes.
- **Rollback**: Set check removal.
- **Complexity**: S.

#### Task 3.5 — Fix folder-rename focus race

- **Files**:
  `src/components/workshop/component-library/tree/LibraryTree.tsx`
  (lines 535-541, 683-687).
- **Work**: replace the `setTimeout(0)` race with Radix
  `onCloseAutoFocus` + `event.preventDefault()` pattern ported from
  `src/app/workshop/projects/[projectId]/estimates/[nodeId]/_components/estimate-sheet-tree/EstimateSheetTree.tsx:593-639`.
- **Dependencies**: none.
- **Parallelizable?** YES with 3.1, 3.2, 3.4.
- **Validation**: Playwright spec for right-click → Rename → input has
  focus within 1 animation frame.
- **Tests**: Playwright: `e2e/sidebar-rename-focus.spec.ts`.
- **Exit criteria**: F-14 acceptance proof in §6.7 passes.
- **Rollback**: setTimeout pattern revert.
- **Complexity**: M.

#### Phase 3 exit gate

- All 5 tasks merged.
- WCAG 2.2 hit-target axe scan clean for the sidebar.
- React Doctor report clean for the sidebar (or remaining warnings
  documented and accepted).
- All applicable acceptance proofs captured.

---

### Phase 4 — Mobile / tablet access (future, out of current scope)

- **Objective**: add a responsive sidebar drawer for viewports below
  1024px. Currently the sidebar is `display: none` below `lg`.
- **Requirements addressed**: F-12 (mobile portion).
- **Status**: STUB — defer until user feedback warrants. Currently
  accepted as desktop-first (RR-12).
- **Work package** (1 task):

#### Task 4.1 — Responsive sidebar drawer for below-1024px

- **Files**: `src/components/workshop/component-library/ResizableSidePanel.tsx`,
  new drawer component, route shell updates.
- **Work**: at `< lg` viewport, render a slide-in drawer triggered by a
  button in the estimate sheet header. Drawer contains the same
  three-tab shell as the desktop sidebar.
- **Dependencies**: design review (Philip); mobile UX exploration.
- **Parallelizable?** N/A — future work.
- **Validation**: Playwright mobile-viewport spec; responsive visual QA.
- **Complexity**: XL.
- **Target**: post-launch, gated on mobile feedback.

---

### Cross-phase sequencing summary

```
Phase 1 (6 tasks, mostly parallel)  ──┐
                                       ├─► Phase 2 (4 tasks, parallel)
                                       │
                                       └─► Phase 3 (5 tasks; 3.3 serializes after 1.x)

Phase 4 (future, mobile)  ──► gated on user feedback
```

- **Phase 1**: Tasks 1.1, 1.4, 1.5, 1.6 are fully independent. Tasks 1.2
  and 1.3 share `AddComponentModal` mechanics — single author
  recommended.
- **Phase 2**: Tasks 2.1, 2.4 are independent. Task 2.2 and 2.3 are
  mutually exclusive alternatives — pick one. Sequence after Phase 1 to
  avoid merge conflicts in `index.tsx`.
- **Phase 3**: Tasks 3.1, 3.2, 3.4, 3.5 are independent. Task 3.3 (giant
  reducer extraction) MUST serialize after Phase 1 because it refactors
  the same component Phase 1 modifies.
- **Phase 4**: future, not in scope for current execution.

---

## 13. File-Level Change Map

> Lead-authored fallback (L2 timed out). Format per template lines
> 228-233: `File (existing/new) | Responsibility | Changes in this plan |
> Dependencies | Edit-conflict risk`. Pull from
> [18-IMPLEMENTATION-PLAN.md](./18-IMPLEMENTATION-PLAN.md) (task list) +
> [01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) (code map).
>
> **Edit-conflict risk** column flags worktree files actively modified
> by other agents (per `git status` snapshot in the AGENTS.md FAST PATH
> block and [01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md)
> audit window row).

### Phase 1 files (Persistence Honesty)

| File (existing/new) | Responsibility | Changes in this plan | Dependencies | Edit-conflict risk |
|---|---|---|---|---|
| `src/components/workshop/component-library/index.tsx` (existing) | Sidebar orchestrator + giant reducer + all context-menu/preview handlers | Tasks 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 all touch this file | All Phase 1 RPCs | **HIGH** — touched by every Phase 1 task; coordinate single-author per Phase |
| `src/components/workshop/component-library/helpers.ts` (existing) | `createComponent()` local-only helper (the F-03/F-05 culprit) | Task 1.2: remove `createComponent()` usage from Edit/Duplicate paths; consider deleting the helper outright once all call sites are migrated | None | LOW |
| `src/components/workshop/component-library/NewComponentForm.tsx` (existing) | Legacy lightweight create form | Task 1.2: **delete or repurpose** — `AddComponentModal` becomes the only create surface | Test suite must be migrated | LOW |
| `src/components/workshop/component-library-manager/AddComponentModal.tsx` (existing) | Canonical persisted create modal | Task 1.2: add **edit mode** (read by id, pre-fill, switch submit handler to `updateCostLibraryComponent`); Task 1.3: support pre-fill from existing component for Duplicate | Variant + attachment + price history preservation | **MEDIUM** — worktree shows this file is actively modified by other agents |
| `src/lib/component-library/actions.ts` (existing) | `"use server"` library CRUD | Tasks 1.1, 1.2, 1.3 use existing RPCs; no new server actions needed | RPCs `executeBulkArchiveLibraryComponents`, `createCostLibraryComponent`, `updateCostLibraryComponent`, `changeCostLibraryComponentLifecycleState` already exist | LOW — file is read-only for Phase 1 (just consumed) |
| `src/lib/component-library/query-keys.ts` (existing) | TanStack Query key factories | Task 1.1 invalidates the lite key on archive success; Task 1.2 invalidates on edit; Task 1.3 invalidates on duplicate | None | **MEDIUM** — worktree shows this file is actively modified by other agents |
| `tests/vitest/sidebar-archive.spec.tsx` (NEW) | Vitest jsdom spec for archive + restore round-trip | Task 1.1: covers single + bulk + failure + Restore | Test fixtures from existing `component-library-ui.test.tsx` | LOW |
| `tests/vitest/sidebar-edit-modal.spec.tsx` (NEW) | Vitest jsdom spec for edit-via-modal | Task 1.2 | None | LOW |
| `tests/vitest/sidebar-duplicate.spec.tsx` (NEW) | Vitest jsdom spec for duplicate | Task 1.3 | None | LOW |
| `tests/vitest/sidebar-snapshot-chip.spec.tsx` (NEW) | Vitest jsdom spec for chip text + toast text | Task 1.4 | None | LOW |
| `tests/vitest/sidebar-template-groups.spec.tsx` (NEW) | Vitest jsdom spec verifying "New Template Group" button removed | Task 1.5 | None | LOW |
| `tests/vitest/sidebar-search-race.spec.tsx` (NEW) | Vitest jsdom spec for deferred-resolution-in-reverse-order | Task 1.6 | None | LOW |
| `tests/vitest/rpc-archive.spec.tsx` (NEW) | RPC contract test for `executeBulkArchiveLibraryComponents` | Task 1.1 | None | LOW |
| `e2e/sidebar-archive-restore.spec.ts` (NEW) | Playwright E2E for archive → refresh → not visible; undo → refresh → visible | Task 1.1 | Authenticated Supabase session (env constraint per [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md)) | LOW |
| `e2e/sidebar-edit-persists.spec.ts` (NEW) | Playwright E2E for edit + refresh persistence | Task 1.2 | Same | LOW |
| `e2e/sidebar-duplicate-persists.spec.ts` (NEW) | Playwright E2E for duplicate + refresh persistence | Task 1.3 | Same | LOW |
| `e2e/sidebar-snapshot-toast.spec.ts` (NEW) | Playwright E2E for snapshot chip + toast verification | Task 1.4 | Same | LOW |
| `e2e/sidebar-search-race.spec.ts` (NEW) | Playwright E2E for rapid-search-then-result | Task 1.6 | Same | LOW |

### Phase 2 files (Terminology + UX)

| File | Responsibility | Changes | Dependencies | Edit-conflict risk |
|---|---|---|---|---|
| `src/components/workshop/component-library/index.tsx` (existing) | `LIBRARY_TREE_TABS` constant + collapse state | Task 2.1 (string change), Task 2.4 (collapse persistence) | None | HIGH (same as Phase 1) |
| `src/components/workshop/component-library/tree/LibraryTree.tsx` (existing) | Library tree + folder context menu | Task 2.2 (add Delete menu item) or Task 2.3 (add Manage in Library deep link) | `deleteLibraryFolder` RPC exists | LOW |
| `src/lib/component-library/actions.ts` (existing) | `deleteLibraryFolder` server action | No change — RPC already exists | None | LOW |
| `src/components/workshop/ResizableSidePanel.tsx` (existing) | Panel shell with collapse + resize | Task 2.4: persist collapse state via cookie or `user_preferences` | None | LOW |
| `tests/vitest/sidebar-tab-label.spec.tsx` (NEW) | Vitest asserts tab label = "Project Components" | Task 2.1 | None | LOW |
| `tests/vitest/sidebar-folder-delete.spec.tsx` (NEW) | Vitest for folder delete via sidebar context menu | Task 2.2 | None | LOW |
| `tests/vitest/sidebar-collapse-persist.spec.tsx` (NEW) | Vitest for collapse persistence | Task 2.4 | None | LOW |

### Phase 3 files (A11y + Perf)

| File | Responsibility | Changes | Dependencies | Edit-conflict risk |
|---|---|---|---|---|
| `src/components/workshop/component-library/index.tsx` (existing) | Giant reducer | Task 3.3: extract `useLibraryTabState`, `useProjectTabState`, `useTemplatesTabState` hooks | None — refactor of working code | HIGH (Phase 1+2 must merge first) |
| `src/components/workshop/component-library/tree/LibraryTree.tsx` (existing) | Folder rename input | Task 3.5: replace `setTimeout(0)` with Radix `onCloseAutoFocus` pattern from `EstimateSheetTree` | None | LOW |
| `src/components/workshop/component-library/tree/TemplatesTree.tsx` (existing) | Hover prefetch handler | Task 3.4: add `Set<string>` of prefetched project ids | None | LOW |
| `src/components/workshop/component-library/PreviewPanel.tsx` (existing) | Image rendering | Task 3.2: prefer `thumbnailPath` over `imagePath` | Verify upload pipeline generates thumbnails | LOW |
| Various sidebar files | Hit target sizes | Task 3.1: bump 20×20 / 14×14 elements to ≥24×24 | Design review (Philip) | LOW |
| `e2e/sidebar-a11y-hit-targets.spec.ts` (NEW) | Playwright + axe scan | Task 3.1 | None | LOW |
| `e2e/sidebar-thumbnail-usage.spec.ts` (NEW) | Playwright network panel spec | Task 3.2 | None | LOW |
| `e2e/sidebar-hover-prefetch-dedup.spec.ts` (NEW) | Playwright network count spec | Task 3.4 | None | LOW |
| `e2e/sidebar-rename-focus.spec.ts` (NEW) | Playwright focus spec | Task 3.5 | None | LOW |

### Files NOT changed (intentional)

- `src/lib/reusable-sources/actions.ts` — Task 1.6 changes only the
  client-side request guard, not the server action.
- `src/lib/repositories/*` — no repository changes for Phase 1-3.
- `src/lib/supabase/types.ts` — no schema changes for Phase 1-3.
- `supabase/migrations/*` — no migrations for Phase 1-3.
- Any file under `src/app/api/*` — upload routes are explicitly out of
  scope (Track 3 in [30-HANDOFF.md](./30-HANDOFF.md) is separate work).

### Potential edit conflicts

The single highest edit-conflict risk is
`src/components/workshop/component-library/index.tsx` — touched by every
Phase 1 task and by Phase 2 Tasks 2.1 + 2.4. **Recommendation:**
serialize all changes to this file through one author per phase. Phase 1
Tasks 1.2 + 1.3 (which also touch `AddComponentModal.tsx`) should share
an author. Phase 3 Task 3.3 (giant reducer extraction) MUST serialize
after Phase 1+2 merge to avoid hard conflicts.

The worktree is also active with 30+ unrelated file modifications from
other agents. Before each commit, re-check `git status` and merge only
files in this plan's scope.

---

## 14. Testing Strategy

> Lead-authored fallback (L5 timed out). Source:
> [16-EDGE-CASE-AND-TEST-MATRIX.md](./16-EDGE-CASE-AND-TEST-MATRIX.md),
> [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md).

### Unit tests (Bun test, `tests/unit/`)

- **Existing**: 2 files — red-first migration guard + UI baseline
  regression that asserts exact source text presence/absence.
- **Phase 1**: no new Bun unit tests needed — Phase 1 doesn't change
  domain logic that lives in `lib/domain/`.

### Integration tests (Vitest jsdom, `tests/vitest/`)

Phase 1 adds 7 new vitest specs (one per task) per
[19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md) Phase 1 table:

| Spec | Coverage |
|---|---|
| `tests/vitest/sidebar-archive.spec.tsx` | Task 1.1 — single + bulk + failure + Restore |
| `tests/vitest/sidebar-edit-modal.spec.tsx` | Task 1.2 — all fields preserved, refresh persistence |
| `tests/vitest/sidebar-duplicate.spec.tsx` | Task 1.3 — "(copy)" suffix, refresh persistence |
| `tests/vitest/sidebar-snapshot-chip.spec.tsx` | Task 1.4 — chip text + toast text |
| `tests/vitest/sidebar-template-groups.spec.tsx` | Task 1.5 — button removed, categories from templates |
| `tests/vitest/sidebar-search-race.spec.tsx` | Task 1.6 — deferred-resolution-in-reverse-order |
| `tests/vitest/rpc-archive.spec.ts` | Task 1.1 — RPC contract for `executeBulkArchiveLibraryComponents` |

Phase 2 adds 3 vitest specs:

| Spec | Coverage |
|---|---|
| `tests/vitest/sidebar-tab-label.spec.tsx` | Task 2.1 — tab label = "Project Components" |
| `tests/vitest/sidebar-folder-delete.spec.tsx` | Task 2.2 — folder delete via sidebar |
| `tests/vitest/sidebar-collapse-persist.spec.tsx` | Task 2.4 — collapse persistence |

Phase 3 adds characterization tests BEFORE Task 3.3 refactor (pin
behavior of the giant reducer) + verify they stay green throughout the
refactor.

### Contract tests

- **RPC contract test for `executeBulkArchiveLibraryComponents`**
  (Phase 1 Task 1.1): payload shape `{ itemIds, expectedPreviewHash }`,
  response shape, error paths.
- **RPC contract test for `updateCostLibraryComponent`** (Phase 1
  Task 1.2): all fields preserved.
- **RPC contract test for `createCostLibraryComponent`** (Phase 1
  Task 1.3 — duplicate path): all source fields + "(copy)" name.
- Verify against `src/lib/supabase/types.ts` (generated).

### End-to-end tests (Playwright, `e2e/`)

Phase 1 adds 5 Playwright specs per
[19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md):

| Spec | Coverage | Env flag |
|---|---|---|
| `e2e/sidebar-archive-restore.spec.ts` | Task 1.1 — delete → refresh → not visible; restore → refresh → visible | `ARCHESTIMATOR_E2E_MUTATING_DND=1` (per CI doc) |
| `e2e/sidebar-edit-persists.spec.ts` | Task 1.2 — edit → refresh → persisted | same |
| `e2e/sidebar-duplicate-persists.spec.ts` | Task 1.3 — duplicate → refresh → persisted | same |
| `e2e/sidebar-snapshot-toast.spec.ts` | Task 1.4 — chip + toast text | (none — read-only) |
| `e2e/sidebar-search-race.spec.ts` | Task 1.6 — rapid-search-then-result | (none — read-only) |

Phase 3 adds:

| Spec | Coverage |
|---|---|
| `e2e/sidebar-a11y-hit-targets.spec.ts` | Task 3.1 — axe scan returns 0 target-size violations |
| `e2e/sidebar-thumbnail-usage.spec.ts` | Task 3.2 — Network panel shows thumbnail-sized responses |
| `e2e/sidebar-hover-prefetch-dedup.spec.ts` | Task 3.4 — ≤1 prefetch RPC per project id |
| `e2e/sidebar-rename-focus.spec.ts` | Task 3.5 — focus within 1 animation frame |

**Env constraint**: Playwright mutating specs require authenticated
Supabase session against project `ebxxqidacheyapmmzavr` and the
env flags above per `.ai/10_state/current-state.md` FAST PATH.

### Accessibility tests

- **axe scan** in Playwright for Phase 3 Task 3.1 (hit targets).
- **Manual VoiceOver pass** for tree role announcements (per
  [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md) item 15).
- **Keyboard navigation**: Tab/Shift+Tab, Arrow keys, Home/End, Enter,
  Space, `/` shortcut, Escape — verified at
  `tree.tsx:1088-1154` ([12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md)
  "Tree keyboard").

### Security tests

- **RLS test pattern** per [16-EDGE-CASE-AND-TEST-MATRIX.md](./16-EDGE-CASE-AND-TEST-MATRIX.md)
  failure-injection matrix:
  - Mock `is_workspace_editor` returning false → "Only workspace
    editors/admins can manage library folders."
  - Mock RLS denial → server returns 403, toast surfaces.
  - Path traversal image: blocked by route normalizer (12 test cases
    in `component-library-ui.test.tsx:1060-1148`).
  - Malformed drag payload: silently ignored.
  - Invalid image URL: `javascript:` blocked.
  - Cross-workspace ID injection: server re-validates under RLS client.
- **RR-18 RLS verification** (Track 2 in
  [30-HANDOFF.md](./30-HANDOFF.md)) is separate work — out of this
  plan's scope.

### Migration tests

- **Phase 1: NO migrations.** Existing migration-guard test
  (`tests/unit/red-first-migration-guard.test.ts`) must stay green.
- **If `library_telemetry_events` is missing**: create migration under
  DB-autonomy mandate. Migration-guard test must stay green.

### Performance tests

- **Bundle size CI check** (Track 4 in [30-HANDOFF.md](./30-HANDOFF.md)
  — separate work session): parse `.next/static/chunks/*.js` sizes
  after `bun run build`, compare to budget table in
  [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md). Eng adds to
  `scripts/` + `validate` script.
- **Latency budgets**: measured via Phase 1 telemetry events
  ([24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md)) once
  production traffic exists. Pre-launch: manual verification via
  Chrome DevTools.
- **Hover prefetch dedup** (Phase 3 Task 3.4): Playwright Network
  panel assertion.

### Regression tests

- **Full vitest suite** (115 files) — must stay green. Note: full
  suite can hang per FAST PATH in current-state.md; use targeted
  matrices.
- **Full Playwright E2E suite** (7 specs) — must stay green. Mutating
  specs gated behind env flags.
- **Phase 3 Task 3.3 characterization tests** — pin giant reducer
  behavior BEFORE refactor; remain green throughout.

### Manual verification

Per [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md) "Manual
acceptance tests":

- **Persistence honesty (critical)** items 1-6: open estimate → edit
  → refresh → persisted; delete → refresh → archived; restore;
  duplicate; create group → refresh.
- **Project sources (critical)** items 7-10: expand → skeleton →
  content; search; rapid-type → latest wins; insert → modify source →
  no propagation.
- **Accessibility** items 11-15: keyboard nav, Shift+F10 context
  menu, rename focus, resize, VoiceOver.
- **Performance** items 16-18: <200ms render at 100 components;
  <200ms Templates; no duplicate prefetch.

### Failure-injection tests

Per [16-EDGE-CASE-AND-TEST-MATRIX.md](./16-EDGE-CASE-AND-TEST-MATRIX.md)
"Failure injection matrix":

- Server action 500 / timeout / offline → error toast.
- RLS denial → "Only workspace editors/admins can manage library folders."
- Malformed drag payload → silently ignored.
- Invalid image URL → not rendered as link.
- Path traversal image → blocked.
- Concurrent optimistic creates → both succeed, IDs reconciled.
- Template insert race → revision guard prevents overwrite.

---

---

## 15. Deployment and Rollout

> Lead-authored fallback (L5 timed out). Source:
> [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md).

### Release sequence

Phase 1 ships as **one bundle** (not six independent PRs) — the
persistence-honesty fixes are mutually reinforcing (e.g., removing
`createComponent()` helper depends on Edit being routed through the
modal). Shipping them separately leaves the sidebar in mixed states
([23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md)
"Rollout principles").

Sequence per phase:

```
Phase 1 → 48-hour hold → Phase 2 → 48-hour hold → Phase 3 → 48-hour hold → (Phase 4 mobile: future)
```

### Feature flags

```
NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1 = "true" | "false"  (default: "true")
```

- **True**: Phase 1 wiring active.
- **False**: Phase 1 wiring bypassed; legacy behavior restored.
- Read once at sidebar module load and cached. Toggling requires hard
  refresh (acceptable for pre-first-users).
- Gates: Delete handler, Edit handler, Duplicate handler, chips
  render, "New Template Group" render, search effect.
- Default ON per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md);
  this is an open decision for Philip (item 1 in §22).

Phase 2 tasks may share the same flag OR introduce
`NEXT_PUBLIC_SIDEBAR_PHASE_2_V1` — Eng decides. Phase 3 Task 3.3
(giant reducer extraction) introduces no flag — it's a refactor.

### Staged rollout

Per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md)
"Staged release":

| Stage | Activity | Owner | Gate |
|---|---|---|---|
| 1. Local verification | `bun run validate` + targeted vitest + manual acceptance | Eng | All gates green |
| 2. Preview branch | Push `feat/sidebar-persistence-honesty-v1`; Vercel preview deploy; smoke-test on non-prod workspace | Eng | Eng signs off in PR |
| 3. Main | PR review (≥1 reviewer); CI green; squash-merge | Eng + Reviewer | CI green |
| 4. Production | Vercel auto-deploys main; monitor error rate + archive RPC failure rate; 48-hour hold | Eng + Philip | No regression in 48h |

### Monitoring

- **Error rate** (Vercel dashboard)
- **Archive RPC failure rate** (alert at >5% for 10 min — per
  [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md))
- **Edit-via-modal failure rate** (alert at >5% for 10 min)
- **Restore success rate** (alert at <90% for 1h)
- **User reports** (Intercom or whatever support channel is active)
- **Sidebar Persistence Honesty v1 dashboard** (per
  [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) § Dashboards —
  7 panels)

### Alerting

Per [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) § Alerts:

| Alert | Trigger | Severity | Action |
|---|---|---|---|
| Archive RPC failing | `archive_failure_rate > 5%` for 10 min | Page Eng | Diagnose; consider flag flip |
| Edit modal failing | `edit_via_modal_failure_rate > 5%` | Page Eng | Diagnose; consider flag flip |
| Restore failing | `restore_success_rate < 90%` | Warn Eng | Diagnose; Undo broken |
| Telemetry pipeline lag | No `*_invoked` events for >24h while session traffic normal | Warn Eng | Diagnose telemetry ingestion |

**Open dependency**: if Vercel/Supabase has no alerting at launch,
fall back to daily dashboard review during the 48-hour hold (item 2
in §22).

### Rollback triggers

Per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md)
"Rollback decision matrix":

| Signal | Action |
|---|---|
| Archive RPC error rate > 5% on dashboard | Flip flag OFF; diagnose |
| User report: "I edited a component and lost variants" | Flip flag OFF; investigate `updateCostLibraryComponent` field preservation |
| Search returns blank unexpectedly | Diagnose; flip flag OFF if correlated with deploy |
| Build/lint failures post-merge | Revert merge commit; redeploy |

### Rollback procedure

Per task, per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md):

1. **Flip `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1=false`** (no
   redeploy — Vercel env var flip + hard refresh).
2. **Revert the wiring commit** (`git revert <sha>`).
3. **DB state is preserved**:
   - Archive rows created before rollback remain archived (RR-20 — no
     auto-un-archive). If a user reports a wrongly-archived item,
     un-archive via `changeCostLibraryComponentLifecycleState({
     lifecycleState: "available" })` or a one-shot SQL scoped by
     workspace + time window.
   - Edits made during Phase 1 are persisted (correct behavior) — no
     rollback of edit data.
   - Duplicates created during Phase 1 are legitimate rows — users
     can delete extras via the Components page.
4. **No data loss** by design.

### Post-release validation

- **48-hour hold** per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md)
  Stage 4. Monitor all alert channels.
- **Day-2 verification**: re-run the 18 manual acceptance items from
  [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md) against production.
- **Week-1 retro**: review the Sidebar Persistence Honesty v1
  dashboard. Decide: keep flag ON by default, flip default OFF, or
  promote to no-flag (remove the kill switch).
- **Telemetry adoption check**: confirm `persistence_honesty_adoption`
  metric (distinct workspaces with ≥1 `archive_invoked` event since
  deploy) is rising. Stalled adoption = silent regression.

### Rollout timeline

Per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md):

| Day | Activity | Owner |
|---|---|---|
| T0 | Begin Phase 1 implementation | Eng |
| T0+5d | Local + preview verification | Eng |
| T0+7d | PR review + merge | Eng + Reviewer |
| T0+8d | Production deploy | Eng |
| T0+10d | Hold-period checkpoint 1 | Eng + Philip |
| T0+14d | Hold-period closeout; begin Phase 2 | Eng + Philip |

---

---

## 16. Observability and Operations

> Lead-authored fallback (L5 timed out). Source:
> [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md).

### Logging

- **Server-action logs**: existing logger via `throwActionError`
  wrapping. No new server logging for Phase 1.
- **Client-side**: `console.error` in development; no client-side log
  forwarder in Phase 1 (defer to separate observability initiative if
  needed).
- **RLS denial logs**: server logs every `is_workspace_editor` /
  `can_edit_estimate` denial.
- **Telemetry sanitization**: `recordLibraryEvent` allow-list strips
  URLs, paths, filenames, free-text. Capped at 120 chars per string.
  ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md)
  § Sensitive data in logs/telemetry).

### Metrics

Per [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) § Metrics:

| Metric | Definition | Alert threshold |
|---|---|---|
| `archive_failure_rate` | `archive_failed / (archive_succeeded + archive_failed)` over 5-min window | > 5% for 10 min |
| `archive_p95_latency_ms` | p95 of `duration_ms` from `archive_succeeded` over 1h | > 2000ms |
| `edit_via_modal_failure_rate` | `edit_failed / (saved + failed)` | > 5% for 10 min |
| `search_drop_rate` | `response_dropped / (applied + dropped)` | > 20% sustained (would indicate user typing faster than server) |
| `restore_success_rate` | `restore_succeeded / restore_invoked` | < 90% for 1h |
| `persistence_honesty_adoption` | distinct workspaces with ≥1 `archive_invoked` event since deploy | (not alerted; reviewed weekly) |

### Traces

- **Phase 1 does not introduce distributed tracing**. RPC calls are
  single-hop Supabase RPCs; `correlation_id` (for project-source
  insert) and `duration_ms` metrics suffice.
- **Server-Timing headers** are wired for library route per
  `.ai/10_state/current-state.md` FAST PATH — useful for sidebar
  performance debugging.
- **If end-to-end tracing becomes a goal**: add OpenTelemetry spans at
  the server-action boundary in a separate initiative.

### Dashboards

Per [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) § Dashboards:

**Single dashboard: Sidebar Persistence Honesty v1.**

Panels:

1. Archive success rate (line chart, 7d)
2. Edit success rate (line chart, 7d)
3. Restore success rate (line chart, 7d)
4. Search drop rate (line chart, 7d — proves the race fix is active)
5. Event volume by type (stacked bar, 24h)
6. P95 latency: archive, edit, duplicate, restore (4-stat panel)
7. Adoption: distinct workspaces with persistence-honesty events (counter)

Owner: Eng builds; Philip has read access.

**Phase 1 telemetry events to wire** (per Task 1.1-1.6):

| Event | Task | Trigger |
|---|---|---|
| `sidebar_persistence_honesty_v1_archive_invoked` | 1.1 | User clicks Delete (single or bulk) |
| `sidebar_persistence_honesty_v1_archive_succeeded` | 1.1 | RPC resolves success |
| `sidebar_persistence_honesty_v1_archive_failed` | 1.1 | RPC rejects |
| `sidebar_persistence_honesty_v1_restore_invoked` | 1.1 | User clicks Restore |
| `sidebar_persistence_honesty_v1_restore_succeeded` | 1.1 | Restore RPC resolves |
| `sidebar_persistence_honesty_v1_edit_via_modal_opened` | 1.2 | Edit opens modal |
| `sidebar_persistence_honesty_v1_edit_via_modal_saved` | 1.2 | Update RPC resolves |
| `sidebar_persistence_honesty_v1_edit_via_modal_failed` | 1.2 | Update RPC rejects |
| `sidebar_persistence_honesty_v1_duplicate_via_modal_opened` | 1.3 | Duplicate opens modal |
| `sidebar_persistence_honesty_v1_duplicate_via_modal_saved` | 1.3 | Create RPC resolves for duplicate |
| `sidebar_persistence_honesty_v1_search_request` | 1.6 | Search effect fires |
| `sidebar_persistence_honesty_v1_search_response_applied` | 1.6 | Response passes request-id guard |
| `sidebar_persistence_honesty_v1_search_response_dropped` | 1.6 | Response rejected by guard |
| `sidebar_persistence_honesty_v1_template_group_affordance_removed` | 1.5 | Mount under V1 flag (deployment verification) |

**Buckets (privacy-preserving):**

- `query_length_bucket ∈ {0-2, 3-5, 6-10, 11-20, 20+}`
- `result_count_bucket ∈ {0, 1-5, 6-20, 21-50, 50+}`
- `duration_ms` integer milliseconds
- No raw search queries, component names, supplier names, or
  user-entered fields.

### Alerts

Per [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) § Alerts (see §15 table above).

### Runbooks

Per [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) risk owners:

| Risk | Runbook |
|---|---|
| RR-01 (Delete honest) | If archive RPC error rate > 5%: flip flag OFF, diagnose RPC failure mode, consider one-shot un-archive SQL scoped by workspace + time window |
| RR-02/03 (Edit/Duplicate honest) | If edit/duplicate RPC error rate > 5%: flip flag OFF, investigate `updateCostLibraryComponent` / `createCostLibraryComponent` field preservation |
| RR-04 (Search race) | If search returns blank unexpectedly: flip flag OFF, diagnose (likely unrelated), restore legacy race-prone behavior temporarily |
| RR-16 (Archive silent failure) | If user reports "deleted but still there": verify toast surfaced error; verify alert triggered; integrate test in `sidebar-archive.spec.tsx` covers the failure path |
| RR-17 (Honesty transition confusion) | If user reports "lost edits": clarify in support response that local-only items were never persisted; release notes already explain |
| RR-18 (RLS verification) | See Track 2 in [30-HANDOFF.md](./30-HANDOFF.md) — separate work session |
| RR-19 (Feature flag missing) | If flag not wired: hotfix env var + redeploy; code-review gate adds flag to all Phase 1 task paths |

### Support procedures

- **Phase 1 user comms** (per RR-17):
  - Pre-deploy: post in #engineering with Phase 1 scope + flag name + rollback path.
  - Post-deploy: post in #product with user-visible changes (more honest persistence, accurate labels).
  - Rollback: post in #engineering with signal that triggered rollback + the flag flip.
- **In-app explainer**: first interaction after Phase 1 ship shows a toast explaining the persistence change (1-2 sentences).
- **Release notes**: drafted per item 5 in §20.8.

### Data retention

- Telemetry events follow existing `library_telemetry_events` retention
  policy. If no policy exists, default 90 days rolling, aggregated
  monthly beyond that.
- **No PII in events by design** (allow-list enforced).

### Privacy review

- No raw search queries logged (only length buckets).
- No component names, supplier names, or user-entered fields in events.
- `recordLibraryEvent` allow-list strips URL/path/filename patterns.
- Workspace and user ids are stored (necessary for adoption metrics);
  both are internal ids, not PII.

### Out of scope

- Real-user-monitoring (RUM) for client-side latency — separate
  initiative.
- Session replay — privacy-sensitive, not pursued.
- Synthetic monitoring — defer until production traffic exists.

---

## 17. Risk Register

> This register is a **view over**
> [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) — the canonical,
> source-of-truth risk log for this plan pack. It is reproduced here in
> the template's column shape (template line 269:
> `ID | Risk | Probability | Impact | Severity | Mitigation | Owner |
> Detection method | Contingency`) so the executing codebase AI has the
> risks inline. **Update the source doc 22 first; this view follows.**
>
> Probability uses the doc 22 `Likelihood` field (`Low | Medium | High`).
> Impact derives from the doc 17 severity rubric (P0 catastrophic → P3
> polish). Severity matches the source finding's P0..P3 rating. Detection
> method and Contingency are inferred from the doc 22 mitigation +
> residual-risk fields.

### P1 risks (block Phase 1 ship)

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Detection method | Contingency |
|---|---|---|---|---|---|---|---|---|
| RR-01 | Component Delete appears to work but item reappears on refresh (false invalidation signal from `onLibraryDataChanged()`) | High | User data-trust erosion; duplicated work | P1 | Wire Delete to `executeBulkArchiveLibraryComponents`; remove false invalidation; toast says "archived" | Eng | Vitest integration spec (delete → refresh → not visible); Playwright archive-restore spec; alert on archive-RPC error rate > 1% | Rollback flag OFF; legacy local-only Delete returns; archive actions already in DB are preserved |
| RR-02 | Component Edit disappears on refresh (uses local-only `createComponent()` helper) | High | User data-trust erosion; lost edits | P1 | Remove `NewComponentForm`; route Edit through `AddComponentModal` edit mode via `updateCostLibraryComponent`; preserves variants/audit data | Eng | Vitest spec for edit-and-refresh; Playwright edit-persists spec | Rollback flag OFF; legacy form returns |
| RR-03 | Component Duplicate creates local-only items with `custom-${Date.now()}` IDs | High | Duplicate lost on refresh; orphaned local state | P1 | Wire Duplicate to `AddComponentModal` pre-filled + "(copy)" suffix → `createCostLibraryComponent` | Eng | Vitest spec for duplicate-and-refresh | Rollback flag OFF |
| RR-04 | Project-source search race: stale response overwrites newer result | Medium | Wrong source inserted into estimate; user confusion | P1 | Monotonic request-id guard (or `AbortController`) | Eng | Vitest deferred-resolution-in-reverse-order spec; Playwright rapid-search spec | Rollback flag OFF |
| RR-05 | Template Groups vanish on refresh (local-only state) | High | User-template-grouping work lost | P1 | Remove "New Template Group" affordance; delete `customTemplateGroups` state; document categories as derived | Eng | Vitest spec verifies toolbar button removed | Rollback flag OFF; communicate in release notes (RR-17) |
| RR-06 | "Live source" / "Read-through source" chips imply sync that does not exist | High | User believes source will stay synchronized; it does not | P1 | Replace chips with "Snapshot copy"; insert toast states copy semantics | Eng | Vitest snapshot test for chip text; Playwright toast-text spec | Rollback flag OFF or string revert |
| RR-07 | Phase 1 integration blind spot: tests verify UI but not DB row state | Medium | Regression slips through to release | P1 | Run integration suite that exercises every persisted mutation end-to-end against local Supabase; verify DB row state | QA | Focused integration matrix; DB-row assertions via Supabase client | Block release until matrix passes; documented env constraint per [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md) |
| RR-16 | Phase 1 regression: archive RPC fails silently, item appears deleted but is not | Medium | User confusion; data-integrity perception | P1 | Toasts surface RPC failure; integration test covers "archive fails → item visible after refresh"; alert on archive-RPC error rate > 1% | Eng + QA | Alert on RPC error rate; integration test | Rollback flag OFF; investigate RPC failure mode |
| RR-18 | RLS not verified on all 8 sidebar tables (background agent never closed per [30-HANDOFF.md](./30-HANDOFF.md) Track 2) | Low | Cross-workspace data leakage if any table lacks RLS | P1 | Run `rg "ENABLE ROW LEVEL SECURITY" supabase/migrations/` against each of the 8 tables; remediate any missing; document in [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) | Backend | Migration file audit; SQL probe of `pg_class.relrowsecurity` | Block public launch until Closed; remediation migration under DB-autonomy mandate |

### P2 risks (noticeable inconsistency or incomplete workflow)

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Detection method | Contingency |
|---|---|---|---|---|---|---|---|---|
| RR-08 | "Project" tab terminology confusion (current-project components vs reusable project sources) | Medium | User misnavigation; misplaced mental model | P2 | Rename tab label to "Project Components"; no internal id change | Eng | Vitest label assertion | String revert |
| RR-09 | Favorites and Recents are device-local, not account-persisted | Low | Multi-device users have inconsistent favorites | P2 | Document as device-local; deferred multi-device sync tracked in [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) Q8 | Philip | User feedback | Revisit on multi-device feedback; add `user_preferences` table |
| RR-10 | Custom tree ordering is browser-local | Low | Reordered folders on one device don't persist to another | P2 | Document as device-local; same defer rationale as RR-09 | Philip | User feedback | Revisit; persist `sort_order` at component level |
| RR-11 | Folder delete / reparent / nesting absent in sidebar | Medium | User must navigate to Library page for folder management | P2 | Add Delete to sidebar context menu via existing `deleteLibraryFolder`; defer reparent/move | Eng | Vitest spec for new menu item | Add "Manage in Library" deep link as fallback (Task 2.3) |
| RR-12 | Sidebar hidden below 1024px with no mobile fallback | Low | Tablet/mobile users lose feature access | P2 | Document below-1024px as out-of-scope for v1; revisit if mobile feedback warrants (Phase 4) | Philip | User feedback | Phase 4 mobile drawer work |
| RR-13 | Giant reducer component (~2,000+ lines) causes broad re-renders; maintainability risk | Medium | Performance degradation; future-feature velocity cost | P2 | Extract tab-scoped hooks (`useLibraryTabState`, etc.); tracks against `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` | Eng | React DevTools profiler; React Doctor report | Git revert refactor commits |
| RR-14 | Folder-rename focus race (Radix menu close vs `setTimeout(0)`) | Medium | A11y defect; rename sometimes requires second click | P2 | Replace `setTimeout(0)` with Radix `onCloseAutoFocus` + `event.preventDefault()` pattern from `EstimateSheetTree` | Eng | Playwright rename-focus spec | Pattern revert |
| RR-17 | Phase 1 transition confusion: users accustomed to local-only behavior report "lost edits" | Medium | Support load; perceived regression | P2 | Release-notes copy explains the fix; in-app toast on first interaction explains persistence change | Philip | User feedback; support tickets | Improve comms; ship in-app explainer |
| RR-19 | Phase 1 ships without feature flag → cannot selectively disable if regression | Medium | Uncontrolled rollout; rollback requires redeploy | P2 | Wrap each Phase 1 task behind `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1` flag (default on); see [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md) | Eng | Code review; env-var audit | Add flag in hotfix |
| RR-20 | Phase 1 rollback loses user-archive actions performed before rollback | Low | User confusion if archives vanish after rollback | P2 | Rollback procedure preserves archive state (no un-archive); only the wiring reverts | Eng | Rollback dry-run | Document in release notes; no un-archive |
| RR-21 | Telemetry blind spot: cannot measure if Phase 1 fix improved persistence-honesty perception | Medium | Cannot validate fix shipped successfully | P2 | Add `persistence_honesty_*` events (`archive_invoked`, `archive_succeeded`, `archive_failed`, `edit_via_modal_opened`, `duplicate_via_modal_opened`); see [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) | Eng | Dashboard review | Post-release retro |

### P3 risks (minor polish)

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Detection method | Contingency |
|---|---|---|---|---|---|---|---|---|
| RR-15 | Reusable-source hover prefetch may issue duplicate requests on rapid hover | Low | Wasted network requests; minor perf hit | P3 | Add `Set<string>` of prefetched project ids; skip already-fetched | Eng | Network panel in Playwright | Set check removal |
| RR-22 | Quota race: `LIBRARY_COMPONENT_CAP` check + insert not atomic | Low | Quota bypass under concurrent inserts | P3 | Accepted for pre-first-users. Revisit with DB-level enforcement if abuse detected | Backend | Quota audit | Add DB constraint |

### Residual-risk acceptances

> Per [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) "Residual-risk-acceptance
> register": RR-09, RR-10, RR-12, RR-20, RR-22 are explicitly accepted by
> Philip or Eng and revisited at the milestone gates listed. **None block
> Phase 1 implementation.**

### Open dependencies

- **RR-07** (integration suite) requires authenticated local Supabase session — environmental constraint per [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md).
- **RR-18** (RLS verification) requires migration-file access — already in repo at `supabase/migrations/`. This is the highest-risk open item per [30-HANDOFF.md](./30-HANDOFF.md) Track 2.
- **RR-13** (giant reducer extraction) tracks against a separate plan pack; not blocking Phase 1.

---

## 18. Pros and Cons

### Recommended approach

Wire every local-only CRUD action to its existing RPC; route Edit through `AddComponentModal`; remove template-group affordance; replace misleading chips; add request-identity guard. Ship behind feature flag `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`.

### Benefits

- **Honesty.** Every sidebar CRUD action persists or honestly labels itself. User trust no longer erodes on refresh.
- **Minimal new code.** All RPCs exist ([01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) line 83). Phase 1 is wiring + copy changes, not new infrastructure.
- **Reversibility.** Archive (not hard delete) means every Delete has a Restore path. Feature flag means every change has a kill switch.
- **Test coverage maps cleanly.** Each finding F-XX has a known acceptance proof (§6.7) and a known test (§14). The trace is bijective.
- **Observability ships with the fix.** Per RR-21, every Phase 1 task wires its telemetry events in the same PR, so we measure adoption and catch regressions.
- **No schema changes.** Phase 1 needs no migrations — the RPCs and tables are in place. DB-autonomy mandate is not invoked.

### Costs

- **Phase 1 is 6 tasks of M/S complexity** = ~1-2 engineering weeks ([22-RISK-REGISTER.md](./22-RISK-REGISTER.md) deadlines T0+1w to T0+2w).
- **Test suite migration.** Removing `NewComponentForm` (Task 1.2) requires migrating its test coverage to the `AddComponentModal` edit-mode suite.
- **Honesty transition comms.** Users accustomed to local-only Delete may report "lost edits" when server-truth replaces local-truth on refresh (RR-17). Requires release notes + in-app explainer.
- **Giant reducer lingers.** Task 3.3 (extract reducer) is the largest single piece and serializes after Phase 1. The reducer stays in place through Phase 1+2.
- **No mobile.** Accepting RR-12 means tablet users remain unsupported through this plan's scope.

### Alternatives considered

| Alternative | Why rejected |
|---|---|
| **Local-only honesty** — relabel Delete as "Hide from this view", stop calling `onLibraryDataChanged()` for hides | Rejected per [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) Q7 — "every visible action should persist." Hiding is dishonest given the UI implies CRUD. |
| **Hard delete instead of archive** | Rejected per [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) Q6 — hard delete is irreversible, breaks estimate rows referencing the item, and forfeits the Restore affordance. |
| **Persist template groups as a new table** | Rejected per [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) Q14 — categories emerge from template data; adding a table for empty groups is speculative complexity. |
| **Live-link project sources (realtime sync)** | Rejected per [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) Q15 — requires realtime infrastructure outside scope. Snapshot copy is the honest current model. |
| **Full sidebar rewrite as Phase 0** | Rejected — would block every other UI feature for weeks. The giant reducer (F-13) is real but tolerable; extraction is sequenced as Phase 3 Task 3.3. |
| **Mobile drawer as Phase 1** | Rejected per RR-12 — XL complexity for a desktop-first tool. Defer to Phase 4 gated on feedback. |
| **Persist favorites / recents / ordering as `user_preferences` table** | Deferred per RR-09, RR-10 — pre-first-users priority is low; revisit on multi-device feedback. |
| **Wire to GitHub/Vercel/Supabase provider changes** | Out of scope — release-gated and owner-approved separately. |

---

---

## 19. SWOT Analysis

### Strengths

- 31 prior audit docs provide exhaustive diagnosis; this canonical plan inherits the strongest evidence base in the repo.
- All required RPCs (`executeBulkArchiveLibraryComponents`, `changeCostLibraryComponentLifecycleState`, `createCostLibraryComponent`, `updateCostLibraryComponent`) already exist and have verified auth guards ([15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) § Authorization).
- Server-side defense-in-depth is strong: every mutating server action enforces `is_workspace_editor` or `can_edit_estimate` RPC + RLS.
- Existing `AddComponentModal` is shared with the Components page and already supports create mode — edit mode is a small extension.
- Feature flag (`NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`) is a clean kill switch; rollback is flag-OFF + redeploy.
- Archive (not hard delete) means reversibility is built in.
- Test discipline is established: vitest jsdom + Playwright + axe + Bun test migration guard already exist.

### Weaknesses

- Giant reducer component (~2,000+ lines, F-13) is a maintainability debt that Phase 1 does not address; Phase 3 Task 3.3 is the cleanup but serializes after Phase 1.
- Several Wave-1 specialist lanes in this pass timed out (see [LOOP_LEDGER.md](./LOOP_LEDGER.md)); lead-authored fallback was used. Independent verification (R2 lane, Wave 3) is therefore especially important.
- Below 1024px the sidebar disappears silently. No fallback. (RR-12, Phase 4.)
- Several P3 a11y gaps remain (text-tertiary contrast, IME composition on Enter, nested aside landmarks, missing aria-controls on tabs).
- Bundle budget enforcement is not yet in CI (Track 4 in [30-HANDOFF.md](./30-HANDOFF.md)).
- The vitest full-DOM suite can hang; targeted matrices are required per `.ai/10_state/current-state.md` FAST PATH.

### Opportunities

- Phase 1 ships telemetry that finally lets us measure whether the persistence-honesty fix moves the needle (RR-21).
- The Phase 3 reducer extraction unlocks future-feature velocity — every new sidebar tab becomes cheaper to add.
- Once Phase 1 lands, the honesty-transition comms can position Archestimator as "the estimating tool where refresh means refresh" — a credible differentiator vs spreadsheets.
- The framework established here (RPC wiring + acceptance proofs + feature flag + telemetry) is reusable for future surface audits (Center Content, Tree Sidebar).

### Threats

- **RR-18 RLS verification** remains open. If any of the 8 sidebar tables lacks RLS, the cross-workspace data-leakage risk is real. This is the single highest-impact open item (Track 2 in [30-HANDOFF.md](./30-HANDOFF.md)).
- **Honesty transition confusion (RR-17).** Users who relied on local-only Delete (treating it as a "hide this from my view" feature) may perceive the change as a regression. Comms must be precise.
- **Phase 1 regression (RR-16).** If the archive RPC fails silently, items appear deleted but are not. Toasts + alerting + integration test mitigate, but the failure mode is real.
- **Concurrent-repository risk.** The worktree has 30+ unrelated modified files from other agents. Phase 1 must use strict file ownership and re-check `git status` before each merge.
- **Subagent infrastructure queue limits** (this pass: 4 of 6 lanes timed out at 30m). If Wave 3 (R1 + R2) also times out, this plan ships without independent adversarial verification — a known weakness the lead will flag in the final report.

---

---

## 20. Definition of Done

> Eight sub-sections per template lines 297-305. Each criterion is binary
> and maps to a source doc (findings, risks, or acceptance proofs). The
> plan is "done" when every criterion in every sub-section is satisfied
> or explicitly waived with a documented reason.

### 20.1 Functional completion

- [ ] All P1 findings closed: F-01, F-03, F-04, F-05, F-06, F-10, F-11 (per [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md) summary table)
- [ ] All P2 findings in scope for Phase 2 / 3 closed: F-02, F-09, F-12 (persistence portion), F-13, F-14 (per [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md))
- [ ] All P3 findings closed: F-15 (per [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md))
- [ ] F-07, F-08 (device-local favorites / ordering) explicitly accepted per RR-09 / RR-10 — documented in release notes
- [ ] F-12 mobile portion explicitly deferred to Phase 4 per RR-12
- [ ] All 12 UX acceptance proofs in §6.7 captured with both test artifact AND real-surface artifact

### 20.2 Technical completion

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `bun run lint:design-system` exits 0
- [ ] `bun run build` exits 0
- [ ] Focused vitest matrix for changed surfaces passes (sidebar + RPC contract specs)
- [ ] No new React Doctor warnings on changed files (or accepted with reason)
- [ ] No new TypeScript `as any` / `@ts-ignore` introduced
- [ ] Feature flag `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1` is wired and toggleable
- [ ] `git diff --check` clean (no whitespace errors)

### 20.3 UX completion

- [ ] Delete → refresh → item not visible; Restore → refresh → item visible (F-01/F-06, Phase 1 Task 1.1)
- [ ] Edit via modal persists; refresh confirms (F-03/F-05, Phase 1 Tasks 1.2)
- [ ] Duplicate via modal persists; "(copy)" suffix present (F-03, Phase 1 Task 1.3)
- [ ] "Snapshot copy" chip replaces "Live source" / "Read-through source" (F-11, Phase 1 Task 1.4)
- [ ] "New Template Group" affordance removed (F-10, Phase 1 Task 1.5)
- [ ] Stale project-source search responses dropped silently (F-04, Phase 1 Task 1.6)
- [ ] Project tab label reads "Project Components" (F-02, Phase 2 Task 2.1)
- [ ] Folder delete available in sidebar context menu (F-09, Phase 2 Task 2.2)
- [ ] Panel collapse state persists across refresh (F-12 partial, Phase 2 Task 2.4)
- [ ] All `N/S — gap` items in [25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) for surfaces touched by Phase 1/2 are closed
- [ ] Copy review by Philip sign-off on toast text and chip text

### 20.4 Security completion

- [ ] RR-18 (RLS verification) is Closed OR explicitly waived with documented reason
- [ ] Every server action in Phase 1 task scope enforces `is_workspace_editor` or `can_edit_estimate` RPC guard (per [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md))
- [ ] No new client-trust assumptions (e.g., server re-validates every workspace_id / item_id)
- [ ] Upload routes unchanged unless Phase 1 explicitly touches them (it should not)
- [ ] No new secrets, env vars, or credentials introduced
- [ ] [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) "Highest-priority open threats" reviewed and either closed or carried forward with explicit owner

### 20.5 Performance completion

- [ ] Sidebar bundle size within budget: ≤60 KB sidebar chunk per [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md)
- [ ] AddComponentModal chunk ≤30 KB per [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md)
- [ ] Archive RPC P95 latency within budget per [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md)
- [ ] Search response identity guard (Phase 1 Task 1.6) does not introduce measurable overhead
- [ ] Hover prefetch dedup (Phase 3 Task 3.4) reduces prefetch RPC count by ≥90% on rapid hover
- [ ] Phase 3 Task 3.3 (reducer extraction) shows no render-count regression in React DevTools profiler
- [ ] No new network waterfalls on sidebar first-load (per current-state.md library-perf baseline)

### 20.6 Testing completion

- [ ] Vitest jsdom specs added for every Phase 1 task (1.1-1.6) — listed in §12 work packages
- [ ] Playwright E2E specs added for: archive-restore, edit-persists, duplicate-persists, snapshot-toast, search-race (Phase 1)
- [ ] axe scan in Playwright returns zero target-size violations on the sidebar (Phase 3 Task 3.1)
- [ ] RPC contract tests cover every server action invoked by Phase 1 (archive, lifecycle, create, update)
- [ ] Characterization tests (vitest) pin behavior of the giant reducer BEFORE Phase 3 Task 3.3 refactor; remain green throughout
- [ ] Focused vitest matrix green (full suite may hang per FAST PATH note in [current-state.md](../../.ai/10_state/current-state.md); use targeted matrices)
- [ ] Playwright E2E suite green for sidebar specs
- [ ] All test artifacts captured and stored in the plan pack or referenced from the implementation PR

### 20.7 Operational completion

- [ ] Phase 1 telemetry events from [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) wired:
  - [ ] `sidebar_persistence_honesty_v1_archive_invoked`
  - [ ] `sidebar_persistence_honesty_v1_archive_succeeded`
  - [ ] `sidebar_persistence_honesty_v1_archive_failed`
  - [ ] `sidebar_persistence_honesty_v1_restore_invoked`
  - [ ] `sidebar_persistence_honesty_v1_restore_succeeded`
  - [ ] `sidebar_persistence_honesty_v1_edit_via_modal_opened`
  - [ ] `sidebar_persistence_honesty_v1_duplicate_via_modal_opened`
- [ ] `library_telemetry_events` table exists (migration check per [30-HANDOFF.md](./30-HANDOFF.md) Track 5) — create under DB-autonomy mandate if missing
- [ ] Dashboard panels from [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) § Dashboards built
- [ ] Alerts from [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) configured:
  - [ ] Archive RPC error rate > 1%
  - [ ] Restore RPC error rate > 1%
  - [ ] Edit-via-modal open rate drops > 50% from baseline (regression signal)
  - [ ] Phase 1 feature flag rollout stalls (stuck at < 10% of sessions)
- [ ] Rollback procedure from [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md) rehearsed once on a preview environment
- [ ] 48-hour post-deploy hold observed per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md)

### 20.8 Documentation completion

- [ ] [00-README.md](./00-README.md) artifact index updated to reference this canonical IMPLEMENTATION_PLAN.md
- [ ] [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md) finding rows updated with Phase / Task / Status once each closes
- [ ] [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) RR-01..RR-06 status updated to Closed as Phase 1 lands
- [ ] [LOOP_LEDGER.md](./LOOP_LEDGER.md) records all lane STARTED + COMPLETE markers
- [ ] Release notes draft for Phase 1 honesty transition (per RR-17)
- [ ] This plan's scorecard updated in [28-SCORECARD.md](./28-SCORECARD.md) with post-implementation scores
- [ ] Any decisions deferred to Philip logged in [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) with the decision date

### Definition-of-Done summary

The plan is **done** when all eight sub-sections pass. Any unchecked item
requires either: (a) completion in a follow-up task with a tracking issue,
or (b) explicit waiver by Philip with a documented reason in
[20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md).
The plan is **not done** if any P1 criterion is unchecked without waiver.

---

## 21. Requirements Traceability Matrix

> One row per P1 / P2 / P3 finding plus the cross-cutting RR-18 row. Format per template lines 288-294.

| Requirement | Source | Implementation phase | Work package | Acceptance criterion | Test coverage | Status |
|---|---|---|---|---|---|---|
| Component Delete persists server-side (archive) | F-01, F-06 ([17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md)); decision Q6 | Phase 1 | Task 1.1 | Delete → refresh → not visible; Restore → refresh → visible | Vitest `sidebar-archive.spec.tsx`; Playwright `e2e/sidebar-archive-restore.spec.ts`; RPC contract `rpc-archive.spec.ts` | Open |
| Component Edit persists server-side | F-03, F-05; decision Q4 | Phase 1 | Task 1.2 | Edit price → refresh → new price persists; variants preserved | Vitest `sidebar-edit-modal.spec.tsx`; Playwright `e2e/sidebar-edit-persists.spec.ts` | Open |
| Component Duplicate persists server-side | F-03; decision Q5 | Phase 1 | Task 1.3 | Duplicate → modal pre-fill + "(copy)" → save → new row persists | Vitest `sidebar-duplicate.spec.tsx`; Playwright `e2e/sidebar-duplicate-persists.spec.ts` | Open |
| Project-source search race guarded | F-04; decision Q16 | Phase 1 | Task 1.6 | Stale responses dropped silently; latest query wins | Vitest `sidebar-search-race.spec.tsx`; Playwright `e2e/sidebar-search-race.spec.ts` | Open |
| Template Groups affordance removed | F-10; decision Q14 | Phase 1 | Task 1.5 | "New Template Group" button gone; existing local-only groups removed without data loss | Vitest `sidebar-template-groups.spec.tsx` | Open |
| "Live source" / "Read-through source" chips replaced | F-11; decision Q15 | Phase 1 | Task 1.4 | Chips say "Snapshot copy"; insert toast matches new copy | Vitest `sidebar-snapshot-chip.spec.tsx`; Playwright `e2e/sidebar-snapshot-toast.spec.ts` | Open |
| Project tab renamed to "Project Components" | F-02; decision Q2 | Phase 2 | Task 2.1 | Tab label reads "Project Components"; no internal id change | Vitest `sidebar-tab-label.spec.tsx` | Open |
| Folder Delete available in sidebar | F-09; decision Q10 | Phase 2 | Task 2.2 | Delete folder via sidebar context menu; refresh confirms | Vitest `sidebar-folder-delete.spec.tsx` | Open |
| Panel collapse state persists | F-12 (partial); decision Q25 | Phase 2 | Task 2.4 | Collapse → refresh → still collapsed | Vitest `sidebar-collapse-persist.spec.tsx` | Open |
| WCAG 2.2 hit targets met on sidebar | [12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) "Hit targets" | Phase 3 | Task 3.1 | All interactive elements ≥24×24px; axe scan = 0 violations | Playwright + axe `e2e/sidebar-a11y-hit-targets.spec.ts` | Open |
| Sidebar images use `thumbnailPath` | [14-PERFORMANCE-AUDIT.md](./14-PERFORMANCE-AUDIT.md); F-15-related | Phase 3 | Task 3.2 | Network panel shows thumbnail-sized responses | Playwright `e2e/sidebar-thumbnail-usage.spec.ts` | Open |
| Giant reducer extracted into tab-scoped hooks | F-13 | Phase 3 | Task 3.3 | React DevTools profiler shows tab-scoped re-renders; React Doctor clean | Characterization vitest suite remains green throughout | Open |
| Hover prefetch deduped | F-15; decision Q16 | Phase 3 | Task 3.4 | Hovering same source N times → ≤1 prefetch RPC | Playwright `e2e/sidebar-hover-prefetch-dedup.spec.ts` | Open |
| Folder-rename focus race fixed | F-14 | Phase 3 | Task 3.5 | Right-click → Rename → input focused within 1 frame | Playwright `e2e/sidebar-rename-focus.spec.ts` | Open |
| Mobile sidebar drawer (below 1024px) | F-12 (mobile); decision Q24 | Phase 4 (future) | Task 4.1 | Drawer opens at <lg viewport | Playwright mobile-viewport spec | Deferred (RR-12) |
| Favorites / recents multi-device sync | F-07; decision Q8 | Deferred | (none) | (none) | (none) | Accepted (RR-09) |
| Custom tree ordering multi-device sync | F-08; decision Q9 | Deferred | (none) | (none) | (none) | Accepted (RR-10) |
| RLS verified on 8 sidebar tables | RR-18 ([22-RISK-REGISTER.md](./22-RISK-REGISTER.md)); [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) | Cross-cutting | Track 2 in [30-HANDOFF.md](./30-HANDOFF.md) | `rg "ENABLE ROW LEVEL SECURITY" supabase/migrations/` covers all 8 tables; `pg_class.relrowsecurity` probe confirms | Migration audit; SQL probe | Open — blocks public launch |
| Phase 1 telemetry wired | RR-21; [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) | Cross-cutting (with Phase 1) | Per Task 1.1-1.6 | All 7 events emitted at the right lifecycle points | Dashboard review post-deploy | Open |
| Phase 1 feature flag wired | RR-19; [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md) | Cross-cutting (with Phase 1) | All Phase 1 tasks | Flag OFF → legacy behavior returns; flag ON → new behavior | Code review; env-var audit | Open |

---

---

## 22. Open Decisions

> Pull from [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) and [30-HANDOFF.md](./30-HANDOFF.md) "Open decisions that need Philip". Format per template lines 307-312.

| Decision required | Available options | Recommendation | Consequence of delaying | Responsible owner | Launch-blocking? |
|---|---|---|---|---|---|
| Phase 1 feature flag default at launch | (a) ON at launch (Phase 1 fixes are correct behavior); (b) OFF at launch (cautious rollout) | **(a) ON** per [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md) | Delaying past Phase 1 ship date leaves honesty gap unfixed for users | Philip | YES — blocks Phase 1 ship decision |
| Alerting infrastructure at launch | (a) Vercel + Supabase managed alerts; (b) Daily dashboard review during 48-hour hold | **(b) Daily review** if managed alerts unavailable | Detecting regression slips past 24h | Eng owner (document dashboard URL) | NO — fallback exists |
| Mobile / tablet scope (RR-12) | (a) Defer to Phase 4 (current accept); (b) Pull drawer into Phase 1 / 2 | **(a) Defer** | Tablet users unsupported through this plan | Philip | NO — accepted risk |
| Phase 1 task 2.2 vs 2.3 (folder delete vs deep link) | (a) Add Delete to sidebar context menu (Task 2.2); (b) Add "Manage in Library" deep link (Task 2.3); (c) Both | **(a) Task 2.2** — in-context is faster | If 2.2 grows scope, fall back to 2.3 | Eng | NO — pick during Phase 2 planning |
| Phase 1 task 3.3 (giant reducer) sequencing | (a) Serialize after Phase 1+2 (current plan); (b) Pull forward | **(a) Serialize after** | Reducer stays large through Phase 1+2; future-feature velocity unchanged | Eng | NO — current plan is the recommendation |
| Q1: Third tab name "Templates" vs "Component" vs "Reusable" | (a) "Templates" (current); (b) "Component"; (c) "Reusable" | **(a) "Templates"** per [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) Q1 | None — current is correct | Philip | NO |
| Q8: Favorites / recents browser-local vs account-persisted | (a) Browser-local (current); (b) `user_preferences` table | **(a) Browser-local for now** | Multi-device users have inconsistent favorites | Philip | NO — accepted per RR-09 |
| Q9: Custom tree ordering browser-local vs workspace-persisted | (a) Browser-local (current); (b) persist `sort_order` at component level | **(a) Browser-local for now** | Reorders don't sync across devices | Philip | NO — accepted per RR-10 |
| Q15: Project sources snapshot vs live links | (a) Snapshots (current RPC); (b) realtime sync | **(a) Snapshots** | Live sync requires realtime infra out of scope | Philip | NO — current is correct |
| Q23: Area vs Group canonical term | (a) Area (current P6 model); (b) Group (legacy); (c) Node | **(a) Area** | Legacy "group" copy remains until migrated | Philip | NO — UX cleanup is future |
| Q24: Sidebar access below 1024px | (a) Not now (current); (b) Phase 4 drawer | **(a) Not now** | Tablet/mobile unsupported | Philip | NO — accepted per RR-12 |
| Q30: Legacy `NewComponentForm` delete vs keep | (a) Delete (Phase 1 Task 1.2); (b) Keep as fallback | **(a) Delete** | Local-only F-03/F-05 stays if kept | Eng | YES — Phase 1 dependency |
| Telemetry table migration (`library_telemetry_events`) | (a) Create under DB-autonomy mandate if missing; (b) Verify exists first | **(a) Verify, then create if missing** | Phase 1 telemetry cannot ship without the table | Eng | YES — Phase 1 operational dependency |
| RR-18 RLS verification timing | (a) Before Phase 1 ship; (b) Before public launch | **(b) Before public launch** per [30-HANDOFF.md](./30-HANDOFF.md) Track 2 | Cross-workspace leakage risk until verified | Backend | YES for public launch; NO for Phase 1 preview ship |

---

