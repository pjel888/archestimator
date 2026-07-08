# 08 — Security, Privacy, and Threat Model

## §1. Trust boundaries

| Boundary | Trust side (in) → trusted side (out) | Control |
|---|---|---|
| Public internet → privacy intake POST | anonymous → D1 (hashed) | rate limit, 16 KiB cap, HMAC hash, no-store |
| Admin browser → admin DSAR routes | authenticated platform-admin → D1/R2 | Better Auth session + `isPlatformAdminRole` + typed phrase for erasure |
| Worker cron → D1/R2 | system → data | `scheduled()` only; no public surface; env-gated dry-run |
| Worker → Better Auth API | system → auth provider | server-only; bounded timeout |
| D1 ↔ repository | server-only → data | `"server-only"` imports; no client DB access |

## §2. Actor roles
- **Anonymous requester**: can POST intake only. Cannot read, transition, export, or erase.
- **Workspace member/admin**: no DSAR access. Gets 403/404 on admin routes.
- **Platform admin**: full DSAR triage/export/erasure; operator dashboard read.
- **System cron (Worker)**: retention pass + R2 purge sweep; no user context.
- **Attacker models**: see §3.

## §3. Threat model (STRIDE-aligned)

| ID | Threat | Actor | Vector | Impact | Control | Denial test |
|---|---|---|---|---|---|---|
| T-01 | Privilege escalation to DSAR admin | workspace user | call admin route directly | wrongful access to PII / erasure | `isPlatformAdminRole` gate on every admin action | role-matrix denial test (non-admin → 403/404) |
| T-02 | Wrongful erasure (abuse of erasure) | compromised admin / social eng | trigger erasure without identity verification | permanent data destruction; business harm | typed confirmation phrase + `OPEN-DEC-007` identity-verification threshold + audit + 30d R2 reversible window | erasure without phrase → 400; non-admin → 403 |
| T-03 | DSAR export data leakage (cross-workspace) | admin building export for user A | package includes user B data | cross-tenant PII leak | package filtered strictly by `target_user_id`; no workspace bypass | fixture: two users → export A excludes B |
| T-04 | Privacy intake enumeration | attacker | vary email/IP to dodge rate limit | queue flooding; DoS | per-email + per-IP rate limit (existing) | rate-limit denial test |
| T-05 | Intake PII leakage via logs | attacker (log access) | error path logs raw body | PII in logs | opaque errors; no raw body in logs; `metadata_json` sanitized | log-grep test for fixture PII |
| T-06 | Retention purge of legal-hold data | system | cron purges held data | evidence destruction / legal risk | `legal_hold` column + `skipped_legal_hold` action (gated `OPEN-DEC-006`) | repository test (hold prevents purge) |
| T-07 | Cron error-skip silent failure | system | D1 error mid-pass | retention not enforced; data over-retained | error → audit row `skipped: error`; dashboard alert at threshold | error-injection test |
| T-08 | DSAR erasure partial failure leaves inconsistent state | system | D1 error mid-propagation | half-erased user; evidence gap | correlation ID; idempotent re-run; status not `completed` until all targets done | partial-failure test |
| T-09 | R2 purge race (object purged while receipt points to it) | system | purge sweep + concurrent read | broken receipt | receipt is the evidence; object purge is terminal | R2 receipt test |
| T-10 | Replay of admin action (export/erasure) | attacker with stolen admin token | replay request | repeated export / double-erasure attempt | idempotency (cached export; status guard on erasure) | replay test |
| T-11 | IDOR on `/api/admin/privacy-requests/[id]` | admin | guess request IDs | read other requests | platform-admin scope is intended (admins see all); not an IDOR for admins. For non-admins → 404 | denial test |
| T-12 | XSS in admin console (request description render) | requester | malicious `description` field | admin browser compromise | render description as plain text (no HTML/Markdown); React escapes by default | DOM test with script payload |
| T-13 | CSRF on admin actions | attacker | forged POST | unwanted transition/erasure | Server Actions use same-site session; `SameSite=Lax` cookies; destructive erasure requires typed phrase | CSRF token / same-site test |
| T-14 | `metadata_json` injection | requester | crafted metadata | sanitizer bypass → stored payload | existing `sanitizeMetadata` strips secret keys + caps size; treat as untrusted on read | sanitizer test |
| T-15 | Pepper rotation breaks audit reads | operator | rotate `AUTH_AUDIT_HASH_PEPPER` | legacy hashes unreadable | pepper rotation plan + rehash backlog (existing concern; DSAR anonymize uses rewrite not rehash) | rotate-test (deferred to ops runbook) |

## §4. Security controls (existing + required)

- **Authentication**: Better Auth session for admin routes. Server-only.
- **Authorization**: `isPlatformAdminRole` for DSAR admin; system cron has no user context (binding-level).
- **Input validation**: `PRIVACY_REQUEST_KINDS`, description length, `sanitizeMetadata`, typed phrase for erasure.
- **Rate limiting**: `security_rate_limit_events` per-email/per-IP (intake); per-admin + per-target (export/erasure — new).
- **Secrets**: `AUTH_AUDIT_HASH_PEPPER` (Wrangler secret), `CRON_SECRET`/`UPLOAD_*_JOB_SECRET` (existing). No new secrets required except optional `RETENTION_DRY_RUN`/`RETENTION_ENABLED` (env flags, not secrets).
- **Logging safety**: opaque errors; structured logs with aggregate counts only; no raw PII.
- **Data minimization**: DSAR export includes only target-user data; retention purges minimize stored data.
- **CSP/frame**: admin routes under existing workshop CSP; no new framing.

## §5. Privacy implications
- **Data minimization**: retention TTLs + DSAR erasure reduce stored PII over time.
- **Purpose limitation**: audit logs used only for security/abuse; not for unrelated analytics.
- **Storage limitation**: TTLs enforce time-bound storage.
- **Accuracy**: DSAR rectification flow (`rectification` kind) — but the *rectification action* is manual (admin edits source data); the pack does not auto-modify business records. Flagged as a manual ops step.
- **Integrity/confidentiality**: HMAC-hashed PII, server-only access, platform-admin gating.
- **Transparency**: privacy notice describes DSAR (gated `OPEN-DEC-002`).

## §6. Abuse scenarios
- **Queue flooding**: rate-limited (T-04).
- **Wrongful erasure via compromised admin**: typed phrase + identity verification (`OPEN-DEC-007`) + 30d R2 window + audit (T-02).
- **Mass export (data scraping)**: per-admin rate limit on export.
- **Legal-hold abuse** (admin sets hold to prevent legitimate purge): policy-gated `OPEN-DEC-006`; audit every hold change.

## §7. Incident-response implications
- **Wrongful erasure detected**: R2 objects still within 30d → recover via tombstone metadata; D1 anonymization is irreversible → invoke breach runbook (separate roadmap item P1.x). `privacy_requests` + `data_retention_events` rows are the forensic trail.
- **Cron failure**: dashboard alerts; runbook step to re-run manually or wait for next cron.
- **Export leak**: signed URL TTL minimizes exposure; rotate admin sessions; audit who built which export.

## §8. Security testing required
- Role-matrix denial tests (non-admin on every admin route).
- Idempotency + replay tests.
- XSS/CSRF/sanitizer tests.
- Rate-limit denial tests.
- Error-injection (D1 failure mid-pass / mid-erasure).
- R2 receipt + purge-retry tests.

These map into `12_` and `19_`.
