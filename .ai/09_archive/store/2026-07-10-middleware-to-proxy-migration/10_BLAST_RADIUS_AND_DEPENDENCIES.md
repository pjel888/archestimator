# Blast Radius and Dependencies

## Summary

**13 files** would be affected by a `src/middleware.ts` → `src/proxy.ts` rename. **0 files** are affected by the recommended Phase 1 (doc-only) action.

## File impact matrix

| # | File | Lines affected | Category | Change required if renamed | Change required for Phase 1 (recommended) |
|---|---|---|---|---|---|
| 1 | `src/middleware.ts` | Whole file (10 lines) | Source | Rename + change `function middleware` → `function proxy` | Add 3-line explanatory comment above `export function middleware` |
| 2 | `tests/vitest/auth-proxy.test.ts` | 22 test cases import `{ middleware as proxy }` | Test | Update all imports to `{ proxy }` (or keep alias, change source path) | None |
| 3 | `tests/vitest/proxy-file-convention.test.ts` | Lines 5-20 (whole test) | Test | Rewrite assertions: `existsSync("src/proxy.ts") === true`, `existsSync("src/middleware.ts") === false`, `export function proxy` | None (test stays as the security control) |
| 4 | `tests/vitest/proxy-sensitive-cache-headers.test.ts` | Imports from middleware | Test | Update imports | None |
| 5 | `tests/vitest/provider-exit-pack-script.test.ts` | Asserts script behavior | Test | Update expected file paths in assertions | None |
| 6 | `tests/vitest/cloudflare-latest-deploy-source-smoke-script.test.ts` | Asserts script behavior | Test | Update expected file paths | None |
| 7 | `scripts/generate-cloudflare-provider-exit-pack.ts` | Line 99 | Script | Replace `"src/middleware.ts"` with `"src/proxy.ts"` in source-list array | None |
| 8 | `scripts/generate-cloudflare-migration-inventory.ts` | Lines 414, 554 | Script | Replace both occurrences | None |
| 9 | `scripts/check-cloudflare-d1-auth-realtime-readiness.ts` | Line 1533 | Script | Replace | None |
| 10 | `scripts/generate-cloudflare-d1-authz-access-matrix.ts` | Line 793 | Script | Replace | None |
| 11 | `scripts/check-cloudflare-latest-deploy-source-smoke.ts` | Line 116 | Script | Replace | None |
| 12 | `README.md` | Lines 176, 270 | Docs | Update both references | Add note explaining why middleware.ts is intentional |
| 13 | `e2e/route-transition-performance.spec.ts` | (verify reference) | E2E | Update reference | None |

## Impact classification

| File | Required change | Probable change | Possible change | Verification only | Explicitly unaffected |
|---|---|---|---|---|---|
| `src/middleware.ts` | ✓ (rename + comment) | | | | |
| `tests/vitest/auth-proxy.test.ts` | ✓ (imports) | | | | |
| `tests/vitest/proxy-file-convention.test.ts` | ✓ (rewrite assertions) | | | | |
| `tests/vitest/proxy-sensitive-cache-headers.test.ts` | ✓ (imports) | | | | |
| `tests/vitest/provider-exit-pack-script.test.ts` | ✓ (assertions) | | | | |
| `tests/vitest/cloudflare-latest-deploy-source-smoke-script.test.ts` | ✓ (assertions) | | | | |
| All 6 scripts | ✓ (literal strings) | | | | |
| `README.md` | ✓ (2 references) | | | | |
| `e2e/route-transition-performance.spec.ts` | | ✓ (depends on reference nature) | | | |
| `src/lib/auth/request-proxy.ts` | | | | | ✓ (already correct) |
| `open-next.config.ts` | | | | | ✓ (default config) |
| `wrangler.jsonc` | | | | | ✓ (no middleware coupling) |
| `next.config.ts` | | | | | ✓ (no middleware coupling) |
| Better Auth config | | | | | ✓ |
| D1 migrations | | | | | ✓ |
| `cloudflare-env.d.ts` | | | | | ✓ |

## Backward compatibility

### Source code

- `src/middleware.ts` is imported ONLY by tests (no source-code importers — verified by `rg "@/?middleware"`).
- Therefore the rename has **zero source-code coupling**. Source code paths through `@/lib/auth/request-proxy` directly.

### Tests

