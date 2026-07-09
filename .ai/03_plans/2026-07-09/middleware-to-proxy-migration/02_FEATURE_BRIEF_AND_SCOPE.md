# Feature Brief and Scope

## User request (verbatim)

> "can we debug the issue here. i get this whenever i run bun dev" — followed by the Next.js 16.2.10 middleware deprecation warning.
>
> "can you check this issue first and then assess blast radius on weather we need to plan for this or if you are capable of fixing this without planning"
>
> Then (after seeing the assessment): "let us plan this out. create a plan pack inside '.ai/03_plans/2026-07-09'. and then proceed to do everything that is needed. you can do experiments and trials so we know exactly what should happen but dont do anything permanent yet. our aim for now is to create a comprehensive plan pack for that."

## Authoritative sources (in priority order)

1. User request (this brief)
2. `AGENTS.md` (entry point) + `.ai/AGENTS.md` (subtree rules)
3. Current source files: `src/middleware.ts`, `tests/vitest/proxy-file-convention.test.ts`, `tests/vitest/auth-proxy.test.ts`, OpenNext Cloudflare 1.20.1 source
4. Git history (commits `293d5eefc`, `555c6e28c`, `5558c5fa4`, `247df1256`)
5. `.ai/10_state/current-state.md` (with contradiction noted)
6. `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (Next.js 16 migration guide)

## In-scope

- Investigate the warning's root cause
- Identify all files affected by any future rename (blast radius)
- Determine whether the warning can be safely acted on (no — OpenNext blocks)
- Produce a comprehensive plan pack with phases, evidence, and readiness gates
- Capture experimental evidence (git log, OpenNext source, file inventory) without modifying files
- Recommend a Phase 1 doc-only patch ready for owner approval

## Out-of-scope (NON-NEGOTIABLE per `planning-only`)

- Editing `src/middleware.ts` (even adding the explanatory comment — that's Phase 1 implementation)
- Editing `tests/vitest/proxy-file-convention.test.ts`
- Editing `tests/vitest/auth-proxy.test.ts`
- Editing `tests/vitest/proxy-sensitive-cache-headers.test.ts`
- Editing any of 6 scripts that hardcode `"src/middleware.ts"`
- Editing README.md
- Editing `.ai/10_state/current-state.md`
- Running the `@next/codemod middleware-to-proxy` codemod
- Running `bun run cf:build` against a renamed file (Phase 2 experiment, owner-approved)
- Any `git commit`, `git push`, branch creation, or worktree creation
- Any Cloudflare provider mutation
- Any secrets, credentials, or production data access

## Constraints

- Stack: Next.js 16.2.10, `@opennextjs/cloudflare` 1.20.1, Wrangler 4.105.x, Bun 1.3.x, TypeScript 6.0.3
- Deploy substrate: Worker `archestimator-proof` on custom domain `archestimator.com`
- Auth gate: Better Auth via `src/lib/auth/request-proxy.ts` (re-exported by `src/middleware.ts`)
- Shared worktree: multiple AI agents may be active; all writes confined to this plan pack folder
- Time budget: 1 session, no overnight work
- Cost posture: free-tier Cloudflare only; no paid add-ons

## Success metrics

| Metric | Target | Actual |
|---|---|---|
| Plan pack file count | ≥15 (exhaustive profile) | 18 ✓ |
| Source citations with file/line | ≥80% | 100% ✓ |
| Testable acceptance criteria | ≥90% | 100% ✓ |
| Experiment evidence files | ≥2 | 2 ✓ (`git-history.txt`, `opennext-source.txt`) |
| Files modified outside plan folder | 0 | 0 ✓ |
| Git state changes | 0 | 0 ✓ |

## Failure metrics (what would make this plan pack a failure)

- Incorrectly recommends renaming to `proxy.ts` without verifying OpenNext support
- Misses any of the 13 affected files in the blast radius
- Misreads the git history (claims only one flip when there were two)
- Conflicts with the existing test lock-in (proposes deleting `proxy-file-convention.test.ts`)
- Edits any source/test/config file
