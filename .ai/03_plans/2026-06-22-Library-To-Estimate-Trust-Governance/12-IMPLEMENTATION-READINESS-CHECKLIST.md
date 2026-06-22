# Implementation Readiness Checklist

This file is the executable handoff checklist. It maps every requirement to a
unit, QA row, adversarial row, evidence artifact, and owner lane.

## Traceability Matrix

| UX issue | Requirement | Unit | QA | ADV | Evidence artifact | Owner lane |
| --- | --- | --- | --- | --- | --- | --- |
| UX-013 stale replacement | R1, R3, R5, R7 | U1 | QA-001, QA-007 | ADV-003, ADV-004, ADV-005, ADV-006 | `_evidence/U1-compare-before-replace.md` | UX/source |
| UX-013 target/source drift | R2, R4 | U1, U3 | QA-002, QA-005 | ADV-001, ADV-002, ADV-007 | `_evidence/U3-target-cache-recovery.md` | Cache/target |
| UX-030 mobile interruption | R4, R13 | U2, U6 | QA-011 | ADV-011 | `_evidence/U6-mobile-interruption.md` | UX/source |
| UX-044 numeric/a11y recovery | R14 | U6 | QA-012 | ADV-011 | `_evidence/U6-a11y-validation.md` | UX/source |
| UX-033 stale/conflicting cost | R9, R10, R11 | U4 | QA-008, QA-017 | ADV-008, ADV-013 | `_evidence/U4-cost-governance.md` | Governance |
| UX-034 spec sheets | R9, R12 | U5 | QA-009, QA-010, QA-018 | ADV-009, ADV-010, ADV-014 | `_evidence/U5-attachment-lifecycle.md` | Attachment |
| UX-041 evidence status | R15 | U7 | QA-013, QA-014, QA-019 | ADV-012, ADV-015 | `_evidence/U7-release-evidence.md` | QA/evidence |
| Source vocabulary | R6, R7, R8 | U2, U3 | QA-003, QA-006, QA-007 | ADV-004, ADV-005 | `_evidence/U2-source-taxonomy.md` | UX/source and cache |
| Security exposure | R9, R12, R15 | U5, U7 | QA-014, QA-015, QA-018 | ADV-012, ADV-015 | `_evidence/security-redaction.md` | Security/QA |
| DB durability | R10, R11, R12 | U4, U5 | QA-017, QA-018 | ADV-013, ADV-014 | `_evidence/db-migration-rpc-readiness.md` | DB/action |
| Performance/cache | R4, R8, R13 | U3, U6 | QA-006, QA-011, QA-020 | ADV-001, ADV-011 | `_evidence/performance-cache-budgets.md` | Cache/performance |
| Attachment download authz | R12, R16, R17 | U5 | QA-021 | ADV-016 | `_evidence/attachment-download-authz.md` | Attachment/security |
| Source URL rendering | R7, R9, R16 | U1, U2 | QA-022 | ADV-017 | `_evidence/source-url-rendering-safety.md` | UX/security |
| RPC hardening | R16, R17 | U4, U5 | QA-023 | ADV-018 | `_evidence/rpc-hardening.md` | DB/security |
| Action authorization | R16 | U1, U3, U4, U5 | QA-015, QA-017, QA-018, QA-021, QA-023 | ADV-001, ADV-016, ADV-018 | `_evidence/action-authz-boundaries.md` | Security/DB |
| Durable schema decisions | R17 | U4, U5 | QA-017, QA-018, QA-023 | ADV-013, ADV-014, ADV-018 | `_evidence/durable-governance-schema.md` | DB/action |
| Performance budgets | R18 | U3, U6 | QA-006, QA-020 | ADV-001, ADV-011 | `_evidence/performance-cache-budgets.md` | Cache/performance |
| Parallel ownership | R19 | All implementation units | QA-019 | ADV-013, ADV-014 | `_evidence/parallel-ownership-locks.md` | Lead/integration |
| Full requirements traceability | R20 | U7 | QA-019 | ADV-015 | `_evidence/requirements-traceability.md` | QA/evidence |

## Evidence Ledger Rows

Each row is pre-registered. Implementation can add rows, but it cannot remove a
required row without explaining the replacement evidence in the same artifact.

