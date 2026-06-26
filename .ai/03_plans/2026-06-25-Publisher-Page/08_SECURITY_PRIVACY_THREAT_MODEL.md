# 08 — Security, Privacy, and Threat Model

> **PASS-2 AUDIT BANNER (2026-06-25).** This document has 3 HIGH corrections and 8 MEDIUM corrections recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Headlines: FAB-R01 (current_*_access_rank canonical cite is `20260613192344_teamspace_rls_authuid_perf.sql:33`/`:189`, not `20260526142913:279/445`), FAB-R02 (self-demotion IS DB-guarded by `enforce_project_manager_floor` trigger at `20260613192255:101` — the real gap is the drawer UX error path, not a missing guard), FAB-R03 (NO `current_workspace_access_rank` RPC exists — workspace RBAC uses `workspace_members.role` directly + `is_workspace_member` from `20260613201302_rls_initplan_is_workspace_member.sql`), ARCH-DEFECT-08 (RSC HTML payload leak vector undocumented), ARCH-DEFECT-09 (Referrer-Policy missing for Copy Link), OWASP-GAP-03 (CWE-639 + CWE-863 mapping missing), OWASP-GAP-04 (Philippines RA 10173 NPC 4-element coverage missing — primary market is PH), OWASP-GAP-05 (GDPR Art 33/34 breach notification mechanics missing), OWASP-GAP-08 (SEC-02 fallback path if Next.js 16 lacks redaction config). Read doc 18_ for full evidence.

---

> **PASS-3 REFINEMENT (2026-06-25, see `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md` §"Pass 3 refinement").** NX-GAP-01: Next.js 16 Server Actions CSRF protection via action ID signing remains canonical as of training data; verify against Next.js 16 release notes at implementation time. Existing `assertSameOrigin` hardening stays as defense-in-depth. NX-GAP-02: Next.js 16 lacks built-in logging-redaction config — SEC-02 mitigation requires middleware-level redactor in `src/proxy.ts` (strip `?token=` before Next.js logs) or log-pipeline filter at Vercel/Axiom/Sentry. NX-GAP-09: add `Referrer-Policy: no-referrer` header to `/workshop/:path*` source in next.config.ts for Copy Link UX safety.

---

**Purpose.** Ground the Publisher page's security posture in OWASP Top 10 2025, capability-token best practice, and the existing Archestimator security substrate. The user explicitly requested RBAC + OWASP study to secure this route properly.

---

## Trust boundaries

```
UNTRUSTED                          | SEMI-TRUSTED                | TRUSTED (server-side enforced)
───────────────────────────────────|─────────────────────────────|────────────────────────────────
External client (browser, no auth) | Authenticated builder       | Supabase Postgres + RLS
  ↓ /share/[token]                 |   ↓ /workshop/publisher     |   ↓ RLS predicates
  ↓ receiver-side pipeline         |   ↓ server actions          |   ↓ RPCs (current_*_access_rank)
  ↓ HttpOnly cookie gate           |   ↓ assertProjectPubMgr     |   ↓ audit tables
                                   |   ↓ assertSameOrigin        |
```

**Publisher lives entirely in the rightmost two columns.** It does not cross into the untrusted receiver zone.

---

## OWASP Top 10 (2021/2025-draft) mapping for Publisher

(OWASP Top 10 officially refreshes every 3–4 years; 2021 is current published, 2025 draft proposals exist. This plan maps both.)

### A01 · Broken Access Control  →  CRITICAL FOCUS
- **Risk for Publisher.** Privilege escalation — a non-manager viewing / mutating publications they don't own.
- **Existing controls.**
  - `assertProjectPublicationManager(projectId)` (`src/lib/publication/actions.ts:174-211`) — rank ≥ 30 required for every publication action
  - `current_project_access_rank(project_id) >= 30` (`20260526142913_*.sql:279`) — SQL-level manager predicate
  - `current_estimate_access_rank(estimate_id) >= 30` (line 445) — sheet-level manager predicate
  - `canManageCollaborationRole(role)` (`workspace-repository.ts:297`) — admin/owner predicate
  - RLS on every user-data table
- **Publisher additions.**
  - SEC-01 · Roster queries go through RSC + repository layer — zero client-side privileged fetch.
  - SEC-03 · Every server action Publisher invokes already calls `assertProjectPublicationManager`.
  - SEC-05 · Client-side filter tabs operate on RSC-returned data only — no privileged superset leaks.
