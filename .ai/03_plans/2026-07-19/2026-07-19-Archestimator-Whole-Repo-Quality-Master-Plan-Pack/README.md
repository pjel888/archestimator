# Archestimator Whole-Repo Quality Master Plan Pack

**Created:** 2026-07-19
**Run scope:** `PLAN_ONLY`
**Status:** historical provenance; superseded without implementation
**Successor:** `.ai/03_plans/2026-07-31/Code-Improvement/`
**Former canonical artifact:** `IMPLEMENTATION_PLAN.md` (not runnable)

This pack is no longer active authority. All 67 units are `SUPERSEDED` because
their current-source disposition and any runnable continuation now belong to the
successor above. `SUPERSEDED` records transfer of authority only; it does not
claim that any unit in this pack was implemented, completed, or verified.

## Target Result

This pack historically replaced three overlapping 2026-07-18 audit packs with
one reverified, dependency-ordered proposal. It preserves every source artifact
and the former unit graph for provenance. It must not be resumed or used to
select implementation work.

The consolidation itself does not implement product code, mutate D1, deploy,
run product tests, or perform browser validation.

## Authority Order

1. Repository `AGENTS.md` and current source.
2. `.ai/03_plans/2026-07-31/Code-Improvement/` for current plan-pack authority.
3. This folder only for historical provenance.

Within this historical pack, `IMPLEMENTATION_PLAN.md`, `UNIT-CATALOG.md`,
`EXECUTION-GUIDE.md`, and `LOOP_LEDGER.md` describe the former proposal and are
not runnable. `AUDIT-AND-DISPOSITION.md`, `SOURCE-INTEGRITY.md`, `evidence/`,
and `source-snapshots/` retain the original audit and integrity evidence.

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

## Historical Reading Order

1. `README.md`
2. `AUDIT-AND-DISPOSITION.md`
3. `IMPLEMENTATION_PLAN.md`
4. `EXECUTION-GUIDE.md`
5. `LOOP_LEDGER.md`

Open a source snapshot only for evidence or historical detail. Never resume any
unit from this predecessor; use the exact successor path above.

## Verification State

- GitNexus was refreshed at HEAD `7f9a484b42b0d951f219e3c4ce1bfbb4364e8847`:
  29,046 nodes, 71,238 edges, 1,471 clusters, and 300 flows.
- Three independent read-only audit lanes reverified the source units against
  current code and GitNexus.
- The 85 source IDs resolved to 67 proposed atomic units. The historical
  manifest now marks all 67 `SUPERSEDED` and advertises no ready slices.
- React Doctor produced a fresh static baseline with 431 diagnostics; the raw
  JSON and its bounded interpretation are retained under `evidence/`.
- Product tests, builds, browser automation, screenshots, and visual QA were
  not requested and were not used as completion gates.

## Historical Consolidation Stop Condition

The original consolidation intended to be complete when:

- every source item has exactly one explicit disposition;
- every surviving requirement maps to one canonical owner or atomic unit set
  and an acceptance criterion;
- duplicate, implemented, invalid, outdated, and evidence-only items are not
  independently runnable;
- the three predecessor folders exist only at their recorded archive paths;
- inbound active-plan references point to the current successor or an archive
  receipt;
- static plan-pack, planning-prompt, integrity, and scoped-diff checks pass.
