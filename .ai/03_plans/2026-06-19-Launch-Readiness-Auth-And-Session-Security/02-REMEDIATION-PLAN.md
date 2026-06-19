# Auth & Session Security — Remediation Plan (2026-06-19)

**Author:** Adversarial verifier + remediation planner (READ-ONLY on source; writes only this folder).
**Inputs:** `01-AUDIT-FINDINGS.md`, verified against live source on 2026-06-19. See `03-EVIDENCE-AND-VERIFICATION.md` for verdicts.

## Verdict summary

| ID | Title | Prior sev / blocker | Verdict | Final sev / blocker |
|----|-------|---------------------|---------|---------------------|
| AUTH-01 | Closed-beta gate fail-open if `CLOSED_BETA_ACCESS_ENABLED` unset/≠`true` | high / true* | **adjusted** | high / **true (config gate)** |
| AUTH-02 | Invite `continue`+`sign-out` GET handlers do side effects, no same-origin guard | medium / false | **confirmed** | medium / false |
| AUTH-03 | No automated prod-off assertion for dev-auth bypass | low / false | **refuted** | n/a — assertion exists |
| AUTH-04 | Hosted fail-closed proofs are evidence-gated, stale vs `main` | low / false | **confirmed (adjusted scope)** | low / false |
| AUTH-05 | SIGNED_OUT clears favorites cache only, not workspace caches | low / false | **confirmed** | low / false |

**Launch-blocker count: 1** (AUTH-01, and it is a *deploy-config verification*, not a code change).

Controls confirmed strong (no action): server-side `getUser()` at all 3 gate points (`proxy.ts:112-114`, `session.ts`, `auth/callback/route.ts:70-72`); open-redirect defense in `redirects.ts`; logout server action POST-only; accept-POST CSRF guard (`accept/route.ts:51-72,141`); peppered-SHA256 invite tokens; dev-auth bypass quadruple-gated AND unit-tested under `NODE_ENV=production`.

---

## Priority 0 — Launch blocker

### AUTH-01 — Guarantee the closed-beta gate is actually ON in production

**Why it is the blocker (adjusted, not refuted):** The fail-open default is *intentional and tested* (`closed-beta-access.ts:59-61`; `tests/vitest/closed-beta-access.test.ts:10-23` proves "beta disabled ⇒ admit all"). It is correct behaviour for the owner-only window. The launch risk is purely operational: if the **Vercel production** env var is missing, cleared, or set to anything other than the exact string `"true"`, then `isClosedBetaAccessEnabled()` returns `false`, `getClosedBetaAccessForEmail` returns `{allowed:true,status:"disabled"}`, and because `signInWithEmail` uses `shouldCreateUser:true` (`actions.ts:58`), any email/Google identity self-provisions and reaches `/workshop`. Both the proxy gate (`proxy.ts:126-134`) AND the callback gate (`auth/callback/route.ts:82-99`) depend on this same value, so a wrong value opens the whole app.

**Gap in existing tooling (this sharpens, not duplicates, prior work):** `scripts/check-vercel-env-readiness.ts` already lists `CLOSED_BETA_ACCESS_ENABLED` (line 13) in `CORE_CLOSED_BETA_ENV_NAMES`, but `evaluateGroup` only checks the variable **name is present** in the `vercel env ls` transcript — it does **not** assert the value is `"true"` (it cannot; `vercel env ls` does not print values). So a prod value of `false` passes `vercelEnvReady`. The runbook documents the requirement (`.ai/09_archive/mvp-launch-readiness-2026-06-01/40-closed-beta-operations-runbook.md:11`) but nothing enforces the value.

