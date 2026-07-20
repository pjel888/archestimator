# 00-PLAN — Canonical Execution Truth

## Outcome and business intent

Perform a commercial estimate-truth and data-integrity audit across the
complete Archestimator estimating lifecycle, then deliver a standalone,
validator-conformant plan pack that:

- documents the canonical commercial-truth contract from current source;
- inventories every reachable producer/consumer of commercial truth;
- proves whether the same commercial facts survive from user input through
  D1, optimistic state, reads, summaries, charts, templates, versions,
  publication snapshots, and XLSX output;
- detects silent numeric divergence, rounding drift, referential breakage,
  partial writes, stale optimistic state, variant loss, import/export
  information loss, and recovery failures;
- files newly proven root causes with one explicit owner each;
- cross-references existing MVP, Quality Master, and Infosec packs instead
  of duplicating them;
- exposes exactly one canonical next unit and passes the plan-pack validator.

The central question:

> Can an estimator rely on Archestimator to preserve the exact intended
> quantities, selected commercial options, money values, totals, versions,
> and client-facing outputs across every reachable workflow — without silent
> corruption, divergence, or information loss?

## Task Contract

- **Objective:** audit + plan pack; no product remediation in this pack.
- **Owner:** ZCode lead agent (single-agent emulated-pass execution per the
  Multi-Agent Execution Directive).
- **Capability class:** frontier judgment (ambiguity, data integrity,
  synthesis, final decisions); balanced/read-heavy for the four parallel
  exploration lanes.
- **Tools:** Read, Bash, Grep, Glob, Write, Edit, Agent, Skill.
- **Write scope:** only inside the plan pack folder.
- **Read scope:** full repository; existing packs; current source.
- **Authorization:** TEST_TASK for audit-only evidence (existing tests,
  type-check, audit-only fixtures and XLSX inspection inside the pack).
- **Test decision:** TEST_PROPOSAL for the implementing units (UNIT-001
  requires TEST_TASK because it edits a test fixture).
- **Stop condition:** the validator passes and every High finding has one
  explicit owner (NEW_OWNER_HERE or CROSS_REFERENCE_ACTIVE_PACK).
- **Escalation:** TECH_BLOCKED only if the validator cannot be satisfied
  after materially different fallbacks.

## Scope

In scope:
- estimate row editors, mutation intents, server actions, D1 repositories;
- estimate tree reads and totals;
- tabs, areas, groups, nodes, rows, ordering;
- library items, suppliers, brands, categories, price options/variants,
  variant cost entries, price history;
- templates, template rows, linked instances, propagation jobs;
- project charts, dashboard summaries;
- estimate versions/activity/history;
- duplication, restore, archive, reorder, replay paths;
- proposal preview + export model + XLSX workbook writer;
- publication/shared-link snapshots;
- Client Portal issue/version paths where live;
- migrations, constraints, indexes, foreign keys, cascade behavior, batch
  semantics.

Out of scope (explicit non-goals):
- another generic security audit (Infosec owns);
- code-quality review (Quality Master owns);
- another generic database review;
- product remediation (units only plan; implementation requires separate
  authorization);
- browser automation, screenshots, Storybook, visual QA (user-gated, not
  requested);
- AI Copilot production release (deferred; F-05 is filed but the surface is
  feature-flagged).

## Baseline and evidence limits

- **Baseline SHA:** `b2a934919ce499c0404e5b9f9a5644f22757c78a`
- **Branch:** `main` (clean tree).
- **Last commit:** `2026-07-19T14:21:07+08:00 docs(ai): add MacBook-Pro
  agentic workflow bootstrap prompt`.
- **Evidence ceiling:** local runtime + source inspection. No hosted /
  production / provider-readback evidence collected.
- **Single-agent emulated-pass disclosure:** the four exploration lanes and
  the adversarial challenge pass were performed by the same agent in
  isolated labelled passes (per Multi-Agent Execution Directive
  single-agent fallback). Not independent review.

## Existing-pack reconciliation

Built an overlap/disposition matrix before the findings register
(`artifacts/existing-pack-overlap.json`). Every candidate ends in exactly
one of: NEW_OWNER_HERE, CROSS_REFERENCE_ACTIVE_PACK, ALREADY_IMPLEMENTED,
REFUTED_OR_UNREACHABLE, DEFERRED, EVIDENCE_BLOCKED, HISTORICAL_ONLY.

Headline cross-references:
- F-02 → Quality Master UNIT-014 (READY, HIGH).
- F-09 → partial Quality Master UNIT-015 (CRITICAL, READY) — same theme
  (atomicity), materially different fix surface (graph envelope vs batch
  gate). Both kept.
- Library import / variant accommodation / contractor profile → MVP
  UNIT-005/006/010.
- Variant-reference repair on linked template rows → Quality Master UNIT-001.
- Cross-tenant commercial-data authorization → Infosec UNIT-001..UNIT-013.

