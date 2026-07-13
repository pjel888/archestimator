# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting decisions for the stack surfaces this pack
touches (D1, R2, Wrangler, CLI tooling, evidence). Next.js/React/Tailwind are
**out of scope** (no UI) and explicitly marked not-applicable with reason.

## Cloudflare D1

- **Active binding**: `ARCH_DB` (`archestimator-proof-db`, prod id
  `9bdb29bb-687e-4f51-ae81-7659c426ea5f`, preview `363c756a-…`). Source:
  `wrangler.jsonc`.
- **Backup mechanisms**: Time Travel (automatic, 7-day free / 30-day paid,
  per-minute, restore by timestamp/bookmark) + manual `wrangler d1 export`
  (full `.sql`, no incremental). No other native backup.
- **Restore**: `wrangler d1 execute <TARGET> --remote --file=…` (into a named
  isolated DB) for drills; `wrangler d1 time-travel restore` (destructive,
  in-place) for production recovery only — **never drilled**.
- **Target isolation**: hard script assertion dest ≠ prod id (REQ-SEC-02).
- **Free-tier limits**: 500 MB/DB, 5 GB/account, 5M rows-read/day, 100k
  rows-written/day, 7-day Time Travel. Source: [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/).
- **Migrations**: `./migrations/` (38 files, latest `0038`); this pack changes
  none. Legacy `supabase/migrations/` never extended.
- **Privacy interaction**: restore resurrects erased rows → runbook re-erasure
  check (REQ-SEC-03).

## Cloudflare R2

- **Active binding**: `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`, preview
  `archestimator-proof-uploads-dev`). Source: `wrangler.jsonc`.
- **Object key shape**: `${logicalBucket}/${path}`, path = `projects/{id}/…`;
  safety via `assertSafeLogicalBucket` / `assertSafeStoragePath` (reuse).
- **Backup reality**: **no native versioning** (docs 404); 11-nines durability
  (design target, not SLA); lifecycle rules = retention/transition (not
  versions); `wrangler r2 object list` **absent** (use REST/S3/Worker).
- **Inventory**: REST `POST /objects/list` or S3 `ListObjectsV2` or Worker
  `bucket.list()` — CLI+REST default.
- **Restore drill**: `wrangler r2 object get --remote` → `put --remote` into
  **preview** bucket; verify sha256/etag; clean up.
- **Free-tier limits**: 10 GB-month storage, 1M Class A ops/month, 10M Class B
  ops/month, $0 egress. Source: [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## Wrangler / toolchain

- **Auth**: operator `CLOUDFLARE_ACCOUNT_ID` + scoped `CLOUDFLARE_API_TOKEN`
  (never in repo); verify with `cf:check-wrangler-auth`.
- **Timeouts**: reuse `scripts/wrangler-undici-timeout.mjs` import for the
  provider-backed drill (mirrors `cf:deploy`).
- **Report shape**: all new tools emit the existing
  `{ generatedAt, mode, sources, commands, …Ready gates, blockers, note }`
  shape (DEC-06).
- **Secret hygiene**: no `.env*` reads; redact ids/keys; never persist raw
  object bytes (REQ-SEC-01).

## Cron / Queues / Durable Objects / Email (out of scope, recorded)

- **Cron**: 3 triggers used (`0/15/30 3 * * *`); all slots occupied → OPEN-02
  must free a slot or add a new Worker for an automated backup cron.
- **Queues / DO / Email**: not covered by this D1/R2 pack; separate operational
  surfaces.

## Next.js / React / Tailwind / TypeScript (N/A with reason)

- **Not applicable**: no UI, no route, no client bundle, no Server Action, no
  cache/revalidation, no streaming, no design-system primitive is touched.
- TypeScript applies only to the new CLI scripts: typed boundaries, no `any`,
  runtime validation at the wrangler.jsonc parse boundary (JSONC strip +
  schema check).

## Evidence / production-readiness standards

- Every drill emits a redacted JSON + MD artifact under `evidence/`.
- Every claim is classified local-static / local-automated / provider-backed /
  inferred (`19_…`).
- No claim of hosted/production proof from local-only checks.
- Readiness caps from the suite prompt applied (`17_…`).

## Cost posture (binding)

- Free-tier/bundled only (`AGENTS.md`).
- No paid add-on (D1 paid, R2 paid, Smart Placement paid, Analytics paid,
  dedicated egress) without explicit owner approval (OPEN-02/03).
- Rely on Time Travel + manual export + sampled-object drill for the cheaper
  recovery path.

## Git / shared-worktree standards

- No branch/worktree creation, no commits/pushes by this planning task.
- Future implementation: file-scope ownership, fresh `git status`, small diffs,
  re-read touched files before edits.
