# Implementation Phases

## Third-Pass PR Dependency Graph

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. Implementation must proceed in evidence-gated slices; do not batch unrelated launch risks into one PR.

| Phase | PR / Tickets | Can run in parallel with | Stop/go gate | Commands | Evidence | Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Fix current red DOM tests if separate from `AI-001` | Docs/legal drafting | `bun run test:dom` green or superseded by stronger tests | `bun run test:dom` | test log | Revert test changes |
| 1 | `AI-001`, env slice of `INFRA-001` | Legal drafting, demo planning | AI hidden and routes disabled | typecheck, lint, targeted tests, build | no-provider tests, screenshot | flags false/revert UI gate |
| 2 | `ONB-001`, `AUTH-001` | `LIB-001` analysis | Hosted auth/first-run smoke green | validate, auth E2E | staging/prod auth log | revert env/callback changes |
| 3 | `LIB-001`, `TPL-001` | legal/support docs | Library/template UI credible | DOM tests, manual screenshots | screenshot set | hide nav or revert UI |
| 4 | `UNLINK-001`, unlink slice of `SEC-001` | `EXP-001` model planning | Detached row safe; library unchanged | RPC/action/UI tests, SQL proof | SQL/test/manual log | revert migration/action/UI |
| 5 | `EXP-001`, export slice of `PERF-001` | `INFRA-002` DNS setup | Workbook opens/formulas pass | ExcelJS tests, build, manual open | XLSX artifact | disable export/revert workbook |
| 6 | `INFRA-002`, platform `SEC-001` | `OBS-001` setup | RLS/storage/email proof green | SQL, webhook tests, deploy smoke | logs/dashboard | disable share/invite/email |
| 7 | `LEGAL-001`, `OBS-001` | `DATA-001` prep | legal/support/alerts ready | route tests, alert smoke | sign-off/dashboard | closed beta hold |
| 8 | `DATA-001`, full `QA-002` | demo script | backup/restore and zero-defect matrix pass | full baseline + safe E2E | backup and command logs | restore/revert |
| 9 | `DEMO-001`, `BETA-001` | none | demo/beta checklists green | smoke rehearsal | demo/beta artifacts | pause demo/invites |

Parallelization map: docs/legal/demo planning can run while engineering PRs proceed; code touching `EstimateSheetContent`, row RPCs, export model/workbook, and share/invite routes should be staged to avoid shared-file conflicts.

Phases are PR-sized and evidence-gated. Do not merge downstream work until upstream stop/go gates pass.

## Dependency Graph

```text
AI-001 -> AI-001 -> AI-001 -> QA-002
UNLINK-001 -> UNLINK-001 -> UNLINK-001 -> UNLINK-001 -> UNLINK-001 -> QA-002
LIB-001 -> LIB-001 -> QA-002
TPL-001 -> TPL-001 -> QA-002
EXP-001 -> EXP-001 -> EXP-001 -> QA-002
```

Parallelization:

- AI PR can run in parallel with library/template polish.
- Row SQL/RPC work should not run in parallel with row UI edits unless interface is locked.
- Export model and workbook can split only after `EXP-001` type contract is accepted.
- Final QA runs after all PRs land.

## Phase 1: AI Deferral

Tickets: AI-001

Files:

- `src/components/workshop/WorkshopPageShell.tsx`
- `src/components/workshop/EstimateCopilotFloatingButton.tsx`
- `src/app/api/ai/ask/route.ts`
- `src/app/api/ai/package-builder/route.ts`
- `src/lib/ai/package-builder/feature-flags.ts`
- `.env.example`
- AI route/footer tests

Commands:

```bash
bun run type-check
bunx vitest run tests/vitest/ai-ask-route.test.ts tests/vitest/ai-package-builder-route.test.ts tests/vitest/estimate-copilot-floating-button.test.tsx --maxWorkers=1
```

Evidence:

- Disabled route no-call tests.
- DOM hidden footer test.
- Env docs.

Rollback:

- Set all AI flags false and redeploy.

## Phase 2: Row Unlink Data Contract

Tickets: UNLINK-001

Files:

- Supabase migration for unlink RPC.
- `src/lib/supabase/types.ts` after generation.
- `src/lib/estimates/actions.ts`
- `src/hooks/use-estimate-row-mutations.ts`

Commands:

```bash
bun run type-check
bunx vitest run tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
```

Evidence:

- Migration test.
- Generated type diff.
- RPC row revision/history tests.

Rollback:

- Drop RPC function and hide action.

## Phase 3: Row UX

Tickets: UNLINK-001

Files:

- `src/lib/estimates/types.ts`
- repository/tree DTO mapping files
- `src/lib/estimates/estimate-row-tree-patch.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- DOM/history tests

Commands:

```bash
bun run type-check
bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-row-tree-patch.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
```

Evidence:

- Badge/confirmation/editor screenshots or DOM assertions.
- History event proof.

Rollback:

- Hide unlink affordance and detached editor.

## Phase 4: Library Polish

Tickets: LIB-001

Commands:

```bash
bun run lint:design-system
bunx vitest run tests/vitest/component-library-manager-ui.test.tsx --maxWorkers=1
```

Evidence:

- Search/empty/error/trust field tests.
- Visual QA notes.

Rollback:

- Revert UI polish only.

## Phase 5: Template Polish

Tickets: TPL-001

Commands:

```bash
bunx vitest run tests/vitest/template-library-manager-ui.test.tsx tests/vitest/component-library-templates-repository.test.ts tests/vitest/component-library-templates-schema.test.ts --maxWorkers=1
```

Evidence:

- Preview/details tests.
- Persisted/fallback tests.
- Route error boundary test.

Rollback:

- Revert route polish; keep current read-only route.

## Phase 6: Excel Export

Tickets: EXP-001

Commands:

```bash
bunx vitest run tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-preview.test.tsx --maxWorkers=1
```

Evidence:

- ExcelJS workbook assertions.
- Manual QA proof in Excel, Numbers, LibreOffice, Google Sheets.

Rollback:

- Revert workbook/model changes or disable download route.

## Phase 7: Launch Proof

Ticket: QA-002

Commands:

```bash
bun install --frozen-lockfile
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run build
```

Additional proof:

- Supabase linked migration apply/verify.
- Vercel preview/staging/prod deploy proof.
- Production auth callback smoke.
- Protected workshop route smoke.
- Export manual QA.
- Owner sign-off.

Rollback:

- Follow `20-launch-runbook.md`.
