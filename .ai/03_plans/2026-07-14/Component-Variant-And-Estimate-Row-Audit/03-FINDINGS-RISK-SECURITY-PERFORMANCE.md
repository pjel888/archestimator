# Findings, Risk, Security, And Performance

## Severity Model

- **P0** — first-user flow cannot complete securely or an authorization boundary is bypassed.
- **P1** — silent data/cost corruption, partial persistence, wrong formal decision, or materially false issued output.
- **P2** — recoverable correctness, trust, latency, or workflow defect.
- **P3** — polish/operability issue that should not delay a safe first-user path.

## P0 Findings

### `F-001` — Recipient invitations are not deliverable end to end

**Evidence:** `src/lib/client-portal/recipient-service.ts:159`, `src/lib/client-portal/recipient-service.ts:196`, `src/components/workshop/publisher/ClientPortalRecipientManager.tsx:40`, `src/lib/cloudflare/client-portal-notification-queue.ts:34`.

The bootstrap secret is returned once, discarded by the owner UI, omitted from the notification payload/body, and paired with an outbox ID format rejected by the queue producer. Personalized access therefore cannot reliably begin.

**Risk:** `RISK-007`. **Owner:** `UNIT-008`.

### `F-002` — Verification does not make a recipient mutation-eligible

**Evidence:** `src/lib/client-portal/public-session-handler.ts:38`, `src/lib/client-portal/policy.ts:125`, `src/lib/client-portal/policy.ts:226`.

Redemption writes a session cookie but does not atomically update `verification_state`. Thread and decision capabilities that require verified recipients remain unavailable.

**Risk:** `RISK-007`. **Owner:** `UNIT-008`.

### `F-003` — Password rotation does not revoke personalized sessions

**Evidence:** `src/lib/publication/security.ts:423`, `src/lib/client-portal/public-repository.ts:146`, `src/lib/client-portal/public-route-handlers.ts:62`.

Recipient cookies bind recipient credential version but not portal access-credential version. Manifest/section routes apply password enforcement only to anonymous actors. A session created before password enable/rotation can continue reading issued content.

**Risk:** `RISK-008`. **Owner:** `UNIT-008`.

### `F-004` — Hidden-section discussions can be listed/read

**Evidence:** `src/lib/client-portal/thread-repository.ts:257`, `src/lib/client-portal/thread-repository.ts:289`.

Thread listing checks portal-level capability and returns all client threads; message read does not reconstruct and authorize the issue section. Client-safe message bodies and target metadata from a section hidden from that recipient can leak.

**Risk:** `RISK-009`. **Owner:** `UNIT-009`.

## P1 Findings

### `F-005` — Selected variant edit collapses linked rows to the default

**Evidence:** `src/components/workshop/estimate-sheet/rows/row-table.tsx:586`, `src/components/workshop/EstimateSheetContent.tsx:2094`, `src/lib/component-library/actions.ts:1876`, `src/lib/component-library/actions.ts:474`.

The initiating `priceOptionId` is not supplied to the shared component write. The server persists/builds one default option snapshot and a blanket SQL update writes it to every linked instance.

**Risk:** `RISK-001` (HIGH GitNexus blast radius). **Owner:** `UNIT-001`.

### `F-006` — Library sync destroys linked overrides

**Evidence:** `src/lib/component-library/actions.ts:430`, `src/lib/component-library/actions.ts:474`.

Target selection and update exclude only detached/unlinked rows. `linked-overridden` rows are overwritten and reset to `linked-clean` without explicit rebase.

**Risk:** `RISK-002`. **Owner:** `UNIT-001`.

### `F-007` — Shared images use row/project ownership

**Evidence:** `src/components/workshop/estimate-sheet/rows/cells.tsx:149`, `src/app/api/estimate-row-images/route.ts:161`, `src/components/workshop/EstimateSheetContent.tsx:2135`, `src/app/api/projects/images/route.ts:209`.

A library component can persist a URL backed by an estimate/project-owned asset. Variant thumbnail precedence can ignore the new URL, and other consumers may not have access.

**Risk:** `RISK-003`. **Owner:** `UNIT-004`.

### `F-008` — Variant attachments are dropped; old fix could steal ownership

**Evidence:** `src/lib/component-library/actions.ts:986`, `src/lib/component-library/actions.ts:1136`, `src/lib/component-library/actions.ts:1455`, `migrations/0022_component_attachment_metadata.sql:46`, `src/components/workshop/component-library/index.tsx:2290`.

Payloads carry attachments but the write plan has no attachment statements. Reusing the same unique storage path during duplicate must not update ownership to the duplicate.

