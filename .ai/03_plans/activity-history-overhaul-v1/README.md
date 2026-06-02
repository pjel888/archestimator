# Activity History Overhaul V1 — Planning Index

**Purpose:** Audit, research, and plan the full Activity History feature: human-readable copy, shared page access tracking, password-gate and proposal-view telemetry, device/browser/location metadata, client comments, decisions, estimate changes, observability, privacy, and future unified timeline work.

**Created:** 2026-06-02
**Second pass:** 2026-06-02
**Third pass:** 2026-06-02
**Fourth pass:** 2026-06-02
**Branch:** `main`
**Current HEAD:** `405d6ac`
**Third-pass claimed HEAD:** `d78686f` (corrected in fourth pass — current HEAD is `405d6ac`. No activity code changed.)
**Status:** Planning Phase — Fourth pass complete (stakeholder review packet, reconciliation audit, decision log, PR2 brief, readiness scorecard, review script. Contradictions resolved. Implementation-ready pending stakeholder sign-off.)

---

## Folder Rename

**Old path:** `.ai/03_plans/activity-history-human-readable-v1/`
**New path:** `.ai/03_plans/activity-history-overhaul-v1/`

The scope expanded beyond "human-readable copy" to cover the overall Activity History feature: shared page visit tracking, password-gate events, proposal-view telemetry, device/browser/location metadata, privacy planning, and future unified timeline. Renamed via `git mv` to preserve file history.

---

## What Changed in Fourth Pass

### Verification Corrections

1. **Current HEAD corrected** from `d78686f` → `405d6ac`. No activity-related code changed.
2. **15 contradictions resolved** — Enum/CHECK changes ARE migrations, CSRF mismatches found in GET /activity route and comments/decisions components, client-facing activity feed confirmed non-existent, server-side cookie feasibility verified. See `30-final-technical-reconciliation-audit.md`.

### Major New Decisions

1. **Access telemetry strategy finalized** — Use existing `event_type` values (`open`, `password_attempt`) with `metadata_json.access_stage` for V1.1. No enum/CHECK migration needed. See `29-final-decision-log-and-approval-matrix.md`.
2. **Three-tier visibility model** — Primary timeline (who/what/when), audit details (device/location), support view (full diagnostics). Location default: country only unless explicitly approved.
3. **PR 7 gated** — Access telemetry implementation requires stakeholder sign-off on 10 product/legal decisions. See `28-fourth-pass-stakeholder-review-packet.md`.
4. **CSRF bugs identified** — GET /activity route broken (POST-only CSRF on GET). Comments/Decisions hardcode CSRF token without cookie. Both fixed in PR 2. See `31-pr2-preflight-implementation-brief.md`.

### New Documents Added

6 new documents (28–33) added covering stakeholder review packet, decision log, reconciliation audit, PR2 preflight brief, readiness scorecard, and stakeholder review script. Total: 33 documents.

### Existing Document Updates

8 documents updated for:
- Corrected HEAD (`405d6ac`)
- Fixed contradictions (no-migration vs enum/CHECK, client feed status, CSRF)
- Aligned PR count (9 PRs) across all docs
- Conservative privacy language (IP hash, location data)
- Updated go/no-go with fourth-pass status

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
| `27-third-pass-master-implementation-blueprint.md` | **NEW** — Consolidated implementation guide (superseded by doc 32 for go/no-go) |
| `28-fourth-pass-stakeholder-review-packet.md` | **NEW** — Non-engineer-readable review packet with approval checklist |
| `29-final-decision-log-and-approval-matrix.md` | **NEW** — Source of truth: 28 decisions with status, rationale, approver |
| `30-final-technical-reconciliation-audit.md` | **NEW** — 15 contradictions resolved against live codebase |
| `31-pr2-preflight-implementation-brief.md` | **NEW** — Execution-ready PR 2 engineering brief (5 fix items) |
| `32-final-implementation-readiness-scorecard.md` | **NEW** — 12-category go/no-go: Green/Yellow/Red with rationale |
| `33-stakeholder-review-script.md` | **NEW** — 30/60-min meeting agendas with stakeholder questions |

---

## Recommended Implementation Sequence (Fourth Pass)

1. **PR 1 — Fourth-pass planning docs** (docs only, 6 new docs + 8 doc updates)
2. **PR 2 — Preflight correctness cleanup** — Fix 5 known bugs (row_inserted filter, Realtime, event_type, CSRF fixes). See `31-pr2-preflight-implementation-brief.md`.
3. **PR 3 — Activity Composer module + tests** (combined PR: module + passing tests)
4. **PR 4 — Estimate Activity UI integration**
5. **PR 5 — Shared-link Activity API integration**
6. **PR 6 — Recipient actor resolution + comments/decisions copy**
7. **PR 7 — Shared page access telemetry** ⚠️ **GATED** — Requires stakeholder sign-off on 10 decisions before proceeding. See `28-fourth-pass-stakeholder-review-packet.md`.
8. **PR 8 — Realtime/pagination hardening**
9. **PR 9 — UI polish, accessibility, manual QA**

