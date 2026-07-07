# 10 — Blast Radius and Dependencies

## Highest blast-radius surfaces (changes here affect many routes/users)

| Surface | Files | Why high blast radius |
|---|---|---|
| **D1 app-authz layer** | `src/lib/authz/d1-access.ts` (1 file, 357 lines) | Gates **every** authenticated read/write. A probe regression affects all estimate/project/library/collaboration access. |
| **Publication security primitives** | `src/lib/publication/security.ts` | Token/password/cookie/CSRF primitives reused across all 8 share routes. |
| **Publication repository** | `src/lib/publication/public-repository.ts` | Rate limiters + recipient scoping for the entire public surface. |
| **Session resolution** | `src/lib/auth/session.ts` | Every authenticated route/action. |
| **Better Auth config** | `src/lib/auth/better-auth-cloudflare.ts` | Every session. |
| **Proxy** | `src/lib/auth/request-proxy.ts` | Every protected route gate. |
| **Rate-limit table** | `security_rate_limit_events` (D1) | Shared by publication/AI/privacy/invite/export. A scope/policy change is cross-domain. |
| **Headers block** | `next.config.ts` `headers()` | CSP/HSTS/referrer for all routes. |

## Direct + transitive impact of each planned remediation

| Remediation | Direct | Transitive | Classification |
|---|---|---|---|
| SEC-01 invite-origin fix | `invite-origin.ts`, invite accept/sign-out routes | invite UX (wrong-account flow) | Probable change (test) |
| SEC-02 edge/WAF | `wrangler.jsonc`, possibly worker | all public/auth routes | Possible change (owner decision) |
| SEC-03 estimate durable limit | `action-rate-limit.ts`, estimate actions | all estimate mutations | Probable change |
| SEC-04 DO upgrade limit | `collaboration-room.ts` | realtime collaboration | Probable change |
| SEC-05 action-layer auth | `recipient-proposals/actions.ts` (+ audit other actions) | recipient proposal UX | Verification only (defense-in-depth) |
| SEC-06 body cap / validation | share POST routes (+ optional zod) | public surface | Possible change (P2) |
| SEC-07 CSP nonce | `next.config.ts`, app layout | all client routes | Possible change (broad-launch) |
| SEC-08/09 dead config | `.env.example`, `r2-storage-provider.ts` | none | Verification only |
| REQ-NEG-02 read-repo tests | new test files | none | Verification only |

## Dependencies / ordering

1. **No migration required** for any finding ⇒ no migration-ordering risk.
2. SEC-01/03/04 are independent (different files) ⇒ parallel-safe implementation lanes.
3. SEC-02 (edge/WAF) is owner-gated ⇒ do not block other findings on it.
4. REQ-NEG-02 tests can land alongside or before any code change.
5. SEC-05 (action-layer auth) should be done **after** confirming no action currently
   relies solely on repo-layer auth for correctness (audit first).

## Compatibility / backward compatibility
- All findings are **additive** (stronger checks, more tests). No API contract change.
- No DTO change; no client change required for SEC-01/03/04/05.
- SEC-07 (CSP nonce) is the only one that touches client rendering — broad-launch scope.

## Affected documentation
- This pack (new).
- June audit README (add supersession pointer) — REQ-DOCS-02.
- `AGENTS.md` / `DESIGN.md` — no change needed (authz is not a design-system concern).
- `wrangler.jsonc` (only if SEC-02 approved).

## Other active development to coordinate with
- `current-state.md` notes active D1 migration state work, project-component sidebar
  sync, and the GitHub security PR comment loop. The remediation tasks here are in
  **disjoint files** (publication/security, estimates/action-rate-limit,
  collaboration-room, invite-origin) from those active lanes ⇒ low coordination risk.
  Implementers must still re-read touched files immediately before edits (shared-worktree
  policy).
