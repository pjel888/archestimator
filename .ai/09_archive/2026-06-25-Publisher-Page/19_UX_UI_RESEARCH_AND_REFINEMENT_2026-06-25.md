# 19 - UX/UI Research and Refinement Addendum

> **UX/UI RESEARCH ADDENDUM (2026-06-25).** This document complements the authoritative pass-2 errata in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Doc 18 still controls factual code corrections. This doc controls the source-backed UX/UI refinements added after the product-design, Impeccable, Hallmark, and web-research pass.

---

## Scope and authority

**Scope.** Planning only. No application code, tests, migrations, provider state, screenshots, browser automation, or production surfaces were changed.

**Primary target.** Future `/workshop/publisher` route: the builder-side workspace surface for publication roster, shared-link management, sheet visibility, recipients, and activity.

**Design target.** Archestimator product UI: quiet, precise, workshop-native, dense enough for repeated work, and restrained enough that builders can compare publication health without decorative noise.

**Authority order.**
1. `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md` for factual code corrections.
2. This document for UX/UI planning refinements.
3. `05_UX_UI_ACCESSIBILITY_PLAN.md` for the main journey, IA, state, and accessibility plan.
4. `04_REQUIREMENTS_SPECIFICATION.md`, `11_IMPLEMENTATION_PLAN.md`, `12_TEST_AND_VALIDATION_STRATEGY.md`, and `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` after their 2026-06-25 updates.

---

## Research sources used

| Source | Why it matters for Publisher | URL |
|---|---|---|
| Nielsen Norman Group, "Data Tables: Four Major User Tasks" | Roster table must support find, compare, inspect/edit one row, and act on records. | https://www.nngroup.com/articles/data-tables/ |
| Nielsen Norman Group, "Progressive Disclosure" | Keep the roster scannable; defer advanced or rare controls into drawer/page detail. | https://www.nngroup.com/articles/progressive-disclosure/ |
| Nielsen Norman Group, "Designing Empty States in Complex Applications" | Empty and filtered states must explain status and provide a direct next action. | https://www.nngroup.com/articles/empty-state-interface-design/ |
| Nielsen Norman Group, "Mobile Permission Requests" | Permission-like actions should be timely, reversible when possible, and avoid dark-pattern pressure. | https://www.nngroup.com/articles/permission-requests/ |
| IBM Carbon Design System, "Data table usage" | Selection, batch actions, sorting, row click targets, and table toolbar behavior. | https://carbondesignsystem.com/components/data-table/usage/ |
| IBM Carbon Design System, "Filtering" | Filter defaults should match the user's task: exploration starts broad; triage can narrow. | https://carbondesignsystem.com/patterns/filtering/ |
| W3C WAI-ARIA APG, "Dialog (Modal) Pattern" | Modal and drawer focus behavior, focus return, and keyboard containment. | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ |
| W3C WCAG 2.2 | Accessibility target for new Publisher surfaces; AA remains the implementation bar. | https://www.w3.org/TR/WCAG22/ |
| GOV.UK Design System, "Error message" | Field validation needs inline messages and an error summary for forms. | https://design-system.service.gov.uk/components/error-message/ |
| GOV.UK Design System, "Confirmation pages" | Success states should tell the user what happened, what happens next, and what to keep. | https://design-system.service.gov.uk/patterns/confirmation-pages/ |
| MDN, `Referrer-Policy` header | Copy/share workflows should not leak authenticated workshop URLs via Referer headers. | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy |
| web.dev, "Referrer and Referrer-Policy best practices" | If URLs may contain sensitive state, set a protective referrer policy. | https://web.dev/articles/referrer-best-practices |

---

## Workstream ledger

