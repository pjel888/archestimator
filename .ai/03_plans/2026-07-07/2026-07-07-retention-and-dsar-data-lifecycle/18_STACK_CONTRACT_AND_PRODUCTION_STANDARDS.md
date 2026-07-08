# 18 — Stack Contract and Production Standards

This consolidates the cross-cutting production decisions for the Retention + DSAR pack. It binds the stack baseline to the concrete engineering choices.

## §1. Active stack baseline (verified from repo)
- **Next.js 16** (read `node_modules/next/dist/docs/` for version-sensitive behavior — App Router, Server Actions, caching, deployment via OpenNext).
- **React 19**.
- **Bun** (package manager + test runner for some scripts).
- **TypeScript** strict; `"server-only"` on data modules.
- **Tailwind v4** (CSS-layer tokens; `DESIGN.md` alpha-stage).
- **OpenNext on Cloudflare Workers** (`worker.ts` entry; `wrangler.jsonc`).
- **Cloudflare D1** `ARCH_DB` (`archestimator-proof-db`).
- **Cloudflare R2** `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`).
- **Durable Object** `COLLAB_ROOMS` (collab only — not touched by this pack).
- **Cloudflare Queue** `UPLOAD_JOBS_QUEUE` (existing; DSAR may add a queue handoff for large exports — Phase 3 decision).
- **Cloudflare Cron** triggers `0 3 * * *`, `15 3 * * *`, `30 3 * * *`.
- **Cloudflare Email** `EMAIL` (transactional; DSAR email confirmation gated `OPEN-DEC-002`).
- **Better Auth 1.6.22** against D1.
- **TanStack Query** (admin server-state).
- **Zustand** (not used in this surface).

No Supabase/Vercel/Resend runtime use. They are historical/provider-exit surfaces.

## §2. Provider overlay decisions (Cloudflare)
- **D1**: SQLite, not Postgres. Retention uses batched `DELETE`/`UPDATE` with `LIMIT`. No transactions across classes (per-class is independent). App-authz is `can*InD1` for user requests; system cron has no authz (binding-level).
- **R2**: object storage. DSAR tombstone = metadata column on `upload_assets`; purge = `removeObjects`. Provider-proof receipts under `provider-proof/dsar/<id>.json`.
- **Cron**: env-gated dry-run/apply. `scheduled()` handler only; no public endpoint.
- **Email**: optional, disabled until `OPEN-DEC-002`.
- **Workers Observability**: platform-managed log TTL; documented, not engine-enforced.

## §3. Next.js / React decisions
- Admin routes: dynamic Server Components (auth-scoped, no-store).
- `"use client"` scoped to interactive queue/drawer/modal only.
- No `use cache`/Cache Components on admin routes (no-store).
- Server Actions for transitions/export/erasure (directly reachable POSTs → full validation).
- TanStack Query invalidation after mutation; no polling that clobbers form state.
- Progressive enhancement: triage transitions work without JS (form action); export/erasure require JS.

## §4. TypeScript / validation
- Typed request/response/action/repository boundaries.
- `RetentionClassName`/`RetentionAction` unions extended for new classes (DB-05).
- Runtime validation at admin route boundary (zod or manual asserts matching existing style).
- No `any`; discriminated unions for DSAR status graph errors.

## §5. Security baseline
- Platform-admin gate (`isPlatformAdminRole`) on every admin route.
- Typed confirmation phrase for erasure (reuse `validateTypedConfirmationPhrase`).
- HMAC hashing (`AUTH_AUDIT_HASH_PEPPER`) for PII; pepper rotation in ops runbook.
- Opaque errors; structured logs with aggregate counts only.
- Rate limits (intake existing; export/erasure new — per-admin + per-target).
- No new client-visible raw bearer material except short-TTL signed R2 URLs (admin-scoped).

## §6. Testing baseline
- Unit: rule registry, propagation map, builder, confirmation phrase.
- Repository (D1): apply/dry-run, audit writes, idempotency, anonymize, soft-delete.
- Role-matrix + denial: every admin route for non-admin.
- Cron: dry-run vs apply (env flags).
- R2: receipt + purge-retry.
- Adversarial: 16+ scenarios (`19_`).
- Hosted proof: 30-day cron observation; DSAR drill; observability config readback.

## §7. Cost posture
- Stay on free/bundled Cloudflare tier (AGENTS.md). No paid add-ons.
- Retention pass is low-frequency (daily); negligible D1 read/write cost at beta volume.
- R2 purge is low-frequency; within free tier operations.

## §8. Concurrent-workspace policy
- Docs-only pack (no code conflicts).
- Implementation phase: declare file ownership in `LOOP_LEDGER.md`; small diffs; re-read touched files before edits; no auto-branch/worktree.

## §9. Verification mode
- This pack: `verification_mode: emulated` (no second native agent). Readiness cap applied (`17_`).
- Implementation phase: target `independent` verification via a separate reviewer lane or the `code-review` skill.

## §10. Production-readiness gates (cross-ref `13_`)
- All migrations applied to `ARCH_DB` with readback.
- 30-day hosted cron observation.
- DSAR drill in staging.
- Operator runbook published.
- `OPEN-DEC-004` sign-off before any "policy" / compliance claim.
- `OPEN-DEC-007` sign-off before enabling erasure in production.
