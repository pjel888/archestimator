# Share Page Estimate View Enhancement — Plan Pack

**Date:** 2026-05-29
**Status:** Planning phase — comprehensive research and analysis complete. Awaiting owner review.
**Owner:** Product + Engineering
**Predecessor:** V2 Shared Link Overhaul (`.ai/03_plans/project-shared-link-overhaul/`) — completed P0–P14, 2026-05-28

---

## 1. North Star Vision

The `/share/[token]` receiver page is currently a functional but flat experience: one estimate sheet = one scrollable Excel-like table, with no visual hierarchy or cost-distribution insight. This enhancement transforms each estimate sheet panel into a **rich analytical view** that gives clients both the forest (donut chart cost breakdown) and the trees (navigable estimate hierarchy with nesting).

The enhanced receiver page will:
- Show a **donut chart** per estimate sheet so clients immediately grasp cost distribution by discipline/space before diving into line items.
- Offer **two view modes** per sheet: a structured **Tree View** (matching the workshop's hierarchical estimate experience with optional floating navigation) and the existing **Grid Preview** (Excel-like flat table).
- Switch cleanly between sheets and between view modes without page reloads, preserving scroll/state per sheet.

---

## 2. Feature Scope

### In Scope

| Feature | Description |
|---------|-------------|
| **Per-sheet donut chart** | D3 donut chart above each estimate sheet panel. Aggregates `PublicationSnapshotRow` data by discipline (primary) or other grouping. Chart re-renders when active estimate sheet tab changes. |
| **Sub-tab system** | Two sub-tabs under each estimate sheet tab: "Tree View" (default) and "Grid Preview" (current). |
| **Tree View** | Hierarchical estimate view with collapsible Group/Area nodes, row items under Area nodes, and per-node totals. Mirrors the workshop estimate experience in a read-only receiver context. |
| **Floating navigation tree** | Optional compact floating tree sidebar (left of the Tree View panel) for quick node navigation within the selected sheet. |
| **Grid Preview** | Preserved current flat table with Description / Discipline / Qty / Unit / Total columns and image thumbnails. |
| **Mobile responsiveness** | Donut chart stacks above sub-tabs on narrow viewports. Tree View collapses gracefully. Floating tree becomes a bottom sheet or is hidden on mobile. |
| **Design system compliance** | SF Pro compact typography (≤12px), hairline borders, xs radius, neutral palette, `proposalPaper` background. |

### Explicitly Out of Scope

- **Data model changes to the publication snapshot** — the snapshot schema (`PublicationSnapshotEstimate.rows`) remains a flat array. Tree reconstruction and chart aggregation happen client-side from existing row data.
- **Supabase/server-side chart aggregation** — charts aggregate from already-resolved snapshot data in the browser. No new API routes or DB queries.
- **Interactive editing** — the receiver page remains fully read-only. No inline editing, commenting changes, or decision-flow modifications.
- **New chart libraries** — reuse existing D3 dependency already in the project.
- **Multi-estimate chart comparison** — the donut chart is per-estimate-sheet only. Cross-sheet comparison charts remain a workshop-only feature.
- **Snapshot version upgrade** — `schemaVersion` stays at 1. Tree structure is reconstructed from row metadata, not stored in the snapshot.
- **Real-time collaboration** — no live cursors or presence on the receiver page.
- **Custom chart grouping modes** — discipline-based grouping is the default. Space/category grouping requires snapshot enhancement (deferred).

---

## 3. Plan Pack Contents (Read in Order)

### Original Plan Documents

| # | Document | Purpose |
|---|----------|---------|
| 1 | [00-readiness-assessment.md](./00-readiness-assessment.md) | Infrastructure, dependency, design system, and team readiness. |
| 2 | [01-current-implementation-audit.md](./01-current-implementation-audit.md) | Deep audit of SharePageTabs, snapshot data model, chart component, workshop tree view + WorkshopTree<TNode> reuse finding. |
| 3 | [02-blast-radius-analysis.md](./02-blast-radius-analysis.md) | Files affected, risk register, MCP graph impact, rollback plan, cross-feature interaction matrix. |
| 4 | [03-ux-ui-spec.md](./03-ux-ui-spec.md) | Visual layouts, interaction states, mobile behavior, accessibility, copy matrix. |
| 5 | [04-data-model-and-chart-aggregation-plan.md](./04-data-model-and-chart-aggregation-plan.md) | Chart data aggregation from snapshot rows, tree reconstruction strategy, color palette. |
| 6 | [05-component-architecture-plan.md](./05-component-architecture-plan.md) | Component tree, reuse strategy, new components, file placement, state management. |
| 7 | [06-implementation-phased-plan.md](./06-implementation-phased-plan.md) | Delivery phases with explicit tasks, dependencies, exit gates. |
| 8 | [07-validation-and-testing-plan.md](./07-validation-and-testing-plan.md) | QA gates, browser matrix, test scenarios, accessibility verification. |

### Post-Audit Additions

| # | Document | Purpose |
|---|----------|---------|
| 9 | [00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md](./00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md) | Master audit document — graph evidence, subagent swarm findings, improvement log. |
| 10 | [08-security-threat-model-for-receiver-ui.md](./08-security-threat-model-for-receiver-ui.md) | STRIDE threat model, XSS/injection mitigations, DoS guards. |
| 11 | [09-ui-primitive-reuse-audit-and-extension-plan.md](./09-ui-primitive-reuse-audit-and-extension-plan.md) | Primitive contract compliance, WorkshopTree<TNode> reuse analysis. |
| 12 | [10-fidelity-audit-and-tree-reconstruction-spec.md](./10-fidelity-audit-and-tree-reconstruction-spec.md) | Blocking fidelity gate for P3 — designation provenance, comparison metrics. |
| 13 | [11-test-data-fixture-spec.md](./11-test-data-fixture-spec.md) | Required test fixture categories (7 types) for reconstruction and aggregation. |
| 14 | [12-assumptions-decisions-log.md](./12-assumptions-decisions-log.md) | Durable log of all assumptions, decisions, and reversal triggers. |
| 15 | [13-implementation-readiness-and-owner-review-gate.md](./13-implementation-readiness-and-owner-review-gate.md) | Pre-implementation gates and owner review checklist. |
| 16 | [IMPLEMENTATION-MASTER-PROMPT.md](./IMPLEMENTATION-MASTER-PROMPT.md) | Authoritative instructions for implementer agents. |
| 17 | [COMPLETION-CRITERIA-AND-STATE-UPDATE-PLAYBOOK.md](./COMPLETION-CRITERIA-AND-STATE-UPDATE-PLAYBOOK.md) | Closeout protocol and `.ai/` state update instructions. |

---

## 4. Key Design Decisions (Pre-Plan)

| Decision | Rationale |
|----------|-----------|
| **Client-side chart aggregation** | Snapshot data is already fully resolved server-side. No need for additional API calls. Rows are small in number (typically < 100 per sheet). |
| **Discipline-based donut grouping** | `PublicationSnapshotRow.discipline` is the only categorization field available in the current snapshot schema. Space/category grouping requires snapshot enhancement (deferred). |
| **Tree reconstruction from flat rows** | The snapshot does not include tree structure. Tree View reconstructs hierarchy from row metadata (`description` prefix patterns, `designation` field) or falls back to a flat list grouped by designation when hierarchy is unavailable. |
| **Reuse ProjectCostDonutChart** | Extract `ProjectCostDonutChart` into a shared UI primitive under `src/components/ui/` or `src/components/charts/` rather than duplicating 236 lines of D3 code. |
| **Extract WorkshopTreeRow for receiver** | The workshop `WorkshopTreeRow` component is tightly coupled to editing/interaction. Receiver Tree View needs a simpler read-only variant that renders the same visual hierarchy. |
| **No new dependencies** | D3 is already installed. No chart.js, recharts, visx, or other chart libraries. |

---

## 5. References & Guardrails

- **V2 Shared Link Overhaul**: `.ai/03_plans/project-shared-link-overhaul/` — authoritative context for the current share page implementation.
- **Design System**: `DESIGN.md` — SF Pro compact product scale, neutral palette, xs radius.
- **Agent Protocol**: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — mandatory code-review-graph checkpoints before any edit.
- **Current State**: `.ai/10_state/current-state.md` — live surfaces and approved patterns.
- **No Coding Yet**: This is a planning pack. Implementation begins only after owner review and approval of these plans.

---

## 6. Post-Audit Strategy Assessment (2026-05-29)

**Independent comprehensive audit completed** (see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` for full evidence, graph outputs, subagent swarm details, and rationale).

**Key Post-Audit Findings (Additive — No Original Content Altered):**
- **Blast Radius Confirmed Low for Runtime (Graph-Backed):** code-review-graph query_graph (callers_of) + GitNexus context: exactly 1 production caller (`ProjectPublicationView` in `/share/[token]/page.tsx`). Workshop-estimate community (37 nodes, 0.31 cohesion) indicates maintainability coupling for tree/chart patterns, not runtime breakage. Plan 02's ~0.25 low-risk estimate is directionally correct for prod impact but optimistic on long-term duplication debt.
- **Strategy Effectiveness: 7.5/10 Strong but Hardened:** Client-side reconstruction + D3 extraction remains the right pragmatic V1. Gaps closed via 6+ new additive documents (08-security-threat-model, 09-ui-primitive-reuse-audit, 10-tree-fidelity-audit-spec, 11-interaction-matrix, 12-assumptions-log, 13-readiness-gate + IMPLEMENTATION-MASTER-PROMPT.md + COMPLETION-CRITERIA).
- **Major New Mitigations:** UI primitive contract enforcement (high risk of feature-local tree rows/sub-tabs), designation provenance + fidelity evidence vs real group/area estimate tree, explicit cross-V2 side-panel interactions, durable assumptions log, dual-graph (code-review-graph + fresh GitNexus 9,106 nodes) checkpoints at every phase.
- **Go/No-Go:** **RECOMMEND PROCEED** after owner review of the new 00- + 08–13 documents. All original plan text, tables, phases, and gates remain 100% authoritative and unchanged.

**Improved Pack Contents (Original 8 + New Additive Layer):**
- Original README + 00–07 (all text preserved; post-audit sections appended to each).
- `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` (master audit + improvement log).
- 08–12 (new, modeled on predecessor's proven structure).
- `13-implementation-readiness-and-owner-review-gate.md` (pre-implementation gates).
- `IMPLEMENTATION-MASTER-PROMPT.md` (authoritative implementer instructions).
- `COMPLETION-CRITERIA-AND-STATE-UPDATE-PLAYBOOK.md` (closeout protocol).

**Pre-Implementation (Still Required):** Owner approval of this audit layer + the original plan pack. Fresh `code-review-graph get_minimal_context` + `npx gitnexus context "SharePageTabs"` before P1 edits. Design lint + primitive reuse audit gate before any new share/ component.

This audit session followed AGENTS.md / Claude.md / operating protocol exactly: read intel first, graph tools before codebase exploration, swarm for independent depth, no deletions, evidence-based improvements only.
