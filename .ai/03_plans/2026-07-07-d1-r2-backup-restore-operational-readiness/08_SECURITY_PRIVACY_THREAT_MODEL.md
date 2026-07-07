# 08 — Security, Privacy, and Threat Model

## Trust boundaries

| Boundary | Trust level | Notes |
|---|---|---|
| Operator machine (CLI runs here) | trusted (operator) | wrangler auth via `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` in the operator env, never in repo. |
| This plan folder | public-ish (committed to Git) | Must contain **no secrets** — only redacted ids/hashes/prefixes. |
| `wrangler.jsonc` | committed | Contains **non-secret** resource names + `database_id`s. These are not secrets (they are configuration), but account/bucket names in evidence artifacts should still be redacted to prefixes. |
| D1 prod (`9bdb29bb-…`) | highest-value asset | A destructive restore here is the catastrophic failure mode. |
| D1 preview/isolated | drill target | Disposable; must still be isolated from prod. |
| R2 prod bucket | high-value asset | User upload data; may contain PII in image bytes. |
| R2 preview bucket | drill target | Disposable. |
| Historical Supabase / other providers | out of bounds | Never touched. |

## Threat model (STRIDE-shaped, scoped to backup/restore)

| Threat | Surface | Risk | Control |
|---|---|---|---|
| **Spoofing** of the restore target | operator passes wrong `database_id` to `execute --remote --file` | **Catastrophic**: destructive import overwrites prod | REQ-SEC-02: hard assertion target ≠ `9bdb29bb-…`, parsed from `wrangler.jsonc`, abort on match. |
| **Tampering** of the `.sql` dump between export and import | local file swap | corrupted/malicious restore | SHA-256 of the dump file recorded in evidence; re-import only into isolated target; the row/checksum/FK gates catch content tampering. |
| **Repudiation** of a destructive restore | no audit trail of who ran what | plausible deniability | Evidence ledger records operator, timestamp, command, target id (redacted), result. (Operator-runbook-gated; no app audit log in scope.) |
| **Information disclosure** via evidence artifacts | account id / bucket name / object bytes leaked to Git | secret/PII leak | REQ-SEC-01: redact account ids to prefixes, bucket names to `archestimator-proof-uploads(-dev)?`, never persist raw object bytes beyond the drill, sample/redact object keys in reports. |
| **Denial of service** via quota exhaustion | a runaway drill burns rows-read/day or Class A ops | free-tier throttle → app degradation (D1 rows-read is shared with app traffic) | REQ-DOC-01 cost model; tools check headroom before running; cap inventory pagination. |
| **Elevation of privilege** via resurrected rows | a restore brings back a soft-deleted admin row or an erased DSAR record | privacy/compliance violation + possible authz change | REQ-SEC-03: post-restore re-erasure check for `privacy_request_register`, `data_retention_events`, `account_security_events`; authorization-denial assertion in the drill. |
| **Accidental destructive `time-travel restore` against prod** | operator confuses prod and staging | **Catastrophic** | REQ-D1-02: time-travel restore is **runbook-only, never drilled**; the drill uses export→re-import into an isolated target exclusively. |

## Credential-material taxonomy (corrected P0-3 + P1-7)

Per the strict prompt, each material is classified across the full boundary
set: raw/hash/encrypted/derived/public; created/stored/read/rotated/logged/
destroyed; and which boundary may see it (DB, server-only, Server Action,
Route Handler, browser URL, client props, DOM, network payload, logs,
analytics, tests, screenshots, provider console, external user). Most cells
are **N/A** for this CLI-only operational plan — that is stated with reason,
not omitted.

