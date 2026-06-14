# Estimate Master Column (EMC) Improvement Plan

> Plan pack — `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: **DRAFT — audit & readiness complete, implementation not started** · 2026-06-14 · Branch: feat/estimate-sheet-uxui
> Type: planning / audit / readiness (no code changes in this pack)

---

## What this pack is

A comprehensive, multi-perspective audit of the **Estimate Master Column (EMC)** — the **middle column** of the estimate sheet page, between the left tree-nav sidebar and the right component-library/templates sidebar. The EMC is the surface that renders node headers, row items, and the editable cost tables. Its host is `src/components/workshop/EstimateSheetContent.tsx`; each node is rendered by the recursive `EstimateSheetBranch` (`src/components/workshop/estimate-sheet/rows/branch.tsx`).

The pack was produced by a 7-perspective investigation (UX/UI, Performance, Blast Radius, Database, Network/fetching, Product features, plus Accessibility and Risk/Readiness woven through), every claim anchored to a real `file:line` and adversarially reviewed.

```
Estimate sheet page  /workshop/projects/[projectId]/estimates/[estimateId]
┌───────────────┬──────────────────────────────────────────┬───────────────┐
│  LEFT          │            MIDDLE — the EMC               │   RIGHT        │
│  tree-nav      │  EstimateSheetContent.tsx (host)          │   component    │
│  EstimateSheet │   └─ EstimateSheetBranch (branch.tsx)     │   library /    │
│  Tree.tsx      │       node header · caret · "Own items"   │   templates    │
│  (node CRUD)   │       row tables · add-row · child nodes   │   sidebar      │
└───────────────┴──────────────────────────────────────────┴───────────────┘
```

## The user's ask (verbatim intent)

1. **Req 1** — Remove the **"Own items"** label from nodes that have both nested nodes and nested components.
2. **Req 2** — Fix the **spacing / gaps** between nodes and rows.
3. **Req 3** — Some node rows have **no expand/collapse icon** even when they contain components — examine whether this is symptomatic of a bigger issue.
4. **Req 4** — Document **ALL CRUD + interaction** functionality (drag, delete, etc.) in a **matrix**, understanding the deep nesting (Tab → Node/Area → Row item → Component).

**Latest clarification:** nested row items must render fully once nodes are deep or scrolled. The sticky node header and the `Materials / Qty / ...` table header must not cut off, cover, or visually hide row contents.

## Headline findings

- **Req 3 is a real correctness bug with a deeper root cause.** The disclosure caret is gated on `hasChildren` only (`branch.tsx:182`), so a node with its own rows but no child sub-areas — the *most common* node under the P6 single-node model — gets a non-interactive empty slot and **cannot be collapsed**. The code conflates "has children" with "is expandable"; it should key off `hasContents` (`branch.tsx:88`). The collapse engine itself is already kind-agnostic, so the fix is small and **perf-positive** (collapsing a rows-only node unmounts its heavy table). See [04](04-FEATURE-READINESS-AND-BUG-AUDIT.md).
- **Req 1 is presentational and safe — but watch the string-collision trap.** The EMC eyebrow (`branch.tsx:241-248`) is a *different surface* from the charts **"Own items"** money-attribution leaf (`aggregate-project-charts.ts:300-309`). The charts leaf keeps a mixed node's own-row total counted exactly once and MUST NOT be deleted with the visual label. See [07](07-BLAST-RADIUS-AND-RISK.md).
- **Req 2's spacing rhythm is partly dead code.** `groupGap`'s `depth1=mt-5 / depth>1=mt-4` branches never fire because `usesSiblingGroupRhythm` is never threaded through the recursion (`branch.tsx:285-309`), so every nested node collapses to `mt-0`. Combined with off-token `space-y-4` and a `32px` indent step, the rhythm reads as broken. See [03](03-UXUI-AUDIT.md).
- **Req 2 now has a P0 visual proof gate.** Because the bug is user-visible clipping under sticky headers, Phase C is not complete with unit tests alone. It needs browser evidence that deep nested rows remain fully visible below the table header at multiple widths and zoom levels. See [10](10-READINESS-ADDENDUM.md).
- **The matrix surfaced bugs beyond the four named issues** (see [02](02-CRUD-CAPABILITY-MATRIX.md)):
  - **Insert kind-gate (P6 violation, BROKEN):** `insertLibraryItem` no-ops on group-kind nodes (`EstimateSheetContent.tsx:1649`), silently — add-row / insert / drop / palette all fail with no toast. Contradicts the server action that allows any node.
  - **DBNET-1 (readiness BLOCKER):** the committed insert RPC still hard-codes `kind='area'`; `.ai/10_state/current-state.md` records that hosted P6 relax work landed, but implementation still must run D0 against the target project and land/confirm the committed migration path before D1/D3 ship. See [06](06-DATABASE-AND-NETWORK-AUDIT.md) and [10](10-READINESS-ADDENDUM.md).
  - **No `canEditEstimate` UI gating** on the left tree / EMC rows (server-only enforcement).
  - **Phantom row-reorder grip** (`row-table.tsx:201-204`) — looks draggable, isn't; also a false a11y announcement.
  - **Destructive clear-on-failed-drag** (`cells.tsx:151-154`) — a cancelled drag silently deletes a component.

## Document map

| # | Doc | What's in it |
|---|-----|--------------|
| 00 | **README** (this file) | Overview, doc map, requirement traceability, plan-pack metadata |
| 01 | [Context & Architecture](01-CONTEXT-AND-ARCHITECTURE.md) | What the EMC is; entity model (Tab → Node → Row → Component); P6 single-node model; file-responsibility map; render/recursion; state ownership; shared seams |
| 02 | [CRUD & Interaction Capability Matrix](02-CRUD-CAPABILITY-MATRIX.md) | **Req 4 centerpiece** — 48-operation master matrix (affordance, handler, persistence, gating, status, anchors, gaps) + missing ops + per-entity deep complexities |
| 03 | [UX/UI & Visual Design Audit](03-UXUI-AUDIT.md) | Req 1/2/3 from a design lens; spacing-scale proposal; disclosure UX; typography, borders, color, drag affordances; **accessibility (§3.4 / §4.7)** |
| 04 | [Feature Readiness & Bug Audit](04-FEATURE-READINESS-AND-BUG-AUDIT.md) | Req 3 root cause + truth table; feature completeness; expand/collapse subsystem; edge-case catalogue; test-impact |
| 05 | [Performance Audit & Budgets](05-PERFORMANCE-AUDIT.md) | Memoization map; existing perf guards; re-render blast; scale risks; per-change neutrality proofs; proposed budgets B1–B5 |
| 06 | [Database & Network/Fetching Audit](06-DATABASE-AND-NETWORK-AUDIT.md) | Schema; query keys/invalidation; persistence per mutation; dirty/save model; **DBNET-1**; presentational-vs-DB impact |
| 07 | [Blast Radius & Risk](07-BLAST-RADIUS-AND-RISK.md) | Per-change dependents & shared seams; the charts-leaf critical callout; breaking-test map; master risk table; sequencing |
| 08 | [Implementation Plan](08-IMPLEMENTATION-PLAN.md) | **Start here to build** — phased, TDD-first, committable tasks (Phase A=R3, B=R1, C=R2, D=R4) with real code and verification commands |
| 09 | [Open Decisions & Readiness Register](09-OPEN-DECISIONS.md) | The consolidated, deduplicated decision register (OD-1..OD-19) with recommendations |
| 10 | [Implementation Readiness Addendum](10-READINESS-ADDENDUM.md) | **Binding second-pass gates** — nested-row clipping proof, Bun command parity, DBNET-1 ordering, destructive drag, concurrency, and maker/checker closure |

**Reading order:** new readers → 01 → 02 → 03/04 → 07 → 09 → 10. Implementers → 08 plus 10 (with 07 for blast radius and 09 for the gating decisions).

## Requirement → document traceability

| Requirement | Primary docs | Implementation |
|-------------|--------------|----------------|
| Req 1 — remove "Own items" | [03 §1](03-UXUI-AUDIT.md), [07 Family A](07-BLAST-RADIUS-AND-RISK.md), [04](04-FEATURE-READINESS-AND-BUG-AUDIT.md) | [08 Phase B](08-IMPLEMENTATION-PLAN.md) · decision [OD-1](09-OPEN-DECISIONS.md) |
| Req 2 — spacing/gaps + nested row clipping | [03 §2](03-UXUI-AUDIT.md), [05 §5](05-PERFORMANCE-AUDIT.md), [10 Phase C visual acceptance](10-READINESS-ADDENDUM.md) | [08 Phase C](08-IMPLEMENTATION-PLAN.md) · decisions [OD-5..OD-8](09-OPEN-DECISIONS.md) |
| Req 3 — missing carets | [04 §1](04-FEATURE-READINESS-AND-BUG-AUDIT.md), [03 §3](03-UXUI-AUDIT.md), [05](05-PERFORMANCE-AUDIT.md) | [08 Phase A](08-IMPLEMENTATION-PLAN.md) · decisions [OD-2/OD-3](09-OPEN-DECISIONS.md) |
| Req 4 — CRUD matrix | [02](02-CRUD-CAPABILITY-MATRIX.md) (full census) | [08 Phase D](08-IMPLEMENTATION-PLAN.md) (kind-gates) · decisions [OD-9..OD-14, OD-19](09-OPEN-DECISIONS.md) |
| Accessibility (perspective) | [03 §3.4 / §4.7](03-UXUI-AUDIT.md), [04 aria-expanded gap](04-FEATURE-READINESS-AND-BUG-AUDIT.md) | folded into Phases A–C |
| Risk / Readiness | [07](07-BLAST-RADIUS-AND-RISK.md), [04 §6](04-FEATURE-READINESS-AND-BUG-AUDIT.md), [06 DBNET-1](06-DATABASE-AND-NETWORK-AUDIT.md) | [09](09-OPEN-DECISIONS.md) |

> **Accessibility note:** there is no standalone a11y document — the perspective is covered inside docs 03 (hover/focus/keyboard §3.4; contrast + the phantom-handle false `aria-label` §4.7; the `sr-only` boundary) and 04 (the `aria-expanded`-on-rows-only-nodes gap). All three are real a11y items addressed by the plan.

---

## Plan-pack metadata (per `.ai/03_plans/README.md` rules)

- **Exact user job:** Make the EMC's middle column correct and well-composed — every node with contents is collapsible (Req 3), the redundant "Own items" label is gone (Req 1), node/row spacing reads as a coherent rhythm (Req 2), and the full CRUD/interaction surface is documented and its gaps triaged (Req 4).
- **Route / screen affected:** `/workshop/projects/[projectId]/estimates/[estimateId]` — the middle column only (`EstimateSheetContent` → `EstimateSheetBranch`). The left tree and right library are touched only where a CRUD gap or parity decision (OD-11, OD-15) extends there.
- **Non-goals:** No change to the charts "Own items" leaf (money-correctness). No estimate data model change for Reqs 1–3 (presentational). No renderer unification with `TemplateEditorSheet` (parity is a flagged decision, OD-15). No new row-reorder feature unless OD-13 chooses to wire it. No virtualization work (deferred, OD-18).
- **Files expected to change (implementation phase):** `estimate-sheet/rows/branch.tsx` (caret, "Own items", spacing), `estimate-sheet/rows/node-visuals.tsx` (`groupGap`, sticky consts), `EstimateSheetContent.tsx` (kind-gates `:1649/:1740`), `tests/vitest/estimate-mixed-content.test.tsx` (assertions for R1/R3), plus new tests; conditionally `drop-zones.tsx`, `row-table.tsx`, `cells.tsx`, `EstimateWorkspaceClient.tsx`, and a committed Supabase migration (DBNET-1) for the Phase-D CRUD work.
- **Validation gate:** the focused Vitest set (`estimate-mixed-content`, `estimate-template-drop-zones`, `project-charts-aggregation`) green via `bun x vitest`; the three EMC perf guards (`rendersOutside===0`, `totalTableRenders===0`, cursor isolation) green; `bun run type-check`, `bun run lint`, and `bun run lint:design-system` clean; browser proof for nested sticky/header clipping; Codex review gate pass. See [08 cross-phase regression gate](08-IMPLEMENTATION-PLAN.md) and [10](10-READINESS-ADDENDUM.md).
- **Deletion criteria (if rejected):** the pack is docs-only and self-contained in this folder — delete the directory to remove it; no source/runtime/migration changes are made by the pack itself.
- **Loop surface:** ultracode multi-agent workflow (7-perspective investigation → 8 doc writers → 2 adversarial reviewers → 8 fixers); implementation handoff is subagent-driven per task ([08](08-IMPLEMENTATION-PLAN.md)).
- **Durable state / evidence:** this `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/` pack.

## Status & next step

Audit and plan are **complete with second-pass readiness gates applied**. Implementation has **not** started. The next implementation pass should start with [10-READINESS-ADDENDUM](10-READINESS-ADDENDUM.md), then execute [08 Implementation Plan](08-IMPLEMENTATION-PLAN.md) while respecting [09-OPEN-DECISIONS](09-OPEN-DECISIONS.md) (especially the `P0` blocker **OD-9 / DBNET-1**).
