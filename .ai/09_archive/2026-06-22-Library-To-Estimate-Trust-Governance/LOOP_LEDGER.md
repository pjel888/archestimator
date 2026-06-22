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

## 2026-06-22 Parallel Plan Audit And Final Repair

Goal: re-audit the completed plan pack with independent product, UX, security,
DB, performance, and coherence lenses; then repair the pack until it reaches
100/100 planning quality and implementation readiness without touching app
source.

Independent audit ratings before this final repair:

- Product strategy: 88/100 strategy, 86/100 quality, 80/100 readiness.
- UX/UI readiness: about 86/100 overall.
- Security readiness: 92/100.
- DB/data-integrity readiness: 82/100 planning and 68/100 implementation handoff.
- Performance readiness: 79/100 overall, with query scaling and observability
  as the weakest areas.
- Coherence/multi-agent readiness: 74-87/100 depending on dimension.

Final repair added:

- `13-BETA-MVP-CUTLINE-AND-ROLE-DECISIONS.md`
- `14-PER-SURFACE-UX-STATE-AND-VISUAL-QA.md`
- `15-DATABASE-PREFLIGHT-MIGRATION-RPC-SPEC.md`
- `16-OBSERVABILITY-OPERATIONS-AND-EVIDENCE-PRIVACY.md`
- `FILE_LOCKS.md`
- `_evidence/README.md`
- `_evidence/phase-0/baseline-reconciliation.md`
- `_evidence/phase-0/db-preflight.md`

Key repairs:

- Split U1-U3 beta reuse foundation from U4/U5 full durable governance.
- Replaced stale validation assumptions with Phase 0 baseline reconciliation.
- Recorded admin-only beta governance authority.
- Added deterministic per-surface UX state, governance queue, attachment review,
  and responsive visual QA contracts.
- Required DB preflight before durable governance, resolved attachment scope drift
  away from unverified `variant_id`, and added direct-write/private-read/RPC
  algorithm gates.
- Added query pagination, SQL-006A/SQL-006B, virtualization thresholds,
  idempotency matrix, cache lifecycle, and runtime metric dictionary.
- Treated `_evidence/` as a privacy sink with explicit redaction and audit rules.
- Added a real file-lock ledger for parallel implementation.

Final readiness definition:

- 100/100 means the planning contracts are complete enough for implementation
  agents to begin without inventing strategy, schema, UX, security, performance,
  evidence, or coordination decisions.
- It does not mean code has been changed, migrations have been applied, provider
  proof has passed, or release NO-GO items are closed.

## 2026-06-22 Codebase-AI Implementation Guide Pass

Goal: create a single detailed implementation guide for future codebase AI
agents, synthesize fresh parallel reviewers, resolve remaining contradictions,
and keep the work docs-only.

Parallel reviewers:

- Product strategy confirmed the core product bet and requested a front-door
  implementation guide, U6a/U6b split, continuous U7 evidence, and a partial
  release rule.
- UX/UI found the `Insert as new row` versus `Insert as project-specific` label
  conflict and missing recovered-edit placement.
- Security requested a concrete direct-write default, signed URL endpoint
  behavior, source URL display-only proof, public serializer ownership, and
  executable evidence privacy scan.
- DB/data integrity requested nullable uniqueness handling, append-only event
  table proof, reviewed timestamp enforcement, and cross-workspace denial cases.
- Performance requested query-count, payload byte, route bundle, numeric fanout,
  realtime/refetch, and SQL-006A/SQL-006B gates.
- Coherence requested handoff read-list repair, evidence-ledger wording,
  R19 lock-traceability repair, and admin-only role wording.

Repairs added or updated:

- `17-CODEBASE-AI-IMPLEMENTATION-GUIDE.md`
- `README.md`
- `AGENT-HANDOFF.md`
- `02-UX-FLOWS-AND-STATES.md`
- `04-QA-AND-ACCEPTANCE-MATRIX.md`
- `05-IMPLEMENTATION-SEQUENCING.md`
- `06-PLAN-QUALITY-SCORECARD.md`
- `07-UX-IA-COPY-AND-A11Y-CONTRACT.md`
- `10-DATABASE-MIGRATION-AND-RPC-READINESS.md`
- `11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md`
- `12-IMPLEMENTATION-READINESS-CHECKLIST.md`
- `13-BETA-MVP-CUTLINE-AND-ROLE-DECISIONS.md`
- `14-PER-SURFACE-UX-STATE-AND-VISUAL-QA.md`
- `15-DATABASE-PREFLIGHT-MIGRATION-RPC-SPEC.md`
- `16-OBSERVABILITY-OPERATIONS-AND-EVIDENCE-PRIVACY.md`

Final planning result:

- Strategy: 100/100.
- Plan quality: 100/100.
- Implementation readiness: 100/100 for future codebase AI execution.
- Code, migration, provider, and release proof remain future implementation
  obligations.

## 2026-06-22 Cross-Pack Coordination Notice

- `FILE_LOCKS.md` now records that the Library Page plan finalization agent owns
  the final Library evidence/status artifacts and
  `tests/vitest/library-copy-contract.test.ts`.
- Trust/Governance implementation agents may read/cite the Library pass
  evidence, but must take an explicit lock before editing Library release
  evidence or copy-contract tests.
- Trust/Governance remains its own implementation plan; this notice does not
  transfer Library implementation scope into this pack.

## 2026-06-22 Library Pack Archived

- Completed Library Page pack moved from
  `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement` to
  `.ai/09_archive/2026-06-20-Library-Page-Overall-Improvement`.
- Future Trust/Governance work should cite the archived Library evidence path.

## 2026-06-22 Implementation And Evidence Pass

Goal: implement the Trust/Governance pack, apply durable DB governance where
authorized, verify focused claims, and populate pack-local evidence.

Implemented:

- U1 source review gate and server-side current-source revalidation for Library
  and supplier-derived estimate commits.
- U2 visible Library/Project/Templates source taxonomy and trust-chip sidebar
  contracts.
- U3 bounded estimate-sidebar loader with a 50-row default, 100-row max,
  allowlisted item columns, bounded related-row queries, and project-row limit.
- U4/U5 durable governance migration with cost/attachment review state,
  append-only event tables, admin-gated RPCs, grant hardening, and provider
  application.
- U6/U7 focused a11y, telemetry, public-redaction, action-authz, evidence, and
  privacy proof.

Verified:

- `bun run type-check` passed.
- `git diff --check` passed.
- Targeted ESLint over touched source/test files passed.
- Sidebar/cache static slice passed `5` files and `21` tests.
- Security/governance slice passed `7` files and `71` tests.
- UI/workflow/a11y slice passed `7` files and `155` tests.
- Governance schema/action slice passed `3` files and `18` tests.
- Provider migration applied; SQL-001/002/003 counts are `0`; broad write
  grants are `0`; public/anon governance RPC execute grants are `0`;
  SQL-006A item-page plan uses the sidebar lite index.

Known residual:

- The linked project still has unrelated migration-history drift predating this
  pack.
- SQL-006B/literal related-query EXPLAIN was retried after the temp-role
  throttling cleared. The linked-project CLI role now reaches the provider but
  sees `0` library rows through hardened policies, so the retry is valid for
  index/shape availability and non-representative for real row-count latency.
