# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting decisions for this pack. The pack changes no
runtime stack; this document records the *contract the proof artifacts enforce*
on each stack layer.

## Next.js 16 / React 19 / OpenNext on Cloudflare Workers

- The internal upload routes are Next.js Route Handlers under `src/app/api/internal/`.
  They run on the Worker via OpenNext. The proofs treat them as opaque HTTPS
  endpoints (the bundle does not care about the runtime, only the response).
- No Server/Client boundary decision is introduced by this pack (no UI change).
- `"use client"` scope, RSC payload, cache/revalidation: unaffected.

## Cloudflare D1 (`ARCH_DB`)

- The proofs do not issue D1 reads directly (the lifecycle verifier is adjacent,
  not one of the 8). The dashboard observation is an operator reading a page that
  queries `upload_assets`/`upload_sessions`/`upload_events`.
- **No D1 change blueprint** — no schema, index, constraint, migration,
  repository helper, or app-authz function is touched. Reason: data-layer is out
  of scope for proof closure.

## Cloudflare R2 (`ARCH_UPLOADS_R2`)

- Object-key policy, logical-bucket namespaces, path-safety enforcement:
  unchanged. The proofs never write customer objects; the lifecycle verifier
  writes a synthetic fixture (adjacent, not in the 8).
- **No R2 object-policy change.**

## Cloudflare Queues / Cron (`UPLOAD_JOBS_QUEUE`, crons `0 3`, `15 3`)

- The retention runbook proof (008) *observes* the queue+cron chain; it does not
  change it. Idempotency key `jobName:cron:minute`, `max_retries=3`, DLQ
  `archestimator-upload-jobs-dlq`: unchanged.

## Durable Objects / collaboration

- Not upload-related; unaffected.

## Cloudflare Email

- Not upload-related; unaffected.

## Cloudflare Images

- Used by image-processing path; not directly exercised by the 8 gates; unaffected.

## Better Auth

- Not directly exercised by upload proof (the internal routes use bearer
  `CRON_SECRET`/job secrets, not Better Auth sessions). The dashboard observation
  uses a platform-admin session, but that is an operator using existing auth,
  not a change to it.

## TanStack Query / Zustand

- Unaffected (no client state change).

## Tailwind v4 / design system

- Unaffected (no UI change).

## TypeScript / validation

- Artifact JSON schemas are the validation surface. They are enforced by the
  bundle gate's per-requirement validators. No `any`, no unsafe casts in scope.

## Security / privacy

- The no-secrets/no-paths/no-customer-data contract (`08`) is the cross-cutting
  production standard. Sanitizers are mandatory and content-checked by the gate.

## Performance / reliability / observability

- Producer + bundle wall-time evaluator (`09`). Upload runtime budgets are
  *asserted present* by PROOF-REQ-003, not measured by this pack.

## Operations / rollout / rollback

- Operator-run phases; rollback = invalidate artifact (`13`).

## Verification mode

- `verification_mode: emulated` (no independent native verifier available).
- Caps: readiness ≤ 97; status ≤ `CONDITIONALLY READY` until reviewer/owner
  sign-off. See `17`.
