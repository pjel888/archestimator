# Official Pattern Notes

## Next.js 16

- Local Next docs state `fetch` is not cached by default and request-time data should be placed behind Suspense/loading boundaries or explicit cache semantics.
- Next route prefetch behavior is production-oriented and dynamic routes prefetch to the nearest loading boundary; the existing custom hover-prefetch pattern should be measured rather than replaced blindly.
- Cache Components / `use cache` can help for cache-safe data, but this repo does not currently enable `cacheComponents`; Loop 1 stays with request-scoped React `cache` and query shaping.
- `unstable_instant` can validate instant navigation shells, but adding it to auth/user-scoped workshop routes should follow measured route-shell readiness, not precede it.

## Supabase/Postgres

- Supabase docs emphasize RLS and user-scoped access. Shared caches must not ignore user/workspace/project visibility.
- Supabase changelog items reviewed on 2026-06-20 did not require changes for existing Data API table selects/counts used by this loop.
- The safest Loop 1 optimization is reducing row payloads (`head` count, explicit columns) and avoiding duplicate validations already proven by project-scoped joins.

## Redis-Like Cache Decision

Rejected for Loop 1:

- A distributed cache could make the hero path faster, but project/estimate permissions, favorites, collaboration, publications, and mutation invalidation are user- and workspace-scoped.
- A safe cache would require keys including user/workspace/project/version context plus explicit invalidation on project, estimate, membership, favorites, tabs, and publication writes.
- Query shaping and existing request-scoped memoization are lower-risk and measurable first.
