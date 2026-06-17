# Codebase Research

## Research method

This was a docs-only planning pass. The agent used code-review-graph before broad local inspection, then verified live files and package versions directly. GitNexus-specific MCP tools were not exposed in the current tool surface; code-review-graph was available and used as the graph intelligence fallback.

## Commands run

```bash
pwd
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git worktree list
git remote -v
git fetch --prune origin
git log --oneline -5
node -e 'const p=require("./package.json"); console.log(...)'
find src/app -maxdepth 5 \( -name page.tsx -o -name route.ts -o -name layout.tsx \) | sort
find supabase/migrations -maxdepth 1 -type f -name '*.sql' | wc -l
rg -n "terms|privacy|consent|accepted|acceptance|marketing_consent|account_security_events|..." src supabase .ai/06_specs .ai/03_plans .ai/09_archive README.md package.json
python3 -c 'fetch https://supabase.com/changelog.md and scan breaking-change notes'
rg -n "proxy|Route Handlers|headers\(|cookies\(|matcher|redirect" node_modules/next/dist/docs/...
```

## Initial repo safety evidence

- `pwd`: `/Users/philiplewis/archestimator`.
- `git rev-parse --show-toplevel`: `/Users/philiplewis/archestimator`.
- `git status --short --branch`: `## main...origin/main` and no dirty files at the start.
- Branch: `main`.
- Worktrees: main at `/Users/philiplewis/archestimator`, task worktree at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-terms-and-conditions`, and performance plan worktree.
- Remote: `origin https://github.com/pjel888/archestimator.git`.
- `git fetch --prune origin`: completed with known non-blocking Git GC loose-object warning already tracked in `.ai/15_Bugs/2026-06-04-git-gc-unreachable-loose-objects-warning.md`.
- Recent commits included `18466eb Record beta-stage CI/CD deferral` and `1e7c581 Restore Vitest compatibility for hosted route checks`.

## Code-review-graph usage result

- `get_minimal_context(task="docs-only Terms and Conditions implementation planning...")` returned `4821 nodes`, `72140 edges`, `520 files`, low risk, top communities `workshop-estimate`, `estimates-estimate`, `workshop-project`, and affected/high-criticality flows `createProject`, `signInWithEmail`, `signInWithGoogle`.
- `list_flows(detail_level=minimal)` identified critical flows including `createProject`, `signInWithEmail`, `signInWithGoogle`, `GET`, `fetchEstimateTree`, `ProjectDashboardPage`, `ProjectLayout`, and `WorkshopPage`.
- `query_graph(file_summary, src/proxy.ts)` found functions `hasSupabaseProxyEnv`, `isPublicRoute`, `isMarketingPage`, `createRequestPathResponse`.
- `query_graph(file_summary, src/app/auth/callback/route.ts)` found the `GET` route handler.

## Required files read and findings

## Core repository evidence snapshot

