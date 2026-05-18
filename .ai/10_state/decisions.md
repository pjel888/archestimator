# Decisions

## Confirmed active decisions

- 2026-05-16 — Project name: Archestimator.
- 2026-05-16 — Project folder: `/Users/philiplewis/archestimator`.
- 2026-05-16 — `.ai/` is the shared intelligence folder for all AI agents, not only one tool.
- 2026-05-16 — Product direction should focus on contractors making construction cost estimating faster and easier while managing multiple projects and design changes.
- 2026-05-16 — Stack baseline for now: Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4.
- 2026-05-16 — No Supabase/Postgres connection until Philip explicitly approves.
- 2026-05-16 — Root `DESIGN.md` is the agent-readable visual/design-system source of truth.
- 2026-05-16 — GitHub repo is private under `pjel888/archestimator`; use feature branches/PRs, do not merge to main automatically.
- 2026-05-17 — Reset decision: Philip rejected the then-current Archestimator app/workshop prototype UX/UI. The immediate reset preserved only the landing page and reduced `/workshop` to a reset placeholder before later scoped slices were added.
- 2026-05-17 — Delete the previous project dashboard, estimate editor, component library, proposal, revision, local-first data, shell, and route-family implementation. Do not restore deleted prototype routes for compatibility; any post-reset routes must be treated as new scoped slices.
- 2026-05-17 — Future app work must begin from a small approved screen brief and one focused workflow.
- 2026-05-17 — Do not add fake SaaS maturity: no broad route families, dashboards, module nav, settings, proposal systems, component libraries, complex data repositories, grid/drag-drop packages, or prototype tests until the new UX direction is accepted.
- 2026-05-18 — Agent performance recovery is now a canonical project rule. If Philip reports degraded quality, stale behavior, confusion, or repeated mistakes, agents must run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before planning or coding.
- 2026-05-18 — Current repo state supersedes the blank-workshop snapshot where they conflict. The reset remains the quality guardrail, but the repo now contains a small post-reset workshop slice under `/workshop/projects`, `/workshop/projects/[projectId]`, `/workshop/projects/[projectId]/estimates`, `/workshop/projects/[projectId]/estimates/[nodeId]`, and `/workshop/components`. Treat those as current implemented surfaces, not approval to restore the full deleted prototype.
- 2026-05-18 — Current active orientation plan: `.ai/03_plans/current-post-reset-workshop-slice.md`.
- 2026-05-18 — Estimate hierarchy model: a project can contain multiple Lot Groups. The canonical nesting is `Lot Group > Structure Group > Floor Group > Area Group > EstimateNodeRowItem`. Only Area Groups may contain estimate row items. Lot, Structure, and Floor groups may also contain Area Groups directly when the work scope does not need the intermediate levels.

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
- What export format is mandatory first: PDF, Excel, CSV, branded quote, or BOQ?

- 2026-05-18: Non-landing typography cap. App/workshop/product UI must not use large marketing typography; 12px is the maximum outside the landing page, with 10px as the normal body/control/table/button size and 8-9px for meta labels. Landing/editorial tokens remain landing-only.
