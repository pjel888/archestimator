# Provider State Refresh - 2026-06-02

Scope: read-only Vercel and Supabase provider refresh from the current `main` state.

Result: partial/blocked. The latest Vercel preview is ready and protected health works through `vercel curl`, but Vercel env vars are still absent and linked Supabase still lacks the closed-beta allowlist and unlink migrations. This refresh does not change the closed-beta **NO-GO** recommendation.

## Vercel

Commands:

```bash
vercel env ls --non-interactive
vercel ls --non-interactive
vercel inspect https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive
vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -sS -i https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
```

Evidence:

- Vercel CLI: `54.6.1`.
- `vercel env ls --non-interactive` returned `No Environment Variables found for VERCEL_SCOPE_PLACEHOLDER/archestimator`.
- Latest listed preview: `https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, status `Ready`, environment `Preview`.
- `vercel inspect` reported deployment id `DEPLOYMENT_ID_PLACEHOLDER`, target `preview`, status `Ready`, created `Tue Jun 02 2026 07:07:46 GMT+0800`.
- `vercel curl` to `/api/health` returned `{"ok":true,"service":"archestimator","timestamp":"2026-06-01T23:09:24.738Z"}`.
- Plain `curl` to `/api/health` returned HTTP `401` with Vercel `Authentication Required`, confirming deployment protection still blocks unauthenticated public health access.

Launch meaning:

- Preview deploy and protected health are still partially proven.
- Hosted auth, env-backed Supabase/Resend behavior, production/custom-domain health, public monitoring, and rollback rehearsal remain missing.

## Supabase

Commands:

```bash
supabase projects list
supabase migration list --linked
```

Evidence:

- Linked project is still `Archestimator` with reference id `ebxxqidacheyapmmzavr`, region `Oceania (Sydney)`.
- `supabase migration list --linked` succeeded in this refresh.
- Remote history still lacks local launch migrations `20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items`.
- The CLI still reported a newer Supabase CLI version available: installed `v2.98.2`, latest `v2.104.0`.

Launch meaning:

- Linked schema parity remains blocked for closed-beta allowlist and project-specific unlink proof.
- Do not rerun hosted allowlist smoke or linked project-specific unlink as pass candidates until backup/PITR and linked migration/RPC proof are resolved.

## Resend / Local Env

Command:

```bash
printenv | rg '^(RESEND_|CLOSED_BETA_|NEXT_PUBLIC_ASK_FLIP|ARCHESTIMATOR_AI|ARCHESTIMATOR_DEV_AUTH|SUPABASE_|NEXT_PUBLIC_SUPABASE_)' || true
```

Evidence:

- The command printed no matching current shell variables.
- Combined with the Vercel env result above, visible email-dependent flows remain unproven in the hosted environment.

## Still Missing

- Vercel environment variables in preview/production.
- Hosted Google OAuth and allowlist allowed/denied/revoked smoke.
- Production/custom-domain health and rollback rehearsal.
- Linked Supabase backup/PITR and restore drill.
- Linked application/repair of `20260601182522` and `20260601184343`, followed by direct SQL/RLS/RPC allow/deny proof.
- Resend delivery/webhook proof if visible email flows remain enabled.
