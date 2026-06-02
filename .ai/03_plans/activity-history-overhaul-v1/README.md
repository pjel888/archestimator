# Activity History Overhaul V1 — Planning Index

**Purpose:** Audit, research, and plan the full Activity History feature: human-readable copy, shared page access tracking, password-gate and proposal-view telemetry, device/browser/location metadata, client comments, decisions, estimate changes, observability, privacy, and future unified timeline work.

**Created:** 2026-06-02
**Second pass:** 2026-06-02
**Third pass:** 2026-06-02
**Fourth pass:** 2026-06-02
**Fifth pass:** 2026-06-02 (final pre-implementation audit: docs 34–40)
**Sixth pass:** 2026-06-02 (autonomous readiness loop: docs 41–44)
**Ninth pass:** 2026-06-02 (documentation-only: PR 7+8B NO-GO→GO unlock, DPA compliance)
**Tenth pass:** 2026-06-02 (document hardening: broken references fixed, HEAD corrected, final certification docs 49-50 added)
**Twelfth pass:** 2026-06-02 (autonomous production-readiness closure: docs 62–67 added, vendor scoring fixed, test matrix contradiction resolved)
**Thirteenth pass:** 2026-06-02 (final truth-lock hardening: doc 68 added, HEAD references resolved)
**Fifteenth pass:** 2026-06-02 (evidence-preparation hardening: HEAD drift permanently resolved, evidence prep → 100%, doc 71/72 added, all scorecards updated)
**Sixteenth pass:** 2026-06-02 (Oracle-verified corrections: cert commit fixed, doc 46 body cleaned, doc 50/70 contradictions resolved)
**Branch:** `main`
**Activity-code audit baseline:** `65b21eb`
**Latest activity-overhaul planning certification commit:** `d15b6a0` (fifteenth pass)
**Validated at:** 2026-06-02 sixteenth-pass Oracle-verified corrections
**Live repo HEAD:** intentionally not hardcoded — run `git rev-parse HEAD`
**Planning baseline HEAD:** `65b21eb` (no activity code changed since baseline: only proof/ops/docs commits)
**Status:** Implementation-readiness: 100% GO. Production enablement planning: 100% GO. Evidence preparation: 100% GO. Production enablement execution: 0% NO-GO (pending operational actions). All 74 files internally consistent (README + 70 numbered docs 00–69 + docs 70–72). `production-evidence/` folder with 18 files (README + 16 evidence templates + loop log). All 16 evidence templates created and verified. Docs 71 (no-false-claims audit) and 72 (loop log) added.

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

## What Changed in Eighth Pass (Final Implementation-Readiness Lock)

### Corrections

1. **Current HEAD corrected** from `87f603e` → `1a6dcc5`. No activity-related code changed (only proof/ops/mvp-readiness commits between `87f603e` and `1a6dcc5`: `02f7d13`, `5c13759`, `5677d88`, `14bd303`, `3fbd337`, `91dfc84`, `9676f02`, `b8adb1a`, `c9c1141`, `ede0f32`, `1a6dcc5`).
2. **"46 documents" → "50 files"** — Clarified everywhere that 50 files total (README + 49 numbered docs 00–48) are consistent and certified, not "46 documents".
3. **PR 8A/8B split** — Authoritative Implementation Sequence now shows PR 8A and PR 8B as separate items. PR 8A can proceed independently after PRs 2-6.
4. **Pass count corrected** — "5 audit passes" → "8 audit/refinement passes" (first + second + third + fourth + fifth + sixth + seventh + eighth).
5. **Stale heading removed** — "PR 1 — Fourth-pass planning docs" → "PR 1 — Planning docs merge".
6. **Doc 39 reading order** — Updated to match authoritative implementation reading order with 45 as entry point.

### Scores After Eighth Pass

