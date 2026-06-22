# 18 — Adversarial Review

A deliberate attempt to **break** the root cause (doc 02) and the roadmap (doc 05)
before the owner spends any implementation effort. Each challenge: the attack,
the verdict (SURVIVES / MODIFIES / KILLS), and the residual risk if any.

## Challenge 1 — "The 6-skeleton cascade is a hard-nav artifact; the owner's daily pain is client-nav, where layouts don't even re-run"

**Attack:** L3 proved layouts are **Router-Cached for 60 s** on warm client-nav
(`staleTimes.dynamic=60`). So the "6-layer cascade" (Root cause A) only fully
unfolds on F5/first-load/cross-project. If the owner's actual complaint comes
from clicking into a sheet (client-nav), then the cascade they *see* is really
just **the list-skeleton (Root cause B) + the >150 ms overlay**, and the layout
waterfall (Phase 5) is nearly irrelevant to their daily experience.
**Verdict: MODIFIES.** The root cause is still correct (all causes are real), but
the roadmap's emphasis is off — Phase 5 (layouts) is over-weighted for the
everyday case.
**Action:** Phase 0 baseline must instrument **both** nav modes and confirm which
the owner actually hits. If client-nav dominates, descope Phase 5 to "fresh-nav
polish" and keep Phases 1–4 as the core. (Already reflected in the roadmap's
cross-cutting note; elevate it to a decision point.)

## Challenge 2 — "Fixing skeletons is cosmetic; if the nav were fast, no skeleton would be visible long enough to notice"

**Attack:** the overlay only shows >150 ms; skeletons only register if they're up
long enough. So the *visible* complaint is downstream of the *latency* complaint
(Root causes C/E). Phase 1 (leaf skeleton) is then just makeup; Phases 2/4/5 are
the real cure.
**Verdict: PARTIALLY SURVIVES.** True that latency is the deeper cause. But
**false that the skeleton fix is cosmetic**: (a) the owner explicitly called the
skeletons "bad practice" — a *correct* skeleton is a real quality fix; (b) even a
fast nav flashes a *wrong-shaped* skeleton (list-for-sheet), which is jarring
however brief; (c) the leaf-loading fix is zero-blast-radius and the team already
anticipated it. Keep Phase 1, but be honest it's the *visible* win, not the *perf*
win.
**Action:** roadmap already frames it this way (Phase 1 = "most visible win").
No change; just don't let Phase 1's shipping mask an unfinished perf job.

## Challenge 3 — "All your numbers are dev→hosted-Supabase; in-region on Vercel the 5-RTT waterfall is ~50 ms and there may be no real prod problem"

**Attack:** L6's TTFB 2 s / LCP 7.1 s are local-dev, network-bound. The whole
audit could be over-engineering a dev-only artifact.
**Verdict: MODIFIES (the strongest challenge).** The structural problems
(await-gating, no streaming, wrong skeleton, chunk→query waterfall) are real
regardless of region. But the *magnitude* and the ROI of Phases 4/5 depend on
the in-region number.
**Action:** **Phase 0 must include a Vercel in-region measurement** before
committing to Phases 4–5. If in-region LCP is already <2.5 s, descope 4a/5 to
"nice-to-have" and ship only 1–3. This is the single most important gate in the
pack. (Roadmap states this; make it a hard stop, not a footnote.)

## Challenge 4 — "Phase 4a (tab-scoped rows) needs a schema change for a perf optimization — that's disproportionate"

**Attack:** 4a is **UNVERIFIED** on `estimate_row_items.estimate_tab_id` existing,
and a migration = HIGH blast (DB). A migration to save one serial hop is a bad
trade.
**Verdict: KILLS 4a as a default; keeps it conditional.**
**Action:** drop 4a from the default roadmap. Only resurrect it if (a) the column
already exists (no migration), AND (b) Phase 0's `[perf-json]` proves the rows
query is actually the dominant span. Keep 4b (the safe `cache()` dedupe). Edit
doc 05's Phase 4 to reflect this.

## Challenge 5 — "Phases 2 and 4 rely on `cache()` memoization and streaming behavior that have NO test today (doc 14) — shipping them blind is reckless"

