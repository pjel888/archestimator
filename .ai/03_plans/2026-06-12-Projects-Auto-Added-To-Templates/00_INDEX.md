# 00 — Index: Multi-Tab Estimates, Sheet→Tab Rebrand, Project-Derived Template Sources, Tab-Aware XLSX Export

**Date:** 2026-06-12 · **Branch audited:** `main` @ `4289baff` · **Pass type:** docs-only planning
**No application code was modified by this planning pass.** No migrations, generated types, tests, config, lockfiles, package files, provider state, or secrets were changed — only Markdown files inside this folder were created.

---

## 1. Feature objective

Four coupled changes, planned together because they share one data-model pivot:

1. **Multi-tab support inside every estimate** — the estimate node tree moves from "owned by the estimate" to "owned by a tab"; estimates become containers of ordered, named tabs.
2. **User-facing rebrand: "sheets" → "tabs"** (and "estimate sheet" → "estimate"), with legacy DB/internal "sheet" names deliberately kept.
3. **Templates panel unification** — the panel shows user-created custom templates **plus** virtual, read-through project-derived sources from all readable workspace projects (Projects → Estimates → Tabs → Groups/Areas), browsable/searchable/draggable, never auto-persisted.
4. **Tab-aware XLSX export** — estimate tabs map to Excel worksheet tabs with deterministic sanitized names; existing export links and single-tab workbooks stay byte-shape compatible.

## 2. Final recommended architecture (5 bullets)

- **First-class `estimate_tabs` table** (Option A) + `estimate_nodes.estimate_tab_id` with a composite same-estimate FK; rows derive their tab through `node_id`; exactly one backfilled default tab (`Main`) per existing estimate ([02](02_TARGET_ARCHITECTURE.md) §3, [03](03_DATABASE_MIGRATION_PLAN.md)).
- **Route shape unchanged** (`/workshop/projects/[projectId]/estimates/[nodeId]`, node-or-estimate fallback preserved); the active tab is derived from the resolved node; compatibility wrappers keep every existing loader call site working until intentionally migrated ([02](02_TARGET_ARCHITECTURE.md) §9, §13).
- **Tabs inherit estimate-level access** (no tab ACLs); new tab/insert RPCs adopt the strict `can_edit_estimate` posture; project-derived browsing uses RLS-scoped user reads only ([08](08_ACCESS_SECURITY_RLS_PLAN.md)).
- **Project-derived sources are virtual/read-through** — unified with custom templates at the UI + insertion layer (new drag mime + one new estimate→estimate copy RPC mirroring the template-insert RPC), persisted only via explicit "Save as template" ([06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md)).
- **Export Option C:** all tabs by default — global Summary + one sanitized-name worksheet per tab + global Commercial Terms/Source Breakdown; single-tab estimates keep today's exact four-sheet workbook; `?tab=` adds active-tab export without breaking any consumer ([07](07_XLSX_EXPORT_TABS_PLAN.md)).

## 3. Document map / artifact inventory (00–16)

