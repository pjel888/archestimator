# 14 — Invite / Collaboration Threat Model

The third pass takes the Codex threat model (cross-tenant data exposure via invite RPC) and applies it to the invite/collaboration surface. The invite system is currently **config-blocked** (`PROJECT_INVITE_ENTRY_ENABLED=false`) and **fail-closed**, which limits live risk but does not eliminate the need to verify the security posture.

## Invite surface inventory

| Surface | Type | Auth | Rate-limited | Status |
|---|---|---|---|---|
| `/invite/[token]/page.tsx` | Server component GET | Token | Yes (per-token) | F-INV-01..09 |
| `/invite/[token]/continue/route.ts` | Server action POST | Token | Yes (per-token) | F-INV-01..09 |
| `/invite/[token]/accept/route.ts` | Server action POST | Token | Yes (per-token) | F-INV-01..09 |
| `/invite/[token]/page/sign-out/route.ts` | Server action POST | Token | N/A (sign-out) | F-INV-01..09 |
| `resolve_collaboration_invitation(text)` | RPC | Token | N/A (RPC) | F-INV-03 |
| `accept_collaboration_invitation_by_id(...)` | RPC (SECURITY DEFINER) | Token | N/A (RPC) | F-INV-03, F-INV-08 |
| `resolve_collaboration_invitation_with_sender_contact(...)` | RPC (SECURITY DEFINER) | Token | N/A (RPC) | F-INV-04 |
| `list_pending_invitations_for_workspace_with_expired_visibility(...)` | RPC (SECURITY DEFINER) | Authenticated | N/A (RPC) | F-INV-05 |

## Invite RPC security (third-pass reconfirmation)

### `accept_collaboration_invitation_by_id` (F-INV-03, F-INV-08)

**Evidence:**
- `20260531164227_collaboration_invitation_accept_by_id.sql`
- SECURITY DEFINER
- `set search_path = public, pg_temp`
- The function accepts `(invitation_id uuid)` and looks up the invitation by `auth.uid()` — the token never crosses the boundary
- Returns success/failure only

**Verdict:** **Confirmed.** Defense-in-depth: SECURITY DEFINER + `search_path` hardening + token never crosses boundary. Cross-tenant data exposure is not possible via this RPC.

### `resolve_collaboration_invitation_with_sender_contact` (F-INV-04)

**Evidence:**
- `20260601033000_collaboration_invitation_sender_contact.sql`
- SECURITY DEFINER
- `set search_path = public, pg_temp`
- Returns invitation metadata + inviter email (per F-DATA-08)
- RLS-protected on the underlying table

**Verdict:** **Confirmed.** The inviter email exposure is RLS-scoped to authenticated users with the right invitation.

### `list_pending_invitations_for_workspace_with_expired_visibility` (F-INV-05)

**Evidence:**
- `20260601043000_collaboration_pending_invite_expired_visibility.sql`
- SECURITY DEFINER
- `set search_path = public, pg_temp`
- Filters by `auth.uid()`-derived workspace membership

**Verdict:** **Confirmed.** Cross-tenant data exposure is not possible via this RPC.

### `resolve_collaboration_invitation` (F-INV-03, anon-accessible)

**Evidence:**
- `20260601023000_collaboration_invitation_open_audit.sql`
- Anon-accessible (invite resolution is public)
- `set search_path = public`
- Records `open_audit` event for every resolution

**Verdict:** **Confirmed.** Anon-accessible by design; the resolution is token-bound and only returns invitation metadata.

## Invite token hashing (F-INV-01, F-INV-02)

**Evidence:**
- `20260527115342_project_invite_entry_tokens.sql` — tokens are stored as HMAC-SHA256 hashes using `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`
- Pepper is empty by default (fail-closed) — see F-INV-07
- Rate limits on resolution, continue, and accept

**Verdict:** **Confirmed.** Strong design. Pepper is fail-closed (empty = dev-bypass = system disabled).

## Invite system live readiness (EG-12, restated)

**Status:** The invite system is fail-closed and safe when disabled. The live behavior is untested. EG-12 from the second pass remains open.

**Recommendation:** Configure Supabase Auth email provider, set real pepper, run invite E2E tests before enabling in production.

## Codex-driven invite threat model (third-pass)

### "Collaboration invite RPCs SECURITY DEFINER could be exploited"

**Verdict:** **Restated as Informational.** Each RPC is:
- SECURITY DEFINER
- `set search_path = public` (or `public, pg_temp`)
- Scoped to a specific invitation or audit action
- Fail-closed on missing data

The Codex bias toward "SECURITY DEFINER = exploitable" is acknowledged but does not apply here. The functions are intentionally SECURITY DEFINER to bypass RLS for the specific lookup, but they re-derive `auth.uid()` and scope by it.

## Net change to invite threat model (third-pass)

| Item | 1P | 2P | 3P |
|---|---|---|---|
| Config-blocked fail-closed | Info | Info | **Info (restated)** |
| Open audit | Info | Info | **Info (restated)** |
| Accept-by-id SECURITY DEFINER | Info | Info | **Info (restated, defense-in-depth)** |
| Sender contact SECURITY DEFINER | Info | Info | **Info (restated, RLS-scoped)** |
| Expired visibility SECURITY DEFINER | Info | Info | **Info (restated, auth.uid()-scoped)** |
| Pepper rotation | Low | Low | **Low (restated, moot until enabled)** |
| Invite not live | Low | Low | **Low (restated, EG-12)** |

No severity changes. The third pass reconfirms the second pass's invite threat model without change.

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` Codex claim #20
- See `04_FINDING_RECONCILIATION_MATRIX.md` for mapping
- See `11_RLS_SECURITY_DEFINER_AUDIT_DELTA.md` for the full SECURITY DEFINER audit
- See `17_RATE_LIMITING_THREAT_MODEL.md` for invite rate limit detail
