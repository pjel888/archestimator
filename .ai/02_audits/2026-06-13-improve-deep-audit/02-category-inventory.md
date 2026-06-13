# Category Inventory

This file preserves the broader audit trail from the 2026-06-13 `$improve deep` pass. Items marked `Priority` are detailed in `01-priority-findings.md`; items marked `Backlog` are valid but lower priority or broader than immediate beta-readiness fixes.

## Correctness And Data Integrity

| ID | Status | Finding | Primary paths |
| --- | --- | --- | --- |
| CORRECTNESS-01 / F1 | Priority | Route Ask Flip create-package Apply through a tab-aware path. | `src/lib/ai/package-builder/apply.ts`, `supabase/migrations/20260528003000_ai_package_builder_apply_rpc.sql`, `supabase/migrations/20260612094734_estimate_tabs_foundation.sql` |
| CORRECTNESS-02 / F4 | Priority | Make estimate creation atomic. | `src/lib/estimates/actions.ts` |
| CORRECTNESS-03 / F6 | Priority | Enforce sheet-code uniqueness in the database. | `src/lib/estimates/actions.ts`, `supabase/migrations/` |
| TEMPLATE-REORDER / F3 | Priority | Move template node and row reorders into transaction-backed writes. | `src/lib/component-library/template-editor-actions.ts`, `supabase/migrations/20260522091621_component_library_templates.sql` |
| AI-READS / F7 | Priority | Query active-tab AI rows at the SQL boundary, not after an estimate-level limit. | `src/lib/ai/package-builder/read-tools.ts`, `src/lib/ai/read-context.ts` |

## Security And Privacy

| ID | Status | Finding | Primary paths |
| --- | --- | --- | --- |
| SEC-01 | Backlog | Add bounded JSON parsing to unauthenticated public share endpoints. | `src/app/api/share/[token]/comment/route.ts`, `decision/route.ts`, `password/route.ts`, `session/route.ts`, `events/route.ts` |
| SEC-02 / F2 | Priority | Require same-origin or CSRF style request authenticity for invite accept and sign-out mutations. | `src/app/invite/[token]/accept/route.ts`, `src/app/invite/[token]/sign-out/route.ts`, `src/lib/publication/security.ts` |
| SEC-03 / F5 | Priority | Stop returning raw backend errors to public share clients. | `src/lib/publication/public-repository.ts`, `src/app/api/share/[token]/comment/route.ts`, `src/app/api/share/[token]/decision/route.ts` |
| SEC-04 / F8 | Priority | Upgrade or mitigate high-severity vulnerable dependency paths. | `package.json`, `bun.lock`, `src/lib/proposal-export/create-proposal-workbook.ts` |

### Notes

The share routes already check same-origin and CSRF before parsing JSON via `assertSameOriginPublicPost`. The remaining SEC-01 risk is oversized JSON parsing before token/session/rate-limit checks, not a missing CSRF claim.

## Performance

