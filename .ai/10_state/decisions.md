# Decisions

## Confirmed

- 2026-05-16 — Project name: Archestimator.
- 2026-05-16 — Project folder: `/Users/philiplewis/archestimator`.
- 2026-05-16 — Create `.ai/` before choosing the final tech stack.
- 2026-05-16 — `.ai/` should be the shared intelligence folder for all AI agents, not only one tool.
- 2026-05-16 — Product direction should focus on contractors making construction cost estimating fast, quick, and easy while managing multiple projects and design changes.
- 2026-05-16 — Stack baseline selected for MVP speed: Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4.
- 2026-05-16 — Data layer should be local-first JSON while the model changes rapidly, with repository boundaries prepared for future Supabase/Postgres migration; no Supabase connection until explicitly approved.
- 2026-05-16 — Root `DESIGN.md` created as the agent-readable visual/design-system source of truth; Google DESIGN.md lint passes with 0 errors. Initial Tailwind/DTCG exports live in `.ai/07_design/`.
- 2026-05-16 — GitHub repo created as private under `pjel888/archestimator`; use feature branches/PRs, do not merge to main automatically.
- 2026-05-16 — First interactive MVP slice prioritizes the estimating loop before polish: editable rows, library insertion, live totals, version/proposal side panels.
- 2026-05-16 — Runtime local data uses ignored `data/local/runtime.json`, initialized from tracked `data/local/seed.json`; server-only persistence must stay behind repository/store APIs.
- 2026-05-16 — Proposal issuance creates immutable `proposalSnapshots` and must not mutate the source estimate.
- 2026-05-16 — UI money formatting must use workspace currency, not hard-coded PHP.
- 2026-05-16 — Archestimator will grow an internal UI library from the MVP stage. Prefer shared primitives under `src/components/ui/` over one-off feature markup; do not install Storybook unless explicitly approved.
- 2026-05-16 — Estimate sheet should use Glide Data Grid behind an adapter for the sheet and dnd-kit overlay + explicit row hit-testing for premium library-card drag/drop. Avoid native HTML DataTransfer as the primary UX path because it gives weaker control over drag previews, drop intent, and no-layout-shift behavior. Avoid Handsontable without license review.
- 2026-05-16 — Proposal snapshots store editable commercial terms and route to print-ready `/proposals/[proposalId]` pages for browser print/PDF before adding a dedicated PDF engine.

## Working decisions / likely direction

- Start with contractor-first estimating, not broad construction project management.
- Salvage the legacy estimate-sheet, project/area/line-item, material library, and revision concepts.
- Defer full supplier bidding, FF&E/specs/planner/viewer, and complex permissions until the estimating wedge is validated.
- Treat the material/cost library as a first-class estimating surface, not just settings.
- Library items should be reusable sources/templates; estimate rows should be editable instances with snapshots, local overrides, and unlink/detach behavior.
- Support both a master workspace library and project-specific library items so one-off negotiated/project pricing does not pollute reusable company data.
- Treat the client-ready proposal package as a core output, not an afterthought or simple printout.
- Treat project/estimate versioning as a core product system because construction scope changes constantly; version history should feel Notion-like but use contractor-friendly labels.
- Use separate concepts for autosave history, named estimate versions/revisions, issued proposal snapshots, library item versions, and project timeline events.
- Restore should create a copy by default; issued proposals should never be silently mutated.
- Before MVP screen architecture or implementation, create a root `DESIGN.md` as Archestimator's agent-readable visual/design-system source of truth and validate it with `npx -y @google/design.md lint DESIGN.md`.
- Use Programa.design as conceptual inspiration for polished professional workflow software: modernized spreadsheets, reusable libraries, live source-of-truth links, client dashboards, and a calm design-system-driven interface; do not copy its interior-design domain or assume live updates can replace estimating audit snapshots.
- Proposal exports should include estimate summary, detailed BOQ when needed, proposal letter, terms, exclusions, owner-supplied items, validity, duration, warranty, and signature/conforme blocks.
- Estimate rows should support scope statuses such as included, excluded, owner-supplied, OSCI, by-others, N/A, provisional, to-follow, and verify-architect because these are contractor risk controls.

## Assumptions to revisit

- Stack will likely be Next.js with Bun, but this is not finalized.
- The first MVP should likely target small-to-mid contractors rather than enterprise estimators.
- Local cost libraries may be more valuable if user-editable than if presented as authoritative prices.

## Open questions

- What is the first MVP estimation workflow?
- Who is the primary first user: residential contractors, fit-out contractors, small commercial contractors, general contractors, or design-build firms?
- What geography and pricing basis should v1 use?
- Should v1 include AI generation, AI review, or no AI until the estimate sheet is strong?
- What export format is mandatory first: PDF, Excel, CSV, branded quote, or BOQ?
