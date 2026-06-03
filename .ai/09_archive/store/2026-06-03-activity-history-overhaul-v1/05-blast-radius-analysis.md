# 05 — Blast-Radius Analysis

**Date:** 2026-06-02 (second pass: 2026-06-02; third pass: 2026-06-02)

## Scope

This analysis covers all files, components, routes, database tables, tests, and integration surfaces affected by the Activity History Overhaul V1 implementation, including access telemetry.

---

## Files Likely Touched

| File | Phase | Change Type | Risk |
|------|-------|-------------|------|
| `src/lib/activity/activity-view-model.ts` | 1 | **NEW** — core composer module | LOW |
| `src/lib/activity/activity-copy.ts` | 1 | **NEW** — formatter functions | LOW |
| `src/lib/activity/index.ts` | 1 | **NEW** — barrel export | LOW |
| `src/components/workshop/EstimateSheetContent.tsx` | 2 | **MODIFIED** — replace 7+ formatting functions with composer calls | **HIGH** |
| `src/app/api/share/[token]/activity/route.ts` | 3 | **MODIFIED** — return `ActivityViewModel[]` instead of `PublicActivityItem[]` | **MEDIUM** |
| `src/components/share/SharedLinkActivityFeed.tsx` | 3, 4 | **MODIFIED** — replace raw rendering with composer-based rendering | **MEDIUM** |
| `src/lib/publication/actions.ts` | 3 | **MODIFIED** — optionally add composed output, extend digest to decisions | LOW |
| `src/lib/ai/read-context.ts` | — | No change (AI context already has separate formatter) | NONE |
| `src/app/api/ai/ask/handler.ts` | — | No change (uses AI context, not user-facing) | NONE |
| `src/components/workshop/ProjectPublicationHeader.tsx` | 3 | **POTENTIALLY** — if activity dot logic changes | LOW |
| `src/components/workshop/ProjectCard.tsx` | — | No change (receives boolean prop, no copy) | NONE |

---

## Risk Categories

| Risk | Meaning |
|------|---------|
| **CRITICAL** | Could break core user flows, expose data, or corrupt state |
| **HIGH** | Affects a large, complex component; needs careful testing |
| **MEDIUM** | Affects an API route or moderately complex component |
| **LOW** | Additive changes, new files, or minor modifications |

---

## Component Impact

| Component | Risk | Why it matters | Mitigation | Tests |
|-----------|------|---------------|------------|-------|
| `EstimateSheetContent.tsx` — ActivityHistoryModal | **HIGH** | ~3000-line file with complex state, scopes, filters, pagination, grouping. Formatting changes touch 7+ functions | Incremental replacement; one function at a time; keep existing test coverage | `estimate-sheet-version-control-ui.test.tsx` (1220 lines) |
| `EstimateSheetContent.tsx` — AuditEventCard | **HIGH** | Central event display component. Copy changes are user-visible | Test every event type's card output; snapshot tests for layout | `estimate-sheet-version-control-ui.test.tsx` |
| `EstimateSheetContent.tsx` — EventList | MEDIUM | Container for timeline; loading/pagination/grouping logic | Keep existing logic; only change how events are rendered | `estimate-sheet-version-control-ui.test.tsx` |
| `EstimateSheetContent.tsx` — ActivityScopeTree | LOW | Sidebar tree — copy changes in scope labels | No copy changes expected for scope tree | `estimate-sheet-version-control-ui.test.tsx` |
| `EstimateSheetContent.tsx` — ActivityFilterDropdown | LOW | Filter dropdown — no copy changes | No changes expected | `estimate-sheet-version-control-ui.test.tsx` |
| `SharedLinkActivityFeed.tsx` | **MEDIUM** | Public + owner views, Realtime subscription. Changing rendering logic | Keep Realtime logic; change only card rendering | `project-publication-activity.test.tsx` |
| `ProjectPublicationHeader.tsx` | LOW | Contains Activity tab; may need to update ActivityItem type references | Type updates only; no logic changes | `project-publication-header.test.tsx` |
| `ProjectCard.tsx` | LOW | Receives `hasUnseenSharedLinkActivity` boolean — no copy | No change expected | `project-publication-header.test.tsx` (sidebar badge test is placeholder) |
| `AddComponentModal.tsx` | NONE | Component activity tab — no direct connection to estimate history | No change | `workshop-library-consolidation-ui.test.tsx` |

---

## Server Action Impact

