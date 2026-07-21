# UNIT-001 — Config contract, deep links, enablement surface

## Goal and status

`READY` · dependencies: none · requirements: DATA-001, OPS-002 · risks: RISK-001, RISK-002, RISK-008

Codify provider targets and env contracts so client loaders and admin UI share one source of truth.

## Owned paths

- `.env.example` (analytics block only)
- `src/lib/analytics/provider-targets.ts` (new)
- `src/app/admin/analytics/page.tsx` (deep links + labels)
- `src/app/admin/page.tsx` (analytics link targets only if needed)
- `src/app/admin/README.md` (analytics env section)

## Implementation boundary

1. Add `provider-targets.ts` with:
   - GA account `192756720`, property `306189271`
   - Clarity project `axxveykqn3`
   - Deep link URLs from the Task Contract (Intelligent home + Clarity 3-day dashboard)
   - Env name constants for public IDs, `NEXT_PUBLIC_BETA_TELEMETRY_ENABLED`, and server secret names (`GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_JSON` or split vars, `CLARITY_API_TOKEN`)
2. Update `.env.example` comments to distinguish Measurement ID (`G-…`) vs property ID vs Clarity project vs secrets.
3. Point admin tiles at Philip’s exact deep links; keep configured badges on public IDs.
4. Document that production send requires telemetry switch `true` + consent + hosted public vars.
5. Do not set real secrets; do not enable telemetry in committed defaults.

## Acceptance evidence

- Source shows correct IDs/URLs; `.env.example` has no secret values.
- Admin GA/Clarity links open the named dashboards.
- Type/static checks clean when implementation runs.

## Recovery and completion

Revert owned files only. Complete when UNIT-002/005/006 can consume the contract.
