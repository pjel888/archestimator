# Evidence Index

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Audit date: 2026-06-02
Scope: launch planning and readiness audit only.

## Command Outputs

| Command | Exact result summary | Launch meaning |
| --- | --- | --- |
| `git status --short` | Clean before edits. | Baseline had no unstaged product edits. |
| `git rev-parse HEAD` | `681c95e64864f283950a88dba304eaffe8f2f8b3`. | Current evidence anchor. |
| `bun install --frozen-lockfile` | Pass; Bun 1.3.10 checked 703 installs across 775 packages. | Dependency graph installable. |
| `bun run type-check` | Pass; `tsc --noEmit`. | No current TS errors. |
| `bun run lint` | Pass with warnings; 0 errors. | Not a lint blocker; warnings should be triaged before launch. |
| `bun run lint:design-system` | Pass. | Design-system static gate green. |
| `bun run test` | Pass; 4 tests, 129 expectations. | Bun unit smoke green. |
| `bun run test:dom` | Fail; 3 failing tests in 2 files. | P0 blocker until corrected or explicitly superseded. |
| `bun run build` | Pass; Next.js 16.2.6 Turbopack production build. | Buildable locally. |
| `bun run test:e2e` | Blocked; Playwright webServer failed because another Next dev server was already running on port 3000. | Needs rerun after freeing ports or configuring `PLAYWRIGHT_PORT`. |
| Export-focused subagent tests | Pass; read-only export lane reported 4 files / 15 tests passed. | Supports current export inventory, but does not prove launch-grade workbook. |

## `test:dom` Failures

| File | Failure | Required action |
| --- | --- | --- |
| `tests/vitest/ai-package-builder-security-contract.test.ts` | Source-string expectations look for auth/security text in the route file, but route now delegates to handler. | Rewrite tests to assert route behavior/handler contract, then add AI global disable tests. |
| `tests/vitest/project-publication-actions.test.ts` | Source-string expectation looks for `verifySharedLinkRecipientToken` in `share/[token]/page.tsx`; implementation moved to session initializer/API flow. | Update test to current route/session contract. |

## Files Inspected

Required baseline files:

