# 09 — Release Readiness Checklist

**Date:** 2026-06-01

## P0 — Must pass before launch (blocks launch if any fail)

### Local Validation

- [ ] `bun install --frozen-lockfile` — passes clean (currently ✅)
- [ ] `bun run type-check` — 0 errors (currently ✅)
- [ ] `bun run lint` — 0 errors, warnings reviewed (currently 0 errors, 14 warnings ✅)
- [ ] `bun run lint:design-system` — 0 violations (currently ✅)
- [ ] `bun run test` — all pass (currently 4/4 ✅)
- [ ] `bun run test:dom` — all pass (currently 2 failing, pre-existing, need investigation)
- [ ] `bun run build` — succeeds (currently ✅)

### AI Deferral

- [ ] Ask Flip button NOT visible on any workshop page when `NEXT_PUBLIC_ASK_FLIP_ENABLED=false`
- [ ] `/api/ai/ask` returns disabled/404 when `AI_ASK_ENABLED!==true`
- [ ] `/api/ai/package-builder` returns disabled/404 when `AI_PACKAGE_BUILDER_ENABLED!==true`
- [ ] No "Ask Flip" text in any rendered workshop page source
- [ ] Existing AI tests still pass (code preserved, just hidden)

### Component Unlink

- [ ] `link_state='detached'` can be set via RPC
- [ ] Unlinked rows clear `source_library_item_id`
- [ ] Unlinked row edits DO NOT mutate `cost_library_items`
- [ ] Library edits DO NOT affect detached rows
- [ ] UI badge renders for all 4 link states correctly
- [ ] "Make project-specific" action visible and functional
- [ ] Row inspector editable for detached rows only
- [ ] Activity/history records unlink events
- [ ] Unit tests pass for all unlink scenarios (see doc 07)

### Excel Export

- [ ] Workbook opens in Excel, Numbers, LibreOffice without errors
- [ ] Detailed bid form has ITEM, PARTICULARS, UNIT, QTY, MATERIAL, LABOR, COST TOTAL, LINE TOTAL, REMARKS columns
- [ ] COST TOTAL and LINE TOTAL are formula-driven
- [ ] Section subtotals and grand total are formula-driven
- [ ] No blank LINE TOTAL cells
- [ ] Header block populated with project metadata
- [ ] Summary, legal blocks present
- [ ] INCLUDED/EXCLUDED/BY OTHERS handled
- [ ] Unit tests pass for workbook structure, formulas, values
- [ ] Manual QA in at least 2 spreadsheet apps

### Auth

- [ ] Login via Google OAuth works on deployed environment
- [ ] Login via magic link works on deployed environment
- [ ] Auth callback handles errors gracefully
- [ ] Protected workshop routes redirect to login
- [ ] CEO profile (`philipjonlewis@gmail.com`) has platform-wide access
- [ ] Dev auth bypass disabled in production (NODE_ENV check)

### Supabase Migrations

- [ ] All 48 migrations applied to production Supabase project
- [ ] Migration history clean (no missing/failed migrations)
- [ ] RLS enabled on all user-data tables
- [ ] RPC functions have correct grants (authenticated only, no anon write)
- [ ] No service-role key in browser code
- [ ] New migration for unlink RPC applied and verified

### RLS

- [ ] `estimate_row_items` — authenticated workspace members can read, editors can write
- [ ] `cost_library_items` — authenticated workspace members can read, editors can write
- [ ] `estimate_templates` — authenticated workspace members can read
- [ ] `estimate_sheet_events` — authenticated workspace members can read, no direct anon write
- [ ] `ai_action_runs` — no direct anon/authenticated write
- [ ] `security_rate_limit_events` — service-role only

### Env Variables

- [ ] `.env.example` updated with all required variables
- [ ] Production env has all required values set
- [ ] `NEXT_PUBLIC_ASK_FLIP_ENABLED=false` in production
- [ ] `AI_ASK_ENABLED=false` in production
- [ ] `AI_PACKAGE_BUILDER_ENABLED=false` in production
- [ ] `PROJECT_INVITE_ENTRY_ENABLED` configured correctly
- [ ] `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` set (64-char hex)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (not service-role)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server only)
- [ ] `RESEND_API_KEY` set (for share/invite emails)
- [ ] `RESEND_WEBHOOK_SECRET` set (for delivery webhooks)

