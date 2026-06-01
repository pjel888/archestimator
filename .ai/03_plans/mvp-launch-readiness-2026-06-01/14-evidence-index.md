# Evidence Index

## Fourth-Pass Closed Beta Evidence - 2026-06-02

### Command Evidence

| Evidence | Result |
| --- | --- |
| HEAD | `1ed86b4f2a3881bf1b946eb81c688071e6736574` |
| `bun install --frozen-lockfile` | Pass |
| `bun run type-check` | Pass |
| `bun run lint` | Pass with 14 warnings |
| `bun run lint:design-system` | Pass |
| `bun run test` | Pass |
| `bun run test:dom` | Pass: 122 files / 989 tests passed / 2 skipped after AI-001 and stale source-contract test repair |
| `bun run build` | Pass |

### AI-001 Local Implementation Evidence

- `src/lib/ai/feature-flags.ts` now defaults `ARCHESTIMATOR_AI_ENABLED=false` and `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`.
- `src/app/api/ai/ask/route.ts` and `src/app/api/ai/package-builder/route.ts` return `404` `{ error: "AI is disabled for closed beta." }` before dynamically importing their handlers unless `ARCHESTIMATOR_AI_ENABLED=true`.
- `src/components/workshop/WorkshopPageShell.tsx` renders `AskFlipFooterAssistant` only when `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=true`.
- `.env.example` documents the closed-beta access flag plus AI route/UI flags with false defaults.
- Focused red/green evidence: `bunx vitest run tests/vitest/ai-ask-route.test.ts tests/vitest/ai-package-builder-route.test.ts tests/vitest/workshop-reset.test.tsx tests/vitest/ai-package-builder-security-contract.test.ts tests/vitest/project-publication-actions.test.ts --maxWorkers=1` passed 5 files / 77 tests.
- `bun run type-check` passed after the AI gate.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests.
- `bun run test:dom` passed 122 files / 989 tests with 2 skips.
- `bun run build` passed after the route/UI gate.
- `git diff --check` passed.
- Post-edit code-review-graph found 0 affected flows for the 21 changed files; minimal review context still reports high risk because `WorkshopPageShell` is a shared shell.
- Post-edit GitNexus `detect-changes --repo archestimator` reports critical risk through `WorkshopPageShell` and 23 affected processes; this is expected for a shell mount gate and is mitigated by focused shell tests plus full DOM/build evidence.

### BETA-AUTH-001/004 Local Implementation Evidence

- Supabase CLI generated migration `supabase/migrations/20260601182522_closed_beta_allowed_emails.sql` with the current `supabase migration new closed_beta_allowed_emails` command.
- Migration creates `public.closed_beta_allowed_emails`, enables RLS, revokes anon/authenticated table grants, and grants authenticated execute only on `public.check_closed_beta_access(raw_email text)`.
- RPC uses `security definer`, `set search_path = ''`, fully qualified table references, and checks the requested normalized email against `auth.jwt() ->> 'email'` so authenticated users cannot enumerate arbitrary allowlist emails through the RPC.
- `src/lib/auth/closed-beta-access.ts` centralizes email normalization, default-disabled env behavior, fail-closed RPC errors, and revoked access path building.
- `src/proxy.ts`, `src/app/auth/callback/route.ts`, and `src/lib/auth/session.ts` now enforce missing/revoked access while preserving public `/share`, `/invite`, `/beta`, legal, and marketing routes.
- `src/app/beta/access-required/page.tsx` provides the public invite-only beta UX and deliberately avoids linking to `/workshop`.
- Focused red/green evidence: `bun run test:dom tests/vitest/closed-beta-access.test.ts tests/vitest/closed-beta-access-migration.test.ts tests/vitest/beta-access-required-page.test.ts tests/vitest/auth-proxy.test.ts tests/vitest/auth-callback-route.test.ts tests/vitest/auth-session-closed-beta.test.ts` passed 6 files / 32 tests.
- `bun run type-check` passed after the closed-beta gate.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed after keeping the access-required page within the 12px app/workshop cap.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 126 files / 1002 tests with 2 skips.
- `bun run build` passed and lists `/beta/access-required` as a dynamic app route.
- `git diff --check` passed.
- Post-edit code-review-graph reported 0 affected flows for the 19 staged changed files, with review gaps on `GET`, `BetaAccessRequiredPage`, helper functions, and `mockUser` despite focused source/route/helper tests.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reports critical risk through `getCurrentUserContext` and 29 affected processes; this is expected for a session-boundary gate and is mitigated by default-disabled behavior, focused session/proxy/callback tests, full DOM, and build evidence.
- Remote linked Supabase migration apply is not done in this slice; backup/PITR proof remains required before applying launch/beta migrations.

