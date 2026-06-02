# 32 — Final Implementation Readiness Scorecard

**Date:** 2026-06-02
**Status:** Sixth pass — autonomous readiness loop final scoring
**Current HEAD:** `65b21eb`

**⚠️ Sixth-pass corrections:** HEAD updated `da35386` → `65b21eb`. All "13 event types" references corrected to "14". Document count updated to 46 total.

---

## Scorecard

| Area | Status | Why | Required action |
|------|--------|-----|-----------------|
| **Product strategy** | 🟡 Yellow | North Star, user journeys, and surface maps are comprehensive. But 5 open product decisions (P1-P5 in doc 28) need sign-off before access telemetry ships. | Product stakeholder review of doc 28 §6. Approve P1-P5. |
| **UX/Copy** | 🟢 Green | 14 estimate event types + shared-link types all have copy templates. Activity Composer spec is implementation-ready. Copy dictionary covers all surfaces. | None — proceed with PR 3 (composer module). |
| **Privacy/Legal** | 🔴 Red | 5 legal/privacy decisions (L1-L5) are open. Access telemetry collects IP hashes, parsed device metadata, and approximate location — all require legal review before collection begins. Location granularity, retention policy, and in-product disclosure are not yet approved. | Legal/Privacy review of doc 28 §6. Approve L1-L5. **Gate: PR 7 (access telemetry) MUST NOT proceed without L1-L5 approved.** |
| **Security** | 🔴 Red → 🟡 Yellow after PR 2 | Two live CSRF bugs in production: (1) `GET /api/share/[token]/activity` uses POST-only CSRF check — always 403 for browsers. (2) `SharePageComments` and `SharePageDecision` hardcode CSRF header `"client-post"` without setting cookie — 3 fetch paths affected. No data leakage vectors identified. Internal comment isolation is defense-in-depth. | Fix CSRF issues in PR 2 (preflight). See doc 31 for fix details and doc 38 for test plan. After fixes: 🟢 Green. |
| **Data model** | 🟢 Green | V1 copy-only composer needs zero DB changes. V1.1 access telemetry uses existing `metadata_json` columns — no migration needed. Enum/CHECK additions deferred to V2. Event taxonomy is finalized. | None for V1.0. For V1.1: ensure GIN index on `metadata_json` if query performance is needed (optional). |
| **Performance** | 🟢 Green | Composer is a pure projection layer — O(n) per event, negligible overhead. Access telemetry adds one DB write per page view — already at ~1 write per page load. GIN index optional for metadata_json queries. Pagination fixed in PR 8. | Verify index coverage in PR 8. |
| **Accessibility** | 🟢 Green | Planned: role="feed", role="article", aria-live for new activity, keyboard navigation for audit expand/collapse, screen reader testing. | Execute in PR 9. |
| **Test coverage** | 🟢 Green | ~100 composer tests, ~25 access telemetry tests, ~15 copy regression tests, ~12 security tests, existing UI tests preserved. Test-first strategy in doc 08. | Execute test plan in each PR. |
| **Manual QA** | 🟢 Green | Comprehensive QA matrix in doc 18. Covers estimate activity, shared-link activity, access telemetry, accessibility. Verification protocols defined. | Execute in PR 9. |
| **PR sequencing** | 🟢 Green | 9-PR sequence defined with clear dependencies. PRs 1-6 unblocked (no privacy dependencies). PR 7 gated on stakeholder sign-off. Merge-safe: each PR independently revertible, <500 lines. | Follow sequence. Do not reorder. |
| **Observability** | 🟡 Yellow | Doc 17 defines metrics but no runtime monitoring is in place. Composer errors, access telemetry write failures, and CSRF failures need logging. | Add structured logging for composer errors and access telemetry writes in PR 7. Add error rate monitoring before production deploy. |
| **Migration safety** | 🟢 Green | V1.0: zero migrations. V1.1: zero migrations (metadata_json only). V2: additive migrations only. No backfill needed. Existing event tables preserved. | None for V1.0/V1.1. |

---

## Overall Go/No-Go

### GO ✅ — Documentation merge (PR 1)
All 46 planning documents are internally consistent after sixth-pass autonomous readiness loop. The planning pack is comprehensive, accurate, and stakeholders can review with confidence.

### GO ✅ — PR 2 (Preflight bug fixes)
Small, low-risk fixes. No privacy dependencies. Fixes known bugs identified in second and third passes. Safe to ship immediately after docs approval.

### GO ✅ — PRs 3-6 (Composer + UI integration)
No privacy impact. No new data collection. Pure copy improvements. Can proceed without stakeholder sign-off on access telemetry decisions.

### NO-GO 🔴 — PR 7 (Access telemetry) until:
- [ ] Product approves P1-P5 (doc 28 §6)
- [ ] Legal/Privacy approves L1-L5 (doc 28 §6)
- [ ] Privacy policy updated to include access logging disclosure
- [ ] Location granularity decision finalized (country-only recommended default)
- [ ] Device/browser display decision finalized (audit details recommended)
- [ ] Bot filtering approach confirmed
- [ ] In-product disclosure decision finalized

### GO ✅ — PRs 8-9 (Hardening + Polish)
After PR 7 is unblocked and shipped, these PRs proceed normally.

---

## What Changed from Third Pass

| Third pass claim | Fourth pass correction |
|-----------------|----------------------|
| "All 27 documents are internally consistent" | **False.** 15 contradictions found and resolved (see doc 30). |
| "No migration for V1.1 access telemetry" | **Clarified.** metadata_json = no migration. Enum/CHECK additions = migration (deferred to V2). |
| Current HEAD `d78686f` | Updated to `405d6ac`. No activity code changed. |
| "Client-facing activity feed planned" | **Clarified.** No client feed exists today. Deferred to V2. |
| "Server-side cookie in page.tsx" | **Corrected.** Feasible but current client-side flow is fine. Recommendation: keep client-side session init, use dedupe in UI. |
| "/events route for access telemetry beacons" | **Corrected.** /events requires CSRF setup not available to most components. Server-side recording preferred for access events. |
| Activity route CSRF not mentioned | **Critical finding.** GET route is broken — calls POST-only CSRF check. Fix in PR 2. |

---

## Cross-References

- See `28-fourth-pass-stakeholder-review-packet.md` for stakeholder-friendly summary
- See `29-final-decision-log-and-approval-matrix.md` for all decision statuses
- See `30-final-technical-reconciliation-audit.md` for contradiction details
- See `31-pr2-preflight-implementation-brief.md` for PR 2 execution plan
- See `33-stakeholder-review-script.md` for meeting facilitation guide
