# Auth & Session Security — Evidence & Verification (2026-06-19)

**Method:** Adversarial re-verification. Each prior finding was attacked: open the cited file at the cited line, attempt to refute the claim, downgrade inflated severity, and re-check `existing_plan_overlap` against the real prior packs (`2026-06-01-security-owasp-compliance-audit`, the `mvp-launch-readiness-2026-06-01` archive) and the test suite. All source reads were READ-ONLY.

---

## Verification verdicts

### AUTH-01 — Closed-beta gate fail-open → **ADJUSTED (confirmed mechanism, sharpened scope), launch_blocker: TRUE (config)**

**What I checked & what is true:**
- `closed-beta-access.ts:35-37` — `isClosedBetaAccessEnabled` is `env.CLOSED_BETA_ACCESS_ENABLED === "true"`. Strict equality on the exact string. **Confirmed.**
- `closed-beta-access.ts:59-61` — disabled ⇒ `{allowed:true,status:"disabled"}`. **Confirmed fail-open.**
- `proxy.ts:126-134` — gate calls `getClosedBetaAccessForEmail`; `!access.allowed` is false when disabled ⇒ user passes to `/workshop`. **Confirmed.**
- `auth/callback/route.ts:82-99` — the **callback** uses the same gate; disabled ⇒ no signOut, redirect to destination. **Confirmed the blast radius is both gate points, not just proxy.**
- `actions.ts:54-60` — `signInWithOtp({ shouldCreateUser: true })`. **Confirmed self-provisioning.** Google OAuth (`:96`) also creates users.
- `.env.example:29` = `CLOSED_BETA_ACCESS_ENABLED=false`. `.env.local` — grep returned **no** `CLOSED_BETA_ACCESS_ENABLED` line. **Confirmed: "on" lives only in Vercel prod env.**

**Adversarial findings that ADJUST the prior write-up (it understated existing mitigations):**
- The disabled fail-open is **intentional and explicitly tested**: `tests/vitest/closed-beta-access.test.ts:10-23` ("allows every authenticated user while the beta gate is disabled"). So this is a *deploy-config* risk, not a code bug.
- Prior `existing_plan_overlap` said only "partial:OWASP (allowlist mechanism)". Missed: **`scripts/check-vercel-env-readiness.ts:13`** already tracks `CLOSED_BETA_ACCESS_ENABLED`, and **`tests/vitest/closed-beta-env-manifest.test.ts:53,70`** + runbook (`…/40-closed-beta-operations-runbook.md:11`) already document the `=true` requirement. The genuine residual gap: `check-vercel-env-readiness.ts` verifies the variable **name is present**, not that the **value is `"true"`** (`evaluateGroup` is name-only; `vercel env ls` does not expose values). So the existing CI tooling cannot catch a prod value of `false`.
- Net: claim stands and remains a launch blocker, but it is narrower (one un-enforced value) and there is more prior tooling than the audit credited.

### AUTH-02 — Invite `continue`/`sign-out` GET side-effects, no origin guard → **CONFIRMED, medium, launch_blocker: FALSE**

- `sign-out/route.ts:21-31` — `GET` → `supabase.auth.signOut()` + redirect, no `isAllowedInviteOrigin`. **Confirmed.**
- `continue/route.ts:35-37,64-70` — `GET` → sets `PENDING_INVITE_COOKIE` (HttpOnly), no origin guard. **Confirmed.** (Note: it *is* rate-limited, `:43`, which slightly blunts spray abuse — minor mitigation the audit omitted.)
- `accept/route.ts:51-72,141-146` — `isAllowedInviteOrigin` present and applied before mutation. **Confirmed asymmetry.**
- `page.tsx:172` and `page.tsx:239` — both are `<a href>` GET links. **Confirmed the entry points are GETs.**
- Could not refute: a third-party page can `<img>`/prefetch `/invite/<token>/sign-out` to force logout, or `/continue` to plant the bridge cookie. The token is in a URL the victim already received, so it is not secret to the attacker who phished/forwarded the link. Severity **medium** is fair (annoyance / session-disruption; no privileged mutation since accept is guarded). Not a blocker.

### AUTH-03 — No automated prod-off assertion for dev-auth bypass → **REFUTED**

- The audit claimed: *"there is no test/CI assertion that pins `isDevAuthBypassEnabled() === false` whenever `NODE_ENV==="production"` … it is still unbuilt."*
- **This is false.** `tests/vitest/auth-magic-link.test.ts` imports the real gate functions (`:5`) and, in the test "requires explicit local-only flags for dev auth and admin database bypasses", sets every other gate to its enabling value (`NODE_ENV=development`, flag=1, valid ≥32-char secret, localhost) then flips `NODE_ENV` to `production` and asserts:
  - `:100` `expect(isDevAuthBypassRequest("localhost", validSecret)).toBe(false)`
  - `:101` `expect(isDevAdminDatabaseBypassEnabled()).toBe(false)`
