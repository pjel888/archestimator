# 06 — Remediation Roadmap and Security Gates

> **Historical provenance only.** All 13 units are `SUPERSEDED`; this roadmap is
> non-runnable. Current execution authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

## 6.1 Wave plan (dependency-ordered)

Waves preserve the original remediation ordering for provenance. They are not
current sequencing guidance and no unit may be executed from this predecessor.

### Wave 0 — Immediate containment / prerequisite truth

**`UNIT-001` — Realtime token revocation via DO SQLite denylist + ≤60s TTL**

- Closes the single accepted High (`SEC-COLLAB-003`).
- No dependencies; smallest coherent fix; uses already-provisioned DO SQLite storage.
- Historical first unit only; the retired pack now has `next_unit = null`.
- Acceptance: after revoking a member, an attempt to reconnect with the old HMAC token within 60s is rejected by `authorizeSocket`. (TEST_PROPOSAL `MVP_CRITICAL_INVARIANT` — not authorized by this pack.)

### Wave 1 — Identity, access control, worker-edge seam

- **`UNIT-002`** — Disable `workers_dev` for production Worker (or move proof routes to dedicated secret + Cloudflare Access gate). Closes `SEC-WORKER-002`, `SEC-OPS-001`. Touches `wrangler.jsonc` + `worker.ts` route guard.
- **`UNIT-003`** — Constant-time bearer compares everywhere; collapse legacy realtime-token secret fallback. Closes `SEC-CRYPTO-001/002/003`. Touches 8 proof routers + `collaboration-room.ts` + `realtime-room-token.ts`.
- **`UNIT-004`** — Email boundary chokepoint: strip CRLF + escape HTML in `cloudflare-email-client.ts`. Closes `SEC-EXT-001/002/003`. Single-file fix.
- **`UNIT-005`** — Require `scan_status='clean'` (or active override) at component-attachment bind; document policy-scanner as the control OR wire a real scanner. Closes `SEC-UPLOAD-001/002`. Touches `component-mutation-d1.ts` guards + scanner wiring decision.

### Wave 2 — Uploads, realtime, async trust, browser hardening

- **`UNIT-006`** — Direct-upload finalize: re-validate magic bytes + verify content checksum from R2 bytes. Closes `SEC-UPLOAD-003/004`.
- **`UNIT-007`** — Add `MAX_UPLOAD_SCAN_BYTES` per-object ceiling + `failed_permanent` after N transient failures. Closes `SEC-UPLOAD-005`, `SEC-OPS-003`.
- **`UNIT-008`** — Sign upload queue messages (HMAC) + server-derive idempotency keys. Closes `SEC-OPS-004`.
- **`UNIT-009`** — `/invite/:token` `Cache-Control: no-store` + share-page CSP nonce pipeline (remove `unsafe-inline`/`unsafe-eval`) + NODE_ENV-conditional `Secure` flag → request-derived. Closes `SEC-BROWSER-001/003/005`.

### Wave 3 — Observability, privacy, supply chain, defense-in-depth

- **`UNIT-010`** — Worker cron error paths route through `logAppError`/`emitLogRecord`; admin audit `actor_email` hashing/retention; client-error `user_agent` truncation. Closes `SEC-LOG-001/002/003`, `SEC-OPS-007`, `SEC-PRIV-001`.
- **`UNIT-011`** — Retention registry: cover `admin_audit_events`/`client_error_events`/`web_vital_events`/`ops_run_events`/`cron_run_events`/`data_retention_events`; cron verifies superset list. Closes `SEC-PRIV-002`.
- **`UNIT-012`** (AUXILIARY) — Re-enable CI gates (`ci.yml`, `codeql.yml`, `dependency-review.yml`, `dependabot.yml`); configure branch protection; pin `omx`/`codex` in `skills:update`. Closes `SEC-CI-001/002`, `SEC-SUPPLY-001`. **Hosted GitHub state verification gated by `AUTH-001`.**
- **`UNIT-013`** — Data-layer + worker-edge + realtime defense-in-depth backlog (folded Low/Informational findings: `SEC-AUTHZ-001`, `SEC-AUTH-001`, `SEC-COLLAB-001/002/004/005/006/007`, `SEC-WORKER-004/005`, `SEC-SHARE-001/002`, `SEC-OPS-005/006`, `SEC-BROWSER-002/007`, `SEC-AI-001/002`, `SEC-AUTH-003`).