### NONPAY-001 Local Pricing Copy Evidence

- `/pricing` is reframed as invite-only closed beta access with "No payment is required" and "Pricing will be announced after beta" copy.
- Landing pricing and FAQ sections no longer show `₱0`, "free access", or active paid-tier language.
- Primary pricing CTA is request access/contact; already-invited users are directed to sign in with their invited Google account.
- Focused red/green evidence: `bun run test:dom tests/vitest/closed-beta-pricing-copy.test.ts` passed 1 file / 2 tests.
- Adjacent focused route/copy evidence: `bun run test:dom tests/vitest/closed-beta-pricing-copy.test.ts tests/vitest/landing-company-proof.test.ts tests/vitest/auth-proxy.test.ts` passed 3 files / 28 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors after fixing a JSX apostrophe escape in the landing FAQ copy.
- `bun run lint:design-system` passed.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph reported 0 affected flows for the 10 staged changed files, with source-contract coverage gaps on the three edited page/section components.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reports high risk with 8 affected `PricingPage` flows; this is expected for public pricing copy and is mitigated by source-contract tests plus focused landing/proxy tests.
- Remote/payment evidence is not needed for this slice because Stripe/checkout/subscriptions remain intentionally unimplemented.

### UNLINK-001 RPC/Action Contract Evidence

- Supabase migration `supabase/migrations/20260601184343_unlink_estimate_row_items.sql` defines `public.unlink_estimate_row_item_from_library_with_history(...)` for project-specific row detach.
- The RPC resolves workspace access with `public.resolve_estimate_workspace`, locks the estimate and row, enforces `expected_row_revision`, rejects already-unlinked rows, preserves `source_snapshot`, sets `source_library_item_id = null`, sets `link_state = 'detached'`, increments `row_revision`, and inserts a `row_unlinked` history event with `detachedFromSourceLibraryItemId` metadata.
- `src/lib/estimates/actions.ts` exports `detachEstimateRowItemFromLibrary(...)`, passes acting user and mutation correlation id, uses the current row revision by default, returns the canonical history row result, and revalidates the affected estimate node path.
- `src/lib/supabase/types.ts` includes the new RPC Args/Returns surface.
- Focused red/green evidence: `bun run test:dom tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts` passed 2 files / 31 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1006 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 7 staged changed files, 6 changed functions/classes, 0 affected flows, 2 source-level test gaps, and overall risk score 0.35.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 7 changed files, 1 changed symbol, 0 affected processes, and low risk.
- UI/hook wiring is now implemented for the first visible make-project-specific flow:
  - `buildEstimateTree()` preserves `linkState` as `linkState` so persisted detached rows can render correctly.
  - `useEstimateRowMutations()` exposes `detachRow` with mutation ids, cached row revisions, optimistic `sourceLibraryItemId = null`, `linkState = "detached"`, rollback, and query invalidation.
  - `EstimateSheetContent` renders a `Make project-specific` action for linked rows, confirms the operation, calls `detachEstimateRowItemFromLibrary`, and shows `Project-specific` for detached rows without blanking row values.
