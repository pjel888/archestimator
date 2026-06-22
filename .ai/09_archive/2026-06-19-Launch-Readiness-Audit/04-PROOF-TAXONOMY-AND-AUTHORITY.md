# Proof Taxonomy And Authority Boundaries

Date: 2026-06-19. This file prevents two recurring failures: overclaiming proof
from the wrong environment and treating planning docs as permission to mutate
providers.

## Proof classes

| Proof class | What it can prove | What it cannot prove |
|---|---|---|
| Local source inspection | Code path, file ownership, static invariants, missing files. | Live provider settings, hosted env, production routing, live DB state. |
| Local tests/typecheck/build | Local behavior under test fixtures and build contracts. | Provider settings, real user sessions, hosted network behavior. |
| Local DB / scratch Supabase | Migration reproducibility, RLS/query behavior on the tested DB. | Current hosted project settings unless pointed at `ebxxqidacheyapmmzavr` with read proof. |
| Live provider read | Current Supabase/Vercel/GitHub setting or status. | Future stability, owner intent, or permission to change it. |
| Live provider mutation | Actual state change in Supabase/Vercel/GitHub/CI. | Allowed only in an implementation task with authority; not authorized by this audit. |
| Browser dev-server proof | Interaction and rendering in local dev. | Production bundle behavior, hosted auth/session behavior. |
| Local production-build proof | `next build` / `next start` runtime under local auth/session setup. | Hosted Vercel proof, CDN/geography/provider config. |
| Hosted production proof | Real deployed behavior. | Source intent unless tied back to commit/env evidence. |
| Owner/legal decision | Accepted product/legal/ops posture. | Technical implementation correctness. |
| Manual runbook proof | A human-run operational path works once. | Automation, self-serve capability, or future SLA compliance. |

## Authority rules

- This audit and its subpacks are **planning/readiness only**. They do not authorize
  Supabase, Vercel, GitHub, CI, DNS, env, email, or production mutations by
  themselves.
- Provider mutations require an active implementation task scoped to that provider
  and must cite the exact project/account. Supabase scope is strictly
  `ebxxqidacheyapmmzavr`.
- High-blast DB actions such as B6 and B8 need a dated implementation plan, migration
  proof, rollback/dry-run path, and reviewer gate before they are claimed closed.
- A raw audit `launch_blocker:true` field is historical evidence until reconciled.
  Use `03-LAUNCH-GATE-DECISION-REGISTER.md` for go/no-go classification.
- Do not claim hosted production proof from local `next start`, dev server,
  screenshots, or source review.
- In a dirty worktree, treat unrelated source changes as user/other-agent work.
  Planning-doc edits must not revert or normalize unrelated code diffs.

## Minimum proof artifact schema

Every closure artifact must include: gate id, timestamp/timezone, actor, authority class,
provider project/account, branch/commit, command/query/provider read, before/after result,
rollback or recovery path, evidence path, and residual risk. If any field is not applicable,
write `not applicable` and why.

## Evidence wording standards

Use these phrases precisely:

| Phrase | Required evidence |
|---|---|
| "local source verified" | File/line or `rg` result. |
| "local build verified" | Command, date, exit status. |
| "local production-build proof" | `next build` + `next start` or equivalent, with auth/session setup described. |
| "live DB verified" | Query/read against `ebxxqidacheyapmmzavr`, date, and result. |
| "hosted provider verified" | Provider dashboard/API read, timestamp, project/account identifier. |
| "owner accepted" | Decision record or direct owner instruction. |
| "implemented" | Source/provider/db mutation plus verification evidence. |
