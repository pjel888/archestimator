# Templates Page — Research & Benchmarking

**Date**: 2026-06-11  
**Scope**: UX, UI, accessibility, performance, and platform research for a dense reusable-template discovery/management surface.  
**Status**: Planning artifact only; no source code changes.

---

## Research Sources

| Source | Why it matters for this audit | URL |
|--------|-------------------------------|-----|
| WAI-ARIA Authoring Practices: Tree View | The right panel exposes a hierarchical `tree` / `treeitem` pattern and must follow expected keyboard behavior if it remains a tree | https://www.w3.org/WAI/ARIA/apg/patterns/treeview/ |
| WAI-ARIA APG Button and Menu Button | Template actions, overflow actions, filter, group, and sort controls need semantic names, roles, values, and keyboard behavior | https://www.w3.org/WAI/ARIA/apg/patterns/button/ |
| WCAG 2.2 Target Size (Minimum) | Toolbar icons, chevrons, tree rows, resize handles, and card actions need accessible target sizing or equivalent alternatives | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html |
| WCAG 2.2 Focus Not Obscured / Focus Appearance | Sticky headers, panels, and dialogs must not hide keyboard focus | https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html |
| web.dev Interaction to Next Paint | Search, resize, expand/collapse, card open, and handoff actions must stay inside a measurable responsiveness budget | https://web.dev/articles/inp |
| web.dev Core Web Vitals and budgets | Route readiness should include LCP, CLS, INP proxy checks, and explicit JS/network budgets | https://web.dev/articles/vitals |
| Next.js 16 local docs | This repo requires local Next docs; they recommend Server Components by default, route code splitting, lazy-loading Client Components where appropriate, `loading.tsx`, and `useReportWebVitals` | `node_modules/next/dist/docs/01-app/02-guides/production-checklist.md` |
| Supabase RLS docs | Template data is workspace-scoped and must remain protected by RLS and explicit policies | https://supabase.com/docs/guides/database/postgres/row-level-security |
| Supabase database functions docs | Apply-template flows rely on RPCs; security-definer functions require explicit review | https://supabase.com/docs/guides/database/functions |
| NN/g usability heuristics | The current page risks poor status visibility, mismatched expectations, and unclear available actions | https://www.nngroup.com/articles/ten-usability-heuristics/ |
| NN/g / Baymard filter research | Filter/sort/group controls need predictable labels, visible applied state, and stable result updates | https://www.nngroup.com/articles/applying-filters/ |

## UX Implications

| Research principle | Current audit implication | Required plan change |
|--------------------|---------------------------|----------------------|
| Users need visible available actions | The page looks like a management surface but offers no clear use path | Define Option A browse-first handoff or Option B management hub explicitly |
| Recognition beats recall | Users should not need to remember that templates are applied in the estimate editor | Add a visible "use/open in estimate" path into the existing editor flow |
| Controls must match observed behavior | Filter/Group buttons render without work | Implement them with real state or remove them |
| Dense controls need robust keyboard behavior | Tree rows, chevrons, resize, and cards are compact | Add keyboard and target-size verification |
| Product UI should avoid decorative hierarchy | Archestimator favors restrained, architectural utility | Use shared primitives, 3px radius, neutral tokens, no decorative app UI |

## Accessibility Requirements

| Area | Requirement | Verification |
|------|-------------|--------------|
| Tree panel | Arrow keys, Home/End, expand/collapse, selected state, focus state, and screen-reader labels should match APG tree expectations, or the pattern should be simplified to disclosure/list semantics | Manual keyboard pass plus Playwright accessibility assertions |
| Toolbar icons | Every icon action has a name, disabled state where needed, tooltip only as enhancement, and reachable keyboard path | Axe + keyboard-only walkthrough |
| Resize handle | Must be keyboard-operable or provide an equivalent panel-width control | Keyboard pass at 320px, 768px, 1440px |
| Card/list actions | Click, Enter, and Space should activate the same primary action where the element is presented as interactive | Playwright keyboard tests |
| Target sizing | Small chevrons and icon buttons need adequate clickable area or row-level target alternatives | DOM measurement and visual review |
| Focus order | Search, filters, cards, tree, inspector/handoff must follow visual order and return focus after closing transient UI | Manual and automated focus tests |

## Performance Requirements

| Performance concern | Audit requirement | Notes |
|---------------------|-------------------|-------|
| Route bundle | Compare `/workshop/templates` before/after bundle output and decide whether dynamic import is warranted | The sibling Library page dynamically imports its manager, but this must be measured |
| Responsiveness | Keep INP-like interactions below 200ms under seeded and scaled fixtures | Include search, tree click, expand/collapse, resize, card open, and handoff |
| Data shape | Preserve bounded queries or intentionally move to a measured RPC/view | Current listing is 1 template query plus 2 parallel child queries |
| Scale | Plan thresholds for 100, 1,000, and 10,000 templates before adding virtualization | Avoid premature complexity |
| Loading/error states | Verify route `loading.tsx`, error boundary, empty DB state, RLS-denied state, and failed handoff state | No blank panels or misleading read-only fallbacks |

