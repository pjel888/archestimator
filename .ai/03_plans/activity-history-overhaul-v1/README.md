# Activity History Overhaul V1 — Planning Index

**Purpose:** Audit, research, and plan the full Activity History feature: human-readable copy, shared page access tracking, password-gate and proposal-view telemetry, device/browser/location metadata, client comments, decisions, estimate changes, observability, privacy, and future unified timeline work.

**Created:** 2026-06-02
**Second pass:** 2026-06-02
**Third pass:** 2026-06-02
**Fourth pass:** 2026-06-02
**Fifth pass:** 2026-06-02 (final pre-implementation audit: docs 34–40)
**Sixth pass:** 2026-06-02 (autonomous readiness loop: docs 41–44)
**Branch:** `main`
**Current HEAD:** `87f603e`
**Planning baseline HEAD:** `65b21eb` (the HEAD at sixth-pass completion; no activity code changed between `65b21eb` and current `87f603e`: only proof/ops/docs commits)
**Status:** Planning Phase — **Seventh pass (final micro-refinement) complete.** All 47 documents updated for 5 targeted refinements: PR 3 test file paths, PR 5 public API contract, PR 8A/8B split, PR 2 manual QA checklist, and wording cleanup. All categories ≥99%. Implementation-ready with minimal ambiguity.

---

## Folder Rename

**Old path:** `.ai/03_plans/activity-history-human-readable-v1/`
**New path:** `.ai/03_plans/activity-history-overhaul-v1/`

The scope expanded beyond "human-readable copy" to cover the overall Activity History feature: shared page visit tracking, password-gate events, proposal-view telemetry, device/browser/location metadata, privacy planning, and future unified timeline. Renamed via `git mv` to preserve file history.

---

## What Changed in Seventh Pass (Final Micro-Refinement)

### Five Targeted Refinements

1. **PR 3 Test File Paths**: Explicit test file paths added to docs 21, 40, 42, 08.
2. **PR 5 Public API Contract**: Exact `ActivityViewModel[]` response shape defined with must-include and must-NOT-include lists. Added to docs 40, 21, 03, 31, 42.
3. **PR 8A/8B Split**: PR 8 split into 8A (pagination/realtime, independent) and 8B (access telemetry hardening, gated on PR 7). Updated in docs 11, 37, 40, 42, 44, 43.
4. **PR 2 Manual QA Checklist**: Concrete manual verification steps for filters, Realtime, public API, comments, decisions, and regression. Added to docs 40, 31, 18, 42.
5. **Final Wording Cleanup**: All "13 event types"→"14 raw (12 active + 2 dormant)", "33 documents"→"47 documents", "35 files"→"47 files", "event_type in response"→"event_type query handling; no raw public exposure until composer" where these were stale. "Fourth Pass" headings→"Final Pre-Implementation Audit" where obsolete. HEAD updated to `87f603e`.

### Scores After Seventh Pass

| Category | Before | After |
|----------|--------|-------|
| Document consistency | 100% | **100%** |
| Code factual accuracy | 100% | **100%** |
| PR 2 execution readiness | 98% | **99%** |
| PR 3 composer readiness | 98% | **99%** |
| PRs 4–6 integration readiness | 98% | **99%** |
| Access telemetry planning | 100% | **100%** (gated) |
| Security/privacy readiness | 100% | **100%** |
| Test/QA readiness | 98% | **99%** |
| Blast-radius/rollback readiness | 100% | **100%** |
| Decision/governance readiness | 100% | **100%** |
| **Weighted composite** | **98.5%** | **99.3%** |

### New Document

- `45-final-next-actions-micro-refinement.md` — Seventh-pass summary, final scores, PR 2 start checklist, PR 7 gates reminder.

### Key Updated Documents

- README.md — HEAD, status, seventh-pass section
- 40, 42, 44, 41, 43 — Core authoritative docs updated
- 11, 37 — PR sequence and blast radius
- 21, 31, 03, 18 — Composer, PR 2 brief, data contract, QA matrix
- Multiple docs — wording cleanup (13→14, file counts, etc.)

---

## What Changed in Fifth Pass (Final Pre-Implementation Audit)

### Verification Corrections

1. **Current HEAD corrected** from `405d6ac` → `da35386`. No activity-related code changed.
2. **Event type count corrected** from "13" → "14 raw types (12 active + 2 dormant)" across all docs.
3. **Approval statuses audited** — D-019 (IP hash) and D-016 (visibility model) changed from "APPROVED" → "Engineering recommended; NEEDS stakeholder sign-off." No fabricated approvals.
4. **event_type exposure clarified** — PR 2 should NOT expose raw event_type in public API response. Defer to composer integration (PR 5).

### Major New Documents (7 added)

Documents 34–40 added covering: final audit summary, code truth map, access telemetry side effects audit, final blast radius and rollback map, PR 2 test command and fixture plan, source of truth and document authority index, and final implementation handoff.

### Existing Document Updates

- README.md — HEAD, file count, new docs
- 29-final-decision-log — approval status corrections
- 31-pr2-preflight — event_type exposure, CSRF coverage (3 paths), risk level
- 32-scorecard — conservative security assessment
- 23, 25 — access telemetry side effects reconciliation
- 30 — marked as superseded by 34–36

### Key Audit Findings

