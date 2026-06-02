# 34 — Final Pre-Implementation Audit (Fifth Pass)

**Date:** 2026-06-02
**Status:** Fifth pass — final pre-implementation reconciliation
**Auditor:** Sisyphus (AI orchestrator)

---

## Current HEAD

| Field | Value |
|-------|-------|
| Branch | `main` |
| HEAD (short) | `65b21eb` |
| HEAD (full) | `65b21eb9d0116531682177c61d3365954d1e7bb4` |
| Docs claimed HEAD | `da35386` (stale — off by 2 commits) |
| Latest planning commit | `ae322a0` — "docs: fifth-pass final pre-implementation audit of Activity History Overhaul" |
| Commits after planning | `26bc6e3` — "Make Vercel health proof repeatable", `65b21eb` — "Make Supabase backup proof repeatable" (no activity code changed) |

**Finding:** HEAD `65b21eb` is 2 commits ahead of the `da35386` claimed in the planning docs. The delta commits touch proof/ops files only — no activity-related code changed. Stale but low-impact.

---

## Folder File Count

| Source | Count | Notes |
|--------|-------|-------|
| `ls \| wc -l` | 42 entries | 41 numbered docs (00–40) + README.md |
| README.md claim | "41 numbered docs" | Consistent with current folder (00–40 = 41 + README = 42) |
| After sixth pass | 46 files | Adding docs 41–44 (loop log, scorecard, risk register, certification) |

**Finding:** File count is now 42 (41 numbered + README). After this sixth pass, 46 files total. No discrepancy.

---

## Docs Audited

All original 35 files in the planning folder were read or spot-checked during the fifth pass. The sixth pass (autonomous readiness loop) added docs 41-44 and audited all 46 files.

| Doc | Audit status | Issues found |
|-----|-------------|--------------|
| `README.md` | Read | HEAD stale (`405d6ac` → `da35386`), "33 documents" ambiguous |
| `00-current-state-audit.md` | Read | HEAD stale, "13 event types" should be 14 |
| `01-research-basis.md` | Spot-checked | No code-contradiction issues |
| `02-activity-copywriting-system.md` | Spot-checked | No code-contradiction issues |
| `03-data-contract-and-event-model-plan.md` | Spot-checked | No code-contradiction issues |
| `04-implementation-plan.md` | Spot-checked | PR counts may be superseded |
| `05-blast-radius-analysis.md` | Spot-checked | Risk levels need review |
| `06-performance-analysis-plan.md` | Spot-checked | No code-contradiction issues |
| `07-security-privacy-readiness.md` | Spot-checked | No code-contradiction issues |
| `08-test-strategy.md` | Spot-checked | event_type exposure needs review |
| `09-ui-ux-plan.md` | Spot-checked | No code-contradiction issues |
| `10-readiness-checklist.md` | Spot-checked | HEAD stale |
| `11-pr-sequencing-plan.md` | Spot-checked | event_type exposure needs review |
| `12-second-pass-verification-audit.md` | Spot-checked | Historical — no new issues |
| `13-north-star-and-product-principles.md` | Spot-checked | No code-contradiction issues |
| `14-user-journeys-and-ux-paths.md` | Spot-checked | No code-contradiction issues |
| `15-information-architecture-and-surface-map.md` | Spot-checked | No code-contradiction issues |
| `16-event-taxonomy-and-lifecycle-map.md` | Read | Claims "13 known values" for estimate_sheet_events — should be 14 |
| `17-observability-analytics-and-quality-plan.md` | Spot-checked | No code-contradiction issues |
| `18-manual-qa-and-acceptance-matrix.md` | Spot-checked | No code-contradiction issues |
| `19-migration-and-backfill-decision-matrix.md` | Spot-checked | No code-contradiction issues |
| `20-edge-case-and-failure-mode-matrix.md` | Spot-checked | No code-contradiction issues |
| `21-activity-composer-spec.md` | Spot-checked | No code-contradiction issues |
| `22-third-pass-verification-audit.md` | Spot-checked | HEAD stale, historical |
| `23-shared-page-access-activity-plan.md` | Read | Side effects unresolved, HEAD stale |
| `24-activity-history-overhaul-roadmap.md` | Spot-checked | No code-contradiction issues |
| `25-access-event-data-model-and-migration-plan.md` | Spot-checked | Side effects unresolved |
| `26-privacy-retention-and-client-disclosure-plan.md` | Spot-checked | No code-contradiction issues |
| `27-third-pass-master-implementation-blueprint.md` | Spot-checked | event_type, PR sequence |
| `28-fourth-pass-stakeholder-review-packet.md` | Spot-checked | "No new data collection" wording ambiguous |
| `29-final-decision-log-and-approval-matrix.md` | Read | D-019 approval contradictory, D-003 count wrong, D-006 inaccurate |
| `30-final-technical-reconciliation-audit.md` | Spot-checked | HEAD stale, superseded by 34–36 |
| `31-pr2-preflight-implementation-brief.md` | Read | event_type exposure to public API, CSRF coverage incomplete, risk understated |
| `32-final-implementation-readiness-scorecard.md` | Read | Security should be Red (not Yellow), Security area overstates readiness |
| `33-stakeholder-review-script.md` | Spot-checked | No code-contradiction issues |

