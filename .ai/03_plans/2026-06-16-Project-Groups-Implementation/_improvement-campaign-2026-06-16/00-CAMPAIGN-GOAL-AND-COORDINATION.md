# Project Groups — Plan-to-100% Improvement Campaign

**Campaign owner (orchestrator):** Claude (lead).
**Started:** 2026-06-16.
**Mandate:** Drive the `2026-06-16-Project-Groups-Implementation` planning package to a
defensible **100% on three axes — strategy, quality, implementation-readiness** — by
auditing it, fixing every gap, and authoring any missing artifacts. **This is a
planning-improvement task, NOT a coding task.** No app source, migrations, or DB
mutations are produced by this campaign — only planning documents are edited/created.

> This document is the campaign's **shared brain**: the self-authored goal, the working
> protocol, the file-ownership map that lets multiple agents edit the package
> concurrently without collision, and the conflict-resolution procedure. Every
> improvement agent reads this file first.

---

## 1. The self-authored goal (definition of "100%")

A reviewer who has never seen this package must be able to pick it up cold and ship the
feature correctly with **zero clarifying questions and zero contradictions encountered**.
Concretely, all of the following must hold:

### 1.1 Strategy = 100%
- The feature premise, MVP cut, and owner decisions are coherent, justified, and free of
  internal contradiction.
- Opportunity cost and path-dependency (e.g. one-to-many now vs Tags later) are addressed.
- The sequencing/concurrency strategy is correct and actionable.

### 1.2 Quality = 100%
- **Zero cross-document contradictions.** Where two docs describe the same contract, they
  agree, or the subordinate doc carries an explicit, located supersession stamp.
- **Zero stale cross-references.** Every filename/section/doc-ID pointer resolves to a real
  current file (no references to the `_superseded-*` alt-pass filenames).
- **Zero count/number drift** (findings totals, caps `50/40`, swatch count `8`, etc.).
- No AI-slop filler; every claim is evidence-grounded.

### 1.3 Implementation-readiness = 100%
- Every adversarial-review **FIX@IMPL** item is **integrated into the actual phase plan**
  (08–11), not left pending in a checklist.
- A single **requirement → unit → test traceability matrix** exists.
- A crisp **implementer handoff / runbook** exists (entry point, stop conditions, exact
  validation commands, non-goals).
- A **per-phase rollback & recovery** plan exists.
- A **definition-of-done / acceptance gate** per phase exists.
- Every contract (DB, types, server actions, DOM anchors, palette) is concrete and
  unambiguous — including the **actual 8 accent hex values** for the canonical
  `GroupAccentSwatch` shape.

### 1.4 The exit test
The campaign is done only when a fresh adversarial re-audit (same 10 lenses) returns
**every axis ≥ 100 with zero P0/P1 blockers**, verified — not asserted.

---

## 2. Known gaps at campaign start (orchestrator's pre-audit findings)

These were confirmed by direct reading before the formal audit; the audit adds to this list.

