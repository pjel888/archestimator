# Test Fixtures And Seed Data Specialist Plan

## Goal

Make notification behavior provable without depending on production data, raw secrets, or manual provider mutation.

## Fixture Strategy

Use deterministic local fixtures for schema, server, client, and e2e tests. Keep fixture identifiers fake and obviously non-production.

## Database Fixtures

Users:

- User A id: `11111111-1111-4111-8111-111111111111`
- User A email: `notification-user-a@example.invalid`
- User B id: `22222222-2222-4222-8222-222222222222`
- User B email: `notification-user-b@example.invalid`

Definitions:

- Release definition id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
- Security definition id: `dddddddd-dddd-4ddd-8ddd-dddddddddddd`

Deliveries:

- User A release delivery id: `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`
- User B release delivery id: `cccccccc-cccc-4ccc-8ccc-cccccccccccc`
- User A security delivery id: `eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee`

Seed content:

- Release title: `New release`
- Release body: `Archestimator has a new in-app notification proof build.`
- Release version: `0.1.0-notification-test`
- Action label: `View workshop`
- Action href: `/workshop`

Forbidden fixture content:

- Real user email.
- Raw share token.
- Provider message id.
- OAuth material.
- Cookie.
- API key.
- Service-role key.

## Static Test Fixtures

Create `tests/fixtures/notifications.ts` with typed objects:

- `notificationDefinitions`
- `notificationDeliveries`
- `notificationFeedResult`
- `releaseAnnouncementView`
- `makeNotificationActionSuccess`
- `makeNotificationActionFailure`

Do not import Supabase clients from fixture files.

## Server Action Mocks

Mock modules:

- `@/lib/auth/session`
- `@/lib/supabase/server`
- `@/lib/notifications/repository`

Tests must assert input/output behavior, not Supabase client internals beyond scoped filters. For repository tests, use a tiny fake query builder that records filters and updates.

## E2E Seed Path

For the first implementation proof, use deterministic local/test fixtures only. Do not fan out to real beta users in the implementation PR unless the owner explicitly expands the task to provider-backed release creation.

For Playwright, use this order:

1. Local test DB seed script that inserts fixture rows into a local Supabase instance.
2. Test-only server helper guarded by `NODE_ENV !== "production"` and a local-only env var.
3. Mocked server actions in component-level browser tests only as supplemental UI proof, not as the required RLS behavior proof.

Do not seed linked production or preview data without owner-approved provider proof work.

## V1 Release Creation Path

V1 is split into two explicit paths:

- Implementation/test path: deterministic local fixtures listed in this file.
- Real beta release path: owner-approved seed migration or server-only operator script that inserts a release definition and fanout deliveries for profiles whose normalized email appears in `public.closed_beta_allowed_emails` with `status in ('invited','active')`.

Real beta fanout query shape:

```sql
select profiles.id
from public.profiles profiles
join public.closed_beta_allowed_emails beta
  on beta.normalized_email = lower(btrim(profiles.email))
where beta.status in ('invited', 'active');
```

Do not use all historical `auth.users` rows as the target set. Do not fan out to public share recipients.

## Seed Action-Href Safety

Every seed or operator fixture with `action_href` must use `/workshop` or a child path. Static seed tests must reject:

- `http://example.com`
- `https://example.com`
- `//example.com`
- `javascript:alert(1)`
- `/share/token`
- `/workshop/%2fshare`
- any value containing whitespace

## Cleanup

Each fixture path must have cleanup:

- Delete local test rows by deterministic ids after e2e.
- Reset mocked module state after each Vitest test.
- Clear TanStack Query cache between component tests.
- Remove temporary Playwright storage state after the spec unless intentionally reused.

## Required Tests

- Schema test reads migration and verifies fixture ids are not hardcoded into production migration except optional seed migration.
- RLS integration proves cross-user denial with User A/User B.
- RLS integration proves direct authenticated writes are denied.
- Static seed tests prove action hrefs cannot bypass server validation.
- Component tests use fixture views for modal/center state.
- E2E tests seed one release and one unread notification, then prove modal once-only and center read/dismiss behavior.

## Stop Gates

- Stop if tests require production provider data.
- Stop if fixture values include real owner/client/provider identifiers.
- Stop if e2e cannot clean up deterministic rows and the owner has not approved leaving local fixture rows behind.
