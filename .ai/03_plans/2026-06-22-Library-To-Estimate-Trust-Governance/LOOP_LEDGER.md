# Loop Ledger

## 2026-06-22 Planning Pass

Goal: create a new plan pack for the missing Library-to-Estimate trust, governance, and proof work, separate from the active 2026-06-20 Library page plan.

## Discover

- Read `AGENTS.md` and the `.ai/10_state/current-state.md` FAST PATH.
- Read requested planning/orchestration skills enough to adapt them to a docs-only Codex session.
- Inspected the existing Library plan read-only.
- Inspected UX audit rows for `UX-013`, `UX-030`, `UX-033`, `UX-034`, `UX-041`, and `UX-044`.
- Inspected current source anchors for Estimate Sheet insert/replace/promote/sidebar, Library source trust, cache keys, attachment upload/delete, and action normalization.

## Parallel Evidence Lanes

- UX lane completed and emphasized compare-before-replace, right-sidebar consumer semantics, project/library/template labels, mobile resume, and a11y states.
- QA lane completed and supplied focused tests, adversarial scenarios, evidence gates, and validation caveats.
- Evidence lane completed and confirmed this should be a separate pack, not an edit to the active Library pack.
- Initial fast explorer lane failed because Spark model quota was exhausted; a standard analyst lane replaced it.
- Architecture lane returned after the initial timeout and was integrated before final verification.

## Plan

The pack is structured around seven implementation units:

- U1. Compare-before-replace for stale Library sources
- U2. Estimate Sheet sidebar source taxonomy
- U3. Scoped cache and stale target recovery
- U4. Cost source refresh and accepted-cost governance
- U5. Attachment and spec-sheet lifecycle
- U6. Mobile, interruption, validation, and accessibility
- U7. Pack-local evidence, telemetry, and release gates

## Execute

Created this new folder only:

- `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/`

No application source files were intentionally edited by this planning pass.

Late architecture evidence refined the pack around shape-scoped cache keys, server-authoritative stale reuse, derived source trust, append-only cost/history reuse, private attachment evidence, and public snapshot redaction.

## Verify

Verification is recorded in the final assistant response for the planning turn and should include:

- `git diff --check -- .ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance`
- path boundary check confirming this pack's new files are the only intentional edits
- note that the active 2026-06-20 Library plan was not modified by this planning pass

## 2026-06-22 Readiness Repair Pass

Goal: audit the plan with UX, security, DB, performance, blast-radius, and QA
lanes; score it 1-100; repair the plan to 100 percent planning quality and
implementation readiness without touching app source.

Reviewer baseline scores:

- UX/UI: 76/100
- Security/data exposure: 84/100
- Performance/network/cache: 72/100
- DB/data integrity: 74/100
- QA/readiness: 78/100
- Coordination/blast-radius: 70/100 planning estimate from graph evidence

Repairs added:

- `06-PLAN-QUALITY-SCORECARD.md`
- `07-UX-IA-COPY-AND-A11Y-CONTRACT.md`
- `08-BLAST-RADIUS-AND-INTEGRATION-MAP.md`
- `09-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`
- `10-DATABASE-MIGRATION-AND-RPC-READINESS.md`
- `11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md`
- `12-IMPLEMENTATION-READINESS-CHECKLIST.md`

The repaired scorecard defines the pack as `100/100` for planning quality and
implementation readiness. This is not an implementation claim; implementation
agents still need fresh code/test evidence for every unit.

Final review repair added:

- Signed/download URL authorization gates.
- Rendered source URL safety gates.
- SECURITY DEFINER/RPC hardening gates.
- Concrete additive cost/attachment governance schema with current-state columns
  plus append-only event tables.
- Permission mapping from UX task roles to existing predicates, with trust
  governance limited to platform admin or workspace admin for beta.
- R16-R20 traceability rows and implementation-unit requirement references.
- Phase-closure language that treats blockers as open work, not skippable risk.
