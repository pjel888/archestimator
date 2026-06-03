# Open Questions and Decisions

**Date:** 2026-06-03

## Decisions made by this planning agent

| Decision | Evidence | Status |
|---|---|---|
| Keep `main` as production/default branch | Current origin HEAD is `main`; CI targets `main`; no `production` branch exists | Recommended; Philip approval required before protection changes |
| Add `beta` as protected closed-beta/staging branch | Closed beta needs environment separation; no pre-prod branch exists | Recommended future change |
| Do not add long-lived `dev` now | Small startup close to beta; branch drift risk; no current `dev` evidence | Optional only after throughput proves need |
| Keep `.ai` canonical and Notion mirror-only | `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md` already says Notion may mirror only | Adopted in plan |
| Do not direct-update Notion in this repo-local planning pass | External side effect; local planning folder can create payload safely | Payload created |
| Do not enforce ADD globally before dry runs | Process overhead risk | Phase 6 gate required |

## Required explicit answers

| Question | Recommended answer | Requires |
|---|---|---|
| Should `main` remain production, or separate `production`/`prod` branch? | Keep `main` as production for now | Philip/GitHub admin approval |
| Should ArchEstimator use long-lived `dev`? | No by default; keep short-lived branches into `beta`/`main` | Philip decision if feature volume changes |
| Should pre-production be `beta` or `staging`? | Use `beta` branch, label environment `beta/staging` | Philip/GitHub/Vercel approval |
| Should protections block Philip/admin direct pushes? | Start with admin bypass retained for emergency solo-founder recovery; revisit after beta | Philip |
| Which checks before `beta` merge? | `bun run validate`, `bun run build`, relevant focused/e2e tests, no secrets, run log, provider proof only when exposing beta users | GitHub admin + AI |
| Which checks before `main`/production? | Full validation, e2e/perf smoke, release checklist, provider/manual proof, rollback proof, Philip approval | Philip/provider admin |
| How should Notion mirror `.ai`? | Notion pages/databases link to exact `.ai` docs and show mirror status only | Notion admin |
| Should ADD docs live only in `.ai`, or root docs mirror? | Canonical in `.ai`; optional root docs only as lightweight pointers later | Philip |
| Which agent prompts update first? | Feature implementation, bug investigation/fix, hotfix, release candidate, CI failure, Notion sync | codebase AI |

## Assumptions

- GitHub branch protections are not currently inspectable from local git.
- Vercel/Supabase/Resend provider state remains unproven until separate provider commands or dashboard proof exists.
- The current root README stack version drift should be fixed in a separate docs-sync task or future Phase 1 if Philip allows root docs.

## Items requiring Philip

- Approve branch model and protection strictness.
- Select dry-run feature and bug.
- Approve global enforcement after dry-runs.
- Approve any root README/AGENTS changes beyond `.ai`.

## Items requiring GitHub admin

- Create/protect `beta` branch.
- Configure required checks/environments/templates/CODEOWNERS if chosen.
- Decide admin bypass and stale review settings.

## Items requiring provider admin

- Vercel environment/deploy gating proof.
- Supabase staging/linked proof and RLS evidence.
- Resend proof.
- Backup/PITR/rollback proof.

## Items requiring Notion admin

- Create Notion page tree/databases.
- Apply paste-ready payload.
- Keep status mirror synced with `.ai`.

## Items implementation agent may decide

- Exact wording of Phase 1 `.ai/00_system` docs within this plan's constraints.
- Whether prompt templates live under `.ai/08_prompts` only or split reusable procedures into `.ai/11_skills`.
- Whether CI workflow should split fast/full gates once GitHub branch decision is approved.