- **Test.** `tests/vitest/publisher-rbac.test.ts` — viewer → 0 rows; editor → only accessible project publications; admin → all.
- **Citation.** OWASP ASVS v4.0 §4.1.x; Cheat Sheet Series "Authorization".

### A02 · Cryptographic Failures
- **Risk for Publisher.** Token leak in logs, source maps, error messages; password hash regression.
- **Existing controls.**
  - HMAC-SHA256 share-token hashing (`security.ts:71-74`) with pepper env (`ARCHESTIMATOR_PUBLICATION_TOKEN_HASH_SECRET`)
  - AES-256-GCM recopy-token encryption (`security.ts:76-91`)
  - scrypt password hashing (`security.ts:135-148`) with 16-byte salt + Unicode NFC normalization
  - HttpOnly + Secure + SameSite=Lax signed access cookies (`security.ts:177-325`)
  - Constant-time comparison (`security.ts:56-59`, `timingSafeEqual`)
  - Production requires real secrets (`security.ts:96, 103`)
- **Publisher additions.**
  - SEC-02 · Publisher UI displays only "Copy link" button; never logs the raw URL.
  - Server logs redact `?token=` query params (verify in implementation).
  - Error messages from server actions never include token or password values.
- **Citation.** OWASP Cryptographic Storage Cheat Sheet; NIST SP 800-132 (scrypt PBKDF).

### A03 · Injection
- **Risk for Publisher.** SQL injection via filter params; HTML/XSS via recipient display names; command injection (none expected).
- **Existing controls.**
  - Supabase JS client uses parameterized queries exclusively.
  - Recipient `display_name` rendered as text (React escapes by default).
  - HTML-strip on comment submission (`/api/share/[token]/comment`, per `shared-link-and-publication-spec.md:77`).
- **Publisher additions.**
  - Filter params typed via `PublicationRosterFilters` (`roster-filter.ts`).
  - No `dangerouslySetInnerHTML` anywhere in Publisher components.
  - Search input treats value as plain text (no regex / glob interpretation).
- **Citation.** OWASP Injection Cheat Sheet; React XSS guidance.

### A04 · Insecure Design
- **Risk for Publisher.** Architectural flaw allowing privilege creep (e.g., client-side "filter" that fetches privileged superset).
- **Existing controls.**
  - Server-actions-first architecture (repo convention).
  - Repository boundary (no UI → Supabase direct calls).
- **Publisher additions.**
  - ARCH-01 · RSC roster.
  - ARCH-07 · Repository boundary respected.
- **Citation.** OWASP ASVS v4.0 §1.x (Architecture).

### A05 · Security Misconfiguration
- **Risk for Publisher.** CORS misconfig, missing CSP, default-allow list endpoints, feature flag left on in dev only.
- **Existing controls.**
  - `proxy.ts:12 SENSITIVE_ROUTE_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate"` on `/workshop/*`.
  - Closed-beta gate (`closed-beta-access.ts`).
  - Production requires `PUBLICATION_TOKEN_ENCRYPTION_SECRET`, `PUBLICATION_TOKEN_HASH_SECRET`, `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`.
- **Publisher additions.**
  - OPS-01 · `ARCHESTIMATOR_PUBLISHER_ENABLED` defaults off in production.
  - No new env vars required in Phase 1.
- **Citation.** OWASP Security Misconfiguration Cheat Sheet; Next.js 16 CSP guidance.

### A06 · Vulnerable and Outdated Components
- **Risk for Publisher.** None new. Publisher reuses existing stack.
- **Existing controls.** `package.json` lockfile; CI runs `bun install --frozen-lockfile`.
- **Publisher additions.** Zero new dependencies in Phase 1.
- **Citation.** OWASP Dependency-Check; `Launch-Readiness-Audit/Dependencies-Supply-Chain-Code-Health/`.

### A07 · Identification and Authentication Failures
- **Risk for Publisher.** Session fixation, weak session, bypassed auth.
- **Existing controls.**
  - Supabase Auth SSR (`@supabase/ssr`) — cookie-based session.
  - `proxy.ts:118-120 supabase.auth.getUser()` on every protected request.
  - Closed-beta gate after auth.
- **Publisher additions.** None — Publisher rides on `/workshop` auth.
- **Citation.** OWASP Authentication Cheat Sheet.

