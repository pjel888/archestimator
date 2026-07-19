---
description: Apply the canonical portable workflow to frontend and UX work.
---

# Portable Frontend Workflow Adapter

Follow `AGENTS.md`, `DESIGN.md` as alpha guidance, the Validation Matrix, and
`.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.

- Ground the task in current components, routes, design tokens, interaction
  behavior, responsive constraints, accessibility, and acceptance criteria.
- Select design, exploration, implementation, or review capability classes via
  `.ai/12_agents/codex-role-model-matrix.json`; do not bind frontend authority to
  a provider or hardcoded model.
- Delegate only independent read/review lanes. Keep one writer per component or
  shared style contract and synthesize through one lead.
- Use native, thread, emulated, or single-agent mode with identical contracts.
- Browser automation, screenshots, visual diffs, Storybook, builds, and tests
  require explicit current-task authorization. Otherwise use source, semantic,
  type/LSP, lint, or narrow runtime evidence.
- Preserve the current worktree and report exact artifacts, evidence, visual
  proof gaps, and remaining risk.
