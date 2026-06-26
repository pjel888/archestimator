# 10 — Blast Radius and Dependencies

> **PASS-2 AUDIT BANNER (2026-06-25).** This document has 2 CRITICAL corrections and 5 HIGH corrections recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Headlines: FAB-A07 (`feat/sidebar-redesign` branch does NOT exist — fabricated coordination risk), FAB-A08 (current branch is `codex/estimate-sheet-orchestration` NOT `main` — Phase 0 must switch), FAB-A09 (workspace-repository.ts is 3,267 lines not 2,300 — Ponytail T2.3 split target — roster function MUST live in new module), FAB-A12 (MainSidebar add is MED risk not LOW — 8 test files import it), FAB-A13 (15+ test files import workspace-repository), FAB-A19 (concurrent collision on `.ai/10_state/current-state.md`), FAB-U11/U12 (existing modals ProjectPublicationHeader 1,375 lines + ProjectTeamspaceHeader 1,232 lines are Ponytail mega-file territory — Phase 4 consolidation must respect ponytail discipline). Read doc 18_ for full evidence.

---

## Impact classification legend

- **Required change** — must modify to ship Phase 1.
- **Probable change** — likely modify during Phase 2–3.
- **Possible change** — may modify in Phase 4+.
- **Verification only** — no edit, only test/regression check.
- **Explicitly unaffected** — confirmed no impact.

---

## Direct impact

### Routes

| Path | Impact | Notes |
|---|---|---|
| `/workshop/publisher` | **Required change** | Replace 17-line stub (`src/app/workshop/publisher/page.tsx`) with RSC roster. |
| `/workshop/publisher/[publicationId]` | Possible (Phase 2) | Optional deep-link drawer content. |
| `/workshop` (homebase) | Verification only | No edit; ensure no nav regression. |
| `/workshop/projects` | Verification only | No edit. |
| `/workshop/projects/[projectId]` | Possible (Phase 4) | Modal consolidation may reduce `ProjectPublicationHeader` / `ProjectTeamspaceHeader` usage. |
| `/workshop/settings/workspace` | Verification only | No edit. |
| `/share/[token]` (receiver) | **Explicitly unaffected** | Publisher is builder-side only. |
| `/invite/[token]` | **Explicitly unaffected** | Invite flow untouched. |
| `/api/share/[token]/*` | **Explicitly unaffected** | Receiver-side API untouched. |
| `/login` | **Explicitly unaffected** | Auth flow untouched. |

### Components

| Component | Impact | Notes |
|---|---|---|
| `src/app/workshop/publisher/page.tsx` | **Required change** | Rewrite from stub. |
| `src/components/workshop/publisher/*` (NEW) | **Required change** | Add 7-8 new components (see `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`). |
| `src/components/workshop/WorkshopPageShell.tsx` | Verification only | Reuse; no edit. |
| `src/components/workshop/ProjectPublicationHeader.tsx` | Possible (Phase 4) | May deprecate in favor of Publisher drawer. |
| `src/components/workshop/ProjectTeamspaceHeader.tsx` | Possible (Phase 4) | May deprecate. |
| `src/components/workshop/publication/RecipientEmailComposer.tsx` | Verification only | Reuse; no edit. |
| `src/components/workshop/publication/SheetPickerList.tsx` | Verification only | Reuse; no edit. |
| `src/components/workshop/publication/publication-optimistic.ts` | Verification only | Reuse; no edit. |
| `src/components/workshop/BulkActionToolbar.tsx`, `BulkDestructivePreviewModal.tsx` | Verification only | Reuse for Phase 3+. |
| `src/components/share/SharedLinkActivityFeed.tsx` | Probable (Phase 2) | Extend to accept workspace-scope data source. |
| `src/components/sidebar/MainSidebar.tsx` | **Required change** | Add `Publisher` nav item (1-line). Coordinate with `feat/sidebar-redesign` branch. |
| `src/components/sidebar/SidebarNavItemRow.tsx` | Verification only | No edit. |
| `src/components/ui/*` (60+) | **Explicitly unaffected** | All reused as-is. |

### Lib / data

