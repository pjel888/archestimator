# Evidence Index

## Fourth-Pass Closed Beta Evidence - 2026-06-02

### Final Codex Implementation Report Evidence

- Final report artifact: `final-codex-implementation-report.md`.
- Manual proof matrix artifact: `46-manual-proof-matrix.md`.
- Goal completion audit artifact: `47-goal-completion-audit.md`.
- Manual proof packet template: `48-manual-proof-packet-template.md`.
- Stable implementation baseline summarized by the report: `8084908`.
- Report publication/correction commits: `80f806d`, `579cef0`.
- Current report recommendation: **NO-GO for external closed beta launch** until hosted/provider/manual proof gates are complete.
- Local baseline recorded in the report: typecheck pass, lint pass with 14 existing warnings, design lint pass, unit pass, full DOM pass at 131 files / 1021 tests / 2 skipped, build pass, graph/GitNexus checks clean.
- Current local validation refresh at `2587f80`: `bun run validate` passed typecheck, lint with 14 existing warnings, design lint, unit tests (4 tests / 129 expectations), and DOM tests (133 files / 1034 passed / 2 skipped). This refresh does not change the **NO-GO** recommendation.
- Current local app build refresh at `2587f80`: `bun run build` passed under Next.js 16.2.6 / Turbopack, generated 29 static pages, and listed `/api/health`, `/api/ai/ask`, `/api/ai/package-builder`, `/beta/access-required`, share routes, invite routes, and protected workshop routes. This refresh does not change the **NO-GO** recommendation.
- Remaining proof gates recorded in the report: linked Supabase backup/RLS/storage/migration proof, hosted auth smoke, Vercel deploy/health/rollback proof, Resend proof before email workflows are re-enabled, spreadsheet open/print proof, legal review, monitored support proof, demo artifacts, and current manual/E2E smoke.

### AUTH-E2E Local Signed-Out Smoke Evidence

- Local command: `PLAYWRIGHT_PORT=3037 bun run test:e2e -- e2e/auth.spec.ts --project=chromium`.
- Result: pass, 2 Playwright tests in 9.9s.
- Covered behavior: signed-out `/workshop/projects` redirects to `/login?next=%2Fworkshop%2Fprojects`, and `/login?next=/workshop/projects` renders the compact email-link sign-in controls.
- Scope limit: this is local signed-out route/login UI proof only. Hosted Google auth, allowed/denied/revoked allowlist smoke, first-run workspace entry, and session expiry/logout proof remain external/manual gates.

### SUPPORT-001 Honest Contact Handoff Evidence

- `src/components/landing/ContactForm.tsx` opens a structured `mailto:support@archestimator.com` draft containing name, email, organization, inquiry type, and message instead of simulating backend receipt.
- The confirmation state says the support email draft was prepared and includes fallback instructions if the user's email app does not open.
- `src/components/workshop/WorkshopPageShell.tsx` keeps the authenticated workshop footer one click from `support@archestimator.com` beta feedback.
- Focused verification: `bunx vitest run tests/vitest/contact-form-mailto.test.tsx tests/vitest/support-contact-readiness.test.ts tests/vitest/closed-beta-readiness-docs.test.ts --maxWorkers=1` passed 3 files / 15 tests.
- Scope limit: this proves an honest local support handoff only. It does not prove inbox monitoring, form delivery, alert owner, or incident response.

### Command Evidence

| Evidence | Result |
| --- | --- |
| Full local implementation baseline | `c5ca065` after demo seed row repair |
| Final report baseline | `8084908` after canonical state/decision/roadmap truth sync |
| Final report indexed in launch docs | `3e8d7a0` |
| Current local validation refresh | `2587f80`, `bun run validate` pass |
| Current local app build refresh | `2587f80`, `bun run build` pass |
| `bun install --frozen-lockfile` | Pass |
| `bun run type-check` | Pass |
| `bun run lint` | Pass with 14 warnings |
| `bun run lint:design-system` | Pass |
| `bun run test` | Pass: 4 unit tests / 129 expectations |
| `bun run test:dom` | Historical baseline pass: 131 files / 1021 tests / 2 skipped; current validation refresh pass: 133 files / 1034 passed / 2 skipped |
| `bun run build` | Historical baseline pass; current build refresh pass at `2587f80`, Next.js 16.2.6 / Turbopack, 29 static pages |

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

### LIB-001 Component Library Polish Evidence

- Design direction: compact estimator catalogue, optimized for scanning trust signals rather than marketing-style cards. Signature differentiator: each card now carries pricing provenance (`Source`, `Checked`, optional `Confidence`) directly under unit cost.
- Next.js version check for UI-design skill gate: installed `next` is `16.2.6`, which is above the patched `16.0.7` threshold for the referenced CVE.
- `ComponentLibraryManager` sheet search now includes `pricingSource`, `pricingDate`, and `confidence`.
- Component sheet tabs now show a visible result count such as `3 of 3 components` or `1 of 3 components`.
- Catalogue cards now show compact pricing trust fields without adding dependencies or changing the folder/tree model.
- Focused red/green evidence: `bun run test:dom tests/vitest/component-library-manager-ui.test.tsx` passed 1 file / 16 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 4 changed files, 7 changed functions/classes, 0 affected flows, 5 source-level test gaps, and overall risk score 0.55.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 4 changed files, 13 changed symbols, 3 affected `ComponentLibraryManager` flows, and medium risk. This is expected for visible sheet/card/search changes and is mitigated by focused manager UI coverage plus full DOM/build.