### A08 · Software and Data Integrity Failures
- **Risk for Publisher.** Tampered optimistic state; unsigned server action invocation.
- **Existing controls.**
  - Server actions are Next.js-signed (built-in CSRF protection via `next/server`).
  - `assertSameOrigin(request)` on every mutating endpoint (`security.ts:354-413`).
  - CSRF tokens for form-post variants (`security.ts:161-175`).
- **Publisher additions.**
  - API-02 · Every Publisher-invoked server action asserts same-origin.
  - SEC-04 · CSRF / same-origin enforced via existing helpers.
- **Citation.** OWASP CSRF Cheat Sheet; Next.js 16 Server Actions security model.

### A09 · Security Logging and Monitoring Failures
- **Risk for Publisher.** Missing audit trail for manager actions; no detection of brute-force or abuse.
- **Existing controls.**
  - `account_security_events` — workspace-wide security events (rate-limit hits, lockouts, suspicious activity).
  - `collaboration_audit_events` — per-project audit (member/grant changes).
  - `estimate_sheet_events` — estimate mutations.
  - `shared_link_events` — publication views/opens.
  - Existing digest email throttling (`atomic_publish_and_digest_slot` RPC).
- **Publisher additions.**
  - DATA-05 · Every manager action writes audit row.
  - SEC-07 · Audit tables are insert-only.
  - OPS-02 (Phase 2+) · Audit dashboard filter `action LIKE 'publisher_%'`.
- **Citation.** OWASP Logging Cheat Sheet; ASVS v4.0 §7.x.

### A10 · Server-Side Request Forgery (SSRF)
- **Risk for Publisher.** Low — Publisher does not fetch external URLs.
- **Existing controls.** Resend webhook at `/api/webhooks/resend` validates incoming; not relevant here.
- **Publisher additions.** None.
- **Citation.** OWASP SSRF Cheat Sheet.

### (Draft 2025 additions to monitor)

- **A04-enhanced · Untrusted Resource Consumption (DoS).** Rate-limit already exists for password attempts, comments, decisions. Publisher roster has no per-user rate limit; acceptable for closed beta.
- **A07-enhanced · Identity and Authentication — passkey/MFA.** Out of scope for Publisher; Supabase Auth MFA is a separate roadmap item.

---

## Capability tokens vs bearer tokens

Archestimator's share-link tokens are **capability tokens** (a.k.a. capability URLs, signed URLs):

- The token *is* the capability — no separate auth required.
- Hashed at rest (`hashPublicationToken`).
- Optionally encrypted for recopy (`encryptPublicationToken`).
- Bound to a credential version (`deriveCredentialVersion`) — adding a password invalidates prior cookies.
- Bound to a snapshot version (`createPublicationViewToken`) — prevents snapshot swap.
- Rate-limited on password attempts (`isPasswordLocked`).
- Revocable (status = revoked).
- Expirable (status = expired after `expires_at`).

**This matches OWASP Capability URL Cheat Sheet guidance** and industry practice (Notion, Figma, Dropbox, Google Docs share links). Publisher does not weaken this model.

**Alternative considered (bearer tokens via separate auth):** Rejected for closed-beta MVP — adds friction without proportional security gain given the existing capability-token model.

## Google Zanzibar / relation-tuple relevance

The current role-rank model (`owner=40 > admin=30 > editor=20 > viewer=10` + project/sheet scope) is a **simpler precursor** of Google's Zanzibar relation tuples (used in SpiceDB, OpenFGA, Cerbos).

For Archestimator's pre-launch scale (workspaces < 50 projects, projects < 50 sheets), the rank-based model is sufficient. If scale grows 10×, migrating to a Zanzibar-style engine is a Phase 5+ consideration — the `current_*_access_rank` RPCs are the migration seam.

**No change for Publisher.**

## Privilege-escalation risk hotlist

