---
title: Comprehensive Implementation Guide — Estimate Sheet Audit And Improvement
date: 2026-06-21
status: implementation-mandate
execution: multi-agent-auto-loop
---

# Comprehensive Implementation Guide: Estimate Sheet Audit And Improvement

> **MANDATE:** This document is a non-negotiable implementation contract for the codebase AI implementor. Read it completely before writing any code. Do not stop, pause, or mark the goal complete until every phase, acceptance criterion, test, and verification command in this guide has been satisfied. This work must be executed with multiple parallel agents/threads, continuous auto-loop verification, and durable evidence recorded in `.ai/10_state/current-state.md`.

---

## 0. Agentic Execution Contract (READ FIRST — NON-DEFERABLE)

### 0.0 One-Prompt Autonomous Launch

Run this guide with one autonomous leader prompt. The leader owns the full
delivery loop and may spawn bounded native Codex subagents, but the leader must
not split authority across competing plans.

Recommended leader setting:

- Codex App: select **xhigh** reasoning for the leader.
- OMX CLI/runtime: use `$autopilot` only when the session is actually running
  under OMX runtime support. If `$autopilot` is unavailable, use the same prompt
  in normal Codex with native subagents.
- Model: use the repo frontier default for the leader (`gpt-5.5` at the time of
  this guide). Do not hardcode older frontier model names.
- Browser/Playwright proof: do not run by default. Use it only when the changed
  behavior has a browser-only claim, especially row geometry, drag/focus overlap,
  routing/auth behavior, or explicit visual proof.

Copy/paste prompt:

```text
Autonomous implementation request:

Implement the complete estimate-sheet remediation plan in
/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-21-Estimate-Sheet-Audit-And-Improvement/99-comprehensive-implementation-guide.md.

Use Codex xhigh reasoning for the leader. Treat this as a single autopilot run:
continue through DISCOVER -> PLAN -> EXECUTE -> VERIFY -> RECORD -> DECIDE until
all phase gates pass or a true destructive/irreversible blocker is reached. Do
not ask "should I proceed" for local, reversible, already-scoped edit/test/fix
work.

Before editing, read AGENTS.md, the FAST PATH block at
.ai/10_state/current-state.md, this guide in full, and the directly referenced
plan docs needed for the current phase. Follow the project Supabase/Postgres
boundary: project ebxxqidacheyapmmzavr only, no secrets, no PITR/paid add-ons,
no production deploy, no irreversible data loss without a recovery path.

Spawn bounded native Codex subagents where the work can split safely. For every
native subagent, set agent_type explicitly using the table in section 0.2. Omit
explicit model unless the runtime requires one; if a model must be supplied, use
the current repo defaults from AGENTS.md. Prefer reasoning_effort over model
overrides.

Start by verifying Phase -1 taxonomy state, then execute Phase 0 P1 correctness
and RPC/auth work before reliability, project-source, large-data, thumbnail, and
polish work. Write failing or discriminating tests before each risky fix. Keep
shared files single-owned at any moment; reconcile conflicts in the leader.

After every phase gate, append evidence to .ai/10_state/current-state.md with
files changed, tests added/changed, verification command, result, blockers, and
next phase. Use focused Vitest/type/static checks from this guide; avoid broad
bun run validate unless the known project reds have been cleared or release
gating requires it.

Stop only when all acceptance criteria and stop-gates pass, bun run type-check
passes, git diff --check is clean, a distinct code-review/QA subagent has signed
off, and final evidence is recorded. If blocked after three focused fix/verify
loops on the same failure, record the blocker with evidence and continue with an
independent safe lane if one remains.
```

### 0.1 Binding Contract

You are implementing the complete remediation and improvement backlog for the Archestimator estimate sheet route. The source audit package is located at:

```text
/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-21-Estimate-Sheet-Audit-And-Improvement/
```

This guide is the **single authoritative implementation contract**. It supersedes any shorter or older plan fragments for this scope. All prior audit documents in this folder are inputs to this contract; this document decides execution order, agent structure, and stop conditions.

### 0.2 Multi-Agent Mandate And Agent Settings

You **must** spawn multiple specialized agents/threads to implement this work. Suggested minimum lanes:

| Lane | Native `agent_type` | Reasoning | Model setting | Ownership | Write scope |
| --- | --- | --- | --- | --- | --- |
| Lead Orchestrator | Leader, not a child agent | xhigh/high | Repo frontier default (`gpt-5.5` when explicit model is required) | Scope, sequencing, conflict resolution, final stop decision | Any file, but edits should stay integration-focused when a child owns a lane |
| Current-Reality Mapper | `explore` | low | Inherit or repo spark default (`gpt-5.3-codex-spark` only if required) | Fast read-only file/symbol/test mapping before risky phases | Read-only |
| Correctness Lane Agent | `executor` | high | Inherit or repo standard/frontier default | P0/P1 data-correctness fixes: row rollback, component move, tab-scoped refresh, stale revisions | `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, row mutation hooks, action tests |
| Auth & RPC Hardening Agent | `executor` | high | Inherit or repo standard/frontier default | RPC edit-gating, Supabase migrations, generated types, authz tests | `supabase/migrations/`, generated DB types, auth/action tests |
| State & Failure UX Agent | `executor` | high | Inherit | Retryable query errors, counted save state, row mutation error presenter, typed conflicts | `EstimateSheetContent.tsx`, `use-estimate-query.ts`, `use-estimate-row-mutations.ts`, focused DOM tests |
| Concurrency & Large-Data Agent | `executor` | high | Inherit | Project-source serialization/batch, drag-over performance, bulk subtree RPC, route/search budgets | estimate actions, reusable-source actions, tree reorder utilities, repository loaders, performance/action tests |
| Right-Sidebar Thumbnails Agent | `executor` | medium | Inherit | Opt-in `LibraryTree` thumbnails, URL policy, virtualization/lazy-load tests | `LibraryTree.tsx`, optional `thumbnail.ts`, component-library tests |
| UX Polish Agent | `executor` | medium | Inherit | Local-view labels, visible pending copy, drop affordances, loading shell, small UI details | component-library UI, row UI, metadata strip, loading shell, focused tests |
| Test Engineer Agent | `test-engineer` | high | Inherit | Failing/discriminating regression tests before risky fixes; phase verification matrix | Tests only unless paired with a lane owner for small fixture helpers |
| Code Review / QA Agent | `code-reviewer` or `verifier` | high | Inherit or repo frontier default | Independent final diff review, acceptance-criteria audit, command evidence validation | Read-only except final evidence note if delegated by leader |

Rules:

- Native subagents must set `agent_type`; do not spawn anonymous workers for OMX
  work.
- Prefer omitting explicit `model` so repo defaults apply. If a runtime requires
  a model, use `gpt-5.5` for frontier/deep lanes and `gpt-5.3-codex-spark` only
  for read-only explore lanes.
- Use `reasoning_effort` as the primary knob: high for correctness/auth/data
  integrity/concurrency/review; medium for bounded UI/polish; low for read-only
  mapping.
- Cap active child agents at six. Start with the mapper plus the first two
  executable lanes; add later lanes only when their write scopes are disjoint or
  prior contracts are stable.
- Shared files (`EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`,
  `use-estimate-row-mutations.ts`, `src/lib/estimates/actions.ts`) must have one
  active writer at a time. Other agents may review or prepare tests against
  those files while the writer owns the edit.

Use parallel execution wherever file scopes are disjoint. Use synchronous handoffs where files or state overlap.

### 0.3 Auto-Loop Protocol (Do Not Stop Until Done)

Execute the following loop for every phase and every work unit. Do not exit the loop for a phase until its gate passes.

```text
DISCOVER  → Read relevant source files and tests. Confirm current reality matches this guide.
PLAN      → Decide exact edits, tests, and agent assignments for this unit.
EXECUTE   → Make code and test changes with the smallest coherent diff.
VERIFY    → Run the phase verification commands. Fix failures immediately.
RECORD    → Append evidence to .ai/10_state/current-state.md with date, phase, files, commands, results.
DECIDE    → If gate passes, proceed to next unit/phase. If gate fails, replan and repeat.
```

**Stop conditions (only these allow completion):**

- All phases 0 through 6 are implemented.
- All acceptance criteria in every phase are satisfied.
- All verification commands pass.
- `bun run type-check` passes on the changed scope (full `bun run validate` only if explicitly green; see risk note below).
- `git diff --check` is clean.
- A distinct Code Review / QA Agent has approved the final diff.
- Evidence is recorded in `.ai/10_state/current-state.md`.

**Escalation rules:**

- If a P1 acceptance criterion cannot be met without a schema/RPC migration, escalate to the Lead Orchestrator and produce a focused spike document before proceeding.
- If a test fails after three fix/verify loops, escalate to the Lead Orchestrator and consider narrowing scope only if the user explicitly approves.
- If two agents produce conflicting edits, stop and reconcile before any further edits.

### 0.4 Evidence Recording Template

After every verification pass, append to `.ai/10_state/current-state.md` using this exact shape:

```markdown
## 2026-06-21 Estimate Sheet Implementation — Phase X

