# Stack Contract and Production Standards

## Active stack (verified from source this session)

| Layer | Technology | Version | Source of truth |
|---|---|---|---|
| Framework | Next.js | 16.2.10 | `node_modules/next/package.json` |
| UI runtime | React | 19.x (matched to Next.js 16) | `package.json` |
| Package manager / runtime | Bun | 1.3.x | `bun.lock` |
| Language | TypeScript | 6.0.3 | `package.json` |
| Styling | Tailwind CSS | v4 (CSS-first) | `package.json`, `src/app/globals.css` |
| Deploy adapter | `@opennextjs/cloudflare` | 1.20.1 | `node_modules/@opennextjs/cloudflare/package.json` |
| Deploy CLI | Wrangler | 4.105.x | `package.json` |
| Edge runtime | Cloudflare Workers | (latest) | `wrangler.jsonc` |
| Database | Cloudflare D1 | binding `ARCH_DB` | `wrangler.jsonc` |
| Object storage | Cloudflare R2 | binding `ARCH_UPLOADS_R2` | `wrangler.jsonc` |
| Realtime | Cloudflare Durable Objects | binding `COLLAB_ROOMS`, class `CollaborationRoom` | `wrangler.jsonc` |
| Background jobs | Cloudflare Queues | binding `UPLOAD_JOBS_QUEUE` + DLQ | `wrangler.jsonc` |
| Auth | Better Auth | 1.6.x | `package.json` |
| Email | Cloudflare Email | binding `EMAIL` | `wrangler.jsonc` |
| Images | Cloudflare Images | binding `IMAGES` | `wrangler.jsonc` |
| Worker name | `archestimator-proof` | — | `wrangler.jsonc` |
| Custom domain | `archestimator.com` | — | `wrangler.jsonc` |

## Production standards (per AGENTS.md)

- **Cloudflare-resource mandate:** standing authorization for D1/R2/DO/Queue/Email changes within bound resources. Free-tier only; no paid add-ons.
- **Shared-worktree assumption:** multiple AI agents may be active; no auto-branch, no auto-worktree.
- **Iteration bias:** fast useful iteration > heavyweight regression ceremony. Targeted validation over broad `validate` loops unless high-blast-radius.
- **Proportional verification:** UI cosmetic changes don't auto-trigger Playwright. Static review + focused type/LSP/lint suffices for narrow changes.
- **Evidence separation:** local static / local automated / browser / provider-backed / hosted / inferred — each has different proof strength.
- **Deprecation handling:** heed deprecation notices, but verify runtime compatibility before acting.

## How this plan respects the stack contract

| Stack concern | Plan handling |
|---|---|
| Next.js 16 deprecation | Acknowledged; defer action per runtime constraint |
| OpenNext Cloudflare 1.20.1 | Verified as the blocker via source inspection |
| Cloudflare Worker (`archestimator-proof`) | Not mutated; plan is doc-only |
| D1/R2/DO/Queue/Email bindings | Not touched |
| Free-tier posture | Plan costs $0 (doc edits only) |
| Shared worktree | All writes confined to `.ai/03_plans/2026-07-09/middleware-to-proxy-migration/` |
| Better Auth | Not touched; auth gate logic in `src/lib/auth/request-proxy.ts` unchanged |

## How this plan respects production standards

| Standard | Plan conformance |
|---|---|
| Proportional verification | Plan pack verified by static review + git log evidence; no broad `validate` run (planning-only) |
| Evidence separation | All evidence classified as `local static` (git log, source reads) or `inference` (Jul 8 revert cause) |
| Iteration bias | Single planning iteration; no multi-loop execution |
| Deprecation handling | Heeded — investigated fully before acting; concluded "tolerate" is correct |

## Stack-specific risks

| Risk | Mitigation in plan |
|---|---|
| Next.js 16 → 17 may remove `middleware.ts` support entirely | Phase 4 monitors Next.js major versions |
| OpenNext Cloudflare major version bump | Re-audit `useNodeMiddleware()` source on every version change |
| Bun major version bump | Unlikely to affect this surface; monitor |
| TypeScript 6.x strict mode | Plan introduces no new types; N/A |
| Wrangler 4.x → 5.x | Phase 4 includes Wrangler version check |

## Compatibility matrix

| Component | Current version | Phase 1 impact | Phase 3 impact |
|---|---|---|---|
| Next.js | 16.2.10 | None (doc only) | Renames source file; Next.js handles both conventions |
| React | 19.x | None | None |
| `@opennextjs/cloudflare` | 1.20.1 | None | **Critical dependency** — must support proxy.ts |
| Wrangler | 4.105.x | None | None |
| Bun | 1.3.x | None | None |
| TypeScript | 6.0.3 | None (comment only) | Minor type updates if function name changes propagate |
| Better Auth | 1.6.x | None | None |
| D1 / R2 / DO / Queue / Email | (Cloudflare-managed) | None | None |

## Test infrastructure

| Surface | Tool | Coverage relevant to this plan |
|---|---|---|
| Unit tests | `bun test` (tests/unit/) | None directly |
| DOM tests | Vitest + jsdom (tests/vitest/) | 26 tests across 5 files |
| E2E | Playwright (e2e/) | 1 spec references middleware |
| Static analysis | ESLint 9 flat config | Phase 1 changes pass lint |
| Type check | `tsc --noEmit` | Phase 1 changes pass typecheck |
| Build | `next build` via Turbopack | Phase 3 must pass |
| CF build | `@opennextjs/cloudflare` build | Phase 3 must pass |
| Deploy | `wrangler deploy` | Phase 3 requires owner authorization |

## Agent harness contract

Per `AGENTS.md` and `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`:

- This planning session was lead-coordinated by Sisyphus (orchestrator-class)
- Skills used (matched to task domain): `writing-plans`, `archestimator-plan-pack`, `systematic-debugging`, `gitnexus` (deferred), `ponytail`, `santa-loop` (pending)
- Verification mode: `emulated`
- Loop engineering: in-session (per `AGENT_OPERATING_PROTOCOL.md` activation criteria — non-trivial planning, not high-blast-radius execution)
- Plan pack location conforms to Archestimator-specific `archestimator-plan-pack` skill

## What this plan pack is NOT

- Not an implementation contract (Phase 1+ requires owner approval)
- Not an upstream contribution plan (Phase 4 optional)
- Not a Cloudflare adapter swap proposal (Option D rejected)
- Not a codemod endorsement (codemod blocked by adapter)
- Not a suppression of the warning (Next.js provides no flag)
- Not a state-doc deletion proposal (state-doc reconciliation is superseded-marking, not deletion)

## Production-deploy contract (Phase 3, for reference)

When Phase 3 unblocks, the deploy path is:

```
1. bun install --frozen-lockfile
2. (atomic file edits per WP-3.2)
3. bun run type-check
4. bun run lint
5. bun run test:dom           # 26 tests must pass
6. bun run cf:build           # OpenNext build
7. bun run cf:check-readiness # readiness gate
8. bun run cf:preview         # local runtime verification (optional but recommended)
9. Owner authorization gate
10. bun run cf:deploy         # production deploy
11. Post-deploy smoke: HEAD /, /login, /workshop (signed-out → 307)
```

Each step's evidence must be captured before proceeding. Failure at any step → revert via `git revert` and re-plan.
