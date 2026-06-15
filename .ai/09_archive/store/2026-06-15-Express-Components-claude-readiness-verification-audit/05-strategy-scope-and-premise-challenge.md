---
title: Strategy, Scope & Premise Challenge
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Adversarial challenge to the plan's strategic decisions and unstated assumptions. This is the angle the prior audit rated highly (78) and under-challenged; this pass rates it 64 and explains why.
---

# Strategy, Scope & Premise Challenge

The plan is **internally rigorous and honestly risk-registered**. The challenge here is not to
its execution but to its *premises* — where it could be strategically wrong even though it is
well-argued. **Strategy score: 64/100** (the adversarial lane scored it 58; tempered to 64
because the no-new-table call is genuinely defensible for the literal request). This is the
lowest-scoring dimension and the **highest-leverage** place to intervene before building.

## Challenge 1 — "No new table" may be optimizing the wrong cost

**Premise:** Author express rows in `estimate_row_items`; defer a `project_components` table to a
"future product fork" (KTD1, doc 02 §Alternatives).

**The case against:** The plan declines to model a project-local component catalog but builds
~80% of one anyway — a virtual Project folder with `Express` + `Project-specific` children (U6),
an atomic promotion RPC (U7), four-way inclusion/exclusion classification, and the tell: a
**"stable project-local express id" in metadata** that doc 02:53 explicitly calls "a
forward-compatibility hedge… if Archestimator later adds a canonical project-local component
catalog, existing rows can be adopted." That sentence concedes the data model is incomplete
*today*: you are minting a synthetic primary key for an entity whose table you refuse to create —
an id that no column constrains, no FK references, and no uniqueness enforces (and which V6 shows
isn't even rekeyed on copy). The migration being avoided (one table, RLS mirroring
`estimate_row_items`, grants) is **one-time and reversible**; the projection layer's cost is
**recurring** — every downstream surface (U8: history, dashboard, proposal, export, charts, AI
context, publication) must learn the express dialect, and all of it becomes rework when the fork
lands.

**Crossover point:** the projection becomes more expensive than the table the moment a *second*
consumer needs the identity — i.e., "reuse this project component across rows/estimates," which
doc 02 §Open Product Fork already flags as the one material fork. The plan pays the identity cost
without the reuse benefit — the worst quadrant.

**What settles it:** Is cross-row/cross-estimate reuse on the roadmap within ~2 quarters?
- **Yes →** add the table now, project *from* it.
- **Genuinely never →** **delete the stable-id hedge** — it's dead weight signaling a wrong model.

**Recommendation:** You cannot coherently *defer the catalog* while *building its key and its
conversion surface*. Pick one. (This does not block day-0 — see Challenge 2.)

## Challenge 2 — This is a 4-unit day-0 wearing a 9-unit costume

**Premise:** All of U1–U9 is "mission-critical day-0."

**The case against:** The literal user request (doc 04 Problem Frame) is *"Add row makes a
component you can name and price inline."* That is **U1 + U2 + U3 + U4**. Everything else is
adjacent ambition, and **the plan's own ship-slice ordering proves it**: doc 12 puts the Project
folder at slice 6 and promotion at slice 7 — explicitly last. U6 is net-new route/query/context
plumbing the plan itself calls "net-new" (KTD6). U7 is a new SECURITY DEFINER RPC crossing a
permission boundary (RSK12) for a reuse need no user has been shown to have. Labeling the whole
bundle "day-0" inflates risk and pressures the load-bearing core (the inline editor + its two
Critical risks) to make room for promotion nobody requested.

**Recommendation:** Define **day-0 = U1–U4 + the flag/rollback/permission-gate subset of U9.**
Ship behind the existing `NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED` flag, watch the doc-12
observability signals, then fast-follow U6 and U7. The plan already sequences it this way — make
it explicit.

## Challenge 3 — The unreproduced U5 bug is scope contamination

**Premise:** U5 (project-specific icon on duplicate linked rows) stays in the day-0 plan, gated
on reproduction.

**The case against:** Verification **confirms** the bug is unreproducible with real DB data
(`canMakeProjectSpecific` is per-row with no order dependency — `cells.tsx:79-82`). A bug that
likely only manifests on malformed fixtures has no place in a mission-critical launch and is
orthogonal to express authoring (it's about *linked library* rows). Bundling it is how "while I'm
in cells.tsx…" scope creep happens.

**Recommendation:** **Remove U5 from the Express Components pack.** File it as its own ticket
gated on a real repro. If the repro never comes, it was never work.

## Challenge 4 — Blank + express is a permanent duality tax

**Premise:** Keep the legacy blank placeholder alive indefinitely (flag-off, rollback, 29 legacy
rows) alongside express rows, with classifiers keeping them distinct forever.

**The case against:** You now maintain two authoring concepts permanently — express-wins-over-blank
precedence in every classifier, a SQL predicate mirroring the client blank definition, and
distinctness in every downstream surface. A feature flag is a *temporary* device; designing the
data model around indefinite flag-off designs for permanent indecision.

**Recommendation:** Time-box the duality. Ship the flag, but commit to a follow-up that **migrates
the 29 legacy blanks** and **removes** the blank authoring path once express is validated. Don't
enshrine two concepts as steady state.

## Challenge 5 — The most important unexamined assumption: inline > modal

**Both of the plan's CRITICAL risks exist only because authoring is inline-in-a-virtualized-cell:**
- RSK7 (virtualization overlap) — only because an editor expands inside a virtualized row.
- RSK10 (keyboard/caret conflict) — only because text inputs live in grid cells.

The plan asserts "no modal" as an Experience Principle (doc 03) but **never argues inline beats a
quick-add modal for authoring** (as opposed to quick numeric edits). A modal sidesteps *both*
criticals and roughly half the editor complexity (V3 virtualization, the keyboard carve-out, the
focus branch, the measureElement work).

**Recommendation (highest leverage):** Before committing to inline, **spike the active editor in a
≥75-row virtualized list (one day).** If it fights the grid (V3 suggests it will), switch authoring
to a quick-add modal and delete two Critical risks. Validate the riskiest assumption with the
cheapest experiment first.

## Other unstated assumptions (flag, don't block)

- "Project-specific only" is stable — the open fork is evidence it isn't.
- The workspace Components tab is the right home for *project* components — U6 forces project data
  into a workspace-scoped surface.
- Promotion is a day-0 need — no cited user request; it's the most complex unit.

## Single highest-leverage strategic recommendation

**Cut day-0 to U1–U4, and spike inline-editing-in-a-virtualized-list before committing to inline
at all.** Then make one explicit decision: *table now vs. strip the stable-id hedge.* Those two
moves remove both Critical risks from the critical path and resolve the plan's one incoherent
premise — without touching the verified-sound architecture.

> A short **decision record** (`.ai/05_decisions/` or a `00-scope-and-premise-decision.md` inside
> the plan pack) capturing the day-0 cut, the inline-vs-modal spike result, and the
> table-vs-hedge call is the *one* new document this pack still warrants. See `07`.