**Steps (in order):**
1. **(Verification — mandatory before widening access)** In Vercel, for the **Production** environment, confirm `CLOSED_BETA_ACCESS_ENABLED` is exactly `true` (no quotes, no whitespace). Capture proof (screenshot or `vercel env pull` of a throwaway, redacted). Record in `.ai/10_state/decisions.md`.
2. **(Defense-in-depth code — recommended)** Add a runtime fail-loud check so a wrong/missing value cannot ship silently. Two viable forms:
   - **2a (preferred, narrow):** In `src/lib/auth/closed-beta-access.ts`, add an exported `assertClosedBetaGateConfigured(env = process.env)` that throws when `env.VERCEL_ENV === "production"` (or `NODE_ENV === "production"` on a non-loopback host) AND `env.CLOSED_BETA_ACCESS_ENABLED !== "true"` AND `env.ARCHESTIMATOR_ALLOW_OPEN_BETA !== "1"` (explicit opt-out escape hatch). Call it from a server-only module that runs at boot — e.g. add an invocation in `src/app/layout.tsx` (already server) or a dedicated `src/lib/auth/startup-assertions.ts` imported by the root layout. Keep it a no-op in dev/preview.
   - **2b (alternative, CI-only):** Extend `check-vercel-env-readiness.ts` to accept a `VERCEL_ENV_EXPECT_VALUES` JSON map and, when supplied with the production `vercel env pull` output (which *does* include values), assert `CLOSED_BETA_ACCESS_ENABLED === "true"`. This keeps it out of the runtime path but requires the operator to feed it real values.
   - Recommendation: ship **2a** (it cannot be skipped operationally) and keep 1 as the release-checklist gate.
3. **(Do NOT invert the default.)** The audit's option (3) "invert default to fail-closed" is **rejected** for now: the disabled-state is load-bearing for local dev and for the documented break-glass restore (`runbook:108`). Inverting it would break those flows and the existing test contract. The fail-loud assert (2a) achieves the same safety without changing semantics.

**Files to change:** `src/lib/auth/closed-beta-access.ts` (add assert), `src/app/layout.tsx` or new `src/lib/auth/startup-assertions.ts` (call it). Optional: `scripts/check-vercel-env-readiness.ts` (value check).
**Migration/RLS notes:** none — pure app/config. The RLS-level allowlist enforcement is domain RLS-RPC (cross-domain note below).
**Risk:** Low. A too-aggressive assert could crash prod boot if env is misread — mitigate with the explicit `ARCHESTIMATOR_ALLOW_OPEN_BETA=1` escape hatch and gate on `VERCEL_ENV==="production"` only.
**Effort:** S. **Dependencies:** none. **existing_plan_overlap:** partial:2026-06-01-security-owasp-compliance-audit (allowlist + RLS covered there; env-value enforcement not). Tooling partial: `check-vercel-env-readiness.ts` (name-only).

---

## Priority 1 — Pre-launch hardening (non-blocking, low effort)

### AUTH-02 — Make invite `continue` and `sign-out` POST-only with same-origin guard

**Confirmed:** `sign-out/route.ts:21-31` exports `GET` calling `supabase.auth.signOut()`; `continue/route.ts:35-37` exports `GET` setting the `archestimator_pending_invite` HttpOnly cookie. Neither calls `isAllowedInviteOrigin`. The page entry points are `<a href>` GETs: `page.tsx:172` (→`/continue`), `page.tsx:239` (→`/sign-out`). The state-mutating `/accept` is correctly POST + origin-guarded — these two are the unguarded siblings (G5 fixed only accept).

**Steps:**
1. Promote `isAllowedInviteOrigin` to a shared util so it is not duplicated. Move it from `accept/route.ts` into `src/lib/collaboration/invite-entry.ts` (or a small `src/lib/collaboration/invite-origin.ts`) and re-export; update `accept/route.ts` import.
2. In both `sign-out/route.ts` and `continue/route.ts`: remove the `GET` export (or have it return a 405 / redirect to the invite page without side effects), keep only `POST`, and at the top of the `POST` handler call `if (!isAllowedInviteOrigin(request)) return 403 JSON {error:"Invalid request origin."}` with `Cache-Control: no-store` — mirroring `accept/route.ts:141-146`.
3. Add `Cache-Control: no-store` to the redirect/JSON responses in both handlers.
4. Convert the two page links to form POSTs:
   - `page.tsx:172` `<a href=".../continue">` → `<form action=".../continue" method="post">` with a submit button styled as `inviteActionClassName`.
   - `page.tsx:239` `<a href=".../sign-out">` → `<form action=".../sign-out" method="post">` submit button styled as `inviteSecondaryActionClassName`.
   - Preserve existing classes/labels ("Sign out and continue", continue label).