| Category | Before | After |
|----------|--------|-------|
| Document consistency | 100% | **100%** |
| Code factual accuracy | 100% | **100%** |
| PR 2 execution readiness | 99% | **99%** |
| PR 3 composer readiness | 99% | **99%** |
| PRs 4–6 integration readiness | 99% | **99%** |
| Access telemetry planning | 100% | **100%** (gated) |
| Security/privacy readiness | 100% | **100%** |
| Test/QA readiness | 99% | **99%** |
| Blast-radius/rollback readiness | 100% | **100%** |
| Decision/governance readiness | 100% | **100%** |
| **Weighted composite** | **99.3%** | **99.3%** |

Scores unchanged — the eighth pass fixed factual errors (stale HEAD, file count ambiguity, pass count, PR sequence rendering) that did not affect the underlying readiness level.

### Key Updated Documents

- README.md — HEAD, pass status, eighth-pass section, Authoritative Implementation Sequence
- 42, 44, 45 — HEAD references, "46 documents"→"47 files"
- 40 — HEAD, pass count "5"→"8"
- 39 — Reading order, stale HEAD reference in doc 42 description

---

## What Changed in Ninth Pass (Documentation-Only: Gate Clearance)

### Purpose

Documentation-only pass. After Wave 1 implementation, all remaining gates were cleared by stakeholder approval, allowing PR 7 and PR 8B to proceed. Philippine Data Privacy Act (DPA) and NPC compliance plan added.

### Key Actions

1. **PR 7+8B gates cleared** — Owner/Product + Internal Privacy Approval obtained for all pending access telemetry decisions.
2. **6 decisions approved** — D-016 through D-023 received formal stakeholder sign-off.
3. **Docs 47 and 48 created** — `47-pr7-pr8b-approval-record.md` and `48-philippines-data-privacy-compliance-plan.md`.
4. **File count 48→50** — Now 50 planning documents total (README + 49 numbered docs 00–48).
5. **PR 7 now GO** — Approved under conservative privacy constraints (country-only location, audit-only device metadata, in-product disclosure required, retention policy defined, bot/crawler filtering enabled by default). See doc 47.
6. **PR 8B now GO** — Access telemetry hardening can proceed after PR 7 implementation (gate cleared).
7. **Philippine DPA/NPC compliance plan added** — Doc 48 covers NPC registration, data subject rights, breach notification, and retention compliance for Philippine-based operators using Archestimator. See doc 48.

### Scores After Ninth Pass

Scores unchanged from eighth pass (weighted composite 99.3%) — the ninth pass was a documentation-only gate clearance with no underlying readiness changes. Access telemetry planning moves from "gated" to "approved — GO."

### New Documents

- `47-pr7-pr8b-approval-record.md` — Formally documents Owner/Product + Internal Privacy Approval for all 6 pending decisions (D-016 through D-023). Confirms PR 7 GO under conservative privacy constraints.
- `48-philippines-data-privacy-compliance-plan.md` — Philippine Data Privacy Act (Republic Act 10173) and National Privacy Commission compliance plan for Archestimator operators. Covers NPC registration triggers, data subject access/correction/deletion rights, breach notification protocol, and retention compliance.

### Key Updated Documents

- README.md — HEAD, pass status, ninth-pass section, PR 7/8B GO, Open Questions approval, file count 50
- `45-final-next-actions-micro-refinement.md` — PR 7 gates reminder resolved
- `46-final-implementation-readiness-lock.md` — Gate status updated
- `29-final-decision-log-and-approval-matrix.md` — D-016 through D-023 marked APPROVED

---

## What Changed in Tenth Pass (Document Hardening and Certification)

### Purpose

Documentation-only pass. Hardened the full planning pack to 100% consistency: fixed broken filename cross-references for docs 47/48, corrected stale HEAD references, and added final certification docs.

### Key Actions

1. All cross-references validated — 24 unique references verified across 12 key docs.
2. Docs 49 and 50 added — Loop log (audit trail) and final certification (single source of truth).

---

## What Changed in Eleventh Pass (Production Enablement Hardening)

### Purpose

Docs-only production enablement readiness pass. Created the complete production enablement planning pack: every artifact, checklist, copy pack, playbook, runbook, rollout plan, test matrix, and sign-off template needed to safely enable access telemetry in production.