| Action | Risk | Why it matters | Mitigation | Tests |
|--------|------|---------------|------------|-------|
| `fetchEstimateSheetVersionControl()` | MEDIUM | Returns `EstimateSheetHistoryEvent[]` — type unchanged. Composer consumes it client-side | No action changes; composition happens downstream | `estimate-sheet-version-control-actions.test.ts` |
| `fetchEstimateActivityRetentionMetrics()` | NONE | Metrics only — no copy | No change | `estimate-sheet-version-control-actions.test.ts` |
| `loadSharedLinkActivity()` | LOW | Returns `ActivityItem[]` — type unchanged. Optionally add composed output | Keep existing return; composer optional enrichment | `project-publication-activity.test.tsx` |
| `triggerOwnerDigestIfAllowed()` | LOW | Extend to cover decisions | Add `kind: "decision"` case; rate-limited already | `project-publication-activity.test.tsx` |

---

## API Route Impact

| Route | Risk | Why it matters | Mitigation | Tests |
|-------|------|---------------|------------|-------|
| `GET /api/share/[token]/activity` | **MEDIUM** | Response shape changes from `PublicActivityItem[]` to `ActivityViewModel[]` | Only consumed by `SharedLinkActivityFeed`; update component simultaneously | `project-publication-activity.test.tsx` |
| `POST /api/share/[token]/comment` | NONE | Insert-only route — no read changes | No change | `project-publication-comments.test.tsx` |
| `POST /api/share/[token]/decision` | NONE | Insert-only route — no read changes | No change | `project-publication-decision.test.tsx` |

---

## Supabase Table/RPC Impact

| Table / RPC | Risk | Why it matters | Mitigation | Tests |
|-------------|------|---------------|------------|-------|
| `estimate_sheet_events` | NONE | **No schema changes.** Composer reads existing columns | No migration needed | `estimate-sheet-version-control-schema.test.ts` |
| `shared_link_comments` | NONE | No schema changes | No migration needed | `project-publication-schema.test.ts` |
| `shared_link_responses` | NONE | No schema changes | No migration needed | `project-publication-schema.test.ts` |
| `shared_link_events` | NONE | No schema changes | No migration needed | `project-publication-schema.test.ts` |
| `get_estimate_activity_retention_metrics` | NONE | No change | No change | `estimate-sheet-version-control-actions.test.ts` |

---

## Test File Impact

| Test File | Risk | Change Type | Coverage Required |
|-----------|------|-------------|-------------------|
| `tests/vitest/estimate-sheet-version-control-ui.test.tsx` | MEDIUM | Add copy assertions; update DOM assertions for new card structure | All existing + new copy tests |
| `tests/vitest/estimate-sheet-version-control-actions.test.ts` | LOW | No action changes; add tests for compose with action output | Existing + compose tests |
| `tests/vitest/project-publication-activity.test.tsx` | MEDIUM | Update API response shape assertions; add copy tests | Existing + new copy tests |
| `tests/vitest/project-publication-header.test.tsx` | LOW | Type updates only | Existing |
| `tests/vitest/project-publication-comments.test.tsx` | LOW | No route changes; no test changes expected | Existing |
| `tests/vitest/project-publication-decision.test.tsx` | LOW | No route changes; add copy assertions for decision render | Existing + copy tests |
| `tests/vitest/activity-composer.test.ts` | **NEW** | New test file for composer functions | Full coverage |
| `tests/vitest/activity-copy-regression.test.ts` | **NEW** | New test file for banned-term regression | Full coverage |
| `tests/vitest/activity-view-model.test.ts` | **NEW** | New test file for type safety | Full coverage |

---

## Public/Shared-Link Surface Impact

| Surface | Risk | Why it matters | Mitigation |
|---------|------|---------------|------------|
| `/share/[token]` page | **MEDIUM** | Decision buttons, decision badge, activity feed rendering | Keep decision buttons unchanged; change only activity feed rendering |
| Share page decision panel | LOW | "Accept"/"Decline"/"Request Revision" button labels — no change | No copy changes to buttons |
| Share page comments | LOW | Comment body always shown as-is | No copy changes to comments |
| Public activity API | **MEDIUM** | Response shape changes | Update only consumer (`SharedLinkActivityFeed`) |

---

## Owner/Admin Surface Impact

| Surface | Risk | Why it matters | Mitigation |
|---------|------|---------------|------------|
| Workshop Activity History modal | **HIGH** | Primary user-facing activity surface | Incremental replacement; preserve existing test coverage |
| Workshop Row Details → Activity tab | MEDIUM | Per-row activity filtered view | Test row-scoped activity rendering |
| Publication modal → Activity tab | MEDIUM | Owner view of shared-link activity | Test owner view rendering with internal comments |
| Workshop sheet header → "Activity" button | LOW | Opens Activity History modal — no copy changes to the button | No change |