| ID | Status | Finding | Primary paths |
| --- | --- | --- | --- |
| PERF-01 / F11 | Priority | Paginate the projects route before enriching every accessible project. | `src/app/workshop/projects/page.tsx`, `src/lib/repositories/workspace-repository.ts` |
| PERF-02 / F11 | Priority | Bound the full component-library loader used by interactive screens. | `src/components/workshop/EstimateSheetContent.tsx`, `src/lib/repositories/component-library-repository.ts` |
| PERF-03 | Backlog | Remove whole-tree reorder planning from dragover validation. | `src/components/ui/tree.tsx`, `src/components/workshop/EstimateSheetTree.tsx`, `src/lib/estimates/estimate-tree-reorder.ts` |
| PERF-04 | Backlog | Avoid repeated full-row scans during proposal workbook generation. | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`, `src/lib/proposal-export/create-proposal-workbook.ts` |

## Testing And Release Evidence

| ID | Status | Finding | Primary paths |
| --- | --- | --- | --- |
| TESTCOV-01 | Backlog | Add one command that mirrors CI and release-boundary verification. | `package.json`, `.github/workflows/ci.yml`, `.ai/10_state/current-state.md` |
| TESTCOV-02 / F9 | Priority | Make live invite, collaboration, and AI-write E2E proof executable in a default evidence lane. | `.github/workflows/ci.yml`, `e2e/project-invite-entry.spec.ts`, `e2e/teamspace-collaboration.spec.ts`, `e2e/ask-flip-package-builder-live.spec.ts` |
| TESTCOV-03 | Backlog | Promote RLS and cross-tenant security coverage from roadmap to executable tests. | `.ai/01_roadmap/32-test-infrastructure-execution-spec.md`, `tests/vitest/notification-rls-proof.test.ts` |
| TESTCOV-04 | Backlog | Replace placeholder shared-link receiver E2E with fixture-backed browser proof. | `e2e/shared-link-receiver.spec.ts` |
| TESTCOV-05 | Backlog | Run authenticated route-transition performance where the app actually works. | `package.json`, `e2e/route-transition-performance.spec.ts` |

## Dependencies, Migration Readiness, DX, And Docs

| ID | Status | Finding | Primary paths |
| --- | --- | --- | --- |
| DEP-01 / F8 | Priority | Triage active `bun audit` failures before beta gates rely on clean installs. | `package.json`, `bun.lock`, `src/lib/proposal-export/create-proposal-workbook.ts` |
| MIG-01 / F10 | Priority | Refresh linked-Supabase readiness checks for estimate tabs. | `scripts/check-supabase-migration-readiness.ts`, `scripts/sql/linked-supabase-launch-readiness.sql`, `supabase/migrations/20260612094734_estimate_tabs_foundation.sql` |
| DX-01 | Backlog | Pin Bun in CI instead of tracking `latest`. | `.github/workflows/ci.yml`, `package.json`, `README.md` |
| DX-02 | Backlog | Complete the local onboarding path for required env and Supabase setup. | `README.md`, `.env.example` |
| DOCS-01 / F12 | Priority | Remove stale generated-type blocker claims from current state. | `.ai/10_state/current-state.md`, `src/lib/supabase/types.ts` |

## Maintainability And Architecture

| ID | Status | Finding | Primary paths |
| --- | --- | --- | --- |
| ARCH-01 | Backlog | Split estimate server actions by workflow boundary. | `src/lib/estimates/actions.ts` |
| ARCH-02 | Backlog | Split workspace repository by read model and domain. | `src/lib/repositories/workspace-repository.ts` |
| ARCH-03 | Backlog | Extract AddComponentModal form, upload, and cost-manager logic. | `src/components/workshop/component-library-manager/AddComponentModal.tsx` |
| ARCH-04 | Backlog | Consolidate production tree engines and state orchestration. | `src/components/ui/tree.tsx`, `src/components/workshop/EstimateSheetTree.tsx`, `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` |
| ARCH-05 | Backlog | Split Ask Flip package-builder and read-context intent pipelines. | `src/lib/ai/package-builder/draft.ts`, `src/lib/ai/package-builder/read-tools.ts`, `src/lib/ai/read-context.ts`, `src/lib/ai/package-builder/apply.ts` |
| ARCH-06 | Backlog | Replace broad source-string contract tests with behavior or exported-contract checks. | `tests/vitest/component-library-versioning-schema.test.ts`, `tests/vitest/project-publication-header.test.tsx`, `tests/vitest/notifications-query.test.tsx`, `tests/vitest/live-estimate-node-route.test.ts` |

## Direction Suggestions

| ID | Status | Finding | Primary paths |
| --- | --- | --- | --- |
| DIR-01 | Direction | Productize proposal packages around the existing XLSX export foundation. | `PRODUCT.md`, `README.md`, `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`, `src/app/pricing/page.tsx` |
| DIR-02 | Direction | Treat revision intelligence as a deliberate product track, not dormant-version resurrection. | `README.md`, `.ai/10_state/decisions.md` |

## Rejected Or Non-Findings

| ID | Result | Reason |
| --- | --- | --- |
| SEC-RJ-01 | Rejected | The local dev auth bypass is production-gated, localhost-gated, secret-gated, and AI routes reject the admin database bypass path. No remediation recommended from audit evidence. |

## Recommended Planning Order

1. Plan the tabbed-estimate write and transaction cluster: F1, F3, F4, F6, F7.
2. Plan the public/invite route hardening cluster: F2, F5, SEC-01.
3. Plan dependency and provider-readiness cleanup: F8, F9, F10, F12.
4. Plan performance boundaries: F11 plus PERF-03 and PERF-04 if large-estimate usability is the next target.
5. Defer architecture decomposition until the correctness/security/readiness blockers above are closed or explicitly assigned.
