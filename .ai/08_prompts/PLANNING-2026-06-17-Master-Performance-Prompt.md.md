# Archestimator Codebase AI Prompt: Performance Refactor Plan Pack

Copy/paste this entire prompt into the codebase AI.

---

# Goal: Create the Archestimator Performance Refactor Plan Pack

You are working inside:

`/Users/philiplewis/Documents/archestimator`

This is a **planning-only task**. Do **not** refactor source code yet. Do **not** change implementation files unless the file is inside the plan directory requested below. Your job is to crawl the whole codebase, absorb the performance research, inspect the actual repo, and create a comprehensive phased refactor plan pack.

The research backbone already exists here:

`/Users/philiplewis/Documents/archestimator/.ai/13_research/2026-06-17-Master-Performance`

Create the full planning output here:

`/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-17-Performance-Refactor`

This plan pack must become the operating manual for a slow, disciplined, phase-by-phase refactor of Archestimator into a faster, cleaner, more scalable React / Next.js codebase.

---

## Prime Directive

Do not produce generic React advice. Everything must be tailored to this repo.

You must inspect the actual codebase and produce plans that reference concrete files, modules, components, hooks, stores, server actions, repositories, tests, and scripts.

The final plan must answer:

1. What is slow, risky, duplicated, or structurally expensive today?
2. Which repeated patterns should become canonical repo-wide primitives or kernels?
3. Which refactors should happen first, second, third, and why?
4. What exact files or folders are likely involved in each phase?
5. What evidence and validation will prove each phase worked?
6. What must not be changed yet because it is too risky, under-measured, or dependent on another phase?

---

## Required Reading Before Planning

Start by reading these files/directories:

```txt
AGENTS.md
README.md
DESIGN.md
package.json
next.config.ts
tsconfig.json
eslint.config.mjs

.ai/10_state/current-state.md
.ai/10_state/decisions.md
.ai/13_research/2026-06-17-Master-Performance
```

Then inspect these code areas deeply:

```txt
src/app
src/components
src/hooks
src/stores
src/lib
src/features
tests
e2e
scripts
supabase/migrations
```

Pay special attention to:

```txt
src/components/workshop/EstimateWorkspaceClient.tsx
src/components/workshop/EstimateSheetTree.tsx
src/components/workshop/EstimateSheetContent.tsx
src/components/ui/tree.tsx
src/components/workshop/estimate-sheet
src/components/workshop/component-library
src/hooks/use-estimate-query.ts
src/hooks/use-estimate-row-mutations.ts
src/hooks/use-estimate-workspace-state.ts
src/stores
src/lib/repositories
src/lib/estimates
src/lib/workshop/virtualization-flags.ts
```

---

## Working Method

Use the shortest safe path, but be thorough. This is an architecture-planning task, not a quick cleanup.

Use `rg`, file reads, dependency tracing, import/caller checks, tests inventory, and existing repo docs. If tools like GitNexus, code-review-graph, LSP diagnostics, or symbol indexes are available, use them for broad architecture mapping, but do not depend on them exclusively.

For every major claim, include concrete evidence:

```txt
path/to/file.tsx:line-range — what you observed
```

Avoid vague findings like “some components are large” or “state can be optimized.” Instead say:

```txt
src/components/workshop/EstimateSheetContent.tsx currently owns query loading, editable rows,
proposal preview signatures, export UI, sidebar orchestration, activity history, and sheet rendering.
This makes it a high-blast-radius component and should be split by responsibility in Phase X.
```

---

## Important Constraints

This is not the refactor. This is the planning package.

Allowed changes:

```txt
.ai/03_plans/2026-06-17-Performance-Refactor/**
```

Disallowed changes:

```txt
src/**
tests/**
e2e/**
scripts/**
supabase/**
package.json
next.config.ts
tsconfig.json
README.md
DESIGN.md
AGENTS.md
```

Do not run destructive database actions. Do not apply migrations. Do not touch Supabase provider state. Do not mutate production/provider resources. Do not expose secrets.

You may recommend future migrations, indexes, RPC changes, or schema improvements, but only as planning items with risk level and validation requirements.

---

## Core Planning Lens

The central architectural idea is this:

