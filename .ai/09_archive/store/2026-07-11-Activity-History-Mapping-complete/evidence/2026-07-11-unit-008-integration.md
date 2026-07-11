# UNIT-008 Integration Evidence

Recorded: 2026-07-11

The declared Activity-History-Mapping Vitest command passed **33 files / 402
tests / 0 failures**. Its machine-readable report was written to
`/tmp/activity-history-suite.json` for the run and summarized in the scoped
contribution receipt at
`.ai/99_scratch/release-integrity/activity-history-contribution.json`.

`tests/vitest/activity-plan-ownership.test.ts` validates that:

- `0060_activity_history_indexes.sql` and
  `0065_activity_history_lifecycle.sql` are consumed migrations, not live
  allocation overlaps;
- the scoped contribution enumerates exact file hashes; and
- the integration result is complete.

The maintainability receipt records the required retention decision: repository
consolidation is deferred and was not implemented in this plan pack.