| Risk | Vector | Mitigation | Test |
|---|---|---|---|
| **P-1.** Viewer becomes admin via tampered client state | Client-side role override | Roles never read from client state; always fetched fresh from `workspace-repository.ts` per request | `publisher-rbac.test.ts` |
| **P-2.** Editor rotates a publication they don't manage | Direct server-action call from console | `assertProjectPublicationManager` server-side | `project-publication-security.test.ts` |
| **P-3.** Roster leaks publications from a sibling workspace | Cross-workspace query | RLS scoping + `workspace_id` predicate in `workspace-repository.ts` | `publisher-rbac.test.ts` |
| **P-4.** Recipient sees manager-only fields (`canManagePublication`) | Over-fetch in client | Server returns `canManagePublication: false` for non-managers; client gates UI | `project-publication-security-hardening.test.ts` |
| **P-5.** Stale-snapshot warning is forged | Client sets `staleSnapshotWarning: null` | Computed server-side from `estimate_row_items.updated_at` vs `snapshot_generated_at` | SEC-08 contract test |
| **P-6.** Audit row skipped on action | Manager calls a non-audited path | Every server action INSERTs audit before return; test asserts audit row count | Extend `security-findings-publication-contracts.test.ts` |
| **P-7.** Token rotation race | Two simultaneous rotations | DB-level last-write-wins; both tokens invalidated | Concurrency test |
| **P-8.** Recipient enumeration via "add" error | "Email already a recipient" message | Generic success on add; audit logs the truth | SEC-06 |
| **P-9.** XSS via recipient display_name | Unescaped render | React escapes by default; no `dangerouslySetInnerHTML` | Lint rule + DOM test |
| **P-10.** CSRF from another origin | Cross-site POST | `assertSameOrigin` on every mutating action | `invite-accept-origin.test.ts` pattern |

## Tenant isolation

- Workspace boundary enforced in every `workspace-repository.ts` query via `workspace_id = $currentWorkspaceId`.
- Project membership requires `workspace_members.workspace_id = project.workspace_id` (RLS).
- Publication membership inherits project boundary.
- No cross-workspace query path in Publisher.

## Input sanitization

| Input | Sanitization | Source |
|---|---|---|
| Recipient email | RFC-valid regex + lowercased + trimmed | `RecipientEmailComposer` |
| Password | NFC normalize + trim + min 4 chars | `normalizePublicationPassword` |
| Filter params | TypeScript union type; runtime narrowing | `roster-filter.ts` |
| Search query | Plain text; HTML-escaped on render | React default |
| Sheet selection IDs | UUID validation | `isUuid` (`src/lib/ids.ts:3`) |
| Snapshot version | Integer ≥ 1 | `parsePublicationViewTokenPayload` |

## Injection risks

| Surface | Risk | Mitigation |
|---|---|---|
| Filter `status` param | SQL injection | Parameterized via Supabase JS client |
| Filter `projectId` param | SQL injection | UUID validation |
| Search query | LIKE wildcard abuse | Escape `%` and `_`; cap length 100 chars |
| Recipient email | SMTP header injection | RFC regex disallows CRLF |

## Cross-site scripting (XSS)

- React escapes all interpolated text by default.
- No `dangerouslySetInnerHTML` in Publisher.
- Comment HTML stripped server-side before persistence (`/api/share/[token]/comment`).
- Recipient `display_name` rendered as text only.

## Cross-site request forgery (CSRF)

- Every mutating server action calls `assertSameOrigin(request)`.
- CSRF tokens issued for form-post variants via `createPublicFormCsrfToken`.
- Next.js 16 Server Actions have built-in CSRF protection via action ID signing.

## Server-side request forgery (SSRF)

- Publisher does not fetch external URLs.
- Image URLs (`image-url.ts`) are validated against a allowlist of hosts (Supabase storage, project image bucket).

## Sensitive information exposure

| Risk | Mitigation |
|---|---|
| Token in URL logs | `?token=` redacted via Next.js request logging config (verify in implementation) |
| Token in error messages | Server actions return generic error strings |
| Token in client bundle | Roster shows "Copy link" only; raw URL reconstructed on click from `clientLinkPath` |
| Password in DOM | `<input type="password">`; never echoed back in API response |
| Recipient PII in client bundle | Only emails rendered; never phone/address |
| Profile color contrast | WCAG AA verified by `collaboration-colors-contrast.test.ts` |

## Secret handling

| Secret | Source | Enforcement |
|---|---|---|
| `PUBLICATION_TOKEN_HASH_SECRET` | env | Production throws if missing (`security.ts:103`) |
| `PUBLICATION_TOKEN_ENCRYPTION_SECRET` | env | Production throws if missing (`security.ts:96`) |
| `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` | env | Required by `isProjectInviteEntryEnabled` (`invite-entry.ts:37`) |
| `PUBLICATION_ACCESS_COOKIE_SECRET` | env | Falls back to hash secret (`security.ts:112`) |
| Supabase service role key | env | NEVER used in app code; only in migrations + admin scripts |

## Logging safety

- Never log raw tokens, raw passwords, raw recipient emails in plaintext logs.
- Log redaction: replace `?token=XXX` with `?token=[REDACTED]` in request logs.
- Audit logs store action + actor + target IDs (not raw PII).