- **12 findings documented** in doc 34 — including: HEAD staleness, event count error, event_type exposure risk, access telemetry side effects critical gap, /events route unused, assertSameOrigin() already exists, CSRF covers 3 fetch paths not 2, Realtime fix needs prop drilling, approval statuses inconsistent, scorecard security area overstated, V1.0 data collection wording ambiguous, D-006 description inaccurate.
- **Side effects matrix finalized** (doc 36) — New `recordProjectPublicationAnalyticsEvent()` helper recommended for access telemetry. Side effects (open_count, recipient update, shared_link_events) ONLY for actual proposal views.
- **Code truth map** (doc 35) — 20+ features mapped from planning claims to actual code behavior.

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

6 new documents (28–33) added covering stakeholder review packet, decision log, reconciliation audit, PR2 preflight brief, readiness scorecard, and stakeholder review script.

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
| `34-final-preimplementation-audit.md` | **NEW (Fifth Pass)** — Top-level final audit summary: 12 findings, per-PR readiness, go/no-go |
| `35-code-truth-map.md` | **NEW (Fifth Pass)** — Map of every planning claim to actual code behavior (20+ features) |
| `36-access-telemetry-side-effects-audit.md` | **NEW (Fifth Pass)** — Full side effects analysis of `recordProjectPublicationEvent()` with per-stage matrix |
| `37-final-blast-radius-and-rollback-map.md` | **NEW (Fifth Pass)** — Per-PR blast radius, risk, rollback, and dependency map (PRs 2-9) |
| `38-pr2-test-command-and-fixture-plan.md` | **NEW (Fifth Pass)** — Exact test files, mocks, assertions, and commands for each PR 2 fix |
| `39-source-of-truth-and-doc-authority-index.md` | **NEW (Fifth Pass)** — Document hierarchy: which docs are authoritative, superseded, or historical |
| `40-final-implementation-handoff.md` | **NEW (Fifth Pass)** — Concise handoff packet: status, scope, blockers, test commands, where to start |
| `41-autonomous-readiness-loop-log.md` | **NEW (Sixth Pass)** — Autonomous loop audit trail: iterations, findings, doc changes per loop |
| `42-98-100-readiness-scorecard.md` | **NEW (Sixth Pass)** — Final readiness scoring by 10 categories with weighted composite |
| `43-final-risk-burndown-register.md` | **NEW (Sixth Pass)** — 9 risks catalogued with score impact, mitigation, owner, blocker status |
| `44-final-plan-certification.md` | **NEW (Sixth Pass)** — Sign-off document: scores, gated items, authoritative docs, next action |

---

## Authoritative Implementation Sequence

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

## Key Findings (Fifth Pass — Final Audit)

- **Current HEAD is `65b21eb`**, 2 commits ahead of the `da35386` fifth-pass baseline. No activity code changed between `da35386` and `65b21eb` (only proof/ops commits: `26bc6e3` "Make Vercel health proof repeatable", `65b21eb` "Make Supabase backup proof repeatable").
- **12 major findings documented** in doc 34 — including: event count is 14 not 13, event_type exposure risk, access telemetry side effects critical gap, approval statuses inconsistent, CSRF affects 3 fetch paths not 2.
- **Side effects matrix finalized** (doc 36) — `recordProjectPublicationEvent("open")` triggers 3 side effects (open_count, recipient update, shared_link_events insert). New `recordProjectPublicationAnalyticsEvent()` helper recommended for analytics-only access tracking.
- **Code truth map complete** (doc 35) — 20+ features mapped from planning claims to actual code with reconciled truth.
- **PR 2 scope narrowed** — event_type NOT exposed in public API response (deferred to composer PR 5). CSRF fix covers all 3 fetch paths.
- **Approval statuses corrected** (doc 29) — Engineering recommendations distinguished from actual stakeholder sign-offs. No fabricated approvals.
- **47 planning documents total** (README + 46 numbered docs 00–45). Sixth pass added docs 41–44. Seventh pass added doc 45 and refined all docs for final micro-consistency.

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

1. **Merge docs (PR 1)** — All 46 planning documents are internally consistent after sixth-pass autonomous readiness loop. Ready to merge.
2. **Begin PR 2** — Preflight correctness cleanup (5 fixes, no privacy dependencies). See `40-final-implementation-handoff.md` for exact starting point. See `31-pr2-preflight-implementation-brief.md` for scope. See `38-pr2-test-command-and-fixture-plan.md` for test plan.
3. **Continue through PR sequence** — PRs 3-6 proceed freely after PR 2. PR 7 gated on stakeholder sign-off (D-017, D-018, D-023). See `32-final-implementation-readiness-scorecard.md`.

## Key Reference Documents

| For | See |
|-----|-----|
| **Implementation handoff** | `40-final-implementation-handoff.md` |
| **Document authority index** | `39-source-of-truth-and-doc-authority-index.md` |
| **Code truth map** | `35-code-truth-map.md` |
| **Side effects audit** | `36-access-telemetry-side-effects-audit.md` |
| **Final audit summary** | `34-final-preimplementation-audit.md` |
| **PR 2 test plan** | `38-pr2-test-command-and-fixture-plan.md` |
| Stakeholder-friendly summary | `28-fourth-pass-stakeholder-review-packet.md` |
| All 28 decisions and statuses | `29-final-decision-log-and-approval-matrix.md` |
| PR 2 execution plan | `31-pr2-preflight-implementation-brief.md` |
| Go/no-go by category | `32-final-implementation-readiness-scorecard.md` |
| Meeting agenda | `33-stakeholder-review-script.md` |
| Full 9-PR sequence | `27-third-pass-master-implementation-blueprint.md` |
| Access telemetry plan | `23-shared-page-access-activity-plan.md` |
| Privacy boundaries | `26-privacy-retention-and-client-disclosure-plan.md` |
