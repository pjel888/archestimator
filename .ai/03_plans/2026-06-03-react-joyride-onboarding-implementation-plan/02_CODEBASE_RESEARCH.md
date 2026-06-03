# 02 — Codebase Research

**Date:** 2026-06-03 (refined)  
**Source:** Enhanced from `01_codebase_audit.md` with live repo verification  
**Confidence:** High — all claims verified against live source files

---

## Files/Folders Inspected

| File/Folder | Type | Key Findings |
|-------------|------|-------------|
| `package.json` | Config | Next.js 16.2.6, React 19.2.6, TypeScript 6.0.3, Bun, Tailwind CSS v4, Supabase, TanStack Query 5, Zustand 5 |
| `README.md` | Docs | Project structure, architecture, testing setup, design system, CI/CD |
| `DESIGN.md` | Design | SF Pro, 12px max, xs/3px radius, neutral palette, Phosphor icons, zero letter-spacing |
| `AGENTS.md` | Protocol | Multi-agent rules, GitNexus, code-review-graph, .ai as project brain |
| `.ai/10_state/current-state.md` | State | MVP closed beta frozen, 48 Supabase migrations, 279 source files, active workshop ecosystem |
| `.ai/10_state/decisions.md` | Decisions | Feature branches/PRs, no auto main merge, RLS everywhere, design system rules |
| `src/proxy.ts` | Middleware | Auth gate via Supabase server client, protected `/workshop` prefix, public route allowlist |
| `src/app/layout.tsx` | Layout | Root layout with `<AppProviders>`, fonts, metadata |
| `src/app/providers.tsx` | Providers | QueryClient, Toast, BFCache, perf monitoring |
| `src/lib/auth/session.ts` | Auth | `getCurrentUserContext()`, `requireCurrentUserContext()`, dev bypass |
| `src/app/workshop/page.tsx` | Route | Homebase wrapping `WorkshopHomebaseClient` in `WorkshopPageShell` |
| `src/components/workshop/WorkshopPageShell.tsx` | Shell | Authenticated wrapper for all workshop surfaces |
| `src/components/sidebar/MainSidebar.tsx` | Nav | Sidebar with Workshop/Projects/Components/Library/Templates/Settings nav items |
| `src/components/workshop/WorkshopHomebaseClient.tsx` | Home | Bento grid with Projects, Components, Templates, Favorites cards |
| `src/components/ui/header-icon-toolbar.tsx` | UI | Header toolbar with search + icon actions |
| `src/components/workshop/NewProjectModal.tsx` | Modal | Project creation modal |
| `src/app/workshop/projects/page.tsx` | Route | Project list |
| `src/app/workshop/projects/[projectId]/layout.tsx` | Layout | Only nested layout — project sidebar + header |
| `src/app/workshop/library/page.tsx` | Route | Component library |
| `scripts/enforce-app-design-system.mjs` | Lint | 229-line design system enforcement script |

## Commands Run

```bash
git status --short --branch          # main branch, 1 unrelated dirty file (next-env.d.ts)
git log --oneline -5                 # Latest: refactor(prompts), docs(bugs), feat(plan), integrate, foundational
rg --files | wc -l                   # Project file count
find src/app/workshop -type f | sort # All workshop route pages
find src/components -type f | sort   # All components
git grep -n "getCurrentUserContext"  # Auth pattern locations
git grep -n "data-tour"              # Zero existing data-tour attributes (confirmed)
git grep -n "feature flag"           # Feature flag usage patterns
```

## Existing Patterns to Follow

### 1. Feature Flag Pattern
**Source:** `src/app/workshop/page.tsx` (line referencing `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`)
```typescript
// Pattern: env var check before rendering feature component
const askFlipEnabled = process.env.NEXT_PUBLIC_ASK_FLIP_UI_ENABLED === 'true';
```

### 2. Client-Only Dynamic Import
**Source:** `src/app/workshop/page.tsx` (Copilot button pattern)
```typescript
// Pattern: next/dynamic with ssr:false for client-only components
const SomeClientComponent = dynamic(() => import('...'), { ssr: false });
```

### 3. Auth Guard Pattern
**Source:** `src/lib/auth/session.ts`
```typescript
// Pattern: requireCurrentUserContext() redirects to /login if null
const user = await requireCurrentUserContext();
```

### 4. RLS Migration Pattern
**Source:** supabase/migrations (48 existing migrations)
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own rows" ON table_name
  FOR SELECT USING (auth.uid() = user_id);
```

### 5. Design System Compliance
**Source:** `scripts/enforce-app-design-system.mjs`
- Font: SF Pro, regular/medium only
- Max font-size: 12px
- Border radius: 3px (xs) only
- Color palette: neutral tokens
- Icons: Phosphor regular outline

## Relevant Components for Onboarding Targets

| Component | File | Target Candidate | Notes |
|-----------|------|-----------------|-------|
| MainSidebar | `src/components/sidebar/MainSidebar.tsx` | `data-tour="ae-tour-main-nav-workshop"` | Client component, `"use client"` at line 1 |
| WorkshopHomebaseClient | `src/components/workshop/WorkshopHomebaseClient.tsx` | `data-tour="ae-tour-homebase-projects-card"` | 722 lines, client component |
| HeaderIconToolbar | `src/components/ui/header-icon-toolbar.tsx` | `data-tour="ae-tour-workshop-shell"` | Shared across workshop routes |
| NewProjectModal | `src/components/workshop/NewProjectModal.tsx` | `data-tour="ae-tour-new-project-name"` | Modal pattern |
| SidebarNavItemRow | `src/components/sidebar/SidebarNavItemRow.tsx` | Component wrapping individual nav items | Generic — add target on instance, not in component |

## Mismatches Between Docs and Source

| Doc Claim | Source Reality | Resolution |
|-----------|---------------|------------|
| README.md: React 19.2.4 | package.json: React 19.2.6 | Use 19.2.6 as canonical |
| AGENTS.md: "do not connect Supabase until explicitly approved" | current-state.md: Supabase active with 48 migrations | Supabase IS active — AGENTS.md is stale on this point. current-state.md is authoritative. |

## GitNexus / Code-Review-Graph Availability

**GitNexus:** Available. Repo indexed with 11,758 symbols, 21,332 relationships, 300 execution flows. Use `gitnexus_impact` before editing symbols.

**Code-Review-Graph:** Available. Use `semantic_search_nodes`, `query_graph`, `get_impact_radius` for code exploration.

## Gaps / Unknowns

1. **UNVERIFIED: React Joyride exact bundle size.** Plan assumes ~25-30KB gzipped. Must verify during Phase 1 with `ANALYZE=true bun run build`.
2. **UNVERIFIED: React Joyride React 19.2 compatibility.** Phase 1 skeleton verification required.
3. **UNVERIFIED: Exact z-index values used by sidebar, modals, route overlay.** Plan assumes z-100 cap — verify during implementation.
4. **UNVERIFIED: Supabase linked remote state.** Migration parity unknown for linked project `ebxxqidacheyapmmzavr`.

## Evidence Links

- Full codebase audit: `01_codebase_audit.md` (429 lines, 40-row evidence table)
- Stack verification: `package.json` lines 1-93
- Auth patterns: `src/lib/auth/session.ts`
- Route structure: `src/app/workshop/*`
- Design system: `DESIGN.md`, `scripts/enforce-app-design-system.mjs`
- Current state: `.ai/10_state/current-state.md`
