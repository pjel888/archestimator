# workflow
See [workflow/taste.md](workflow/taste.md)

# mvp-mandate
- This is a pre-launch MVP with zero users. Freely make Supabase/database changes, skip heavy regression cycles, and prefer speed over caution. Mistakes are acceptable — the DB can be reset. Confidence: 0.85

# review-format
- When requesting multi-faceted architecture/code reviews, use the structured format: TASK (one-line objective), DELIVERABLE (specific outputs expected), SCOPE (repo paths, read-only constraint), VERIFY (citation standards, status markers like CLEAR/WATCH/BLOCK, EXPAND section). Confidence: 0.80
# dependencies
- Use react-complex-tree (https://rct.lukasbach.com/) for estimate tree components. Confidence: 0.85

# supabase
- Prefer atomic RPC functions (security-invoker, RLS-scoped) over per-row update loops for mutations. Confidence: 0.75
- Use deferrable unique constraints with nulls-not-distinct for sort-order integrity in tree/hierarchy tables. Confidence: 0.70

# ui
See [ui/taste.md](ui/taste.md)
- When implementing reusable UI components from Storybook, actually import and use the Storybook component code directly — do not just mimic its appearance with inline styles. The goal is component reuse, not visual imitation. Confidence: 0.85

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
- Structure feature audits as four documents: 01-current-inventory (code-level catalog), 02-feature-gap-analysis (ranked gaps with severity), 03-ux-paths-and-happy-paths (user journeys with cross-surface maps), 04-prioritized-improvement-roadmap (phased P0–P4 with concrete code snippets and file paths). Apply the UX paths pattern to bug-triage docs as well. Confidence: 0.75
- For collaboration/sharing UX path studies, cover three perspectives: the inviter's view (status signifiers for pending/unaccepted invites, role management), the invitee's view (all acceptance flow branches), and the projects-list view (how shared projects are designated, removal risk, ownership indicators). Confidence: 0.70
- Score all plan documents from 1-100% on strategy, implementation readiness, quality, truth, and integrity. Iterate with 2nd and 3rd passes until all documents reach 100% before declaring the plan complete. Confidence: 0.80
- After completing a plan pack, add an implementation handoff prompt markdown file in the same plan folder so another AI agent can implement it autonomously. Confidence: 0.85

# estimate-tree
- When group nodes and area nodes are siblings, group nodes must always be sorted before area nodes. Confidence: 0.70
- Inline rename fields must stay active until explicitly committed (Enter/check button), explicitly cancelled (Escape/reset button), or blurred with valid changed value; use orange border + subtle orange background to indicate editing state, and show right-aligned check and reset icon buttons. Confidence: 0.80

# branding
- The brand name "archestimator" is always all lowercase, never capitalized. Confidence: 0.85

# landing-page
- Landing page design references: Amigo.ai (https://www.amigo.ai/) and Intercom (https://www.intercom.com/). The landing page should feel like a hybrid of these two sites. Confidence: 0.85
- When doing rapid visual/landing page work, skip all tests to maximize iteration speed. Confidence: 0.80
