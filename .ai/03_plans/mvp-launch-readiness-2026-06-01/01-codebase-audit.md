# Codebase Audit

## Fourth-Pass Closed Beta Audit - 2026-06-02

This audit supersedes public paid-launch assumptions with closed beta launch readiness.

### Command Baseline

| Command | Status | Evidence |
| --- | --- | --- |
| `git status --short` | Pass before docs | Clean before this planning-doc edit pass; final status is docs-only changes. |
| `git rev-parse HEAD` | Pass | `811362ac70d84cf20101f83258ae22c4e8b2c11f` |
| `bun install --frozen-lockfile` | Pass | Bun 1.3.10 checked lockfile/install set without changing dependencies. |
| `bun run type-check` | Pass | `tsc --noEmit` completed. |
| `bun run lint` | Pass with warnings | 14 existing warnings; no errors. Warnings are unused variables/disable comments and one React Compiler TanStack Table skip. |
| `bun run lint:design-system` | Pass | App/workshop design-system enforcement passed. |
| `bun run test` | Pass | 4 unit tests passed. |
| `bun run test:dom` | Fail | 3 existing static-contract assertions failed: 2 AI package-builder contract expectations and 1 share recipient-token expectation. 120 files passed, 2 files failed, 984 tests passed, 2 skipped. |
| `bun run build` | Pass | Next.js 16.2.6 production build completed and listed app/proxy routes. |

Non-mutating E2E was not run. The suite contains feature-flagged and seeded flows with mutating setup requirements. Required env/config includes Supabase URL/anon/service role, optional Resend API/webhook variables for email flows, and E2E flags such as `ARCHESTIMATOR_E2E_SHARED_LINK`, `ARCHESTIMATOR_E2E_INVITE_ENTRY`, `ARCHESTIMATOR_E2E_COLLABORATION`, `ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER`, and `ARCHESTIMATOR_E2E_MUTATING_DND`. Manual replacement smoke is defined in the runbook: allowed/denied Google account, public route, share route, first workspace, estimate, unlink, export, and feedback checks.

### Graph And Impact Baseline

- code-review-graph was used before fallback static reads. The graph reported 387 files, 3633 nodes, 51052 edges, and last update `2026-06-02T01:22:38`.
- Graph summaries were inspected for `src/proxy.ts`, auth actions/callback/session, pricing page, contact form, Resend email client, and workspace repository.
- GitNexus was stale against current HEAD, so `npx gitnexus analyze .` was run before impact/query work. The refreshed index reported 10,381 nodes, 19,110 edges, 471 clusters, and 300 flows.
- GitNexus impact for `resolvePostAuthDestination` returned LOW risk with direct caller `src/app/auth/callback/route.ts:GET`.
- Broad graph text searches did not fully cover all closed-beta surfaces, so fallback static analysis was used and this limitation is recorded.

### Auth And Access Findings

- Google Sign-In is handled in `src/lib/auth/actions.ts`.
- OAuth callback is handled in `src/app/auth/callback/route.ts`.
- `/workshop` protection is currently centralized in `src/proxy.ts`.
- User/profile context is resolved in `src/lib/auth/session.ts`.
- Default workspace creation/reuse is handled in `src/lib/repositories/workspace-repository.ts`.
- Current state: no closed beta allowlist table, no whitelist helper, no callback whitelist gate, no proxy/session whitelist gate, and no access-required page.
- Recommended blocker location: enforce in callback, proxy, and session/server-action boundaries to avoid stale-session bypass.

### Payment And Pricing Findings

- `package.json` includes no Stripe dependency.
- `/pricing` exists and currently reads as preview/free/future-pricing copy, not closed-beta allowlist copy.
- Public landing CTAs currently send users toward workspace/login and must be reframed as request access, contact Philip, or sign in if invited.
- Payment, checkout, subscriptions, invoices, billing, and plan enforcement are deferred and not P0 for closed beta.

### Resend And Email Findings

- Resend client code exists in `src/lib/email/resend-client.ts`.
- Resend webhook route exists at `src/app/api/webhooks/resend/route.ts`.
- Delivery event handling updates share-recipient state and requires webhook signature configuration.
- For closed beta onboarding, Resend is P1 if Philip sends manual invites. It becomes P0 only for visible share/invite email workflows that beta users must rely on.

### Feedback Findings

- `/contact` and `ContactForm` exist, with feedback-style inquiry options.
- The contact form currently behaves like a client-side success mock and is not proven as a durable feedback capture path.
- Closed beta needs a P0 support/feedback path. Safest MVP recommendation: external form link plus support email, with in-app visibility for allowed users.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Audit date: 2026-06-02
Write scope: documentation only.

## Required Reads Completed

Read or inspected before document edits:

