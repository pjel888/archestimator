# Library Page UX/UI Audit Plan Overview

Status: planning and audit hardening only. No application code was changed.

Last hardened: 2026-06-11

Route: `/workshop/library`

## Purpose

This folder is the planning source for a comprehensive UX, UI, accessibility, schema, and performance audit of the Library page. The old document set contained useful code discovery, but it also mixed verified facts with inferred live-browser observations. This revision turns the folder into an evidence-gated audit plan.

Implementation must not start from this folder until the readiness gates in `15_IMPLEMENTATION_READINESS_CHECKLIST.md` are complete.

## Critical Corrections

| Area | Corrected fact | Evidence |
| --- | --- | --- |
| Page geometry | There is no Library-specific persistent 288px "Zone 1" left sidebar. The workshop shell reserves a collapsed 64px global rail on `lg` screens, while the 288px sidebar is an expandable clipped overlay. | `src/components/workshop/WorkshopPageShell.tsx:100`, `src/components/workshop/WorkshopPageShell.tsx:104`, `src/components/sidebar/MainSidebar.tsx:65`, `src/components/sidebar/MainSidebar.tsx:107`, `src/components/sidebar/sidebar-types.ts:1` |
| Auth/live route | Unauthenticated access to `http://localhost:3000/workshop/library` redirects to `/login?next=%2Fworkshop%2Flibrary`. Authenticated visual claims still need a signed-in browser capture. | `curl -I http://localhost:3000/workshop/library` returned `307 Temporary Redirect` |
| DB root categories | The live Supabase `component_category_nodes` roots are 9, not 12. "Appliances", "Electrical Devices", and "Window Treatments" can be UI/promoted group labels, but they are not current DB roots. | Read-only Supabase recursive category query, project `ebxxqidacheyapmmzavr` |
| Visible item count | The route repository query filters only `lifecycle_state != archived`, so the current visible set is 154 items: 153 `available` and 1 `discontinued`. | `src/lib/repositories/component-library-repository.ts:530`, `src/lib/repositories/component-library-repository.ts:533`; read-only Supabase count query |
| Metadata coverage | The current visible set has 154 thumbnail paths, 153 supplier values, and 118 brand values. The previous "metadata sparse" and "~50 thumbnails" claims are wrong. | Read-only Supabase coverage query |
| Toolbar controls | Filter and Group buttons render because `HeaderIconToolbar` defaults `showDefaultActions=true`, but `ComponentLibraryManager` does not pass `onFilter` or `onGroup`. These are no-op controls. | `src/components/ui/header-icon-toolbar.tsx:45`, `src/components/ui/header-icon-toolbar.tsx:60`, `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:775` |
| Add button color | The default Add icon button path uses orange classes. This conflicts with the neutral workshop design contract unless intentionally overridden. | `src/components/ui/header-icon-toolbar.tsx:113` |
| Card inspection/edit | Component cards have archive selection behavior but no card-click detail or edit flow. `AddComponentModal` is add-only. | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:304`, `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:337`; `src/components/workshop/component-library-manager/AddComponentModal.tsx` |
| Chunk 404 | The old stale chunk 404 is not currently proven as a production P0. Treat it as a deployment/cache verification scenario until reproduced in a fresh production build. | Prior draft evidence plus current unauthenticated route boundary |
| Next.js image guidance | In Next.js 16, prefer `preload` for a true LCP image. Do not recommend deprecated `priority` as the forward plan. | `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` |

## Audit Evidence Sources

| Source | What it contributes |
| --- | --- |
| Source code | Route wiring, layout geometry, toolbar wiring, dynamic imports, repository query shape, component boundaries |
| Supabase read-only queries | Schema, row counts, category roots, lifecycle distribution, data coverage, RLS/policy status |
| Project design docs | SF Pro app typography, 12px max workshop text, 3px radius, neutral palette, existing component library requirement |
| Impeccable product register | Product UI should be quiet, dense, stateful, accessible, and reuse the existing system |
| Research lane | WCAG 2.2, WAI-ARIA APG, web.dev Core Web Vitals, React concurrency APIs, Next.js App Router docs, NN/g filtering/search heuristics |
| Local smoke check | Signed-out route redirect boundary |

## Document Index

| Document | Role |
| --- | --- |
| `00_OVERVIEW.md` | Canonical summary, corrections, index |
| `01_PAGE_ARCHITECTURE.md` | Verified page structure, data flow, ownership map |
| `02_UX_PATHS_AND_ACTIONS.md` | User paths, action matrix, gaps |
| `03_CONTENT_CATALOGUE.md` | Verified Supabase content and taxonomy facts |
| `04_PERFORMANCE_AUDIT.md` | Performance findings and measurement plan |
| `05_UI_ELEMENTS_INVENTORY.md` | Corrected UI zones and element inventory |
| `06_IMPROVEMENT_RECOMMENDATIONS.md` | Reprioritized, evidence-gated recommendations |
| `07_VERIFICATION_AND_EVIDENCE.md` | Evidence log, corrections, limitations |
| `08_RESEARCH_BEST_PRACTICES.md` | UX/UI/accessibility/performance research synthesis |
| `09_SCHEMA_VERIFICATION.md` | Supabase schema, RLS, row count, policy verification |
| `10_UX_AUDIT_PLAN.md` | Research questions, task model, audit protocol |
| `11_UI_DESIGN_SYSTEM_COMPLIANCE_AUDIT.md` | Design-system compliance plan and violations to check |
| `12_ACCESSIBILITY_AND_INTERACTION_ACCEPTANCE.md` | Keyboard, focus, ARIA, state, and status-message criteria |
| `13_PERFORMANCE_AUDIT_READINESS_PLAN.md` | Measurement harness and thresholds |
| `14_VISUAL_QA_AND_ULTRAQA_SCENARIO_MATRIX.md` | Visual Ralph and adversarial QA readiness matrix |
| `15_IMPLEMENTATION_READINESS_CHECKLIST.md` | No-code to code handoff checklist |
| `16_RALPLAN_CONSENSUS_HANDOFF.md` | Consensus planning ADR, options, future staffing |

## Current Quality Bar

The plan is considered ready for implementation planning only when:

1. Every Library page claim is tagged as source-verified, DB-verified, research-backed, or not yet live-verified.
2. Authenticated screenshots exist for desktop, tablet, mobile, and reduced-motion states.
3. Search, tree, add, archive, empty, loading, and error paths have keyboard and pointer acceptance criteria.
4. Performance targets cover production `next build`/`next start`, LCP, INP, CLS, image requests, DOM size, and chunk/cache behavior.
5. Supabase schema/RLS assumptions are confirmed read-only against project `ebxxqidacheyapmmzavr`.
6. Recommendations use existing `src/components/ui` primitives before proposing new UI.
7. No document implies source-code changes are already approved.

## Stop Condition

This planning pass stops at audit readiness. The next phase should be a separate, explicitly approved implementation or audit-execution task.
