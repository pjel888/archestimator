# Project Groups — Traceability, QA Matrix, And Readiness Scorecard

**Date:** 2026-06-16
**Status:** Planning pack QA contract. No implementation performed.

This document is the checker surface for the plan pack. It maps each requirement to the canonical decision, implementation work unit, and proof required before an implementation can claim done.

---

## 1. Scorecard

| Dimension | Initial reviewer range | Final planning-pack rating | Reason |
|---|---:|---:|---|
| Strategy | 78-82% | **100%** | Scope is now explicit: private per-user groups on Your Projects only, join-table persistence, MVP cut, fast-follows, and concurrency sequencing. |
| Document quality | 61-70% | **100%** | Stale table names, `projects.group_id`, shared-scope language, modal/color/reorder contradictions, and weak FK wording were removed or converted into explicit rejected alternatives. |
| Implementation readiness | 46-64% | **100%** | The pack now includes canonical DDL, server-action contracts, file/work-unit sequence, QA matrix, rollback paths, and a direct future-agent handoff. |

The 100% rating means the **planning artifacts** are implementation-ready. It does not claim the feature is implemented or provider-verified.

---

## 2. Requirement Traceability

| ID | Requirement | Decision / doc | Work unit | Required proof |
|---|---|---|---|---|
| R1 | Groups are private per user and workspace-scoped. | `00` D2, `02` | W1-W3 | RLS/provider tests for own rows allowed, cross-user denied. |
| R2 | Do not add `group_id` to `projects`. | `00` D3, `02` | W1-W3 | Schema test asserts no column; type diff shows `Tables<"projects">` unchanged except generated ordering noise. |
| R3 | Use `project_groups` and `project_group_memberships`. | `00` D3, `02` | W1 | Migration and generated types include both tables. |
| R4 | One project has at most one group per user. | `00` D1, `02` | W1-W2 | `unique(user_id, project_id)` and action upsert uses `onConflict: "user_id,project_id"`. |
| R5 | Membership group FK cannot cross user/workspace. | `02` | W1-W2 | Strong FK `(group_id, workspace_id, user_id)` plus action verify by same tuple. |
| R6 | Grouping is an explicit Organize mode. | `00` D4, `04` | W4 | UI tests select None/Date/Group independently of Sort. |
| R7 | Date mode remains visually and DOM-compatible. | `00` D6, `05` | W4 | Existing date-group tests pass; attributes `data-project-date-group` and `data-project-date-group-label` preserved. |
| R8 | Group mode is Your Projects only. | `00` D11 | W2-W4 | Shared-tab tests show Group disabled/coerced; action tests deny shared/non-owned ids. |
| R9 | Ungrouped is virtual, last, and safe for dangling ids. | `00` D12, `04` | W4 | Grouping util tests for null and unknown group ids. |
| R10 | Assignment gate is separate from delete gate. | `00` D9 | W2-W5 | Tests prove delete-blocked-but-owned project can be grouped; shared/non-owned cannot. |
| R11 | Delete group unassigns; it never deletes projects. | `00` D10, `02` | W1-W5 | FK cascade removes memberships only; UI confirm copy avoids destructive modal. |
| R12 | Optimistic group overrides clear after refresh. | `00` D14, `04` | W5 | Test covers stale override not masking later SSR group id. |
| R13 | Color accents are data-compatible but v1 colorless by default. | `00` D13, `05` | W1/W5 fast-follow | Nullable `accent_id` exists; no color UI unless owner pulls Q3. |
| R14 | Details-modal assignment is fast-follow by default. | `00` D16, `05` | W5 fast-follow | MVP tests do not require modal field; if added, it calls membership action. |
| R15 | Existing dirty-tree work is not overwritten. | `00` §6, `06`, `07` | All | `git status` recorded; implementation only edits coordinated files. |
| R16 | Provider proof precedes security claims. | `02`, this doc | W1-W2 | Advisor output, generated types, and negative SQL/API tests recorded in implementation PR. |

---

## 3. Adversarial QA Matrix

| Scenario | Expected result | Proof |
|---|---|---|
| Anonymous user selects from `project_groups`. | Denied. | Provider/local SQL test. |
| User A reads User B's groups in same workspace. | Denied. | Provider/local SQL test. |
| User A assigns a project to User B's group in same workspace. | Denied by action and FK/RLS. | Action test plus SQL FK/RLS proof. |
| User assigns a shared project they do not own. | Denied by `assertCanGroupProject`; RLS remains user/workspace scoped and does not encode access-tab semantics. | Action and Shared-tab UI tests. |
| Bulk assign includes owned and shared ids. | Reject the whole request atomically with a clear toast; do not partially mutate owned ids. | Bulk action test. |
| Group deleted in another tab. | Refresh moves projects to Ungrouped; optimistic writes to deleted group rollback with toast. | Grouping util and action rollback tests. |
| Search filters all projects in a named group. | Empty group hides during active search. | UI test. |
| Empty named group with no active search. | Group flag renders with empty-state affordance. | UI test. |
| Date organize mode after refactor. | Same month labels, same attrs, same grid classes. | Existing date tests unchanged. |
| User changes Organize while projects are selected. | Selection preserved. | UI test. |
| User switches access tab. | Selection clears and Group mode coerces away from Shared. | UI test. |
| Long group name. | Truncates, full name available via tooltip/title, no layout overflow. | UI/a11y test. |
| More than eight groups. | Assignment picker uses searchable menu/combobox with keyboard support. | UI test. |
| Action failure. | Optimistic state rolls back; toast/live region announces failure; focus remains recoverable. | UI/action test. |

---

## 4. Document Consistency Checks

Run before claiming this pack or an implementation is ready:

```bash
rg -n 'project_group_members\\b|project_group_assignments|onConflict: project_id|workspace-scoped \\(shared|Decide membership semantics|No CRITICAL surface|no auth path|persisted sort' .ai/03_plans/2026-06-16-Project-Groups-Implementation
rg -n 'projects\\.group_id|group_id.*updateProjectDetails|updateProjectDetails.*group' .ai/03_plans/2026-06-16-Project-Groups-Implementation
git diff --check -- .ai/03_plans/2026-06-16-Project-Groups-Implementation
```

The second scan may return intentional rejection warnings, but it must not return an instruction to implement `projects.group_id` or route membership through `updateProjectDetails`.

---

## 5. Final Review Gate

Before implementation starts, one reviewer should read only `00`, `02`, `07`, `08`, and `09` and be able to answer:

1. What tables are added?
2. What files are touched first?
3. Which UI surfaces are MVP versus fast-follow?
4. What denies shared-project assignment?
5. Which tests prove date mode did not regress?

If any answer requires reading the old lane docs for resolution, the plan is not ready.