| Material | Class | Created by | Stored in | Read by | Boundaries that may see it | Rotation/revocation | Logging | Destruction | Proof |
|---|---|---|---|---|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` (operator) | **raw bearer secret** | operator (CF dashboard) | operator env (never repo) | wrangler CLI | operator machine + provider console only; **never** DB, server code, browser, URL, logs, artifacts | rotate via dashboard; prefer a scoped token (D1 read + R2 read/write on the bound account only) | **never** logged; `check-cloudflare-wrangler-auth.ts:83-90` already strips token lines | revoke in dashboard | tools never print it; runbook requires a **manual scope probe** (see below), not the auth script |
| `database_id` (prod/preview) | **public marker** (config, not secret) | Cloudflare | `wrangler.jsonc` (committed) | wrangler, tools, repo | committed config; provider console | n/a | may be logged; redact to prefix `9bdb29bb-…` / `363c756a-…` in evidence | n/a | redaction unit test |
| R2 object bytes | **may contain PII** (uploaded images/PDFs) | users (uploads) | R2 physical bucket `archestimator-proof-uploads` | app + authorized users; operator during drill | R2 bucket; operator temp file during get→put (cleaned up); **never** logs, artifacts, DOM, analytics | n/a (object lifecycle, not credential) | **never** logged as bytes | `rmSync` temp dir + delete `_drill/` preview object after drill | restore rehearsal verifies sha256/etag, then cleans up |
| `storage_bucket`/`storage_path` (reconciliation keys) | **non-secret identifiers** | upload pipeline | D1 (`upload_assets`, `cost_library_item_variant_attachments`) | app, inventory tool | D1; inventory report (sampled/redacted) | n/a | sampled in reports (≤5 keys, redacted) | n/a | redaction unit test |
| `checksum_sha256` (object integrity) | **derived** (sha256, 64 hex) | upload pipeline | D1 | app, drills | D1; drill reports (not secret) | n/a | may be logged | n/a | used as integrity key, not a credential |

**No raw bearer token, session cookie, auth hash, OAuth state, magic link, or
public share token is created or handled by this plan.** If OPEN-02 later adds
an automated backup cron, the Worker it uses will require a secret (e.g. a
`CRON_SECRET` or scoped token) — that future secret must be added to this
taxonomy with the same boundary columns before implementation.

### Scope-verification correction (P0-3)
`cf:check-wrangler-auth` (`scripts/check-cloudflare-wrangler-auth.ts`) runs
**only** `wrangler whoami --json` and verifies **authentication + account
presence** — it does **not** verify D1/R2 token scopes. The earlier claim that
it "verifies scoped access" is retracted. The runbook (`13_…`) must add a
**manual scope probe** as a pre-flight before any `--remote` drill:
`wrangler d1 list` (proves D1 read), `wrangler r2 bucket list` (proves R2
read), and one `wrangler r2 object get --remote archestimator-proof-uploads-dev/<known-preview-key>` (proves R2 get). Scope verification is a **manual gate**, not automated by the existing script.

## Privacy / DSAR re-erasure after restore (REQ-SEC-03 — concrete procedure)

A D1 restore (Time Travel or export→reimport into a returned-to-service DB) is
a **privacy-relevant event**: it can resurrect rows soft-deleted or erased for
a Data Subject Access Request / erasure. Relevant tables/migrations:

- `privacy_request_register` (`0033`) — privacy/erasure requests.
- `data_retention_events` (`0034`) — retention-driven deletions.
- `account_security_events` (`0004` + `0035`) — security/audit events
  (HMAC-checked hashes).

**Concrete post-restore gate** (runbook `13_…`, mandatory before
unquarantining a restored DB that will serve traffic):

1. **Detect resurrection**: for the restore point `T_restore`, list completed
   erasures whose effective deletion timestamp postdates `T_restore`:
   ```sql
   SELECT id, account_id, requested_at, completed_at, status
   FROM privacy_request_register
   WHERE status = 'completed' AND completed_at > '<T_restore>';
   ```
   plus the equivalent retention-event query against `data_retention_events`.
2. **Re-apply erasure**: for each resurrected request, re-run the app's
   erasure path against the restored DB (the same repository/action used at
   original completion). This is owner-approved incident response, not a drill.
3. **Re-verify authorization-denial**: confirm a previously-erased subject's
   data is again inaccessible via the app authz layer (a denial test).
4. **Owner sign-off**: the re-erasure gate is recorded in the evidence ledger
   with the operator identity, the list of re-applied request ids (redacted
   to prefixes), and the denial-test result.

> For **drills** (isolated target, never returned to service), this gate is
> not required — the isolated DB is dropped. It is required only for a real
> production restore.

## Attack Surface Inventory (P1-6)

For the operator-facing surfaces the drills expose (CLI/wrangler, not app
routes). Required by the strict prompt for provider-backed data/storage work.

| Entry point | Actor | Authn/authz & ownership check | Input validation | Output DTO / artifact | Rate/abuse posture | Required tests |
|---|---|---|---|---|---|---|
| `wrangler d1 export ARCH_DB --remote` | operator (scoped token) | wrangler auth + manual D1-read scope probe | binding name fixed | `.sql` dump file (local, temp) | rows-read/day quota (shared with app) — run off-peak | none (provider path); mechanism proven by rehearsal |
| `wrangler d1 execute <TARGET> --remote --file=…` | operator | target-isolation assertion (dest ≠ `9bdb29bb-…`) | assertion parses `wrangler.jsonc`; dest id whitelist | stdout counts + isolated DB state | rows-written/day | target-isolation unit test (FD-01) |
| `wrangler d1 time-travel restore` | operator | **runbook-only, never drilled** | n/a | prod DB state changed | 10-restores/10-min/db | none (not drilled) |
| `wrangler r2 object get --remote <key>` | operator | wrangler auth + manual R2-read scope probe | `assertSafeLogicalBucket` + `assertSafeStoragePath` on parsed key | local temp file (cleaned up) | Class B ops/month | key-safety + redaction tests |
| `wrangler r2 object put --remote archestimator-proof-uploads-dev/_drill/<key>` | operator | wrangler auth + R2-write scope probe; **hard-assert dest key starts with `_drill/`** | `_drill/` prefix assertion + key safety | preview-bucket object (cleaned up) | Class A ops/month | drill-key assertion test |
| R2 REST `POST /objects/list` | operator | scoped token | logical-bucket filter + cursor cap | inventory JSON (keys sampled/redacted) | Class A ops/month (lists) | inventory unit tests (paginated, traversal, both buckets) |
| `.sql` dump artifact (local) | operator | filesystem (temp dir) | none | file at rest (may contain PII) | n/a | `rmSync` cleanup verification |
| Evidence JSON/MD reports | committed to repo | n/a | redaction before write | committed artifact | n/a | redaction unit test |

Missing scope verification (P0-3), missing DTO minimization, or missing
abuse/rate posture for auth/data/provider surfaces would cap security
readiness below 80 — those are now addressed above.

## Input validation / injection / path traversal

- **SQL injection**: the drills run `wrangler d1 execute --file=<dump.sql>`,
  not string-interpolated SQL. The dump is a provider-produced `.sql` file.
  No app-level injection surface.
- **R2 key path traversal**: the inventory/restore tools must reuse
  `assertSafeLogicalBucket` / `assertSafeStoragePath` from
  `r2-storage-provider.ts` before acting on any key (reject `..`, `//`,
  leading `/`, backslash, bad segments). A malicious or malformed key in the
  bucket must not cause a local file write outside the temp dir.
