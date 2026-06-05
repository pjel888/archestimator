# Vercel Read-Only CLI Evidence - 2026-06-02

Scope: linked Vercel project `VERCEL_SCOPE_PLACEHOLDER/archestimator`.

Commit before evidence capture: `2e5b38d`.

This is provider evidence, not a launch approval. No deploy, promote, rollback, env add/remove, domain change, or project linking command was run. One caveat is recorded below: an attempted `vercel curl --non-interactive` generated deployment-protection bypass entries before failing; the non-env entry was removed, while an env-var-backed automation bypass entry remains visible in project protection output and needs owner review.

## Commands

| Command | Result | Launch meaning |
| --- | --- | --- |
| `vercel --version` | `54.6.1`; CLI reported `54.7.0` available through `vercel whoami`. | CLI is available but not latest. |
| `find .vercel ...` | Local `.vercel/project.json` links to project `archestimator` under org/team `VERCEL_TEAM_ID_PLACEHOLDER`. | Local directory is linked to the expected Vercel project. |
| `vercel whoami` | Authenticated as `OWNER_HANDLE_PLACEHOLDER`. | Provider read commands can run under the owner account. |
| `vercel project inspect archestimator --non-interactive` | Project found: framework Next.js, root `.`, Node.js `24.x`, default Next.js build/output/install settings. | Project exists and is configured for Next.js preview builds. |
| `vercel ls archestimator --format json --yes --non-interactive` | Latest preview for commit `2e5b38d` initially listed as `BUILDING`; follow-up `vercel inspect` showed it reached `READY`. Prior `db9b224` preview was already `READY`. | Current pushed commit has a ready preview deployment, but this is not production/custom-domain proof. |
| `vercel env ls --non-interactive` | `No Environment Variables found for VERCEL_SCOPE_PLACEHOLDER/archestimator`. | Vercel env proof row is not passable for closed beta. Required Supabase, closed-beta, app-origin, invite, email, and AI-off env values are absent on this project listing. |
| `curl https://.../api/health` | Plain curl returned Vercel `401 Authentication Required` on the branch alias and ready preview. | Deployment protection is active; public unauthenticated health monitoring is not currently possible on protected preview URLs. |
| `vercel curl https://.../api/health` | Authenticated Vercel CLI curl returned `{"ok":true,"service":"archestimator","timestamp":"2026-06-01T21:19:21.xxxZ"}` on the latest preview and branch alias. | The deployed health route works behind Vercel deployment protection. |
| `vercel project protection archestimator --format json --non-interactive` | SSO protection applies to `all_except_custom_domains`; Git fork protection is enabled. One env-var-backed automation bypass entry remains after cleanup of the non-env entry generated during this run. | Protection posture is partly known, but owner review is needed for the remaining automation bypass entry and any custom-domain behavior. |

## Current Evidence Status

| P0 row | Status after this capture | Notes |
| --- | --- | --- |
| Vercel deploy/env/health | partial / blocked | Preview deployment for `2e5b38d` reached `READY`, and protected `/api/health` works through `vercel curl`; env list is empty, plain public health returns 401 due to deployment protection, no production/custom-domain proof, and no rollback rehearsal was run. |
| Hosted auth allowlist | blocked | No hosted browser auth smoke was run; Vercel env list currently has no Supabase/closed-beta values. |
| Support/monitoring | blocked | `/api/health` exists behind protection, but no public uptime monitor proof or alert owner proof exists. |

## Follow-Up Required

1. Add and verify the required Vercel environment variables without exposing secret values.
2. Decide whether preview deployment protection should remain SSO-only, use an approved automation bypass, or expose a separate production/custom-domain health check.
3. Owner-review the remaining env-var-backed automation bypass entry reported by Vercel project protection.
4. Run hosted browser smoke for allowed, denied, revoked, logout/session expiry, and first-run states after env proof exists.
5. Demonstrate rollback or rehearse the rollback path before launch approval.
