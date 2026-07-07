# Upload Production Proof Closure — Plan Pack

> **Plan status: `CONDITIONALLY READY`**
> Readiness aliases: maps to legacy `READY WITH EXTERNAL DECISIONS`.
> Reason: every internally-resolvable planning decision is closed, but the plan
> *cannot* reach `IMPLEMENTATION-READY` from a planning-only session because
> 5 of the 8 proof gates require live hosted/scanner/operator action that no
> planning artifact can synthesize. See
> [`17_FINAL_READINESS_REVIEW.md`](./17_FINAL_READINESS_REVIEW.md).
>
> **`verification_mode: emulated`** — self-audit pass; readiness capped at 97
> and status capped at `CONDITIONALLY READY` until an independent reviewer or
> the owner signs off (suite authority contract).

**Plan folder:** `.ai/03_plans/2026-07-07-upload-production-proof-closure/`
**Mode:** planning only. No application source/test/migration/config changes.
**Scope type:** `exhaustive` — touches R2/D1/Queues/Cron, release readiness,
data-integrity proof, and security-sensitive hosted surfaces.

## What this pack is (and is not)

**Is:** a closure runbook-plus-spec that lets an executor drive the 8-gate
upload production-proof bundle to `productionProofReady=true` using auditable,
fail-closed, hosted/live evidence — and that fixes two operational hazards that
currently break every documented collection command.

**Is not:** a re-plan of upload architecture. That lives in the parent pack
`000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement/` and the sibling
`2026-07-07-r2-upload-memory-multipart-and-image-readiness/`. This pack
deliberately separates **proof closure** from **architecture change**.

**Is not:** the act of collecting hosted/live proof. This pack prepares for it;
it does not perform provider/hosted/production actions (planning-only stage).

## Read in order

1. [`01_EXECUTIVE_SUMMARY.md`](./01_EXECUTIVE_SUMMARY.md) — verdict, posture, bar.
2. [`02_FEATURE_BRIEF_AND_SCOPE.md`](./02_FEATURE_BRIEF_AND_SCOPE.md) — brief, in/out of scope.
3. [`03_SOURCE_AND_CODEBASE_AUDIT.md`](./03_SOURCE_AND_CODEBASE_AUDIT.md) — the system this proofs.
4. [`04_REQUIREMENTS_SPECIFICATION.md`](./04_REQUIREMENTS_SPECIFICATION.md) — the 8 gates + closure reqs.
5. [`06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`](./06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md) — evidence pipeline.
6. [`07_DATA_DATABASE_API_NETWORK_PLAN.md`](./07_DATA_DATABASE_API_NETWORK_PLAN.md) — artifact schemas + API surface.
7. [`08_SECURITY_PRIVACY_THREAT_MODEL.md`](./08_SECURITY_PRIVACY_THREAT_MODEL.md) — the no-secrets/no-paths contract.
8. [`09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`](./09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md) — budgets + observability readout.
9. [`11_IMPLEMENTATION_PLAN.md`](./11_IMPLEMENTATION_PLAN.md) — **execution entrypoint**.
10. [`12_TEST_AND_VALIDATION_STRATEGY.md`](./12_TEST_AND_VALIDATION_STRATEGY.md) — proof commands + interpretation.
11. [`16_REQUIREMENTS_TRACEABILITY_MATRIX.md`](./16_REQUIREMENTS_TRACEABILITY_MATRIX.md) — req → command → evidence.
12. [`17_FINAL_READINESS_REVIEW.md`](./17_FINAL_READINESS_REVIEW.md) — verifier + scoring.

## Primary recommendation

Drive the bundle gate to green in three operator tracks (no code), in this order:

1. **Fix the two operational hazards first** (Phase 0). They silently break every
   later command. Both are operator/env-level, not code-level, so they are
   in-scope for this pack to specify and an executor to apply.
2. **Re-confirm the 3 already-green gates** (Phase 1) under the corrected paths
   so the bundle no longer leans on the fail-closed-filename candidate-fallback.
3. **Collect the 5 live/hosted gates** (Phase 2) as distinct evidence tracks,
   each fail-closed, each sanitized, each independently interpretable.

## Current high-risk findings (load-bearing for the whole pack)

1. **Evidence-directory drift.** Every upload production-proof script defaults
   its evidence directory to `.ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence`,
   which **does not exist on disk**. The real artifacts live under
   `.ai/03_plans/000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement/evidence/`.
   Every documented command must run with `UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR`
   (and the per-script `*_PROOF_OUTPUT`/`OUTPUT_FILE`) overridden, or it will
   fail to find or write artifacts. See Phase 0.