- Phase: <name>
- Files changed: <comma list>
- Tests changed/added: <list>
- Verification command: <command>
- Result: pass / fail (with key output)
- Blockers: <none or description>
- Next: <next unit/phase>
```

### 0.5 Project Intelligence Read Requirements

Before editing code, read:

1. This document in full.
2. `AGENTS.md` at project root.
3. `.ai/10_state/current-state.md` FAST PATH block only.
4. `DESIGN.md` if any UI tokens, spacing, or visual language is touched.
5. The relevant `node_modules/next/dist/docs/` section if any Next.js 16 API is used.

Pull other `.ai/` documents on demand only when the work touches them.

---

## 1. Purpose, Scope, and Success Definition

### 1.1 Goal

Implement 100% of the Estimate Sheet Audit And Improvement remediation backlog with zero errors, 100% accuracy, and production-ready code quality. The implementation must eliminate all confirmed P1 correctness defects, close all P2 reliability gaps, deliver the right-sidebar component thumbnails feature, and leave the codebase with passing focused tests and clean static checks.

### 1.2 Scope

Target route:

```text
http://localhost:3000/workshop/projects/[projectId]/estimates/[nodeId]
```

Specifically audited route (used for tests and evidence):

```text
/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/bf254cbd-13d4-4dbf-b21a-84b171cdd6db
```

In-scope surfaces:

- Route loading, auth gating, tab and tree behavior.
- Row CRUD: insert blank/component/template/source, scalar edits, replace, clear, move, delete, detach, promote.
- Library component sidebar: create, insert, edit (local view), duplicate (local view), delete (local view), favorites, folders.
- Templates and template-node subtree insertion.
- Reusable project sources.
- Proposal export and activity/history.
- Error handling, performance ceilings, UX affordances.
- Right-sidebar component row thumbnails.

### 1.3 Non-Goals

- No broad visual redesign.
- No schema or helper rename for internal provenance fields (`expressComponent`, `projectComponentProjection`, `linkState`, source snapshot) unless a separate migration plan is created and approved.
- No command-palette thumbnails, reusable project-source image metadata, template payload changes, upload/storage migration, private project-image rendering contract, publication/shared-link image normalization, or generic `Tree` API redesign in this pass.

### 1.4 Canonical User-Facing Component Taxonomy (Immutable for This Pass)

The estimate sheet must expose only two visible component types:

| Canonical type | Includes | Current internal signals (do not rename) |
| --- | --- | --- |
| `Library Component` | Shared cost-library-linked rows, including clean, overridden, or source-changed linked rows | `sourceLibraryItemId`; `linkState` values `linked-clean`, `linked-overridden`, `source-changed` |
| `Project Component` | Project-local row components, including express/inline-authored rows, detached/project-specific rows, projected project rows, and source-less row components | `metadata.expressComponent`; `linkState = detached`; `metadata.projectComponentProjection`; source snapshots without current library id |

Internal provenance states remain implementation details. Do not turn them into additional visible component types.

### 1.5 Definition of Done

- Every Phase -1 through 6 acceptance criterion is checked off.
- Every new or updated test passes.
- `bun run type-check` passes for the changed scope.
- `git diff --check` is clean.
- No P1 defects remain open.
- Code Review / QA Agent has signed off.
- Evidence recorded in `.ai/10_state/current-state.md`.

---

## 2. Source-of-Truth Reference Map

This guide synthesizes the following documents. Implementors must reference them as authoritative context; this guide adds execution order and agent orchestration.

| File | Role | Key contents |
| --- | --- | --- |
| `README.md` | Plan index and scope | Route scope, evidence summary, taxonomy validation, highest-priority findings, stop condition |
| `00-executive-summary-and-ratings.md` | Verdict and P0/P1/P2 queues | OpenCode verdict, canonical taxonomy, confirmed P1/P2 queues, corrections |
| `01-user-step-matrix.md` | User-facing behavior matrix | Route access, workspace shell, taxonomy, left tree, sheet rows, templates/sources, library components, header/overlays |
| `02-crud-and-edge-case-audit.md` | CRUD matrix and edge cases | CRUD matrix, auto-appearance edge cases, auth/permission edge cases, empty/loading/concurrency/data-integrity edge cases |
| `03-performance-reliability-code-review.md` | Engineering findings | P1/P2/P3 findings with evidence line numbers, recommended fixes, tests, codebase shape notes |
| `04-test-coverage-and-verification.md` | Test map and commands | Existing inventory, missing tests, targeted verification commands, thumbnail verification |
| `05-improvement-backlog.md` | Recommended implementation order | Phased backlog with files, acceptance criteria, suggested shape |
| `06-cascading-and-blast-radius.md` | Cascade and risk analysis | Confirmed cascade risks, server-side guards, blast radius numbers, test gaps |
| `08-opencode-audit-synthesis.md` | External audit synthesis | What OpenCode confirmed, corrected, and added |
| `09-remediation-checklist.md` | Stage checklist | Stage 0–4 checkboxes and verification commands |
| `10-right-sidebar-component-thumbnails-plan.md` | Thumbnail handoff | Requirements, UX contract, performance budget, implementation units, ADR |

---

## 3. SWOT Analysis

### 3.1 Strengths

1. **Strong existing patterns:** optimistic patches, operation IDs, per-row update queues, rollback, and stale-response protection already exist for scalar updates.
2. **Existing bulk RPC available:** `insert_estimate_subtree_into_estimate_with_history` already exists; no new migration is needed for the template-node subtree fix.
3. **Replace-row RPC already returns canonical row:** the server shape is correct; only client cache patching is missing.
4. **Healthy test foundation:** broad component/action/helper tests exist, making regression tests fast to add.
5. **Project-scoped lite library loader:** sidebar lazy loading avoids first-paint catalog payload.
6. **Clear taxonomy decision:** two-type user-facing model reduces confusion and scope.
7. **Bounded history reads:** activity/history is cursor-based and filtered.

### 3.2 Weaknesses

1. **Whole-tree rollback for row-scoped failures:** bulk row delete and component move restore entire tree snapshots, which can clobber unrelated successful mutations.
2. **Default-tab refresh on non-default tabs:** structural tree mutations return the wrong tree on non-default tabs.
3. **Non-atomic bulk tree-node delete:** loops one RPC per root, allowing partial commits.
4. **Membership-gated write RPCs:** four write RPCs use workspace membership instead of estimate edit permission.
5. **Scalar-only row update queue:** replace/delete/detach can interleave with queued scalar updates on the same row.
6. **Global save state:** one mutation success marks the whole sheet saved.
7. **Quiet failure UX:** row mutation failures roll back without visible error presenter.
8. **Local-only sidebar edit/duplicate/delete:** user may believe these are persisted library mutations.

### 3.3 Opportunities

1. **Close beta blockers:** fixing P1s makes the estimate sheet ready for high-volume closed beta.
2. **Performance headroom:** cheap drag-over validation and bulk subtree RPC unlock large-estimate usability.
3. **Right-sidebar thumbnails:** visual scannability improvement with bounded network cost.
4. **Authz consistency:** hardening RPCs reduces security regression risk.
5. **Failure-state trust:** retryable errors and counted save state improve user confidence.
6. **Test coverage expansion:** targeted regression tests for non-default tabs, partial failures, and concurrency protect against future regressions.

### 3.4 Threats

1. **High blast radius:** estimate sheet touches 235+ directly related graph nodes and 297 impacted nodes; small changes can ripple.
2. **Concurrent mutation complexity:** same-row queue expansion requires careful operation identity design.
3. **Supabase RPC migration risk:** new RPCs must preserve history events and existing row/node constraints.
4. **Test flakiness:** DOM suites have documented hang risk; broad `validate` may be red.
5. **Scope creep:** UI polish or internal provenance renames must not sneak into this pass.
6. **Out-of-order response races:** project-source and template inserts require serialization or generation tracking.

---

## 4. Implementation Phases Overview

Execute phases in order. Do not skip a phase unless its acceptance criteria are independently verified as already satisfied.

| Phase | Name | Focus | Risk Level |
| --- | --- | --- | --- |
| -1 | Canonicalize Component Taxonomy | Finalize user-facing two-type labels and tests | Low |
| 0 | Lock Cascading And Partial-Commit Risks | Bulk row delete, component move, bulk tree-node delete, RPC edit-gating, cheap drag-over validation | High |
| 1 | Stop Wrong-Tree And Stale-Revision Bugs | Tab-scoped tree refresh, canonical row replace patching, same-row non-scalar serialization | High |
| 2 | Make Failure States Trustworthy | Retryable query errors, mutation error presenter, counted save state, typed revision conflicts | Medium |
| 3 | Fix Project-Source Concurrency | Serialize/merge/batch project-source inserts, visible pending feedback | Medium |
| 4 | Reduce Large-Data Ceilings | Bulk subtree RPC, route/library budgets, reusable-source search caps | Medium |
| 5 | UX Polish And Right-Sidebar Thumbnails | Thumbnails, drag affordances, small UI details, local-view labels | Low-Medium |
| 6 | Final Integration And Verification | Full diff review, type-check, final targeted test sweep, evidence recording | High |

---

## 5. Detailed Phase Specifications

### Phase -1: Canonicalize Component Taxonomy

**Objective:** Ensure every user-facing estimate-sheet surface exposes only `Library Component` and `Project Component`.

**Files to inspect/modify:**

- `src/components/workshop/estimate-sheet/rows/cells.tsx`
- `src/components/workshop/estimate-sheet/activity-history.tsx`
- `src/components/workshop/EstimateSheetContent.tsx` (detach dialog and inline-created component metadata labels)
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `tests/vitest/estimate-component-drag.test.tsx`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`
- `tests/vitest/estimate-sheet-row-details-crud.test.tsx`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`

**Acceptance Criteria:**

- [ ] No visible label reads "Express component", "Express row", "Project-specific component", "Manual component", "Customized library component", "Make project-specific", or similar as a component type.
- [ ] Linked rows (clean/overridden/source-changed) show "Library Component".
- [ ] Express/detached/projected/source-less rows show "Project Component".
- [ ] Detach action label says "Make Project Component" or equivalent that maps to the canonical type.
- [ ] Internal helper names (`isExpressComponentRow`, `expressComponent`, `projectComponentProjection`, `linkState`) remain unchanged.
- [ ] All listed tests pass with the updated copy.

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
```

