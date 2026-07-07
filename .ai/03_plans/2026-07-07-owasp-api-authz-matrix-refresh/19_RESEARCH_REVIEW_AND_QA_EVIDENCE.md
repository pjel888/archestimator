# 19 — Research, Review, and QA Evidence

## Research questions and sources

This is an internal-codebase audit, not external research. The "research" was current
source re-validation against the stale June audit.

| Question | Source | Conclusion |
|---|---|---|
| Is the June audit's Supabase/RLS framing still live? | current `src/`, `wrangler.jsonc`, `AGENTS.md` | No — D1/app-authz is live; Supabase is historical. June audit treated as stale. |
| Is email/password auth wired? | `src/lib/auth/better-auth-cloudflare.ts` plugins | No — magicLink + Google only. |
| Is there a `middleware.ts`? | `src/proxy.ts`, `proxy-file-convention.test.ts` | No — Next 16 `proxy.ts` convention. |
| Is there edge/WAF rate limiting? | `wrangler.jsonc` | No (SEC-02). |
| Are raw tokens/passwords stored? | `src/lib/publication/security.ts` | No — HMAC hash, AES-GCM ciphertext, scrypt hash only. |
| Was Better Auth CSRF/origin present? | Better Auth config + worker edge | Yes — `trustedOrigins` + OAuth state-cookie edge validation. |

Official docs consulted: local Next.js docs under `node_modules/next/dist/docs/` were
referenced for the `proxy.ts` convention and Route Handler behavior (not linear-read;
pull-on-demand per AGENTS.md). No version-sensitive claim was made without source backing.

## Skills and workflows used / unavailable

Used: `archestimator-plan-pack` (convention binding), `Explore` read-only subagents (6
parallel lanes), `verification-before-completion` (completion audit), conceptual
`ultraqa` (future adversarial matrix). See Doc 00 for the full skills table.

Unavailable (honestly recorded): no hosted/production proof environment; no live GitHub
security-control readback for this pass; no browser automation; no independent verifier
(emulated).

## Specialist workstream outputs (summary pointers)

- Route inventory → Doc 03 Section B (33 routes, file:line, verdicts).
- Share/publication surface → Doc 03 Section C (credential taxonomy) + Doc 08.
- Auth/Better Auth/proxy → Doc 06 + Doc 18.
- Server Actions → Doc 03 Section D (domain-grouped matrix).
- Cross-cutting controls → Doc 03 Section E.
- D1 app-authz + tests → Doc 03 Section F + Doc 08 + Doc 12.

## Critique-and-revision cycle summaries

**Cycle 1 (synthesis → self-critique):** drafted Doc 03 from exploration output;
found 6 P0/P1 flags from exploration; flagged for verification.

**Cycle 2 (verification → correction):** directly Read the 6 flagged source locations;
disproved 5, downgraded 1 (SEC-05). Updated Doc 01/08/14/17 to reflect corrected
severities. This is the most important cycle — it prevented overstatement.

**Cycle 3 (consistency):** cross-checked Doc 03 ↔ Doc 12 ↔ Doc 16 ↔ Doc 04; verified repo
facts (route count, use-server count, wrangler binding, middleware absence). No
contradictions. (Two full cycles + this targeted third pass satisfy the exhaustive
profile's ≥2-cycles requirement; remaining gaps are external/owner-gated.)

## UltraQA-style adversarial scenario matrix
See Doc 12 `AQ-01` through `AQ-10`. Verified items have existing tests; pending items map
to WP-01/02/03/05/11.

## Performance evaluator contract
See Doc 09. The declared evaluator for SEC-03 is the new cross-isolate limiter test
(WP-02); for SEC-02 it is provider/WAF proof (owner-gated). No load harness run
(planning-only).

## Independent final verifier evidence
`verification_mode: emulated` — no independent verifier available. The lead performed a
separated critique pass (Doc 17). The maker/checker value-add was the direct source
re-read that corrected 5 exploration P0s. Independent/owner review is required to elevate
the package (Doc 17 §smallest-set-of-actions).

## Explicit validation gaps
1. Hosted GitHub controls (branch protection, CodeQL, Dependabot, secret scanning) —
   external, cannot be locally proven; currently disabled (RISK-EXT-01).
2. No runtime/browser/provider proof — adversarial matrix specifies future implementation
   proof; not run during planning.
3. Emulated verification — single-author; capped at 97 / CONDITIONALLY READY.
4. Performance/scalability held at 90 — no load harness run (correctly scoped out for
   planning; the SEC-03 evaluator lands at implementation time).
5. Closed-beta vs broad-launch severity bar for SEC-02/07 — owner decision (OPEN-04).

These gaps are honestly recorded and do not invalidate the matrix; they bound the
readiness claim.
