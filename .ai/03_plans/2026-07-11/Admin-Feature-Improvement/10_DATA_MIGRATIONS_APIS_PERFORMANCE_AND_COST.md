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

- estimate D1 reads/writes per active user, campaign, recipient, retry, and reconciliation;
- estimate Queue operations including retries/DLQ;
- estimate Cron frequency and Worker invocations;
- estimate DO alarms/storage only if selected;
- confirm current free-tier included limits from official Cloudflare docs at implementation time;
- add operational guards for max audience, chunk size, concurrency, preview frequency, and retry count;
- do not enable paid add-ons without explicit approval.

## Data Integrity Gates

- clean migration replay and upgrade from current local schema;
- foreign-key/invariant/unique checks;
- orphan scans for auth/profile, campaign/version/run/job, definition/delivery, and user deletion;
- idempotent backfill of legacy broadcasts;
- cancellation/retraction and retention compatibility;
- backup/restore rehearsal for new tables where release risk warrants it;
- final migration lease receipt matches source and manifest.
