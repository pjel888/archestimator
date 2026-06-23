# UX State, Accessibility, And Content Contracts

Date: 2026-06-22

This document defines the UX/UI implementation contract missing from the audit inventory.

## Information Architecture Contract

| Surface | Primary actor | First task | Required navigation behavior |
|---|---|---|---|
| Public site | Visitor | Understand beta positioning and reach login/contact. | Copy must separate implemented, beta, and planned capability; CTA must not imply unavailable general availability. |
| Auth and beta gates | Beta user or invitee | Sign in, recover from denied/revoked/broken invite state. | User must always see a named state, next action, and support path. |
| Workshop shell | Primary App User | Reach projects, recent work, favorites, settings. | Navigation must preserve context and make unavailable permission-limited tools explainable. |
| Project dashboard | PM/estimator/owner | Assess project status and next action. | Summary cards must show loading/stale/empty states and avoid silent stale values. |
| Estimate sheet | Estimator | Edit rows, costs, library inserts, tree order. | Save, pending, rollback, invalid input, stale source, keyboard path, and mobile interruption must be explicit. |
| Library/cost | Estimator/curator | Choose trusted components/costs. | Source freshness, attachment currentness, and accepted-cost status must be visible before irreversible insert/replace. |
| Publication/share | Owner/recipient | Share or review package and recover from link/session/action failures. | Recipient must understand what the package is, what action means, and how to recover. |
| Operations/support | Operator | Prove readiness or repair user issue. | Each duty needs owner, proof artifact, pass/fail/blocked state, and escalation path. |

## State Matrix

Every implementation unit must fill this row shape before coding. The four P0 surfaces below are filled against the enumerated states in `## Priority State Contracts`. P2 surfaces use the template row at the bottom.

| Surface | Actor | Entry point | Loading | Empty | Partial/stale | Validation error | Pending | Success | Failure | Permission denied | Provider unavailable | Conflict | Destructive confirm | Recovery action | Required copy | A11y behavior | Test proof |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Estimate sheet | Estimator | `src/app/workshop/projects/[projectId]/estimates/[nodeId]` | Skeleton or progress; leaf `loading.tsx` to avoid list-skeleton flash | Helpful empty state ("No line items yet — add the first") | Stale source badge with refresh/compare | Fixed toast plus non-shifting field/row marker; invalid numeric input blocks save | "Saving..." affordance; save pending disables duplicate submit | Fixed confirmation toast; undo available announces | Fixed toast with retry/rollback; save failed surfaces rollback without layout shift | n/a (workshop-authed) | n/a (no provider on core path) | Optimistic/merge: drag active + concurrent edit warning | Alertdialog only if destructive | Button/link/help | State name + next action; no generic "error" | Focus remains stable or returns to existing control; toast announces assertively; keyboard reorder via arrow keys | `TV-ESTIMATE-SHEET`; perf plan pack `.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Perf` |
| Auth/beta/terms | Beta user or invitee | Auth + terms gate routes | Spinner on auth callback | n/a | n/a | Fixed toast for terms persistence failure; stable form affordance only | Pending during sign-in | Signed in confirmation toast/status | Fixed toast | Signed in denied / revoked / permission forbidden copy | n/a | Unsafe `next` dropped (no silent redirect) | n/a | Retry / contact support | Named state + next action + support path | Focus to primary action on each persistent state; transient status via toast/live region | `TV-AUTH`; `TV-INVITE` |
| Share recipient | Client / Recipient | Shared-link recipient route | Skeleton then first-open comprehension content | n/a | n/a | Fixed toast plus stable password-field marker | Lockout timer countdown | Decision/comment accepted toast | Fixed toast (asset/comment/decision failed) | Expired/revoked link copy | Asset failed degrades gracefully | Decision conflict copy | n/a | Retry / unlock / request-new-link / contact owner | What is being reviewed + what action means + who to contact | First-open focus to comprehension block; transient failure via toast alert; print mode preserves hierarchy | `TV-SHARE-RECIPIENT` |
| Project details | PM/estimator/owner | Project details modal / route | Skeleton preserving layout | Empty project copy | Stale badge | Fixed toast plus stable field marker | Save pending / upload pending | Save / group delete success toast | Fixed toast | n/a | n/a | Clean vs dirty on Escape/close | Destructive confirm alertdialog for delete | Button/link/help | State name + what changed + recovery | Focus to confirm/cancel in alertdialog; backdrop/Escape attempted must surface dirty confirm | `TV-PROJECT-DASHBOARD` |
| Template row | Who experiences it | Route/component | Skeleton or progress | Helpful empty state | Stale badge or timestamp | Fixed toast + stable field marker | Pending affordance | Fixed toast confirmation | Fixed toast | Permission/access copy | Degraded mode | Retry/merge/cancel | Alertdialog or typed confirm | Button/link/help | Exact text intent | Focus/live-region/keyboard/no-shift | Test or proof |

