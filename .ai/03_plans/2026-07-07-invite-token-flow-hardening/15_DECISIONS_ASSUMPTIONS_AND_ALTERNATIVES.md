# Decisions, Assumptions, and Alternatives

## 1. Major decisions (load-bearing)

### DEC-01 — Tighten `isAllowedInviteOrigin` to deny-on-missing in production (with env kill switch)
- **Problem:** `invite-origin.ts:27,39` allows requests when the app host is undeterminable OR both Origin and Referer are absent. A forged POST with stripped headers bypasses the only CSRF control on accept/sign-out.
- **Constraints:** Must not break the legitimate same-site form POST (J1/J2 flow) or local dev testing. Must be rollbackable without redeploy.
- **Options considered:**
  - (a) Deny-on-missing in production + env toggle `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` (default true in prod, false in dev). **Recommended.**
  - (b) Adopt the publication-style double-submit CSRF token (`ae_publication_csrf` cookie + header). Heavier; new client+server surface; would require minting a CSRF cookie on the invite page render.
  - (c) Rely on `Sec-Fetch-Site` alone. Insufficient — `passesFetchMetadata` in `client-error/route.ts` treats missing Sec-Fetch-Site as passing, and older browsers lack it.
  - (d) Enforce CSP `form-action 'self'` (currently Report-Only). Defense-in-depth, not a replacement for the application-layer check; sibling plan owns CSP.
- **Advantages of (a):** minimal new surface; fixes the exact gap; matches the repo's same-host comparison pattern; env kill switch for emergencies; no client changes.
- **Disadvantages:** a corporate proxy stripping both headers would block legit traffic — mitigated by monitoring + kill switch.
- **Security implications:** closes SEC-01 (Medium-High). Form POSTs always carry Origin in modern browsers; `<a>` clicks rely on Referer (stripped by `Referrer-Policy: no-referrer` on `/invite`) → P1-T2 DISCOVERY switches the Continue CTA to a form POST.
- **Performance:** O(1) header parse; no DB.
- **Operational:** 24h 403-rate monitoring; env kill switch.
- **Recommended option:** (a).
- **Reason:** least-risk fix for the confirmed gap, with a no-redeploy rollback.
- **Consequences:** legit clients that strip both headers are blocked until the kill switch is relaxed.
- **Conditions that would change the decision:** evidence of significant non-browser invite accept traffic (would push toward (b) or a token-based scheme).

### DEC-02 — Add the origin guard to `/invite/[token]/continue`
- **Problem:** `continue/route.ts` mints a state-changing bridge cookie with no origin check.
- **Options:** (a) reuse `isAllowedInviteOrigin` (recommended); (b) separate CSRF token. (a) is consistent with accept/sign-out.
- **Recommended:** (a). Dependency: switch the Continue CTA to a form POST so Origin is sent (DISCOVERY in P1-T2).

### DEC-03 — Add explicit `revokeCollaborationInvitation` Server Action + UI
- **Problem:** No explicit revoke surface; revocation only on implicit re-issue.
- **Options:** (a) new Server Action + revoke button (recommended); (b) extend resend to "resend-or-revoke"; (c) status quo (implicit only). (a) is explicit, auditable, matches the manager mental model.
- **Recommended:** (a). Includes `revoked_reason` column (DATA-01) and `collaboration_invite_revoked` audit event.

### DEC-04 — Fail-closed rate limits when feature flag disabled
- **Problem:** `invite-entry.ts:184-185` returns allowed when disabled.
- **Options:** (a) deny resolve/continue/accept when disabled (recommended, pending OPEN-SEC-02); (b) keep fail-open; (c) separate hard-gate. (a) with route-level short-circuit is clearest.
- **Recommended:** (a). Gated on OPEN-SEC-02 (owner confirms the disabled-flag semantics).

### DEC-05 — Full cookie attributes on sign-out clear
- **Problem:** `sign-out/route.ts:42-43` omits httpOnly/secure/sameSite.
- **Options:** (a) inline the attribute object; (b) extract a shared `clearBetterAuthSessionCookies` helper (recommended — the pattern repeats 3x).
- **Recommended:** (b).

