<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Roadmap Truth Sync and Status Gates

This pack is a planning artifact. It must not be used to archive or close performance roadmap work until implementation and provider proof exist.

## Status labels

| Label | Meaning |
| --- | --- |
| `PLANNED` | Docs exist; no code or provider proof. Current status of this folder. |
| `BASELINE CAPTURED` | Speed Insights/local/hosted baseline evidence exists, but no optimization shipped. |
| `IMPLEMENTED LOCALLY` | Code changed and local tests/traces pass; provider proof not yet captured. |
| `PROVIDER PROOF OPEN` | Hosted or Speed Insights proof still pending/insufficient. |
| `COMPLETE` | Implementation, local tests, hosted proof, and Speed Insights/provider/manual evidence all pass. |
| `ROLLED BACK` | A shipped performance change was reverted or disabled. |

## Roadmap sync rule

Before updating any roadmap/dashboard/archive status, verify:

1. current git branch/commit,
2. changed files and tests,
3. evidence index entries,
4. Vercel deployment id/URL,
5. Speed Insights route/device p75 window,
6. provider/manual proof status,
7. rollback state.

If any item is missing, use `PROVIDER PROOF OPEN` or `IMPLEMENTED LOCALLY`, not `COMPLETE`.

## Gate mapping

| Future milestone | Required docs/evidence before status update |
| --- | --- |
| Performance baseline ready | `01`, `12`, `16`, `21` filled with baseline values/artifacts |
| First public performance PR ready | Scorecard hypothesis H1/H2/H3/H4 selected, Blueprint A followed, acceptance criteria met |
| Workshop/estimate performance PR ready | H5 selected, fixture spec met, profiler evidence attached |
| Query/data performance PR ready | H6 selected, EXPLAIN/RLS proof attached |
| Share/proposal performance PR ready | H7/H8 selected, security/export evidence attached |
| Performance work complete | all target metrics provider-proven; no open security/provider/manual gates |

## Truth-sync warning

Do not trust stale plan folders, archive names, or prior reports as completion proof. This folder intentionally preserves open provider evidence gates until live proof is attached.
