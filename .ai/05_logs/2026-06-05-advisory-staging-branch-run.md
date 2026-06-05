# 2026-06-05 Advisory Staging Branch Run

## Receipt

```txt
AGENT_RECEIPT:
mode=provider-proof
scope=GitHub branch-state audit, advisory staging branch creation, .ai state evidence
non_goals=CI re-enable, branch protection, rulesets, Vercel deploys, production aliases, Supabase/Resend/provider settings beyond GitHub branch creation
writes=.ai/10_state, .ai/03_plans/2026-06-05-agentic-development-cicd-standardization, .ai/05_logs; GitHub branch refs/heads/staging
validation=git/gh live branch proof, git diff --check, graph change review, repository status
proof_boundary=provider-proven for branch existence only; enforcement/manual-hosted proof pending
stop_condition=staging branch exists at current main SHA, docs record advisory status, remaining gates named
```

## Goal

Make the Mac mini and MacBook Pro workflow smoother by verifying the
agentic-development branch model, creating the shared staging/testing branch if
safe, and recording what is still required before enforcement can be claimed.

## Live audit summary

- Local checkout: `/Users/philiplewis/archestimator` on `main`, clean before
  provider mutation.
- `origin/main` at
  `07110b9fd5bd8a41890f5e4eaa2fdc14d0aefd1a`.
- GitHub `CI`: `disabled_manually` workflow id `277898857`.
- Recent CI runs: latest listed runs are May 18 failures; no current June 5
  green CI proof.
- GitHub `main`: `protected:false`.
- GitHub `staging`: absent before this run.
- Rulesets/protection API: blocked by GitHub Pro/public-repo capability 403.

## Action taken

Created the remote branch directly from current `origin/main`:

```bash
git push origin origin/main:refs/heads/staging
```

## Verification

- `git rev-parse origin/main`:
  `07110b9fd5bd8a41890f5e4eaa2fdc14d0aefd1a`.
- `git rev-parse origin/staging`:
  `07110b9fd5bd8a41890f5e4eaa2fdc14d0aefd1a`.
- `git rev-list --left-right --count origin/main...origin/staging`: `0 0`.
- GitHub branch API for `staging`: `protected:false` at the same SHA.

## Files updated

- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/03_plans/2026-06-05-agentic-development-cicd-standardization/03_BRANCHING_AND_ENVIRONMENT_MODEL.md`
- `.ai/03_plans/2026-06-05-agentic-development-cicd-standardization/16_AUDIT_APPENDIX_COMMANDS_AND_EVIDENCE.md`
- `.ai/05_logs/2026-06-05-advisory-staging-branch-run.md`

## Remaining gates

1. Re-enable or replace GitHub CI and prove a current green run.
2. Add PR template, CODEOWNERS, and advisory governance checks.
3. Resolve GitHub private-repo protection/ruleset capability.
4. Protect `main` and `staging` with stable required checks.
5. Add controlled Vercel staging/production release proof while keeping Git
   deployments disabled until enforcement is ready.

## Final status

`origin/staging` exists and is provider-proven as an advisory-only branch.
Branch-bootstrap closeout keeps it fast-forwarded with `origin/main`; verify
the current parity live because branch heads can move after this timestamped
log. CI, required checks, branch protection, and hosted staging proof remain
open.
