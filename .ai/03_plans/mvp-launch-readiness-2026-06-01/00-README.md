# MVP Launch Readiness Plan — Archestimator

**Date:** 2026-06-01
**Status:** Planning phase — implementation approval pending
**Owner:** Philip Lewis

## MVP Goal

Launch Archestimator as a structured estimating workspace that lets contractors and sales teams:
1. Create projects and estimate sheets
2. Build reusable component libraries
3. Browse and insert template estimate structures
4. Drag or click components into estimate rows
5. Make inserted components project-specific (unlinked from library)
6. Export professional industry-standard Excel bid/BOQ workbooks
7. Get a coherent, polished, design-system-compliant experience

## Launch Thesis

Archestimator is already 80% feature-complete for MVP but has critical gaps that would make launch embarrassing:
- **Ask Flip AI footer** is visible on every workshop page with no off switch
- **Component unlink** has no UI — users cannot make library-linked rows project-specific
- **Excel export** is a generic data dump, not an industry bid form
- **Component library and templates** lack polish, empty states, and browse/search UX
- **No launch QA** has been performed as an integrated workflow

Fix these 5 gaps and the app is launchable. Leave everything else.

## Must-Ship List

| # | Feature | Current State | Gap |
|---|---------|---------------|-----|
| 1 | Auth/login works | ✅ Supabase Auth, Google OAuth, magic link | None |
| 2 | Workshop homebase | ✅ Bento grid with project/favorite shortcuts | Minor polish |
| 3 | Project create/list/detail | ✅ Full CRUD with modals, images, sharing | None |
| 4 | Estimate list/create/duplicate/open | ✅ Full CRUD with auto-generated sheet codes | None |
| 5 | Estimate tree (group/area nodes) | ✅ React Complex Tree with DnD reorder | None |
| 6 | Estimate row editing (quantity, contingency, miscCost) | ✅ Optimistic local-state mutations | None |
| 7 | Component library (browse/create/variants/pricing) | ✅ Supabase-backed with Add Component modal | Polish needed |
| 8 | Templates (browse/preview/insert) | ✅ 3 seed templates, insert into estimate groups | Polish needed |
| 9 | Component insertion (drag/click) | ✅ Library sidebar drag or click-to-insert | None |
| 10 | **Project-specific component unlink** | ❌ No UI action, no code path | **Must build** |
| 11 | **Industry Excel export** | ⚠️ Current export is generic data dump | **Must rebuild** |
| 12 | **Hide Ask Flip AI** | ❌ Visible on all workshop pages, no off switch | **Must hide** |
| 13 | Design-system compliance | ✅ Lint passes, 0 violations | Audit needed |
| 14 | Public legal pages (privacy, terms) | ⚠️ Truthful pending-review status pages | Legal review needed |

## Defer List

- Ask Flip footer assistant (hide, don't delete)
- `/api/ai/ask` route (disable via env flag)
- `/api/ai/package-builder` route (disable via env flag)
- AI Package Builder Draft/Apply UI (hide, don't delete)
- AI memory/ranking (dormant, already default-off)
- AI audit dashboards (dormant internal code)
- Proposal comparisons (not built)
- Revision intelligence (not built)
- Advanced shared-link commenting/decisions/activity/digests (keep existing, don't expand)
- Teamspaces collaboration polish beyond current stable state
- Advanced charts/comparisons beyond current D3 space/category/supplier
- Library import/export tools
- Any fake SaaS maturity, unsupported claims

## Top 5 Risks

1. **Excel export mismatch** — Current generic export will look unprofessional; industry bid form is a hard MVP requirement. Severity: P0.
2. **AI leakage into MVP** — Ask Flip button visible everywhere; looks unfinished. Severity: P0.
3. **Component unlink corrupting source data** — Must not mutate `cost_library_items` when unlinking. Severity: P0.
4. **RLS/migration drift** — 48 migrations applied to linked remote; need verification before launch. Severity: P1.
5. **Incomplete test evidence** — 2 failing Vitest tests (pre-existing), 0 E2E for estimate-templates-export workflow. Severity: P1.

## Recommended Implementation Sequence

1. **Phase 0** — Validation baseline, build, lint, run all tests, record results
2. **Phase 1** — Hide Ask Flip, route-disable AI APIs, hide AI UI surfaces
3. **Phase 2** — Build component unlink (project-specific) — RPC, UI, tests
4. **Phase 3** — Polish component library (browse, search, empty states, design-system)
5. **Phase 4** — Polish templates (browse, preview, empty states, design-system)
6. **Phase 5** — Rebuild Excel export as industry-standard bid/BOQ workbook
7. **Phase 6** — QA, smoke tests, manual workflow testing, deployment prep
8. **Phase 7** — Launch candidate freeze, owner sign-off

## Final Launch Gate Checklist

- [ ] All validation gate commands pass: `bun install`, `type-check`, `lint`, `lint:design-system`, `test`, `test:dom`, `build`
- [ ] Ask Flip not visible on any workshop page
- [ ] AI API routes return 404 or feature-flag-gated disabled response
- [ ] Component unlink works: linked → project-specific, edits never mutate library
- [ ] Component library browse/search/empty-states polished
- [ ] Templates browse/preview/insert polished
- [ ] Excel export produces professional bid/BOQ workbook with formulas, sections, summary
- [ ] Export handles project-specific/unlinked row values
- [ ] Privacy/Terms pages ready (or accurate pending-review status)
- [ ] Auth works on deployed environment (Google OAuth + magic link)
- [ ] RLS verified on all user-data tables
- [ ] Supabase migrations current and verified on production
- [ ] Manual QA smoke test of complete workflow: login → create project → create estimate → browse library → insert component → unlink → edit → export → open in Excel
- [ ] Rollback plan documented
- [ ] Owner sign-off
