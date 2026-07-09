# 02 — Feature Brief and Scope

## Source brief (owner intent)

> Create a comprehensive audit and analysis and plan for the landing page auth
> layer. I want to be able to fully be sure that our auth from landing page to
> the workshop dashboard is secured. Basically, all attack vectors should be
> covered and that the only way a user can access our app (except for the
> landing page and other public pages) is through logging in with google auth
> and the magic link thing we have.

## Interpreted product outcome

Philip (owner) wants **verifiable assurance** that:

1. **Auth-method exclusivity:** The only authentication paths into the app are
   Google OAuth and the magic-link email flow. No password login, no backdoors,
   no alternative providers.
2. **Public/protected boundary:** The landing page and explicitly-listed public
   pages (`/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`,
   `/terms`, `/trust`, `/signup`, `/share/*`, `/invite/*`, `/access-required`)
   are the only surfaces reachable without authentication.
3. **Attack-vector coverage:** Every realistic attack vector — direct URL nav,
   direct Server Action POST, API handler call, cookie tampering, session
   fixation, token theft, CSRF, IDOR, privilege escalation, XSS, open redirect,
   dev-bypass leak, rate-limit/abuse — is covered by a control, with evidence.

## In scope

- **Audit (complete):** Full auth surface analysis (recorded in `03_SOURCE_AND_CODEBASE_AUDIT.md`).
- **Hardening phase 1:** Hash magic-link tokens at rest (P0).
- **Hardening phase 2:** Defense-in-depth authz in the 1 action + 8 repositories lacking it.
- **Hardening phase 3:** Explicit Better Auth rate limits + magic-link config hardening.
- **Hardening phase 4:** CSP enforcement migration (Report-Only → enforced) prep.
- **Proof phase 5:** Denial tests, role-matrix tests, cookie-attribute tests, hosted proof gates.

## Out of scope (non-goals)

- Replacing Better Auth or changing the auth architecture.
- Adding password-based authentication (explicitly disabled by design).
- Adding 2FA / admin / organization plugins (not required for closed beta).
- Changing the Cloudflare provider, D1 database, or resource boundary.
- Modifying landing-page or workshop UI content/markup.
- Migrating session store or changing cookie attributes (current defaults are correct).
- Rewriting the route structure (current `/workshop` prefix model is sound).
- Git branch/worktree operations (shared live worktree).

## Assumptions (to validate)

| ID | Assumption | Validation |
|---|---|---|
| ASSUMP-1 | Better Auth 1.6.23's `storeToken:"hashed"` uses `defaultKeyHasher` and the verify path is automatic. | Read `node_modules/better-auth/dist/plugins/magic-link/index.mjs` + core `consumeVerificationValue` before phase 1. |
| ASSUMP-2 | The Better Auth core tables exist on remote D1 (runtime-applied). | `bun run cf:d1-query` / proof router readback before phase 1 hosted proof. |
| ASSUMP-3 | Hashing magic-link tokens won't break in-flight tokens during deploy. | Phase 1 includes tolerance logic / deploy-window guidance. |
| ASSUMP-4 | Closed-beta allowlist posture (D1-gated) is owner-intentional. | Owner confirmation (not blocking). |
| ASSUMP-5 | CSP Report-Only logs show no blocking violations that would break enforcement. | Phase 4 reviews Report-Only violation logs before switching to enforce. |

## Constraints

- **Shared live worktree:** No auto-branching; coordinate via file-scope ownership + fresh `git status`.
- **Cost posture:** Stay on free-tier Cloudflare; no paid add-ons without owner approval.
- **No destructive Git:** No `reset --hard`, force-push, history rewrite.
- **Provider boundary:** Only `wrangler.jsonc`-bound resources; never touch historical Supabase project `ebxxqidacheyapmmzavr` or unrelated accounts.
- **Next.js 16:** Read local docs in `node_modules/next/dist/docs/` before framework-sensitive changes (middleware, Server Actions).
