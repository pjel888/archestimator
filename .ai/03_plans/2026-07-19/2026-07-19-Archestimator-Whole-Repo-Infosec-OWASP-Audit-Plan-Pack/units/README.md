# units/README.md

Each `NNN-<slug>.md` is one remediation unit per the master prompt §16 contract. The `plan-pack.json` `units[]` array mirrors the metadata here.

| Unit | Title | Severity closed | Status | Priority | Depends on |
|---|---|---|---|---|---|
| `UNIT-001` | [Realtime token revocation](./001-realtime-token-revocation.md) | High (`SEC-COLLAB-003`) | READY | P0 | — |
| `UNIT-002` | [Worker-edge seam](./002-worker-edge-seam.md) | Medium (`SEC-WORKER-002`, `SEC-OPS-001`) | READY | P1 | — |
| `UNIT-003` | [Constant-time bearer + secret cleanup](./003-constant-time-bearer-and-secret-cleanup.md) | Medium (`SEC-CRYPTO-001/002/003`) | READY | P2 | — |
| `UNIT-004` | [Email boundary chokepoint](./004-email-boundary-chokepoint.md) | Low (`SEC-EXT-001/002/003`) | READY | P1 | — |
| `UNIT-005` | [Scan-bind invariant](./005-scan-bind-invariant.md) | Medium (`SEC-UPLOAD-001/002`) | READY | P0 | — |
| `UNIT-006` | [Direct-upload finalize integrity](./006-direct-upload-finalize-integrity.md) | Medium (`SEC-UPLOAD-003/004`) | READY | P2 | — |
| `UNIT-007` | [Scan byte ceiling](./007-scan-byte-ceiling.md) | Medium/Low (`SEC-UPLOAD-005`, `SEC-OPS-003`) | READY | P3 | — |
| `UNIT-008` | [Queue message signing](./008-queue-message-signing.md) | Medium (`SEC-OPS-004`) | READY | P2 | — |
| `UNIT-009` | [Browser hardening](./009-browser-hardening.md) | Medium (`SEC-BROWSER-001/003/005`) | READY | P1 | — |
| `UNIT-010` | [Cron redaction + audit PII](./010-cron-redaction-and-audit-pii.md) | Medium (`SEC-LOG-*`, `SEC-OPS-007`, `SEC-PRIV-001`) | READY | P2 | — |
| `UNIT-011` | [Retention registry](./011-retention-registry.md) | Medium (`SEC-PRIV-002`) | READY | P2 | — |
| `UNIT-012` | [CI + branch protection](./012-ci-and-branch-protection.md) (AUXILIARY) | Medium (`SEC-CI-001/002`, `SEC-SUPPLY-001`) | READY | P2 | — |
| `UNIT-013` | [Defense-in-depth backlog](./013-defense-in-depth-backlog.md) | Low/Latent (19 folded) | READY | P3 | — |

All 13 units have `depends_on: []` — the DAG is flat and acyclic. `UNIT-001` is `next_unit` because it closes the only High. The executor may pick any order for the rest; the wave guidance in [`06-REMEDIATION-ROADMAP-AND-SECURITY-GATES.md`](../06-REMEDIATION-ROADMAP-AND-SECURITY-GATES.md) §6.5 recommends a launch-readiness subset for first-external-user prep.
