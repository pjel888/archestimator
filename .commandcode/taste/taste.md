# workflow
- Conduct read-only architecture/code reviews with CLEAR/WATCH/BLOCK status before committing feature changes. Confidence: 0.90
- Map blast radius (CRITICAL/LOW) and affected file references before implementing UI changes. Confidence: 0.80
- Prefer reusable UI primitives (e.g., modal) over inline or feature-specific solutions. Confidence: 0.75
- For planning audits, perform second and third passes on the same documents to catch gaps the first pass missed (e.g., frozen state, missing error handling, inference bugs). Confidence: 0.70
- Integrate shadcn UI primitives (built on Radix) for new UI components; do not use shadcn add --all — add only the specific primitives needed per feature slice. Confidence: 0.85

# dependencies
- Use react-complex-tree (https://rct.lukasbach.com/) for estimate tree components. Confidence: 0.85

# supabase
- Prefer atomic RPC functions (security-invoker, RLS-scoped) over per-row update loops for mutations. Confidence: 0.75
- Use deferrable unique constraints with nulls-not-distinct for sort-order integrity in tree/hierarchy tables. Confidence: 0.70

# ui
See [ui/taste.md](ui/taste.md)
# architecture
- Use optimistic local updates with shared React Query cache write/rollback for drag-and-drop reordering. Confidence: 0.70
- All estimate tree interactions (clicking nodes, expanding, nesting) must use optimistic local state updates before syncing to Supabase; never block UI on server response. Confidence: 0.75
- Prefer optimistic local-first updates with immediate UI response over waiting for Supabase round-trips for all estimate mutations (tree and sheet). Confidence: 0.75
- Modal overlays must cover the main sidebar (high z-index, fixed viewport overlay). Confidence: 0.65
- Use optimistic local-first state management for all estimate interactions (tree clicks, nesting, reordering) — update UI immediately, then sync to Supabase asynchronously. Confidence: 0.80

# workshop-routing
- Hide ProjectMiniSidebar on estimate detail routes (/workshop/projects/[projectId]/estimates/[nodeId]). Confidence: 0.70

# testing
- Use Vitest for testing. Confidence: 0.85
- Run bun run type-check, bun run lint, bun run validate, bun run build, and git diff --check as validation pipeline before reviews. Confidence: 0.85

# research
- When researching drag-and-drop or tree UI patterns, prefer primary/authoritative sources: WAI-ARIA APG, React Complex Tree docs, Atlassian/other design systems, NN/g. Confidence: 0.70

# planning-audits
- Structure feature audits as four documents: 01-current-inventory (code-level catalog), 02-feature-gap-analysis (ranked gaps with severity), 03-ux-paths-and-happy-paths (user journeys with cross-surface maps), 04-prioritized-improvement-roadmap (phased P0–P4 with concrete code snippets and file paths). Confidence: 0.70

# estimate-tree
- When group nodes and area nodes are siblings, group nodes must always be sorted before area nodes. Confidence: 0.70
- Inline rename fields must stay active until explicitly committed (Enter/check button), explicitly cancelled (Escape/reset button), or blurred with valid changed value; use orange border + subtle orange background to indicate editing state, and show right-aligned check and reset icon buttons. Confidence: 0.80
