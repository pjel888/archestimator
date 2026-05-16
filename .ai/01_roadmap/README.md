# Archestimator Roadmap

**Last updated:** 2026-05-17

## Product wedge

Archestimator is a contractor-first estimating workspace for producing, revising, and packaging construction estimates faster than Excel-heavy workflows without becoming a full enterprise construction suite.

## Operating rules

- Philip is the principal decision-maker.
- Agents may proceed in autopilot mode within documented scope.
- Do not merge to `main`, deploy, connect Supabase, or push production data without explicit approval.
- Keep `DESIGN.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, and `.ai/10_state/execution-ledger.md` updated after meaningful slices.
- Every implementation slice needs evidence: tests/build/lint/manual visual check or an explicit reason why a gate does not apply.

## Phase 0 — Product definition and research

**Status:** Mostly complete.

Delivered:

- Product thesis.
- Legacy repo lessons.
- Competitor and package research.
- MVP UX flow.
- Proposal package system spec.
- Estimate versioning system spec.
- Design-system workflow and root `DESIGN.md`.

Remaining decisions:

- First MVP project type: residential, renovation, fit-out, small commercial, or broader contractor work.
- Pricing/source policy: user-owned library first vs seeded demo/local references.
- AI role in v1: assistant, import/parser, reviewer, or deferred.
- First export priority: browser PDF, XLSX, CSV, branded quote, or BOQ.

## Phase 1 — MVP foundation

**Status:** Complete enough for active product slices.

Delivered:

- Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4 app shell.
- Local-first JSON persistence behind repository/store APIs.
- Project dashboard and project workspace route.
- Create-project flow with initial draft estimate.
- Reusable UI primitives under `src/components/ui/`.
- Proposal snapshot model and print-ready proposal route.
- Root `DESIGN.md` and token exports.

## Phase 2 — Estimating core hardening

**Status:** Active.

Delivered:

- Editable estimate workspace.
- Library insertion and link-state concepts.
- Glide Data Grid + dnd-kit spike.
- Drop-targeting UX micro-spike with pointer hit-testing and insertion-line feedback.
- Production bridge separating working spaces from proposal sections.

Next:

- Promote spike grid into the production estimate workspace.
- Add explicit row classification UI for proposal section assignment.
- Add row move/copy operations between spaces.
- Add validation warnings for unassigned proposal sections before issuing proposals.
- Add revision/diff semantics for moved spaces vs changed BOQ/proposal grouping.

## Phase 3 — Proposal package v1

**Status:** Partially implemented, needs hardening.

Delivered:

- Editable proposal terms.
- Immutable proposal snapshots.
- Print-ready proposal route.
- Proposal summaries now support consolidation by proposal section instead of only working space.

Next:

- Proposal detail mode with optional space/location column.
- Exclusions/OSCI/by-others annexes.
- Issue/supersede flow.
- Browser print/PDF visual hardening.

## Phase 4 — MVP readiness

**Status:** Later.

Focus:

- Cost library management surface.
- CSV/XLSX import/export.
- QA matrix and sample workflow testing.
- Landing page and onboarding narrative.
- Deployment decision only after Philip approves.
