# Skill Curation Spec — ZCode Parity

This is the **authoritative target list** for the parity port. Each lane reads
this to know exactly which skills to port and which to skip. The lead wrote
this from the full inventory of `~/.codex/skills/`, `~/.claude/skills/`,
`~/.claude/plugins/cache/`, and the ZCode plugin cache.

## Background: how ZCode loads skills

ZCode loads skills from TWO roots (confirmed from the active skill list):
1. **Repo-local:** `/Users/philiplewis/Documents/archestimator/.agents/skills/<name>/SKILL.md`
2. **ZCode plugin cache:** `/Users/philiplewis/.zcode/cli/plugins/cache/zcode-plugins-official/.../skills/<name>/SKILL.md`

It does **not** read `~/.claude/skills/` or `~/.codex/skills/` (those are
user-global for those specific tools). So to achieve parity, skills living in
those user-global dirs must be **copied** into `.agents/skills/`.

`.agents/skills/` is the shared source of truth. `.claude/skills/` and
`.commandcode/skills/` are **symlink farms** (`ln -s ../../.agents/skills/<name>`)
so Claude and CommandCode see the same skills.

## Port procedure (every lane follows this)

For each assigned skill:

1. `mkdir -p .agents/skills/<name>` then copy the skill's full folder
   (`SKILL.md` + any `scripts/`, `reference/`, `references/`, `tests.md`, etc.)
   from its source into `.agents/skills/<name>/`. **Copy, do not symlink**, to
   user-global paths — the repo must be self-contained and shareable.
2. Verify `.agents/skills/<name>/SKILL.md` exists and has valid YAML frontmatter
   (`name:` + `description:`). Fix frontmatter if missing.
3. Create fleet symlinks (idempotent — skip if exists):
   - `ln -s ../../.agents/skills/<name> .claude/skills/<name>`
   - `ln -s ../../.agents/skills/<name> .commandcode/skills/<name>`
4. Append a line to `LOOP_LEDGER.md` under your lane's STATUS:
   `- PORTED <name> from <source-path>`.

**Collision rule:** before creating `.agents/skills/<name>`, check
`LOOP_LEDGER.md` for a prior `PORTED <name>` entry by another lane. If found,
STOP, rename your port with a lane suffix (e.g. `<name>-ce`), and log the
conflict. First-writer-wins on the bare name.

**Do NOT touch** these existing skills (already in `.agents/skills/`):
`debug-issue`, `explore-codebase`, `gitnexus` (Agent D owns the fix),
`hallmark`, `impeccable`, `refactor-safely`, `review-changes`, `supabase`,
`supabase-postgres-best-practices`, `find-skills`.

---

## LANE A — Codex OMX + engineering skills
**Source root:** `/Users/philiplewis/.codex/skills/<name>/`
**Write prefix:** `.agents/skills/<name>/`

Port these (engineering / workflow / research / debug / review):
- ultrawork — [OMX] parallel execution engine (AGENTS.md loop vocabulary)
- ultragoal — [OMX] durable goal/ledger execution (AGENTS.md loop vocabulary)
- ultraqa — [OMX] adversarial QA (AGENTS.md loop vocabulary)
- autopilot — [OMX] full clarify→plan→execute→review→QA loop
- team — [OMX] coordinated tmux worker lifecycles
- ralph — [OMX] legacy persistent completion loop
- ralplan — [OMX] planner/architect/critic consensus
- plan — [OMX] strategic planning with interview workflow
- pipeline — [OMX] autonomous pipeline
- autoresearch — [OMX] exhaustive cited research
- autoresearch-goal — [OMX] research-as-goal variant
- best-practice-research — [OMX] best-practice research
- deep-interview — [OMX] interactive requirements interview
- worker — [OMX] bounded team worker
- doctor — [OMX] environment/config diagnostics
- hud — [OMX] heads-up display / status
- wiki — [OMX] durable knowledge wiki
- visual-ralph — [OMX] visual + persistent loop
- prometheus-strict — [OMX] strict reasoning discipline
- performance-goal — [OMX] performance-focused goal mode
- analyze — [OMX] analysis lane
- ask — [OMX] interactive Q&A / clarification
- code-review — [OMX] code review lane
- design — [OMX] design lane
- skill — [OMX] skill authoring helper
- omx-setup — [OMX] bootstrap/setup
- configure-notifications — [OMX] notification config
- cancel — [OMX] cancel a running goal/lane
- kimi-webbridge — web bridge utility (useful for research fetching)