**Risk:** `RISK-003`. **Owner:** `UNIT-004`.

### `F-009` — Component move can partially persist

**Evidence:** `src/lib/estimates/d1-action-client.ts:3065`, `src/hooks/use-estimate-row-mutations.ts:952`.

Source removal/update commits before target insertion/update. A target conflict can leave the source committed while the client rolls both sides back locally.

**Risk:** `RISK-004`. **Owner:** `UNIT-002`.

### `F-010` — Edit can race a normal component insert

**Evidence:** `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:723`, `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:820`, `src/hooks/use-estimate-row-mutations.ts:1389`, `src/components/workshop/estimate-sheet/rows/row-table.tsx:759`.

Only express inserts buffer edits. A library/project row becomes editable before its insert is authoritative, so Qty or another field can reach D1 before the row exists.

**Risk:** `RISK-004`. **Owner:** `UNIT-002`.

### `F-011` — Bulk-delete revision protection is ineffective

**Evidence:** `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:1322`, `src/hooks/use-estimate-row-mutations.ts:1343`, `src/lib/estimates/actions.ts:3837`, `src/lib/estimates/d1-action-client.ts:2428`.

The client does not send row revisions, the action substitutes current database revisions, and the D1 implementation does not enforce `expected_row_revisions`. A stale client can delete rows edited by another actor.

**Risk:** `RISK-004`. **Owner:** `UNIT-002`.

### `F-012` — Secondary tab can show incomplete totals as complete

**Evidence:** `src/lib/repositories/workspace-repository.ts:4038`, `src/lib/estimates/actions.ts:2129`, `src/components/workshop/EstimateSheetContent.tsx:1096`, `src/components/workshop/EstimateSheetContent.tsx:3013`.

The repository truncates, but secondary-tab fetch returns only the tree. The UI lacks partial-state truth and can keep move controls active.

**Risk:** `RISK-005`. **Owner:** `UNIT-003`.

### `F-013` — Issue creation can be torn and semantic hashes are unstable

**Evidence:** `src/lib/client-portal/publish-service.ts:105`, `src/lib/client-portal/publish-service.ts:110`, `src/lib/publication/snapshot.ts:530`, `src/lib/client-portal/issue-builder.ts:298`.

Rows/nodes/tabs/estimates are independent reads without a revision fence. Random public-ID namespace values enter payload/content hashes, so unchanged source content can generate a new semantic issue hash.

**Risk:** `RISK-010`. **Owner:** `UNIT-007`.

### `F-014` — Issued rows lose component/variant identity

**Evidence:** `src/lib/client-portal/publish-service.ts:111`, `src/lib/publication/types.ts:67`, `src/lib/client-portal/estimate-browser.ts:6`, `src/lib/client-portal/contracts.ts:15`.

The public projection cannot group repeated component instances, show selected variant/component version, validate a component target, or preserve an immutable source receipt.

**Risk:** `RISK-010`. **Owner:** `UNIT-007`.

### `F-015` — Discussion target identity and labels are client-controlled

**Evidence:** `src/lib/client-portal/public-thread-handlers.ts:57`, `src/lib/client-portal/thread-repository.ts:178`, `src/lib/client-portal/thread-repository.ts:198`.

Kind and nonempty ID are checked; existence within the issued section is not. Client-provided target/secondary labels are stored. This is an issue-integrity/spoofing defect even when it does not disclose live source data.

**Risk:** `RISK-009`. **Owner:** `UNIT-009`.

### `F-016` — Formal decision authority/state is incomplete

**Evidence:** `src/lib/client-portal/decision-service.ts:49`, `src/lib/client-portal/decision-service.ts:90`, `src/lib/client-portal/issue-builder.ts:397`.

Decline can use reviewer authority, required-approver policy is not fully aggregated, and receipt insertion does not atomically transition the issue decision state.

**Risk:** `RISK-011`. **Owner:** `UNIT-010`.

### `F-017` — Financial section configuration can be silently wrong

**Evidence:** `migrations/0068_client_portal_foundation.sql:98`, `src/lib/client-portal/publish-service.ts:64`, `src/lib/client-portal/publish-service.ts:83`, `src/lib/client-portal/financial-sections.ts:51`.

Financial-only portal scope can fail, all financial sections can inherit the browser union, declared comparisons can be ignored, and category/supplier can be emitted as discipline.

**Risk:** `RISK-011`. **Owner:** `UNIT-007`.

## P2 Findings

### `F-018` — Stale cache or local revision can hide authoritative inserts

