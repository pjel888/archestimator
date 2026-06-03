# Implementation Agent Handoff Checklist

- [ ] Run safety commands and record branch/dirty state.
- [ ] Read source-of-truth chain and every plan doc.
- [ ] Reverify package/CI/agent inventory.
- [ ] Use graph/code-intelligence first; document GitNexus/code-review-graph status.
- [ ] Modify `.ai/00_system` first.
- [ ] Modify `.ai/12_agents` second.
- [ ] Modify `.ai/08_prompts` and `.ai/11_skills` third.
- [ ] Add thin harness adapters only after schema exists.
- [ ] Do not modify production source, packages, migrations, providers, GitHub settings, Notion, or generated files in Phase 1.
- [ ] Create bug plans for gaps.
- [ ] Run docs-only validation and any expanded validation required by actual edits.
- [ ] Commit/push with Lore-style evidence.
- [ ] Final report includes branch, commit, push, files, validation, bugs, remaining decisions, and no false implementation claims.

## Stop conditions
Unsafe dirty worktree, missing authority, provider/admin action, conflicting instructions unresolved, or validation failure without safe substitute.