- `isDevAuthBypassRequest` calls `isDevAuthBypassEnabled()` internally (`dev-auth-gate.ts:46`), so the production-off behaviour of `isDevAuthBypassEnabled` **is** transitively pinned. The same test also asserts the localhost/secret/host gates individually (`:82-97`).
- **I ran it:** `bunx vitest run tests/vitest/auth-magic-link.test.ts` ⇒ **5 passed**. The regression net the finding said was missing exists and is green.
- The only sliver of truth: there is no test that calls the bare `isDevAuthBypassEnabled()` symbol with `NODE_ENV=production` directly. That is a cosmetic gap with zero security value given the transitive coverage. **Verdict: refuted.** No remediation item. (If desired, a one-line direct assertion could be added opportunistically, but it is not a finding.)

### AUTH-04 — Hosted proofs evidence-gated / stale → **CONFIRMED (process item), low, launch_blocker: FALSE**

- `scripts/verify-hosted-auth-routes.ts` and `scripts/verify-hosted-sensitive-route-fail-closed.ts` both exist (verified on disk). They are env-driven and not in CI (matches the 2026-06-06 deferral decision). Archived runs predate current migrations ⇒ stale. **Confirmed.** This is a freshness/process note, correctly low and non-blocking. No code defect.

### AUTH-05 — Partial cache clear on SIGNED_OUT → **CONFIRMED, low, launch_blocker: FALSE**

- `realtime-auth-bridge.tsx:54-58` — `SIGNED_OUT` evicts only `favoritesQueryKeys.all()`. Workspace caches persist until next navigation. **Confirmed.** `getSession()` (`:45`) is realtime-priming only, not a gate ⇒ correctly *not* flagged as an auth-decision risk. Minor confidentiality/UX nit on shared browsers. Non-blocking.

---

## Controls re-verified strong (spot-checked, no action)

- `proxy.ts:112-114`, `auth/callback/route.ts:70-72` use `auth.getUser()` (JWT-validated), not `getSession()`, at gate points. Callback `signOut()`s on beta-denied (`:97`). **Confirmed.**
- Logout is a server action, POST-only with Next action-ID protection (`actions.ts:134-138`). **Confirmed.**
- Dev-auth bypass is quadruple-gated (`dev-auth-gate.ts:12-13,46`: NODE_ENV≠prod + flag + loopback host + ≥32-char secret) AND unit-tested under production (see AUTH-03). **Confirmed strong.**
- Accept-POST CSRF guard present (`accept/route.ts:141`). **Confirmed.**

---

## Proof gates per remediation item

| Item | Proof gate | What it proves | What it CANNOT prove locally |
|------|-----------|----------------|------------------------------|
| AUTH-01 step 1 | Manual Vercel Production env inspection (screenshot / redacted `vercel env pull`) | The actual prod value is `true` at one point in time | That it stays `true`; that a later edit won't clear it |
| AUTH-01 step 2a | New unit test: `assertClosedBetaGateConfigured` throws when `VERCEL_ENV==="production"` & flag≠`"true"` & no escape hatch; no-op otherwise. `bun run build` (it imports into a server module) | The fail-loud guard fires on misconfig and is inert in dev/preview | Real Vercel boot behaviour (only a prod deploy proves boot) |
| AUTH-01 step 2b (if taken) | Extend `tests/vitest/vercel-env-readiness-script.test.ts` to cover a value-assertion path | Value check logic correct | Requires operator to feed real `vercel env pull` values; CI alone can't see prod values |
| AUTH-02 | Vitest on the two route handlers: GET removed/405; POST with mismatched `Origin` ⇒ 403; POST same-origin ⇒ side effect runs; responses carry `Cache-Control: no-store`. `bun run build` (route-handler export contract). Manual: click "Sign out and continue" + continue in browser, confirm form POST carries Origin and still works | Origin guard + POST-only + no-store on the two handlers; page links submit as POST | Real cross-site `<img>`/prefetch attack blocked end-to-end (needs a hosted check) |
| AUTH-05 | Vitest/RTL on `RealtimeAuthBridge`: emit `SIGNED_OUT`, assert `queryClient.clear()` (or workspace keys removed) called | Cache eviction on logout | Visual "no stale flash" window (needs manual shared-browser check) |
| AUTH-04 | Run both `scripts/verify-hosted-*.ts` against production with owner cookies; require `passed` | Live fail-closed for signedOut/denied/revoked/expired + `no-store` on current prod | Anything between runs (not continuous; no CI wiring by decision) |

**Honesty note:** Local checks (Vitest, build) prove *code logic*. They cannot prove the **production environment configuration** (AUTH-01 value, AUTH-04 live matrix) — those require operator action against Vercel/prod and must be release-checklist gated, not CI-gated, given the standing CI/CD deferral.

## Commands run during verification

- `bunx vitest run tests/vitest/auth-magic-link.test.ts` → 5 passed (refutes AUTH-03).
- `rg`/`grep` over `.env.example`, `.env.local`, tests, scripts, OWASP pack, runbook (see inline citations).
- Read in full: `proxy.ts`, `closed-beta-access.ts`, `actions.ts`, `auth/callback/route.ts`, `dev-auth-gate.ts`, `realtime-auth-bridge.tsx`, `invite/[token]/{accept,continue,sign-out}/route.ts`, `check-vercel-env-readiness.ts`, `closed-beta-env-manifest.test.ts`, `auth-magic-link.test.ts`.
