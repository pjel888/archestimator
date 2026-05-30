# Owner Decision Packet — Approved Defaults Catalog

**Last updated:** 2026-05-30
**Status:** 21 of 32 decisions resolved. This document is now an approved defaults catalog rather than a pending-decision packet.

## Purpose

On 2026-05-30, Philip approved all recommended defaults for the 21 decisions that blocked Codex execution. This document catalogs those decisions, summarizes what remains unresolved, and maps decisions to unblocked goal cards.

The full decision register lives in `14-owner-decisions.md`. This packet is the compressed reference for Codex and other agents.

---

## Decisions Resolved in This Pass (2026-05-30)

All 21 decisions below are **DECIDED / APPROVED DEFAULT**. Decision source: Philip-approved roadmap default via roadmap improvement pass. All are reversible or reversible with cost.

### Top 10 (Primary Codex Blockers)

| Rank | Decision | Approved Default | Date | Reversibility | Goal Cards Unblocked |
|------|----------|------------------|------|---------------|---------------------|
| 1 | **Beta scope** (D-006) | Controlled invite-only beta, 5–8 known contractors, no public signup | 2026-05-30 | Reversible | All Waves 1-6 |
| 2 | **Staging Supabase/environment** (D-015) | Create separate staging Supabase project + Vercel staging/preview before external beta | 2026-05-30 | Reversible with cost | BETA-P0-INF-001, all SEC cards |
| 3 | **PDF before beta** (D-025) | Not required before beta. XLSX + shared links sufficient | 2026-05-30 | Reversible | BETA-P0-UX-002 |
| 4 | **Immutable issued proposals** (D-008) | Post-beta. Mutable XLSX sufficient for design-partner learning | 2026-05-30 | Reversible | POST-BETA-PROD-001 |
| 5 | **Persistent rate limiting** (D-004) | Redis-backed mandatory for beta. In-memory NOT acceptable | 2026-05-30 | Reversible with cost | BETA-P0-SEC-003 |
| 6 | **CAPTCHA provider** (D-004) | Cloudflare Turnstile for auth/magic-link endpoints | 2026-05-30 | Reversible with cost | BETA-P0-SEC-003 |
| 7 | **Mobile workshop** (D-027) | Desktop-only guard for beta and enterprise MVP | 2026-05-30 | Reversible | BETA-P0-REL-001, BETA-P0-UX-001 |
| 8 | **Package-builder beta scope** (D-028) | Optional, feature-flagged, not core activation path | 2026-05-30 | Reversible | BETA-P0-AI-001 |
| 9 | **Legal before beta** (D-014) | Minimum beta legal pack (written limitation disclosure). Full legal for public launch | 2026-05-30 | Reversible | BETA-P0-BETA-001 |
| 10 | **Analytics/instrumentation** (D-031) | Minimal first-party product events. Complex stack deferred | 2026-05-30 | Reversible | BETA-P0-OBS-001 |

### Secondary Decisions (11 More)

| Rank | Decision | Approved Default | Date | Reversibility | Goal Cards Unblocked |
|------|----------|------------------|------|---------------|---------------------|
| 11 | **Support channel** (D-011) | Email to Philip + lightweight tracker. No SLA, best-effort 24h | 2026-05-30 | Reversible | BETA-P0-BETA-001 |
| 12 | **Incident owner** (D-012) | Philip (solo founder). No escalation path for beta | 2026-05-30 | Reversible | All incident runbooks |
| 13 | **Rollback authority** (D-013) | Philip only. Vercel dashboard rollback | 2026-05-30 | Reversible | BETA-P0-INF-001 |
| 14 | **Launch jurisdiction** (D-001) | Invite-only non-public beta (US); final jurisdiction for public launch TBD | 2026-05-30 | Hard to reverse | Beta launch unblocked |
| 15 | **Pricing/payment timing** (D-010) | No paid beta. Free for design partners. Payment post-beta | 2026-05-30 | Reversible | Billing integration deferred |
| 16 | **Data residency** (D-019) | US (Supabase us-east). Final for public launch TBD | 2026-05-30 | Hard to reverse | Beta unblocked |
| 17 | **AI memory posture** (D-007) | Keep current: off by default, metadata-only ranking hints. Do not expand | 2026-05-30 | Reversible | BETA-P0-AI-001 |
| 18 | **Strict CSP timeline** (D-016) | Public launch hardening. Report-Only acceptable for beta | 2026-05-30 | Reversible with cost | Public launch security |
| 19 | **Preview protection** (D-005) | Vercel Authentication for staging/preview | 2026-05-30 | Reversible | BETA-P0-INF-001 |
| 20 | **Product analytics stack** (D-003) | First-party product events for beta; GA4/PostHog deferred | 2026-05-30 | Reversible | BETA-P0-OBS-001 |
| 21 | **@firecms/neat replacement** (D-017) | Enterprise MVP P1. Unblocks strict CSP for public launch | 2026-05-30 | Reversible with cost | Enterprise MVP + CSP |

---

## Decision → Goal Card Mapping (Unblocked)

Each resolved decision unblocks specific goal cards. Cards marked below are now `READY FOR CODEX`.