- `AGENTS.md`, `DESIGN.md`, `README.md`, `package.json`, `bun.lock`, `.env.example`, `.github/workflows/ci.yml`.
- `.ai/README.md`, `.ai/00_system/ai-folder-canonical-map.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`.
- `.ai/06_specs/*`.
- Every existing document in `.ai/03_plans/mvp-launch-readiness-2026-06-01`.

`bun.lockb` is not present; this repo uses `bun.lock`.

## Command Evidence

| Command | Status | Evidence |
| --- | --- | --- |
| `git status --short` | Pass | Clean before edits. |
| `git rev-parse HEAD` | Pass | `681c95e64864f283950a88dba304eaffe8f2f8b3`. |
| `bun install --frozen-lockfile` | Pass | Bun 1.3.10 checked 703 installs across 775 packages; no lockfile changes. |
| `bun run type-check` | Pass | `tsc --noEmit` exit 0. |
| `bun run lint` | Pass with warnings | 0 errors; warnings in pitch deck unused vars, unused eslint-disable, TanStack React Compiler skip, two test unused vars. |
| `bun run lint:design-system` | Pass | Compact hierarchy, font, radius, tracking, token, and icon enforcement passed. |
| `bun run test` | Pass | 4 Bun tests passed. |
| `bun run test:dom` | Fail | 120 files passed, 2 failed; 984 tests passed, 3 failed, 2 skipped. Failures are source-string contract drift in AI package-builder and share route tests. |
| `bun run build` | Pass | Next.js 16.2.6 Turbopack build succeeded; 28 static pages generated. |
| `bun run test:e2e` | Blocked by environment | Playwright webServer could not start because another Next dev server was already running on port 3000. No production E2E was run. |

## Graph / Blast-Radius Evidence

Code-review graph was used before manual fallback:

- Graph context: 3,633 nodes, 51,052 edges, 387 files; risk low for docs-only edits.
- Architecture overview: 120 communities; high-value communities include `workshop-estimate`, `estimates-estimate`, `workshop-project`, and `component-library-component`.
- Critical flows include `createProject`, `signInWithEmail`, `signInWithGoogle`, `fetchEstimateTree`, `handleAutoGenerate`, `handleCreateEstimateSheet`, `createEstimate`, and `createEstimateNode`.
- Bridge nodes: `EstimateSheetContent`, `EstimateSheetTree`, `EstimateRightSidebar`, `ProjectPublicationHeader`, and invite/share E2E paths.
- Graph limitation: broad semantic searches for some long phrases returned no matches, so exact `rg`, file reads, and native explorer audits were used as fallback.

No product symbols were edited in this pass, so symbol impact analysis is recorded as planning evidence only. Before implementation, run targeted impact analysis for each ticket's symbols in `15-blast-radius-register.md`.

## Validated Route Map