### TPL-001 Template Library Polish Evidence

- Design direction: compact template browser, optimized for quickly understanding reusable estimate structure before insertion. Signature differentiator: each template row now previews category, top-level structure, and sample row quantities directly in the sheet.
- `TemplateLibraryManager` sheet tabs now show readable result counts such as `3 of 3 templates` and `1 of 1 template`.
- Template sheet rows now expose a labeled preview region with `Structure`, category, representative group/area labels, `Sample rows`, and compact quantity/unit signals.
- Focused red/green evidence: `bun run test:dom tests/vitest/template-library-manager-ui.test.tsx` first failed on the old `3 / 3` result-count copy, then passed 1 file / 1 test after the preview implementation.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 4 changed files, 7 changed functions/classes, 0 affected flows, 5 source-level test gaps, and overall risk score 0.40. The reported helper gaps are covered through `template-library-manager-ui.test.tsx` component rendering assertions.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 4 changed files, 11 changed symbols, 0 affected processes, and low risk.

### EXP-001 Professional Workbook Evidence

- Design direction: professional construction bid/BOQ workbook, not a raw estimate dump. Signature differentiator: the export now opens with a `Bid Form` sheet containing the header block, general notes, scope labels, formulas, and section subtotals expected in contractor bid forms.
- Context7 official ExcelJS documentation was checked for current APIs covering formula cells with cached results, merged cells, frozen panes, print titles, page setup, styling, and `writeBuffer()`.
- `createProposalWorkbook()` now emits `Bid Form`, `Summary`, `Commercial Terms`, and `Source Breakdown` sheets.
- `Bid Form` includes project/location/owner/bidder/date header rows, required general notes, the `ITEM / PARTICULARS / UNIT / QTY / MATERIAL / LABOR / COST TOTAL / LINE TOTAL / SCOPE / NOTES` table, frozen header row 17, landscape fit-to-width print setup, and repeated print header row `17:17`.
- Detail rows now use ExcelJS formula objects for `COST TOTAL` and `LINE TOTAL`; line totals are nonblank and include misc/other cost as a formula addend while preserving a visible `Misc / other` note.
- `Summary` uses formula references back to `Bid Form` section subtotal rows and formula-backed direct cost/grand total cells.
- `Commercial Terms` includes exclusions, qualifications, payment terms, validity, warranty, and signature/conforme blocks.
- Focused red/green evidence: `bun run test:dom tests/vitest/proposal-workbook.test.ts` first failed on the old `Proposal Summary` / `Detailed Estimate` / `Area Breakdown` sheets, then passed 1 file / 4 tests after the workbook rewrite.
- Export parity evidence: `bun run test:dom tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-preview.test.tsx tests/vitest/proposal-workbook.test.ts` passed 4 files / 15 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 4 changed files, 15 changed functions/classes, 0 affected flows, 10 source-level test gaps, and overall risk score 0.40. The reported helper gaps are covered through `proposal-workbook.test.ts` workbook-level ExcelJS assertions.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 4 changed files, 19 changed symbols, 0 affected processes, and low risk.
- Manual cross-app workbook QA in Excel, Numbers/LibreOffice, and Google Sheets is not done in this local slice and remains required before launch.

### BETA-FEEDBACK-001 In-App Feedback Link Evidence

- `WorkshopPageShell` footer now shows a quiet `Send beta feedback` mailto link to `support@archestimator.com` for authenticated workshop users.
- The link is intentionally lightweight and external-email based, matching the closed-beta plan recommendation to avoid building a custom feedback system before launch.
- Focused red/green evidence: `bun run test:dom tests/vitest/workshop-reset.test.tsx` first failed on the missing `Send beta feedback` link, then passed 1 file / 3 tests after the shell footer update.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 4 changed files, 3 changed functions/classes, 0 affected flows, 1 source-level test gap, and overall risk score 0.40. The reported shell gap is covered through `workshop-reset.test.tsx` plus full DOM/build.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 4 changed files, 2 changed symbols, 23 affected workshop execution flows, and critical risk. This is expected because `WorkshopPageShell` is shared by all protected workshop routes; the implementation is mitigated by being a footer-only `mailto:` link with focused shell DOM coverage, full DOM, and build evidence.
- External feedback form selection remains open; the current local slice provides the minimum support email path only.

### LEGAL-001 Closed Beta Terms / Privacy Copy Evidence