| ID | Scope | Existing or net-new | Command or proof method | Pass condition | Owner |
| --- | --- | --- | --- | --- | --- |
| QA-001 | Stale compare | Extend existing | `bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1` | Stale/very-stale/missing source triggers compare or block before replace. | UX/source |
| QA-002 | Row revision/authz | Extend existing | `bunx vitest run tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-insert-target-authz.test.tsx --maxWorkers=1` | Stale revision/no access rejects and UI can recover. | Cache/target |
| QA-003 | Source tabs | Net-new or extend | `bunx vitest run tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx --maxWorkers=1` | Library, Project, Templates render distinct labels and behavior. | UX/source |
| QA-004 | Project projection | Extend existing | `bunx vitest run tests/vitest/project-component-projection.test.ts --maxWorkers=1` | Project projection excludes ordinary linked workspace rows and preserves project metadata. | UX/source |
| QA-005 | Workspace cache scope | Extend existing | `bunx vitest run tests/vitest/library-workspace-switch-cache.test.ts --maxWorkers=1` | Prior workspace data is not displayed or submitted. | Cache/target |
| QA-006 | Cache shape separation | Extend existing | `bunx vitest run tests/vitest/library-components-cache.test.tsx tests/vitest/library-templates-cache.test.tsx --maxWorkers=1` | Full, lite, rows, and template keys remain scoped and separate. | Cache/performance |
| QA-007 | Source trust labels | Extend existing | `bunx vitest run tests/vitest/library-source-trust.test.ts --maxWorkers=1` | Price freshness, source drift, lifecycle, and confidence remain orthogonal. | UX/source |
| QA-008 | Cost governance | Net-new | `bunx vitest run tests/vitest/component-library-cost-governance-actions.test.ts --maxWorkers=1` | One accepted/current cost state and lock/review transitions are enforced. | Governance |
| QA-009 | Attachment lifecycle | Net-new | `bunx vitest run tests/vitest/component-library-attachment-lifecycle.test.ts --maxWorkers=1` | Approved current file and older revisions are visible and scoped. | Attachment |
| QA-010 | Attachment upload/delete | Net-new or extend | `bunx vitest run tests/vitest/component-library-attachment-lifecycle.test.ts --maxWorkers=1` | Bad MIME/path/workspace rejected; cleanup only removes owned drafts. | Attachment/security |
| QA-011 | Mobile/interruption | Extend and selective browser | `bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1`; browser only for geometry/focus-trap claims. | Pending, failed, retrying, and resumed states preserve user intent. | UX/source |
| QA-012 | Keyboard/a11y/numeric | Extend existing | `bunx vitest run tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx --maxWorkers=1` | Focus return, visible errors, keyboard path, and `aria-invalid` pass. | UX/source |
| QA-013 | Telemetry sanitizer | Extend existing | `bunx vitest run tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1` | Events emit once and omit raw/nested private fields. | QA/security |
| QA-014 | Public redaction | Extend existing | `bunx vitest run tests/vitest/share-snapshot-redaction.test.tsx --maxWorkers=1` | Source trust internals and attachment-private metadata do not enter public snapshots. | QA/security |
| QA-015 | Action authz matrix | Extend existing | `bunx vitest run tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-insert-target-authz.test.tsx --maxWorkers=1` | Every insert/replace/promote/detach/add-source path denies unauthorized or stale scope. | Security/DB |
| QA-016 | Promote/detach governance | Extend existing | `bunx vitest run tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-component-drag.test.tsx --maxWorkers=1` | Promote/detach respects project/workspace/source state. | DB/action |
| QA-017 | DB/RPC governance | Net-new or schema extension | `bunx vitest run tests/vitest/component-library-versioning-schema.test.ts tests/vitest/component-library-cost-governance-actions.test.ts --maxWorkers=1` plus SQL probes in `10`. | Durable trust state uses migration/RPC boundaries and rejects unauthorized mutation. | DB/action |
| QA-018 | Attachment DB/security | Net-new or schema extension | `bunx vitest run tests/vitest/component-library-versioning-schema.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts --maxWorkers=1` plus SQL-003. | Approved/superseded state is durable, scoped, and non-destructive. | Attachment/DB |
| QA-019 | Evidence ledger quality | Docs/proof | `git diff --check -- .ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance` and evidence artifact review. | Every implemented claim has local/browser/provider/manual category and residual risk when skipped. | QA/evidence |
| QA-020 | Performance/cache budgets | Net-new or extend | `bunx vitest run tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx tests/vitest/library-components-cache.test.tsx --maxWorkers=1` plus large fixture perf test when added. | Lite payload, render, cache, and retry budgets in `11` are met. | Cache/performance |
| QA-021 | Signed/download URL authz | Net-new or extend | `bunx vitest run tests/vitest/component-library-attachment-lifecycle.test.ts --maxWorkers=1` plus route/action denial tests. | Foreign, deleted, wrong-bucket, or unauthorized attachments cannot receive signed/download URLs. | Attachment/security |
| QA-022 | Source URL rendering safety | Net-new or extend | `bunx vitest run tests/vitest/library-source-trust.test.ts tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx --maxWorkers=1` | Unsafe/malformed source URLs are not clickable; external links are normalized and safe. | UX/security |
| QA-023 | RPC hardening | Net-new or schema extension | `bunx vitest run tests/vitest/component-library-versioning-schema.test.ts tests/vitest/component-library-cost-governance-actions.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts --maxWorkers=1` plus SQL-005. | Durable trust RPCs use fixed search path, narrow execute grants, caller checks, and denial coverage. | DB/security |

