# 01 - Executive Summary

**Plan pack:** `2026-07-03-Authentication-Audit-And-Improvement`

**Status:** `CONDITIONALLY READY` for phase-scoped future implementation planning. `NOT READY` for coding authorization, production security claims, or full cutover until a separate implementation plan and implementation evidence exist.

**Profile:** `exhaustive`

**Verification mode:** `independent`; no runtime/provider/browser proof was run.

---

## Executive Readout

The immediate Google account-picker bug has a narrow likely fix: configure Better Auth's Google provider to send `prompt: "select_account"` or a consciously chosen stricter prompt. That fixes the user-visible inability to choose a different Google account.

However, the auth system has higher-risk work that should be planned and gated with the same PR series:
- Session/logout semantics are not fully decided.
- D1 has no Postgres RLS fallback, so server-side authorization has to be complete and tested.
- Publication password lockout currently includes in-memory state that is not durable across Cloudflare Worker isolates.
- Credential-adjacent evidence and provider leftovers need explicit redaction, rotation, deletion, and retention rules.
- Older docs/tests still contain Supabase/Vercel/Resend-era assumptions that can mislead future agents.

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
| AUTH-001 | Google OAuth provider lacks a prompt option, so Google can silently reuse the cached account | P1 | Phase 1 |
| AUTH-002 | Logout policy clears local Better Auth session but does not define OAuth grant revocation, all-session logout, or reauth semantics | P1 | Phase 1 |
| AUTH-003 | First-click `state_mismatch` recovery exists but is reactive; prevention/telemetry still needs a decision | P2 | Phase 1 |
| PUB-001 | Publication P10 password lockout uses in-memory Worker state; hard lock must be durable | P0 | Phase 2 |
| AUTHZ-001 | App-layer authz matrix is not complete enough to replace Supabase RLS confidence | P0 | Phase 3 |
| AUTHZ-002 | Role taxonomy is split across app, workspace, project, estimate, and beta-admin roles | P1 | Phase 3 |
| PRIV-001 | Credential-material taxonomy and evidence redaction policy were incomplete | P0 planning gap, now documented | Phase 4 |
| CLEAN-001 | Provider leftovers need classification before deletion or rotation | P1 | Phase 5 |
| DOC-001 | Older README/plan/spec docs still describe Supabase Auth/Vercel-era behavior as active | P2 | Phase 5 |

Closed correction:
- The previous `P2-ENV-1` finding is stale. `.env.example` already documents `ARCHESTIMATOR_INVITE_RATE_LIMIT_HASH_PEPPER`; keep it verified but do not treat it as an open implementation task.

---

## Phase Summary

| Phase | Goal | Must prove |
|---|---|---|
| 1 | Fix Google picker and decide logout/state policy | Prompt appears in OAuth URL construction tests; logout semantics are explicit; state mismatch recovery stays redacted and testable |
| 2 | Make publication password lockout durable | Lockout survives Worker isolate rotation using D1 or Durable Object state |
| 3 | Harden multi-tenant authz | Actor x surface x object x role matrix is implemented and tested fail-closed |
| 4 | Harden publication/share and privacy boundaries | Viewer sessions cannot satisfy app auth; app sessions cannot bypass share password/session/CSRF; evidence/logs redact bearer material |
| 5 | Clean legacy provider assumptions | Each Supabase/Vercel/Resend artifact is active, archaeology, delete, rotate/remove, or sibling-pack blocked |

---

## Readiness Verdict

This pack is ready to hand to a future implementation-planning agent for Phase 1 discovery/edit/test planning. It is not an authorization to edit code or batch all auth refactors at once. Each phase has a separate blast radius and should land independently unless a later implementation plan proves a tighter grouping is safer.

The final implementation claim must be evidence-backed by fresh tests and, where provider behavior is asserted, real provider/browser proof. Static planning docs are not enough for production auth claims.
