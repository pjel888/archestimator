# Requirements And Decisions

## Requirements

| ID | Requirement | Acceptance boundary |
| --- | --- | --- |
| `REQ-001` | Recovery readiness rejects local-only, non-provider, stale, incomplete, or mismatched evidence. | Existing local artifact makes the provider gate red while its local-mechanics gate remains truthful. |
| `REQ-002` | Hosted orchestration uses an explicitly authorized source and uniquely named disposable D1/Worker target with preflight, dry-run, and cleanup. | No command can default to `ARCH_DB`; source/target/account/environment are printed redacted and require an exact confirmation token; current database count, account storage, source size, 500 MB target fit, 5 GB account fit, and 5 GB import ceiling all pass on Free. |
| `REQ-003` | Export/import proof validates migration ledger, schema objects, critical row counts/checksums, foreign keys, orphans, and documented export caveats. | All checks pass against the isolated target and are tied to the export digest. |
| `REQ-004` | The restored application proves representative reads, one controlled write/rollback, protected denial paths, and cross-workspace isolation through one fixed, ephemeral proof-ingress contract. | A uniquely named, run-scoped Worker uses only `workers_dev=true`, `routes=[]`, no custom domain, and the disposable D1 binding; its configured expected run ID is checked before nonce/cardinality state; wrong method/path/content type/run ID, oversized body, expired signature, reused nonce, rate overflow, and missing/invalid proof all fail before application dispatch; deletion and URL/Worker absence are read back. |
| `REQ-005` | Recovery explicitly invalidates or documents acceptance of restored Better Auth sessions and verifies the result. | A token valid only before the recovery point cannot authenticate after the approved invalidation procedure. |
| `REQ-006` | A release-consumable `D1-RECOVERY-RECEIPT-v1` records current provider evidence, RTO/RPO, operator, commands, failures, rollback, and cleanup. | Release and operating-contract consumers reject missing, stale, identity/revision-mismatched, failed, or dirty-cleanup evidence and never rerun recovery to compensate. |
| `REQ-007` | Rehearsal preserves free-tier posture and bounded data exposure through an executable export/key/ingress lifecycle. | No paid feature is enabled or proposed after a limit failure; the current database count/provider limit, account storage, source/export/import size, 500 MB per-target fit, 5 GB total-account fit, and 5 GB import ceiling are recorded; temp directory/file modes are `0700/0600` on a preflighted encrypted filesystem; a per-run key encrypts transfer/rest storage and is never logged; plaintext, ciphertext, key alias, Worker route, and target are destroyed with independent absence readback. |

## Criteria

| ID | Requirement | Current | Planned proof |
| --- | --- | --- | --- |
| `AC-001` | `REQ-001` | `FAIL` | `TEST-001` adds local-only/provider-false/stale/malformed regression fixtures to readiness and release gates. |
| `AC-002` | `REQ-002` | `BOUNDARY` | `TEST-002` proves safe CLI preflight locally, then disposable resource lifecycle under `AUTH-001`. |
| `AC-003` | `REQ-003` | `FAIL` | `TEST-003` verifies schema/data integrity against controlled fixtures and hosted target. |
| `AC-004` | `REQ-004` | `FAIL` | `TEST-004` runs restored app read/write/rollback and denial/isolation matrix. |
| `AC-005` | `REQ-005` | `FAIL` | `TEST-005` proves post-restore session policy with pre/post tokens and no token disclosure. |
| `AC-006` | `REQ-006` | `FAIL` | `TEST-006` validates `D1-RECOVERY-RECEIPT-v1`, freshness, identity, RTO/RPO, exact revisions, cleanup, and strict release/operating-contract consumption. |
| `AC-007` | `REQ-007` | `BOUNDARY` | `TEST-007` records plan/backend/size preflight, storage/access/cleanup proof, and no paid changes under `AUTH-001`. |

## Domain Contract Index

The requirements and criteria above remain the stable authoritative records.
Detailed target contracts are split only where provider/data/security/
performance/operations review can proceed independently:

