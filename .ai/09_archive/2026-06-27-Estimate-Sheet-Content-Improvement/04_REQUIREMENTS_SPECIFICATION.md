# Requirements Specification

## Functional Requirements

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-ROW-001 | Users can add blank/express rows without blocking the sheet. | Row appears immediately, focus moves into the first meaningful cell, failed persistence leaves a visible draft with Retry/Delete, and no global saving/saved toast appears. |
| FR-ROW-002 | Users can insert library rows into any valid selected node. | Insert uses the history RPC path, preserves node/tab scope, applies trust gates, and rolls back or exposes retry without clobbering concurrent edits. |
| FR-ROW-003 | Users can edit row scalar fields and quantity/add-on fields at spreadsheet speed. | Local value and totals update immediately; stale server responses cannot overwrite newer edits; failures expose row-local Retry/Revert. |
| FR-ROW-004 | Users can delete one or many rows and recover them. | Deletes are optimistic, revision-checked, history-backed, and recoverable through a durable undo/recently-deleted affordance, not only an 8-second toast. |
| FR-ROW-005 | Users can reorder rows within the same node. | Optimistic order updates under 100ms, persists through `move_estimate_row_item_with_history`, survives reload, and keeps drag handles live. |
| FR-ROW-006 | Users can move rows across nodes from content or tree. | Source/target nodes patch locally, persistence returns dense source/target rows, target-area sibling rows remain draggable/reorderable after settle. |
| FR-COMP-001 | Users can replace, clear, detach, promote, and move row components. | Each action has explicit optimistic state, persistence path, expected revision, rollback, failure UI, and proof. |
| FR-TREE-001 | Users can add, rename, delete, bulk delete, reorder, and reparent areas without corrupting content state. | Tree state remains in sync with row cache, destructive actions are recoverable, and tree routine saves do not create global noise. |
| FR-TAB-001 | Users can create, rename, duplicate, reorder, delete, and switch tabs. | Tab actions are accessible by keyboard, expose inline errors, and do not orphan selected nodes or row cache. |
| FR-SHEET-001 | Users can edit sheet-level adjustments with the same reliability as row edits. | Sheet adjustment mutations are revision-checked, idempotent, history-aware or explicitly out of history by decision, and covered by cache freshness tests. |
| FR-RECOVERY-001 | Users can keep working during slow, failed, or offline persistence. | Drafts remain local, queue status is visible within 500ms on failure/degraded state, retries drain in order, and duplicate commits are prevented by stable mutation IDs. |
| FR-ACTION-001 | Every sheet action is tracked in an action/proof matrix. | `18_USER_ACTION_AND_PROOF_MATRIX.md` stays current and every action has owner, persistence, optimistic, failure, undo/retry, and validation columns. |

## UX And Accessibility Requirements

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| UX-STATUS-001 | Routine saves are quiet. | No global toast appears for ordinary saving/saved row or tree actions; one polite live region or local status communicates only meaningful pending/failure states. |
| UX-STATUS-002 | Failures are local and actionable. | Failed actions show the row/node/action, reason, Retry, Revert/Delete when applicable, and do not erase the user draft. |
| UX-DND-001 | Drag/drop has keyboard and touch alternatives. | Row move dialog, tree move dialog, component picker, and non-drag insert paths cover every drag/drop action. |
| UX-FOCUS-001 | Focus is predictable through create, move, undo, dialogs, and virtualization. | Dialogs focus first meaningful control and restore opener; created/moved rows focus the intended cell when visible or after scroll. |
| UX-EMPTY-001 | Blank center states are recoverable. | If no selected node exists, the center surface shows a compact empty state with Select/Create Area actions instead of appearing broken. |
| UX-DESTRUCTIVE-001 | Destructive actions are discoverably recoverable. | Row/tree/tab/component destructive actions use confirmation or durable undo/recent history, not toast-only recovery. |
| UX-STATE-001 | Every estimate-sheet state has a defined user-facing contract. | Loading, empty, success, partial success, error, conflict, permission denied, offline, retry, timeout, and cancellation states appear in `05_UX_UI_ACCESSIBILITY_PLAN.md`, map to requirements/tests, and have no unowned fallback. |
| UX-DENSE-001 | Dense spreadsheet ergonomics remain primary. | Row height, sticky headers, column resizing, truncation, selection, virtualization, overflow, and active-editor exceptions preserve the grid as the dominant first-screen work surface. |
| UX-A11Y-ACTION-001 | Every action has keyboard/focus/screen-reader proof. | Each action class in `18_USER_ACTION_AND_PROOF_MATRIX.md` has planned keyboard path, focus target/restoration, accessible name or live-region behavior, and proof type. |
| UX-RESPONSIVE-001 | Responsive and touch constraints are explicit. | Tablet/mobile behavior defines what remains editable, what becomes dialog/panel-based, and which touch hit areas must remain usable without redesigning the sheet into cards. |
| UX-VISUAL-QA-001 | Visual QA is scoped to real layout/interactions. | Future browser/visual proof checks dense-table readability, layout collision, status occlusion, zoom/reflow, reduced motion, and that the grid remains the primary interface. |

