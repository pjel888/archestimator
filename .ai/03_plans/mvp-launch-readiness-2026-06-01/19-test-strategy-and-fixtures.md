# Test Strategy and Fixtures

## Test Layers

| Layer | Purpose | Command/examples |
| --- | --- | --- |
| Unit | Pure helpers, mapping, formula refs. | `bun run test`, focused Vitest files. |
| Vitest DOM | UI state and interaction. | `bun run test:dom`, focused DOM bundles. |
| Route tests | API disabled/export behavior. | AI and export route tests. |
| RPC/migration tests | SQL contract and generated type expectations. | migration string tests plus linked SQL verification. |
| Integration tests | Row/action/hook/export model flow. | estimate row and proposal export tests. |
| Manual QA | Spreadsheet apps, protected route smoke, auth. | Runbook artifacts. |
| E2E smoke | Login/workshop/library/templates/estimate/export. | Playwright only against non-production unless approved. |

## Fixture Packs Needed

| Fixture | Data |
| --- | --- |
| `ai-disabled-fixture` | Mock provider, context reader, audit writer, package read tools/apply/memory. |
| `linked-row-fixture` | Linked row with `source_library_item_id`, `source_snapshot`, `linked-clean`, revision 3. |
| `overridden-row-fixture` | Linked row with local scalar edits, `linked-overridden`. |
| `manual-row-fixture` | No source id, `unlinked`. |
| `detached-row-fixture` | No source id, preserved source snapshot, `detached`, metadata detach fields. |
| `library-fixture` | Components with supplier, brand, category, pricing date/source, confidence, lifecycle, missing-field variants. |
| `template-fixture` | Persisted templates, empty persisted table, missing-table fallback, malformed template row. |
| `export-fixture` | Rows across A-I sections, Others, included/excluded/by-others statuses, zero qty, misc cost, contingency. |

## Feature Tests

| Feature | Test name | File | Fixture | Assertions | Failure mode covered |
| --- | --- | --- | --- | --- | --- |
| AI footer | `hides Ask Flip by default` | `estimate-copilot-floating-button.test.tsx` or shell test | env false | Trigger absent. | Deferred feature visible. |
| AI ask route | `disabled ask route does not call handler` | `ai-ask-route.test.ts` | provider/context/audit mocks | 403, zero calls. | Provider/context leakage. |
| Package route | `disabled package route does not call handler` | `ai-package-builder-route.test.ts` | read/provider/apply/audit/memory mocks | 403, zero calls. | AI write/read leakage. |
| Unlink RPC | `detaches linked row with history` | migration/action test | linked row | source id null, `detached`, revision +1, valid event. | Schema/data corruption. |
| Unlink conflict | `rejects stale revision` | action test | stale revision | Rejects, row unchanged. | Lost update. |
| Unlink UI | `confirms project-specific detach` | `EstimateSheetContent` DOM test | linked row | Badge, modal, success/error. | Accidental unlink. |
| Detached editor | `edits project-specific fields only` | DOM/action test | detached and linked rows | Detached enabled, linked disabled. | Linked provenance mutation. |
| Library search | `filters by supplier brand source category` | `component-library-manager-ui.test.tsx` | library fixture | Correct rows count/copy. | Missing filter dimension. |
| Library empty | `shows shared empty states` | same | empty/search miss | Shared copy and accessible text. | Blank/unclear state. |
| Templates preview | `shows template structure and totals` | `template-library-manager-ui.test.tsx` | template fixture | Groups/areas/rows/total visible. | Generic template route. |
| Template fallback | `does not fallback on empty persisted table unless intended` | repository test | empty/missing table mocks | Correct fallback behavior. | Seed/data masking. |
| Export model | `maps sections and scope statuses` | `proposal-export-model.test.ts` | export fixture | A-I/Others, included/excluded totals. | Wrong grouping/status. |
| Workbook formulas | `writes formulas and no blank totals` | `proposal-workbook.test.ts` | export fixture | Formula cells, zero excluded totals. | Blank/incorrect totals. |
| Export route | `downloads workbook with private headers` | `proposal-export-route.test.ts` | project/estimate mock | Headers, workbook sheets. | Unauthorized/bad response. |
| Preview parity | `preview totals match workbook model` | `proposal-export-preview.test.tsx` | export fixture | Same totals/issues. | Preview/download divergence. |

## CI Mapping

| CI step | Required before launch |
| --- | --- |
| `bun install --frozen-lockfile` | Pass |
| `bun run validate` or equivalent CI validation | Pass |
| `bun run type-check` | Pass |
| `bun run lint` | Pass or warnings accepted with owner note |
| `bun run lint:design-system` | Pass |
| `bun run test` | Pass |
| `bun run test:dom` | Pass |
| `bun run build` | Pass |
| Playwright protected smoke | Pass in staging/non-production |

## E2E Policy

Do not run mutating E2E against production. If E2E needs env flags, document:

- target URL,
- test account,
- dev-auth/prod-auth mode,
- whether data is disposable,
- why production was not used.

## ExcelJS Validation Strategy

- Load generated buffer with ExcelJS.
- Assert sheet count/names.
- Assert critical cells values.
- Assert column widths.
- Assert row freeze panes/page setup.
- Assert formula objects in line total, subtotals, grand total.
- Assert all line total cells are nonblank.
- Assert scope status column text is separate from numeric formula cells.
- Assert commercial blocks exist.

## Regression Policy

Every MVP ticket adds or updates tests before final launch gate. If a test is intentionally deferred, document it in `10-technical-risk-register.md` as accepted debt with owner and review date.