### DEC-06 — Separate realtime identity signing key from invite pepper
- **Problem:** Pepper reused across invite hashing, rate-limit IP hashing, realtime signing.
- **Options:** (a) require `REALTIME_IDENTITY_SIGNING_KEY` (recommended, owner-gated OPEN-REL-02); (b) status quo. (a) is key-separation hygiene.
- **Recommended:** (a). Also consider a third distinct `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER` (already exists as a name; make it required, not fallback) — future work.

### DEC-07 — Promotion-only direct-grant
- **Problem:** Direct-grant overwrites roles; accept is promotion-only.
- **Options:** (a) align direct-grant to promotion-only CASE (recommended); (b) status quo. (a) prevents accidental downgrade.
- **Recommended:** (a).

### DEC-08 — Resolve `auth_trigger` enum (OPEN-SEC-01)
- **Problem:** Dead enum value.
- **Options:** (a) wire login-time grant; (b) remove the enum value. **Recommend (b) remove** unless a product need exists for login-time acceptance (e.g., a user signing up with the invited email auto-accepts). Owner decides.

### DEC-09 — Migration `0038` adds `revoked_reason` only
- **Problem:** Revoke needs audit context.
- **Options:** (a) add nullable `revoked_reason` (recommended); (b) store reason in audit `metadata_json` only (no schema change). (a) is queryable for forensics.
- **Recommended:** (a).

### DEC-10 — Keep email delivery synchronous; document async queue as future work
- **Problem:** No bounce loop; synchronous send.
- **Options:** (a) build async queue + bounce webhook now; (b) defer (recommended, OPEN-REL-01). The hardening doesn't depend on it.
- **Recommended:** (b).

## 2. Assumptions

| ID | Assumption | Validated? | Source |
|---|---|---|---|
| ASSUMP-01 | Browsers always send `Origin` on same-origin form POST | Yes ( Fetch spec) | official docs |
| ASSUMP-02 | The invite page's `<a>` CTAs are subject to `Referrer-Policy: no-referrer` | Yes | `next.config.ts:248-257` |
| ASSUMP-03 | D1 supports `ALTER TABLE ADD COLUMN` (nullable) atomically | Yes | SQLite spec |
| ASSUMP-04 | D1 supports `DROP COLUMN` (3.35+) | **DISCOVERY-REQUIRED** | to confirm via `cf:d1:read sqlite_version()` |
| ASSUMP-05 | No caller relies on direct-grant overwrite semantics | **DISCOVERY-REQUIRED** (P4-T1 grep) | to confirm |
| ASSUMP-06 | The continue CTA is currently an `<a>` | **DISCOVERY-REQUIRED** (P1-T2) | to confirm |
| ASSUMP-07 | `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` env can be set without redeploy on Cloudflare | Yes | Cloudflare env vars are hot (Workers secrets / vars) |
| ASSUMP-08 | The hosted proof harness can be extended for revoke without a new binding | Yes | existing harness structure |
| ASSUMP-09 | Better Auth session cookie attributes are `__Secure-` prefixed in prod | Yes | `request-proxy.ts`, Better Auth defaults |
| ASSUMP-10 | The closed-beta allowlist is fully disjoint from collaboration invites | Yes | L1/L3 discovery |

## 3. Alternatives rejected (with reasons)

| Alternative | Why rejected |
|---|---|
| Double-submit CSRF token on invites (DEC-01 option b) | Heavier surface; the same-host origin check is sufficient for the threat (forged cross-site POST). Keep the option if non-browser clients become supported. |
| Sec-Fetch-Site only (DEC-01 option c) | Insufficient alone; missing-header short-circuit; older-browser gap. |
| Global CSRF middleware | Out of blast radius; Better Auth CSRF covers `/api/auth`; invite routes need their own check regardless. |
| Async invite-email queue now (DEC-10 option a) | Not required for hardening correctness; adds queues/cron (ARCH-02 constraint). Defer. |
| Move Better Auth tables into `./migrations/` | They're Better-Auth-generated; out of scope. |
| Rewrite the invite page state machine | Non-regression target; redesign is out of scope. |
| Enforce CSP `form-action` in this pack | Sibling CSP plan owns it; SEC-01 is the primary control. |
| Remove the bridge cookie entirely | It's cryptographically sound (SEC-03); the cross-auth round-trip needs it. |
