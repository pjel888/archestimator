# 08 — Data Protection and Privacy

## Findings

### F-DATA-01 — Data classification observed

| Data class | Examples | Storage | At-rest encryption |
|---|---|---|---|
| Credentials | None in `users`; Supabase Auth owns | Supabase Auth | Provider-side |
| Session tokens | Supabase cookies | Browser + Supabase | TLS in transit |
| Share access cookies | 24h HttpOnly cookie | Browser | TLS in transit |
| Password hashes (share) | scrypt | DB | Storage-layer encryption assumed |
| Encrypted share tokens | AES-256-GCM ciphertext + nonce + tag | DB | Storage-layer encryption assumed |
| Hashed share tokens | HMAC-SHA256 hex | DB | Storage-layer encryption assumed |
| User content | Project / estimate / row / node data | DB (RLS-protected) | Storage-layer encryption assumed |
| Component library attachments | Magic-byte-checked, sharp-re-encoded | Storage (object) | Storage-layer encryption assumed |
| AI prompts / responses | Logged via `ai_data_access_events` / `ai_tool_calls` | DB | Storage-layer encryption assumed |
| Webhook payloads | Transient | None (verification only) | n/a |

### F-DATA-02 — No PII exfiltration paths identified

- **Severity:** Informational
- **Evidence:** All outbound HTTP is to DeepSeek (AI) and Resend (email). No PII leaves the system except:
  - Email content sent to Resend (transactional)
  - User text sent to DeepSeek (per request)
- **Recommendation:** Document the data flow to each provider in a privacy notice; ensure DeepSeek and Resend DPAs are on file. (R-20)

### F-DATA-03 — PII minimisation for AI prompts

- **Severity:** Low
- **Likelihood:** Medium
- **Impact:** Medium (data leak to AI provider)
- **Evidence:** `src/lib/ai/deepseek.ts` and `src/lib/ai/package-builder/apply.ts` — the apply path applies user-requested writes; the Ask path forwards user text
- **Recommendation:** Document the minimum context sent to DeepSeek per Ask call. Verify no workspace name / client name / email is included unless explicitly required for the answer. (R-12, restated)
- **CWE:** CWE-359
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.1

### F-DATA-04 — Right-to-erasure / data deletion — gap

- **Severity:** Medium
- **Likelihood:** Medium (subject access requests are common)
- **Impact:** Medium
- **Evidence:** No deletion API or scheduled job observed for user-data removal
- **Recommendation:** Add a documented data-retention policy and a deletion path (e.g., workspace delete → cascade or soft-delete with TTL). (R-21)
- **CWE:** CWE-212
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.2

### F-DATA-05 — Encryption at rest

- **Severity:** Informational
- **Evidence:** All persistent data is in Supabase (Postgres + Storage). At-rest encryption is the responsibility of the Supabase project; not in repo.
- **Recommendation:** Confirm Supabase project is on TDE/encrypted storage. (R-22)

### F-DATA-06 — Encryption in transit

- **Severity:** Informational (control)
- **Status:** Implemented correctly (assumed at edge)
- **Evidence:** All external HTTP is `https://`; all cookies should be `Secure` in production
- **CWE:** CWE-319

### F-DATA-07 — Public shared-link data exposure

- **Severity:** Medium
- **Likelihood:** Low (token entropy high)
- **Impact:** High (entire project tree if leaked)
- **Evidence:** A single shared link gives read access to the entire project; revocation is the only mitigation
- **Recommendation:** Document the revocation flow; add a "rotate token" capability; add expiry enforcement. (R-23)
- **CWE:** CWE-200
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.1

### F-DATA-08 — Email addresses in audit tables

- **Severity:** Low
- **Evidence:** `20260601033000_collaboration_invitation_sender_contact.sql` exposes `inviter_email` in `resolve_collaboration_invitation` result. RLS protects the table, but the function result is reachable by `authenticated` users with the right token.
- **Strength:** Function is SECURITY DEFINER; access is scoped by invitation status and caller email
- **CWE:** CWE-200
- **OWASP 2025:** A01

## Controls observed (correctly implemented)

- [x] Cookies with `no-store` on public routes
- [x] Cookies HttpOnly (verified for share access cookie)
- [x] Supabase auth token never logged
- [x] No raw credentials in source

## Recommendations

- R-20: Privacy notice + provider DPAs
- R-21: Data deletion path / retention policy
- R-22: Confirm Supabase at-rest encryption
- R-23: Share-link rotation / expiry enforcement
