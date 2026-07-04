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
| Project README Supabase Auth wording | `README.md` stack/auth references | mixed: mostly accurate archaeology, stale details are doc cleanup candidates | Update only stale active-provider or stale count wording; preserve accurate Cloudflare/Supabase-archaeology framing. |
| Legacy Supabase callback route | `src/app/auth/callback/route.ts` | `transitional-disabled-legacy-gate` | Keep until provider/OAuth redirect URI proof shows no external traffic depends on `/auth/callback`; then delete with route tests. |
| Supabase generated types | `src/lib/supabase/types.ts` | retired historical schema-shape artifact | File is deleted in the current worktree after active imports/source reads were migrated. Keep the four non-blocking guard/audit-tooling references honest and rerun strict inventory after any future provider-string cleanup. |
| Supabase migrations | `supabase/migrations/*` | `archaeology` / sibling context | Retain unless sibling migration pack decides otherwise. |
| Supabase auth cookies in tests/e2e | `sb-*` helper references | mixed | Classify each test as stale, provider-proof, or historical fixture. |
| Vercel analytics/speed insights references | app/layout/components if still present | mixed | Verify whether active analytics still ships and redact URL tokens if active. |
| Vercel deployment docs | older plan/README references | `delete`/update or `archaeology` | Update active docs; preserve historical packs if useful. |
| Resend webhook/email code | webhook route/tests/provider proof | mixed; runtime email is Cloudflare only | Keep Cloudflare Email runtime; classify stale Resend comments/tests before deletion; no active Resend webhook route file exists in the current working tree. |
| Resend secrets/provider dashboards | provider-side | `rotate/remove-provider` if obsolete | Coordinate with provider-exit runbook; do not expose values. |
| Supabase/Vercel/Resend env vars | `.env.example`, scripts, CI/provider settings | mixed | Remove only after scripts/tests no longer need them. |
| Cloudflare migration plan references | sibling pack docs | `sibling-pack-blocked` | Report stale auth facts; do not edit sibling pack from this auth pack unless explicitly scoped. |

## 2026-07-04 Classification Bridge

`26_PHASE_5_LEGACY_PROVIDER_CLEANUP_PLAN.md` records the current local classification evidence:
- package/config runtime is Cloudflare-first with no old-provider runtime packages.
- `/auth/callback` is a disabled legacy safety gate, not an active Supabase exchange route.
- `src/lib/supabase/types.ts` is deleted in the current worktree after tests/proof references were migrated, archived, or reduced to non-blocking guard/audit-tooling references.
- runtime email is Cloudflare Email only.
- broad source/script/test/env cleanup should run through `.ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/` and its ledger.
- current dirty-worktree re-audit shows substantial repo-local cleanup is present: `check-supabase`/`check-vercel` scripts and package entries are absent, `.vercel`/`.vercelignore` are absent, and migration evidence has been moved under `supabase/migration-evidence/`.
- the sibling cleanup ledger now records implementation evidence, but this worksheet still treats final hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review proof as open because provider-exit pack/CI, hosted/provider-dashboard, operator, legal/privacy, and final-review gates are separate from local string classification.
- remaining non-`supabase/**` provider hits are classified scanner/report tooling, negative assertions, compatibility guards, and security fixtures.
- `28`/`29` add that stale shared-link proof utility cleanup had a dependent Vitest cascade; Slice A now archives `shared-link-smoke-seed-script.test.ts` and `shared-link-hosted-password-route-proof-script.test.ts` with the scripts they imported, and the active caller check returns no matches outside `supabase/**`.

## Cleanup Procedure

1. Run targeted `rg`:
   - `rg -n "supabase|sb-|vercel|resend|auth/callback" README.md .ai src tests e2e scripts package.json wrangler.jsonc`
2. Classify every hit with the labels above.
3. For `delete`, write or update a regression test first when behavior could change.
4. For stale proof utilities, run the caller/dependent-test check and carry directly importing tests in the same cleanup slice.
5. For `rotate/remove-provider`, use the provider-exit runbook and keep secrets out of docs.
6. For `archaeology`, add a short note that the artifact is historical and not active runtime.
7. Update this worksheet with date, action, test evidence, and owner.

## Do Not Delete Without Extra Proof

- Migration files used as comparison/rollback context.
- Provider proof scripts still used by the Cloudflare migration pack.
- Tests that intentionally prove absence of old provider behavior.
- Any env var whose only remaining use is in a provider-exit script until that script is retired.
