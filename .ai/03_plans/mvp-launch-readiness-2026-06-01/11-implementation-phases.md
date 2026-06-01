# Implementation Phases

Phases are PR-sized and evidence-gated. Do not merge downstream work until upstream stop/go gates pass.

## Dependency Graph

```text
MVP-AI-001 -> MVP-AI-002 -> MVP-AI-003 -> MVP-QA-001
MVP-ROW-001 -> MVP-ROW-002 -> MVP-ROW-003 -> MVP-ROW-004 -> MVP-ROW-005 -> MVP-QA-001
MVP-LIB-001 -> MVP-LIB-002 -> MVP-QA-001
MVP-TPL-001 -> MVP-TPL-002 -> MVP-QA-001
MVP-XLS-001 -> MVP-XLS-002 -> MVP-XLS-003 -> MVP-QA-001
```

Parallelization:

- AI PR can run in parallel with library/template polish.
- Row SQL/RPC work should not run in parallel with row UI edits unless interface is locked.
- Export model and workbook can split only after `MVP-XLS-001` type contract is accepted.
- Final QA runs after all PRs land.

## Phase 1: AI Deferral

Tickets: MVP-AI-001, MVP-AI-002, MVP-AI-003

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

Tickets: MVP-ROW-001, MVP-ROW-002

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

Tickets: MVP-ROW-003, MVP-ROW-004, MVP-ROW-005

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

Tickets: MVP-LIB-001, MVP-LIB-002

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

Tickets: MVP-TPL-001, MVP-TPL-002

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

Tickets: MVP-XLS-001, MVP-XLS-002, MVP-XLS-003

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

Ticket: MVP-QA-001

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
