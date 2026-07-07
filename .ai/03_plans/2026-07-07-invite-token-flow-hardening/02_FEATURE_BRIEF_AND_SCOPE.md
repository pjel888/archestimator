# Feature Brief and Scope

**Source brief:** `.ai/03_plans/2026-07-07-invite-token-flow-hardening/PROMPT.md` (preserved unchanged; authored by the caller).
**Authoritative directives:** `Creating-Plan-Prompt.md` (feature-planning), `Multi-Agent-Execution-Directive.md` (coordination, credential-material taxonomy, verification caps).

## 1. The brief, verbatim (requirements data, not an override surface)

> **Goal.** Create a plan pack for hardening invite token creation, lookup, pending-cookie continuation, origin validation, expiry, and abuse resistance.
>
> **Evidence to start from.**
> - Invite continuation routes set pending invite cookies and resolve invite metadata.
> - Origin/referer validation appears permissive when headers are missing.
> - Invite flows intersect auth onboarding, public-to-beta continuity, email delivery, and workspace membership.
> - CSP and OWASP/API authz plans will cover adjacent route security, but invite token lifecycle needs its own end-to-end treatment.
>
> **Required plan pack.** Include invite threat model, token storage and expiry expectations, pending-cookie rules, origin/CSRF policy, resend/revoke behavior, wrong-account handling, tests, monitoring, and user-facing recovery states.
>
> **Constraints.** Preserve intended first-user beta invite flow. Do not expose token values in logs, evidence, or prompt-derived docs.
>
> **Stop condition.** The pack is ready when a future executor can implement and prove invite token lifecycle hardening without breaking onboarding.

## 2. Source authority

Per the Suite Authority Contract:
- **User intent** (the brief) controls the product goal and business outcome: harden the invite token lifecycle end-to-end without breaking onboarding.
- **Repository reality** (current source, migrations, tests, configs, provider evidence) controls implementation truth. Where the brief says "appears permissive," source confirms it (`invite-origin.ts:39`).
- **Local framework docs** (Next.js 16, Better Auth 1.6.22) control version-sensitive behavior.
- **Older plans / model memory** are lower authority. The credential-material conventions in `2026-07-06-Transition-And-Loading-UX-And-UI/21_ATTACK_SURFACE_AND_CREDENTIAL_MATERIAL.md` are treated as **descriptive evidence of current code**, not as prescriptive law.

No conflict between the brief and repo reality was found. The brief's claim ("Origin/referer validation appears permissive when headers are missing") is **confirmed by source** and elevated to finding SEC-01.

## 3. In-scope surfaces (full file map in `03_SOURCE_AND_CODEBASE_AUDIT.md`)

### 3.1 Invite lifecycle source
- `src/lib/collaboration/invite-entry.ts` — token creation, hashing, rate limits, feature-flag gate.
- `src/lib/collaboration/invite-origin.ts` — `isAllowedInviteOrigin` (the fail-open guard).
- `src/lib/collaboration/invitation-d1-store.ts` — resolve, accept, wrong-account, replay, expiry materialization.
- `src/lib/collaboration/invitation-acceptance.ts` — actor normalization wrapper.
- `src/lib/collaboration/actions.ts` — invite/create/resend/copy-link Server Actions, direct-grant, email send.
- `src/lib/collaboration/pending-invite.ts` — bridge cookie create/read (HMAC, hash-only payload, 30-min TTL).
- `src/lib/collaboration/workshop-pending-invite.ts` — `acceptPendingInviteBridge`.
- `src/lib/collaboration/pending-invite-actions.ts` — accept-by-id + sign-out-for-pending-invite Server Actions.
- `src/app/invite/[token]/page.tsx` — preview page + state machine.
- `src/app/invite/[token]/accept/route.ts` — accept POST.
- `src/app/invite/[token]/continue/route.ts` — bridge-cookie set (no origin check today).
- `src/app/invite/[token]/sign-out/route.ts` — sign-out POST (cookie-clear attribute gap).
- `src/app/workshop/pending-invite/route.ts` — bridge read + interstitial + clear.
- `src/app/workshop/page.tsx:98-99` — workshop redirect on cookie presence.

### 3.2 Auth boundary (intersects, not rewritten)
- `src/lib/auth/session.ts` — `getCurrentUserContext` (email→profile join, synthetic fallback, closed-beta gate).
- `src/lib/auth/account-membership.ts` — workspace-membership resolution.
- `src/lib/auth/account-actions.ts` / `account-setup.ts` — onboarding + post-auth destination (preserves `/workshop/pending-invite` next-path).
- `src/lib/auth/cloudflare-better-auth-runtime.ts` / `better-auth-cloudflare.ts` — Better Auth config (`trustedOrigins`, cookie cache disabled).
- `src/lib/auth/request-proxy.ts` — the proxy/middleware (no origin checks; `/invite` is a public prefix).
- `src/lib/auth/redirects.ts` — `resolveAllowedAuthOrigin` / `getAllowedAppOrigins` (allowlist source, not wired to invite guard).

