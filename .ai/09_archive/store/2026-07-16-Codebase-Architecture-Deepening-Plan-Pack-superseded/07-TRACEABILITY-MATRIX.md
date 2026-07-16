# 07 — Traceability Matrix

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->
**Pack:** Codebase Architecture Deepening · **Date:** 2026-07-16 · **Status:** PLANNING
**Role:** evidence — REQ ↔ UNIT ↔ EVIDENCE mapping, and the descriptive-label ↔ machine-ID reconciliation.
**Machine authority:** `plan-pack.json` (numeric IDs, hashes, reciprocity). `06-RISKS-DECISIONS-AND-NON-GOALS.md` is the canonical risk/decision authority.

---

## 1. Requirement ↔ Unit ↔ Criterion ↔ Evidence (1:1 per candidate)

All statuses are PLANNING-time: requirements `ACCEPTED`, units `PLANNED`, criteria `N/A`, evidence `PLANNED`.
Evidence status is `PLANNED` — in this pack the behavior-preserving bar (`DEC-ARCH-08`) is asserted by **reasoning + parity proof**, not by a green run (`06` §8.5).

| REQ | UNIT (label) | Criterion | Evidence | Primary artifact (analysis doc) | Phase | Risk (top) |
|-----|--------------|-----------|----------|----------------------------------|-------|------------|
| REQ-001 | UNIT-001 (UNIT-ARCH-01) | AC-001 | EVID-001 | `02-BLAST-RADIUS-ANALYSIS.md` | 1 | RISK-008 / RISK-011 |
| REQ-002 | UNIT-002 (UNIT-ARCH-02) | AC-002 | EVID-002 | `02-BLAST-RADIUS-ANALYSIS.md` | 1→2 | RISK-001 / RISK-005 |
| REQ-003 | UNIT-003 (UNIT-ARCH-03) | AC-003 | EVID-003 | `02-BLAST-RADIUS-ANALYSIS.md` | 3 | RISK-002 / RISK-005 |
| REQ-004 | UNIT-004 (UNIT-ARCH-04) | AC-004 | EVID-004 | `02-BLAST-RADIUS-ANALYSIS.md` | 2 | RISK-002 / RISK-007 |
| REQ-005 | UNIT-005 (UNIT-ARCH-05) | AC-005 | EVID-005 | `03-PERFORMANCE-AND-SPEED-STUDY.md` | 3 | RISK-006 / RISK-009 |
| REQ-006 | UNIT-006 (UNIT-ARCH-06) | AC-006 | EVID-006 | `01-CURRENT-ARCHITECTURE-AUDIT.md` | 0 | RISK-008 |
| REQ-007 | UNIT-007 (UNIT-ARCH-07) | AC-007 | EVID-007 | `02-BLAST-RADIUS-ANALYSIS.md` | 4 | RISK-003 / RISK-005 |
| REQ-008 | UNIT-008 (UNIT-ARCH-08) | AC-008 | EVID-008 | `06-RISKS-DECISIONS-AND-NON-GOALS.md` | 1 | RISK-004 |
| REQ-009 | UNIT-009 (UNIT-ARCH-09) | AC-009 | EVID-009 | `01-CURRENT-ARCHITECTURE-AUDIT.md` | 1 | RISK-010 |
| REQ-010 | UNIT-010 (UNIT-ARCH-A1) | AC-010 | EVID-010 | `01-CURRENT-ARCHITECTURE-AUDIT.md` | 4 (AUX) | RISK-006 |
| REQ-011 | UNIT-011 (UNIT-ARCH-A2) | AC-011 | EVID-011 | `01-CURRENT-ARCHITECTURE-AUDIT.md` | 4 (AUX) | — |
| REQ-012 | UNIT-012 (UNIT-ARCH-A3) | AC-012 | EVID-012 | `01-CURRENT-ARCHITECTURE-AUDIT.md` | 4 (AUX) | — |
| REQ-013 | UNIT-013 (UNIT-ARCH-A4) | AC-013 | EVID-013 | `01-CURRENT-ARCHITECTURE-AUDIT.md` | 4 (AUX) | — |
| REQ-014 | UNIT-014 (UNIT-ARCH-A5) | AC-014 | EVID-014 | `01-CURRENT-ARCHITECTURE-AUDIT.md` | 4 (AUX) | RISK-011 |
| REQ-015 | UNIT-015 (UNIT-ARCH-A6) | AC-015 | EVID-015 | `01-CURRENT-ARCHITECTURE-AUDIT.md` | 4 (AUX) | — |

**Completion role:** REQ/UNIT-001..009 = `CORE`; REQ/UNIT-010..015 = `AUXILIARY` (do not block completion — `00` §4). Core criteria `N/A` (`test_requirement: NOT_REQUIRED`) at planning time; `TEST_PROPOSAL` recommendations live in the unit prose (`05`) and risk register (`06`).

---

## 2. Label ↔ machine-ID reconciliation

The analysis docs use descriptive labels for readability; `plan-pack.json` uses the validator's required numeric forms. This is the authoritative map.

### Units / Requirements (1:1)

