# Codebase Research

## Commands run
- Safety preflight ran: `pwd`, `git rev-parse --show-toplevel`, `git status --short --branch`, `git branch --show-current`, `git worktree list`, `git remote -v`, `git fetch --prune origin`, `git log --oneline -5`.
- Branch evidence: current branch `main`, tracking `origin/main`, HEAD `106370a docs(ai): plan agentic development framework rollout` before this refinement.
- Worktree evidence: only `/Users/philiplewis/archestimator` on `main` was listed by `git worktree list`.
- Remote evidence: `origin https://github.com/pjel888/archestimator.git` for fetch/push.
- Git warning evidence: git reported `.git/gc.log` / too many unreachable loose objects. Do not run destructive cleanup; track as maintenance risk only.
- code-review-graph evidence: architecture overview succeeded with 120 communities, 4 cross-community pairs, 0 warnings; top communities include workshop/estimate/repository/test clusters.
- code-review-graph semantic search for agent protocol/CI/validation returned 0 code nodes, confirming the agent framework is primarily docs/config/harness surface, not source-code symbols.
- GitNexus CLI evidence: `npx gitnexus status -r archestimator` and `npx gitnexus query -r archestimator ...` failed with `Cannot destructure property 'package' of 'node.target' as it is null`; use code-review-graph as current graph surface and have implementation repair/check GitNexus before code-symbol impact claims.
- Package evidence from `package.json`: Next.js `16.2.6`, React `19.2.6`, Bun scripts, Tailwind CSS `4.3.0`, Supabase JS `2.106.2`, TanStack Query `5.100.14`, Zustand `5.0.14`, Vitest DOM, Playwright, custom design-system linter.
- CI evidence from `.github/workflows/ci.yml`: pull_request and push to `main`/`feat/**`; checkout, setup Bun, `bun install --frozen-lockfile`, `bun run validate`, `bun run build`, Playwright Chromium install, `bun run test:e2e`, route transition performance smoke.
- Source-of-truth evidence: `AGENTS.md` and `.ai/AGENTS.md` point agents to `.ai`; `.ai/README.md`, `.ai/00_system/*`, `.ai/10_state/*`, `DESIGN.md` define canonical current-state/validation/design rules.
- Closed beta evidence: `.ai/01_roadmap/README.md` and `.ai/10_state/current-state.md` say public launch and controlled beta remain NO-GO until external/provider/manual proof gates pass.

