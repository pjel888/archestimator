# 08 — Security, Privacy, and Threat Model

## 8.1 Scope and trust boundary

This plan introduces **read-only** developer/CI tooling (schema verifier, migration-state
ledger, doc-count guard) and **documentation edits**. It does not introduce any new
user-facing route, mutation, authentication surface, or external integration. The security
surface is therefore narrow but real: the scripts read potentially sensitive metadata from
the D1 catalog and from documentation.

**Trust boundary:** the scripts run in the developer/CI environment and invoke the Wrangler
CLI. For `--remote`, they cross the trust boundary into the hosted Cloudflare D1 API
(authorized by the owner's Cloudflare credentials).

## 8.2 Threat model

| Asset | Actor / entry point | Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| D1 catalog metadata (`sqlite_master`, column definitions) | Developer / CI running verifier | Catalog metadata could include sensitive column names (rare; Archestimator's columns are non-sensitive — `id`, `workspace_id`, `email_hash`, etc.) | Low | Low | Verifier prints only object names + presence; does not dump row data. Existing pattern (`better-auth-proof-router.ts`) already does this safely. |
| Cloudflare credentials | Developer running `--remote` | Credential leak via the script | Very Low | High | Scripts use `bunx wrangler` which reads creds from the environment/wrangler config; scripts do NOT read `.env*`, print tokens, or log command args with creds. Matches `generate-cloudflare-d1-restore-rehearsal.ts:347` note pattern. |
| Remote D1 schema | Malicious / mistaken `--remote` apply | The verifier/ledger are read-only (`d1 execute --command "SELECT …"` / `d1 migrations list`); they do NOT apply or mutate. The only mutation risk is if a developer follows the fix-forward runbook incorrectly. | Low | High | Fix-forward SQL is documented as owner-gated; class R (`0035`) has explicit "never re-run" guidance (§7.3). |
| Compliance posture claims | Stale docs claiming migrations are applied when they aren't | Overstating security/compliance readiness | Medium | High | This is the problem the plan SOLVES: REQ-SEC-01 verifies `privacy_requests`/`data_retention_events`/`account_security_events` HMAC presence; REQ-OPS-01 guards doc drift. |
| Audit trail integrity (`account_security_events`) | `0035` partially applied remotely | Audit hashes still `sha256:` (legacy) instead of keyed `hmac-sha256:` | Medium (per `current-state.md:271`) | Medium | REQ-SEC-01 compliance gate checks the CHECK constraint includes the `hmac-sha256:` branch; if absent remotely, flag as P0 drift. |

## 8.3 Security-relevant migration findings

- **`0033` (`privacy_requests`)** — DSAR register. Anonymous intake allowed (intentional;
  identity verified at triage, per migration comment). Stores `requester_email_hash`,
  `ip_hash`, `user_agent_hash` (all hashed, not raw). **Security risk if absent remotely:**
  the privacy/intake route would fail OR (worse) silently no-op. REQ-SEC-01 verifies presence.
- **`0034` (`data_retention_events`)** — retention audit trail. If absent remotely, retention
  crons (`30 3 * * *`) cannot log their actions → compliance gap. REQ-SEC-01 verifies presence.
- **`0035` (`account_security_events` HMAC upgrade)** — security-audit hashing integrity. If
  pending remotely (per `current-state.md:271`), audit digests are still legacy `sha256:`,
  vulnerable to offline collision/rainbow attacks that HMAC mitigates. REQ-SEC-01 verifies
  the CHECK constraint includes the `hmac-sha256:` branch.

## 8.4 Input validation

- The scripts parse Wrangler CLI output (JSON via `--json`). Parsing is strict: a malformed
  response → non-zero exit (fail-closed), never a false PASS.
- The doc-count guard parses markdown via regex; on a regex miss (e.g., docs reworded), it
  fails-closed (flag for review) rather than silently passing.

## 8.5 Authorization

- Local scripts: no auth (developer machine).
- `--remote`: authorized by the owner's Cloudflare credentials and the standing
  Cloudflare-resource authorization in `AGENTS.md` (scoped to `ARCH_DB`). Read-only
  commands (`d1 migrations list`, `d1 execute --command "SELECT …"`) are within scope.
- No Server Action / route / RPC is added → no new authorization surface.

## 8.6 Secrets handling

- The scripts do NOT read `.env*`, do NOT print secret values, do NOT log bearer/cookie/token
  material. They invoke `bunx wrangler`, which handles credentials via its own config.
- No `NEXT_PUBLIC_` exposure (no client code).
- Evidence artifacts (JSON/MD output) contain only object names and PASS/FAIL — no row data,
  no credentials. Matches the redaction standard in `AGENTS.md` ("GitHub Security PR Loop").

## 8.7 Tenant isolation

- The verifier/ledger operate at the schema level (catalog), not the row level. There is no
  workspace/tenant data access → no tenant-isolation risk.
- Cross-workspace access: n/a (no row queries).

## 8.8 Abuse / rate limits

- D1 free-tier request limits: catalog reads (4 round-trips per verify run) are negligible.
  No abuse vector.

## 8.9 Auditability

- Every `--remote` run should record its output as an evidence artifact (JSON/MD under a
  documented path), consistent with the `cf:d1-*` family convention. This creates an audit
  trail of "what we believed the remote state was, when."

## 8.10 Privacy

- The scripts do not process personal data. `sqlite_master` contains object names, not user
  data. No privacy implication.
- The compliance tables (`privacy_requests`, `data_retention_events`) are verified for
  **presence**, not their row contents.

## 8.11 Incident-response implications

- If `DB-INT-02` reveals a compliance table (`privacy_requests`/`data_retention_events`) is
  absent remotely, that is a P0 incident: the compliance program has been operating against
  a non-existent table. The fix-forward is `wrangler d1 migrations apply ARCH_DB --remote`
  for the specific class-A migration (0033/0034 are safe to apply), owner-gated, followed by
  a re-verify.
- If `0035` is absent remotely, audit hashing is legacy; apply per §7.3 (never re-run blindly).

## 8.12 CSP / frame / referrer / download

Not applicable — no user-facing pages, no downloads, no frames.

## 8.13 Denial tests required for future implementation

- **Verifier false-positive denial:** construct a local D1 missing one table; assert the
  verifier reports it as FAIL (not PASS).
- **Verifier false-negative denial:** construct a local D1 with all expected tables; assert
  PASS.
- **Guard false-negative denial:** introduce a stale count in a test fixture of `README.md`;
  assert the guard exits non-zero.
- These are covered in `12_TEST_AND_VALIDATION_STRATEGY.md`.