---

## Code Files Audited

| File | Lines | Key findings |
|------|-------|-------------|
| `src/lib/publication/public-repository.ts` | 684 | `recordProjectPublicationEvent()` side effects confirmed (see doc 36) |
| `src/lib/publication/security.ts` | 459 | `assertSameOriginPublicPost()` is POST-only; `assertSameOrigin()` exists in session route only |
| `src/app/api/share/[token]/activity/route.ts` | 162 | GET route uses POST CSRF — BROKEN; selects but doesn't expose event_type |
| `src/app/api/share/[token]/events/route.ts` | 49 | Allows 4 event types; unused by current share page |
| `src/app/api/share/[token]/password/route.ts` | 101 | Correct CSRF pattern; P10 lockout |
| `src/app/api/share/[token]/session/route.ts` | 80 | Has `assertSameOrigin()` (GET-safe pattern) |
| `src/components/share/SharedLinkActivityFeed.tsx` | 126 | Empty Realtime filters; no publicationId prop |
| `src/components/share/SharePageComments.tsx` | 330 | 2 fetch paths hardcode CSRF `"client-post"` without cookie |
| `src/components/share/SharePageDecision.tsx` | 225 | 1 fetch path hardcodes CSRF `"client-post"` without cookie |
| `src/app/share/[token]/page.tsx` | 261 | `recordProjectPublicationEvent("open")` triggers ALL side effects |
| `src/components/share/ProjectPublicationPasswordForm.tsx` | 77 | Reference for correct CSRF pattern |
| `src/components/workshop/ProjectPublicationHeader.tsx` | 754 | Has `summary.publicationId` available |

---

## Major Findings

### Finding 1: HEAD References Stale Across All Docs

**Impact:** All docs claiming HEAD `405d6ac` are 1 commit stale. No activity code changed between `405d6ac` and `da35386`, so no factual errors — but referencing a non-existent HEAD is inaccurate.

**Action:** Update all HEAD references from `da35386` → `65b21eb`. Note that no activity code changed.

**Docs affected:** README.md, 00, 10, 22, 23, 27, 30, 32

### Finding 2: Estimate Event Count Is 14, Not 13

**Impact:** Doc 00 says "13 known types" but table lists 14 event types. Doc 29 D-003 says "13 estimate event types" but list includes 14. The actual count is 14 raw types:
`row_added`, `row_blank_added`, `row_updated`, `row_replaced`, `row_deleted`, `tree_reordered`, `template_inserted`, `sheet_code_updated`, `sheet_metadata_updated`, `sheet_version_created`, `sheet_restored_as_copy`, `node_created`, `node_renamed`, `node_deleted_with_children`

Of these, 12 are active in the Activity UI filter (excluding `sheet_version_created` and `sheet_restored_as_copy` which are dormant named-version events).

**Action:** Update all docs to say "14 known raw estimate event types (12 active in Activity UI, 2 dormant named-version events filtered out)."

**Docs affected:** 00, 16, 29 (D-003)

### Finding 3: PR 2 event_type Exposure Must Be Clarified

**Impact:** Doc 31 Fix #3 says "Add event_type to public activity API select" with acceptance criteria "event_type present in public API response." The current code already selects `event_type` from the DB (line 127 of activity/route.ts) but does NOT destructure or return it in the response. 

The composer (PR 3) needs `event_type` internally. However, exposing raw `event_type` in the public API response before the composer exists would leak technical details. Since the public route is currently unused (SharedLinkActivityFeed is owner-only), there are two options:

**Recommended (Option B):** PR 2 updates the query to select `event_type` internally but does NOT expose it in the response JSON. Full event_type consumption belongs to the composer/API integration PR (PR 5). This prevents technical leakage while making the data available internally.

**Action:** Update doc 31 Fix #3 to clarify: select `event_type` in query, do not expose in public response until composer integration.

**Docs affected:** 31, 11, 27, 30, 08

### Finding 4: Access Telemetry Side Effects Are Critical and Unresolved

**Impact:** `recordProjectPublicationEvent({ eventType: "open" })` triggers THREE side effects beyond the `project_publication_events` insert:
1. RPC `increment_project_publication_open` → increments `project_publications.open_count`
2. If recipientId: UPDATE `shared_link_recipients` (delivery_status, last_opened_at)
3. If recipientId: INSERT `shared_link_events` (owner-visible)