**Evidence:** `src/components/workshop/EstimateSheetContent.tsx:2360`, `src/hooks/use-estimate-query.ts:95`, `src/components/workshop/estimate-tree/use-estimate-tree-reorder.ts:62`.

An authoritative insert response can be discarded after a local revision change, and remount policy can continue showing stale initial data without a reconciliation read.

**Risk:** `RISK-005`. **Owner:** `UNIT-003`.

### `F-019` — Save state can remain dirty after invalid/reverted input

**Evidence:** `src/components/workshop/estimate-sheet/rows/row-table.tsx:501`, `src/components/workshop/estimate-sheet/rows/row-table.tsx:778`, `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:448`.

No mutation occurs, but dirty state prevents normal tree-to-editable synchronization.

**Risk:** `RISK-005`. **Owner:** `UNIT-003`.

### `F-020` — Templates are unbounded and source-blind at insert

**Evidence:** `src/lib/repositories/component-library-repository.ts:1283`, `src/lib/estimates/d1-action-client.ts:2589`.

The workspace loads all template graphs and insertion copies stale source values/link state without validating lifecycle/current variant.

**Risk:** `RISK-006`. **Owner:** `UNIT-006`.

### `F-021` — Component dock has out-of-order and hydration races

**Evidence:** `src/components/workshop/component-library/index.tsx:2276`, `src/components/workshop/component-library/index.tsx:2365`, `src/components/workshop/component-library/index.tsx:2659`, `src/components/workshop/component-library/index.tsx:2791`.

Rapid editor/move/prefetch operations can resolve into stale visible state; duplicate temporarily becomes variant-blind.

**Risk:** `RISK-006`. **Owner:** `UNIT-005`.

### `F-022` — Lifecycle picker policy is too permissive

**Evidence:** `src/lib/repositories/component-library-repository.ts:392`, `migrations/0026_component_promotion_support.sql:50`.

Only archived items are excluded, so draft/in-production/discontinued items can be exposed as new insert candidates.

**Risk:** `RISK-006`. **Owner:** `UNIT-005`.

### `F-023` — Branch rendering is not row-scoped

**Evidence:** `src/components/workshop/estimate-sheet/rows/branch.tsx:137`.

Global status identity invalidates memoization before the intended row comparator.

**Risk:** `RISK-012`. **Owner:** `UNIT-003`.

### `F-024` — Public estimate browsing is cosmetically paginated

**Evidence:** `src/lib/client-portal/publish-service.ts:110`, `src/lib/client-portal/issue-builder.ts:283`, `src/lib/client-portal/estimate-browser.ts:73`, `src/components/client-portal/EstimateBrowserSection.tsx:28`.

All rows live in one payload/client array; pagination is local slicing and tree aggregation can be quadratic.

**Risk:** `RISK-012`. **Owner:** `UNIT-011`.

### `F-025` — Threads/decisions/activity/notifications do not close the loop

**Evidence:** `src/lib/client-portal/thread-repository.ts:203`, `src/lib/client-portal/decision-service.ts:94`, `src/lib/client-portal/publish-service.ts:89`, `worker.ts:231`.

Thread events omit delivery, decision notification targets the submitter rather than owner-side recipients, Activity issue payload is empty, and pending delivery can wait for a daily cron.

**Risk:** `RISK-012`. **Owner:** `UNIT-011`.

## P3 Findings

- column-width save advances its persisted snapshot before success and swallows errors: `src/components/workshop/EstimateSheetContent.tsx:1314`;
- duplicate local state omits hydrated variants until refetch: `src/components/workshop/component-library/index.tsx:2365`;
- mobile portal action bar lacks retained Discuss/Decision actions: `src/components/client-portal/ClientPortalShell.tsx:326`.

These are included in `UNIT-003`, `UNIT-005`, and `UNIT-011` but may not precede their unit's P0/P1 criteria.

## Risk Register

