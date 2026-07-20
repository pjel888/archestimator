# UNIT-004 — Route component-mutation fork through the MutationIntent primitives

## Goal

Replace the component-library mutation path's hand-rolled revision guard
(`runComponentRevisionGuardedBatch`) and 26 raw SQL mutation sites with calls to
the shared `MutationIntent` primitives from UNIT-001. Where the path's
template-propagation logic does not map to row-mutation primitives, extract
new primitives only if the friction is real.

## Status

`READY` · depends on: `UNIT-001` · requirement: `DATA-004` · risks: `RISK-004`

## Why this matters

`src/lib/component-library/component-mutation-d1.ts:310-401,887` has 26 raw SQL
sites and its own `runComponentRevisionGuardedBatch`. This is the largest of the
three forks and the one most likely to need new primitives (it owns
template-propagation, which is not a row mutation). Routing what IS a row
mutation through the shared primitives closes the last silent-divergence
surface; being honest about what is NOT (template propagation) prevents
shoehorning.

## Current state

File: `src/lib/component-library/component-mutation-d1.ts` (2303 lines).

The fork:
- `runComponentRevisionGuardedBatch` at `:887` — the fork's own revision-guard
  helper.
- 26 raw SQL sites at `:310-401` and elsewhere — a mix of component-row
  mutations, price-option updates, and template-propagation writes.
- Interacts with `template-linked-mutation-d1.ts` and
  `template-propagation-d1.ts` (the propagation sub-system, which has its own
  job-queue machinery — separate from row mutations).

The primitives (UNIT-001 output): `buildRowRevisionGuard`,
`buildEstimateRowHistoryEvent`, `buildMutationReceipt`,
`buildProjectComponentAttachmentDeleteRetentionStatements`.

The boundary question (RISK-004): which of the 26 sites are **estimate row
mutations** (route through primitives) vs **component-library entity mutations**
(components, price options, template instances — may need their own primitives
or stay inline)? Read each site and classify.

## Owned paths / resources

- `src/lib/component-library/component-mutation-d1.ts` — primary edit target.
- `src/lib/estimates/d1-intents/mutation-intents.ts` — extend with new primitives
  ONLY if a clear recurring pattern emerges (RISK-004). Otherwise leave as-is.

## Implementation boundary

1. **Enumerate the 26 SQL sites** with
   `rg -n "\.prepare\(" src/lib/component-library/component-mutation-d1.ts`.
   Classify each:
   - **Estimate-row mutation** (touches `estimate_row_items`, emits history
     events) → routes through `buildRowRevisionGuard` +
     `buildEstimateRowHistoryEvent`.
   - **Component-library entity mutation** (touches `component_library_items`,
     `component_price_options`, `estimate_template_instances`) → may need a new
     primitive OR stays inline. Decide per-site.
   - **Template-propagation write** (touches propagation job tables) → stays
     inline; it is the propagation sub-system's own concern.

2. **For each ESTIMATE-ROW-MUTATION site:** compose the primitives into the
   batch, same pattern as UNIT-002/003.

3. **For each COMPONENT-LIBRARY-ENTITY-MUTATION site:**
   - If the site needs a revision guard + history event (analogous to the
     estimate-row pattern but for components), consider extracting
     `buildComponentRevisionGuard` / `buildComponentHistoryEvent` primitives.
     Extract ONLY if ≥2 sites share the exact pattern (the "two adapters = real
     seam" rule). Otherwise leave inline with a comment.
   - Do not speculatively extract a `ComponentMutationIntent` hierarchy — that
     is over-engineering for alpha (see README "considered and rejected").

4. **Replace `runComponentRevisionGuardedBatch`** with composition of the shared
   primitives where it guards estimate-row mutations. If it also guards
   component-entity mutations, split it: estimate-row sites use the shared
   guard; component sites keep a thin local helper until a recurring pattern
   justifies extraction.

5. Run the characterization suite (Pack B UNIT-002) — confirm no import
   breakage. The component-mutation path has no dedicated characterization; rely
   on type-check + the existing `component-library-actions-revalidation.test.ts`
   coverage.

6. Do **not** change the template-propagation job machinery, the
   `template-linked-mutation-d1.ts` reconciliation, or the component-library API
   surface.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Site audit | `rg -n "\.prepare\(" src/lib/component-library/component-mutation-d1.ts` | estimate-row mutation sites now compose primitives |
| Existing test | `bunx vitest run tests/vitest/component-library-actions-revalidation.test.ts --maxWorkers=1` | passes |

## Suggested executor toolkit

- Read `.agents/skills/archestimator-estimate-mutation-integrity/SKILL.md`.
- The `refactor-safely` skill.
- The `improve-codebase-architecture` skill's "deletion test" for deciding
  whether a component-entity primitive is worth extracting.

## Scope

**In scope:** `src/lib/component-library/component-mutation-d1.ts`, and
`src/lib/estimates/d1-intents/mutation-intents.ts` (extend ONLY if a recurring
component-entity pattern justifies it).

**Out of scope:**
- `template-linked-mutation-d1.ts`, `template-propagation-d1.ts` — the
  propagation sub-system stays as-is.
- The other two forks (UNIT-002/003).
- The component-library actions layer (`src/lib/component-library/actions.ts`).
- New tests beyond confirming existing coverage passes.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] Every ESTIMATE-ROW-MUTATION site composes the shared primitives
- [ ] `runComponentRevisionGuardedBatch` is either replaced or split (estimate-row part uses shared guard)
- [ ] Any new primitive extracted (e.g. `buildComponentRevisionGuard`) covers ≥2 sites (no speculative single-use primitives)
- [ ] `bunx vitest run tests/vitest/component-library-actions-revalidation.test.ts --maxWorkers=1` passes
- [ ] No files outside the two named are modified

## Acceptance evidence

- The site audit shows estimate-row mutation sites compose primitives.
- `git diff` shows the refactor; propagation machinery unchanged.
- A spot-check of two estimate-row mutation sites and one component-entity site,
  confirming the classification and the routing decision.

## STOP conditions

- A site is ambiguous between "estimate-row mutation" and "component-entity
  mutation" (e.g. it touches both tables in one batch). Surface it; the site
  may need to be split into two batches with different primitive compositions.
- The template-propagation sub-system's invariants are entangled with the
  mutation sites in a way that prevents clean extraction (RISK-004). Surface
  it; leave those sites inline with a documented boundary.
- The existing `component-library-actions-revalidation.test.ts` fails after a
  sub-step. Revert and reconcile — the refactor changed observable behavior.

## Recovery

Each of the 26 sites is independent. Revert a site that breaks and reconcile.
The classification step (step 1) is the load-bearing decision; if a site is
misclassified, re-classify and re-route.

## Maintenance notes

- After this unit, all four write paths share the canonical integrity rules for
  estimate-row mutations. The "second mutation path" warning in the integrity
  skill is satisfied for the row-mutation surface.
- Component-entity mutations may or may not have their own primitives depending
  on what this unit found. If they do, future component-library changes pick up
  the shared guard/event automatically; if they do not, the inline sites are
  documented as a deliberate boundary.
- A reviewer should confirm: (a) no speculative primitives were extracted, (b)
  the propagation sub-system is untouched, (c) the classification of each site
  is defensible.
- This is the last unit of the four-pack. Once VERIFIED, the integrity
  unification is complete and the audit's highest-leverage architecture finding
  (#11) is closed.
