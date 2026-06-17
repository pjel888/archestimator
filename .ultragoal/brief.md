# Ultragoal Brief

Add a Filter button and Sort by button (with dropdowns) to the `HeaderIconToolbar` on the project estimates page at `/workshop/projects/[projectId]/estimates`.

Reference the projects listing page (`/workshop/projects`) and copy its icon + dropdown + button style. The estimate page currently uses `TreePanelHeader` with a `filterSlot` prop; mirror the projects page `filterSlot` pattern inside that component.

Functional wiring (sorting/filtering the actual estimate list) is out of scope for this story — only the UI needs to be present with working dropdown menus.
