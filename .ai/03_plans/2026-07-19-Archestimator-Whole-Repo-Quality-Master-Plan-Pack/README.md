# Archestimator Whole-Repo Quality Master Plan Pack

**Created:** 2026-07-19
**Run scope:** `PLAN_ONLY`
**Status:** active consolidation authority; implementation not started
**Canonical execution artifact:** `IMPLEMENTATION_PLAN.md`

## Target Result

This pack replaces three overlapping 2026-07-18 audit packs with one reverified,
dependency-ordered execution authority. It preserves every source artifact,
separates current work from stale or unsafe directions, merges duplicate work,
and gives future executors one resumable unit graph.

The consolidation itself does not implement product code, mutate D1, deploy,
run product tests, or perform browser validation.

## Authority Order

1. Repository `AGENTS.md` and current source.
2. `IMPLEMENTATION_PLAN.md` for runnable work, dependencies, ownership, and stop
   conditions.
3. `AUDIT-AND-DISPOSITION.md` for the source-item-to-master disposition map.
4. `EXECUTION-GUIDE.md` for multi-agent ownership and receipt rules.
5. `LOOP_LEDGER.md` for resumable state.
6. `SOURCE-INTEGRITY.md` and `source-snapshots/` for historical evidence only.

No file below `source-snapshots/` is runnable authority. Its original wording,
status, dependencies, test claims, and readiness claims are preserved verbatim
for provenance and can be stale, refuted, unsafe, or duplicated.

## Source Packs Absorbed

- `2026-07-18-Archestimator-Whole-Repo-Performance-Audit`
- `2026-07-18-Codebase-Improve-Audit-Plan-Pack`
- `2026-07-18-Whole-App-Consistency-Audit`

Each source folder is copied byte-for-byte under `source-snapshots/`. The three
original active folders are archived only after the consolidated pack and its
coverage map validate.

Recorded archive destinations:

- `.ai/09_archive/store/2026-07-18-Archestimator-Whole-Repo-Performance-Audit-superseded/`
- `.ai/09_archive/store/2026-07-18-Codebase-Improve-Audit-Plan-Pack-superseded/`
- `.ai/09_archive/store/2026-07-18-Whole-App-Consistency-Audit-superseded/`

## Reading Order

1. `README.md`
2. `AUDIT-AND-DISPOSITION.md`
3. `IMPLEMENTATION_PLAN.md`
4. `EXECUTION-GUIDE.md`
5. The active unit named by `plan-pack.json#next_unit`
6. `LOOP_LEDGER.md`

Open a source snapshot only when a canonical unit cites it for evidence or
historical detail. Never resume the predecessor's old `next_unit`.

## Verification State

- GitNexus was refreshed at HEAD `7f9a484b42b0d951f219e3c4ce1bfbb4364e8847`:
  29,046 nodes, 71,238 edges, 1,471 clusters, and 300 flows.
- Three independent read-only audit lanes reverified the source units against
  current code and GitNexus.
- The 85 source IDs resolve to 67 atomic units; 42 dependency-ready units are
  exposed through six non-overlapping ownership slices.
- React Doctor produced a fresh static baseline with 431 diagnostics; the raw
  JSON and its bounded interpretation are retained under `evidence/`.
- Product tests, builds, browser automation, screenshots, and visual QA were
  not requested and were not used as completion gates.

## Stop Condition

Consolidation is complete only when:

- every source item has exactly one explicit disposition;
- every surviving requirement maps to one canonical owner or atomic unit set
  and an acceptance criterion;
- duplicate, implemented, invalid, outdated, and evidence-only items are not
  independently runnable;
- the three predecessor folders exist only at their recorded archive paths;
- inbound active-plan references point to this pack or an archive receipt;
- static plan-pack, planning-prompt, integrity, and scoped-diff checks pass.
