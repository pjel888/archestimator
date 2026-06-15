---
title: Express Components Edge Cases And Failure Modes
type: docs
date: 2026-06-15
---

# Edge Cases And Failure Modes

Each case defines trigger, user-visible behavior, data invariant, and required evidence.

| Case | Trigger | User-visible behavior | Data invariant | Evidence |
| --- | --- | --- | --- | --- |
| Fast edit before insert returns | User types and blurs immediately after Add row | Field appears dirty/queued until insert success; commit runs after row revision is known | No update RPC runs before persisted row id/revision exists | Q17 |
| Insert failure | Insert RPC/network fails | Draft remains with Retry/Delete | No duplicate row on retry; delete removes only local draft | Q18 |
| Multiple active drafts/editors | User creates another express draft before the first is saved or recovered | Either all active editors disable virtualization, or UI enforces one in-flight draft/editor with clear disabled copy | No active editor overlaps neighbors; focus target is deterministic, newest active draft unless a stricter one-draft rule is enforced | Q22 Q24 |
| Retry after insert timeout | Same correlation id retried | Prior successful row returned or new row created once | Correlation id is stable | Q18 |
| Stale revision field edit | Peer saves row before current user commit | Inline conflict copy; user can review latest and retry | No blind overwrite; current row revision honored | Q30 |
| Multi-field partial failure | One field saves, next fails | Saved fields remain; failed field shows recovery | Row matches server after reconciliation | Q7 Q30 |
| Large description | Description exceeds 96px row height | Day-0 disables virtualization while the editor is active; clean state truncates | No virtual overlap; active content is not hidden by 96px intrinsic sizing | Q22 |
| Long name/narrow viewport | Name is too long | Clean state truncates; edit state scrolls/wraps within measured row | Text does not occlude controls | Q26 |
| Image URL 404 | User sets broken image URL | Existing fallback image/empty state renders; error is not fatal | `source_snapshot.imageUrl` can be cleared | Q6 |
| Image update | User sets/clears image | Image appears in live row and publication snapshot | `source_snapshot.imageUrl` is present in publication snapshot; other `source_snapshot` keys are merged, not clobbered | Q6 Q16 Q42 |
| Clear express row | User clears component | Intentional clear creates legacy blank placeholder or confirms destructive loss | Express metadata is removed only on confirmed clear | Q35 |
| Move/replace express row | User moves/replaces via drag/drop or `replaceEstimateRowItemWithLibrary` | Express row either preserves express identity/source snapshot after reload or the operation is blocked with explicit copy | Server replace path carries/merges `metadata.expressComponent` and required `source_snapshot` keys; client object spread is not sufficient proof | Q35 Q50 |
| Concurrent express insert | Two clients insert into the same node at the same time | One or both inserts retry transparently or return distinct order | Final siblings have unique `sort_order`; retry uses same correlation id and does not duplicate drafts | Q45 |
| AI package replacement | AI package-builder replaces row component data | Replacement is blocked for express rows or server-merges metadata/source snapshot | `metadata.expressComponent` and unrelated `source_snapshot` keys survive | Q44 |
| Draft abandon | User navigates away or switches tabs before insert succeeds | Prompt to keep/delete when possible; otherwise only local draft disappears | No partial update is sent before persisted row revision exists | Q47 |
| Delete/select express row | User selects, multi-selects if supported, or deletes an express row | Existing selection styling, keyboard focus, and delete confirmation/path behave like normal rows | Delete removes only the intended row and does not corrupt sibling express metadata | Q40 |
| Duplicate linked rows | Same library component inserted twice | Both show make-project-specific action | Eligibility per row, not index/order | Q8 |
| Unreproduced icon bug | Real duplicate does not fail | U5 becomes normalization hardening | Required capture or non-repro note is attached before implementation claim | Q8 Q9 Q43 |
| Promotion create failure | RPC fails before library item create | Row remains express; retry allowed | No library item exists | Q33 |
| Promotion relink failure | Failure after library create would occur in old two-txn design | New RPC rolls back entire transaction | No orphan library item | Q33 |
| Promotion duplicate retry | User retries after timeout | Same correlation returns same item | One library item and one default price option | Q21 Q33 |
| Viewer attempts edit | Viewer clicks/requests edit | UI disabled/hidden; server rejects | RLS/action guards enforce no write | Q27 |
| Estimate editor promotes | User can edit estimate but lacks workspace editor | Promote hidden/disabled; RPC rejects if called | No library write | Q28 |
| Unauthorized project projection | User supplies or reaches an inaccessible project id | Project folder returns no rows and no leaked labels | Query checks project/estimate access and never scans workspace-wide rows without context | Q41 |
| Feature flag off | Rollback disables authoring | Add row uses legacy blank; persisted express rows readable | No data deletion | Q31 |
| Legacy blank rows | Existing source-less blanks from prod | Render as placeholders and remain excluded from Project folder | Existing events unchanged | Q12 Q32 |
| Source-less edited material row | Existing source-less row has user-edited material and no express metadata | Row is classified deliberately as legacy/manual/project-local per captured evidence, not silently treated as express | U2 captures row shape before history predicate changes; Project projection does not leak renamed abandoned rows as express rows | Q53 |
| Source-less non-unlinked row | Inconsistent existing data | Defensive classification; no crash | Row not incorrectly promoted or hidden | Q12 Q34 |
| Project-source/template copy of express row | User copies an express row into another estimate/tab/project | Copied row appears as a new express row, not the same row-lifetime identity | Row id and `metadata.expressComponent.id` are fresh; express kind/provenance survive | Q14 Q51 |
| Peer row visibility without realtime | Another user creates or edits an express row | Peer does not see phantom draft; persisted row visibility is eventual/manual refresh unless a row-sync workstream is added | Correctness relies on revision checks, not nonexistent realtime row propagation | Q29 Q52 |
| AI/context mislabel | Express insert event reaches AI context | Express not summarized as blank | Event classification fixed at insert | Q36 |
| Export consolidation | Two identical express rows export | Consolidates or stays distinct per documented rule | Grand total correct | Q37 |
| Uncategorized express defaults | User creates an express row without category/designation | Proposal and charts place the row in existing Uncategorized/Unspecified fallback buckets | Row is not treated as a legacy blank and totals remain row-field driven | Q37 |
| Promotion cache fan-out | Promotion succeeds while estimate and library surfaces are open | Source row updates immediately; library panels/routes refresh created component; Project projection no longer shows stale Express-only state | Active estimate row query, workspace library prefix, active library route datasets, and Project projection are updated/invalidated | Q13 Q21 Q33 |
