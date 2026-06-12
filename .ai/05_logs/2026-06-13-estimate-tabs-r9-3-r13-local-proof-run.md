# Estimate Tabs R9.3 / R13.1-R13.3 Local Proof Run

Branch/worktree: `feat/estimate-tabs-phase5-templates-panel` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-projects-auto-added-to-templates`.
Date: 2026-06-13.
Proof boundary: local-only. No linked Supabase apply/typegen, hosted smoke, Vercel deploy, production deploy, provider dashboard proof, or two-browser/manual QA was performed.

## Summary

- R9.3 invite/share deep links remain estimate/link-token scoped locally: invite contracts still use `/invite/[token]`, pending-invite auth returns through `/workshop/pending-invite`, shared-link recipient email/API routes still target `/share/[token]` with recipient query tokens, and no tab-id URL rewrite was introduced.
- R13.1 zero-render/perf guards still pass with the estimate tab strip mounted.
- R13.2 reusable-source browsing is now lazy by project root: initial source listing returns readable project roots only; expanding a project fetches that project's estimate list; expanding an estimate fetches its tab/node outline. The route browse tree and estimate sidebar both share the lazy flow.
- R13.3 tab accessibility now includes a polite live region, keyboard reorder announcements with focus retention, and gated delete/archive focus fallback to the nearest remaining tab. Prior R6.2 proof covers non-drag insertion via context-menu/bulk/picker paths.

## Changed files

- `src/lib/reusable-sources/actions.ts`
- `src/components/workshop/library/templates-browse/project-source-browse-tree.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx`
- `tests/vitest/reusable-sources-actions.test.ts`
- `tests/vitest/template-browse-project-sources.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/estimate-tab-strip.test.tsx`
- `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/13_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `.ai/10_state/current-state.md`

## Fresh gates run

```text
label=vitest-r13-2-lazy-source-focused exit_code=0 command="bun x vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1" result="3 files / 67 tests passed"
label=vitest-r13-1-perf exit_code=0 command="bun x vitest run tests/vitest/perf --maxWorkers=1" result="4 files / 14 tests passed"
label=vitest-r9-3-invite-share-focused exit_code=0 command="bun x vitest run tests/vitest/project-invite-entry-route.test.ts tests/vitest/workshop-pending-invite.test.tsx tests/vitest/project-publication-email-links.test.ts tests/vitest/share/share-page-get-routes-contract.test.ts tests/vitest/project-publication-actions.test.ts --maxWorkers=1" result="5 files / 40 tests passed"
label=vitest-r13-3-tabstrip-a11y exit_code=0 command="bun x vitest run tests/vitest/estimate-tab-strip.test.tsx --maxWorkers=1" result="1 file / 8 tests passed"
label=type-check-r9-3-r13-proof exit_code=0 command="bun run type-check"

label=vitest-r9-3-r13-post-doc-focused exit_code=0 command="bun x vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-tab-strip.test.tsx tests/vitest/project-invite-entry-route.test.ts tests/vitest/workshop-pending-invite.test.tsx tests/vitest/project-publication-email-links.test.ts tests/vitest/share/share-page-get-routes-contract.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/perf --maxWorkers=1" result="13 files / 129 tests passed"
label=eslint-r9-3-r13-focused exit_code=0 command="bunx eslint src/lib/reusable-sources/actions.ts src/components/workshop/library/templates-browse/project-source-browse-tree.tsx src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx src/components/workshop/component-library/tree/TemplatesTree.tsx src/components/workshop/component-library/index.tsx src/components/workshop/estimate-sheet/EstimateTabStrip.tsx tests/vitest/reusable-sources-actions.test.ts tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-tab-strip.test.tsx" result="0 errors / 0 warnings"
label=type-check-r9-3-r13-post-doc exit_code=0 command="bun run type-check"
label=design-system-r9-3-r13 exit_code=0 command="bun run lint:design-system"
label=design-r9-3-r13 exit_code=0 command="bun run lint:design"
label=build-r9-3-r13 exit_code=0 command="bun run build" result="Next.js 16.2.6 build passed; next-env.d.ts churn restored"
label=diff-check-r9-3-r13 exit_code=0 command="git diff --check"
```

## Remaining boundary

- R9.3 is local-only. Hosted invite/share deep-link e2e and two-browser/manual collaboration/publication proof remain open.
- R13.1 is local-only. Browser/provider performance proof remains open.
- R13.2 is local-only. Live DB p95/provider scale proof remains open.
- R13.3 is local-only. Browser/Storybook/axe a11y proof remains open.