- `/terms` now presents closed beta terms for invited users instead of only a pending-review placeholder.
- `/terms` explicitly covers invite-only access, no payment or subscription contract, beta defects/data responsibility, construction estimate accuracy, feedback/acceptable use, and support/deletion contact.
- `/privacy` now presents a closed beta privacy notice covering account email, project and estimate data, feedback/support messages, telemetry, providers/processors, beta data handling, and deletion requests.
- Both pages retain a legal-review caveat before external tester invitations or production legal use.
- Focused red/green evidence: `bun run test:dom tests/vitest/auth-entry-ui-contract.test.ts` first failed on the missing closed-beta legal copy, then passed 1 file / 4 tests after the page updates.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 127 files / 1009 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 5 changed files, 4 changed functions/classes, 0 affected flows, 2 source-level test gaps, and overall risk score 0.50. The reported page gaps are covered through `auth-entry-ui-contract.test.ts` plus full DOM/build.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported 5 changed files, 2 changed symbols, 16 affected public legal/landing execution flows, and critical risk. This is expected because the route pages participate in landing/auth-state rendering; the implementation is copy-only and covered by source-contract, full DOM, and build evidence.
- Counsel/owner review is still required before treating the pages as final external legal sign-off.

### INFRA-001 Env Manifest / Runbook Evidence

- `.env.example` now documents the closed-beta launch runtime set: app/site origins, allowed app origins, Supabase public/server vars, closed-beta access flag, invite flags, publication secrets, Resend vars, AI-off flags, optional analytics IDs, release smoke toggles, Supabase integration toggle, and `DATABASE_URL`.
- Conservative defaults are preserved locally: `CLOSED_BETA_ACCESS_ENABLED=false`, `PROJECT_INVITE_ENTRY_ENABLED=false`, `ARCHESTIMATOR_AI_ENABLED=false`, and `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`.
- `22-infrastructure-vercel-supabase-resend-plan.md` now treats `.env.example` as locally complete for manifest coverage while still blocking launch on real Vercel/provider values and proof.
- `40-closed-beta-operations-runbook.md` now includes production env posture: set `CLOSED_BETA_ACCESS_ENABLED=true`, keep AI disabled, keep invite entry disabled until proof, and defer Resend for manual beta invites while requiring it for visible email workflows.
- Teamspaces invite delivery UI now follows the same default-off posture: project invite, estimate-sheet invite, pending resend, and pending invite-link copy controls disable when authenticated invite delivery readiness is false, with manual beta invite copy. This is proven locally by `teamspace-collaboration-header` + `project-collaboration-actions` focused tests and does not replace provider/dashboard invite proof.
- The full goal prompt was persisted to `codex-autopilot-goal.md` in this plan folder for compaction-resilient continuation.
- Focused red/green evidence: `bun run test:dom tests/vitest/closed-beta-env-manifest.test.ts` first failed on missing env/docs entries, then passed 1 file / 3 tests after the manifest/runbook update.
- Adjacent focused evidence: `bun run test:dom tests/vitest/closed-beta-env-manifest.test.ts tests/vitest/auth-magic-link.test.ts tests/vitest/project-invite-feature-flag.test.ts tests/vitest/auth-redirect-sanitizer.test.ts` passed 4 files / 45 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 128 files / 1012 tests with 2 skips.
- `bun run build` passed.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 7 changed files, 0 changed functions/classes, 0 affected flows, 0 test gaps, and overall risk score 0.00.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for the config/docs/test-only staged set.
- Real Vercel env values, Supabase provider screenshots, Resend DNS/webhook proof, deployment smoke, and rollback proof remain external launch gates.

### OBS-001 Health Endpoint Evidence

- `/api/health` now returns public `200` JSON with `ok: true`, `service: "archestimator"`, an ISO timestamp, and `Cache-Control: no-store`.
- The payload deliberately avoids auth, Supabase, Resend, database, secret, key, token, or environment-specific details so uptime monitors can call it without leaking runtime configuration.
- `27-observability-monitoring-support-plan.md` now names `/api/health` as the uptime monitor target.
- `40-closed-beta-operations-runbook.md` now includes `/api/health` in monitor usage and the first 24-hour checklist.
- Focused red/green evidence: `bun run test:dom tests/vitest/health-route.test.ts` first failed on the missing route, then passed 1 file / 2 tests after implementation and doc alignment.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 131 files / 1021 tests with 2 skips.
- `bun run build` passed and lists `/api/health` as a dynamic app route.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 6 staged changed files, 4 changed functions/classes, 0 affected flows, 1 source-level test gap (`GET`), and overall risk score 0.35. The reported `GET` gap is covered by `health-route.test.ts` importing and invoking the route handler directly.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no changes detected for this new-route/docs/test staged set.
- Production uptime monitor setup and deployed endpoint proof remain external launch gates.

### QA-002 Local Readiness Truth-Sync Evidence

- `09-release-readiness-checklist.md` now reflects the current local command baseline: `test:dom` is pass, while hosted/provider/manual P0 gates remain no-go.
- `19-test-strategy-and-fixtures.md` now distinguishes the historical third-pass red DOM state from the current green local Vitest DOM baseline.
- `33-main-feature-zero-defect-test-matrix.md` now states the local type/lint/unit/DOM/build baseline is green and keeps launch status no-go pending hosted auth/RLS/provider, manual smoke, backup/restore, spreadsheet open, and deployment/rollback evidence.
- `closed-beta-readiness-docs.test.ts` locks the current QA docs against stale `test:dom` failure wording while preserving conservative no-go launch language.
- Focused evidence: `bun run test:dom tests/vitest/closed-beta-readiness-docs.test.ts` passed 1 file / 2 tests.
- Adjacent focused evidence: `bun run test:dom tests/vitest/closed-beta-readiness-docs.test.ts tests/vitest/health-route.test.ts` passed 2 files / 4 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 6 staged changed files, 3 changed functions/classes from the source-contract test, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this docs/test-only staged set.

