# Publisher, Shared Pages, Boundary, and Receipts

## Authority Separation

Internal Teamwork and public Publisher collaboration are different security domains.

| Concern | Teamwork | Publisher |
| --- | --- | --- |
| private workspace/project/estimate membership | owner | consumer only |
| internal invitation/role/removal | owner | none |
| private roster/presence/cursors | owner | none |
| public share token/session | none | owner |
| public comments/decisions | none | owner |
| publication snapshot/content policy | consumer of internal capability | owner |
| internal Team access presentation | owner | may link/embed contract |

A public recipient never becomes a workspace, project, or estimate member by virtue of a share token/session. Internal role vocabulary must not be reused to authorize public recipient actions.

## UI Boundary

The current `PublisherProjectMembersPanel` is the only substantial access-management UI, but it mixes ownership concerns. The implementation should extract or rehome internal access UI to a Teamwork-owned module while preserving Publisher's route/layout needs.

Preferred staged approach:

1. Introduce a Teamwork-owned scoped DTO and capability contract.
2. Build the dedicated Team access surface and point the project Users control to it.
3. Let Publisher link to or render the shared Teamwork component without importing server mutations into public-recipient code.
4. Keep Publisher recipient controls in their existing public-access surface.

## Required Receipt: `TEAMWORK-PUBLISHER-ACCESS-v1`

Required if any shared DTO, component, route, or import boundary changes:

- Publisher manifest hash and baseline;
- Teamwork DTO schema and capability fields;
- all Publisher callers/imports;
- compatibility or migration strategy;
- public/internal type separation proof;
- changed paths and hashes;
- DOM/route tests and verifier.

## Cross-Boundary Denial Tests

- Public recipient token/session cannot read the Teamwork summary.
- Internal Teamwork membership cannot bypass Publisher publication status or recipient policy.
- Sheet-only actor cannot infer public share recipients unless separately authorized by Publisher.
- Publisher page never imports a Teamwork mutation into public client code.
- Teamwork Activity facts do not include public comments/decisions, and Publisher facts do not masquerade as member changes.

## Coordination

- Teamwork is the producer/owner for internal access DTO changes.
- Publisher is the consumer/reviewer for compatibility.
- One integrator updates the receipt and both plan ledgers.
- Any Publisher source drift after receipt creation invalidates the integration claim until rechecked.

## Current State

The Publisher and Activity source trees are stable at this planning observation, but neither manifest currently validates. Publisher's eight mismatches are `IMPLEMENTATION_PLAN.md`, `04_REQUIREMENTS_SPECIFICATION.md`, `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md`, `10_BLAST_RADIUS_AND_DEPENDENCIES.md`, `11_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`, `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`, and `LOOP_LEDGER.md`; Activity has the five mismatches recorded in the Activity contract artifact. `UNIT-014` and `UNIT-009` are blocked until their owners provide refreshed validating manifests. Those later PASS states still will not prove Teamwork implementation or cross-pack compatibility; each integration needs its own source-matched receipt, and neither receipt may hide drift or ownership from the other.
