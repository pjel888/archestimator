# Plan 028 (Direction Spike): Reconcile the two proposal surfaces — `publication` vs `client-portal`

> **Executor instructions**: This is a **design/spike plan**, not a build plan.
> Investigate, produce a decision doc + migration plan, list open questions. Do
> NOT write production code beyond a throwaway prototype (clearly marked) to
> validate the decision. When done, update the status row in `README.md`.

## Status

- **Priority**: P3 (direction)
- **Effort**: L (investigation + decision; implementation is a separate future plan)
- **Risk**: MED-HIGH (the implementation — NOT this spike — touches auth, email, share-token format)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters (the grounded signal)

The codebase has **two parallel proposal surfaces with different semantics**, and
the README no longer accurately describes the system:

- `src/lib/client-portal/issue-builder.ts:40` defines a complete issued-version
  lifecycle: `status: "issued" | "under_review" | "changes_requested" | "accepted" | "declined" | "superseded" | "withdrawn" | "archived"`,
  with `issue_number`, `supersedes_issue_id`, content hashes, and supersession
  logic (`issue-builder.ts:549-553`: `UPDATE ... SET status = 'superseded' WHERE ... status != 'superseded'`).
  The full `src/lib/client-portal/` module (~40 files: composer, decision, brand,
  preview, publish, threads, recipient) implements this.
- The older `src/lib/publication/` path (`actions.ts`, `snapshot.ts`, `d1-store.ts`)
  creates `project_publications` as **single snapshots** with a `sourceRevision`
  staleness warning (`publication/source-revision.ts`) but no version chain.

Meanwhile `README.md:325` lists "Proposal snapshots / issued export policy | Planned"
and `README.md:337` states "Exports are working documents, not immutable issued
records... The immutable/issued-record policy is a future decision." The
client-portal module already implements exactly what the README calls undecided.

**Impact:** A contractor sending a proposal today hits one of two surfaces with
different semantics — one issues immutable versioned records, the other doesn't.
Two sources of truth for "what did the client see and decide" is a trust risk on
the exact surface PRODUCT.md pins the success metric to ("a proposal that the
client understands and trusts"). First users will encounter whichever surface
the UI routes to, and the README mis-describes the system to contributors.

This spike produces the decision: which surface is canonical going forward, what
the migration looks like, and a corrected README.

## Scope

**In scope** (deliverables to produce — write these as a decision doc under
`docs/decisions/` or `.ai/03_plans/` per repo convention):
1. A **map of every consumer** of both surfaces:
   - workshop proposals page UI,
   - recipient-proposals inbox (`src/lib/recipient-proposals/*` — reads a third shape),
   - share-token viewer (`src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/*`),
   - email-link generation,
   - proposal xlsx export (`src/app/api/.../export/proposal.xlsx/route.ts`),
   - activity/audit feeds.
   For each, record which surface it reads from and what shape it expects.
2. A **decision**: is `client_portal_issues` the canonical future and
   `project_publications` the legacy snapshot path to freeze? Or the reverse?
   Or a unification? Ground the decision in: data fidelity (version chain vs
   snapshot), security code woven into each (`publication/security.ts` vs
   `client-portal/policy.ts`), migration cost, and which one the UI currently
   routes to.
3. A **migration/consolidation plan** (the seeds of a future implementation
   plan): the sequence of steps to collapse to one surface, the data backfill
   (if any), the auth/email/share-token implications, and the risk gates.
4. A **corrected README "Claims discipline" section** — update lines 325, 337,
   and anywhere else the proposal/issued-record policy is mis-described, to
   reflect the decision.

**Out of scope** (do NOT do in this spike):
- Implementing the migration. That's a future plan-pack (D1 migration + auth +
  email + share-token — genuinely expensive to reverse, exactly the Plan Pack
  case per AGENTS.md).
- Changing any production code path beyond a clearly-marked throwaway prototype
  to validate the decision.

## Questions to answer in the decision doc

1. Which surface does the current workshop "Send proposal" UI actually invoke?
   (Trace the button → server action → which module.)
2. Are there live `project_publications` rows AND `client_portal_issues` rows in
   the same workspace today, or has one fully displaced the other?
3. The recipient-proposals inbox reads a third shape — is it a read model over
   one of the two, or independent?
4. Do the share tokens for the two surfaces differ in format / security model?
   (publication/security.ts vs client-portal session cookies)
5. What does each surface's audit trail look like, and which one satisfies the
   "numbers you can trust" / immutable-record need?

## Deliverable shape

A single decision doc (`docs/decisions/2026-07-17-proposal-surface-reconciliation.md`
or under `.ai/03_plans/<date>/` per repo convention — match where the team
records decisions) with sections:
- **Current state** (the consumer map).
- **Decision** (+ one-paragraph rationale grounded in evidence).
- **Migration plan** (numbered steps, each with risk + verification).
- **Open questions** (things a maintainer must decide before implementation).
- **README correction** (the exact prose changes to lines 325/337).

## Done criteria

- [ ] The decision doc exists and covers all 4 deliverables above.
- [ ] The consumer map cites `file:line` evidence for every consumer.
- [ ] The decision is grounded (not "I think" — cite the code).
- [ ] Open questions are explicit (don't hide ambiguity).
- [ ] The README correction prose is written (the actual edit can be a follow-up
      commit, but the prose must exist in the doc).
- [ ] `README.md` status row updated to DONE (this spike) with a pointer
      to the decision doc.

## STOP conditions

- The two surfaces are more entangled than the evidence suggests (e.g. they
  share a D1 table that can't be cleanly attributed to either) — document the
  entanglement as the finding and recommend a deeper architecture investigation
  before any decision.
- A consumer is in active churn (can't be mapped cleanly to a surface) — note
  it as an open question rather than guessing.

## Maintenance notes

- This spike's output (the decision doc) is the prerequisite for DIRECTION-02
  (the revision-requested loop) being clean — the revision loop needs a single
  canonical issued-version table to supersede from.
- The IMPLEMENTATION of the decision is a Plan Pack (D1 migration, live data,
  auth/share-token compatibility — exactly the "genuinely expensive to reverse"
  bar in AGENTS.md). Do not implement it as a single advisor plan.
- Reviewer: confirm the decision is genuinely grounded in code evidence, not
  preference, and that the README correction resolves the contradiction rather
  than papering over it.
