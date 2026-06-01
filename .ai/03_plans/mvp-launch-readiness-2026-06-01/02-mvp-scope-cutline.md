# MVP Scope Cutline

This cutline is route/action/API based. "Launch visible" means visible or callable by default in production.

## Scope Table

| Surface | Evidence | Launch visible? | MVP decision | Ticket | Owner decision needed? |
| --- | --- | --- | --- | --- | --- |
| `/workshop` home shell | `WorkshopPageShell.tsx:123` renders Ask Flip footer. | Yes today | Keep workshop, hide Ask Flip. | MVP-AI-001 | No |
| Ask Flip footer assistant | `EstimateCopilotFloatingButton.tsx:98`, `:533`, `:585`, `:677`, `:920`. | Yes today | Hide by default with public client flag. | MVP-AI-001 | No |
| `/api/ai/ask` | `route.ts:3` delegates to handler. | Yes today | Disabled by default before handler/provider/context/audit. | MVP-AI-002 | No |
| `/api/ai/package-builder` | `route.ts:3` delegates to handler. | Yes today | Disabled by default before handler/provider/context/audit/apply. | MVP-AI-003 | No |
| AI read tools/draft/apply flags | `feature-flags.ts:18` existing partial flags. | Partly internal | Add top-level `AI_ASK_ENABLED` and `AI_PACKAGE_BUILDER_ENABLED`. | MVP-AI-002, MVP-AI-003 | No |
| `/workshop/projects` | Build output dynamic; route remains core. | Yes | Keep. | MVP-QA-001 | No |
| Estimate sheet row editing | `EstimateSheetContent.tsx:3294`, `use-estimate-row-mutations.ts:114`. | Yes | Complete project-specific row behavior. | MVP-ROW-002 to MVP-ROW-005 | No |
| Library row insertion/replacement/delete | `actions.ts:1677`, `:1771`, `:1808`. | Yes | Keep and regression-test. | MVP-ROW-005 | No |
| Dedicated unlink | Not implemented. | No | Add schema-safe RPC/action/hook/UI. | MVP-ROW-001 to MVP-ROW-003 | No |
| Detached row field editor | Current row details component tab is read-oriented; `EstimateSheetContent.tsx:2504`. | Partial | Add editable project-specific fields only after detach. | MVP-ROW-004 | UX copy approval |
| `/workshop/library` | `page.tsx:13`, `LibraryPageClient.tsx:55`. | Yes | Polish only; no bulk import/export. | MVP-LIB-001, MVP-LIB-002 | No |
| `/workshop/templates` | `page.tsx:6`, `TemplatesPageClient.tsx:10`. | Yes | Polish; templates are structure bundles, not cost rows. | MVP-TPL-001, MVP-TPL-002 | No |
| Template seed migrations | `20260522091621_component_library_templates.sql:425`. | Backend | Do not duplicate seeds. | MVP-TPL-001 | No |
| Template insertion into estimate | `EstimateSheetContent.tsx:3759`, `actions.ts:1645`. | Yes inside estimate | Keep; add feedback tests. | MVP-TPL-002 | No |
| Proposal Excel export API | `proposal.xlsx/route.ts:41`. | Yes | Rewrite model/workbook contract. | MVP-XLS-001 to MVP-XLS-003 | Owner must approve commercial defaults |
| Export preview dialog | `ProposalExportPreviewDialog.tsx:40`. | Yes | Keep preview/download parity. | MVP-XLS-001 to MVP-XLS-003 | No |
| Public share routes | Build output includes `/share/[token]` and APIs. | Yes but not launch focus | Do not expand; only resolve blocking `test:dom` source-contract failure. | MVP-QA-001 | No |
| Teamspaces | `.ai/06_specs/teamspaces-collaboration-spec.md` only. | No | Defer. | None | No |
| Public landing/pricing/about | Build output visible. | Yes | Not part of MVP feature completion except launch smoke. | MVP-QA-001 | Owner copy approval only if changed |

## Feature Flags

| Flag | Type | Default | Purpose | Ticket |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_ASK_FLIP_ENABLED` | Client-public | `false` | Controls footer assistant rendering. | MVP-AI-001 |
| `AI_ASK_ENABLED` | Server-only | `false` | Gates `/api/ai/ask` before handler. | MVP-AI-002 |
| `AI_PACKAGE_BUILDER_ENABLED` | Server-only | `false` | Gates `/api/ai/package-builder` before handler. | MVP-AI-003 |
| Existing `AI_PACKAGE_BUILDER_*` flags | Server-only | Existing defaults | Keep as sub-feature flags behind top-level disabled gate. | MVP-AI-003 |

## Unknowns

| Unknown | Why it matters | Owner |
| --- | --- | --- |
| Final commercial terms defaults for export. | Workbook needs payment terms, validity, warranty, exclusions, signature/conforme blocks. | Philip |
| Whether launch wants 0% or 12% VAT default. | Affects formulas and client totals. | Philip |
| Whether duration/cost per sqm are required inputs or safe blanks. | Affects model and workbook validation. | Philip |