- Focused UI/projection evidence: `bun run test:dom tests/vitest/workspace-repository-estimate-tree.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx` passed 2 files / 16 tests.
- Adjacent row-history/patch evidence: `bun run test:dom tests/vitest/estimate-row-tree-patch.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts` passed 3 files / 36 tests.
- Post-UI wiring `bun run type-check` passed.
- Post-UI wiring `bun run lint` passed with the existing 14 warnings and 0 errors.
- Post-UI wiring `bun run lint:design-system` passed.
- Post-UI wiring `bun run test` passed 4 unit tests / 129 expectations.
- Post-UI wiring `bun run test:dom` passed 127 files / 1008 tests with 2 skips.
- Post-UI wiring `bun run build` passed.
- Post-UI wiring `git diff --check` passed.
- Post-UI wiring code-review-graph `detect_changes` against `HEAD` analyzed 9 changed files, 20 changed functions/classes, 0 affected flows, 15 source-level test gaps, and overall risk score 0.50.
- Post-UI wiring GitNexus `detect-changes --repo archestimator --scope staged` reported 9 changed files, 43 changed symbols, 1 affected process (`GET` export route through `toUiRow`), and medium risk. This is expected from persisted row projection and is mitigated by repository projection tests, export coverage inside full `test:dom`, production build, and focused UI tests.
- Linked Supabase migration apply and direct SQL verification are not done in this slice; backup/PITR proof remains required before applying launch/beta migrations.

### Closed Beta Audit Evidence

- Auth/proxy: `src/proxy.ts`, `src/lib/auth/actions.ts`, `src/app/auth/callback/route.ts`, `src/lib/auth/account-setup.ts`, `src/lib/auth/session.ts`.
- Workspace first-run: `src/lib/repositories/workspace-repository.ts`.
- Pricing/payment: `src/app/pricing/page.tsx`, landing CTA/FAQ components, `package.json` dependency audit showing no Stripe dependency.
- Resend/email: `src/lib/email/resend-client.ts`, `src/lib/email/resend-webhooks.ts`, `src/app/api/webhooks/resend/route.ts`.
- Feedback/contact: `src/app/contact/page.tsx`, `src/components/landing/ContactForm.tsx`.
- Tests: auth proxy/callback/magic-link tests, Resend webhook tests, share/e2e flag docs.
- Graph: code-review-graph and GitNexus were used first; fallback static analysis was used where graph text search did not surface all closed-beta concepts.

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
| `bun run test:dom` | Initially failed; now pass after stale source-contract updates and AI route/UI gate tests. | DOM baseline blocker closed locally for this slice. |
| `bun run build` | Pass; Next.js 16.2.6 Turbopack production build. | Buildable locally. |
| `bun run test:e2e` | Blocked; Playwright webServer failed because another Next dev server was already running on port 3000. | Needs rerun after freeing ports or configuring `PLAYWRIGHT_PORT`. |
| Export-focused subagent tests | Pass; read-only export lane reported 4 files / 15 tests passed. | Supports current export inventory, but does not prove launch-grade workbook. |

## `test:dom` Failure Repairs

| File | Failure | Required action |
| --- | --- | --- |
| `tests/vitest/ai-package-builder-security-contract.test.ts` | Source-string expectations looked for auth/security text in the route file, but route delegates to handler. | Repaired: assertions now cover the route AI-disabled gate and handler security contract separately. |
| `tests/vitest/project-publication-actions.test.ts` | Source-string expectation looked for `verifySharedLinkRecipientToken` in `share/[token]/page.tsx`; implementation moved to session initializer/API route. | Repaired: assertion now covers `SharePageRecipientSessionInitializer` on the page and token verification/session cookie setting in `/api/share/[token]/session`. |

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
| `WorkshopPageShell` | Confirms Ask Flip footer assistant is hidden by default behind `isAskFlipUiEnabled()`. |
| `AskFlipFooterAssistant` / `EstimateCopilotFloatingButton` | Confirms prompt, Apply, feedback POSTs to AI routes. |
| `handleAiAskRequest` | Confirms provider path remains inside handler and route entry is default-disabled before handler import. |
| `handlePackageBuilderRequest` | Confirms Draft/Apply/memory/audit branches remain in handler and route entry is default-disabled before handler import. |
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
