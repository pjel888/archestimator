# `.ai` Agent Instructions

## Scope

This file governs the Archestimator `.ai/` subtree.

## Purpose

`.ai/` is the shared project brain for all AI agents and tools. It stores operating rules, plans, specs, state, prompts, skills, research, and handoff material.

## Working rules

1. Read `.ai/README.md` and `.ai/00_system/ai-folder-canonical-map.md` before creating new `.ai` files.
2. Use the numbered taxonomy. Do not create new unnumbered top-level folders unless a human explicitly approves it.
3. Add new information to the narrowest correct home:
   - plans → `03_plans/`
   - specs → `06_specs/`
   - current state → `10_state/`
   - reusable playbooks → `11_skills/`
   - agent contracts → `12_agents/`
   - research → `13_research/`
4. Prefer consolidation, deletion, and reference repair over additive duplicate
   policy. Preserve historical evidence only when it remains useful.
5. Do not store secrets, credentials, private keys, or raw confidential client data.
6. When project reality changes, update `10_state/current-state.md` and any affected source-of-truth doc.
7. Keep model-specific payloads thin. They should point back to shared `.ai` rules instead of forking them.
8. Assume a shared live worktree with multiple codebase AI agents. Do not write prompts, plans, or agent instructions that tell implementers to automatically create, switch, checkout, delete, or push branches, or to create Git worktrees, unless a human explicitly requested that exact Git action. Prefer file-scope coordination, fresh status checks, and small reversible diffs.

## Validation

For documentation-only changes:
- verify referenced paths exist
- run `git diff --check` once this repository is initialized with git

For future code changes:
- follow the project validation matrix once the stack is selected
