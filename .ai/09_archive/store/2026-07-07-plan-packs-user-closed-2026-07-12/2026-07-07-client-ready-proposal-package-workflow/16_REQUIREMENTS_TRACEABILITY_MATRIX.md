# 16 — Requirements Traceability Matrix

Legend — Status: `planned` (this pack), `blocked-external`, `discovery`. Every requirement maps to: source, user outcome, implementation phase, task IDs, code areas, acceptance criteria, test coverage, rollout check, status.

| Requirement ID | Source | User outcome | Phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-01 | brief+repo | owner gets a clear ready/not-ready answer | P1 | 1.1, 1.2 | `src/lib/proposal-readiness/` | AC-FR-01a/b/c | TEST-01 | gate flag on (closed beta) | planned |
| FR-02 | brief | missing data blocks send | P1 | 1.1 | `proposal-readiness` | each blocker id returned | TEST-02 | gate flag on | planned |
| FR-03 | brief | stale/source risks surfaced | P1 | 1.1 | `proposal-readiness` (reuses helpers) | each warning id returned | TEST-03 | UI flag on | planned |
| FR-04 | brief | send/publish gated server-side | P2 | 2.1, 2.2 | `publication/actions.ts` | AC-FR-04a/b | TEST-04 | gate flag on | planned |
| FR-05 | brief | owner composes recipient message | P4 | 4.1–4.4 | `publication/actions.ts`, `RecipientEmailComposer`, migration `0037` | AC-FR-05a/b/c/d | TEST-07 | message flag on | planned |
| FR-06 | brief | honest delivery labels | P6 | 6.3 | `RecipientEmailComposer` | AC-FR-06a/b/c | TEST-09 | UI flag on | planned |
| FR-07 | brief+repo | decision flips `responded` | P3 | 3.1, 3.2 | `d1-store.ts`, `public-repository.ts` | recipient=`responded` post-decision | TEST-10, TEST-15 | responded flag on | planned |
| FR-08 | derived | owners notified of activity | P5 | 5.1, 5.2 | `notifications/dispatch.ts`, `publication/actions.ts` | unread bumps; scoped; non-blocking | TEST-11 | notifications flag on | planned (DATA-04) |
| FR-09 | brief | resend/revoke gated by readiness | P6 | 6.3 | `PublisherDrawer`, `RecipientEmailComposer` | buttons disabled while blocked | TEST-12 | UI flag on | planned |
| UX-01 | brief | preflight in drawer | P6 | 6.1 | `PublisherDrawer`, `drawer-actions.ts` | AC-UX-01a/b/c | TEST-05 | UI flag on | planned |
| UX-02 | brief | readiness hints in export dialog | P6 | 6.2 | `ProposalExportPreviewDialog.tsx` | warnings subset rendered | TEST-06 | UI flag on | planned |
| UX-03 | derived | message UI in composer | P4 | 4.3 | `RecipientEmailComposer.tsx` | inputs + char counts + validation | TEST-08 | message flag on | planned |
| UX-04 | brief | terms note at send | P6 | 6.3 | drawer/composer | note + link render | TEST-13 | UI flag on | planned |
| ARCH-01 | derived | readiness server-only | P1 | 1.1 | `proposal-readiness/` | no client import | TEST-14 | n/a | planned |
| ARCH-02 | repo | reuse snapshot redaction | P1 | 1.1 | `proposal-readiness` | reuse documented | TEST-14 | n/a | planned |
| ARCH-03 | derived | optional unified CTA | (v1.1) | — | `EstimateHeaderActions`, dialog | n/a | n/a | n/a | deferred (P2) |
| DATA-01 | derived | readiness DTO type | P1 | 1.1 | `proposal-readiness/types.ts` | type exported | TEST-01 | n/a | planned |
| DATA-02 | derived (DEC-02) | message persisted | P4 | 4.1 | migration `0037` | columns exist | migration apply + PRAGMA | remote apply proof | planned |
| DATA-03 | repo | responded needs no migration | P3 | — | n/a | n/a | n/a | n/a | planned (none needed) |
| DATA-04 | repo | confirm notification tables | P0 | 0 | `migrations/` grep + PRAGMA | exists/absent determined | n/a | n/a | discovery |
| SEC-01 | derived | message plain text + escaped | P4 | 4.2 | `publication/actions.ts` | over-limit reject; escaped render | TEST-07 | n/a | planned |
| SEC-02 | derived | no internal leak | P1 | 1.2 | `proposal-readiness` | DTO clean | TEST-14 | n/a | planned |
| SEC-03 | repo | reuse manager gate | P2 | 2.1 | `publication/actions.ts` | gate inside action | TEST-04, TEST-15 | n/a | planned |
| SEC-04 | derived | notifications workspace-scoped | P5 | 5.1 | `notifications/dispatch.ts` | cross-workspace unaffected | TEST-11 | n/a | planned |
| PERF-01 | derived | readiness ≤ 50ms p95 | P1 | 1.2 | bench | p95 ≤ 50ms | PERF bench | bench green | planned |
| PERF-02 | derived | parallel prefetch | P6 | 6.1 | `drawer-actions.ts` | no extra round-trip | drawer test | n/a | planned |
| REL-01 | brief | bounce ingestion | (blocked) | — | `api/webhooks/email-events` | webhook authenticates + idempotent | denial test | n/a | blocked-external |
| REL-02 | derived | readiness fail = structured error | P1/P2 | 1.1, 2.1 | `proposal-readiness`, actions | returns `readiness_unavailable` warning | unit test | n/a | planned |
| REL-03 | derived | notifications non-blocking | P5 | 5.1 | `notifications/dispatch.ts` | parent unaffected on dispatch fail | TEST-11 | n/a | planned |
| OPS-01 | derived | feature flags | P7 | 7.1 | flag mechanism | each slice toggleable | manual | flag proof | planned |
| OPS-02 | derived | rollback = no-op | P7 | 7.1 | flags | baseline behavior restored | manual | rollback drill | planned |
| TEST-01..15 | acceptance | (see 04/12) | per-phase | per test | test files | green | run | n/a | planned |
| DOC-01 | repo | state log + decisions | P7 | 7.2 | `.ai/10_state/*` | entries appended | n/a | n/a | planned |

## Performance-sensitive requirements (perf mapping)

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| FR-01/PERF-01 | n/a (new) | p95 ≤ 50 ms | PERF bench | > 50 ms p95 | move prefetch off critical path / flag off |
| PERF-02 | today's drawer TTI | ≤ baseline + 30 ms p95 | local Profiler / bench | > baseline + 50 ms | UI flag off |
| FR-07 | today's decision submit | ≤ baseline + 5 ms | action test | > baseline + 20 ms | responded flag off |
| FR-04 | today's publish | ≤ baseline + 50 ms | action test/logs | > baseline + 100 ms | gate flag off |

No requirement is untraced. Every implementation task (work package) maps back to ≥1 requirement (see `11`).
