# Agent Handoff

## Task Boundary

This is a follow-up plan pack for Library-to-Estimate trust and governance. It is not the active Library page implementation plan.

Current status: implemented and evidence-recorded on 2026-06-22. Before doing
new work, read `_evidence/U7-release-evidence.md` and
`_evidence/phase-0/db-preflight.md` for the latest proof and residual risks.

Do not edit `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/` unless the owner explicitly asks to merge or backport content. Treat it as read-only context while other agents are active.

## Required First Reads

1. `AGENTS.md`
2. `.ai/10_state/current-state.md` FAST PATH block
3. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/README.md`
4. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/17-CODEBASE-AI-IMPLEMENTATION-GUIDE.md`
5. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/00-PLAN.md`
6. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/01-CURRENT-EVIDENCE.md`
7. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/02-UX-FLOWS-AND-STATES.md`
8. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/03-DATA-GOVERNANCE-CONTRACTS.md`
9. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/04-QA-AND-ACCEPTANCE-MATRIX.md`
10. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/05-IMPLEMENTATION-SEQUENCING.md`
11. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/06-PLAN-QUALITY-SCORECARD.md`
12. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/12-IMPLEMENTATION-READINESS-CHECKLIST.md`
13. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/13-BETA-MVP-CUTLINE-AND-ROLE-DECISIONS.md`
14. The relevant specialist contracts among `07`, `08`, `09`, `10`, `11`, `14`, `15`, and `16` before touching that surface.
15. `.ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/FILE_LOCKS.md`
16. `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/README.md`
17. Pull old-pack docs only as needed for the touched surface.

## Parallel Work Slices

Safe slices for parallel agents:

- UX/source-label lane: U1, U2 copy, states, focus, and mobile interactions.
- Cache/target lane: U3 query keys, stale target authz, row revision failures.
- Mobile/a11y recovery lane: U6 beta recovery states and later U6 broader mobile, focus, and visual proof when the lead has cleared the UI lock.
- Governance lane: U4 supplier/cost review and accepted cost.
- Attachment lane: U5 upload/approval/version lifecycle.
- QA lane: U7 evidence ledger, telemetry sanitizer, redaction proof.

Avoid parallel edits to `src/components/workshop/EstimateSheetContent.tsx` unless a lead coordinates exact ownership. That file is the highest-conflict integration point.

Use `08-BLAST-RADIUS-AND-INTEGRATION-MAP.md` and `FILE_LOCKS.md` for file locks, integration checkpoints, and rollback levers. A lane that needs a locked file prepares tests/helpers first and waits for the lock to clear.

## Current Known Constraints

- The worktree may be dirty from other agents.
- Do not revert changes you did not make.
- Use `rg` before relying on old line numbers.
- Do not run broad browser/Playwright proof unless the claim needs a real browser.
- Do not use `bun test` to prove Vitest behavior.
- Do not claim full `bun run validate` green unless it actually passes fresh in the current worktree.
- Do not reuse stale red or green validation status; fill `_evidence/phase-0/baseline-reconciliation.md`.
- Do not treat the repaired `100` plan score as code completion; it means the handoff contracts are complete enough to implement.
- Do not persist accepted cost, lock modifiers, approval, assignee, or reviewer state without closing the DB preflight, migration/RPC, private-read, and direct-write gates in `10` and `15`.
- Do not grant durable trust governance to non-admin curators/reviewers; beta governance authority is platform admin or workspace admin only.
- Do not write raw URLs, filenames, storage paths, signed URL values, SQL row dumps, review prose, or secrets into `_evidence/`.

## Completion Report Shape

Final implementation reports should include:

- units completed by U-ID
- files changed
- targeted tests run and result
- evidence artifacts written under this pack's `_evidence/`
- browser/provider/manual proof skipped with reason and risk
- known baseline reds that remain unrelated
- migration decisions, SQL probes, and fix-forward notes when durable data changed
- beta cutline status: U1-U3 reuse foundation, full governance, or partial
  internal progress that is not release-ready unless the beta or full-governance
  gates pass
- evidence privacy audit result