| File | Impact | Notes |
|---|---|---|
| `src/lib/repositories/workspace-repository.ts` | **Required change** (additive) | Add `readWorkspacePublicationsRoster` function. No edits to existing functions. |
| `src/lib/publication/actions.ts` | **Explicitly unaffected** | Consume existing actions; no edit. |
| `src/lib/publication/security.ts` | **Explicitly unaffected** | Reuse crypto primitives; no edit. |
| `src/lib/publication/types.ts` | **Explicitly unaffected** | Reuse types; no edit. |
| `src/lib/publication/public-repository.ts` | **Explicitly unaffected** | No edit. |
| `src/lib/publication/snapshot.ts` | **Explicitly unaffected** | No edit. |
| `src/lib/publication/activity-helpers.ts` | Verification only | Reuse `isBeforeSharedLinkActivityCursor`; no edit. |
| `src/lib/collaboration/actions.ts` | **Explicitly unaffected** | Consume existing; no edit. |
| `src/lib/collaboration/types.ts` | **Explicitly unaffected** | Reuse; no edit. |
| `src/lib/collaboration/invite-entry.ts`, `invite-origin.ts`, `pending-invite.ts` | **Explicitly unaffected** | No edit. |
| `src/lib/collaboration/realtime-identity-*.ts` | **Explicitly unaffected** | No edit. |
| `src/lib/publisher/*` (NEW) | **Required change** | Add 2 new helper files (`feature-flag.ts`, `roster-filter.ts`). |
| `src/lib/auth/*` | **Explicitly unaffected** | No edit. |
| `src/lib/supabase/*` | **Explicitly unaffected** | No edit. |
| `src/proxy.ts` | **Explicitly unaffected** | No edit; Publisher rides on `/workshop` protection. |

### Database

| Object | Impact | Notes |
|---|---|---|
| `project_publications` | **Explicitly unaffected** | Phase 1: no migration. Phase 2 (optional): RPC + index. |
| `shared_link_recipients` | **Explicitly unaffected** | Phase 1: no migration. Phase 4+: optional `capabilities` column (D1). |
| `shared_link_events`, `shared_link_comments`, `shared_link_responses` | **Explicitly unaffected** | No migration. |
| `project_members`, `estimate_sheet_members` | **Explicitly unaffected** | No migration. |
| `estimate_sheet_access_settings` | **Explicitly unaffected** | No migration. |
| `collaboration_audit_events`, `account_security_events`, `estimate_sheet_events` | **Explicitly unaffected** | No migration. |
| New RPC `workspace_publications_summary` | Possible (Phase 2) | If PERF-01 fails. |
| New RPC `workspace_activity_feed` | Possible (Phase 2) | If DATA-02 app-union is slow. |
| New index `project_publications_workspace_status_idx` | Possible (Phase 2) | RPC-gated. |

### Tests

| File | Impact | Notes |
|---|---|---|
| `tests/vitest/publisher-roster.test.ts` (NEW) | **Required change** | Phase 1 adds. |
| `tests/vitest/publisher-rbac.test.ts` (NEW) | **Required change** | Phase 1 adds. |
| `tests/vitest/security-findings-publication-contracts.test.ts` | Probable | Extend with Publisher-action audit assertions. |
| `tests/vitest/project-publication-*.test.ts` (4 files) | Verification only | Regression. |
| `tests/vitest/project-collaboration-*.test.ts` (4 files) | Verification only | Regression. |
| `tests/vitest/project-invite-*.test.ts` (4 files) | Verification only | Regression. |
| `e2e/publisher-roster.spec.ts` (NEW) | **Required change** | Phase 1 adds (env-gated). |
| `e2e/shared-link-receiver.spec.ts` | Verification only | Regression. |
| `e2e/teamspace-collaboration.spec.ts` | Verification only | Regression. |

### Config / infrastructure

| File | Impact | Notes |
|---|---|---|
| `.env.example` | Probable | Document `ARCHESTIMATOR_PUBLISHER_ENABLED`. |
| `.github/workflows/ci.yml` | Verification only | No new step; existing `bun run validate` covers Publisher. |
| `vercel.json` (if exists) | **Explicitly unaffected** | No edit. |
| `package.json` | **Explicitly unaffected** | Zero new dependencies in Phase 1. |
| `tailwind.config` (CSS-first in v4) | **Explicitly unaffected** | No edit. |
| `tsconfig.json` | **Explicitly unaffected** | No edit. |
| `scripts/enforce-app-design-system.mjs` | **Explicitly unaffected** | No edit. |
| `supabase/config.toml` | **Explicitly unaffected** | No edit. |