**Skip (Lane A logs reason in SKIP_LIST.md):**
- ian-xiaohei-illustrations — image generation, not engineering
- compound-engineering — meta-installer dir, not a skill (no SKILL.md)

---

## LANE B — Claude / mattpocock engineering skills
**Source root:** `/Users/philiplewis/.claude/skills/<name>/`
**Write prefix:** `.agents/skills/<name>/`

Port these (engineering / planning / review / process):
- implement — implement work from a PRD/issues
- tdd — test-driven development discipline
- diagnosing-bugs — hard-bug diagnosis loop
- codebase-design — codebase architecture design
- domain-modeling — domain-driven design modeling
- improve-codebase-architecture — architecture improvement
- request-refactor-plan — produce a refactor plan
- resolving-merge-conflicts — merge conflict resolution
- review — code review discipline
- qa — QA / quality check
- triage — issue/bug triage
- prototype — rapid prototyping
- ubiquitous-language — DDD ubiquitous language
- decision-mapping — decision records mapping
- grill-with-docs — doc-grounded interrogation
- to-issues — turn a doc into GitHub issues
- to-prd — turn a doc into a PRD
- handoff — session handoff artifact
- writing-great-skills — meta: how to write skills

**Skip (Lane B logs reason in SKIP_LIST.md):**
- ask-matt — personal coaching, not engineering
- design-an-interface — deprecated, superseded by impeccable/hallmark
- scaffold-exercises — course/exercise authoring
- setup-matt-pocock-skills — bootstrap installer
- setup-pre-commit — generic git hooks (repo has its own)
- migrate-to-shoehorn — TS migration utility, one-off
- git-guardrails-claude-code — Claude-Code-specific guardrails
- writing-beats, writing-fragments, writing-shape — content writing
- edit-article — content editing
- obsidian-vault — note-taking vault
- teach — personal teaching/coaching
- grilling, grill-me — personal coaching
- skill-share — skill sharing utility
- learned — learned-facts store (runtime state)
- kimi-webbridge — already ported by Lane A (skip if Lane A claimed it)
- All personal/business utilities: artifacts-builder, changelog-generator,
  competitive-ads-extractor, content-research-writer, developer-growth-analysis,
  domain-name-brainstormer, file-organizer, image-enhancer, invoice-organizer,
  langsmith-fetch, lead-research-assistant, meeting-insights-analyzer,
  raffle-winner-picker, tailored-resume-generator, twitter-algorithm-optimizer,
  video-downloader

---

## LANE C — Cached plugin skills (superpowers + compound engineering)
**Source roots:**
- Superpowers: `/Users/philiplewis/.claude/plugins/cache/superpowers-marketplace/superpowers/6.0.3/skills/<name>/`
- Compound Engineering: `/Users/philiplewis/.claude/plugins/cache/compound-engineering-plugin/compound-engineering/3.13.1/skills/<name>/`
**Write prefix:** `.agents/skills/<name>/` (keep original names incl. `ce-` prefix)

Port these Superpowers skills:
- using-git-worktrees — branch isolation discipline
- test-driven-development — TDD workflow
- systematic-debugging — structured debugging
- dispatching-parallel-agents — parallel delegation
- executing-plans — plan execution discipline
- finishing-a-development-branch — branch merge/finish
- brainstorming — structured brainstorm
- writing-plans — plan authoring
- requesting-code-review — request review
- receiving-code-review — handle review feedback
- writing-skills — skill authoring
- verification-before-completion — don't claim done early
- subagent-driven-development — subagent orchestration

