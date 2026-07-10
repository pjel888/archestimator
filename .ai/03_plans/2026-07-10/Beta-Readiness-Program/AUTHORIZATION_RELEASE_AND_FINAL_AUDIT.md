# Authorization, Release, And Final Audit

## Boundary Separation

| Boundary | Producing package/unit | Required authority | Safe fallback | Cannot authorize |
|---|---|---|---|---|
| hosted GitHub controls | Release `AUTH-001` / `UNIT-008`, consumed by Program `AUTH-001` | repository administrator | no release; preserve local readiness and continuation packet | staging, production, or legal approval |
| isolated staging | Release `AUTH-002` / `UNIT-009` | authorized staging/provider operator | no production progression | GitHub mutation, production, or legal approval |
| production deploy/rollback | Release `AUTH-003` / `UNIT-010` | authorized production operator | explicit no-release receipt | GitHub, staging, or legal approval |
| limited-cohort legal scope | Beta Operating `AUTH-003` / `UNIT-009`, consumed only through Program `AUTH-002` | product owner and qualified counsel where required | no external cohort admission | Program-produced approval, engineering proof, or wider/public/paid launch |

Release `UNIT-007` is read-only discovery, not an authorization boundary. Each
boundary remains active until its own scoped receipt rechecks.

## Continuation Packets

Every boundary packet contains the exact requested action, resource/scope,
preconditions already proven, redacted inputs, expected readback, denial and
cleanup procedure, responsible role, stale triggers, and next Program unit. It
must not include raw tokens, cookies, webhook secrets, provider tails, customer
data, or an implied permission beyond the named action.

If authority is unavailable, the Program records `BOUNDARY`, keeps all safe
local work and receipts, and emits a no-go continuation packet. It never marks
the missing external result complete and never asks an owner to redo ordinary
local engineering work.

## Final Audit Decision Function

`UNIT-004` constructs the release truth packet. `UNIT-005` may record `GO` only
when all of the following recheck against one pinned candidate:

1. all 20 backlog rows have current owner receipts and no open P0;
2. all nine `BETA-P1-10` dispositions match the canonical matrix;
3. the current migration generation and any consumed migration facts validate;
4. Publisher/Activity and other cross-pack contract versions are compatible;
5. required local, browser, provider, operator, and hosted receipts match their
   evidence class and candidate;
6. Release `UNIT-008`, `UNIT-009`, and `UNIT-010` receipts are individually
   current and the final deployed candidate matches the passed candidate;
7. Program `AUTH-002` strictly validates the current Beta Operating
   `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1` for the exact cohort and document
   versions without recreating the upstream decision;
8. rollback/fix-forward, support, incident, retention, and cleanup receipts are
   complete; and
9. an independent final verifier reports no P0/P1 contradiction.

Any failed predicate produces `NO_GO` with the earliest resumable producer and
does not invalidate unrelated local evidence unless it depends on the failure.

## Rollback And Re-evaluation

Authz/privacy defects, calculation divergence, data-loss/restore failure,
critical golden-path failure, unavailable incident/support operation, stale
release truth, or withdrawal of an external control triggers no-go or rollback
under the owning runbook. Re-promotion uses the exact previously verified
candidate and repeats marker, auth/denial, smoke, rollback, and final-traffic
proof; it does not rebuild a substitute candidate.

Any cohort expansion, public/paid launch, changed legal document, provider
binding, candidate, owner receipt, or evidence producer requires a new release
truth packet and scoped authorization. A prior go is not reusable authority.

## Final Artifact Status

This planning artifact defines the audit contract but contains no completed
release proof. `plan-pack.json` is the sole live status authority; this support
artifact must not duplicate or promote its tuple. Fresh execution evidence must
satisfy or fail closed every applicable predicate before the lead updates that
manifest.
