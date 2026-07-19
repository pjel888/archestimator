# Archestimator Commercial Estimate-Truth & Data-Integrity Audit Plan Pack

**Slug:** `Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack`
**Created:** 2026-07-19 (Asia/Manila)
**Baseline SHA:** `b2a934919ce499c0404e5b9f9a5644f22757c78a`
**Branch:** `main` (clean tree at audit start)
**Status tuple:** `CONDITIONALLY_READY / NOT_STARTED / BOUNDARY / ACTIVE / ACTIVE`
**Suite version:** `2026-07-12`
**Canonical entrypoint:** `00-PLAN.md`
**Next unit:** `UNIT-001` (reconcile canonical oracle parity fixture)

## One-line summary

A commercial-truth and data-integrity audit across the full Archestimator
estimating lifecycle, plus a validator-conformant plan pack owning the
**newly proven cross-surface divergences** while cross-referencing the
existing MVP / Quality Master / Infosec packs for everything already owned.

## Commercial-truth verdict

**The canonical contract is correct, deterministic, and centavo-exact.** The
audit's central finding is not that the canonical math is wrong — it is that
the canonical math is **applied inconsistently across surfaces**. Twelve
distinct divergences are catalogued; the canonical-path surfaces (publication
snapshot, XLSX export, proposal preview, live UI editable model) produce
correct totals, while the legacy float paths (estimate list, dashboard,
share tree, project charts aggregator, AI Copilot, estimate health) produce
different totals for the same input on centavo-boundary rows.

## Headline finding (reproduced, not inferred)

The existing canonical-oracle parity test
(`tests/vitest/calculation-output-parity.test.ts`) **fails 2 of 3 cases on
current source**. The labor field was removed from
`computeEstimateRowCostParts` but the parity fixture still encodes
labor-inclusive expected values (e.g. `totalMinorUnits: 17_000` for a row
whose canonical answer is `14_250`). This is filed as **F-01 (HIGH)** — the
regression gate for the canonical math is currently broken.

## Findings by severity

- **Critical:** 0
- **High:** 4 (F-01 broken oracle, F-02 legacy float per-row, F-04 aggregate
  float-sum drift, F-09 duplicate-graph partial-write orphan)
- **Medium:** 6 (F-03 currency hardcode, F-05 AI divergence, F-06 client
  portal REAL money, F-07 estimate health magnitude, plus F-09's broader
  persistence context)
- **Low:** 3 (F-08 XLSX latent parity, F-10 currency breadth, F-11 UI clamp)
- **Informational:** 2 (F-12 XLSX-vs-share total divergence by design, plus
  residual cleanup)

Full register: `artifacts/findings.json`. Rejected/refuted:
`artifacts/rejected-refuted-findings.json`.

## Golden matrix executed

20 golden cases covering every mandatory invariant family. **All 20 pass**
against the independent oracle that mirrors the documented contract.
Evidence class: `LOCAL_RUNTIME_CONFIRMED`. Artifacts:
- `artifacts/golden-cases.json` (sha256: `06080fb6...`)
- `artifacts/golden-oracle/oracle.mjs` (sha256: `4728b56f...`)
- `artifacts/golden-results.json` (sha256: `fcf9e91a...`)

The G19 aggregate-drift sentinel quantifies the F-02/F-04 divergence at
**-2 centavos raw / -1 centavo display** on a 3-row fixture.

## XLSX inspection

Generated `audit-fixture.xlsx` via the real proposal-export code; inspected
the serialized XML. The Bid Form LINE TOTAL formula
`ROUND(qty*material,2)+adj+misc` caches to `142.5`, matching the canonical
model. Parity holds today via `Math.round` coincidence (filed as F-08 latent
risk). `fullCalcOnLoad="1"` set. Evidence class:
`LOCAL_RUNTIME_CONFIRMED`. Artifact: `artifacts/xlsx-inspection/result.json`.

## Active-pack cross-references

This pack **does not** duplicate existing ownership. See
`artifacts/existing-pack-overlap.json` for the full matrix.

- F-02 → Quality Master UNIT-014 (legacy money-total oracle routing).
- Library CSV/XLSX import → MVP UNIT-005.
- Variant accommodation in BOQ export → MVP UNIT-006.
- Contractor profile + branded export → MVP UNIT-010.
- Variant-reference repair on linked template rows → Quality Master UNIT-001.
- Cross-tenant commercial-data authorization → Infosec UNIT-001..UNIT-013.

## Authorization

This audit is an explicit, current-task **TEST_TASK** for commercial-truth
audit evidence only (per the master prompt). Authorized:
- running existing targeted tests (`calculation-output-parity.test.ts`);
- type-check / lint / static commands;
- audit-only golden fixtures, oracle scripts, XLSX inspection inside this pack;
- sanitized evidence artifacts.

NOT authorized:
- product-source / test-source / active-migration / dependency edits;
- production D1 writes / restores / schema changes;
- real estimates / client proposals / customer files;
- deployment / secret changes / provider config / queue replay / paid tools.

Future remediation units (UNIT-001..UNIT-011) require their own execution
authorization. UNIT-001 and UNIT-008 require explicit TEST_TASK because they
edit test files.

## Reading order

1. `README.md` (this file).
2. `00-PLAN.md` — canonical execution truth (Task Contract, scope, decisions,
   boundaries, findings summary, DAG, slices, resume state, completion gate).
3. `UNIT-CATALOG.md` — unit definitions + DAG.
4. `artifacts/commercial-truth-model.md` — the canonical contract from source.
5. `artifacts/findings.json` — the 12 filed findings.
6. `artifacts/existing-pack-overlap.json` — what is cross-referenced vs owned.
7. `artifacts/source-to-output-truth-graph.md` — every producer/consumer.
8. `PACK-MANIFEST.md` — artifact registry.
9. `LOOP_LEDGER.md` — append-only audit trail.

## Validator

The pack's `plan-pack.json` is validator-conformant against
`scripts/validate-plan-pack.mjs`. Run:

```
node scripts/validate-plan-pack.mjs .ai/03_plans/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack
```

(Use `--write` only after intentional content changes; it refreshes
content hashes.)

## Blocked evidence and data-repair risk

- **No hosted/production evidence collected.** All evidence is local runtime
  or source inspection. Hosted proof remains outside this audit's
  authorization.
- **Data repair:** F-06 implies a backfill of
  `client_portal_issues.total_cost_minor_units` from existing snapshots —
  owned by UNIT-005. F-09 implies a scan for existing orphan estimates —
  owned by UNIT-002. No immediate production data correction is required by
  this audit.
- **AI Copilot surface (F-05) is feature-flagged** and pre-release; no
  production data is affected.
