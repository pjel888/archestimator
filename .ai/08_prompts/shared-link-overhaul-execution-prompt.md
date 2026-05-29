# Archestimator Agent Execution Payload: Shared Link Overhaul Loop

**Instruction:** You are directed by the user to execute the **Project Shared Link Overhaul** according to the plan files in `.ai/03_plans/project-shared-link-overhaul/`. You must loop indefinitely, phase-by-phase, until all requirements are implemented, verified, and fully documented.

---

## 1. Ground Truth & Pre-Flight Checks
Before writing any code or updating any config:
1. Thoroughly read the North Star Vision and boundaries in `.ai/03_plans/project-shared-link-overhaul/README.md`.
2. Review the core agent rules in `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`.
3. Check the current codebase state in `.ai/10_state/current-state.md` and the roadmap in `.ai/01_roadmap/README.md`.
4. Inspect `git status --short --branch` to ensure you are on the correct active branch.

---

## 2. Phased Implementation Loop
Execute the phases defined in `.ai/03_plans/project-shared-link-overhaul/06-implementation-phased-plan.md` sequentially. For each phase, run this loop:

### Step 2.1: Plan & Conduct Impact Analysis
- Use GitNexus or code-review-graph tools to audit files to be modified.
- **Mandatory Impact Check**: Run `gitnexus_impact` or graph callers/callees queries on any existing function, class, or method before editing. Report risk levels and callers to the user.
- Create or update the active task checklist in `.ai/04_tasks/` (e.g., `shared-link-overhaul-tasks.md`) to list every discrete step for this phase.

### Step 2.2: Implement & Refine (Zero-Placeholder Rule)
- Implement frontend components, server actions, and API routes.
- If schema updates are needed, write migration scripts following the schemas in `.ai/03_plans/project-shared-link-overhaul/04-data-model-and-schema-plan.md`.
- **UI & Typography Rules (from `DESIGN.md` & `AGENT_OPERATING_PROTOCOL.md`)**:
  - Fonts: SF Pro, regular/medium weights only. Visible titles $\le$ `12px`, input/button/table/body $\approx$ `10px`, subtitles $\approx$ `11px`, helper text $\approx$ `8-9px`.
  - Border radius: Strictly `xs` (`3px`) only. No standard Tailwind roundings.
  - Colors: `#292929` (strong text), `#5D5D5D` (default), `#7F7F7F` (subtle), `#F5F5F5` (selected bg), `#F2F2F2` (border).
  - Icons: Regular 1px-outline style iconography.
  - Controls: Reuse existing components in `src/components/ui/` first before creating custom ones.
  - No TODOs, empty blocks, or skeleton components left behind.

### Step 2.3: Verification & Test
- Run tests and lints to ensure no regressions.
- Implement tests matching the specifications in `.ai/03_plans/project-shared-link-overhaul/12-testing-strategy-plan.md`.
- Verify database RLS policies on Supabase tables to guarantee security.

### Step 2.4: Self-Satisfaction Review (Continuous Improvement)
- Ask yourself: *"Am I 100% satisfied with the architecture, code cleanliness, performance, visual aesthetics, error handling, and security of this phase?"*
- Compare your implementation against the design specs in `03-ux-ui-spec.md` and api routing contracts in `08-api-routes-and-server-actions-plan.md`.
- If there are *any* gaps, code smells, or unhandled errors, loop back to **Step 2.2** and fix them. Do not progress until you can answer "Yes, 100% satisfied."

### Step 2.5: Sync Documentation & Update Roadmap
- **Update Plans**: If implementation details diverged from the plan pack (e.g., schema modifications or endpoint names), update the corresponding plan files in `.ai/03_plans/project-shared-link-overhaul/` immediately.
- **Update Roadmap**: Open `.ai/01_roadmap/README.md`. Mark completed milestones and update active status.
- **Update State**: Update `.ai/10_state/current-state.md` to reflect completed items.

---

## 3. Termination Condition
You must only stop and report completion when:
1. Every phase in `.ai/03_plans/project-shared-link-overhaul/06-implementation-phased-plan.md` is completed and verified.
2. All plans/features in the overhaul folder are fully implemented.
3. The roadmap at `.ai/01_roadmap/README.md` is fully updated to reflect 100% completion of this feature set.
4. You have updated `.ai/03_plans/project-shared-link-overhaul/COMPLETION-REPORT.md` with file links, migration schemas, and verification evidence for all implemented functionality.