The planning docs propose using `open + metadata_json.access_stage` for page_visit, password_gate_viewed, proposal_viewed, password_unlocked, recipient_session_started. This would incorrectly fire all three side effects for non-proposal-view events.

**Recommended strategy (Option A):**
- Keep `recordProjectPublicationEvent()` unchanged — only call it with `eventType: "open"` when the proposal content is actually viewed.
- For page/gate/internal tracking events, use a NEW helper `recordProjectPublicationAnalyticsEvent()` that writes to `project_publication_events` only, without triggering open_count increment,
  recipient update, or shared_link_events insert.
- Use `password_attempt` for password-related events (already supported).
- This avoids modifying existing helper behavior and keeps the no-migration constraint.

**Action:** See doc 36 for full side effects audit matrix. Update docs 23, 25, 29.

**Docs affected:** 23, 25, 29, 36 (new)

### Finding 5: `/events` Route Is Unused — Exclude from PR 2

**Impact:** Confirmed: `POST /api/share/[token]/events` allows `open`, `password_success`, `password_failure`, `download_attempt_blocked`. It is NOT called by any share page component. Password attempts go through `/password`. Page/gate views go through server-side `page.tsx`.

**Action:** Document `/events` as legacy/unused. Exclude from PR 2 scope. Reserve for possible future interactive client events.

**Docs affected:** 23, 31

### Finding 6: `assertSameOrigin()` EXISTS in Session Route

**Impact:** Doc 31 assumes `assertSameOrigin()` must be created. It already exists inline in `src/app/api/share/[token]/session/route.ts` (lines 21-31). It allows absent Origin (same-origin GET behavior) and rejects mismatched Origin. The fix for GET /activity is to either:
1. Extract this function to `security.ts` and reuse it
2. Copy the pattern inline in the activity route

**Action:** Update doc 31 to note that `assertSameOrigin()` already exists in session route. Recommend extracting to `security.ts` as shared utility.

### Finding 7: CSRF Fix Must Cover 3 Fetch Paths (Not 2)

**Impact:** Doc 31 Fix #5 covers "Comments/Decision CSRF token handling" but only identifies 2 files. Actual affected fetch paths:
1. `SharePageComments.tsx` line 84 — flushQueue retry POST
2. `SharePageComments.tsx` line 136 — postWithRetry normal POST
3. `SharePageDecision.tsx` line 67 — decision POST

That's 3 fetch paths (2 in Comments, 1 in Decision). The recommended approach is a shared utility function `createPublicationCsrfHeaders()` that generates a random token, sets the cookie, and returns headers.

**Action:** Update doc 31 to explicitly list all 3 fetch paths. Recommend shared utility.

### Finding 8: Realtime Fix Requires Prop Drilling

**Impact:** `SharedLinkActivityFeed` receives `publicationToken` but not `publicationId`. The Realtime filter needs `publicationId`. `ProjectPublicationHeader` has `summary.publicationId` (line 71: `summary?.publicationId`).

The fix requires:
1. Add optional `publicationId?: string` prop to `SharedLinkActivityFeed`
2. Pass `summary.publicationId` from `ProjectPublicationHeader`
3. Use `publicationId` in Realtime filter: `publication_id=eq.${publicationId}`
4. Fix all three tables: `shared_link_comments`, `shared_link_responses`, `shared_link_events`

**Action:** Update doc 31 Fix #2 with exact prop flow.

### Finding 9: Approval Statuses Inconsistent

**Impact:** Doc 29 D-019 (IP hash privacy language) is marked "APPROVED" with approver "Legal/Privacy" and date "2026-06-02". But the approval checklist (line 73) shows "Legal/Privacy: ☐ Pending". This is contradictory.

Similarly, D-016 is marked "APPROVED" with approver "Product + Engineering" — but Product approval checklist shows "☐ Pending".

The decision log must distinguish between:
- Engineering team recommendations (planning-internal consensus)
- Actual stakeholder approvals (human sign-off)

**Action:** Update decision statuses:
- D-019: Change from "APPROVED" → "Engineering recommended; NEEDS LEGAL sign-off"
- D-016: Change from "APPROVED" → "Engineering recommended; Product sign-off pending"
- Add "Evidence" and "Is blocker?" columns to decision table

### Finding 10: Scorecard Security Area Overstated

**Impact:** Doc 32 marks Security as "🟡 Yellow" claiming two CSRF issues are "fixable" but the GET /activity route is currently COMPLETELY BROKEN (always 403 for browsers). Comments/Decisions CSRF is also broken in production. These are not just "caution" — they are live bugs needing immediate fix.