```bash
rg -n "Express component replaceable estimate component|Project-specific component|Make component project-specific|Make project-specific|Customized library component" src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet tests/vitest
```

Expected: first command passes; second command returns no matches.

**Agent assignment:** Test Engineer Agent + Correctness Lane Agent (copy-only).

---

### Phase 0: Lock Cascading And Partial-Commit Risks

#### 0.1 Bulk Row Delete: Row-Scoped Rollback Or Atomic Mutation

**Problem:** `deleteSelectedRows` loops `deleteRowItem`. Each iteration captures a whole-tree snapshot and restores it on failure, which can restore a row whose server delete already succeeded.

**Evidence:**

- `src/components/workshop/EstimateSheetContent.tsx:2532` defines `deleteRowItem`.
- `src/components/workshop/EstimateSheetContent.tsx:2535` captures rollback state.
- `src/components/workshop/EstimateSheetContent.tsx:2540` filters target row id.
- `src/components/workshop/EstimateSheetContent.tsx:2557` restores whole snapshot.
- `src/components/workshop/EstimateSheetContent.tsx:2563` loops selected row ids.
- `src/hooks/use-estimate-query.ts:71` rollback conditional on global tree revision.

**Implementation Options:**

| Option | Pros | Cons |
| --- | --- | --- |
| A. Add bulk row-delete RPC + single action call | Atomic, one history event set, clean | Requires migration and generated type update |
| B. Make per-row delete rollback row-scoped in client cache | No migration, minimal blast radius | Still N sequential network calls |
| C. Hybrid: client-serialize deletes, row-scoped rollback | Keeps existing RPCs, fixes visible cascade | More complex client state management |

**Recommended approach:** Start with Option B for the fastest safe fix; spike Option A only if Option B leaves user-visible gaps.

**Acceptance Criteria:**

- [ ] Selecting rows A and B, with A's server delete succeeding and B's failing, leaves A deleted and B restored.
- [ ] Selecting rows A and B, with B succeeding and A failing, leaves B deleted and A restored.
- [ ] Failed row delete shows a visible error.
- [ ] Existing single-row delete behavior unchanged.

**Tests to add:**

- New test file: `tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx`
- Mock `deleteEstimateRowItem` for two rows with one success and one failure.
- Assert only the failed row is restored.
- Repeat with reversed order.

**Files to modify:**

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-row-mutations.ts`
- `tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx` (new)

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
```

---

