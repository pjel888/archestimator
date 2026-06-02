# 40 — Final Implementation Handoff

**Date:** 2026-06-02
**Status:** Fifth pass — ready for implementation
**Audience:** Engineer/AI implementing PR 2 and subsequent PRs

---

## Current Status

| Item | Status |
|------|--------|
| Planning phase | ✅ Complete (5 audit passes) |
| Docs internally consistent | ✅ Yes (after this pass) |
| Activity code unchanged since planning | ✅ Yes (HEAD `da35386` = planning commit `5a0481d` + 1 unrelated commit) |
| Folder file count | 35 files (34 numbered docs + README) → 42 files (adding 34-40) |

---

## What Is Approved (Can Proceed)

| PR | Status | What it does |
|----|--------|-------------|
| PR 1 | ✅ **GO** | Merge these planning docs |
| PR 2 | ✅ **GO** | Preflight bug fixes (5 fixes, no privacy impact) |
| PR 3 | ✅ **GO** | Activity Composer module (pure copy, no DB changes) |
| PR 4 | ✅ **GO** | Estimate Activity UI integration (composer consumer) |
| PR 5 | ✅ **GO** | Shared-link Activity API integration (composer consumer) |
| PR 6 | ✅ **GO** | Recipient actor resolution + comments/decisions copy |
| PR 8 | ✅ **GO** (after PR 7) | Realtime/pagination hardening |
| PR 9 | ✅ **GO** (after PR 8) | UI polish, accessibility, manual QA |

---

## What Is Blocked

| PR | Blocker | Resolution |
|----|---------|-----------|
| PR 7 (access telemetry) | 🔴 Product + Legal sign-off needed | D-017 (device in UI → Product), D-018 (location → Legal), D-023 (disclosure → Legal) |

---

## PR 2 — Exact Scope

### Fix 1: row_inserted Filter
- **File:** `src/components/workshop/EstimateSheetContent.tsx`
- **Change:** Replace `{ value: "row_inserted", label: "Inserted rows" }` with separate filters for `row_added` and `row_blank_added`
- **Tests:** `tests/vitest/estimate-sheet-version-control-ui.test.tsx`

### Fix 2: Realtime Filter
- **Files:** `src/components/share/SharedLinkActivityFeed.tsx`, `src/components/workshop/ProjectPublicationHeader.tsx`
- **Change:** Add `publicationId` prop, pass from header, use in Realtime filter for all 3 tables
- **Tests:** `tests/vitest/project-publication-activity.test.tsx`

### Fix 3: event_type in Public API
- **File:** `src/app/api/share/[token]/activity/route.ts`
- **Change:** Select `event_type` in DB query (already done). Do NOT expose in public JSON response yet. Add TODO for PR 5 integration.
- **Tests:** `tests/vitest/project-publication-activity.test.tsx`

### Fix 4: GET /activity CSRF
- **Files:** `src/app/api/share/[token]/activity/route.ts`, `src/lib/publication/security.ts`
- **Change:** Replace `assertSameOriginPublicPost()` with `assertSameOrigin()`. Extract existing function from `session/route.ts` to `security.ts`.
- **Tests:** `tests/vitest/project-publication-activity.test.tsx`, `tests/vitest/project-publication-security.test.ts`

### Fix 5: Comments/Decisions CSRF
- **Files:** `src/components/share/SharePageComments.tsx` (2 paths), `src/components/share/SharePageDecision.tsx` (1 path)
- **Change:** Replace hardcoded `"client-post"` with random token + cookie + matching header. Create shared utility `createPublicationCsrfHeaders()`.
- **Tests:** `tests/vitest/project-publication-comments.test.tsx`, `tests/vitest/project-publication-decision.test.tsx`

### PR 2 Out of Scope
- ❌ `/events` route — excluded, legacy/unused
- ❌ Access telemetry — PR 7
- ❌ Composer module — PR 3
- ❌ Any new features
- ❌ Any migrations

---

## PR 3 — Exact Scope

