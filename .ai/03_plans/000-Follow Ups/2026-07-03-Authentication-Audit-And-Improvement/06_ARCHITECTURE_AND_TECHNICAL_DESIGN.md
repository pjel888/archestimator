# 06 - Architecture And Technical Design

## Current Architecture Baseline

| Layer | Current planning assumption |
|---|---|
| App framework | Next.js 16 App Router on OpenNext/Cloudflare Workers |
| Auth | Better Auth 1.6.x |
| Runtime | Cloudflare Workers with D1, R2, Durable Objects, queues, assets, images, and email binding |
| Database | D1 for current Cloudflare runtime; Supabase/Postgres remains historical/provider-exit comparison context |
| Authorization | App-layer checks in server actions, route handlers, and repository helpers |
| Public/share auth | Token/password/session/CSRF primitives separate from Better Auth app session |

## Target Architecture

1. Better Auth remains the primary account/session layer.
2. Google provider config carries an explicit prompt policy.
3. OAuth state handling remains server-owned and redacted in evidence.
4. Session/logout policy distinguishes:
   - local Better Auth session invalidation,
   - all Better Auth sessions,
   - OAuth provider grant revocation,
   - Google browser session/account picker UX.
5. D1 authorization is enforced in app code because D1 has no Postgres RLS equivalent.
6. Publication/share sessions remain independent of Better Auth sessions.
7. Security-critical counters and locks are durable, not module-global.

## Better Auth Design Notes

Google OAuth:
- Use Better Auth's Google provider prompt option for account selection.
- Choose `prompt: "select_account"` unless product/security explicitly requires consent refresh.
- If refresh-token behavior is needed later, Better Auth docs describe `accessType: "offline"` plus a consent prompt; do not add consent unless required because it increases user friction.

Organization/RBAC plugin:
- Better Auth organization/access-control features are relevant, but adopting them is not automatic.
- Archestimator has workspace, project, estimate, beta-admin, and publication-recipient boundaries. A plugin must map to those boundaries without weakening project/estimate-specific roles.
- Default plan: first centralize local role types/helpers; evaluate plugin adoption only after the matrix proves the current model.

Session strategy:
- Prefer DB-backed Better Auth sessions where revocation and auditability matter.
- Treat cookie caches/stateless sessions as explicit revocation-latency tradeoffs, not defaults.

## Cloudflare Runtime Design Notes

Workers:
- Do not store security-critical state in module globals.
- Use `ctx.waitUntil` only for non-response-critical background work.
- Keep auth decisions on the response path.

D1:
- Enforce tenant/object scope in SQL and repository helpers.
- Tests must cover denied object access, not just happy-path membership.

Durable Objects:
- Use only when singleton/per-token coordination materially simplifies correctness, such as publication password hard lock or real-time collaboration state.
- Important state must be persisted to DO storage or D1, not kept only in memory.

## Boundary Diagram

| Boundary | Crosses from | Crosses to | Required control |
|---|---|---|---|
| Public login | Browser | Better Auth route | CSRF/origin/state cookie/session cookie controls |
| Protected app | Browser | `/workshop` route tree | Better Auth session + closed beta + terms + membership |
| Invite entry | Email/link browser | Invite route handlers | Raw token hash lookup + account email check + rate limit |
| Publication share | Link recipient | Share route handlers | Token hash + password/session cookie + CSRF + no-store |
| Admin/support | App admin UI | beta/invite/workspace repair actions | app/admin role + audit event |
| Provider leftovers | Repo/config/provider docs | cleanup actions | classification + owner/sibling-pack coordination |

## Design Anti-Goals

- Do not reintroduce Supabase Auth or Vercel auth assumptions as active runtime.
- Do not add new personas as permission roles without an RBAC migration plan.
- Do not collapse shared-link recipient sessions into Better Auth app sessions.
- Do not rely on browser-only checks for access control.
