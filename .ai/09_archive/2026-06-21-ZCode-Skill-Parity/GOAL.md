# Goal: ZCode Skill Parity

**Created:** 2026-06-21
**Lead:** ZCode orchestrator (builtin:zai-coding-plan/GLM-5.2)
**Status:** IN PROGRESS

## Objective (concrete deliverables)

1. Every skill that Claude, Codex, and OpenCode can use for **engineering /
   research / QA / workflow / debug / review** work must also be available to
   ZCode (this session's agent runtime), loaded from `.agents/skills/`.
2. The currently-broken `gitnexus` skill entry (symlink points to a folder with
   no root `SKILL.md`) must be fixed so it loads.
3. Skills that are tool-vendor specific, UI-design-duplicate, or out-of-scope
   for Archestimator must be explicitly **skipped with a documented reason**,
   not silently dropped.
4. A **skill registry manifest** must exist that lists every active skill, its
   source, and its one-line purpose, so future agents can audit parity quickly.
5. ZCode must own a **standing port process** (documented) so new skills added
   to Claude/Codex later can be ported in one command.
6. All work must survive a 3-way merge with the existing fleet (Codex/OpenCode),
   so repo-local override banners must be preserved and the canonical
   `.ai/00_system` policy must win on any conflict.

## Success criteria (verifiable)

- [ ] `ls .agents/skills/` shows a directory for each curated port.
- [ ] Each ported directory has a `SKILL.md` with valid YAML frontmatter
      (`name`, `description`).
- [ ] `gitnexus` directory has a loadable root `SKILL.md` (the loader picks up
      sub-skills).
- [ ] `.claude/skills/` and `.commandcode/skills/` symlinks updated for each
      new skill (fleet consistency).
- [ ] `.ai/03_plans/2026-06-21-ZCode-Skill-Parity/SKILL_REGISTRY.md` lists
      every active skill with source + purpose + port status.
- [ ] `.ai/03_plans/2026-06-21-ZCode-Skill-Parity/SKIP_LIST.md` documents each
      skill NOT ported and the reason.
- [ ] `.ai/03_plans/2026-06-21-ZCode-Skill-Parity/LOOP_LEDGER.md` records each
      agent lane's work + conflicts resolved.
- [ ] `git diff --check` is clean on touched files.

## Coordination protocol (for parallel agents)

All lanes write to **disjoint** directories inside `.agents/skills/`. The only
shared mutable files are the three manifest files in this plan directory; those
are written by the **lead only** after all lanes return. Lanes report their
work into `LOOP_LEDGER.md` (append-only) so other lanes can see progress and
detect collisions. If two lanes accidentally target the same skill name, the
lane with the earlier `LOOP_LEDGER.md` entry wins; the later lane must rename
or skip and log the conflict.

The canonical ZCode skill source is `.agents/skills/<name>/`. `.claude/skills/`
and `.commandcode/skills/` are **symlink farms** that point into `.agents/`.

See `LOOP_LEDGER.md` for live per-lane status and `SKILL_REGISTRY.md` for the
target inventory.