| Workstream | Target result | Evidence | Result |
|---|---|---|---|
| Product UX | Convert Publisher from a generic table into task-shaped workbench IA. | NN/g data-table tasks, existing `DESIGN.md`, Impeccable product guidance. | Add at-a-glance vs drill-down split and new UX requirements. |
| Data-table IA | Reduce roster cognitive load and define selection/batch behavior. | Carbon data-table selection, sorting, toolbar, and row-click guidance. | Keep primary roster to 6 visible task columns; move detail to drawer/expanded view. |
| Permission UX | Make recipient, revoke, rotate, password, and sheet-scope changes understandable and reversible where safe. | NN/g permission timing/reversal guidance, GOV.UK confirmation guidance. | Add impact preview, undo/next-step rules, and per-action recipient cap callout. |
| Accessibility | Specify focus, dialog, error summary, target size, and WCAG 2.2 baseline. | WAI-ARIA APG modal dialog, WCAG 2.2, GOV.UK error pattern. | Add A11Y-08 and A11Y-09 plus explicit validation. |
| Privacy | Prevent manager workshop URLs from leaking when external links are copied/opened. | MDN and web.dev Referrer-Policy references. | Fold into D-OPS-01, UX-12, and test strategy. |
| Anti-slop visual review | Keep the plan aligned with Archestimator's restrained product language. | Hallmark + Impeccable repo context. | Ban decorative table chrome, oversized hero/card layout, fake metrics, and novelty animation. |

Native browser/design QA was intentionally not run because this is a plan-pack edit with no rendered UI target.

---

## Source-backed UX refinements

### UX-R1 - Roster task model

The Publisher roster must optimize for four tasks:
1. Find a publication by project, recipient, status, or sheet.
2. Compare health across publications.
3. Inspect and manage one publication.
4. Apply a safe action to one or more selected publications.

**Plan effect.** The primary roster is not a data dump. It should show the minimum fields needed for these tasks and move advanced detail into the drawer or expanded detail view.

### UX-R2 - At-a-glance vs drill-down split

The current 8-column roster proposal risks turning the first viewport into a cramped audit table. Use this split:

**Primary visible roster columns.**
- Publication / project
- Status / health
- Recipients summary
- Latest activity
- Sheet scope
- Actions

**Secondary detail.**
- Opens count
- Last opened timestamp
- Snapshot version
- Days behind estimate
- Full recipient list
- Activity-type details
- Audit/event raw metadata

**Plan effect.** `05_UX_UI_ACCESSIBILITY_PLAN.md` now treats 6 primary columns as the baseline and reserves secondary fields for the drawer, expanded row, or responsive detail route.

### UX-R3 - Permission-change impact preview

Publisher actions are permission-like decisions. They can affect clients, subcontractors, and internal collaborators. The UI must explain the impact before destructive changes and confirm the outcome after the action.

**Required previews.**
- Revoke: affected recipients, old link status, receiver result.
- Rotate: old token invalidation, new copy action, re-notification policy.
- Password clear/change: cookie invalidation or continued-access behavior.
- Sheet selection change: whether snapshot version changes and whether recipient cookies remain valid.
- Access-mode restrict: who loses access and whether last-admin protection applies.
- Recipient bulk add: number of emails, fixed cap of 50 recipient inputs per add/remove action.

**Plan effect.** Add UX-10 and update Phase 2 work packages/tests.

### UX-R4 - Empty, filtered, and disabled states

Publisher needs state-specific empty states:
- No publications in workspace: explain the product state and offer `Publish your first estimate`.
- No filter results: show active filters and offer `Clear filters`.
- Feature flag disabled: explain that Publisher is not enabled yet; do not present a broken workspace.
- Mobile `< 768px`: explain desktop-first status and link back to `/workshop`.
- Permission denied/read-only: explain what the user can see and who can change it.

**Plan effect.** FR-18 explicitly reuses `src/components/ui/empty-state.tsx`; `05` and `12` add validation for state-specific copy and CTA behavior.

### UX-R5 - Error and success copy

Validation errors inside publish, recipient, password, sheet-scope, and destructive-confirmation forms must have:
- A field-level message.
- An error summary at the top of the form or modal.
- Focus moved to the summary on submit failure.
- Toasts reserved for mutation results, retries, and non-blocking background outcomes.

Success states must state what happened and what the user can do next:
- Copy the new link.
- Re-notify recipients.
- View the share route.
- Undo only when the underlying action is truly reversible.

**Plan effect.** Add A11Y-09, TEST-08, and implementation instructions for drawer forms.

