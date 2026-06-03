# 10 Copywriting and Step Content

**Status:** Draft for review
**Last updated:** 2026-06-03
**Scope:** Onboarding tour step copy, data-tour attribute targets, and placement rules for all planned tour segments.

---

## Brand Voice for Onboarding

Archestimator onboarding copy follows the same constraints as the rest of the product: direct, precise, and professional. The audience is construction professionals — contractors, estimators, design-build leads, and project managers — who value clarity over charm.

### Voice Rules

1. **No cute language.** No "Let's take a look around!", "Great job!", "You're all set! 🎉", or congratulatory filler. The user is learning a tool, not being entertained.
2. **No generic SaaS filler.** No "Streamline your workflow", "Unlock productivity", or "Next-gen platform". Every sentence must reference a specific Archestimator surface, action, or concept.
3. **Action-oriented titles.** Titles are verbs or brief nouns: "Create a project", not "Creating Your First Project". "Your cost library", not "Introducing the Cost Library System".
4. **One idea per body.** Each body is 1–2 sentences that explain a single concept or action, using Archestimator-specific terms (project, estimate sheet, component, group, area, line item, proposal).
5. **Jobsite precision.** Use the same language a contractor uses to describe their work: structure, materials, quantities, costs, proposals, clients, jobs.

### Typography in Tooltips

Per `DESIGN.md` § Typography, all onboarding tooltip copy uses the product/app scale:

| Element | Token | Font | Size | Weight | Line Height |
|---------|-------|------|------|--------|-------------|
| Step title | `app-title` | SF Pro | 12px | 500 | 16px |
| Step body | `app-body` | SF Pro | 10px | 400 | 14px |
| Step counter | `app-label` | SF Pro | 9px | 500 | 12px |
| Button label | `app-button` | SF Pro | 10px | 500 | 12px |
| Skip link | `app-body-muted` | SF Pro | 10px | 400 | 14px |

