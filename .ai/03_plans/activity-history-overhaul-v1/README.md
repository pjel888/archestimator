# Activity History Overhaul V1 — Planning Index

**Purpose:** Audit, research, and plan the full Activity History feature: human-readable copy, shared page access tracking, password-gate and proposal-view telemetry, device/browser/location metadata, client comments, decisions, estimate changes, observability, privacy, and future unified timeline work.

**Created:** 2026-06-02
**Second pass:** 2026-06-02
**Third pass:** 2026-06-02
**Branch:** `main`
**Current HEAD:** `d78686f` (`Refresh current-head launch validation proof`)
**Second-pass claimed HEAD:** `97c7d60` (corrected in third pass — current HEAD is `d78686f`)
**Status:** Planning Phase — Third pass complete (documentation, verification, scope expansion. No implementation.)

---

## Folder Rename

**Old path:** `.ai/03_plans/activity-history-human-readable-v1/`
**New path:** `.ai/03_plans/activity-history-overhaul-v1/`

The scope expanded beyond "human-readable copy" to cover the overall Activity History feature: shared page visit tracking, password-gate events, proposal-view telemetry, device/browser/location metadata, privacy planning, and future unified timeline. Renamed via `git mv` to preserve file history.

---

## What Changed in Third Pass

### Verification Corrections

1. **Current HEAD updated** from `97c7d60` → `d78686f`. No activity-related code changed between the two.
2. **Folder renamed** to reflect expanded scope.
3. **All stale commit references** (to `97c7d60`, `638f681`) updated throughout the pack.

### Major New Requirements

1. **Shared page access/visit tracking** — Record page visits, password-gate views, password attempts, proposal views, recipient vs anonymous visits, device/browser/location metadata.
2. **Privacy-safe telemetry** — IP hashes, user-agent hashes, parsed friendly device data, approximate geo from provider headers. No raw IP storage, no browser GPS.
3. **Access event taxonomy** — Distinguished event concepts: page_visited, password_gate_viewed, password_attempted, proposal_viewed, recipient_session_started, anonymous_viewed.
4. **Device/browser/location metadata** — Parsed user-agent into browser/OS/device type. Store `user_agent_hash`. Approximate location from Vercel/Cloudflare headers.
5. **Millisecond timestamp display** — Primary timeline uses human time; audit details show full ISO 8601 with ms.

### New Documents Added

6 new documents (22–27) added covering third-pass verification, shared page access plan, overhaul roadmap, data model/migration plan, privacy/retention, and master implementation blueprint.

### Existing Document Updates

All 21 existing documents updated for:
- Stale commit/folder references
- New access telemetry sections
- Expanded event taxonomy
- Privacy-safe approach documentation
- Updated go/no-go and implementation sequence

---

## Scope of Audit

The following areas were inspected:

- `src/app/share/[token]/page.tsx` — Shared page rendering, password gate, open event recording, recipient session resolution
- `src/app/api/share/[token]/password/route.ts` — Password attempt recording, lockout
- `src/app/api/share/[token]/events/route.ts` — Client-side event recording route (exists, limited usage)
- `src/app/api/share/[token]/session/route.ts` — Recipient session cookie creation
- `src/components/share/SharePageRecipientSessionInitializer.tsx` — Client-side session establishment
- `src/lib/publication/public-repository.ts` — `recordProjectPublicationEvent()`, IP/user-agent hashing
- `src/components/workshop/EstimateSheetContent.tsx` — Activity History modal, filter values, event rendering
- `src/lib/estimates/actions.ts` — Core history read actions
- `src/components/share/SharedLinkActivityFeed.tsx` — Shared link activity, Realtime subscription
- `src/app/api/share/[token]/activity/route.ts` — Public activity API
- `src/app/api/share/[token]/comment/route.ts` — Comment digest trigger
- `src/app/api/share/[token]/decision/route.ts` — Decision digest trigger
- `src/lib/publication/actions.ts` — `loadSharedLinkActivity`, `maybeTriggerSharedLinkActivityDigest`
- Supabase migrations: `estimate_sheet_events`, shared link overhaul, password attempt events, `security_rate_limit_events`

---

## Planning Files

