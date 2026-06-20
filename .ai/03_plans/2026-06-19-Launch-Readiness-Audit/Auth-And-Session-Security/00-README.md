# Launch-Readiness — Auth & Session Security (Plan Pack Header)

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

**Date:** 2026-06-19 · **Owner:** Philip · **Author:** Auth & Session auditor (READ-ONLY on source)
**Part of:** the 2026-06-19 Launch-Readiness Audit (`.ai/03_plans/2026-06-19-Launch-Readiness-Audit/00-ORCHESTRATION-LEDGER.md`). Deletable per repo plan-pack rules.

## Exact owner/user job
Decide whether Archestimator's authentication, session handling, and route protection are safe to expose to **wider / external closed-beta users** (the app is already a live owner-only beta at `www.archestimator.com`). This pack audits login/signup, Supabase SSR cookie/session handling, the real route gate (`src/proxy.ts` — Next.js 16's `middleware.ts` replacement; there is intentionally **no** `middleware.ts`), invite token entry, closed-beta access gating, logout, session validation/expiry, and fail-closed behavior on sensitive routes.

## Routes / screens affected by remediation
`/login`, `/auth/callback`, `/invite/[token]` (+ `accept` / `continue` / `sign-out` route handlers), `/beta/access-required`, all `/workshop/**` (gated), and the `src/proxy.ts` wall. No `middleware.ts` to add — the gate exists at `src/proxy.ts`.

## Non-goals
- Supabase Auth dashboard config (MFA, password/OTP policy, provider settings) — owned by the Supabase project, not the repo.
- RLS/RPC internals and DB-level authorization (RLS-RPC pack). CSP/headers/nonce pipeline (NextJS/Vercel pack). API-route-specific concerns and the `proxy.ts` `/api/*` short-circuit's API impact (API pack). Account-deletion / DSAR / data-export *legal* obligations (`DSAR-Account-Deletion-Data-Export`). These are recorded in `cross_domain_notes`, not fixed here.
- Design/contrast (DESIGN.md is an alpha guide; advise only).

## Files expected to change during remediation (if owner accepts findings)
- `src/app/invite/[token]/sign-out/route.ts`, `.../continue/route.ts` (drop GET / add same-origin guard — AUTH-02)
- Optionally `src/lib/auth/dev-auth-gate.ts` / a CI assertion (defense-in-depth prod-off test — AUTH-03)
- Possibly a deploy-config doc / env checklist (verify `CLOSED_BETA_ACCESS_ENABLED=true` in prod — AUTH-01)
- No change required for the core gate; most findings are verification/hardening, not rewrites.

## Validation gate
- `bun run build` (catches `"use server"` export contract) + targeted Vitest for `redirects`, `closed-beta-access`, `dev-auth-gate`, invite-entry.
- Re-run hosted proofs: `scripts/verify-hosted-auth-routes.ts` (signedOut/allowed/denied/revoked/expired → correct redirect + `private, no-store`) and `scripts/verify-hosted-sensitive-route-fail-closed.ts` against production after any gate change.
- Manual: confirm in Vercel prod env that `CLOSED_BETA_ACCESS_ENABLED=true` is actually set (it is **not** present in `.env.local` and defaults `false` in `.env.example`).

## Deletion criteria
If Philip rejects this pack (e.g. accepts the residual risks for owner-only beta, or schedules them post-launch), delete the whole folder — it carries no runtime artifacts. Findings already covered by the 2026-06-01 OWASP pack are cross-referenced, not duplicated.

## Loop-surface selection
Low-blast-radius for most findings (route-handler method tightening, a CI assertion) → lightweight in-session loop with proportional verification, no dated LOOP_LEDGER required. The single config item (AUTH-01) is a deploy-env verification, not a code change.

## Durable-state path
Record the launch decision + any accepted residual risk in `.ai/10_state/decisions.md`; update `.ai/10_state/current-state.md` auth section after remediation.