| # | Gap | Axis | Target doc(s) | Evidence |
|---|---|---|---|---|
| K1 | `00` §7 "Package map" lists **superseded** filenames (`07-implementation-plan.md`, `08-traceability-and-qa-matrix.md`, `09-implementation-agent-handoff.md`) instead of the real `07`–`12`. | quality | `00` | A cold reader follows the canonical doc's own map to archived files. |
| K2 | `02` §7 cross-references the superseded `08-traceability-and-qa-matrix.md`. | quality | `02` | Same stale-pointer class as K1. |
| K3 | `01` (§3, §9, §11) and `05` (§0, §5.2, §11) still say accents are **"fast-follow / colorless v1"** — contradicts the owner override **D13 (accents ship in v1)**. | quality/strategy | `01`, `05` | Lane docs predate the owner decision; a reader of 01/05 builds colorless. |
| K4 | `01` §3 and `05` §5.2 recommend the **Okabe-Ito `bucket-color.ts`** palette; canonical `07` §5.4 mandates a **new `group-accent.ts`** palette. Two different palettes. | quality | `01`, `05` | Palette source-of-truth conflict. |
| K5 | `05` specifies a `group-accent.ts` API (`GROUP_ACCENTS` array, single `hex`, `getGroupAccentHex`, ids incl. `moss/rust`) that **differs from canonical `07` §5.4** (`GroupAccentSwatch{id,label,ruleColor,dotColor}`, `resolveAccent`, ids `slate/stone/sage/teal/indigo/plum/rose/clay`). | quality/readiness | `05`, `07` | Implementer cannot tell which API to build. |
| K6 | **No concrete 8-swatch hex palette** exists for the canonical `GroupAccentSwatch` shape — `07` says "e.g. `#C7CAD1`"; `05`'s hexes are for the wrong ids and lack separate rule/dot colors. | readiness | new artifact / `07` | Implementer building to the canonical contract has no palette values. |
| K7 | `02` §2.1 mandates a DB `check(char_length(trim(name)) BETWEEN 1 AND 40)`; `07` §2.5 says **no DB length check** (app-layer soft cap). Direct contradiction. | quality/readiness | `02` vs `07` | Implementer ships a DB constraint 07 forbids (or vice-versa). |
| K8 | `02` §2.2 uses composite FK `(group_id, workspace_id, user_id)` + `unique(id, workspace_id, user_id)`; `07` §2.2 uses `group_id → project_groups(id)` + an **RLS `exists()` IDOR backstop**. Two different IDOR mechanisms. | quality/readiness | `02` vs `07`/`08` | Divergent schema; pick one canonical mechanism. |
| K9 | `02` §5 `ProjectGroupSummary` includes `createdAt`; `07` §3.1 says **omit timestamps**. | quality | `02` vs `07` | Contract drift on the single source-of-truth type. |
| K10 | `02` §6 names actions `assignProjectToGroup` / `updateProjectGroupAccent`; `07` §4 names them `moveProjectToGroup` / `recolorProjectGroup`. | quality | `02` vs `07` | Action-name drift. |
| K11 | The **~13 FIX@IMPL items** in `12` §4 are not integrated into `08`–`11`; they sit in a checklist. | readiness | `08`–`11`, `12` | A 100%-ready plan integrates its own review findings. |
| K12 | No single **requirement→unit→test traceability matrix** in the current pass (only in the superseded folder). | readiness | new artifact | Cannot prove coverage cold. |
| K13 | No crisp **implementer handoff / runbook** in the current pass (only in superseded folder). | readiness | new artifact | No single execution entry point. |
| K14 | No **per-phase rollback & recovery** plan; no per-phase **definition-of-done** gate. | readiness | new artifact | No safe-abort or done-criteria. |
| K15 | README "clone favorites RLS **verbatim**" is no longer literally true — `07` §2.3 adds an IDOR `exists()` backstop beyond favorites. | quality | `README`, `00` | "verbatim" claim contradicts the actual canonical RLS. |

The formal audit (10 lenses, codebase-grounded) extends this with any gaps the orchestrator
missed. Findings land in `01-AUDIT-FINDINGS-AND-SCORES.md`.

---

## 3. The canonical-precedence rule (how to resolve any contradiction)

When two docs conflict, the binding order is:

1. **`00-synthesis-and-decisions.md`** — the canonical decision record (D1–D16, owner Q1–Q4).
2. **`07-implementation-plan-overview-and-contracts.md`** — authoritative for every shared
   **name, type, signature, DOM anchor, storage key, and migration shape**.
3. **`08`–`11`** — the phase plans; must conform to `07`.
4. **`12`** — the review record; its fixes are folded into `07`–`11`.
5. **`01`–`06`** (lane analysis) — **subordinate**; where they conflict with 00/07, the
   lane doc is corrected or stamped, never the other way around.

