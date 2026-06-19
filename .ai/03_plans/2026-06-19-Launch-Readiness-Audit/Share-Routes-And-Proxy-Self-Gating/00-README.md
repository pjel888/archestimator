# Launch-Readiness (Phase-2 Gap Pack): Share Routes Deep-Dive & Proxy /api Self-Gating

> **Deletable plan-pack header.** Phase-2 gap pack of the 2026-06-19 Launch-Readiness Audit
> (packs under `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/<Pack>/`). The 13-domain audit's COVERAGE
> CRITIC found this surface was not owned by any of the 13 domains. This pack closes that gap.
> Gates exposure to **wider/external** users (not owner-only beta).

## Exact owner job

Decide and (if needed) schedule fixes for two seams the coverage critic flagged:

- **(A) Public share routes deep-dive** — individually evidence the 4 routes the API pack
  named but did not detail: `password` (brute-force/lockout), `session` (cookie issuance:
  scope/flags/TTL/signing), `comment` (input validation, stored-XSS, authz/rate-limit),
  `activity` (what an anonymous viewer can read).
- **(B) Proxy `/api/*` short-circuit safety** — `src/proxy.ts` returns BEFORE the auth gate
  for every `/api/*` path (line 56), so EACH `/api/**/route.ts` must self-authenticate. This
  pack enumerates every API route and confirms its guard.
- **(C) Quick sanity sweep** of `src/lib/aec-classification/**` and `src/lib/reusable-sources/**`.

## Routes / screens in scope

- `GET/POST /api/share/[token]` and `/password /session /comment /activity /decision /events /unsubscribe`
- ALL `src/app/api/**/route.ts` (self-gating enumeration)
- `src/lib/share/**`, `src/lib/publication/security.ts`, `src/proxy.ts`
- `src/lib/aec-classification/**`, `src/lib/reusable-sources/**`

## Non-goals

- Re-auditing already-owned domains (DB/RLS, Auth proxy seam mechanics, OWASP shared-link from
  2026-06-01) beyond reconciliation.
- Re-flagging KNOWN-DECIDED items (CI/CD deferral, PITR-off, two Codex history-exposure
  owner-accepted findings).
- Design/UX changes to the share surface (DESIGN.md is an alpha guide).

## Files expected to change (only if a finding is accepted)

- `src/app/api/share/[token]/session/route.ts` (add durable rate-limit if SHARE-PROXY-02 accepted)
- `src/lib/publication/security.ts` (only if an accepted finding touches lockout/cookie)
- No source changes are mandatory for launch; see findings.

## Validation gate

`bun run build` plus targeted tests: `bunx vitest run tests/vitest/project-publication-*.test.* tests/vitest/auth-proxy.test.ts tests/vitest/security-findings-contracts.test.ts --maxWorkers=1`.
`bun run validate` is KNOWN-RED on main — do not gate on it.

## Deletion criteria

Delete this pack once the owner has triaged every SHARE-PROXY-NN finding (accept/defer/reject)
and any accepted launch_blocker is fixed + verified.

## Loop surface

Audit-only (read-only on source + DB). No high-blast-radius edits made in this pass.

## Durable-state path

Record outcomes in `.ai/10_state/current-state.md` (share + proxy self-gating coverage closed)
and any decisions in `.ai/10_state/decisions.md`.
