# 01 - Executive Summary

**Plan pack:** `2026-07-03-Authentication-Audit-And-Improvement`

**Status:** `CONDITIONALLY READY` for future phase-scoped implementation planning and residual-gate cleanup. Phase-scoped local implementation evidence now exists for Phases 1-4, and Phase 5 has classification/current-inventory evidence, but this pack is still `NOT READY` for production security claims, provider/browser proof claims, final provider-cleanup/provider-exit completion, or full cutover until hosted/provider/operator/legal/privacy/cleanup/final-review gates are proven or explicitly accepted.

**Profile:** `exhaustive`

**Verification mode:** `independent`; no runtime/provider/browser proof was run.

---

## Executive Readout

The immediate Google account-picker bug has a local code/test mitigation recorded in `22_PHASE_1_GOOGLE_PICKER_LOGOUT_STATE_PLAN.md`: Better Auth's Google provider now sends the selected account-picker prompt. That local slice fixes the source-level account-picker contract, but real Google browser/provider proof remains a separate future claim.

However, the auth system has higher-risk work that should be planned and gated with the same PR series:
- Launch-level session/logout semantics beyond the Phase 1 local-session-only choice remain open.
- D1 has no Postgres RLS fallback, so server-side authorization must stay covered by explicit app-layer checks; Phase 3 WP1-WP6 local tests are recorded in `24`, but hosted Worker/D1/two-client proof remains open.
- Publication password lockout now has local D1-backed durability evidence in `23`; hosted Cloudflare Worker/D1 proof remains open.
- Credential-adjacent evidence and provider leftovers now have taxonomy/redaction/runbook coverage, but legal/public-launch privacy review and hosted log proof remain open.
- Older docs/tests still contain Supabase/Vercel/Resend-era assumptions; `28` and `29` classify the remaining cleanup inventory and record the Slice A archive of the stale shared-link proof-utility dependent-test cascade, but final cleanup/provider-exit proof remains open.

---

## Current Stack Reality

The current planning baseline is Cloudflare-first:
- Next.js 16 / React 19 / Bun / TypeScript / Tailwind v4.
- Cloudflare Workers/OpenNext, D1, R2, Durable Objects, queues, and Cloudflare Email binding in `wrangler.jsonc`.
- Better Auth 1.6.x in `package.json` and `src/lib/auth/better-auth-cloudflare.ts`.
- Supabase/Postgres/Vercel/Resend references are historical, tests/proof tooling, provider-exit context, or stale docs unless current source proves active runtime behavior.

---

## Headline Findings

| ID | Finding | Severity | Plan owner |
|---|---|---|---|
| AUTH-001 | Google OAuth provider lacked a prompt option, so Google could silently reuse the cached account; locally mitigated in Phase 1 | P1 local mitigation; provider proof open | Phase 1 |
| AUTH-002 | Phase 1 chooses local-session-only sign-out for the account-picker slice, but launch-level OAuth grant revocation, all-session logout, or reauth semantics remain open | P1 | Phase 1 / launch policy |
| AUTH-003 | First-click `state_mismatch` recovery exists but is reactive; prevention/telemetry still needs a decision | P2 | Phase 1 |
| PUB-001 | Publication P10 password lockout used process-local state; local Phase 2 now routes lockout through D1 rate-limit rows, with hosted proof still open | P0 local mitigation; hosted proof open | Phase 2 |
| AUTHZ-001 | App-layer authz matrix needed RLS-replacement confidence; Phase 3 WP1-WP6 are locally implemented/tested, with hosted/two-client proof still open | P0 local mitigation; hosted proof open | Phase 3 |
| AUTHZ-002 | Role taxonomy was split across app, workspace, project, estimate, and beta-admin roles; Phase 3 WP6 centralizes local role contracts | P1 local mitigation | Phase 3 |
| PRIV-001 | Credential-material taxonomy and evidence redaction policy were incomplete; Phase 4 local redaction/runbook coverage exists, with hosted/legal proof still open | P0 planning gap locally mitigated | Phase 4 |
| CLEAN-001 | Provider leftovers need final cleanup/allowlist/provider-exit proof after classification, preserving the Slice A archive evidence and carrying any remaining direct proof-test dependencies with future cleanup | P1 | Phase 5 |
| DOC-001 | Older README/plan/spec docs still contain Supabase Auth/Vercel-era behavior; classify or archive without rewriting migration archaeology blindly | P2 | Phase 5 |

Closed correction:
- The previous `P2-ENV-1` finding is stale. `.env.example` already documents `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER`; keep it verified but do not treat it as an open implementation task.

---

## Phase Summary

| Phase | Goal | Must prove |
|---|---|---|
| 1 | Fix Google picker and decide logout/state policy | Local prompt/logout/state tests are recorded in `22`; real Google/browser/provider proof and broader logout policy remain separate |
| 2 | Make publication password lockout durable | Local D1-backed lockout durability is recorded in `23`; hosted Worker/D1 proof remains separate |
| 3 | Harden multi-tenant authz | Local WP1-WP6 authz/role coverage is recorded in `24`; hosted/two-client Worker proof remains separate |
| 4 | Harden publication/share and privacy boundaries | Local share/app boundary, CSRF, redaction, and runbook evidence is recorded in `25`; hosted log/legal proof remains separate |
| 5 | Clean legacy provider assumptions | `26`, `28`, and `29` classify artifacts, remaining cleanup slices, and the Slice A stale proof-utility archive; final cleanup/allowlist/provider-exit proof remains separate |

---

## Readiness Verdict

This pack is ready to hand to a future implementation-planning agent for residual phase work and cleanup-gate closure. It is not an authorization to edit code or batch all auth refactors at once. Each remaining phase slice has a separate blast radius and should land independently unless a later implementation plan proves a tighter grouping is safer.

The final implementation claim must be evidence-backed by fresh tests and, where provider behavior is asserted, real provider/browser proof. Static planning docs are not enough for production auth claims.
