# Fixture And Decorator Contracts

**Status:** Planning-only contract for future Storybook implementation.
**Rule:** Fixtures are static, fake, deterministic, and story-owned. Decorators must not initialize live providers.

## Fixture Folder Contract

Recommended future layout:

```txt
src/stories/fixtures/
  project-fixtures.ts
  estimate-fixtures.ts
  component-library-fixtures.ts
  share-review-fixtures.ts
  notification-fixtures.ts
  user-workspace-fixtures.ts
  proposal-fixtures.ts
src/stories/decorators/
  withArchEstimatorTheme.tsx
  withMockRouter.tsx
  withMockAuth.tsx
  withStaticQueryClient.tsx
  withReducedMotion.tsx
  withStoryFrame.tsx
```

## Fixture Rules

- IDs use `story-*` prefixes and must never resemble Supabase UUIDs unless the component specifically validates UUID shape; even then, use documented fake UUIDs.
- Names, emails, companies, projects, addresses, tokens, images, and costs are invented.
- Fixtures must not import repositories, server actions, Supabase clients, auth helpers, provider SDKs, Vercel analytics, Resend, or environment variables.
- Fixture builders may mirror TypeScript shapes but should not become production data factories.
- Every fixture file must export small named examples and builder functions.

## Fixture Builder Matrix

| Builder | Output | Required examples | Forbidden imports | Primary stories |
|---|---|---|---|---|
| `makeUserFixture` | fake user/profile | owner, member, reviewer, anonymous | Supabase auth, real email | avatar, user menu, share reviewer |
| `makeWorkspaceFixture` | fake workspace/team | solo workspace, shared workspace, viewer-only | workspace repository | app shell, invite status |
| `makeProjectFixture` | fake project card/table data | active, favorite, shared, archived, empty | project actions/repository | project cards, estimates table |
| `makeEstimateFixture` | fake estimate metadata/totals | draft, shared, overdue, long name | estimate repository/actions | estimate card, header, table row |
| `makeEstimateTreeFixture` | static group/area/row hierarchy | small tree, empty group, invalid drop, long labels | React Query loaders, server actions | tree shell, estimate editor block |
| `makeEstimateRowFixture` | static row item | manual row, linked component row, invalid unit, saving rollback | row mutation hooks | editable cell, estimate row table |
| `makeComponentLibraryFixture` | component/library cards and folders | category tree, supplier view, template view, no results | component-library repository | library card, folder tree |
| `makeShareReviewFixture` | public share review state | pending, approved, changes requested, expired | publication repository, token routes | share review header, decision panel |
| `makeNotificationFixture` | notification list/state | unread, read, release modal, empty | notification actions/query hooks | notification center, bell, modal |
| `makeProposalFixture` | static proposal sections | summary, line item, acceptance, rejected state | XLSX/export routes | proposal review blocks |

## Decorator Matrix

| Decorator | Purpose | Allowed behavior | Forbidden behavior | Verification |
|---|---|---|---|---|
| `withArchEstimatorTheme` | Apply product root classes and token context | Imports `src/app/globals.css`; wraps stories in neutral product canvas | Creating a parallel theme system | Foundation stories match `DESIGN.md` |
| `withStoryFrame` | Provide Storybook-safe viewport frames | Desktop, compact, narrow, mobile review containers | Mimicking protected route auth | Visual QA across viewports |
| `withMockRouter` | Provide static route labels and links | Supplies fake current path and navigation labels | Calling `next/navigation` outside Storybook-supported mocks | Stories using links render |
| `withMockAuth` | Supply fake user/session labels | Fake roles and reviewer/session states | Supabase auth refresh, cookies, OAuth | Stories render with env vars unset |
| `withStaticQueryClient` | Support components that expect QueryClient context | Client with no network and prefilled static cache | Fetching server state | Network tab/import audit clean |
| `withReducedMotion` | Toggle motion stories | Adds `data-reduced-motion`; maps global | Disabling accessibility focus indicators | Reduced-motion stories pass |
| `withNoProviderNetworkGuard` | Development-only guard | Throws if fetch/Supabase/provider calls are attempted in stories | Secret logging | Build/start fails on live calls |

## Mock Auth Contract

Mock auth may expose only:

- `user.displayName`
- `user.role`
- `workspace.name`
- `accessKind`
- `isSignedIn`

Mock auth must not expose:

- real email addresses;
- raw Supabase user ids;
- JWTs/cookies;
- provider refresh tokens;
- service-role state;
- allowlist emails.

## Static Query Contract

If a future story needs a QueryClient provider:

- cache data must be seeded from local fixtures;
- queries must be disabled or fulfilled synchronously;
- retries must be disabled in Storybook;
- network errors must be simulated with static error objects;
- no repository function may be imported.

## Storybook Provider Import Denylist

Stories, fixtures, and decorators must not import from:

- `src/lib/supabase/*`
- `src/lib/**/actions.ts`
- `src/lib/**/repository*.ts`
- `src/app/api/**`
- `src/proxy.ts`
- `src/lib/email/**`
- `src/lib/auth/**` unless a static type-only import is explicitly safe
- Vercel analytics/speed-insights packages
- provider SDK clients

## Fixture Acceptance Checklist

- [ ] Fake data only.
- [ ] No real UUIDs/tokens/emails/share URLs.
- [ ] No provider imports.
- [ ] No network.
- [ ] Long-label and empty/error examples included.
- [ ] Domain data shape is close enough for component stories.
- [ ] Storybook can start with provider env vars unset.