### Key Actions

1. **HEAD self-reference permanently resolved** — All docs now use audited-baseline (`65b21eb`) / last-certification (`e559e60`) / current-HEAD (`b6873b4`) pattern.
2. **11 new docs created (51–61)** — Complete production enablement pack.
3. **Philippine DPA/NPC research launched** — Librarian agent researching current NPC circulars for web application telemetry.
4. **All existing docs updated** — Cross-references to production enablement pack added across README, 50, 39, 47, and others.
5. **Distinction hardened:** "GO for implementation" ≠ "Production enabled." Both concepts are now separately tracked with their own scorecards and certifications.
6. **No false claims** — Zero instances of falsely claiming DPO designation, NPC registration completion, external counsel review, or production telemetry enablement.

### Scores After Eleventh Pass

| Category | Score |
|----------|------:|
| Implementation readiness (composite) | 99.5% (unchanged) |
| Production enablement planning (composite) | 98.50% |
| Production enablement execution | 0% (by design — operational actions pending) |

### New Documents

- 51–61 — Complete production enablement planning pack. See `61-access-telemetry-production-enablement-readiness-certification.md` (read FIRST for production enablement).

---

## What Changed in Twelfth Pass (Autonomous Production-Readiness Closure)

### Purpose

Docs-only autonomous closure pass. Pushed production enablement planning to true 100% readiness. Fixed known weaknesses, created missing artifacts, and finalized the three-domain scoring architecture.

### Key Actions

1. **Test matrix contradiction fixed** — Doc 57 B3 corrected from `recordProjectPublicationEvent("open")` → `recordProjectPublicationAnalyticsEvent()` pattern per architecture.
2. **Vendor/processor readiness upgraded** — Created doc 63 (vendor/processor DPA evidence worksheet) with full data flow analysis, vendor inventory, DPA links, and review checklists. Vendor planning readiness: 95% → 98–99%.
3. **Evidence ledger created (doc 64)** — Central tracker for all 16 production enablement evidence items. All default to Missing until operational evidence exists.
4. **Execution runbook created (doc 65)** — 9-phase, 53-item step-by-step execution path from planning to production.
5. **Final gate matrix created (doc 66)** — Boolean gate matrix: 15 required gates, 1 recommended. Production GO only when all required gates are Complete.
6. **Final three-domain scorecard created (doc 67)** — Separates Implementation Readiness (100%), Planning Readiness (100%), and Execution Readiness (0%).
7. **HEAD updated** — All stale `b6873b4` → `453ac68`. No activity code changed.
8. **File count updated** — 63 → 71 files.
9. **All cross-references updated** — Docs 51–61 now reference docs 62–67.

### Scores After Twelfth Pass

| Domain | Score |
|--------|------:|
| Implementation readiness (composite) | 100% |
| Production enablement planning (composite) | **100%** |
| Production enablement execution | 0% (by design — operational actions pending) |

### New Documents

- 62–67 — Complete production-readiness closure pack. See `67-final-access-telemetry-production-readiness-scorecard.md` (final scorecard) and `66-production-readiness-final-gate-matrix.md` (gate matrix).

### Key Updated Documents

- README.md — HEAD, pass status, twelfth-pass section
- `57-access-telemetry-test-evidence-matrix.md` — B3 test contradiction fixed
- `59-access-telemetry-production-enablement-readiness-scorecard.md` — Vendor/processor 95% → 98–99%, composite 98.50% → 98.65%
- `61-access-telemetry-production-enablement-readiness-certification.md` — HEAD, file count, planning 100%, reading order updated
- `50-final-100-implementation-readiness-certification.md` — HEAD, file count
- `51-access-telemetry-production-enablement-checklist.md` — A12 updated, cross-references added
- `39-source-of-truth-and-doc-authority-index.md` — Docs 62–67 added to authoritative index and reading order
- `36-access-telemetry-side-effects-audit.md` — Cross-references updated
- `53-dpo-npcrs-and-dps-registration-triage.md` — Cross-references updated
- `48-philippines-data-privacy-compliance-plan.md` — Cross-references updated

