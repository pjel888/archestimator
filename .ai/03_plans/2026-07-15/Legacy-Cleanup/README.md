# Legacy Cleanup — Repository-Wide Audit and Execution Pack

**Date:** 2026-07-15
**Status:** conditionally implementation-ready
**Next unit:** `UNIT-002`
**Canonical execution artifact:** `IMPLEMENTATION_PLAN.md`

## Objective

Remove legacy, deprecated, obsolete, duplicated, and transient repository material without deleting active compatibility paths, applied migration lineage, provider-exit evidence, or owner assets.

This pack is the current cleanup authority. The archived June cleanup pack and completed July 5 Vercel/Supabase cleanup pack are historical comparison evidence only; all 45 current candidates were rechecked against the source tree, Cloudflare/D1 architecture, GitNexus data, read-only Vercel state, and the shared dirty worktree on 2026-07-15.

## Executive Verdict

The repository has a useful low-risk cleanup wave, but it does **not** support a wholesale deletion of “Client Links (Legacy).” The Publisher route, legacy publication migration service, token mapping, write freeze, and shared-link fallback are an active cutover corridor. They must remain until active publication rows, external URL demand, recipient credentials, comments, decisions, and rollback obligations are reconciled.

All four local units are ready:

1. remove proven dead source and retarget its focused tests (`UNIT-001`);
2. delete tracked scratch files, obsolete raw captures, seven owner-approved root screenshots, and five untouched Next scaffold SVGs (`UNIT-002`);
3. reconcile duplicate/provider-era commands, configuration, and focused test contracts (`UNIT-003`);
4. repair the active plan index, stale active packs, and current authority documents that still describe Supabase/Vercel-era architecture as live (`UNIT-004`).

The owner explicitly authorized the scoped automated test edits and targeted test commands required by `UNIT-001` and `UNIT-003` on 2026-07-15. This authorization does not extend to later compatibility, browser, deployment, or broad test work.

Cloudflare is the sole runtime/deployment architecture. Read-only Vercel evidence nevertheless found a dormant external project record that retains domains and has a recent ready deployment. Therefore stale Vercel region/cron fields should be removed, but a minimal `git.deploymentEnabled: false` guard remains until the external project and domain records are administratively decommissioned.

The later units are evidence-gated. They normalize current data and environment values, prove external demand is absent, complete the legacy publication cutover, and use forward D1 migrations rather than rewriting applied history.

## Non-Negotiable Decisions

- Keep `/workshop/publisher`, `/workshop/proposals`, `/share/[token]`, and `/api/share/[token]/**` until their current obligations are explicitly retired.
- Treat `/api/client-portal/[token]/**` as a possible external contract even though the current repository UI uses `/api/share/[token]/**`.
- Never edit or delete applied files under `migrations/`; schema retirement uses a new forward migration.
- Retain `supabase/**` and archived provider-exit material as historical evidence. There is no current Supabase application runtime, but provider-exit/readiness tooling with current audit consumers remains active until that follow-up closes.
- Retain the active Cloudflare callback-normalizer worker until Google OAuth is proven to work without its stale/duplicate Better Auth state-cookie recovery and a separate Cloudflare routing deployment is explicitly authorized.
- Reduce `vercel.json` to a minimal deployment-disabled guard and restore `.vercel/` ignore protection; remove obsolete Vercel region/cron ownership now, but delete the guard only after project/domain decommission proof.
- Keep `tests/vitest/vercel-analytics-removed.test.ts`; it proves the retired Analytics runtime does not return.
- Repair current corpus/spec authority to Cloudflare/D1/Better Auth truth; do not bulk-rewrite or delete historical Vercel/Supabase evidence.
- Delete only the seven exact root screenshots in `LC-020`; retain the separate public screenshot until its provenance and public-demand evidence are resolved.
- Do not classify large files, framework entrypoints, or current compatibility branches as dead code solely from static dead-code output.
- Leave `archestimator_pitch deck/`, `archestimator_executive_summary/`, `claude-design-reference/`, and `philip-lewis-cv/` untouched as owner-retained assets.
- Leave `.github/workflows-disabled/**` disabled and untouched.