No accepted requirement or unit has two active owners.

## Requirements

- **REQ-001 (CORE):** Establish the canonical commercial-truth contract from
  current source and prove it via an independent golden oracle.
  → units: UNIT-000 (VERIFIED — the pack's truth-model and golden artifacts
  ARE the deliverable); evidence: EVID-001 (golden matrix), EVID-003 (XLSX
  inspection).
- **REQ-002 (CORE):** File every newly proven cross-surface divergence with
  one explicit owner, cross-referencing existing packs.
  → units: UNIT-001..UNIT-011; evidence: EVID-002 (findings register).
- **REQ-003 (CORE):** Prove partial-write and recovery gaps in the estimate
  lifecycle, file the unowned ones.
  → units: UNIT-002 (also REQ-002); evidence: EVID-004 (D1 lifecycle matrix + F-09).
- **REQ-004 (CORE):** Pass the plan-pack validator and expose one canonical
  next unit.
  → units: UNIT-000 (VERIFIED — validator passes, next_unit=UNIT-001);
  evidence: EVID-004.

## Decisions

- **DEC-AUTO-001:** Use single-agent emulated-pass execution (one lead, four
  read-only exploration lanes, one adversarial challenge pass). Reason:
  tightly coupled synthesis; no native subagent runtime configured for this
  task.
- **DEC-AUTO-002:** Cross-reference F-02 to Quality Master UNIT-014 rather
  than duplicate the legacy-float routing unit. Reason: identical fix
  surface; this pack provides the runtime drift evidence.
- **DEC-AUTO-003:** Keep F-04 as a separate finding from F-02. Reason: F-02
  owns the per-row legacy helper; F-04 owns consumer-site aggregate sums
  that would still drift even if F-02 were fixed.
- **DEC-AUTO-004:** Keep F-09 as a separate finding from Quality Master
  UNIT-015. Reason: UNIT-015 owns the `database.batch()` fail-before-write
  gate; F-09 owns the graph-level envelope across 4 batches. Different fix
  surfaces.
- **DEC-AUTO-005:** File F-05 (AI Copilot divergence) at MEDIUM severity
  even though four divergent formula copies were found. Reason: surface is
  feature-flagged and pre-release; no production data affected.
- **DEC-AUTO-006 (council 2026-07-19):** Narrow canonical per-row
  `adjustment_percentage` to `[-100, 100]`, matching UI/server/D1 CHECK.
  The 1000 ceiling remains only for sheet-level contingency mode. Reverses
  the original F-11 fix direction. See `artifacts/council-2026-07-19.md`.
- **DEC-AUTO-007 (council 2026-07-19):** Extend publication snapshot with a
  `finalProposal` basis (F-12 option b), not a share-page note. Share page
  renders the same Grand Total as the XLSX. Severity bumped
  INFORMATIONAL → MEDIUM. See `artifacts/council-2026-07-19.md`.
- **DEC-AUTO-008 (council 2026-07-19):** Expand currency set to include
  CNY/JPY/KRW (PH construction sourcing) AND centralize validation in one
  helper. Reverses the original F-10 "tighten readers only" plan. Severity
  bumped LOW → MEDIUM. See `artifacts/council-2026-07-19.md`.
- **DEC-AUTO-009 (council 2026-07-19):** Annotate F-02 and F-04 centavo
  drift as FIRST-USER-VISIBLE for the PHP target market (Pragmatist's
  surprise upheld). Severity stays HIGH.
- **DEC-AUTO-010 (council 2026-07-19):** Grant UNIT-001 TEST_TASK
  unconditionally. Premise-challenge ("was labor removal correct?") refuted
  by `d9cf5b18e fix(estimates): remove dead labor cost feature...` — explicit
  fix commit, zero labor in src/, zero labor in any migration. See
  `artifacts/council-2026-07-19.md`.

## Authorization boundaries

- **AUTH-001 (ACTIVE):** Hosted/production D1 readback, real customer data
  inspection, provider-side queries, and deployment remain outside this
  audit's authorization. All evidence is local runtime or source
  inspection.
- **AUTH-002 (ACTIVE):** Test-file edits (UNIT-001 parity fixture, UNIT-008
  new XLSX parity test) require a separate explicit TEST_TASK for the
  implementing session. This audit only ran the existing parity test
  read-only.
- **AUTH-003 (ACTIVE):** AI Copilot remediation (UNIT-007) is deferred
  until Copilot release; no implementation authorized in this pack.

## Findings summary

12 filed findings + 10 rejected/refuted/cross-referenced.

- **HIGH (4):** F-01 (broken oracle test), F-02 (legacy float per-row),
  F-04 (aggregate float-sum drift), F-09 (duplicate-graph partial-write).