#### 0.2 Component Move: Coherent Row-Pair Operation

**Problem:** Move from source row A to target row B calls `replaceRowItem(B)` then `clearRowComponent(A)` as independent mutations with independent whole-tree rollbacks.

**Evidence:**

- `src/components/workshop/EstimateSheetContent.tsx:2522` defines `moveRowComponent`.
- `src/components/workshop/EstimateSheetContent.tsx:2528` replaces target.
- `src/components/workshop/EstimateSheetContent.tsx:2529` clears source.
- `src/components/workshop/EstimateSheetContent.tsx:2347` and `:2387` define underlying mutation paths.
- `src/components/workshop/EstimateSheetContent.tsx:2380` and `:2432` use whole-tree rollback callbacks.

**Implementation Options:**

| Option | Pros | Cons |
| --- | --- | --- |
| A. New server action/RPC for row-pair move | Atomic, history events in one transaction | Migration + types + tests |
| B. Client row-pair operation with row-scoped reconciliation | No migration | Complex rollback logic |
| C. Reject source clear if target replace fails | Simpler | Leaves move half-done |

**Recommended approach:** Option B for first pass; add a regression test for both partial-failure orders. Spike Option A if Option B cannot prevent duplicate/lost component state.

**Acceptance Criteria:**

- [ ] Target replace succeeds + source clear fails → target remains replaced, source rolls back.
- [ ] Target replace fails + source clear succeeds → target restored, source cleared.
- [ ] UI cannot leave component duplicated or lost without a visible recovery path.
- [ ] Inline-authored Project Component move remains blocked (existing behavior).

**Tests to add:**

- Extend `tests/vitest/estimate-component-drag.test.tsx` with partial-failure scenarios.

**Files to modify:**

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-row-mutations.ts`
- `tests/vitest/estimate-component-drag.test.tsx`

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-component-drag.test.tsx --maxWorkers=1
```

---

#### 0.3 Bulk Tree-Node Delete: Transactional RPC

**Problem:** `deleteEstimateNodesBulk` dedupes roots but calls `delete_estimate_node_with_history` once per root. Partial commits possible.

**Evidence:**

- `src/lib/estimates/actions.ts:2259` plans roots.
- `src/lib/estimates/actions.ts:2269` loops root deletes.
- `src/lib/estimates/actions.ts:2270` calls RPC per root.
- `src/components/workshop/EstimateSheetTree.tsx:1107` rolls back optimistic tree on error.

**Implementation:** Add a new Supabase RPC `delete_estimate_nodes_bulk_with_history` that:

1. Validates all root node ids belong to the estimate/tab.
2. Records history events for all deletions.
3. Deletes all roots in one transaction.
4. Returns deleted ids, fallback node id, and refreshed active-tab tree.

If existing RPC `delete_estimate_subtree_into_estimate_with_history` or another existing function can be adapted, prefer it and document why.

**Acceptance Criteria:**

- [ ] New RPC validates all roots before deleting.
- [ ] Mid-bulk failure leaves zero partial deletes or history events.
- [ ] Action returns deleted ids, fallback id, and refreshed active-tab tree.
- [ ] Existing parent/child dedupe behavior preserved.

**Tests to add:**

- Extend `tests/vitest/estimate-node-reorder-action.test.ts` and `tests/vitest/estimate-tree-bulk-selection.test.tsx`.
- Mock mid-bulk failure; assert no partial state survives.

**Files to modify:**

- `supabase/migrations/` (new migration for RPC)
- `src/lib/estimates/actions.ts`
- `src/generated/database.types.ts` or equivalent generated types
- `tests/vitest/estimate-node-reorder-action.test.ts`
- `tests/vitest/estimate-tree-bulk-selection.test.tsx`

**Verification Commands:**

```bash
bunx supabase db reset --linked no  # local only; follow project skill for migrations
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1
```

---

#### 0.4 Harden Write RPCs To Edit-Gating

**Problem:** Four write RPCs use workspace membership checks where sister insert paths use estimate edit gates.

**Affected RPCs:**

- `replace_estimate_row_item_with_history`
- `delete_estimate_row_item_with_history`
- `delete_estimate_node_with_history`
- `update_estimate_row_item_with_history`

**Implementation:**

1. Identify the edit-gate helper used by insert paths (likely `assert_can_edit_estimate` or equivalent).
2. Apply the same gate at the top of each affected RPC.
3. Ensure the gate runs before any history/row reads.
4. Add authz regression tests.

**Acceptance Criteria:**

- [ ] All four RPCs require estimate edit permission.
- [ ] Non-edit workspace member is denied at RPC layer.
- [ ] Editor can still perform all four operations.
- [ ] Existing server actions and UI gates remain compatible.

**Tests to add:**

- New file: `tests/vitest/estimate-sheet-actions-authz.test.ts`
- Test replace, delete row, delete node, update row as viewer and editor.

**Files to modify:**