| File | Purpose |
|------|---------|
| `README.md` | This index |
| `00-current-state-audit.md` | Full architecture audit with second-pass and third-pass corrections |
| `01-research-basis.md` | UX research: activity feeds, audit copy, accessibility, privacy |
| `02-activity-copywriting-system.md` | Copy model, field labels, forbidden terms, event-type dictionary |
| `03-data-contract-and-event-model-plan.md` | Target data contract, view model, visibility rules |
| `04-implementation-plan.md` | Phased implementation with preflight and access telemetry |
| `05-blast-radius-analysis.md` | Files touched, risks, mitigations |
| `06-performance-analysis-plan.md` | Query/payload/realtime/pagination/access-telemetry performance |
| `07-security-privacy-readiness.md` | Internal comment leak prevention, PII, access telemetry privacy |
| `08-test-strategy.md` | Full test plan with access telemetry tests |
| `09-ui-ux-plan.md` | Timeline hierarchy, card anatomy, access event cards |
| `10-readiness-checklist.md` | Implementation readiness with updated go/no-go |
| `11-pr-sequencing-plan.md` | Merge-safe PR sequence with access telemetry phase |
| `12-second-pass-verification-audit.md` | Claim-by-claim verification at second-pass HEAD |
| `13-north-star-and-product-principles.md` | Product direction, access telemetry principles |
| `14-user-journeys-and-ux-paths.md` | 22 journey maps including access telemetry journeys |
| `15-information-architecture-and-surface-map.md` | Every surface where activity appears |
| `16-event-taxonomy-and-lifecycle-map.md` | Canonical event taxonomy including access events |
| `17-observability-analytics-and-quality-plan.md` | Runtime monitoring, access telemetry metrics |
| `18-manual-qa-and-acceptance-matrix.md` | Manual QA scripts including access telemetry |
| `19-migration-and-backfill-decision-matrix.md` | Migration needs including access telemetry schema |
| `20-edge-case-and-failure-mode-matrix.md` | 100+ edge cases including access telemetry |
| `21-activity-composer-spec.md` | Implementation-ready composer spec |
| `22-third-pass-verification-audit.md` | **NEW** — Third-pass verification at HEAD `d78686f` |
| `23-shared-page-access-activity-plan.md` | **NEW** — Access telemetry plan (gaps, target state, implementation) |
| `24-activity-history-overhaul-roadmap.md` | **NEW** — V1 → V3 roadmap with versioned scope |
| `25-access-event-data-model-and-migration-plan.md` | **NEW** — Schema options for access telemetry |
| `26-privacy-retention-and-client-disclosure-plan.md` | **NEW** — Safe tracking boundaries, data retention |
| `27-third-pass-master-implementation-blueprint.md` | **NEW** — Consolidated implementation guide |

---

## Recommended Implementation Sequence (Third Pass)

1. **PR 1 — Third-pass planning docs** (docs only, folder rename + 6 new docs + updates)
2. **PR 2 — Preflight correctness cleanup** — Fix `row_inserted` filter, verify Realtime, add regression tests
3. **PR 3 — Activity Composer module + tests** (combined PR: module + passing tests)
4. **PR 4 — Estimate Activity UI integration**
5. **PR 5 — Shared-link Activity API integration**
6. **PR 6 — Recipient actor resolution + comments/decisions copy**
7. **PR 7 — Shared page access telemetry** — Page visits, password-gate, proposal views, device/browser/location
8. **PR 8 — Realtime/pagination hardening**
9. **PR 9 — UI polish, accessibility, manual QA**

See `11-pr-sequencing-plan.md` and `27-third-pass-master-implementation-blueprint.md` for full details.

---

## Key Findings (Third Pass)

- **Current HEAD is `d78686f`**, not `97c7d60` as second-pass docs stated. No activity code changed between the two.
- **Share page open tracking is incomplete** — Open event recorded only AFTER password check passes. Password-gate visits are not recorded.
- **First recipient-token visit records anonymous open** — Server-side `recordProjectPublicationEvent("open")` runs before client-side session initializer, so first click with `?recipient=` logs an anonymous event.
- **Password route records attempts, not gate views** — `password_attempt` events cover success/failure/locked but the gate page being viewed is not recorded.
- **No device/browser/location metadata** — Current `recordProjectPublicationEvent()` stores `ip_hash` and `user_agent_hash` only. No parsed device/browser/OS, no approximate location.
- **`/api/share/[token]/events` route exists** — Accepts `open`, `password_success`, `password_failure`, `download_attempt_blocked`. Used only for `project_publication_events` writes. Not called from `page.tsx`.
- **`metadata_json` is unstructured** — No defined schema for access stage, password gate state, device info.

---

## Open Questions

1. Should old estimates with incomplete snapshots get backfilled copy or graceful fallback? (Recommendation: graceful fallback.)
2. Should the shared-link Activity tab and workshop Activity History modal converge on a single timeline? (Recommendation: Not in V1.)
3. Should `loadSharedLinkActivity` return pre-formatted copy or raw + composed? (Recommendation: raw + client-side compose for consistency.)
4. Should email digests receive the same human-readable copy as in-app? (Recommendation: Yes.)
5. Should access telemetry use `metadata_json` (no migration) or structured columns/new table? (Recommendation: `metadata_json` for V1.1, structured columns deferred to V2.)
6. Should access events be shown to clients? (Recommendation: Only "You viewed the proposal" if recipient-identified. No anonymous visit logs visible to clients.)

---

## Next Action

Review all planning documents including the 6 new third-pass documents. Once approved:
1. Merge PR 1 (these planning docs)
2. Begin PR 2 (preflight correctness cleanup)
3. Proceed to PR 3 (composer module + tests)
