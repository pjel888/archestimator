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

## State Matrix Template

Every implementation unit must fill this row shape before coding:

| Surface | Actor | Entry point | Loading | Empty | Partial/stale | Validation error | Pending | Success | Failure | Permission denied | Provider unavailable | Conflict | Destructive confirm | Recovery action | Required copy | A11y behavior | Test proof |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Template row | Who experiences it | Route/component | Skeleton or progress | Helpful empty state | Stale badge or timestamp | Visible field error | Pending affordance | Confirmation | Inline error | Permission/access copy | Degraded mode | Retry/merge/cancel | Alertdialog or typed confirm | Button/link/help | Exact text intent | Focus/live-region/keyboard | Test or proof |

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
| Live regions | Async save failure, destructive result, invite/feedback status, and provider failure must announce via `role=\"alert\"` or appropriate `aria-live`. |
| Touch target | Mobile actions that create, save, retry, undo, share, or confirm destructive changes must be touch-safe and not icon-only without label/tooltip. |
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

## Anti-Slop Design Bar

Implementation must avoid:

- Generic card-heavy dashboards that hide operational priority.
- Decorative gradients or marketing composition inside work surfaces.
- Icon-only destructive or recovery actions.
- Copy that describes how to use the app instead of naming the user's state.
- Dense tables without owner, status, and next-action columns.
- Treating "design-system patterns" as enough without hierarchy, content, and state proof.
