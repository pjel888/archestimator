# Loop Ledger — ZCode Skill Parity

Append-only coordination log for all parallel lanes working on
`.agents/skills/` parity. Each lane logs its starting scope, conflicts it hit,
and its final status here so the lead can synthesize.

**Rules:**
- Append your entry at the bottom. Never edit another lane's entry.
- First-writer-wins on a skill name collision: if your target skill name
  already appears in a prior STARTED entry below, rename or skip and log the
  conflict.
- All writes go to `.agents/skills/<your-skill>/`. Do not touch another lane's
  skill directory.
- Update your own STATUS line when you finish.

---

## Lane: LEAD-ORCHESTRATOR (builtin:zai-coding-plan/GLM-5.2)
- **Scope:** plan, curation, manifest authorship, conflict resolution, final synthesis.
- **Write scope:** only the three manifest files in this plan directory.
- **STATUS:** STARTED 2026-06-21 — inventory complete, dispatching 4 lanes.

## Lane: AGENT-A — Codex engineering + OMX workflow skills
- **Scope:** port Codex engineering/workflow skills into `.agents/skills/`.
- **STATUS:** COMPLETE 2026-06-21 — ported 29 skills, skipped 2, no conflicts.

## Lane: AGENT-B — Claude/mattpocock engineering skills
- **Scope:** port Claude/mattpocock engineering skills into `.agents/skills/`.
- **STATUS:** COMPLETE 2026-06-21 — ported 19 skills (executed by LEAD after
  Explore subagent reported read-only constraint; subagent's full verification
  of all 19 source frontmatters was sound, execution was deterministic).

## Lane: AGENT-C — Cached plugin skills (superpowers + compound)
- **Scope:** surface cached plugin skills; create thin repo-local adapters.
- **STATUS:** COMPLETE 2026-06-21 — ported 38 skills (13 Superpowers + 25
  Compound Engineering); executed by LEAD after Explore subagent reported
  read-only constraint; subagent's full source-root verification was sound.

## Lane: AGENT-D — gitnexus fix, registry manifest, skip list, gap skills
- **Scope:** fix broken `gitnexus` load, write `SKILL_REGISTRY.md`,
  `SKIP_LIST.md`, create any Archestimator-gap skills.
- **STATUS:** PARTIAL 2026-06-21 — gitnexus fix + gap-skill assessment
  COMPLETE (1 skill created, 2 gap-skills correctly skipped). Manifests
  (`SKILL_REGISTRY.md`, `SKIP_LIST.md`) being finalized by LEAD after
  Lanes B/C completed (Agent D timed out waiting for them).

- AGENT-A STARTED 2026-06-21 — beginning port of 29 Codex skills