- Create `src/lib/activity/` module
- Implement `ActivityComposer` with `composeActivityViewModels()` function
- Cover all 14 estimate event types (12 active + 2 dormant for future use)
- Cover shared-link comments, decisions, events
- Pure functions, no DB access
- ~100 unit tests

---

## PR 7 — Access Telemetry Blockers

**Must NOT start PR 7 until these are resolved:**

| Decision | Topic | Approver | Status |
|----------|-------|----------|--------|
| D-017 | Device/browser in owner UI (audit details only) | Product | ☐ Pending |
| D-018 | Location granularity (country-only recommended) | Legal | ☐ Pending |
| D-023 | In-product disclosure language | Legal | ☐ Pending |

When approved:
- Implement `recordProjectPublicationAnalyticsEvent()` helper (doc 36)
- Add access stage recording in `share/[token]/page.tsx`
- Follow side effects matrix in doc 36 exactly

---

## Risk Summary

| Risk | PR | Mitigation |
|------|----|-----------|
| CSRF breaks comments/decisions | PR 2 | Test all 3 fetch paths. Test offline queue flush. Keep reference pattern from password form. |
| Realtime regression | PR 2 | Test with and without publicationId prop. Verify filter scoping. |
| GET /activity origin check too strict | PR 2 | Allow absent Origin. Only reject mismatched Origin. Test both cases. |
| Composer event type count off | PR 3 | Verify 14 raw types. Test all. |
| Access telemetry side effects | PR 7 | Follow doc 36 matrix. Use new helper for analytics-only events. |

---

## Test Commands

```bash
# Before starting any PR
bun run validate

# PR 2 — run after each fix
npx vitest run tests/vitest/estimate-sheet-version-control-ui.test.tsx
npx vitest run tests/vitest/project-publication-activity.test.tsx
npx vitest run tests/vitest/project-publication-comments.test.tsx
npx vitest run tests/vitest/project-publication-decision.test.tsx
npx vitest run tests/vitest/project-publication-security.test.ts

# Full validation after all fixes
bun run validate
bun run build
```

---

## Rollback Notes

- Each PR 2 fix is independently revertible
- No data migrations in any PR 2-6 fix
- PR 7 access telemetry can be reverted by removing analytics helper calls from page.tsx
- Composer module (PR 3) can be deleted with zero data impact

---

## Where to Start

1. **Read these first:**
   - `39-source-of-truth-and-doc-authority-index.md` — know which docs are authoritative
   - `35-code-truth-map.md` — verify code behavior before editing
   - `38-pr2-test-command-and-fixture-plan.md` — test plan

2. **Then read for PR 2 execution:**
   - `31-pr2-preflight-implementation-brief.md` — exact scope of 5 fixes

3. **Recommended fix order (safest first):**
   - Fix 1 (row_inserted filter) — safest, UI-only
   - Fix 3 (event_type select) — safest, unused route
   - Fix 2 (Realtime filter) — safe, owner-only
   - Fix 4 (GET /activity CSRF) — extract assertSameOrigin first, then apply
   - Fix 5 (Comments/Decisions CSRF) — most impactful, test thoroughly

4. **After PR 2 merges:**
   - PR 3 (composer) can begin immediately
   - PRs 4-6 after PR 3

---

## Key Reference Documents

| For | See |
|-----|-----|
| Current audit summary | `34-final-preimplementation-audit.md` |
| Code truth | `35-code-truth-map.md` |
| Side effects audit | `36-access-telemetry-side-effects-audit.md` |
| Blast radius | `37-final-blast-radius-and-rollback-map.md` |
| Test plan | `38-pr2-test-command-and-fixture-plan.md` |
| Doc hierarchy | `39-source-of-truth-and-doc-authority-index.md` |
| Decision log | `29-final-decision-log-and-approval-matrix.md` |
| PR sequence | `11-pr-sequencing-plan.md` |
| PR 2 brief | `31-pr2-preflight-implementation-brief.md` |
| Readiness scorecard | `32-final-implementation-readiness-scorecard.md` |
| Composer spec | `21-activity-composer-spec.md` |
| Event taxonomy | `16-event-taxonomy-and-lifecycle-map.md` |