- Supabase migration/RPC definitions
- `tests/vitest/estimate-sheet-actions-authz.test.ts` (new)
- `tests/vitest/estimate-sheet-version-control-schema.test.ts` (extend if exists)

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1
```

---

#### 0.5 Cheap Drag-Over Validation

**Problem:** Drag-over validation rebuilds reorder plans on pointer movement, cloning large trees repeatedly.

**Evidence:**

- `src/components/ui/tree.tsx:842` drag-over validation.
- `src/components/ui/tree.tsx:724` calls `canDrop` after descendant checks.
- `src/components/workshop/EstimateSheetTree.tsx:556` passes `evaluateEstimateTreeDrop`.
- `src/lib/estimates/estimate-tree-reorder.ts:293` rebuilds signatures.

**Implementation:**

1. Split validation into two phases:
   - **Hover phase:** cheap checks only (ancestor relationship, node type, drop zone validity, tree revision unchanged).
   - **Drop phase:** full reorder plan with clone/signature rebuild.
2. Precompute per-drag: node index, ancestor set, parent ids, sibling counts, tree revision.
3. Cache cheap validation result per hovered node.

**Acceptance Criteria:**

- [ ] Drag-over does not clone or rebuild tree.
- [ ] Drop still builds full reorder plan and preserves existing validations.
- [ ] Benchmark at 1k, 5k, 10k nodes shows handler time within acceptable budget (target <16ms per hover event at 1k nodes, <50ms at 10k nodes).

**Tests to add:**

- New performance test: `tests/vitest/estimate-tree-drag-over-perf.test.ts`
- Assert no full-tree clone during hover validation.
- Benchmark 1k/5k/10k nodes.

**Files to modify:**

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/ui/tree.tsx`
- `src/lib/estimates/estimate-tree-reorder.ts`
- `tests/vitest/estimate-tree-drag-over-perf.test.ts` (new)

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-tree-drag-over-perf.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx --maxWorkers=1
```

---

### Phase 1: Stop Wrong-Tree And Stale-Revision Bugs

#### 1.1 Tab-Scoped Tree Reorder / Delete Refresh

**Problem:** Reorder, single delete, and bulk delete on non-default tabs refresh via `getProjectEstimateTreeByEstimate`, which resolves the default tab. Client writes default tree into active tab cache.

**Evidence:**

- `src/components/workshop/EstimateSheetTree.tsx:611` applies `confirmed.tree` after reorder.
- `src/lib/estimates/actions.ts:1508` refreshes reorder with `getProjectEstimateTreeByEstimate`.
- `src/lib/repositories/workspace-repository.ts:2749` resolves default tab.
- `src/components/workshop/EstimateSheetTree.tsx:996` and `:1097` apply returned trees after delete.
- `src/lib/estimates/actions.ts:2208` and `:2281` refresh delete paths with default-tree loader.

**Implementation:**

1. Add optional `targetTabId`/`activeTabId` to reorder, single delete, and bulk delete action inputs.
2. Server-side: if `targetTabId` is omitted, infer affected `estimate_tab_id` from target node(s).
3. Refresh with `getEstimateTabTree(projectId, estimateId, tabId)` for tabbed estimates.
4. Compute delete fallback from the same tab-scoped tree.
5. Apply same committed-tab refresh rule to template inserts.

**Acceptance Criteria:**

- [ ] Reorder on non-default tab refreshes that tab tree.
- [ ] Single delete on non-default tab refreshes that tab tree and computes fallback inside it.
- [ ] Bulk delete on non-default tab refreshes that tab tree and computes fallback inside it.
- [ ] Cross-tab reparenting remains rejected.
- [ ] Default-tab and legacy no-tab behavior unchanged.

**Tests to add:**

- Extend `tests/vitest/estimate-node-reorder-action.test.ts` and `tests/vitest/estimate-sheet-tree-dnd.test.tsx`.
- Create second tab, reorder/delete/bulk-delete nodes, assert active tab cache contains only that tab's nodes.

**Files to modify:**

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/lib/estimates/actions.ts`
- `src/lib/repositories/workspace-repository.ts`
- `tests/vitest/estimate-node-reorder-action.test.ts`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1
```

---

#### 1.2 Return And Patch Canonical Row From Replace-Row Action

**Problem:** Replace-row RPC returns canonical row JSON, but client replace mutation uses generic success handling and does not patch `rowRevision`.

**Evidence:**

- `src/components/workshop/EstimateSheetContent.tsx:2353` optimistically swaps row.
- `src/hooks/use-estimate-row-mutations.ts:267` uses generic mutation options.
- `src/hooks/use-estimate-row-mutations.ts:408` reads `expectedRowRevision` from cached row.
- `src/lib/estimates/actions.ts:2675` defines `replaceEstimateRowItemWithLibrary`.
- `src/lib/estimates/actions.ts:2680` calls replacement RPC.
- `src/lib/estimates/actions.ts:2707` returns without applying canonical row.

**Implementation:**

1. Update `replaceEstimateRowItemWithLibrary` server action to return the canonical row from the RPC.
2. Update replace mutation success handler to patch the row cache with returned `rowRevision`, metadata, source snapshot, unit, link state, and provenance.
3. Apply same canonical-row patching to replace-style clear paths.

**Acceptance Criteria:**

- [ ] Replace-row server action exposes canonical row.
- [ ] Replace mutation patches query cache with returned row.
- [ ] Immediate edit/delete/detach after replace does not revision-conflict.
- [ ] Server-normalized metadata/source snapshot/link state/unit/rowRevision visible after replacement.
- [ ] Replace-style clear paths receive and patch same canonical row response.

**Tests to add:**

- Extend `tests/vitest/estimate-sheet-version-control-actions.test.ts` and `tests/vitest/estimate-sheet-library-insert.test.tsx`.
- Replace row, immediately edit quantity/material/delete, assert no conflict and cache has new `rowRevision`.

**Files to modify:**

- `src/lib/estimates/actions.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `tests/vitest/estimate-sheet-version-control-actions.test.ts`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
```

---

#### 1.3 Serialize Non-Scalar Same-Row Mutations

**Problem:** `rowUpdateQueuesRef` serializes scalar updates only; replace/delete/detach/clear can interleave with in-flight scalar updates.

**Implementation:**

1. Extend the row mutation queue to cover replace, delete, detach, promote, and clear.
2. Use operation identity guards for every mutation family that can rewrite row data.
3. Ensure final visible/cache state is deterministic regardless of resolution order.

**Acceptance Criteria:**

- [ ] Same-row replace/delete/detach cannot interleave unsafely with queued scalar updates.
- [ ] Operation identity guards cover every mutation family.
- [ ] Concurrent update + replace/delete regression has deterministic visible recovery.

**Tests to add:**

- Extend `tests/vitest/estimate-sheet-library-insert.test.tsx` and `tests/vitest/estimate-sheet-cost-inputs.test.tsx`.

**Files to modify:**

- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- Tests as above.

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
```

---

### Phase 2: Make Failure States Trustworthy

#### 2.1 Retryable Tree Query Error State

**Problem:** `tabTreeQuery.isError` and `legacyTreeQuery.isError` are not branched in render; failures look like empty tabs.

**Evidence:**

- `src/hooks/use-estimate-query.ts:103` exposes query state.
- `src/components/workshop/EstimateSheetContent.tsx:2819` renders loading.
- `src/components/workshop/EstimateSheetContent.tsx:2896` renders empty tab copy.

**Acceptance Criteria:**

- [ ] `tabTreeQuery.isError` renders explicit "Could not load this tab" state with Retry button.
- [ ] Legacy tree query error renders explicit "Could not load estimate rows" state.
- [ ] Retry button calls relevant `refetch`.
- [ ] Empty tab copy appears only for successful empty data.
- [ ] Mutation controls disabled while active tree query is in error.

**Tests to add:**

- Mock `fetchEstimateTabTree` rejection; assert retryable load error shown, not empty tab.

**Files to modify:**

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/hooks/use-estimate-query.ts`
- Add focused test file or extend `tests/vitest/estimate-sheet-library-insert.test.tsx`.

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
```

---

#### 2.2 Row Mutation Error Presenter And Counted Save State

**Problem:** Update/delete/detach mutations roll back quietly; global `saveState` marks saved on any success while other mutations may still be pending.

**Acceptance Criteria:**

- [ ] Concurrent mutations keep state `saving` until all settle.
- [ ] Any update/delete/detach/clear/insert failure is visible.
- [ ] Failed state remains until a later successful save or explicit retry clears it.
- [ ] Rollback behavior remains intact.
- [ ] User-visible error is compact and persistent near sheet header with retry/reload guidance.

**Implementation:**

1. Track active mutation count and last error by operation family.
2. Mark saved only when active count reaches zero and no error is sticky.
3. Add centralized row mutation error presenter component.

**Tests to add:**

- Mock update/delete/detach failures; assert rollback plus visible error.
- Run concurrent row mutations; assert save state remains saving until all settle.

**Files to modify:**

- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `tests/vitest/estimate-sheet-library-insert.test.tsx`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
```

---

#### 2.3 Type Row Revision Conflicts

**Problem:** RPC throws raw `estimate_sheet_row_revision_conflict`; client recovery is generic.

**Acceptance Criteria:**

- [ ] `estimate_sheet_row_revision_conflict` maps to typed stale-data error.
- [ ] Client refetches active tree and tells user the row changed elsewhere.
- [ ] Generic provider details are not exposed raw to user.

**Files to modify:**

- `src/lib/estimates/actions.ts`
- Row mutation hook / client error presenter.
- Targeted conflict tests.

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1
```

---

### Phase 3: Fix Project-Source Concurrency

#### 3.1 Serialize Or Merge Project-Source Inserts

