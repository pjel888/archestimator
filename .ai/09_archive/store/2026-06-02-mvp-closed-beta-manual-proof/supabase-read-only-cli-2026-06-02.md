# Supabase Read-Only CLI Evidence - 2026-06-02

Scope: linked Supabase project `ebxxqidacheyapmmzavr`.

Commit before evidence capture: `db9b224`.

This is a provider-evidence capture, not a launch approval. No schema, data, storage object, backup, restore, migration repair, or configuration mutation was attempted.

## Commands

| Command | Result | Launch meaning |
| --- | --- | --- |
| `supabase --version` | `2.98.2`; CLI reported `2.103.0` available. | CLI is available but not latest. |
| `supabase backups list --project-ref ebxxqidacheyapmmzavr -o json` | Pass. Output showed `"backups": []`, `"pitr_enabled": false`, `"region": "ap-southeast-2"`, and `"walg_enabled": true`. | Backup/PITR row is not passable. PITR is disabled, no listed backups were returned, and no restore drill was run. |
| `supabase db advisors --linked --type security --level warn --fail-on none -o json` | Pass with WARN findings. Observed findings included mutable function search paths, public `component-images` bucket listing, anon-executable `SECURITY DEFINER` functions, authenticated-executable `SECURITY DEFINER` functions, and leaked password protection disabled. | Security/RPC/storage row is not passable. Findings require triage or explicit accepted-risk documentation before closed beta. |
| `supabase migration list --linked` | Failed after retries. CLI hit Supabase temp-role pooler `ECIRCUITBREAKER` and ended with `Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD`. | Migration-history proof remains blocked through this CLI path. |
| `supabase db advisors --linked --type performance --level warn --fail-on none -o json` | Failed after retries. CLI hit `failed SASL auth`, Supabase temp-role pooler `ECIRCUITBREAKER`, then the same `SUPABASE_DB_PASSWORD` guidance. | Performance advisor proof remains blocked through this CLI path. |

## Current Evidence Status

| P0 row | Status after this capture | Notes |
| --- | --- | --- |
| Supabase backup/PITR | fail / blocked | Provider readback says PITR is disabled and no backups are listed. Restore drill still missing. |
| Linked/staging Supabase migrations | blocked | CLI migration list could not connect through the linked temp role. |
| Storage/RPC security | fail / blocked | Security advisor surfaced WARN findings. The broad advisor output is intentionally summarized here instead of pasted wholesale. |

## Follow-Up Required

1. Enable/confirm the intended backup/PITR posture for the linked or staging project.
2. Run and record a restore drill or documented dry-run restore owner/target.
3. Resolve the temp-role pooler authentication/circuit-breaker path or use an approved read-only SQL evidence route.
4. Triage Supabase security advisor WARNs before any launch approval, especially public bucket listing, anon-executable `SECURITY DEFINER` functions, and leaked password protection.
