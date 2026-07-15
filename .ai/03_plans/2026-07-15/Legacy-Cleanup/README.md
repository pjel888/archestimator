# Legacy Cleanup — Repository-Wide Audit and Execution Pack

- **Date:** 2026-07-15
- **Status:** implementation-ready
- **Next unit:** `UNIT-002`
- **Canonical execution artifact:** `IMPLEMENTATION_PLAN.md`

## Objective

Remove proven legacy, obsolete, duplicate, and transient repository material without deleting active compatibility, applied migration lineage, provider-exit evidence, externally callable contracts, or owner-retained assets.

This pack rechecked 45 candidates against current source, Cloudflare/D1 configuration, graph/reference evidence, provider readbacks, and owner decisions. It is ready for implementation because every unit now names exact paths/resources, implementation, evidence receipt, recovery, and next state. Missing external proof has a deterministic `RETAIN` outcome; no executor must invent a migration or deletion branch.

## Ready Execution Shape

All ten units are `READY` as specifications; dependencies control order and `UNIT-002` is next.

1. remove proven dead source and retarget focused tests (`UNIT-001`);
2. delete the exact tracked scratch/raw/approved asset set (`UNIT-002`);
3. collapse duplicate provider-era tooling and minimize the dormant-Vercel guard (`UNIT-003`);
4. repair current planning and architecture truth without false archive moves (`UNIT-004`);
5. collect privacy-safe aggregate D1/provider evidence (`UNIT-005`);
6. remove only independently proven unused legacy API methods and retain `rt` (`UNIT-006`);
7. retain the active publication cutover corridor instead of starting a migration campaign (`UNIT-007`);
8. retain auth, blank-row/history, adjustment, and mapping compatibility (`UNIT-008`);
9. verify-retain the OAuth callback normalizer (`UNIT-009`);
10. reconcile receipts/statuses and archive the completed cleanup pack (`UNIT-010`).

## Binding Decisions

- Cloudflare Workers/OpenNext, D1, R2, Durable Objects, Queues/Cron, Images, Email, and Better Auth are current runtime truth.
- Keep `/workshop/publisher`, `/workshop/proposals`, `/share/[token]`, canonical `/api/share/[token]/**`, and the active publication migration/write-freeze corridor.
- Decide each `/api/client-portal/[token]/**` method independently. Missing, sampled, short, or incomplete request evidence means `RETAIN`.
- Keep legacy `rt` parsing. D1 stores recipient token hashes but not authoritative historical URL-format provenance.
- Keep auth-provider aliases, legacy blank-row/history readers, `contingencyPercentage` decoder fallbacks, mapping tables, and applied migrations. This cleanup pack does not normalize secrets, rewrite immutable JSON, backfill issued Client Portal content, or add a retirement migration.
- Keep `cloudflare/auth-callback-normalizer.ts` and `wrangler.auth-callback-normalizer.jsonc`. Future removal requires separately authorized real-domain OAuth proof and production Cloudflare routing mutation.
- Reduce `vercel.json` to `git.deploymentEnabled: false` and restore `.vercel/` ignore protection. Vercel is detached from runtime; its dormant administrative project/domain residue is a separate external decommission task.
- Keep all four Worker schedules: `*/5 * * * *`, `0 3 * * *`, `15 3 * * *`, and `30 3 * * *`.
- Keep `tests/vitest/vercel-analytics-removed.test.ts`, all `supabase/**` historical evidence, and current provider-exit closure tooling not explicitly deleted by `UNIT-003`.
- Delete only the seven root screenshots named in `LC-020`; retain `public/Screenshot 2026-05-18 at 9.00.39 PM.png` (U+202F before `PM`).
- Leave `archestimator_pitch deck/**`, `archestimator_executive_summary/**`, `claude-design-reference/**`, `philip-lewis-cv/**`, and `.github/workflows-disabled/**` untouched.
- Keep `Workshop-Library-Audit` and the Estimate-Tree follow-up active; both retain distinct unresolved obligations. Keep the Templates follow-up active.
- Never edit applied files under `migrations/**` or mutate legacy `supabase/migrations/**`.

## Callback Normalizer Boundary

`archestimator-auth-callback-normalizer` is a Cloudflare edge Worker. Current routes place it before `archestimator-proof` for apex and `www` traffic; it repairs stale/duplicate Better Auth OAuth state cookies and forwards through `ARCH_APP`. Similar main-Worker code does not independently prove real-domain Google OAuth or `state_mismatch` recovery while the normalizer still fronts traffic.

The current outcome is `RETAIN`. `AUTH-001` covers a future credentialed production-domain proof task; `AUTH-002` covers a later Cloudflare route/deployment mutation. Neither boundary blocks this cleanup implementation because `UNIT-009` completes through verified retention.

## Artifacts

| File | Purpose |
|---|---|
| `01-LEGACY-AUDIT.md` | Candidate inventory, evidence, disposition, and false-positive register. |
| `IMPLEMENTATION_PLAN.md` | Canonical DAG with exact paths, changes, receipts, recovery, and next states. |
| `LOOP_LEDGER.md` | Requirement, acceptance, risk, unit, and resume traceability. |
| `plan-pack.json` | Validator-readable package state and fingerprints. |
| `evidence/**` | Reserved implementation receipts; created unit-by-unit, aggregate and redacted. |

## Validation Policy

This planning run is `PLAN_ONLY`. No product tests, builds, browser automation, screenshots, provider mutations, or deployments were run. Static plan validators, path/source checks, JSON parsing, hashing, graph change review, and `git diff --check` are allowed.

The owner explicitly authorized only the exact focused test edits and commands written in `UNIT-001` and `UNIT-003`. Later units use source, aggregate D1/provider readback, static, and receipt evidence; they must not claim unrun tests.

## Stop Condition

Implementation is complete when all ten units are `VERIFIED`, every candidate has an evidence-backed `REMOVE`, `RETAIN`, or `NOT_APPLICABLE` outcome, exact focused tests are proven only by their receipts, retained source/assets/evidence are intact, validators and graph/reference checks pass, and the pack moves to `.ai/09_archive/store/2026-07-15-Legacy-Cleanup-complete/` with terminal status `ACHIEVED`. External callback proof/routing and dormant-Vercel decommission remain release/administrative boundaries, not cleanup blockers.
