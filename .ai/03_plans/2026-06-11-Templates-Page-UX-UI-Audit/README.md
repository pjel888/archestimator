# Templates Page — Comprehensive UX/UI Audit

**Date**: 2026-06-11  
**Page**: `http://localhost:3000/workshop/templates`  
**Scope**: UX, UI, performance, content, accessibility, code quality

---

## Document Index

| # | Document | Contents |
|---|----------|----------|
| [00](00-overview-and-architecture.md) | Overview & Architecture | Route structure, data architecture, component hierarchy, shell layout, navigation context, seed data |
| [01](01-ux-paths-and-flows.md) | UX Paths & User Flows | Entry points, 7 core user flows, 6 page states, complete actions catalogue (20 actions), missing actions, interaction timings |
| [02](02-component-catalogue.md) | Component Catalogue | 21 components mapped with props, states, sub-components, typography specs, tree node renderers, utility functions |
| [03](03-data-and-performance.md) | Data Flow & Performance | Full data pipeline (DB → RSC → client), rendering strategy, performance metrics, scale projection, code splitting analysis, state management |
| [04](04-audit-findings.md) | Audit Findings & Recommendations | 2 critical, 1 high, 4 medium, 6 low-severity issues; accessibility audit; visual design compliance; code quality; templates vs library comparison; prioritized recommendations |
| [05](05-research-and-benchmarking.md) | Research & Benchmarking | External UX, accessibility, performance, and platform research translated into audit requirements |
| [06](06-database-schema-readiness.md) | Database Schema Readiness | Live Supabase schema verification, RLS policies, grants, RPCs, indexes, constraints, and data counts |
| [07](07-implementation-readiness-plan.md) | Implementation Readiness Plan | Browse-first decision record, implementation options, sequencing, acceptance criteria, and workflow gates |
| [08](08-audit-quality-gate-and-scorecard.md) | Audit Quality Gate & Scorecard | Claim evidence matrix, readiness scorecard, risks, tests, and stop conditions |

## Quick Summary

The Templates page (`/workshop/templates`) is currently a **browse/discovery surface** for reusable estimate templates with a two-panel layout: center sheet (template cards with preview) + right resizable tree panel (category navigation). It shares the `WorkshopPageShell` chrome with all workshop pages and uses Server Components for data fetching with client-side browsing interactions.

Second-pass correction: the backend and estimate-editor UI for applying templates already exist. The page gap is not "invent template insertion"; it is either **Option A**: keep `/workshop/templates` browse-first and add a clear launch/handoff path into the existing estimate-editor insertion workflow, or **Option B**: promote `/workshop/templates` into a management hub after separately approving that larger scope.

### Key Findings

| Severity | Count | Top Issue |
|----------|-------|-----------|
| 🔴 Critical | 2 | **Browse-first purpose is unclear**; templates are not usable from a clear handoff path |
| 🟠 High | 1 | Non-functional Filter/Group toolbar buttons and empty header chrome undermine trust |
| 🟡 Medium | 4 | Cards not clearly actionable, no sort, search omits row content, measured code-splitting question |
| 🔵 Low | 6 | Pluralization bug, redundant tab bar, duplicated code, etc. |

### Performance

- **No console errors** on templates page
- Browsing interactions are lightweight at current scale, but the existing audit has a network-evidence contradiction that must be resolved
- **No dynamic client-manager split** — `TemplateLibraryManager` is directly imported while the sibling Library page dynamically imports its heavier manager; bundle impact still needs measurement
- Accessibility baseline is promising, but APG tree keyboard behavior, keyboard resize, target sizing, and focus return are not proven yet
- Live Supabase data count on 2026-06-11: 3 templates, 10 template nodes, 15 template row items

### Compared to Library Page

The Templates page is structurally related to the Library page (`/workshop/library`) but should not be judged as a full CRUD library clone unless Option B is approved. The accurate gap is that it looks like a management surface while behaving as browse/discovery, and it does not yet guide users into the existing estimate-editor insertion flow.

## Design-System Delta

This audit must be interpreted against Archestimator's product UI contract: full-browser workspace, compact SF Pro text at 12px maximum, 3px radius, neutral restrained palette, shared component reuse, no decorative app UI, and no inert controls.

A page can pass token checks and still fail the product system if it wastes workspace area, ships fake toolbar controls, uses decorative app chrome, or routes standard task flows through modal-first patterns.

## Screenshots

Located in `screenshots/`:
- `templates-page-initial.png` — Viewport screenshot with "All Templates" selected
- `templates-page-full.png` — Full-page screenshot

## Audit Metadata

| Field | Value |
|-------|-------|
| Audit date | 2026-06-11 |
| Auditor | Sisyphus (AI Agent) via Hyperplan workflow |
| Method | Code analysis + live browser testing (Playwright) |
| Files analyzed | 12 source files across route, components, data layer |
| Browser testing | Yes — full interaction testing (search, tree nav, panel resize) |
| Templates on page | 3 (live Supabase data: Condo Fit-Out Starter, Powder Room Basic, Roof Deck Lounge) |
| Supabase schema check | Yes — read-only verification of tables, RLS, policies, grants, RPCs, constraints, indexes |
| External research | Yes — WAI-ARIA APG, WCAG 2.2, web.dev/Core Web Vitals, Next.js local docs, Supabase docs, NN/g, Baymard |
