# Plan 032 (Direction Spike): AEC classification — productize, replace, or stop persisting the stub

> **Executor instructions**: This is a **design/spike plan**. Investigate,
> produce a decision (productize vs replace vs remove-from-artifacts) with
> priced options. Do NOT build a real classifier in this spike. When done,
> update the status row in `plans/README.md`.

## Status

- **Priority**: P3 (direction)
- **Effort**: M (spike); L if the decision is "build a real classifier"
- **Risk**: LOW-MED
- **Depends on**: none (but productizing pairs with 030 cost intelligence + 033 Ask Flip)
- **Category**: direction
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters (the grounded signal)

`src/lib/aec-classification/disciplines.ts` defines only 6 disciplines
(Plumbing, Lighting, Furniture, Structural, Civil, Architectural) and
`classifyComponent` is pure keyword matching (`if hasAny(text, ["plumbing fixture","lavatory",...])`).
Yet `sourceSnapshot` (`disciplines.ts:24`) lists six real classification
standards — ISO 12006-2, MasterFormat, OmniClass, Uniclass, CSI, WBDG — that
are **not actually loaded or used**. The toy classifier's output is persisted
into real artifacts:
- `src/lib/publication/snapshot.ts` `SnapshotRowInput` carries `discipline: string`.
- Proposal export groups by it.
- The AI package-builder consumes category paths.

So a **low-quality signal is frozen into client-facing documents and used as AI context.**

**Impact — two failure modes:**
1. A contractor's exported proposal shows a discipline label that's keyword-guessed and sometimes wrong — undermines the "numbers you can trust" brand promise on a client-facing artifact.
2. The taxonomy's real value — automatic BOQ structuring, supplier categorization, mapping to MasterFormat/Uniclass for AEC-team interoperability — is never realized despite the surface pretending it exists. A real taxonomy + the AI package-builder would make "draft an estimate from a scope of work" structurally sound rather than free-form.

## Scope

**In scope** (decision deliverables):
1. **Three priced options:**
   - **(A) Drop `discipline` from snapshots/exports until it's real** (honest
     minimal — removes the low-quality signal from client artifacts immediately).
   - **(B) Replace the keyword classifier with a lookup against a real
     MasterFormat/Uniclass table** (the standards are named in `disciplines.ts:24`
     but not loaded — price the data-acquisition + lookup build).
   - **(C) Lean on the AI package-builder to classify at draft time and store
     the result** (reuse existing AI infra; classification quality = LLM quality
     + prompt; cheaper than B but probabilistic).
2. **For each option: effort, risk, and what it unblocks** (A unblocks nothing
   but stops the bleeding; B/C unblock BOQ structuring + the cost-intelligence
   cluster).
3. **A recommendation** — the spike's job is a grounded recommendation, not a
   menu. (The audit's recommendation: (A) as the launch-safe default, then
   (B)/(C) post-beta tied to plan 030.)
4. **The immediate honest-minimal change** (option A) scoped as a tiny
   implementation plan: which snapshot/export fields lose `discipline` and what
   replaces the grouping (category, as today).

**Out of scope**:
- Building a real classifier (that's the implementation of whichever option is chosen).
- Acquiring MasterFormat/Uniclass data (licensing + data work — note as a cost in option B).

## Questions to answer in the spike

1. Where exactly does `discipline` surface in client-facing artifacts (snapshot, export, proposal preview)? Cite each.
2. Does removing `discipline` from exports break any existing client proposal currently in flight? (Probably not — but verify the export grouping falls back cleanly to `category`.)
3. Is the AEC-team interoperability (MasterFormat/Uniclass mapping) a real first-user need, or a future-AEC-vertical aspiration? (Read PRODUCT.md's user base — contractors first, AEC teams adjacent.)
4. If option C (AI classification), what's the prompt/tool shape, and does the existing audit + rate-limit infra cover it?

## Deliverable shape

A decision doc with the three priced options, the recommendation, and the
scoped honest-minimal change (option A) as a tiny implementation plan ready to
execute.

## Done criteria

- [ ] The decision doc exists with 3 priced options + a recommendation.
- [ ] Every client-facing surface of `discipline` is cited (`file:line`).
- [ ] The honest-minimal change (option A) is scoped as an executable mini-plan.
- [ ] `plans/README.md` status row updated to DONE (spike).

## STOP conditions

- `discipline` is load-bearing for a feature that can't fall back to `category`
  (e.g. a client proposal currently relies on it) — document the dependency; A
  may not be safe immediately.
- The standards (MasterFormat/Uniclass) have licensing constraints that make
  option B materially harder than expected — note in option B's price.

## Maintenance notes

- The launch-safe recommendation is (A): stop freezing a low-quality signal into
  client artifacts. (B)/(C) are post-beta, tied to the cost-intelligence cluster
  (plan 030) — a real taxonomy makes cost intelligence groupable by AEC standard.
- Reviewer: confirm the recommendation is grounded (cite PRODUCT.md's user base
  for the AEC-vertical question), not generic advice.
