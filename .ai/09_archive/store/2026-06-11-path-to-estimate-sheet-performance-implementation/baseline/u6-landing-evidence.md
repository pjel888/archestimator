# U6 Landing Evidence — 2026-06-11

**Environment**: local `next dev` (port 3000, reused running server serving this worktree), hosted Supabase backend. Dev-mode numbers; relative comparison only.

## Anonymous `/` TTFB (curl, 8 samples after warmup)

| | BEFORE (auth round-trip) | AFTER (cookie hint) |
|---|---|---|
| samples (s) | 0.109, 0.642, 1.645, 1.514, 1.252, 1.730, 0.549, 0.116 | 0.071, 0.048, 0.052, 0.043, 0.046, 0.069, 0.062, 0.068 |
| median | ~0.60s | ~0.057s |
| worst | 1.73s | 0.071s |

The BEFORE variance tracks the hosted Supabase `auth.getUser()` round-trip on every anonymous render of `/` (and 6 other public pages using `getLandingAuthState`). AFTER replaces it with a display-only `sb-*-auth-token` cookie-presence hint (no network).

## Behavior checks

- `GET /` → HTTP 200, hero slide marker present in HTML.
- Anonymous `GET /workshop` → 307 → `/login?next=%2Fworkshop` (fail-closed protected-route validation untouched; auth-proxy + closed-beta suites green, 31/31).
- `react-complex-tree`/`style-modern` strings absent from landing HTML; import moved to `src/app/workshop/layout.tsx` (contract pinned in live-estimate-node-route.test.ts).
- `lenis/dist/lenis.css` moved from root layout to `LandingSmoothScrollProvider` (only Lenis consumer).
- Hero `next/image` `priority` → `preload` (Next 16.2.6 deprecates `priority`; type def confirms `preload?: boolean`). Single LCP candidate only — no new preloads. `ArchestimatorLogo`'s `priority` prop is a custom component prop, left unchanged (out of scope).

## Stale-cookie tradeoff (accepted, plan-sanctioned)

A visitor with an expired auth cookie sees "workshop" CTA copy; clicking it hits the protected route and lands on login. Display-only; no security surface.