---

## Transitive impact

### Users / roles

| Role | Impact |
|---|---|
| Workspace CEO / admin | New surface for cross-project publication management — pure win. |
| Project owner | Same. |
| Project editor | New visibility into publications on projects they can edit (read-only manager actions). |
| Project viewer | New visibility into publications on projects they can view (read-only). |
| External recipient (client) | **Explicitly unaffected** — uses `/share/[token]`. |

### Screens

| Screen | Impact |
|---|---|
| Homebase (`/workshop`) | Sidebar gains `Publisher` item; no other change. |
| Projects list (`/workshop/projects`) | No change. Phase 4 may add "Manage in Publisher" deep-link on project card. |
| Project dashboard (`/workshop/projects/[id]`) | No change in Phase 1–3. Phase 4 may migrate modals into Publisher. |
| Library, Templates | **Explicitly unaffected**. |
| Settings | **Explicitly unaffected**. |
| Share receiver (`/share/[token]`) | **Explicitly unaffected**. |

### Components

All `src/components/ui/*` — **explicitly unaffected**. Reuse is the rule.

### Routes

See "Direct impact" above.

### APIs

**No new HTTP API.** Publisher invokes server actions directly.

### Services

| Service | Impact |
|---|---|
| Supabase Auth | **Explicitly unaffected**. |
| Supabase Postgres | **Explicitly unaffected** (Phase 1); optional RPC + index in Phase 2. |
| Supabase Realtime | **Explicitly unaffected**. |
| Supabase Storage | **Explicitly unaffected**. |
| Resend email | **Explicitly unaffected**. |
| Vercel | New route to deploy; no config change. |

### Shared libraries

| Library | Impact |
|---|---|
| `@supabase/ssr` | **Explicitly unaffected**. |
| `@supabase/supabase-js` | **Explicitly unaffected**. |
| `@tanstack/react-query` | **Explicitly unaffected**. |
| `zustand` | **Explicitly unaffected**. |
| `react-complex-tree` | **Explicitly unaffected**. |
| `d3` | **Explicitly unaffected** (not used in Publisher). |
| `exceljs` | **Explicitly unaffected**. |
| `resend` | **Explicitly unaffected**. |

### Database tables

See "Direct impact" above. Phase 1 = zero schema change.

### Migrations

**Zero new migration files in Phase 1.** Phase 2 (optional) adds 1-3 additive migrations.

### Background jobs

**Zero new background jobs.**

### Integrations

**Zero new integrations.** Resend webhook unchanged.

### Network traffic

| Surface | Traffic delta |
|---|---|
| `/workshop/publisher` route | New GET traffic (closed-beta internal only) |
| `/api/share/[token]/*` | None |
| Supabase from server | +N queries per Publisher page load (N = workspace project count, batched) |
| Resend | None (existing digest pipeline) |

### Caches

- New TanStack Query cache keys: `['publisher', 'roster', workspaceId, filters]`, `['publisher', 'drawer', publicationId]`, `['publisher', 'activity', workspaceId, cursor]`.
- No Redis / CDN cache layer added.

### Authentication

**Explicitly unaffected.** Supabase Auth + closed-beta gate unchanged.

### Authorization

**Explicitly unaffected in code.** Reuses `assertProjectPublicationManager` and `canManageCollaborationRole`.

### Tests

See "Direct impact" above.

### Analytics

| Surface | Impact |
|---|---|
| Landing A/B framework | **Explicitly unaffected**. |
| Vercel Analytics | Auto-captures `/workshop/publisher` route. |
| Web vitals (`WebVitalsProbe.tsx`) | Auto-captures. |
| Posthog / 3rd party | None in Phase 1. |

### Monitoring