## Abuse scenarios

| Scenario | Mitigation |
|---|---|
| Manager spams recipient adds | Per-publication rate limit (existing digest slot throttle); per-workspace limit proposed for Phase 2 |
| Manager brute-forces their own password (forgot) | Existing 5-attempt / 15-min lockout on `/share/[token]/password` |
| Recipient spams comments | Existing 5/min, 20/hr rate limit |
| Recipient spams decisions | Snapshot-version check blocks stale decisions; existing rate limit |
| Malicious client forges an open event | Receiver-side open tracking only; no manager-action path |
| Bot enumerates publication tokens | 32-byte random tokens (`createPublicationToken`); 2^256 search space infeasible |

## Rate-limiting needs

| Surface | Existing limit | Phase 1 change |
|---|---|---|
| `/api/share/[token]/password` | 5 / 15 min lockout | None |
| `/api/share/[token]/comment` | 5/min, 20/hr | None |
| `/api/share/[token]/decision` | standard | None |
| Publication digest email | 1 / 15 min per publication | None |
| Publisher roster fetch | unlimited (auth-gated) | None (Phase 2: per-user rate limit if abused) |
| Publisher mutations | unlimited (manager-gated) | None (Phase 2: per-manager rate limit if abused) |

## Auditability

- Every manager action emits `account_security_events` row with `action LIKE 'publisher_%'`.
- Every grant/member change emits `collaboration_audit_events` row.
- Audit rows are insert-only (SEC-07).
- Test: `tests/vitest/security-findings-publication-contracts.test.ts` extended to assert Publisher action audit.

## Data minimization

- Roster returns only `ProjectPublicationListSummary` fields (lighter than full summary).
- Drawer returns `ProjectPublicationSummary` + recipients + recent activity.
- No bulk export endpoint in Phase 1.

## Privacy implications

| Consideration | Posture |
|---|---|
| Recipient email stored | Yes — necessary for delivery. Encrypted at rest (Supabase default). |
| Recipient PII shared with builder | Yes — recipient email visible to managers (necessary). Display name optional. |
| Recipient behavioral tracking | Limited to open/comment/decision events. No third-party analytics on `/share/[token]`. |
| GDPR / Philippines Data Privacy Act | Recipient one-click unsubscribe (`/api/share/[token]/unsubscribe`) is implemented. DSAR flow exists at workspace level (`Launch-Readiness-Audit/DSAR-Account-Deletion-Data-Export/`). |
| Builder PII in audit logs | Yes — actor ID + email necessary for audit trail. |

## Security testing

| Test | Surface | Type |
|---|---|---|
| `tests/vitest/publisher-rbac.test.ts` (NEW) | Roster RBAC | Contract |
| `tests/vitest/security-findings-publication-contracts.test.ts` (EXTEND) | Publisher actions | Contract |
| `tests/vitest/security-findings-proof-contracts.test.ts` | Crypto proofs | Regression (existing) |
| `tests/vitest/security-findings-auth-contracts.test.ts` | Auth boundaries | Regression (existing) |
| `tests/vitest/invite-accept-origin.test.ts` | Origin enforcement | Regression (existing) |
| `e2e/publisher-roster.spec.ts` (NEW) | End-to-end RBAC | E2E |
| `e2e/shared-link-receiver.spec.ts` | Receiver side | Regression (existing) |
| Manual OWASP ZAP scan | Full app | Periodic (existing) |

## Incident-response implications

| Scenario | Response |
|---|---|
| Suspected token leak | Manager rotates token from Publisher drawer; audit row written; recipients get re-link email |
| Suspected password compromise | Manager changes password; credential_version invalidates old cookies |
| Mass-recipient spam complaint | Manager revokes publication; audit row written; recipients see revoked state |
| Insider abuse (manager over-granting) | Audit trail review; workspace admin can revoke memberships |
| Suspected privilege escalation | Disable `ARCHESTIMATOR_PUBLISHER_ENABLED`; forensic review of audit tables |

## Open security decisions (deferred to Philip — see `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`)

- **D-SEC-1:** Recipient rate-limit on per-manager basis (Phase 2 proposal).
- **D-SEC-2:** Audit dashboard scope (workspace-only vs cross-workspace for super-admin).
- **D-SEC-3:** Recipient edit-grant capability model (D1) — affects schema.
- **D-SEC-4:** Token rotation cadence policy (manual vs enforced 90-day rotation).