## No-Shift Toast Feedback Contract

Transient feedback is toast-only for closed beta unless a newer decision explicitly
overrides this contract. Validation failures, missing required field values,
save failures, retryable provider failures, quota/rate-limit failures, recovery
failures, async action failures, and success confirmations must use the fixed
toast viewport with scoped IDs where repeated actions can overwrite each other.

Do not add reflowing inline error rows, transient banners, or newly inserted
error text that moves surrounding content. A field/control may use non-shifting
state (`aria-invalid`, border color, icon, stable helper slot, focus retention)
only when space is already reserved or the style change does not resize the
layout. Destructive confirmations still use modal `alertdialog` semantics.

## Priority State Contracts

| Surface | Required states before implementation-ready |
|---|---|
| Auth/beta/terms | Signed out, signed in denied, revoked, pending, unsafe `next` dropped, terms persistence failed, broken invite, wrong account, missing workspace, permission forbidden. |
| Project details | Clean, dirty, upload pending, save pending, save failed, backdrop/Escape/close attempted, destructive action pending, group delete success/failure. |
| Estimate sheet | Initial load, route loading, empty estimate, invalid numeric input, save pending, save failed/rollback, stale library source, malformed historical snapshot, drag active, undo available, keyboard reorder. |
| Maps/location | Provider missing, script failed, quota/billing failed, invalid coordinates, address-only edit, saved fallback. |
| Share recipient | First open, password required, password failed, lockout timer, expired/revoked link, recipient session lost, unsubscribe invalid, asset failed, comment failed, decision conflict, print mode. |
| AI | Feature disabled, quota exhausted, provider unavailable, draft expired, apply pending, apply failed, regenerate available, human review required. |
| Feedback/support | Submit pending, persistence failed, fallback email prefilled, triage list empty, older than latest 50, search/pagination, repair action audited. |
| Operations | Proof not run, proof passed, proof failed, proof blocked by credential/provider, owner missing, manual proof required, stale artifact. |

## Responsive And Accessibility Requirements