### DATA-001 / BETA-OPS Local Runbook Evidence

- `20-launch-runbook.md` now reflects the current local command baseline and expands migration procedure with pre-migration inventory, backup/PITR status, restore owner, staging proof, and post-migration evidence requirements.
- `30-data-backup-disaster-recovery-plan.md` now includes a pre-migration backup evidence template and dry-run restore checklist.
- `43-closed-beta-readiness-scorecard.md` now reflects local implementation progress for access control, legal copy, feedback, component/template polish, unlink, export, observability, and backup checklist readiness while keeping all external proof gates below launch threshold.
- `closed-beta-readiness-docs.test.ts` now locks the runbook/scorecard against stale DOM failure wording and stale "not implemented" scorecard claims while requiring provider-proof gaps to remain explicit.
- Focused evidence: `bun run test:dom tests/vitest/closed-beta-readiness-docs.test.ts` passed 1 file / 3 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 6 staged changed files, 3 changed functions/classes from the source-contract test, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this docs/test-only staged set.
- Supabase backup/PITR proof, restore drill, production deploy rollback, and provider dashboard artifacts remain external launch gates.

### FINAL-GATE Local Truth-Sync Evidence

- `12-final-mvp-launch-gate.md` now reflects the current local command baseline and marks AI, unlink, export, legal, support, observability, and backup as local-pass or checklist-ready where evidence exists, while preserving no-go decisions for external proof gaps.
- `36-final-executive-launch-brief.md` now names the next proof lane: linked Supabase backup/migration/RLS, hosted auth smoke, Vercel deploy/rollback, spreadsheet-open QA, Resend proof if email is visible, and owner/counsel review.
- `10-technical-risk-register.md` now treats DOM, AI, export, unlink, legal, support, and backup risks as locally mitigated where applicable, while keeping them P0 until hosted/manual/provider proof is collected.
- `closed-beta-readiness-docs.test.ts` now locks the final gate, executive brief, and technical risk register against stale pre-implementation claims.
- Focused evidence: `bun run test:dom tests/vitest/closed-beta-readiness-docs.test.ts` passed 1 file / 4 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 6 staged changed files, 4 changed functions/classes from the source-contract test, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this docs/test-only staged set.

### DEMO-001 Local Demo Seed Evidence

- `supabase/seed.sql` now seeds five estimate row items for the local `Archestimator Demo Workspace` / `Lewis Residence` / `Lewis Residence Baseline Estimate`.
- Seed rows include manual `unlinked` rows, one `linked-clean` tile row tied to the demo library item, and one `detached` project-specific paint row with preserved `source_snapshot`.
- `28-investor-incubator-demo-readiness-plan.md` now names exact local seed anchors, the linked row, the detached row, and a rehearsal checklist that keeps Ask Flip, billing, provider dashboards, and real customer data out of the demo.
- `12-final-mvp-launch-gate.md`, `36-final-executive-launch-brief.md`, and `43-closed-beta-readiness-scorecard.md` now credit demo seed anchors while preserving no-go status until live rehearsal, screenshots, and workbook artifact proof exist.
- Focused evidence: `bun run test:dom tests/vitest/demo-seed-readiness.test.ts` passed 1 file / 3 tests.
- Adjacent docs evidence: `bun run test:dom tests/vitest/demo-seed-readiness.test.ts tests/vitest/closed-beta-readiness-docs.test.ts` passed 2 files / 7 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 8 staged changed files, 4 changed functions/classes from the source-contract tests, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this seed/docs/test staged set.
- Live demo account, allowlist entry, hosted auth smoke, screenshots, and validated workbook artifact remain external/manual gates.

### BASELINE-REFRESH After DEMO-001 Seed Evidence

- Full DOM initially caught a stale seed-source contract in `supabase-seed-migrations.test.ts`: the migration must remain tree-only, but the local development seed now intentionally includes demo row items.
- `supabase-seed-migrations.test.ts` now preserves the tree-only migration assertion while allowing local seed row items and requiring linked/detached demo rows.
- Focused repair evidence: `bun run test:dom tests/vitest/supabase-seed-migrations.test.ts tests/vitest/demo-seed-readiness.test.ts` passed 2 files / 7 tests.
- `bun run type-check` passed.
- `bun run lint` passed with the existing 14 warnings and 0 errors.
- `bun run lint:design-system` passed.
- `bun run test` passed 4 unit tests / 129 expectations.
- `bun run test:dom` passed 131 files / 1021 tests with 2 skips.
- `bun run build` passed and lists `/api/health` as a dynamic app route.
- `git diff --check` passed.
- Post-edit code-review-graph `detect_changes` against `HEAD` analyzed 9 staged changed files, 4 changed functions/classes from the source-contract tests, 0 affected flows, 0 test gaps, and overall risk score 0.30.
- Post-edit GitNexus `detect-changes --repo archestimator --scope staged` reported no code changes detected for this docs/test staged set.