| Doc label | plan-pack.json | Title |
|-----------|----------------|-------|
| UNIT/REQ-ARCH-01 | UNIT/REQ-001 | Estimate-tree read module carve (+dead seams) |
| UNIT/REQ-ARCH-02 | UNIT/REQ-002 | Component write-repository |
| UNIT/REQ-ARCH-03 | UNIT/REQ-003 | RowMutationCoordinator |
| UNIT/REQ-ARCH-04 | UNIT/REQ-004 | Row commit/dirty/routing module |
| UNIT/REQ-ARCH-05 | UNIT/REQ-005 | Handler selector/context seam |
| UNIT/REQ-ARCH-06 | UNIT/REQ-006 | Pass-through reducer deletion |
| UNIT/REQ-ARCH-07 | UNIT/REQ-007 | Component/Folder mutation module |
| UNIT/REQ-ARCH-08 | UNIT/REQ-008 | last-owner invariant |
| UNIT/REQ-ARCH-09 | UNIT/REQ-009 | toSourceSnapshot adapter |
| UNIT/REQ-ARCH-A1 | UNIT/REQ-010 | display-transform pipeline (AUX) |
| UNIT/REQ-ARCH-A2 | UNIT/REQ-011 | project-activity repo merge (AUX) |
| UNIT/REQ-ARCH-A3 | UNIT/REQ-012 | source-snapshot sanitizer (AUX) |
| UNIT/REQ-ARCH-A4 | UNIT/REQ-013 | image-upload excise (AUX) |
| UNIT/REQ-ARCH-A5 | UNIT/REQ-014 | helpers grab-bag collapse (AUX) |
| UNIT/REQ-ARCH-A6 | UNIT/REQ-015 | actions-tier Row leakage (AUX) |

### Risks

`06-RISKS-DECISIONS-AND-NON-GOALS.md` is the **canonical risk authority** and allocates `RISK-ARCH-01..11`. `plan-pack.json` mirrors these 1:1 as `RISK-001..011` (validator requires `RISK-\d+`):

| plan-pack.json | Doc label (`06`) | Unit(s) | L / I |
|----------------|-------------------|---------|-------|
| RISK-001 | RISK-ARCH-01 | 002 | M / **H** |
| RISK-002 | RISK-ARCH-02 | 003, 004 | M / **H** |
| RISK-003 | RISK-ARCH-03 | 007 | M / **H** |
| RISK-004 | RISK-ARCH-04 | 008 | L / **H** |
| RISK-005 | RISK-ARCH-05 | 002, 003, 007 | M / M |
| RISK-006 | RISK-ARCH-06 | 005 | **H** / M |
| RISK-007 | RISK-ARCH-07 | 003, 004, 005 | L / M |
| RISK-008 | RISK-ARCH-08 | 001, 006 | M / M |
| RISK-009 | RISK-ARCH-09 | 005 | M / M |
| RISK-010 | RISK-ARCH-10 | 009 | L / M |
| RISK-011 | RISK-ARCH-11 | 001, 014 | L / M |

The analysis docs also use **study-local sub-series** for in-doc readability — `RISK-ARCH-BR-*` (`02`), `RISK-ARCH-PERF-*` (`03`), `RISK-ARCH-SIM-*` (`04`). These are detail/elaborations of the canonical risks above, not separate registers; `06` §1 is the promotion target. `plan-pack.json` indexes the canonical 11.

### Decisions

`DEC-ARCH-01..09` (`00` §9/10 + `06` §3) → `plan-pack.json` `DEC-AUTO-001..009` (validator requires `DEC-AUTO-\d+`):

| plan-pack.json | Doc label | One-line |
|----------------|-----------|----------|
| DEC-AUTO-001 | DEC-ARCH-01 | Plan pack warranted (high-blast refactor) |
| DEC-AUTO-002 | DEC-ARCH-02 | Default `NOT_REQUIRED`; `TEST_PROPOSAL` for high-blast units |
| DEC-AUTO-003 | DEC-ARCH-03 | Deletion over compatibility (alpha) |
| DEC-AUTO-004 | DEC-ARCH-04 | One writer per shared file; ledger first-writer-wins |
| DEC-AUTO-005 | DEC-ARCH-05 | Read-side (001) before write-side (002) |
| DEC-AUTO-006 | DEC-ARCH-06 | UNIT-005 seam = selector/context, not a smaller prop list |
| DEC-AUTO-007 | DEC-ARCH-07 | Keep logic-encoding reducer; delete pass-through only |
| DEC-AUTO-008 | DEC-ARCH-08 | Behavior-preserving bar; `tsc` + `next build` clean |
| DEC-AUTO-009 | DEC-ARCH-09 | UNIT-008 = one SQL predicate + one TS guard |

The `DEC-ARCH-BR-*` / `-PERF-*` / `-SIM-*` sub-series are study-local (deletion-test verdicts, render-probe decisions, sequencing decisions) and are reconciled into the canonical 9 where load-bearing; the rest are in-doc analysis. `GATE-*` names are used verbatim (the validator permits descriptive gate IDs).

---

## 3. Source provenance

| Source | Status | Artifact | Backs |
|--------|--------|----------|-------|
| SRC-001 | CURRENT | `architecture-review.html` | REQ-001..009 (the originating 6-agent review) |
| SRC-002 | CURRENT | `01-CURRENT-ARCHITECTURE-AUDIT.md` | REQ-001..015 (re-grounded baseline) |

Every requirement, unit, criterion, risk, decision, and evidence record carries an `artifact_path` into one of the pack docs; all artifact hashes live in `plan-pack.json` and are recomputed by `tools/gen-plan-pack.mjs` / `bun run validate:plan-pack --write`.

---

## 4. Coverage check (acceptance criteria from `00` §5)

- **AC-PACK-01** (every core REQ → UNIT with paths/deps/impl/evidence/recovery/test): ✓ §1 + `05` §2.
- **AC-PACK-02** (acyclic DAG, exact next-ready unit): ✓ `05` §1; next-ready = UNIT-006 (Wave 0).
- **AC-PACK-03** (every unit has blast-radius + deletion-test verdict): ✓ `02` §1-2.
- **AC-PACK-04** (perf study for render/query units 003/004/005/007): ✓ `03` + `05` §2.
- **AC-PACK-05** (`validate:plan-pack` passes, no orphan IDs): pending — run after `tools/gen-plan-pack.mjs`.
