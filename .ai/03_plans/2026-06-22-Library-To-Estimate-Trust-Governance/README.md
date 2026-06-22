# Library To Estimate Trust Governance Plan

Date: 2026-06-22

This plan pack is a follow-up to `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/`. The 2026-06-20 pack is about improving the Library surfaces themselves. This pack is about what must happen when Library data is reused inside the Estimate Sheet, including stale source decisions, project-specific rows, cost-source governance, attachment lifecycle, mobile interruption recovery, and proof standards.

The expected implementation outcome is a safer reuse workflow:

- Estimators can insert or replace from the Library without silently committing stale pricing, wrong thumbnails, archived components, or foreign/stale estimate targets.
- The Estimate Sheet right sidebar treats `Library`, `Project`, and `Templates` as distinct source sections with distinct labels, cache shapes, and recovery states.
- Library curators can move beyond passive freshness badges into assigned stale-cost refresh, supplier/brand governance, accepted-cost review with explicit lock controls, and auditable spec-sheet review.
- QA evidence uses focused commands and a pack-local ledger instead of overclaiming the known-red broad `bun run validate` baseline.

## Start Here

1. Read [00-PLAN.md](00-PLAN.md) for the actual implementation plan and stable requirement/unit IDs.
2. Read [01-CURRENT-EVIDENCE.md](01-CURRENT-EVIDENCE.md) before coding so old line numbers and stale cache claims are re-verified.
3. Read [02-UX-FLOWS-AND-STATES.md](02-UX-FLOWS-AND-STATES.md) before touching user-facing copy, sidebar behavior, replace/insert flows, or mobile states.
4. Read [03-DATA-GOVERNANCE-CONTRACTS.md](03-DATA-GOVERNANCE-CONTRACTS.md) before touching cache keys, source trust, cost entries, attachments, or migrations.
5. Read [04-QA-AND-ACCEPTANCE-MATRIX.md](04-QA-AND-ACCEPTANCE-MATRIX.md) before implementation and again before claiming completion.
6. Read [05-IMPLEMENTATION-SEQUENCING.md](05-IMPLEMENTATION-SEQUENCING.md) for phase order, dependencies, and rollback expectations.
7. Read [06-PLAN-QUALITY-SCORECARD.md](06-PLAN-QUALITY-SCORECARD.md) to understand the repaired readiness score and remaining execution standard.
8. Read [07-UX-IA-COPY-AND-A11Y-CONTRACT.md](07-UX-IA-COPY-AND-A11Y-CONTRACT.md) before changing user-facing surfaces.
9. Read [08-BLAST-RADIUS-AND-INTEGRATION-MAP.md](08-BLAST-RADIUS-AND-INTEGRATION-MAP.md) before parallel implementation.
10. Read [09-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](09-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md), [10-DATABASE-MIGRATION-AND-RPC-READINESS.md](10-DATABASE-MIGRATION-AND-RPC-READINESS.md), and [11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md](11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md) before touching trust, schema, cache, or network behavior.
11. Read [12-IMPLEMENTATION-READINESS-CHECKLIST.md](12-IMPLEMENTATION-READINESS-CHECKLIST.md) before opening or closing any implementation phase.
12. Read [AGENT-HANDOFF.md](AGENT-HANDOFF.md) if another AI is taking over this plan.

## Relationship To The Active Library Pack

Do not edit `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/` from this pack unless the owner explicitly asks for a merge. Treat that older pack as read-only context while the other implementation agent is active.

This pack intentionally does not replace the Library page roadmap, visual redesign, dense mode, Quick Add, route-state, or template browser work already tracked there. It adds the missing joined-workflow layer between Library trust data and Estimate Sheet reuse.

## Artifact Map

- `00-PLAN.md` - implementation units, requirements, key decisions, risks, and success criteria.
- `01-CURRENT-EVIDENCE.md` - local evidence and current code/doc anchors.
- `02-UX-FLOWS-AND-STATES.md` - user flows, state vocabulary, source labels, mobile and a11y acceptance.
- `03-DATA-GOVERNANCE-CONTRACTS.md` - cache, source trust, supplier/cost, attachment, and schema-gate contracts.
- `04-QA-AND-ACCEPTANCE-MATRIX.md` - focused test matrix, adversarial scenarios, telemetry/evidence gates.
- `05-IMPLEMENTATION-SEQUENCING.md` - dependency order and handoff checkpoints.
- `06-PLAN-QUALITY-SCORECARD.md` - 1-100 audit scores, repaired readiness score, and definition of planning completeness.
- `07-UX-IA-COPY-AND-A11Y-CONTRACT.md` - role model, surface inventory, exact state copy, mobile, and accessibility gates.
- `08-BLAST-RADIUS-AND-INTEGRATION-MAP.md` - high-conflict file map, owner locks, integration checkpoints, and rollback levers.
- `09-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` - action authz, public redaction, storage, URL, telemetry, and no-go security gates.
- `10-DATABASE-MIGRATION-AND-RPC-READINESS.md` - accepted-cost semantics, attachment state, source snapshot v1, migration gates, SQL probes, and fix-forward rules.
- `11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md` - lite dataset, cache invalidation, network adversity, retry, and attachment performance budgets.
- `12-IMPLEMENTATION-READINESS-CHECKLIST.md` - traceability matrix, exact evidence commands, binary phase gates, and final report shape.
- `AGENT-HANDOFF.md` - instructions for future implementation agents.
- `LOOP_LEDGER.md` - planning-loop record and verification notes for this pack.
