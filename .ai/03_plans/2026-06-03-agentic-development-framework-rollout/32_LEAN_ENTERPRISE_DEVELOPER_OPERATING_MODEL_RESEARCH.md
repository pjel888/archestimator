# Lean Enterprise Developer Operating Model Research

## Sources
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

## Synthesis for ArchEstimator
- DORA supports small batches, trunk-based/short-lived branches, fast feedback, and keeping the system deployable. For ArchEstimator this means protected `main`, short-lived feature/fix/hotfix branches, and optional `beta` only when proof gates need separation.
- Continuous delivery does not require premature continuous deployment. Keep deployments/manual provider actions approval-gated while automating local/CI evidence.
- GitHub rulesets/protections should start advisory/evaluate to avoid locking out a solo founder; required checks and CODEOWNERS can become blocking after dry-run success.
- GitHub Actions hardening should begin with explicit permissions, trusted/pinned actions policy, environment approvals, and OIDC where approved.
- SSDF maps to practical controls: define responsibilities, protect secrets, produce secure software with tests/reviews, and respond to vulnerabilities with bug plans/run logs.
- SLSA should be incremental: source/build provenance and trusted workflows matter, but heavy attestations can wait until release volume justifies them.
- OWASP CI/CD risks map directly to AI-agent risks: agents can weaken flow control, leak credentials, introduce untrusted dependencies/actions, poison pipelines, or claim false artifact integrity.
- AI coding harness docs are tool-specific and change quickly; keep local adapters thin and reverify official docs before config changes.

## Adopt now
`.ai` canonical rules, payload schema, run logs, dry-runs, no-secrets, graph-first, small branches, validation gates, provider-proof separation, advisory GitHub hardening plan.

## Defer
Permanent dev branch, heavy compliance attestations, fully automated provider deployment, enforced rulesets without dry-run, Notion as authoritative PM database.

## Reject as enterprise theater
Large process documents with no validation, long-lived branch farms, duplicate tool-specific brains, blocking every small docs edit with full e2e, compliance labels without proof.

---

## 2026-06-03 Phase 1A/1B hard-gate refinement

**Refinement timestamp:** `2026-06-03T15:04:34Z`.

This document is part of a **plan-refinement-only** pass. It does not implement source code, app behavior, dependencies, migrations, package files, runtime/generated files, provider changes, GitHub settings, branch protection, Notion mutations, or secrets. Only `.ai` planning/state/log/bug documents are in scope for this task.

### Phase 1A — repo-local framework implementation

Future Phase 1A is repo-local only. It may update `.ai/00_system`, standardize `.ai/12_agents` payloads, finalize `.ai/08_prompts` templates, finalize `.ai/11_skills` playbooks, and add/adjust thin harness adapters for `AGENTS.md`, `.agents/README.md`, `GEMINI.md`, `.commandcode`, `.codex`, `.claude`, `.cursor`, `.gemini`, and other discovered surfaces where authorized. It must resolve or fail-close Hermes, Cursor, Gemini, Ollama, `.agents`, and CommandCode drift policy. It must repair or bug stale root agent-doc facts. It must record graph/tool evidence and use code-review-graph fallback if GitNexus remains broken.

Phase 1A can end as `READY_FOR_PHASE_1A_IMPLEMENTATION` or `PHASE_1A_COMPLETE`, but **not** `PHASE_1_COMPLETE`.

### Phase 1B — Notion mirror hard completion gate

Future Phase 1B starts only after Phase 1A is committed and pushed. It must update the ArchEstimator Notion mirror for the framework, agent roster, prompt library, run logs, dry-run/eval status, GitHub guardrails, provider-proof gates, release readiness, and current proof boundary. It must verify stack facts from live `package.json` at implementation time, include source `.ai` paths, commit hash, mirror date, proof boundary, anti-drift notice, and no secrets.

If Notion mutation is unavailable, unauthorized, or fails, the future implementation agent must create a dated `.ai/15_Bugs` blocker and report `PHASE_1A_COMPLETE_PHASE_1B_BLOCKED`, not `PHASE_1_COMPLETE`. Notion is a mirror only; `.ai`, source, tests, package scripts, commits, and provider evidence remain authoritative.

### Readiness boundary

Current working assessment: Phase 1 repo implementation readiness is approximately 94-96% before this refinement and may honestly reach 98% plan readiness with fail-closed Phase 1A/1B decisions. Global framework enforcement is **not ready**. Enforcement implemented is **0%**. Closed beta remains **NO-GO** until separate external/manual provider proof gates pass. 100% readiness must not be claimed while known gaps remain.

### Live evidence from this refinement

- `git status --short --branch` initially reported `## main...origin/main`; branch `main`; worktree clean at `34b0c3f`.
- `git fetch --prune origin` completed with non-blocking git gc warning about `.git/gc.log` and many unreachable loose objects; no destructive cleanup was run.
- code-review-graph MCP worked: 477 files, 4,361 nodes, 65,147 edges, last updated 2026-06-03T22:34:39; communities above size 20: `workshop-estimate`, `estimates-estimate`, `workshop-project`.
- GitNexus CLI attempts failed with `Cannot destructure property 'package' of 'node.target' as it is null`; future implementation must not claim GitNexus readiness until repaired.
- `package.json` evidence: Next.js 16.2.6, React/React DOM 19.2.6, TypeScript ^6.0.3, Tailwind CSS ^4.3.0, Supabase JS 2.106.2, Supabase SSR 0.10.3, TanStack Query 5.100.14, Zustand 5.0.14, Vitest ^4.1.7, Playwright ^1.60.0.
- `.github/workflows/ci.yml` runs `bun run validate`, `bun run build`, `bun run test:e2e`, and `bun run test:e2e:perf`.
- Route/test inventory found 48 app page/API route files, 330 TypeScript/TSX files under `src`, and 194 files under `tests`/`e2e`.
- Notion was inspected read-only. `05 Engineering and Architecture` has stale React/DOM 19.2.4 and Supabase JS 2.105.4 against live `package.json`; `07 QA, Evidence, and Drift` has stale graph stats. No Notion mutation occurred.

### Bug/blocker references

- `.ai/15_Bugs/2026-06-03-agent-harness-payload-enforcement-gaps.md`
- `.ai/15_Bugs/2026-06-03-stack-version-source-of-truth-drift.md`
- `.ai/15_Bugs/2026-06-03-notion-agent-framework-mirror-and-stack-drift.md`