**Problem:** Bulk project-source add loops inserts; out-of-order responses can overwrite visible tree state.

**Evidence:**

- `src/components/workshop/EstimateSheetContent.tsx:2157` starts insert handling.
- `src/components/workshop/EstimateSheetContent.tsx:2174` applies `result.tree` directly.
- `src/components/workshop/EstimateSheetContent.tsx:2177` comments concurrent bulk source insert risk.
- `src/components/workshop/component-library/index.tsx:1804` loops bulk project-source targets.

**Implementation Options:**

| Option | Pros | Cons |
| --- | --- | --- |
| A. Batch server action | One coherent tree refresh, fewer network calls | New action + tests |
| B. Client queue per estimate/tab | No new server code | Adds client complexity |
| C. Request generation tracking + merge | Allows parallel requests | Merge logic must be correct for trees |

**Recommended approach:** Option A if feasible; otherwise Option B.

**Acceptance Criteria:**

- [ ] Bulk project-source add cannot drop earlier inserted sources due to response order.
- [ ] User feedback waits for server success or distinguishes "adding" from "added".
- [ ] Failure shows visible message and leaves current tree intact.
- [ ] Success copy emitted only after server action resolves.

**Tests to add:**

- Fire two project-source inserts, resolve second before first, assert both subtrees remain or client refetches/merges.

**Files to modify:**

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/lib/reusable-sources/actions.ts` (if batch action added)
- Project-source DOM/action tests.

**Verification Commands:**

```bash
bunx vitest run tests/vitest/project-source-insert-action.test.ts tests/vitest/reusable-source-drag.test.ts tests/vitest/template-browse-project-sources.test.tsx --maxWorkers=1
```

---

### Phase 4: Reduce Large-Data Ceilings

#### 4.1 Use Existing Bulk RPC For Template-Node Subtrees

**Problem:** Template-node subtree insert loops node creates and row inserts.

**Implementation:** Route `insertEstimateTemplateNodeIntoEstimate` through existing `insert_estimate_subtree_into_estimate_with_history` RPC. Add a new migration only if a focused spike proves the existing RPC cannot satisfy template-node semantics.

**Acceptance Criteria:**

- [ ] `insertEstimateTemplateNodeIntoEstimate` calls the bulk subtree RPC once for subtree copy.
- [ ] History events preserved.
- [ ] Large subtree insert latency bounded and tested.

**Tests to add:**

- Unit test that client action calls bulk subtree RPC once.
- Performance test for 100-row subtree insert query count and latency budget.

**Files to modify:**

- `src/lib/estimates/actions.ts`
- Generated types
- Action tests

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
```

---

#### 4.2 Add Route And Library Budgets

**Acceptance Criteria:**

- [ ] Estimate route can cap node/row load and display truncation state.
- [ ] Sidebar can page/search library components/templates server-side.
- [ ] Export/proposal paths retain full-data behavior under their own explicit caps.

**Files to modify:**

- `src/lib/repositories/workspace-repository.ts`
- Route page/content empty/truncation UI
- Component library repository/sidebar

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1
```

---

#### 4.3 Cap Reusable Project-Source Search Fan-Out

**Acceptance Criteria:**

- [ ] Search caps accessible projects, estimates, tabs, nodes, and rows scanned.
- [ ] Search returns lightweight hits instead of materializing full outlines.
- [ ] Full outlines load only when user explicitly expands a source.
- [ ] Telemetry or debug metadata can report scan counts during regression tests.

**Files to modify:**

- `src/lib/reusable-sources/actions.ts`
- `src/components/workshop/component-library/index.tsx`
- `tests/vitest/template-browse-project-sources.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`

**Verification Commands:**

```bash
bunx vitest run tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1
```

---

### Phase 5: UX Polish And Right-Sidebar Thumbnails

#### 5.1 Make Insert And Refresh Feedback Visible

**Acceptance Criteria:**

- [ ] Library/template/project-source inserts show compact visible pending status.
- [ ] "Added" or equivalent success copy appears only after persistence succeeds.
- [ ] Sidebar source refresh shows "refreshing", "updated", and retry on failure.
- [ ] Screen-reader live region remains.

**Files to modify:**

- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/estimate-sheet/rows/*`

**Verification Commands:**

```bash
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
```

---

#### 5.2 Relabel Local-Only Sidebar Component Actions

**Acceptance Criteria:**

- [ ] Sidebar edit/duplicate/delete actions either become persisted library CRUD or say they affect only the local/sidebar view.
- [ ] Undo/delete copy does not imply existing estimate rows or shared library records were changed when they were not.
- [ ] Newly created persisted components still auto-appear in current sidebar.

**Files to modify:**

- `src/components/workshop/component-library/index.tsx`
- `tests/vitest/component-library-ui.test.tsx`

**Verification Commands:**

```bash
bunx vitest run tests/vitest/component-library-ui.test.tsx --maxWorkers=1
```

---

#### 5.3 Add Right-Sidebar Component Row Thumbnails

This is a complete sub-project. Implement exactly per `10-right-sidebar-component-thumbnails-plan.md`.

**Summary:**

- Add 24px square thumbnails to component leaf rows in the estimate-sheet right sidebar.
- Thumbnails are opt-in via `showThumbnails={true}` on `LibraryTree` from `EstimateRightSidebar`.
- Use existing `EstimateRowItem.imageUrl` but with a strict row-thumbnail helper.
- Do not call `getComponentImageUrl(item)` from the row list.
- Folder/template/source rows do not render thumbnails.
- Missing/invalid/disallowed/failed URLs render a local placeholder.
- Lazy-load and virtualization bounds remain intact.

**Implementation Units (from `10-right-sidebar-component-thumbnails-plan.md`):**

1. **U1:** Lock row thumbnail rendering contract — add failing tests first.
2. **U2:** Add strict row thumbnail helper.
3. **U3:** Render the decorative thumbnail.
4. **U4:** Lock fallback, accessibility, and drag behavior.
5. **U5:** Lock virtualization and lazy-load bounds.
6. **U6:** Verification pass.

**Key files:**

- `src/components/workshop/component-library/tree/LibraryTree.tsx`
- Optional new: `src/components/workshop/component-library/tree/thumbnail.ts`
- `tests/vitest/component-library-ui.test.tsx`
- Optional new: `tests/vitest/component-library-sidebar-thumbnails.test.tsx`
- `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`

**Acceptance Criteria (condensed from thumbnail plan):**

- [ ] Component leaves show square thumbnail after tree icon and before title.
- [ ] Folders/templates/sources do not show thumbnails.
- [ ] Missing/invalid/disallowed/broken URLs render placeholder.
- [ ] Row accessible name remains component title.
- [ ] Drag/add/right-click/keyboard preview/search unchanged.
- [ ] Large libraries instantiate thumbnails only for mounted virtual rows.
- [ ] Sidebar lazy-load intact.
- [ ] `getComponentImageUrl` not called from `LibraryTree.tsx` or `thumbnail.ts`.

**Verification Commands:**

```bash
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/ui-tree.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
bun run type-check
git diff --check
rg -n "getComponentImageUrl" src/components/workshop/component-library/tree/LibraryTree.tsx src/components/workshop/component-library/tree/thumbnail.ts
```

Expected: all tests pass, type-check passes, diff-check clean, last `rg` returns no matches.

---

#### 5.4 Strengthen Drag/Drop Affordances

