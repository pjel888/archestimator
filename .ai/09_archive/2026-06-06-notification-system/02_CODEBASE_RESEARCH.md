# Codebase Research

## Safety And Branch Evidence

- Working directory: `/Users/philiplewis/.codex/worktrees/notification-system/archestimator`
- Branch: `codex/notification-system`
- Remote: `origin https://github.com/pjel888/archestimator.git`
- Fresh fetch completed during planning.
- Only intended untracked planning folder existed before this pack was written.
- Code-review graph stats for this new worktree reported zero indexed files, so repo inspection fell back to targeted file reads and `rg`.
- Refinement verification on 2026-06-06 kept all edits docs-only under `.ai`; no `src`, `supabase`, provider, dependency, or runtime files were modified.
- `node_modules/next/dist/docs/` was absent in this worktree during refinement, so current Next.js guidance was checked from official web docs instead.

## Required Project Context Read

- `.ai/README.md`
- `.ai/00_system/ai-folder-canonical-map.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
- `.ai/00_system/VALIDATION_MATRIX.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/10_state/known-issues.md`
- `.ai/01_roadmap/README.md`
- `DESIGN.md`
- `package.json`
- `README.md`
- Relevant `.ai/06_specs` and roadmap references for collaboration, shared links, publication, and beta feedback.

## Stack Facts

- `package.json` scripts include `type-check`, `lint`, `lint:design-system`, `test`, `test:dom`, `test:e2e`, and `validate` at lines 5-38.
- Dependencies include `@supabase/supabase-js` 2.106.2, `@supabase/ssr` 0.10.3, `@tanstack/react-query` 5.100.14, Next 16.2.6, React 19.2.6, and Zustand 5.0.14 at `package.json` lines 40-63.
- Product UI must use SF Pro, 12px-or-smaller product type, zero letter spacing, neutral surfaces, and crisp-xs radius per `DESIGN.md` lines 88-143 and related product guidance.

## Existing UI Primitives

- `src/app/providers.tsx` creates a TanStack `QueryClient` with 5-minute `staleTime`/`gcTime` and wraps children in `ToastProvider` at lines 12-40.
- `src/components/ui/toast.tsx` implements fixed bottom toasts with `MAX_VISIBLE_TOASTS = 4`, id-based replacement, status/alert roles, and dismiss controls at lines 51-202.
- `tests/vitest/toast.test.tsx` proves fixed toast viewport and id-upsert behavior at lines 28-52.
- `src/components/ui/modal.tsx` renders through `createPortal`, uses fixed `z-[1000]`, `role="dialog"`, `aria-modal`, Escape close, backdrop close, and close button at lines 22-96.
- `tests/vitest/ui-modal-tooltip.test.tsx` proves modal portal placement and fixed viewport layering at lines 9-23.

## Existing Realtime Patterns

- `src/hooks/use-project-presence.ts` uses a private Supabase channel named `project:${projectId}`, tracks presence, and removes the channel on cleanup at lines 51-89.
- `src/hooks/use-estimate-cursor-broadcast.ts` uses a private `estimate:${estimateId}` Broadcast channel, throttles send, filters self events, and removes the channel on cleanup at lines 78-120 and 137-167.
- `tests/vitest/project-collaboration-realtime.test.ts` covers private collaboration channel behavior.
- Migration `20260526142913_project_sheet_collaboration_access.sql` defines `public.can_access_realtime_topic` and `public.can_send_realtime_topic` for `project:` and `estimate:` topics at lines 650-709, grants authenticated access to `realtime.messages`, enables RLS, and gates Broadcast/Presence read/write at lines 857-885.

## Existing Activity And Publication Patterns

- `src/components/share/SharedLinkActivityFeed.tsx` loads activity through a server action or no-store route, uses owner-only Realtime Postgres changes on `shared_link_comments`, `shared_link_responses`, and `shared_link_events`, then reloads activity at lines 32-110.
- The same component renders loading, error, live-region, empty, feed, and pagination states at lines 112-190.
- `src/app/api/share/[token]/activity/route.ts` queries comments, responses, and events with recipient filtering, merges them, filters internal rows, and returns `Cache-Control: no-store` at lines 155-264.
- `src/lib/email/resend-webhooks.ts` and migration `20260601011500_resend_shared_link_delivery_webhooks.sql` show provider event reconciliation should update existing scoped rows rather than expose raw provider payloads.

## Existing Database/RLS Precedent

- `supabase/migrations/20260528220000_project_shared_link_overhaul.sql` creates additive shared-link tables at lines 28-75 and indexes publication/recipient/event queries at lines 81-110.
- The same migration enables RLS on all new tables at lines 232-235, creates manager read policies at lines 239-285, grants service-role insert for events at lines 287-293, revokes broad direct access at lines 299-303, and grants narrow authenticated select at lines 305-320.
- This is the best local model for notification migrations: additive objects, idempotent definitions, default-deny grants, narrow RLS, and explicit indexes.

## Current Notification Gaps

- No `notifications`, `notification_deliveries`, or release announcement table exists.
- Collaboration spec currently states there is no notification system beyond invite emails and `/workshop` banner.
- Toasts are transient operation feedback; they do not persist, count unread state, or support once-per-user release modals.
- Shared-link activity is scoped to publications and cannot serve general user notifications without widening responsibilities.
- Existing one-off email/digest paths in collaboration/publication are not a canonical notification domain.

## Official Documentation Checked

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js caching guide: https://nextjs.org/docs/app/guides/caching-without-cache-components
- Supabase Realtime overview: https://supabase.com/docs/guides/realtime
- Supabase Realtime getting started: https://supabase.com/docs/guides/realtime/getting_started
- Supabase Broadcast: https://supabase.com/docs/guides/realtime/broadcast
- Supabase Realtime authorization: https://supabase.com/docs/guides/realtime/authorization
- Supabase Realtime quotas: https://supabase.com/docs/guides/realtime/limits
- Supabase RLS guidance: https://supabase.com/docs/guides/database/postgres/row-level-security

## External Evidence Applied

- Use private channels for production Realtime.
- Use topic names in `scope:id:entity` form such as `user:789:notifications`.
- Clean up subscriptions when components unmount.
- Prefer Broadcast for notifications and high-frequency updates, but keep durable database state canonical.
- RLS complexity can increase Realtime join latency; notification policies must stay simple.
- Pro-plan defaults include 500 concurrent connections, 500 messages/s, 500 joins/s, and 100 channels per connection; one user notification channel is acceptable for beta scale.
- Next Route Handlers use Web `Request`/`Response` APIs inside `app` route files, and should explicitly opt out of caching for user-private notification reads if a route handler is added.
- Supabase RLS guidance requires explicit policies for exposed tables; `auth.uid()` is null for unauthenticated requests, so policies must include authenticated-only ownership checks.

## Refinement Evidence Added

- Exact schema/RLS/index plan now lives in `15_DATABASE_SCHEMA_RLS_PLAN.md`.
- Exact server-action/repository contracts now live in `16_SERVER_ACTIONS_API_CONTRACT_PLAN.md`.
- Exact provider, modal, center, and workshop integration boundaries now live in `17_FRONTEND_COMPONENT_AND_SHELL_INTEGRATION_PLAN.md`.
- Exact TanStack Query cache and optional Realtime invalidation behavior now lives in `18_STATE_MANAGEMENT_AND_QUERY_CACHE_PLAN.md`.
- Exact fixtures, fake users, seed data, and E2E data setup now live in `19_TEST_FIXTURES_AND_SEED_DATA_PLAN.md`.
- Accessibility and design-system closure gates now live in `20_ACCESSIBILITY_FOCUS_MANAGEMENT_PLAN.md` and `21_DESIGN_SYSTEM_ALIGNMENT_PLAN.md`.
- Future symbol-impact and provider/migration evidence gates now live in `22_GITNEXUS_CODE_GRAPH_IMPACT_PLAN.md` and `23_SUPABASE_PROVIDER_AND_MIGRATION_EVIDENCE_PLAN.md`.

## Research Conclusion

Build notifications as a new scoped domain under `src/features/notifications` and `src/lib/notifications`, with database-backed delivery rows and small UI integration points. Reuse `Modal`, `ToastProvider`, TanStack Query, and Supabase Realtime authorization patterns; do not merge this into shared-link activity or transient toast infrastructure.
