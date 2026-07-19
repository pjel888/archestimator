# Source Snapshot Integrity

## Contract

`source-snapshots/` is an immutable evidence layer. The source pack directories
were copied before any archive-state edits. No notice, disposition, manifest
rewrite, or generated receipt is inserted inside a snapshot directory.

The aggregate hash is produced from the sorted per-file SHA-256 output while
running from the relevant source root:

```bash
find . -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256
```

## Copy Proof

| Source snapshot | Files | Bytes | Aggregate SHA-256 |
| --- | ---: | ---: | --- |
| `2026-07-18-Archestimator-Whole-Repo-Performance-Audit` | 43 | 2,424,029 | `1fac58c222cefbb09764ee4dc40e698243c7bd52c877a2c75562e9961cab1755` |
| `2026-07-18-Codebase-Improve-Audit-Plan-Pack` | 34 | 275,352 | `9ed7daf928afcbea1dbb2d7f76e290833cb58d0840f603494ea1bc250830491e` |
| `2026-07-18-Whole-App-Consistency-Audit` | 30 | 143,979 | `1161cec4ff34ee9a9185f0c695d2834b4117f76c960fa7d9c067841713e3a438` |

At copy time, each snapshot matched its active source in file count, byte count,
and aggregate SHA-256. This proves content preservation without treating the
old execution wording as current authority.

## Recorded Archive Destinations

| Source | Archive destination |
| --- | --- |
| Performance audit | `.ai/09_archive/store/2026-07-18-Archestimator-Whole-Repo-Performance-Audit-superseded/` |
| Improve audit | `.ai/09_archive/store/2026-07-18-Codebase-Improve-Audit-Plan-Pack-superseded/` |
| Consistency audit | `.ai/09_archive/store/2026-07-18-Whole-App-Consistency-Audit-superseded/` |

These destinations were absent before the move and now contain the complete
predecessor folders. No redirect stub remains under `.ai/03_plans/`.

## Additional Evidence

| Artifact | SHA-256 |
| --- | --- |
| `evidence/react-doctor-2026-07-19.json` | `b4785c909dd8070f5110c5cd847efe5673ee5f4d89e90104367daf8de326c1cd` |

## Archive Proof

Verified after the 2026-07-19 move:

| Archived predecessor | Files | Bytes | Snapshot comparison | Manifest validation |
| --- | ---: | ---: | --- | --- |
| Performance audit | 44 | 2,424,555 | PASS excluding only `ARCHIVE-DISPOSITION.md` and lifecycle `plan-pack.json` | PASS |
| Improve audit | 35 | 276,454 | PASS excluding only `ARCHIVE-DISPOSITION.md` | N/A; source pack has no manifest |
| Consistency audit | 31 | 144,544 | PASS excluding only `ARCHIVE-DISPOSITION.md` and lifecycle `plan-pack.json` | PASS |

The one-file increase in each archive is the disposition receipt. Performance
and consistency retain their original manifest path with only terminal archive
state/hash changes; every other file is byte-identical to the immutable snapshot.
The improve pack has no manifest rewrite. A live `.ai` sweep found zero old
active `.ai/03_plans/...` predecessor paths outside archives and snapshots.
