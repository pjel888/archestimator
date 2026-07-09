# Source and Codebase Audit

## Current-state architecture

### Auth gate call chain

```
HTTP request
  ↓
Next.js proxy runtime (Edge or Node per OpenNext routing)
  ↓
src/middleware.ts (10-line shim)        ← THIS IS THE FILE
  ↓ exports function middleware(request)
src/lib/auth/request-proxy.ts (the actual logic, ~hundreds of lines)
  ↓
Better Auth D1 session verification (in server layout, not in middleware)
```

The `src/middleware.ts` file is intentionally thin: it delegates to `@/lib/auth/request-proxy` for all logic. Renaming the file does not change auth behavior; it changes which file Next.js / OpenNext treats as the Edge entrypoint.

### Source: `src/middleware.ts` (current, 10 lines)

```typescript
import type { NextRequest } from "next/server";
import { proxy as requestProxy } from "@/lib/auth/request-proxy";

export function middleware(request: NextRequest) {
  return requestProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

Note: `requestProxy` is imported with the `proxy as requestProxy` alias — the underlying module is named `proxy`, only the wrapper function is named `middleware`. This indicates the codebase has already migrated internally; only the wrapper filename/export name remains on the old convention.

## Git history evidence

The project has flip-flopped between `proxy.ts` and `middleware.ts` **twice** in 8 days. Full evidence captured in [`evidence/git-history.txt`](evidence/git-history.txt).

### Timeline

| Date | SHA | Change | Reason given |
|---|---|---|---|
| Pre-2026-06-30 | `10e833c3b` | Original `src/proxy.ts` exists | Supabase auth era |
| 2026-06-30 12:38 | `247df1256` | **Delete `proxy.ts`, add `middleware.ts`** | Cloudflare migration: "replace Vercel proxy with Cloudflare middleware and better-auth integration" |
| 2026-07-07 00:24 | `293d5eefc` | **Adopt `proxy.ts` again, remove `middleware.ts`** | "Adopt Next.js proxy entrypoint and remove deprecated middleware.ts" |
| 2026-07-07 00:28 | `555c6e28c` | Inline proxy handler in `proxy.ts` | "Inline proxy handler and matcher config in src/proxy.ts" |
| **2026-07-08 18:52** | **`5558c5fa4`** | **REVERT: delete `proxy.ts`, add `middleware.ts`** | **"The OpenNext Cloudflare runtime uses src/middleware.ts as the Edge middleware entrypoint; the legacy src/proxy.ts convention is no longer honored and needs to be retired."** |

### Interpretation

The Jul 7 adoption of `proxy.ts` was the **correct response** to Next.js 16's deprecation. The Jul 8 revert was **forced** by an OpenNext Cloudflare runtime failure (likely a broken Worker route or failed `cf:build`). The "legacy" label in the commit message is technically misapplied (`proxy.ts` is the NEW convention), but the operational conclusion is correct.

## OpenNext Cloudflare 1.20.1 source evidence

File: `node_modules/@opennextjs/cloudflare/dist/cli/build/utils/middleware.js`

```javascript
import { loadFunctionsConfigManifest, loadMiddlewareManifest } from "@opennextjs/aws/adapters/config/util.js";

/**
 * Returns whether the project is using a Node.js middleware.
 */
