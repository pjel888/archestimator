# 13 — Implementation Readiness & Owner Review Gate (Post-Audit Addition)
**Date:** 2026-05-29 (added during comprehensive audit)
**Status:** New additive document. Required before any implementation code is written.
**Purpose:** Consolidates all pre-implementation gates, owner review checklist, and non-negotiable conditions into a single document. Modeled on the predecessor V2 Shared Link Overhaul's proven readiness gate pattern.

---

## 1. Owner Review Checklist

Before opening any task packets or writing implementation code, the owner must review and approve:

### 1.1 Original Plan Pack (README + 00–07)
- [ ] README — North Star, scope, key decisions confirmed
- [ ] 00-readiness-assessment — Infrastructure, dependencies, design system readiness
- [ ] 01-current-implementation-audit — Technical accuracy of SharePageTabs, snapshot types, chart component analysis
- [ ] 02-blast-radius-analysis — Risk register, MCP graph impact, rollback plan
- [ ] 03-ux-ui-spec — Visual layouts, interaction states, mobile behavior, accessibility
- [ ] 04-data-model-and-chart-aggregation-plan — Chart aggregation, tree reconstruction strategy, type definitions
- [ ] 05-component-architecture-plan — Component tree, extraction plan, state management
- [ ] 06-implementation-phased-plan — Phase dependencies, exit gates, task breakdown
- [ ] 07-validation-and-testing-plan — Test scenarios, browser matrix, performance budget

### 1.2 Post-Audit Additions (00-POST-AUDIT + 08–12)
- [ ] 00-POST-AUDIT-STRATEGY-ASSESSMENT — Audit findings, graph evidence, subagent swarm results
- [ ] 08-security-threat-model — STRIDE analysis, XSS/injection mitigations, DoS guards
- [ ] 09-ui-primitive-reuse-audit — Primitive contract compliance, WorkshopTree<TNode> reuse decision
- [ ] 10-fidelity-audit-and-tree-reconstruction-spec — Designation provenance, fidelity metrics, blocking gate for P3
- [ ] 11-test-data-fixture-spec — Fixture categories, data quality requirements
- [ ] 12-assumptions-decisions-log — All assumptions and decisions with reversal triggers
- [ ] This document (13-implementation-readiness-gate)
- [ ] IMPLEMENTATION-MASTER-PROMPT — Non-negotiable rules for implementer agents
- [ ] COMPLETION-CRITERIA-AND-STATE-UPDATE-PLAYBOOK — Closeout protocol

---

## 2. Non-Negotiable Pre-Implementation Gates

These gates MUST be satisfied before P1 code begins. No exceptions.

### Gate N1: Dual-Graph Baseline
```bash
# code-review-graph (mandatory per AGENTS.md)
code-review-graph get_minimal_context_tool(task="share estimate view enhancement")
code-review-graph query_graph_tool(pattern="callers_of", target="src/components/share/SharePageTabs.tsx::SharePageTabs")

# GitNexus (mandatory per AGENTS.md — run if stale)
npx gitnexus analyze
npx gitnexus context "SharePageTabs" --repo archestimator
```
**Record:** Node counts, edge counts, risk score, caller count in implementation log.

### Gate N2: Current Validation Baseline
```bash
bun run type-check    # 0 errors
bun run lint          # 0 errors
bun run test          # all pass
bun run build         # success
```
**Record:** Baseline numbers in implementation log.

### Gate N3: Design System Baseline
```bash
# Run design lint if available
bun run lint:design-system  # or equivalent
```
**Record:** Any pre-existing violations (must not increase).

### Gate N4: Primitive Decision (Blocking for P2/P3)
- [ ] **Tab Primitive Decision (A9a):** Record in 12-assumptions-log whether to extract shared TabButton/TabList or accept temporary duplication.
- [ ] **Tree Row Primitive Decision (A9b):** Record in 12-assumptions-log whether to extract WorkshopTree<TNode>/WorkshopTreeRow to shared, create new EstimateNodeRow primitive, or document exception.
- [ ] **CostDonutChart Extraction Review:** Confirm pure copy + re-export with zero behavioral divergence.

