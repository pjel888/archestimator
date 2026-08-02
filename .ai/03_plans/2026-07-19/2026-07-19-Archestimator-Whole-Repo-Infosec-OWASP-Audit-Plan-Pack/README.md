# Archestimator Whole-Repository InfoSec + OWASP Audit Plan Pack

> **Historical provenance only.** This predecessor is non-runnable and is
> superseded by `.ai/03_plans/2026-07-31/Code-Improvement/`. No remediation
> implementation is claimed by this pack. [`00-PLAN.md`](./00-PLAN.md) remains
> the canonical record inside this retired folder, not current execution authority.

## Status tuple

`NOT_READY / NOT_STARTED / BOUNDARY / N/A / CANCELLED`

- **Baseline HEAD:** `7f9a484b42b0d951f219e3c4ce1bfbb4364e8847` (2026-07-19)
- **Suite version:** `2026-07-12`
- **Profile:** `high-blast-radius`
- **Historical action ceiling:** `IMPLEMENT_LOCAL` under the original `PLAN_ONLY` audit; this retired pack is not runnable
- **Exact next unit:** `null`; all 13 predecessor units are `SUPERSEDED` by `DEC-AUTO-007`
- **Current successor:** `.ai/03_plans/2026-07-31/Code-Improvement/`

## What this pack is

A historical record of the read-only, evidence-driven, adversarial
whole-repository security audit of `archestimator` at HEAD `7f9a484b4` and its
original remediation proposals. The audit evidence is preserved; current-source
dispositions and any implementation sequencing belong to
`.ai/03_plans/2026-07-31/Code-Improvement/`.

It is **not**:

- an OWASP/ASVS certification (no formal conformance claim);
- a hosted penetration-test proof (no live exploitation, no DAST, no fuzzing);
- a clone or restatement of the June 1, 2026 Supabase-era audit (`.ai/09_archive/2026-06-01-security-owasp-compliance-audit/`) — that audit was reconciled against current source as lineage only, because the codebase has since migrated from Supabase/Postgres+RLS to Cloudflare D1 (SQLite, no RLS).

## Coverage at a glance (from the closed coverage ledger)

- Total tracked files: **12,716**
- Deep-reviewed (security-critical source): **~280 files** across `src/lib/{auth,authz,security,cloudflare,collaboration,publication,client-portal,uploads,ai,email,observability,compliance,legal,admin}`, `src/app/api/**`, `worker.ts`, `src/middleware.ts`, `next.config.ts`, `wrangler.jsonc`, `migrations/` (selected), `.github/**`, `package.json`, `bun.lock`, `patches/**`, env templates.
- Trace-reviewed: ~60 additional source files via call-graph follow-up.
- Pattern-scanned-and-classified: every tracked file received a disposition in `artifacts/coverage-ledger.csv`-equivalent rows (the inventory CSV classifies by `runtime_or_tooling_role`).
- Historical provider artifacts (`supabase/**`, 245 files) dispositioned as `HISTORICAL_PROVIDER_ARTIFACT` — scanned for tracked secrets and stale security claims; not treated as current controls.
- Generated/build outputs, `node_modules`, `.next`, `.open-next`, binary assets — excluded from semantic review per the master prompt §4.2; binary/media classified only.

## Accepted findings summary

See [`04-FINDINGS-REGISTER.md`](./04-FINDINGS-REGISTER.md) and `artifacts/findings.json` for the canonical machine-readable source.

- **Critical:** 0
- **High:** 1 (`SEC-COLLAB-003` realtime token revocation gap)
- **Medium:** 26
- **Low:** 11 (plus ~29 informational with no unit)
- **Rejected / refuted / duplicate:** 3 (`SEC-WORKER-001` refuted on-platform; `SEC-WORKER-003` duplicate of `SEC-WORKER-002`; `SEC-OPS-002` duplicate of `SEC-CRYPTO-001`+`SEC-OPS-001`) + 2 sweep candidates downgraded to Low/Informational — full record in `artifacts/rejected-refuted-findings.json`. Counts reconciled to `artifacts/findings.json` `findings[]`.

## Reading order

1. [`00-PLAN.md`](./00-PLAN.md) — canonical historical pack record
2. [`01-AUDIT-IDENTITY-AND-COVERAGE.md`](./01-AUDIT-IDENTITY-AND-COVERAGE.md)
3. [`02-ARCHITECTURE-THREAT-MODEL-AND-ATTACK-SURFACE.md`](./02-ARCHITECTURE-THREAT-MODEL-AND-ATTACK-SURFACE.md)
4. [`03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md`](./03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md)
5. [`04-FINDINGS-REGISTER.md`](./04-FINDINGS-REGISTER.md)
6. [`05-OWASP-ASVS-API-AI-CROSSWALK.md`](./05-OWASP-ASVS-API-AI-CROSSWALK.md)
7. [`06-REMEDIATION-ROADMAP-AND-SECURITY-GATES.md`](./06-REMEDIATION-ROADMAP-AND-SECURITY-GATES.md)
8. [`07-BLOCKED-EVIDENCE-AND-AUTHORIZATION.md`](./07-BLOCKED-EVIDENCE-AND-AUTHORIZATION.md)
9. [`08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md`](./08-SECOND-PASS-CHALLENGE-AND-DRIFT-RECONCILIATION.md)
10. [`PACK-MANIFEST.md`](./PACK-MANIFEST.md)
11. [`units/`](./units/) — remediation unit docs
12. [`artifacts/`](./artifacts/) — coverage ledger, route/action surface, authz matrix, token lifecycle, findings, crosswalk, lineage matrix, commands-run log