### UX-R6 - Selection, sorting, and batch actions

Selection is a mode, not a decorative checkbox column. Once any row is selected:
- Show selected count.
- Show only eligible batch actions.
- Disable row-level destructive controls that conflict with the active batch action.
- Preserve clear row click targets for `Manage` and `Copy link`.
- Keep sorting explicit, URL-backed where it affects server data, and stable on refresh.

**Plan effect.** Batch behavior remains Phase 5+ for bulk rotate/revoke, but Phase 1 table architecture must not block it.

### UX-R7 - 768px tablet contract

The PH/SEA tablet case from doc 18 makes 768px a first-class builder viewport, not a throwaway mobile state.

**Contract.**
- `>= 1024px`: full roster with drawer slide-over.
- `768px-1023px`: priority-column roster plus full-page/detail route for the drawer content.
- `< 768px`: desktop-first empty state redirect to `/workshop`.

**Plan effect.** Add UX-11 and targeted validation at 768px portrait.

### UX-R8 - Privacy around copy/open share links

Copying a share link should not navigate. Any future "open share link" affordance must avoid leaking the authenticated workshop URL as the Referer header.

**Contract.**
- `Copy link` writes to clipboard only and confirms through toast/status.
- External share preview links use `rel="noreferrer"` where rendered as anchors.
- `/workshop/*` should use `Referrer-Policy: no-referrer`, per resolved D-OPS-01.

**Plan effect.** Add UX-12 and a privacy validation item.

---

## Requirements added by this pass

| ID | Target doc | Requirement |
|---|---|---|
| UX-09 | `04`, `05`, `16` | Roster at-a-glance fields are capped to 6 primary visible columns; secondary detail moves to drawer/expanded detail. |
| UX-10 | `04`, `05`, `11`, `12`, `16` | Permission-changing actions require impact preview and truthful reversal/next-step behavior. |
| UX-11 | `04`, `05`, `12`, `16` | 768px tablet layout is a supported responsive floor with priority columns and full-page detail. |
| UX-12 | `04`, `05`, `12`, `16` | Copy/open share-link flows must not leak authenticated workshop URLs through Referer headers. |
| A11Y-08 | `04`, `05`, `12`, `16` | New Publisher surfaces target WCAG 2.2 AA, including visible focus, target size, and focus-not-obscured checks. |
| A11Y-09 | `04`, `05`, `12`, `16` | Forms and modals use inline errors, an error summary, and focus movement on submit failure. |
| TEST-07 | `04`, `12`, `16` | Add UX task-model validation for find/compare/manage/action roster workflows. |
| TEST-08 | `04`, `12`, `16` | Add permission, 768px, error-summary, and referrer/privacy validation. |

---

## Implementation constraints for future agents

- Do not add a landing page or hero treatment. `/workshop/publisher` opens as a working admin surface.
- Do not introduce a new design system or UI primitives unless an existing primitive cannot satisfy the requirement.
- Keep app/workshop text at the existing compact scale; Publisher is a repeated-use workbench.
- Do not use decorative gradient/orb/glass-card styling to make the page look "premium."
- Do not fake metrics. Counts must come from real publication/recipient/activity data or be absent.
- Do not expose raw share tokens in visible URLs, logs, error copy, or serialized client state.
- Do not use browser QA as a default planning gate. Browser proof becomes necessary when implementation starts and the claim is interaction, routing, focus, or responsive behavior.

---

## Readiness effect

This pass improves the UX/UI plan's specificity, but it does **not** make the feature implementation-ready by itself.

Remaining blockers before implementation:
- Doc 18 critical factual corrections still need to be honored by the implementation agent.
- The D-ARCH-05 through D-ARCH-08, D-SEC-05, and D-OPS-01 owner decisions are now resolved in doc 15 and must be treated as implementation constraints.
- No rendered Publisher UI exists yet, so no visual QA, keyboard transcript, or responsive screenshot can be honestly claimed.

**Updated stop condition for Phase 0.** Before code work starts, the implementation agent must read docs 18 and 19, then update any stale generated work packages that still contradict their corrections.