### 3.3 Email delivery
- `src/lib/email/transactional-email-client.ts` — public `sendEmail` + circuit breaker.
- `src/lib/email/cloudflare-email-client.ts` — low-level Cloudflare Email binding client.
- `src/lib/collaboration/actions.ts:614-644` — `sendCloudflareInviteEmail` (inline template).

### 3.4 Data
- `migrations/0007_collaboration_invitations.sql` — foundational invite schema.
- Next available migration: **`0037`**.
- `src/lib/repositories/workspace-repository.ts` — membership reads/writes, invite summary reads.

### 3.5 Observability / proof
- `src/app/api/internal/collaboration-invitation-proof/route.ts` + `src/lib/cloudflare/collaboration-invitation-proof-router.ts` — bearer-`CRON_SECRET` hosted proof harness.
- `src/lib/observability/redact.ts` — token redaction.

### 3.6 Existing tests (regression baseline)
- `tests/vitest/invite-accept-origin.test.ts`, `pending-invite-cookie.test.ts`, `project-invite-entry-route.test.ts`, `project-invite-entry-schema.test.ts`, `project-invite-feature-flag.test.ts`, `project-invite-sign-out-route.test.ts`, `collaboration-invitation-d1-store.test.ts`, `project-collaboration-actions.test.ts`, `workshop-pending-invite.test.tsx`, plus the cloudflare proof-script tests.

## 4. Non-goals (out of scope, with rationale)

| Item | Rationale |
|---|---|
| Rewrite Better Auth session/cookie/OAuth mechanics | Out of blast radius; Better Auth 1.6.22 defaults are acceptable; `cookieCache.enabled=false` (DB-backed) is already the strong choice. |
| Change the `/share/[token]` publication token model | Sibling surface; covered by its own CSP/OWASP plans per the brief. Shared learnings (double-submit CSRF) are referenced, not applied here. |
| Closed-beta allowlist admin (`CLOSED_BETA_ALLOWLIST_STATUSES`) | Separate admin-only feature; explicitly **not** the collaboration invite. Confirmed disjoint in source. |
| Async invite-email queue + bounce webhook | Documented as future work (DEC-10, OPEN-REL-01); not required for hardening correctness. |
| Realtime/Durable-Object room auth rewrite | Only the pepper-separation recommendation (DEC-06) is in scope; the room token model itself is unchanged. |
| Move Better Auth tables into `./migrations/` | They remain Better-Auth-generated (`compileCloudflareBetterAuthD1Migrations`). |
| New Cloudflare bindings | None required. The hardening is code + one additive migration. |
| UI/UX redesign of the invite page | Preserve the existing state machine; only add the revoke button and tighten recovery copy if needed. |

## 5. Constraints (binding)

1. **Preserve the first-user beta invite flow.** The signed-out-preview → continue → bridge → login → onboarding → pending-invite-accept path must keep working for an unauthenticated invitee. Any origin/CSRF tightening must not break the legitimate same-site form POST or the magic-link/Google auth round-trip that carries the `next=/workshop/pending-invite` parameter.
2. **Never expose token values** in logs, evidence, docs, error messages, audit events, or rendered HTML. Audit events use `token_hint` (last 6 chars) only. The hosted proof harness must keep its "does not return raw tokens" guarantee.
3. **Planning-only.** No application source, tests, migrations, configs, provider state, or runtime data are modified by this task. All writes are confined to this plan folder.
4. **Stay inside bound Cloudflare resources** (`ARCH_DB`, `EMAIL`, etc. per `wrangler.jsonc`). The recommended migration `0037` is additive and reversible.
5. **Free-tier posture.** No paid add-ons; the hardening must not add per-request D1 writes on the hot path.

## 6. Success criteria for the planning pack itself

The pack succeeds when:
- A future executor can implement invite token lifecycle hardening **without breaking onboarding** (the brief's stop condition).
- Every recommended change is traceable to a source-confirmed finding with file:line evidence.
- The credential-material taxonomy (raw vs hash vs bridge cookie vs session) is explicit and consistent across `08`, `18`, `20`.
- Shadow-path matrices cover every invite mutation/flow.
- The adversarial matrix covers missing-origin, replay, wrong-account, expired, revoked, race, disabled-flag-bypass, and pepper-compromise.
- Every internally-resolvable decision is closed; genuinely external decisions are isolated with options + recommendation + owner.
- No requirement resolves to an approximate path/symbol without a `DISCOVERY-REQUIRED`/`BLOCKED-*` tag.
