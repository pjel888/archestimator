# Validation Matrix

**Last updated:** 2026-06-10

## Proportional code-change gate

For current Archestimator app/workshop code changes, choose the smallest gate
that proves the touched behavior.

Broad gate for shared, risky, release, auth, database, security, or route-wide
changes:

```bash
bun run validate
bun run build
git diff --check
```

`bun run validate` covers:

- TypeScript type-check
- ESLint
- app/workshop design-system lint, enforcing the non-landing SF Pro scale, regular/medium weights, xs radius, zero tracking, reference color tokens, and regular icon weights
- `bun run lint:design` design quality audit using the repo-pinned local Impeccable detector
- Bun unit tests
- Vitest DOM/helper tests

Storybook validation remains a review surface, not a production gate:

```bash
bun run storybook:validate  # check-components + check-boundary + static build
bun run storybook:check-components  # verify story file coverage
bun run storybook:check-boundary    # enforce provider boundary
```

Notification RLS proof (no-Docker, temporary local Postgres):

```bash
bun run prove:notification-rls
```

Launch readiness probes (read-only, no provider mutation):

```bash
bun run launch:verify-hosted-auth
bun run launch:verify-hosted-export
bun run launch:verify-hosted-sensitive-routes
bun run launch:supabase-readiness
bun run launch:check-supabase-backup
bun run launch:check-supabase-migrations
bun run launch:check-support-dns
bun run launch:check-support-monitoring
bun run launch:check-vercel-env
bun run launch:check-vercel-health
bun run launch:check-vercel-production
bun run launch:check-legal-owner
bun run launch:check-resend-readiness
bun run launch:check-supabase-linked-readiness
```

For narrow edits, prefer focused type checks, focused Vitest/Bun tests, LSP
diagnostics, route smoke checks, and `git diff --check`. Add `bun run test:e2e`
when auth, protected-route behavior, login rendering, route redirects, or other
browser-only flows are changed. `test:e2e` is a separate Playwright command,
not part of the default app gate.

## Looped implementation work

For non-trivial work run through the bounded loop (`AGENT_OPERATING_PROTOCOL.md`
"Loop activation criteria and bounds"), validate each ITERATION with the narrowest
evidence that proves that iteration's change — focused type/test/LSP/route checks —
and record the proof boundary in the `LOOP_LEDGER.md`. Do not run the full gate on
every iteration. Escalate to the broad gate (`bun run validate` + `bun run build`,
`test:e2e`, Storybook, `lint:design-system`, provider/RLS proof) only when the loop
touches shared logic, auth/security, RLS/database, release readiness, or another
high-blast-radius surface — typically at the final integration step, owned by the
lead. Docs/governance loops use path checks + `git diff --check`. Label proof
precisely (`local-only` / `provider-proven` / `browser-proven` / `manual-proof-pending`
/ `not-verified`) and never claim a surface you did not exercise.

## Current active route surface

```txt
/
/about
/features
/pricing
/contact
/login
/privacy
/terms
/auth/callback
/api/health
/api/webhooks/resend
/api/ai/ask                                         (disabled for closed beta)
/api/ai/package-builder                              (disabled for closed beta)
/api/component-library/images
/api/component-library/attachments
/api/projects/images
/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx
/api/share/[token]                                   (publication access/snapshot/password/comment/decision/activity/events/session/unsubscribe sub-routes)
/invite/[token]                                      (accept, continue, sign-out sub-routes)
/share/[token]
/beta/access-required
/workshop
/workshop/onboarding                                  (redirects to /workshop/settings)
/workshop/terms                                       (authenticated clickwrap acceptance)
/workshop/projects
/workshop/projects/[projectId]
/workshop/projects/[projectId]/charts
/workshop/projects/[projectId]/estimates
/workshop/projects/[projectId]/estimates/[nodeId]
/workshop/library
/workshop/templates
/workshop/components                                  (redirects to /workshop/library)
/workshop/feedback                                    (beta feedback submission)
/workshop/settings
/workshop/settings/profile
/workshop/settings/workspace
/workshop/settings/beta-users                         (admin-only)
/workshop/settings/feedback                           (admin-only review queue)
/workshop/pending-invite                              (bridge handler)
```

