# Evidence — Test / Story / Script Coverage Cleanup Map

Tests are CLASSIFIED, not deleted, in this audit. Buckets: KEEP_CRITICAL · KEEP_UNTIL_REPLACED · DELETE_WITH_FEATURE · REWRITE_AFTER_CLEANUP · ARCHIVE_EVIDENCE_ONLY · OWNER_GATE.

## Tests to KEEP (critical — never delete in cleanup)

Security/RLS/auth: `ai-auth-guard`, `ai-audit-flow`, `ai-audit-schema`, `ai-package-builder-security-contract`, `security-findings-*-contracts` (except the tooling one below), `project-publication-security*`, `publication-client-csrf`, `proxy-sensitive-cache-headers`, `landing-security-headers`, `closed-beta-access*`, `notification-rls-proof`, all `share/*`, `share-no-store-invariants`, `auth-sensitive-api-boundaries`.
Migration/DB guards: `supabase-performance-migrations`, `supabase-seed-migrations`, `legal-terms-acceptance-migration`, `estimate-row-tree-patch`.
Launch readiness: all `*-readiness-script` + `*-readiness-docs` + hosted smoke-script tests, `linked-supabase-readiness-sql`.
Prove scripts (all 5): `prove:notification-rls`, `prove:estimate-tabs-rls`, `prove:estimate-list-summaries`, `prove:rls-initplan`, `prove:unify-kinds`.
Storybook governance: `storybook-component-coverage`, `storybook-provider-boundary`.
Core logic + UI primitives + E2E (most env-gated): `auth.spec`, `estimate-tabs.spec`, `estimate-tree-dnd.spec`, `landing-audit.spec`, `route-transition-performance.spec`, etc.

## Tests to KEEP_UNTIL_REPLACED (cleanup guards / active corridors)

- `tests/unit/reset-baseline.test.ts` — ~70 `not.toContain` assertions enforcing workshop-homebase simplification + library unification.
- `tests/unit/p3-shared-link-migration-red.test.ts` — was red-first; now GREEN (tables/RPCs exist). **Rename / re-comment** as a green regression guard.
- `landing-amigo-redesign.test.tsx` — asserts dead landing sections ABSENT from `/`.
- `workshop-library-consolidation-ui.test.tsx` — asserts old library tabs ABSENT.
- `vercel-web-analytics-integration.test.ts` — asserts `@vercel/speed-insights` ABSENT.
- Estimate-unification corridor: `estimate-unification-oracle(.fixtures)`, `workspace-repository-estimate-tree`, `estimate-tree-data`, `estimate-node-reorder-action`, `estimate-schema-compat`.
- AI tests (`ai-ask-route`, `ai-ask-read-context`, `ai-package-builder-*` non-security, `estimate-copilot-floating-button`) — keep while AI deferred; become DELETE_WITH_FEATURE only if AI is fully cut.

## Tests that ENFORCE cleanup (absence guards — protect simplifications)

`reset-baseline.test.ts`, `landing-amigo-redesign.test.tsx`, `vercel-web-analytics-integration.test.ts`, `workshop-library-consolidation-ui.test.tsx`, `project-chrome-streaming.test.ts`, `ensure-default-workspace-cache.test.ts`, `estimate-tree-data.test.ts` (P3 "any node may own rows"). These will FAIL if dead code is reintroduced — keep them through the cleanup; they are the safety net.

## Tests to REWRITE_AFTER_CLEANUP

- `security-findings-library-tooling-contracts.test.ts` — asserts MCP/hook command patterns (`code-review-graph` pins, hook commands) that may have drifted from `.codex/hooks.json` / `.cursor/mcp.json`. (Lane 6 *guessed* this was a failing test — **direct evidence shows it is NOT one of the 2 current failures**; treat as a drift-risk rewrite candidate, not a confirmed failure.)
- `check-vercel-speed-insights-readiness.ts` + `vercel-speed-insights-readiness-script.test.ts` — test a removed package (`@vercel/speed-insights`). Rewrite to assert absence, or retire (CLEAN-F39).

## Tests to ARCHIVE_EVIDENCE_ONLY (doc-structure / benchmark harnesses)

`agentic-framework-routing-docs`, `closed-beta-readiness-docs`, `dbidx-repo-audit`, `shared-link-activity-benchmark`, `proposal-workbook-benchmark`; benchmark scripts (`benchmark-estimate-cursor-broadcast`, `benchmark-proposal-workbook`, `benchmark-shared-link-activity`), `audit-dbidx-repo.ts`, `explain-estimate-list-summaries.mjs`, `build-performance-query-inventory.ts`.

## Tests blocking cleanup of dead features

- Story-only UI components (`confidence-indicator`, `financial-total-card`, `timeline`, `status-badge`, `data-table`, `pagination`) — their stories + `storybook-plan-matrix` count assertions (809 inventory / 703 coverage) + `check-storybook-component-coverage.mjs` manifest must be updated **simultaneously** with any component/story removal, or `storybook:validate` breaks (CLEAN-F15).
- `landing-interactivity.test.tsx` imports some dead landing sections → update before deleting them (CLEAN-F03).

## The 2 ACTUAL currently-failing `test:dom` tests (direct from `gates/test-dom.log`)

1. `tests/vitest/estimate-sheet-version-control-ui.test.tsx` → "opens node activity for the selected node without named-version controls" (fail at line 1013).
2. `tests/vitest/proposal-export-preview.test.tsx` → "surfaces export validation notes in the contents summary (P1-T2, F-20)" (fail at line 189).

Note: `proposal-export-preview` exercises `ProposalExportPreviewDialog`, which **also** owns the `lint:design-system` failures (font-size + `rounded-full`). This component is a current hotspot — fix-forward, not cleanup-driven (CLEAN-F40). These failures are pre-existing and unrelated to any deletion in this pack.

## DELETE_WITH_FEATURE

None now. AI tests only become deletable if the AI feature is formally cut (routes + `lib/ai` removed), which is an owner decision (CLEAN-F25).
