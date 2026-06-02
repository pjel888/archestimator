# 40 — Final Implementation Handoff

**Date:** 2026-06-02
**Status:** Seventh pass — final micro-refinement complete
**Audience:** Engineer/AI implementing PR 2 and subsequent PRs

---

## Current Status

| Item | Status |
|------|--------|
| Planning phase | ✅ Complete (5 audit passes) |
| Docs internally consistent | ✅ Yes (after this pass) |
| Activity code unchanged since planning | ✅ Yes (HEAD `87f603e` = planning baseline `65b21eb` + proof/ops/docs commits; no activity code changed) |
| Folder file count | 47 files (README + 46 numbered docs 00–45) |

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
| PR 8A | ✅ **GO** (after PRs 2-6) | Shared-link pagination + Realtime hardening — NOT gated on PR 7 |
| PR 8B | 🔴 **NO-GO** (gated on PR 7) | Access telemetry hardening — requires PR 7 data |
| PR 9 | ✅ **GO** (after PR 8A or 8B) | UI polish, accessibility, manual QA |

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

## PR 3 — Test File Paths

Create or update these test files for the Activity Composer module:

- `tests/vitest/fixtures/activity-events.ts` — Shared test fixtures (14 estimate + shared-link event mocks)
- `tests/vitest/activity-composer.test.ts` — Composer unit tests (~100 tests: formatting, compose, merge, sort)
- `tests/vitest/activity-copy-regression.test.ts` — Banned-term regression (no raw event types in copy)
- `tests/vitest/activity-security.test.ts` — Security: no raw UUIDs, no internal leaks, no server_action
- `tests/vitest/activity-view-model.test.ts` — Type-shape tests (if separated from composer tests)

Coverage requirements:
- All 14 raw estimate event types (12 active + 2 dormant: `sheet_version_created`, `sheet_restored_as_copy`)
- Shared-link comments (public + internal), decisions (accept/decline/revision), events
- Unknown event fallback ("Activity recorded.")
- Visibility filtering (owner vs client stripping)
- No raw technical copy in any `title`, `summary`, `summary`, `actor.displayName`
- No UUID leaks in client-safe output
- No `server_action`, `row_updated`, `revision_requested`, `linked-overridden` in primary copy

---

## PR 5 — Public Activity API Response Contract

When composer integration lands, `GET /api/share/[token]/activity` must return client-safe composed activity items.

### Response Shape

```json
{
  "activities": "ActivityViewModel[]",
  "hasMore": "boolean",
  "nextCursor?": "string",
  "recipientSession": "boolean"
}
```

### Client-Visible `ActivityViewModel` MUST Include Only

- `id`, `source`, `action`, `visibility`, `occurredAt`
- `title` (required — composed human-readable sentence)
- `summary?`, `body?`, `badges?`
- `target?` — with safe labels only (no raw UUIDs)
- `meta?` — timestamp/location context

### Client-Visible `ActivityViewModel` MUST NOT Include

- `raw` — completely absent for client visibility
- `event_type` — raw technical name never in public JSON
- `metadata_json`
- `actorUserId`
- `recipient_id`
- Raw UUIDs (any field)
- Internal comments (items with `visibility === "internal"`)
- Raw decision enums (`revision_requested`, `accepted`, `declined`)
- Raw event names (`row_updated`, `server_action`)
- IP hash, user-agent hash
- Device/location metadata unless explicitly approved

### PR 2 vs PR 5 Clarification

- **PR 2**: `event_type` is selected in DB query (already done). Do NOT expose in public JSON response. Add TODO for PR 5.
- **PR 5**: Consume `event_type` server-side, transform into human-readable `title` in `ActivityViewModel[]`.
- Public response must never expose raw technical event names after PR 5.

### Test Expectations for Public API

- Public response has `title` (required field)
- Public response does NOT contain raw `event_type` as a top-level key
- Public response does NOT contain `metadata_json` as a top-level key
- Public response does NOT contain raw UUID patterns
- Public response does NOT include internal comments
- Public decision copy says "requested revisions", NOT `revision_requested`

---

## PR 8A / 8B Split Decision

If PR 7 access telemetry is delayed by Product/Legal approval, split PR 8:

### PR 8A — Shared-Link Pagination + Realtime Hardening
Can proceed without PR 7 if PRs 2–6 are complete.

**Scope:**
- Query-level cursor pagination with composite `(created_at, id)` cursor strategy
- Owner shared-link activity pagination
- Public activity route pagination
- Realtime stability not already covered by PR 2
- No new access telemetry data collection
- No privacy-impacting changes

