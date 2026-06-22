# Evidence — Route & API Surface Inventory (raw)

**Captured:** 2026-06-14 via `find src/app -name page.tsx/route.ts/loading.tsx/error.tsx/layout.tsx` @ HEAD `3070c46c`.
This is the raw enumerated inventory. The enriched per-route matrix (data deps, RLS,
TanStack/Zustand/Realtime, bundle weight, test coverage, benchmark priority) lives in
`../02_REPO_AND_ARCHITECTURE_INVENTORY.md`; speed targets per surface live in
`../03_ROUTE_SPEED_MATRIX.md`.

## Page routes (31)

Public marketing / legal:
- `/` (`src/app/page.tsx`)
- `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`

Auth / invite / share / beta:
- `/login` (`src/app/login/page.tsx`)
- `/invite/[token]` (`src/app/invite/[token]/page.tsx`)
- `/share/[token]` (`src/app/share/[token]/page.tsx`)
- `/beta/access-required` (`src/app/beta/access-required/page.tsx`)

Authenticated workshop:
- `/workshop` (homebase bento)
- `/workshop/projects`
- `/workshop/projects/[projectId]`
- `/workshop/projects/[projectId]/estimates`
- `/workshop/projects/[projectId]/estimates/[nodeId]` (estimate editor)
- `/workshop/projects/[projectId]/charts`
- `/workshop/library`
- `/workshop/library/components`
- `/workshop/library/templates`
- `/workshop/library/templates/[templateId]`
- `/workshop/templates`
- `/workshop/components` (redirect → library)
- `/workshop/onboarding`
- `/workshop/feedback`
- `/workshop/terms`
- `/workshop/settings`
- `/workshop/settings/profile`
- `/workshop/settings/workspace`
- `/workshop/settings/feedback`
- `/workshop/settings/beta-users`

## API / route handlers (21)

- `/api/health`
- `/api/ai/ask`, `/api/ai/package-builder` (AI — flag-gated/deferred)
- `/api/component-library/attachments`, `/api/component-library/images`
- `/api/projects/images`
- `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`
- `/api/share/[token]` + `/activity` `/comment` `/decision` `/events` `/password` `/session` `/unsubscribe`
- `/api/webhooks/resend`
- `/auth/callback`
- `/invite/[token]/accept`, `/invite/[token]/continue`, `/invite/[token]/sign-out`
- `/workshop/pending-invite`

## Boundary coverage (loading.tsx / error.tsx / layout.tsx)

**`loading.tsx` present (10):** `workshop`, `workshop/onboarding`, `workshop/projects`,
`workshop/projects/[projectId]/estimates`, `workshop/projects/[projectId]/charts`,
`workshop/library`, `workshop/library/components`, `workshop/library/templates`,
`workshop/library/templates/[templateId]`, `workshop/settings`.

**`loading.tsx` MISSING on notable dynamic surfaces (gap candidates):**
- `workshop/projects/[projectId]` (project detail)
- `workshop/projects/[projectId]/estimates/[nodeId]` ⚠️ **the estimate editor — highest-complexity surface has no route-level loading**
- `workshop/templates`, `workshop/settings/profile`, `workshop/settings/workspace`, `workshop/settings/feedback`, `workshop/settings/beta-users`
- `share/[token]`, `login`, and all public pages (public pages may not need one)

**`error.tsx` present (7):** `workshop/library`, `workshop/library/components`,
`workshop/library/templates`, `workshop/library/templates/[templateId]`,
`workshop/projects/[projectId]/estimates`, `workshop/projects/[projectId]/estimates/[nodeId]`,
`workshop/projects/[projectId]/charts`.

**`error.tsx` MISSING (gap candidates):** `workshop` (root), `workshop/projects` (list),
`workshop/projects/[projectId]`, `workshop/templates`, all `workshop/settings/*`,
`share/[token]`, `invite/[token]`, public pages.

**`layout.tsx` present (4):** root (`src/app/layout.tsx`), `workshop`,
`workshop/library`, `workshop/projects/[projectId]`. Other workshop surfaces render via
`WorkshopPageShell`/`PublicPageShell` React components rather than nested Next layouts.

## Middleware

- `src/proxy.ts` is the active Next.js 16 middleware (matcher excludes
  `_next/static`, `_next/image`, `favicon.ico`). Confirmed running; uses `auth.getUser()`;
  already early-returns for public routes before creating the Supabase client.

> Notes: `[token]`/`[projectId]`/`[nodeId]`/`[templateId]`/`[estimateId]` are dynamic
> segments. Verify dynamic-vs-static rendering per route in `02_*` — most workshop routes
> are dynamic (auth + per-request data).
