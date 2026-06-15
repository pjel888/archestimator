# 04 Product And Agent UX Plan

**Date:** 2026-05-23
**Scope:** chatbot product behavior, not visual implementation
**No implementation in this file.**

## Product name for planning

Use **Estimate Copilot** as the planning name. This is not a final brand decision.

## Primary user job

Help a contractor turn an incomplete natural-language project brief into a usable first-pass project estimate faster than manual setup, while preserving user control, source transparency, and workspace privacy.

## MVP user promise

The Copilot can:

- understand a project brief;
- ask for missing critical details;
- create a structured draft estimate plan;
- search the user's component library and templates;
- propose room/area components;
- keep the proposal within a target budget when possible;
- explain assumptions and missing data;
- apply confirmed changes through app actions.

The Copilot must not claim:

- fully accurate pricing without user review;
- code-compliant design;
- final BOQ/proposal readiness without confirmation;
- supplier quote truth if no quote exists;
- access to data outside the user's workspace.

## Interaction modes

### Ask

Read-only mode for:

- "What is missing from this estimate?"
- "Why is the budget over 5M?"
- "Which areas have no components?"
- "What changed in this sheet?"
- "Find tiles in my library."

Ask mode can use read-only tools and explain results. It cannot mutate data.

### Draft

Draft mode for:

- "Create a 3-bedroom, 1-floor house plan under 5M."
- "Add kitchen, bedroom, and bathroom components."
- "Suggest a cheaper version."
- "Use my templates if possible."

Draft mode returns a structured preview:

- project metadata draft;
- estimate sheet draft;
- tree draft;
- row-item draft;
- budget allocation;
- assumptions;
- warnings;
- source confidence;
- missing inputs.

Draft mode writes nothing unless the user explicitly chooses Apply.

### Apply

Apply mode executes confirmed patches. For the first approved Apply slice, only these writes are in scope:

- create project;
- create estimate shell.

The following remain Draft-only until a later approved phase: insert template, create tree nodes, insert estimate rows, update row quantities, and update costs.

Apply mode must show a reviewable patch first and record an audit trail.

## Ideal workflow for the user's example

User:

> I have a 3 bedroom house project, 1 floor. Please create the project and fill up the sheets and the estimate sheet as well, fill up the components. I only have 5 million pesos for my budget.

Expected Copilot behavior:

1. Parse known facts:
   - residential house;
   - 3 bedrooms;
   - 1 floor;
   - budget PHP 5,000,000;
   - needs project, estimate sheet, components.
2. Identify missing but not blocking facts:
   - location;
   - floor area;
   - finish level;
   - number of bathrooms;
   - kitchen/laundry/service areas;
   - structural assumptions;
   - pricing basis.
3. Ask at most one critical clarification if needed, or proceed with a clearly labeled draft if the user asks to proceed.
4. Search user's templates and component library.
5. Prefer existing templates/components.
6. Draft a tree:
   - General Requirements;
   - Site Works;
   - House;
   - Living/Dining;
   - Kitchen;
   - Bedroom 1;
   - Bedroom 2;
   - Bedroom 3;
   - Bathroom(s);
   - Laundry/Service if assumed;
   - Exterior/Envelope;
   - Electrical/Plumbing allowances as appropriate.
7. Draft rows per Area Node:
   - kitchen items in Kitchen;
   - bedroom finishes/doors/windows/electrical in bedrooms;
   - bathroom/sanitary/plumbing in bathrooms;
   - general requirements in General Requirements.
8. Show budget summary:
   - target budget;
   - estimated draft total;
   - under/over variance;
   - unpriced/allowance rows;
   - confidence warnings.
9. Ask for confirmation before creating anything.

## UX requirements

- The Copilot should be visible inside the protected workshop/estimate context, not on public pages.
- Phase 2 placement should be `/workshop/projects/[projectId]/estimates/[nodeId]` as a right-dock mode/tab that is mutually exclusive with the Library/Templates panel. Do not add a fourth column.
- It should understand the current route context: project, estimate, selected node, and visible library.
- It should show proposed changes as a structured patch, not only prose.
- It should allow selective review. Selective Apply starts with project + estimate shell only; tree/row/template Apply is future scope.
- It should show "why" for important placement decisions.
- It should label inferred costs and quantities.
- It should offer "ask me first" behavior when confidence is low.
- It should never hide errors behind cheerful copy.

## UI shell and visual standards

The first Copilot surface should follow the current app/workshop design system, not a new marketing-scale assistant UI:

- visible text in product/workshop UI must stay within the 12px maximum in `DESIGN.md`;
- normal chat, patch, table, and control text should use the existing 10px app rhythm;
- the Copilot must live inside the protected fixed-shell workspace contract, with one internal scroll surface instead of page-level overflow;
- route placement should start from the estimate workspace and current `/workshop` routes, not public pages or deleted prototype route families;
- controls should reuse `src/components/ui/` and `src/components/workshop/` primitives before introducing local chatbot-only markup;
- proposed changes should be rendered as dense, reviewable diffs/tables/lists before any decorative visualization.
- the right dock should preserve the existing component-library width rhythm and include states for collapsed trigger, Ask chat, Draft preview, validation errors, confirmation, and post-Apply audit result.
- narrow/mobile Copilot behavior is deferred until the desktop right-dock flow passes.

Accessibility requirements:

- Copilot dock has a named landmark/region.
- Keyboard can open, close, and move focus into and out of the dock.
- Closing the dock returns focus to the trigger.
- Streaming responses use a polite live region for completed chunks/status, not token-by-token screen-reader spam.
- Selectable patch rows are keyboard-operable.
- Confirmation uses modal focus trapping and `alertdialog` semantics when the action mutates persisted records.
- Assumptions, warnings, confidence, and source labels are available to screen readers.

Visualization guidance:

- MVP Ask/Draft/Apply does not require a new graph package. A structured patch preview is the safer first UI.
- No `@xyflow/react` proof of concept should start until table/list patch preview passes usability, overflow, and auditability checks.
- Keep the existing `@nivo/pie` boundary for `/workshop/projects/[projectId]/charts`; do not repurpose it as the Copilot workflow renderer.
- If a later approved slice needs an interactive plan graph, prefer `@xyflow/react` over custom D3 because it is purpose-built for node-based editors and interactive flow charts.
- Mermaid is useful for static documentation diagrams in `.ai` plans, but it should not be added to the app bundle for the first Copilot UI.
- D3 should remain a later option for bespoke analytics where the app needs custom layout/math, not the first agent-plan UI dependency.

## MVP non-goals

- Voice.
- Autonomous background project creation.
- Cross-workspace recommendations.
- Deleting user data.
- Live collaboration/realtime channels.
- Training custom models.
- Full drawing/spec takeoff from PDFs.
- Code compliance guarantee.
- Supplier purchasing automation.
- Final issued proposal without user review.

## UX readiness gates

- [ ] User can see exactly what will be created or edited before Apply.
- [ ] User can reject or partially apply a draft.
- [ ] Every AI-created row is marked with source/confidence metadata.
- [ ] The app distinguishes estimate facts, assumptions, and unverified AI suggestions.
- [ ] Errors are actionable and tied to the failed tool/action.
