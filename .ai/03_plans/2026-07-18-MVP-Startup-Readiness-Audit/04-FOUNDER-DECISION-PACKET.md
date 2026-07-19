# 04 — Founder Decision Packet

Audit commit `a41a07d01`. Per master prompt §13.4 and Frontier-Planning-Kernel
§4, this packet contains only decisions that genuinely require Philip —
irreversible, destructive, paid, credential-gated, external-production, or
materially scope-changing. Everything else has been downgraded to autonomous
`DEC-AUTO-*` records in `00-PLAN.md` §6 and resolved from current evidence.

**2nd-pass scope reduction (DEF-14, DEF-17..23):** the 1st pass listed 12
founder decisions. Seven of those were ordinary reversible choices and are now
`DEC-AUTO-*` records (lead-capture shape, product-event emitter scope,
`seed.json` disposition, `health_reviewed` resolution, Stage A proposal
surface, Stage C payment channel, uptime monitor vendor). FD-12 (cohort pause
authority) was removed entirely — by definition a non-decision.

**Four genuine founder decisions remain** (the schema has no `FD-*` slot; they
live here as narrative):

- **FD-01** Beachhead segment confirmation (recruiting real external humans).
- **FD-06** Founder-member offer terms (external pricing commitment).
- **FD-07** Paid value metric / entitlement boundary (paid boundary).
- **FD-09** Counsel engagement (external paid relationship).

Each: why it matters now, options, recommended default, evidence, cost of
delay, latest responsible decision date, what stays reversible.

---



## FD-01 · Beachhead segment confirmation

- **Decision:** Confirm the solo/freelance PH cost estimator or QS as the
  primary beachhead (verdict §2), and explicitly exclude mid+ firms, suppliers,
  and pure interior-design practices from cohort 1.
- **Why it matters now:** Recruiting, copy, and the activation script all
  depend on the segment. Wrong segment = wasted cohort.
- **Options:**
  - (a) Solo/freelance cost estimator or QS (recommended);
  - (b) Solo architect / small architectural practice;
  - (c) Small fit-out contractor;
  - (d) Multi-segment.
- **Recommended default:** (a), with (b) as a 1–2-slot secondary.
- **Evidence:** `01-CAPABILITY-AND-GAP-AUDIT.md` §A scoring table.
- **Cost of delay:** every day of recruiting is a day against the wrong
  segment if this is wrong.
- **Latest responsible decision date:** before any outreach.
- **What stays reversible:** segment can be narrowed again after cohort 1.

## FD-02 · (DEC-AUTO-001) Lead-capture shape

**Downgraded from founder decision in 2nd pass (DEF-17).** Resolved autonomously:
build `beta_access_requests` + server action. Evidence is one-sided (mailto
demonstrably loses leads; one D1 table is the smallest coherent scope).
Reversible (schema migrates). See `00-PLAN.md` DEC-AUTO-001 and UNIT-001.

## FD-03 · (DEC-AUTO-002) Product-event emitter scope

**Downgraded (DEF-18).** Resolved autonomously: local D1 `product_events`
table, 8 events, no external SDK. GA4 is already mounted for landing; the gap
is first-party funnel events. PostHog backfill is reversible. See DEC-AUTO-002
and UNIT-002.

## FD-04 · (DEC-AUTO-004) Sample-data path

**Downgraded (DEF-19).** Resolved autonomously: delete `data/local/seed.json`.
Negative grep confirms zero importers in `src/`. Kernel §4 mandates dead-code
deletion as the default. See DEC-AUTO-004 and UNIT-012.

## FD-05 · (DEC-AUTO-005) `health_reviewed` milestone

**Downgraded (DEF-20).** Resolved autonomously: wire the producer if a
health-review UI call site exists in source, else remove from
`ACTIVATION_MILESTONES`. A 5-minute grep determines which; either branch is
reversible. See DEC-AUTO-005 and UNIT-003.

## FD-06 · Founder-member offer terms

- **Decision:** Define the founder-member offer: discount %, lock period,
  founding-member cap, what is included.
- **Why it matters now:** Pricing conversations need a concrete ask by week 4.
- **Options:** (illustrative)
  - (a) 50% off published price, locked 12 months, cap 10 founders (recommended
    placeholder);
  - (b) Flat ₱499/month founding rate, locked 24 months;
  - (c) Free for cohort 1, paid from cohort 2.