| File | One-line purpose |
|---|---|
| [00_INDEX.md](00_INDEX.md) | This executive index: objective, architecture, sequence, inventory, status. |
| [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) | Evidence-backed audit of estimates, templates, export, routes, collaboration, versioning, AI, tests + terminology debt and the do-not-rename keep-list. |
| [02_TARGET_ARCHITECTURE.md](02_TARGET_ARCHITECTURE.md) | Target hierarchy, five-term vocabulary, storage/UI/export models, ownership/permission/caching/compatibility/rollout strategies, four required diagrams. |
| [03_DATABASE_MIGRATION_PLAN.md](03_DATABASE_MIGRATION_PLAN.md) | Schema options A/B/C, recommended DDL, constraints, RLS, indexes, backfill + proof queries P1–P5, RPC evolution, rollout/rollback, local test channel, type regen. |
| [04_DOMAIN_AND_REPOSITORY_PLAN.md](04_DOMAIN_AND_REPOSITORY_PLAN.md) | New domain types, query-key redesign, repository/action surface, compat wrappers, optimistic/invalidation/event strategies, naming boundary, shim deletion criteria. |
| [05_ESTIMATE_TABS_UI_UX_PLAN.md](05_ESTIMATE_TABS_UI_UX_PLAN.md) | Tab strip placement, lifecycle UX, states, a11y/keyboard parity, routes, responsive/loading/error, design-system rules, and the exhaustive old→new copy table. |
| [06_TEMPLATES_PANEL_UNIFICATION_PLAN.md](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) | Unified source model: discriminated union, nav tree, search/preview/staleness, drag payloads + insert RPC, permission-safe read path, action-matrix divergence. |
| [07_XLSX_EXPORT_TABS_PLAN.md](07_XLSX_EXPORT_TABS_PLAN.md) | Export behavior options, recommended workbook shapes, worksheet-name sanitizer, route/API compatibility, preview parity, scale + test strategy. |
| [08_ACCESS_SECURITY_RLS_PLAN.md](08_ACCESS_SECURITY_RLS_PLAN.md) | Access model trace, tab-access deferral, RLS policies, insert gates, read/write permission matrices, denial scenarios, advisory note (profile_role_hardening_audit). |
| [09_TEST_AND_VALIDATION_PLAN.md](09_TEST_AND_VALIDATION_PLAN.md) | Full test plan with proposed file paths, per-phase matrix, exact validation commands, baseline caveat, manual QA. |
| [10_IMPLEMENTATION_PHASES.md](10_IMPLEMENTATION_PHASES.md) | Phases 0–8 with objective/files/DB/UI/tests/rollback/definition-of-done each. |
| [11_RISK_REGISTER.md](11_RISK_REGISTER.md) | 21 risks with severity, probability, area, mitigation, validation method. |
| [12_OPEN_QUESTIONS_AND_DECISIONS.md](12_OPEN_QUESTIONS_AND_DECISIONS.md) | 15 decisions made, 4 owner/deferred-shape items (none blocking Phase 1), deferred-discovery list. |
| [13_REQUIREMENTS_TRACEABILITY_MATRIX.md](13_REQUIREMENTS_TRACEABILITY_MATRIX.md) | Every requirement group → doc, phase, files/tables, tests, risks, status. |
| [14_IMPLEMENTATION_HANDOFF.md](14_IMPLEMENTATION_HANDOFF.md) | Execution contract for the implementing agent + short pointer prompt. |
| [15_REVIEW_CHECKLIST.md](15_REVIEW_CHECKLIST.md) | Reviewer pass/fail checklist for implementation readiness. |
| [16_COMPLETION_AUDIT.md](16_COMPLETION_AUDIT.md) | Proof this prompt was followed; verification outputs; final verdict. |

## 4. Implementation sequence

Phase 0 audit/baseline → **Phase 1 DB tab foundation** → Phase 2 repo/domain (wrappers) → Phase 3 editor multi-tab UI → Phase 4 terminology rebrand → Phase 5 templates panel unified sources → Phase 6 XLSX export tabs → Phase 7 hardening → Phase 8 docs/cleanup. Full contracts in [10_IMPLEMENTATION_PHASES.md](10_IMPLEMENTATION_PHASES.md).

## 5. Recommended first implementation slice — and why it is safest

**Phase 1: the `estimate_tabs` migration, proven on the local ephemeral-Postgres harness before anything user-visible exists.** It is invisible to users (nothing reads tabs yet), it isolates the only hard-to-reverse work (unique-sort constraint swap + `validate_estimate_node_tree` update) behind proof queries P1–P5 and an RLS harness, every later phase depends on it, and its rollback is cleanest while the schema has no consumers ([14](14_IMPLEMENTATION_HANDOFF.md) §4).

## 6. Provider/manual proof status

**Not performed during this docs-only pass.** No Supabase (local or linked), Vercel, GitHub, or browser/manual verification was run; no SQL executed; no types regenerated. All claims herein are **local repo-evidence only** (source, migrations, tests, scripts read on 2026-06-12). Linked-apply, hosted export smoke, advisor re-checks, and spreadsheet-app inspection are future, separately authorized steps labeled throughout as provider/manual proof ([03](03_DATABASE_MIGRATION_PLAN.md) §11, [14](14_IMPLEMENTATION_HANDOFF.md) §8).

## 7. Unresolved questions

**None blocking.** Two product-owner items ride along with defaults (marketing-copy alignment Q-1; default-tab name Q-2) and two minor export/template-shape items (Q-3, Q-4) — see [12_OPEN_QUESTIONS_AND_DECISIONS.md](12_OPEN_QUESTIONS_AND_DECISIONS.md) §B. Phase 1 can start without any of them.

## Evidence Used

- Source prompt: `.ai/08_prompts/2026-06-12-Projects-Auto-Added-To-Templates.md`
- Canonical state: `.ai/README.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `DESIGN.md`
- Plan package documents: [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) through [16_COMPLETION_AUDIT.md](16_COMPLETION_AUDIT.md)