## Data, API, And Security Requirements

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| DATA-IDEMP-001 | Every mutating content action carries a stable mutation ID. | Insert, update, replace, delete, component move, row move, bulk delete, restore, sheet adjustment, tree/tab mutations all pass client-generated IDs or explicit server idempotency keys. |
| DATA-RPC-001 | Every authenticated mutation RPC enforces edit access inside the DB function. | Static migration tests and direct RPC integration tests prove viewer/workspace-only/unrelated users cannot mutate. |
| DATA-RPC-002 | Direct browser table writes are removed or proven unreachable. | `estimateRepository` direct write methods are deleted, gated to test-only, or covered by tests proving production UI cannot call them. |
| DATA-CACHE-001 | Every content mutation finalizes cache consistently. | Shared finalization clears route-context process cache when needed, invalidates correct query keys, avoids route RSC reload for normal edits, and proves freshness after reload/navigation. |
| DATA-SNAPSHOT-001 | Row `sourceSnapshot` persistence is allowlisted and bounded. | Unsafe URLs, signed/private storage paths, unknown keys, huge blobs, and control characters are rejected or stripped before persistence/history. |
| SEC-IMAGE-001 | Private images require resource access. | `/api/projects/images` and row-image paths deny unrelated authenticated users and workspace members without project/estimate access. |
| SEC-HISTORY-001 | Estimate history visibility matches estimate access. | `estimate_sheet_events` and `estimate_sheet_versions` use project/estimate access, not only broad workspace membership. |
| SEC-CSRF-001 | Authenticated mutating routes have explicit same-origin/CSRF posture. | Route handlers document and test expected cookie-auth protections and same-origin requirements. |
| SEC-ACTION-001 | Server Actions are treated as direct-POST attack surfaces. | Every exported estimate mutation action has recorded arguments, validation schema, actor, ownership check, return DTO, cache invalidation, rate/abuse posture, and direct-POST test or rationale. |
| SEC-PUBLIC-001 | Public share, proposal, export, comments, decisions, and activity surfaces are explicitly bounded. | Public/share/export routes return redacted DTOs, no-store or equivalent cache headers, token-scope/revocation behavior, and tests for recipient/public/workspace/unrelated actors. |
| SEC-ABUSE-001 | High-write and high-cost surfaces have abuse controls. | Direct RPC attempts, Server Actions, image routes, retries, bulk delete/restore, tree/tab mutation loops, upload/source-image paths, and export/comment endpoints have rate-limit/backoff/threshold plans. |
| SEC-DTO-001 | Data returned to clients/public routes is minimized. | Server Actions, RPC adapters, history/activity dialogs, private images, proposal/export, and public snapshots return safe DTOs without raw signed URLs, private storage paths, secrets, or unnecessary row metadata. |
| SEC-SECRETS-001 | Secret and environment exposure is inventoried. | Server-only env/service-role/storage-signing/provider tokens are listed as server-only; `NEXT_PUBLIC_*` exposure is justified; no new env var is added without inventory and rollout notes. |

