# Security, Performance, And Data Plan

**Scope:** Future Storybook UI library MVP.
**Boundary:** No live provider data in Storybook stories.

## Security Thesis

Storybook is a design and component review surface, not an authenticated app runtime. Stories must use static fixtures, sanitized examples, and provider-free adapters. No secret, auth token, service role, live Supabase row id, invite URL, share token, webhook value, customer email, or private estimate data may be stored in a story.

## Data Rules

| Data type | Storybook rule |
|---|---|
| User/session/auth data | Use fake static identities only. |
| Workspace/project/estimate ids | Use fake ids that cannot match production data. |
| Cost library rows | Use static fixture rows with invented labels/prices. |
| Share links and tokens | Do not include real or token-shaped values. |
| Provider errors | Use representative sanitized messages. |
| Analytics/telemetry | Do not initialize production analytics in Storybook. |
| Supabase | Do not connect to linked or local Supabase from stories. |

## Fixture Strategy

- Create a dedicated story fixture folder during implementation.
- Fixture names should describe product state, not secrets or real customers.
- Prefer small typed builders for repeated domain examples.
- Keep fixtures deterministic so visual review is stable.
- Separate app/workshop fixtures from landing examples.

## Performance Rules

- Storybook must not become a production bundle dependency.
- Keep story-only helpers out of production import paths.
- Avoid heavy animation libraries unless package-approved and scoped.
- Use CSS transitions for app/workshop microinteractions where sufficient.
- Run `bun run build` after package/config changes to catch production leakage.
- Run bundle/performance checks if production code or shared imports are touched.

## Package And Runtime Isolation

- Storybook packages belong in dev dependencies unless official docs require otherwise.
- Storybook scripts must be explicit; do not hook Storybook into production build.
- Storybook config must not import server-only modules or provider clients.
- Mock decorators must be story-only.
- If Next/Tailwind v4 config requires aliases, keep them aligned with `tsconfig` and `components.json`.

## Privacy And Public Publishing

Default posture:

- Local Storybook only.
- No public deployment.
- No hosted docs claim.

Publishing requires a separate owner decision and review of:

- Access protection.
- Sanitized fixture audit.
- Asset/licensing audit.
- Vercel/project deployment target.
- Analytics/telemetry posture.

## Performance Acceptance Criteria

- `bun run build-storybook` succeeds after setup.
- `bun run build` succeeds and does not include Storybook-only entrypoints in app routes.
- Stories remain responsive with large static table/tree fixtures.
- Motion-heavy stories include reduced-motion and low-power alternatives.
- No story imports server actions, provider clients, or production-only middleware.
