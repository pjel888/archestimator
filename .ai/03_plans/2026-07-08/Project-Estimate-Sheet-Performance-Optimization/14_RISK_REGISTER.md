# 14 - Risk Register

| ID | Risk | Severity | Probability | Mitigation |
|---|---|---:|---:|---|
| R01 | Normalized graph diverges from nested tree behavior. | High | Medium | Dual-read parity tests; feature flag fallback; recursive helpers retained as oracle. |
| R02 | Incremental totals produce incorrect project totals. | High | Medium | Delta tests against full recompute; random fixture property tests; rollback fallback. |
| R03 | Route fast path leaks unauthorized data. | Critical | Low | Authorization-first tests; fail-closed route behavior; security review. |
| R04 | New indexes improve reads but hurt writes/free-tier posture. | Medium | Medium | D1 before/after proof includes writes and rows read/written. |
| R05 | Browser performance tests become flaky. | Medium | Medium | Deterministic fixtures; serial perf tests; no sleeps; flake budget. |
| R06 | Express editor virtualization disablement mounts too many rows. | High | Medium | Browser stress proof; portal/pinned editor fallback. |
| R07 | Search behavior changes for unloaded subtrees. | Medium | High | Explicit product decision: loaded-only vs server-assisted. |
| R08 | Subtree merge duplicates or reorders nodes. | High | Medium | Stable id merge tests; order parity tests; completeness flags. |
| R09 | Entity rollback mishandles concurrent mutation failure. | High | Medium | Operation-id patch log; revision conflict tests; maker/checker review. |
| R10 | Client bundle grows due graph/store abstractions. | Medium | Low | Use existing dependencies; measure bundle if touched; keep modules small. |
| R11 | Proposal preview/history accidentally move heavy materialization into hot path. | Medium | Medium | Keep materialization behind explicit open actions; profile separately. |
| R12 | Performance proof artifacts contain sensitive data. | Critical | Low | Sanitized fixtures; redaction tests; no raw env output. |
| R13 | Over-limit truncation creates false totals. | High | Medium | Preserve truncation UX; disable unsafe moves; export full-data path documented separately. |
| R14 | D1 hosted proof leaves seeded records. | Medium | Low | Cleanup count assertion; isolated fixture prefix; fail closed. |
| R15 | Too much architecture before proof. | Medium | Medium | Phase 0 baseline gate; no optimization coding before evidence. |

## Highest-Risk Decision

The highest-risk technical decision is introducing a normalized graph store. The plan reduces risk by:
- Building it first as a read model.
- Keeping the nested facade.
- Comparing every selector against current helpers.
- Moving one hot path at a time.
- Keeping feature flag rollback.

