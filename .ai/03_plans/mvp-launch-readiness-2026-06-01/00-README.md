# MVP Launch Readiness Command Center

Status: SECOND PASS COMPLETE - implementation-ready planning package, not product implementation.
Commit audited: `b6184cf7123ed46f4cd8b9a467feb5232f0b46bf`
Audit date: 2026-06-01
Scope: docs-only upgrade inside `.ai/03_plans/mvp-launch-readiness-2026-06-01`.

## Scope Lock

Launch scope is locked to:

1. Defer Ask Flip and package-builder AI by default.
2. Ship project-specific estimate rows, including a schema-safe unlink path.
3. Polish component library route quality without reviving bulk import/export or overbuilt manager scope.
4. Polish template route quality without duplicate seed migrations.
5. Replace current Excel export with a professional bid/BOQ workbook contract.
6. Gate launch through evidence, QA, deployment proof, rollback, and owner sign-off.

Out of scope for MVP launch:

- Full Ask Flip launch.
- AI Apply beyond disabled/default-off route gates.
- New template authoring UI.
- Bulk library import/export.
- Teamspaces.
- Public share overhaul expansion.
- Labor/material split data model migration beyond export compatibility mode.

## P0 Blockers

| Blocker | Evidence | Required ticket |
| --- | --- | --- |
| Ask Flip is still rendered in every workshop shell route. | `src/components/workshop/WorkshopPageShell.tsx:5`, `src/components/workshop/WorkshopPageShell.tsx:123`; GitNexus impact risk CRITICAL across 7 workshop processes. | MVP-AI-001 |
| AI ask and package-builder API routes are still build-visible and call handlers directly. | `src/app/api/ai/ask/route.ts:3`, `src/app/api/ai/package-builder/route.ts:3`; build output lists `/api/ai/ask` and `/api/ai/package-builder`. | MVP-AI-002, MVP-AI-003 |
| Unlink first-pass SQL used invalid schema. | Real row column is `estimate_row_items.node_id`, not `area_node_id`: `src/lib/supabase/types.ts:1127`; real event columns at `src/lib/supabase/types.ts:1241`. | MVP-ROW-001 |
| Current export is not yet the industry bid-form workbook. | Workbook has only `Proposal Summary`, `Detailed Estimate`, optional `Area Breakdown`: `src/lib/proposal-export/create-proposal-workbook.ts:271`; static totals at `create-proposal-workbook.ts:186` and `create-proposal-workbook.ts:204`. | MVP-XLS-001 to MVP-XLS-003 |
| `bun run test:dom` fails today. | 2 source-contract failures in AI package-builder security test, 1 source-contract failure in share recipient test. | MVP-QA-001 |
| Production launch proof is absent. | No Vercel production deployment proof, Supabase migration proof, auth proof, or export manual QA artifact captured in this folder. | MVP-QA-001 |

## P1 Polish

| Area | Required outcome | Tickets |
| --- | --- | --- |
| Component library | Consistent search/filter copy, empty/loading/error states, trust fields, and fixture-backed DOM coverage. | MVP-LIB-001, MVP-LIB-002 |
| Templates | Preview/details, shared empty states, route error boundary, insertion feedback coverage. | MVP-TPL-001, MVP-TPL-002 |
| Estimate row UX | Link-state badges, project-specific confirmation, editable detached fields, history tests. | MVP-ROW-002 to MVP-ROW-005 |
| Excel export | Sheet-by-sheet workbook spec, formulas, no blank line totals, commercial blocks, manual QA. | MVP-XLS-001 to MVP-XLS-003 |

## Implementation Sequence

1. PR 1: AI deferral gates (`MVP-AI-001` to `MVP-AI-003`). Stop gate: UI hidden and disabled routes make zero provider/context/audit calls.
2. PR 2: Schema-safe row unlink contract (`MVP-ROW-001`, `MVP-ROW-002`). Stop gate: migration/RPC proof and row revision conflict tests.
3. PR 3: Row UX and history (`MVP-ROW-003` to `MVP-ROW-005`). Stop gate: detached row editing and activity proof.
4. PR 4: Library polish (`MVP-LIB-001`, `MVP-LIB-002`). Stop gate: route DOM and data quality fixtures.
5. PR 5: Template polish (`MVP-TPL-001`, `MVP-TPL-002`). Stop gate: persisted-template and fallback behavior covered.
6. PR 6: Export workbook (`MVP-XLS-001` to `MVP-XLS-003`). Stop gate: ExcelJS assertions plus manual QA in Excel/Numbers/LibreOffice/Google Sheets.
7. PR 7: Launch proof (`MVP-QA-001`). Stop gate: checklist, runbook, deployment evidence, owner sign-off.

## Go/No-Go Rule

Go only when:

- All P0 checklist rows in `09-release-readiness-checklist.md` are Pass.
- `12-final-mvp-launch-gate.md` has owner sign-off.
- `14-evidence-index.md` has current command output and deployment proof.
- Ask Flip is hidden and both AI API routes are disabled by default.
- Excel export manual QA has proof artifacts.

No-go if any P0 remains Open, Waived, or Unknown.

## What Changed From First Pass

- Replaced schema-invalid unlink SQL with a schema-accurate contract grounded in generated types and migrations.
- Added a data/RPC/migration contract document.
- Added central blast-radius register with graph/GitNexus evidence.
- Added PR-sized ticket map.
- Rewrote Excel export into a workbook engineering specification based on the bid-form patterns supplied in the prompt.
- Converted generic library/template polish into exact state, source, UI, and test contracts.
- Added evidence index, test strategy, and launch runbook.
- Reclassified `bun run test:dom` failures as launch-gate evidence requiring investigation.

## Document Map

| Doc | Purpose |
| --- | --- |
| `01-codebase-audit.md` | Verified route, schema, RPC, UI, test, and command baseline. |
| `02-mvp-scope-cutline.md` | Route/action/API launch visibility and ticket ownership. |
| `03-deferred-features-plan.md` | Exact Ask Flip/package-builder deferral plan. |
| `04-mvp-feature-completion-plan.md` | Feature implementation matrix. |
| `05-component-library-polish-plan.md` | Component library implementation plan. |
| `06-template-polish-plan.md` | Template route implementation plan. |
| `07-project-specific-unlink-components-plan.md` | Schema-safe project-specific unlink plan. |
| `08-excel-export-industry-standard-plan.md` | Workbook engineering specification. |
| `09-release-readiness-checklist.md` | Owner/evidence/pass-fail launch checklist. |
| `10-technical-risk-register.md` | Risk register and accepted debt. |
| `11-implementation-phases.md` | PR sequencing, dependency graph, commands, rollback. |
| `12-final-mvp-launch-gate.md` | Final go/no-go gate. |
| `13-second-pass-quality-audit.md` | Meta-review of first pass and second-pass corrections. |
| `14-evidence-index.md` | Evidence register. |
| `15-blast-radius-register.md` | Blast-radius evidence by target. |
| `16-implementation-ticket-map.md` | PR-sized implementation tickets. |
| `17-data-contracts-rpc-migrations.md` | SQL/RPC/TypeScript data contracts. |
| `18-excel-reference-analysis.md` | Bid-form reference analysis and product requirements. |
| `19-test-strategy-and-fixtures.md` | Test and fixture plan. |
| `20-launch-runbook.md` | Launch operations runbook. |
