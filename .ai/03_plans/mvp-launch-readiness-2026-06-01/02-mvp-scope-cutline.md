# 02 — MVP Scope Cutline

**Date:** 2026-06-01

Every feature classified into: **MVP Core** (must ship), **MVP Polish** (needs work), **Defer** (hide, don't delete), **Remove from navigation** (keep code, hide link), **Keep dormant** (behind feature flag), **Unknown** (needs owner decision).

## Classification Table

| Feature | Current route/files | Current status | Launch decision | Reason | Required work | Risk | Tests needed |
|---------|-------------------|----------------|-----------------|--------|---------------|------|-------------|
| **Auth/login** | `/login`, `/auth/callback`, `src/proxy.ts` | ✅ Working | MVP Core | Required for protected routes | None | Low | Existing tests pass |
| **Workshop homebase** | `/workshop`, `WorkshopHomebaseClient` | ✅ Working | MVP Core | First-contact experience | Minor polish | Low | Existing tests pass |
| **Project CRUD** | `/workshop/projects/*`, modals, actions | ✅ Working | MVP Core | Core workflow entry | None | Low | Existing tests pass |
| **Estimate sheet CRUD** | `/workshop/projects/[projectId]/estimates/*` | ✅ Working | MVP Core | Core estimating workflow | None | Low | Existing tests pass |
| **Estimate tree (group/area)** | `EstimateSheetTree`, RCT DnD | ✅ Working | MVP Core | Navigation and structure | None | Low | Existing tests pass |
| **Estimate row editing** | `EstimateSheetContent`, hooks, actions | ✅ Working | MVP Core | Core editing UX | None | Low | Existing tests pass |
| **Component library browse** | `/workshop/library`, `LibraryPageClient` | ⚠️ Functional, needs polish | MVP Polish | Usable but lacks search UX, empty states | Browse/search UX, empty states, design-system audit | Medium | Vitest for search/empty, E2E smoke |
| **Component library create** | `Add Component` modal, RPCs | ✅ Working | MVP Core | Library must be populatable | Minor polish on UX | Low | Existing tests pass |
| **Component library variants/pricing** | Price options, cost entries, images | ✅ Working | MVP Core | Variants are core to component model | None | Low | Existing tests pass |
| **Component drag/click insert** | Library sidebar, insert actions | ✅ Working | MVP Core | Required workflow | None | Low | Existing tests pass |
| **Templates browse** | `/workshop/templates`, `TemplatesPageClient` | ⚠️ Functional, needs polish | MVP Polish | Usable but needs UX polish | Browse UX, empty states, seed template refresh | Medium | Vitest for browse, E2E smoke |
| **Template preview** | Template cards/preview | ⚠️ Partial | MVP Polish | Preview before insert is core | Preview modal/drawer with tree/row counts | Low | Vitest for preview |
| **Template insertion** | `insert_estimate_template_into_estimate_with_history` | ✅ Working | MVP Core | Core workflow | None | Low | Existing tests pass |
| **Project-specific component unlink** | No UI, no code path | ❌ Not built | **MVP Core** | Critical MVP requirement | RPC, UI action, badges, row editor, tests | High | Full test suite (see doc 07) |
| **Excel export** | `create-proposal-workbook.ts`, route | ⚠️ Generic dump | **MVP Core** | Must be industry bid form | Full rebuild of workbook builder | High | Vitest for workbook structure, E2E download |
| **Project charts (D3)** | `/workshop/projects/[projectId]/charts` | ✅ Working | MVP Polish | Nice-to-have, keep if stable | None | Low | Existing tests pass |
| **Ask Flip footer assistant** | `WorkshopPageShell` footer, `EstimateCopilotFloatingButton` | ❌ Visible everywhere | **Defer** | Looks unfinished, not MVP scope | Hide from WorkshopPageShell footer | Low | Test visibility is gone from all workshop pages |
| **AI `/api/ai/ask` route** | `/api/ai/ask/route.ts`, handler, read-context | ✅ Working | **Defer** | Defer from MVP | Return 404 or disabled response; keep code | Low | Route returns disabled/404 |
| **AI `/api/ai/package-builder` route** | `/api/ai/package-builder/route.ts`, handler, apply | ✅ Working | **Defer** | Defer from MVP | Return 404 or disabled response; keep code | Low | Route returns disabled/404 |
| **AI Package Builder Draft/Apply UI** | Inside `EstimateCopilotFloatingButton` | ✅ Working | **Defer** | Defer from MVP | Hidden with Ask Flip; code preserved | Low | N/A (hidden) |
| **AI memory/ranking** | `src/lib/ai/package-builder/memory.ts` | ⚠️ Default-off | **Keep dormant** | Already disabled, leave as-is | None | None | Existing tests pass |
| **AI audit tables** | `ai_action_runs`, `ai_tool_calls`, etc. | ✅ Working | **Keep dormant** | Internal audit, no user-facing surface | None | None | Existing tests pass |
| **Shared link** | `/share/[token]`, tabbed manager, comments, decisions, activity | ✅ Working | MVP Polish | Keep as-is if stable, don't expand | Audit for stability | Low | Existing tests pass |
| **Collaboration invites** | Teamspaces modal, invite entry, pending-invite bridge | ⚠️ Config-gated | MVP Polish | Keep as-is behind feature flag; don't expand | Verify flag blocks if disabled | Low | Existing tests pass |
| **Realtime cursors** | Broadcast channels, colored remote cursors | ✅ Working | MVP Polish | Keep if invisible/stable | None | Low | Existing tests pass |
| **Settings (profile/workspace)** | `/workshop/settings/*` | ✅ Working | MVP Core | User needs to configure account | None | Low | Existing tests pass |
| **Landing page** | `/`, 32 landing components, A/B testing | ✅ Working | MVP Polish | Keep as-is | None | Low | Existing tests pass |
| **Legal pages (privacy/terms)** | `/privacy`, `/terms` | ⚠️ Pending-review status | **MVP Core** | Must have accurate legal text | Replace with reviewed legal copy | Medium | N/A |
| **Design-system compliance** | `enforce-app-design-system.mjs` | ✅ 0 violations | MVP Core | Enforced, must stay clean | Audit estimate-tree and new surfaces | Low | Design-system lint pass |

## Summary

**MVP Core (must ship working):** 15 features
**MVP Polish (needs work before launch):** 8 features
**Defer (hide from MVP):** 4 features
**Keep dormant (behind flag, don't touch):** 2 features
**Remove from navigation (keep code, hide link):** 0 features
**Unknown / needs owner decision:** 0 features