export function useNodeMiddleware(options) {
    const buildOutputDotNextDir = path.join(options.appBuildOutputPath, ".next");
    const middlewareManifest = loadMiddlewareManifest(buildOutputDotNextDir);
    const edgeMiddleware = middlewareManifest.middleware["/"];
    if (edgeMiddleware) {
        return false;
    }
    const functionsConfigManifest = loadFunctionsConfigManifest(buildOutputDotNextDir);
    return Boolean(functionsConfigManifest?.functions["/_middleware"]);
}
```

### Why this matters

- The function is named `useNodeMiddleware` — singular focus on the `middleware` convention.
- It reads `middleware-manifest.json` from `.next/`. Next.js 16 may still emit this manifest under the same filename even when the source file is `proxy.ts`, but the manifest CONTENT (entries keyed by `"/"` or `/_middleware`) is what OpenNext keys on.
- There is **no `useNodeProxy()` or `useProxy()` equivalent** anywhere in the OpenNext 1.20.1 dist tree (confirmed by `rg "useNodeProxy\|useProxy" node_modules/@opennextjs/cloudflare/dist/` → 0 results).
- Files referencing `middleware` or `proxy` in OpenNext dist: `worker.js`, `init.js`, `bundle-server.js`, `next-server.js`, `build.js`, `middleware.{js,d.ts}`, `ensure-cf-config.js`, `createServerBundle.js`, `asset-resolver/index.js`, `queue.js`, `config.js`. None of them reference `proxy.ts` as a source-file convention.

### Caveat (inference, not proof)

This audit does NOT prove OpenNext 1.20.1 cannot consume a `proxy.ts`-sourced middleware-manifest. It only proves OpenNext's build utilities explicitly look for middleware-named manifest entries. The exact runtime failure Philip hit on Jul 8 is not captured in commit history (only the conclusion is). A definitive answer requires a Phase 2 scratch-build experiment.

## File inventory: 13 files affected by any future rename

### Category A — Source code (1 file)

| File | Why affected | Edit required if renamed |
|---|---|---|
| `src/middleware.ts` | The file being renamed | Rename + change `function middleware` → `function proxy` |

### Category B — Tests (5 files, 26 tests)

| File | Test count | Why affected |
|---|---|---|
| `tests/vitest/auth-proxy.test.ts` | 22 | Imports `{ middleware as proxy } from "@/middleware"` in every test case |
| `tests/vitest/proxy-file-convention.test.ts` | 1 | Explicitly asserts `existsSync("src/middleware.ts") === true` and `existsSync("src/proxy.ts") === false` |
| `tests/vitest/proxy-sensitive-cache-headers.test.ts` | 3 | Imports from middleware |
| `tests/vitest/provider-exit-pack-script.test.ts` | ? | Asserts the provider-exit-pack script behavior (which references the file) |
| `tests/vitest/cloudflare-latest-deploy-source-smoke-script.test.ts` | ? | Asserts the deploy-source-smoke script behavior |

### Category C — Scripts (6 files)

All hardcode the literal string `"src/middleware.ts"` in source-list arrays used for scanning/inventory.

| File | Line |
|---|---|
| `scripts/generate-cloudflare-provider-exit-pack.ts` | 99 |
| `scripts/generate-cloudflare-migration-inventory.ts` | 414, 554 |
| `scripts/check-cloudflare-d1-auth-realtime-readiness.ts` | 1533 |
| `scripts/generate-cloudflare-d1-authz-access-matrix.ts` | 793 |
| `scripts/check-cloudflare-latest-deploy-source-smoke.ts` | 116 |

### Category D — Documentation (1 file, 2 references)

| File | Lines | Content |
|---|---|---|
| `README.md` | 176, 270 | Documents `src/middleware.ts` as the auth gate entrypoint |

### Category E — E2E (1 file)

| File | Why affected |
|---|---|
| `e2e/route-transition-performance.spec.ts` | References middleware in route-transition perf context |

## Contradictory state-doc entries (must be reconciled)

`.ai/10_state/current-state.md`:

| Line range | Claim | Reality |
|---|---|---|
| 204-207 | `middleware.ts` is the active entrypoint; `proxy.ts` failed Cloudflare build | **CURRENT/TRUE** (post-Jul-8) |
| 861-867 | `proxy.ts` is the active entrypoint; `middleware.ts` was removed | **STALE** (pre-Jul-8, from the Jul-7 adoption era) |
| 4176 | References `src/proxy.ts` performing `/workshop` verification | **STALE** |
| 4186 | `bun run type-check` is red on `src/proxy.ts` | **STALE** (file no longer exists) |
| 9371, 9387, 9447, 9832 | Various historical entries referencing `src/proxy.ts` | All **STALE** but historical (not claims of current state) |

**Resolution:** Plan Phase 1 should add a reconciliation note. Lines 861-867 are the most concerning because they are written in present tense.

## Direct importers of `@/middleware`

```
$ rg "@/?middleware" --type ts --type tsx -g '!node_modules'
(no source-code importers — only tests reference the file)
```

This is favorable: the rename has no source-code coupling beyond the file itself. All coupling is in tests, scripts, and docs.

## What does NOT need to change (verified)

- `src/lib/auth/request-proxy.ts` — the actual auth logic; already imports as `proxy`
- Better Auth configuration
- D1 schema
- `wrangler.jsonc` bindings
- `open-next.config.ts` (uses default `defineCloudflareConfig()`)
- `next.config.ts`
- Any Cloudflare Worker route configuration
