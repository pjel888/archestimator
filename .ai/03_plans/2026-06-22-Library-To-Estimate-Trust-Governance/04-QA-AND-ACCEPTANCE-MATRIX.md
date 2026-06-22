# QA And Acceptance Matrix

Use focused proof. Do not require broad `bun run validate` as the only acceptance gate while `.ai/10_state/current-state.md:27` records the baseline as red.

## Focused Test Matrix

| ID | Claim | Preferred evidence | Pass condition |
| --- | --- | --- | --- |
| QA-001 | Stale Library replacement cannot silently commit | `tests/vitest/estimate-sheet-library-insert.test.tsx` | Stale/very-stale/missing source triggers compare or block before replace. |
| QA-002 | Row revision conflict fails closed | `tests/vitest/estimate-sheet-actions-authz.test.ts` | Stale expected row revision rejects and UI restores prior state. |
| QA-003 | Sidebar source tabs stay distinct | `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx` | Library, Project, and Templates sections render distinct labels and insertion behavior. |
| QA-004 | Project sources do not leak workspace Library identity | `tests/vitest/project-component-projection.test.ts` | Project projection excludes ordinary linked workspace rows and preserves detached/project metadata. |
| QA-005 | Cache scoping holds after workspace switch | `tests/vitest/library-workspace-switch-cache.test.ts` | No prior-workspace Library data is reused or displayed. |
| QA-006 | Lite/full/rows/template cache shapes remain separate | `tests/vitest/library-components-cache.test.tsx`, `tests/vitest/library-templates-cache.test.tsx` | Each mutation invalidates the correct scoped key or prefix. |
| QA-007 | Source trust labels are orthogonal | `tests/vitest/library-source-trust.test.ts` | Stale price, very stale, source changed, no source, and lifecycle chips do not collapse. |
| QA-008 | Accepted cost state is enforced | `tests/vitest/component-library-cost-governance-actions.test.ts` | One accepted/current cost is selected and cannot be overwritten without review state. |
| QA-009 | Attachment lifecycle is auditable | `tests/vitest/component-library-attachment-lifecycle.test.ts` | Approved current file and older revisions are both visible and scoped to the variant. |
| QA-010 | Attachment upload/delete stays scoped | `tests/vitest/component-library-attachment-lifecycle.test.ts` | Bad MIME/path/workspace prefix rejected; cleanup removes only owned draft files. |
| QA-011 | Mobile/interrupted edit states are recoverable | `tests/vitest/estimate-sheet-library-insert.test.tsx`, selective `e2e/workshop-library-routes.spec.ts` | Pending, failed, retrying, and resumed states preserve user intent. |
| QA-012 | Keyboard and validation states are accessible | `tests/vitest/estimate-sheet-column-resize-a11y.test.tsx`, `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | Focus return, visible errors, and `aria-invalid` behavior pass. |
| QA-013 | Telemetry payloads are safe | `tests/vitest/library-telemetry-emit.test.ts` | Events emit once and omit raw text, URLs, file names, and paths. |
| QA-014 | Public snapshots remain redacted | `tests/vitest/share-snapshot-redaction.test.tsx` | Source trust internals and attachment-private metadata do not enter public snapshots. |
| QA-015 | Action authz matrix holds | `tests/vitest/estimate-sheet-actions-authz.test.ts`, `tests/vitest/estimate-insert-target-authz.test.tsx` | Insert, replace, promote, detach, add-source, and template-source paths deny unauthorized or stale scope. |
| QA-016 | Promote/detach governance is scoped | `tests/vitest/estimate-sheet-row-details-crud.test.tsx`, `tests/vitest/estimate-component-drag.test.tsx` | Promote/detach respects project, workspace, and link-state boundaries. |
| QA-017 | Durable cost governance uses DB/RPC gates | `tests/vitest/component-library-versioning-schema.test.ts`, `tests/vitest/component-library-cost-governance-actions.test.ts`, SQL probes in `10-DATABASE-MIGRATION-AND-RPC-READINESS.md` | Accepted, lock-modified, rejected, and superseded state is durable only through migration/RPC proof. |
| QA-018 | Attachment DB/security lifecycle is durable | `tests/vitest/component-library-versioning-schema.test.ts`, `tests/vitest/component-library-attachment-lifecycle.test.ts`, SQL-003 in `10-DATABASE-MIGRATION-AND-RPC-READINESS.md` | Approved/superseded attachment state is scoped, non-destructive, and auditable. |
| QA-019 | Evidence ledger is complete | Pack-local evidence review plus `git diff --check -- .ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance` | Every implemented claim has command/proof method, result, category, owner, and residual-risk state. |
| QA-020 | Performance/cache budgets hold | Cache tests plus large fixture test when added | Lite payload, render, cache, retry, and attachment budgets in `11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md` are met. |
| QA-021 | Signed attachment URLs are authorized | Attachment lifecycle/security tests plus route/action denial tests | A user cannot obtain a signed/download URL for a foreign, deleted, wrong-bucket, or unauthorized attachment. |
| QA-022 | Source links render safely | Source trust/UI link tests | Unsafe or malformed `sourceUrl` values render as plain text/disabled warning; external links are normalized and use safe attributes. |
| QA-023 | Durable trust RPCs are hardened | Schema/RLS/RPC tests plus SQL-005 in `10-DATABASE-MIGRATION-AND-RPC-READINESS.md` | Trust-changing RPCs use fixed search path, narrow execute grants, caller checks, and denial tests. |

## UltraQA Adversarial Scenarios

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| ADV-001 | User opens an estimate, switches workspace, then inserts from warmed sidebar cache. | Old workspace details are not visible; mutation rejects if target/source scope mismatches. |
| ADV-002 | User starts replacing a row, another client edits or deletes that row, then user submits. | Replace rejects by expected revision or missing row; local state rolls back with retry/refetch copy. |
| ADV-003 | Library item is archived after sidebar load. | Insert/replace blocks or requires explicit non-fresh decision; no fresh snapshot is written. |
| ADV-004 | Pricing date is very stale but link state is clean. | UI says price is very stale and does not imply source drift. |
| ADV-005 | Link state is `source-changed` but pricing date is fresh. | UI asks for source review and does not ask for price refresh. |
| ADV-006 | Thumbnail differs between current row snapshot and incoming Library item. | Compare UI shows mismatch before replacement. |
| ADV-007 | Project tab source is dragged into Estimate Sheet after source project changed. | Target/source is revalidated; wrong project or stale target fails closed. |
| ADV-008 | Supplier free text conflicts with normalized supplier ID. | Canonical supplier identity wins for grouping/governance, while display text is not treated as verified identity. |
| ADV-009 | Attachment has valid extension and invalid magic MIME. | Upload is rejected with no persisted attachment record. |
| ADV-010 | Draft attachment cleanup receives a path outside the user's workspace prefix. | Delete refuses the path and does not remove foreign storage objects. |
| ADV-011 | Mobile viewport opens compare dialog, rotates, and resumes after failed network request. | Dialog remains usable, focus stays managed, and retry uses the revalidated target. |
| ADV-012 | Telemetry sees source URL, confidence prose, or file name. | Sanitizer drops it before emission. |
| ADV-013 | Two agents try to accept different current costs for the same option. | One wins through RPC/constraint; loser sees conflict; prior state remains auditable. |
| ADV-014 | Approving a new spec sheet races with deleting the old draft path. | Approved old file is not deleted; new approval supersedes only through authorized action. |
| ADV-015 | Public snapshot serializer receives nested source/attachment metadata. | Redaction drops nested raw strings, URLs, file names, paths, and confidence prose. |
| ADV-016 | User requests a signed URL for another workspace's attachment ID. | URL issuance rejects and does not reveal bucket/path existence. |
| ADV-017 | Malicious source URL is `javascript:` or malformed. | UI does not render it as a clickable link and telemetry/public snapshots omit the raw value. |
| ADV-018 | Durable trust RPC is called by an unauthorized role or with caller-controlled search path assumptions. | RPC denies the call and no trust state changes. |

## Browser Proof Boundary

Use browser proof only when the claim requires a real browser:

- mobile drawer/sidebar geometry
- drag/drop pointer behavior
- back/forward route state
- portal/focus-trap behavior
- hosted/provider proof

Use Vitest/DOM for:

- labels and copy states
- action payloads
- cache key factories
- source trust helpers
- mutation rollback behavior
- telemetry sanitizer behavior
- attachment MIME/path validation helpers

## Evidence Recording

When implementation starts, create `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/_evidence/README.md` and record each proof with:

- date
- scenario ID
- command or proof method
- result
- files under test
- local/browser/provider/manual category
- residual risk if non-core browser/provider/manual proof is skipped
- blocker status when a required core behavior is not proven; blockers keep the phase open
- owner lane
- existing-test vs net-new-test status
- evidence artifact path

Use `12-IMPLEMENTATION-READINESS-CHECKLIST.md` as the pre-registered ledger.
No phase closes until each relevant core behavior row passes. `SKIP-WITH-RISK`
can document non-core browser/provider/manual proof gaps, but it cannot close a
blocked safety, authz, DB, cache, redaction, or mutation-recovery gate.