**Attack:** L5 found zero tests for the skeleton sequence and zero tests asserting
the `cache()` dedupe. Phases 2 (stream tail) and 4 (parallelize) assume both.
**Verdict: MODIFIES — elevate the tests.**
**Action:** move the skeleton-sequence test and the `cache()`-memoization test
from Phase 8 (hygiene) into **Phase 0/1** — write them alongside the baseline
and the new loading file, so Phases 2/4 are built on a tested foundation.

## Challenge 6 — "The team already knew about the skeleton mismatch (code comment) — why is it unfixed? Maybe the sheet shape isn't stable enough to mirror"

**Attack:** `ProjectEstimatesListSkeleton.tsx:3-6` documents the team is aware.
If it's unfixed because the glass sheet shape is still in flux, a mirror skeleton
will immediately drift.
**Verdict: SURVIVES with a check.** [[glass-estimate-sheet-redesign]] says the
glass sheet is shipped and glass-scoped (at `/newdesign`), so the shape is
stable enough.
**Action:** Phase 1 should mirror the *currently-live* sheet shape and reuse its
real layout classes (the established no-drift pattern). Confirm with Philip the
shape is settled before building the skeleton.

## Challenge 7 — "Phase 3 (stream the library) just moves a skeleton, and might re-gate first paint"

**Attack:** L4's C1 (put library in Block 1) would re-gate first paint — the page
comment explicitly defers it to avoid exactly that. And streaming it behind a new
Suspense boundary only helps if the library sidebar is NOT the LCP element.
**Verdict: MODIFIES.**
**Action:** roadmap already steers to "separate Suspense boundary, not Block 1."
Add an explicit Phase-3 check: confirm the component-library sidebar is not the
LCP element before splitting it into its own stream (else LCP regresses). If it
is LCP, keep it but ensure it streams (doesn't block the shell).

## Challenge 8 — "PPR / Cache Components (Phase 6b) is scope creep masquerading as a fix"

**Attack:** PPR requires a repo-wide Cache Components migration with changed
caching defaults — huge blast radius for a symptom that Phases 1–4 already fix.
**Verdict: KILLS from the critical path (already deferred).** L7 correctly scoped
it to stretch. Confirm it stays orthogonal and doesn't get pulled in.

## Challenge 9 — "Is the `RouteLoadingOverlay` part of the problem?"

**Attack:** should we rip it out / change it?
**Verdict: SURVIVES — leave it alone.** It's well-debounced (150 ms show, 250 ms
min-visible, 10 s safety) and `aria-hidden`s the shell correctly. It's a
*symptom* of slow nav, not a cause. Once Phases 1–4 make the sheet nav fast, the
overlay will rarely trigger, and when it does it'll sit over the *correct*
skeleton. No overlay change is warranted. (Roadmap correctly doesn't touch it.)

## Surviving residual risks (carry to implementation)

1. **In-region magnitude unknown** — Phase 0 Vercel measurement is the gate for
   Phases 4/5 (Challenge 3).
2. **Owner's actual nav pattern unknown** — client-nav vs hard-nav determines
   whether Phase 5 matters (Challenge 1).
3. **4a is schema-gated** — default to dropped unless proven (Challenge 4).
4. **Sheet-shape stability** — confirm with owner before mirroring (Challenge 6).
5. **Library-as-LCP** — verify before Phase 3 split (Challenge 7).
6. **Test foundation** — skeleton-sequence + `cache()` tests are prerequisites,
   not hygiene (Challenge 5).

## Net effect on the plan

The root cause (doc 02) **survives** — all five causes are real and evidenced.
The roadmap **tightens**:
- Phase 0 adds a **Vercel in-region** measurement + the two missing tests.
- Phase 1 stays first (lowest risk, highest visibility).
- Phase 4 **drops 4a by default** (schema-gated); keeps 4b.
- Phase 5 is **conditional** on the owner hitting fresh-nav pain.
- Phase 6b (PPR) stays deferred.

**Confidence:** the diagnosis is high-confidence and evidence-backed; the *prescription's
ROI* is gated on two Phase-0 measurements (in-region latency, nav pattern) that the
owner controls. This is an honest plan, not a over-built one.
