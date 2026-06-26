# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Mitigation |
|---|---|---|---|---|---|---|
| RISK-1 | Free-form QTY text input accepts malformed content | User types invalid expression | Medium | Medium | Medium | Strict parser strips whitespace only and rejects invalid characters, missing operands, negatives, exponent notation, and commas |
| RISK-2 | Legacy row semantics accidentally change | New math reads old `contingencyPercentage` as quantity-mode | Medium | High | High | `quantityBase = NULL` is the legacy discriminator; no data rewrite; tests cover legacy rows and export |
| RISK-3 | Surplus row does not exist | Implementer tries to place Adjustment after a nonexistent row | Medium | Low | Low | Ship totals-area Adjustment below row table now; future surplus row can be inserted above it |
| RISK-4 | `update_estimate_row_item_with_history` drops new fields | UI saves values but RPC/history snapshot omits them | Medium | High | High | Update RPC payload/update/diff/snapshot in Phase 2 and test DB row plus history payload |
| RISK-5 | Adjustment table lacks complete RLS | Viewer/non-member writes sheet adjustment | Low | High | High | Add SELECT/INSERT/UPDATE/DELETE RLS and action-level `canEditEstimate`; auth tests for viewer/non-member |
| RISK-6 | Export double-counts contingency | Quantity-mode row still emits subtotal contingency while sheet adjustment also applies | Medium | High | High | Export rule: `quantityBase != null` -> row contingency subtotal `0`; sheet adjustment applied once |
| RISK-7 | Realtime broadcast tampering or drift | Malicious/stale client sends fake row event | Medium | Medium | Medium | Separate row-update event; validate estimate, row, revision/timestamp, numeric bounds; display-optimistic only |
| RISK-8 | Contingency cell direct edit conflicts with chip source of truth | User edits percentage after chip exists | Medium | Medium | Medium | Chip rows make Contingency read-only; direct percentage entry only creates initial expression on plain rows |
| RISK-9 | Chip overlaps unit label or fails on touch | Narrow/mobile layout | Medium | Low | Low | Define responsive two-row/overlay editor, 44px controls, focus matrix, and manual browser QA |
| RISK-10 | Type changes cascade through snapshots/repositories | `type-check` or runtime hydration fails | Medium | Medium | Medium | Update generated types, repositories, route context selectors, row snapshots, publication/share serializers |
| RISK-11 | Migration locks or fails | Additive migration on existing table | Low | Medium | Medium | Nullable columns, separate table, local migration rehearsal, no data rewrite |
| RISK-12 | Implementation time overruns from cross-cutting persistence | UI, RPC, export, history, RLS all touched | Medium | Medium | Medium | Seven-phase plan with persistence before UI, targeted validation per phase, and maker/checker review |