## 6.2 Unit DAG (acyclic — verified by validator)

```
UNIT-001 (Wave 0, no deps)         → DONE/PASS gates UNIT-001 only
UNIT-002 (Wave 1, no deps)
UNIT-003 (Wave 1, no deps)
UNIT-004 (Wave 1, no deps)
UNIT-005 (Wave 1, no deps)
UNIT-006 (Wave 2, no deps)
UNIT-007 (Wave 2, no deps)
UNIT-008 (Wave 2, no deps)
UNIT-009 (Wave 2, no deps)
UNIT-010 (Wave 3, no deps)
UNIT-011 (Wave 3, no deps)
UNIT-012 (Wave 3, no deps) — AUXILIARY
UNIT-013 (Wave 3, no deps)
```

All 13 units retain their original empty `depends_on` arrays as provenance, but
each is now `SUPERSEDED`; `ready_slices=[]` and `next_unit=null`.

## 6.3 Security gates

| Gate | Triggers | Units affected |
|---|---|---|
| GATE-SEC-01 (Auth and Secrets) | Token lifecycle, identity, denial paths | `UNIT-001`, `UNIT-003`, `UNIT-013` |
| GATE-DATA-01 (D1 and Cloudflare State) | Schema/data invariants, transactions, retention | `UNIT-005`, `UNIT-008`, `UNIT-011`, `UNIT-013` |
| GATE-VERIFY-01 (Evidence) | Per-unit acceptance evidence | All units |
| GATE-OPS-01 (Release and Operations) | Hosted-state claims | `UNIT-002`, `UNIT-012` (requires `AUTH-001`), `UNIT-005` (scanner wiring `AUTH-003`) |
| GATE-CLEAN-01 (Cleanup and Migration) | Retention purge design | `UNIT-011` |
| GATE-AGENT-01 (Agent Framework) | Single-writer for shared files | All units (the executor is the single writer for each owned surface) |

## 6.4 Authorization boundaries (`AUTH-*`)

(See `07-BLOCKED-EVIDENCE-AND-AUTHORIZATION.md` for the full record.) Summary of which units have a hosted-state dependency:

- `UNIT-002` — verifying that `workers_dev: false` takes effect requires a deploy (`AUTH-004` — deployment is an authorized external action under `wrangler.jsonc`-bound resources per AGENTS.md, but not under this `PLAN_ONLY` pack).
- `UNIT-005` — wiring a real scanner requires either a paid service or an out-of-process sidecar outside `wrangler.jsonc`-bound resources (`AUTH-003`).
- `UNIT-012` — branch protection / required checks / secret scanning state requires GitHub org admin action (`AUTH-001`).

None of these `AUTH-*` boundaries block the **local code/config edit** portion of any unit. They bound the hosted-evidence claim that can be made after the local edit lands.

## 6.5 Launch-readiness recommendation (advisory, not a blocker)

For first-external-user launch, the recommended minimum remediation set is:

1. `UNIT-001` (the High — must fix before enabling realtime collab with external users).
2. `UNIT-005` (so first users can actually download attachments — currently the scanner default blocks all attachment downloads).
3. `UNIT-002` (defense-in-depth on the worker-edge seam before public traffic ramps).
4. `UNIT-009` (invite-page `no-store` + share CSP nonce pipeline before external `/share/` and `/invite/` traffic).
5. `UNIT-004` (email boundary before external invites go out).

The remaining Mediums (`UNIT-003`, `UNIT-006`, `UNIT-007`, `UNIT-008`, `UNIT-010`, `UNIT-011`, `UNIT-013`) and AUXILIARY (`UNIT-012`) are next-security-wave work.
