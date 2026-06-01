# 11 — Implementation Phases

**Date:** 2026-06-01

## Phase 0 — Audit & Validation Baseline

**Goal:** Establish clean validation baseline. Record all test results, lint output, build status. Create the planning documents (this folder).

**Tasks:**
- Run `bun install --frozen-lockfile` — record result
- Run `bun run type-check` — record result
- Run `bun run lint` — record result
- Run `bun run lint:design-system` — record result
- Run `bun run test` — record result
- Run `bun run test:dom` — record result, investigate failures
- Run `bun run build` — record result
- Create `.ai/03_plans/mvp-launch-readiness-2026-06-01/` and all plan documents

**Files:** `.ai/03_plans/mvp-launch-readiness-2026-06-01/*.md`

**Commands:**
```bash
bun install --frozen-lockfile
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run build
```

**Acceptance criteria:**
- All validation gates pass (or failures documented)
- All 13 planning documents created
- Owner approval to proceed to Phase 1

**Risks:** None — read-only phase

**Stop/go gate:** Owner must approve the full plan before implementation begins.

---

## Phase 1 — Defer AI / Harden MVP Navigation

**Goal:** Hide all AI surfaces. Ask Flip must not appear on any workshop page. AI API routes must return disabled responses.

**Tasks:**
1. Add `NEXT_PUBLIC_ASK_FLIP_ENABLED` env variable (default `false`)
2. Wrap `<AskFlipFooterAssistant />` in conditional render in `WorkshopPageShell.tsx`
3. Add `AI_ASK_ENABLED` env gate to `/api/ai/ask/route.ts`
4. Add `AI_PACKAGE_BUILDER_ENABLED` env gate to `/api/ai/package-builder/route.ts`
5. Update `.env.example` with new variables
6. Write Vitest tests: button hidden when flag off, routes return disabled when flag off
7. Write Vitest tests: button visible when flag on (keep existing tests passing)

**Files:**
- `src/components/workshop/WorkshopPageShell.tsx` — add feature flag conditional
- `src/app/api/ai/ask/route.ts` — add env gate
- `src/app/api/ai/package-builder/route.ts` — add env gate
- `.env.example` — add new variables
- `tests/vitest/estimate-copilot-floating-button.test.tsx` — update/add tests
- `tests/vitest/ai-routes-disabled.test.tsx` — new route tests

**Commands:**
```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom
bun run build
```

**Acceptance criteria:**
- Ask Flip button not visible on any workshop page when `NEXT_PUBLIC_ASK_FLIP_ENABLED=false`
- `/api/ai/ask` returns 404/disabled when `AI_ASK_ENABLED!==true`
- `/api/ai/package-builder` returns 404/disabled when `AI_PACKAGE_BUILDER_ENABLED!==true`
- All existing tests pass (AI code preserved)
- Design-system lint passes
- No new TypeScript errors
- Build succeeds

**Risks:** R1 — breaking existing AI tests. Mitigation: don't delete AI code, just gate routes.

**Stop/go gate:** All acceptance criteria met. Visual inspection: no Ask Flip button on any page.

---

## Phase 2 — Project-Specific Component Unlink

**Goal:** Users can unlink library components, making them project-specific. Detached rows are editable without affecting library. Badges and history events work.

**Tasks:**
1. Create migration: `unlink_estimate_row_item_from_library` RPC + `row_unlinked_from_library` event type
2. Apply to linked Supabase, verify, repair migration history
3. Add server action: `unlinkEstimateRowItem`
4. Add server action: `updateProjectSpecificRowComponent`
5. Add client hook: `useUnlinkRowMutation`
6. Add UI badges (Linked to library, Linked/edited, Project-specific)
7. Add "Make project-specific" action to row context menu
8. Add confirmation dialog
9. Make Row Inspector Component tab editable for detached rows
10. Write comprehensive test suite

**Files:**
- `supabase/migrations/XXXXXX_unlink_estimate_row_item.sql` — new
- `src/lib/estimates/actions.ts` — add unlink + project-specific edit actions
- `src/hooks/use-estimate-row-mutations.ts` — add unlink mutation
- `src/components/workshop/EstimateSheetContent.tsx` — add badges, action, inspector edits
- `src/lib/supabase/types.ts` — update types
- `tests/vitest/unlink-estimate-row.test.tsx` — new test file
- `tests/vitest/estimate-sheet-row-mutations.test.tsx` — add tests

**Impact-analysis:** Run before editing `EstimateSheetContent`, `updateEstimateRowItem`, `estimate_row_items`.

**Commands:**
```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom
bun run build
```

**Acceptance criteria:** All items from doc 07 acceptance criteria checklist.

**Risks:** R3 — library data corruption. Mitigation: RPC guards, never mutate cost_library_items from row edit path, full test coverage.

**Stop/go gate:** All unit tests pass. Manual smoke: insert component → unlink → edit → verify library unchanged → export.

---

## Phase 3 — Component Library Polish

**Goal:** Library is professional and usable. Search, empty states, loading states, design-system compliance.

**Tasks:**
1. Add search input to library page (client-side filter)
2. Add empty states for all tree views and center sheet
3. Add loading skeletons
4. Improve component row display (pricing date, lifecycle badge)
5. Design-system visual audit
6. Seed data cleanup (names, taxonomy, thumbnails)
7. Lazy-load component thumbnails

**Files:**
- `src/components/workshop/LibraryPageClient.tsx`
- `src/components/ui/search-input.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/skeleton.tsx`