| Domain | Detailed contract | Stable records retained here |
| --- | --- | --- |
| Provider capability/identity | `PROVIDER_CAPABILITY_AND_CONSTRAINTS.md` | `REQ-001/002/007`, `AC-001/002/007`, `DEC-AUTO-001/002/003`, `RISK-001/002` |
| Receipt/data integrity | `RECOVERY_ARTIFACT_SCHEMA_AND_DATA_INTEGRITY.md` | `REQ-003/006`, `AC-003/006`, `DEC-AUTO-005`, `RISK-001/003` |
| Orchestration/ingress threat | `RESTORE_ORCHESTRATION_AND_DISPOSABLE_INGRESS_THREAT_MODEL.md` | `REQ-002/004/007`, `AC-002/004/007`, `DEC-AUTO-003/007`, `RISK-002/003`, `AUTH-001` |
| Session/authz/application proof | `SESSION_AUTHZ_AND_APPLICATION_INTEGRITY_PROOF.md` | `REQ-004/005`, `AC-004/005`, `DEC-AUTO-004`, `RISK-003` |
| RTO/RPO/reliability | `RTO_RPO_PERFORMANCE_AND_FAILURE_MODEL.md` | `REQ-002/006/007`, `DEC-AUTO-006`, `RISK-002/003` |
| Verification/operations/boundary | `PROVIDER_REHEARSAL_TEST_PLAN.md`; `RUNBOOK_ROLLBACK_CLEANUP_AND_INCIDENT.md`; `AUTHORIZATION_PACKET_AND_FINAL_AUDIT.md` | `TEST-001..007`, `GATE-001/002`, `AUTH-001` |

## Decisions

### `DEC-AUTO-001` — Separate export/import rehearsal from Time Travel

Use hosted export into an isolated disposable target for the Beta P0. Do not exercise destructive in-place Time Travel on `ARCH_DB` in this pack. Rejected: treating Time Travel as a clone; Cloudflare explicitly cannot fork a database and restores in place.

### `DEC-AUTO-002` — Keep local mechanics green while provider readiness is red

Represent local export/import mechanics and provider-backed recovery as separate gates. Rejected: changing the local report to provider-backed or making all recovery evidence fail, because both would erase useful truth.

### `DEC-AUTO-003` — Fail closed on source and target identity

Require explicit account/database IDs and refuse identical source/target IDs. Rejected: relying on Wrangler binding names alone, because a misconfigured environment could target the bound database.

### `DEC-AUTO-004` — Invalidate restored sessions before traffic by default

The safe default is revoke/delete restored Better Auth sessions and require reauthentication, with an alternate acceptance possible only through the operating-contract risk decision. The rehearsal proves the blanket delete-all case in the isolated disposable target (no real traffic, so deleting every restored row is safe). It does not prove the selective invalidation a real production cutover requires (preserving post-export legitimate re-authentications while killing pre-export sessions); that selective strategy and its proof are a separate Operating/Release concern. Rejected: assuming database restore preserves the intended revocation timeline.

### `DEC-AUTO-005` — Use deterministic aggregates, not exported row contents, as evidence

Store schema names, counts, keyed digests, violation counts, timings, and pass/fail
labels. The runner uses a `0700` run directory and `0600` files on a verified
encrypted filesystem, immediately envelope-encrypts any export that must persist
or move with a random per-run key held only in process/OS credential storage,
decrypts only for the import window, and destroys plaintext, ciphertext, and key
material before reporting success. Deletion proof includes file/object/key alias
absence readback. Rejected: attaching SQL exports, raw rows, session tokens,
emails, object keys, or key material to plan/release evidence.

### `DEC-AUTO-006` — Measure RTO/RPO from observed provider operations

Record export start, target ready, app verification, and traffic-ready timestamps; compute data age from export/bookmark time. Rejected: copying provider limits into an unmeasured operational claim.

### `DEC-AUTO-007` — Authenticate each disposable probe with an expiring signed nonce