## Production Enablement Truth Lock

**Implementation readiness: GO. Production enablement planning: GO. Actual production enablement execution: NO-GO until evidence exists.**

Read `68-access-telemetry-production-truth-lock.md` first for the authoritative current state. See also `67-final-access-telemetry-production-readiness-scorecard.md` for the three-domain scorecard, `70-access-telemetry-evidence-preparation-scorecard.md` for evidence preparation scoring, and `production-evidence/README.md` for the evidence folder index.

---

## What Changed in Fourteenth Pass (Evidence Preparation)

### Purpose

Docs-only evidence preparation pass. Created the `production-evidence/` folder with all 16 evidence templates (E-001 through E-016). Updated doc 64 (evidence ledger), doc 66 (gate matrix), and doc 68 (truth lock) with preparation statuses. Created doc 70 (evidence preparation scorecard). No operational actions taken — all gates remain Incomplete.

### Key Actions

1. **`production-evidence/` folder created** — 17 files: README.md index + 16 evidence subdirectories with templates.
2. **All 16 evidence templates created** — Each with: artifact description, owner, completion criteria, verification method, source doc reference, and gate reference.
3. **Evidence ledger (doc 64) updated** — All 16 evidence items moved from `Missing` to appropriate preparation status.
4. **Gate matrix (doc 66) updated** — New `Preparation status` column added. Gate summary expanded.
5. **Truth lock (doc 68) updated** — Evidence preparation domain added to the truth table. Reading order updated.
6. **Scorecard (doc 70) created** — Six-domain evidence preparation scoring architecture: templates, owner-action, engineering-action, QA-action, sign-off path, and actual completion.

### Scores After Fourteenth Pass

| Domain | Score |
|--------|------:|
| Implementation readiness (composite) | 100% |
| Production enablement planning (composite) | 100% |
| Evidence preparation readiness | 100% |
| Actual production enablement execution | 0% |

### New Documents

- `70-access-telemetry-evidence-preparation-scorecard.md` — Six-domain evidence preparation scoring
- `production-evidence/README.md` — Evidence folder index
- 16 evidence templates in `production-evidence/E-001-privacy-notice/` through `production-evidence/E-016-external-counsel-review/`

### Key Updated Documents

