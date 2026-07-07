# 18 — Stack Contract and Production Standards

Cross-cutting production decisions for the in-scope stack layers.

## Next.js 16 / React 19

- **Rendering:** export route is a Route Handler (`GET`), `dynamic = 'force-dynamic'`, `no-store`
  (unchanged). Share page is a public Server Component page (unchanged).
- **Server/Client boundary:** all trust logic server-only; `ProposalExportPreviewDialog` stays
  `"use client"` but renders server-provided hash/staleness (no secret). No new client data
  fetching for trust fields — they come via the existing download response + manager query.
- **Server Actions:** publication actions stay Server Actions (`actions.ts`); package writes are
  added inside existing authorized actions (not new direct-POST surfaces).
- **Cache/revalidation:** deliverables never cached (`no-store`). Manager package-history query
  uses TanStack Query with invalidation on republish. Recipient staleness computed per-request.
- **Streaming/Suspense:** not required for the core; the export response itself may become a
  `ReadableStream` (Phase 3) — that's HTTP streaming, not React Suspense.

## TypeScript / validation

- Typed repository, route params, DTOs. New `ProposalDeliverablePackageRow` type (DATA-3).
- Runtime validation at trust boundaries (package insert validates hash format; route validates
  settings — unchanged).
- No `any`; discriminated union for `package_kind`/`state`.

## Cloudflare D1

- App-authorized repository pattern (no service-role). Optimistic concurrency via
  `snapshot_version` (existing). Append-only for package table.
- Migration forward-only/additive (`0040_*`). Rollback = flag-off (table inert).
- Query-count discipline (+2/export, +0/publish batched, +1/recipient read).

## Cloudflare R2

- Reuse `ARCH_UPLOADS_R2` with `proposal-deliverables/<uuid>` keys (DEC-STORE-1). Private; server-
  mediated access. Lifecycle/reconcile for orphans (T4.4).

## Cloudflare Queues / Cron

- `proposal_export` job kind on `UPLOAD_JOBS_QUEUE` (ASSUMP-2 DISCOVERY). Idempotent
  `correlation_id`. DLQ reuse. Existing cron triggers may host orphan-reconcile (T4.4).

## Better Auth

- Unchanged. Manager RBAC via existing `assertProjectPublicationManager` / `getCurrentUserContext`.
  Recipients stay token-gated (no Better Auth session).

## Web Crypto

- `crypto.subtle.digest('SHA-256', ...)` for content hashing. No keys, no secrets.

## Performance / reliability

- Evaluator-defined thresholds (PERF-2). Three-band size path. Feature flags for rollback.

## Security

- No new public route without token. Redaction byte-scan CI gate. Rate limits extended to async.
  Content hash is a public marker, never a credential.

## Design system

- Reuse `badge`, `alert`, `progress`, `card`, `button`, native `<dialog>`. No new primitive.
  DESIGN.md is alpha-stage; defer to owner.

## Observability

- Structured redacted logs + D1 audit rows + Workers Observability. Checksum-mismatch = P0 alert.

## Verification commands (verified from `package.json`)

- `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run test`,
  `bun run test:dom`, `bun run validate`, `bun run build`, `bun run cf:typegen` (if binding change),
  hosted: `cf:verify-hosted-*` + new oversized-export script.

## Provider boundary discipline

- Only `ARCH_DB`, `ARCH_UPLOADS_R2`, `UPLOAD_JOBS_QUEUE` (and existing `EMAIL` for optional
  notify). Never historical Supabase or unrelated projects.