---

## Email/Digest Surface Impact

| Surface | Risk | Why it matters | Mitigation |
|---------|------|---------------|------------|
| Owner activity digest email | LOW | Copy improvements and decision support | Add decision digest; improve copy in email body |
| Comment notification email | LOW | Copy improvements | Same human-readable copy as in-app |

---

## Realtime Surface Impact

| Surface | Risk | Why it matters | Mitigation |
|---------|------|---------------|------------|
| Supabase Realtime subscription | LOW | Subscription logic unchanged; refetch triggered on INSERT | Keep subscription; change only what's rendered after refetch |
| New activity indicator | LOW | New feature — banner at top of feed | Additive change; no existing behavior changed |

---

## Accessibility Surface Impact

| Surface | Risk | Why it matters | Mitigation |
|---------|------|---------------|------------|
| Activity feed semantic structure | MEDIUM | New `role="feed"`, `aria-live`, `aria-label` additions | Additive ARIA attributes; test with screen reader |
| Audit card keyboard navigation | MEDIUM | Expand/collapse with Enter/Space | Add keyboard handlers; test with axe-core |
| Status announcements | LOW | `aria-live="polite"` for new activity | Additive; no existing announcement logic to break |

---

## Performance-Sensitive Paths

| Path | Risk | Why it matters | Mitigation |
|------|------|---------------|------------|
| Activity History modal load (first page) | MEDIUM | Composer adds CPU overhead per event | Composition is O(n) where n = page size (typically 20–50) — negligible |
| Public activity API route | LOW | Server-side composition adds latency | Composition is fast (string formatting); test with 100 items |
| Realtime refetch | LOW | Debounce 2s prevents excessive re-composition | Debounce already in Phase 6 plan |

---

## Security/Privacy-Sensitive Paths

| Path | Risk | Why it matters | Mitigation |
|------|------|---------------|------------|
| Public activity API `raw` field | **CRITICAL** | Must never include `raw` in client-visibility responses | Strip `raw` in composer when `visibility === "client"`; test enforcement |
| Public activity API actor label | **MEDIUM** | Must never include raw UUID or email in client view | Anonymize in composer; test enforcement |
| Public activity API internal comments | **CRITICAL** | Must never include `is_internal=true` items in client view | Filter in composer AND in API route (defense in depth); test enforcement |
| Owner activity internal comments | LOW | Must remain visible to owners with "Internal" badge | Keep existing RBAC + composer propagates `visibility: "internal"` |
| Comment body sanitization | MEDIUM | Already sanitized on insert; must ensure display doesn't re-introduce XSS | Use React's default escaping; `whitespace-pre-wrap` is safe |

---

## Summary Risk Matrix

| Area | Risk Level | Items |
|------|-----------|-------|
| Critical | 2 | Raw field leakage prevention, internal comment visibility |
| High | 2 | `EstimateSheetContent.tsx` changes, Activity History modal rendering |
| Medium | 12 | API route changes, `SharedLinkActivityFeed`, test updates, public surface, accessibility, **Realtime filter fix**, **shared-link pagination fix**, **decision digest iteration**, **event filter mismatch fix** |
| Low | 12 | New module files, action enrichments, email digests, Realtime, performance |
| None | 7 | AI context, schema, insert-only routes, unchanged components |

---

## Second-Pass Risk Additions (from `12-second-pass-verification-audit.md`)

| New/Updated Risk | Risk Level | Description |
|-----------------|-----------|-------------|
| Realtime filter is broken | MEDIUM | Filter uses `publication_id=eq.${""}` — subscriptions fire on ALL inserts |
| Shared-link owner pagination flawed | MEDIUM | In-memory merge + cursor filter applied after merge; deep pagination unreliable |
| Public API service-role sanitization | MEDIUM | Service-role bypasses RLS; must ensure application-level sanitization is exhaustive |
| Activity filter event mismatch | MEDIUM | `row_inserted` in filter options but valid types are `row_added`/`row_blank_added` |
| Decision digest already exists | LOW | Plan shifted from "add" to "improve" — lower risk than creating new functionality |
| Recipient actor resolution | MEDIUM | Decisions hardcoded to "recipient" — need batched join to `shared_link_recipients` |
| Public API response contract change | MEDIUM | Changing from `PublicActivityItem[]` to `ActivityViewModel[]` — needs consumer update |
