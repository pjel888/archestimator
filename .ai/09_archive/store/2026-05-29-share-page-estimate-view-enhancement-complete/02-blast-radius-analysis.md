# 02 — Blast Radius Analysis

**Date:** 2026-05-29
**Status:** Complete

---

## 1. Files Directly Modified

| File | Change Type | Risk | Description |
|------|-------------|------|-------------|
| `src/components/share/SharePageTabs.tsx` | **Modified** | **Medium** | Core receiver tab component. Add donut chart section, sub-tab system (Tree View / Grid Preview), and Tree View panel rendering. Largest change surface. |
| `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` | **Modified** | **Low** | Extract to shared location. Re-export from original location for backward compatibility. Zero behavioral changes. |

### SharePageTabs.tsx Change Detail

Current: 264 lines. Estimated after: ~350–400 lines.

**Sections to add:**
1. Imports for new chart component, tree components, aggregation utility
2. `activeView` state per estimate sheet (`{ [sheetId]: 'tree' | 'grid' }`)
3. Donut chart section (above sub-tabs, per active sheet)
4. Sub-tab bar (Tree View | Grid Preview toggle)
5. Tree View panel (recursive tree component replacing flat table when `activeView === 'tree'`)
6. Floating navigation tree (conditional, left of Tree View panel)

**Sections preserved as-is:**
- Active estimate summary header (name + total)
- Recipient session guard banner
- Horizontal estimate sheet tab bar
- Keyboard navigation (roving tabindex)
- Scroll fade masks
- `sessionStorage` persistence for active sheet

---

## 2. Files Directly Created

| File | Type | Risk | Description |
|------|------|------|-------------|
| `src/lib/charts/types.ts` | **New** | **Low** | Shared chart types (`CostBucket`). Extracted from `project-charts/types.ts`. |
| `src/lib/charts/aggregate-snapshot-rows.ts` | **New** | **Low** | Pure function: aggregate `PublicationSnapshotRow[]` → `CostBucket[]` grouped by `discipline`. |
| `src/lib/share/tree-reconstruct.ts` | **New** | **Low** | Pure function: reconstruct tree structure from flat `PublicationSnapshotRow[]` grouped by `designation`. |
| `src/components/charts/CostDonutChart.tsx` | **New** | **Low** | Extracted donut chart component. Identical D3 code from `ProjectCostDonutChart`. |
| `src/components/share/ShareEstimateTreeView.tsx` | **New** | **Medium** | Read-only recursive tree component for receiver. Renders Group/Area-like nodes with rows. |
| `src/components/share/ShareFloatingTreeNav.tsx` | **New** | **Low** | Compact floating navigation tree (sticky, left of Tree View panel). Scrolls to sections. |

---

## 3. Files Indirectly Affected (Import Chain)

| File | Effect | Risk |
|------|--------|------|
| `src/app/share/[token]/page.tsx` | **No change** — `SharePageTabs` props unchanged. Snapshot data passed through. | None |
| `src/lib/publication/types.ts` | **No change** — snapshot types unchanged. | None |
| `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` | Re-export wrapper after extraction. | Low |
| `src/components/workshop/project-charts/ProjectChartsClient.tsx` | Import path update if `ProjectCostDonutChart` extracted. | Low |
| `src/lib/project-charts/types.ts` | May import shared `CostBucket` type from new location. | Low |

---

## 4. MCP Graph Impact (code-review-graph estimate)

### Pre-Edit Assessment

Based on current graph stats (3010 nodes, 43169 edges, 340 files):

| Metric | Estimate | Notes |
|--------|----------|-------|
| **Direct nodes affected** | ~8–12 | `SharePageTabs`, `ProjectCostDonutChart`, new components |
| **Upstream callers of SharePageTabs** | 1 | Only `src/app/share/[token]/page.tsx` |
| **Upstream callers of ProjectCostDonutChart** | 2 | `ProjectChartsClient.tsx` (workshop charts page) |
| **Execution flows affected** | 0 | Share page is a standalone receiver flow. No critical production paths depend on it. |
| **Risk score** | **Low (~0.25)** | Changes are additive to existing receiver page. No shared infrastructure changes. |