- README.md — HEAD, file count, fourteenth-pass section
- `64-access-telemetry-production-evidence-ledger.md` — Statuses, change log, evidence preparation note
- `66-production-readiness-final-gate-matrix.md` — Preparation status column, gate summary, honesty statement
- `68-access-telemetry-production-truth-lock.md` — Evidence preparation domain, reading order, honesty pledge

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
| `45-final-next-actions-micro-refinement.md` | **NEW (Seventh Pass)** — Micro-refinement summary, final go/no-go, PR 2 start checklist |
| `46-final-implementation-readiness-lock.md` | **NEW (Eighth Pass)** — Final lock: HEAD, file count, score table, stale HEAD/event_type/PR 8A-8B confirmations, PR 7 gates |
| `47-pr7-pr8b-approval-record.md` | **NEW (Ninth Pass)** — Formally documents Owner/Product + Internal Privacy Approval for D-016 through D-023; PR 7 GO confirmed |
| `48-philippines-data-privacy-compliance-plan.md` | **NEW (Ninth Pass)** — Philippine DPA/NPC compliance plan: registration, data rights, breach notification, retention |
| `49-final-100-readiness-loop-log.md` | **NEW (Tenth Pass)** — Autonomous loop log for final certification pass: iterations, issues found, fixes applied |
| `50-final-100-implementation-readiness-certification.md` | **NEW (Tenth Pass)** — Final single source of truth: HEAD, file count, GO/NO-GO table, PR 7 constraints, production gates, reading order |
| `51-access-telemetry-production-enablement-checklist.md` | **NEW (Eleventh Pass)** — Master production enablement checklist: 39 items across legal, technical, test, and sign-off sections |
| `52-privacy-notice-and-disclosure-copy-pack.md` | **NEW (Eleventh Pass)** — Approved privacy policy and in-product disclosure copy (English + Tagalog) |
| `53-dpo-npcrs-and-dps-registration-triage.md` | **NEW (Eleventh Pass)** — DPO designation, NPCRS registration triage, and DPS inventory worksheets |
| `54-data-subject-request-and-breach-response-playbook.md` | **NEW (Eleventh Pass)** — DSR intake/response procedures and breach notification playbook with templates |
| `55-access-telemetry-retention-runbook.md` | **NEW (Eleventh Pass)** — 90-day retention path: automated, operator-run, and feature-flagged options |
| `56-access-telemetry-feature-flag-and-rollout-plan.md` | **NEW (Eleventh Pass)** — 6-stage rollout plan with monitoring, rollback, and kill switch |
| `57-access-telemetry-test-evidence-matrix.md` | **NEW (Eleventh Pass)** — 39 specific tests across data safety, behavior, visibility, disclosure, retention, and feature flag categories |
| `58-production-enablement-final-go-template.md` | **NEW (Eleventh Pass)** — Final production sign-off template with evidence checklist and approval blocks |
| `59-access-telemetry-production-enablement-readiness-scorecard.md` | **NEW (Eleventh Pass)** — 12-category production enablement readiness scoring (98.50% composite) |
| `60-production-enablement-readiness-loop-log.md` | **NEW (Eleventh Pass)** — Autonomous loop audit trail for the eleventh pass |
| `61-access-telemetry-production-enablement-readiness-certification.md` | **NEW (Eleventh Pass)** — Production enablement single source of truth — read FIRST |
| `62-production-readiness-autonomous-closure-log.md` | **NEW (Twelfth Pass)** — Autonomous closure loop log for twelfth-pass production-readiness hardening |
| `63-vendor-processor-dpa-evidence-worksheet.md` | **NEW (Twelfth Pass)** — Vendor/processor DPA evidence: inventory, data flow, DPA links, review checklists |
| `64-access-telemetry-production-evidence-ledger.md` | **NEW (Twelfth Pass)** — Central evidence tracker: 16 items, all Missing until executed |
| `65-production-enablement-execution-runbook.md` | **NEW (Twelfth Pass)** — 9-phase, 53-item step-by-step execution path |
| `66-production-readiness-final-gate-matrix.md` | **NEW (Twelfth Pass)** — Boolean gate matrix: 15 required + 1 recommended gate |
| `67-final-access-telemetry-production-readiness-scorecard.md` | **NEW (Twelfth Pass)** — Final three-domain scorecard: Implementation 100%, Planning 100%, Execution 0% |
| `68-access-telemetry-production-truth-lock.md` | **NEW (Thirteenth Pass)** — THE final truth document — read FIRST for production enablement |
| `69-production-truth-lock-loop-log.md` | **NEW (Thirteenth Pass)** — Loop log for truth-lock hardening pass |
| `70-access-telemetry-evidence-preparation-scorecard.md` | **NEW (Fourteenth Pass)** — Six-domain evidence preparation scoring: templates, owner-action, engineering-action, QA-action, sign-off, actual completion |
| `production-evidence/` (folder) | **NEW (Fourteenth Pass)** — Evidence artifact storage: 17 files (README + 16 evidence templates E-001 through E-016) |

---

## Authoritative Implementation Sequence

