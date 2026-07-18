# Estimate System Wiki Knowledge Graph — Successor Plan

Status: Achieved implementation successor  
Date: 2026-07-15  
Execution ceiling: Local implementation only  
Provenance: `../IMPLEMENTATION_PLAN.md` remains the achieved Product / Features / Pages / UX phase.

## Goal

Turn `/admin/estimate-system` into a human-readable product wiki with a fifth `Knowledge` view that explains the estimate domain, current CRUD and lifecycle actions, and the direct and downstream effects of each action.

The view must serve two readers at once:

- a human who wants to understand what happens in the product without reading code; and
- an agent that needs a typed, source-grounded model of ownership, propagation, snapshots, guards, and known gaps.

## Truth Boundaries

1. The live estimate is mutable authoring state.
2. Row totals and estimate totals are derived from live authoring state.
3. A legacy shared link serves a stored publication snapshot, not a live estimate query.
4. A Client Portal issue is immutable issued content. A later issue supersedes rather than rewrites the prior issue.
5. A shared Library edit, a Project component edit, a row-local edit, and a row-owned variant selection have different fan-out scopes.
6. A materialized template copy is a new estimate structure, not a live template link.
7. Graph claims are curated documentation. GitNexus assists discovery and impact review but is not a runtime dependency or source of product truth.

The default scenario must correct the motivating example: deleting an estimate row removes it from the live estimate and recalculates live totals, but already-issued shared/portal content remains unchanged until explicit republish or a new issue.

## Requirements

### REQ-001 — Additive fifth view

Preserve Product as the default and preserve the existing Product, Features, Pages, and UX behavior. Add `Knowledge` as a separate fifth view.

### REQ-002 — Typed ontology

Define a serializable model for stages, entities, relationships, operations, effects, source notes, status, confidence, layout coordinates, and verification date. Invalid IDs, endpoints, action references, source-less effects, and incomplete operation records must fail at documentation construction.

### REQ-003 — Explicit current-operation inventory

Classify the current, user-visible estimate operations listed below. Each operation must be represented or explicitly marked partial, legacy, boundary, or not applicable.

| Scope | Required operations |
| --- | --- |
| Estimate | create, read/open, duplicate, archive/delete |
| Structure | create, rename, reorder, duplicate tab, delete subtree, restore |
| Row | create blank, insert from Library, read, edit local fields, select variant, move/reorder, replace, delete, bulk delete, undo/restore |
| Project component | reuse within project, edit shared fields, remove/replace used variant, localize across projects, promote to Library |
| Library component | create, read, update, archive/permanent delete, add/edit/reorder/default/remove variant |
| Template | create/edit, insert/materialize, reorder, delete, use saved fallback snapshot when source is unavailable |
| Charges | edit row inputs, edit sheet adjustment, derive row/sheet/proposal totals |
| Legacy publication | create, read, republish, revoke |
| Client Portal | draft, publish issue, read issued content, supersede with a new issue, withdraw/archive, discuss, decide |

### REQ-004 — Effect contract

Every documented operation must answer in plain language:

- Who starts it and where?
- What record or concept changes directly?
- What recalculates, synchronizes, disappears, or becomes stale?
- What does not change?
- Is the effect row-only, project-wide, workspace-wide, or issue-local?
- What guard or failure recovery applies?
- What source evidence supports the statement?

### REQ-005 — Infinite canvas with progressive disclosure

Provide a deterministic read-only canvas with pan, zoom, fit, reset, search, node selection, operation presets, and direct-neighborhood highlighting. Default to a focused scenario, not every edge at once. Use the existing D3 dependency and no force simulation.

### REQ-006 — Human-readable wiki detail

The selected operation/entity panel must answer “what is this?”, “where is it?”, “what can I do?”, “what changes?”, “what stays the same?”, and “where did this claim come from?” without requiring the canvas.

### REQ-007 — Accessible linear equivalent

Provide the same essential operation/effect knowledge as semantic lists. No fact may depend only on position, hover, color, or connector geometry. Compact layout must prioritize the linear mode and avoid page-level horizontal overflow.

### REQ-008 — Fresh evidence and honest coverage

Show verification date and evidence confidence. Record current gaps, including cross-session delete staleness where current realtime payloads do not broadcast a delete semantic. Close only after the explicit inventory and requirement-to-evidence audit pass.

## Knowledge Model

### Entity stages

1. **Reuse** — Library component, Library variant, template, attachment.
2. **Author** — project, estimate, tab/area/group, Project component identity, estimate row, selected variant.
3. **Calculate** — row total, sheet adjustment, estimate/proposal total.
4. **Issue** — legacy publication snapshot, portal draft, immutable portal issue, issued row projection.
5. **Review** — public review page, discussion, decision, activity/notification.

### Relationship vocabulary

`contains`, `defines`, `materializes`, `projects`, `selects`, `changes`, `synchronizes`, `recalculates`, `records`, `deletes`, `restores`, `localizes`, `promotes`, `snapshots`, `serves`, `keeps-unchanged`, `supersedes`, `reviews`, and `notifies`.

