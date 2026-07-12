# 13 — Non-Static Gaps & Escalation Tracks

> Owner decision (2026-07-12): the audit's "100% quality" bar is **genuinely
> higher than static audit can prove**. This document names every gap that
> static code review + runtime commands *cannot* close, and routes each to the
> surface that can — provider/UX/legal execution tracks. Continuing to re-read
> the same code would not close these; they require their own evidence surfaces.
>
> This is the honest handoff. The static audit (rounds 1-4) is complete; the
> items below are the residual that earns its own tracks.

## Principle: match the evidence surface to the claim

Static audit proves claims about code. Runtime commands prove claims about
hosted config. But some claims are about **people, law, or external systems** —
and no amount of `rg` will resolve them. Those need their own evidence:

| Claim type | The only surface that can prove it |
|---|---|
| "A real user can complete the inbox→review→decision flow" | Browser/UX testing with real users |
| "The e-sign consent holds up in PH/US jurisdiction" | Counsel review |
| "Cloudflare Email actually delivers to PH recipients" | Provider delivery test |
| "The wrong-email UX is recoverable for first users" | UX research / usability test |
| "The redesign matches the projects-page polish" | Visual QA / browser comparison |

## Track 1 — Browser / UX testing (User Test Authorization Gate)

**What static audit cannot prove:** that the inbox renders correctly, the
Review→redirect flow works end-to-end, the status chips read correctly to a
human, the mobile layout is usable at 375px, the TanStack refresh actually
fires on window focus, and the decision chip propagates back from `/share/*`
after a real decision submit.

**Why it matters:** these are first-user-blocking if broken. The 27 code bugs
are found; the *behavior* of the assembled system is not verified.

**Owner gate:** per the **User Test Authorization Gate**, this requires your
explicit `TEST_TASK` request. The audit has recorded `TEST_PROPOSAL`s but none
have run.

**Concrete commands (run only when you authorize):**
- `bun run test:browser` (or the repo's Playwright surface) against `/workshop/proposals` — view, refresh, Review redirect, empty state, error state.
- Visual comparison: `/workshop/proposals` vs `/workshop/projects` card grid (closes the P3-1 redesign-gap verification).
- Mobile-width capture at 375px (closes P3-9 mobile-polish verification).

## Track 2 — Counsel / legal review (compliance claims)

**What static audit cannot prove:** that the e-sign flow satisfies ESIGN/UETA
(US) and RA 8792 (PH) for a *real* construction contract; that APAC-region D1
storage without a specific PH jurisdiction satisfies NPC IRR data-residency
guidance; that the privacy-removal path (P1-4) satisfies a real DSAR; that the
marketing disclaimer "We do not claim SOC2/GDPR/HIPAA/DPA compliance" is
sufficient for the beta user population.

**Why it matters:** `08` and `09` lay out the *norms* and the *code gaps*, but
the legal judgment (e.g. "is APAC-without-PH-jurisdiction enough?") is counsel's,
not the code's.

**Specific items needing counsel sign-off:**
- D-008 / D-009 in `.ai/01_roadmap/29-enterprise-mvp-scope-and-owner-defaults.md` — immutable proposals / PDF priority (already an owner decision).
- The retention schedule `OPEN-DEC-004` (`retention-core.ts` comments) — the schedule is a counsel-gated DRAFT.
- Whether `signature_intent_hash` + typed-name Accept is sufficient for the target contract value, or whether a QES provider (DocuSign/Adobe Sign) is needed pre-launch.
- Whether P1-4's anonymize-in-place (DEC-AUTO-111) satisfies the "right to erasure" for the beta population.

## Track 3 — Provider delivery / infrastructure verification

**What static audit cannot prove:** that Cloudflare Email (`EMAIL` binding)
actually delivers proposal invitations to PH recipient inboxes (not spam-foldered,
not bounced); that the three crons fire on schedule in production (static code
confirms the *wiring*; the platform firing is a Cloudflare SLA).

**Concrete owner-runnable checks:**
- **Email delivery:** publish a real proposal to a real external PH email; confirm receipt + open tracking fires (`project_publication_events` row appears). The bounce/complaint ingestion is already flagged `BLOCKED-EXTERNAL` in the active pack (awaiting a Cloudflare Email inbound webhook decision).
- **Cron execution history:** `bunx wrangler tail` during the 03:00 UTC window, or query `recordCronRunEvent` records in D1 (the worker logs each cron run, `worker.ts:209,245`). If a cron missed a run, it shows up there.
- **D1 region: VERIFIED** (`wrangler d1 info` → `running_in_region: APAC`, 2026-07-12). Counsel decides whether APAC satisfies the residency intent (Track 2).

## Track 4 — Domain-content review (RICS NRM / construction SME)

**What static audit cannot prove:** that the proposal snapshot's BOQ structure
(`snapshot_json`) is professionally adequate for a real construction cost
proposal; that the XLSX export's column layout / formula correctness matches
RICS NRM 2 measurement conventions; that "assumptions/exclusions" block (`08`
§1.4 recommended) covers what a QS reviewer expects.

**Why it matters:** a code-correct proposal that is *professionally incomplete*
(BOQ without exclusions) will be rejected by real estimators even if no bug
exists.

**Owner action:** have a QS / estimator reviewer (or Philip's domain judgment)
verify the snapshot + XLSX content against a real sample proposal. This is
domain judgment, not code.

## What this means for "100% quality"

You set the bar at "100% of all possible industry standard and startup domain
requirements." The honest accounting:

- **What the 4-round static audit + runtime commands achieved:** every
  code-level defect (27 bugs), every internal decision (13 DEC-AUTO), every
  static-resolvable fact (cron wiring, D1 region, bundle, authz, enumeration,
  privacy, retention, data integrity, i18n).
- **What it cannot achieve (and never could by reading code):** the 4 tracks
  above — browser/UX behavior, legal sufficiency, provider delivery, domain
  content. These are *categorically* outside static audit's reach.

If "100%" means "all code defects found + all internal decisions closed + all
static facts verified," **that bar is met** (rounds 1-4). If "100%" means "the
inbox is provably correct, legal, delivered, and professionally complete for
real users," **that bar requires Tracks 1-4** and is not achievable by another
audit round.

## Recommended next step

Pick a track to activate. The highest-leverage for beta is **Track 1
(browser/UX testing)** — it's the only one that can reveal integration bugs the
static audit cannot see, and it's gated on your `TEST_TASK` authorization. If
you authorize it, I can scope the exact Playwright/browser commands. If a
different track is more urgent, name it and I'll wire the exact handoff.
