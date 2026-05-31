# Next.js Prefetch Development-Mode Behavior

## Purpose

This artifact explains why local authenticated dev-auth browser runs did not observe hover-before-click `_rsc` requests even though the route-transition code calls `router.prefetch(href)`.

## Local Next.js Evidence

Commands run from `/Users/philiplewis/archestimator`:

```bash
rg -n "prefetch|router\.prefetch|production|development" node_modules/next/dist/docs -g '*.md'
nl -ba node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md | sed -n '288,326p'
nl -ba node_modules/next/dist/client/components/app-router-utils.js | sed -n '1,80p'
nl -ba node_modules/next/dist/esm/client/components/app-router-instance.js | sed -n '250,315p'
```

Findings:

- Next.js App Router docs state that `<Link>` prefetching is only enabled in production.
- Next.js App Router docs document hover-only prefetch as setting `<Link prefetch={active ? null : false}>` after hover intent, but that behavior still depends on production-enabled prefetching.
- The local Next.js client helper `createPrefetchURL(href)` returns `null` when `process.env.NODE_ENV === "development"`.
- `useRouter().prefetch(href)` routes through the App Router segment-cache prefetch path, which calls the same URL creation helper before scheduling network work.

## Interpretation

The current route-transition code can be unit-proven to call `router.prefetch(href)` for sidebar, project-card, and estimate-row hover/focus intent. However, a `next dev` browser run is not sufficient to prove a hover-before-click `_rsc` Network request because Next.js intentionally disables App Router prefetch URL creation in development.

The isolated authenticated browser evidence used `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` and `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1`. Those flags require `NODE_ENV !== "production"`, so the same authenticated bypass cannot be used with `next start` to capture a production-mode prefetch Network request.

## Resulting Evidence Classification

- Code behavior: `router.prefetch()` invocation is covered by `tests/vitest/use-prefetch-on-hover.test.tsx` and table/source-level route-transition tests.
- Browser behavior: local dev-auth evidence proves authenticated transition RSC requests on click and records the absence of hover-before-click `_rsc` requests in development.
- Remaining gap: production-mode authenticated browser Network proof for hover-before-click `_rsc` requests requires a real login/session or another production-safe authenticated smoke path.
