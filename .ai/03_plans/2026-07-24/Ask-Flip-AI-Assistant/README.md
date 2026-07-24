# Ask Flip AI Assistant Plan Pack

## Outcome

Replace the hidden split Ask Flip and Package Builder implementation with one
source-grounded conversational assistant that can:

1. answer authenticated workspace questions from bounded Archestimator data;
2. turn natural-language requests into typed, reviewable action plans;
3. require an exact plan-bound confirmation before every business-data write;
4. execute only through canonical Archestimator domain mutation primitives; and
5. return durable, actor-attributed execution receipts.

The first complete vertical scenario is:

> Create a two-bedroom fit-out project and baseline estimate under a
> PHP 2,000,000 budget, using current workspace library data and explicitly
> reviewed precedents, then apply it exactly once after confirmation.

## Status

- **Profile:** `high-blast-radius`
- **Package status:** `IMPLEMENTATION_READY`
- **Implementation:** `NOT_STARTED`
- **Release:** `BOUNDARY`
- **Action ceiling:** local repository implementation only
- **Canonical execution artifact:** `00-PLAN.md`
- **Exact next unit:** `UNIT-001`
- **Automated product tests:** not authorized for this planning task
- **External provider provisioning, billing, secrets, deployment, and feature
  enablement:** not authorized by this plan

## Read Order

1. `00-PLAN.md` - task contract, decisions, DAG, units, and resume state.
2. `01-CURRENT-STATE-HISTORY-AND-BLAST-RADIUS.md` - source audit, history,
   capability inventory, and GitNexus findings.
3. `02-ARCHITECTURE-SAFETY-AND-DATA-CONTRACT.md` - trust boundaries, action
   policy, schemas, execution protocol, and failure handling.
4. `03-MODEL-RESEARCH-AND-EVALUATION.md` - current model/provider research,
   official sources, cost/latency posture, and bakeoff.
5. `04-EXPERIENCE-SCENARIOS-AND-VERIFICATION.md` - interaction contract,
   two-bedroom scenario, accessibility, evidence, and proposed tests.
6. `plan-pack.json` - machine-readable status and traceability.

## Non-Negotiable Design

- The model never receives raw database access, browser-supplied authority,
  secrets, or unrestricted server actions.
- Read tools and mutation tools are separate registries.
- The model may propose a write; only deterministic server policy may approve
  its eligibility.
- Every write requires a preview and explicit user confirmation in the first
  release.
- Approval is bound to the exact user, workspace, plan version, plan hash,
  target revisions, action IDs, expiry, and execution limits.
- Execution re-authenticates, re-authorizes, revalidates resource revisions,
  and rejects stale or changed plans.
- Estimate writes reuse canonical D1 intent, receipt, history/outbox,
  publication-revision, statement-limit, and money-math primitives.
- The current hand-written AI D1 mutation fork is deleted after its behavior is
  absorbed into canonical domain commands.
- Raw conversations, hidden reasoning, full retrieved records, and provider
  memory are not persisted by default.
- Permanent deletion, account/admin/security changes, permission changes,
  client-visible publication side effects, raw SQL, and external production
  actions remain prohibited.

## Resume

Start with `UNIT-001` in `00-PLAN.md`.

Before editing:

1. rerun the repository startup contract;
2. compare the stale triggers in `plan-pack.json`;
3. confirm the next free migration number, currently `0104`;
4. refresh GitNexus if a safe repository-local runner is available;
5. run upstream impact analysis for every symbol to be changed; and
6. warn before proceeding if current impact is `HIGH` or `CRITICAL`.

Stop when every core requirement is implemented and evidenced, or when only a
recorded authorization boundary remains.
