# 07 — Data, Database, API & Network Plan

The launch gate makes **no direct database calls and no direct network calls in its default mode**. This document records that boundary explicitly and defines the provider-claim safety contract.

## §1. Data ownership

- The gate owns **no data**. It reads JSON/MD artifacts produced by anchor scripts and emits its own report artifacts.
- The gate's report artifacts are derived, ephemeral evidence — not a source of truth for the application.
- The application's source of truth remains D1 (`ARCH_DB`), R2 (`ARCH_UPLOADS_R2`), Durable Objects (`COLLAB_ROOMS`), and Queues (`UPLOAD_JOBS_QUEUE`). The gate does not touch them.

## §2. Schema changes

**None.** The gate introduces no D1 migrations, no R2 object policies, no DO state, no Queue handlers. It is build/CI tooling.

## §3. D1 / R2 / DO / Queue / Email boundary (provider-claim safety)

From `wrangler.jsonc` (verified authoritative via `AGENTS.md`):
- D1 `ARCH_DB` (`archestimator-proof-db`).
- R2 `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`).
- DO `COLLAB_ROOMS` (class `CollaborationRoom`).
- Queue `UPLOAD_JOBS_QUEUE` (`archestimator-upload-jobs` + DLQ).
- Email `EMAIL`. Images `IMAGES`.

**Gate contract:**
- Stages 0–1: **zero** Cloudflare contact. Pure file read + local exec.
- Stage 2 (`--with-provider`): invokes **read-only** `cf:check-provider-resources`, `cf:check-d1-auth-realtime`, `cf:check-email`, `cf:check-dns-delegation`, `cf:check-wrangler-auth`, `cf:check-provider`, `cf:jobs-proof`, `cf:provider-proof`, `cf:d1-runtime-proof`, `cf:d1-restore-rehearsal`. **No mutating script** (`cf:deploy`, `cf:sync-worker-secrets`, `cf:upload-version`) is ever in the gate's invocation set (enforced by static test OPS-LG-01).
- Stage 3 (`--with-hosted`): invokes read-only HTTP probes via `cf:verify-hosted-*`. No mutation.
- Stage 4: operator env only.

## §4. Access-path matrix (the gate's data sources)

| Source | Chosen path | Runtime role | Authorization check | Latest posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Release-gates artifact | read `evidence/2026-07-01-cloudflare-release-gates.json` | none (file read) | none (file) | local-static | file exists + valid JSON | missing-evidence |
| Provider-exit artifact | read `evidence/2026-07-03-cloudflare-provider-exit-pack.json` | none | none | local-static | file exists | missing-evidence |
| D1/auth/realtime | run `cf:check-d1-auth-realtime` (stage 2) | Cloudflare read | wrangler auth | provider-backed | script exit + artifact | skipped(auth) |
| Provider resources | run `cf:check-provider-resources` (stage 2) | Cloudflare read | wrangler auth | provider-backed | script exit + artifact | skipped(auth) |
| Hosted routes | run `cf:verify-hosted-routes` (stage 3) | HTTP read | none (public) | hosted-production | route matrix | missing-evidence(network) |
| Legal-owner | run `launch:check-legal-owner` (stage 4) | none (env) | none | operator-confirmed | env flags | missing-evidence |
| Support-monitoring | run `launch:check-support-monitoring` (stage 4) | none (env) | none | operator-confirmed | env flags | missing-evidence |

**P0 defect condition:** if a chosen path cannot read its source after current D1 migrations / app-authz / object policies, the gate marks it `missing-evidence` (never silently passes).

## §5. Network behavior

- Default mode: **no network**.
- `--with-provider`: Cloudflare API (read-only), requires wrangler auth.
- `--with-hosted`: HTTP GET to `archestimator.com` routes (read-only).
- Timeouts: per-anchor 60s default.
- Retries: none (the gate reports missing-evidence; the operator re-runs).
- Idempotency: re-running yields the same verdict given the same artifacts.

## §6. Database change blueprint

**Not applicable.** The gate introduces no database changes. (If a future version persisted gate history to D1, a separate blueprint would be required — out of scope.)

## §7. Provider-proof boundary (the critical rule)

**The gate never claims provider/hosted/production proof from local-only checks.** This is enforced by:
1. FR-LG-05 (evidence-class labeling) + the no-promotion unit test.
2. The domain matrix (`06` §3) assigns each domain an `evidenceClass`; a domain requiring `provider-backed`/`hosted-production` that has only local evidence is `missing-evidence`.
3. The report's `note` field states the rule explicitly.

This is the carrier of the repo-wide evidence rule from the directive §11.
