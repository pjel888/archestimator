# Performance Cache Budgets Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U3/U6; QA-006, QA-020, QA-024; ADV-001, ADV-011,
  ADV-020.
- Claim: the estimate-sidebar lite loader is bounded and cache-scoped; provider
  schema now has indexes for the bounded item page plus related price/cost
  reads.
- Proof category: local static tests, typecheck, provider query-plan proof.
- Local implementation facts:
  `SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT = 50`,
  `SIDEBAR_COMPONENT_LIBRARY_MAX_LIMIT = 100`,
  `SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS`, bounded `.limit(limit)`, bounded
  `.in("item_id", itemIds)`, and project row `.limit(projectRowLimit)` are
  asserted by tests.
- Commands/results:
  sidebar/cache static test slice passed `5` files and `21` tests;
  `bun run type-check` passed.
- Provider SQL-006A:
  item-page EXPLAIN used `cost_library_items_sidebar_lite_idx`, node type
  `Index Scan`, actual rows `50`, execution time about `0.296 ms`.
- Provider indexes added:
  `cost_library_items_sidebar_lite_idx`,
  `cost_library_price_options_sidebar_item_idx`,
  `cost_library_cost_entries_sidebar_item_idx`,
  `cost_library_cost_review_queue_idx`.
- Provider retry:
  literal-shape related-query and SQL-006B queue EXPLAINs were retried after
  temp-role throttling cleared. The linked-project CLI role currently sees `0`
  library rows through the hardened policies, and the queue EXPLAIN therefore
  chose a zero-cost sequential scan. This proves the provider is reachable and
  the query shapes are valid, but it is not representative latency proof.
- Residual risk:
  row-count-representative related-query/queue EXPLAIN remains future
  performance work, ideally after provider migration-history drift is
  reconciled and a privileged maintenance role or seeded fixture can see the
  intended data volume. The live dataset previously had only `155` cost
  entries, so a 5,000-row fixture proof also remains future scale work.
- Owner lane: cache/performance.
- Evidence privacy check: pass.