| Risk | Severity | Failure mode | Units | Exit condition |
| --- | --- | --- | --- | --- |
| `RISK-001` | P1 / HIGH blast radius | selected variant collapses to default | `UNIT-001` | variant-targeted guarded fan-out preserves every target selection |
| `RISK-002` | P1 | overrides silently overwritten | `UNIT-001` | overridden rows are preserved and explicit rebase is required |
| `RISK-003` | P1 | media/attachment loss or ownership transfer | `UNIT-004` | atomic ownership, duplicate-safe paths, round-trip detail hydration |
| `RISK-004` | P1 | partial/stale row mutation | `UNIT-002` | atomic multi-row writes and real expected revisions |
| `RISK-005` | P1/P2 | incomplete/stale UI presented as saved | `UNIT-003` | partial truth, clean-state recovery, authoritative reconciliation |
| `RISK-006` | P2 | template/dock stale or unbounded behavior | `UNIT-005`, `UNIT-006` | lifecycle gating, bounded hydration, serialized UI operations |
| `RISK-007` | P0 | recipient cannot receive or verify access | `UNIT-008` | delivered bootstrap and atomic verified session |
| `RISK-008` | P0 | stale session survives password rotation | `UNIT-008` | access-version-bound session invalidation |
| `RISK-009` | P0/P1 | hidden/spoofed discussion target | `UNIT-009` | section-policy read/write and server-derived issued target |
| `RISK-010` | P1 | torn/non-deterministic issue or missing component identity | `UNIT-007` | consistency fence, semantic hash, opaque component anchors |
| `RISK-011` | P1 | wrong totals or unauthorized/incomplete decision | `UNIT-007`, `UNIT-010` | scoped reconciliation and policy-driven atomic issue state |
| `RISK-012` | P2 | large issues/render/delivery degrade first-user flow | `UNIT-003`, `UNIT-011` | bounded queries/payloads, linear tree, timely correct-audience delivery |
| `RISK-013` | process | concurrent worktree drift overwrites in-flight work | every unit | reread, scoped ownership, diff/change detection before handoff |
| `RISK-014` | P1 | reduced Components-page editor loses or flattens the variant graph | `UNIT-001`, `UNIT-005` | one full Add/Edit modal and mutation contract own every advanced edit |
| `RISK-015` | P1 | row-selected option is persisted as component default | `UNIT-001` | selected option context and default option authority are separate explicit IDs |
| `RISK-016` | P1 / HIGH blast radius | Library/Project fan-out rewrites instances using another variant | `UNIT-001` | option-scoped guarded fan-out changes only matching selected-option instances |
| `RISK-017` | P1/P2 | optimistic/label-based reconciliation presents an incomplete graph as saved | `UNIT-001`, `UNIT-003`, `UNIT-005` | authoritative detail/row results replace local guesses |
| `RISK-018` | P1 | attachment/orphan upload relations allow loss, theft, or leaked storage | `UNIT-004` | relational repair, atomic binding, and ordered R2 cleanup |
| `RISK-019` | process/product | beta path accumulates duplicate editors/contracts/fallbacks | `UNIT-001`, `UNIT-005`, `UNIT-007`, `UNIT-011` | superseded code is deleted and one authority remains per concern |

## Security Threat Model

| Boundary | Threat | Required control |
| --- | --- | --- |
| workspace -> Library | cross-workspace component/variant/media mutation | workspace permission plus item/option/asset ownership in the same guarded write |
| project -> project component | cross-project fan-out | project-bound component identity and affected-row query |
| row -> multi-row mutation | stale/partial write | row revisions, impact fingerprint, atomic batch/statement set, one correlation |
| private -> issued snapshot | internal ID/cost/source leakage | explicit safe projection and issue-local opaque IDs |
| portal token -> recipient | stolen/stale bootstrap/session | hash-at-rest, short delivery surface, atomic verification, credential/access version binding |
| issue -> section | hidden-section thread leakage | section policy on create/list/read/reply/resolve/mark-read |
| client target -> issued entity | spoofed ID/label | server-side allowlist and derived labels |
| issue -> formal decision | stale or unauthorized intent | issue hash, idempotency, policy snapshot, required approvers, atomic transition |
| upload -> component | row-owned/private asset promoted to shared | component-owned asset record, scan/finalization, path ownership, fail-closed download |

## Performance Budgets

These are planning budgets, not already-proven measurements:

- ordinary row edit: one row-scoped optimistic patch and one guarded server mutation; unaffected branches do not rerender;
- component shared edit: one preview plus one guarded atomic write set; no N client calls for N rows;
- component sidebar: 50-item page default; detail graph on demand;
- template sidebar: bounded summary page; one selected graph on demand;
- issued payload: explicit D1 JSON byte threshold and R2/server-page fallback; never implicit unbounded D1 JSON;
- client tree: build node/descendant and row membership indexes once per payload, then aggregate linearly;
- discussions/activity: bounded page/cursor with section-policy filtering in the query/service;
- feedback: no full-sheet blanking, no numeric-column shift, no decorative motion.

## Test Decision

`NOT_REQUIRED` for this planning run and for package readiness. No automated product test, build, browser, screenshot, or visual QA is authorized by the current request.

The implementation plan uses current-beta acceptance scenarios, not a compatibility or broad regression-suite workstream. If source/static/D1 evidence cannot prove a material invariant, the executor records the exact evidence gap without creating or running tests unless the user creates a separate test task.
