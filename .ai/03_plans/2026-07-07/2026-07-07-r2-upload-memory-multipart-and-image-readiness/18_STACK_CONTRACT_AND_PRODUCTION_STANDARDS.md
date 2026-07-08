# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting Next.js / React / Tailwind / Cloudflare / D1 / R2 / DO / Queues /
Email / Better Auth / TypeScript / performance / security / design-system decisions for this plan.

## Runtime substrate (authoritative from repo)

- **Worker:** `archestimator-proof`, `compatibility_date 2026-06-29`, `nodejs_compat`, custom
  domain `archestimator.com` (`wrangler.jsonc:1-17`).
- **OpenNext:** `@opennextjs/cloudflare` adapter; `cf:build`/`cf:deploy`. Workers platform limits
  apply transitively to Next.js Route Handlers.
- **Bindings (bound resources only):** R2 `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`),
  D1 `ARCH_DB` (`archestimator-proof-db`), DO `COLLAB_ROOMS` (`CollaborationRoom`), Queue
  `UPLOAD_JOBS_QUEUE` (`archestimator-upload-jobs` + DLQ), Images `IMAGES`, Email `EMAIL`.
- **Free-tier posture:** Workers Free (128 MB isolate, 10 ms CPU/req, 100 MB body, 50 subrequests,
  3 MiB bundle, 100K req/day) + R2 free (10 GB-month, 1M Class A + 10M Class B/month, zero egress)
  + Images free (5,000 transforms/month) + D1 always-free. No paid add-on without owner approval.

## Upload stack decisions (this plan)

| Layer | Decision | Source |
|---|---|---|
| Memory | Stream bodies to R2 `put(stream)`; never whole-body buffer (DEC-01) | official docs (128 MB isolate) |
| Limits | `ARCH_UPLOAD_HOSTED_*` single enforced source (DEC-02) | repo evidence |
| Storage port | Widen `UploadStorageProvider` (stream + customMetadata + list + optional multipart); R2 only (ARCH-02) | simplicity overlay |
| R2 keys | `${logicalBucket}/${workspaceId}/${userId}/…`; validators retained (SEC-03) | repo evidence |
| R2 metadata | `customMetadata` non-PII on every put (DEC-04) | derived |
| R2 lifecycle | app-driven cron cleanup + retention R2 delete (FR-06) + list-reconcile (FR-05); no bucket lifecycle rules | derived |
| Multipart | real R2 multipart for direct uploads, owner-gated (DEC-03) | official docs (R2 multipart free) |
| Scanner | policy scanner = documented floor (not AV); ClamAV = upgrade (OPEN-02); CDR = future paid (DEC-06) | repo + official docs |
| Images | `IMAGES` binding for production, owner-gated; 20 MB input cap; stream output; quota monitor (DEC-07) | official docs (Images binding) |
| Authz | `d1-access.ts` predicates at every route; direct-upload owner-check + durable D1 capacity (SEC-01) | repo evidence |
| Idempotency | finalize by `upload_session_id`; jobs by per-minute idempotency key; DLQ at `max_retries` (REL-01) | repo evidence |

## Next.js / React decisions

- Upload routes stay `runtime = "nodejs"` Route Handlers (Server). No `"use client"` on upload
  server code (ARCH-01). Secrets/bindings stay server-only.
- GET routes serve bytes with correct content-type + `no-store` cache-control (verify unchanged).
- No Server Actions for uploads (Route Handlers own the surface). DTOs typed; no `any`.
- Image rendering: existing components hard-set `unoptimized` or use Cloudflare loader; DEC-07 may
  reconcile, but asset descriptors unchanged so components are unaffected.

## Tailwind / design-system

- No new UI primitives required. Upload-UI changes (multipart progress, scan-blocked state) reuse
  existing `src/components/ui/` primitives. `DESIGN.md` is alpha-stage, not law.

## TypeScript / validation

- Widened provider interface fully typed; no `any`; runtime validation at trust boundaries retained
  (magic-byte, content-type, path validators).
- `cloudflare-env.d.ts` refreshed via `bun run cf:typegen` only if Worker Env types change (this
  plan adds no new binding; vars only).

## Cloudflare D1 / R2 / DO / Queues

- D1: no migration for core plan (DATA-01); conditional `0041` (next free; `0040` taken by concurrent lane) for multipart (DATA-02). App-authz
  via `d1-access.ts`. Generated types unaffected (D1 rows).
- R2: single physical bucket; logical namespaces; `customMetadata` + bounded `list`; lifecycle
  app-driven. No presigned raw URLs (app-owned re-entry).
- DO: out of scope (sibling pack).
- Queues: idempotent; DLQ; `max_retries:3`; dry-run-default gating.

## Performance budgets (from `09`)

- Peak buffered bytes/req ≤ `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES`.
- R2 put P95 ≤ `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS` (250 ms).
- Route duration ≤ `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS` (30 s).
- Concurrency ≤ `ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS` (3).
- Bundle ≤ 3 MiB (Free).
- Images transforms ≤ 5,000/month (Free, DEC-07).

## Security baseline (from `08`)

- Authz at server boundary every route; cross-workspace denial; path safety; magic-byte + scan gate;
  honest scanner floor; no raw presign; CSRF verify (T-10); redacted telemetry; retention deletes
  bytes; no PII in customMetadata.

## Reliability baseline (from `09`)

- Idempotent finalize; retry + DLQ; dry-run-default destructive ops; admission backpressure;
  operational alerts; Workers Observability (free); `data_retention_events` audit.

## Production-readiness gates (from `13`)

- type-check + lint + focused vitest green per phase.
- Hosted upload proof suite green.
- Provider proof (R2; Images if DEC-07) green.
- grep-deny whole-body buffer in streaming paths.
- env-cap test parametrized.
- (DEC-03) multipart + op budget; (DEC-07) Images parity + quota monitor.