PRs 1–6 can proceed without stakeholder approval (no privacy impact). PR 7 is gated. See `29-final-decision-log-and-approval-matrix.md` and `32-final-implementation-readiness-scorecard.md`.

---

## Key Findings (Fourth Pass)

- **Current HEAD is `405d6ac`**, not `d78686f` as third-pass docs stated. No activity code changed.
- **15 contradictions resolved** — Including: enum/CHECK additions ARE migrations, GET /activity CSRF broken, client-facing feed doesn't exist, comments/decisions CSRF broken. See `30-final-technical-reconciliation-audit.md`.
- **Access telemetry strategy finalized** — Use existing `event_type` values + `metadata_json.access_stage`. No migration needed for V1.1.
- **Three-tier visibility model** — Primary timeline (who/what/when), audit details (device/location), support (full diagnostics).
- **PR 2 scope expanded** — Now includes CSRF fixes for GET /activity route and comments/decisions components. See `31-pr2-preflight-implementation-brief.md`.
- **2 latent CSRF bugs found** — Not just planning issues; actual bugs in production code:
  1. `GET /api/share/[token]/activity` calls `assertSameOriginPublicPost()` — POST-only CSRF on GET, always 403 for browser clients.
  2. `SharePageComments.tsx` and `SharePageDecision.tsx` hardcode `"client-post"` CSRF header without setting matching cookie.

### Previous Findings (Third Pass — still accurate)

- **Share page open tracking is incomplete** — Open event recorded only AFTER password check passes. Password-gate visits are not recorded.
- **First recipient-token visit records anonymous open** — Server-side `recordProjectPublicationEvent("open")` runs before client-side session initializer.
- **No device/browser/location metadata** — Current storage: `ip_hash` and `user_agent_hash` only.
- **`metadata_json` is unstructured** — No defined schema for access stage, password gate state, device info.

---

## Open Questions

See `29-final-decision-log-and-approval-matrix.md` for all 28 decisions and their statuses.

### Resolved (Fourth Pass)
1. ✅ Access telemetry storage: `metadata_json` with existing event types (no migration). See D-009.
2. ✅ Access events to clients: Only "You viewed the proposal" if recipient-identified. No full feed. See D-015, D-028.
3. ✅ Event type naming: Use existing `open` + `password_attempt` with `metadata_json.access_stage`. See D-009.
4. ✅ Server-side vs client-side recording: Server-side for access events. See D-013.
5. ✅ Enum/CHECK additions: Deferred to V2. Not needed for V1.1. See D-010.

### Pending Stakeholder Approval
1. 🔴 Location granularity: country-only default vs city. See D-018.
2. 🔴 Device/browser metadata in owner UI: audit details only vs primary timeline. See D-017.
3. 🔴 In-product disclosure: required vs privacy policy only. See D-023.
4. 🔴 Retention policy: define before V2. See D-022.
5. 🔴 Bot/crawler filtering: hide from owner by default. See D-020.

---

## Next Action

1. **Stakeholder review** — Review `28-fourth-pass-stakeholder-review-packet.md` and sign off on 10 pending decisions.
2. **Schedule stakeholder meeting** — Use `33-stakeholder-review-script.md` for meeting agenda.
3. **Once product/legal decisions approved:**
   - Update `29-final-decision-log-and-approval-matrix.md` with approvals.
   - Merge PR 1 (these 33 planning docs).
4. **Begin PR 2** — Preflight correctness cleanup (5 fixes, no privacy dependencies). See `31-pr2-preflight-implementation-brief.md`.
5. **Continue through PR sequence** — PRs 3-6 proceed freely. PR 7 gated on stakeholder sign-off. See `32-final-implementation-readiness-scorecard.md`.

## Key Reference Documents

| For | See |
|-----|-----|
| Stakeholder-friendly summary | `28-fourth-pass-stakeholder-review-packet.md` |
| All 28 decisions and statuses | `29-final-decision-log-and-approval-matrix.md` |
| 15 contradictions resolved | `30-final-technical-reconciliation-audit.md` |
| PR 2 execution plan | `31-pr2-preflight-implementation-brief.md` |
| Go/no-go by category | `32-final-implementation-readiness-scorecard.md` |
| Meeting agenda | `33-stakeholder-review-script.md` |
| Full 9-PR sequence | `27-third-pass-master-implementation-blueprint.md` |
| Access telemetry plan | `23-shared-page-access-activity-plan.md` |
| Privacy boundaries | `26-privacy-retention-and-client-disclosure-plan.md` |
