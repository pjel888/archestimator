# Risk Register

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| RISK-01 | Drag icon becomes a false affordance | High | Do not render enabled handle until handler and persistence path exist |
| RISK-02 | Existing component move behavior is confused with row move | High | Use dedicated MIME type, action, event, and naming |
| RISK-03 | Same-branch reorder loses rows or creates duplicate sort orders | High | Pure helper plus transaction-safe final-order RPC with deferred unique constraint |
| RISK-04 | Cross-estimate or unauthorized row movement | High | Server action and RPC authorization plus same-estimate validation |
| RISK-05 | Filtered or grouped visible order persists incorrectly | High | Disable movement in transformed views for first implementation |
| RISK-06 | Left tree mutates row state directly and diverges from content | Medium | Tree dispatches event; content owns mutation |
| RISK-07 | Optimistic UI updates only one branch | Medium | Helper patches both source and target nodes and returns affected rows |
| RISK-08 | Virtualized rows produce incorrect target index | Medium | Resolve index from canonical row IDs and provide keyboard dialog for non-visible positions |
| RISK-09 | Dragover performance degrades in large trees | Medium | Keep tree dragover MIME-based and target-only |
| RISK-10 | Keyboard or touch users cannot use the feature | Medium | Add move dialog or action path with explicit target and position |
| RISK-11 | Concurrent collaborator overwrites row order | Medium | Expected row revisions and deterministic locks |
| RISK-12 | Selection checkbox becomes hard to use | Medium | Keep handle and checkbox separate, preserve tests, avoid event leakage |
| RISK-13 | History event grows too large | Low | Store minimal movement metadata and affected count |
| RISK-14 | Column width change breaks grid alignment | Low | Prefer existing select column; update column model tests if width changes |
| RISK-15 | Multiple selected rows create ambiguous move expectation | Medium | Disable drag while multiple selection is active in the MVP |
| RISK-16 | Compact rail creates inaccessible touch targets | High | Fine-pointer rail only; coarse-pointer Move row action has at least a 44 by 44 CSS px activation target |
| RISK-17 | RPC grants or actor attribution widen mutation access | High | Hardened security-definer envelope, fixed search path, explicit grants, actor derived from `auth.uid()` |
| RISK-18 | Retried mutation writes duplicate history | Medium | Mandatory `mutation_id` idempotency before locks and history insert |
| RISK-19 | History lacks enough data to repair a bad order | Medium | Store before/after row-location metadata for affected rows |
| RISK-20 | Mocked tests overclaim database safety | High | Require real DB proof for RPC locking, deferrable uniqueness, grants, rollback, and idempotency |

## Highest-Risk Decision

The persistence contract is the highest-risk area. A row reorganization changes ordering for multiple rows, not just the dragged row. The implementation should start with pure helper tests and RPC validation before enabling the handle.
