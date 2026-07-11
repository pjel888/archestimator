# Restore Orchestration And Disposable Ingress Threat Model

## Authority And Scope

This threat model expands `REQ-002`, `REQ-004`, `REQ-007`, `AC-002`, `AC-004`,
`AC-007`, `TEST-002`, `TEST-004`, `TEST-007`, `RISK-002`, `RISK-003`,
`UNIT-002`, `UNIT-004`, `UNIT-006`, and `AUTH-001`. The canonical phase order
and executable paths remain in `IMPLEMENTATION_PLAN.md`.

## Orchestration State Machine

```text
preflight -> target-created -> export-encrypted -> imported
  -> integrity-pass -> sessions-invalidated-offline
  -> disposable-ingress-deployed -> app/authz/probe-pass
  -> receipt-written -> ingress-destroyed -> target/data/key-destroyed
  -> independent-absence-pass
```

No state may be skipped. Ingress cannot exist before offline integrity and
session invalidation pass. Receipt success cannot precede full cleanup and
absence readback. Any failure transitions to incident-aware cleanup, never to a
later proof phase.

## Resource And Lease Contract

| Resource | Lease/identity | Creation and destruction rule |
| --- | --- | --- |
| D1 target | Unique approved name and provider ID bound to run ID | Create only after all preflight checks; delete and list/read back absence. |
| Worker | `archestimator-recovery-<run-digest>` | Deploy only after offline checks; `workers_dev=true`, `routes=[]`, no custom domain, disposable D1 only; delete and prove exact URL absent. |
| Worker secrets | Expected run ID and proof key under run-scoped names | Raw values only in operator process/OS store and Worker secret; delete with Worker and verify secret/Worker absence. |
| Nonce/attempt table | Run-scoped disposable target table | Stores nonce digests/counters only; destroy and verify table absence. |
| Export/key/temp data | Run-scoped protected lifecycle | Encrypt immediately; destroy plaintext, ciphertext, alias, and temp root with readback. |
| Evidence path | One lead-writer path under approved scratch/evidence location | Redacted receipt only; no parallel writer or raw transcript. |

## Proof Ingress Contract

The only route is `POST /__recovery/probe` with `application/json`. Stream-cap
the body at 8 KiB before parsing, including requests without `Content-Length`,
and bound body arrival by a per-request deadline so a slow-loris stream cannot
hold a request open to consume the five-minute window. Each request carries run
ID, timestamp within five minutes, unique random nonce, body digest, and HMAC
over method/path/run/timestamp/nonce/body digest. The signed run ID must equal an
independent Worker-secret value before reading or mutating nonce/cardinality
state; that comparison and every other credential/secret comparison must be
constant-time and produce timing indistinguishable from an HMAC failure so the
five-failed-attempts/minute cap bounds any residual timing oracle. Atomically
store only nonce digests. Permit at most 32 successful probes and five failed
attempts per minute per run.

## Threat And Denial Matrix

| Threat | Pre-dispatch denial/control | Required proof |
| --- | --- | --- |
| Canonical/preview/custom route exposure | Overlay hard-codes `routes=[]`, no custom domain, unique workers.dev URL | Config readback, route absence, canonical URL denial. |
| Worker name collision in account | List existing Workers before deploy; refuse if `archestimator-recovery-<run-digest>` exists | Pre-deploy `wrangler`/list-workers uniqueness probe; collision aborts before deploy. |
| Bound production D1 selected | Overlay contains only explicit disposable D1 ID; source/target collision check | Binding readback, target marker query, and an independent production-source query confirming the run-labeled controlled-write row is absent there. |
| Request chooses expected run | Constant-time compare signed request run to Worker-secret expected run; HMAC-fail and run-mismatch timing indistinguishable | Mismatch denied before nonce table access; timing-attack fixture bounded by the failed-attempt cap. |
| Replay/copied request | Five-minute window and atomic nonce-digest insert | Same request/nonce denied; concurrent duplicate has one success maximum. |
| Signature or body mutation | HMAC binds method/path/run/time/nonce/body digest | One-field mutation matrix denied. |
| Oversized/chunked abuse | Streaming byte cap before parse | With/without length cases denied before app dispatch. |
| Slow-loris/arrival abuse | Per-request body-arrival deadline | Partial/slow body denied before the five-minute window drains; deadline enforced independent of byte count. |
| Brute-force/amplification | Failed-attempt and successful-probe caps | Boundary/concurrent overflow cases denied. |
| Log/evidence exfiltration | Stable labels/redacted run correlation only | Secret scan finds no header/key/nonce/body/row data. |
| Stale workers.dev edge after delete | Immediate plus delayed URL-absence re-check | A second absence probe after a bounded delay proves the route no longer resolves. |
| Controlled write leaks to production | Run-labeled write read back absent from every non-disposable (source/bound) D1 | Independent production-DB absence query for the run-labeled row. |
| Crash after mutation | Phase journal plus `finally` cleanup inventory | Injected failure at every phase leaves no untracked resource. |

Wrong method, path, content type, missing fields, expired timestamp, invalid
signature, run mismatch, reused nonce, over-limit or slow body, or usage/rate
overflow must fail before application repository dispatch. Denials use one safe
envelope without revealing which credential element was valid, and every secret
comparison runs constant-time to keep the envelope honest.

## Ownership, Evidence, And Handback

`UNIT-002` owns dry-run orchestration and refusal tests. `UNIT-004` owns ingress
contract and local denials. The authorized operator alone executes provider
phases in `UNIT-006`; a distinct verifier owns route/binding/Worker/secret/table/
key/data/D1 absence readback. The final receipt records stable outcomes and
digests, not raw requests or commands containing secrets.
