# Adversarial Challenge Pass — Second-Pass Findings Review

> Independent read-only challenge to refute, narrow, or duplicate-own every
> Critical/High candidate. Per the master prompt, every Critical or High
> finding must be independently challenged. This pass was performed by the
> same agent in an emulated second-pass role (the multi-agent directive
> permits single-agent fallback; this pass is labelled and never claims
> independent review).

## Method

For each High finding, the challenger attempted to:
1. disprove reachability (can the actor actually trigger it?),
2. narrow the impact (find an upstream guard),
3. identify a duplicate active owner in another pack,
4. lower severity based on recoverability,
5. refute the root cause (find evidence the bug is already fixed).

## Verdicts

### F-01 (HIGH) — canonical oracle parity test fails

- **Reachability:** confirmed — the test runs in CI and on `bunx vitest run`.
- **Upstream guard:** none. The test is the guard, and it is broken.
- **Duplicate owner:** Quality Master CONSISTENCY-001 = ALREADY_IMPLEMENTED
  covers the product side; test fixture cleanup is **not owned**.
- **Severity challenge:** the challenger argued this is a TEST defect, not a
  product defect, and should be MEDIUM. **Verdict: severity sustained at
  HIGH.** Rationale: the broken oracle removes regression protection for the
  canonical math; any further drift in `computeEstimateRowCostParts` would
  pass undetected. The audit's own golden oracle is the only current
  protection, and it lives in this pack, not in CI.
- **Final: HIGH sustained. NEW_OWNER_HERE for test fixture reconciliation.**

### F-02 (HIGH) — legacy float row total in estimate list/dashboard/charts

- **Reachability:** confirmed — every estimate with a centavo-boundary row
  exhibits drift in the list/dashboard totalProjectCost column.
- **Upstream guard:** none — the float helper is called directly.
- **Duplicate owner:** Quality Master UNIT-014 (READY, HIGH) owns exactly
  this fix.
- **Severity challenge:** the challenger argued centavo drift on a displayed
  list total is MEDIUM (recoverable, no persistence harm). **Verdict:
  severity sustained at HIGH.** Rationale: the divergence is between the
  estimator's dashboard and the canonical XLSX/snapshot, which is exactly
  the "silent numeric divergence" the master prompt names as Critical/High.
  It does not reach Critical because no cross-tenant or irreversible data
  corruption occurs.
- **Final: HIGH sustained. CROSS_REFERENCE_ACTIVE_PACK (Quality Master
  UNIT-014). This pack provides the runtime drift evidence.**

### F-04 (HIGH) — aggregate float-sum drift on share tree, client portal, sheet node totals

- **Reachability:** confirmed — every share link and client portal view with
  ≥1 centavo-boundary row exhibits drift.
- **Upstream guard:** none — the consumers sum `rowTotal` (float) directly.
- **Duplicate owner:** partial — Quality Master UNIT-014 covers per-row
  legacy routing but not the consumer-site aggregate sums.
- **Severity challenge:** the challenger argued this is the same defect as
  F-02. **Verdict: kept as a SEPARATE finding.** Rationale: F-02 owns the
  per-row Variant B path (a single function `computeEstimateRowLineTotal`);
  F-04 owns the consumer-site aggregation (multiple sum sites that would
  still drift even if F-02 were fixed, because they sum the float
  `totalItemCosts`/`rowTotal` field rather than the canonical
  `totalMinorUnits`). They share a root cause (lack of canonical minor-unit
  aggregation) but have materially different fix surfaces.
- **Final: HIGH sustained. NEW_OWNER_HERE for the aggregate-sum
  canonicalization.**

### F-09 (HIGH) — duplicateEstimateRecordGraph 4-batch partial-write orphan

- **Reachability:** confirmed via source inspection — 4 sequential awaits
  with no envelope, no receipt, no compensation.
- **Upstream guard:** none at the graph level; the per-batch atomicity is
  real but does not span the 4 batches.
- **Duplicate owner:** partial — Quality Master UNIT-015 owns the broader
  `database.batch()` fail-before-write gate, which is a different fix.
- **Severity challenge:** the challenger argued this requires an injected
  failure to trigger and is MEDIUM. **Verdict: severity sustained at HIGH.**
  Rationale: production Worker isolates can die mid-flow (CPU limit,
  eviction, network blip on a D1 call), and the orphan is **silent** — the
  user sees an empty estimate with no error and no recovery path. The
  master prompt names "partial writes" and "stale state without recovery"
  explicitly as High.
- **Final: HIGH sustained. NEW_OWNER_HERE for the graph envelope +
  orphan reconciler.**

### Findings not challenged (Medium / Low / Informational)

F-03, F-05, F-06, F-07, F-08, F-10, F-11, F-12 are Medium or below; the
master prompt requires challenge only for Critical/High. Their dispositions
are documented in `findings.json` and the overlap matrix.

## Net result of the challenge pass

- 0 findings refuted.
- 0 findings narrowed below their filed severity.
- 0 findings identified a single fully-duplicate active owner (F-02 and F-09
  have partial overlap with Quality Master UNIT-014 and UNIT-015 respectively,
  but the fix surfaces are materially different — cross-referenced, not
  cloned).
- 4 High findings sustained as filed.
- The pack proceeds to unit creation with 7 NEW_OWNER_HERE units (F-01, F-03,
  F-04, F-05, F-06, F-07, F-08, F-09, F-10, F-11, F-12) and 4 cross-reference
  dispositions to existing packs (F-02 → QM UNIT-014; library import → MVP
  UNIT-005/006; contractor profile → MVP UNIT-010; cross-tenant → Infosec).

## Caveats

- This challenge was performed by the same agent that filed the findings
  (emulated specialist pass, single-agent fallback per the Multi-Agent
  Execution Directive). It is **not** independent review. A truly independent
  review by a different agent or human is recommended before any High
  finding drives product change.
- The severity calibration reflects alpha/pre-beta posture: silent centavo
  divergence is HIGH (not Critical) because no cross-tenant or irreversible
  corruption occurs; the master prompt reserves Critical for those.
