# Performance PR-0B Cache-Safety Harness Complete

**Completed:** 2026-06-06
**Source plan:** `.ai/03_plans/2026-06-05-performance-and-speed/27-ready-implementation-packets.md`
**Status language:** `IMPLEMENTATION PACKET COMPLETE / OPTIMIZATION NOT YET SHIPPED`

## Scope delivered

Implemented only PR-0B, the public personalization/cache-safety proof harness. This did not ship a performance optimization and did not change runtime behavior.

Files added:

- `scripts/check-public-cache-safety.ts`
- `tests/vitest/public-cache-safety-harness.test.tsx`
- `.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-public-cache-safety-harness.md`

Docs updated:

- `.ai/03_plans/2026-06-05-performance-and-speed/README.md`
- `.ai/03_plans/2026-06-05-performance-and-speed/CURRENT_CANONICAL_PLAN.md`
- `.ai/03_plans/2026-06-05-performance-and-speed/21-evidence-index.md`
- `.ai/03_plans/2026-06-05-performance-and-speed/27-ready-implementation-packets.md`
- `.ai/03_plans/2026-06-05-performance-and-speed/30-pack-manifest-and-completion-audit.md`
- `.ai/03_plans/2026-06-05-performance-and-speed/90-workflow-evidence.md`
- `.ai/10_state/current-state.md`

## Evidence result

The hosted harness covered `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, and `/terms` across anonymous, synthetic logged-in-cookie, consent rejected, consent accepted + A/B A, consent accepted + A/B B, and anonymous mobile scenarios.

Result: all seven public marketing routes are not compatible with broad shared HTML caching today. Hosted responses remain `private, no-cache, no-store, max-age=0, must-revalidate` with `x-vercel-cache: MISS`; `/` body varies under consent/A-B scenarios; and logged-in CTA output is source-proven to vary when `getLandingAuthState()` resolves true.

## Verification

- `bun run type-check` passed.
- `bun run lint` passed with 0 errors and 12 existing warnings.
- `bun run lint:design-system` passed.
- `bun run test` passed 9 tests.
- `bun run test:dom -- tests/vitest/vercel-web-analytics-integration.test.ts` passed 6 tests.
- `bun run test:dom -- tests/vitest/public-cache-safety-harness.test.tsx` passed 5 tests after a RED failure proved the missing harness.
- `PUBLIC_CACHE_SAFETY_OUTPUT=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-public-cache-safety-harness.md bun run scripts/check-public-cache-safety.ts` exited 0 and wrote hosted evidence.
- `bun run build` passed.
- `bun run test:dom` passed 180 files / 1416 tests, 2 skipped.

## Remaining gates

- Do not relax `MARKETING_PAGE_CACHE_CONTROL` until public personalization is isolated or proven cache-safe.
- Vercel Speed Insights dashboard p75 route/device metrics remain open.
- The active performance pack stays in `.ai/03_plans/2026-06-05-performance-and-speed/` for future PR-0A/PR-1A/PR-1B and optimization packets.
