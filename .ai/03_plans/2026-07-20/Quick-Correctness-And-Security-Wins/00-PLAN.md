# Quick Correctness And Security Wins — Canonical Execution Plan

> This is the canonical execution artifact. `plan-pack.json` is the
> machine-readable mirror. `units/` holds the per-finding implementation detail.
> Each unit is self-contained: an executor with zero session context can read
> `00-PLAN.md` + the unit file and implement it.

## Status tuple

`IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / N/A / ACTIVE`

- **Baseline HEAD:** `b8ec0edf3a144bcb49c2b5971a168ed30aecf2ab` (2026-07-20)
- **Suite version:** `2026-07-12`
- **Profile:** `focused` (seven independent small-scope correctness/security fixes; one rejected after reconcile)
- **Action ceiling:** `IMPLEMENT_LOCAL` (pack is `PLAN_ONLY` at authoring; implementation awaits separate execution authorization)
- **Exact next unit:** `UNIT-001` (Client Portal re-verification lockout — highest user impact, no dependencies)

## 1. Outcome and intent

Land seven high-confidence, small-effort correctness and security fixes surfaced
by the 2026-07-20 architecture + correctness + security audit. Each is
independent: none blocks another, and each can ship on its own. Together they
close the highest-leverage trust and access-control gaps without touching the
large architectural surfaces (those are separate packs B/C/D).

The seven findings, ordered by user impact:

1. **Client Portal recipients are permanently locked out after their first
   magic-link login.** The verification `UPDATE` is conditional on
   `last_verified_at IS NULL`, so the second login changes zero rows and
   `resolveClientPortalRecipientActor` returns null forever. This is a real
   user-lockout bug on a public-facing surface.
2. ~~**The closed-beta gate fails open**~~ — **REJECTED (DEC-AUTO-001).**
   Implemented independently in the shared worktree between authoring and the
   Improve-Plan reconcile with a superior runtime-aware design
   (`ARCHESTIMATOR_CF_RUNTIME` marker, Worker-fail-closed / Node-stay-open split,
   `ARCHESTIMATOR_ALLOW_OPEN_BETA` kill-switch, plus a test). See UNIT-002 and
   DEC-AUTO-001. Do not execute.
3. **Publication/share passwords allow a 4-character minimum** with no
   complexity check. These passwords gate client names, project locations, and
   pricing.
4. **Seven internal proof routers compare the bearer secret with non-timing-safe
   `===`**, and some of them write production D1. A correct `timingSafeEqual`
   implementation already exists in `src/lib/security/bearer-auth.ts`.
5. **Editing any non-link field on a library-linked estimate row silently
   downgrades `linkState` to `linked-overridden`**, corrupting library-sync
   reconciliation and misleading operators.
6. **The AI package-builder writes the data row and the history event as two
   separate D1 statements** (5 sites). A transient failure between them leaves a
   history-less mutation and a permanently lost audit trail. `runBatch` already
   exists in the same file.
7. **The Worker `queue()` handler has no `.catch`**, so a batch-level failure
   never records a `recordCronRunEvent` row and is invisible to admin
   observability — unlike the `scheduled()` handler next to it.

## 2. Task Contract

- **Objective:** implement the seven fixes as seven independent units. Six
  remain active; UNIT-002 was rejected during Improve-Plan reconcile
  (DEC-AUTO-001) because the in-tree implementation supersedes it. Each active
  unit is self-contained and ships its own verification.
- **Scope:** the specific files named in each active unit's "Owned paths"
  section. No broad architectural change; no migration of the parallel write
  paths (that is Pack D).
