# Deployment Provenance — O-01

## Worker identity

- **Name**: `archestimator-proof` (wrangler.jsonc:3).
- **Entry**: `worker.ts` (wrangler.jsonc:4).
- **Compatibility**: date `2026-06-29`, flags `["nodejs_compat"]` (wrangler.jsonc:5-6).
- **OpenNext adapter**: confirmed live — `x-opennext: 1` header observed on every probed response from `https://archestimator.com/`.
- **OpenNext DO exports preserved**: `worker.ts:58` re-exports `BucketCachePurge`, `DOQueueHandler`, `DOShardedTagCache` from `.open-next/worker.js` (required for deploy).
- **App DO exports preserved**: `worker.ts:59-61` re-exports `CollaborationRoom`, `GlobalPresence`, `SupportInbox`.

## Deployed version / source SHA — EVIDENCE_BLOCKED

- `bunx wrangler whoami` returned "Not logged in" — see AUTH-001.
- **Continuation**: interactive terminal `bunx wrangler login` or set `CLOUDFLARE_API_TOKEN`, then `bunx wrangler deployments list --env prod` and `bun run cf:check-latest-deploy-source-smoke`.

## Route / domain binding — HOSTED_CONFIRMED

- Apex `archestimator.com` returns 200 with Cloudflare edge headers (`cf-ray`, `server: cloudflare`).
- `www.archestimator.com` 308-redirects to apex via `routeCanonicalHostRedirect` (`worker.ts:146`).
- `workers.dev` secondary origin 308-redirects to apex (but `/api/health` and other paths remain directly reachable — cross-ref Infosec `SEC-WORKER-002`).

## Preview vs production separation — CURRENT_SOURCE_CONFIRMED + EVIDENCE_BLOCKED

- `wrangler.jsonc` has **no env blocks** (`[env.preview]`/`[env.production]`). Single-environment config.
- D1 binding has separate `database_id` (production) and `preview_database_id` (`9bdb29bb…` and `363c756a…` redacted; wrangler.jsonc:44-45).
- R2 binding has separate `bucket_name` (`archestimator-proof-uploads`) and `preview_bucket_name` (`archestimator-proof-uploads-dev`) (wrangler.jsonc:36-37).
- **Hosted preview environment identity**: EVIDENCE_BLOCKED under AUTH-001.

## Assets binding — CURRENT_SOURCE_CONFIRMED

- `ASSETS` binding → `.open-next/assets` directory (wrangler.jsonc:22-23).
- `html_handling`, `not_found_handling`, `run_worker_first` all default.

## Source maps — CURRENT_SOURCE_CONFIRMED

- `cf:deploy` script in `package.json` uses `--no-upload-source-maps` explicitly.
- No `upload_source_maps` flag in `wrangler.jsonc`.

## Latest-deploy source smoke — NOT RUN

- `scripts/check-cloudflare-latest-deploy-source-smoke.ts` exists. Not run because it requires proof-secret (AUTH-001). Mix category; safe to run after inspection in an authorized session.

## Manual release command chain — CURRENT_SOURCE_CONFIRMED

- Local build: `bun run cf:build` (`ARCHESTIMATOR_CLOUDFLARE_BUILD=1 opennextjs-cloudflare build`).
- Deploy: `bun run cf:deploy` — builds + `OPEN_NEXT_DEPLOY=true CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false NODE_OPTIONS='--import ./scripts/wrangler-undici-timeout.mjs' wrangler deploy --keep-vars --minify --no-upload-source-maps`.
- Upload version: `bun run cf:upload-version` (`opennextjs-cloudflare upload`).
- Build+upload: `bun run cf:build-upload-version` (chains build+upload).

## Artifact provenance — NOT RUN

- `scripts/generate-release-candidate-artifact.ts` (referenced by `.github/workflows-disabled/2026-07-13/ci.yml` release-candidate job) exists but is not run (CI is disabled).

## Who can deploy

- Operator with `wrangler login` to the Archestimator Cloudflare account, or `CLOUDFLARE_API_TOKEN` env. Audit cannot enumerate dashboard collaborators (AUTH-001 / out of scope).

## CI intentionally disabled vs docs claims — CROSS_REFERENCE_ACTIVE_PACK

- `.github/workflows/` is empty. All workflows live in `.github/workflows-disabled/` (4 top-level + 3 in `2026-07-13/`).
- Owned by Infosec UNIT-012 (activation) and Quality Master UNIT-002 (truthful claims).
- This audit does not duplicate; it notes the hosted consequence (no automated release gate).

## Version upload / promotion / rollback capabilities — EVIDENCE_BLOCKED

- `wrangler.jsonc` has no `version_annotations`, `traffic_limits`, `versions`, or `stages` blocks — suggests version-promotion machinery is not configured.
- Workers platform supports gradual deployment via versions; whether the account uses it: EVIDENCE_BLOCKED under AUTH-001.
- **Rollback**: prefer fix-forward per AGENTS.md. If rollback required, `bunx wrangler deployments rollback` (interactive, AUTH-001).

## Stale deployment detection — EVIDENCE_BLOCKED

- Cannot compare deployed SHA to HEAD without AUTH-001.
- Recommendation: capture deployed SHA at cohort admit in the release receipt.