**Consequence for K7/K8/K9/K10:** `07` wins on contract shape; `02` is reconciled **to**
`07`. Exception — when a lane doc is demonstrably *more correct* than the canonical layer
(e.g. `02`'s `workspaces(id)` FK reference and a structural-FK IDOR guard may be safer than
`07`'s RLS subquery), the orchestrator escalates the **mechanism choice** as a decision,
records it in `01-AUDIT-FINDINGS-AND-SCORES.md`, then updates **both** `07` and `02` to the
single chosen mechanism. Lane docs are never silently "right" against the spine; the spine
is updated deliberately or the lane doc yields.

---

## 4. File-ownership map (concurrency-safe parallel editing)

**Hard rule: one owner per file per wave.** No two agents edit the same file in the same
wave. Cross-cutting facts (a cap number, an action name) have a **single source-of-truth
owner**; every other doc references it rather than restating it.

| File | Sole-owner role (per wave) | May edit |
|---|---|---|
| `README.md` | Index/Strategy owner | banner, package-contents table, build sequence |
| `00-synthesis-and-decisions.md` | Canonical-decisions owner | §7 package map (K1), RLS-verbatim wording (K15) |
| `01-product-spec-and-ux-flows.md` | Product-lane reconciler | accent staleness (K3/K4), palette refs |
| `02-database-supabase-analysis.md` | DB-lane reconciler | K7/K8/K9/K10 reconciliation to `07` |
| `03`,`04`,`06` | Lane reconciler (read-mostly) | only if audit flags drift |
| `05-ui-reuse-and-design.md` | Design-lane reconciler | K3/K4/K5 accent reconciliation |
| `07-…contracts.md` | Contracts owner | palette hexes (K6), chosen IDOR mechanism (K8), RLS-note clarity |
| `08-plan-phase-1-db-and-types.md` | Phase-1 owner | integrate Phase-1 FIX@IMPL (K11) |
| `09-plan-phase-2-server-actions.md` | Phase-2 owner | integrate Phase-2 FIX@IMPL (K11) |
| `10-plan-phase-3-repository-and-page.md` | Phase-3 owner | integrate Phase-3 FIX@IMPL (K11) |
| `11-plan-phase-4-client-ui-and-tests.md` | Phase-4 owner | integrate Phase-4 FIX@IMPL (K11), zero-groups task |
| `12-adversarial-review.md` | Review-record owner | mark FIX@IMPL items as integrated, add round-2 record |
| **NEW** `13-requirements-traceability-matrix.md` | Traceability author | K12 |
| **NEW** `14-implementer-handoff-and-runbook.md` | Handoff author | K13 |
| **NEW** `15-rollback-and-recovery-and-dod.md` | Rollback/DoD author | K14 |

> The exact new-doc set is finalized after the audit (the completeness-critic lens may add
> or merge artifacts). Numbering continues from `12` to avoid collisions.

## 5. Conflict-resolution procedure (agent-to-agent)

Improvement agents do not edit each other's files. When agent A's change implies a change
in agent B's file:

1. Agent A records the cross-file implication in its return payload under
   `cross_file_requests: [{ target_doc, change, reason }]`.
2. The **orchestrator** is the single integrator: it collects all `cross_file_requests`,
   resolves conflicts using the §3 precedence rule, and either applies them itself or
   dispatches a follow-up wave with updated ownership.
3. Any genuine decision (not a mechanical fix) — e.g. the K8 IDOR-mechanism choice — is
   logged in `01-AUDIT-FINDINGS-AND-SCORES.md` §"Decisions taken" with rationale, so the
   record stays auditable.

This makes the orchestrator the merge point; agents never race on a file.

## 6. Vigilance against external concurrent agents

The repo is on `codex/fix-project-delete` with three in-flight code branches (C1/C2/C3).
This campaign **only touches `.ai/03_plans/2026-06-16-Project-Groups-Implementation/**`** —
no `src/`, no `supabase/`, no tests. Before each write wave the orchestrator re-checks
`git status` for that subtree to detect any other agent editing the same planning files; if
detected, it re-reads the live file before editing (never trusts a cached copy).

## 7. Campaign waves

1. **Wave 0 — Audit** (running): 10-lens codebase-grounded audit → scores + blockers.
2. **Wave 1 — Synthesize**: orchestrator merges audit + K-list → final gap list, scores,
   and decisions; writes `01-AUDIT-FINDINGS-AND-SCORES.md`.
3. **Wave 2 — Reconcile** (parallel, disjoint owners): fix all coherence/contradiction
   gaps (K1–K10, K15) and integrate FIX@IMPL (K11).
4. **Wave 3 — Author missing artifacts** (parallel, disjoint new files): K6, K12, K13, K14.
5. **Wave 4 — Verify**: fresh adversarial re-audit; loop Waves 2–4 until every axis ≥ 100
   with zero P0/P1. Then update README/00 status and write the closeout.

---

## 8. REFINED GOAL (2026-06-16) — the Master Implementation Guide capstone

The owner refined the mandate: the **headline deliverable is now a single, detailed,
comprehensive, executable implementation-guide document** that the implementing codebase
AI will follow to ship Project Groups with **0 errors, 100% accuracy and efficiency**. It
must add **phases, pros/cons per phase, a SWOT analysis**, and **cross-reference every doc**
in the package. Authored with the `superpowers:writing-plans` discipline (zero-context
engineer assumption, exact file paths, bite-sized TDD tasks with real code, frequent
commits, no placeholders).

The reconciliation (Wave 2) and new-artifact (Wave 3) work is the **prerequisite**: the
master guide can only be trustworthy if the contracts it binds to are contradiction-free.

### Revised new-document set (numbering continues from 12)
- **`13-requirements-traceability-and-qa-matrix.md`** — requirement (D1–D16, Q1–Q4, 01 §7
  acceptance) → unit/task → exact test file + `it(...)` name + assertion; adversarial QA
  matrix; security-control sub-matrix; doc-consistency `rg` checks; 100% scorecard.
- **`14-deploy-rollback-recovery-and-dod.md`** — migration apply order + types regen +
  advisor gate; per-phase DOWN/revert + recovery; LD-9 RLS-proof runbook; per-phase
  Definition-of-Done gate.
- **`15-MASTER-IMPLEMENTATION-GUIDE.md`** *(CAPSTONE)* — THE guide the codebase AI executes.
  Absorbs the implementer-handoff role. Structure: header (writing-plans) → executive
  overview + architecture + tech stack → **SWOT analysis** → cross-reference index to all
  docs (00–14) → preconditions/sequencing gate (C1/C2/C3) → **Phase 1–4**, each with
  **pros/cons**, dependency, contracts binding (to 07), and **bite-sized TDD tasks with real
  code + exact files + commands** → validation command block → STOP/escalate conditions →
  non-goals → per-phase Definition-of-Done. Binds verbatim to `07` contracts and the locked
  decisions; references `08`–`11` for task detail and `13`/`14` for trace + rollback.

### Revised waves
- **Wave 2 (in progress):** reconcile 00–12 to the locked decisions.
- **Wave 3 (after Wave 2):** author `13` + `14` in parallel (disjoint new files).
- **Wave 3.5 (capstone, after Wave 3):** author `15-MASTER-IMPLEMENTATION-GUIDE.md` —
  parallelized BY PHASE (one agent drafts each of Phase 1–4 + a SWOT/overview agent), each
  reading the reconciled phase doc + `07` contracts; the **orchestrator stitches** the
  sections into one coherent document with the global frame (header, cross-ref index,
  validation, DoD). Parallel drafting + single-integrator assembly keeps the narrative
  coherent while satisfying the parallel-dispatch mandate.
- **Wave 4 (verify):** fresh re-audit of the full package (now 00–15 + README) INCLUDING a
  dedicated "cold-execution" lens that tries to implement from `15` alone; loop until every
  axis ≥ 100 with zero P0/P1, then closeout.

### Capstone authoring uses writing-plans
`15` is authored under `superpowers:writing-plans`: assume a skilled engineer with zero
codebase context; exact paths; complete code in every step; exact commands + expected
output; DRY/YAGNI/TDD/frequent commits; no placeholders; self-review for spec coverage,
placeholders, and type consistency before declaring done.