| Decision # | Decision | Blocks → Unblocked Goal Cards |
|------------|----------|------------------------------|
| 1 | Beta scope | All Waves 1-6 (determines scope of every card) |
| 2 | Staging Supabase | BETA-P0-INF-001, BETA-P0-SEC-001, BETA-P0-SEC-002, BETA-P0-OBS-001, BETA-P0-PERF-001 |
| 3 | PDF before beta | BETA-P0-UX-002 |
| 4 | Immutable proposals | POST-BETA-PROD-001 |
| 5 | Persistent rate limiting | BETA-P0-SEC-003 |
| 6 | CAPTCHA | BETA-P0-SEC-003 |
| 7 | Mobile workshop | BETA-P0-REL-001, BETA-P0-UX-001 |
| 8 | Package-builder scope | BETA-P0-AI-001 |
| 9 | Legal before beta | BETA-P0-BETA-001, PUBLIC-P0-LEGAL-001 |
| 10 | Analytics | BETA-P0-OBS-001 |
| 11 | Support channel | BETA-P0-BETA-001 |
| 12 | Incident owner | All runbook goal cards |
| 13 | Rollback authority | BETA-P0-INF-001 |
| 14 | Launch jurisdiction | PUBLIC-P0-LEGAL-001 |
| 15 | Pricing timing | No goal cards (post-beta) |
| 16 | Data residency | PUBLIC-P0-LEGAL-001 |
| 17 | AI memory | BETA-P0-AI-001 |
| 18 | CSP timeline | No beta goal cards (public launch) |
| 19 | Preview protection | BETA-P0-INF-001 |
| 20 | Product analytics | BETA-P0-OBS-001 |
| 21 | neat replacement | Enterprise MVP cards |

---

## What Unblocks Now

With all 21 decisions resolved, these goal cards are now ready for Codex:

| Wave | Cards Now Ready | Priority |
|------|----------------|----------|
| **Wave 1: Infrastructure** | BETA-P0-INF-001 (staging setup) | Execute first |
| **Wave 2: Security** | BETA-P0-SEC-001 (RLS denial), BETA-P0-SEC-002 (storage isolation), BETA-P0-SEC-003 (auth hardening + rate limiting + Turnstile) | Execute after staging |
| **Wave 3: Beta Readiness** | BETA-P0-BETA-001 (beta go/no-go + legal pack), BETA-P0-REL-001 (desktop guard) | Execute alongside security |
| **Wave 4: UX Validation** | BETA-P0-UX-001 (onboarding), BETA-P0-UX-002 (core estimating UX) | Execute after security evidence |
| **Wave 5: AI** | BETA-P0-AI-001 (package-builder scope) | Execute after core UX validated |
| **Wave 6: Observability** | BETA-P0-OBS-001 (analytics + APM instrumentation) | Execute throughout |

**16 goal cards are now READY FOR CODEX** (of 26 total). 1 is READY FOR HUMAN EXTERNAL SETUP. 3 are READY FOR CODEX AFTER EXTERNAL SETUP. 5 remain in planning or blocked for public-launch-only decisions.

---

## Decisions Still Unresolved for Public/Paid Launch

These decisions do NOT block beta or Codex execution. They are required before public launch or paid plans.

| ID | Decision | Why Unresolved | Target Resolution |
|---|---|---|---|
| D-001 (final) | Final incorporation/jurisdiction | Delaware C-corp recommended; legal counsel needed to finalize | Before public launch |
| D-002 | Final legal counsel path | Privacy Notice + Terms need formal legal review | Before public launch |
| — | Final customer DPA posture | Data Processing Agreement for enterprise customers | Before first paid customer |
| — | Payment/tax details after billing | Stripe integration, sales tax, VAT | Before payment activation |
| D-019 (final) | Public launch geography | Data residency for non-US users | Before public launch |
| — | Enterprise SLA | SLA terms for paid tiers | Before paid plans |
| D-018 | Student/minor posture | COPPA/GDPR children's data | Before public launch |
| D-020 | Open source vs proprietary | No near-term decision needed | Deferred |

---

## How to Use This Packet

1. **Philip reads and confirms.** All decisions in "Decisions Resolved in This Pass" above are approved defaults. No further action needed.
2. **Codex proceeds.** With all 21 decisions resolved, Codex may execute goal cards per `23-codex-goal-execution-plan.md`.
3. **Start Codex `/goal` with Wave 1** — BETA-P0-INF-001 (staging infrastructure setup).
4. **Proceed wave by wave.** See the "What Unblocks Now" section above.
5. **Unresolved public launch decisions** remain in the "Decisions Still Unresolved" section. Codex should not block on these.

## If Philip Is Unavailable

Codex may proceed with any goal card whose dependent decisions are marked `DECIDED` in this catalog. All 21 decisions resolved in this pass unblock their dependent cards. Codex should still STOP if it encounters an implementation question that requires owner judgment.

Previously, Codex was blocked on all 18 goal cards. After Atomic Split Edition (78 atomic cards + 15 EPIC headers), the goal-card structure has been reorganized. See 26-codex-goal-cards.md for current atomic card statuses.

---

## Quick Reference: What Was Resolved

| Metric | Before (2026-05-29) | After (2026-05-30) |
|---|---|---|
| Decisions pending | 32 | 11 |
| Decisions resolved | 0 | 21 |
| Top 10 blocking Codex | 10 pending | 0 pending (all resolved) |
| Beta launch blocked? | Yes (17 decisions) | No (0 decisions) |
| Goal cards unblocked | 0 of 18 | 16 of 26 |

---

## Key Dates

| Date | Event |
|---|---|
| 2026-05-30 | 21 decisions resolved in roadmap improvement pass |
| TBD | Wave 1 execution (BETA-P0-INF-001) |
| TBD | Remaining public launch decisions (D-001 final, D-002, D-018, D-019) |
| TBD | Payment/tax details, DPA, enterprise SLA (post-beta) |

---

> **Note:** This was previously the "pending decisions" packet. It is now an **approved defaults catalog**. Philip has accepted all recommended defaults. Codex may proceed with implementation. See `14-owner-decisions.md` for the full register of all 32 decisions.