See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` §Metrics.

### Documentation

| Doc | Impact | Owner |
|---|---|---|
| Root `README.md` route table | Update post-Phase-1 | DOC-02 |
| `.ai/06_specs/shared-link-and-publication-spec.md` | Update post-Phase-1 | DOC-01 |
| `.ai/06_specs/feature-inventory.md` | Update post-Phase-1 | DOC-05 |
| `.ai/10_state/current-state.md` | Append entry on Phase 1 exit | DOC-04 |
| `.ai/10_state/decisions.md` | Record each D-resolution | DOC-03 |
| This plan pack | Update on Phase exit | Lead |

### Deployment

**No deployment config change.** Publisher is a new Next.js route; deploys via existing `vercel build`.

### Existing features

| Feature | Impact |
|---|---|
| Publication modal (`ProjectPublicationHeader`) | **Coexists** Phase 1–3. Possible deprecation Phase 4 (D4). |
| Teamspaces modal (`ProjectTeamspaceHeader`) | **Coexists**. Possible deprecation Phase 4. |
| `/share/[token]` receiver | **Explicitly unaffected**. |
| Excel XLSX export | **Explicitly unaffected**. |
| Estimate sheet editor | **Explicitly unaffected**. |
| Cost component library | **Explicitly unaffected**. |
| Templates | **Explicitly unaffected**. |
| Project charts (D3) | **Explicitly unaffected**. |
| Invitations | **Explicitly unaffected**. |
| Realtime cursors | **Explicitly unaffected**. |
| Notifications center | **Explicitly unaffected** (possible Phase 5 integration). |

### Backward compatibility

**Phase 1 is fully backward-compatible.** No existing route, API, action, type, or schema signature changes. Rollback path: disable `ARCHESTIMATOR_PUBLISHER_ENABLED` → 17-line stub behavior.

---

## Concurrent-work risk

| Active branch | Collision surface | Mitigation |
|---|---|---|
| `feat/sidebar-redesign` | `src/components/sidebar/MainSidebar.tsx` | Coordinate nav-item add. Publisher's add is 1-line; merge order is flexible. |
| `codex/fix-project-delete` | `src/lib/projects/`, `project_publications` cascade | No collision (Publisher doesn't edit either); verify post-merge. |
| `codex/project-dashboard-google-maps-integration` | `src/components/workshop/ProjectLocationMap.tsx` | No collision. |

**Rule:** Publisher implementation must NOT edit any file in these branches' scope until they merge to `main`. See `11_IMPLEMENTATION_PLAN.md` Phase 1.0 prerequisite.

---

## Compatibility matrix

| Dimension | Status |
|---|---|
| Browser support | Modern evergreen (existing repo convention) |
| Node version | Per `.nvmrc` / Bun runtime |
| TypeScript | Strict (existing) |
| React 19 | Yes (existing) |
| Next.js 16 | Yes (existing) |
| Tailwind v4 | Yes (existing) |
| Supabase JS | Yes (existing) |
| Postgres 17 | Yes (existing) |
| Vercel deployment | Yes (existing) |

---

## Other active development work

(Per `.ai/10_state/current-state.md` FAST PATH.)

- Closed-beta launch readiness audit (`2026-06-19-Launch-Readiness-Audit/`) — ongoing. Publisher cannot ship to external users until the Share-Routes / RLS-RPC / Auth audit gates close.
- Library route performance work — recently landed; no collision.
- Ponytail pass (Tier 2 mega-file refactor) — ongoing. Publisher must NOT add a new mega-file.

---

## Summary

| Impact class | Count |
|---|---|
| Required change | ~6 files (1 route, 7 new components, 1 sidebar add, 1 repository function, 2 lib helpers, 3 test files) |
| Probable change | ~3 files (spec doc updates, shared-link-activity-feed extension, security contracts extension) |
| Possible change | ~3 files / 3 migrations (Phase 2–4) |
| Verification only | ~25 existing tests, 4 existing components |
| **Explicitly unaffected** | ~95% of the codebase, including all crypto, RLS, API routes, receiver UI, auth, all UI primitives |

**Publisher is a low-blast-radius feature** because it sits above a mature substrate. The riskiest changes are the 1-line sidebar addition (branch coordination) and the additive repository function (no edits to existing queries).