### Impact Radius

- **SharePageTabs.tsx**: Direct consumer is only `/share/[token]` page. No internal dependencies on other route surfaces.
- **ProjectCostDonutChart extraction**: Workshop charts page imports it directly. Extraction preserves backward compatibility via re-export.
- **New components**: No existing code depends on them. Additive only.

### Affected Flows

- `createProject` flow: **0 impact** (no shared code)
- `signInWithEmail` flow: **0 impact**
- `signInWithGoogle` flow: **0 impact**
- Shared link receiver flow: **Directly enhanced** (additive, no regression)

---

### 4b. Post-Audit Graph-Backed Reconciliation (2026-05-29)

**Independent verification executed during comprehensive audit** (see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` + new 12-assumptions-decisions-log.md for full context and subagent swarm).

**Actual Data from Mandatory Tools (AGENTS.md protocol followed: code-review-graph BEFORE any src exploration; GitNexus analyze run when stale):**

- **code-review-graph get_minimal_context** (task="comprehensive audit of share-page-estimate-view-enhancement..."): 3018 nodes, 43334 edges, 340 files. Overall task risk: **medium (0.55)**. 6 test gaps noted. Key surfaced entities: SharePageTabs, ProjectPublicationView, SharedLinkActivityFeed, etc. Relevant communities: workshop-estimate (largest, 37 nodes in later list_communities), estimates-estimate, workshop-project (low cohesion ~0.24–0.31 signals coupling risk for tree/chart patterns).
- **get_architecture_overview (minimal)**: 120 communities, 4 cross-community pairs, 0 warnings. Top relevant: workshop-estimate (37 nodes, cohesion 0.3137, dominant tsx), estimates-estimate (25 nodes, 0.2381), workshop-project (22 nodes).
- **query_graph (callers_of SharePageTabs function)**: Exactly **1 production caller** (`ProjectPublicationView` in `src/app/share/[token]/page.tsx`). 10 total results (9 are test cases in `tests/vitest/project-publication-page.test.tsx`). Zero other prod flows or route surfaces. Confirms plan's "1 upstream" estimate was accurate.
- **semantic_search_nodes (SharePageTabs)**: Confirmed prod function + file + test surface only.
- **GitNexus CLI (fresh post-`npx gitnexus analyze --force`)**: 9,106 nodes | 16,881 edges | 403 clusters | 300 flows. `context("SharePageTabs")` (disambiguated UID): outgoing limited to `useSharedLinkSession` + internal helpers. Incoming empty in summary (consistent with 1 prod caller). Index was stale at audit start (5/28 vs live commit) — per AGENTS.md "MUST run ... before ... impact analysis" — resolved.

**Risk Delta vs Original Estimate:**
- Prod runtime blast: **Even lower/confirmed contained** than plan's ~0.25 (only 1 caller, isolated receiver flow).
- Maintainability / duplication debt: **Higher than estimated** (workshop-estimate community 37 nodes @ 0.31 cohesion; new tree rows directly mirror WorkshopTreeRow contract). Mitigated by new additive `09-ui-primitive-reuse-audit-and-extension-plan.md` (mandatory primitive decisions before P2/P3) + `12-assumptions-decisions-log.md`.
- Overall for this feature: Still **low-to-medium and acceptable** for additive V1 polish on proven V2 foundation. No critical flows affected (matches plan).

**Updated Pre-Edit Verification (in addition to original §8):**
```bash
# Dual-graph (mandatory per AGENTS.md)
code-review-graph get_minimal_context --task "share estimate view enhancement"
npx gitnexus analyze  # if stale
npx gitnexus context "SharePageTabs" --repo archestimator
code-review-graph query_graph --pattern callers_of --target "src/components/share/SharePageTabs.tsx::SharePageTabs"
```

**Post-Edit (after each phase + final):** Repeat above + `code-review-graph detect_changes --base HEAD~1` + design lint + `bun run validate`.

This reconciliation does not change any original numbers or text in §4 — it provides audited, higher-fidelity evidence for implementers and reviewers. All risk mitigations (primitive gates, fidelity audit in new 10, etc.) are additive and recorded in the new 00-/08–13 documents.

---

## 4c. GitNexus vs code-review-graph Dual Usage Note

Both tools used per AGENTS.md (GitNexus heavily mandated for symbol impact; code-review-graph connected MCP and used first for all exploration). They triangulated consistently on low prod blast + coupling concerns in estimate communities. Future phases must re-run both on the exact symbols touched (SharePageTabs, CostDonutChart extraction target, any new reconstruction utils).

---

## 5. Test Impact

| Test File | Impact | Action |
|-----------|--------|--------|
| `e2e/shared-link-receiver.spec.ts` | **May need updates** | Add test cases for sub-tab switching and donut chart rendering. |
| Any unit tests for `ProjectCostDonutChart` | **Path update** | Update import paths if extraction moves the file. |
| Workshop chart tests | **Regression check** | Verify workshop charts still render after extraction. |
| Vitest sims for publication | **No change** | Snapshot/security tests unaffected. |

---

## 6. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | `SharePageTabs.tsx` grows unwieldy (>400 lines) | Medium | Low | Extract Tree View and donut chart into separate components. Keep `SharePageTabs` as orchestrator. |
| R2 | `ProjectCostDonutChart` extraction breaks workshop charts | Low | **High** | Extract with zero behavioral changes. Re-export from old path. Run workshop chart tests before committing. |
| R3 | Tree reconstruction from flat rows produces misleading hierarchy | Medium | Medium | Clearly label tree nodes as "grouped by designation" (not actual tree structure). Add disclaimer if `designation` is missing. |
| R4 | Donut chart colors inconsistent with workshop charts | Low | Low | Use same `PROJECT_CHART_COLORS` palette. Extract palette to shared location. |
| R5 | Mobile layout breaks with tree + floating nav | Medium | Low | Hide floating nav on mobile. Collapse tree by default on small viewports. |
| R6 | Performance regression with large snapshot (100+ rows) | Low | Low | Client-side aggregation is O(n). Donut chart D3 rendering is already performant at this scale. |

---

## 7. Rollback Plan

If the enhancement needs to be reverted:

1. **Revert `SharePageTabs.tsx`** to current state (273 lines). The tab bar, sessionStorage, and keyboard navigation remain intact.
2. **Delete new files**: `CostDonutChart.tsx`, `ShareEstimateTreeView.tsx`, `ShareFloatingTreeNav.tsx`, `aggregate-snapshot-rows.ts`, `tree-reconstruct.ts`, `src/lib/charts/types.ts`.
3. **Restore `ProjectCostDonutChart.tsx`** to original location if extracted (re-export is non-destructive).
4. No database migration to roll back. No API routes to disable. **Pure frontend rollback**.

---

## 8. Pre-Edit Verification Protocol

Before any file edits, the following must be executed:

```bash
# 1. MCP graph check
code-review-graph detect_changes --base HEAD

# 2. Verify current share page state
bun run type-check
bun run lint

# 3. Verify workshop charts still functional
# (manual: open /workshop/projects/.../charts in browser)
```

After edits:
```bash
# 4. MCP graph re-check
code-review-graph detect_changes --base HEAD~1

# 5. Full validation
bun run validate

# 6. Build check
bun run build
```

---

## 9. Cross-Feature Interaction Matrix (Post-Audit Addition)

The V2 Shared Link Overhaul delivered multiple features on the `/share/[token]` surface. This enhancement interacts with several of them. This matrix identifies all interaction points.

### 9.1 Feature Interaction Matrix

| Existing Feature | Interaction with Enhancement | Risk | Mitigation |
|-----------------|------------------------------|------|------------|
| **Password Gate** (P10) | Donut chart + Tree View render AFTER password authentication. No interaction with the gate itself. | None | Gate blocks entire page; enhancement is inside the authenticated area. |
| **Recipient Sessions** (P5) | `SharePageSessionBanner` is above `SharePageTabs`. Enhancement doesn't modify or interact with session logic. | None | Independent component boundary. |
| **Comments Sidebar** (P6) | Comments are in the right column (sticky). Enhancement is in the main content area. No z-index or layout conflict. | Low | Verify no layout shift when comments sidebar opens/closes on mobile. |
| **Decision Button** (P7) | Decision is in the right column. Enhancement doesn't modify decision flow. | None | Independent component boundary. |
| **Activity Feed** (P8) | Activity feed records "open" events. Enhancement doesn't add new event types. | None | No new API calls from enhancement. |
| **Hero Image** (P9) | Hero is above `SharePageTabs`. Enhancement doesn't modify hero. | None | Layout stacking preserved. |
| **Scroll Fade Masks** | Enhancement adds content above the tab bar (donut chart). Scroll fade masks on the tab bar must still work correctly. | Low | Verify scroll calculation still works with donut chart above tabs. |
| **sessionStorage Persistence** | Enhancement adds per-sheet view mode state (`sheetViews`). Existing `share-tab:{token}` sessionStorage key is preserved. | Low | Use separate state key if needed; don't modify existing sessionStorage logic. |
| **Keyboard Navigation** | Enhancement adds sub-tab keyboard nav (ArrowLeft/Right). Main tab bar keyboard nav must remain independent. | Medium | Ensure sub-tab keydown handlers don't bubble to main tab bar. Use separate `onKeyDown` handlers with `e.stopPropagation()`. |

### 9.2 Layout Stacking Order

```
┌─ SharePageSessionBanner ──────── (conditional, dismissible)
├─ Project Header ──────────────── (name, code, client, location)
├─ SharePageHero ───────────────── (cover image, optional)
├─ SharePageTabs ───────────────── (MAIN ENHANCEMENT AREA)
│  ├─ Donut Chart (NEW) ────────── (per active sheet)
│  ├─ Estimate Sheet Tab Bar ───── (existing, horizontal scroll)
│  ├─ Sub-Tab Bar (NEW) ────────── (Tree View | Grid Preview)
│  ├─ Floating Nav Tree (NEW) ──── (desktop only, left of content)
│  └─ Active View Panel ────────── (Tree View or Grid Preview)
├─ Right Column (sticky) ───────── (decisions, comments — UNCHANGED)
└─ Footer
```

### 9.3 Z-Index Considerations

- Donut chart: No z-index needed (flows in normal document order)
- Sub-tabs: No z-index needed (below main tab bar)
- Floating nav tree: Uses `sticky` positioning, no z-index conflict with sidebar
- Tree expand/collapse: No z-index needed (in-document flow)
- **Modal overlays** (if any): Must cover the floating nav tree. Current modal z-index should already be sufficient.

### 9.4 Keyboard Focus Flow

```
Tab order:
1. Main tab bar tabs (ArrowLeft/Right within group)
2. Donut chart slices (Tab to enter, ArrowLeft/Right between slices)
3. Sub-tab bar tabs (ArrowLeft/Right within group)
4. Tree View nodes (ArrowDown/Up to navigate, Enter/Space to toggle)
   - OR Grid Preview table (standard table navigation)
5. Floating nav links (Tab through list)
6. Right column: Decision button, Comments
```

**Critical:** Sub-tab ArrowLeft/Right must NOT propagate to the main tab bar. Use `e.stopPropagation()` in the sub-tab keydown handler.

### 9.5 Shared Link with No Estimates

If a publication has 0 estimate sheets (edge case):
- `SharePageTabs` currently renders nothing (empty array)
- Enhancement must handle this gracefully: no donut chart, no sub-tabs, no tree
- Show empty state: "No estimate sheets in this publication."

---

## Post-Audit Updates (2026-05-29)

**Supplementary audit completed** — see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` for full evidence.

### Risk Reconciliation Summary
- **Prod runtime blast:** Confirmed LOW — exactly 1 production caller (`ProjectPublicationView`)
- **Maintainability debt:** MEDIUM — workshop-estimate community (37 nodes, 0.31 cohesion) signals coupling risk
- **Overall risk:** Low-to-medium and acceptable for additive V1 polish
- **Key mitigation added:** §9 Cross-Feature Interaction Matrix (above)
