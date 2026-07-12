# Absorbed 2026-07-11 Requirements

This receipt preserves the unimplemented `Proposals-Feature` plan while making
the newer audit the sole active authority. All predecessor units were
`NOT_STARTED`; no completion is inferred by this merge.

| Predecessor unit | Disposition in this pack |
|---|---|
| UNIT-001 collection layout | B1 / Slice 4 |
| UNIT-002 proposal card | B6 / Slice 5 |
| UNIT-003 tabs, search, sort, view modes | B2–B5 / Slice 4 |
| UNIT-004 grouping | Deferred from V1 by DEC-AUTO-105 |
| UNIT-005 optional client name | Deferred unless current implementation proves it valuable |
| UNIT-006 skeleton and empty/error states | B8–B9 / Slice 5 |
| UNIT-007 share/review audit | Bounded follow-up in Slice 6; no duplicate shared-page redesign |
| UNIT-008 publisher flow audit | Bounded follow-up in Slice 6; completed publisher work is not re-planned |
| UNIT-009 XLSX edge audit | Slice 6 |
| UNIT-010 stale reconciliation | Final Slice 6 completion activity |
| UNIT-011 wrong-account recovery CTA | B8 secondary empty-state copy |
| UNIT-012 share terminal states/link | Slice 6 only if current audit finds an inbox-impacting defect |
| UNIT-013 stale risk reconciliation | Final Slice 6 completion activity |
| UNIT-014 responded delivery status | A3 / Slice 2 |
| UNIT-015 recipient staleness surface | Preserved TanStack Query behavior; reconsider only with current evidence |
| UNIT-016 contractor-name XLSX leak | Slice 6 XLSX audit/fix surface |

The July 12 audit adds P1 row-resilience, decision typing, and error logging;
they are A1+A2 in Slice 1. Its `LIMIT 51` truncation decision is A4 in Slice 3.