Do not use the old reset-era assumption that `/workshop` is intentionally blank or that `/workshop/projects` is deleted. The authenticated Supabase-backed workshop path is now active.

## App/workshop UI checks

- Run `bun run lint:design-system` for substantial app/workshop UI changes, shared component changes, or visual-polish tasks. For tiny localized UI fixes, inspect the touched markup/styles and run the narrowest useful test or smoke check. `bun run lint:font-size` is an alias kept for older runbooks.
- No visible non-landing font size above `12px`; normal app/workshop controls/body/table/input/button text should remain around `10px`, subtitles around `11px`, and meta/helper labels around `8-9px`.
- Labels, eyebrows, metadata, helper copy, and muted subheaders must be smaller than the paired input/control/body text they describe; lint/test coverage must enforce role-specific hierarchy, not only the 12px ceiling.
- No non-landing font weight outside regular/medium, no nonzero tracking, and no mono/serif/Poppins app UI typography.
- No non-landing border radius outside `rounded-xs` / `3px`.
- No non-landing bold/fill/duotone icon weights.
- Reuse or extend shared primitives before creating repeated local controls:
  - `Button`
  - `ButtonLink`
  - `ControlField`
  - `ControlInput`
  - `ControlTextarea`
  - `CreatableCombobox`
  - `SearchInput`
  - `ControlSelect`
  - `Badge`
  - `Chip`
  - `EmptyState`
- Add or update tests when a feature adds a new reusable-control pattern.
- Avoid raw feature-local button/search/icon-button class strings when a shared primitive already fits.

## Storybook checks (review surface only)

- Run Storybook checks when adding or changing Storybook stories, shared UI primitives, or the component-library review surface.
- Use `bun run storybook:check-components` to verify story file count and required standalone titles.
- Use `bun run storybook:check-boundary` to enforce the provider boundary (no Supabase/auth dependencies in stories).
- Use `bun run storybook:validate` for the full gate (components + boundary + static build).
- Storybook stories must not import live Supabase clients, server actions, or auth hooks.
- New shared UI components should have story coverage before merging unless the task is an urgent narrow fix with a documented follow-up.
- Storybook is a review surface only. Do NOT migrate production app routes to new component library without Philip's explicit approval and a separate route-by-route migration plan.

## Required checks for notification system

- Run `bun run prove:notification-rls` to verify notification RLS policies with a temporary local Postgres cluster.
- Notification stories exist under `src/stories/domain/notifications/`.
- The notification system uses server-authoritative reads and RLS-protected writes; do not expose direct browser INSERT/UPDATE/DELETE on notification tables.

## Required checks for feature areas

- Estimate sheet editing: run focused estimate-sheet Vitest coverage for touched behavior, preserve spreadsheet-like Enter/blur semantics, and avoid visible row-level save pills unless explicitly approved.
- Estimate tree: drag/drop reorder is active. If tree hierarchy, DnD, or reorder server actions are touched, run `tests/vitest/estimate-sheet-tree-dnd.test.tsx` and related estimate-tree tests, then verify hierarchy guards and route-backed selection.
- Estimate Activity: run version-control action/UI/schema tests. The current UI is one unified `Activity History` modal; do not reintroduce sheet `Versions`, `Compare`, restore-as-copy, or named-version actions without a new approved slice.
- Component Library/Templates: run focused component-library tests when editing `/workshop/library`, `/workshop/templates`, source repositories, variants, brands, suppliers, folders, images, attachments, or shared estimate-sidebar loading.
- Proposal export: run proposal-export model/workbook/preview/route tests when editing export code. Current export is a mutable current-estimate XLSX preview/download, not immutable issued proposal snapshots.
- Project charts: run project-chart tests when editing `/workshop/projects/[projectId]/charts`, D3 chart transforms, grouping, or chart UI.
- AI Ask-only: run focused `ai-*` Vitest tests when editing `/api/ai/ask`, `src/lib/ai/*`, prompts, audit persistence, or the floating copilot. Preserve no-write behavior, workspace auth, server-only provider keys, and metadata-only audit logging.