### CURRENT-HEAD Local Validation Refresh Evidence

- Current validation anchor: `2587f80` on `main`.
- Command: `bun run validate`.
- Result: pass.
- Covered subcommands: `bun run type-check`; `bun run lint` with the existing 14 warnings; `bun run lint:design-system`; `bun run test` passing 4 unit tests / 129 expectations; `bun run test:dom` passing 133 files / 1034 passed / 2 skipped.
- Scope limit: this refresh proves the current local command suite only. Hosted/provider/manual launch gates remain open, and closed beta remains **NO-GO**.

### CURRENT-HEAD Local Build Refresh Evidence

- Current app build anchor: `2587f80` on `main`, before this docs-only evidence-sync commit.
- Command: `bun run build`.
- Result: pass.
- Build details: Next.js 16.2.6 / Turbopack compiled successfully, finished TypeScript, generated 29 static pages, and listed the app Proxy plus `/api/health`, `/api/ai/ask`, `/api/ai/package-builder`, `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`, `/api/share/[token]` routes, `/api/webhooks/resend`, `/beta/access-required`, `/invite/[token]`, `/login`, `/pricing`, `/share/[token]`, `/terms`, and protected `/workshop` routes.
- Scope limit: this is local production-build proof only. Vercel deploy/env/health/rollback proof remains an external launch gate, and closed beta remains **NO-GO**.

### Manual Proof Matrix Evidence

- `46-manual-proof-matrix.md` now defines the exact P0 evidence packet required before external closed beta can move from **NO-GO** to go/no-go review.
- `48-manual-proof-packet-template.md` provides the ready-to-fill `README.md` for the dated `.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/` artifact folder.
- It includes proof rows for Supabase backup/PITR, linked migrations/RLS/storage/RPCs, hosted auth allowlist, first-run workspace, Vercel deploy/env/health/rollback, Resend/email, spreadsheet compatibility, project-specific unlink, component/template demo smoke, legal/owner review, support/monitoring, demo rehearsal, and current manual E2E smoke.
- Current status: the component/template demo row now has local screenshot/JSON smoke evidence plus local template insertion proof, but all hosted/provider rows remain open. Closed beta remains **NO-GO** until all P0 rows are captured under `.ai/09_archive/store/<date>-mvp-closed-beta-manual-proof/` and linked back here.

### Goal Completion Audit Evidence

- `47-goal-completion-audit.md` maps every final criterion from `codex-autopilot-goal.md` to current evidence.
- Current result: local-safe implementation, validation, build, and docs are proven; hosted/provider/manual evidence remains missing.
- Completion decision in the audit: **DO NOT MARK GOAL COMPLETE** until the `46-manual-proof-matrix.md` evidence packet is captured and linked.

### Supabase Read-Only Provider Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-read-only-cli-2026-06-02.md`.
- Scope: linked Supabase project `ebxxqidacheyapmmzavr`, read-only CLI commands only.
- Backup command: `supabase backups list --project-ref ebxxqidacheyapmmzavr -o json` passed and returned no listed backups, `pitr_enabled=false`, region `ap-southeast-2`, and `walg_enabled=true`.
- Security advisor command: `supabase db advisors --linked --type security --level warn --fail-on none -o json` passed with WARN findings, including mutable function search paths, public `component-images` bucket listing, anon/authenticated executable `SECURITY DEFINER` functions, and leaked password protection disabled.
- Blocked commands: `supabase migration list --linked` and `supabase db advisors --linked --type performance --level warn --fail-on none -o json` failed after retries on the linked temp-role pooler circuit breaker / `SUPABASE_DB_PASSWORD` path.
- Launch meaning: this is negative/blocked provider evidence. Supabase backup/PITR, migration history, RLS/storage/RPC allow/deny, and security-advisor triage remain **NO-GO** rows.

### Supabase Linked Schema Parity Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-linked-schema-parity-2026-06-02.md`.
- Command path: `supabase db query --linked -o json` through the Supabase Management API SQL route.
- Result: pass for read-only parity queries.
- Migration parity: linked history contains `20260522091621`, `20260531164227`, `20260601003000`, and `20260601033000`; linked history is missing `20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items`.
- Object parity: `closed_beta_allowed_emails`, `check_closed_beta_access(text)`, and `unlink_estimate_row_item_from_library_with_history(...)` are absent on linked Supabase.
- Positive object evidence: template insertion RPCs and node history RPCs are present; the history RPCs have `anon` execute false and `authenticated` execute true.
- Storage/security evidence: `component-images` bucket is public with `image/webp` MIME restriction and 12 MiB size limit; this matches the security-advisor warning and remains a launch security triage item.
- Launch meaning: this narrows the linked Supabase blocker. Closed-beta allowlist and project-specific unlink cannot pass hosted/linked proof until the missing migrations are applied/repaired after backup/PITR/restore evidence.