### Vercel / Deployment

- [ ] `bun run build` succeeds in production mode
- [ ] Deployment to Vercel successful
- [ ] Custom domain configured (if using)
- [ ] SSL/HTTPS working
- [ ] Environment variables set in Vercel dashboard
- [ ] Supabase connection works from Vercel

### Privacy / Terms

- [ ] Privacy Notice is reviewed legal copy (not pending-review placeholder)
- [ ] Terms of Service is reviewed legal copy
- [ ] OR: pending-review status pages are accurate and truthful
- [ ] Contact/support link functional

### Support / Contact

- [ ] Contact form works
- [ ] Support email configured
- [ ] Error pages show contact/support info

## P1 — Should pass before launch (makes launch polished)

### Smoke Tests

- [ ] Full workflow: Login → Homebase → Create project → Create estimate → Open estimate workspace
- [ ] Browse component library → Search → Select component → Insert into estimate
- [ ] Edit row quantity, contingency, miscCost → Verify totals update
- [ ] Unlink component → Edit as project-specific → Verify library unchanged
- [ ] Browse templates → Preview → Insert into estimate
- [ ] Export estimate → Download XLSX → Open in Excel → Verify structure
- [ ] Project charts load with correct data
- [ ] Share link creates and works
- [ ] Profile settings save
- [ ] Workspace settings save

### Design-System Audit

- [ ] All workshop pages pass `bun run lint:design-system` (0 violations)
- [ ] Visual audit: No text exceeds 12px in app/workshop
- [ ] Visual audit: All border radius is xs (3px)
- [ ] Visual audit: No bold/semibold weights in app
- [ ] Visual audit: All icons are regular weight (1px outline)
- [ ] Visual audit: Zero letter-spacing on all app text

### Test Coverage

- [ ] `test:dom` passes with 0 failures
- [ ] Unit tests for unlink workflow pass
- [ ] Unit tests for export workbook pass
- [ ] E2E smoke for estimate-templates-export workflow (manual or automated)

### Data Backup

- [ ] Supabase production database has backup policy enabled
- [ ] Migration rollback plan documented

## P2 — Nice to have before launch

- [ ] `test:e2e` run for non-mutating specs
- [ ] Performance smoke — all routes load under 5s
- [ ] Lighthouse score ≥ 70 for `/workshop/projects`
- [ ] SEO meta tags on public pages
- [ ] favicon and social share images
- [ ] Error tracking/monitoring configured (Sentry or similar)
- [ ] Uptime monitoring configured

## Pre-existing Issues to Track

| Issue | Severity | Status | Launch Blocker? |
|-------|----------|--------|-----------------|
| 2 failing Vitest tests (shared-link session) | P2 | Pre-existing, unrelated to MVP Core | No — fix or skip |
| 14 ESLint warnings | P3 | Pre-existing | No |
| No E2E for estimate-templates-export | P1 | Gap | Yes — must add smoke test |
| Legal pages are placeholder text | P0 | Gap | Yes — must be reviewed |
| Ask Flip visible (will be hidden in Phase 1) | P0 | Will fix | Yes — Phase 1 fix |
| Component unlink missing (will be built in Phase 2) | P0 | Will build | Yes — Phase 2 build |
| Excel export insufficient (will be rebuilt in Phase 5) | P0 | Will rebuild | Yes — Phase 5 rebuild |

## Rollback Plan

If launch fails:
1. Revert Vercel deployment to previous working commit
2. Keep Supabase migrations applied (they're additive and backwards-compatible)
3. Feature-flag-disable problematic features via env variables
4. Restore from database backup if data corruption occurred
5. Document root cause in post-mortem

## Owner Sign-Off

- [ ] Philip Lewis — Product owner approval
- [ ] Legal — Privacy/Terms review
- [ ] QA — Smoke test pass
- [ ] Deployment — Vercel production deploy verified
