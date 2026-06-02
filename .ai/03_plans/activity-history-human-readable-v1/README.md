# Activity History Human-Readable V1 — Planning Index

**Purpose:** Audit, research, and plan the improvement of the Activity History system to make it human-readable, client-safe, audit-safe, and scalable enough to support estimate edits, client comments, approvals, declines, and revision requests in one coherent timeline.

**Created:** 2026-06-02  
**Second pass:** 2026-06-02  
**Branch:** `main`  
**Current HEAD:** `97c7d60` (`Benchmark proposal workbook export scale`)  
**First-pass claimed commit:** `638f681` (stale — corrected in second pass)  
**Status:** Planning Phase — Second pass complete (no implementation)

---

## What Changed in Second Pass

The second pass re-audited every claim against current code at HEAD `97c7d60`.

### Major Corrections

1. **Shared-link Realtime is broken** — filter uses `publication_id=eq.${""}` (empty string), subscriptions fire on ALL inserts regardless of publication. Not a "strong foundation."
2. **Decision digest already exists** — both comment and decision routes trigger `maybeTriggerSharedLinkActivityDigest()`. First pass incorrectly claimed it was missing.
3. **`row_inserted` filter is a bug** — `ACTIVITY_FILTER_EVENT_TYPES` includes `row_inserted` which is not a valid event type. Actual types are `row_added` and `row_blank_added`.
4. **Public API uses service-role, not RLS** — `createPublicationServiceClient()` uses `SUPABASE_SERVICE_ROLE_KEY`, bypassing RLS. Protection is application-level, not RLS-based.
5. **Shared-link owner pagination is flawed** — cursor filter applied after in-memory merge, not at query level. Deep pagination may miss older events.
6. **Two event tables mapped** — `shared_link_events` (recipient-visible) vs `project_publication_events` (analytics/security). First pass conflated them.
7. **Tests partially exist** — existing tests already protect against some technical copy leakage. Not a complete gap, but a centralized suite is still needed.
8. **"No migration required" is overstated** — true for V1 copy-only work. V2/V3 features (unified timeline, correlation IDs, recipient snapshots) need additive migrations.

### New Documents Added

10 new documents added covering North Star, UX paths, surface map, event taxonomy, observability, manual QA, migration matrix, edge cases, and composer spec.

---

## Scope of Audit

The following areas were inspected:

- `src/components/workshop/EstimateSheetContent.tsx` (Activity History modal, filter values, event rendering)
- `src/lib/estimates/actions.ts` (Core history read actions)
- `src/components/share/SharedLinkActivityFeed.tsx` (Shared link activity, Realtime subscription)
- `src/app/api/share/[token]/activity/route.ts` (Public activity API, response shape)
- `src/app/api/share/[token]/comment/route.ts` (Comment digest trigger)
- `src/app/api/share/[token]/decision/route.ts` (Decision digest trigger)
- `src/lib/publication/actions.ts` (`loadSharedLinkActivity`, `maybeTriggerSharedLinkActivityDigest`)
- `src/lib/publication/public-repository.ts` (`ProjectPublicationEventType`, `createPublicationServiceClient`)
- `src/lib/ai/read-context.ts` (AI context: activity history summaries)
- Supabase migrations: `estimate_sheet_events`, shared link overhaul, password attempt events
- Tests: estimate version control UI/actions/schema, project publication activity/comments/decision/security/schema

---

## Planning Files

