# Archestimator PR Checklist

## Agent receipt

```txt
AGENT_RECEIPT:
mode=<plan-only|read-only|implementation|review|debug|release|provider-proof|recovery>
scope=<files/features/providers in scope>
non_goals=<explicitly out of scope>
writes=<allowed write folders or none>
validation=<commands/checks/manual proof required>
proof_boundary=<local-only|provider-proven|manual-proof-pending>
stop_condition=<done/blocker/owner-decision/destructive-approval>
```

## Branch and scope

- [ ] Base branch is `staging` for normal work, or this PR explains the owner-approved exception.
- [ ] Work happened on a scoped branch such as `codex/*`, `feat/*`, `fix/*`, or `docs/*`.
- [ ] No direct edits to shared `main`/`staging` branches were used for normal feature work.
- [ ] Non-goals and provider-proof boundaries are stated in the PR body.

## Evidence and validation

- [ ] Ran `git fetch --prune origin` before finalizing.
- [ ] Checked dirty files and avoided unrelated edits.
- [ ] Used code-review graph/GitNexus for relevant impact/change review.
- [ ] Ran targeted tests or documented why they were not applicable.
- [ ] Ran `git diff --check`.
- [ ] If Vercel/GitHub/Supabase/Resend/provider state changed, provider proof is linked or explicitly marked pending.

## Safety

- [ ] No secrets, tokens, raw cookies, private URLs, or provider payloads are committed.
- [ ] Machine-local state stays ignored (`.omx/`, `.gitnexus/`, generated `.codex/`, `.vercel/`, `.env*`).
- [ ] Vercel production deploy/promotion is not implied by this PR unless explicitly approved and proven.
