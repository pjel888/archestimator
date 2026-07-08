# 00 — Agent Coordination

**Plan folder:** `.ai/03_plans/2026-07-07-provider-exit-final-proof-closure`
**Date:** 2026-07-08 (Asia/Manila)
**Plan profile:** `exhaustive` (provider exit, Cloudflare bindings, data integrity, release readiness)
**Plan status:** `CONDITIONALLY READY` (see `17_…`)
**Verification mode:** `emulated` — separated author/adversary/verifier passes by the same agent; no native independent verifier lane was available in-session. Caps overall readiness at 97 and package status at `CONDITIONALLY READY` for this high-blast-radius profile until a real independent reviewer or the owner accepts the package (per Creating-Plan-Prompt §0).

---

## Master Goal (/goal)

Produce a complete, codebase-grounded planning package that gives a future
executor a precise, safe, no-mutation way to close the historical
Supabase/Vercel/Resend → Cloudflare provider-exit work — or to identify the
exact external proof still blocking closure.

### Intended outcome

- A future operator/executor can run the closure procedure and either (a) flip
  the provider-exit pack to `providerExitReady=true`, or (b) document exactly
  which external/owner/operator/hosted proof gate remains open and why.
- No application code, tests, migrations, provider state, or secrets are
  mutated by this planning task.
- Every gate is mapped to a concrete evidence class (local-automated,
  local-static, operator-attestation, hosted-provider-backed, or
  owner-decision) so no proxy signal is accepted as completion.

### Problem being solved

The active Archestimator runtime is fully Cloudflare-native and the source tree
has zero Supabase/Vercel/Resend runtime references. However, the provider-exit
pack still reports `providerExitReady=false` with four open operator/external
gates: (1) final exports-or-retention/loss decision, (2) post-exit Cloudflare
smoke, (3) real non-owner Google proof or accepted deferral, and (4) real
recipient mailbox proof or accepted deferral. These cannot be closed by code
alone — they require operator attestations, hosted proof, or explicit owner
risk decisions. The plan must make that boundary explicit and safe.

### Planning scope

- Define the final provider-exit proof checklist and its gate-by-gate closure
  procedure.
- Define the Supabase export/retention/loss decision framework and the
  rollback posture that depends on it.
- Define Cloudflare post-exit smoke checks and the exact commands.
- Define data-loss acceptance rules (when `accepted-loss` is permissible and
  what must accompany it).
- Define the sanitized operator evidence record format (already implemented by
  `scripts/generate-cloudflare-provider-exit-pack.ts`).
- Define the rollback-vs-no-rollback decision record.
- Define a safe, no-mutation verification path that proves closure without
  touching Supabase, Resend, Vercel, or unrelated Cloudflare resources.

### Non-goals

- Re-implementing the provider-exit pack generator (already exists and works).
- Mutating Supabase project `ebxxqidacheyapmmzavr`, the unrelated
  `archestimator` provider project, or any Cloudflare resource.
- Cancelling, deleting, rotating, exporting, or downgrading any provider.
- Re-running the migration (Cloudflare migration is complete).
- Touching Better Auth, D1 schema, app authorization, or R2 policies.
- Changing the generator script's gate logic (only documenting its behavior).

### Authoritative inputs (source authority model)

1. `AGENTS.md` — Supabase `ebxxqidacheyapmmzavr` is historical evidence only;
   Cloudflare resources bound in `wrangler.jsonc` are the authorized surface;
   standing Cloudflare-resource authorization applies only to bound resources.
