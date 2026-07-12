# Data, Migrations, APIs, Performance, and Cost

## Migration Protocol

- active D1 migrations live only in `migrations/`;
- re-list immediately before allocation because the shared worktree has concurrent migrations through at least the current Activity/Corporate work;
- use the Beta Program migration lease/generation protocol and source-matched generation receipt;
- never edit applied migrations or extend legacy Supabase migrations;
- each migration includes clean replay, fixture upgrade, constraints/index proof, rollback/fix-forward plan, and provider boundary;
- schema changes remain additive until readers/writers have migrated and rollback window closes;
- Better Auth runtime-managed tables require official/current schema confirmation before manual indexing/alteration.

## Repository Boundaries

- admin UI calls typed server actions/repositories, never D1 directly;
- admin composition repositories may join bounded read models but cannot bypass domain authorization;
- User 360 adapters expose normalized/redacted DTOs and partial-source metadata;
- notification campaign repository owns lifecycle; inbox repository owns current-user feed/engagement;
- queue/cron handlers call idempotent domain commands;
- external provider clients are isolated behind cache/quota/degrade contracts;
- errors use structured logging and safe operator messages.

## API Contract

Use Server Components/Actions where they fit. Route handlers exist only for real HTTP consumers, streaming/export, DO/queue/provider callbacks, or polling where action semantics are unsuitable.

Every admin endpoint:

- derives current identity server-side;
- checks exact capability;
- validates typed input and complexity;
- uses `private, no-store` for sensitive data;
- returns bounded DTOs and stable errors;
- logs redacted failure metadata;
- rate-limits expensive/sensitive operations;
- carries request/correlation/idempotency identifiers;
- has direct denial tests.

Remove placeholder APIs if no consumer requires them.

## Query and Index Plan

Use `EXPLAIN QUERY PLAN` and seeded-cardinality tests for:

- user search/filter/sort and identity mismatch;
- last-login/heartbeat/product-activity rollups;
- membership footprint;
- normalized activity pagination per source;
- campaign status/schedule/history;
- due job claim and lease recovery;
- recipient/materialization reconciliation;
- notification engagement aggregates;
- audit filters;
- support SLA/unread;
- operations/incident trends.

Avoid per-user N+1. Use page-scoped aggregates, batched ID reads, rollup tables, and bounded independent queries. Count queries may be cached or approximate only when labeled.

## Performance Budgets

Initial local targets at representative seeded size; refine after baseline:

- admin route server data p95 <= 600 ms for overview/list first render;
- user list/query p95 <= 300 ms at 10k users;
- User 360 summary p95 <= 500 ms; each deferred tab p95 <= 800 ms;
- timeline page p95 <= 500 ms with 50 events and partial-source timeout <= 1.5 s;
- campaign list/detail p95 <= 400 ms;
- audience preview p95 <= 1 s for common selectors at 10k users;
- publish request acceptance <= 500 ms independent of audience size;
- scheduler lag target <= configured sweep interval + 60 s;
- recipient chunk CPU/read/write bounded below Worker/D1 limits with <= 100 recipients initially unless benchmark proves more;
- admin-only chart/editor code excluded from non-admin bundles;
- no one failed tile blocks the entire page.

Budgets are acceptance targets, not claims about current performance. Hosted budgets require hosted evidence.

## Scale and Reliability

- user and campaign lists use cursor pagination;
- timeline adapters enforce per-source limits/timeouts;
- fanout is async and chunked;
- queue retries are idempotent and individually acknowledged where supported;
- D1 write contention is measured; avoid long transactions and hot global counters;
- rollups are rebuildable from source events or carry explicit non-rebuildable status;
- reconciliation is bounded/resumable;
- cached provider metrics display source time and cache age.

## Free-Tier Cost Budget

Before enabling scheduled/fanout/provided analytics:

- calculate, for each campaign occurrence with `N` evaluated users, `E` eligible, `X` excluded, `C` chunk size, and `R` retried chunks: D1 candidate reads `N`, recipient-ledger writes `N`, delivery writes `E`, progress/job/event writes `<= 8 + 4*ceil(E/C) + 3R`, and reconciliation reads `N + E`; record deviations from this upper-bound model;
- calculate Queue operations as initial chunk messages `ceil(E/C)`, consumer deliveries/acks `2*ceil(E/C)`, retry deliveries/acks `2R`, and DLQ transfer/read operations separately; no retry budget assumes zero failures;
- calculate Cron/Worker invocations from sweep frequency plus bounded expanded occurrences, future-enrollment windows, digest buckets, outbox recovery, and reconciliation; show campaigns/day and peak concurrent occurrences;
- run the representative 10k-user table for 1, 5, and 20 campaign occurrences/day at 50%, 90%, and 100% eligibility, plus 0%, 1%, and 5% retry rates;
- estimate DO alarms/storage only if selected;
- confirm current free-tier included limits from official Cloudflare docs at implementation time;
- refuse enablement when modeled normal-day usage exceeds 50% of any verified daily included quota, modeled peak/retry day exceeds 70%, or retained recipient evidence exceeds the measured storage headroom; require an explicit smaller cap, lower frequency, retention reduction that preserves audit semantics, or AUTH-001 approval before proceeding;
- initial guard defaults are max audience 10,000, chunk size 100, two concurrent campaign consumers, one preview per operator per 10 seconds, three recoverable attempts, one bounded recurrence-expansion horizon, and one future-enrollment sweep per configured scheduler interval; benchmark may lower these and may raise them only while the 50%/70% headroom gates remain green;
- do not enable paid add-ons without explicit approval.

UNIT-009 cannot pass with prose-only cost review. Its receipt must include the current official quota source/version, formulas, seeded measurements, resulting operations/day and storage projection, chosen caps, stop decision, and the kill-switch/readback command. Hosted UNIT-017 repeats the calculation with observed queue/D1/Worker metrics before release.

## Data Integrity Gates

- clean migration replay and upgrade from current local schema;
- foreign-key/invariant/unique checks;
- orphan scans for auth/profile, campaign/version/run/job, definition/delivery, and user deletion;
- idempotent backfill of legacy broadcasts;
- cancellation/retraction and retention compatibility;
- backup/restore rehearsal for new tables where release risk warrants it;
- final migration lease receipt matches source and manifest.