- 26 tests across 5 files reference the file or its exports.
- All 26 must be updated atomically with the rename.
- Risk if missed: false-pass (test scans empty file list, security monitoring silently no-ops).

### Scripts

- 6 scripts hardcode `"src/middleware.ts"` as a literal string in source-list arrays.
- These scripts are inventory/audit tools that scan source files.
- Risk if missed: scripts silently report "no middleware file found" → false-negative on monitoring.

### Runtime

- Cloudflare Worker bundle depends on the Next.js build output, which depends on OpenNext's `useNodeMiddleware()` correctly identifying the middleware.
- OpenNext 1.20.1's `useNodeMiddleware()` keys on middleware-manifest entries, not source filename.
- **UNKNOWN:** whether Next.js 16 emits different manifest entries when source is `proxy.ts` vs `middleware.ts`.
- Risk if Phase 3 proceeds without verification: Worker deploy breaks silently.

### Documentation

- README explicitly documents the current architecture.
- Phase 1 should add the "intentional choice" note to prevent future confusion.

## Dependencies (downstream consumers)

| Consumer | Coupling | Phase 3 update |
|---|---|---|
| Cloudflare Worker runtime | OpenNext manifest interpretation | Verify via Phase 2 scratch-build |
| Storybook 10.4.2 | None (review surface only) | None |
| Playwright E2E | 1 spec file references middleware | Update line if needed |
| `bun run validate` suite | Runs all 26 tests | Tests updated atomically |
| `bun run cf:build` | Build pipeline | Should succeed if OpenNext supports proxy |
| `bun run cf:deploy` | Deploy pipeline | Should succeed if build succeeds |
| `bun run cf:check-readiness` | Readiness gate | Updates to source-list arrays |
| `bun run ops:agent-debug-snapshot` | Readiness snapshot | None (reads scripts, not middleware directly) |

## Dependencies (upstream providers)

| Provider | Coupling | Risk |
|---|---|---|
| `@opennextjs/cloudflare` 1.20.1 | Hard | BLOCKER until proxy.ts supported (or verified to work) |
| `next` 16.2.10 | Soft (warning only) | None |
| `better-auth` 1.6.x | None | None |
| Cloudflare D1 | None | None |
| Cloudflare R2 | None | None |
| Cloudflare Durable Objects | None | None |
| Cloudflare Queues | None | None |
| Cloudflare Email | None | None |

## Other active development work (concurrent agents)

- Per `git log` and `.ai/10_state/current-state.md`, recent work focused on:
  - Estimate-sheet performance optimization
  - Observability hardening
  - Production deploy fix
- No concurrent agent is currently editing `src/middleware.ts` or the 12 reference files (verified by `git status` clean).
- Phase 1 implementation should declare file ownership in the coordination ledger before starting.

## Documentation impact

| Document | Update needed for Phase 1 | Update needed for Phase 3 |
|---|---|---|
| `README.md` | Add 1-paragraph "Why middleware.ts" note | Update lines 176, 270 |
| `AGENTS.md` | None (already Cloudflare-first) | None |
| `.ai/10_state/current-state.md` | Reconcile lines 204-207 vs 861-867 | Update all `src/proxy.ts` references to `src/middleware.ts` (or vice versa post-rename) |
| `.ai/10_state/decisions.md` | Add 2026-07-09 entry citing this plan pack | Update if rename happens |
| This plan pack | N/A (is the doc) | Mark Phase 3 complete; archive |
| Storybook docs | None | None |
| Contributing guide | None | None |

## Backward compatibility with legacy providers

- Supabase project `ebxxqidacheyapmmzavr`: not affected (historical only)
- Vercel: not affected (exited)
- Resend: not affected (replaced by Cloudflare Email)
- No legacy-provider surface touches the middleware/proxy file convention.

## Blast-radius summary

- **Phase 1 (recommended, doc-only):** 3 files edited (`src/middleware.ts` comment, `README.md` note, `.ai/10_state/current-state.md` reconciliation). Zero source-logic change. Zero test change. Zero risk to deploy.
- **Phase 2 (optional, scratch-build):** 0 files edited. Creates and deletes a temp scratch directory. Reversible.
- **Phase 3 (BLOCKED):** 13 files edited atomically. Requires upstream unlock + Phase 2 verification.
- **Phase 4 (ongoing):** 0 files edited. Monitoring only.
