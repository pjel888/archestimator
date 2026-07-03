# 21 - Legacy Provider Cleanup Worksheet

Purpose: clean old Vercel/Supabase/Resend-era auth assumptions without deleting active proof tooling or sibling-pack context.

## Classification Labels

| Label | Meaning |
|---|---|
| `active` | Current runtime or test still depends on it. Do not delete. |
| `archaeology` | Historical migration/proof context intentionally retained. Mark clearly. |
| `delete` | Dead/stale artifact safe to remove after targeted tests. |
| `rotate/remove-provider` | Secret/provider-side object should be rotated or removed through the provider-exit runbook. |
| `sibling-pack-blocked` | Cloudflare migration/provider-exit pack owns the decision. |

## Current Worksheet

| Artifact class | Known examples | Initial classification | Required next step |
|---|---|---|---|
| Project README Supabase Auth wording | `README.md` stack/auth references | `delete`/update | Update wording to Better Auth/Cloudflare-first after source check. |
| Legacy Supabase callback route | `src/app/auth/callback/route.ts` | likely `delete`, pending provider URI check | Verify Google OAuth redirect URIs and stale-cookie behavior first. |
| Supabase migrations | `supabase/migrations/*` | `archaeology` / sibling context | Retain unless sibling migration pack decides otherwise. |
| Supabase auth cookies in tests/e2e | `sb-*` helper references | mixed | Classify each test as stale, provider-proof, or historical fixture. |
| Vercel analytics/speed insights references | app/layout/components if still present | mixed | Verify whether active analytics still ships and redact URL tokens if active. |
| Vercel deployment docs | older plan/README references | `delete`/update or `archaeology` | Update active docs; preserve historical packs if useful. |
| Resend webhook/email code | webhook route/tests/provider proof | mixed | Determine active runtime send path vs legacy proof; do not delete blindly. |
| Resend secrets/provider dashboards | provider-side | `rotate/remove-provider` if obsolete | Coordinate with provider-exit runbook; do not expose values. |
| Supabase/Vercel/Resend env vars | `.env.example`, scripts, CI/provider settings | mixed | Remove only after scripts/tests no longer need them. |
| Cloudflare migration plan references | sibling pack docs | `sibling-pack-blocked` | Report stale auth facts; do not edit sibling pack from this auth pack unless explicitly scoped. |

## Cleanup Procedure

1. Run targeted `rg`:
   - `rg -n "supabase|sb-|vercel|resend|auth/callback" README.md .ai src tests e2e scripts package.json wrangler.jsonc`
2. Classify every hit with the labels above.
3. For `delete`, write or update a regression test first when behavior could change.
4. For `rotate/remove-provider`, use the provider-exit runbook and keep secrets out of docs.
5. For `archaeology`, add a short note that the artifact is historical and not active runtime.
6. Update this worksheet with date, action, test evidence, and owner.

## Do Not Delete Without Extra Proof

- Migration files used as comparison/rollback context.
- Provider proof scripts still used by the Cloudflare migration pack.
- Tests that intentionally prove absence of old provider behavior.
- Any env var whose only remaining use is in a provider-exit script until that script is retired.
