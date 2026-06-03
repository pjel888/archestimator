# Codebase Research

## Files and folders inspected

Required chain: `AGENTS.md`, `.ai/AGENTS.md`, `.ai/README.md`, `.ai/00_system/ai-folder-canonical-map.md`, `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`, `.ai/00_system/VALIDATION_MATRIX.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `.ai/10_state/known-issues.md`, `.ai/01_roadmap/README.md`, `DESIGN.md`, `package.json`, `README.md`, `.github/workflows/ci.yml`, `.ai/12_agents`, `.ai/08_prompts`, `.ai/11_skills`, `.agents`, `.claude`, `.codex`, `.cursor`, `.gemini`, `.commandcode`, `.github`, `.ai/06_specs`, related plans, and every file in this plan folder.

## Commands run and evidence

- Initial safety: `pwd`, `git rev-parse --show-toplevel`, `git status --short --branch`, `git branch --show-current`, `git worktree list`, `git remote -v`, `git fetch --prune origin`, `git log --oneline -5`.
- Graph: code-review-graph `list_graph_stats` and `list_communities`; GitNexus CLI status/query failed with `Cannot destructure property 'package' of 'node.target' as it is null`.
- Agent/harness inventory: required `find` commands for instruction/config surfaces; `.ai/12_agents`, `.ai/08_prompts`, `.ai/11_skills`, `.agents`, `.claude`, `.codex`, `.cursor`, `.gemini`, `.commandcode`; `rg` for agent/payload/harness/GitNexus/Notion terms.
- Package/CI/routes/tests: extracted `package.json` scripts/dependencies, read `.github/workflows/ci.yml`, counted routes/source/tests.
- Notion: workspace search and read-only fetches for Homebase, Engineering and Architecture, Technical Inventory, QA/Evidence/Drift.

## Current repo facts

- Branch: `main` tracking `origin/main`, starting HEAD `34b0c3f`, clean starting worktree.
- Stack from `package.json`: Next.js 16.2.6, React/DOM 19.2.6, TypeScript ^6.0.3, Tailwind CSS ^4.3.0, Supabase JS 2.106.2, Supabase SSR 0.10.3, TanStack Query 5.100.14, Zustand 5.0.14, Vitest ^4.1.7, Playwright ^1.60.0.
- CI: `bun run validate`, `bun run build`, `bun run test:e2e`, `bun run test:e2e:perf`.
- Surface: 48 app page/API route files, 330 TypeScript/TSX source files, 194 test/e2e files.
- Launch/closed beta: `.ai/01_roadmap/README.md` remains NO-GO pending external/manual provider proof.

## Agent/harness inventory results

Found: `AGENTS.md`, `.ai/AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.ai/12_agents/payloads/{antigravity,claude,codex,commandcode,deepseek,gemini,kimi,opencode}.md`, `.ai/08_prompts/*`, `.ai/11_skills/*`, `.agents/skills/*`, `.claude/settings.json`, `.codex/config.toml`, `.codex/hooks.json`, `.cursor/mcp.json`, `.gemini/ralph/state.json`, `.commandcode/agents/*`, `.commandcode/taste/*`, `.github/workflows/ci.yml`.

Gaps: no Hermes payload, no Cursor payload, no explicit Ollama non-agent payload/prohibition note, `.agents` lacks README shim, root `GEMINI.md` does not fail closed, `.gemini/ralph/state.json` remains despite Gemini deprecation, `.commandcode` rich instructions can drift, root `AGENTS.md` and `CLAUDE.md` include stale local-first/pre-Supabase facts.

## Notion read-only audit

Notion was inspected read-only. `05 Engineering and Architecture` has stale React/DOM 19.2.4 and Supabase JS 2.105.4. Live `package.json` has React/DOM 19.2.6 and Supabase JS 2.106.2. `07 QA, Evidence, and Drift` has stale graph stats (182 files / 1,493 nodes / 21,203 edges / 120 communities) against live code-review-graph (477 files / 4,361 nodes / 65,147 edges / 3 communities). No Notion mutation occurred.

## Related specs/plans

Relevant anchors include `.ai/06_specs/feature-inventory.md`, `.ai/06_specs/design-md-agentic-design-workflow.md`, `.ai/06_specs/shared-link-and-publication-spec.md`, `.ai/06_specs/teamspaces-collaboration-spec.md`, `.ai/03_plans/mvp-launch-readiness-2026-06-01/`, and this plan folder.

## Gaps and unknowns

GitNexus reliability, Notion mutation authorization/tooling, Hermes/Cursor/Ollama decisions, Gemini fail-closed root handling, dry-runs/evals, GitHub/provider/admin proof.

## Primary-source research anchors for future revalidation

DORA/Google Cloud DevOps capabilities, GitHub Docs for rulesets/branch protection/CODEOWNERS/Actions OIDC/environments/security hardening, NIST SSDF SP 800-218, SLSA specification, OWASP Top 10 CI/CD Security Risks, Google Gemini CLI repository/docs, and OpenAI Codex AGENTS.md guidance. Revalidate before enforced implementation.