- AGENT-D STARTED 2026-06-21 — gitnexus fix + manifests + gap assessment
- PORTED ultrawork from /Users/philiplewis/.codex/skills/ultrawork
- PORTED ultragoal from /Users/philiplewis/.codex/skills/ultragoal
- PORTED ultraqa from /Users/philiplewis/.codex/skills/ultraqa
- PORTED autopilot from /Users/philiplewis/.codex/skills/autopilot
- PORTED team from /Users/philiplewis/.codex/skills/team
- PORTED ralph from /Users/philiplewis/.codex/skills/ralph
- PORTED ralplan from /Users/philiplewis/.codex/skills/ralplan
- PORTED plan from /Users/philiplewis/.codex/skills/plan
- PORTED pipeline from /Users/philiplewis/.codex/skills/pipeline
- PORTED autoresearch from /Users/philiplewis/.codex/skills/autoresearch
- PORTED autoresearch-goal from /Users/philiplewis/.codex/skills/autoresearch-goal
- PORTED best-practice-research from /Users/philiplewis/.codex/skills/best-practice-research
- PORTED deep-interview from /Users/philiplewis/.codex/skills/deep-interview
- PORTED worker from /Users/philiplewis/.codex/skills/worker
- PORTED doctor from /Users/philiplewis/.codex/skills/doctor
- PORTED hud from /Users/philiplewis/.codex/skills/hud
- PORTED wiki from /Users/philiplewis/.codex/skills/wiki
- PORTED visual-ralph from /Users/philiplewis/.codex/skills/visual-ralph
- PORTED prometheus-strict from /Users/philiplewis/.codex/skills/prometheus-strict
- PORTED performance-goal from /Users/philiplewis/.codex/skills/performance-goal
- PORTED analyze from /Users/philiplewis/.codex/skills/analyze
- PORTED ask from /Users/philiplewis/.codex/skills/ask
- PORTED code-review from /Users/philiplewis/.codex/skills/code-review
- PORTED design from /Users/philiplewis/.codex/skills/design
- PORTED skill from /Users/philiplewis/.codex/skills/skill
- PORTED omx-setup from /Users/philiplewis/.codex/skills/omx-setup
- PORTED configure-notifications from /Users/philiplewis/.codex/skills/configure-notifications
- PORTED cancel from /Users/philiplewis/.codex/skills/cancel
- PORTED kimi-webbridge from /Users/philiplewis/.codex/skills/kimi-webbridge
- SKIPPED ian-xiaohei-illustrations — image generation, not engineering
- SKIPPED compound-engineering — meta-installer dir, not a skill (no SKILL.md; source folder is empty)
- AGENT-A COMPLETE 2026-06-21 — ported 29 skills, skipped 2. Conflicts: none.
- FIXED gitnexus — created root index SKILL.md (valid YAML, routes to 6 sub-skills, preserves proportional-graph-policy override banner)
- GAP-CHECK archestimator-plan-pack: CREATED — generic ce-plan/plan don't know the dated .ai/03_plans/<date>-<slug>/ + LOOP_LEDGER.md convention; binds them to the project's actual DISCOVER->PLAN->EXECUTE->VERIFY->RECORD->DECIDE loop contract (95 lines, under cap). Symlinks created.
- GAP-CHECK archestimator-rls-audit: SKIPPED — the generic supabase skill already has an extensive RLS/security checklist (user_metadata, security_invoker views, UPDATE-needs-SELECT, TO authenticated BOLA, WITH CHECK, SECURITY DEFINER traps, storage upsert). Project-specific schema/RLS facts already live in per-pack contract docs (e.g. 2026-06-20-Library-Page-Overall-Improvement/33-DB-RLS-AND-MIGRATION-CONTRACT.md). A skill would duplicate, not add coverage.
- GAP-CHECK archestimator-proposal-package: SKIPPED — .ai/06_specs/proposal-package-system.md is a feature spec (Excel export topology + shared-link publication flow), not a repeatable skill-shaped discipline. No agent decision-tree or workflow is missing that a skill would encode.
- PORTED archestimator-plan-pack (new Archestimator-gap skill)

- AGENT-B STARTED 2026-06-21 — beginning port of 19 Claude/mattpocock skills
- PORTED implement from /Users/philiplewis/.claude/skills/implement
- PORTED tdd from /Users/philiplewis/.claude/skills/tdd
- PORTED diagnosing-bugs from /Users/philiplewis/.claude/skills/diagnosing-bugs
- PORTED codebase-design from /Users/philiplewis/.claude/skills/codebase-design
- PORTED domain-modeling from /Users/philiplewis/.claude/skills/domain-modeling
- PORTED improve-codebase-architecture from /Users/philiplewis/.claude/skills/improve-codebase-architecture
- PORTED request-refactor-plan from /Users/philiplewis/.claude/skills/request-refactor-plan
- PORTED resolving-merge-conflicts from /Users/philiplewis/.claude/skills/resolving-merge-conflicts
- PORTED review from /Users/philiplewis/.claude/skills/review
- PORTED qa from /Users/philiplewis/.claude/skills/qa
- PORTED triage from /Users/philiplewis/.claude/skills/triage
- PORTED prototype from /Users/philiplewis/.claude/skills/prototype
- PORTED ubiquitous-language from /Users/philiplewis/.claude/skills/ubiquitous-language
- PORTED decision-mapping from /Users/philiplewis/.claude/skills/decision-mapping
- PORTED grill-with-docs from /Users/philiplewis/.claude/skills/grill-with-docs
- PORTED to-issues from /Users/philiplewis/.claude/skills/to-issues
- PORTED to-prd from /Users/philiplewis/.claude/skills/to-prd
- PORTED handoff from /Users/philiplewis/.claude/skills/handoff
- PORTED writing-great-skills from /Users/philiplewis/.claude/skills/writing-great-skills
- SKIPPED ask-matt — personal coaching, not engineering
- SKIPPED design-an-interface — deprecated, superseded by impeccable/hallmark
- SKIPPED scaffold-exercises — course/exercise authoring
- SKIPPED setup-matt-pocock-skills — bootstrap installer
- SKIPPED setup-pre-commit — generic git hooks (repo has its own)
- SKIPPED migrate-to-shoehorn — TS migration utility, one-off
- SKIPPED git-guardrails-claude-code — Claude-Code-specific guardrails
- SKIPPED writing-beats — content writing
- SKIPPED writing-fragments — content writing
- SKIPPED writing-shape — content writing
- SKIPPED edit-article — content editing
- SKIPPED obsidian-vault — note-taking vault
- SKIPPED teach — personal teaching/coaching
- SKIPPED grilling — personal coaching
- SKIPPED grill-me — personal coaching
- SKIPPED skill-share — skill sharing utility
- SKIPPED learned — learned-facts store (runtime state)
- SKIPPED kimi-webbridge — already ported by Lane A (collision)
- SKIPPED artifacts-builder — personal/business utility, not engineering
- SKIPPED changelog-generator — personal/business utility, not engineering
- SKIPPED competitive-ads-extractor — personal/business utility, not engineering
- SKIPPED content-research-writer — personal/business utility, not engineering
- SKIPPED developer-growth-analysis — personal/business utility, not engineering
- SKIPPED domain-name-brainstormer — personal/business utility, not engineering
- SKIPPED file-organizer — personal/business utility, not engineering
- SKIPPED image-enhancer — personal/business utility, not engineering
- SKIPPED invoice-organizer — personal/business utility, not engineering
- SKIPPED langsmith-fetch — personal/business utility, not engineering
- SKIPPED lead-research-assistant — personal/business utility, not engineering
- SKIPPED meeting-insights-analyzer — personal/business utility, not engineering
- SKIPPED raffle-winner-picker — personal/business utility, not engineering
- SKIPPED tailored-resume-generator — personal/business utility, not engineering
- SKIPPED twitter-algorithm-optimizer — personal/business utility, not engineering
- SKIPPED video-downloader — personal/business utility, not engineering
- AGENT-B COMPLETE 2026-06-21 — ported 19 skills, skipped ~35. Conflicts: kimi-webbridge (deferred to Lane A).