## Callback Normalizer Boundary

`archestimator-auth-callback-normalizer` is a small Cloudflare edge Worker, not a Vercel component. It receives `archestimator.com` traffic, redirects `www` to the canonical host, repairs or clears stale/duplicate Better Auth OAuth state cookies when Google sign-in would otherwise end in `state_mismatch`, and forwards normal requests to the main `archestimator-proof` Worker through the `ARCH_APP` service binding.

A read-only Cloudflare readback on 2026-07-15 confirmed that the apex and `www` custom domains belong to the main Worker, but active zone routes still send all apex and `www` traffic, including the Google callback, through the normalizer first. The deployed main Worker contains the corresponding OAuth state-reset handling, but the current production path does not independently prove that behavior because the normalizer still fronts it. The evidence-backed decision is therefore `RETAIN`: make no route or source deletion now. The owner conditionally authorizes later removal only if a controlled direct-main-Worker proof demonstrates Google sign-in and `state_mismatch` recovery with a ready rollback; that proof is not yet available.

## Disposition Vocabulary

| Disposition | Meaning |
|---|---|
| `DELETE_NOW` | Current source and reference evidence supports deletion in a local-ready unit. |
| `DELETE_WITH_CALLER_UPDATE` | Obsolete item is removable in the same unit after explicit tests/config callers are rewritten. |
| `REPAIR_NOW` | Current authority is stale but can be corrected without runtime behavior changes. |
| `NORMALIZE_THEN_DELETE` | A live compatibility read exists; normalize current data or environment values before removing it. |
| `PROVE_DEMAND_THEN_DELETE` | No repository consumer exists, but external callers or issued links may still depend on the contract. |
| `PROVE_EXTERNAL_STATE_THEN_DELETE` | Repository evidence is insufficient; deployed linkage, provider state, or provenance must be read back before deletion. |
| `MIGRATE_THEN_DELETE` | Active data and rollback obligations must be cut over and verified first. |
| `RETAIN_ACTIVE` | Current runtime/provider behavior depends on it. |
| `RETAIN_EVIDENCE` | Historical lineage or proof remains valuable and must not be treated as runtime dead code. |
| `RETAIN_OWNER_ASSET` | The owner explicitly directed that a non-runtime repository asset remain untouched. |
| `FALSE_POSITIVE` | Tooling suggested dead/deprecated status, but framework or runtime evidence proves it active. |
| `OWNER_DECISION` | Non-runtime asset may be intentional business/personal collateral. |

## Artifacts

| File | Purpose |
|---|---|
| `01-LEGACY-AUDIT.md` | Comprehensive candidate inventory, evidence, disposition, and false-positive register. |
| `IMPLEMENTATION_PLAN.md` | Canonical unit DAG, exact file scope, prerequisites, evidence, and stop conditions. |
| `LOOP_LEDGER.md` | Requirement, acceptance, risk, unit, and resume traceability. |
| `plan-pack.json` | Validator-readable package state and hashes. |

## Validation Policy

This planning run is `PLAN_ONLY`. No product tests, builds, browser automation, screenshots, provider mutations, or deployments were run. Plan validation is limited to the static plan-pack validator, JSON parsing, path checks, scoped reference checks, and `git diff --check`.

Future implementation units inherit the repository user-test gate. Source scans, diffs, type analysis, lint, D1 read-only counts, and provider log/readback evidence are allowed; automated test edits or commands require a separate explicit test task.

## Stop Condition

The cleanup program is complete only when every core unit is `VERIFIED`, every compatibility removal has its named demand/data proof, no applied migration or retained evidence was rewritten, the current plan index is truthful, and the final reference scan finds no dangling imports, scripts, routes, docs, or plan pointers.
