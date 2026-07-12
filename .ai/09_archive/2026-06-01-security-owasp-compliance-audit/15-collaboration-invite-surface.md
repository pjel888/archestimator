# 15 — Collaboration / Invite Surface

## Findings

### F-INV-01 — Invite system is config-blocked

- **Severity:** Informational (control)
- **Status:** Implemented correctly (fail-closed)
- **Evidence:**
  - `.env.example` — `PROJECT_INVITE_ENTRY_ENABLED=false`, `ARCHESTIMATOR_INVITE_TOKEN_PEPPER=`
  - `src/lib/collaboration/invite-entry.ts` — `getInviteEntryConfig` reads the env and fails closed
  - `src/app/invite/[token]/page.tsx` — server component renders a config-blocked state
- **Strength:** No production use possible without explicit enablement + a real pepper
- **CWE:** CWE-1188
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.1

### F-INV-02 — Invitation open audit

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260601023000_collaboration_invitation_open_audit.sql`
- **Strength:** Records who opened which invitation
- **CWE:** CWE-778
- **OWASP 2025:** A09
- **ASVS 5.0:** V8.1

### F-INV-03 — `accept_collaboration_invitation_by_id` — SECURITY DEFINER

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260531164227_collaboration_invitation_accept_by_id.sql`
- **Strength:** Owner `postgres`, revocation of `anon`/`authenticated` execution
- **CWE:** CWE-269
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.1

### F-INV-04 — `resolve_collaboration_invitation` — sender contact

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260601033000_collaboration_invitation_sender_contact.sql` — drops and recreates to add `inviter_email` in the result set
- **Strength:** Caller email scoped via `auth.jwt()->>'email'`
- **CWE:** CWE-200
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.1

### F-INV-05 — `list_pending_collaboration_invitations` — expired visibility

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `20260601043000_collaboration_pending_invite_expired_visibility.sql`
- **Strength:** Expired rows are still visible to the sender; RLS-correct
- **CWE:** CWE-613, CWE-285

### F-INV-06 — No API route for invite accept/continue (server-component only)

- **Severity:** Informational
- **Evidence:** Grep for `src/app/api/invite/[token]/` shows no API route files; the invite flow is mediated by the server component
- **Strength:** Smaller attack surface; no CSRF concern on accept
- **CWE:** CWE-352

### F-INV-07 — Invite entry controller — pepper rotation

- **Severity:** Low
- **Likelihood:** Low (system disabled in production)
- **Impact:** High if enabled without rotation discipline
- **Evidence:** No documented rotation policy
- **Recommendation:** Document rotation cadence. (R-53)
- **CWE:** CWE-321
- **OWASP 2025:** A02
- **ASVS 5.0:** V14.3

### F-INV-08 — Accept-by-id scope is by `id`; token is server-only

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** `accept_collaboration_invitation_by_id` takes the invitation `id` from the server component, not from the URL token. The URL token is used to look up the `id` server-side; the `id` is then sent to the RPC.
- **Strength:** Token never crosses the trust boundary; only the resolved `id` is forwarded
- **CWE:** CWE-639, CWE-285
- **OWASP 2025:** A01
- **ASVS 5.0:** V4.1

### F-INV-09 — Open risk — invite flow not live

- **Severity:** Low
- **Likelihood:** n/a
- **Impact:** n/a
- **Evidence:** `.ai/10_state/known-issues.md` — invite system not live
- **Recommendation:** Track closure gate. (R-54)
- **CWE:** n/a

## Recommendations

- R-18 (re-stated): Runtime assertion in `getInviteEntryConfig`
- R-53: Pepper rotation policy
- R-54: Closure gate for invite system
