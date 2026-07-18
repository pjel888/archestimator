# 04 — Founder Decision Packet

Audit commit `a41a07d01`. Per master prompt §13.4, this packet contains only
decisions that genuinely require Philip. Everything else in this audit can be
resolved by source evidence or ordinary execution.

Twelve decisions. Each: why it matters now, options, recommended default,
evidence, cost of delay, latest responsible decision date, what stays
reversible.

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

## FD-02 · Lead-capture vs mailto continuation

- **Decision:** Build `beta_access_requests` + server action (M1-01), or
  continue with mailto + spreadsheet for cohort 1.
- **Why it matters now:** Every recruited partner without it = lost signal on
  source attribution and qualification.
- **Options:**
  - (a) Build M1-01 before outreach (recommended);
  - (b) Defer to cohort 2; use spreadsheet for cohort 1.
- **Recommended default:** (a). The cost is ~1 founder-day; the value is
  permanent.
- **Evidence:** `01-…md` §C; verdict §12.
- **Cost of delay:** none if built before outreach; otherwise cohort-1
  attribution is gone.
- **Latest responsible decision date:** before any outreach.
- **What stays reversible:** table schema can evolve; existing rows migrate.

## FD-03 · Product-event emitter scope

- **Decision:** Approve the narrow 8-event emitter (M1-02) writing to a local
  D1 `product_events` table, versus deferring analytics entirely, versus
  adopting an external SDK (GA4 / PostHog).
- **Why it matters now:** Without any instrumentation, every later decision is
  guesswork.
- **Options:**
  - (a) Local D1 table, 8 events, no external SDK (recommended);
  - (b) Defer all analytics to cohort 2;
  - (c) Adopt PostHog or GA4 now.
- **Recommended default:** (a). Local table avoids external dependency,
  keeps PII inside D1, and is sufficient for Stage A/B volume.
- **Evidence:** `01-…md` §F; `03-…md` §C and §F.
- **Cost of delay:** every cohort-1 user is a missing data point.
- **Latest responsible decision date:** before user #1.
- **What stays reversible:** yes — events can be backfilled into PostHog later
  by exporting the table.

## FD-04 · Sample-data path

- **Decision:** Delete `data/local/seed.json`, wire it as a real auto-seed on
  first workspace, or leave it as dead weight.
- **Why it matters now:** Confuses developers; blocks M2-02 clarity.
- **Options:**
  - (a) Delete `seed.json`; rely on `startGuidedSample()` only (recommended);
  - (b) Wire `seed.json` as a workspace-template option in `FirstProjectZeroState`;
  - (c) Leave it.
- **Recommended default:** (a) unless you want a "Workspace template" option
  distinct from the guided sample — then (b).
- **Evidence:** `01-…md` §D; library census confirms `seed.json` has no
  runtime loader.
- **Cost of delay:** low; mostly developer confusion.
- **Latest responsible decision date:** before M2-02.
- **What stays reversible:** yes.

## FD-05 · `health_reviewed` milestone

- **Decision:** Wire the emitter (M2-01) or remove the milestone from the
  taxonomy.
- **Why it matters now:** Distorts the cohort funnel view forever otherwise.
- **Options:**
  - (a) Wire the emitter at the health-review action call site (recommended);
  - (b) Remove from `ACTIVATION_MILESTONES` and `activation-producer-contract.ts:26`.
- **Recommended default:** (a) if "estimate health review" is a real user
  action; (b) if it was aspirational and no such UI exists.
- **Evidence:** `01-…md` §F; activation census.
- **Cost of delay:** low but compounds in the funnel view.
- **Latest responsible decision date:** before user #1.
- **What stays reversible:** yes.

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

## FD-08 · Payment channel for Stage C

- **Decision:** Which payment channels does the first manual-invoiced payment
  use? GCash, bank transfer, PayPal, Wise, Stripe-Link?
- **Why it matters now:** Affects the manual-invoice helper UX and the
  Philippines tax/accounting posture.
- **Options:**
  - (a) GCash + bank transfer (PH-native; recommended for first paying users);
  - (b) PayPal / Wise (international-ready);
  - (c) Stripe (defers Stage C).
- **Recommended default:** (a).
- **Evidence:** `01-…md` §H, §K.
- **Cost of delay:** none until first willing payer.
- **Latest responsible decision date:** when the first user names a budget.
- **What stays reversible:** yes.

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

## FD-10 · Uptime monitor vendor

- **Decision:** Pick an external uptime monitor for M5-03.
- **Options:**
  - (a) Better Stack (recommended; generous free tier, status page);
  - (b) UptimeRobot;
  - (c) Checkly (active probes).
- **Recommended default:** (a) or (b).
- **Evidence:** `01-…md` §J.
- **Cost of delay:** low for Stage A; high for paid.
- **Latest responsible decision date:** before paid launch.
- **What stays reversible:** yes.

## FD-11 · Proposal surface consolidation

- **Decision:** Pick the canonical proposal surface: legacy shared link or
  Client Portal.
- **Why it matters now:** Two parallel surfaces diverge on immutability,
  decisions, and complexity. Maintenance and trust clarity suffer if both
  ship long-term.
- **Options:**
  - (a) Make Client Portal canonical; deprecate legacy shared link (recommended
    for paid; richer features);
  - (b) Keep legacy shared link canonical; hide Client Portal behind a flag;
  - (c) Maintain both indefinitely (reject).
- **Recommended default:** (b) for Stage A (legacy is simpler, ships today),
  then (a) before paid.
- **Evidence:** `01-…md` §L; collaboration/share census.
- **Cost of delay:** low until maintenance burden grows.
- **Latest responsible decision date:** before paid launch (M5-05).
- **What stays reversible:** yes.

## FD-12 · Cohort pause / kill authority

- **Decision:** Philip retains sole authority to pause or kill the cohort on
  the criteria in `03-…md` §E (trust failure, support-capacity breach, low
  retention, legal escalation).
- **Why it matters now:** Without explicit authority, the team (or future
  agents) may try to "fix through" a pause-worthy event.
- **Options:** (only one) explicit pause authority resting with Philip.
- **Recommended default:** adopt the pause criteria verbatim.
- **Evidence:** `03-…md` §E.
- **Cost of delay:** low; high value if a trust event occurs.
- **Latest responsible decision date:** before user #1.
- **What stays reversible:** a pause is reversible; a kill triggers an exit
  interview round.

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
- M3-01 Library import — direct implementation (already scoped in
  `2026-07-18-Codebase-Improve-Audit-Plan-Pack/031-spike-library-bulk-import.md`).
- M3-02 Retention metrics — direct implementation.
- M3-03 Contractor profile — direct implementation.
- M4-01 Feedback synthesis cadence — operational.
- M4-02 / M4-03 Interview scripts — documentation.
- E-01 Row-total divergence fix — engineering, owned by the consistency audit.

Per master prompt §13.4: do not ask Philip to decide things that source
evidence or ordinary execution can resolve.
