---
title: Express Components Review And Risk Register
type: docs
date: 2026-06-15
---

# Express Components Review And Risk Register

## Pre-Review Position

The plan chooses estimate-row scoped express components for day-0 U1-U4. Virtual Components Project folder projection and library promotion remain specified as fast-follow contracts. This avoids a new table for the requested scope while preserving project-specific authoring, history, and later conversion paths.

## Risks

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RSK1 | A future need for reusable project-local components exceeds row projection | High | Treat as explicit product fork before adding `project_components` |
| RSK2 | Inline field edits race with initial row insertion | High | Buffer commits until insert returns persisted row readiness and row revision; keep visible draft recovery on failure |
| RSK3 | Existing RPC result shape does not return widened fields | High | Extend result reader and tree patch before UI uses richer fields; prove JSON merge preservation |
| RSK4 | Duplicate linked component bug survives because insert payload lacks link fields | Medium | Normalize source linkage on insert and add duplicate-instance regression |
| RSK5 | Project folder scans too much estimate data or leaks project rows from workspace context | Medium | Require explicit project context and project/estimate access checks; no workspace-wide silent aggregation |
| RSK6 | Image upload opens storage policy gaps | Medium | First pass supports image URL/source only; add explicit storage RLS/grants before upload |
| RSK7 | Active editor breaks fixed-height row virtualization | Critical | Day-0 disables virtualization while one express editor is active; dynamic `measureElement` is follow-up only after content-visibility/scroll-margin constraints are proven |
| RSK8 | Promotion creates duplicate library records | High | Require idempotency key/provenance guard and preferably a transaction/RPC around library create plus row relink |
| RSK9 | Express source-less inserts are mislabeled as blank row activity | High | Narrow `row_blank_added` to true blank placeholders; express insert uses `row_added` or a new composer-backed event |
| RSK10 | Text-field keyboard editing conflicts with grid navigation | Critical | Express text fields opt out of `handleEstimateCellKeyDown`; doc 09 key table and tests are mandatory |
| RSK11 | Realtime peers/stale revisions corrupt draft or field edits | High | Define two-client behavior, stale-revision UX, and cursor anchoring in doc 11 |
| RSK12 | Promotion crosses the estimate-edit to workspace-library-write permission boundary | High | Gate promotion on both estimate edit and current library-write policy parity; do not invent a stricter predicate unless a new decision explicitly changes the policy |
| RSK13 | Rollback leaves persisted express rows unreadable or hides recovery | High | Ship feature flag and fallback render path from doc 12 |
| RSK14 | AI package-builder replacement clobbers express metadata | High | Require `src/lib/ai/package-builder/apply.ts` to merge or skip/block express replacements; prove with Q44 |
| RSK15 | Concurrent inserts collide on sibling `sort_order` | High | Allocate inside the insert RPC lock or retry with same correlation id and no duplicate draft; prove with Q45 |

## Review Findings

Independent review found no P0 blockers and kept the no-new-table decision intact for the default scope. P1 findings and plan resolutions:

| Finding | Resolution |
| --- | --- |
| Insert/edit race was named but not implementable | U2 now requires insert to return persisted row readiness and row revision; U4 buffers commits until readiness; QA adds fast-edit and insert-failure tests |
| Components Project folder lacked route/context decision | U6 now requires explicit `projectId` from route/query/context; workspace-only Components does not fetch project rows |
| Promotion lacked atomicity/idempotency | U7 now requires a promotion wrapper with idempotency/provenance checks and relinks the row to the new library item; QA adds retry/no-duplicate proof |
| Current insert RPC classifies source-less rows as `row_blank_added` | U2/U8 now require express insert history to use `row_added` unless a new event is added with composer support |
| Current update RPC replaces `metadata` and `source_snapshot` wholesale | Corrected: omitted JSON keys are preserved; only sent JSON keys replace. U3 now requires omission for routine edits and complete server-merged JSON only when mutating those blobs |
| Project folder auth boundary was underspecified | U6 now requires a project-scoped action with project/estimate access checks, not workspace-library membership alone |
| Optional image and supplier were too conditional | UX and U4 now scope image to URL/source set-clear and supplier to inline text for the first implementation |
| Accessibility lacked live save/error feedback | UX and U4 now require polite live announcements plus `aria-invalid`/`aria-describedby` on failed fields |
| Fixed-height virtualization was understated | Doc 09 chooses day-0 disable-while-editing and Q22 proves the >=75-row active-editor path |
| U5 bug was unreproduced | U5 now starts with a reproduction artifact or is reframed as normalization hardening |
| Metadata express identity was unreadable | U1 now owns SELECT/mapper/type changes for `metadata.expressComponent` |
| Promotion atomicity was not concrete | U7 now chooses a new atomic RPC instead of a two-transaction app saga |
| Realtime, permissions, mobile, rollback, and observability were absent | Docs 09-12 now own those release gates |
| AI package-builder write path was missing | U8, doc 07, doc 10, Q44, and RSK14 now own metadata-preservation behavior |
| Sort-order race was missing | U2, doc 07, doc 10, doc 11, Q45, and RSK15 now own allocation/retry behavior |
| Strategic scope was over-bundled | Doc 00 and INDEX define U1-U4 plus minimum U9 as day-0; U5-U7 are gated fast-follows |

## Residual Gaps

- No implementation has been performed in this pack.
- No browser visual proof exists yet; Q22/Q26/Q38 define the required proof before implementation completion.
- Live Supabase was queried read-only; no migrations or policy changes were applied.
- The duplicate-instance project-specific icon bug is not yet reproduced; this plan now blocks U5 implementation on reproduction or explicit reframing.
