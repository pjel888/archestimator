---
title: Estimate Sheet Master Orchestration Plan
type: docs
date: 2026-06-25
status: final-verified
---

# Estimate Sheet Master Orchestration Plan

## Purpose

This package coordinates future implementation of three source plan packs:

- `2026-06-24-Estimate-Sheet-Center-Content-Analysis`
- `2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis`
- `2026-06-24-Estimate-Sheet-Tree-Sidebar-Analysis`

The target is not three independent implementation streams. The target is one estimate workspace improvement program where the left project tree, center estimate grid, and right reusable-content dock share the same persistence, event, permission, telemetry, responsive, and validation contracts.

## Current Verdict

Planning package status: final-verified after continuation review. The original package had a final verifier PASS; this continuation then corrected stale bookkeeping, added prompt-required scorecards, expanded decision/edge-case coverage, and tightened security, responsive, keyboard, and performance gates. A fresh independent continuation verifier PASS confirmed the updated package.

Feature status: not implemented by this package. No app, test, schema, migration, provider, config, or source-plan files are intentionally changed.

Primary execution rule for the future implementation pass: establish the shared control plane first, then sequence disjoint trust wins and data-integrity work by blast radius. Right-sidebar honesty can move early behind a flag, but global estimate-workspace readiness still depends on center integrity and tree security gates.

## Master Sequence

| Phase | Name | Purpose | Parallelism |
|---|---|---|---|
| MOP-0 | Common control plane and DB/authz preflight | Lock ownership, flags, rollback, telemetry storage, permission matrix, validation baseline, project boundary, live schema/RLS/grant introspection. | Mostly single lead plus data/security/test reviewers. |
| MOP-0.5 | Quick UI/a11y preflight | Land low-risk visible quick wins that do not depend on data contracts, while preserving source-plan quick-win semantics. | Small disjoint UI owner after MOP-0 ownership locks. |
| MOP-1 | Right sidebar persistence honesty | Persist or remove local-only edit/delete/duplicate/template-group actions behind the existing flag; prove refresh honesty and latest-wins search. | Right owner after MOP-0; project-source safety claims wait for MOP-2. |
| MOP-2 | Center integrity and trust gates | Project-source revision gate first, then atomic component move and all-or-nothing bulk row delete, then center read-only/save-state fixes. | One backend/data owner plus one center owner; tightly coordinated. |
| MOP-3 | Tree security, delete authority, and DB invariants | App-layer authz, authoritative delete return, share-header/referrer hardening, structure signature, and only then sort-order migration/reorder scaling. | Tree owner plus same data owner for migrations/types. |
| MOP-4 | Shared interaction and feedback contracts | Freeze drag MIME readers, window events, keyboard equivalence, success/recents semantics, mutation feedback, cache/selection recovery. | Single contract owner with center/right/tree adapters. |
| MOP-5 | Accessibility, responsive fallback, performance, and observability | Table/tree semantics, live regions, focus, below-1024 fallback, budgets, dashboards/alerts, rollback drill, beta hold evidence. | UX/a11y/perf/ops owners after mutation semantics stabilize. |
| MOP-6 | Post-launch maintainability | Decompose large components and defer product enhancements after behavior locks. | Parallel only after launch gates pass. |

## Non-Negotiable Dependencies

- Center `moveRowComponent` cannot remain two independent row replacements for launch integrity.
- Center selected-row bulk delete cannot remain a loop of per-row deletes if the UX claims all-or-nothing.
- Center project-source insertion cannot blindly apply stale returned full trees when newer local edits exist.
- Supabase work must first confirm project ref `ebxxqidacheyapmmzavr`, inspect live signatures/grants/RLS/constraints, and regenerate generated types after changes.
- Telemetry storage/sink existence is a Phase 0 proof item, not an optional later dashboard task.
- Tree row-item edits must stop causing sidebar-wide replacement and optimistic state clobbering.
- Tree mutation actions need explicit edit authorization, not only RLS fallback.
- Right sidebar delete/edit/duplicate must persist across refresh or stop looking persistent.
- Project-source copy is a snapshot, not live/read-through source.
- Read-only behavior must be consistent across center, tree, right sidebar, keyboard, drag, and custom-event entry points.
- Telemetry must use one sanitized sink and event schema; do not create parallel console-only or table-specific systems.

## Package Index

| File | Role |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, skill use, lane ledger, safety notes. |
| `01_SOURCE_PLAN_INVENTORY.md` | Inventory and synthesis of the three source plan folders. |
| `02_CONSOLIDATED_REQUIREMENTS.md` | Unified requirement IDs and source mappings. |
| `03_CONFLICTS_AND_RESOLUTIONS.md` | Cross-plan conflicts, selected resolutions, rejected alternatives. |
| `04_CODEBASE_AND_DOCUMENTATION_AUDIT.md` | Current code/documentation evidence and hot-file map. |
| `05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md` | Future implementation phases, owners, dependencies, and gates. |
| `06_AGENT_WORKSTREAMS_AND_PROMPTS.md` | Workstream assignments and ready-to-use future agent prompts. |
| `07_ORCHESTRATION_TODO.md` | Checklist for the later implementation program. |
| `08_MASTER_BEFORE_AFTER_REPORT.md` | Before/after report template for implementation completion. |
| `09_TRACEABILITY_MATRIX.md` | Requirement-to-phase-to-test traceability. |
| `10_RISK_DECISION_AND_ROLLBACK_REGISTER.md` | Decisions, risks, rollback/fix-forward register. |
| `11_TEST_VALIDATION_AND_QA_STRATEGY.md` | RED->GREEN gates and release evidence strategy. |
| `12_ADVERSARIAL_REVIEW.md` | Critique cycle findings and resolutions. |
| `13_FINAL_READINESS_REVIEW.md` | Independent final verification and readiness determination. |
| `14_SOURCE_ID_COVERAGE_APPENDIX.md` | Source finding/task/threat coverage proof by ID. |
| `15_SCORECARD_AND_COMPLETION_AUDIT.md` | Prompt-required document scorecards, before/after comparison, residual score reasons, and completion audit. |
| `LOOP_LEDGER.md` | Append-only orchestration loop log. |

## Evidence Boundaries

This package is grounded in source-plan review, targeted source inspection, existing tests, `DESIGN.md`, `.ai` state/decisions, and specialist reports. It does not include runtime browser proof, live Supabase migration proof, provider dashboards, screen-reader proof, or production rollout evidence. Those are future implementation gates.
