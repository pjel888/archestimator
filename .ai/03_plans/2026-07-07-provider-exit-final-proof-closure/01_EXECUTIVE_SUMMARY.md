# 01 — Executive Summary

## TL;DR

The Archestimator runtime is **fully Cloudflare-native** and the source tree
has **zero Supabase/Vercel/Resend runtime references**. The provider-exit pack
generator confirms this: 6 of 12 app-runtime gates are green and 2 of 6
operator gates are green (Resend status, obsolete-secret rotation). The pack
still reports `providerExitReady=false` because **4 operator/external proof
gates remain OPEN**, none of which can be closed by code:

1. **Exports/retention/loss decision** — needs an owner decision on the final
   Supabase data export posture (exported / accepted-retention / accepted-loss).
2. **Post-exit Cloudflare smoke** — needs an operator to run the smoke command
   list *after* the export/retention decision and record it.
3. **Non-owner Google proof** — needs a real non-owner Google account journey
   proof or an explicit owner-accepted deferral.
4. **Recipient mailbox proof** — needs a real recipient mailbox receipt proof
   or an explicit owner-accepted deferral.

This pack gives a future executor the exact, safe, **no-mutation** closure
procedure: the gate-by-gate checklist, the operator-record schema (already
implemented by `scripts/generate-cloudflare-provider-exit-pack.ts`), the
post-exit smoke command list, the export/retention/loss decision framework, the
data-loss acceptance rule, the rollback/no-rollback decision record, and the
sanitized-evidence boundary. It does **not** perform any closure, mutation,
export, rotation, cancellation, or deletion.

## Current state (evidence-backed)

| Dimension | Current state | Evidence |
|---|---|---|
| Active Worker | `archestimator-proof`, custom domain `archestimator.com` + `www` | `wrangler.jsonc:3,8-16` |
| D1 | `ARCH_DB` (`archestimator-proof-db`, id `9bdb29bb…`); 39 sequential migrations (`0001`–`0039`) | `wrangler.jsonc:37-44`; `migrations/` |
| R2 | `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`) | `wrangler.jsonc:30-36` |
| Durable Object | `COLLAB_ROOMS` (`CollaborationRoom`, SQLite-backed) | `wrangler.jsonc:45-52` |
| Queue | `UPLOAD_JOBS_QUEUE` (`archestimator-upload-jobs` + DLQ) | `wrangler.jsonc:66-82` |
| Email | `EMAIL` (Cloudflare Email) | `wrangler.jsonc:25-29` |
| Images | `IMAGES` (Cloudflare Images) | `wrangler.jsonc:22-24` |
| Cron | 3 daily triggers (`0 3`, `15 3`, `30 3`) | `wrangler.jsonc:59-65` |
| Auth | Better Auth `createCloudflareBetterAuthForD1`, `database: options.d1Database` from `env.ARCH_DB` | `src/lib/auth/better-auth-cloudflare.ts:165`; `cloudflare-better-auth-runtime.ts:125` |
| `src/` Supabase refs | **0 hits** (`rg -i supabase src/` = empty) | source scan |
| `package.json` Supabase deps | none (`@supabase/*` absent) | `package.json` |
| Legacy folder | `supabase/` = 254 files, README says "DO NOT RUN, APPLY, OR EXTEND" | `supabase/README.md` |
| Provider-exit pack | `providerExitReady=false`, `activeLegacyProviderRuntimeBlockers=0`, 4 OPEN gates | `…/evidence/2026-07-03-cloudflare-provider-exit-pack.md` |

## Target state

- The provider-exit pack reports `providerExitReady=true` after the operator
  record is completed with the 4 missing sections AND a post-exit smoke is run
  AND recorded — **or**
- The pack explicitly documents which external gate remains open, with the
  owner's accepted-deferral rationale recorded in the sanitized operator
  record, so closure is honest rather than fabricated.
- `current-state.md` FAST PATH is updated to record provider exit as final (a
  separate future documentation task, not this planning task).

## Critical decisions

- **DEC-PE-01**: Closure is operator/hosted-proof-bound, not code-bound. No
  amount of local scripting can flip `providerExitReady`. The plan refuses to
  accept local evidence as a substitute for operator attestation or hosted
  proof on the 4 open gates.
- **DEC-PE-02**: The closure procedure is strictly **no-mutation** until the
  owner has made the export/retention/loss decision. The smoke run is
  read-only host probing. No provider is cancelled, downgraded, deleted, or
  rotated by this plan.
- **DEC-PE-03**: `accepted-loss` is a permissible operator-record value but is
  gated by a strict rule (owner acceptance + Cloudflare proven sole runtime +
  export attempted or provably redundant). See `07_…` §7.4.
- **DEC-PE-04**: Rollback posture is decision-dependent: `exported` keeps a
  rollback window; `accepted-retention` keeps Supabase as a read-only rollback
  surface; `accepted-loss` is no-rollback. See `13_…`.

## Major findings

- **Source-level exit is complete and proven**: 0 Supabase refs in `src/`, auth
  is D1-backed, no `@supabase` in `package.json`, 39 active D1 migrations.
- **The generator script is sound but trust-bound**: it re-derives nothing
  from live providers; it trusts 5 pre-generated JSON artifacts and the
  sanitized operator record. Its `NOTE` explicitly states it cannot prove
  external provider state.
- **Two gates are already green via existing evidence**: Resend status and
  obsolete-secret rotation are recorded in the current operator record.
- **The 4 open gates are genuinely external**: they require either a real
  human/owner action (export, smoke run, persona journey, mailbox check) or an
  explicit owner-accepted deferral. None is closeable by a code change.
- **One minor cleanup item**: orphaned `node_modules/@supabase/*` directories
  exist with no resolvable parent dependency and are not imported anywhere.
  Non-blocking; a fresh `bun install` would clear them. See `14_…` RISK-PE-08.

## Readiness

`CONDITIONALLY READY`. The closure *procedure* (this pack) is implementation-
ready. The closure *outcome* is externally blocked on OPEN-PE-01..04. Because
verification is `emulated` (no native independent verifier), the high-blast-
radius status caps at `CONDITIONALLY READY` until an independent reviewer or
the owner accepts the pack (OPEN-PE-05). See `17_…`.
