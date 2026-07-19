# `.agents` Compatibility Adapter

`.agents/` contains local skill/playbook compatibility files only. It is not a
separate Archestimator project brain.

Canonical rules live in:

1. `AGENTS.md`
2. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
3. `.ai/12_agents/README.md`
4. `.ai/12_agents/payloads/`
5. `.ai/11_skills/`

If a skill here conflicts with `.ai/00_system` or `.ai/12_agents`, the `.ai`
source wins. Do not store secrets or durable project decisions in this folder.

Every local or installed skill/plugin, including Ultragoal, UltraQA, Ultrawork,
Autopilot, Autoresearch, Autoresearch Goal, and Compound Engineering, is
subordinate to the Lean Engineering Ethos. Map the evidence-supported blast
radius, prefer the smallest coherent change and fewest useful lanes/artifacts,
minimize token/time/tool cost, and never auto-run tests/builds/browser QA without
an explicit user-authorized `TEST_TASK`.

<!-- supermemory-bootstrap: required -->
Skills and compatibility adapters inherit the shared Supermemory workflow from
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`: run `bun run supermemory:ensure`
before meaningful work, search relevant memory before broad/non-trivial work,
and add a sanitized durable update at closeout when project truth changes.
Supermemory is advisory; `.ai` and current source remain authoritative.

## Skill Catalog Ownership

- `.agents/skills/` is the only project skill catalog. Keep only
  Archestimator-specific adapters and overrides here.
- Shared upstream skill payloads live once in `~/.agents/skills/` and are
  tracked by `~/.agents/.skill-lock.json`. Agent-specific roots may contain
  relative symlinks to that canonical payload when the host requires them.
- Do not keep copied payloads in `.codex/skills/`, `.cursor/skills/`,
  `.claude/skills/`, `.commandcode/skills/`, `.vibe/skills/`, or
  `.github/skills/`. Project compatibility paths for Claude Code, Command Code,
  and Mistral Vibe are symlinks to `.agents/skills/`; Codex, Cursor, and GitHub
  Copilot resolve the project catalog directly.
- OMX uses plugin delivery. Do not restore legacy OMX skill copies under
  `~/.codex/skills/` or this repository.
- Run `bun run skills:update` to update lock-managed skills and OMX, consolidate
  aliases/mirrors, refresh Git plugin marketplaces, and validate the live
  catalog. When Kimi WebBridge is installed, the same command updates its binary
  and installs the skill version matching the connected extension. Run
  `bun run validate:skills` for a read-only drift check. Host-owned plugin skills
  remain in their host roots and use that plugin's updater.

## Cross-Agent Skill Parity

The goal is that every codebase AI agent working in this repo (Claude Code,
Codex, Cursor, OpenCode, Kimi Code, Command Code, Mistral Vibe, ZCode/GLM, and
any future host) sees the **same** shared skill set, with the canonical
`dispatching-parallel-agents` skill as the template for what "available"
means. One shared payload, many host roots.

- **Canonical global source:** `~/.agents/skills/` — one physical payload per
  skill, shared by every host.
- **Canonical project source:** `.agents/skills/` — the fifteen adapters tracked
  by `scripts/validate-skill-catalog.mjs`, including the seven dedicated
  `archestimator-*` workflow and design adapters.
- **Per-host exposure:** each non-canonical root (`~/.zcode/skills/`,
  `~/.claude/skills/`, `~/.cursor/skills/`, `~/.config/opencode/skills/`,
  `~/.opencode/skills/`, `~/.vibe/skills/`, `~/.commandcode/skills/`,
  `~/.kimi-code/skills/`) holds **symlinks** into the canonical root, never a
  second physical copy. Codex is the exception: it consumes skills via OMX
  plugin delivery and must not mirror the catalog under `~/.codex/`.
- **Drift gate:** `bun run validate:skills` is the single source of truth. A
  clean run means shared skills resolve to one inode across every host. A
  failing run names the exact stray physical copy or broken link to fix.
- **Repair, don't reintroduce:** if a host regains a physical duplicate, delete
  it and let `bun run skills:update` (or the validator's instructions) restore
  the symlink. Never copy a payload across roots to "fix" drift.

`shadcn/improve` is globally managed. Do not restore a repo-local copy unless a
real Archestimator-specific adapter becomes necessary; project planning policy
remains authoritative through `AGENTS.md` and `.ai`.
