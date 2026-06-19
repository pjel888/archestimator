# Auth & Session Security — Audit Findings (2026-06-19)

## Scope & coverage

**Read in full (every line):**
- Gate: `src/proxy.ts` (the real route wall — Next 16 `proxy.ts`, confirmed against `node_modules/next/dist/lib/constants.js` which defines `PROXY_FILENAME` + `PROXY_LOCATION_REGEXP = (?:src/)?proxy`).
- Supabase clients: `src/lib/supabase/{server,client,service-role,env}.ts`.
- Session/access: `src/lib/auth/{session,closed-beta-access,redirects,actions,error-mapping,account-setup}.ts`.
- Dev bypass: `src/lib/auth/{dev-auth,dev-auth-gate}.ts`.
- Account: `src/lib/auth/{account-actions,account-data,account-audit,account-membership,account-service-role,beta-allowlist-admin,beta-allowlist-admin-actions}.ts`.
- Pages/routes: `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/invite/[token]/{page.tsx,accept/route.ts,continue/route.ts,sign-out/route.ts}`, `src/app/beta/access-required/page.tsx`.
- Layout gates: `src/app/layout.tsx`, `src/app/workshop/layout.tsx` (+ `src/lib/legal/terms-gate.ts`), `src/app/workshop/projects/[projectId]/layout.tsx`.
- Verify scripts: `scripts/verify-hosted-auth-routes.ts`, `scripts/verify-hosted-sensitive-route-fail-closed.ts`.
- Config: `next.config.ts`, `.env.example`, `.env.local` (auth keys only), invite-entry config (`src/lib/collaboration/invite-entry.ts` head), `src/components/realtime-auth-bridge.tsx`, publication cookie (`src/lib/publication/security.ts` cookie lines).

**Deferred / out of lane (recorded in cross_domain_notes):** RLS/RPC bodies (`check_closed_beta_access`, `resolve/accept_collaboration_invitation`, allowlist RPCs) — domain 2. CSP Report-Only / nonce — domain 7. `proxy.ts` `/api/*` short-circuit's API-route impact — domain 4. Absence of self-serve account deletion/data export (DSAR) — domain 11. Rate-limit store internals — domain 4/9.

**Confirmed early signal:** No `middleware.ts` anywhere. The gate is `src/proxy.ts`, and it IS wired (Next 16 convention verified). The "no middleware found" signal is expected, not a gap.

## Reconciliation table vs prior packs