2. **Two untwired closure scripts.** `scripts/check-upload-production-proof-evidence.ts`
   (the bundle gate) and `scripts/verify-upload-production-observations.ts`
   (the dashboard/backpressure/retention artifact builder) are **not registered
   in `package.json`**. They must be invoked via direct
   `bun run scripts/<name>.ts`. The other four hosted upload verifiers are
   wired (`cf:verify-hosted-upload-runtime`, `cf:verify-hosted-upload-operations`,
   `cf:verify-hosted-upload-lifecycle`, `cf:verify-hosted-upload-ui`).
3. **3/8 green via fail-closed filename fallback.** The hosted-operations and
   hosted-runtime gates pass only because the checker's `candidates` list accepts
   the `*-fail-closed-proof.json` filename. The runbook's "Required Artifacts"
   table names the non-fail-closed filename. This is not wrong (the checker
   validates the *contents*, not the name), but the naming drift must be
   documented so a future reviewer is not confused.
4. **5/8 gates require external action.** Live ClamD (clean + EICAR), observed
   alert webhook delivery, and operator-observed dashboard/backpressure/retention
   runbook. No planning artifact can close these; only safe hosted collection can.

## Readiness cutline

The pack reaches `CONDITIONALLY READY` when:
- All 8 gates have a named producer command, evidence schema, passing boundary,
  failure interpretation, and remediation sequence.
- The two operational hazards are specified with operator-safe fixes.
- The launch-gate integration is explicit (bundle gate feeds
  `cf:release-gates` / `upload-release-gates.json`).

It reaches `IMPLEMENTATION-READY` only when an independent executor has collected
the 8 artifacts on a hosted/live environment and the bundle reports
`productionProofReady=true` — which is execution work, not planning work.

## Phase order

- **Phase 0** — Repair the evidence directory + invocation hazards (operator-level).
- **Phase 1** — Re-confirm deployment readback + hosted operations + hosted runtime (3 gates).
- **Phase 2** — Collect live scanner, alert delivery, dashboard, backpressure, retention runbook (5 gates).
- **Phase 3** — Bundle verification + launch-gate integration + sign-off.

Dependency graph: `Phase 0 → {Phase 1, Phase 2} → Phase 3`. Phases 1 and 2 are
parallel-safe once Phase 0 lands; within Phase 2, scanner and alert are
independent of dashboard/backpressure/retention.

## Files off-limits / intentionally unaffected

- **Off-limits (no edits in this stage):** any file under `src/`, `tests/`,
  `migrations/`, `worker.ts`, `wrangler.jsonc`, `package.json`, `scripts/`,
  any `evidence/` directory, and any other plan pack.
- **Intentionally unaffected:** upload application behavior, R2/D1/DO/Queue/Email
  runtime state, provider configuration. This pack changes no runtime behavior.
- **Forward code-fix notes (out of scope here):** the durable fix for the two
  operational hazards (repointing the script defaults and adding the two missing
  `package.json` aliases) is tracked in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`
  as `DEC-002`/`DEC-003` and is explicitly future implementation work.

## External proof still required before production rollout

All 8 artifacts in `04_REQUIREMENTS_SPECIFICATION.md` must be (re)produced on a
hosted/live environment. None are collectable from this planning session. See
`11_IMPLEMENTATION_PLAN.md` Phase 2 for the exact opt-in flags, secrets, and
origin allowlists each requires.

## Commands to run before the first edit (for an executor)

```bash
# 1. Confirm current bundle state (note: dir override required — see Phase 0)
UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR=".ai/03_plans/000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement/evidence" \
  bun run scripts/check-upload-production-proof-evidence.ts

# 2. Confirm the two scripts exist and parse
bun run scripts/check-upload-production-proof-evidence.ts --help 2>/dev/null || true
bun run scripts/verify-upload-production-observations.ts --help 2>/dev/null || true

# 3. Confirm git is clean of this pack's intended writes
git status --short
```

## Stale-plan revalidation checklist

Before executing, reconfirm:
- `scripts/check-upload-production-proof-evidence.ts` still lists these 8
  requirement keys and these `candidates` filenames.
- The evidence directory path (real vs default) has not changed.
- `wrangler.jsonc` upload vars (`ARCH_UPLOAD_HOSTED_*`, `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS`)
  and cron triggers (`0 3`, `15 3`) are unchanged.
- The four `cf:verify-hosted-upload-*` aliases still resolve in `package.json`.
- No sibling pack has already closed any of the 5 external gates.

## Archive policy

**Do not archive automatically.** Archive this pack only after the bundle reports
`productionProofReady=true` on a hosted/live environment and an owner has signed
off the closure. Partial closure (e.g. only Phase 0 + Phase 1) should remain
un-archived as a live tracking artifact.
