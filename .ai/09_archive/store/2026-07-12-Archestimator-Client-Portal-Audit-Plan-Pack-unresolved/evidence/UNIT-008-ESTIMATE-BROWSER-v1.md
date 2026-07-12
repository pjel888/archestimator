# UNIT-008 Estimate Browser Receipt

## Scope and status

- **Unit:** `UNIT-008`
- **Run scope:** `IMPLEMENT_LOCAL`
- **Result:** `PASS`
- **Implementation:** `src/lib/client-portal/estimate-browser.ts`, `src/components/client-portal/EstimateBrowserSection.tsx`, and Client Portal section rendering.
- **Focused tests:** Client Portal focused Vitest suite — 17 passed.
- **Static verification:** isolated estimate-browser/shell TypeScript program — passed.

## Delivered contract

- A versioned, issued estimate-browser payload maps legacy estimate rows and compact tab `rowIds` into a single safe row projection.
- Every retained row has a deterministic page position. The renderer starts bounded, exposes Load more and Load all, and expands all rows on `beforeprint`.
- The projection contains only ID, sheet/tab hierarchy, designation, description, discipline, quantity, unit, and line total. Material/product/source data is not serialized.
- The Client Portal shell dispatches `estimate_browser` payloads to the dedicated table rather than generic JSON rendering.

## Acceptance review

| Acceptance claim | Evidence | Result |
|---|---|---|
| Every issued row is reachable | Deterministic page helper and test cover the second row with page size one; UI exposes Load all. | PASS |
| Hidden fields are absent | Focused test asserts private material content is absent from the issued payload. | PASS |
| No silent cap | Payload carries total row count/page size; UI labels the count and has explicit continuation controls. | PASS |
| Legacy compact tabs remain readable | Test resolves `rowIds` through estimate-level legacy rows. | PASS |

## Validation boundary

The adapter is ready for a publisher callback to persist it through the Unit 5 issue builder. Tree-node visualization, discussion writes, and hosted print-device proof remain later owned integration work.

## Next unit

`UNIT-009` owns financial summary, cost-breakdown, and comparison adapters.