Relationship status is separate from evidence confidence:

- `current` — implemented current behavior;
- `guarded` — requires confirmation, revision/fingerprint validation, or replacement;
- `boundary` — deliberately does not propagate across this edge;
- `partial` — current continuity or refresh behavior is incomplete.

### First scenario presets

1. Delete an estimate row.
2. Edit one row.
3. Edit a shared Project component.
4. Edit a shared Library component.
5. Select a variant on one row.
6. Insert a template.
7. Publish or republish client content.
8. Permanently delete a Library component.

## Information Architecture

### Global tab

- Label: `Knowledge`
- Position: after UX
- Badge: operation count
- Product remains the initial view

### Knowledge workspace

1. Plain-language orientation and live-versus-issued callout.
2. Search and operation presets.
3. Deterministic canvas with stage lanes and labeled edges.
4. Zoom in, zoom out, fit, and reset controls.
5. Selected operation/entity inspector.
6. “What changes” and “What stays the same” lists.
7. Complete accessible relationship list for the active focus.
8. Collapsed source notes and evidence status.

## Implementation Units

### UNIT-001 — Ontology and source coverage registry

- Add typed graph contracts, integrity validation, selectors, layout constants, and source-grounded data.
- Register the explicit operation inventory and the eight first scenario presets.
- Keep all graph data read-only and admin-client-safe.

### UNIT-002 — Estimate structure and row CRUD

- Model estimate, hierarchy, row, totals, history, and cache/projection effects.
- Make row deletion, restore, row-local edit, move, duplicate, and subtree deletion precise.

### UNIT-003 — Components, variants, templates, and attachments

- Model row-only, project-wide, and workspace-wide propagation.
- Keep stable variant identity, selected variant, local override, localization, promotion, and materialization distinct.

### UNIT-004 — Publication and review boundaries

- Model live editor, legacy snapshot, portal draft, immutable issue, issued row projection, public review, discussion, decision, and supersession separately.

### UNIT-005 — Human-readable wiki/index

- Add search, preset navigation, glossary, operation detail, effects, unchanged surfaces, scope, guards, and sources.

### UNIT-006 — Deterministic infinite canvas

- Add fixed stage layout, SVG edge routing, D3 pan/zoom, fit/reset, focus highlighting, and reduced-motion behavior.

### UNIT-007 — Accessibility, compact mode, and cross-navigation

- Add semantic linear equivalence, keyboard focus, compact stacking, truthful empty states, and Page/Feature links where supported.

### UNIT-008 — Evidence and closeout

- Run typed-load integrity, scoped lint/static checks, `git diff --check`, focused browser UltraQA, console inspection, GitNexus change detection, independent review, requirement audit, and plan-pack validation.

## Acceptance Criteria

- **AC-001:** Existing four views retain their behavior and Product remains default.
- **AC-002:** Typed graph load rejects duplicate IDs, missing endpoints, missing sources, incomplete effects, and incomplete operations.
- **AC-003:** The explicit operation inventory is 100% classified.
- **AC-004:** “Delete an estimate row” accurately distinguishes live deletion, total/history/projection effects, Undo, legacy snapshot preservation, and immutable portal issue preservation.
- **AC-005:** Search, preset selection, node selection, pan, zoom, fit, reset, and focused impact tracing work without default graph overload.
- **AC-006:** Linear/wiki mode exposes the same essential facts as the canvas.
- **AC-007:** Human-readable labels, readable typography, keyboard focus, compact layout, and clean browser console pass focused UltraQA.
- **AC-008:** Every requirement maps to fresh evidence and no required operation remains unclassified.

## Verification Contract

Static proof is `NOT_REQUIRED` testing and may include typed document load, scoped ESLint, TypeScript diagnostics for touched files, graph integrity counts, plan validators, and `git diff --check`.

The user explicitly invoked UltraQA for this goal. Focused local browser verification is therefore a `TEST_TASK` only for the Knowledge view: default view preservation, presets, search, canvas controls, keyboard/linear equivalence, desktop/compact layout, and console state. It does not authorize unrelated repository-wide suites or deployment.

## Risks and Mitigations

- **Everything-canvas overload:** Product remains default; Knowledge opens on one operation and first-degree effects.
- **False causality:** every effect has an explicit status and source note.
- **Snapshot confusion:** live, legacy snapshot, and portal issue are separate nodes with boundary edges.
- **Stale authority:** verification date and confidence are visible; gaps stay labeled.
- **Shared worktree collision:** graph implementation stays in admin documentation files and does not edit current estimate/component mutation source.

## Stop Condition

Stop only when all eight requirements and acceptance criteria have fresh evidence, the operation inventory is fully classified, the focused browser matrix passes, independent review approves the product truth, and the nested successor manifest validates as achieved. Otherwise record the next smallest coherent loop in `LOOP_LEDGER.md` and continue.
