Read-only research task for Archestimator. Do not edit files, stage, commit, push, deploy, or run database commands.

Context:
- Archestimator is a pre-MVP construction/architecture estimating app.
- Target route: /workshop/components, a global Component Library manager, not the estimate-page insertion sidebar.
- Users are likely architects, contractors, estimators, and small firms in the Philippines.
- The current product needs a better UX/UI plan before implementation.
- The page may need browsing by supplier, category/trade, MasterFormat/CSI-like spec sections, assemblies, materials, labor, equipment, allowances, stale/missing price, favorites/recent, and project overrides.
- App UI constraints: compact SaaS/workshop surface, font sizes <= 12px outside landing, dense controls, clear hierarchy, no generic marketing UI, no Supabase/backend debug language in user-facing UI.

Please use Google/web knowledge where available and produce a concise markdown research memo with:
1. External UX patterns from cost libraries, estimating tools, product catalogs, component/library managers, procurement catalogs, and data-table SaaS tools.
2. What users likely want first on a component library manager page.
3. Recommended information architecture: top-level tabs/views, filters, grouping, table/list/card usage, detail drawer, create/edit flow, stale-price review flow.
4. Whether category, supplier, MasterFormat/CSI, UniFormat, assemblies, or project room/use-case views should be primary or secondary.
5. Risks and anti-patterns to avoid for a construction cost/component library.
6. Concrete screen-by-screen recommendations for /workshop/components.
7. Sources or search terms used. If live browsing/search is unavailable, state that clearly and base on general product knowledge.

Return only the memo. No code changes.