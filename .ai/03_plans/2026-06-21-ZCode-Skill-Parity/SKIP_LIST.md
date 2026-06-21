# Skip List — Skills Deliberately Not Ported

**Created:** 2026-06-21
**Plan:** `.ai/03_plans/2026-06-21-ZCode-Skill-Parity/`

These skills exist in the Claude / Codex / plugin sources but were **deliberately
not ported** into `.agents/skills/`. Each has a documented reason. This list
exists so future agents don't re-litigate the decision and so the parity audit
is honest about what's excluded and why.

Categories:
1. **Out of scope** — not engineering/research/QA/workflow (personal, content,
   business utilities).
2. **Superseded** — a better skill already covers it.
3. **Tool-vendor-specific** — only works inside a specific tool's runtime.
4. **Platform-mismatch** — targets a platform Archestimator doesn't use.
5. **Meta/installer** — bootstrapping utilities, not standalone skills.
6. **Runtime state** — not a skill, just a data store.
7. **Collision-deferred** — same skill on two lanes; first-writer kept it.

---

## Lane A — Codex skips (2)

| name | source | reason |
|------|--------|--------|
| `ian-xiaohei-illustrations` | `~/.codex/skills/` | image generation, not engineering |
| `compound-engineering` | `~/.codex/skills/` | meta-installer dir, not a skill (no SKILL.md; source folder is empty) |

## Lane B — Claude/mattpocock skips (~35)

### Out of scope — personal/content/business utilities (22)
| name | reason |
|------|--------|
| `artifacts-builder` | personal/business utility, not engineering |
| `changelog-generator` | personal/business utility, not engineering |
| `competitive-ads-extractor` | personal/business utility, not engineering |
| `content-research-writer` | content writing, not engineering |
| `developer-growth-analysis` | personal/business utility, not engineering |
| `domain-name-brainstormer` | personal/business utility, not engineering |
| `file-organizer` | personal/business utility, not engineering |
| `image-enhancer` | image processing, not engineering |
| `invoice-organizer` | personal/business utility, not engineering |
| `langsmith-fetch` | LangSmith utility, not engineering-core |
| `lead-research-assistant` | personal/business utility, not engineering |
| `meeting-insights-analyzer` | personal/business utility, not engineering |
| `raffle-winner-picker` | personal/business utility, not engineering |
| `tailored-resume-generator` | personal/business utility, not engineering |
| `twitter-algorithm-optimizer` | social-media utility, not engineering |
| `video-downloader` | media utility, not engineering |
| `writing-beats` | content writing |
| `writing-fragments` | content writing |
| `writing-shape` | content writing |
| `edit-article` | content editing |
| `obsidian-vault` | note-taking vault |
| `ask-matt` | personal coaching, not engineering |

### Superseded (1)
| name | reason |
|------|--------|
| `design-an-interface` | deprecated, superseded by `impeccable` / `hallmark` |

### Tool-vendor-specific / installer / runtime (8)
| name | reason |
|------|--------|
| `scaffold-exercises` | course/exercise authoring, not engineering |
| `setup-matt-pocock-skills` | bootstrap installer |
| `setup-pre-commit` | generic git hooks (repo has its own) |
| `migrate-to-shoehorn` | TS migration utility, one-off |
| `git-guardrails-claude-code` | Claude-Code-specific guardrails |
| `teach` | personal teaching/coaching |
| `grilling` | personal coaching |
| `grill-me` | personal coaching |
| `skill-share` | skill sharing utility |
| `learned` | learned-facts store (runtime state, not a skill) |

### Collision-deferred (1)
| name | reason |
|------|--------|
| `kimi-webbridge` | already ported by Lane A (first-writer-wins); both lanes listed it |

## Lane C — Superpowers + Compound Engineering skips (13)

### Superpowers (1)
| name | reason |
|------|--------|
| `using-superpowers` | meta-index, not a standalone skill |

### Compound Engineering (12)
| name | reason |
|------|--------|
| `ce-dhh-rails-style` | Rails/Ruby-specific; Archestimator is Next.js |
| `ce-test-xcode` | iOS/Xcode-specific |
| `ce-frontend-design` | superseded by `impeccable` / `hallmark` |
| `ce-gemini-imagegen` | image generation |
| `ce-slack-research` | Slack integration not in scope |
| `ce-demo-reel` | demo video production |
| `ce-sessions` | session management (runtime state) |
| `ce-update` | meta/installer |
| `ce-compound-refresh` | meta/installer |
| `ce-setup` | meta/installer |
| `ce-work-beta` | beta of `ce-work` (stable `ce-work` is the port) |
| `ce-dogfood-beta` | dogfooding workflow |
| `ce-riffrec-feedback-analysis` | specific third-party product |

## Lane D — Gap-skill skips (2 — correctly assessed as already covered)

| candidate | reason not created |
|-----------|-------------------|
| `archestimator-rls-audit` | the generic `supabase` skill already has an extensive RLS/security checklist (user_metadata, security_invoker views, UPDATE-needs-SELECT, TO authenticated BOLA, WITH CHECK, SECURITY DEFINER traps, storage upsert). Project-specific schema/RLS facts already live in per-pack contract docs (e.g. `2026-06-20-Library-Page-Overall-Improvement/33-DB-RLS-AND-MIGRATION-CONTRACT.md`). A skill would duplicate, not add coverage. |
| `archestimator-proposal-package` | `.ai/06_specs/proposal-package-system.md` is a feature spec (Excel export topology + shared-link publication flow), not a repeatable skill-shaped discipline. No agent decision-tree or workflow is missing that a skill would encode. |

---

## Totals

- **Skipped:** ~50 skills (exact count varies by how grouped-personal-utilities are counted; 2 + ~35 + 13 + 2 = ~52 line items)
- **Ported:** 87 (29 codex + 19 claude + 13 superpowers + 25 compound-eng + 1 new gap)
- **Pre-existing retained:** 9
- **Total active in `.agents/skills/`:** 96

## Re-evaluation policy

A skipped skill should be **re-evaluated for porting** if:
1. Archestimator's scope expands to cover its domain (e.g. we add a Rails service → revisit `ce-dhh-rails-style`), OR
2. The superseding skill is removed or degraded, OR
3. A concrete recurring task in this repo would clearly benefit from it.

Log any re-evaluation as a new `GAP-RECHECK` line in `LOOP_LEDGER.md`.
