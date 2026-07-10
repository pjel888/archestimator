# 10 — Blast Radius and Dependencies

## Direct impact

| Area | Impact | Classification |
|---|---|---|
| `src/lib/auth/better-auth-cloudflare.ts` (magic-link config) | SEC-1 + SEC-5 changes | Required change |
| `src/lib/cloudflare/better-auth-proof-router.ts` (proof fixture) | SEC-1 parity | Required change |
| `src/lib/recipient-proposals/actions.ts` | SEC-4 action-layer auth | Required change |
| 8 repository files (`src/lib/repositories/*`) | SEC-3 fail-closed authz | Required change |
| `next.config.ts` (CSP) | SEC-6 enforcement | Possible change (phase 4, may defer) |
| `src/lib/auth/request-proxy.ts` (middleware) | Possibly nonce injection (phase 4) | Possible change |
| New test files (denial/role/exclusivity/cookie) | Phase 5 | Required (new files) |

## Transitive impact

| Area | Impact | Classification |
|---|---|---|
| All Server Actions | No code change; already compliant (SEC-2 verifies) | Verification only |
| All `/api/*` handlers | No code change; already compliant | Verification only |
| `/workshop` route tree | No code change; gate already in layout | Verification only |
| D1 `verification` table schema | No DDL change (hashing is app-side) | Explicitly unaffected |
| D1 app-data tables | No schema change | Explicitly unaffected |
| R2 / Durable Objects / Queues / Email bindings | No change | Explicitly unaffected |
| Landing page / marketing UI | No change | Explicitly unaffected |
| Workshop dashboard UI components | No change (only their auth gates) | Explicitly unaffected |
| `wrangler.jsonc` bindings | No change | Explicitly unaffected |
| Legacy Supabase migrations | Not touched | Explicitly unaffected |

## User impact

| User class | Impact |
|---|---|
| Anonymous visitors | None (public pages unchanged) |
| Closed-beta authenticated users | Phase 1: magic-link tokens now hashed (transparent); no behavior change. Phase 2: none visible. |
| Platform admins | None visible |
| Magic-link users with in-flight tokens at deploy | May need to re-request a link (DEC-3, ≤5-min window) |

## Backward compatibility

- **SEC-1:** Forward-only hashing. Old plaintext rows expire in 5 min and are
  consumed/deleted. No migration, no backfill. In-flight tokens handled by
  deploy-window (DEC-3). Fully backward-compatible post-window.
- **SEC-3/SEC-4:** Additive (more checks), no removal of behavior.
- **SEC-5:** Tighter rate limits — could affect heavy users, monitored.
- **SEC-6:** Tighter CSP — could affect inline scripts, canary-gated.

## Dependencies

- **Better Auth 1.6.23:** Phase 1 depends on the magic-link plugin's `storeToken`
  behavior (Task 1.1 confirms). A BA version bump invalidates ASSUMP-1 → re-audit.
- **Cloudflare D1:** Phase 1 hosted proof requires `ARCH_DB` readback.
- **Cloudflare Email:** Magic-link delivery (unchanged, but end-to-end proof touches it).
- **No new third-party dependencies introduced.**

## Compatibility with active work

- Shared worktree: other packs (`2026-07-08/*`, `2026-07-09/Workshop-Pages`)
  may touch adjacent files. (The `middleware-to-proxy-migration` pack was archived
  2026-07-10 — see `.ai/09_archive/store/2026-07-10-middleware-to-proxy-migration/`.) Phase 1's file
  (`better-auth-cloudflare.ts`) is auth-specific; low overlap risk. Phase 2 repo
  files could overlap with estimate/perf work — declare file ownership before editing.
- The middleware-to-proxy-migration pack (archived 2026-07-10 to
  `.ai/09_archive/store/2026-07-10-middleware-to-proxy-migration/`) relates to
  `request-proxy.ts` (phase 4 nonce work would touch the same file) — coordinate
  only if that pack is re-activated (re-moved to `.ai/03_plans/`).