No font size above 12px. No font weight outside 400/500. No negative letter-spacing. Colors use the `ink` (#292929), `secondary` (#5D5D5D), and `tertiary` (#7F7F7F) tokens from `DESIGN.md` § Colors.

---

## Segment 1: Workspace Orientation (MVP)

**Tour key:** `first_workspace_orientation_v1`
**Route:** `/workshop`
**Goal:** Understand the workspace shell, main navigation, available destinations, and how to begin.
**Steps:** 5
**Priority:** P0 — first tour every new authenticated user sees.

### Step 1: Welcome

| Field | Value |
|-------|-------|
| **Step id** | `workspace_orientation_step_1` |
| **Tour key** | `first_workspace_orientation_v1` |
| **Title** | Your Workshop |
| **Body** | This is your estimating workspace. Everything starts here — projects, components, templates, and estimating sheets. |
| **Target selector** | `[data-tour="ae-tour-workshop-shell"]` |
| **Placement** | `auto` |
| **Route** | `/workshop` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log `onboarding:step_target_missing` event with step id and selector |
| **MVP/Later** | MVP |

**Copy rationale:** Names the surface ("Workshop") and lists the four primary destinations. No greeting, no welcome flourish. The user is a professional — show them what's available.

### Step 2: Navigation

| Field | Value |
|-------|-------|
| **Step id** | `workspace_orientation_step_2` |
| **Tour key** | `first_workspace_orientation_v1` |
| **Title** | Main navigation |
| **Body** | Workshop is your home. Projects holds your estimates. Components is your reusable cost library. Templates saves common estimating structures. |
| **Target selector** | `[data-tour="ae-tour-main-nav-workshop"]` |
| **Placement** | `right` |
| **Route** | `/workshop` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | MVP |

**Copy rationale:** Maps each nav item to its purpose using Archestimator-specific nouns (Projects, Components, Templates, estimates, cost library, estimating structures). The sidebar already shows these labels — the tooltip reinforces what each one does.

### Step 3: Projects

| Field | Value |
|-------|-------|
| **Step id** | `workspace_orientation_step_3` |
| **Tour key** | `first_workspace_orientation_v1` |
| **Title** | Start with a project |
| **Body** | Create a project first. Each project holds estimate sheets, charts, and shared links for one job. |
| **Target selector** | `[data-tour="ae-tour-homebase-projects-card"]` |
| **Placement** | `top` |
| **Route** | `/workshop` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | MVP |

**Copy rationale:** Action-first. The user learns what a project contains (estimate sheets, charts, shared links) and why it's the first thing to create.

### Step 4: Components

| Field | Value |
|-------|-------|
| **Step id** | `workspace_orientation_step_4` |
| **Tour key** | `first_workspace_orientation_v1` |
| **Title** | Your cost library |
| **Body** | Components are reusable line items with pricing, suppliers, and variants. Insert them into any estimate sheet. |
| **Target selector** | `[data-tour="ae-tour-homebase-components-card"]` |
| **Placement** | `top` |
| **Route** | `/workshop` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | MVP |

**Copy rationale:** Establishes the component concept early. "Reusable line items with pricing, suppliers, and variants" is specific to Archestimator's data model, not generic SaaS language.

### Step 5: Get started

| Field | Value |
|-------|-------|
| **Step id** | `workspace_orientation_step_5` |
| **Tour key** | `first_workspace_orientation_v1` |
| **Title** | Ready to begin |
| **Body** | Open Projects to create your first job, or explore Components to see the library. Replay this tour anytime from Settings. |
| **Target selector** | `[data-tour="ae-tour-homebase-projects-card"]` |
| **Placement** | `bottom` |
| **Route** | `/workshop` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | MVP |

**Copy rationale:** Closes the loop. Tells the user their two most useful next actions (create project, explore library) and mentions replay. No "Get started" as title — "Ready to begin" is a state, not an imperative.

---

## Segment 2: Project Creation (Phase 2)

**Tour key:** `first_project_creation_v1`
**Route:** `/workshop/projects`
**Goal:** Navigate the projects list, create a first project, understand what goes into a project.
**Steps:** 5
**Priority:** P1 — fires on first visit to `/workshop/projects` after workspace orientation is complete.

### Step 1: Projects list

| Field | Value |
|-------|-------|
| **Step id** | `project_creation_step_1` |
| **Tour key** | `first_project_creation_v1` |
| **Title** | Your projects |
| **Body** | All projects live here. Search by name or client, filter by owned or shared, and change how cards appear. |
| **Target selector** | `[data-tour="ae-tour-projects-search"]` |
| **Placement** | `bottom` |
| **Route** | `/workshop/projects` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 2 |

### Step 2: Create a project

| Field | Value |
|-------|-------|
| **Step id** | `project_creation_step_2` |
| **Tour key** | `first_project_creation_v1` |
| **Title** | Start a project |
| **Body** | Every estimate starts with a project. Give it a name, client, and location. |
| **Target selector** | `[data-tour="ae-tour-projects-create"]` |
| **Placement** | `left` |
| **Route** | `/workshop/projects` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 2 |

### Step 3: Project name

| Field | Value |
|-------|-------|
| **Step id** | `project_creation_step_3` |
| **Tour key** | `first_project_creation_v1` |
| **Title** | Name your project |
| **Body** | Use a clear name — Lewis Residence Renovation, Ortigas Office Fit-Out, or your own job reference. |
| **Target selector** | `[data-tour="ae-tour-new-project-name"]` |
| **Placement** | `right` |
| **Route** | `/workshop/projects` |
| **Trigger condition** | Creation modal open |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 2 |

**Copy rationale:** Uses realistic construction project names as examples. No "My First Project" placeholder language.

### Step 4: Project image

| Field | Value |
|-------|-------|
| **Step id** | `project_creation_step_4` |
| **Tour key** | `first_project_creation_v1` |
| **Title** | Add a cover image |
| **Body** | Optional. A site photo or rendering helps identify the project at a glance. |
| **Target selector** | `[data-tour="ae-tour-new-project-image"]` |
| **Placement** | `right` |
| **Route** | `/workshop/projects` |
| **Trigger condition** | Creation modal open |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 2 |

### Step 5: Create

| Field | Value |
|-------|-------|
| **Step id** | `project_creation_step_5` |
| **Tour key** | `first_project_creation_v1` |
| **Title** | Create the project |
| **Body** | This saves your project and opens it in the dashboard. An empty estimate sheet is created automatically. |
| **Target selector** | `[data-tour="ae-tour-new-project-submit"]` |
| **Placement** | `top` |
| **Route** | `/workshop/projects` |
| **Trigger condition** | Creation modal open |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 2 |

---

## Segment 3: Estimate Sheet Basics (Phase 3)

**Tour key:** `first_estimate_sheet_v1`
**Route:** `/workshop/projects/[projectId]/estimates/[nodeId]`
**Goal:** Understand the estimate tree and sheet table structure, the relationship between groups/areas/line items, and how to insert components.
**Steps:** 5
**Priority:** P1 — fires on first visit to an estimate sheet route.

### Step 1: Estimate tree

| Field | Value |
|-------|-------|
| **Step id** | `estimate_sheet_step_1` |
| **Tour key** | `first_estimate_sheet_v1` |
| **Title** | Estimate structure |
| **Body** | The left panel is your estimate tree. Groups organize sections. Areas hold the line items for each space. |
| **Target selector** | `[data-tour="ae-tour-estimate-tree"]` |
| **Placement** | `right` |
| **Route** | `/workshop/projects/[projectId]/estimates/[nodeId]` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 3 |

**Copy rationale:** Introduces the two key node types — Group and Area — without using database terms. "Sections" and "spaces" are construction-appropriate.

### Step 2: Add groups and areas

| Field | Value |
|-------|-------|
| **Step id** | `estimate_sheet_step_2` |
| **Tour key** | `first_estimate_sheet_v1` |
| **Title** | Build the structure |
| **Body** | Add a Group (like Ground Floor), then add Areas (Kitchen, Living Room) inside each group. |
| **Target selector** | `[data-tour="ae-tour-estimate-add-group"]` |
| **Placement** | `bottom` |
| **Route** | `/workshop/projects/[projectId]/estimates/[nodeId]` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 3 |

### Step 3: The estimate sheet

| Field | Value |
|-------|-------|
| **Step id** | `estimate_sheet_step_3` |
| **Tour key** | `first_estimate_sheet_v1` |
| **Title** | Line items and costs |
| **Body** | Select an area to see its line items. Each row has a material, quantity, unit cost, and running total. |
| **Target selector** | `[data-tour="ae-tour-estimate-sheet-table"]` |
| **Placement** | `top` |
| **Route** | `/workshop/projects/[projectId]/estimates/[nodeId]` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 3 |

**Copy rationale:** Describes the spreadsheet-like table using terms a contractor recognizes: material, quantity, unit cost, running total. Matches the `estimate-cell` component from `DESIGN.md` § Components.

### Step 4: Component library

| Field | Value |
|-------|-------|
| **Step id** | `estimate_sheet_step_4` |
| **Tour key** | `first_estimate_sheet_v1` |
| **Title** | Insert components |
| **Body** | Drag priced components from the library panel into any estimate row. No need to retype costs. |
| **Target selector** | `[data-tour="ae-tour-estimate-component-library"]` |
| **Placement** | `left` |
| **Route** | `/workshop/projects/[projectId]/estimates/[nodeId]` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 3 |

### Step 5: Export

| Field | Value |
|-------|-------|
| **Step id** | `estimate_sheet_step_5` |
| **Tour key** | `first_estimate_sheet_v1` |
| **Title** | Export a proposal |
| **Body** | When the estimate is ready, export it as an Excel workbook for your client. Find Export in the toolbar. |
| **Target selector** | `[data-tour="ae-tour-estimate-export"]` |
| **Placement** | `bottom` |
| **Route** | `/workshop/projects/[projectId]/estimates/[nodeId]` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 3 |

---

## Segment 4: Component Library Intro (Phase 4)

**Tour key:** `component_library_intro_v1`
**Route:** `/workshop/library`
**Goal:** Understand the reusable component library, how to create and organize cost items, and the relationship between components and estimate sheets.
**Steps:** 3
**Priority:** P2 — fires on first visit to `/workshop/library`.

### Step 1: Library overview

| Field | Value |
|-------|-------|
| **Step id** | `component_library_step_1` |
| **Tour key** | `component_library_intro_v1` |
| **Title** | Component library |
| **Body** | Build and maintain your reusable cost items here. Every component can be inserted into any estimate sheet. |
| **Target selector** | `[data-tour="ae-tour-library-component-grid"]` |
| **Placement** | `auto` |
| **Route** | `/workshop/library` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 4 |

### Step 2: Add a component

| Field | Value |
|-------|-------|
| **Step id** | `component_library_step_2` |
| **Tour key** | `component_library_intro_v1` |
| **Title** | Create a component |
| **Body** | Add materials with supplier, unit cost, category, and pricing date. Attach specs or images if needed. |
| **Target selector** | `[data-tour="ae-tour-library-add-component"]` |
| **Placement** | `bottom` |
| **Route** | `/workshop/library` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 4 |

### Step 3: Organize with folders

| Field | Value |
|-------|-------|
| **Step id** | `component_library_step_3` |
| **Tour key** | `component_library_intro_v1` |
| **Title** | Folder structure |
| **Body** | Group components into folders — by trade, project type, or your own system. Drag to reorder. |
| **Target selector** | `[data-tour="ae-tour-library-folder-tree"]` |
| **Placement** | `right` |
| **Route** | `/workshop/library` |
| **Trigger condition** | Target visible and tour active |
| **Fallback** | Skip step, log event |
| **MVP/Later** | Phase 4 |

---

## Complete Data-Tour Attribute Inventory

All target selectors referenced by tour steps. These attributes must be added to the corresponding UI elements during Phase 2 (Target Markers) of the implementation plan.

### `/workshop` (Workshop Homebase)

| Attribute | Element | Section | Phase |
|-----------|---------|---------|-------|
| `data-tour="ae-tour-workshop-shell"` | Workshop page shell container | Main workspace area | MVP |
| `data-tour="ae-tour-main-nav-workshop"` | MainSidebar navigation component | Left sidebar | MVP |
| `data-tour="ae-tour-homebase-projects-card"` | Projects card/entry on homebase | Homebase bento grid | MVP |
| `data-tour="ae-tour-homebase-components-card"` | Components card/entry on homebase | Homebase bento grid | MVP |

### `/workshop/projects` (Projects List)

| Attribute | Element | Section | Phase |
|-----------|---------|---------|-------|
| `data-tour="ae-tour-projects-search"` | Search input or filter bar | Projects page header | Phase 2 |
| `data-tour="ae-tour-projects-create"` | New project button | Projects page toolbar | Phase 2 |
| `data-tour="ae-tour-new-project-name"` | Project name input field | Create project modal | Phase 2 |
| `data-tour="ae-tour-new-project-image"` | Cover image upload area | Create project modal | Phase 2 |
| `data-tour="ae-tour-new-project-submit"` | Create/submit button | Create project modal | Phase 2 |

### `/workshop/projects/[projectId]/estimates/[nodeId]` (Estimate Sheet)

| Attribute | Element | Section | Phase |
|-----------|---------|---------|-------|
| `data-tour="ae-tour-estimate-tree"` | Estimate tree panel (React Complex Tree) | Left panel | Phase 3 |
| `data-tour="ae-tour-estimate-add-group"` | Add Group button | Tree toolbar | Phase 3 |
| `data-tour="ae-tour-estimate-sheet-table"` | Estimate line item grid/table | Center work surface | Phase 3 |
| `data-tour="ae-tour-estimate-component-library"` | Component library panel | Right dock | Phase 3 |
| `data-tour="ae-tour-estimate-export"` | Export button | Workspace toolbar | Phase 3 |

### `/workshop/library` (Component Library)

| Attribute | Element | Section | Phase |
|-----------|---------|---------|-------|
| `data-tour="ae-tour-library-component-grid"` | Component card grid | Center library area | Phase 4 |
| `data-tour="ae-tour-library-add-component"` | Add component button | Library toolbar | Phase 4 |
| `data-tour="ae-tour-library-folder-tree"` | Folder tree sidebar | Left panel | Phase 4 |

---

## Tooltip Footer Content

Every tooltip in the onboarding system includes a footer with the following elements:

### Standard Footer Layout

```
[Previous (←)]     Step 1 of 5     [Skip]     [Next (→)]
```

### Button Labels

| Button | Label | Icon | Keyboard Shortcut |
|--------|-------|------|-------------------|
| Previous | `Previous` | Phosphor `CaretLeft` (regular, 12px) | ← Left Arrow |
| Next | `Next` | Phosphor `CaretRight` (regular, 12px) | → Right Arrow, Enter |
| Skip | `Skip tour` | None (text link) | Escape |
| Close | `×` | Phosphor `X` (regular, 12px) | Escape |
| Finish (last step) | `Got it` | None (text link) | Enter |

### Footer Visual Spec

Per `DESIGN.md` § Components:

- Background: `surface` (#FFFFFF)
- Border top: `hairline` (#F2F2F2), 1px
- Padding: `sm` (8px) vertical, `md` (12px) horizontal
- Step counter: `app-label` token — SF Pro, 9px, 500 weight, `tertiary` (#7F7F7F) color
- Previous/Next buttons: `app-button` token — SF Pro, 10px, 500 weight, `ink` (#292929) color, `xs` radius (3px)
- Skip link: `app-body-muted` token — SF Pro, 10px, 400 weight, `tertiary` (#7F7F7F) color
- Icons: Phosphor regular weight, 12px, `ink` (#292929)
- Keyboard shortcut hints: `app-label-sm` token — SF Pro, 8px, 400 weight, `tertiary` (#7F7F7F)

---

## Copy Review Checklist

Before implementation, verify every step against these rules:

- [ ] No exclamation marks in titles or bodies
- [ ] No emoji anywhere in tooltip content
- [ ] No generic SaaS words: "streamline", "workflow", "productivity", "unlock", "next-gen", "seamless", "robust", "cutting-edge", "innovative", "revolutionary"
- [ ] Every title is either a noun phrase or a short imperative verb phrase
- [ ] Every body references at least one Archestimator-specific term (project, estimate sheet, component, group, area, line item, library, proposal, export, folder)
- [ ] No step tells the user they "did a great job" or congratulates them
- [ ] Every example name is a realistic construction reference, not placeholder text
- [ ] All font sizes are ≤ 12px and use the app-* typography tokens
- [ ] No font weight outside 400 (regular) or 500 (medium)
- [ ] No negative letter-spacing or arbitrary tracking
- [ ] All color references use `ink` (#292929), `secondary` (#5D5D5D), or `tertiary` (#7F7F7F) tokens only
