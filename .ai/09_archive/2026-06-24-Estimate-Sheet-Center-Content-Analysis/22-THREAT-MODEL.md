# 22 — Threat Model: Estimate Sheet Center Content

**Date:** 2026-06-25  
**Scope:** Estimate Sheet center-content flows audited in this pack. Left/right sidebars are in scope only where they inject data or events into the center sheet.

## Security objective

Protect estimate integrity and workspace boundaries while preserving fast spreadsheet-style editing. The main failure class is not classic external attack; it is trusted-user or in-page input causing stale, partial, or malformed mutations that make costs wrong or unrecoverable.

## Assets

| Asset | Why it matters |
|---|---|
| Estimate row items, quantities, costs, contingencies, misc costs | Direct proposal/cost output. |
| Estimate tree/tab structure | Determines where rows belong and what exports include. |
| Cost-library source snapshots and link state | Controls whether library pricing is trusted/current. |
| `estimate_sheet_events` history | Audit trail, activity UI, idempotency/correlation evidence. |
| User/workspace/project/estimate authorization | Prevents cross-scope reads/writes. |
| Proposal preview/export state | User-facing financial output. |
| Local UI state: editable rows, selections, column widths | Can mislead users even when DB state is safe. |

## Actors

| Actor | Capability |
|---|---|
| Authenticated estimator/editor | Legitimate row edits, inserts, deletes, library/promote/detach flows. |
| Read-only collaborator/approver | Can view; must not initiate local mutation affordances that imply edit rights. |
| Another workspace member | Can concurrently edit/archive source items or same estimate rows. |
| Compromised member session or malicious in-page script/browser extension | Can dispatch custom events and tamper with drag payloads inside the browser context. |
| Network/runtime failure | Can interrupt multi-row flows and reorder responses. |

## Trust boundaries

1. **Browser UI -> server action:** all client payloads are untrusted. Server actions must re-check project/estimate/workspace scope and edit rights.
2. **Server action -> Postgres RPC:** source-trust checks that happen in TypeScript have a TOCTOU window unless repeated inside the RPC transaction.
3. **Drag/custom-event payload -> center sheet:** library-item detail must be parsed and shape-validated before local optimistic state changes.
4. **Optimistic local tree -> canonical DB tree:** local state can diverge from DB until reconciliation/refetch.
5. **Activity history event types -> UI consumers:** `event_type` is text; adding `row_moved` requires UI consumer support, not a DB enum migration.
6. **Local storage -> app state:** column-width data can be corrupted or stale and must fail soft.

## Threats and decisions

| ID | Threat | Control / decision | Residual risk |
|---|---|---|---|
| T1 | Move-component partially persists target/source rows | M-1 atomic `move_estimate_row_component` RPC, both revisions must match, one `row_moved` event | Implementation must prove rollback/refetch behavior under network failure. |
| T2 | Bulk delete partially persists N independent deletes | RD-1 all-or-nothing M-3 RPC; any failed row aborts all deletes | Long selections need row-count cap and clear failure copy. |
| T3 | Project-source full-tree response hides newer optimistic edits | M-2 revision gate + refetch on mismatch | Multi-client same-row cases still need tests. |
| T4 | Malformed/tampered drag payload throws or starts unsafe workflow | ESC-P2-26/M-6 guarded parser with size/shape checks and telemetry | Browser extensions/in-page scripts remain capable of attempted abuse. |
| T5 | `archestimator:add-library-item` event injects unvalidated detail | ESC-P1-09/M-6b uses same validation path before trust gate/local mutation | Server authz still handles persistence defense. |
| T6 | Stale library source passes TS-side check then changes before RPC commit | Prefer moving source freshness check into new RPC transactions; otherwise document TOCTOU residual | Existing replace/insert paths may keep small TOCTOU window until hardened. |
| T7 | Read-only user can initiate optimistic local edits before server rejection | M-5 disables/gates controls, drag source, and drops based on `canEditEstimate` | Server remains source of truth. |
| T8 | New `row_moved` event is written but invisible in activity UI | M-1 updates activity filters, labels, component snapshots, accessibility labels | Unknown event types should still degrade gracefully. |
| T9 | Local column-width JSON is corrupt/stale | Q23 beta decision keeps local storage but requires parse hardening and reset/discoverability | Account sync deferred until after 1k users. |
| T10 | Mobile users attempt unsupported editing/touch drag | Q33 read-only fallback under 768px | Full mobile editing is separate roadmap work. |
| T11 | Accessibility state changes are not perceivable | Q34 WCAG 2.2 AA target; ESC-P1-08 bundle for live regions, semantics, focus | Manual SR proof required before release claim. |
| T12 | Production lacks visibility into integrity failures | M-0T telemetry sink for move/bulk/project-source/trust-gate/payload outcomes | Sink availability and payload redaction must be verified during implementation. |

## Required implementation guardrails

- New RPCs must enforce workspace/estimate edit authorization server-side and inside the transaction boundary where practical.
- M-1/M-3 must cap payload/row counts and return structured errors that do not expose unrelated workspace data.
- Telemetry must avoid raw row payloads, cost-library snapshots, secrets, and PII beyond stable event metadata needed for debugging.
- Activity/history events must be written in the same transaction as their row mutation.
- UI optimistic updates must have a rollback or refetch path for every failure branch.

## Out of scope

- Full right-sidebar threat model.
- Public shared-link access and proposal-publication threat model.
- General account/session threat model.
- Mobile editing/touch-drag threat model beyond the v1 read-only fallback.

## Verification hooks

- M-1: atomicity tests, reverse-response-order test, activity history `row_moved` rendering test.
- M-3: mixed-revision all-or-nothing test, row-count cap test, telemetry assertion.
- M-6/M-6b: malformed/oversized/cross-scope payload tests and rejected-event telemetry assertion.
- M-5: read-only no-mutation-affordance test.
- M-0T: telemetry sink smoke test with redacted payload assertions.
