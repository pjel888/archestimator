# 02 — Feature Brief and Scope

## Source brief (verbatim from `PROMPT.md`)

> **Goal:** Create a plan pack that closes the historical Supabase
> provider-exit work with explicit proof, accepted gaps, rollback posture, and
> post-exit smoke checks.
>
> **Evidence To Start From:**
> - `AGENTS.md` says Supabase project `ebxxqidacheyapmmzavr` is historical
>   evidence only and must not be mutated.
> - `.ai/10_state/current-state.md` fast path records provider-exit readiness
>   as not yet final.
> - `scripts/generate-cloudflare-provider-exit-pack.ts` checks operator
>   evidence but cannot itself prove external provider state.
> - Cloudflare is the active substrate via `wrangler.jsonc`, D1/R2/DO/Queues/
>   Cron/Email bindings, and `migrations/`.
>
> **Required Plan Pack:** Define the final provider-exit proof checklist,
> Supabase export/retention decision, Cloudflare smoke checks, data-loss
> acceptance rules, operator evidence format, rollback/no-rollback decision
> record, and a safe no-mutation verification path.
>
> **Constraints:** Do not mutate Supabase or unrelated Cloudflare projects.
> Keep secrets out of the repo. Distinguish local evidence, hosted Cloudflare
> evidence, and owner/operator attestations.
>
> **Stop Condition:** The pack gives a future executor a precise way to mark
> provider exit complete, or to identify the exact external proof still
> blocking completion.

## Scope IN

- The 12-gate provider-exit closure checklist (gate source, evidence class,
  closure path or accepted-deferral).
- The 4 OPEN gates' decision framework (options, recommendation, owner,
  rollback impact).
- The sanitized operator-record schema and the exact fields each open gate
  needs (already implemented by the generator script — documented, not
  re-implemented).
- The post-exit Cloudflare smoke command list (read-only host probes).
- The Supabase export/retention/loss decision framework and data-loss
  acceptance rule.
- The rollback-vs-no-rollback decision record.
- The no-mutation verification path that proves closure readiness without
  touching any provider.
- Evidence-class taxonomy (local-static, local-automated, operator-attestation,
  hosted-provider-backed, owner-decision) applied to every gate.
- The credential-material taxonomy for any secret/token/cookie/mailbox
  material touched by closure.

## Scope OUT (explicit non-goals)

- Mutating Supabase project `ebxxqidacheyapmmzavr` or the unrelated
  `archestimator` provider project.
- Cancelling, downgrading, deleting, rotating, or exporting any provider
  resource (those are future owner/operator actions, gated on OPEN-PE-01).
- Re-implementing or altering `scripts/generate-cloudflare-provider-exit-pack.ts`
  gate logic.
- Changing application code, tests, D1 schema, migrations, R2 policies, DO
  state, Queue config, or Better Auth.
- Changing `wrangler.jsonc` or any infra config.
- Re-running the Cloudflare migration (complete).
- Updating `current-state.md` (separate future doc task after closure lands).
- UI/UX changes (closure is operator-facing, not user-facing — see `05_…`).
- Git branch/worktree operations (shared live worktree).

## Primary flows (operator closure procedure)

1. **Decision flow (OPEN-PE-01)**: Owner decides export posture for Supabase
   data → records decision in operator-record `finalExportsOrRetentionDecision`.
2. **Smoke flow (OPEN-PE-02)**: Operator runs the post-exit smoke command list
   (read-only) → records `postExitSmoke` with `cloudflareSmokePassed=true`,
   `runAt`, `commands[]`, `evidenceSource`.
3. **Persona flow (OPEN-PE-03)**: Operator either runs a real non-owner Google
   account journey (no credentials/cookies recorded) OR records an
   `accepted-deferral` with owner + rationale.
4. **Mailbox flow (OPEN-PE-04)**: Operator either observes a real recipient
   mailbox receipt (no private content recorded) OR records an
   `accepted-deferral`.
5. **Pack regeneration**: Run `bun run cf:provider-exit-pack` → confirm
   `providerExitReady=true` (all 12 gates green).

## Constraints (binding)

- **No provider mutation** until OPEN-PE-01 is decided. Even after decision,
  this plan does not perform mutation — it only defines the safe path.
- **No secrets in repo**: operator record is sanitized; the generator's
  `boundary` string forbids recording secrets, tokens, cookies, raw mailbox
  content, private backup paths, or credential material.
- **Evidence-class honesty**: local evidence cannot prove hosted/provider
  state; operator attestation is not independent truth; accepted-deferral is
  not proof.
- **Standing authorization scope**: Cloudflare-resource authorization applies
  only to resources bound in `wrangler.jsonc`. Supabase
  `ebxxqidacheyapmmzavr` and the unrelated `archestimator` provider project
  are out of bounds for mutation.

## Assumptions

- `ASSUMP-PE-01`: The last provider-exit pack run (2026-07-05T05:07Z) reflects
  current gate state. (Validated: source-scan blockers=0 matches current
  `rg -i supabase src/`=0.)
- `ASSUMP-PE-02`: The 5 upstream JSON artifacts (release gates, provider
  resource readback, email readiness, hosted auth matrix, deploy source smoke)
  remain valid; the generator trusts them at face value.
- `ASSUMP-PE-03`: Cloudflare free-tier posture is unchanged (no paid add-ons
  enabled).
- `ASSUMP-PE-04`: The operator record is the single source of truth for the 6
  operator gates; the generator does not re-derive them.