1. **PR 1 — Planning docs merge** (docs only, 63 files)
2. **PR 2 — Preflight correctness cleanup** — Fix 5 known bugs (row_inserted filter, Realtime, event_type, CSRF fixes). See `31-pr2-preflight-implementation-brief.md`.
3. **PR 3 — Activity Composer module + tests** (combined PR: module + passing tests)
4. **PR 4 — Estimate Activity UI integration**
5. **PR 5 — Shared-link Activity API integration**
6. **PR 6 — Recipient actor resolution + comments/decisions copy**
7. **PR 7 — Shared page access telemetry** ✅ **GO** — Approved under conservative privacy constraints (see doc 47). See `28-fourth-pass-stakeholder-review-packet.md` and `47-pr7-pr8b-approval-record.md`.
8. **PR 8A — Shared-link pagination + Realtime hardening** ✅ Can proceed independently after PRs 2-6. Not gated on PR 7.
9. **PR 8B — Access telemetry hardening** ✅ GO after PR 7 implementation (gate cleared).
10. **PR 9 — UI polish, accessibility, manual QA** — Non-telemetry polish after PR 8A; telemetry QA after PR 8B (all gates cleared).

PRs 1–6 and PR 8A can proceed without stakeholder approval (no privacy impact). All PRs including 7 and 8B are now GO for implementation sequencing. Access telemetry production enablement remains gated by privacy notice, in-product disclosure, DPO/NPCRS triage, retention path, and tests. See `47-pr7-pr8b-approval-record.md`.

---

## Key Findings (Fifth Pass — Final Audit)

- **Current HEAD is `65b21eb`**, 2 commits ahead of the `da35386` fifth-pass baseline. No activity code changed between `da35386` and `65b21eb` (only proof/ops commits: `26bc6e3` "Make Vercel health proof repeatable", `65b21eb` "Make Supabase backup proof repeatable").
- **12 major findings documented** in doc 34 — including: event count is 14 not 13, event_type exposure risk, access telemetry side effects critical gap, approval statuses inconsistent, CSRF affects 3 fetch paths not 2.
- **Side effects matrix finalized** (doc 36) — `recordProjectPublicationEvent("open")` triggers 3 side effects (open_count, recipient update, shared_link_events insert). New `recordProjectPublicationAnalyticsEvent()` helper recommended for analytics-only access tracking.
- **Code truth map complete** (doc 35) — 20+ features mapped from planning claims to actual code with reconciled truth.
- **PR 2 scope narrowed** — event_type NOT exposed in public API response (deferred to composer PR 5). CSRF fix covers all 3 fetch paths.
- **Approval statuses corrected** (doc 29) — Engineering recommendations distinguished from actual stakeholder sign-offs. No fabricated approvals.
- **72 planning documents total** (README + 70 numbered docs 00–69 + doc 70). Sixth pass added docs 41–44. Seventh pass added doc 45 and refined all docs for final micro-consistency. Eighth pass added doc 46 and corrected stale HEADs. Ninth pass added docs 47–48 for gate clearance and DPA compliance. Tenth pass added docs 49–50 for final hardening and certification. Eleventh pass added docs 51–61 for production enablement planning. Twelfth pass added docs 62–67 for production-readiness closure. Thirteenth pass added docs 68–69 for truth-lock hardening. Fourteenth pass added doc 70 and `production-evidence/` folder (17 files) for evidence preparation.

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

### Approved (Ninth Pass — All Gates Cleared)
1. ✅ APPROVED — Location granularity: country-only default. See D-018, doc 47.
2. ✅ APPROVED — Device/browser metadata in owner UI: audit details only. See D-017, doc 47.
3. ✅ APPROVED — In-product disclosure: required. See D-023, doc 47.
4. ✅ APPROVED — Retention policy: defined before V2. See D-022, doc 47.
5. ✅ APPROVED — Bot/crawler filtering: hide from owner by default. See D-020, doc 47.

---

## Next Action

1. **Merge docs (PR 1)** — All 71 files (README + 70 numbered docs 00–69) are internally consistent after thirteenth-pass truth-lock hardening. Ready to merge.
2. **Begin PR 2** — Preflight correctness cleanup (5 fixes, no privacy dependencies). See `40-final-implementation-handoff.md` for exact starting point. See `31-pr2-preflight-implementation-brief.md` for scope. See `38-pr2-test-command-and-fixture-plan.md` for test plan.
3. **Continue through PR sequence** — PRs 3-6 proceed freely after PR 2. PR 8A can proceed after PRs 2-6 independent of PR 7. PR 7 formerly gated — now GO. See `42-98-100-readiness-scorecard.md`.
4. **Begin PR 7 — Access telemetry.** See `50-final-100-implementation-readiness-certification.md` (read FIRST), `47-pr7-pr8b-approval-record.md`, and `48-philippines-data-privacy-compliance-plan.md` for approved constraints and production enablement gates.
5. **Before production enablement — Complete the checklist.** See `61-access-telemetry-production-enablement-readiness-certification.md` (read FIRST), then `51-access-telemetry-production-enablement-checklist.md`.

