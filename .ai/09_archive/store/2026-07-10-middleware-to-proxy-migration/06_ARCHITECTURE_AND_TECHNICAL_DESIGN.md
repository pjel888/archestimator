# Architecture and Technical Design

## Current-state architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Next.js 16.2.10 dev server (Turbopack)                          │
│ - Emits middleware-deprecation warning for src/middleware.ts     │
│ - Still honors src/middleware.ts as Edge entrypoint              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ src/middleware.ts (10-line shim)                                 │
│ - export function middleware(request) { return requestProxy() }  │
│ - export const config = { matcher: ["..."] }                     │
│ - Imports { proxy as requestProxy } from @/lib/auth/request-proxy│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ src/lib/auth/request-proxy.ts (the actual auth gate logic)      │
│ - Already internally named "proxy" (good)                        │
│ - Delegates session verification to server layout                │
│ - Strips spoofed protected-route headers                         │
│ - Marks sensitive routes private/no-store                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Production deploy path                                           │
│ - bun run cf:build → @opennextjs/cloudflare 1.20.1               │
│ - useNodeMiddleware() detects middleware-manifest entries        │
│ - Worker bundle archestimator-proof deployed to Cloudflare       │
└─────────────────────────────────────────────────────────────────┘
```

## Target-state architecture (Phase 3, BLOCKED)

```
┌─────────────────────────────────────────────────────────────────┐
│ Next.js 16.2.10+ dev server                                     │
│ - No deprecation warning (src/proxy.ts is the new convention)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ src/proxy.ts (10-line shim)                                      │
│ - export function proxy(request) { return requestProxy() }       │
│ - export const config = { matcher: ["..."] }                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ src/lib/auth/request-proxy.ts (unchanged)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Production deploy path                                           │
│ - bun run cf:build → @opennextjs/cloudflare FUTURE               │
│ - useProxy() or equivalent detects proxy-manifest entries        │
│ - Worker bundle archestimator-proof deployed to Cloudflare       │
└─────────────────────────────────────────────────────────────────┘
```

## Why this is non-trivial

A "simple rename" touches the **build substrate contract**, not just the source tree:

1. **Next.js 16** renamed the convention. The dev server emits a warning but still honors both names.
2. **OpenNext Cloudflare 1.20.1** has a `useNodeMiddleware()` utility that explicitly checks for `_middleware` manifest entries. There is no proxy equivalent. (Evidence: `evidence/opennext-source.txt`)
3. **Next.js 16** emits `middleware-manifest.json` regardless of source filename; the manifest CONTENT is what OpenNext keys on. Whether Next.js 16 changes manifest content keys when the source is `proxy.ts` is **not yet empirically verified** by this plan (would require a Phase 2 scratch-build experiment).
4. **The 13 affected files** (1 source + 5 tests + 6 scripts + 1 README + 1 e2e) all carry explicit references to `middleware` or `src/middleware.ts`. Each must be updated atomically with the rename.
5. **The shared-worktree invariant** means we cannot safely rename in a side branch; the rename must happen on `main` with explicit owner authorization.

## Component boundaries (unchanged by rename)

- `src/middleware.ts` ↔ `src/lib/auth/request-proxy.ts`: thin shim → logic. Boundary unchanged.
- `request-proxy.ts` ↔ Better Auth: delegated via server layout, not in middleware. Boundary unchanged.
- `request-proxy.ts` ↔ Cloudflare D1: no direct DB access in middleware. Boundary unchanged.
- OpenNext Cloudflare ↔ Next.js build output: contract is the `.next/` manifest files. Boundary enforced by adapter.

## Data flow (unchanged by rename)

```
HTTP request
  → Cloudflare edge (Worker archestimator-proof)
  → OpenNext routing
  → middleware/proxy function (Edge runtime)
  → request-proxy.ts (sets cache-control, strips spoofed headers, delegates session check)
  → Next.js route handler / RSC / Server Action
  → repository layer (D1 access with app-layer authorization)
  → Response
```

No data model, schema, contract, or authorization change. This is a **1-file rename + 12-file reference update** masked as a "deprecation warning."

## Decision rationale (architecture-level)

**Why not switch to a different Cloudflare adapter that supports `proxy.ts`?**
- No production-grade alternative exists for Next.js 16 on Cloudflare Workers.
- `@opennextjs/cloudflare` is the only supported path per `package.json` and the OpenNext ecosystem.
- Switching adapters is a multi-week effort with its own blast radius vs. tolerating a cosmetic warning.

**Why not contribute upstream to OpenNext?**
- Viable long-term option. Phase 4 of this plan recommends it as optional.
- Not blocking: the warning is cosmetic, not a runtime defect.
- Requires owner's authorization for OSS contribution (outside this plan's scope).

**Why not fork OpenNext privately?**
- Adds maintenance burden. Unjustified for a cosmetic warning.
- Recommended against unless paired with an upstream contribution strategy.

## Architectural alternatives considered (RALPLAN-DR)

See `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` for the full RALPLAN-DR summary and ADR.

## Performance/scalability/reliability impact

- **Runtime perf:** Zero impact. Middleware runs identically regardless of source filename.
- **Bundle size:** Zero impact. Same code, different export name.
- **Cold start:** Zero impact. Worker initialization unchanged.
- **Build time:** Zero impact. `bun run cf:build` runs the same OpenNext pipeline.
- **Reliability:** Risk of UNKNOWN if Phase 2 scratch-build experiment reveals proxy.ts-source emits a manifest OpenNext cannot consume. Until verified, treat as a blocker.

## Cognitive load / developer experience

- **Status quo:** Future developers see a deprecation warning on every `bun dev`, may attempt a naive fix, may break Cloudflare deploy.
- **After Phase 1 (in-source comment):** Warning still appears, but the reason is documented at the warning site. Future devs read the comment before acting.
- **After Phase 3 (future rename):** Warning gone. Developer experience fully clean.

Phase 1 captures 90% of the cognitive-load benefit at 1% of the risk.