**Files:** `src/app/invite/[token]/sign-out/route.ts`, `src/app/invite/[token]/continue/route.ts`, `src/app/invite/[token]/accept/route.ts` (import move), `src/app/invite/[token]/page.tsx`, new/updated `src/lib/collaboration/invite-entry.ts` (or `invite-origin.ts`).
**Risk:** Low. Watch: same-origin form POSTs sometimes omit `Origin`; `isAllowedInviteOrigin` already fails-open on no-signal (`accept/route.ts:54-71`) so genuine navigations still pass. Verify the new `<form>` posts carry `Origin`/`Referer` in the browser (they do for same-origin form submits).
**Effort:** S. **Dependencies:** none. **existing_plan_overlap:** partial:2026-06-01-security-owasp-compliance-audit (`15-collaboration-invite-surface` G5 — accept only).
**Design note:** changing `<a>` to a `<form><button>` is a visual/markup change in the invite page — DESIGN.md is an alpha guide; keep the existing class names so appearance is unchanged, defer any restyle to Philip.

### AUTH-05 — Clear workspace query caches on SIGNED_OUT, not just favorites

**Confirmed:** `realtime-auth-bridge.tsx:54-58` evicts only `favoritesQueryKeys.all()` on `SIGNED_OUT`. Projects/estimates/settings TanStack caches survive in memory until the next server navigation. `getSession()` here is realtime-priming only, not a gate — not an auth-decision risk.

**Steps:**
1. In the `SIGNED_OUT` branch of `realtime-auth-bridge.tsx`, replace the favorites-only eviction with `queryClient.clear()` (simplest, clears everything) OR, if a residual cache is desired for instant re-login UX, remove the workspace-scoped key roots explicitly. Given this is a logout-confidentiality nit, `queryClient.clear()` is the safe default.
2. Keep `void applyAuth(undefined)` after the clear.

**Files:** `src/components/realtime-auth-bridge.tsx`.
**Risk:** Very low. `clear()` also drops benign caches (no correctness impact; data refetches on next mount). Confirm no component reads from cache during the brief post-logout window before the proxy redirect to `/login` lands.
**Effort:** S. **Dependencies:** none. **existing_plan_overlap:** none.

---

## Priority 2 — Release checklist (process, no code)

### AUTH-04 — Re-run hosted fail-closed / auth-route proofs against current prod before widening access

**Confirmed (scope adjusted to process item):** `scripts/verify-hosted-auth-routes.ts` and `scripts/verify-hosted-sensitive-route-fail-closed.ts` both exist and are robust, env-driven probes. They are not wired into CI (CI/CD intentionally deferred, 2026-06-06 decision). Last archived runs (2026-06-04/05) predate the current migration set, so they are stale relative to `main` — but the scripts themselves are sound.

**Steps:**
1. As a release-checklist item, run both scripts against production with owner-supplied cookies for the allowed/denied/revoked/expired matrix and the sanitized base-URL allowlist.
2. Treat any non-`passed` result as a launch blocker at that moment.
3. Record the run + result hash in `.ai/10_state/decisions.md`.

**Files:** none (process). **Risk:** none. **Effort:** M (operator time, owner cookies). **Dependencies:** AUTH-01 verified first (so the gate under test is in its launch state). **existing_plan_overlap:** partial:current-state.md (freshness/process note).

---

## Sequencing

1. **AUTH-01 step 1** (verify Vercel prod value) — gates the launch decision; do first.
2. **AUTH-01 step 2a** (fail-loud assert) — small code change, ship with AUTH-02/05.
3. **AUTH-02** + **AUTH-05** — bundle as one low-risk hardening PR (route handlers + bridge + invite page).
4. **AUTH-04** — final release-checklist gate, after the gate is in launch state.

## Cross-domain notes (not fixed here)

- **RLS-RPC (domain):** `check_closed_beta_access`, `accept_collaboration_invitation`, allowlist RPCs — DB-level enforcement of the allowlist is the real second layer behind AUTH-01. Confirm RLS denies `/workshop` data even if the app gate is mis-set. See `2026-06-19-Launch-Readiness-RLS-RPC-And-DB-Security`.
- **NextJS/Vercel/Headers (domain):** CSP is Report-Only on `/`, `/workshop`, `/invite`; `unsafe-inline`/`unsafe-eval` still allowed; nonce deferred. A stricter CSP would further blunt the AUTH-02 CSRF-via-injected-markup vector. See `2026-06-19-Launch-Readiness-NextJS-Vercel-Deploy-And-Headers`.
- **API Routes (domain):** `proxy.ts:56` short-circuits `/api/*` out of the gate entirely — API routes must self-authorize. See `2026-06-19-Launch-Readiness-API-Routes-And-Server-Actions`.
- **Legal/DSAR (domain):** no self-serve account deletion / data export. See accessibility-SEO-legal pack.
