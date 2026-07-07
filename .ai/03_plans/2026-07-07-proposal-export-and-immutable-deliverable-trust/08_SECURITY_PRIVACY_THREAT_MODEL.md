# 08 — Security, Privacy, and Threat Model

## Trust boundaries

1. **Public internet → Worker edge** (Cloudflare WAF/DDoS, rate limits).
2. **Worker → D1 / R2 / Queue** (app-authorized; no service-role escalation).
3. **Authenticated manager session** (Better Auth) vs **public recipient** (token + optional
   password + recipient session).
4. **Client bundle** (must not receive secrets; only public integrity markers).

## Actor roles

- **Manager** (owner/admin/editor): creates/republishes/revokes deliverables; reads full audit.
- **Recipient** (no login): views snapshot via token; comments/decides via recipient session.
- **Anonymous attacker**: attempts token enumeration, content tampering claims, oversized requests.
- **Insider (malicious manager)**: attempts to rewrite history (immutability defends).

## Threat model

| ID | Threat | Vector | Mitigation in this plan | Residual |
|---|---|---|---|---|
| T-1 | Content tampering claim ("the file I sent said X") | Manager or recipient disputes issued bytes | Immutable package row + `content_sha256` proves what was issued; recipient accept records the hash | Low — hash is authoritative |
| T-2 | Snapshot silently overwritten after acceptance | Manager republishes; old content lost | Append-only package table; old rows retained + superseded, not overwritten | Low |
| T-3 | Recipient accepts stale content unknowingly | Estimate changed; recipient sees old snapshot | Recipient staleness notice (FR-4) + version lock (existing) | Low |
| T-4 | Internal cost-split leakage to client XLSX | Audience gate too narrow | Broadened redaction (FR-5) + byte-scan denial test (SEC-3) | Low |
| T-5 | Token enumeration / IDOR on `/share` | Guess token | Existing: 256-bit token, HMAC lookup, rate limit. **Unchanged.** | Low (existing) |
| T-6 | R2 object public access | Guessed object key | Unguessable keys (`proposal-deliverables/<uuid>`); server-mediated access only; no public bucket listing | Low |
| T-7 | Oversized export DoS | Large request | Existing caps (1200/3000/50) + new streaming/job path with rate limit (SEC-4) | Low |
| T-8 | Async job endpoint abuse | Spam job creation | Rate limit (SEC-4) + ownership check + idempotency | Low |
| T-9 | Audit trail tampering | Insider deletes audit rows | Append-only convention; no DELETE path in the repo for package/audit rows; D1 has no RLS so app-layer discipline + `account_security_events` for sensitive ops | Medium — D1 app-authz, not DB-enforced |
| T-10 | Hash collision forgery | Two different bytes, same SHA-256 | SHA-256 collision resistance (infeasible); not a realistic vector | Negligible |
| T-11 | Replay of recipient acceptance | Resubmit accept | Existing: duplicate decision handling. Content hash is immutable, so replay yields same record | Low (existing) |
| T-12 | XSS on share page lifts recipient session | Comment text injection | Existing: `sanitizeSharedLinkRecipientText`. **Unchanged.** | Low (existing) |
| T-13 | `content_sha256` misused as bearer token | Attacker treats hash as credential | Documented: hash is a **public integrity marker**, not a credential (credential taxonomy in `04_*.md`); never used for authz | Low (design) |
| T-14 | Stale redaction in pre-feature snapshot | Old snapshot captured before a redaction fix | Honest "issued before integrity tracking"; no retroactive re-redaction (would alter historical record). Managers can revoke+republish. | Medium (accepted) |
| T-15 | Orphaned R2 objects on failed package insert | R2 write succeeds, D1 insert fails | Cleanup lifecycle/reconcile (DISCOVERY) + idempotent retry | Medium — needs reconcile |

## Security controls

- **Authentication/authorization:** unchanged surfaces + new package reads go through existing RBAC
  (manager) or token-gate (recipient). No new public route without token.
- **Input validation:** XLSX settings validation unchanged (0-100 rates, allow-listed modes). New:
  async job endpoint validates `jobId` ownership.
- **Secrets:** no new secrets. Hashing uses Web Crypto (no key). Existing token/password secrets
  unchanged.
- **`NEXT_PUBLIC_`:** no new client-side secrets. Hash prefix shown to client is non-secret.
- **Logging:** structured logs redact tokens/PII (existing `hashPublicTelemetryValue` pattern).
  Never log raw bytes; log hash prefix + size + outcome.
- **Rate limiting:** existing `checkProposalExportRateLimit` extended to job endpoint.
- **CSRF:** existing `assertSameOriginPublicPost` for recipient mutations. New manager endpoints
  use Better Auth session + same-origin (Server Actions).
- **CSP / frame / referrer:** `/share` already `no-store`; export route `no-store`+`nosniff`.
  Download referrer policy unchanged.

## Privacy / data minimization

- Package table stores hashes, sizes, timestamps, ids — **not** row-level estimate content beyond
  what `snapshot_json` already holds. No new PII.
- Recipient staleness notice shows the deliverable date only, not internal estimate details.
- R2 large artifacts: same data class as the inline bytes (the deliverable); access app-authorized.

## Abuse scenarios (denial tests)

- D-1: client-audience XLSX byte scan finds zero configured internal tokens (SEC-3).
- D-2: republish leaves v1 package bytes/hash unchanged (FR-1).
- D-3: oversized request yields 413 (hard cap) or 202 (async), never OOM/timeout (FR-6).
- D-4: unauthenticated package-read attempt → 401/403 (SEC-1).
- D-5: cross-workspace package read → denied (SEC-1).
- D-6: async job created by user A, polled by user B → 403 (SEC-4).
- D-7: recipient accepts after republish → 409 "snapshot version changed" (existing) + their prior
  accept still bound to old `content_sha256` (FR-7).

## Incident-response implications

- "Did the client receive version V?" → query package table + download audit.
- "What was in V?" → read immutable package row + (R2/D1) bytes + verify checksum.
- "Was V leaked?" → access telemetry (`project_publication_events`, download audit).
- Rollback: flag off async path (OPS-2); package table is additive/inert.
