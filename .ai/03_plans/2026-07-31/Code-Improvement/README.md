# Archestimator Code Improvement Plan Pack

Status: `CONDITIONALLY_READY`; implementation has not started.

This pack is the current-source successor candidate for whole-repository
correctness, security, performance, architecture, CRUD-lifecycle, test,
quality-infrastructure, and maintainability work at baseline commit
`93d5124d268a1b6016f63f8a8e5e69e118630d13`. It becomes the single runnable
authority only after `UNIT-000` reconciles predecessor manifests.

## Authority

1. Current source, tests, migrations, and `wrangler.jsonc`
2. Repository `AGENTS.md` and `.ai/00_system`
3. `00-PLAN.md` in this folder
4. `02-UNIT-CATALOG.md`
5. Earlier July 2026 plan packs as historical provenance only

The July 19 whole-repository quality and security packs remain useful evidence,
but their active findings were rechecked against current source. This pack does
not revive findings that are fixed, refuted, unreachable, or no longer aligned
with the Cloudflare/D1 runtime.

## Artifacts

- `00-PLAN.md` - canonical execution contract, decisions, sequencing, gates
- `01-AUDIT-REGISTER.md` - current-source inventory, CRUD matrix, finding ledger
- `02-UNIT-CATALOG.md` - implementation-ready units with files and evidence
- `03-VERIFICATION-MATRIX.md` - exact commands, receipts, and numeric thresholds
- `evidence/initial-plan-authors.json` - immutable seed roster for cumulative
  candidate-author independence checks
- `plan-pack.json` - machine-readable traceability manifest

## Execution Rule

Execute one unit at a time unless ownership is file-disjoint and host pressure is
healthy. Each unit owns its tests, evidence, and documentation. Do not create a
compatibility facade, feature flag, rollout layer, or hosted proof ceremony
unless the unit names a current integration or external boundary that requires
one.

The manifest baseline is immutably fixed to
`93d5124d268a1b6016f63f8a8e5e69e118630d13`. Every unit has a Q2 minimum
because `UNIT-000` changes quality-gate behavior and every later candidate is
cumulative; natural classification can still escalate any candidate to Q3.
Durable decision/disposition JSON stays in this pack. Generated test, browser,
candidate, author, review, quality, and GitNexus receipts use the ignored
`.tmp/code-improvement` root so proof cannot change the candidate it binds.

The sole initial target is `UNIT-000`: repair the confirmed bootstrap-baseline
lineage defect, then reconcile predecessor authority. Product units remain
planned until its candidate-bound Q2 receipts pass. The first product-code target is then
`UNIT-007`, the confirmed realtime post-revocation authorization defect. Quick
correctness units may proceed in parallel only when their file ownership does
not overlap.

## Completion Rule

`ACHIEVED` requires every unconditional and activated core unit to be
`VERIFIED`, every nonactivated conditional unit to be decision-backed
`SUPERSEDED` because it is genuinely not applicable, fresh machine-readable
Q2-or-higher evidence, a passing integrated gate, and zero unowned confirmed
findings. `GATE-020` must pass before the closeout unit can become runnable.

An external/provider-only branch may instead become decision-backed
`SUPERSEDED` with a `BOUNDARY` criterion and `AUTH-001`; after all safe local work
passes, that closes only as `AUTH_BLOCKED`. A conditional branch with no safe
technical design is `BLOCKED`; missing required evidence remains
`QUALITY_BLOCKED` while work is runnable and may become `TECH_BLOCKED` only
after at least two materially different local fallbacks fail, the linked core
requirement is `BLOCKED`, `UNIT-028` has verified all independent safe
cleanup/documentation work, no runnable unit remains, and the separate
fixed-baseline Q2+ technical stop gate passes. Neither path is reported as
`ACHIEVED`.

Hosted deployment, provider mutation, GitHub ruleset changes, credential
rotation, and production readback remain separate authorization boundaries.
