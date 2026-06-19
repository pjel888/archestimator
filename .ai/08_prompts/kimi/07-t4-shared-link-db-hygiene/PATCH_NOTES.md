# Patch Notes: T4 Shared-Link DB Hygiene

Create or update this file if Kimi changes source, tests, scripts, migrations, or docs.

## Changed files

- `path`: reason

## Behavior intended to remain unchanged

- T4 is not applied as one monolithic blob.
- Index drops remain gated on live zero-scan/EXPLAIN evidence.
- `pg_cron` work remains provider-gated.

## Validation per changed area

Record command and result for each changed area.

## Conflict notes

Document pre-existing dirty files and any same-file conflict handling.
