# Requirements And Decisions

## Requirements

| ID | Requirement | Acceptance boundary |
| --- | --- | --- |
| `REQ-001` | Recovery readiness rejects local-only, non-provider, stale, incomplete, or mismatched evidence. | Existing local artifact makes the provider gate red while its local-mechanics gate remains truthful. |
| `REQ-002` | Hosted orchestration uses an explicitly authorized source and uniquely named disposable D1/Worker target with preflight, dry-run, and cleanup. | No command can default to `ARCH_DB`; source/target/account/environment are printed redacted and require an exact confirmation token. |
| `REQ-003` | Export/import proof validates migration ledger, schema objects, critical row counts/checksums, foreign keys, orphans, and documented export caveats. | All checks pass against the isolated target and are tied to the export digest. |
| `REQ-004` | The restored application proves representative reads, one controlled write/rollback, protected denial paths, and cross-workspace isolation. | Disposable Worker routes behave like the source contract without exposing real user data or credentials. |
| `REQ-005` | Recovery explicitly invalidates or documents acceptance of restored Better Auth sessions and verifies the result. | A token valid only before the recovery point cannot authenticate after the approved invalidation procedure. |
| `REQ-006` | A release-consumable artifact records current provider evidence, RTO/RPO, operator, commands, failures, rollback, and cleanup. | Release truth rejects missing/stale/dirty-cleanup evidence and joins the exact schema/app revision. |
| `REQ-007` | Rehearsal preserves free-tier posture and bounded data exposure through an executable export/key/ingress lifecycle. | No paid feature is enabled; temp directory/file modes are `0700/0600` on a preflighted encrypted filesystem; a per-run key encrypts transfer/rest storage and is never logged; plaintext, ciphertext, key alias, Worker route, and target are destroyed with independent absence readback. |

## Criteria

| ID | Requirement | Current | Planned proof |
| --- | --- | --- | --- |
| `AC-001` | `REQ-001` | `FAIL` | `TEST-001` adds local-only/provider-false/stale/malformed regression fixtures to readiness and release gates. |
| `AC-002` | `REQ-002` | `BOUNDARY` | `TEST-002` proves safe CLI preflight locally, then disposable resource lifecycle under `AUTH-001`. |
| `AC-003` | `REQ-003` | `FAIL` | `TEST-003` verifies schema/data integrity against controlled fixtures and hosted target. |
| `AC-004` | `REQ-004` | `FAIL` | `TEST-004` runs restored app read/write/rollback and denial/isolation matrix. |
| `AC-005` | `REQ-005` | `FAIL` | `TEST-005` proves post-restore session policy with pre/post tokens and no token disclosure. |
| `AC-006` | `REQ-006` | `FAIL` | `TEST-006` validates artifact schema, freshness, RTO/RPO, exact revisions, and release-gate consumption. |
| `AC-007` | `REQ-007` | `BOUNDARY` | `TEST-007` records plan/backend/size preflight, storage/access/cleanup proof, and no paid changes under `AUTH-001`. |

## Decisions

### `DEC-AUTO-001` — Separate export/import rehearsal from Time Travel

Use hosted export into an isolated disposable target for the Beta P0. Do not exercise destructive in-place Time Travel on `ARCH_DB` in this pack. Rejected: treating Time Travel as a clone; Cloudflare explicitly cannot fork a database and restores in place.

### `DEC-AUTO-002` — Keep local mechanics green while provider readiness is red

Represent local export/import mechanics and provider-backed recovery as separate gates. Rejected: changing the local report to provider-backed or making all recovery evidence fail, because both would erase useful truth.

### `DEC-AUTO-003` — Fail closed on source and target identity

Require explicit account/database IDs and refuse identical source/target IDs. Rejected: relying on Wrangler binding names alone, because a misconfigured environment could target the bound database.

### `DEC-AUTO-004` — Invalidate restored sessions before traffic by default

The safe default is revoke/delete restored Better Auth sessions and require reauthentication, with an alternate acceptance possible only through the operating-contract risk decision. Rejected: assuming database restore preserves the intended revocation timeline.

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

## Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| `RISK-001` | Readiness or its release artifact remains a false positive/stale. | Regression-first predicate repair, version/freshness binding, strict release consumer; `UNIT-001/005`, `AC-001/006`. |
| `RISK-002` | Source/target confusion or incomplete export/key/resource cleanup mutates production or exposes credential material. | Unique IDs, identical-ID refusal, allowlist, `0700/0600` encrypted temp lifecycle, key destruction, explicit commands, independent absence readback; `UNIT-002/006`, `AC-002/007`. |
| `RISK-003` | Counts match while schema/authz/application/session behavior is corrupt or restored sessions become reachable. | Layered schema/checksum/FK/orphan proof; offline session invalidation before ingress; repository, denial, isolation, controlled-write and cleanup matrix; `UNIT-003/004/006`, `AC-003/004/005`. |

## Authorization Boundary

### `AUTH-001` — Disposable Cloudflare recovery rehearsal

The request must name the authorized Cloudflare account, hosted source database, new disposable D1 database and Worker/environment, exact create/export/import/deploy/test/destroy commands, anticipated export blocking window, credential names only, data-handling/retention, cost/free-tier confirmation, rollback, cleanup verifier, and evidence paths. It must explicitly exclude `ARCH_DB` Time Travel and any unrelated account/project. Approval is scoped to one rehearsal run and expires after cleanup.

## Applicability Gates

- `CONTRACT`: version the provider-recovery artifact and strict consumer.
- `DATA`: schema/integrity/orphan/session/cleanup guarantees.
- `SEC`: exports and restored sessions are credential-sensitive; least privilege and redaction mandatory.
- `VERIFY`: local mechanics, hosted import, application, authz, and cleanup are separate proof classes.
- `OPS`: RTO/RPO, operator runbook, incident path, rollback, and repeat schedule.
- `AGENT`: one hosted operator; verifier must be distinct; no concurrent resource mutation.
- `CLEAN`: disposable resources and exports have verified deletion, not an assumed command result.