### Vercel Read-Only Provider Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-read-only-cli-2026-06-02.md`.
- Scope: linked Vercel project `philipjonlewis-projects/archestimator`, CLI/provider reads plus health requests only.
- Project/link proof: `.vercel/project.json` points to `archestimator`; `vercel whoami` authenticated as `philipjonlewis`; `vercel project inspect archestimator --non-interactive` found a Next.js project with root `.` and Node.js `24.x`.
- Deployment proof: latest preview for commit `2e5b38d` reached `READY`; previous `db9b224` preview was also `READY`.
- Env proof: `vercel env ls --non-interactive` returned `No Environment Variables found for philipjonlewis-projects/archestimator`.
- Health proof: plain curl to the branch alias and ready preview returned Vercel `401 Authentication Required`; authenticated `vercel curl` returned `{"ok":true,"service":"archestimator"}` on the latest preview and branch alias.
- Protection proof: Vercel reports SSO protection for `all_except_custom_domains`, Git fork protection enabled, and one env-var-backed automation bypass entry remaining after cleanup of the non-env bypass entry generated during this run.
- Launch meaning: this is partial/blocked Vercel evidence. Preview deploy and protected health route are proven, but env, production/custom-domain behavior, public monitoring path, hosted auth smoke, and rollback proof remain **NO-GO** rows.

### Provider State Refresh Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/provider-state-refresh-2026-06-02.md`.
- Vercel refresh: `vercel env ls --non-interactive` still returned `No Environment Variables found`; latest preview `https://archestimator-j29iumqi0-philipjonlewis-projects.vercel.app` is `Ready`; `vercel inspect` reported deployment id `dpl_3UUiMA7Tc6ubJSgckDKBdjGMmnSp`; `vercel curl` to `/api/health` returned `{"ok":true,"service":"archestimator"}`; plain curl returned HTTP `401`.
- Supabase refresh: linked project remains `Archestimator` / `ebxxqidacheyapmmzavr`; `supabase migration list --linked` succeeded and still shows `20260601182522_closed_beta_allowed_emails` and `20260601184343_unlink_estimate_row_items` as local-only.
- Local env refresh: current shell printed no matching `RESEND_`, closed-beta, AI, dev-auth, or Supabase env variables.
- Launch meaning: this refresh confirms the previous provider blockers are still current. Hosted auth, env-backed Supabase/Resend behavior, production/custom-domain health, rollback, backup/PITR, linked allowlist, and linked unlink proof remain **NO-GO** rows.

### Vercel Custom Domain Readiness Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/vercel-custom-domain-readiness-blocked-2026-06-02.md`.
- Domain proof: `vercel domains ls --non-interactive` found `archestimator.com`; DNS returns apex `A` `216.198.79.1` and `www` CNAME `bb7ab57cfa50fcad.vercel-dns-017.com`.
- Alias proof: `vercel alias ls --non-interactive` maps `archestimator.com`, `www.archestimator.com`, and `archestimator.vercel.app` to `archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app`.
- Production deployment proof: `vercel inspect archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app --non-interactive` reported production deployment id `dpl_FwfHexBsB1xSHDqHqFwHSYpCYTVH`, status `Ready`, created `Sat May 30 2026 21:09:26 GMT+0800`.
- Public route proof: `https://archestimator.com/api/health` redirects to `www`; `https://www.archestimator.com/api/health` and `https://archestimator.vercel.app/api/health` return HTTP `404`; `https://www.archestimator.com/` returns HTTP `200` with metadata `Archestimator — Coming Soon`.
- Launch meaning: custom domains are attached and resolving, but they serve the older coming-soon production deployment, not the current closed-beta app deployment with `/api/health`. Production/custom-domain health remains **NO-GO**.

### Resend Email Readiness Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/resend-email-readiness-blocked-2026-06-02.md`.
- Vercel env proof: `vercel env ls --non-interactive` returned `No Environment Variables found`.
- Local key-presence proof: `.env.local` has `RESEND_API_KEY`, but `RESEND_FROM`, `RESEND_REPLY_TO`, and `RESEND_WEBHOOK_SECRET` are missing or empty. Values were not printed.
- Source proof: `src/lib/email/resend-client.ts` uses `RESEND_API_KEY` outside tests and now fails closed with `EMAIL_NOT_CONFIGURED` when the key or sender is missing; mock success is restricted to tests. `src/app/api/webhooks/resend/route.ts` returns `503` when `RESEND_WEBHOOK_SECRET` is absent.
- Visible email-flow proof: shared-link recipient controls now disable recipient entry/send/resend while server email delivery readiness is false; shared-link digest and collaboration notification paths still call `sendEmail()` server-side.
- Existing local test proof: `tests/vitest/resend-webhook-delivery.test.ts` guards raw-body webhook verification, recipient tags, delivery columns, and event-to-recipient status mapping.
- Launch meaning: this is negative/blocked email-provider evidence. Manual beta invites may remain outside Resend with recipient email controls disabled, but in-app email workflows cannot be treated as launch-ready or re-enabled until Vercel env, verified sender/domain/DNS, webhook secret, and real delivery/webhook event proof exist.

