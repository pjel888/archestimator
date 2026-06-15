---
title: Executive Summary & Ratings — Express Components 3rd-Pass Audit
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
---

# Executive Summary & Ratings

## Verdict

The pass-2 remediation was **genuinely excellent**: independent ground-truth verification (16
agents, every RPC cited at its latest definition) confirms **all 14 pass-2 findings (V1
retracted) and all 3 strategic decisions (S0.1–S0.3) were absorbed correctly and coherently**
(absorption 92/100), with **no false-positive repeats and no V1-class stale-migration errors**.
The plan is now document-complete, internally coherent on its load-bearing narrative, and its
core architecture (no new table, U3 no-migration, row-lifetime express id, day-0 cut to
U1–U4) is verified sound.

By auditing **one layer deeper into the actual code than the doc-focused passes 1–2**, this
pass surfaced a new, coherent class of issue: **the plan describes several behaviors as
already-handled that the codebase does not actually have.** The five clearest, each
adversarially confirmed against live code:

1. **DB-N1 (P1, day-0 security):** the express insert/update/replace server actions never call
   `assertCanEditEstimate`, and the underlying RPC checks only workspace *membership* — so a
   workspace **viewer can write express rows**, directly contradicting R14/AE10 ("server
   actions reject mutation attempts"). *Verified by the orchestrator directly:* the gate exists
   (`actions.ts:360`) and is used by 7 other actions but not by the 3 express ones (`:2493/:2561/:2586`).
2. **SEC-N2 (P1):** doc 11's entire "Realtime Model" assumes a `postgres_changes` row-sync path
   that **does not exist** (no subscription anywhere; `refetchType:'none'`, staleTime 5 min) —
   peers do not see each other's express rows live.
3. **BR-N2 (P1):** the plan repeatedly asserts project-source copy *rekeys* the express id, but
   the copy RPC copies metadata **verbatim** — **no code rekeys it** (the exact V6 collision the
   pass-2 fix was supposed to prevent).
4. **BR-N1 (P1):** drag/drop move/replace clobbers express metadata server-side on the
   **primary** user path (the `replace` RPC wholesale-overwrites), not just the AI path the
   remediation guarded.
5. **SEC-N1 (P1, fast-follow):** the promotion-gate instruction is self-contradictory — the
   real library-write policy *is* `is_workspace_editor` (member-inclusive), yet the plan forbids
   it while also saying "match the library write policy exactly."

Plus two more day-0 P1s — **PERF-N1** (the marquee "no full-tree rebuild on keystroke" claim
never says *where* express editor state lives, the decision that makes or breaks it) and
**DM-N1** (the 29-legacy-row migration safety is asserted, not proven; a renamed source-less row
can leak into the Project folder) — and two day-0 coherence/strategy P1s (**CO-N1**: doc 08
doesn't encode the day-0 cut; **STRAT-N1**: the inline-vs-modal fail branch has no modal design).

**Recommendation:** the day-0 core (U1–U4) is close to buildable, but **do not start U2/U4
until the 6 day-0 P1s are resolved** — DB-N1 is a real authorization gap, and the rest are a
short, well-specified correction pass (mostly doc edits + a few code-gating tasks). With those
plus the P2 cleanup, the day-0 slice is ship-ready.

---

## The three ratings you asked for (1–100)

| Dimension | Pass 3 | Pass 2 | Pass 1 | Basis |
|---|---:|---:|---:|---|
| **Implementation readiness** (day-0 U1–U4, as-is) | **80** | — | — | Foundation verified sound; held back by 6 day-0 P1s incl. a real authz gap (DB-N1) and several plan-vs-code mismatches. |
| **Implementation readiness** (day-0, after listed fixes) | **89** | 84 | — | After the P1 corrections + code gates, the core is cleanly buildable on verified primitives. |
| **Strategy** | **81** | 64 | 78 | 2 of 3 strategic decisions genuinely resolved; inline-vs-modal only *gated*, its fail branch unplanned (STRAT-N1). |
| **Documentation quality** | **89** | 87 | 72 | Exceptionally thorough, coherent, fully traced; minor matrix/terminology wrinkles (CO-N1…N5). |
| **Overall** | **84** | 78 | 66 | Right architecture, verified foundation, remediation genuinely absorbed; remaining work is a narrow P1/P2 list dominated by plan-vs-code fidelity. |

### Per-lane scores (this pass)

| Lane | Score | Headline |
|---|---:|---|
| DB / RPC / Supabase | **86** | DB-N1 viewer-block not enforced (P1); DB-N2 replace-RPC clobber (P2); DB-N3 promotion-gate contradiction (P2→see SEC-N1) |
| Blast radius / cross-app | **74** | BR-N1 drag/drop clobber (P1); BR-N2 express-id rekey never implemented (P1); BR-N3 AI read-tools (P2) |
| UX / frontend / a11y / virtualization | **88** | All UX pass-2 fixes applied; UX-N1 badge AA (P2), UX-N2 two-editor virtualization (P2) |
| Coherence / traceability / QA | **86** (absorption **92**) | CO-N1 doc 08 lacks day-0 cut (P1); CO-N2…N5 matrix/terminology (P2) |
| Security / permissions / concurrency | **86** | SEC-N1 promotion-gate contradiction (P1); SEC-N2 realtime row-sync doesn't exist (P1); SEC-N3/N4 (P2) |
| Strategy / scope | **81** | S0.1/S0.3 genuinely resolved; STRAT-N1 modal fallback unplanned (P1); STRAT-N2/N4 (P2) |
| Completeness / perf / data-migration | **86** | PERF-N1 editor-state location (P1); DM-N1 legacy-row safety (P1); OB-N1/DM-N2/PERF-N2 (P2) |

> Aggregate of the 7 lane scores = **83.9/100**, corroborating **Overall 84**. Lowest lane:
> blast radius (74) — the identity-preservation invariant (express metadata survival) is the
> single most under-covered area, with two confirmed P1 mutator-surface gaps.

---

## Trajectory: 66 → 78 → 84

Each pass moved the number and each found genuinely new issues a shallower pass could not:
- **Pass 1** (pre-remediation deep audit): 66 — strategy/scope and the systemic blind spots.
- **Pass 2** (post-pass-1 remediation): 78 — verified the foundation, found 13 doc/code defects + the unmade strategic decisions.
- **Pass 3** (this): 84 — confirmed the remediation absorbed everything, then found the
  plan-vs-code behavior mismatches that only deeper code reading exposes.

The returns are diminishing on *documentation* (it is now near-excellent) but pass 3's value
was in **code-fidelity**, which is exactly where a "mission-critical day-0" plan must be exact.

---

## What is verified SOUND (do not re-litigate)

- The no-new-table / U3-no-migration / JSON-merge / correlation-idempotent foundation —
  re-confirmed against the **live** RPC `20260524050746` (not the superseded `20260524033151`).
- The day-0 cut (U1–U4) and the table-vs-hedge decision are **genuinely resolved**, not parked.
- The virtualization day-0 fallback (disable-while-editing) is the primary path in both doc 03
  and doc 09, with a real passing ≥75-row harness; the memoization claim is feasible for numeric
  cells (proven by an existing perf test).
- Permission helpers, optimistic locking, signed cursor frames, and the price-option NOT-NULL
  field list are all real and correctly cited.
- All named test files exist; the static-docs/traceability invariants largely hold.

## Honesty notes

- **No false positives** were found among the applied pass-2 findings; the remediation did not
  repeat the V1 stale-migration error.
- Two new P1s are **slightly over-stated** by their finder (the adversarial verifiers said so,
  and I concur): STRAT-N1's "~50% spike-fail" probability is inflated (the V3 fallback lowered
  it), and DM-N1's "SQL predicate divergence" sub-thread is weaker than its other two threads.
  Both findings remain real; only the framing is tempered. See `03`.
- DB-N1, BR-N1, BR-N2, SEC-N1, SEC-N2, PERF-N1, CO-N1, STRAT-N1, DM-N1 were each
  **adversarially confirmed** against live code by an independent skeptic agent; DB-N1 I also
  verified myself.

Full detail: `01` (remediation verification), `02` (new-defects master), `03` (day-0 P1 deep
dives), `04` (fast-follow + P2s), `07` (the fix queue).
