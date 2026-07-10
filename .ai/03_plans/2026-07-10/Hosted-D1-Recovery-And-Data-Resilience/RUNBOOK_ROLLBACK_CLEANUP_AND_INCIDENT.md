# Runbook, Rollback, Cleanup, And Incident

## Authority And Scope

This operations artifact expands `REQ-002`, `REQ-006`, `REQ-007`, `RISK-002`,
`RISK-003`, `UNIT-002`, `UNIT-005`, `UNIT-006`, `GATE-001`, `GATE-002`, and
`AUTH-001`. It describes the recovery rehearsal operating contract without
granting provider authority. The exact executable unit packets remain in
`IMPLEMENTATION_PLAN.md`.

## Preflight And Go/No-Go

Before any provider mutation, record the current app/source/migration revisions,
account/database inventory, source health, plan/backend, limits/storage/sizes,
approved export window, resource names, operator/verifier roles, evidence path,
incident contact, and full cleanup inventory. Verify the authorization packet,
free-tier posture, encrypted filesystem, `0700/0600` modes, unique target,
source/target inequality, no canonical route, and all local/dry-run tests.

No-go conditions include unknown identity/limit/plan, limit failure, source
health risk, stale packet, concurrent resource lease, unsafe storage, migration
or contract drift, missing verifier, undefined cleanup readback, or any command
that can default to `ARCH_DB`.

## Run Phases And Checkpoints

| Checkpoint | Required durable state | Resume/abort rule |
| --- | --- | --- |
| Preflight complete | Redacted identities/limits, packet hash, command digests, inventory, cleanup plan | Revalidate before create; no mutation yet. |
| Target created | Target ID/name and source inequality readback | Resume only after identity recheck; otherwise delete. |
| Export/import complete | Export digest/size/timing, encrypted lifecycle, target import result | No ingress; run integrity or clean. |
| Offline validation complete | Migration/data/session checks all pass | Deploy ingress only from this checkpoint with current packet. |
| App/authz proof complete | Probe/app/session/write results and target marker | Emit provisional failed/success results, then clean. |
| Cleanup complete | Every D1/Worker/URL/route/binding/secret/table/file/object/key alias absence readback | Receipt can be successful only after distinct verification. |

The run journal stores redacted state required to resume cleanup after process
failure. It never stores proof keys, raw provider tokens, exports, rows, cookies,
or request bodies.

## Rollback And Fix-Forward

This rehearsal does not shift production traffic and does not exercise Time
Travel. A bad disposable target is destroyed and recreated only under a fresh
preflight/run ID. If export degrades the authorized source, abort immediately,
activate the Operating incident contract, and do not continue import to finish
evidence. If production/bound D1 is touched, stop all release work, restrict
access, preserve redacted provider facts, and treat it as a data-integrity/
security incident.

An integrity/app/authz/session failure keeps release red and normally destroys
the target after the packet's bounded diagnostic window. A receipt/consumer
mismatch is fixed forward by the producer after new proof, never by editing the
consumer or weakening a predicate.

## Cleanup Inventory

- Disposable D1 database and run-scoped tables/controlled rows.
- Disposable Worker, workers.dev URL, routes, custom-domain absence, bindings,
  variables, and secrets.
- Nonce/attempt state, synthetic users/sessions/credentials, proof key and
  expected-run configuration.
- Plaintext and encrypted export files/objects, temp directories, process
  values, OS credential/key aliases, and any explicitly approved transfer path.
- Local overlays, fake configs, generated command files, and test databases.

Each surface requires delete plus independent provider/filesystem/credential/
URL/table readback. A failed or unavailable readback is not proof of absence and
opens an incident/blocker.

## Ownership And Handback

The lead holds the run journal/evidence writer lease. Only the authorized
operator mutates provider resources. The test engineer/verifier must not share
the mutation credential and independently validates the receipt and cleanup.
Handback to Operating, Release, and Program is `D1-RECOVERY-RECEIPT-v1` plus the
explicit Program `BETA-P1-10` N/A receipt; neither consumer reruns recovery.