**Impact-analysis:** `LibraryPageClient`, `getCurrentWorkspaceComponentRowsLibrary`

**Commands:**
```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom
bun run build
```

**Acceptance criteria:** All items from doc 05 acceptance criteria checklist.

**Risks:** R7 — design-system regressions. Mitigation: lint gate, visual audit checklist.

**Stop/go gate:** All acceptance criteria met. Library looks professional. Design-system lint passes.

---

## Phase 4 — Template Polish

**Goal:** Templates are browsable, previewable, insertable, with professional UX.

**Tasks:**
1. Add template preview / detail view (modal or expandable card)
2. Add empty and error states
3. Improve insertion feedback (toast)
4. Move seed templates to Supabase migration
5. Design-system visual audit

**Files:**
- `src/components/workshop/TemplatesPageClient.tsx`
- `src/components/workshop/EstimateSheetContent.tsx` — insertion feedback
- `src/lib/component-library/estimate-templates.ts` — keep as fallback
- New migration for seed templates

**Impact-analysis:** `TemplatesPageClient`, `insertEstimateTemplateIntoEstimate`

**Commands:**
```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom
bun run build
```

**Acceptance criteria:** All items from doc 06 acceptance criteria checklist.

**Stop/go gate:** All acceptance criteria met. Templates have preview, empty states, insertion feedback.

---

## Phase 5 — Industry Excel Export

**Goal:** Export produces professional bid/BOQ workbook matching industry standards.

**Tasks:**
1. Define new types for bid form structure (sections, scope status)
2. Rebuild `build-proposal-export-model.ts` for bid form structure
3. Rebuild `create-proposal-workbook.ts` for bid form layout, formulas, styling
4. Add scope status support (store in `source_snapshot.scopeStatus`)
5. Add header block, general notes, summary, legal blocks
6. Implement formula-driven COST TOTAL, LINE TOTAL, subtotals, grand total
7. Implement INCLUDED/EXCLUDED/BY OTHERS/OSM/OFCI/OSCI handling
8. Add professional styling (fonts, borders, number formats, print layout)
9. Write comprehensive test suite
10. Manual QA in Excel, Numbers, LibreOffice

**Files:**
- `src/lib/proposal-export/types.ts` — new types
- `src/lib/proposal-export/build-proposal-export-model.ts` — major rewrite
- `src/lib/proposal-export/create-proposal-workbook.ts` — major rewrite
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` — minor
- `tests/vitest/export-bid-form.test.tsx` — new test file

**Impact-analysis:** `buildProposalExportModel`, `createProposalWorkbook`, `ProposalExportPreviewDialog`

**Commands:**
```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom
bun run build
```

**Acceptance criteria:** All items from doc 08 acceptance criteria checklist.

**Risks:** R1 — export looks unprofessional. Mitigation: complete rebuild, manual QA in 3+ apps.

**Stop/go gate:** All acceptance criteria met. Workbook opens cleanly in 3 apps. Formulas calculate correctly. Manual QA pass.

---

## Phase 6 — QA / Deployment Readiness

**Goal:** Full validation, smoke testing, deployment prep, final fixes.

**Tasks:**
1. Run full validation pipeline: `install`, `type-check`, `lint`, `lint:design-system`, `test`, `test:dom`, `build`
2. Fix or document any failures
3. Manual QA smoke test: full workflow from login to export
4. Investigate and fix 2 pre-existing Vitest failures (or document + skip)
5. Verify RLS on production Supabase
6. Verify all 48+ migrations applied to production
7. Test auth on production (Google OAuth, magic link)
8. Test deployment to Vercel (staging first)
9. Set production env variables
10. Configure custom domain / SSL
11. Test invite entry feature flag behavior
12. Test shared link works on production
13. Legal page review (Privacy, Terms)
14. Data backup configured

**Commands:**
```bash
bun run validate
bun run build
bun run test:e2e  # non-mutating specs
```

**Acceptance criteria:** All P0 and P1 gates from doc 09 pass.

**Stop/go gate:** All P0 gates pass. P1 gates pass or documented as known-debt. Owner sign-off obtained.

---

## Phase 7 — Launch Candidate Freeze

**Goal:** Freeze code, final verification, deploy.

**Tasks:**
1. Tag release commit
2. Final validation pipeline run (clean)
3. Deploy to Vercel production
4. Verify production deployment
5. Smoke test on production
6. Monitor for errors (first 24 hours)
7. Rollback plan ready

**Commands:**
```bash
bun run validate
bun run build
bun run test:e2e
```

**Acceptance criteria:**
- Production deploy successful
- All smoke tests pass on production
- No critical errors in first 24 hours
- Rollback plan documented and tested

**Stop/go gate:** Final owner sign-off on production deployment.

---

## Phase Dependencies

```
Phase 0 (Audit) ──────────────────────────┐
                                           │
Phase 1 (Defer AI) ────────────────────────┤
                                           │
Phase 2 (Unlink) ──┐                      │
                   │                      │
Phase 3 (Library) ─┤ (parallel)          │
                   │                      │
Phase 4 (Templates)┘                      │
                   │                      │
Phase 5 (Export) ──┤ (can start after Phase 2 for detached row handling)
                   │                      │
Phase 6 (QA) ──────┴──────────────────────┤
                                           │
Phase 7 (Freeze) ─────────────────────────┘
```

- Phase 1 and 2 can be done in parallel
- Phase 3 and 4 can be done in parallel
- Phase 5 depends on Phase 2 (needs detached row values)
- Phase 6 depends on all Phases 1-5
- Phase 7 is the final freeze
