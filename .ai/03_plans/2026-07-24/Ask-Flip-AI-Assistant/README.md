# Ask Flip AI Assistant Plan Pack

## Outcome

Deliver Ask Flip as a professional AEC estimating workflow that uses an
existing hosted foundation model while Archestimator retains authority over
identity, entitlement, retrieval, calculations, plan persistence, approval,
execution, receipts, and audit truth.

Ask Flip becomes familiar with Archestimator at runtime through:

1. versioned Archestimator product knowledge;
2. server-authorized live workspace retrieval;
3. current project, estimate, active-tab, and selected-record context;
4. typed read capabilities;
5. deterministic domain calculations;
6. explicitly permitted structured workspace preferences in a later release;
   and
7. accepted or edited user decisions stored only as structured product signals,
   never as raw-chat training data.

No model training, fine-tuning, continual training, or provider-owned canonical
memory is planned.

The governing product promise is:

> Ask Flip converts a project brief or estimating question into an
> evidence-backed answer or reviewable estimate package using the firm's own
> structured cost knowledge, while Archestimator retains control over
> authorization, calculations, confirmation, and execution.

## Status

- **Profile:** `high-blast-radius`
- **Package status:** `CONDITIONALLY_READY`
- **Implementation readiness:** `UNIT-001` only
- **Implementation:** `NOT_STARTED`
- **Release:** `BOUNDARY`
- **Product implementation started:** no
- **Product code, migrations, tests, provider settings, and deployment changed
  by this planning task:** no
- **Canonical execution artifact:** `00-PLAN.md`
- **Exact next unit:** `UNIT-001`
- **Only ready unit:** `UNIT-001`
- **Dependent units:** `PLANNED`

## Release Sequence

1. **Release A - Ask-only**
   - grounded authenticated questions;
   - demand-driven authorized reads;
   - versioned product knowledge;
   - app-linkable sources;
   - typed bounded streaming events;
   - quota, deadline, payload, audit, and provider controls;
   - no action-plan execution and no business-data mutation.
2. **Release B - Draft and Review**
   - strict typed proposal;
   - deterministic server compiler;
   - server-owned immutable plan versions;
   - authoritative totals, effects, sources, freshness, assumptions, and risk;
   - Approve, Reject, Edit Plan, and Take Over;
   - no business-data mutation.
3. **Release C - Package-Create Apply**
   - one new project;
   - one estimate and default tab;
   - new Group and Area nodes;
   - verified library-backed rows;
   - explicitly reviewed allowances;
   - one canonical receipt and idempotent replay;
   - no existing-record mutation or expanded action set.

Existing-estimate updates, replacements, deletes, renames, template insertion,
permanent component-library creation, supplier or price-option changes, bulk
changes, cross-project work, publication, sharing, email, invites, permissions,
client-portal actions, accounts, billing, uploads, deployments, credentials,
and administrative actions are later-release work and are not represented by
the first executable schema.

## Unit DAG

```text
UNIT-001  Contracts, policy, release profile, event types
   |
   v
UNIT-002  Consolidated read tools and product knowledge
   |
   v
UNIT-003  Ask-only provider loop and streaming route
   |
   v
UNIT-004  Ask-only user experience                  RELEASE A EXIT
   |
   v
UNIT-005  Durable draft, review, and approval state RELEASE B EXIT
   |
   v
UNIT-006  Package-create domain command and Apply  RELEASE C EXIT
   |
   v
UNIT-007  Evidence, model evaluation, release audit
```

Only `UNIT-001` is ready. Do not begin a dependent unit until its declared
prerequisites and release boundary are current.

## Read Order

1. `00-PLAN.md` - Task Contract, releases, decisions, requirements, DAG, unit
   contracts, risks, boundaries, and resume state.
2. `01-CURRENT-STATE-HISTORY-AND-BLAST-RADIUS.md` - current HEAD source audit,
   history, overlaps, unsafe Apply findings, and stale triggers.
3. `02-ARCHITECTURE-SAFETY-AND-DATA-CONTRACT.md` - trust boundaries,
   release-profile authority, Ask/Draft/Apply flows, persisted plan contract,
   state machine, atomicity, privacy, and recovery.
4. `03-MODEL-RESEARCH-AND-EVALUATION.md` - no-training strategy, OpenAI
   Responses adapter boundary, optional Gateway transport, volatile facts, and
   separate application/model evaluation.
5. `04-EXPERIENCE-SCENARIOS-AND-VERIFICATION.md` - release-scoped experience
   scenarios, Rivera 2BR proof, accessibility, and proposed tests.
6. `plan-pack.json` - machine-readable status, assumptions, traceability,
   evidence, and hashes.

## Implementation Boundaries

- The master AI kill switch remains the emergency off switch.
- A server-derived release profile controls the maturity stage and cohort
  exposure.
- The tool registry and domain authorization decide whether the current actor
  may perform a specific action against a specific target.
- The browser and model select none of those authorities.
- The provider sees read tools and, only in Draft-enabled profiles,
  `propose_action_plan`; it never sees an execute capability.
- The canonical executable plan is persisted server-side and reloadable.
- The execute request never resends or controls the authoritative plan body.
- Execute makes no provider call.
- Release C contains only `project.estimate-package.create`.

## Resume

Start with `UNIT-001` in `00-PLAN.md`.

Before implementation:

1. rerun repository bootstrap and scoped status inspection;
2. compare every stale trigger in `plan-pack.json`;
3. recheck the next active D1 migration number, observed as `0104` on
   2026-07-24 but not reserved;
4. rerun GitNexus impact before editing any source symbol;
5. confirm the current entitlement/feature-gate authority; and
6. stop after `UNIT-001` unless the next unit is explicitly made ready by a
   refreshed pack.

Automated product tests, billed model evaluations, provider secrets or account
configuration, AI Gateway enablement, deployment, and production feature
enablement remain separate authorization boundaries.