- **Recommended default:** (a) — the actual number waits on Van Westendorp
  (M4-03).
- **Evidence:** `01-…md` §H; `03-…md` §D.
- **Cost of delay:** pricing conversations drift without a concrete ask.
- **Latest responsible decision date:** before week-4 pricing interviews.
- **What stays reversible:** yes — offer terms can change before publication.

## FD-07 · Value metric / entitlement boundary

- **Decision:** What is the paid value metric? Candidate: library item count
  (recommended) vs estimates created vs seats vs BOQ rows.
- **Why it matters now:** M5-01 entitlement schema depends on it.
- **Options:**
  - (a) Library item count (recommended; rewards the moat);
  - (b) Active projects;
  - (c) Seats;
  - (d) BOQ rows / estimates — **reject** (taxes the core loop).
- **Recommended default:** (a) with Free cap at ~50 library items, 1 active
  project, no custom export branding.
- **Evidence:** `01-…md` §H.
- **Cost of delay:** none until M5-01.
- **Latest responsible decision date:** before first pricing conversation.
- **What stays reversible:** yes — caps can adjust.

## FD-08 · (DEC-AUTO-007) Payment channel for Stage C

**Downgraded (DEF-21).** Resolved autonomously: GCash + bank transfer
(PH-native, lowest friction). Deferred until first willing payer. Reversible.
See DEC-AUTO-007.

## FD-09 · Legal counsel and subprocessor disclosure

- **Decision:** Engage counsel for Terms review; complete the subprocessor list
  (Cloudflare + Google at minimum); state PH data residency.
- **Why it matters now:** Terms status is `closed_beta_owner_approved_pending_counsel_review`
  (`terms-content.ts:148-157`); Google omission is a real disclosure gap.
- **Options:**
  - (a) Engage PH counsel now (recommended before paid);
  - (b) Use a templated Terms review service;
  - (c) Defer until first paying user.
- **Recommended default:** (a), scheduled before M5-02.
- **Evidence:** `01-…md` §J (Lens J).
- **Cost of delay:** paid-launch legal exposure.
- **Latest responsible decision date:** before asking for payment.
- **What stays reversible:** copy changes are reversible.

## FD-10 · (DEC-AUTO-008) Uptime monitor vendor

**Downgraded (DEF-22).** Resolved autonomously: Better Stack free tier.
Commodity SaaS choice, reversible. Deferred to Stage C (UNIT for M5-03 is not
in the executable backlog). See DEC-AUTO-008.

## FD-11 · (DEC-AUTO-006) Proposal surface consolidation

**Downgraded (DEF-23).** Resolved autonomously for Stage A: legacy shared
link is canonical (simpler, BOQ-XLSX-coupled, ships today). Client Portal
consolidation deferred to Stage C. See DEC-AUTO-006.

## FD-12 · (REMOVED) Cohort pause / kill authority

**Removed in 2nd pass (DEF-14).** By definition not a decision (only one
option). Pause criteria live in `03-…md` §E and are adopted verbatim; Philip
retains sole pause authority by default as the founder.

---

---

## Decisions NOT requiring Philip (resolved by source evidence or ordinary execution)

For completeness, the following items from the audit are **not** in the
founder-decision packet because they can be resolved by execution:

- M1-03 Beta health card UI shape — direct implementation.
- M1-04 Backup PITR enablement — operational, follows Cloudflare D1 docs.
- M1-05 Beta agreement copy — execution once offer terms (FD-06) are set.
- M2-01 Activation checklist mount — direct implementation.
- M2-02 First-session default — direct implementation.
- M2-03 Founder notification wiring — direct implementation.
- M2-05 Founder-ops runbook — documentation.
- M3-01 Library import — direct implementation through this pack's UNIT-005/006;
  the quality master marks old `IMPROVE-031` as duplicate/external-owner work.
- M3-02 Retention metrics — direct implementation.
- M3-03 Contractor profile — direct implementation.
- M4-01 Feedback synthesis cadence — operational.
- M4-02 / M4-03 Interview scripts — documentation.
- E-01 Row-total divergence fix — engineering, owned by the consistency audit.

Per master prompt §13.4: do not ask Philip to decide things that source
evidence or ordinary execution can resolve.