## Performance And Reliability Requirements

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| PERF-ROUTE-001 | Route load budgets remain enforced. | Cold direct p95 <= 3500ms, normal transition p95 <= 1000ms, warm/prefetch p95 <= 750ms, no parent fallback, <= 1 sheet skeleton. |
| PERF-TYPE-001 | Typing and totals are frame-safe. | Row typing event-to-DOM p95 <= 16ms at 500 rows and <= 32ms at 5000 capped rows; totals visible <= 50ms; focus retained. |
| PERF-DND-001 | Drag hover/drop are frame-safe. | Row drag hover p95 <= 16ms at 500 rows and <= 32ms at 5000 rows; drop-to-DOM <= 100ms; persisted ack p95 <= 1500ms. |
| PERF-QUEUE-001 | Queue/degraded state is bounded. | Pending age <= 5s local and <= 15s degraded before escalation; failure state visible <= 500ms; no stale success overwrites newer edit. |
| PERF-DOM-001 | Large sheets stay virtualized. | Initial visible row mount is viewport + overscan; the 5000-row cap never mounts all rows except explicitly justified active editor edge cases with a separate mitigation. |
| REL-OFFLINE-001 | Offline/degraded behavior is proven. | Offline state appears <= 500ms, local draft persists, reconnect/retry drains in order, and duplicate success is prevented. |

## Documentation Requirements

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| DOC-SPEC-001 | Stale estimate-sheet specs are reconciled. | `.ai/06_specs/current-project-estimates-component-library-spec.md`, `mvp-ux-flow.md`, and `live-project-estimate-bootstrap.md` stop contradicting live route/data/node behavior. |
| DOC-FLAG-001 | Feature flags are documented. | Any mutation-queue flag is added to `.ai/00_corpus/feature-flag-and-env-inventory.md` with default, owner, rollout, rollback. |
| DOC-EVIDENCE-001 | Evidence gaps are explicit. | Final implementation report distinguishes local, browser, provider, production, and manual proof. |

## Detailed Requirement Register

The table below is the execution schema for implementation handoff. The "Owner" column names the future implementation lane responsible for closing the requirement; it is not a person assignment.

