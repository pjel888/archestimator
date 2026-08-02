# units/README.md

> **Historical provenance only.** Every unit is `SUPERSEDED` by `DEC-AUTO-007`
> without an implementation claim. Current execution authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

Each `NNN-<slug>.md` preserves one original remediation proposal. The
`plan-pack.json` `units[]` array mirrors the retired status here.

| Unit | Title | Severity closed | Status | Priority | Depends on |
|---|---|---|---|---|---|
| `UNIT-001` | [Realtime token revocation](./001-realtime-token-revocation.md) | High (`SEC-COLLAB-003`) | SUPERSEDED | P0 | — |
| `UNIT-002` | [Worker-edge seam](./002-worker-edge-seam.md) | Medium (`SEC-WORKER-002`, `SEC-OPS-001`) | SUPERSEDED | P1 | — |
| `UNIT-003` | [Constant-time bearer + secret cleanup](./003-constant-time-bearer-and-secret-cleanup.md) | Medium (`SEC-CRYPTO-001/002/003`) | SUPERSEDED | P2 | — |
| `UNIT-004` | [Email boundary chokepoint](./004-email-boundary-chokepoint.md) | Low (`SEC-EXT-001/002/003`) | SUPERSEDED | P1 | — |
| `UNIT-005` | [Scan-bind invariant](./005-scan-bind-invariant.md) | Medium (`SEC-UPLOAD-001/002`) | SUPERSEDED | P0 | — |
| `UNIT-006` | [Direct-upload finalize integrity](./006-direct-upload-finalize-integrity.md) | Medium (`SEC-UPLOAD-003/004`) | SUPERSEDED | P2 | — |
| `UNIT-007` | [Scan byte ceiling](./007-scan-byte-ceiling.md) | Medium/Low (`SEC-UPLOAD-005`, `SEC-OPS-003`) | SUPERSEDED | P3 | — |
| `UNIT-008` | [Queue message signing](./008-queue-message-signing.md) | Medium (`SEC-OPS-004`) | SUPERSEDED | P2 | — |
| `UNIT-009` | [Browser hardening](./009-browser-hardening.md) | Medium (`SEC-BROWSER-001/003/005`) | SUPERSEDED | P1 | — |
| `UNIT-010` | [Cron redaction + audit PII](./010-cron-redaction-and-audit-pii.md) | Medium (`SEC-LOG-*`, `SEC-OPS-007`, `SEC-PRIV-001`) | SUPERSEDED | P2 | — |
| `UNIT-011` | [Retention registry](./011-retention-registry.md) | Medium (`SEC-PRIV-002`) | SUPERSEDED | P2 | — |
| `UNIT-012` | [CI + branch protection](./012-ci-and-branch-protection.md) (AUXILIARY) | Medium (`SEC-CI-001/002`, `SEC-SUPPLY-001`) | SUPERSEDED | P2 | — |
| `UNIT-013` | [Defense-in-depth backlog](./013-defense-in-depth-backlog.md) | Low/Latent (19 folded) | SUPERSEDED | P3 | — |

All 13 units retain `depends_on: []` as historical DAG provenance. The retired
pack has `next_unit=null` and `ready_slices=[]`; no executor may select work from
this folder.