## DB/RPC Test Ownership

| DB ID | Covered by QA | Evidence artifact | Owner |
| --- | --- | --- | --- |
| DB-001 | QA-017 | `_evidence/db-migration-rpc-readiness.md` | DB/action |
| DB-002 | QA-017, QA-023 | `_evidence/rpc-hardening.md` | DB/security |
| DB-003 | QA-001, QA-017 | `_evidence/source-snapshot-schema.md` | DB/action |
| DB-004 | QA-014 | `_evidence/security-redaction.md` | QA/security |
| DB-005 | QA-017, QA-018 | `_evidence/db-migration-rpc-readiness.md` | DB/action |
| DB-006 | QA-018 | `_evidence/U5-attachment-lifecycle.md` | Attachment/DB |
| DB-007 | QA-023 | `_evidence/rpc-hardening.md` | DB/security |
| DB-008 | QA-017, QA-018, QA-023 | `_evidence/governance-permissions.md` | Security/DB |

## Adversarial Rows Added By Repair

| ID | Scenario | Expected outcome | Owner |
| --- | --- | --- | --- |
| ADV-013 | Two agents try to accept different current costs for the same option. | One wins through RPC/constraint; loser sees conflict; previous state remains auditable. | Governance/DB |
| ADV-014 | Approving a new spec sheet races with deleting the old draft path. | Approved old file is not deleted; new approval supersedes only through authorized action. | Attachment |
| ADV-015 | Public snapshot serializer receives nested source/attachment metadata. | Redaction drops nested raw strings, URLs, file names, paths, and confidence prose. | QA/security |
| ADV-016 | User requests a signed URL for another workspace's attachment ID. | URL issuance rejects and does not reveal bucket/path existence. | Attachment/security |
| ADV-017 | Malicious source URL is `javascript:` or malformed. | UI does not render it as a clickable link and telemetry/public snapshots omit the raw value. | UX/security |
| ADV-018 | Durable trust RPC is called by an unauthorized role or with caller-controlled search path assumptions. | RPC denies the call and no trust state changes. | DB/security |

## Binary Phase Gates

| Phase | Gate | Pass condition |
| --- | --- | --- |
| 0 | Reality refresh | Current anchors verified with `rg`; dirty worktree boundaries known; `_evidence/README.md` created. |
| 1 | Reuse safety | QA-001 through QA-007 pass, plus QA-022 if source links render in the touched UI; no silent stale replace remains. Non-core browser/provider proof may use `SKIP-WITH-RISK`, but core local behavior cannot be skipped. |
| 2 | Governance | Chosen migration shape in `10` is implemented or explicitly not touched in the phase; QA-008 through QA-010 and QA-017/018/021/023 pass for touched governance behavior. |
| 3 | Mobile/a11y | QA-011 and QA-012 pass; skipped browser proof is marked with risk and exact follow-up condition. |
| 4 | Evidence/release | QA-013, QA-014, QA-019, and all changed-unit evidence rows are complete. |

No phase may close with qualitative language such as "visible enough" or
"auditable enough." It closes only when the named evidence row passes. A blocker
keeps the phase open. `SKIP-WITH-RISK` is allowed only for browser, provider, or
manual proof that does not prove the core behavior of the phase.

## Skipped Proof Contract

| Proof type | Allowed skip reason | Required notation |
| --- | --- | --- |
| Browser/mobile | Claim was proven by DOM/static test, or browser-only geometry was not changed. | `SKIP-WITH-RISK: browser` plus claim, rationale, and trigger for future browser proof. |
| Provider/storage | Local route/helper tests prove logic, and no live provider claim is made. | `SKIP-WITH-RISK: provider` plus unproven provider behavior. |
| Full `bun run validate` | Current repo baseline is known red for unrelated reasons. | Record focused green commands and current known red baseline source. |
| Manual review | Claim does not affect user-visible behavior or security. | State why automated proof is sufficient. |

## Final Implementation Report Shape

The implementation agent's final report should include:

- Units completed by U-ID.
- Files changed.
- Evidence artifact paths under this pack.
- Commands run and results.
- Browser/provider/manual proof skipped with `SKIP-WITH-RISK`.
- Known baseline reds that remain unrelated.
- Any migration applied, SQL probes run, and fix-forward notes.