### First-Run Workshop Local Surface Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/first-run-workshop-local-surface-2026-06-02.md`.
- Scope: local source and DOM proof only.
- Source proof: `tests/vitest/auth-onboarding-guard.test.ts` covers default workspace reuse/creation before fallback workspace creation for authenticated users.
- DOM proof: `tests/vitest/workshop-reset.test.tsx` covers an empty `WorkshopHomebaseClient` with no projects, no estimates, no pending invites, and no favorites while preserving `/workshop/projects`, `/workshop/library`, and `/workshop/templates` links plus empty favorite states.
- Command: `bun run test:dom tests/vitest/auth-onboarding-guard.test.ts tests/vitest/workshop-reset.test.tsx tests/vitest/closed-beta-readiness-docs.test.ts`.
- Result: pass, 3 files / 20 tests in 2.97s.
- Launch meaning: this is not hosted first-run proof. Hosted Google auth, allowlist, Vercel env, production cookies, session expiry/logout, and real fresh beta account evidence remain required.

### Current Local E2E Smoke Evidence

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-local-e2e-smoke-2026-06-02.md`.
- Artifact folder: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/current-local-e2e-smoke-2026-06-02/`.
- Signed-out auth command: `PLAYWRIGHT_PORT=3039 bun run test:e2e -- e2e/auth.spec.ts --project=chromium`.
- Signed-out auth result: pass, 2 tests in 5.0s.
- Local dev-auth command: `PLAYWRIGHT_PORT=3041 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE=1 ARCHESTIMATOR_E2E_TEMPLATE_INSERT_SMOKE=1 ... bun run test:e2e -- e2e/workshop-library-demo-smoke.spec.ts e2e/workshop-template-insert-smoke.spec.ts --project=chromium`.
- Local dev-auth result: pass, 3 tests in 38.9s.
- Covered: signed-out protected-route redirect/login UI, component library search/trust fields, template preview, and template insertion into a throwaway linked Supabase estimate with 5 nodes / 8 rows / 1 `template_inserted` event and cleanup verification.
- Launch meaning: partial/local only. Hosted Google OAuth, allowlist allowed/denied/revoked, hosted first-run, project-specific unlink/export, spreadsheet-app open/print, logout/session expiry, and target hosted E2E remain required.

### Demo Rehearsal Fallback Pack

- Artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/demo-rehearsal-fallback-pack-2026-06-02.md`.
- Scope: local fallback packet assembled from existing seed anchors, screenshots, template insertion proof, and workbook artifact.
- Assets referenced: `lewis-residence-demo-proposal-2026-06-02.xlsx`, `component-library-demo-smoke-2026-06-02.png`, `template-library-demo-smoke-2026-06-02.png`, and `template-insert-local-smoke-2026-06-02.png`.
- Script coverage: fallback narrative, component trust fields, template preview, template insertion proof, workbook readback, project-specific safety caveat, and closed-beta posture.
- Launch meaning: this improves the investor/incubator fallback packet, but it is not a live hosted rehearsal. Hosted reviewer account, allowlist proof, target-environment screenshots, spreadsheet-app open/print proof, and owner demo sign-off remain required.

### Spreadsheet Artifact Local Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/spreadsheet-artifact-local-2026-06-02.md`.
- Workbook artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/lewis-residence-demo-proposal-2026-06-02.xlsx`.
- ExcelJS summary: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/lewis-residence-demo-proposal-2026-06-02.exceljs-summary.json`.
- Quick Look preview artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/spreadsheet-quicklook-preview-2026-06-02.md` plus `spreadsheet-quicklook-preview-2026-06-02/lewis-residence-demo-proposal-2026-06-02.xlsx.png`.
- SHA-256: `1b7625fedbcc1855ace1e07add53aa4d90c2a9dd9ff3a1347f11cb0018ab7b48`.
- Generation path: `buildProposalExportModel()` plus `createProposalWorkbookBuffer()` using a local Lewis Residence demo payload.
- Integrity checks: `file` reported `Microsoft Excel 2007+`; `unzip -t` found no compressed-data errors; ExcelJS loaded `Bid Form`, `Summary`, `Commercial Terms`, and `Source Breakdown`.
- Formula/blank-total checks: ExcelJS readback found `blankLineTotalRows: []` and summary grand total formula `B27+B28+B29` with result `55230`.
- Focused export tests: `bun run test:dom tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-preview.test.tsx` passed 4 files / 15 tests.
- App availability blocker: no `libreoffice`, `soffice`, `/Applications/Microsoft Excel.app`, `/Applications/Numbers.app`, or `/Applications/LibreOffice.app` was found locally.
- Quick Look result: `qlmanage -t -s 1200` produced a 1200 x 892 PNG thumbnail showing the bid form header, notes, line-item table, section rows, and subtotal bands.
- Launch meaning: this is partial local artifact and preview proof. Spreadsheet compatibility and demo fallback rows improve, but Excel plus secondary-app open/recalc/print screenshots remain **NO-GO** proof gaps.

### Component/Template Demo Local Smoke Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/library-demo-smoke-local-2026-06-02.md`.
- Component screenshot/JSON: `component-library-demo-smoke-2026-06-02.png` and `component-library-demo-smoke-2026-06-02.json`.
- Template screenshot/JSON: `template-library-demo-smoke-2026-06-02.png` and `template-library-demo-smoke-2026-06-02.json`.
- Command: `ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_LIBRARY_DEMO_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3038 bun run test:e2e e2e/workshop-library-demo-smoke.spec.ts --project=chromium`.
- Result: pass, 2 Playwright tests in 17.6s.
- Component coverage: `/workshop/library` rendered the Library page, Component library workspace, component sheet, component search, component tree search, component result count, component cards, and visible `Source` / `Checked` pricing trust fields.
- Template coverage: `/workshop/templates` rendered the Templates page, Template library workspace, template sheet, template search, template tree search, visible `All Templates` count text, `Structure`, and `Sample rows` preview content.
- Scope limit: this is local dev-auth proof on `127.0.0.1:3038`; it does not prove hosted auth, production Vercel, RLS allow/deny, or project-specific unlink. Closed beta remains **NO-GO**.

