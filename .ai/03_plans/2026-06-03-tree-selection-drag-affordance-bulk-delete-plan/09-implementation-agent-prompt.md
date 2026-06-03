# Implementation Agent Prompt

**Copy and paste the text below to the next implementation agent.**

---

You are an expert software engineer tasked with implementing the "Tree Selection, Drag Affordance, and Bulk Delete" feature for Archestimator. 

**CRITICAL RULES:**
1. **Read the planning folder first.** Start by reading all documents in `.ai/03_plans/2026-06-03-tree-selection-drag-affordance-bulk-delete-plan/`.
2. **Do not re-litigate already-set decisions.** The planning documents contain evidence-backed decisions. Do not change them unless local code evidence definitively proves them wrong. If you find a contradiction, stop, update the plan, and ask for clarification.
3. **Implement in phases.** Follow the exact sequence in `05-implementation-sequence.md`. Do not skip phases or combine them into a single massive PR.
4. **Run focused tests after each phase.** After completing a phase, run `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run validate`, and the specific Vitest tests for that phase. Fix any failures before moving to the next phase.
5. **Commit after coherent milestones.** Create a git commit after each successfully tested phase. Use the standard co-author trailer:
   ```bash
   git commit -F - <<'EOF'
   feat(ui): implement phase X of tree selection and bulk delete

   Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
   EOF
   ```
6. **Avoid broad rewrites.** Modify only the files explicitly listed in the phase's "Files to change" section. Preserve existing behavior unless explicitly instructed to change it.
7. **Preserve right-click rename/delete.** Ensure existing `WorkshopTreeContextMenu` functionality remains fully operational.
8. **Preserve existing drag/drop reorder behavior.** React Complex Tree (RCT) handlers must continue to work. The new drag handle is a visual affordance; do not break RCT's native drag initiation.
9. **Preserve design-system constraints.** All new UI components must use existing design tokens and pass `bun run lint:design-system`.
10. **Avoid hard delete of referenced library components.** Enforce the zero-reference check and default to archive as specified in `04-data-permissions-and-delete-contracts.md`.
11. **Validate all server actions by workspace/project permissions.** Every bulk server action must call `ensureDefaultWorkspace()` and validate explicit edit permissions before mutating data.
12. **Stop and update the plan if implementation evidence contradicts planning assumptions.** If you discover that a function signature, database schema, or RCT behavior differs from the plan, halt implementation, document the discrepancy, update the planning documents, and request review before proceeding.

**Your First Step:**
Read `05-implementation-sequence.md` and begin **Phase 1 — Shared UX Contract (WorkshopTreeRow Extension)**. Create `src/components/workshop/tree-row-affordances.tsx` and extend `WorkshopTreeRow` as specified. Do not touch EstimateSheetTree or any other surface until Phase 1 is complete, tested, and committed.