- `AGENTS.md`, `DESIGN.md`, `README.md`, `package.json`, `bun.lock`, `.env.example`, `.github/workflows/ci.yml`.
- `.ai/README.md`, `.ai/00_system/ai-folder-canonical-map.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `.ai/06_specs/*`.
- Existing launch plan docs `00` through `20`.

Code audit files:

- Routes: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/workshop/**`, `src/app/share/**`, `src/app/invite/**`, `src/app/api/**`.
- Components: `WorkshopPageShell`, `EstimateCopilotFloatingButton`, `EstimateSheetContent`, `EstimateSheetTree`, `ProposalExportPreviewDialog`, `LibraryPageClient`, `TemplatesPageClient`, component-library/sidebar/ui components.
- Core logic: `src/lib/auth/*`, `src/lib/supabase/*`, `src/lib/repositories/*`, `src/lib/projects/*`, `src/lib/estimates/*`, `src/lib/component-library/*`, `src/lib/proposal-export/*`, `src/lib/ai/*`, `src/lib/email/*`, `src/lib/publication/*`, `src/lib/collaboration/*`, `src/hooks/*`.
- Supabase: `supabase/migrations/*`, `src/lib/supabase/types.ts`.
- Tests: `tests/unit/*`, `tests/vitest/*`, `e2e/*`, Playwright config, CI workflow.

## Symbols Inspected

| Symbol / route | Evidence use |
| --- | --- |
| `WorkshopPageShell` | Confirms Ask Flip footer assistant is mounted. |
| `AskFlipFooterAssistant` / `EstimateCopilotFloatingButton` | Confirms prompt, Apply, feedback POSTs to AI routes. |
| `handleAiAskRequest` | Confirms provider path occurs inside handler after route entry. |
| `handlePackageBuilderRequest` | Confirms Draft/Apply/memory/audit branches and need for global route gate. |
| `getPackageBuilderFeatureFlags` | Confirms subflags default mostly on and no global MVP kill switch exists. |
| `EstimateSheetContent` | High-blast-radius editor and row details/history surface. |
| `useEstimateRowMutations` | Confirms no dedicated unlink mutation hook exists. |
| `insertEstimateRowItemFromLibrary`, `updateEstimateRowItem`, `replaceEstimateRowItemWithLibrary`, `deleteEstimateRowItem` | Confirms revision-aware row RPC action pattern. |
| `buildProposalExportModel` | Confirms current material/labor compatibility and all rows included. |
| `createProposalWorkbook` | Confirms static totals and current sheet layout. |
| Export route `GET` | Confirms Node runtime XLSX download route. |
| `sendEmail`, Resend webhook route | Confirms mock-success risk and webhook secret requirement. |

## Graph Analyses Performed

| Tool | Result |
| --- | --- |
| `get_minimal_context` | 3,633 nodes, 51,052 edges, 387 files; low risk for docs-only edit. |
| `get_architecture_overview` | 120 communities; major communities include workshop estimate, estimates, projects, component library. |
| `list_flows` | Critical flows include auth, project creation, estimate tree, estimate creation, route handlers. |
| `query_graph file_summary` | Used for `WorkshopPageShell`, `EstimateSheetContent`, `build-proposal-export-model`; workbook file required fallback static read. |
| `get_bridge_nodes` | `EstimateSheetContent`, `EstimateSheetTree`, `EstimateRightSidebar`, publication/invite/test surfaces are blast-radius hotspots. |
| `detect_changes` after doc edits | 21 tracked plan docs analyzed; 0 changed functions/classes, 0 affected flows, 0 test gaps, risk score 0.00. |
| Native explorers | Four read-only lanes covered AI/auth/share/email, unlink/schema/RPC, Excel export, and infra/performance/security/legal/observability. |

Graph limitation: some FTS semantic searches returned no matches and GitNexus staleness was reported by a read-only explorer. Fallback static analysis and code-review graph evidence are recorded rather than claiming complete graph coverage.

## Migrations / Generated Types Inspected

- `20260518090000_archestimator_core_schema.sql`
- `20260522025929_combine_misc_cost.sql`
- `20260522064018_component_library_taxonomy_source.sql`
- `20260524033151_estimate_sheet_version_control.sql`
- `20260524050746_add_estimate_row_contingency_percentage.sql`
- `20260527120000_project_client_publication.sql`
- `20260528220000_project_shared_link_overhaul.sql`
- `20260528184224_allow_estimate_row_discounts.sql`
- `20260601003000_security_rate_limit_events.sql`
- `src/lib/supabase/types.ts`

No linked Supabase query was run in this pass. Production/staging schema readiness remains unproven.

## Excel Reference Evidence Reviewed

The workbook plan incorporates provided bid/quotation patterns:

- Project/location/owner/bidder/date header block.
- General notes requiring line totals, included/excluded/by others marking, formula checks, OTHERS rows, and bidder remarks.
- Material/labor or supply/installation split columns, cost totals, line totals, subtotals.
- Scope labels: included, omitted, OSM, OFCI, by others, owner supplied, not applicable, excluded.
- Proposal summaries with section totals, running totals, contingency, VAT, grand total, exclusions, terms, validity/warranty, signature/conforme.
- Contractor bid tabulation treated as post-MVP unless trivial.

## Env / Provider Evidence

| Provider | Current evidence | Missing proof |
| --- | --- | --- |
| Vercel | Local build passes; Next config inspected. | Env values, deploy logs, custom domain/SSL, rollback. |
| Supabase | Local migrations/types inspected. | Linked/staging migrations, RLS/storage denial queries, auth callback URLs. |
| Resend | Client/webhook code inspected. | API key, sender domain, DKIM/SPF/DMARC, webhook delivery proof. |
| AI provider | AI handler inspected. | Deferred for MVP; route must fail closed before provider calls. |

## Manual QA Still Required

- Hosted auth: Google, magic link, callback, logout/session expiry.
- First-run: new beta tester, returning tester, investor demo, invited user, public share user, failed login, empty workspace, no seeded components.
- Excel: Excel desktop plus Numbers/LibreOffice/Google Sheets open, formula recalc, print preview, no blank line totals.
- Security: RLS denial, storage denial, cross-workspace route denial, share/invite token edge cases.
- Email: invite/share send, delivery, bounce/complaint webhook.
- Deployment: Vercel preview/prod deploy, rollback, env separation.
- Support/observability: error alert, uptime alert, support inbox, incident response dry run.