Small-scale UI differences should not hide large-scale structural sameness.

For example, a tree may appear as:

```txt
estimate tree
component library tree
template/project-source tree
folder tree
activity-scope tree
taxonomy tree
navigation tree
```

Each tree has different domain behavior, but the repo should not keep re-solving the same underlying problems:

```txt
indexing
flattening
ancestor/descendant lookup
filtering
selection
cascade selection
virtualization
drag/drop validation
expanded-state persistence
optimistic insert/delete/rename/reorder
server reconciliation
path/breadcrumb derivation
row presentation
```

Find more patterns like this across the codebase. The output should identify repeatable kernels, contracts, and phased extraction opportunities across the whole repo.

---

## Areas To Investigate

### 1. React / Next.js architecture

Audit:

```txt
Server Components vs Client Components
"use client" boundary placement
dynamic imports
route loading behavior
Suspense usage
server action usage
router.refresh usage
shallow URL/state sync
Next cache usage
Next config performance settings
bundle analyzer readiness
```

Look for:

```txt
oversized client components
client components importing server-heavy modules
unnecessary route remounts
loading skeletons that hide avoidable work
overuse of global providers
expensive client-only orchestration
missing streaming opportunities
missing server projections
```

### 2. State architecture

Audit:

```txt
TanStack Query usage
query keys
staleTime/gcTime choices
optimistic mutation flows
Zustand store shapes
selector granularity
high-frequency UI state
derived state recomputation
local component state sprawl
```

Look for:

```txt
server state living in Zustand
UI state living in TanStack Query
large object subscriptions
arrays used where sets/maps would be cheaper
duplicated optimistic reconciliation logic
mutation rollback patterns that should be standardized
```

### 3. Tree / hierarchy architecture

Audit every tree-like shape in the repo.

For each tree family, document:

```txt
source data shape
render data shape
lookup needs
mutation needs
filter/search needs
selection needs
drag/drop needs
virtualization needs
persistence needs
tests that already cover it
known performance risks
candidate shared kernel
```

Specifically inspect:

```txt
src/components/ui/tree.tsx
EstimateSheetTree
EstimateSheetContent tree usage
component-library trees
template/project-source trees
bulk-selection helpers
estimate tree reorder/edit helpers
tree-hierarchy helpers
share tree reconstruction
proposal/export tree traversal
chart aggregation tree traversal
activity history tree scopes
```

### 4. Sheet / grid architecture

Audit:

```txt
estimate sheet rows
editable row model
virtual branch list
row cells
cost inputs
proposal preview signature computation
activity history scopes
row mutation hooks
row totals
group/sort/filter transforms
```

Look for:

```txt
expensive repeated DFS
expensive full-tree recomputation per keystroke
component remount patterns
editable row patches that could become row-local selectors
large prop drilling
rendering too much because a parent owns too much state
missing row virtualization thresholds
missing memoized indexes
```

### 5. Data fetching and Supabase performance

Audit:

```txt
repositories
server actions
RPC usage
RLS-sensitive reads
N+1 patterns
parallelization
select column discipline
server-side aggregation opportunities
pagination/limits
search queries
read models / DTOs
```

Look for:

```txt
large records crossing client boundary
queries fetching unused columns
server actions returning too much
post-query JS aggregation that belongs in SQL/RPC
repeated workspace/project context loading
missing cache() opportunities
missing indexes or suspicious RLS patterns
```

### 6. UI primitives and design-system reuse

Audit:

```txt
src/components/ui
src/components/workshop
route-local UI
forms
modals
dropdowns
search inputs
buttons
cards
tabs
toolbar patterns
empty states
skeletons
```

Look for:

```txt
duplicate primitives
feature-local raw class strings
inconsistent loading states
large design-system drift
patterns repeated 3+ times
primitives that are too flexible and cause re-render churn
primitives that should be headless/data-driven
```

### 7. Bundle and runtime cost

Audit:

```txt
large dependencies
icon import style
D3 usage
Three/WebGL usage
ExcelJS usage
Storybook-only imports
client bundles
dynamic import boundaries
third-party scripts
image handling
```

Look for:

```txt
libraries imported into client routes unnecessarily
heavy modules not isolated behind dynamic imports or route handlers
icons imported through expensive paths
ExcelJS leaking into client code
D3 charts mounted when not visible
WebGL loops not paused
landing-only code leaking into app shell
```

### 8. Validation and benchmark system

Audit:

```txt
existing perf scripts
route transition tests
Playwright specs
Vitest render tests
Storybook checks
bundle analyzer scripts
design-system linter
custom prove scripts
```

Design a benchmark plan that can become the refactor gate:

```txt
route transition budgets
render-count budgets
interaction latency budgets
bundle-size budgets
large-tree fixture budgets
large-estimate fixture budgets
Supabase query-count budgets
RLS/RPC proof checks
before/after screenshot or trace capture where useful
```

---

## Required Output Structure

Create this directory:

```txt
.ai/03_plans/2026-06-17-Performance-Refactor
```

Inside it, create the following files.

### 00_README.md

Purpose:

```txt
One-page command center for the full performance refactor.
```

Must include:

```txt
goal
scope
non-goals
current repo facts
research source path
plan file index
phase order
success definition
```

### 01_CODEBASE_AUDIT.md

Purpose:

```txt
Evidence-backed audit of current architecture and performance risks.
```

Must include sections for:

```txt
App Router / RSC boundaries
client component hotspots
state/query architecture
tree/hierarchy systems
estimate sheet/grid systems
data fetching and repositories
Supabase/RLS/RPC
UI primitives/design system
bundle/runtime dependencies
tests/performance tooling
```

Every finding must cite concrete files.

### 02_PATTERN_INVENTORY.md

Purpose:

```txt
Inventory of repeated patterns that should become canonical abstractions.
```

For each pattern, use this format:

```txt
## Pattern: <name>

Current occurrences:
- path:line — usage
- path:line — usage

What differs locally:
- ...

What is structurally the same:
- ...

Proposed canonical kernel:
- ...

Refactor priority:
- P0/P1/P2/P3

Risk:
- Low/Medium/High

Validation:
- ...
```

Mandatory patterns to investigate:

```txt
tree/index/flatten/select/drag-drop
optimistic mutation lifecycle
query keys and cache reconciliation
editable row model
filter/search/group/sort transforms
modal/dialog state
toolbar/header actions
loading/skeleton states
route navigation/perceived latency
server projections/DTOs
permission/edit-capability gates
activity/audit/history scopes
proposal/export preview signatures
```

Add any others found.

### 03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md

Purpose:

```txt
Define how we will measure “fast” before refactoring.
```

Must include:

```txt
current available scripts
new recommended scripts
manual measurement checklist
automated perf gates
route budgets
interaction budgets
large fixture budgets
bundle budgets
query-count budgets
render-count budgets
```

Include a proposed benchmark matrix for these flows:

```txt
landing page load
login/auth callback
workshop homebase
project list
estimates list
estimate sheet initial load
estimate sheet tab switch
estimate tree expand/collapse
estimate tree search/filter
estimate tree drag/drop
add/rename/delete area
add/edit/delete estimate row
right sidebar component search
template/project-source insertion
proposal export preview
charts page
share link viewer
```

### 04_TARGET_ARCHITECTURE.md

Purpose:

```txt
Describe the desired end-state architecture after the slow refactor.
```

Must cover:

```txt
Next.js route/data architecture
server/client component boundary rules
server action contracts
query/cache contracts
Zustand/UI-state contracts
canonical tree kernel
canonical sheet/grid architecture
canonical optimistic mutation adapter
canonical projection/DTO layer
canonical loading/skeleton strategy
canonical performance instrumentation
testing/benchmark gates
```

This should be concrete enough that future agents can implement it without rethinking the architecture.

### 05_PHASED_REFACTOR_PLAN.md

Purpose:

```txt
Main phased roadmap.
```

Use phases like this unless the audit proves a better order:

