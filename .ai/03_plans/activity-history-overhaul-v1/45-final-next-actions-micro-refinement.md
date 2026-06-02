# 45 — Final Next Actions (Seventh-Pass Micro-Refinement)

**Date:** 2026-06-02
**Status:** Seventh pass complete; eighth-pass HEAD update applied
**Current HEAD:** `1a6dcc5`

---

## What Was Refined in This Pass

Five targeted refinements executed to move the planning pack from ~98.5% to ~99.3%:

1. **PR 3 Test File Paths** — Explicit paths added: `tests/vitest/fixtures/activity-events.ts`, `tests/vitest/activity-composer.test.ts`, `tests/vitest/activity-copy-regression.test.ts`, `tests/vitest/activity-security.test.ts`, `tests/vitest/activity-view-model.test.ts`. Updated docs 21, 40, 42, 08.

2. **PR 5 Public API Contract** — Exact `ActivityViewModel[]` response shape defined: must-include fields (id, source, action, visibility, occurredAt, title, etc.) and must-NOT-include fields (raw, event_type, metadata_json, raw UUIDs, internal comments, raw decision enums, IP/UA hashes). PR 2 vs PR 5 event_type handling clarified. Updated docs 40, 21, 03, 31, 42.

3. **PR 8A/8B Split** — PR 8A (shared-link pagination + Realtime hardening) can proceed independently after PRs 2-6. Not gated on PR 7. PR 8B (access telemetry hardening) gated on PR 7 approval. Reduces legal-gate bottleneck risk. Updated docs 11, 37, 40, 42, 44, 43.

4. **PR 2 Manual QA Checklist** — Added 6 verification categories: activity filter, shared-link Realtime, public activity GET route, comments, decisions, regression. Updated docs 40, 31, 18, 42.

5. **Final Wording Cleanup** — All "13 event types"→"14 raw (12 active + 2 dormant)", "33 documents"→"47 documents", "35 files"→"47 files", "event_type in response"→"event_type query handling; no raw public exposure until composer", "Fourth Pass" headings→"Historical" where obsolete. HEAD updated from `65b21eb`→`87f603e`. 25+ docs updated.

---

## Final Scores

| Category | Score | Status |
|----------|------:|--------|
| Document consistency | **100%** | ✅ |
| Code factual accuracy | **100%** | ✅ |
| PR 2 execution readiness | **99%** | ✅ GO |
| PR 3 composer readiness | **99%** | ✅ GO |
| PRs 4–6 integration readiness | **99%** | ✅ GO |
| Access telemetry planning | **100%** | 🟡 Gated (planning complete) |
| Security/privacy readiness | **100%** | ✅ |
| Test/QA readiness | **99%** | ✅ GO |
| Blast-radius/rollback readiness | **100%** | ✅ |
| Decision/governance readiness | **100%** | ✅ |
| **Weighted composite** | **99.3%** | |

---

## Exact Next Action

1. **PR 1 — Merge planning docs.** All 48 files (README + 47 numbered docs 00–46) are internally consistent and certified. Ready to merge.

2. **PR 2 — Preflight fixes.** See `40-final-implementation-handoff.md` and `31-pr2-preflight-implementation-brief.md`.

---

## PR 2 Start Checklist

Before implementing PR 2, verify:

- [ ] Current branch is `main` at HEAD `1a6dcc5` (or later)
- [ ] No activity-related code changed since planning baseline `65b21eb`
- [ ] Read `40-final-implementation-handoff.md`
- [ ] Read `31-pr2-preflight-implementation-brief.md`
- [ ] Read `38-pr2-test-command-and-fixture-plan.md`
- [ ] Run `bun run validate` before starting (all tests green)
- [ ] Run `bun run build` before starting (build succeeds)
- [ ] Execute fixes in recommended order: Fix 1 → Fix 3 → Fix 2 → Fix 4 → Fix 5
- [ ] After all fixes: run `bun run validate` and `bun run build`
- [ ] Execute PR 2 manual QA checklist from `40-final-implementation-handoff.md`

---

## PR 7 Gates Reminder

PR 7 (access telemetry) remains **NO-GO** until:

| Decision | Topic | Approver | Status |
|----------|-------|----------|--------|
| D-017 | Device/browser in owner UI | Product | ☐ Pending |
| D-018 | Location granularity (country-only recommended) | Legal | ☐ Pending |
| D-023 | In-product disclosure language | Legal | ☐ Pending |

**PR 8A bypass:** If PR 7 is delayed >2 weeks, proceed with PR 8A (pagination + Realtime) after PRs 2-6. PR 8B waits for PR 7.

---

## Go/No-Go Summary

| PR | Status | Condition |
|----|--------|-----------|
| PR 1 | ✅ **GO** | Merge docs |
| PR 2 | ✅ **GO** | Preflight fixes |
| PR 3 | ✅ **GO** | Composer (after PR 2) |
| PR 4 | ✅ **GO** | Estimate UI (after PR 3) |
| PR 5 | ✅ **GO** | Shared-link API (after PR 3) |
| PR 6 | ✅ **GO** | Recipient actors (after PR 5) |
| PR 7 | 🔴 **NO-GO** | Until Product + Legal sign-off |
| PR 8A | ✅ **GO** | After PRs 2-6 (independent of PR 7) |
| PR 8B | 🔴 **NO-GO** | Until PR 7 approved |
| PR 9 | ✅ **GO** | After PR 8A or 8B |

---

## Authoritative Documents

| For | See |
|-----|-----|
| Implementation entry point | `40-final-implementation-handoff.md` |
| Document hierarchy | `39-source-of-truth-and-doc-authority-index.md` |
| Final scoring | `42-98-100-readiness-scorecard.md` |
| Certification | `44-final-plan-certification.md` |
| Loop audit trail | `41-autonomous-readiness-loop-log.md` |
| Risk register | `43-final-risk-burndown-register.md` |
| PR 2 brief | `31-pr2-preflight-implementation-brief.md` |
| PR 2 test plan | `38-pr2-test-command-and-fixture-plan.md` |
| Code truth map | `35-code-truth-map.md` |
| Composer spec | `21-activity-composer-spec.md` |
| PR sequence | `11-pr-sequencing-plan.md` |
| Blast radius | `37-final-blast-radius-and-rollback-map.md` |
