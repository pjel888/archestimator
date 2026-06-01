# Second-Pass Quality Audit

## What Was Good In First Pass

- Correct MVP direction: defer AI, finish project-specific row behavior, polish library/templates, upgrade export, create launch gate.
- Correctly recognized Excel export as a launch-quality issue.
- Correctly treated launch readiness as more than code completion.
- Correctly separated feature completion from deferred features.

## What Was Insufficient

- Tasks were too broad to execute as PRs.
- Several current-state claims lacked file/symbol/schema evidence.
- Blast-radius evidence was missing or too generic.
- Export plan was professional in intent but not a workbook contract.
- Component library/template plans said "polish" without exact state, copy, data source, and tests.
- Release checklist lacked owners, artifact paths, pass/fail criteria, and rollback triggers.

## Incorrect Assumptions Found

| Assumption | Correction |
| --- | --- |
| `estimate_row_items.area_node_id` exists. | False. Actual column is `node_id`. |
| `estimates.workspace_id` exists. | False. Resolve via `estimates.project_id -> projects.workspace_id`. |
| `estimate_sheet_events` accepts `project_id`, `target_type`, `target_id`, `actor_id`, `snapshot`. | False. Use actual event columns from generated types. |
| Unlink metadata belongs in `source_snapshot`. | Unsafe. Preserve `source_snapshot`; write unlink metadata to `metadata` and event payload/metadata. |
| Templates may need new Supabase seed migration. | False for current seeds. Template tables/seeds already exist in `20260522091621_component_library_templates.sql`. |
| Labor cost is simply impossible. | Incomplete. Legacy schema had labor/supplementary fields; current schema consolidated them into `misc_cost`. |
| Current UI uses a row action menu. | Not verified. Current UI uses row buttons/modal controls. |

## Schema Mismatches Fixed

- Replaced `area_node_id` with `node_id`.
- Replaced direct `estimates.workspace_id` logic with `resolve_estimate_workspace`.
- Replaced invalid event insert shape with actual `estimate_sheet_events` columns.
- Clarified event type is text, so a new event string does not need enum migration.
- Clarified RPC migration is still required for a new function.

## Missing Blast-Radius Evidence Added

Added `15-blast-radius-register.md` with:

- GitNexus impacts for AI shell/footer/routes/handlers.
- GitNexus impacts for row actions/hook.
- GitNexus impacts for library/template route clients.
- GitNexus impacts for export model/workbook/preview.
- Graph overview and knowledge-gap evidence.

## Missing Tests Added To Plan

- Disabled AI no-provider/no-context/no-audit tests.
- Unlink RPC/action/hook/history/revision tests.
- Link-state badge and detached editor DOM tests.
- Library fixture/data-quality tests.
- Template persisted/fallback and route error tests.
- ExcelJS formula/sheet/layout tests.
- Manual Excel/Numbers/LibreOffice/Google Sheets QA.

## Changes Made In Second Pass

- Rewrote all 12 existing docs.
- Added docs 13-20.
- Converted launch plan into PR-sized tickets.
- Added command baseline and focused test results.
- Added schema-accurate data/RPC contracts.
- Added launch runbook and final go/no-go gate.

## Remaining Uncertainties

| Uncertainty | Owner | Required resolution |
| --- | --- | --- |
| VAT default and contingency calculation strategy. | Philip | Approve before MVP-XLS-001. |
| Commercial terms, validity, warranty copy. | Philip | Approve before MVP-XLS-002. |
| Attached bid files were not present locally. | Philip/Eng | Provide or manually review references before launch QA. |
| `test:dom` share source-contract failure scope. | Eng | Fix or formally classify before final gate. |
