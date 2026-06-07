# Source Adoption Crosswalk

**Status:** Planning-only source map.
**Checked:** 2026-06-06T16:09:52Z.
**Boundary:** External sources are references. `DESIGN.md`, current repo code, and Storybook review are the authorities.

## Source Evidence

| Source | Current evidence used | Adoption rule |
|---|---|---|
| Storybook | Official Storybook 10.2.9 docs via Context7 and Storybook Next.js Vite page. `@storybook/nextjs-vite` is the default Next.js framework path; `nextjs.appDirectory: true` supports `next/navigation` in App Router stories; `build-storybook` is the static validation command. | Use for Storybook config, docs, controls, play functions, accessibility addon, static build validation. |
| shadcn/ui | Current docs show Tailwind v4 uses blank `tailwind.config`, `cssVariables: true`, and `components.json`; examples default to lucide and Radix-backed components. | Use as copy/adapt and API/composition reference only. Replace visual defaults and reconcile lucide with Phosphor. |
| Flowbite | Public docs describe Flowbite as Tailwind-based components/blocks; Flowbite React supports Next.js/Tailwind v4; Blocks include application shells, side navs, advanced tables, CRUD layouts, forms, modals, drawers, filters, and dashboards. | Use public component breadth and block IA as reference. Do not store paid/pro source or import runtime/plugin by default. |
| Aceternity UI | Public catalog and AI recommendations are Tailwind plus Framer/Motion-heavy cards, backgrounds, text effects, loaders, overlays, grids, navigation, and landing effects. | Use mainly as landing/proposal inspiration. App/workshop adoption is `LANDING_ONLY` or `DEFERRED` unless owner approves motion dependency and reduced-motion proof. |
| Tailwind CSS v4 | Official docs confirm CSS-first `@import "tailwindcss"`, CSS `@theme`, runtime CSS variables, and source scanning posture. Repo already uses `@theme inline` and `@source not`. | Keep Storybook CSS aligned with `src/app/globals.css`; do not add a separate token source unless implementation evidence requires it. |
| Phosphor | Current repo uses `@phosphor-icons/react`; `DESIGN.md` and design linter require regular outline icon posture. | App/workshop icon authority. |
| Radix | Current repo has `@radix-ui/react-context-menu` only. | New Radix packages are owner-gated and must be justified by component need. |
| TanStack | Current repo has TanStack Query/Table. | Use Table concepts for data-grid stories; never make Storybook call live query functions. |

## Detailed Crosswalk

