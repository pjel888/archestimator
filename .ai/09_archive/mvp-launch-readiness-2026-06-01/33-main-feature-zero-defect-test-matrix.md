# Main Feature Zero-Defect Test Matrix

## Fourth-Pass Closed Beta Test Rows - 2026-06-02

Add zero-defect rows:

| Feature | Required closed beta result |
| --- | --- |
| Allowlist access | Non-whitelisted Google-authenticated user cannot access `/workshop`. |
| Whitelisted access | Whitelisted Google-authenticated user can access `/workshop`. |
| Revoked access | Revoked user is blocked even with an existing session. |
| Public routes | Marketing, legal, share, and invite routes remain accessible as designed. |
| First-run onboarding | Whitelisted no-workspace user reaches default workspace path. |
| Feedback path | Beta user can report feedback/support from visible route or in-app link. |
| Pricing copy | No visible copy implies active payment, checkout, or public paid launch. |
| Beta legal | Terms/privacy/AUP/disclaimers match closed beta status. |

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

Current local command baseline: **repo-local implementation frozen at `6ab5b38`; green for type/lint/unit/DOM/build, with validation and build refreshed at `353dd48` and final focused local proof refreshed at 4 files / 52 tests**.

- `bun run type-check`: pass.
- `bun run lint`: pass with the existing 14 warnings and 0 errors.
- `bun run lint:design-system`: pass.
- `bun run test`: pass, 4 unit tests / 129 expectations.
- `bun run test:dom`: pass, 151 files / 1119 passed / 2 skipped through `bun run validate`.
- `bun run build`: pass at `353dd48`, including `/api/health` as a dynamic route and 32 static pages.
- `bunx vitest run tests/vitest/workshop-reset.test.tsx tests/vitest/template-library-manager-ui.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1`: pass, 4 files / 52 tests.

Launch state remains **NO-GO** until hosted auth/RLS/provider, manual smoke, backup/restore, spreadsheet open, and deployment/rollback evidence are collected.

| Feature | Critical path | Failure modes | Automated tests | Manual tests | Production smoke | Owner acceptance | P0 no-go |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth/onboarding | Login -> callback -> workshop -> first project | bad callback, no workspace, expired magic link | auth callback/proxy/magic link/E2E | new/returning/expired/invited | hosted auth smoke | Product/Eng | auth fails |
| Project creation/list/detail | Create/list/open project | RLS denial false positive/negative, validation failure | project action/DOM/RLS; local create-modal required-name validation covered in `new-project-form-validation.test.tsx` | create/open/delete if visible | staging/prod project smoke | Eng | cannot create/open |
| Estimate sheet create/open/duplicate | Create/open/duplicate estimate | wrong project, stale cache, duplicate missing rows | estimate action/DOM; local estimate-list empty/create/search states covered in `project-estimates-client-create.test.tsx` | create/open/duplicate | core smoke | Eng/QA | estimate inaccessible |
| Component library browse/create/insert | Browse/search/create/insert | missing seed, wrong source ID, insert fails | library UI/actions plus local demo smoke | search/create/insert | hosted demo smoke | Product/Eng | insert fails |
| Template browse/preview/insert | Browse/preview/insert | fallback masks empty, wrong insertion target | template UI/actions plus local insert smoke | preview/insert into group | hosted demo smoke | Product/Eng | template insert fails |
| Estimate row edit/delete/replace | Edit/delete/replace row | lost history, revision conflict, wrong totals | row mutation/edit/delete/replace/history tests | edit/delete/replace and Activity | core smoke | Eng/QA | data corruption |
| Project-specific unlink | Detach linked row | library mutated, state ambiguous, metadata leaked | RPC/action/hook/UI/share/source-state tests | detach/edit/library unchanged | linked/hosted core smoke | Eng/Product | library mutation/ambiguity |
| Excel export | Download/open bid workbook | wrong formulas, raw dump, timeout, auth leak | model/workbook/route tests | Excel + secondary app open/print | export smoke | Product/Eng | formula/open failure |
| Share/invite/email | Send/open/share/comment if visible | token leak, email false success, CSRF | share/invite/webhook/security tests | send/open/revoke/expire | staging smoke | Security/Release | unverified email/security |
| Settings basics | Support/legal/profile | no support, misleading legal | render/accessibility tests | navigate settings/support/legal | smoke | Product | no support/legal |
| AI deferral | Workshop and direct API | AI visible/callable/provider call | disabled UI/route tests | footer/API check | smoke | Eng/Product | AI visible/callable |

Zero-defect means P0 flows have no known launch-blocking defects and every accepted exception is documented as a no-go or explicit beta limitation.
