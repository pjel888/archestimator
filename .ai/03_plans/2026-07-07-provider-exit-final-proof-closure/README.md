# Provider Exit Final Proof Closure — Plan Pack

**Plan folder:** `.ai/03_plans/2026-07-07-provider-exit-final-proof-closure`
**Date:** 2026-07-08 (Asia/Manila)
**Plan profile:** `exhaustive` (provider exit, Cloudflare bindings, data integrity, release readiness)
**Plan status:** **`CONDITIONALLY READY`** (`verification_mode: emulated`; overall **97/100**; 2 emulated critique-and-revision cycles; 3 native read-only Explore evidence lanes; all P0/P1/P2 findings resolved)

## What this is

A planning pack that gives a future executor a precise, safe, **no-mutation**
way to close the historical Supabase/Vercel/Resend → Cloudflare provider-exit
work — or to identify the exact external proof still blocking closure.

The active Archestimator runtime is **fully Cloudflare-native** (Worker
`archestimator-proof`, D1 `ARCH_DB`, R2, DO, Queue, Email, Images; Better Auth
D1-backed; **0 Supabase refs in `src/`**). The provider-exit pack generator
confirms 6 of 12 app-runtime gates green and 2 of 6 operator gates green
(Resend, obsolete secrets). **4 operator/external gates remain OPEN** and
cannot be closed by code:

1. **OPEN-PE-01** — Final exports/retention/loss decision (owner).
2. **OPEN-PE-02** — Post-exit Cloudflare smoke (operator, after OPEN-PE-01).
3. **OPEN-PE-03** — Non-owner Google proof or deferral (owner/operator).
4. **OPEN-PE-04** — Recipient mailbox proof or deferral (owner/operator).

This pack defines the closure checklist, the operator-record schema, the
smoke command list, the export/retention/loss decision framework, the
data-loss acceptance rule, the rollback/no-rollback decision record, and the
evidence-class taxonomy. It does **not** perform closure, mutation, export,
rotation, cancellation, or deletion.

## Implementation start here

➡️ **`11_IMPLEMENTATION_PLAN.md`** — the authoritative execution guide.

Phase order (dependency-aware):

1. **Phase 0** — Stale revalidation + declare operator-record ownership.
2. **Phase 1** — Export/retention/loss decision (OPEN-PE-01) — **BLOCKED-EXTERNAL**.
3. **Phase 2** — Post-exit Cloudflare smoke (OPEN-PE-02) — after Phase 1.
4. **Phase 3** — Non-owner Google proof/deferral (OPEN-PE-03) — parallel w/ P2/P4.
5. **Phase 4** — Recipient mailbox proof/deferral (OPEN-PE-04) — parallel w/ P2/P3.
6. **Phase 5** — Regenerate pack → `providerExitReady=true`.
7. **Phase 6** — Record closure note + recommend `current-state.md` update.

**Phases 1, 3, 4 are externally blocked on owner/operator/persona/mailbox
actions.** Phase 2 depends on Phase 1. Phase 5 requires all of 1-4.

## Dependency graph

```
Phase 0 ─┬─> Phase 1 ─┬─> Phase 2 ─┐
         │            │            ├─> Phase 5 ─> Phase 6
         │            └─> Phase 3 ─┤
         │            └─> Phase 4 ─┘
         └─> (revalidation only)
```

## Requirement / task / test traceability

- Requirements: `04_REQUIREMENTS_SPECIFICATION.md` (FR-01..07, ARCH-01..02,
  SEC-01..03, DATA-01..02, REL-01..02, TEST-01..02, DOC-01..02).
