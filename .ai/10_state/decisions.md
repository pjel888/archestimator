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
- 2026-05-17 — Reset decision: Philip rejected the current Archestimator app/workshop prototype UX/UI. Preserve only the landing page and an intentionally empty `/workshop` page.
- 2026-05-17 — Delete the previous project dashboard, estimate editor, component library, proposal, revision, local-first data, shell, and route-family implementation. Do not restore deleted prototype routes for compatibility.
- 2026-05-17 — Future app work must begin from a small approved screen brief and one focused workflow.
- 2026-05-17 — Do not add fake SaaS maturity: no broad route families, dashboards, module nav, settings, proposal systems, component libraries, complex data repositories, grid/drag-drop packages, or prototype tests until the new UX direction is accepted.

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
