# Decisions

## Confirmed active decisions

- 2026-05-16 — Project name: Archestimator.
- 2026-05-16 — Project folder: `/Users/philiplewis/archestimator`.
- 2026-05-16 — `.ai/` is the shared intelligence folder for all AI agents, not only one tool.
- 2026-05-16 — Product direction should focus on contractors making construction cost estimating faster and easier while managing multiple projects and design changes.
- 2026-05-16 — Stack baseline for now: Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4.
- 2026-05-16 — Superseded on 2026-05-18: no Supabase/Postgres connection until Philip explicitly approves.
- 2026-05-18 — Philip approved the state/database direction: Supabase/Postgres for canonical persisted data, TanStack Query for server/cache/optimistic mutation state, and Zustand for high-frequency UI state. The earlier dnd-kit drag/drop direction was superseded on 2026-05-20 by removing estimate-tree drag/drop reorganization. Archestimator must use its own Supabase project (`ebxxqidacheyapmmzavr`) and must not share the SlateCamp database. The first schema foundation covers workspaces, workspace members, projects, estimates, cost library items, estimate nodes, and estimate row items with RLS enabled from the first migration.
- 2026-05-16 — Root `DESIGN.md` is the agent-readable visual/design-system source of truth.
- 2026-05-16 — GitHub repo is private under `pjel888/archestimator`; use feature branches/PRs, do not merge to main automatically.
- 2026-05-17 — Reset decision: Philip rejected the then-current Archestimator app/workshop prototype UX/UI. The immediate reset preserved only the landing page and reduced `/workshop` to a reset placeholder before later scoped slices were added.
- 2026-05-17 — Delete the previous project dashboard, estimate editor, component library, proposal, revision, local-first data, shell, and route-family implementation. Do not restore deleted prototype routes for compatibility; any post-reset routes must be treated as new scoped slices.
- 2026-05-17 — Future app work must begin from a small approved screen brief and one focused workflow.
- 2026-05-17 — Do not add fake SaaS maturity: no broad route families, dashboards, module nav, settings, proposal systems, component libraries, complex data repositories, grid/drag-drop packages, or prototype tests until the new UX direction is accepted.
- 2026-05-18 — Agent performance recovery is now a canonical project rule. If Philip reports degraded quality, stale behavior, confusion, or repeated mistakes, agents must run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before planning or coding.
- 2026-05-18 — Current repo state supersedes the blank-workshop snapshot where they conflict. The reset remains the quality guardrail, but the repo now contains a small post-reset workshop slice under `/workshop/projects`, `/workshop/projects/[projectId]`, `/workshop/projects/[projectId]/estimates`, `/workshop/projects/[projectId]/estimates/[nodeId]`, and `/workshop/components`. Treat those as current implemented surfaces, not approval to restore the full deleted prototype.
- 2026-05-18 — Current active orientation plan: `.ai/03_plans/current-post-reset-workshop-slice.md`.
- 2026-05-18 — Superseded by the 2026-05-20 two-node estimate tree decision: the earlier linear hierarchy model was `Lot Group > Structure Group > Floor Group > Area Group > EstimateNodeRowItem`.
- 2026-05-18 — Superseded by the 2026-05-20 two-node estimate tree decision: the earlier General Node refinement limited General Nodes to other General/Area nodes.
- 2026-05-18 — Supabase Auth is active for protected workshop routes. Auth follows the SlateCamp pattern: request-scoped Supabase server client, middleware session refresh/gating, magic-link login, profile bootstrap from `auth.users`, and role-based owner access. `philipjonlewis@gmail.com` is the canonical CEO email and is automatically assigned `ceo` role with platform-wide RLS access. Do not log or expose auth secrets.
- 2026-05-20 — Local-only dev auth bypass is permitted for browser/agent inspection of protected Archestimator routes without interactive login. It must be disabled by default, require `NODE_ENV !== "production"`, be gated to localhost in proxy, require `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`, `ARCHESTIMATOR_DEV_AUTH_EMAIL`, and server-only `SUPABASE_SERVICE_ROLE_KEY`, and must never expose or commit the service-role key.
- 2026-05-18 — UI density is mandatory outside the landing page: visible app/workshop/product typography must not exceed 12px; normal controls/body/table/input/button text should be around 10px, subtitles around 11px, and meta labels around 8–9px.
- 2026-05-18 — Reusable UI components are mandatory. Agents must check `src/components/ui` first, reuse or extend shared primitives/components for buttons, icon buttons, search inputs, cards, chips, tabs, filters, dropdowns, panels, and repeated controls, and create a shared primitive before adding a repeated feature-local control. No feature-local search input, raw button, ad hoc icon button, duplicated dropdown, or one-off control is acceptable unless it is a truly one-use layout element. `.ai/03_plans/ui-componentization-and-storybook-plan.md` is the active component matrix and Storybook organization plan.
- 2026-05-18 — Live project and estimate bootstrap is active MVP scope. Project creation, live project cards, project dashboard loading, estimate list/create, and initial estimate hierarchy bootstrap are implemented behind authenticated Supabase workspace boundaries. Keep `.ai/06_specs/live-project-estimate-bootstrap.md` and `.ai/01_roadmap/README.md` current after every slice.
- 2026-05-19 — Project cards on `/workshop/projects` are vertical media cards, not icon cards. Project status is intentionally not part of the project model and the `projects.status` database column was removed by `supabase/migrations/20260519001000_remove_project_status.sql`; estimate status remains separate. Until dedicated schema columns are added, editable project budget and project image URL are stored in `projects.metadata.projectBudget` and `projects.metadata.projectImageUrl` through the project details modal.
- 2026-05-18 — Remote demo seed data belongs to Philip's authenticated Archestimator profile only. Migration `supabase/migrations/20260518110000_attach_philip_seed_data.sql` attaches the seeded project, baseline estimate, cost-library items, estimate nodes, and estimate row item to profile UUID `4e23801d-6fc2-4886-b980-d15ca2b164b8` through that profile's default workspace. Do not make this seed global or visible to other emails.
- 2026-05-19 — The deterministic demo project/estimate IDs now represent Lewis Residence. Migration `supabase/migrations/20260519173857_populate_lewis_residence_estimate_tree.sql` seeds a tree-only hierarchy with top-level `General Requirements`, `Site Works`, and `Lot`; `Lot` contains `House` and `Services House`. The migration intentionally does not insert estimate row items because the current request is tree population only.
- 2026-05-19 — Superseded on 2026-05-20: estimate tree reordering used an optimistic move pipeline backed by `public.move_estimate_nodes`.
- 2026-05-20 — Estimate workspace node selection must be immediate and route-independent at interaction time. The selected node is high-frequency UI state owned by a scoped Zustand store keyed by estimate id; route navigation remains the deep-link/server reconciliation layer, and Supabase remains canonical persistence.
- 2026-05-20 — Estimate tree uses exactly two active technical node kinds: Group Nodes (`kind = group`) and Area Nodes (`kind = area`). Group Nodes organize the tree, may nest other Group Nodes, and may contain Area Nodes. Area Nodes are row-owning leaves and are the only nodes that may contain estimate row items; Area Nodes cannot contain child nodes. Lot, General Requirements, House, Floor, Phase, Trade, or similar domain organization labels are user/UX content on Group Nodes, not separate technical node kinds. Existing/legacy `lot`, `general`, `structure`, `level`, and `assembly` enum values are not active tree kinds; migration `20260520222038_enforce_two_kind_estimate_nodes.sql` normalizes existing estimate-node rows with those values to `group` and validates an `estimate_nodes_active_kind_check` constraint allowing only `group | area`. Client validation, add-node parent choices, app/domain read paths, generated Supabase enum compatibility, and database constraint triggers must stay in sync.
- 2026-05-20 — Superseded later on 2026-05-20: Estimate tree drag/drop must not be the only way to move nodes. The single-pointer Move action/modal was removed pending a better replacement.
- 2026-05-20 — Estimate-tree drag/drop reorganization is removed completely. The tree now supports navigation, route selection, expand/collapse, and add-node creation only; it has no drag/drop reorder UI, drop zones, drop previews, optimistic move pipeline, `moveEstimateNode` server action, or `public.move_estimate_nodes` RPC. The removed single-pointer Move button/modal must not be restored as-is. A future move workflow requires a fresh design.
- 2026-05-20 — Philip requested the fresh replacement-design plan for seamless React Complex Tree drag/drop estimate-tree reorganization. `.ai/03_plans/estimate-tree-dnd-reorganization/` is now the active implementation planning source for reintroducing this workflow, but the feature is not implemented yet. Implementation must not restore the old single-pointer Move modal/button as-is and must deliberately add a new atomic persistence path after the prior `move_estimate_nodes` removal.
- 2026-05-20 — Philip's available AI bench includes Codex, Claude, OpenCode, CommandCode, Gemini, and Kimi. Kimi is especially strong for frontend/product UI work and long-context synthesis. Ollama is not an approved agent LLM lane; only the nomic embedding model used by ChunkHound is approved for active Ollama use unless Philip explicitly approves and documents a local chat model.
- 2026-05-19 — Public landing feature copy should use recognizable product-feature anchors plus plain benefit lines: Estimate Workspace, Component Library, Revision Intelligence, Proposal Comparisons, Visual Cost Breakdowns, Proposal-Ready Outputs, and Industry Standard Export Formats. Fake logos/testimonials should not appear on the public homepage until they are real; use workflow pillars, feature proof, honest MVP-preview framing, and the secondary below-hero claim “The most intuitive way to create construction cost estimates” supported by concrete workflow proof.

