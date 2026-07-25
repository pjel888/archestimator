# Performance, observability, migration, and release gates

`quality:operations` is a local-only, fail-closed Q2/Q3 gate. It reuses repository checks and writes `artifacts/quality/operations.json`. It must not call production endpoints, mutate hosted data, deploy, or treat missing credentials as proof.

## Applicability

| Surface | Q1 | Q2 | Q3 | Evidence boundary |
| --- | --- | --- | --- | --- |
| Error-handling and redaction contracts | affected static scope | required | required | Local/CI |
| Fixed performance budgets | affected scope | required | required plus trend comparison | Local/CI |
| Route-transition/query-count/throughput evidence | affected scope | critical affected flows | full release set | Local/CI using synthetic fixtures |
| D1 migration inventory/apply/restore/fix-forward | classify only | required when data/provider paths change | full release rehearsal | Local isolated D1 |
| Worker bindings and provider contracts | classify only | affected bindings | full local matrix | Local Workers/Miniflare |
| Hosted log and alert delivery | report pending | report pending or authorized proof | authorized release proof | Hosted, separately authorized |
| Production latency/error observations | not applicable | not implied | authorized release proof only | Production, separately authorized |

## Performance

Reuse the checked-in fixed budgets and stable baselines. Repeated timing checks use multiple runs and median measurements. A material fixed-budget violation or credible regression above 10 percent fails unless an existing stricter budget applies. Changing thresholds, sample counts, warm-up behavior, routes, exclusions, or timeout/retry policy is a Q2 quality-policy change and cannot accompany a product fix merely to obtain green.

The workflow must distinguish deterministic budget/readiness checks from browser measurements. Browser and hosted performance results include environment, fixture identity, sample count, median, baseline, and variance metadata.

## Observability

Local evidence covers structured-error contracts, correlation/trace propagation, redaction rules, alert-scenario definitions, and absence of swallowed errors. `ops:check-observability-env` is only a non-secret readiness preflight and may not be presented as alert delivery. `ops:verify-observability-alert` and Workers Logs collection are hosted proof and require the relevant credentials and authorization.

Logs and traces uploaded to CI must be synthetic and sanitized. A request/correlation identifier may be retained; cookies, authorization headers, tokens, private URLs, uploaded content, email content, and personal data may not.

## D1 migrations and recovery

All migration evidence uses `migrations/`, `ARCH_DB`, and isolated local persistence. Q2/Q3 data changes require:

1. ordered migration inventory;
2. clean-database apply;
3. prior-version fixture apply;
4. invariant and query verification;
5. restore or fix-forward rehearsal;
6. idempotency/concurrency checks where applicable;
7. proof that legacy `supabase/migrations/` was not mutated.

`dev:check-d1-migrations` verifies local applied state. `cf:check-d1-migrations` queries the bound remote D1 database and is therefore hosted/provider evidence; it does not run in untrusted pull-request jobs.

## Cloudflare and release

Pull-request and nightly workflows use only local Workers/OpenNext/D1 proof. They do not deploy or mutate remote provider state. The manual release-evidence workflow builds a candidate, runs Q3, generates a CycloneDX SBOM, records a SHA-256 digest, and requests GitHub provenance/SBOM attestations. It still does not deploy.

Cloudflare release gates, hosted route checks, Workers Logs evidence, alert delivery, and production observations remain separate authorized actions. A repository configuration or candidate artifact cannot be described as hosted or production proof.