2. `wrangler.jsonc` — Worker `archestimator-proof`, D1 `ARCH_DB`, R2
   `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email
   `EMAIL`, Images `IMAGES`.
3. `package.json` — `cf:*` scripts are the canonical proof/closure commands.
4. `scripts/generate-cloudflare-provider-exit-pack.ts` — the gate logic and
   operator-record schema.
5. `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-pack.{json,md}` — last pack run (status OPEN, 4 open gates).
6. `.ai/10_state/current-state.md` FAST PATH — provider-exit readiness not yet final.
7. `supabase/README.md` — legacy folder is migration archaeology only.
8. Current repo source (`rg -i supabase src/` = 0 hits) — source-level exit complete.

### Major workstreams

| Lane | Role | Output |
|---|---|---|
| W-A Lead coordinator | Scope, gate inventory, synthesis, final claim | This pack + `17_…` |
| W-B Source/provider-state analyst | Verify current bindings, source-scan, migration count | `03_…`, `21_…` |
| W-C Data/export/retention planner | Export decision framework, data-loss rules, rollback posture | `07_…`, `13_…` |
| W-D Security/credential reviewer | Operator-record sanitization, secret-material taxonomy, proof boundary | `08_…` |
| W-E Operations/smoke planner | Post-exit smoke commands, observability, rollout/rollback gates | `09_…`, `13_…` |
| W-F Adversarial reviewer | Disprove readiness, find proxy-signal acceptance | `14_…`, `19_…` |
| W-G Final verifier | Requirement-by-requirement audit | `17_…` |

(All lanes emulated as separated passes by the lead; no native subagents were
used for the core authoring. Two read-only Explore subagents gathered source
evidence — recorded in `19_…` §19.2.)

### Safety constraints / forbidden actions

- Do not mutate Supabase project `ebxxqidacheyapmmzavr` or the unrelated
  `archestimator` provider project.
- Do not mutate, cancel, downgrade, delete, or rotate any provider resource.
- Do not read, print, commit, or echo secrets, tokens, cookies, raw mailbox
  content, private backup paths, or credential material.
- Do not run destructive Git operations or alter Git history.
- Do not create/switch/delete branches or worktrees (shared live worktree).
- Do not change application code, tests, migrations, schemas, or infra config.
- Keep all writes confined to this plan folder.
- Do not claim hosted/provider/operator proof from local-only evidence.

### File/module ownership model

- All writes confined to `.ai/03_plans/2026-07-07-provider-exit-final-proof-closure/`.
- Read-only inspection of: `wrangler.jsonc`, `package.json`, `cloudflare-env.d.ts`,
  `scripts/*.ts`, `src/**`, `migrations/`, `supabase/README.md`, sibling plan
  evidence under `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/`.
- No edits outside this folder.

### Acceptance criteria

- Every one of the 12 provider-exit gates is documented with: source, evidence
  class, closure path (or explicit accepted-deferral with owner + rationale),
  and the exact command/attestation that proves it.
- The 4 OPEN gates each have: options, a recommendation, the decision owner,
  and the rollback impact of each option.
- The no-mutation verification path is executable and named command-by-command.
- The data-loss acceptance rule is explicit (only when owner accepts risk AND
  Cloudflare is the proven sole runtime for affected data AND export was
  attempted or is provably redundant).
- README states status, phase order, blocked decisions, stale-revalidation
  checklist, off-limits files, and external proof still required.

### Validation requirements / evidence classes

| Evidence class | Used for | Cannot prove |
|---|---|---|
| Local-static | file inspection, `rg`, `git diff --check`, source-scan review | runtime/provider state |
| Local-automated | `bun run cf:provider-exit-pack`, `cf:check-*`, `cf:release-gates`, `cf:inventory` | hosted/provider state unless connected |
| Operator-attestation | sanitized operator-record JSON | independent truth; only attests |
| Hosted-provider-backed | `wrangler` live readback, route probes on `archestimator.com` | UX unless paired with UI proof |
| Owner-decision | export/retention/loss, deferrals | must be explicitly recorded, not inferred |

### Review / adversarial QA gates

- Two emulated critique-and-revision cycles (minimum for exhaustive profile).
- Adversarial pass: attempt to find proxy-signal acceptance, missing
  credential-material distinctions, or gates claimed closed without proof.
- Final verifier pass: requirement-by-requirement audit against `04_…`.

### Final deliverables

This 22-document exhaustive pack (00–19 + README + 20/21 provider appendices)
plus `LOOP_LEDGER.md` and the preserved `PROMPT.md`.

### Stop condition

The pack gives a future executor a precise way to mark provider exit complete,
or to identify the exact external proof still blocking completion, with every
gate traced and every open gate having options + recommendation + owner.
(Planning task complete; closure execution is a separate future task.)

---

## Skills discovered / used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | yes | Canonical dated-pack + `LOOP_LEDGER.md` + loop contract binding for this repo |
| Creating-Plan-Prompt directive | yes | Authoritative exhaustive-pack structure and readiness scoring |
| Multi-Agent-Execution-Directive | yes | Authority model, evidence classes, completion-audit discipline |
| `cloudflare` / `wrangler` | referenced (read-only) | Binding/boundary grounding from `wrangler.jsonc`; no mutation |
| `gitnexus` | not used | Narrow local doc-planning task; `rg` + targeted reads sufficient (proportional policy) |

No skills were fabricated. Unavailable native subagent delegation is recorded
honestly (`verification_mode: emulated`).

---

## Coordination ledger

| Lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| W-B | Provider-state map | bindings, source-scan, migrations | `03_…`, `21_…` | none | 12 gates inventoried; 4 OPEN all external | none | done |
| W-C | Export/retention/rollback | data decision framework | `07_…`, `13_…` | W-B gate list | `accepted-loss` needs owner + Cloudflare-sole-runtime proof | none | done |
| W-D | Credential/secret boundary | operator-record sanitization | `08_…` | W-B | raw token vs hash vs cookie vs attestation distinctions | none | done |
| W-E | Smoke + ops | post-exit smoke commands | `09_…`, `13_…` | W-B | smoke must run AFTER export/retention decision | none | done |
| W-F | Adversarial | disprove readiness | `14_…`, `19_…` | W-A..W-E | no proxy-signal acceptance found; OPEN gates correctly external | none | done |
| W-G | Final verifier | req-by-req audit | `17_…` | all | status CONDITIONALLY READY, emulated cap | none | done |