| External source | External category | Local target component(s) | Adoption posture | Reason | Dependency impact | License/privacy note | A11y note | Visual adaptation | Storybook requirement | Owner gate | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Storybook | Next.js Vite framework | `.storybook/main.ts`, `.storybook/preview.tsx` | COPY_ADAPT | Official default for Next.js component isolation with Vite. | Dev deps: `storybook`, `@storybook/nextjs-vite`. | Public OSS docs. | Enables a11y addon/play checks if approved. | Not visual. | Start and static build must pass. | Storybook package approval. | READY_AFTER_APPROVAL |
| Storybook | App Router support | `nextjs.appDirectory` parameter | COPY_ADAPT | Needed for `next/navigation` story compatibility. | None beyond Storybook. | Public docs. | N/A. | N/A. | Record in preview skeleton. | Package approval. | READY_AFTER_APPROVAL |
| Storybook | Accessibility addon | P0/P1 component QA | DEFERRED | Useful but package-gated. | `@storybook/addon-a11y` if not included. | Public docs. | Required before migration if approved. | N/A. | Run and record violations. | Addon approval. | OWNER_GATE |
| Storybook | Play/interaction testing | Menus, dialogs, combobox, tree, editable cell | DEFERRED | Strong keyboard proof. | `@storybook/test` if approved. | Public docs. | Tests keyboard/focus flows. | N/A. | Play candidates listed per component. | Addon approval. | OWNER_GATE |
| shadcn/ui | Button | `Button`, `IconButton`, `ButtonGroup` | REFERENCE_ONLY | Existing local Button has critical blast radius. | No new package by default. | Public OSS. | Native button semantics. | Restyle to 10px, 3px radius, neutral tokens. | Variants, loading, icon, long label. | New generated component approval if used. | PLANNED |
| shadcn/ui | Input/Form/Label | `Field`, `TextField`, `SearchField`, `ValidationSummary` | COPY_ADAPT | Good label/error composition patterns. | Possible Radix only for complex controls. | Public OSS. | Label, description, error ids. | Compact rows and helper text. | Empty, invalid, disabled, readonly. | Generated output approval. | PLANNED |
| shadcn/ui | Select/Combobox/Command | `SelectField`, `ComboboxField`, `CommandPalette` | COPY_ADAPT | Accessible keyboard patterns. | New Radix/cmdk packages may be needed. | Public OSS. | Roving focus/listbox semantics. | Dense menu rows, Phosphor icons. | Open, no results, loading, invalid. | Radix/cmdk approval. | OWNER_GATE |
| shadcn/ui | Dropdown/Context menu | `ActionMenu`, `ContextMenu` | COPY_ADAPT | Repo already uses Radix context-menu. | Existing dependency for context menu. | Public OSS. | Arrow keys, escape, focus return. | 10px rows, 3px radius. | Tree/table row actions. | None if existing dependency. | READY |
| shadcn/ui | Dialog/Popover/Tooltip/Tabs | `Modal`, `Popover`, `Tooltip`, `Tabs` | COPY_ADAPT | Strong accessible API models. | New Radix packages likely. | Public OSS. | Focus trap, labelled titles, tab relationships. | Compact surfaces. | State and keyboard stories. | Radix package approval. | OWNER_GATE |
| shadcn/ui | Chart | `ChartContainer`, `ChartTooltip`, data-viz tokens | REFERENCE_ONLY | Current repo uses D3; no chart package change needed for MVP. | Avoid new chart package. | Public OSS. | Text alternatives. | Neutral compact labels. | Empty/loading/error chart states. | New chart package approval. | DEFERRED |
| Flowbite | Forms | `FieldGrid`, `FileDropzone`, `DatePicker`, form sections | REFERENCE_ONLY | Broad examples for form coverage. | Avoid Flowbite runtime/plugin by default. | Public pages only unless paid access approved. | Must re-verify keyboard. | Replace Flowbite scale/radius/colors. | Form-state stories. | Flowbite runtime/pro approval. | PLANNED |
| Flowbite | Advanced tables | `DataTable`, `TableToolbar`, `BulkActionToolbar` | REFERENCE_ONLY | Useful coverage for dense table states. | No Flowbite runtime. | Public pages only. | Header/sort/selection semantics. | ArchEstimator density and TanStack posture. | Empty/loading/sorted/selected/overflow. | None for reference. | PLANNED |
| Flowbite | Side navigation/application shell | `AppShell`, `WorkshopShell`, `SidebarNav` | REFERENCE_ONLY | Blocks show app IA patterns. | No runtime. | Public/free only unless approved. | Landmarks and focus order. | Avoid generic dashboard styling. | Collapsed/active/loading stories. | Paid blocks if used. | PLANNED |
| Flowbite | CRUD modals/drawers | `CreateDialog`, `DeleteConfirmDialog`, `SidePanel` | REFERENCE_ONLY | Useful modal/drawer state coverage. | No runtime. | Public/free only. | Dialog labelling/focus. | Compact modal sections. | Create/update/delete confirmation stories. | Paid/pro if referenced. | PLANNED |
| Flowbite | Banners/alerts/toasts | `Banner`, `InlineAlert`, `Toast` | REFERENCE_ONLY | Good status breadth. | No runtime. | Public/free only. | Alert/status roles. | Neutral and semantic only. | Info/warning/danger/success states. | None for reference. | PLANNED |
| Flowbite | Blocks | `WorkshopShellBlock`, `ProposalReviewBlock` | REFERENCE_ONLY | Useful review packet IA. | No runtime. | Paid blocks forbidden unless approved. | Landmarks and responsive checks. | Remove marketing scale from app blocks. | Domain block stories. | Flowbite Pro approval for paid. | OWNER_GATE |
| Aceternity | Cards | `SpotlightCard`, `FocusCard`, landing card effects | LANDING_ONLY | Motion-heavy; not default app surface. | Motion dependency likely. | Public/pro boundary applies. | Reduced-motion mandatory. | Never override app/workshop density. | Landing-only stories. | Motion/pro approval. | DEFERRED |
| Aceternity | Backgrounds/visual effects | `AuroraBackground`, `BackgroundBeams`, `Sparkles` | LANDING_ONLY | Decorative, not work-focused. | Motion/Canvas/Three possible. | Public/pro boundary applies. | Reduced-motion and low-power proof. | Landing only. | Landing-only labelled stories. | Owner approval. | DEFERRED |
| Aceternity | Text effects | `TypewriterEffect`, `FlipWords`, `TextGenerateEffect` | LANDING_ONLY | Marketing/hero-only. | Motion dependency likely. | Public/pro boundary applies. | Avoid essential copy hidden behind animation. | Landing only. | Reduced-motion story. | Owner approval. | DEFERRED |
| Aceternity | Navigation/docks | `FloatingDock`, `FloatingNavbar` | REJECT | App shell should stay quiet and predictable. | Avoid dependency. | N/A. | N/A. | Conflicts with workshop density. | Mark as rejected. | Owner could reopen. | REJECTED_FOR_APP |
| Tailwind v4 | CSS variables/theme | Token galleries and component classes | COPY_ADAPT | Repo already uses CSS-first v4. | Existing dependency. | Public docs. | N/A. | Use ArchEstimator variables. | Token stories validate CSS load. | None. | READY |
| Tailwind v4 | Source scanning | Storybook CSS source plan | COPY_ADAPT | Story files need class generation. | Existing dependency. | Public docs. | N/A. | No visual change. | Build Storybook checks missing utilities. | None. | READY |
| Phosphor | Icons | `AppIcon`, semantic icon map | COPY_ADAPT | Current app icon standard. | Existing dependency. | Public package. | Decorative vs labelled icons. | Regular outline, 8-24px. | Icon gallery. | None. | READY |
| Radix | Context menu | `ContextMenu` | COPY_ADAPT | Already installed and used. | Existing dependency. | Public OSS. | Menu semantics. | Restyled local wrapper. | Context menu stories. | None. | READY |
| Radix | Dialog/select/tabs/popover/tooltip | P0/P1 interactive primitives | DEFERRED | Valuable but new package set. | Runtime deps if approved. | Public OSS. | Strong a11y if wrapped correctly. | Restyle. | Interaction stories. | New Radix approval. | OWNER_GATE |
| TanStack | Table | `DataTable`, `ColumnVisibilityMenu` | COPY_ADAPT | Existing dependency and project table needs. | Existing dependency. | Public OSS. | Table semantics still local responsibility. | Dense, neutral. | Sort/filter/empty/loading stories. | None. | READY |

## Rejection Rules

- Reject any source pattern that requires live provider data in Storybook.
- Reject any paid/pro material unless Philip has explicitly approved access and storage boundaries.
- Reject app/workshop visual defaults with oversized text, large radius, colorful SaaS palettes, decorative gradients, or heavy motion.
- Reject any dependency addition that lacks a component need, owner approval, rollback path, and validation plan.