Port these Compound Engineering skills:
- ce-plan — structured planning
- ce-work — plan execution
- ce-debug — debugging flow
- ce-code-review — code review
- ce-brainstorm — brainstorming
- ce-commit — commit discipline
- ce-resolve-pr-feedback — PR feedback resolution
- ce-release-notes — release notes
- ce-report-bug — bug reporting
- ce-doc-review — doc review
- ce-agent-native-architecture — agent-native arch
- ce-agent-native-audit — agent-native audit
- ce-worktree — worktree management
- ce-product-pulse — product status
- ce-clean-gone-branches — branch cleanup
- ce-ideate — ideation
- ce-polish — polish pass
- ce-simplify-code — code simplification
- ce-optimize — optimization
- ce-strategy — strategy
- ce-proof — proof/evidence
- ce-promote — promote/release
- ce-test-browser — browser testing (useful for UI QA)
- ce-commit-push-pr — full commit→push→PR
- lfg — kickoff/launch helper

**Skip (Lane C logs reason in SKIP_LIST.md):**
- using-superpowers — meta-index, not a standalone skill
- ce-dhh-rails-style — Rails/Ruby-specific, Archestimator is Next.js
- ce-test-xcode — iOS/Xcode-specific
- ce-frontend-design — superseded by impeccable/hallmark
- ce-gemini-imagegen — image generation
- ce-slack-research — Slack integration (no Slack in scope)
- ce-demo-reel — demo video production
- ce-sessions — session management (runtime state)
- ce-update, ce-compound-refresh, ce-setup — meta/installer
- ce-work-beta — beta of ce-work (ce-work is the stable port)
- ce-dogfood-beta — dogfooding workflow
- ce-riffrec-feedback-analysis — specific third-party product
- ce-product-pulse — keep only if not redundant (Lane C decides)

---

## LANE D — gitnexus fix + manifests + Archestimator gap skills
**Write scope:** `.agents/skills/gitnexus/` (fix only), the three manifest
files in this plan dir, and any NEW `.agents/skills/<new-name>/` gap skills.

Tasks:
1. **Fix gitnexus load.** `.agents/skills/gitnexus/` has sub-skill folders
   (`gitnexus-cli`, `gitnexus-debugging`, `gitnexus-exploring`, `gitnexus-guide`,
   `gitnexus-impact-analysis`, `gitnexus-refactoring`) but **no root `SKILL.md`**,
   so ZCode's loader (and the `.claude/skills/gitnexus` symlink) finds nothing
   to load. Create `.agents/skills/gitnexus/SKILL.md` as a thin **index skill**
   with valid frontmatter (`name: gitnexus`, `description: ...`) that lists the
   six sub-skills and when to use each, deferring to the sub-skill folders.
   Do NOT duplicate the sub-skill content; just index it. Preserve the
   repo-local proportional-graph-policy override banner.
2. **Write `SKILL_REGISTRY.md`** in this plan dir: a table of every active
   skill after all lanes finish, with columns: name | source | one-line purpose
   | port status | lane. Read `LOOP_LEDGER.md` to populate it; for pre-existing
   skills, mark source as "pre-existing".
3. **Write `SKIP_LIST.md`** in this plan dir: collect every skip reason logged
   by Lanes A/B/C into one table: name | source | reason | lane.
4. **Assess Archestimator gaps and create new skills ONLY if genuinely missing.**
   Candidates to evaluate (create only if no existing skill covers it):
   - `archestimator-plan-pack` — wraps the `.ai/03_plans/` dated plan-pack +
     loop workflow (AGENTS.md references this; not covered by generic ce-plan).
   - `archestimator-proposal-package` — the proposal-package export workflow
     specific to this product (check `.ai/06_specs/` first; only create if a
     skill-shaped discipline is missing).
   - `archestimator-rls-audit` — Supabase RLS + authz audit specific to this
     schema (check whether the generic `supabase` skill already covers this).
   Do NOT invent skills that duplicate existing coverage. If none are needed,
   log that decision in `LOOP_LEDGER.md` and move on.
5. After A/B/C return, finalize `SKILL_REGISTRY.md` and `SKIP_LIST.md` with
   their PORTED lines, then log your own completion.