- **Local file path**: the dump/object download path must be inside a
  `mkdtempSync` temp dir (the existing rehearsal script already does this and
  cleans up with `rmSync(tempDir, { recursive: true, force: true })`).

## CSRF / XSS / SSRF / clickjacking

- **Not applicable**: no web UI, no rendered HTML, no user-facing route. The
  tools are CLI-only.
- **SSRF**: not applicable — the tools call Cloudflare endpoints (wrangler),
  not arbitrary URLs.
- If a future phase adds an admin dashboard (out of scope), it must add CSRF,
  XSS, SSRF, clickjacking, and CSP controls — recorded as a forward note.

## Logging safety

- Tools must **redact** before printing: account id (prefix), full API tokens
  (never), full object keys in bulk (sample a few), and **never** print object
  bytes.
- The existing rehearsal script's `note` field is a model: it states exactly
  what the script does and does not do. New tools must include the same
  self-describing `note`.

## Security testing expectations (for the future implementation)

- **Denial test**: a unit test that passes the **production** `database_id`
  to the target-isolation pre-flight and asserts it **aborts** (non-zero exit,
  clear message). This is the single most important security proof.
- **Key-safety test**: a unit test that feeds a traversal-shaped key
  (`../../etc/passwd`, `a//b`, `/abs`) to `assertSafeStoragePath` and asserts
  rejection.
- **Redaction test**: a unit test that runs the inventory against a fake list
  containing a "secret-looking" key and asserts the report redacts/samples
  rather than dumping all keys.
- **No-env-read test**: a unit test that asserts the tools do not call
  `process.env` for secrets (they rely on wrangler's own auth).

## Residual security risk

- **Operator mistakes outside the tools** (e.g., manually running
  `wrangler d1 time-travel restore` against prod ignoring the runbook) cannot
  be prevented by tooling — only by the runbook + the assertion in the drill
  path. The runbook makes this explicit.
- **R2 user-error data loss** (no versioning) is a residual risk that only
  OPEN-03 (second bucket / bulk copy) or a future app-level soft-delete can
  address. Recorded, not solved here.
