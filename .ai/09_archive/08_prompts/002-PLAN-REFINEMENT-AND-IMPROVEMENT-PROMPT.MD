# Plan Refinement Prompt — UI Component Optimization

PLAN_FOLDER_PATH:
/Users/philiplewis/archestimator/.ai/03_plans/2026-06-06-ui-component-optimization-componentization

---

You are a senior startup technical founder, principal engineer, product strategist, implementation-readiness auditor, technical editor, QA strategist, security/performance reviewer, UI/UX reviewer, and documentation maintainer.

Your job is to REFINE the plan folder at PLAN_FOLDER_PATH. This is PLAN REFINEMENT ONLY. Read this entire prompt before acting.

## CRITICAL SCOPE BOUNDARY

THIS IS PLAN REFINEMENT ONLY.
NO CODE IMPLEMENTATION.
DO NOT modify production source code.
DO NOT modify app behavior, dependencies, migrations, package files, build/runtime configuration, or generated files.
DO NOT touch secrets.
Only create/update .ai planning and documentation files inside the plan folder and related .ai state files.

---

## PHASE 0 — INITIAL REPO SAFETY CHECK

Run these commands before anything else:

```
pwd
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
```

Assume another AI agent may be working on this repo.
Do not force push, reset --hard, clean -fd, overwrite unrelated dirty files, stage unrelated files, modify source code, delete branches/worktrees, or touch secrets.
If unrelated dirty files exist, leave them alone and mention them in the final report.

---

## PHASE 1 — READ THE SOURCE-OF-TRUTH CHAIN

Read these files in order before touching the plan folder:

1. AGENTS.md
2. .ai/README.md
3. .ai/00_system/DOCS_SOURCE_OF_TRUTH.md
4. .ai/00_system/AGENT_OPERATING_PROTOCOL.md
5. .ai/00_system/VALIDATION_MATRIX.md
6. .ai/10_state/current-state.md
7. .ai/10_state/decisions.md
8. .ai/10_state/known-issues.md (if present)
9. .ai/01_roadmap/README.md
10. DESIGN.md
11. package.json
12. README.md
13. .ai/03_plans/README.md — PAY SPECIAL ATTENTION to the "Rules for new plans" section
14. .ai/03_plans/route-transition-performance-optimization/README.md — This is the GOLD STANDARD for plan quality in this repo. Study its Plan Metadata table, doc inventory, reading order, success criteria, sign-off table, and superseded-marking strategy.
15. .ai/06_specs/ (any relevant specs)

---

## PHASE 2 — PLAN FOLDER AUDIT (CURRENT STATE)

Read ALL 11 documents in the plan folder. Then assess them against these known gaps discovered from an external audit:

### Known Gaps You Must Address

#### GAP 1 — Missing Plan Metadata (`.ai/03_plans/README.md` compliance)
The plan has NO README.md with the 6 required Plan Metadata fields:
- Exact user job
- Routes/screens affected
- Non-goals
- Files expected to change
- Validation gate
- Deletion criteria if rejected

Compare to the route-transition plan's README.md Plan Metadata table. Create one.

#### GAP 2 — Missing Measurement Baseline
The plan lists 7 candidate performance metrics and numeric thresholds (<200 rows, 200-500, >500), but has ZERO Profiler data, ZERO bundle analysis, ZERO row counts from actual seed data, and ZERO before/after targets. The thresholds are plausible but unverified against Archestimator's actual data.

Create a document that:
- Templates the Profiler data collection procedure
- Provides a fill-in table for mount/update durations per tree surface
- Documents how to collect visible row counts from `data/local/seed.json`
- Sets concrete performance targets based on actual data (if fixtures are available) OR marks targets as TBD with a collection procedure

#### GAP 3 — Missing Impact Analysis
The AGENTS.md mandates GitNexus impact analysis before editing any symbol. Phase 5-6 propose decomposing `EstimateSheetContent.tsx` (4,071 lines) and `EstimateSheetTree.tsx` (1,576 lines). There is zero blast-radius data.

If GitNexus or code-review-graph MCP tools are available, run impact analysis on:
- `EstimateSheetContent`
- `EstimateSheetTree`
- `LibraryFolderTree`
- `WorkshopTree`
- `ShareEstimateTreePanel`
- `ShareEstimateTreeView`

Document callers, callees, and downstream effects. If graph tools are unavailable, use `lsp_find_references` and grep to approximate the blast radius.

#### GAP 4 — Missing Cross-Plan References
The route-transition performance plan (`route-transition-performance-optimization/`) has SIGNIFICANT overlap with this UI plan:
- Both deal with React.memo strategy — HIGH conflict risk
- Both deal with next/dynamic code splitting — HIGH conflict risk
- Both deal with bundle optimization — MEDIUM
- Both deal with Suspense boundaries — MEDIUM
- Both deal with performance measurement — MEDIUM

