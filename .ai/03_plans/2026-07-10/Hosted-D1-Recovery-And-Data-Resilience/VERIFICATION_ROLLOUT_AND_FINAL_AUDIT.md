# Verification, Rollout, And Final Audit

## Proof Matrix

| Test | Criterion | Evidence and expected signal |
| --- | --- | --- |
| `TEST-001` | `AC-001` | Focused readiness/release fixtures: local-only, provider-false, stale, contradictory, missing check, revision mismatch are red; local mechanics remains independently green. |
| `TEST-002` | `AC-002` | Dry-run/preflight never calls Cloudflare and refuses unsafe identities, exhausted Free database count, source/target over 500 MB, account storage over 5 GB after creation, import over 5 GB, paid/non-Free plan, unencrypted/unrestricted temp storage, bad modes, reused key aliases, or canonical ingress; hosted lifecycle shows unique disposable resources and exact cleanup under `AUTH-001`. |
| `TEST-003` | `AC-003` | Fixture and hosted integrity suite catches migration/schema/count/checksum/FK/orphan/integer defects; clean target is green. |
| `TEST-004` | `AC-004` | Worker is absent during import and offline invalidation; the unique `workers.dev` Worker has `routes=[]`, no custom domain, and only the disposable D1 binding; it rejects wrong method/path/content type, configured-run-ID mismatch, missing/invalid/expired signature, reused nonce, over-limit body with and without `Content-Length`, attempt/success overflow, and direct application bypass before dispatch; then restored read, controlled write/rollback, protected/public denial, workspace isolation, Worker deletion, and exact-URL absence pass. |
| `TEST-005` | `AC-005` | Pre-recovery session canary is invalidated offline before ingress, fails after ingress, and fresh disposable authentication succeeds; outputs contain no tokens. |
| `TEST-006` | `AC-006` | `D1-RECOVERY-RECEIPT-v1` schema/identity/freshness/revision/result/RTO/RPO/check/cleanup fixtures pass; strict release and Beta Operating consumers reject every incomplete, stale, mismatched, failed, or dirty-cleanup case without rerunning recovery. |
| `TEST-007` | `AC-007` | Hosted pre/post inventory records current database count/limit, account storage, source/export/import size, 500 MB target fit, 5 GB account fit, 5 GB import ceiling, `0700/0600` and encrypted-filesystem preflight, export key destruction, proof-secret/key-alias and nonce/attempt-state destruction, bounded plaintext window, and independent plaintext/ciphertext/key/secret/route/Worker/D1 absence checks. |

## Gates

### `GATE-001` — Local recovery implementation (`FAIL`)

Run focused Vitest suites, typecheck, error-handling gate, script dry-run fixtures, temp-D1 integrity/authz tests, plan-pack validation, and diff check. Expected: no external call and current local artifact cannot satisfy provider readiness.

### `GATE-002` — Provider-backed rehearsal (`BOUNDARY`, `AUTH-001`)

Requires live Cloudflare identity/plan/backend preflight, isolated disposable source/target proof, full integrity/app/authz/session matrix, measured RTO/RPO, evidence artifact, strict release consumer, and independent cleanup readback. Local execution cannot satisfy it.

## Adversarial Cases

`PROVIDER_REHEARSAL_TEST_PLAN.md` is the detailed setup, denial, concurrency,
failure-injection, evidence, and cleanup matrix. At minimum the final checker
must challenge source/target collision, `ARCH_DB` defaulting, every Free limit,
unsafe export/key/plaintext lifecycle, migration/data drift, foreign-workspace
access, restored-session resurrection, pre-invalidation ingress, route/binding/
run-ID confusion, HMAC/replay/body/rate races, controlled-write residue, phase
crash cleanup, wrong receipt identity/revision, and inferred rather than measured
RTO/RPO. A provider success response cannot override a failed check or readback.

## Rollout

`RUNBOOK_ROLLBACK_CLEANUP_AND_INCIDENT.md` owns the detailed checkpoints and
go/no-go contract. The fixed sequence remains fail-closed predicates and schema,
dry-run/integrity/auth/session mechanics, red strict consumers, exact `AUTH-001`
review, one source-to-disposable-target rehearsal, independent cleanup, then an
expiry/rerun decision without paid retention.

## Rollback And Incident Path

The full rollback, cleanup, and incident contract is in
`RUNBOOK_ROLLBACK_CLEANUP_AND_INCIDENT.md`. Safety invariants remain: capture
inventory before mutation, abort on source impact, destroy a corrupt disposable
target after bounded redacted diagnosis, treat bound-database writes or cleanup
failure as data/security incidents, and never infer Time Travel authority from
this rehearsal.

## Completion Audit

- [ ] `BETA-P0-03` is linked to one current provider-backed, non-local artifact.
- [ ] False-positive local evidence is rejected by readiness and release gates.
- [ ] Source/target/account/revision/export digest identities agree.
- [ ] Migration, schema, data, FK/orphan, application, authz, and controlled-write checks pass.
- [ ] Post-restore session behavior is explicitly decided and proven.
- [ ] RTO/RPO are observed, not inferred from provider docs.
- [ ] No raw export, token, email, object key, or credential is in evidence.
- [ ] Export temp modes, encrypted filesystem, per-run key lifecycle, bounded
  plaintext window, and independent plaintext/ciphertext/key deletion are proven.
- [ ] Restored sessions were invalidated before any disposable Worker ingress was
  reachable; the unique `workers.dev` endpoint, configured run ID, `routes=[]`,
  disposable-only binding, deletion, exact-URL absence, and canonical-route absence are proven.
- [ ] The final receipt contains the Program `BETA-P1-10` explicit N/A scan and independent verifier result.
- [ ] Proof requests are method/path/body bound, expire within five minutes,
  reject nonce replay and rate/usage overflow before application dispatch, and
  emit only redacted denial/correlation evidence.
- [ ] Disposable Worker, D1, export objects/files, variables, and credentials are absent after cleanup.
- [ ] Distinct verifier confirms the artifact and cleanup.
- [ ] `D1-RECOVERY-RECEIPT-v1` contains the frozen identity, revision, result,
  timing, check, session, cleanup, and validity fields; release truth and Beta
  Operating consume it strictly without rerunning recovery.

Stop only after the hosted evidence and cleanup are both green. An imported SQL file without application/authz/session proof is a failure.