- **Exclusions:** the integrity-layer unification (finding #11), the D1 runtime
  consolidation (#14/#15), the God-component decomposition (#12), and the test
  baselines (#20/#21) — those live in packs B, C, D. Do not expand scope into
  them.
- **Authority:** `AGENTS.md`, current source, `.ai/00_system`, this pack.
- **Owner:** lead single-agent. Units are independent; no parallel writers on
  shared files.
- **Test authorization:** `NOT_REQUIRED` by default per the User Test
  Authorization Gate. Each unit records its evidence path. Type-check and lint
  are non-test verification and run by default.
- **Stop condition:** every CORE requirement maps to a VERIFIED unit with fresh
  evidence; the validator passes.

## 3. Repo conventions executors must match

- **Stack:** Next.js 16 App Router + RSC, React 19, Bun, TypeScript 6 strict,
  Tailwind v4, Cloudflare Workers/D1/R2/DO/Queues, Better Auth.
- **Verification commands (run from repo root):**
  - `bun run type-check` — `tsc --noEmit` (uses 4GB heap)
  - `bun run lint` — ESLint flat config
  - `bun run lint:design-system` — custom design linter (only if UI touched)
- **Error handling:** the codebase uses inline `try/catch` with typed throws;
  D1 batch results are inspected via `result.success` and `meta.changes`. See
  `src/lib/client-portal/public-repository.ts:218-224` for the canonical
  batch-result-check pattern.
- **D1 access:** always via `getCloudflareD1Database()` from
  `src/lib/cloudflare/d1.ts`. Never reach for `process.env` bindings directly in
  library code.
- **Secrets:** never log raw values; the redactor at
  `src/lib/observability/redact.ts` is applied by the structured logger but
  should not be relied on as the only layer.
- **Git:** stay on the current branch. Do not commit, push, create branches, or
  open PRs unless the user asks (AGENTS.md). Conventional-commit message style
  when the user does ask (see `git log --oneline -10`).
- **No tests unless asked:** the User Test Authorization Gate is `NOT_REQUIRED`
  for these units. Do not add or run vitest/playwright unless the user explicitly
  requests it for a given unit.

## 4. Requirements → units → evidence map

| REQ | Title | Units | Evidence |
|-----|-------|-------|----------|
| SEC-001 | Client Portal recipients can log in more than once | UNIT-001 | EVID-001 |
| SEC-002 | Closed-beta gate fails closed when misconfigured | UNIT-002 | EVID-002 |
| SEC-003 | Publication password minimum length raised | UNIT-003 | EVID-003 |
| SEC-004 | Proof routers use timing-safe bearer comparison | UNIT-004 | EVID-004 |
| DATA-001 | Library link state only flips on library-derived field edits | UNIT-005 | EVID-005 |
| DATA-002 | AI Apply writes row + event atomically | UNIT-006 | EVID-006 |
| OPS-001 | Upload-job queue batch failures are observable | UNIT-007 | EVID-007 |

## 5. Dependency order

All seven units are independent (no inter-unit dependencies). Suggested order is
by user impact: UNIT-001 (lockout) first, then UNIT-002 (fail-open), UNIT-003
(password), UNIT-004 (timing), UNIT-005 (link state), UNIT-006 (atomicity),
UNIT-007 (observability). Any order validates.

## 6. Risks

- **RISK-001** (UNIT-002): flipping the closed-beta default to fail-closed could
  lock users out if the production Worker env genuinely lacks the flag. Mitigation:
  the unit treats the flag as tristate (`enabled`/`disabled`/`unset`) and surfaces
  `unset` loudly rather than silently denying; coordinate with the deploy pipeline
  before merging.
- **RISK-002** (UNIT-005): the link-state rule touches a data-model invariant.
  Mitigation: the unit only changes the condition under which `linked-overridden`
  is set, scoped to the keys actually present in the patch; library-sync
  reconciliation continues to treat explicit `linkState` patches authoritatively.
- **RISK-003** (UNIT-006): wrapping the row+event pairs in `runBatch` changes
  failure semantics from "row committed, event lost" to "neither committed."
  That is the intended direction (atomicity), but the retry path must handle the
  new "nothing happened" state. Mitigation: the unit updates the replay reader to
  treat a missing event as "retry the whole pair."

## 7. Anti-scope (do NOT do)

- Do not refactor `EstimateSheetContent.tsx`, `workspace-repository.ts`,
  `d1-intents/rows.ts`, or any of the 3000-line files. Those are packs B/C/D.
- Do not add automated tests. The gate is `NOT_REQUIRED`.
- Do not add feature flags, rollback machinery, or compatibility shims. This is
  alpha software; fix forward (AGENTS.md).
- Do not rotate secrets or touch `.dev.vars` / `.env.local` from inside a unit.
  If a unit discovers a leaked credential, STOP and surface it.