### Template Insert Local Smoke Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/template-insert-local-smoke-2026-06-02.md`.
- Screenshot/JSON: `template-insert-local-smoke-2026-06-02.png` and `template-insert-local-smoke-2026-06-02.json`.
- Command: `ARCHESTIMATOR_E2E_TEMPLATE_INSERT_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_TEMPLATE_INSERT_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3039 bun run test:e2e e2e/workshop-template-insert-smoke.spec.ts --project=chromium`.
- Result: pass, 1 Playwright test in 46.1s.
- Covered behavior: created a throwaway user-owned estimate under Lewis Residence, opened the protected estimate workspace through local dev auth, selected the right-sidebar `Templates` tab, inserted `Condo Fit-Out Starter` into `Second Floor`, verified linked Supabase counts changed from 51 nodes / 0 rows to 56 nodes / 8 rows, verified one `template_inserted` event for the target group, then deleted the throwaway estimate.
- Cleanup proof: post-run residue check found no `E2E Template Insert%` estimates.
- Scope limit: this is local dev-auth plus linked-Supabase fixture proof. It does not prove hosted auth, production Vercel, RLS allow/deny, provider dashboards, or project-specific unlink. Closed beta remains **NO-GO**.

### Support/Feedback Local Surface Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-feedback-local-surface-2026-06-02.md`.
- Public contact route: `/contact` source renders `Direct Support`, `support@archestimator.com`, and privacy copy for quote workflow support and access inquiries.
- Workshop feedback path: `WorkshopPageShell` renders `Send beta feedback` with `mailto:support@archestimator.com?subject=Archestimator%20beta%20feedback`.
- Legal/deletion copy: `/terms` and `/privacy` both point support, access, beta feedback, and data deletion requests to `support@archestimator.com`.
- Test coverage: `tests/vitest/support-contact-readiness.test.ts` guards those source contracts, and `tests/vitest/workshop-reset.test.tsx` already renders the workshop feedback link.
- Launch meaning: this proves a local visible support/feedback surface, not monitored inbox/form delivery, uptime/error alerts, or incident ownership. Support/monitoring remains a **NO-GO** row until manual/provider proof exists.

### Support Email DNS Readiness Evidence

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/support-email-dns-readiness-2026-06-02.md`.
- DNS proof: `dig +noall +answer MX archestimator.com` returned five `eforward*.registrar-servers.com` MX records.
- SPF proof: `dig +noall +answer TXT archestimator.com` returned `v=spf1 include:spf.efwd.registrar-servers.com ~all`.
- DMARC proof: `dig +noall +answer TXT _dmarc.archestimator.com` returned no answer.
- Launch meaning: this proves DNS mail-routing evidence for the support domain, not inbox monitoring, form delivery, alert ownership, or incident escalation. Support/monitoring remains a **NO-GO** row.

### Project-Specific Unlink Linked Smoke Attempt

- Artifact note: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/project-specific-unlink-linked-smoke-blocked-2026-06-02.md`.
- Command: `ARCHESTIMATOR_E2E_UNLINK_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_UNLINK_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3040 bun run test:e2e e2e/workshop-project-specific-unlink-smoke.spec.ts --project=chromium`.
- Result: blocked/fail at the linked detach step.
- Blocking error: linked Supabase returned `PGRST202` because `public.unlink_estimate_row_item_from_library_with_history(acting_user_id, correlation_id, expected_row_revision, reason, target_estimate_id, target_project_id, target_row_id)` is absent from the schema cache.
- Observed state: the throwaway row remained `linked-clean`, `row_revision=1`, and `source_library_item_id='44444444-4444-4444-8444-444444444441'`.
- Cleanup proof: post-run residue check found no `E2E Project Specific%` estimates.
- Scope limit: this is negative linked-provider evidence. The local unlink implementation remains code/test covered, but linked/manual unlink proof cannot pass until backup/PITR and linked migration/RPC proof are resolved. Closed beta remains **NO-GO**.

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
| `bun run test:dom` | Pass; 131 files / 1021 tests / 2 skipped after seed-contract repair. | DOM baseline blocker closed locally for this slice. |
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
| `sendEmail`, Resend webhook route | Confirms unconfigured email now fails closed outside tests and that webhook secret proof remains required. |

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