## Files/folders inspected
- Required chain: `AGENTS.md`, `.ai/README.md`, `.ai/00_system/ai-folder-canonical-map.md`, `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`, `.ai/00_system/VALIDATION_MATRIX.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `.ai/10_state/known-issues.md`, `.ai/01_roadmap/README.md`, `DESIGN.md`, `package.json`, `README.md`, `.github/workflows/ci.yml`.
- Agent surfaces: `.ai/12_agents/README.md`, `.ai/12_agents/payloads/*`, `.ai/08_prompts/*`, `.ai/11_skills/*`, `.agents/skills/*`, `.claude/settings.json`, `.codex/*`, `.cursor/mcp.json`, `.gemini/ralph/state.json`, `.commandcode/agents/*`, `.commandcode/taste/*`, `CLAUDE.md`, `GEMINI.md`.
- Related plans/logs: current plan folder docs 00–23, `.ai/05_logs/2026-06-03-agentic-development-framework-plan.md`, `.ai/15_Bugs/2026-06-03-stack-version-source-of-truth-drift.md`.

## Discovered local agent/harness surfaces

| Surface | Status | Evidence | Quality / gap |
|---|---|---|---|
| `AGENTS.md` | canonical repo entrypoint | root file exists | strong `.ai` pointer; future implementation may add one thin link to agent/harness rollout without duplicating policy |
| `.ai/AGENTS.md` | `.ai` subtree instructions | exists | strong `.ai` taxonomy, docs-only validation; keep |
| `.ai/12_agents/README.md` | canonical role contract folder | exists | lists Hermes, Cursor, DeepSeek; payload set does not fully match |
| `.ai/12_agents/payloads/codex.md` | active payload | exists | thin but not operationally enforceable enough |
| `.ai/12_agents/payloads/claude.md` | active payload | exists | thin but lacks safety commands/write scopes |
| `.ai/12_agents/payloads/opencode.md` | active payload | exists | thin; needs installed-schema warning |
| `.ai/12_agents/payloads/commandcode.md` | active payload | exists | thin; must align with `.commandcode/agents` sentinels |
| `.ai/12_agents/payloads/antigravity.md` | active payload | exists | thin; good `agy` role note; needs worktree/validation gates |
| `.ai/12_agents/payloads/kimi.md` | active payload | exists | thin; needs UI/design-system gates |
| `.ai/12_agents/payloads/deepseek.md` | active payload | exists | thin; needs debug/read-only default and escalation rules |
| `.ai/12_agents/payloads/gemini.md` | deprecated payload | exists | correctly deprecated; root `GEMINI.md` still lacks explicit deprecation text |
| `.ai/12_agents/payloads/hermes.md` | missing | README names Hermes | must be created or Hermes removed from active roster by future implementation |
| `.ai/12_agents/payloads/cursor.md` | missing | README names Cursor/future tools | create if Cursor is approved for repo work, otherwise document as MCP-only/unapproved |
| `.ai/12_agents/payloads/ollama.md` | missing | policy says non-agent | optional prohibition/embedding-only note to prevent accidental chat-model routing |
| `.ai/08_prompts/*` | prompt library | exists | includes plan creation/refinement/implementation and agentic framework prompt; missing finalized template matrix for all workflow modes |
| `.ai/11_skills/*` | project playbooks | exists | few product/research/data playbooks only; missing agent framework/dry-run/run-log playbooks |
| `.agents/skills/*` | local skill compatibility folder | exists | skills/playbooks only; no `.agents/README.md` pointer; do not treat as canonical brain |
| `.claude/settings.json` | Claude hooks | exists | code-review-graph hooks only; no Claude-specific memory/settings policy beyond root `CLAUDE.md` |
| `CLAUDE.md` | Claude entrypoint | exists | root points to `AGENTS.md`/`.ai`; stack note says older local-first baseline and should be updated in future implementation/docs-sync if allowed |
| `.codex/config.toml`, `.codex/hooks.json` | Codex surfaces | exist | code-review-graph MCP/hooks; no Codex role payload bridge besides root `AGENTS.md` and `.ai/12_agents/payloads/codex.md` |
| `.cursor/mcp.json` | Cursor MCP config | exists | code-review-graph MCP only; no Cursor rules/instructions folder found |
| `.gemini/ralph/state.json` | stale Gemini/Ralph state | exists | Gemini is deprecated; future implementation should decide whether to archive/remove state safely |
| `GEMINI.md` | Gemini entrypoint | exists | contains graph rules only; conflicts with Gemini phased-out policy by omission |
| `.commandcode/agents/*.md` | CommandCode sentinel agents | exists | many domain sentinel prompts, heavy and not thin `.ai` pointers; future plan must avoid drift and add a pointer/compatibility pattern |
| `.commandcode/taste/*` | CommandCode taste rules | exists | useful style/workflow preferences; must be reconciled under `.ai` canonical rules |
| `.github/workflows/ci.yml` | CI harness | exists | strong basic validation; needs progressive security hardening and docs-compliance after dry-run |
| `.github/copilot-instructions.md` | absent | not found | create only if GitHub Copilot becomes approved; keep thin pointer to `.ai` |
| `.opencode/` | absent | not found | do not invent; verify installed OpenCode docs/schema before future config |
| `.commandcode` | present | local sentinel/taste surfaces | plan integration needed |

## Existing patterns to follow
- `.ai` taxonomy and `.ai/AGENTS.md` subtree rules.
- `AGENTS.md` and `CLAUDE.md` graph-first guidance.
- `VALIDATION_MATRIX.md` and package scripts for validation gates.
- `.ai/15_Bugs` bug-plan structure.
- `.ai/05_logs` human-readable run logs.
- Existing payloads are thin pointers; future implementation should keep them thin but add operational fields.

## Current behavior
- The repo has strong high-level `.ai` governance but weak operational agent payload enforcement.
- `.agents` exists and is useful as a skills folder, but it is not the canonical agent contract folder.
- Root Gemini entrypoint exists despite Gemini being deprecated by `.ai/10_state/decisions.md`.
- CommandCode has many rich domain sentinels; useful, but heavy enough to drift if not pointed back to `.ai`.

## Gaps/unknowns
- Hermes is listed in `.ai/12_agents/README.md` but has no payload.
- Cursor is listed as a future/current tool in docs and has MCP config, but no payload/rules.
- Ollama has no explicit non-agent payload/prohibition note.
- OpenCode/Kimi/CommandCode/Hermes official harness docs or installed behavior must be reverified during implementation before adding config files.

## External research summary
See `32_LEAN_ENTERPRISE_DEVELOPER_OPERATING_MODEL_RESEARCH.md`. Current research was performed against primary/official sources where available. Source list:

- DORA, "Trunk-based development" — https://dora.dev/capabilities/trunk-based-development/ — accessed 2026-06-03.
- DORA, "Continuous delivery" — https://dora.dev/capabilities/continuous-delivery/ — accessed 2026-06-03.
- GitHub Docs, "About rulesets" — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets — accessed 2026-06-03.
- GitHub Docs, "About protected branches" — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches — accessed 2026-06-03.
- GitHub Docs, "Secure use reference" — https://docs.github.com/en/actions/reference/security/secure-use — accessed 2026-06-03.
- GitHub Docs, "OpenID Connect" — https://docs.github.com/en/actions/concepts/security/openid-connect — accessed 2026-06-03.
- GitHub Docs, "Using environments for deployment" — https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment — accessed 2026-06-03.
- GitHub Docs, "About code owners" — https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners — accessed 2026-06-03.
- NIST SP 800-218, SSDF v1.1 — https://csrc.nist.gov/pubs/sp/800/218/final — accessed 2026-06-03.
- SLSA specification v1.2 — https://slsa.dev/spec/v1.2/ — accessed 2026-06-03.
- OWASP Top 10 CI/CD Security Risks — https://owasp.org/www-project-top-10-ci-cd-security-risks/ — accessed 2026-06-03.
- OpenAI Codex / AGENTS.md guide — https://developers.openai.com/codex/guides/agents-md — accessed 2026-06-03; implementation agent must reverify because Codex docs can change quickly.
- Anthropic Claude Code docs — https://docs.anthropic.com/en/docs/claude-code/overview — accessed 2026-06-03; see memory/settings/hooks/slash-command docs before changing Claude surfaces.
- OpenCode docs — https://opencode.ai/docs/ — accessed 2026-06-03; implementation agent must verify installed OpenCode schema before changing OpenCode config.
- Google Gemini CLI repository/docs — https://github.com/google-gemini/gemini-cli — accessed 2026-06-03; ArchEstimator policy keeps Gemini deprecated unless Philip reapproves.
- Cursor rules docs — https://docs.cursor.com/context/rules — accessed 2026-06-03.
- GitHub Copilot custom instructions — https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot — accessed 2026-06-03.
- Kimi / Moonshot docs — https://platform.moonshot.ai/docs — accessed 2026-06-03; no repo-local Kimi harness file was found in this audit.

## Current app/routes/test structure evidence

The framework plan was checked against the live application shape to avoid treating docs as proof of implementation:

- Public/marketing routes found under `src/app`: `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/login`, `/beta/access-required`.
- Auth/collaboration/share routes found: `/auth/callback`, `/invite/[token]` plus accept/continue/sign-out routes, `/share/[token]`, `/api/share/[token]`, `/api/webhooks/resend`.
- Protected workshop routes found: `/workshop`, `/workshop/projects`, `/workshop/projects/[projectId]`, `/workshop/library`, `/workshop/templates`, `/workshop/settings/*`, `/workshop/feedback`, `/workshop/components` redirect surface.
- AI/API routes found: `/api/ai/ask`, `/api/ai/package-builder`, component-library/project image routes, `/api/health`.
- Tests found across `tests/unit`, `tests/vitest`, and Playwright E2E; relevant validation scripts are in `package.json` and `.github/workflows/ci.yml`.
- Relevant specs under `.ai/06_specs` include `feature-inventory.md`, `ai-assistant-and-package-builder-spec.md`, `shared-link-and-publication-spec.md`, `teamspaces-collaboration-spec.md`, `current-project-estimates-component-library-spec.md`, `state-and-supabase-foundation.md`, and `design-md-agentic-design-workflow.md`.

These surfaces are not changed by this plan, but future agent-framework implementation must keep validation gates aligned with these routes/tests when prompts authorize source work.
