---
title: Express Components Scope And Premise Decision
type: decision
date: 2026-06-15
---

# Scope And Premise Decision

This decision record absorbs the 2026-06-15 readiness audit's strategic blockers before implementation starts.

## Decision

Day-0 is a narrow, flag-backed express-row MVP:

- U1 read path and classification helpers.
- U2 express Add row insert lifecycle, draft recovery, insert-history classification migration, and server-return reconciliation.
- U3 widened app-layer row update contract with JSON-preservation rules.
- U4 inline material-cell editor, but only after the one-day inline feasibility spike below passes.
- U9 minimum launch gates: feature flag, viewer/editor mutation boundaries, stale-revision recovery, draft cursor suppression, rollback fallback, migration ordering, and docs/static evidence.

U5, U6, and U7 are not day-0 implementation commitments:

- U5 is verification plus normalization hardening unless `evidence/u5-duplicate-instance-repro-note.md` captures a real DB-backed duplicate-instance failure.
- U6 Project folder projection is a fast-follow after U1-U4 prove row authoring and project context plumbing is explicitly chosen.
- U7 promotion to workspace library is a fast-follow after the atomic RPC contract, permission proof, grants, and price-option fields are verified.

The plan pack may continue to specify U5-U7 because they shape data contracts and prevent rework, but day-0 implementers must not ship them as part of the initial express authoring slice without a new owner-approved scope decision.

## Inline Versus Modal Gate

Owner: product + implementation lead. Evidence artifact required before U4 coding:
`evidence/inline-vs-modal-spike-result.md`.

The product preference remains inline authoring, not a modal. That preference is conditional on a one-day implementation spike before U4 coding:

- Use an estimate with at least 75 rendered rows and one express editor in the middle of the list, then repeat or extend the spike with 300-500 rows if the first run shows visible mount/scroll cost when virtualization is disabled.
- Prove name, description, unit, unit cost, Retry/Delete, and inline error states can be edited without overlap, trapped focus, or incoherent scroll jumps.
- Prove `content-visibility:auto`, `contain-intrinsic-size:96px`, and `translateY(start - scrollMargin)` do not hide active content when the day-0 virtualization fallback is applied.

Go/no-go:

- If the spike passes, U4 proceeds with inline editing and the day-0 virtualization fallback in doc 09.
- If the spike fails, stop before coding U4 and implement the compact quick-add modal/popover fallback specified in `03-ux-interaction-design.md`. Do not implement unproven dynamic row measurement under the current row virtualizer as the day-0 path.

## Table Versus Metadata Identity

No `project_components` table is created for day-0. The requested behavior is estimate-row scoped authoring, not reusable project-local catalog management.

`metadata.expressComponent.id` is retained only as row-lifetime identity for UI state, traces, project-source copy handling, and future migration safety. It is not catalog identity.

Rules:

- Mint the id client-side or server-side as UUIDv4 when the express row draft/template is created.
- Keep the id stable for the lifetime of that row.
- Rekey the id when an express row is copied from project-source/template/reusable-source context into another estimate row. This is implementation work, not current behavior: U8 must add the project-source copy RPC and template copy RPC to its mutator surfaces and use an RPC-side `jsonb_set`/merge or equivalent server-side step so the copied row receives a fresh `metadata.expressComponent.id`.
- Never dedupe Project projection leaves by material/name alone; use row id plus row-lifetime express id where needed.
- Do not use this id to imply reusable project-local components across rows or estimates.

If reusable project-local components become a near-term product requirement, stop U6/U7 work and model a real canonical aggregate such as `project_components` or a project-scoped library extension with explicit RLS, grants, typegen, history, and conversion rules.

## Approval Boundary

The implementation-ready stop condition for day-0 is U1-U4 plus the U9 gates above. U6/U7 readiness remains valuable design debt reduction, but it is not evidence that day-0 must ship Components-tab projection or library promotion.

Day-0 is still intentionally narrow, but it is not "no net-new UX." The stale-revision recovery, local draft recovery, draft cursor suppression, and feature-flag fallback are first-ship safety work because the existing app does not already provide them for express text fields.
