# Teamwork Feature Audit and Plan

**Package:** `PLAN-2026-07-11-teamwork-feature-audit-and-plan`
**Profile:** `high-blast-radius`
**Status tuple:** `IMPLEMENTATION_READY / COMPLETE / NOT_EVALUATED / ARCHIVED / ACHIEVED`
**Action ceiling:** `EXTERNAL_ACTIONS`; this records the authorized bound-resource proof reach. The implementation is complete; release remains a separate evidence stage.

This pack is the implementation entry point for private multi-user teamwork across projects and estimate sheets. It covers membership and role semantics, invitations, restricted-sheet access, presence, visible cursors, durable activity facts, the Publisher boundary, Cloudflare feasibility, rollout, and proof.

## Start Here

1. Recompute the scoped baseline in `03_SOURCE_CODEBASE_ARCHIVE_AND_STALENESS_AUDIT.md`. Any mismatch requires re-auditing affected claims before work starts.
2. Execute only from `IMPLEMENTATION_PLAN.md`; it is the sole canonical execution artifact.
3. The execution DAG is complete. `TEAMWORK-ACTIVITY-CONTRACT-v1`, `TEAMWORK-PUBLISHER-ACCESS-v1`, the hosted D1 invitation receipt, and the hosted UI/DO receipt are source-matched evidence against the current implementation. The final integration receipt is the closeout authority.
4. Keep source edits outside this plan folder until the baseline and known-red tests have been reconciled.
5. Record each iteration in `LOOP_LEDGER.md` and update `plan-pack.json` last. Do not treat a targeted local repair as a completed product criterion.

## Outcome

The target product state is a coherent Team access surface where:

- effective access is computed from one actor-resource-action policy;
- project and sheet managers see only controls the server will authorize;
- invitations are scope-correct, atomic, replay-safe, revocable, and explicit;
- sheet-only users cannot enumerate other restricted sheets, rosters, emails, or pending invitations;
- estimate editors see trustworthy multi-user cursors, while viewer and event capabilities are enforced by the Durable Object;
- durable access changes emit redacted immutable Activity-compatible facts;
- public Publisher recipients never become internal Teamwork members;
- local proof, hosted D1 proof, hosted Durable Object proof, and production release proof remain separate claims.

## Artifact Map

| Artifact | Purpose |
| --- | --- |
| `IMPLEMENTATION_PLAN.md` | Canonical unit DAG, ownership, commands, proofs, stop conditions |
| `01_EXECUTIVE_SUMMARY_AND_OUTCOME.md` | Current verdict and target state |
| `02_SCOPE_NON_GOALS_AND_TERMINOLOGY.md` | Boundaries and shared vocabulary |
| `03_SOURCE_CODEBASE_ARCHIVE_AND_STALENESS_AUDIT.md` | Current-source audit, known-red baseline, scoped fingerprint |
| `04_ACTOR_RESOURCE_ACTION_RBAC_MATRIX.md` | Effective-role and capability contract |
| `05_INVITATION_MEMBERSHIP_AND_LIFECYCLE.md` | Invite, membership, role, removal, token, and consent state machines |
| `06_DATA_SCHEMA_REPOSITORY_API_AND_MIGRATION.md` | D1 invariants, transaction boundaries, query isolation, APIs |
| `07_REALTIME_PRESENCE_CURSOR_AND_DURABLE_OBJECT_CONTRACT.md` | DO protocol, capabilities, identity, reconnect, cursor support |
| `08_USER_JOURNEYS_UX_UI_AND_ACCESSIBILITY.md` | Team access UX and complete states |
| `09_SECURITY_PRIVACY_ABUSE_AND_THREAT_MODEL.md` | Threats, denials, privacy, abuse controls |
| `10_ACTIVITY_AUDIT_EVENT_AND_CROSS_PACK_CONTRACTS.md` | Activity ownership and producer receipt |
| `11_PUBLISHER_SHARED_PAGES_BOUNDARY_AND_RECEIPTS.md` | Internal/public authority separation and compatibility receipt |
| `12_PERFORMANCE_RELIABILITY_OBSERVABILITY_AND_COST.md` | Budgets, operational proof, Cloudflare Platforms decision |
| `13_TEST_ADVERSARIAL_QA_AND_EVIDENCE_PLAN.md` | Test matrix and proof taxonomy |
| `14_ROLLOUT_FIX_FORWARD_OPERATIONS_AND_RELEASE_BOUNDARIES.md` | Flags, migration, rollback, hosted proof, release limits |
| `15_DECISIONS_ASSUMPTIONS_RISKS_AND_AUTH_BOUNDARIES.md` | Closed decisions, assumptions, risks, external boundaries |
| `16_REQUIREMENTS_TRACEABILITY_AND_FINAL_AUDIT.md` | Requirement-to-unit-to-proof audit |
| `evidence/2026-07-11-planning-audit-evidence.md` | Current planning and audit evidence |
| `LOOP_LEDGER.md` | Append-only planning and later execution observations |
| `plan-pack.json` | Stable IDs, hashes, states, DAG, ready slice, evidence index |

## Current Constraints

- The shared worktree was dirty at planning time. Existing changes are source inputs, not ours to revert.
- Fresh 2026-07-11 execution evidence confirms that Activity History Mapping and Publisher and Shared Pages each pass their plan validators. `TEAMWORK-ACTIVITY-CONTRACT-v1` and `TEAMWORK-PUBLISHER-ACCESS-v1` bind those current manifests to source-level compatibility evidence. They do not prove release, hosted, or final-integration readiness.
- GitNexus was 53 commits stale. Its blast-radius counts are directional; current source and focused tests are authoritative.
- The former collaboration fixture/assertion drift was reconciled and the focused collaboration/realtime/publisher suites now pass.
- Cloudflare Workers for Platforms is intentionally deferred because the current product does not host customer code and the service adds a paid-plan dependency.

## Completion Boundary

This planning package is complete when its validator, planning-prompt suite, and independent read-only review pass. All units `UNIT-001` through `UNIT-019` are now `VERIFIED`; `AUTH-001` is resolved by the authorized source-matched Worker deployment and bound D1/DO proofs; the final integration receipt passes; and release status remains separately `NOT_EVALUATED` because hosted observability/alert gates are absent. See [`evidence/TEAMWORK-FINAL-INTEGRATION-v1.md`](evidence/TEAMWORK-FINAL-INTEGRATION-v1.md).
