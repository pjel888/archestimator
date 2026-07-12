# Cloudflare D1 Restore Rehearsal

Generated: 2026-06-29T19:23:01.217Z

Local-only D1 export/import restore rehearsal. It creates temporary SQLite databases from sanitized fixture data, dumps SQL, imports into a fresh database, verifies rows/checksums/foreign keys, and removes temp artifacts. It does not read env files, print secret values, call Cloudflare APIs, create D1 databases, deploy Workers, change DNS, run Time Travel restore, or prove a hosted D1 restore.

## Summary

| Gate | Ready |
| --- | --- |
| D1 export command ready | yes |
| D1 import command ready | yes |
| Local restore rehearsal ready | yes |
| Destructive restore documented | yes |
| Local-only proof | yes |
| Provider-backed D1 proof | no |

## Commands

| Use | Command |
| --- | --- |
| SQL export | `wrangler d1 export ARCH_DB --remote --output=./backups/arch-db-YYYYMMDDTHHMMSSZ.sql` |
| SQL import | `wrangler d1 execute ARCH_DB --remote --file=./backups/arch-db-YYYYMMDDTHHMMSSZ.sql` |
| Local rehearsal shape | `sqlite3 source.db .dump > export.sql && sqlite3 restored.db < export.sql` |
| Destructive Time Travel restore | `wrangler d1 time-travel restore ARCH_DB --timestamp=<ISO-8601-or-unix-timestamp>` |

## Local Rehearsal

| Item | Value |
| --- | ---: |
| SQLite version | 3.54.0 |
| Fixture tables | 5 |
| Source rows | 11 |
| Restored rows | 11 |
| Export SQL bytes | 2168 |
| Foreign-key violations | 0 |
| Temp artifacts removed | yes |

## Checks

| Check | Result | Evidence |
| --- | --- | --- |
| SQLite export includes schema statements | PASS | exportSqlBytes=2168 |
| SQLite export includes representative data | PASS | sourceRows=11 |
| Imported database row counts match source | PASS | sourceRows=11, restoredRows=11 |
| Imported database checksum matches source | PASS | sourceChecksum=c3944fdad520db367b8ead97aec70cb9f7eedec24f8858068e1f52f107a44793, restoredChecksum=c3944fdad520db367b8ead97aec70cb9f7eedec24f8858068e1f52f107a44793 |
| Imported database passes foreign-key check | PASS | foreignKeyViolations=0 |

## Destructive Restore Runbook

- Take a fresh SQL export before any hosted restore command.
- Confirm the target D1 database name, database id, account, and environment are the intended Archestimator target.
- Treat `wrangler d1 time-travel restore` as destructive because it overwrites the database with a prior state.
- Run destructive restore only in a staging or rehearsal D1 database until owner-approved production cutover.
- After restore, run schema drift, row-count, foreign-key, authorization-denial, RPC golden-fixture, and route smoke checks before traffic.

## Official Docs

- D1 import/export data: https://developers.cloudflare.com/d1/best-practices/import-export-data/
- Wrangler D1 commands: https://developers.cloudflare.com/d1/wrangler-commands/
- Time Travel restore: https://developers.cloudflare.com/d1/wrangler-commands/#time-travel-restore

## Blockers

- (none)
