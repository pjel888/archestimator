# 12 — Final MVP Launch Gate

**Date:** 2026-06-01

## What Must Be Green Before Launch

### Code Quality
- [ ] `bun run type-check` — 0 errors
- [ ] `bun run lint` — 0 errors (warnings reviewed)
- [ ] `bun run lint:design-system` — 0 violations
- [ ] `bun run test` — all pass
- [ ] `bun run test:dom` — all pass (or 2 pre-existing failures documented)
- [ ] `bun run build` — succeeds

### Features
- [ ] Auth/login works on production
- [ ] Workshop homebase loads with project grid
- [ ] Project create/list/detail works
- [ ] Estimate create/duplicate/open works
- [ ] Estimate tree (group/area nodes) works, DnD reorder works
- [ ] Estimate row editing (quantity, contingency, miscCost) works
- [ ] Component library browsable, searchable, insertable
- [ ] Templates browsable, previewable, insertable
- [ ] Component unlink works (RPC, UI, badges, history)
- [ ] Project-specific row editing does not mutate library
- [ ] Excel export produces professional bid/BOQ workbook
- [ ] Export opens in Excel, Numbers, LibreOffice
- [ ] Export handles detached row values correctly

### AI Deferral
- [ ] Ask Flip NOT visible on any workshop page
- [ ] AI API routes disabled (404 or feature-flag-gated)
- [ ] No "Ask Flip" text in rendered workshop page source

### Design
- [ ] All workshop pages: SF Pro, regular/medium, ≤12px, xs radius, zero tracking
- [ ] Design-system lint 0 violations
- [ ] No visual regressions from new features

### Security
- [ ] RLS enabled on all user-data tables
- [ ] RPC grants correct (authenticated only, no anon write)
- [ ] No service-role key in browser code
- [ ] CSP headers configured

### Data
- [ ] All migrations applied to production Supabase
- [ ] Migration history clean
- [ ] Seed data verified (component names, thumbnails, pricing)

### Deployment
- [ ] Vercel production deploy successful
- [ ] Custom domain/SSL working
- [ ] Environment variables set correctly
- [ ] Supabase connection works from production

### Legal
- [ ] Privacy Notice reviewed (or accurate pending-review status)
- [ ] Terms of Service reviewed (or accurate pending-review status)

## What Can Be Known-Debt After Launch

| Debt | Reason | Mitigation |
|------|--------|------------|
| Material/labor split missing from export | MVP compatibility mode chosen | Documented as "material costs only unless noted" in export |
| Scope status stored in source_snapshot (not dedicated column) | Avoids schema migration risk | Migrate to dedicated column post-MVP |
| Seed templates hardcoded (with Supabase fallback) | Low risk, works | Migrate fully to Supabase post-MVP |
| 14 ESLint warnings | Pre-existing, low severity | Fix incrementally |
| No E2E test suite for all features | Vitest coverage is strong | Add Playwright E2E post-MVP |
| Lighthouse score ~0.73 for projects page | Acceptable for MVP | Improve post-MVP |
| Legal pages may be pending-review status | Legal review timeline unknown | Keep status pages accurate |

## What Must Be Hidden / Deferred

| Feature | Current state | Launch state |
|---------|--------------|-------------|
| Ask Flip footer button | Visible everywhere | Hidden (NEXT_PUBLIC_ASK_FLIP_ENABLED=false) |
| `/api/ai/ask` | Active | Disabled (AI_ASK_ENABLED=false) |
| `/api/ai/package-builder` | Active | Disabled (AI_PACKAGE_BUILDER_ENABLED=false) |
| AI audit tables | Dormant (internal) | Dormant (no user surface) |
| AI memory | Default-off | Default-off (unchanged) |
| Invite entry (collaboration) | Feature-flagged | Per existing flag (PROJECT_INVITE_ENTRY_ENABLED) |

## What Must Be Manually Inspected

1. **Visual walkthrough of all workshop pages** — check for Ask Flip, check design-system compliance
2. **Excel export opened in Excel, Numbers, LibreOffice** — verify formulas, layout, printing
3. **Auth flow on production** — Google OAuth login, magic link login, logout
4. **Full workflow smoke test** — login → create project → create estimate → add rows → unlink component → export → open in Excel
5. **Component library** — browse, search, empty states, loading states
6. **Templates** — browse, preview, insert, empty states
7. **Error states** — what happens on failed loads, network errors, auth expiration
8. **Mobile / responsive** — sidebar behavior, estimate grid on small screens
9. **Public pages** — landing, features, pricing, contact, privacy, terms

## Owner Sign-Off Checklist

- [ ] **Product Owner (Philip Lewis):** All MVP features working. No unfinished AI surfaces visible. Export looks professional. Project-specific components work correctly.
- [ ] **Legal:** Privacy Notice and Terms of Service reviewed and approved (or pending-review status accepted).
- [ ] **Engineering:** All validation gates pass. All P0 risks mitigated. Deployed to production and verified.
- [ ] **Design:** All workshop pages pass design-system lint. Visual audit complete.
- [ ] **QA:** Full workflow smoke test passed. Export verified in 3 spreadsheet apps.

## Post-MVP Backlog

Priority order for work after launch:

1. **Material/labor split** — add `labor_unit_cost` to estimate_row_items, editable in sheet, visible in export
2. **Export settings UI** — configurable exclusions, terms, VAT, warranty per estimate
3. **PDF export** — formal proposal letter with branded cover page
4. **Template management** — admin CRUD for templates in workspace
5. **Scope status UI** — row-level INCLUDED/EXCLUDED/BY OTHERS toggle in estimate sheet
6. **Component library bulk operations** — import/export, batch pricing update
7. **Ask Flip reactivation** — when AI is robust and UX is polished
8. **Advanced charts** — cost trends, estimate comparisons, project dashboards
9. **Mobile estimate editing** — simplified row entry for mobile
10. **E2E test suite expansion** — Playwright specs for all core workflows

## Launch Decision

**Go:** All P0 gates pass. Owner sign-off obtained. Production deployment verified.

**No-Go:** Any P0 gate fails. Must fix before launch.

**Conditional Go:** P0 passes but P1 has documented exceptions. Owner approves exceptions.

---

*This document is the final gate. When all checkboxes are marked, Archestimator MVP is ready to launch.*