```txt
Phase 0 — Baseline, instrumentation, and guardrails
Phase 1 — Canonical indexes, selectors, and performance utilities
Phase 2 — Tree kernel unification
Phase 3 — Estimate sheet decomposition and render isolation
Phase 4 — Query/server-action/DTO standardization
Phase 5 — Optimistic mutation lifecycle standardization
Phase 6 — UI primitive consolidation and loading-state cleanup
Phase 7 — Bundle/code-splitting/runtime dependency cleanup
Phase 8 — Supabase/RPC/index/RLS performance pass
Phase 9 — CI benchmark gates and regression prevention
Phase 10 — Documentation, examples, and enforcement
```

For each phase, include:

```txt
Goal
Why this phase exists
Dependencies
Exact candidate files
Implementation sequence
Risks
Non-goals
Validation commands
Manual QA checklist
Rollback strategy
Exit criteria
```

Do not compress this. This is the most important file.

### 06_PHASE_0_BASELINE_PLAN.md

Detailed plan for Phase 0 only.

Must include:

```txt
what to measure
which fixtures to create
which scripts to add later
which traces to capture
which existing tests to run
how to avoid refactoring without baseline
```

### 07_PHASE_1_FOUNDATION_PLAN.md

Detailed plan for Phase 1 only.

Must include:

```txt
shared utility candidates
index/map/set helpers
stable callback rules
selector rules
query key conventions
performance probe conventions
type contracts
```

### 08_PHASE_2_TREE_KERNEL_PLAN.md

Detailed plan for tree unification.

Must include:

```txt
all tree consumers
current data shapes
canonical tree interfaces
indexing strategy
flattening strategy
selection strategy
expansion strategy
drag/drop strategy
virtualization strategy
optimistic mutation strategy
test strategy
migration sequence
```

This should directly address the insight that small tree differences hide a large repeated structure.

### 09_PHASE_3_ESTIMATE_SHEET_PLAN.md

Detailed plan for estimate sheet decomposition.

Must include:

```txt
current responsibility map of EstimateSheetContent
proposed module boundaries
row-level rendering strategy
editable state strategy
totals/signature computation strategy
activity history strategy
proposal preview strategy
right sidebar boundary
virtualization risks
test strategy
```

### 10_PHASE_4_DATA_AND_CACHE_PLAN.md

Detailed plan for repositories, actions, TanStack Query, cache, DTOs, and Supabase.

Must include:

```txt
query key convention
server action return-shape convention
read DTO convention
mutation response convention
cache reconciliation convention
when to invalidate vs setQueryData
when to use React cache / Next cache
Supabase select discipline
RPC/index recommendations
RLS performance checklist
```

### 11_PHASE_5_OPTIMISTIC_MUTATIONS_PLAN.md

Detailed plan for standardizing optimistic flows.

Must include:

```txt
current optimistic flows
common lifecycle
pending ID strategy
server ID reconciliation
rollback strategy
conflict strategy
toast/status strategy
URL sync strategy
test matrix
```

### 12_PHASE_6_UI_PRIMITIVES_PLAN.md

Detailed plan for UI/design-system consolidation.

Must include:

```txt
duplicate primitives
canonical primitive list
what stays feature-local
what moves to src/components/ui
design-system enforcement risks
loading/skeleton standards
modal/dropdown/search/toolbar standards
Storybook/test requirements
```

### 13_PHASE_7_BUNDLE_RUNTIME_PLAN.md

Detailed plan for bundle/runtime optimization.

Must include:

```txt
heavy dependencies
client/server import boundaries
dynamic import targets
icon import rules
D3 isolation
ExcelJS isolation
Three/WebGL pause/lazy-load strategy
third-party scripts
image strategy
bundle analyzer workflow
budgets
```

### 14_PHASE_8_SUPABASE_DB_PLAN.md

Detailed plan for database-side performance.

Must include:

```txt
suspected expensive queries
candidate indexes
candidate RPCs
candidate read models
RLS initplan/auth.uid checklist
query count reduction opportunities
migration safety requirements
provider proof requirements
rollback/proof strategy
```

No migrations yet. Planning only.

### 15_VALIDATION_MATRIX.md

Purpose:

```txt
A matrix of validation commands and what each proves.
```

Include:

```txt
type-check
lint
design-system lint
unit tests
Vitest DOM tests
focused test groups
Playwright smoke
Playwright performance specs
bundle analyzer
custom perf scripts
Supabase prove scripts
manual browser QA
```

