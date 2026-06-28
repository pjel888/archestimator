# 01 — Executive Summary

## What

Build a planning package for a new authenticated dashboard page at `/workshop/projects/{projectId}/activity` that serves as the **project activity history home**. The page aggregates audit activity across the project from six existing sources (`estimate_sheet_events`, `project_publications`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`, `collaboration_audit_events`) and lets the user filter by **scope** (whole project / project-only / specific estimate), **action class** (created / edited / deleted / reordered / shared / commented / decided / invited / viewed / versioned / system), **internal actor** (workspace member, with "edited by me" preset), and **client** (shared-link recipient by display name).

The page is **internal-only**. Recipients/clients never land here; they use `/share/[token]/*`. The activity page makes existing client-side audit data visible to internal users.

## Why

- The brief identifies this page as the "homepage of activity history" for a project — a single place to answer "what changed?", "who did it?", and "what did the client do?".
- Most of the infrastructure already exists (six-source composer, project-scoped estimate-events repository, dashboard chrome, audit tables). The gap is one route, one client component directory, and one multi-source project-scoped repository.

## How (architectural shape)

```
Server Component (/workshop/projects/{id}/activity/page.tsx)
  ├─ ownership + permission gate
  ├─ Promise.all over:
  │    ├─ readProjectActivityFeed (new multi-source project-scoped repository)
  │    └─ 3 dropdown helpers (estimates, members, recipients)
  └─ <ProjectActivityClient initialData={...} dropdowns={...} /> (Client Component)
       ├─ URL state canonical for filters/scope (?scope&?action&?actor&?client)
       ├─ Transient "Load more" cursor handled by an authenticated pagination loader
       ├─ Filter row (scope, action multi-select, actor, client)
       ├─ Activity timeline (ActivityViewModel[])
       └─ States: empty / loading / partial / error / permission-denied
```

The page reuses:
- The dashboard chrome (`WorkshopPageShell`, `ProjectMiniSidebar`, breadcrumbs, metadata strip) — already in the project layout.
- The existing activity composer (`src/lib/activity/`).
- The existing UI primitives (`src/components/ui/`).

- Broad schema redesign. It does introduce one scoped migration for the collaboration-audit read RPC because direct table access is intentionally denied.
- New dependencies.
- New public/unauthenticated Route Handlers or Server Actions. A narrow authenticated GET loader is authorized for pagination only.
- Real-time updates.
- Export, search, or AI summarization.

## Plan profile and verification

- **Profile:** `exhaustive` (per `Creating-Plan-Prompt.md` §9 — touches publication/shared-link/client data and a brand new route).
- **Documents:** 21 canonical files in `.ai/03_plans/2026-06-28-Project-Activity-Page/`.
- **Verification mode:** `independent`. Native council findings are incorporated, and final verifier `019f0e82-50d0-7940-a0c9-d59bd8d72f31` returned no P0/P1 findings.
- **Readiness status:** `IMPLEMENTATION-READY` as a planning artifact. Product defaults have been resolved as owner-delegated planning decisions; implementation must still re-verify each acceptance criterion as work packages land and run focused Vitest matrices throughout TDD.

## Key decisions

- **DEC-01:** Create a new `src/lib/repositories/project-activity-feed-repository.ts` rather than extending `readPublisherWorkspaceActivity`. Different audience (project members vs publisher roster) and different filter shape.
- **DEC-07:** v1 requires one scoped migration for `read_project_collaboration_audit_events(...)` because `collaboration_audit_events` has direct API access denied. No denormalized activity table or broad schema redesign.
- **DEC-08:** filters/scope are canonical URL state; pagination cursor is transient and uses a narrow authenticated read-only loader.
- **DEC-09:** Recipient PII minimization — only `display_name`, never `email`.
- **DEC-10:** Estimate-sheet named versions stay dormant (matches existing dashboard preview behavior).
- **DEC-12:** v1 strictly excludes `mass_deletion_events`, `account_security_events`, `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `security_rate_limit_events`, and `component_library_telemetry_events` — these are workspace/account-level and surfacing them on a project page risks scope confusion and PII bleed.

## Implementation shape (high level)

7-phase plan with 15 work packages (WP-1..WP-15):
- Phase 0: Pre-implementation proof checks (collaboration audit deny/RPC need, mini-sidebar re-verify).
- Phase 1: Scoped RPC migration, multi-source repository, and dropdown helpers (WP-0, WP-1, WP-2). Complexity: Large.
- Phase 2: URL-state + action-class helpers (WP-3, WP-4). Complexity: Small.
- Phase 3: Server Component route + skeleton (WP-5, WP-6). Complexity: Medium.
- Phase 4: Client Component + 13 subcomponents (WP-7). Complexity: XL — may split across PRs.
- Phase 5: Sidebar nav + visual polish (WP-8, WP-9). Complexity: Small.
- Phase 6: Adversarial QA + a11y + performance (WP-10, WP-11, WP-12).
- Phase 7: Final gate: targeted project-activity checks + `bun run validate` with known-red handling + `bun run build` + manual QA (WP-13, WP-14, WP-15).

## Key risks

- **RISK-09 (Medium):** Accidentally surfacing `account_security_events` or `ai_action_runs`. Mitigation: v1 strict exclusion + code-review gate.
- **RISK-11 (Medium):** Cross-project IDOR via URL filter values. Mitigation: server-side scoping is unconditional; URL filter values only filter within scope; denial tests.
- **RISK-18 (High):** Collaboration audit source is inaccessible through direct authenticated table reads. Mitigation: scoped security-definer RPC with `can_edit_project`, direct table grants still denied, and local/provider denial proof.
- **RISK-16 (Medium):** Pre-existing red tests in `bun run validate`. Mitigation: focused Vitest matrices during TDD; broad gate only as final check.
- **RISK-17 (Medium):** Phase 4 XL complexity. Mitigation: decompose into 13 subcomponents; split across PRs if scope pressure emerges.

## What this plan does NOT authorize

- Production deploy.
- Provider (Supabase/Vercel/GitHub) setting changes.
- Schema migrations beyond the scoped collaboration-audit RPC/index migration.
- Changes to public share routes or APIs.
- Force-push, history rewrite, branch deletion, or any destructive Git operation.
- **Any code changes at all in this planning run.**

## What this plan produces

- A ready-to-execute plan pack that an implementation agent can pick up and run with.
- A deletion criteria in `02_FEATURE_BRIEF_AND_SCOPE.md` so Philip can reject the direction without unbundling.
- A traceability matrix (`16`) so every requirement can be audited post-implementation.
- A risk register (`14`) so implementation knows what to watch.

## Next action (recommended)

1. Philip reviews this plan pack (start with this `01_EXECUTIVE_SUMMARY.md` and `17_FINAL_READINESS_REVIEW.md`).
2. Hand the plan pack to an implementation agent with the instruction: "Execute Phases 0 through 7 per `11_IMPLEMENTATION_PLAN.md`; report evidence per `12_TEST_AND_VALIDATION_STRATEGY.md`."
3. The implementation agent should re-verify each acceptance criterion as work lands and preserve the owner-delegated decisions unless new evidence contradicts them.
