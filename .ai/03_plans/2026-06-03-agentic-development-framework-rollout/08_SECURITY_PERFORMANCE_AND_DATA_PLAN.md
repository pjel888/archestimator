# Security, Performance, and Data Plan

**Date:** 2026-06-03

## Security controls

- Branch protection: require PR, required checks, force-push disabled, and explicit admin-bypass decision for `main`, `beta`, and `release/*`.
- Secret handling: no secrets in `.ai`, GitHub docs, prompts, screenshots, Notion, or logs.
- GitHub environments: future `preview`, `beta/staging`, and `production` environments must isolate secrets and require manual approvals for production.
- Vercel/Supabase/Resend separation: provider environments must be proven separately; local config cannot prove hosted state.
- Production deploy approval: manual release gate until beta process is proven.
- Provider-state evidence: dashboard screenshot/CLI JSON/manual proof linked to `.ai` evidence packet.
- Supabase safety: never touch SlateCamp resources; only ArchEstimator project `ebxxqidacheyapmmzavr` may be referenced when Supabase is relevant; schema changes require separate migration plan and type regeneration.

## Dependency and supply-chain policy

- No dependency additions by agents unless explicitly approved.
- Dependency/security audit findings must be recorded in `.ai/05_logs` or `.ai/15_Bugs`.
- CI should eventually include a dependency/security audit policy, but only after it is tuned enough not to block beta on noisy advisory output.
- Agents must not install packages to make CI pass without approval.

## Data and provider boundaries

- `.ai` may store redacted evidence links, not secrets.
- Notion may mirror redacted status and links, not credentials or raw provider tokens.
- Provider proof must distinguish local, preview, beta/staging, production, and linked Supabase states.
- RLS/Supabase claims need tests or provider evidence; local migration files alone are insufficient.

## Performance impact

- This planning package has no runtime performance impact.
- Future CI additions may increase build time; split fast PR checks from full beta/release checks if feedback gets too slow.
- Branch model should avoid long-lived branch drift that forces expensive reconciliation.

## Failure modes and mitigations

| Failure mode | Mitigation |
|---|---|
| Branch protection blocks urgent owner fix | Pre-decide admin bypass/emergency hotfix path |
| Agent commits secret/provider proof screenshot with token | Secret-scan and screenshot redaction checklist |
| Notion becomes stale authority | Every Notion status links to `.ai`; weekly anti-drift review |
| CI too slow for iteration | Fast PR gate + full beta/main gate split |
| Agent weakens tests to pass | CI failure protocol forbids weakening without approval |
| Provider claim from local evidence | Release protocol requires manual/provider proof |
