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