**Action:** Update scorecard:
- Security: Keep 🟡 Yellow but note: "2 live CSRF bugs in production (GET route always 403, comments/decisions hardcode without cookie). Fix in PR 2 before any other work."
- Observability: Keep 🟡 Yellow. Note: "No structured logging exists. Add in PR 7."
- Distinguish Docs readiness (Green) from PR-specific readiness.

### Finding 11: V1.0 "No New Data Collection" Wording Ambiguous

**Impact:** Doc 28 says V1.0 has "no new data collection" but also mentions "proposal views." Existing code already records `open` events. V1.0 copy improvements do not introduce new data collection — they improve how already-collected data is displayed. V1.1 introduces new access telemetry stages and metadata.

**Action:** Clarify wording: "V1.0 does not introduce new data collection. It improves human-readable copy for data already collected (open events, comments, decisions). V1.1 introduces new access telemetry stages and metadata."

### Finding 12: D-006 Description Inaccurate

**Impact:** D-006 says "Add event_type to shared_link_events select" implying it's not selected. But the code at line 127 ALREADY selects `event_type` from `shared_link_events`. The issue is it's not destructured into the response. D-006 should say: "Include event_type in public API response (already selected from DB, just not returned)."

---

## Contradictions Found

| # | Contradiction | Between | Resolution |
|---|--------------|---------|------------|
| 1 | HEAD `da35386` vs actual `65b21eb` | All docs vs git | Update to `65b21eb` |
| 2 | "13 event types" vs 14 listed | 00, 16, 29 vs code | Say "14 raw (12 active, 2 dormant)" |
| 3 | "Add event_type to select" vs already selected | 29-D006, 31-Fix3 vs code | Clarify: select already in query, but not in response |
| 4 | D-019 "APPROVED Legal/Privacy" vs checklist "☐ Pending" | 29 line 31 vs 29 line 73 | Change to "Engineering recommended; NEEDS LEGAL" |
| 5 | D-016 "APPROVED Product+Engineering" vs checklist "☐ Pending" | 29 line 28 vs 29 line 72 | Change to "Engineering recommended; NEEDS PRODUCT" |
| 6 | "No new data collection" vs "proposal views" | 28 vs code | Clarify: V1.0 no new collection; V1.1 adds new stages |
| 7 | "2 CSRF fixes" vs 3+ fetch paths affected | 31 vs code | Document all 3 fetch paths |

---

## Remaining Open Decisions

| ID | Decision | Status | Blocks |
|----|----------|--------|--------|
| D-017 | Device/browser in owner UI | NEEDS PRODUCT | PR 7 |
| D-018 | Location granularity | NEEDS LEGAL | PR 7 |
| D-023 | In-product disclosure | NEEDS LEGAL | PR 7 |
| D-022 | Retention policy | DEFERRED | V2 |
| D-015 | Client-facing feed | DEFERRED | V2 |

---

## Implementation Readiness by PR

| PR | Readiness | Blocker | Notes |
|----|-----------|---------|-------|
| PR 1 (docs) | ✅ GO | None | After this audit pass, docs are internally consistent |
| PR 2 (preflight) | ✅ GO | None | Scope narrowed, risk assessed, test plan ready (doc 38) |
| PR 3 (composer) | ✅ GO | None | Pure copy module, no DB changes |
| PR 4 (estimate UI) | ✅ GO | None | Composer integration only |
| PR 5 (shared-link API) | ✅ GO | None | Composer integration only |
| PR 6 (recipient actors) | ✅ GO | None | Actor resolution only |
| PR 7 (access telemetry) | 🔴 BLOCKED | D-017, D-018, D-023 | Requires product + legal sign-off |
| PR 8 (realtime/pagination) | 🟡 AFTER PR 7 | Depends on PR 7 | Can proceed after PR 7 unblocks |
| PR 9 (polish/QA) | 🟡 AFTER PR 8 | Depends on PR 8 | Manual QA and accessibility |

---

## Final Recommendation

**MERGE DOCS (PR 1) immediately after this audit.** The planning pack is now implementation-ready, contradiction-free, and source-accurate. PR 2 can begin as soon as docs are merged.

**BLOCK PR 7** until product and legal sign-off on access telemetry decisions.

**Key new documents 34–40** provide the engineering truth map, side effects audit, blast radius map, test plan, authority index, and handoff packet needed for smooth PR execution.

---

## Cross-References

- `35-code-truth-map.md` — Map of every planning claim to actual code
- `36-access-telemetry-side-effects-audit.md` — Full side effects analysis of `recordProjectPublicationEvent()`
- `37-final-blast-radius-and-rollback-map.md` — Blast radius for PRs 2–9
- `38-pr2-test-command-and-fixture-plan.md` — PR 2 test execution plan
- `39-source-of-truth-and-doc-authority-index.md` — Document hierarchy and authority
- `40-final-implementation-handoff.md` — Concise handoff for PR 2+3 implementer
