# Verification, Rollout, And Final Audit

## Proof Matrix

| Test | Criterion | Evidence and expected signal |
| --- | --- | --- |
| `TEST-001` | `AC-001` | Focused readiness/release fixtures: local-only, provider-false, stale, contradictory, missing check, revision mismatch are red; local mechanics remains independently green. |
| `TEST-002` | `AC-002` | Dry-run/preflight never calls Cloudflare and refuses unsafe identities, unencrypted/unrestricted temp storage, bad modes, reused key aliases, or canonical ingress; hosted lifecycle shows unique disposable resources and exact cleanup under `AUTH-001`. |
| `TEST-003` | `AC-003` | Fixture and hosted integrity suite catches migration/schema/count/checksum/FK/orphan/integer defects; clean target is green. |
| `TEST-004` | `AC-004` | Worker is absent/unrouted during import and offline invalidation; after temporary operator-only ingress, restored read, controlled write/rollback, protected/public denial, and workspace-isolation matrix passes. |
| `TEST-005` | `AC-005` | Pre-recovery session canary is invalidated offline before ingress, fails after ingress, and fresh disposable authentication succeeds; outputs contain no tokens. |
| `TEST-006` | `AC-006` | Artifact schema/freshness/revision/RTO/RPO/cleanup fixtures pass and release consumer rejects every incomplete case. |
| `TEST-007` | `AC-007` | Hosted pre/post inventory, `0700/0600` and encrypted-filesystem preflight, per-run encryption/key destruction, bounded plaintext window, free-tier confirmation, and independent plaintext/ciphertext/key/route/Worker/D1 absence checks pass. |

## Gates

### `GATE-001` — Local recovery implementation (`FAIL`)

Run focused Vitest suites, typecheck, error-handling gate, script dry-run fixtures, temp-D1 integrity/authz tests, plan-pack validation, and diff check. Expected: no external call and current local artifact cannot satisfy provider readiness.

### `GATE-002` — Provider-backed rehearsal (`BOUNDARY`, `AUTH-001`)

Requires live Cloudflare identity/plan/backend preflight, isolated disposable source/target proof, full integrity/app/authz/session matrix, measured RTO/RPO, evidence artifact, strict release consumer, and independent cleanup readback. Local execution cannot satisfy it.

## Adversarial Cases

- Source and target IDs resolve to the same database.
- Default binding silently selects `ARCH_DB`.
- Export blocks staging longer than the approved window or exceeds import limits.
- Export contains virtual tables, precision-sensitive integers, raw session tokens, or unexpected schema.
- Temp directory/file modes are permissive, filesystem encryption is not proven,
  plaintext survives the bounded window, encryption key is reused/logged, or
  delete succeeds without file/object/key absence readback.
- Import succeeds but migration ledger, trigger/index, row digest, FK, or orphan check differs.
- Same-workspace access passes while foreign-workspace denial fails.
- A revoked session becomes valid again after restore.
- Worker preview/custom ingress becomes reachable before offline restored-session
  invalidation, or canonical domain routing is attached at any point.
- Controlled write persists after rollback/cleanup.
- Runner crashes after create/import/deploy and cleanup partially fails.
- Evidence is current but targets another account/database/app revision.
- Time Travel limits are copied into claimed RTO/RPO without observed measurement.

## Rollout

1. Land regression-first predicate repair and versioned evidence schema.
2. Land dry-run orchestration and temp-D1 integrity/authz/session probes.
3. Make release truth consume the new artifact but remain red.
4. Review the exact `AUTH-001` packet; discover current provider constraints and export window.
5. Execute one staging-source-to-disposable-target rehearsal.
6. Destroy and independently verify cleanup before marking the provider artifact complete.
7. Schedule the next evidence expiry/rehearsal without enabling paid retention.

## Rollback And Incident Path

- Before any hosted command, capture current resource inventory and a fresh source bookmark/export metadata.
- If source availability degrades during export, abort and follow the operating incident contract; do not continue import merely to complete evidence.
- If the disposable target is corrupt, retain only redacted diagnostics, destroy it, and keep release red.
- If a write hits the bound database or cleanup fails, escalate as a data-integrity/security incident and stop all release activity.
- Production Time Travel remains a separately authorized incident operation; this rehearsal does not grant or exercise it.

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
  reachable; the temporary operator-only ingress and canonical-route absence are proven.
- [ ] Disposable Worker, D1, export objects/files, variables, and credentials are absent after cleanup.
- [ ] Distinct verifier confirms the artifact and cleanup.
- [ ] Release truth consumes the artifact and enforces freshness.

Stop only after the hosted evidence and cleanup are both green. An imported SQL file without application/authz/session proof is a failure.