| Dimension | Requirement |
|---|---|
| Mobile | Estimate and share recipient flows must not depend on hover, wide tables, or tiny icon-only actions for core tasks. |
| Tablet | Project dashboard, estimate sheet, and share package must preserve primary actions without nested scroll traps. |
| Desktop | Dense operational screens can use tables, but every destructive or provider state must remain scannable. |
| Keyboard | Every drag/drop, modal, tab, action menu, and inline edit path needs keyboard equivalent or explicit non-support decision. |
| Focus | Modal open/close, failed save, route error, and form validation must place focus predictably. |
| Live regions | Async save failure, destructive result, invite/feedback status, provider failure, quota/rate-limit failure, and validation failure must announce through the fixed toast live region (`role="alert"` for failure, status/polite for non-urgent state) or an equivalent non-shifting live region. |
| Touch target | Mobile actions that create, save, retry, undo, share, or confirm destructive changes must meet a **44x44px minimum** (WCAG 2.2 SC 2.5.8 Target Size, Minimum) and not be icon-only without label/tooltip. |
| Modal focus containment | Every modal — including dirty-close confirm (`UX-007`) and destructive alertdialog (`UX-008`) — MUST implement a focus-trap (focusable cycle stays inside the dialog), `aria-modal="true"`, `role="dialog"` (or `role="alertdialog"` for destructive), and inert/suppressed background via `inert` on the background tree. Focus MUST move to the primary action or the confirm button on open and return to the trigger on close. Esc must NOT silently bypass a dirty/destructive confirm. This makes `UX-007` (dirty close) and `UX-008` (destructive alertdialog) focus behavior testable rather than implied. |
| Print | Recipient print packet must preserve project identity, totals, decisions, headings, dates, and owner/contact context. |
| Reduced data/provider failure | Maps, AI, export, and collaboration must provide useful degraded content without provider success. |

## Content Contract

| Situation | Copy must name | Forbidden copy pattern |
|---|---|---|
| Denied beta access | Current access state and next action. | Generic "something went wrong". |
| Terms persistence failure | That acceptance was not saved, retry action, support path. | Silent loop back to terms. |
| Unsafe redirect dropped | Why the user landed somewhere else. | Pretending the requested page loaded. |
| Broken invite | Token state, account mismatch if known, repair path. | "Invalid invite" with no owner/support action. |
| Missing workspace/permission | Whether the user lacks workspace, setup, role, or permission. | One generic workspace save error. |
| Destructive action | What will be deleted/archived, what remains, whether recovery exists. | Icon-only or neutral confirm. |
| Stale source/cost | Source age/status and compare/refresh choice. | Using stale data without warning. |
| Provider outage | Which provider/action failed and what remains possible. | Raw provider errors or blank maps/panels. |
| AI unavailable | Disabled/quota/provider/draft state and recovery. | Disabled button with no reason. |
| Recipient first open | What is being reviewed, what decision/comment means, who to contact. | Internal estimator jargon. |
| Recipient recovery | Retry, unlock, request-new-link, or contact owner. | Dead-end expired/revoked/failed states. |
| Support repair | Diagnosis, action taken, audit note, user-facing answer. | Ad hoc database fix with no record. |

## Visual QA Contract

Browser or screenshot proof is required only when static tests cannot prove the claim. Use visual proof for:

- Recipient first-open comprehension and print layout.
- Estimate sheet mobile/interrupted edit flow.
- Project dashboard readiness scan.
- Proposal export preview hierarchy.
- Contractor/builder and field-operator handoff package across Primary App User, Project Collaborator, or Shared-Link Recipient paths if built.
- Operator/provider readiness dashboard if built.

Static/component proof is sufficient for:

- Copy contracts.
- Alertdialog semantics.
- CSV/schema validation.
- Route path existence.
- Pure provider readiness scripts.
- Non-visual data mapping.

## WCAG 2.2 AA Conformance Target

The conformance target is **WCAG 2.2 Level AA for all workshop surfaces and all share-recipient surfaces**. This packet does not claim AA is achieved; it claims AA is the binding target and enumerates the testable criteria below (contrast, focus, keyboard, live-region, 44x44px target size, focus-trap). The cross-cutting accessibility gate is `TV-A11Y` (see `06-verification-matrix-and-proof-runbook.md`): contrast/focus/keyboard/live-region assertions must pass for every P0 surface before its row can be promoted in `canonical-feature-status.csv`. This supersedes any earlier implied "accessibility is covered by component tests" posture.

## Color And Contrast Contract

The project has a known design reality: **tertiary `#7F7F7F` FAILS WCAG AA** against the canvas. Load-bearing and meta text MUST use **secondary `#5D5D5D`** instead.

