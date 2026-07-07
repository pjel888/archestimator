# 01 — Executive Summary

## One-paragraph verdict

Archestimator's **D1 restore** story is *partially* proven: a local-only SQLite
rehearsal script (`scripts/generate-cloudflare-d1-restore-rehearsal.ts`) proves
that a sanitized schema+data dump round-trips through SQLite with matching row
counts, checksums, and a clean foreign-key check, and it documents the
`wrangler d1 export`/`execute`/`time-travel restore` commands and a short
destructive-restore runbook. But it **does not prove a hosted D1 restore**, and
the **R2 restore story is essentially absent**: there is no object inventory,
no export tooling, no restore drill, and no RTO/RPO contract. This plan pack
specifies, for the **current free-tier Cloudflare posture**, exactly how to
close those gaps with a phased implementation that stays inside the bound
resources (`ARCH_DB`, `ARCH_UPLOADS_R2`) and inside free-tier quotas — and it
makes the local-vs-provider proof boundary explicit so readiness is never
falsely claimed.

## What this pack is

A **planning-only** exhaustive package (high-blast-radius: D1 + R2 + data
integrity). It does **not** change code, tests, migrations, config, scripts, or
provider state. It defines what a future executor must build and prove.

## Current state (evidence-backed)

| Surface | Current capability | Source | Gap |
|---|---|---|---|
| D1 backup (automatic) | Cloudflare **Time Travel**: any minute within **7 days** (Workers Free) / 30 days (Paid). Per-minute granularity; restore by timestamp/bookmark. | [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/) | None for short-window recovery; 7-day free RPO for older data (OPEN-02). |
| D1 export | `wrangler d1 export ARCH_DB --remote --output=…` produces a `.sql` dump (schema + data). No incremental mode. | [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/) | No automated/scheduled export; manual only. |
| D1 restore (rehearsal) | Local SQLite dump→import round-trip on sanitized fixtures; row/checksum/FK proof; temp artifacts cleaned. | `scripts/generate-cloudflare-d1-restore-rehearsal.ts:223-294` | **Local-only; no hosted D1 round-trip proof.** |
| D1 restore (hosted) | `wrangler d1 time-travel restore` (destructive, in-place) or `execute --remote --file=…` (into a named DB). | [D1 wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/) | **Not rehearsed against a provider;** target-isolation procedure not documented. |
| R2 backup | **No native object versioning** (docs 404; community confirms). 11-nines durability via replication/erasure coding (design target, not contractual SLA). | [R2 durability](https://developers.cloudflare.com/r2/reference/durability/) | No version history → user-error delete/overwrite is unrecoverable without an app-owned copy. |
| R2 inventory | No `wrangler r2 object list`. Must use REST API (`/objects/list`), S3 `ListObjectsV2`, or `bucket.list()` in a Worker. | [R2 list API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/list/), [wrangler issue #13008](https://github.com/cloudflare/workers-sdk/issues/13008) | **No inventory tooling exists in the repo.** |
| R2 export/restore | `wrangler r2 object get`/`put` (must append `--remote`). | [R2 wrangler commands](https://developers.cloudflare.com/r2/reference/wrangler-commands/) | **No restore drill; no sample export tooling.** |
| RTO/RPO | Cloudflare publishes **no contractual RTO/RPO** for D1 or R2. | Research lane | Must be **derived** from the free-tier features and stated as a target, not a guarantee. |
| Cron triggers | **3 per Worker** (free); account-wide unlimited. Archestimator already uses 3 (`0/15/30 3 * * *`). | [Cron triggers blog](https://blog.cloudflare.com/introducing-cron-triggers-for-cloudflare-workers/) | All 3 cron slots are occupied — an automated backup cron needs a different Worker or replacing an existing one (OPEN-02). |

## Target state (what the future implementation delivers)

1. **D1 restore target isolation** — a documented, free-tier-safe procedure to
   restore into an **isolated staging D1 DB** (the `preview_database_id`
   `363c756a-7c4d-42fe-908f-6d328bfa4acb` or a separately named staging DB),
   never the production `database_id` `9bdb29bb-…`, for non-destructive drills.
2. **Provider-backed D1 rehearsal** — export from staging → re-import into a
   *second* isolated DB → row/checksum/FK/authorization-denial proof, with the
   option (OPEN-01) to run it once against real provider state.
3. **R2 inventory + reconciliation** — a Worker/REST/S3-API tool that lists
   `archestimator-proof-uploads` objects and reconciles them against
   the composite `(storage_bucket, storage_path)` of both `upload_assets`
   and `cost_library_item_variant_attachments` (orphan objects vs dangling rows).
4. **Selective R2 export/restore drill** — get one sampled object to local,
   re-put it, verify sha256/etag round-trip.
5. **RTO/RPO contract** — stated targets (D1 RPO ≤ 7 days free via Time Travel;
   D1 RTO = drill-measured; R2 RPO ≈ 0 for infra failure, **undefined for user
   error**) with the proof that bounds each.
6. **Failure drill matrix + operator runbook** — corruption, accidental delete,
   partial restore, oversized export, provider outage, drill rollback.
7. **Local-vs-provider evidence ledger** — exactly what cannot be proven
   locally, so the runtime portions stay `CONDITIONALLY READY` until the
   provider drill is owner-approved.

## Major findings

- **Architecture**: The restore story is split-brained — D1 has a rehearsal
  script but only locally; R2 has durable storage but no recovery tooling at
  all. Both need a small, free-tier-safe tooling layer, not a paid backup
  product.
- **Security**: The existing rehearsal is correctly **secret-free** (no env
  reads, no provider calls, temp artifacts cleaned). The future provider-backed
  drill must preserve that property and add restore-target isolation so a
  destructive restore can never hit production by accident.
- **Performance/reliability**: Export size scales with data volume and is
  bounded by the **5M rows-read/day** free-tier quota. The RTO of a Time Travel
  restore is size-dependent and not publishable from a local rehearsal — it
  must be measured at production volume (external proof, OPEN-01).
- **Cost**: All proposed drills fit inside free-tier quotas at current
  pre-launch data volume. The only cost risk is an **automated daily export
  cron** consuming rows-read quota as data grows (OPEN-02).

## Verdict

`CONDITIONALLY READY`. The planning pack is complete and internally consistent.
The *implementation* of the missing tooling is well-defined and free-tier-safe.
The portions that remain blocked are the **provider-backed restore drill**
(OPEN-01, needs owner approval because it touches real provider state) and the
**automated backup cadence** decision (OPEN-02, needs owner approval because of
quota posture). Emulated verification caps overall readiness at 97.

## Files intentionally unchanged by this planning task

`wrangler.jsonc`, `package.json`, `scripts/*`, `migrations/*`,
`supabase/migrations/*`, `src/**`, and any provider state. Only files inside
this plan folder were created.