**Acceptance Criteria:**

- [ ] Valid drop targets are obvious during drag.
- [ ] Empty drop zone uses first-row copy from existing `empty` prop.
- [ ] Sidebar draggable rows expose grip or "Drag to sheet" tooltip on hover/focus.

**Files to modify:**

- `src/components/workshop/estimate-sheet/rows/drop-zones.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/component-library/tree/LibraryTree.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/estimate-component-drag.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1
```

---

#### 5.5 Align Small UI Details

**Acceptance Criteria:**

- [ ] Estimate-name errors are visible and keyboard/touch accessible.
- [ ] Hardcoded blue states use sheet tokens (`accentSoft`, `ring-accent`).
- [ ] Column reset uses an icon, not literal `R`.
- [ ] Sheet-shaped `[nodeId]/loading.tsx` added if route-transition polish is approved.

**Files to modify:**

- `src/components/workshop/ProjectEstimateMetadataStrip.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/cells.tsx`
- `src/components/workshop/estimate-sheet/columns/EstimateColumnRuler.tsx`
- Optional new: `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`

**Verification Commands:**

```bash
bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx --maxWorkers=1
```

---

### Phase 6: Final Integration And Verification

#### 6.1 Final Test Sweep

Run all targeted verification commands in sequence. Fix any failure before proceeding.

```bash
bunx vitest run tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
```

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1
```

```bash
bunx vitest run tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1
```

```bash
bunx vitest run tests/vitest/project-source-insert-action.test.ts tests/vitest/reusable-source-drag.test.ts tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1
```

```bash
bunx vitest run tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx --maxWorkers=1
```

```bash
bunx vitest run tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1
```

#### 6.2 Static And Type Checks

```bash
bun run type-check
```

```bash
git diff --check
```

```bash
rg -n "getComponentImageUrl" src/components/workshop/component-library/tree/LibraryTree.tsx src/components/workshop/component-library/tree/thumbnail.ts || true
```

#### 6.3 Code Review / QA Agent Sign-Off

A distinct agent that did not write the changes must:

1. Read the final diff.
2. Confirm all P1 acceptance criteria are addressed.
3. Confirm no internal provenance terms were renamed without a migration plan.
4. Confirm tests cover the new behavior.
5. Confirm `bun run type-check` and `git diff --check` pass.
6. Record sign-off in `.ai/10_state/current-state.md`.

#### 6.4 Evidence Recording

Append final evidence block to `.ai/10_state/current-state.md`:

```markdown
## 2026-06-21 Estimate Sheet Implementation — Complete

- Status: complete
- Phases: -1, 0, 1, 2, 3, 4, 5, 6
- Final verification: <all commands passed>
- Code Review / QA Agent: <agent id/name>
- Known residual risks: <none or list>
- Next recommended work: <future improvements>
```

---

## 6. Multi-Agent Orchestration Plan

### 6.1 Lane Assignments And Parallelism

Use the detailed native Codex `agent_type`, reasoning, model-default, and write
scope settings in section 0.2. This section only describes phase ownership and
parallelism. If the two sections ever disagree, section 0.2 controls runtime
agent settings.

| Lane | Agent role | Primary phases | Can run in parallel with |
| --- | --- | --- | --- |
| A | Lead Orchestrator | All (coordination, final integration) | None — serial oversight |
| B | Correctness Lane | 0, 1 | C, D after RPC schema locked |
| C | Auth & RPC Hardening | 0.4 | B |
| D | State & Failure UX | 2 | E after phase 0 |
| E | Concurrency & Large-Data | 3, 4 | D |
| F | Thumbnails | 5.3 | G |
| G | UX Polish | 5.1, 5.2, 5.4, 5.5 | F |
| H | Test Engineer | All (writes failing tests first) | All lanes |
| I | Code Review / QA | 6 only | None — final gate |

### 6.2 Synchronization Points

1. **After Phase -1:** all agents must agree on canonical taxonomy before any code changes.
2. **After Phase 0.3 + 0.4:** RPC schema changes finalized; lanes B, C, D can proceed in parallel.
3. **After Phase 1:** tab-scoped tree contracts stable; Phase 2 and 3 can proceed in parallel.
4. **Before Phase 5.3 thumbnails:** `LibraryTree` changes from Phase 0/1 must be merged to avoid conflicts.
5. **Phase 6:** single-threaded final review.

### 6.3 Communication Protocol

- Use `.ai/10_state/current-state.md` as the shared ledger.
- Each agent appends its own evidence block after each VERIFY step.
- If an agent needs another agent to wait, write a `BLOCKER:` entry and notify the Lead Orchestrator.
- Do not use chat context as the source of truth; all decisions live in repo artifacts.

---

## 7. Pros And Cons Of Key Implementation Decisions

### 7.1 Bulk Row Delete: Client Row-Scoped Rollback vs. New Bulk RPC

| Approach | Pros | Cons |
| --- | --- | --- |
| Client row-scoped rollback | No migration; fast fix; minimal blast radius | Still N network calls; not atomic |
| New bulk RPC | Atomic; one history set; fewer round trips | Requires migration, generated types, more tests |

**Decision:** Start with client row-scoped rollback; migrate to bulk RPC if performance or atomicity requirements demand it.

### 7.2 Component Move: Client Reconciliation vs. New Server Action

| Approach | Pros | Cons |
| --- | --- | --- |
| Client reconciliation | No server change; fixes visible duplicate/loss | Complex; not atomic |
| New server action | Atomic; simpler client | Migration; must handle history events |

**Decision:** Client reconciliation first with regression tests; escalate to server action if reconciliation cannot guarantee correctness.

### 7.3 Tab-Scoped Refresh: Thread `targetTabId` vs. Infer Server-Side

| Approach | Pros | Cons |
| --- | --- | --- |
| Thread `targetTabId` from client | Explicit; easy to test | Caller can pass wrong id |
| Infer from affected nodes server-side | Always correct | Requires node→tab lookups |

**Decision:** Support both: accept optional `targetTabId`, validate/infer server-side, assert match when both present.

### 7.4 Project-Source Concurrency: Batch Action vs. Client Queue

| Approach | Pros | Cons |
| --- | --- | --- |
| Batch server action | One tree refresh; fewer calls | New server code |
| Client queue per tab | No server change | More client complexity; still N calls |

**Decision:** Prefer batch server action; fall back to client queue only if batch action is blocked.

### 7.5 Thumbnails: Plain `<img>` vs. Next `<Image>`

| Approach | Pros | Cons |
| --- | --- | --- |
| Plain `<img>` with safe URLs | Simple; no proxy/allowed-domain config | No automatic optimization |
| Next `<Image>` | Optimization; sizing | Requires allowed domains/remotePatterns; overkill for 24px thumbnails |

**Decision:** Plain `<img>` with strict URL policy for first pass.

---

## 8. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Whole-tree rollback clobbers successful row deletes | High (confirmed) | High | Phase 0.1 row-scoped rollback |
| R2 | Component move leaves duplicate/lost state | High (confirmed) | High | Phase 0.2 row-pair reconciliation |
| R3 | Non-default tab refresh shows wrong tree | High (confirmed) | High | Phase 1.1 tab-scoped refresh |
| R4 | Bulk tree delete partially commits | Medium (confirmed) | High | Phase 0.3 transactional RPC |
| R5 | Membership-gated RPC allows unauthorized writes | Medium (confirmed) | High | Phase 0.4 edit-gating |
| R6 | Stale row revision after replace causes conflicts | High (confirmed) | Medium | Phase 1.2 canonical row patching |
| R7 | Quiet failures erode user trust | High (confirmed) | Medium | Phase 2 error presenter |
| R8 | Project-source out-of-order responses clobber tree | Medium (confirmed) | Medium | Phase 3 serialization/batch |
| R9 | Large tree drag-over performance degrades | Medium (confirmed) | Medium | Phase 0.5 cheap validation |
| R10 | Thumbnail feature bloats network or breaks virtualization | Low | Medium | Strict URL policy, opt-in, lazy loading, virtualization tests |
| R11 | Test flakiness or hang blocks verification | Medium | Medium | Use focused commands; avoid broad `validate` until known green |
| R12 | Scope creep into provenance renames or redesign | Medium | High | Enforce taxonomy boundary; require explicit user approval for any rename |

---

## 9. File Map (Key Surfaces)

| File | Responsibility | Likely touched phases |
| --- | --- | --- |
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | Route entry, auth, context loading | 4.2, 5.5 |
| `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` (new) | Sheet-shaped loading shell | 5.5 |
| `src/components/workshop/EstimateWorkspaceClient.tsx` | Workspace shell, tab bootstrap | 1.1, 2.1 |
| `src/components/workshop/EstimateSheetTree.tsx` | Left tree CRUD, DnD, reorder, delete | 0.3, 0.5, 1.1 |
| `src/components/workshop/EstimateSheetContent.tsx` | Sheet content, rows, mutations, sidebar, proposal | 0.1, 0.2, 1.2, 1.3, 2.1, 2.2, 3.1, 5.1, 5.3 |
| `src/hooks/use-estimate-row-mutations.ts` | Row mutation hooks and queues | 0.1, 0.2, 1.2, 1.3, 2.2 |
| `src/hooks/use-estimate-query.ts` | Estimate/tab/tree queries | 1.1, 2.1 |
| `src/lib/estimates/actions.ts` | Server actions for rows, nodes, templates | 0.2, 0.3, 0.4, 1.1, 1.2, 1.3, 2.3, 4.1 |
| `src/lib/estimates/estimate-tree-reorder.ts` | Reorder planning | 0.5 |
| `src/lib/repositories/workspace-repository.ts` | Tree loaders | 1.1, 4.2 |
| `src/lib/repositories/component-library-repository.ts` | Library data | 5.3 (if lite loader lacks imageUrl) |
| `src/lib/reusable-sources/actions.ts` | Reusable source search/insert | 3.1, 4.3 |
| `src/components/workshop/component-library/index.tsx` | Right sidebar | 3.1, 4.3, 5.1, 5.2 |
| `src/components/workshop/component-library/tree/LibraryTree.tsx` | Library tree rendering | 0.5, 5.3, 5.4 |
| `src/components/workshop/component-library/tree/thumbnail.ts` (new) | Strict thumbnail URL helper | 5.3 |
| `src/components/workshop/estimate-sheet/rows/cells.tsx` | Row cells, source labels | -1, 5.5 |
| `src/components/workshop/estimate-sheet/rows/row-table.tsx` | Row table | -1, 5.5 |
| `src/components/workshop/estimate-sheet/activity-history.tsx` | Activity history labels | -1 |
| `src/components/workshop/estimate-sheet/rows/drop-zones.tsx` | Drop zones | 5.4 |
| `src/components/workshop/estimate-sheet/rows/branch.tsx` | Branch rows | 5.4 |
| `src/components/workshop/ProjectEstimateMetadataStrip.tsx` | Metadata strip | 5.5 |
| `src/components/workshop/estimate-sheet/columns/EstimateColumnRuler.tsx` | Column ruler | 5.5 |
| `supabase/migrations/` | RPCs, schema | 0.3, 0.4, 4.1 |

---

## 10. Command Reference

### Focused test suites

```bash
# Taxonomy and core row CRUD
bunx vitest run tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1