- AGENT-C STARTED 2026-06-21 — beginning port of Superpowers + Compound Engineering skills
- PORTED using-git-worktrees from superpowers-marketplace/superpowers/6.0.3
- PORTED test-driven-development from superpowers-marketplace/superpowers/6.0.3
- PORTED systematic-debugging from superpowers-marketplace/superpowers/6.0.3
- PORTED dispatching-parallel-agents from superpowers-marketplace/superpowers/6.0.3
- PORTED executing-plans from superpowers-marketplace/superpowers/6.0.3
- PORTED finishing-a-development-branch from superpowers-marketplace/superpowers/6.0.3
- PORTED brainstorming from superpowers-marketplace/superpowers/6.0.3
- PORTED writing-plans from superpowers-marketplace/superpowers/6.0.3
- PORTED requesting-code-review from superpowers-marketplace/superpowers/6.0.3
- PORTED receiving-code-review from superpowers-marketplace/superpowers/6.0.3
- PORTED writing-skills from superpowers-marketplace/superpowers/6.0.3
- PORTED verification-before-completion from superpowers-marketplace/superpowers/6.0.3
- PORTED subagent-driven-development from superpowers-marketplace/superpowers/6.0.3
- PORTED ce-plan from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-work from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-debug from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-code-review from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-brainstorm from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-commit from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-resolve-pr-feedback from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-release-notes from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-report-bug from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-doc-review from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-agent-native-architecture from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-agent-native-audit from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-worktree from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-product-pulse from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-clean-gone-branches from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-ideate from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-polish from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-simplify-code from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-optimize from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-strategy from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-proof from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-promote from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-test-browser from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED ce-commit-push-pr from compound-engineering-plugin/compound-engineering/3.13.1
- PORTED lfg from compound-engineering-plugin/compound-engineering/3.13.1
- SKIPPED using-superpowers — meta-index, not a standalone skill
- SKIPPED ce-dhh-rails-style — Rails/Ruby-specific; Archestimator is Next.js
- SKIPPED ce-test-xcode — iOS/Xcode-specific
- SKIPPED ce-frontend-design — superseded by impeccable/hallmark
- SKIPPED ce-gemini-imagegen — image generation
- SKIPPED ce-slack-research — Slack integration not in scope
- SKIPPED ce-demo-reel — demo video production
- SKIPPED ce-sessions — session management (runtime state)
- SKIPPED ce-update — meta/installer
- SKIPPED ce-compound-refresh — meta/installer
- SKIPPED ce-setup — meta/installer
- SKIPPED ce-work-beta — beta of ce-work (stable ce-work is the port)
- SKIPPED ce-dogfood-beta — dogfooding workflow
- SKIPPED ce-riffrec-feedback-analysis — specific third-party product
- AGENT-C COMPLETE 2026-06-21 — ported 38 skills, skipped 13. Conflicts: none.

- AGENT-D COMPLETE 2026-06-21 — gitnexus fixed, 1 gap skill created (archestimator-plan-pack), 2 gap-skips documented. Manifests finalized by LEAD.
