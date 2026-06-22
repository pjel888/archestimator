# Phase 0 Baseline Reconciliation

Status: complete for beta-foundation implementation start.

Captured: 2026-06-22T12:00:26Z lead pass, refreshed after subagent returns.

## Current Worktree

- Branch: `main`.
- Dirty files before implementation: `git status --short` reported 125
  modified/deleted/untracked paths. Most are unrelated Library Page,
  destructive database reset, Project Data, landing/auth, and shared UI work.
  The Trust/Governance plan pack itself already had modified and untracked plan
  files/evidence before app-source edits.
- Other active agents/worktrees: one local worktree at
  `/Users/philiplewis/Documents/archestimator`; no secondary git worktree was
  present. Parallel read-only subagents were active for U1, U2, U3, U4/U5,
  security/redaction, and QA/evidence. Completed lanes recorded no edits.
- High-conflict locks created: `FILE_LOCKS.md` reserves
  `src/components/workshop/EstimateSheetContent.tsx`, `_evidence/phase-0/*`,
  and the Ralph context snapshot for lead/integration ownership.

## Current Validation Truth

- `.ai/10_state/current-state.md` FAST PATH read date: 2026-06-22.
- Current broad validation status, if run: not run for this pack. FAST PATH
  says full `bun run validate` is already red on unrelated chart
  `set-state-in-effect` and `ProposalExportPreviewDialog` design-lint issues;
  the sidecar handoff also records unrelated pricing/contact copy-test reds.
- Known unrelated reds: landing/pricing/contact copy tests from the sidecar
  handoff; broader validate reds from current-state FAST PATH.
- Library-page release NO-GO items still relevant to this pack: Library-owned
  release rows now pass, but aggregate release remains blocked by unrelated
  landing-page TypeScript errors. This pack must not reopen the Library Page
  plan or claim aggregate release readiness.
- Focused proof chosen instead of broad validation: U1/U2/U3/U6/U7 targeted
  Vitest/DOM/static tests plus DB-specific preflight/migration checks when U4/U5
  starts.

## Anchor Refresh

Record fresh `rg` results for:

- insert/replace estimate actions:
  `src/components/workshop/EstimateSheetContent.tsx` has insert flow near
  `insertLibraryItem`, replace flow near `replaceRowItemWithLibraryItem`, and
  row mutation wiring through `useEstimateRowMutations`; server actions live in
  `src/lib/estimates/actions.ts` as `insertEstimateRowItemFromLibrary` and
  `replaceEstimateRowItemWithLibrary`.
- right sidebar source tabs:
  `src/components/workshop/component-library/index.tsx` defines source tabs and
  the `TreePanelHeader` tabs; `tests/vitest/component-library-ui.test.tsx`
  already asserts `Library`, `Project`, and `Templates` tab labels.
- query key factories:
  `src/lib/component-library/query-keys.ts` has workspace/project scoped full,
  lite, rows, and template keys. Performance review found direct invalidation
  of `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` at several call sites and
  marked this as avoidable fanout.
- source trust helpers:
  `src/components/workshop/library/source-trust-model.ts` classifies freshness,
  confidence, lifecycle, source changed, detached, overridden, and archived
  states; `src/components/workshop/library/source-trust-chips.tsx` renders the
  accessible chip list. Existing tests cover model behavior, not yet the
  insert/replace commit gate.
- attachment upload/delete:
  `src/app/api/component-library/attachments/route.ts` validates MIME/magic
  bytes and private storage paths on upload, then deletes owned paths by prefix
  and extension. The DB lane found no durable approval/supersede/delete guard.
- telemetry sanitizer/events:
  `src/lib/component-library/library-telemetry.ts` defines trust gate,
  redaction, cache, authz, upload, and export events. Security review found the
  generic top-level allowlist can still leak private data through allowed string
  keys and must become stricter before U7 is claimed.
- public/proposal snapshot redaction:
  `tests/vitest/share-snapshot-redaction.test.tsx` exists and current public
  snapshot construction is allowlist-based. Security review requires extending
  it when Library trust fields, attachments, signed URLs, review notes, or
  private pricing evidence are introduced.

## Decision

- Beta reuse foundation allowed to start: yes.
- Durable governance allowed to start: no.
- Reason: U1/U2/U3/U6a/U7 beta work has local anchors and focused tests.
  Durable U4/U5 remains blocked until `db-preflight.md` records live project
  schema, policies, grants, SQL probes, query plans, generated-type impact, and
  direct-write prevention proof for project `ebxxqidacheyapmmzavr`.