| Surface | Routes / files | Current state | Launch risk |
| --- | --- | --- | --- |
| Marketing/public | `src/app/page.tsx`, `about`, `features`, `pricing`, `contact` | Public pages build; pricing is preview-safe but needs legal/owner claim review. | P1/P0 if claims overstate readiness. |
| Legal | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` | Explicit pending-review placeholders. | P0 for closed beta as beta terms/privacy/AUP/disclaimers; paid customer terms are post-beta. |
| Auth | `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/proxy.ts` | Google/email login path exists; callback routes to `/workshop`; protected proxy covers `/workshop`. | P0 hosted provider proof gap. |
| Workshop | `src/app/workshop/page.tsx`, `layout.tsx`, project/settings/library/templates subroutes | Core app shells exist and build. | P0/P1 based on feature gates below. |
| Share | `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/*` | Public view-only receiver with session/comment/decision APIs. | P0 if visible without RLS/token/email proof. |
| Invite | `src/app/invite/[token]/*`, `src/app/workshop/pending-invite/route.ts` | Invite entry disabled by env by default; signed-out bridge exists. | P0 if enabled without env/RLS/email proof. |
| AI APIs | `src/app/api/ai/ask/route.ts`, `src/app/api/ai/package-builder/route.ts` | Routes call handlers directly; Ask Flip UI is mounted. | P0 because AI is deferred for MVP. |
| Export API | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | Node runtime XLSX attachment route exists. | P0 because workbook is not launch-grade bid form. |
| Uploads/images | component-library and project image APIs | Image/storage paths exist; policies need staging proof. | P1/P0 if images are launch-visible. |
| Webhook | `src/app/api/webhooks/resend/route.ts` | Verifies Resend/Svix when secret exists; 503 if missing. | P0 if share/invite emails are visible. |

## Architecture Map

| Area | Key files / symbols | Current fact |
| --- | --- | --- |
| Workshop shell | `WorkshopPageShell`, `AskFlipFooterAssistant` | Shell unconditionally renders Ask Flip at `WorkshopPageShell.tsx`. |
| Estimate editor | `EstimateSheetContent`, `EstimateSheetTree`, `useEstimateRowMutations` | High-blast-radius UI/state/history center. |
| Estimate actions | `insertEstimateRowItemFromLibrary`, `updateEstimateRowItem`, `replaceEstimateRowItemWithLibrary`, `deleteEstimateRowItem` | Server actions use revision-aware RPCs for ordinary row mutations. |
| Supabase types | `src/lib/supabase/types.ts` | Generated types include `estimate_row_items`, events, RPCs, and `estimate_row_link_state`. |
| Proposal export | `buildProposalExportModel`, `createProposalWorkbook`, export route | Existing model maps `itemCost` to material, labor to `0`, all rows included, static totals. |
| Auth | `src/lib/auth/*`, `src/proxy.ts` | Auth redirect/origin contracts exist but env docs are incomplete. |
| Publication/share | `src/lib/publication/*`, share APIs | Public flows use token/session/CSRF helpers; production proof still missing. |
| Email | `src/lib/email/*`, Resend webhook | Sends mock-success without `RESEND_API_KEY`; webhook verifies with secret. |
| AI | `src/lib/ai/*`, AI route handlers | Real-session guard exists; global MVP disable does not. |

## Data Model Map

| Table / enum / RPC | Current verified contract | Launch implication |
| --- | --- | --- |
| `estimate_row_items` | Has `source_library_item_id`, `source_snapshot`, `metadata`, `link_state`, `row_revision`, `misc_cost`, `contingency_percentage`. | Supports project-specific rows without library mutation. |
| `estimate_row_link_state` | `unlinked`, `linked-clean`, `linked-overridden`, `detached`, `source-changed`. | Use `detached` for rows severed from a real library source; `unlinked` for never-linked/manual rows. |
| `estimate_sheet_events` | Stores row context, old/new snapshots, changed fields, payload, metadata. | History must remain authoritative for unlink/replace/edit. |
| Row RPCs | Insert/update/replace/delete with history and revision conflicts. | New unlink path should be dedicated or reuse verified RPC semantics without bypassing history. |
| Publication/share tables | RLS and RPC-based public access in migrations. | Must verify linked/staging RLS denial before launch. |
| `security_rate_limit_events` | Durable service-role table for abuse events. | Good audit ledger; may not be sufficient alone for hot-path public throttling. |

## API / Server Action Map

| API/action | Auth boundary | Launch decision |
| --- | --- | --- |
| `/api/ai/ask` | Handler requires real Supabase session after route entry. | Add route-level global disabled response before handler for MVP. |
| `/api/ai/package-builder` | Handler requires session and Apply confirmation; subflags default mostly on. | Add global disabled response; set all production defaults off. |
| `/api/projects/.../proposal.xlsx` | Authenticated project/estimate access via repository path. | Keep Node runtime; add row guard/perf proof and formula workbook tests. |
| `/api/share/[token]/comment|decision` | Same-origin/CSRF and recipient session helpers. | Launch only after public route security proof. |
| `/api/webhooks/resend` | Raw body Svix verification. | Launch only after `RESEND_WEBHOOK_SECRET` and dashboard delivery proof. |
| Server row actions | Authenticated Supabase client + revision-aware RPCs. | Use same path for project-specific unlink PR. |

## Infra / Env Map

`.env.example` currently documents Supabase anon URL/key, dev auth, invite-entry flags, and `DATABASE_URL`. It omits launch-critical vars for app origin, publication secrets, Resend, AI disable flags, analytics/observability, and E2E release gates. See `22-infrastructure-vercel-supabase-resend-plan.md`.

## CI / Test Map

CI runs `bun run validate`, `bun run build`, installs Chromium, then runs `bun run test:e2e` and `bun run test:e2e:perf`. `validate` includes type-check, lint, design lint, unit, and DOM tests. CI does not prove live Vercel env, live Supabase RLS/storage, Resend delivery/webhook, legal approval, HSTS, observability, or that env-gated E2E specs actually executed.

## Launch-Blocking Gaps

1. AI visible/callable by default while MVP defers AI.
2. `test:dom` failing from stale source-string tests.
3. Excel workbook lacks bid-form sheet contract, formulas, commercial blocks, and manual QA evidence.
4. Project-specific unlink is not yet a product-complete UI/RPC/action flow.
5. Env manifest and `.env.example` are incomplete for production.
6. RLS/storage/Auth/Resend proof is absent from staging/production.
7. Legal pages are pending-review placeholders.
8. Observability/support/backup/rollback proof is missing.

See `14-evidence-index.md` for exact artifacts and `12-final-mvp-launch-gate.md` for go/no-go criteria.