Add explicit cross-references. The UI plan's memoization strategy must defer to or reconcile with the route-transition plan's `19-react-memo-strategy.md`. The UI plan's dynamic import decisions must reference the route-transition plan's `14-code-splitting-named-exports.md`.

#### GAP 5 — Missing Risk Register
The plan mentions risk tiers but has no formal risk matrix. Create a risk register with: risk ID, description, phase, likelihood, impact, mitigation, contingency.

Known high risks that MUST be covered:
- R1: EstimateSheetContent decomposition breaks optimistic updates
- R2: React Complex Tree state desyncs after hook extraction
- R3: Tree-core adapter pattern doesn't fit share tree's snapshot data shape
- R4: Virtualization decision blocks indefinitely (no decision framework)
- R5: Concurrent branch conflicts with active notification/Terms work

#### GAP 6 — Missing Implementation Matrix
Create a per-phase tracking table: phase, task, files to create/modify, tests, risk level, status, validation command, rollback procedure.

#### GAP 7 — Missing SOP Documents (found in gold-standard plan but absent here)
- Plan repair log (how to track corrections to this plan)
- Canonical source-of-truth document (which doc wins when conflicts exist)
- Benchmark protocol (exact measurement procedure, not just candidate metrics)
- Gradual rollout strategy (feature flags, canary, rollback for tree changes)
- Handoff document (implementer context: what was explored, what wasn't, assumptions)
- Owner sign-off table (approval gates)

#### GAP 8 — AI-Generation Artifact to Fix
This plan was AI-generated. It contains a self-assessed "Readiness score: 96 percent" in `05_READINESS_VALIDATION.md`. This score is inflated — it has zero measurement data, zero impact analysis, and 12+ missing document categories compared to the gold-standard plan.

Replace this with an honest scorecard that a human would accept. A realistic readiness given current documentation completeness (11 docs vs. 42 in gold-standard, no measurements, no impact analysis) is approximately 35-45/100 for implementation readiness, higher for planning/architecture quality. Be honest. Use evidence-based criteria, not AI-generated confidence.

#### GAP 9 — Missing Document Templates
The plan describes hooks, components, and utilities to extract but has ZERO TypeScript signatures or API contracts. For the tree-core package, create type definitions and hook signatures:

```typescript
// Example: This is the ONLY concrete API contract in the plan
export type TreeNodeId = string;

export interface TreeAdapter<TNode> {
  getId(node: TNode): TreeNodeId;
  getLabel(node: TNode): string;
  getChildren(node: TNode): readonly TNode[];
  isSelectable?(node: TNode): boolean;
  isExpandable?(node: TNode): boolean;
}

export interface VisibleTreeRow<TNode> {
  id: TreeNodeId;
  node: TNode;
  depth: number;
  parentId: TreeNodeId | null;
  indexWithinParent: number;
  siblingCount: number;
  hasChildren: boolean;
  isExpanded: boolean;
}
```

Add signatures for at minimum: `useTreeExpansion`, `useTreeSelection`, `TreeSurfaceShell` props, `useEstimateTreeModel` return type, `useEstimateTreeMutations` contract, `ShareTreeNodeRow` props.

#### GAP 10 — Missing Effort Estimates and MVP Slice
The plan has 8 phases with no effort estimates. Define:
- Per-phase effort (hours/days)
- Which phases can run in parallel
- The MVP slice: the minimal shippable unit that delivers value (recommended: Phases 1-3 — tree-core utilities + share tree unification — because share trees are read-only with near-zero regression risk)
- What "done" looks like for the MVP slice vs. the full plan

### AI-Generation Pitfalls to Avoid When Refining

You are refining an AI-generated plan. Do not repeat these patterns:
- Do NOT generate confidence scores without evidence. Every score must cite specific gaps.
- Do NOT add structure without substance. Every new document must contain real analysis based on codebase evidence, not placeholders.
- Do NOT create documents for volume alone. The gold-standard plan has 42 docs because each covers a real concern. This plan needs ~15-20 well-researched docs, not 42 hollow ones.
- Do NOT claim readiness that doesn't exist. If measurements or impact data are missing, say so honestly.
- VERIFY EVERY CLAIM against the actual codebase. If you can't verify something, mark it TBD with a verification procedure.

---

## PHASE 3 — CODEBASE CROSS-VERIFICATION

Before refining documents, verify the plan's claims against the actual codebase:

### Verify File Sizes
```
wc -l src/components/workshop/EstimateSheetContent.tsx
wc -l src/components/workshop/EstimateSheetTree.tsx
wc -l src/components/workshop/component-library-manager/AddComponentModal.tsx
wc -l src/components/workshop/component-library-manager/ComponentLibraryManager.tsx
wc -l src/components/workshop/component-library-manager/LibraryFolderTree.tsx
wc -l src/components/share/ShareEstimateTreePanel.tsx
wc -l src/components/share/ShareEstimateTreeView.tsx
```

### Verify Test Existence
List which of the plan's referenced test files actually exist vs. are aspirational:
- tests/vitest/workshop-tree-row-affordances.test.tsx — EXISTS
- tests/vitest/library-folder-tree-selection.test.tsx — EXISTS
- tests/vitest/library-folder-reorder.test.ts — EXISTS
- tests/vitest/estimate-tree-bulk-selection.test.tsx — EXISTS
- tests/vitest/estimate-sheet-tree-dnd.test.tsx — EXISTS
- tests/vitest/estimate-tree-modal.test.tsx — EXISTS
- tests/vitest/component-library-manager-ui.test.tsx — EXISTS
- tests/vitest/tree-core-visible-flatten.test.ts — DOES NOT EXIST
- tests/vitest/tree-core-filter.test.ts — DOES NOT EXIST
- tests/vitest/tree-core-aria.test.ts — DOES NOT EXIST
- tests/vitest/share-estimate-tree-panel.test.tsx — DOES NOT EXIST
- tests/vitest/share-estimate-tree-view.test.tsx — DOES NOT EXIST
- tests/vitest/share-estimate-tree-row-renderer.test.tsx — DOES NOT EXIST
- tests/vitest/tree-surface-shell.test.tsx — DOES NOT EXIST
- tests/vitest/component-library-tree-index.test.ts — DOES NOT EXIST
- tests/vitest/estimate-sheet-row-table.test.tsx — DOES NOT EXIST
- tests/vitest/estimate-sheet-activity-scope-tree.test.tsx — DOES NOT EXIST
- tests/vitest/estimate-sheet-content-regression.test.tsx — DOES NOT EXIST
- tests/vitest/add-component-modal-form.test.tsx — DOES NOT EXIST
- tests/vitest/route-transition-peak-load-profile.test.tsx — DOES NOT EXIST

Document: 7 of 20 referenced tests exist (~35%). 13 tests need to be created before or during implementation.

### Verify Proposed Folders Exist
Check if any of these proposed folders already exist:
- src/components/workshop/tree-core/ — DOES NOT EXIST
- src/components/share/share-tree/ — DOES NOT EXIST
- src/components/workshop/estimate-tree/ — DOES NOT EXIST
- src/components/workshop/estimate-sheet/ — DOES NOT EXIST
- src/components/workshop/component-library-manager/catalogue/ — DOES NOT EXIST
- src/components/workshop/component-library-manager/add-component/ — DOES NOT EXIST

### Use GitNexus/Code-Review-Graph (if available)
If graph tools are available, use them for impact analysis. If not, use grep, LSP references, and direct file reading. Document which tools were available and which were not.

---

## PHASE 4 — REQUIRED REFINED DOCUMENT SET

The refined plan folder must end up with at minimum these documents. Create missing ones. Improve existing ones. The existing 11 docs (00-10) may be preserved if they cover the same purpose and are improved to the same quality standard.

### REQUIRED DOCUMENTS

#### README.md (NEW — critical priority)
Plan Metadata table per `.ai/03_plans/README.md` rules with all 6 fields. Document inventory table. Reading order. Success criteria. Non-goals table. Relationship to route-transition plan.

#### 00_INDEX.md (EXISTING — improve)
Already has executive decision, artifacts, stop conditions. Add: Plan Metadata cross-reference, reading order, MVP slice definition, readiness score reference, link to README.md.

#### 01_UI_REUSE_AUDIT.md (EXISTING — improve)
Already has P0/P1/P2 tiers and file inventory. Add: cross-reference to route-transition plan for memoization/code-splitting conventions, updated test existence data.

#### 02_TREE_PERFORMANCE_RESEARCH.md (EXISTING — improve)
Already has numeric thresholds. Add: measurement collection procedure (how to run Profiler, what to measure), template for recording results, note that thresholds are unverified against Archestimator data.

#### 03_TREE_COMPONENTIZATION_AUDIT.md (EXISTING — improve)
Already has tree surface matrix. Add: actual visible row counts from seed data if available, tree-core API contract section (TypeScript signatures).

#### 04_IMPLEMENTATION_PLAN.md (EXISTING — improve)
Already has 8 phases. Add: per-phase effort estimates, parallelization opportunities, MVP slice definition (Phases 1-3), cross-reference to route-transition plan for dynamic import and memoization conventions.

#### 05_READINESS_VALIDATION.md (EXISTING — fix inflated score)
Replace AI-generated 96% score with honest evidence-based scorecard. Score each dimension (architecture, documentation, measurement, risk, integration) with evidence. Target: honest assessment, not high number.

#### MEASUREMENT_BASELINE.md (NEW)
Profiler data collection template. Table for mount/update durations per tree surface. Row count collection procedure. Performance target table (TBD until data collected).

#### BLAST_RADIUS_ANALYSIS.md (NEW)
GitNexus/LSP impact analysis for Phase 5-6 target symbols. Callers, callees, downstream effects. Risk assessment per symbol.

#### RISK_REGISTER.md (NEW)
Risk matrix with ID, description, phase, likelihood, impact, mitigation, contingency. Minimum 10 risks covering: optimistic update corruption, RCT state desync, adapter mismatch, virtualization deadlock, branch conflicts, design-system drift, test coverage gaps, implementation fatigue, concurrent agent work, regression in estimate editing.

#### IMPLEMENTATION_MATRIX.md (NEW)
Per-phase tracking table. Columns: phase, task, files (create/modify), tests, risk (low/med/high/critical), status, validation command, rollback procedure.

#### CROSS_PLAN_REFERENCES.md (NEW)
Conflict/coordination map with route-transition plan. Overlap areas with risk ratings. Deconfliction rules (e.g., "UI plan's React.memo decisions defer to route-transition plan's doc 19").

#### PLAN_REPAIR_LOG.md (NEW)
Track all corrections made during this refinement. What was wrong, what was fixed, when, by whom.

#### HANDOFF.md (NEW)
Implementer context preservation. What was explored. What wasn't. Key assumptions. What to re-verify before starting. Where the tricky parts are.

#### BENCHMARK_PROTOCOL.md (NEW)
Exact measurement procedure. Commands to run. What Profiler to use. What interactions to test. How to record results.

---

## PHASE 5 — REFINEMENT QUALITY LOOP

For each document:
1. Audit the current content against repo reality
2. Identify gaps, stale claims, unsupported assumptions
3. Improve: add missing content, fix errors, add evidence
4. Score: 0-100 based on completeness, accuracy, actionability
5. If score < 98: find remaining gaps, improve again
6. If a blocker prevents 98: document the blocker honestly, do not inflate

Overall readiness scoring categories:
- Repository evidence accuracy
- Requirement clarity
- Implementation specificity
- Test/verification readiness
- Risk/blast-radius/rollback coverage
- Security/performance/data/UX coverage
- .ai documentation hygiene
- Future implementation usability
- Internal consistency across documents

---

## PHASE 6 — BUG DISCOVERY

If you discover a bug, failing test, blocker, stale assumption, architecture issue, missing prerequisite, security concern, test gap, contradiction, or serious ambiguity, create a dated bug plan in:
/Users/philiplewis/archestimator/.ai/15_Bugs

Filename: YYYY-MM-DD-{bug-slug}.md

Bug plan must include: title, classification, date, discovery context, evidence, affected files, impact, severity, relationship to current plan, proposed fix, verification plan, status, whether it blocks implementation.

---

## PHASE 7 — .ai PROJECT MEMORY UPDATES

Update if they exist:
- .ai/10_state/decisions.md — If new architecture decisions are made
- .ai/03_plans/README.md — If this plan's status changes
- .ai/05_logs/ — Record refinement activity

Rules: Follow existing structure. Do not create conflicting source-of-truth docs. Do not mark the feature implemented. Record the refined plan folder, refinement status, bugs/blockers.

---

## PHASE 8 — FINAL GIT

```
git status --short
git diff --stat
git diff --check
git diff -- .ai
```

Then:
- Stage only intended .ai documentation changes
- Commit: docs(ai): refine UI component optimization plan — address 10 known gaps from external audit
- Pull/reconcile remote changes safely if needed (never force push)
- Push to origin
- Capture final commit hash

Do NOT merge to main automatically.

---

## FINAL REPORT

Your final output must include:

- **Final status**: READY_FOR_IMPLEMENTATION / NEEDS_HUMAN_DECISION / BLOCKED
- **Plan folder**: path
- **Documents modified**: list with brief summary of changes
- **Documents created**: list with purpose
- **Key improvements**: top 5 most impactful changes
- **Readiness score before refinement**: (from the plan's self-assessment)
- **Readiness score after refinement**: (your honest evidence-based score, per document and overall)
- **Commands run**: git, graph tools, verification
- **Git branch**: name, commit hash, push status
- **Blockers/open questions**: anything unresolved
- **Next recommended step**: what should happen after this refinement

---

REMINDER: This is PLAN REFINEMENT ONLY. You are improving documents, not writing code. The goal is to make this plan implementation-ready so a future agent can safely execute it. Be thorough, be honest, and ground every claim in codebase evidence.