| File | Purpose |
|------|---------|
| `README.md` | This index |
| `00-current-state-audit.md` | Full architecture audit with second-pass corrections |
| `01-research-basis.md` | UX research: activity feeds, audit copy, accessibility, privacy |
| `02-activity-copywriting-system.md` | Copy model, field labels, forbidden terms, event-type dictionary |
| `03-data-contract-and-event-model-plan.md` | Target data contract, view model, visibility rules |
| `04-implementation-plan.md` | Phased implementation with Phase 0 preflight |
| `05-blast-radius-analysis.md` | Files touched, risks, mitigations |
| `06-performance-analysis-plan.md` | Query/payload/realtime/pagination performance analysis |
| `07-security-privacy-readiness.md` | Internal comment leak prevention, PII, rate limiting, service-role model |
| `08-test-strategy.md` | Full test plan with merge-safe PR strategy |
| `09-ui-ux-plan.md` | Timeline hierarchy, card anatomy, empty/loading/error states, accessibility |
| `10-readiness-checklist.md` | Implementation readiness checklist with corrected go/no-go |
| `11-pr-sequencing-plan.md` | Merge-safe PR sequence |
| `12-second-pass-verification-audit.md` | **NEW** — Full claim-by-claim verification against current code |
| `13-north-star-and-product-principles.md` | **NEW** — Product direction, success metrics, non-goals |
| `14-user-journeys-and-ux-paths.md` | **NEW** — 15 journey maps with triggers, goals, edge cases |
| `15-information-architecture-and-surface-map.md` | **NEW** — Every surface where activity appears, with data flow diagrams |
| `16-event-taxonomy-and-lifecycle-map.md` | **NEW** — Canonical event taxonomy across all source tables |
| `17-observability-analytics-and-quality-plan.md` | **NEW** — Runtime monitoring, metrics to track, support workflow |
| `18-manual-qa-and-acceptance-matrix.md` | **NEW** — Manual QA scripts, browser/device matrix, acceptance criteria |
| `19-migration-and-backfill-decision-matrix.md` | **NEW** — When migration becomes necessary, tradeoffs, recommendations |
| `20-edge-case-and-failure-mode-matrix.md` | **NEW** — 80+ edge cases with expected behavior and test requirements |
| `21-activity-composer-spec.md` | **NEW** — Implementation-ready spec with types, functions, contracts |

---

## Recommended Implementation Sequence (Revised)

1. **PR 1 — Second-pass planning docs** (docs only, this PR)
2. **PR 2 — Preflight correctness cleanup** — Fix `row_inserted` filter, verify Realtime, add regression tests
3. **PR 3 — Activity Composer module + tests** (combined PR: module + passing tests)
4. **PR 4 — Estimate Activity UI integration**
5. **PR 5 — Shared-link Activity API integration**
6. **PR 6 — Recipient actor resolution + comments/decisions copy**
7. **PR 7 — Realtime/pagination hardening**
8. **PR 8 — UI polish, accessibility, manual QA**

See `11-pr-sequencing-plan.md` for full details.

---

## Key Findings (Executive)

- **Copy is semi-human-readable but inconsistent.** Estimate history uses human labels but shared-link activity renders raw type strings and decision enums.
- **Shared-link Realtime subscription is broken** — filter uses empty string, fires on all inserts.
- **`row_inserted` filter is a bug** — not a valid event type; users will never see results.
- **Decision digest already exists** — both comment and decision trigger it. Focus on improvement, not creation.
- **Public API uses service-role client** — no RLS protection. Sanitization is application-level, not database-level.
- **Shared-link owner pagination is flawed** — cursor applied after in-memory merge, not at query level.
- **No recipient name resolution for decisions** — actor is hardcoded `"recipient"`. Needs batched join.
- **Tests partially exist** — existing tests catch some technical copy leaks but no centralized regression suite.
- **V1 requires no migration** — V2/V3 likely require additive migrations.

---

## Open Questions

1. Should old estimates with incomplete snapshots get backfilled copy or graceful fallback? (Recommendation: graceful fallback.)
2. Should the shared-link Activity tab and workshop Activity History modal converge on a single timeline? (Recommendation: Not in V1.)
3. Should `loadSharedLinkActivity` return pre-formatted copy or raw + composed? (Recommendation: raw + client-side compose for consistency.)
4. Should email digests receive the same human-readable copy as in-app? (Recommendation: Yes.)
5. Should we fix Realtime before composer work or remove Realtime from V1 claims? (Recommendation: Fix as Phase 0 preflight.)

---

## Next Action

Review all planning documents. Once approved:
1. Merge PR 1 (these planning docs)
2. Begin PR 2 (preflight correctness cleanup)
3. Proceed to PR 3 (composer module + tests)