- Forbidden for load-bearing/meta text: `#7F7F7F` (tertiary).
- Required for meta text: `#5D5D5D` (secondary).
- `#7F7F7F` is currently live in `src/app/globals.css` and 6 component/lib/story files (verified 2026-06-22 by `rg -il '7[fF]7[fF]7[fF]' src/`): `ClaimRow.tsx`, `MaturityTag.tsx`, `StatusPill.tsx`, `ResizableSidePanel.tsx`, `project-location-map-style.ts`, `foundations.stories.tsx` — 7 total including `globals.css`. Treat any other site as TODO-verify before claiming it is clean.
- Enforcement: `scripts/enforce-app-design-system.mjs` is the design-system enforcement script, and the `TV-A11Y` gate asserts contrast. A passing `TV-A11Y` run (or the enforcement script) is required before any row claiming AA can be promoted.
- This contract is binding regardless of `DESIGN.md` guidance: per CLAUDE.md, `DESIGN.md` is an alpha-stage guide, not law, and known AA failures are not waived by it.

## Responsive Breakpoints And Test Contract

The project's actual breakpoints and traps (cite from the workshop dashboard responsive work and memory, not re-derived):

- Reference desktop size: **1512x982** (the canonical full-size dashboard layout size).
- Workshop dashboard grid progression: **7-col -> 2-up -> 1-col** as the viewport narrows.
- Known trap 1: dashboard rows are NOT reset at **<=1023px**, which can leave phantom empty bands if the layout's row template is not re-declared at the breakpoint.
- Known trap 2: specificity traps where nested selectors (e.g. `.dashboard-imageband > .iband-templates`) beat the tile reset, causing white-out or missing resets.
- Mobile minimum widths: define "mobile" as **<=640px** (single column) for the estimate sheet and share-recipient surfaces.

Test command (makes "mobile" and "no hover dependency" testable rather than implied):

```
bun run test:e2e -- --project=mobile-safari e2e/estimate-tabs.spec.ts e2e/shared-link-receiver.spec.ts  # 'mobile-safari' is the configured Playwright mobile project (verified in playwright.config.ts, 2026-06-22)
# Plus a viewport-resize smoke for the 1512 -> 1023 -> 640 transition:
#   load dashboard at 1512x982, resize to 1023, assert no phantom bands;
#   resize to 640, assert estimate + share-recipient primary actions are reachable
#   without hover and meet the 44x44px target size.
```

Confirmed: the `mobile-safari` Playwright project exists in `playwright.config.ts` (7 projects total; verified 2026-06-22). Residual: the explicit 1512→1023→640 viewport-resize smoke spec is the intended additional shape and may not exist as a standalone spec yet — add it before claiming full responsive no-regression.

## i18n Deferral

Closed beta is **English-only by decision**: see `DEC-UX-I18N` in `09-decision-ledger.md`. No localization/i18n work is in the closed-beta execution slice; copy contracts and test fixtures may assume English copy. This deferral is itself a named residual — i18n is a runtime/product decision deferred past closed beta, not an execution proof this packet can satisfy.

## Cross-References To Verification IDs

- `TV-A11Y` — cross-cutting accessibility (contrast, focus, keyboard, live-region) gate for all P0 surfaces. Defined in `06-verification-matrix-and-proof-runbook.md`.
- `TV-ACCESS-PATH-CONTRACT` — persona/access-path authority gate: asserts that the 5 access paths (Anonymous Visitor, Primary App User, Project Collaborator, Shared-Link Recipient, Off-Platform Source Contact) resolve to the correct authority source in `10-access-path-and-persona-taxonomy.md`. Defined in `06-verification-matrix-and-proof-runbook.md`.

## Anti-Slop Design Bar

Implementation must avoid:

- Generic card-heavy dashboards that hide operational priority.
- Decorative gradients or marketing composition inside work surfaces.
- Icon-only destructive or recovery actions.
- Copy that describes how to use the app instead of naming the user's state.
- Dense tables without owner, status, and next-action columns.
- Treating "design-system patterns" as enough without hierarchy, content, and state proof.