Map each phase to required validation.

### 16_RISK_REGISTER.md

Purpose:

```txt
Capture risks before implementation begins.
```

For each risk:

```txt
Risk
Affected files
Why it matters
Likelihood
Impact
Mitigation
Validation
Owner decision needed? yes/no
```

Include risks for:

```txt
estimate sheet regressions
tree DnD regressions
proposal export mismatch
share snapshot mismatch
RLS/security regressions
large bundle regressions
optimistic rollback bugs
route remount/focus bugs
design-system drift
test brittleness
```

### 17_DECISION_LOG.md

Purpose:

```txt
Record architectural decisions made during planning.
```

Use this format:

```txt
## D-001 — <decision title>

Decision:
Context:
Alternatives considered:
Why:
Consequences:
Status:
```

### 18_EXECUTION_PROMPTS.md

Purpose:

```txt
Future copy-paste prompts for implementation agents.
```

Create one implementation prompt per phase. Each prompt must say:

```txt
read this plan pack first
implement only the phase
do not skip validation
do not broaden scope
record evidence
update the plan when reality differs
```

### 19_OPEN_QUESTIONS.md

Purpose:

```txt
Questions that need owner judgment or more evidence.
```

Separate:

```txt
Owner product decisions
Engineering decisions
Measurement gaps
Database/provider questions
Deferrable questions
```

---

## Required Analysis Depth

The plan must be comprehensive enough that implementation can proceed phase-by-phase over many sessions.

Do not simply list files. Explain the architecture.

For each major subsystem, identify:

```txt
current shape
hidden repeated pattern
performance concern
refactor direction
safe first move
unsafe move to avoid
validation proof
```

---

## Specific Repo-Aware Expectations

The plan should account for the current Archestimator architecture:

```txt
Next.js 16 App Router
React 19
Bun
TypeScript strict
Tailwind CSS v4
Supabase/Postgres with RLS
TanStack Query
Zustand
TanStack Virtual
TanStack Table
D3
ExcelJS
Three/WebGL
Storybook
Vitest
Playwright
custom design-system linting
custom performance scripts
```

The plan should respect existing principles:

```txt
server-actions-first writes
optimistic local-state mutations
TanStack Query for server state
Zustand for high-frequency UI state
RLS as database-level authorization
shared UI primitives before one-off markup
design-system constraints from DESIGN.md
proportional validation from AGENTS.md
```

---

## Key Things To Look For In Archestimator

Investigate these likely hotspots carefully:

```txt
EstimateSheetContent responsibility overload
EstimateSheetTree tree mutation complexity
src/components/ui/tree.tsx becoming a semi-kernel already
duplicated tree traversal/indexing across estimate, library, templates, share, export, charts
full-tree recomputation for totals, proposal signatures, activity scopes, and search
row editing causing too much parent-level render pressure
right sidebar library/template data shape duplication
server action return shapes and cache reconciliation inconsistencies
route refresh / loading overlay behavior
heavy imports leaking into client bundles
repository functions fetching more than the UI needs
client-side aggregation that could become read DTOs or RPCs
```

Do not assume these are true. Verify them in code and record evidence.

---

## Quality Bar

A good plan is:

```txt
specific
sequenced
repo-aware
evidence-backed
risk-aware
measurable
slow-refactor friendly
implementation-ready
```

A bad plan is:

```txt
generic
React-blog style
too abstract
missing file references
missing validation
too aggressive
one giant rewrite
not grounded in Archestimator’s current code
```

---

## Completion Criteria

When finished, report:

```txt
Created plan pack at:
.ai/03_plans/2026-06-17-Performance-Refactor

Files created:
- ...

Top 5 highest-leverage refactor tracks:
1. ...
2. ...
3. ...
4. ...
5. ...

Recommended first implementation phase:
Phase 0 — Baseline, instrumentation, and guardrails

Validation performed:
- git diff --check, if available
- markdown/path sanity check
- no source files changed
```

Do not start implementation after planning. Stop after the plan pack is complete.

---

## Recommended Follow-Up

After the planning-only session completes, run a second AI session whose only job is to review the plan pack adversarially before any refactor begins.