### Gate N5: Fidelity Audit Completion (Blocking for P3)
- [ ] Fidelity report from 10-fidelity-audit completed on Lewis Residence + additional test data
- [ ] Decision recorded: "Good enough with labeling" / "Needs snapshot enhancement" / "Use discipline fallback only"
- [ ] UX copy + disclaimers finalized
- [ ] Test fixtures from 11-test-data-fixture-spec created and passing

### Gate N6: Test Fixture Module
- [ ] `tests/fixtures/publication-snapshots.ts` (or equivalent) exists with all 7 fixture categories
- [ ] At least chart aggregation and tree reconstruction unit tests import from fixtures

---

## 3. Per-Phase Gates (Enforcement)

Each phase in 06-implementation-phased-plan has its own exit gates. In addition, the following must be checked at the END of every phase:

| Check | Command | Expected |
|-------|---------|----------|
| Type-check | `bun run type-check` | 0 errors from changed files |
| Lint | `bun run lint` | 0 errors from changed files |
| Tests | `bun run test` | All pass |
| Graph impact | `code-review-graph detect_changes_tool` | Risk ≤ 0.30, 0 critical flows |
| Design lint | `bun run lint:design-system` | 0 new violations |

---

## 4. Implementation Rules (Non-Negotiable)

These rules apply throughout implementation. Violations require immediate correction.

### R1: No Deletions from Original Code
All existing SharePageTabs functionality (tab bar, keyboard nav, sessionStorage, scroll fades, flat table) MUST be preserved. New features are additive.

### R2: No New Dependencies
D3 is already installed. No chart.js, recharts, visx, react-complex-tree (for receiver), or other libraries.

### R3: No Database Changes
No migrations, no schema changes, no new RPCs. Tree reconstruction and chart aggregation are purely client-side.

### R4: Shared Primitive Contract
Every new UI component must pass through the primitive reuse audit (09 §4). Feature-local markup for reusable patterns is a blocking defect.

### R5: Design System Compliance
SF Pro ≤12px, regular/medium weights, xs radius, hairline borders, zero tracking. No exceptions.

### R6: XSS Safety
All label/text rendering uses React JSX children (text nodes). No `dangerouslySetInnerHTML`, no `innerHTML`, no raw HTML from snapshot fields. Add unit test with malicious strings.

### R7: Performance Budget
- Initial render: < 2s
- Tab switch: < 200ms
- Tree expand/collapse: < 50ms
- Donut chart render: < 100ms
- Bundle increase: < 10KB gzipped

### R8: Accessibility
All interactive elements keyboard accessible. ARIA roles on all tablists, trees, and navigation. Screen reader tested in P5.

### R9: Rollback Ready
Every phase must be independently revertable. If a phase exit gate fails, roll back to the last passing phase before investigating.

---

## 5. Owner Decision Record

Record owner decisions here as they are made:

| Date | Decision | Rationale | Signed |
|------|----------|-----------|--------|
| 2026-05-29 | Plan pack + audit approved for implementation | [Owner to fill] | [Owner] |
| | A9a: Tab primitive decision | [Pending] | |
| | A9b: Tree row primitive decision | [Pending] | |
| | Fidelity audit result | [Pending after audit] | |

---

## 6. Go/No-Go Summary

**RECOMMENDATION: GO** — after owner review of all documents listed in §1 and satisfaction of all gates in §2.

All infrastructure is ready. Zero new dependencies. Changes are additive and scoped to the receiver page only. The WorkshopTree<TNode> reuse opportunity (identified in this audit) can significantly reduce implementation effort and maintenance debt if the owner approves extraction to shared primitives.

**Next Steps After Owner Approval:**
1. Run Gate N1–N3 (dual-graph + validation baseline)
2. Make and record Gate N4 decisions (A9a, A9b)
3. Create task packets under `.ai/04_tasks/share-estimate-view-enhancement/`
4. Begin P1 (Donut Chart Extraction + Integration)

---

*This document is the implementation authorization gate. No code changes may begin until all non-negotiable gates are satisfied and owner decisions are recorded.*