Treat the per-run proof key as bearer-equivalent credential material. Generate at
least 256 random bits for one rehearsal, keep the raw key only in the approved
operator process/OS credential store and the disposable Worker secret, and never
place it in a URL, cookie, body, artifact, command transcript, or log. Each probe
uses the fixed `POST /__recovery/probe` route on the unique noncanonical
`workers.dev` URL, `application/json`, an at-most 8 KiB stream-capped body bound
by a per-request arrival deadline, the run ID, a five-minute timestamp window,
and a unique random nonce covered by an HMAC over
method/path/run/timestamp/nonce/body digest. The signed run ID must equal the
independent Worker-secret configuration before nonce/cardinality access, using a
constant-time comparison whose timing is indistinguishable from an HMAC failure
so the five-failed-attempts/minute cap bounds any residual timing oracle. Before
deploy, list existing Workers in the account and refuse on a name collision so a
repeated run ID cannot overwrite another Worker. Before application dispatch,
atomically insert only the nonce digest into a run-scoped disposable-target
table, reject duplicate/expired/invalid signatures, and enforce at most 32
successful probes plus five failed attempts per minute per run. Destroy the Worker
secret, operator key alias, and nonce/attempt table during cleanup, delete the
Worker/URL, prove every absence, and run a delayed second URL-absence re-check to
cover workers.dev edge propagation. Rejected: a reusable static header, because
it has no replay, expiry, request-binding, or bounded-use proof; rejected:
non-constant-time secret comparison, because it leaks the expected run ID despite
the safe error envelope.

## Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| `RISK-001` | Readiness or its release artifact remains a false positive/stale. | Regression-first predicate repair, version/freshness binding, strict release consumer; `UNIT-001/005`, `AC-001/006`. |
| `RISK-002` | Source/target confusion or incomplete export/key/resource cleanup mutates production or exposes credential material. | Unique IDs, identical-ID refusal, allowlist, `0700/0600` encrypted temp lifecycle, key destruction, explicit commands, independent absence readback; `UNIT-002/006`, `AC-002/007`. |
| `RISK-003` | Counts match while schema/authz/application/session behavior is corrupt, restored sessions become reachable, or a copied proof credential can replay application probes. | Layered schema/checksum/FK/orphan proof; offline session invalidation before ingress; request-bound HMAC, expiring nonce, bounded attempts/body/method, repository denial/isolation, controlled-write and credential cleanup matrix; `UNIT-003/004/006`, `AC-003/004/005`. |

## Authorization Boundary

### `AUTH-001` — Disposable Cloudflare recovery rehearsal

The request must name the authorized Cloudflare account, hosted source database,
new disposable D1 database and Worker/environment, exact
create/export/import/deploy/test/destroy commands, anticipated export blocking
window, proof-secret/key-alias names only, five-minute request window, probe and
attempt caps, data-handling/retention, cost/free-tier confirmation, rollback,
cleanup verifier, and evidence paths. It must explicitly exclude `ARCH_DB` Time
Travel and any unrelated account/project. Approval is scoped to one rehearsal run
and expires after cleanup; it never authorizes disclosure or reuse of the raw
proof key.

## Applicability Gates

- `CONTRACT`: version the provider-recovery artifact and strict consumer.
- `DATA`: schema/integrity/orphan/session/cleanup guarantees.
- `SEC`: exports and restored sessions are credential-sensitive; least privilege and redaction mandatory.
- `VERIFY`: local mechanics, hosted import, application, authz, and cleanup are separate proof classes.
- `OPS`: RTO/RPO, operator runbook, incident path, rollback, and repeat schedule.
- `CLEAN`: disposable resources and exports have verified deletion, not an assumed command result.
- `GATE-AGENT-01`: `N/A`. The pack does not change prompt, skill, payload,
  routing, memory, state, or completion contracts. A hosted operator, lead, and
  distinct verifier are ordinary execution roles; `Beta-Readiness-Program` owns
  cross-pack orchestration.