| Area | Evidence |
| --- | --- |
| Project brain | `AGENTS.md:11-30`, `.ai/README.md:12-33`, `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md:7-17` require `.ai` source-of-truth use and live verification. |
| Stack | `package.json` scripts/dependencies verified: Next `16.2.6`, React `19.2.6`, Bun scripts, Tailwind `4.3.0`, Supabase SSR `0.10.3`, Supabase JS `2.106.2`, TanStack Query `5.100.14`, Zustand `5.0.14`, Vitest `4.1.7`, Playwright `1.60.0`. |
| Routes | `find src/app ...` shows `/login`, `/auth/callback`, `/privacy`, `/terms`, `/pricing`, `/beta/access-required`, `/invite/[token]`, `/share/[token]`, protected `/workshop/*`, and relevant API routes. |
| Proxy/auth gate | `src/proxy.ts:8-11` defines protected `/workshop`; `/privacy` and `/terms` are public; `src/proxy.ts:95-141` uses Supabase `getUser()`, closed-beta access, and redirects signed-out protected users to `/login`. |
| Auth callback | `src/app/auth/callback/route.ts:22-26` captures request id/IP/user-agent for account security audit, exchanges the OAuth code, checks closed-beta access, and redirects via `resolvePostAuthDestination()` at `route.ts:101-102`. |
| Current Terms | `src/app/terms/page.tsx:18-23` says closed beta and no public/paid SaaS; `terms/page.tsx:31-34` says no payment/subscription contract; `terms/page.tsx:43-46` disclaims final pricing/scope/code/supplier/labor/tax/bid accuracy. |
| Current Privacy | `src/app/privacy/page.tsx:25-39` lists account/workspace/project/estimate/support/telemetry/processors; `privacy/page.tsx:49-52` includes deletion request copy. |
| Login legal notice | `src/app/login/page.tsx:77-86` links to closed-beta Terms and Privacy by copy-only continued-use notice; no persisted versioned acceptance exists. |
| Billing posture | `src/app/pricing/page.tsx` and `.ai/03_plans/mvp-launch-readiness-2026-06-01/32-business-model-and-pricing-readiness-note.md:5-14` state no Stripe, checkout, subscriptions, invoices, billing UI, or payment collection in closed beta. |
| Legal prior plan | `.ai/03_plans/mvp-launch-readiness-2026-06-01/25-legal-terms-privacy-compliance-plan.md:5-22` says closed beta needs beta legal posture and is not legal advice; lines `38-42` define Terms/Privacy/AUP/Data Processing topics. |
| Beta legal copy | `.ai/03_plans/mvp-launch-readiness-2026-06-01/42-closed-beta-copy-and-legal-pack.md:55-103` documents no payment, user responsibility, construction estimate accuracy, export review, deletion path, and counsel review before external testers. |
| Data/audit patterns | `src/lib/auth/account-audit.ts:41-56` hashes IP/user-agent for account security events; `.ai/06_specs/initial-data-model.md:145-152` documents append-only `estimate_sheet_events`; `.ai/06_specs/ai-assistant-and-package-builder-spec.md:34-36` documents metadata-only AI audit. |
| Supabase | `supabase/migrations` live count is 81 SQL files; current latest includes `20260605131500_restore_lewis_residence_seed_rows.sql`; `supabase/migrations/20260601182522_closed_beta_allowed_emails.sql:23-24` enables RLS/revokes broad grants for beta allowlist. |
| Design system | `DESIGN.md:90-122`, `DESIGN.md:322-387`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md:83-96`, and `.ai/00_system/VALIDATION_MATRIX.md:64-69` enforce SF Pro, 12px max app/workshop text, regular/medium weights, zero tracking, xs radius, shared primitives, and blocking design lint. |
| Validation | `.ai/00_system/VALIDATION_MATRIX.md:7-23` requires `bun run validate`, `bun run build`, and `bun run test:e2e` when auth/protected-route/browser flows change; `package.json` defines those scripts. |
| Source drift | `.ai/README.md:31` says 48 migrations and `README.md:14/159` says 67 migrations, while live `find supabase/migrations` returned 81. This plan uses live evidence and files a non-blocking docs-drift bug. |


## Project structure observed

- `src/app/` uses Next.js App Router pages and route handlers.
- `src/proxy.ts` is the single Next.js Proxy file for auth/closed-beta route gating.
- `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` provide request-scoped SSR/browser Supabase clients.
- `src/lib/auth/*` contains account audit, closed-beta access, safe redirect, session/user context, and dev-auth bypass patterns.
- `src/components/workshop` and `src/components/ui` contain shared UI primitives to reuse for any app/workshop acceptance UI.
- `supabase/migrations/` contains 81 SQL files; generated types live at `src/lib/supabase/types.ts`.
- `.ai/06_specs` maps feature inventory, auth/tenancy, data model, AI audit, teamspaces, and UX flows.

## Active app routes relevant to Terms

- Public/legal/marketing: `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/login`, `/beta/access-required`.
- Auth: `/auth/callback` route handler.
- Invite/share: `/invite/[token]/*`, `/share/[token]`, `/api/share/[token]/*`.
- Protected app: `/workshop`, `/workshop/projects`, `/workshop/projects/[projectId]`, `/workshop/projects/[projectId]/estimates`, `/workshop/settings/*`, `/workshop/feedback`, library/templates/charts.

## API routes / route handlers

- Auth callback: `src/app/auth/callback/route.ts`.
- AI routes: `src/app/api/ai/ask/route.ts`, `src/app/api/ai/package-builder/route.ts` are deferred/gated per `.ai/10_state/decisions.md` and AI specs.
- Share API routes under `src/app/api/share/[token]/*`.
- Health and provider webhooks: `src/app/api/health/route.ts`, `src/app/api/webhooks/resend/route.ts`.
- No current Terms acceptance API route found.

## Middleware/protected-route logic

- Next 16 uses `src/proxy.ts`, not legacy middleware naming.
- `src/proxy.ts:8-11` protects `/workshop` and treats `/privacy` and `/terms` as public.
- `src/proxy.ts:95-114` creates a Supabase SSR client and calls `supabase.auth.getUser()`.
- `src/proxy.ts:116-123` redirects signed-out protected requests to `/login?next=...`.
- `src/proxy.ts:125-135` signs out users who fail closed-beta access.
- Local Next docs say Proxy is not intended for slow data fetching/full authorization; Terms status checks should avoid making Proxy a broad DB authorization layer unless measured/justified.

## Auth/signup/login/account/profile flows

- `/login` supports Google OAuth and magic-link email; no app-owned password UI.
- `.ai/10_state/decisions.md:129` states `/login` is canonical, `/auth/callback` is canonical, `/signup` is not added, Google OAuth primary, email link fallback, no anonymous sign-ins.
- `src/app/auth/callback/route.ts` exchanges code for session, records account security events, checks closed beta access, and redirects to `resolvePostAuthDestination(next)`.
- `src/lib/auth/session.ts:31-90` gets current user, checks closed-beta access, ensures profile, and redirects unauthenticated users.
- `src/lib/auth/account-audit.ts:41-56` hashes IP/user-agent metadata for account security audit rows.

## Billing/subscription/payment/refund/cancellation flows

- No Stripe dependency in `package.json`.
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/32-business-model-and-pricing-readiness-note.md:5-14` explicitly says no payment, Stripe, checkout, subscriptions, invoices, billing UI, or payment collection in closed beta.
- `src/app/pricing/page.tsx` states pricing will be announced after beta and no checkout/subscription/paid-plan enforcement is active.
- Future billing clauses and checkout acceptance should be planned but marked inactive for current closed beta.

## Supabase/Postgres evidence

- Project safety: AGENTS says only ArchEstimator project `ebxxqidacheyapmmzavr`; never archestimator.
- Live local migrations: 81 files, not the stale counts in `.ai/README.md`/root `README.md`.
- `20260601182522_closed_beta_allowed_emails.sql` creates closed beta allowlist, enables RLS, and revokes broad anon/authenticated table grants.
- Generated types contain `user_onboarding_profiles.marketing_consent_at`, `account_security_events`, `closed_beta_allowed_emails`, and many domain/audit tables; no `terms_acceptance`/`legal_terms_acceptances` table was found.
- Existing append-only/audit patterns include `estimate_sheet_events`, `account_security_events`, `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `collaboration_audit_events`.

## Existing Terms/Privacy/legal text

- Existing `/terms` is closed-beta copy, not versioned attorney-reviewed SaaS Terms infrastructure.
- Existing `/privacy` is closed-beta privacy notice.
- Existing login notice is not persisted acceptance.
- Launch plans already require counsel/owner review before external testers; this plan extends that into versioned acceptance/audit infrastructure.

## Existing tests and validation scripts

- `bun run validate` = type-check, lint, design-system lint, unit tests, DOM tests.
- `bun run build` builds production Next app.
- `bun run test:e2e` is separate Playwright and required when auth/protected-route/browser flows change.
- Relevant test families in feature inventory include auth magic link/callback/error mapping/onboarding/settings, project/dashboard UI, RLS/schema/security contracts, AI audit tests, proposal/export tests.

## Existing UI primitives and design constraints

- Future app/workshop Terms acceptance UI must reuse `src/components/ui` and `src/components/workshop` primitives before creating local controls.
- Non-landing app/workshop text must stay at 12px maximum, normal body/control around 10px, labels 8-9px, regular/medium weights only, zero tracking, xs radius, regular Phosphor icons.
- `bun run lint:design-system` blocks violations.

## Gaps/unknowns found

- No persisted Terms acceptance table or current-version constant found.
- No admin/support acceptance evidence retrieval path found.
- No re-acceptance mechanism found.
- No billing implementation exists; future subscription terms remain conditional.
- Entity name, governing law, notices contact/address, arbitration/class waiver, consumer/B2B positioning, refund/cancellation policy, and IP/user-agent retention need Philip/legal counsel decisions.
- `.ai/README.md` and root `README.md` migration counts are stale; bug plan created.

## External research translated into planning inputs

- EFF, `The Clicks That Bind`: clickwrap strength depends on conspicuous notice, affirmative assent, opportunity to review, and post-acceptance access; browsewrap is weaker. <https://www.eff.org/wp/clicks-bind-ways-users-agree-online-terms-service>
- FTC, `Click to Cancel`: recurring-payment programs need clear consent proof before charging and cancellation at least as easy as signup. <https://www.ftc.gov/business-guidance/blog/2024/10/click-cancel-ftcs-amended-negative-option-rule-what-it-means-your-business>
- FTC, `Protecting Personal Information`: inventory data, keep only information with a business need, apply least privilege, and keep retention/disposal policy. <https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business>
- ICO, `What is personal data`: online identifiers such as IP addresses may be personal data when they can distinguish users. <https://ico.org.uk/media/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/what-is-personal-data-1-0.pdf>
- Supabase RLS docs: enable RLS and scope SELECT/INSERT/UPDATE with authenticated role policies using `auth.uid()`/`WITH CHECK`. <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase changelog 2026-04-28: new public tables may require explicit grants before the Data API can reach them; RLS remains separate. <https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically>
- Local Next.js 16.2.6 docs under `node_modules/next/dist/docs/`: `proxy` is for request-time redirects/optimistic checks and not slow full authorization; Route Handlers are not cached by default; `cookies()`/`headers()` are async runtime APIs.