- **MEDIUM (6):** F-03 (currency hardcode), F-05 (AI divergence), F-06
  (client portal REAL money), F-07 (estimate health magnitude), plus the
  persistence-recovery context of F-09.
- **LOW (3):** F-08 (XLSX latent parity), F-10 (currency breadth), F-11
  (UI clamp).
- **INFORMATIONAL (2):** F-12 (XLSX-vs-share total by design), plus
  residual cleanup notes.

See `artifacts/findings.json` for the full register with severity,
confidence, evidence class, existing-pack disposition, root cause, smallest
fix direction, data repair need, and acceptance evidence for each.

## Acyclic dependency graph

```
UNIT-000 (audit deliverable; REQ-001 + REQ-004)         [VERIFIED]
   |
   v
================= WAVE 1 (council-promoted) =================
UNIT-001 (F-01 parity fixture)            [READY]
UNIT-003 (F-04 aggregate canonicalization)[READY]
UNIT-012 (F-12-b snapshot extension)      [READY — NEW]
UNIT-013 (F-11 narrowing)                 [READY — NEW]
   |
   v
================= WAVE 1.5 =================
UNIT-002 (F-09 graph atomicity)           [READY]
   |
   v
================= WAVE 2 =================
UNIT-004 (F-03 currency propagation)      [READY]
UNIT-005 (F-06 client-portal minor-unit)  [READY]
UNIT-006 (F-07 estimate health magnitude) [READY]
UNIT-007 (F-05 AI package-builder)        [READY, DEFERRED until Copilot release]
UNIT-008 (F-08 XLSX parity test)          [READY]
UNIT-014 (F-10 currency expand+centralize)[READY — NEW]
UNIT-009, UNIT-010, UNIT-011              [SUPERSEDED]
```

The canonical next unit is **UNIT-001**.

## Execution slices/waves

- **SLICE-001 (WAVE 1, READY):** UNIT-000, UNIT-001, UNIT-003, UNIT-012,
  UNIT-013. Council-promoted: covers all HIGH findings + the binding-proposal
  trust gap.
- **SLICE-002 (WAVE 1.5, PLANNED):** UNIT-002 (orphan atomicity).
- **SLICE-003 (WAVE 2, PLANNED):** UNIT-004, UNIT-005, UNIT-006, UNIT-007,
  UNIT-008, UNIT-014.

## Risks

- **RISK-001 (OPEN):** UNIT-001 test-fixture cleanup may surface additional
  drift if the canonical math itself changed in ways not yet detected.
  Mitigation: this audit's golden oracle (20 cases) is the cross-check.
- **RISK-002 (OPEN):** UNIT-002 graph envelope may hit D1 batch size limits
  on very large estimates. Mitigation: fall back to the orphan reconciler.
- **RISK-003 (OPEN):** UNIT-007 AI Copilot convergence may change the
  Copilot's user-visible draft totals. Mitigation: Copilot is pre-release;
  coordinate with the Copilot release plan.
- **RISK-004 (MITIGATED):** F-01's broken oracle currently leaves the
  canonical math unprotected in CI. Mitigation: this pack's golden oracle
  (in `artifacts/golden-oracle/`) provides interim protection until UNIT-001
  lands.

## Resume state

- **Goal:** audit + plan pack; no product remediation.
- **Status:** planning complete; ready for validator.
- **Next unit:** UNIT-001.
- **Hashes:** baseline SHA `b2a9349...`; artifact hashes in `PACK-MANIFEST.md`.
- **Decisions:** DEC-AUTO-001..005 above.
- **Boundaries:** AUTH-001..003 above.
- **Ownership:** all 11 units owned by this pack; cross-references
  documented.
- **Handoffs:** none (single-agent execution).
- **Cleanup:** no ephemeral state outside the pack folder.

## Completion and archive conditions

This pack enters `ARCHIVE_READY` when:
- UNIT-001 has landed (the broken oracle is fixed) — protects the canonical
  math going forward;
- the cross-referenced units in MVP / Quality Master / Infosec that own
  F-02, F-09's per-batch gate, library import, variant BOQ export,
  contractor profile, variant-reference repair, and cross-tenant
  authorization have landed OR are tracked in their respective packs;
- the remaining NEW_OWNER_HERE units (F-03, F-04, F-05, F-06, F-07, F-08,
  F-10, F-11, F-12) have either landed or been explicitly deferred with a
  named trigger;
- a fresh executor can start the next unit without rediscovery.

Until then, the pack stays `ACTIVE` with `next_unit: UNIT-001`.

## Exact next ready unit

**UNIT-001 — Reconcile canonical oracle parity fixture (F-01).**

Acceptance: `bunx vitest run
tests/vitest/calculation-output-parity.test.ts --maxWorkers=1` passes 3/3.
Authorization: requires explicit TEST_TASK for the implementing session
(test-source edit).