# Tree CRUD and DnD
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx --maxWorkers=1

# Library and lazy load
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/ui-tree.test.tsx --maxWorkers=1

# Project sources
bunx vitest run tests/vitest/project-source-insert-action.test.ts tests/vitest/reusable-source-drag.test.ts tests/vitest/template-browse-project-sources.test.tsx --maxWorkers=1

# Tabs and workspace cache
bunx vitest run tests/vitest/estimate-tab-strip.test.tsx tests/vitest/estimate-workspace-client-cache.test.tsx --maxWorkers=1

# Proposal export
bunx vitest run tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1
```

### Static guards

```bash
bun run type-check
git diff --check
rg -n "Express component replaceable estimate component|Project-specific component|Make component project-specific|Make project-specific|Customized library component" src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet tests/vitest
rg -n "getComponentImageUrl" src/components/workshop/component-library/tree/LibraryTree.tsx src/components/workshop/component-library/tree/thumbnail.ts
```

### Migration workflow

Follow the project `supabase` skill. Typical flow:

```bash
bunx supabase migration new <name>
# edit migration file
bunx supabase db reset
bunx supabase gen types typescript --local > src/generated/database.types.ts
```

---

## 11. Appendices

### Appendix A: Glossary

- **Project Component:** user-facing label for project-local row components.
- **Library Component:** user-facing label for shared cost-library-linked rows.
- **Express row:** internal provenance state for inline-authored row.
- **Detached:** internal link-state for a previously linked row unlinked from library.
- **Projected project component:** internal provenance state for a row projected from a reusable project source.
- **Source snapshot:** persisted provenance metadata on a row.
- **Tab-scoped tree:** the tree returned for a specific `estimate_tab_id`, not the default tab.
- **Whole-tree rollback:** restoring the entire row/tree snapshot on a single-row failure.

### Appendix B: Evidence Recording Template (Repeated For Convenience)

```markdown
## 2026-06-21 Estimate Sheet Implementation — Phase X

- Phase: <name>
- Files changed: <list>
- Tests changed/added: <list>
- Verification command: <command>
- Result: pass / fail
- Blockers: <none or description>
- Next: <next unit/phase>
```

### Appendix C: Stop-Gates Summary

Do not proceed past these points without passing the gate:

1. Phase -1 taxonomy verification passes.
2. Phase 0 P1 correctness fixes have regression tests.
3. Phase 1 tab-scoped refresh and replace-row canonical patching verified.
4. Phase 2 error presenter and counted save state verified.
5. Phase 3 project-source serialization verified.
6. Phase 4 bulk subtree RPC and budgets verified.
7. Phase 5 thumbnails pass the static `getComponentImageUrl` guard.
8. Phase 6 Code Review / QA Agent sign-off recorded.

---

## 12. Final Instruction To The Implementor

Launch with the one-prompt autonomous run block in section 0.0, then read this
document. Spawn the lanes with the settings in section 0.2. Run the loop. Do not
stop until every checkbox, every acceptance criterion, every verification
command, and every stop-gate is satisfied. Record evidence continuously. When
complete, update `.ai/10_state/current-state.md` and report the result with the
full list of changed files, passing commands, and the Code Review / QA Agent
sign-off.

**This feature must be implemented 100% with 0 errors and 100% accuracy and efficiency. Auto-loop until done.**
