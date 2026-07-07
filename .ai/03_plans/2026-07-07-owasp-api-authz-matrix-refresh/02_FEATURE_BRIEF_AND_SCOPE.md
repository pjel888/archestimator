# 02 — Feature Brief and Scope

## Source brief (verbatim, from `PROMPT.md`)

> Create a refreshed OWASP/API authorization plan pack that audits all current API
> routes, public share routes, auth boundaries, and mutation paths against first-user
> production expectations.
>
> Evidence To Start From: existing June audit is older than the current code; `src/app/api/`,
> `src/app/share/`, invite/proposal/feedback/upload/compliance routes have evolved;
> Better Auth is D1-backed and Cloudflare is the production substrate; security CI gates
> are not yet unified with a complete current authz matrix.
>
> Required Plan Pack: endpoint inventory, auth/authz decision table, tenant isolation
> checks, mutation/idempotency checks, CSRF/origin policy, rate-limit needs, negative
> tests, release gates, prioritized remediation.
>
> Constraints: use current source as truth. Do not rely on the older June audit without
> re-validating each route.
>
> Stop Condition: the pack is complete when it can drive an implementation pass and test
> suite for current API authorization readiness.

## Converted planning objective

Convert the brief into a **single current authorization matrix** that, for every
endpoint and mutation path, records an explicit verdict on auth, authz, tenant
isolation, input validation, idempotency, CSRF/origin, rate-limiting, and negative-test
coverage — and a prioritized remediation roadmap that a future implementation pass can
execute to reach launch-ready authorization posture.

## Scope boundaries

### In scope

| Surface | Files / locations |
|---|---|
| API route handlers | `src/app/api/**/*.ts` (33 files) |
| Non-API route handlers | `src/app/auth/callback/route.ts`, `src/app/invite/[token]/{accept,continue,sign-out}/route.ts`, `src/app/workshop/pending-invite/route.ts` |
| Server Actions | every `"use server"` module under `src/lib/**` and `src/app/**` (~90 actions, 12 domains) |
| Public share / publication | `src/app/share/[token]/**`, `src/app/api/share/[token]/**` (8 routes + page), `src/lib/publication/**` |
| Auth boundary | Better Auth mount `src/app/api/auth/[...all]/route.ts`, `src/lib/auth/**`, `src/proxy.ts` → `src/lib/auth/request-proxy.ts`, `worker.ts`, `src/lib/cloudflare/worker-route-optimizations.ts` |
| D1 app-authz layer | `src/lib/authz/d1-access.ts`, repository scoping in `src/lib/repositories/workspace-repository.ts`, `src/lib/estimates/d1-action-client.ts` |
| Cross-cutting controls | rate limiting (`security_rate_limit_events`, in-memory upload/estimate limiters), CSRF/origin (`src/lib/publication/security.ts`, `src/lib/collaboration/invite-origin.ts`), body-size caps, `next.config.ts` headers (CSP/frame/HSTS/referrer), secrets in `.env.example`, R2 object-key authz |
| Roles | platform roles (`ceo`/`admin`/`member`), workspace roles (`owner`/`admin`/`member`/`viewer`), project/estimate collaboration roles (`owner`/`admin`/`editor`/`viewer`), public-share recipient authority |
| Existing negative tests | `tests/vitest/**` authz/CSRF/rate-limit/lockout tests |

### Out of scope (with rationale)

| Item | Rationale |
|---|---|
| Implementing any code/test/migration/config change | Planning-only task per `PROMPT.md` and `Creating-Plan-Prompt.md` §0. |
| Re-auditing unchanged generic concerns from the June audit (e.g., general XSS theory, general injection theory) | Not endpoint-specific; covered where a current route touches them. |
| Hosted GitHub control evidence (branch protection, CodeQL, Dependabot, secret scanning) | Cannot be locally proven; recorded as an external evidence gap in Doc 13/17. Current-state notes that these return 403/404 disabled. |
| Provider migration archaeology (Supabase exit, `supabase/migrations/`) | Only relevant where a current route still references a legacy surface (none found in live routes). |
| UI/UX/a11y design beyond auth-flow states | Minimal Doc 05; DESIGN.md is alpha-stage and defers to owner. |
| Performance optimization beyond rate-limit/DoS posture | Doc 09 covers the auth-relevant perf surface (limiter DoS, D1 query cost of probes). |
| Non-`src/` infrastructure (CI workflow YAML under `.github/workflows-disabled/`) | Recorded as a release-gate gap; not an authorization control. |

## Assumptions (labeled, validated against source)

- **ASSUMP-01** (validated): Better Auth is the sole authentication mechanism; no
  email/password flow is wired. Evidence: `src/lib/auth/better-auth-cloudflare.ts` —
  plugins are `nextCookies` + `magicLink` only; `account.password` column exists but is
  unused.
- **ASSUMP-02** (validated): No `middleware.ts`; the Next 16 `proxy.ts` convention is
  used. Evidence: `src/proxy.ts`, `proxy-file-convention.test.ts` asserts no middleware.
- **ASSUMP-03** (validated): The active D1 is `ARCH_DB` (`archestimator-proof-db`),
  the only runtime data store; Supabase is historical. Evidence: `wrangler.jsonc`,
  `AGENTS.md`.
- **ASSUMP-04** (validated): Closed-beta gate (`CLOSED_BETA_ACCESS_ENABLED`) and terms
  gate are enforced for protected routes via the proxy + `getCurrentUserContext`.
  Evidence: `src/lib/auth/request-proxy.ts`, `src/lib/auth/closed-beta-access.ts`,
  `src/lib/legal/terms-gate.ts`.
- **ASSUMP-05** (assumption, not externally validated): First external users will be
  closed-beta invitees (pre-launch MVP stage per `.ai/10_state/current-state.md`).
  Affects the severity bar for "broad-launch" findings (SEC-07 CSP, SEC-02 edge limits).

## Success criteria (testable)

1. Every inventoried route/action has a row in the decision table (Doc 03) with
   explicit auth / authz / validation / rate-limit / test verdicts.
2. Every public mutation has a complete shadow-path matrix (Doc 04).
3. Every gap has a stable SEC-*/REQ-* ID, severity, owner role, and remediation task
   (Doc 11 + 14).
4. Cross-document consistency check passes (no route claimed "covered by test X" in one
   doc and "no test" in another).
5. The pack survives the adversarial + final-verification pass with no internally
   resolvable critical contradiction (Doc 17 + 19).
6. The README states a canonical readiness status and points executors to
   `11_IMPLEMENTATION_PLAN.md`.

## Stop condition (from brief)

The pack is complete when it can drive an implementation pass and test suite for
current API authorization readiness. This pack reaches that bar for the named,
verified findings; residual items are explicitly external or owner-decision-gated.
