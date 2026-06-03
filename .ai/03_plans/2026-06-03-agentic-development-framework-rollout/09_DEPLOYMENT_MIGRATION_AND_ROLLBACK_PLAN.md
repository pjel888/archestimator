# Deployment, Migration, and Rollback Plan

**Date:** 2026-06-03

## Planning task boundaries

- No deployment during planning.
- No migrations during planning.
- No Vercel, Supabase, Resend, GitHub protection, or Notion external mutation during planning.

## Future branch-to-environment mapping

| Branch/source | Environment | Notes |
|---|---|---|
| `feat/*`, `fix/*`, `spike/*` | Vercel preview only | No production data mutation; preview may be deployment-protected |
| `beta` | Closed beta/staging | Separate Supabase/Vercel/Resend config; provider proof required |
| `release/*` | Release candidate preview/staging | Freeze window, release checklist, rollback rehearsal |
| `main` | Production | Protected production branch and deployment source |
| `hotfix/*` | Temporary preview plus production PR | Branch from `main`; minimal fix; backmerge after release |

## Future promotion flow

1. Feature/fix branch -> PR -> `beta`.
2. `beta` -> `release/*` when candidate is ready.
3. `release/*` -> `main` only after release checklist, provider/manual proof, rollback proof, and Philip approval.
4. `hotfix/*` -> `main` emergency PR -> production -> backmerge to `beta`/`dev` if used.

## Future provider checks

- Vercel env proof.
- Supabase migration parity.
- Supabase RLS proof.
- Resend proof.
- Hosted auth proof.
- Hosted E2E/manual smoke.
- Rollback proof.

## Rollback playbooks

| Change type | Rollback |
|---|---|
| Docs/protocol change | Revert docs commit and add superseded note if already referenced |
| CI workflow change | Revert `.github/workflows/ci.yml`; rerun PR check |
| Branch protection change | Disable/relax only with Philip approval and decision log |
| Vercel deployment | Roll back deployment in Vercel dashboard/CLI under provider plan |
| Database migration | Separate migration-specific rollback plan; never improvise |
| Notion mirror | Mark page stale or update from `.ai` source |

## Post-deploy checks for future implementation

- `bun run validate` and `bun run build` pass before deploy.
- Hosted `/api/health` and protected-route auth behavior verified.
- Core beta journey smoke captured.
- Rollback path tested or explicitly rehearsed.
- `.ai/05_logs` and Notion mirror updated with commit hash and evidence link.