| Prior pack / state | Item | This audit |
|---|---|---|
| OWASP `03-auth...` F-AUTH-01 | dev bypass triple-gated (NODE_ENV≠prod + flag + loopback + 32-char secret) | Confirmed still true (`dev-auth-gate.ts:12,39-46`). Re-verified; not re-reported. |
| OWASP F-AUTH-02 | next-path sanitization (open-redirect safe) | Confirmed hardened (`redirects.ts:94-132`: blocks `//`, `\`, schemes, nested `next`, callback path, multi-decode). Not re-reported. |
| OWASP F-AUTH-03 | dev path uses service-role key | Unchanged; covered-by OWASP. Refreshed as AUTH-03 (CI prod-off assertion still not present — partial). |
| OWASP F-AUTH-04 + ledger (4) | share cookie `Secure`/`SameSite` | RESOLVED: `security.ts:342,495-509` set `HttpOnly; SameSite=Lax; Secure (prod)`; HSTS added in `next.config.ts`. Prior follow-up closed. |
| OWASP F-AUTH-06 | session resolution null-handling | Confirmed: every caller handles null (`session.ts:42,87-91`; `proxy.ts:116`). Not a finding. |
| current-state.md (hosted proofs) | logout, expired/denied/revoked fail-closed, anon `/workshop`→login | Proven in production archive (2026-06-04/05 smokes). AUTH-04 only asks to re-run after any gate edit. |
| OWASP `15-collaboration-invite-surface` (G5) | invite-accept CSRF | RESOLVED for POST `/accept` (`accept/route.ts:51-72,141` same-origin guard). But `continue`/`sign-out` GET handlers are NOT covered → AUTH-02 (new). |

## Findings

### AUTH-01 — Closed-beta access gate depends on `CLOSED_BETA_ACCESS_ENABLED=true`, which is fail-OPEN if unset and is not present in tracked env files
- **Severity:** high · **launch_blocker:** true (only if the production env var is not actually set)
- **Evidence:** `closed-beta-access.ts:35-37` — `isClosedBetaAccessEnabled()` returns `true` only when `env.CLOSED_BETA_ACCESS_ENABLED === "true"`; `:59-61` — when disabled it returns `{ allowed: true, status: "disabled" }`, i.e. **any authenticated Google/email-OTP user is admitted**. `signInWithEmail` uses `shouldCreateUser: true` (`actions.ts:58`), so anyone with any email can self-provision an account. `.env.example:29` defaults `CLOSED_BETA_ACCESS_ENABLED=false`; `.env.local` does **not** set it (grep returned no line). The gate's "on" state lives only in the Vercel production environment.
- **Impact:** If the prod env var is missing/typo'd/cleared, the closed beta is silently world-open: the allowlist (`closed_beta_allowed_emails`) is bypassed and arbitrary sign-ups reach `/workshop`. This is the single highest-leverage auth misconfiguration for a "wider users" gate because failure is invisible (no error, just admits everyone).
- **Recommendation:** (1) Verify in Vercel prod that `CLOSED_BETA_ACCESS_ENABLED=true` is set for the production environment before widening access; capture a screenshot/proof. (2) Add a startup/CI assertion (or a `/api/health`-style internal check) that fails loudly if `NODE_ENV==="production"` and the flag is not `"true"`, so the fail-open default cannot ship unnoticed. (3) Consider inverting the default to fail-closed (require an explicit `CLOSED_BETA_ACCESS_ENABLED=false` to disable) for the beta window.
- **effort:** S · **confidence:** high (code fail-open path is certain; whether prod env is set is unverified from repo — must be checked in Vercel) · **existing_plan_overlap:** partial:2026-06-01-security-owasp-compliance-audit (OWASP covered the allowlist mechanism existing + RLS, but did not flag the env-driven fail-open default as a launch-config risk).

### AUTH-02 — Invite `continue` and `sign-out` route handlers accept GET and have no same-origin guard (CSRF: forced logout + pending-invite cookie set via prefetch/img)
- **Severity:** medium · **launch_blocker:** false
- **Evidence:** `invite/[token]/sign-out/route.ts:21-31` exports `GET` that calls `supabase.auth.signOut()` and redirects — no Origin/Referer check. `invite/[token]/continue/route.ts:35-37` exports `GET` that sets the `archestimator_pending_invite` HttpOnly cookie. By contrast the state-mutating `/accept` POST is correctly protected (`accept/route.ts:51-72,141` `isAllowedInviteOrigin`). The token shape is unguessable, but the token rides in the URL the recipient already clicked, and any page can `<img src="/invite/<token>/sign-out">` or prefetch it.
- **Impact:** Low-to-moderate CSRF. `sign-out` GET lets a malicious page silently log the victim out (annoyance / session-disruption; not data loss). `continue` GET lets a third party plant a pending-invite bridge cookie. No privileged mutation (accept is POST-guarded), so this is not a data-integrity blocker, but GET-triggered auth-state changes are a real anti-pattern for an external launch.
- **Recommendation:** Make both handlers POST-only (the `page.tsx` "Sign out and continue" link is an `<a href>` GET today — change to a form POST), and reuse `isAllowedInviteOrigin` from `accept/route.ts` on both. At minimum add `Cache-Control: no-store` and the same-origin guard.
- **effort:** S · **confidence:** high · **existing_plan_overlap:** partial:2026-06-01-security-owasp-compliance-audit (`15-collaboration-invite-surface` G5 fixed only the accept-POST CSRF; the GET sibling routes were not covered).

### AUTH-03 — No automated guarantee that the dev-auth bypass is inert in production (defense-in-depth)
- **Severity:** low · **launch_blocker:** false
- **Evidence:** `dev-auth-gate.ts:12-13` gates on `NODE_ENV !== "production"` AND flag AND loopback hostname AND a ≥32-char secret (`:39-46`) — strong, and `server.ts:11-13` / `proxy.ts:65` honor it. But there is no test/CI assertion that pins `isDevAuthBypassEnabled() === false` whenever `NODE_ENV==="production"` regardless of the other flags. OWASP R-02 recommended exactly this; it is still unbuilt.
- **Impact:** On Vercel the bypass is moot (prod NODE_ENV + non-loopback host), so this is purely belt-and-suspenders. Risk is a future refactor weakening one gate without a regression net.
- **Recommendation:** Add a unit test asserting all four gates, plus an explicit `NODE_ENV=production`→`false` case for `isDevAuthBypassEnabled`/`isDevAdminDatabaseBypassRequest`. Record the bypass contract in `decisions.md` (OWASP R-01).
- **effort:** S · **confidence:** high · **existing_plan_overlap:** covered-by:2026-06-01-security-owasp-compliance-audit (F-AUTH-01/03, R-01/R-02) — re-surfaced because the recommended test still does not exist.

### AUTH-04 — Hosted fail-closed / auth-route proofs are evidence-gated, not part of any automated gate; must be re-run before widening access
- **Severity:** low (info-leaning) · **launch_blocker:** false
- **Evidence:** `scripts/verify-hosted-auth-routes.ts` and `scripts/verify-hosted-sensitive-route-fail-closed.ts` are robust, sanitized, credential-aware probes (auth: signedOut/allowed/denied/revoked/expired → expected redirect + `private, no-store`; sensitive: invalid share token + unauthenticated image routes fail-closed + `no-store`). They require manually supplied env (`HOSTED_AUTH_*_COOKIE`, base URL allowlist) and are not wired into CI (CI/CD intentionally deferred per 2026-06-06 decision). Last production runs are archived (2026-06-04/05) and predate ~63 newer migrations.
- **Impact:** The proofs are sound but stale relative to current `main`; nothing forces a re-run after a gate edit. For a wider-users gate, the denied/revoked/expired matrix should be re-proven on current prod.
- **Recommendation:** Re-run both scripts against production as a release checklist item (owner-supplied cookies for allowed/denied/revoked/expired). Treat a non-`passed` result as a launch blocker. No code change required.
- **effort:** M · **confidence:** high · **existing_plan_overlap:** partial:current-state.md (prior hosted proofs exist; this is a freshness/process note, not a defect).

### AUTH-05 — Client query cache is only partially cleared on SIGNED_OUT (favorites only); other cached workspace data persists in memory until navigation
- **Severity:** low · **launch_blocker:** false
- **Evidence:** `realtime-auth-bridge.tsx:54-58` — on `SIGNED_OUT` it evicts only `favoritesQueryKeys.all()`. Projects/estimates/settings TanStack caches are not removed; they clear on the next server navigation (proxy redirects to `/login`, RSC re-renders). `getSession()` here is used only to prime realtime auth, not for gating, so it is not an auth-decision risk.
- **Impact:** On a shared browser, a fast "back" after logout could momentarily show stale cached non-favorite data from the client cache before the gate redirect lands. Minor confidentiality/UX nit; server access is already revoked.
- **Recommendation:** On `SIGNED_OUT`, call `queryClient.clear()` (or remove the workspace-scoped keys) in addition to favorites. Single-line change.
- **effort:** S · **confidence:** medium · **existing_plan_overlap:** none.

## Controls confirmed strong (no action)
- Server-side session validation everywhere uses `auth.getUser()` (validates the JWT with Supabase), never the spoofable `getSession()`, at all three decision points: `proxy.ts:112-114`, `session.ts:38-40`, `auth/callback/route.ts:70-72`. Callback also `signOut()`s on beta-denied (`:97`).
- Open-redirect defense in `redirects.ts` (multi-pass decode, `//`/scheme/backslash/nested-`next` rejection) + `resolveAuthOrigin` origin allowlist.
- Logout is a server action (`actions.ts:134-138`), POST-only with Next action-ID protection; allowlist-admin mutations re-check `role` server-side (`beta-allowlist-admin-actions.ts:35,55`) on top of RLS.
- Auth audit writes are best-effort, service-role, with a secret-scrubbing metadata filter (`account-data.ts:10,108-125`) and hashed IP/UA (`account-audit.ts:41-57`).
- Invite tokens are peppered-SHA256 hashed before DB lookup, shape-validated, rate-limited, and enabled only with a valid 64-hex pepper (`invite-entry.ts`).