- Tasks: `11_IMPLEMENTATION_PLAN.md` (T-0.1 .. T-6.2).
- Tests: `12_TEST_AND_VALIDATION_STRATEGY.md` (matrix + AQ-1..8).
- Full trace: `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

## Blocked / open decisions

| ID | Decision | Owner | Recommendation |
|---|---|---|---|
| OPEN-PE-01 | Supabase export/retention/loss posture | Philip | `accepted-retention` (DEC-PE-05) |
| OPEN-PE-02 | Post-exit smoke run | operator | run after OPEN-PE-01 |
| OPEN-PE-03 | Non-owner Google proof vs deferral | Philip/operator | deferral if persona unavailable |
| OPEN-PE-04 | Recipient mailbox proof vs deferral | Philip/operator | deferral if mailbox unavailable |
| OPEN-PE-05 | Independent review of this pack | Philip | recommended before merge (lifts emulated cap) |

## Stale-plan revalidation checklist (before executing closure)

- [ ] `wrangler.jsonc` bindings unchanged (D1 `ARCH_DB`, R2, DO, Queue, Email, Images).
- [ ] `rg -i supabase src/` still returns 0 hits (source-scan stays clean).
- [ ] `package.json` has no `@supabase` dependency.
- [ ] `scripts/generate-cloudflare-provider-exit-pack.ts` gate list unchanged (re-read lines 770-855).
- [ ] Operator record path unchanged:
      `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json`
- [ ] Last pack run still reflects current state (re-run `bun run cf:provider-exit-pack` to confirm 4 OPEN gates).
- [ ] No paid Cloudflare add-on enabled since this plan was written.
- [ ] Generator scan paths (`src/proxy.ts` vs `src/middleware.ts`) — note §3.7 drift; validate scan covers runtime middleware.

## Commands / checks before the first edit

- `git status --short --branch` (confirm clean-ish; no unexpected diffs).
- Read this plan folder's `03_…`, `07_…`, `11_…`, `13_…` fully.
- Declare file-ownership of the operator-record JSON in `LOOP_LEDGER.md`
  (single shared mutable artifact across the 4 open gates).
- `bun run cf:provider-exit-pack` baseline (confirm current 4 OPEN gates).
- `bun run test:dom --run tests/vitest/provider-exit-pack-script.test.ts`
  baseline (confirm generator logic green before any closure step).

## Files explicitly off-limits (for this plan's scope)

- Supabase project `ebxxqidacheyapmmzavr` and the unrelated `archestimator`
  provider project — no mutation.
- Legacy Supabase migrations (`supabase/migrations/`) — historical only.
- Any `src/**` application code, tests, D1 schema, migrations, app-authz paths,
  R2/DO/Queue/Email config, Better Auth, `wrangler.jsonc`.
- `scripts/generate-cloudflare-provider-exit-pack.ts` — documented, not modified.
- Vercel, Resend — no mutation.

## Files and systems intentionally unaffected

- ~all of `src/` (no code change).
- D1 schema (39 migrations; none added).
- All Cloudflare bindings (read-only smoke only).
- Better Auth runtime.
- Client components (no UI — `05_…`).

## External proof that remains required before production rollout

- Owner decision on Supabase export/retention/loss (OPEN-PE-01).
- Post-exit Cloudflare smoke run + recording (OPEN-PE-02).
- Real non-owner Google persona journey OR owner-accepted deferral (OPEN-PE-03).
- Real recipient mailbox receipt OR owner-accepted deferral (OPEN-PE-04).
- Independent review of this pack to lift the emulated-verification cap (OPEN-PE-05).
- (Separate future task) `current-state.md` FAST PATH update after closure lands.

## Cost posture

**Stays on free-tier/bundled limits.** Closure is a one-time, read-only,
free-tier-safe procedure. No paid add-on proposed. See `20_…`.

## Archive policy

Do **not** archive automatically. Archive only after the closure outcome
lands (`providerExitReady=true`) AND `current-state.md` is updated AND an
independent review accepts the pack. Move to
`.ai/09_archive/<date>-provider-exit-closure-complete/`. Slices may be
archived independently (the closure procedure docs vs the closure outcome).

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master /goal, workstreams, ledger, skills |
| `01_EXECUTIVE_SUMMARY.md` | TL;DR + current/target state + decisions |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, scope in/out, flows, constraints |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | file:line evidence map (bindings, gates, generator) |
| `04_REQUIREMENTS_SPECIFICATION.md` | FR/ARCH/SEC/DATA/REL/TEST/DOC + shadow paths |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | n/a with evidence |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | current/target arch, data flow, boundaries |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | no-schema proof, decision framework, operator-record schema, gate checklist |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | threats, sanitization boundary, credential taxonomy |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | n/a perf (justified), smoke signals |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | direct/transitive impact |
| `11_IMPLEMENTATION_PLAN.md` | phases + tasks (execution entrypoint) |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | test matrix + adversarial matrix (AQ-1..8) |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | smoke commands, no-mutation path, rollback decision record |
| `14_RISK_REGISTER.md` | risks with mitigations |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | DEC-01..06, ASSUMP-01..06, OPEN-01..05 |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | req → task → code → test |
| `17_FINAL_READINESS_REVIEW.md` | verifier pass, scores, gaps |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | cross-cutting stack decisions (all unchanged) |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | research, cycles, QA, evidence gaps |
| `20_COST_MODEL_AND_PRICING_INPUTS.md` | free-tier-safe cost inputs |
| `21_PROVIDER_PARITY_MATRIX.md` | provider-state matrix + parity proof |
| `LOOP_LEDGER.md` | append-only coordination log (impl-time) |
| `PROMPT.md` | source brief (verbatim) |

## One-line summary

An executor can close the Supabase/Vercel/Resend provider exit from this pack
— no-mutation, evidence-honest, with the 4 external gates precisely identified
and a free-tier-safe smoke + decision procedure to reach
`providerExitReady=true`.