## Superseded decisions

The following earlier decisions are historical context only after the 2026-05-17 reset:

- `/workshop` route family with project dashboard, estimate list, estimate workspace, project modules, and global Component Library.
- Explicit estimate route selection at `/workshop/projects/:projectId/estimates/:estimateId`.
- True selected-node estimate hierarchy state for section/floor/space.
- Right-sidebar component picker and selected-context insertion rules.
- Custom v4-style editable table/list as the active MVP editor.
- Glide Data Grid / dnd-kit migration or spike direction.
- Local-first JSON repository/mutation layer as active implementation.
- Proposal snapshot route and revision/versioning UI as active implementation.
- Login/signup visual prototype routes.
- Legacy redirects for removed routes.

These concepts can be reconsidered later, but they must be reapproved through a fresh plan before implementation.

## Working product principles to preserve later

- Contractor-first estimating remains the wedge.
- Avoid broad construction project management until the estimating workflow is validated.
- Estimates must preserve assumptions, pricing dates, confidence/source notes, and user editability once estimating functionality returns.
- Issued proposals/exports must be immutable snapshots if proposal functionality returns.
- Cost/library items should not silently mutate copied estimate rows if the library concept returns.
- Proposal exports should clearly handle inclusions, exclusions, owner-supplied items, OSCI/by-others, validity, duration, warranty, and signature/conforme blocks if proposal functionality returns.

## Open questions

- What is the first restart workflow?
- Who is the primary first user: residential contractors, fit-out contractors, small commercial contractors, general contractors, or design-build firms?
- What geography and pricing basis should v1 use?
- Should v1 include AI generation, AI review, or no AI until the estimate sheet is strong?
- Which additional export formats beyond industry-standard Excel and PDF are needed later?