## Required checks for Supabase/Auth changes

- Never touch archestimator Supabase resources.
- Use project `ebxxqidacheyapmmzavr` only.
- Run migrations/types when schema changes:

```bash
npx supabase@2.98.2 db push
npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts
npx supabase@2.98.2 migration list
```

- Confirm RLS stays enabled on public app tables.
- Do not commit secrets or service-role keys.
- Hosted Supabase Auth redirect URLs require Dashboard verification before broader tester rollout.
- If a migration seeds rows and then enables RLS, force constraints immediate before enabling RLS.
- Treat local migration presence and linked-remote application as separate evidence; verify both before claiming remote Supabase state.

## Documentation-only changes

- Verify referenced paths exist.
- Ensure new files are in the correct `.ai` folder.
- Update feature specs and roadmap when implementation state changes.
- Run `git diff --check` before finalizing.

## Agent-framework documentation changes

For `.ai/00_system`, `.ai/12_agents`, `.ai/08_prompts/templates`,
`.ai/11_skills`, or tool-adapter documentation changes:

- Verify `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` exists and is linked from
  `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`.
- Verify `.ai/12_agents/payloads/_template.md` exists.
- Verify payloads use the shared schema headings or intentionally fail closed.
- Verify tool adapters point back to `.ai` and do not duplicate long policy.
- Run `bun run validate:agents`.
- Run `git diff --check`.
- Run `bun run validate` and `bun run build` only when production source,
  package, framework, UI, route, or test behavior changes.

If the documentation change is meant to fix agent drift, degraded performance, stale context, or repeated mistakes, also verify:

- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` exists and is linked from `.ai/README.md` and `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`;
- the change identifies the active source of truth rather than adding another parallel instruction set;
- the final report states what remains unverified.

## Manual browser QA

For the current authenticated MVP path:

1. Public routes `/`, `/about`, `/features`, `/pricing`, and `/contact` render without auth.
2. `/workshop/projects` redirects signed-out users to `/login?next=/workshop/projects`.
3. `/login` renders compact magic-link UI.
4. After magic-link sign-in, `/workshop/projects` renders the live project form.
5. Creating a project redirects to `/workshop/projects/{projectId}`.
6. Opening estimates shows `/workshop/projects/{projectId}/estimates`.
7. Creating an estimate redirects to `/workshop/projects/{projectId}/estimates/{areaNodeId}`.
8. Opening `/workshop/projects/{projectId}/estimates/{nodeId}` renders only a node from an estimate owned by that project; mismatched project/node pairs return 404.
9. Tree items change the URL with `aria-current="page"` on the selected node, and content uses the route-loaded tree/rows.
10. Adding, replacing, deleting, or editing an estimate row persists the `estimate_row_items` record through TanStack Query mutation hooks, shows compact save state, and rolls back local optimistic state on failed saves.
11. Estimate-tree drag/drop reorder is available through React Complex Tree and the reorder server action; when touched, verify drop zones, hierarchy guards, route-backed selection, and Activity event persistence.
12. `/workshop/library` and `/workshop/templates` load separate component/template workspaces; `/workshop/components` redirects to `/workshop/library`.
13. `/workshop/projects/{projectId}/charts` renders project cost charts with route-owned project data.
14. Proposal XLSX export preview/download uses current estimate data and must not be represented as immutable issued-snapshot behavior.
15. The AI copilot can answer only; it must not mutate project, estimate, component, proposal, or user data.

## Estimation-domain claims

For cost, materials, labor, code, tax, or professional-practice claims:

- cite source and date;
- separate assumptions from verified facts;
- preserve calculation inputs and formulas;
- record uncertainty ranges when exact values are not reliable.