### PR 8B — Access Telemetry Hardening
Only after PR 7 is approved and implemented.

**Scope:**
- Access telemetry pagination/filtering
- Access event dedupe rendering
- Bot filtering in owner/support views
- Access telemetry observability metrics

### Updated Dependency Graph

- PRs 1–6 can proceed ✅
- PR 7 remains gated 🔴
- PR 8A can proceed after PRs 2–6 ✅
- PR 8B waits for PR 7 🔴
- PR 9 final polish may merge non-telemetry polish earlier, but telemetry polish waits for PR 7/8B

---

## PR 2 — Manual QA Checklist

After automated tests pass, manually verify:

### Activity Filter
- [ ] Open Activity History modal → open filter dropdown
- [ ] Confirm there is NO "Inserted rows" / `row_inserted` option
- [ ] Confirm "Added rows" and "Added blank rows" appear
- [ ] Confirm each filter returns matching activity if fixture data exists

### Shared-Link Realtime
- [ ] Open owner Shared Link Activity tab → confirm no console errors
- [ ] Confirm manual Refresh button still works
- [ ] If Realtime is enabled, create activity for the same publication → verify refresh
- [ ] Create activity for a different publication → verify this feed does NOT refresh

### Public Activity GET Route
- [ ] Call `GET /api/share/[token]/activity` same-origin → returns 200 (no CSRF cookie/header required)
- [ ] Call with mismatched Origin header → returns 403
- [ ] Call with expired/revoked token → returns 404

### Comments
- [ ] Open shared link as recipient → submit a comment → comment succeeds
- [ ] Confirm no CSRF error on comment submission
- [ ] Test offline queue path: manually simulate offline → confirm retry includes CSRF header

### Decisions
- [ ] Submit Accept on test shared link → decision succeeds
- [ ] Submit Decline → decision succeeds
- [ ] Submit Request Revision → decision succeeds
- [ ] Submit duplicate decision → returns expected locked/already-submitted state
- [ ] Confirm no CSRF error on any decision path

### Regression
- [ ] Password form still works (existing CSRF pattern unaffected)
- [ ] Owner activity tab still loads
- [ ] No internal comments appear publicly
- [ ] `bun run validate` passes
- [ ] `bun run build` passes

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
   - `45-final-next-actions-micro-refinement.md` — this pass's summary and final go/no-go
   - `39-source-of-truth-and-doc-authority-index.md` — know which docs are authoritative
   - `35-code-truth-map.md` — verify code behavior before editing
   - `38-pr2-test-command-and-fixture-plan.md` — test plan

2. **Then read for PR 2 execution:**
   - `31-pr2-preflight-implementation-brief.md` — exact scope of 5 fixes

3. **Recommended fix order (safest first):**
   - Fix 1 (row_inserted filter) — safest, UI-only
   - Fix 3 (event_type select verification) — safest, just add TODO
   - Fix 2 (Realtime filter) — safe, owner-only
   - Fix 4 (GET /activity CSRF) — extract assertSameOrigin first, then apply
   - Fix 5 (Comments/Decisions CSRF) — most impactful, test thoroughly

4. **After PR 2 merges:**
   - PR 3 (composer) can begin immediately
   - PRs 4-6 after PR 3
   - PR 8A (pagination/realtime) can proceed after PRs 2-6 without waiting for PR 7
   - PR 7 is gated on Product/Legal — PR 8B waits for PR 7

---

## Key Reference Documents

| For | See |
|-----|-----|
| **Seventh-pass summary** | `45-final-next-actions-micro-refinement.md` |
| Current audit summary | `34-final-preimplementation-audit.md` |
| Code truth | `35-code-truth-map.md` |
| Side effects audit | `36-access-telemetry-side-effects-audit.md` |
| Blast radius | `37-final-blast-radius-and-rollback-map.md` |
| Test plan | `38-pr2-test-command-and-fixture-plan.md` |
| Doc hierarchy | `39-source-of-truth-and-doc-authority-index.md` |
| Decision log | `29-final-decision-log-and-approval-matrix.md` |
| PR sequence | `11-pr-sequencing-plan.md` |
| PR 2 brief | `31-pr2-preflight-implementation-brief.md` |
| Readiness scorecard | `42-98-100-readiness-scorecard.md` |
| Composer spec | `21-activity-composer-spec.md` |
| Event taxonomy | `16-event-taxonomy-and-lifecycle-map.md` |