| ID | Rationale And Source | Priority | Owner | Dependencies | Validation Method | Affected Code Areas | Principal Risks | Status |
|---|---|---:|---|---|---|---|---|---|
| FR-ROW-001 | User complaint: routine row create must not block work or produce noisy save toasts. | P0 | Frontend mutation lane | Quiet status model, mutation coordinator | DOM insert test, failure retry test, target-route smoke | `drop-zones.tsx`, `use-estimate-row-handlers.ts`, `use-estimate-row-mutations.ts` | Draft loss, duplicate insert, focus loss | Planned |
| FR-ROW-002 | Library row insert is a core estimating path and must preserve selected area context. | P0 | Frontend/data lane | RPC edit checks, trust gates, cache finalization | Server-action tests, reload proof | `use-estimate-row-handlers.ts`, `actions.ts`, library insertion helpers | Wrong node, stale cache, untrusted source payload | Planned |
| FR-ROW-003 | Spreadsheet-speed row editing is the daily MVP workflow. | P0 | Frontend mutation lane | Scoped pending state, stale response guard | Row edit DOM tests, stale success tests, typing budget | `row-table.tsx`, `cells.tsx`, row handlers, row mutations | Newer edits overwritten, total drift, lag | Planned |
| FR-ROW-004 | Delete and restore cannot rely on an ephemeral toast for mission-critical data. | P0 | Frontend/recovery lane | Durable undo or recent-deleted surface, history RPCs | Delete/restore tests, reload proof | row handlers, activity history, restore actions/RPCs | Irrecoverable deletes, duplicate restore | Planned |
| FR-ROW-005 | Same-node reorder must remain fast and persistent. | P0 | Drag/drop lane | Row movement coordinator, dense order reconciliation | Unit reorder test, browser row reorder e2e | `row-table.tsx`, `estimate-row-tree-move.ts`, `actions.ts` | Broken order, stale branch, handle freeze | Planned |
| FR-ROW-006 | Directly addresses reported content-to-tree move regression. | P0 | Drag/drop lane | Target index revalidation, source/target cache patch, no silent no-op | Regression e2e: content-to-tree move then target reorder | `EstimateSheetTree.tsx`, `EstimateSheetContent.tsx`, row handlers, row mutations | Target branch non-draggable, source/target divergence | Planned |
| FR-COMP-001 | Component CRUD changes affect pricing, trust, images, and history. | P0 | Component mutation lane | Stable mutation IDs, sourceSnapshot allowlist, row/component stale checks | Component replace/clear/detach/promote/move tests | `cells.tsx`, row handlers, row mutations, `actions.ts` | Wrong component, unsafe snapshot, stale row totals | Planned |
| FR-TREE-001 | Tree/area state owns the context for sheet content. | P0 | Tree/content sync lane | Tree sync signature includes row order/identity where needed; local status | Tree CRUD/reorder e2e and reload proof | `EstimateSheetTree.tsx`, tree actions/RPCs | Orphaned rows, stale selected node, cache overwrite | Planned |
| FR-TAB-001 | Tabs scope estimates and selected areas; tab mistakes can hide work. | P1 | Tab/workspace lane | Tab cache finalization, recovery behavior | Tab CRUD/reorder tests and reload proof | `EstimateTabStrip.tsx`, tab actions | Orphaned selected node, lost tab content | Planned |
| FR-SHEET-001 | Sheet adjustments affect totals and currently have direct write concerns. | P0 | Data/API lane | RPC or documented history contract, revision checks | Contract tests, cache freshness tests | `actions.ts`, sheet adjustment persistence | Silent total drift, missing history, stale totals | Planned |
| FR-RECOVERY-001 | Non-blocking UX requires recovery for slow, failed, and offline persistence. | P0 | Mutation coordinator lane | Queue/status model, retry/revert UI, idempotency | Offline/degraded e2e, queue age tests | coordinator hook/store, status UI, row/tree handlers | Lost drafts, duplicate commits, unbounded queue | Planned |
| FR-ACTION-001 | User required proof matrix for all actions. | P0 | Planning/QA lane | `18_USER_ACTION_AND_PROOF_MATRIX.md`, traceability upkeep | Matrix review, verifier signoff | plan docs and future implementation report | Missing action class, unsupported readiness claim | Planned |
| UX-STATUS-001 | User explicitly rejected blocking save toasts for routine actions. | P0 | UX/frontend lane | Quiet local status, polite live region | DOM test asserting no routine saving/saved toast | `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx` | Alert fatigue, perceived blocking | Planned |
| UX-STATUS-002 | Failures must be visible without interrupting unrelated work. | P0 | UX/frontend lane | Local failure state and action-specific retry/revert | Failure-state DOM/a11y tests | status UI, coordinator, handlers | Hidden failure, unrecoverable draft | Planned |
| UX-DND-001 | Drag-only paths exclude keyboard/touch and make recovery harder. | P0 | UX/drag-drop lane | Move dialogs, picker alternatives, non-drag insert paths | Keyboard/touch proof for tab, tree, row, component, library/template DnD equivalents | `EstimateTabStrip.tsx`, `EstimateSheetTree.tsx`, `row-table.tsx`, Move row dialog, component picker, library/template insertion | Inaccessible workflow, drag-state dead end | Planned |
| UX-FOCUS-001 | Fast editing depends on predictable focus after create/move/undo/dialogs. | P1 | UX/frontend lane | Focus helpers and virtualization-aware focus restoration | Focus tests and manual smoke | dialogs, row focus helpers, virtualized table | Lost keyboard flow, wrong row edited | Planned |
| UX-EMPTY-001 | Blank selected-node state currently risks looking broken. | P1 | UX/frontend lane | Selected-node recovery actions | Empty-state DOM test | `EstimateSheetContent.tsx` center pane | Dead-end workflow | Planned |
| UX-DESTRUCTIVE-001 | Destructive row/tree/tab/component actions need durable recovery. | P0 | Recovery lane | Activity history or recently-deleted affordance | Durable undo tests | row/tree/tab/component surfaces | Data loss, toast timeout | Planned |
| UX-STATE-001 | Continuation UX review found missing state coverage for partial success, permission, conflict, offline, retry, timeout, and cancellation. | P0 | UX/frontend + QA lane | State matrix in `05`, proof contracts in `12` and `18` | DOM/a11y tests per state and scenario review | status UI, coordinator, dialogs, route/empty states | Unhandled state, ambiguous recovery | Planned |
| UX-DENSE-001 | `DESIGN.md` says operational tools should remain dense, organized, and scanning-first. | P0 | UX/frontend lane | Existing table primitives and virtualization | Dense layout DOM/perf and visual QA | row table, header, column preferences, filters | Card drift, text overlap, unusable grid | Planned |
| UX-A11Y-ACTION-001 | Drag/drop and destructive actions need action-level keyboard/focus/SR proof, not a generic accessibility note. | P0 | UX/a11y + QA lane | Action proof addendum in `18` | Keyboard/focus/live-region tests per action class | all interactive sheet controls | Inaccessible operation, focus loss | Planned |
| UX-RESPONSIVE-001 | Touch users need non-drag alternatives and usable hit areas without a mobile redesign. | P1 | UX/frontend lane | Responsive/touch behavior matrix | Touch/manual proof where browser-only | row controls, dialogs, tree, tab strip | Touch-only dead end | Planned |
| UX-VISUAL-QA-001 | Visual defects in a dense sheet can hide status, collide with text, or break scanning. | P1 | UX/QA lane | Scoped browser/visual proof only where layout risk requires it | Visual QA artifacts or static proof replacement | sheet layout, status UI, dialogs | Occluded controls, unreadable states | Planned |
| DATA-IDEMP-001 | Queue/retry semantics need duplicate protection. | P0 | Data/API lane | Stable mutation IDs and uniqueness policy | Idempotency tests and duplicate audit | hooks, server actions, RPCs, events | Duplicate rows/events, non-deterministic retries | Planned |
| DATA-RPC-001 | Security reviewer found DB RPC edit checks are release blockers. | P0 | Data/security lane | Supabase migration tests, direct RPC tests | Unauthorized direct RPC integration tests | mutation RPCs, migrations/RLS | Privilege bypass | Planned |
| DATA-RPC-002 | Legacy browser direct writes bypass the intended server-action/history path. | P0 | Data/API lane | Import guard or removal/gating | Reachability/import tests | `estimate-repository.ts` | Client-side bypass, missing history | Planned |
| DATA-CACHE-001 | Current mutation finalization is inconsistent across actions. | P0 | Cache/data lane | Shared finalization helper and route-context cache rules | Mutation + reload/navigation freshness tests | `actions.ts`, `use-estimate-row-mutations.ts`, workspace repository | Stale rows resurrect, route cache misses | Planned |
| DATA-SNAPSHOT-001 | Component/source snapshots can carry unsafe or bloated payloads. | P0 | Data/security lane | Allowlist and size limits | Malicious snapshot tests | `actions.ts`, snapshot/image utilities | Private URL leakage, huge history rows | Planned |
| SEC-IMAGE-001 | Private images must not be available to unrelated authenticated users. | P0 | Security lane | Project/estimate access checks | Unauthorized image-route tests | `/api/projects/images`, row image routes | Media leakage | Planned |
| SEC-HISTORY-001 | History/event visibility must match estimate access. | P0 | Security/data lane | RLS policies and read tests | RLS integration tests | `estimate_sheet_events`, `estimate_sheet_versions` | Broad workspace disclosure | Planned |
| SEC-CSRF-001 | Cookie-authenticated mutation routes need explicit same-origin posture. | P1 | Security lane | Route handler review and tests | CSRF/same-origin route tests | mutating API routes/actions | Cross-site mutation risk | Planned |
| SEC-ACTION-001 | Next Server Functions are reachable through direct POST, so app UI-only checks are insufficient. | P0 | Security/data lane | Attack surface inventory and server-action contract tests | Direct-POST/server-action tests | `src/lib/estimates/actions.ts`, mutation callers | Privilege bypass, malformed mutation | Planned |
| SEC-PUBLIC-001 | Proposal/share/export surfaces can expose private estimating data outside authenticated app context. | P0 | Security/product lane | Public DTO redaction, token/revocation, no-store headers | Route handler tests for share/export/comment/activity | `/share`, `/api/share`, proposal/export routes, publication snapshots | Client data leak, stale token access | Planned |
| SEC-ABUSE-001 | Mutation/export/upload loops can exhaust quota or mask brute-force direct RPC attempts. | P1 | Security/ops lane | Rate limits, backoff, lockout/alert thresholds | Abuse/rate-limit tests and metrics | Server Actions, route handlers, RPCs, uploads, exports | Cost spike, noisy provider failures | Planned |
| SEC-DTO-001 | DTO over-return can leak source metadata, signed URLs, or history fields to client/public contexts. | P0 | Security/data lane | Safe DTO allowlists per surface | Snapshot/export/history DTO contract tests | action adapters, public snapshot/export models, activity dialogs | Private metadata exposure | Planned |
| SEC-SECRETS-001 | Env/service credentials must stay server-only during Server Action/Route Handler hardening. | P1 | Security/ops lane | Env inventory and server-only boundary review | Env inventory review, bundle/source proof | `next.config.ts`, env inventory, server-only modules | Secret exposure | Planned |
| PERF-ROUTE-001 | Route readiness has existing budgets that must not regress. | P0 | Performance lane | Route harness and readiness script | Authenticated route benchmark output | route transition scripts/e2e | Slow MVP entry, parent fallback | Planned |
| PERF-TYPE-001 | Typing must feel spreadsheet-fast at realistic sheet sizes. | P0 | Performance/frontend lane | Render probes and fixture sizes | Typing/totals budget tests | row table, cells, totals | Keystroke lag, total lag | Planned |
| PERF-DND-001 | Drag/drop must remain frame-safe and settle quickly. | P0 | Performance/drag-drop lane | Browser timing spec | DnD hover/drop budgets | row table, tree DnD, coordinator | Janky drag, dropped move | Planned |
| PERF-QUEUE-001 | Non-blocking persistence still needs bounded failure/degraded feedback. | P0 | Reliability lane | Queue age thresholds and escalation | Queue budget tests | coordinator/status UI | Invisible stuck save, user distrust | Planned |
| PERF-DOM-001 | Large sheets must remain virtualized. | P1 | Performance/frontend lane | Mount-count assertions | Mounted row count and scroll tests | `row-table.tsx` virtualization | Full DOM mount, scroll lag | Planned |
| REL-OFFLINE-001 | Offline/degraded behavior is part of the reliability claim. | P0 | Reliability lane | Local draft persistence and retry drain | Offline e2e | coordinator, status UI, persistence actions | Lost offline work, duplicate drain | Planned |
| DOC-SPEC-001 | Existing specs can mislead future agents if not reconciled. | P1 | Documentation lane | Source-linked doc update | Doc review | `.ai/06_specs/*` | Reimplementation from stale docs | Planned |
| DOC-FLAG-001 | Broad coordinator changes need controlled rollout and rollback. | P1 | Documentation/ops lane | Feature flag inventory | Inventory review | `.ai/00_corpus/feature-flag-and-env-inventory.md` | Untracked flag behavior | Planned |
| DOC-EVIDENCE-001 | Final reports must separate local/browser/provider/production proof. | P0 | Verification lane | Evidence ledger and readiness review | Final verifier signoff | implementation log, current-state update | Unsupported completion claim | Planned |
