# UNIT-012 Lifecycle Evidence

Recorded: 2026-07-11

## Delivered Contract

- `migrations/0065_activity_history_lifecycle.sql` adds workspace-scoped
  activity outbox and legal-hold state. Its SHA-256 is
  `a33aaa5d24052ea60d836416faf64678dab8e4c1d34a5f0e1b40f8dea7ec2f00`.
- History inserts and their outbox records are one D1 batch. Direct row, tab,
  node, template, estimate-detail, and component-propagation mutations now
  share that batch with their required history/outbox records.
- Actor erasure pseudonymizes only the requested workspace; privacy export
  returns the activity fields needed for the request without actor PII.
- Legal holds prevent retention anonymization and retain a redacted skip
  receipt.

## Verification

The fresh local D1 migration replay reached `0065` successfully.

`bunx vitest run tests/vitest/activity-durable-write.test.ts tests/vitest/activity-outbox.test.ts tests/vitest/activity-tenant-isolation.test.ts tests/vitest/activity-lifecycle-repository.test.ts tests/vitest/compliance-retention-repository.test.ts tests/vitest/compliance-privacy-request-repository.test.ts tests/vitest/project-activity-repository.test.ts`
passed the durable-write, retry, legal-hold, anonymized-actor, privacy
export/erase, and workspace-isolation fixtures. The durable-write fixture also
forces a batch failure and proves no sequential write fallback occurs.

`rg` confirmed no `run`/`insertRecord`/`runBatch` mutation in
`src/lib/estimates/d1-action-client.ts` remains before a later
`insertHistoryEvent` call. Large component propagation, template insertion,
and tab duplication fail before mutation when they cannot fit in one D1 batch.

## Recovery

The reconciler marks only an outbox record whose event is absent for bounded
retry; it never fabricates an event. A missing event is therefore an explicit
operator-repair signal rather than false audit history.