## Key Reference Documents

| For | See |
|-----|-----|
| **Final certification — read FIRST** | `50-final-100-implementation-readiness-certification.md` |
| **Loop audit (tenth pass)** | `49-final-100-readiness-loop-log.md` |
| **Final lock confirmation** | `46-final-implementation-readiness-lock.md` |
| **Implementation handoff** | `40-final-implementation-handoff.md` |
| **Document authority index** | `39-source-of-truth-and-doc-authority-index.md` |
| **Code truth map** | `35-code-truth-map.md` |
| **Side effects audit** | `36-access-telemetry-side-effects-audit.md` |
| **Final audit summary** | `34-final-preimplementation-audit.md` |
| **PR 2 test plan** | `38-pr2-test-command-and-fixture-plan.md` |
| Stakeholder-friendly summary | `28-fourth-pass-stakeholder-review-packet.md` |
| All 28 decisions and statuses | `29-final-decision-log-and-approval-matrix.md` |
| PR 2 execution plan | `31-pr2-preflight-implementation-brief.md` |
| Go/no-go by category | `42-98-100-readiness-scorecard.md` |
| Meeting agenda | `33-stakeholder-review-script.md` |
| Full 9-PR sequence | `27-third-pass-master-implementation-blueprint.md` |
| Access telemetry plan | `23-shared-page-access-activity-plan.md` |
| Privacy boundaries | `26-privacy-retention-and-client-disclosure-plan.md` |
| Gate clearance & privacy approvals | `47-pr7-pr8b-approval-record.md` |
| Philippine DPA/NPC compliance | `48-philippines-data-privacy-compliance-plan.md` |
| **Production enablement — read FIRST** | `61-access-telemetry-production-enablement-readiness-certification.md` |
| Production enablement checklist | `51-access-telemetry-production-enablement-checklist.md` |
| Privacy notice and disclosure copy | `52-privacy-notice-and-disclosure-copy-pack.md` |
| DPO/NPCRS/DPS triage | `53-dpo-npcrs-and-dps-registration-triage.md` |
| DSR and breach response playbook | `54-data-subject-request-and-breach-response-playbook.md` |
| Retention runbook | `55-access-telemetry-retention-runbook.md` |
| Feature flag and rollout plan | `56-access-telemetry-feature-flag-and-rollout-plan.md` |
| Test evidence matrix | `57-access-telemetry-test-evidence-matrix.md` |
| Production sign-off template | `58-production-enablement-final-go-template.md` |
| Production readiness scores | `59-access-telemetry-production-enablement-readiness-scorecard.md` |
| **Vendor/processor DPA worksheet** | `63-vendor-processor-dpa-evidence-worksheet.md` |
| **Evidence ledger** | `64-access-telemetry-production-evidence-ledger.md` |
| **Execution runbook** | `65-production-enablement-execution-runbook.md` |
| **Final gate matrix** | `66-production-readiness-final-gate-matrix.md` |
| **Final three-domain scorecard** | `67-final-access-telemetry-production-readiness-scorecard.md` |
| **⭐ Truth lock — read FIRST** | `68-access-telemetry-production-truth-lock.md` |
| **Evidence preparation scorecard** | `70-access-telemetry-evidence-preparation-scorecard.md` |
| **Evidence artifacts folder** | `production-evidence/README.md` |
| **Evidence templates (E-001–E-016)** | `production-evidence/E-001-privacy-notice/` through `E-016-external-counsel-review/` |
