# Codex /goal Start Pack

**Last updated:** 2026-05-30
**Reconciled against code:** 2026-06-18 (ROADMAP_SYNC_LOOP) — see inline `[SYNC 2026-06-18]` notes.
**Purpose:** Single compact starter doc for Ralph Loop / Codex execution. Read this first.

> **[SYNC 2026-06-18] STALE-QUEUE WARNING.** This pack and its sibling `36-first-execution-queue.md`
> were written on 2026-05-30 as a *not-yet-started* execution queue. Substantial implementation has
> shipped since (estimates, library/templates, collaboration, publication/share, charts, proposal
> export, notifications, terms gate, error/loading boundaries, perf harnesses, bundle analyzer are all
> BUILT/VERIFIED in code). Several "First 10" cards below are therefore already implemented; statuses
> have been annotated inline. Do NOT treat the original "READY TO START" framing as current.

---

## 1. Launch Status

| Level | Status |
|---|---|
| **PUBLIC LAUNCH** | `NO-GO` |
| **CONTROLLED BETA** | `CONDITIONAL / OWNER DEFAULTS DECIDED` |
| **ENTERPRISE MVP** | `PLANNED` |
| **DOCS / PLANNING** | `ACTIVE` |
| **IMPLEMENTATION** | `IN PROGRESS — Wave 1 largely shipped` [SYNC 2026-06-18: was `READY TO START (Wave 1)`. Code shows estimates/library/collaboration/publication/charts/proposal-export/notifications all BUILT or VERIFIED — see src/lib/estimates/actions.ts, src/lib/component-library/actions.ts, src/lib/publication/actions.ts, src/app/share/[token]/, src/lib/proposal-export/.] |

---

## 2. Core Execution Rule

> **Ralph Loop must not run a broad implementation against the entire roadmap. Execute exactly ONE atomic goal card at a time. Do not execute epics.**

---

## 3. Canonical Reading List (7 docs max)

Read these in order:

1. **35-codex-goal-start-pack.md** (this file)
2. **26-codex-goal-cards.md** — pick one atomic card
3. **27-performance-budget-and-regression-gates.md**
4. **28-evidence-artifact-index.md**
5. **32-test-infrastructure-execution-spec.md**
6. **33-ralph-loop-execution-protocol.md**
7. **34-roadmap-consistency-index.md**

Everything else is **REFERENCE ONLY**. Do not read unless the goal card specifically requires it.

---

## 4. First 10 Atomic Goal Cards (in execution order)

> **[SYNC 2026-06-18] Status column added from code evidence.** `DONE (code)` = implementation
> exists in the repo (does NOT assert an evidence-artifact pack under `.ai/09_archive/store/` was
> recorded — confirm before checking the card off per §7). `OPEN` = no code evidence found, still
> actionable. `NEEDS INPUT` = external/manual fact not provable from code.

### Before staging exists (Codex can start now):

| # | Goal ID | Title | [SYNC 2026-06-18] Status & evidence |
|---|---|---|---|
| 1 | `CODEX-P0-INF-001C` | Env var inventory and staging mapping | NEEDS INPUT — `.env.example` is a comprehensive env contract, but a staging-mapping *artifact* could not be confirmed in roadmap/code; verify whether the inventory deliverable was produced. |
| 2 | `BETA-P0-SEC-004` | Secrets scanning / service-role leak audit | OPEN (ghost) — no gitleaks/trufflehog/detect-secrets step in `.github/workflows/ci.yml`; no secret-scan in `scripts/`. Tooling NOT built. |
| 3 | `BETA-P0-SEC-003A` | API route inventory | NEEDS INPUT — route handlers exist under `src/app/api/**` (health, share/*, ai/*, webhooks/resend, projects/images, component-library/*, proposal export) but an inventory *deliverable* artifact was not confirmed; read-only audit may still be outstanding. |
| 4 | `BETA-P0-PERF-001A` | Benchmark harness foundation | DONE (code) — `scripts/measure-route-transitions.ts`, `scripts/benchmark-proposal-workbook.ts`, `e2e/route-transition-performance.spec.ts`, `package.json` perf:* scripts. |
| 5 | `BETA-P0-PERF-002A` | Bundle analyzer integration | DONE (code) — `next.config.ts` `@next/bundle-analyzer` (ANALYZE=true) + `experimental.optimizePackageImports`. |
| 6 | `BETA-P0-UX-004` | Workshop desktop guard | OPEN (ghost) — no desktop/min-viewport guard component found (no WorkshopDesktopGuard / unsupported-viewport gate in `src/components/workshop/`). Not built. |
| 7 | `BETA-P0-LEGAL-001A` | Minimum beta privacy notice draft | DONE (code) — `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/lib/legal/terms-content.ts`. NOTE: `legalReviewStatus = closed_beta_owner_approved_pending_counsel_review` — copy is owner-authored, NOT counsel-reviewed (external/manual). |
| 8 | `BETA-P0-OPS-001B` | Feedback intake tracker | NEEDS INPUT — in-app beta feedback exists (`src/lib/workshop/beta-feedback-actions.ts`, settings/feedback routes), but the card's `.ai/` log/tracker deliverable could not be confirmed; verify intended scope. |
| 9 | `BETA-P0-SEC-003D` | Server action inventory | NEEDS INPUT — many `src/lib/*/actions.ts` modules exist (auth, projects, estimates, collaboration, publication, component-library, notifications, workshop), but an inventory *deliverable* artifact was not confirmed. |
| 10 | `BETA-P0-REL-001` | Error boundaries + 404/500 + mobile guard | PARTIAL (code) — 7 `error.tsx` + 11 `loading.tsx` under `src/app/workshop/**`. GAPS: no root `src/app/global-error.tsx`, no custom `src/app/not-found.tsx`, and no "mobile guard" component found (see card 6). |

### After staging exists:

| # | Goal ID | Title | [SYNC 2026-06-18] Status & evidence |
|---|---|---|---|
| 11 | `BETA-P0-SEC-001A` | RLS test harness foundation | PARTIAL / NEEDS INPUT — RLS proof harnesses exist (`scripts/prove-rls-initplan-postgres.mjs`, `prove-notification-rls-postgres.mjs`, etc.) but they are local-only (require local Postgres binaries) and NOT in CI; no staging-Supabase harness. There is NO `tests/integration/` dir. The card's *staging-target* harness remains OPEN (external/staging dependent). |
| 12 | `BETA-P0-SEC-001B` | Core hierarchy RLS denial tests | NEEDS INPUT — `tests/vitest/notification-rls-proof.test.ts` exists but is describe.skip unless live Supabase env is present. Real denial tests against staging are an external/staging fact; OPEN. |
| 13 | `BETA-P0-SEC-002A` | Storage test harness foundation | OPEN — `tests/vitest/storage-cleanup-allowlist.test.ts` covers cleanup allowlist logic (mocked), not a storage RLS/upload-denial harness against staging. Staging-target storage harness OPEN. |

Additional cards continue from `26-codex-goal-cards.md`.

---

## 5. Current Blockers

- **Human external setup required:** Create staging Supabase project, Vercel staging environment. See `36-first-execution-queue.md`.
- **No remaining owner decisions block beta.** 21 of 32 owner decisions resolved.
- **11 unresolved decisions** are public-launch only — do **NOT** block beta implementation.

---

## 6. Status Vocabulary

| Status | Meaning |
|---|---|
| `READY FOR CODEX` | Goal card is scoped, unblocked, and implementable now |
| `READY FOR HUMAN EXTERNAL SETUP` | Requires Philip to create staging Supabase/Vercel/env vars first |
| `READY FOR CODEX AFTER EXTERNAL SETUP` | Codex can start once external setup is confirmed |
| `EPIC / SPLIT REQUIRED` | Too large — must be split into atomic cards |
| `BLOCKED` | Dependency, decision, or credential missing |
| `DONE` | Implemented with evidence artifact path recorded |
| `DECIDED / APPROVED DEFAULT` | Owner decision made with recorded default |
| `BETA P0` | Must ship before controlled beta can launch |
| `BETA P1` | Should ship for beta; not a hard blocker |
| `ENTERPRISE MVP` | Required for enterprise-grade MVP, not beta |
| `PUBLIC LAUNCH` | Required before public production launch |
| `POST-MVP` | Deferred beyond enterprise MVP |

---

## 7. Evidence Rules

- **No DONE without evidence artifact path.**
- Save to `.ai/09_archive/store/YYYY-MM-DD-[GOAL-ID]/`
- Evidence types: test output, screenshots, Lighthouse reports, bundle analyzer, security audit results
- **Skipped tests do NOT count as evidence.**
- Evidence filenames should follow `01-validation-output.md`, `04-security-notes.md`, etc. — see `28-evidence-artifact-index.md`.

---

## 8. Performance Rules

- Main bundle chunk < 200KB gzipped (beta target)
- Route transitions < 200ms acceptable
- Row edit latency < 200ms
- No new heavy dependency without owner approval
- Heavy modules must be dynamically imported
- Run `bun run lint:design-system` after UI changes
- See `27-performance-budget-and-regression-gates.md` for full budgets

---

## 9. Security Rules

- Every `/api/*` route and server action must have auth check
- RLS boundaries must be **proven by test**, not assumed
- No secrets in client bundle
- Service role only for server-side setup/teardown
- PII must be scrubbed from logs
- Secrets scanning audit required (see `BETA-P0-SEC-004`)

---

## 10. Ralph Loop Stop Conditions

Stop immediately if:

- Unknown owner decision is required
- Missing external credentials (Supabase keys, Vercel tokens, etc.)
- Production secret exposure risk
- Migration or destructive action needed without explicit approval
- Performance regression above budget thresholds
- Design-system violation detected
- Security uncertainty on tenant boundaries

**Report the block.** Do not proceed past a stop condition.

---

## 11. First /goal Prompt Template

```
# Codex /goal

Execute exactly one goal card: [GOAL-ID] — [Goal title]

Read first:
- .ai/01_roadmap/35-codex-goal-start-pack.md
- .ai/01_roadmap/26-codex-goal-cards.md
- .ai/01_roadmap/27-performance-budget-and-regression-gates.md
- .ai/01_roadmap/28-evidence-artifact-index.md
- .ai/01_roadmap/33-ralph-loop-execution-protocol.md

Rules:
- Do not implement any other goal card.
- Do not make external service changes unless this goal card explicitly permits it.
- Stop if credentials, external setup, destructive migrations, or owner decisions are required.
- Preserve design-system rules.
- Preserve performance budgets.
- Capture evidence under .ai/09_archive/store/YYYY-MM-DD-[GOAL-ID]/.
- Update roadmap status only when evidence exists.
```

---

## Appendix: Quick Command Reference

```bash
# Validate before claiming DONE
bun run validate

# Type-check
bun run type-check

# Lint (including design-system)
bun run lint && bun run lint:design-system

# Unit tests
bun run test

# DOM/component tests
bun run test:dom

# E2E tests
bun run test:e2e

# Full pre-push gate
bun run validate && bun run build && bun run test:e2e
```

---

## Appendix: File Path Conventions

| Path | Purpose |
|---|---|
| `.ai/01_roadmap/` | All roadmap and execution docs (this directory) |
| `.ai/09_archive/store/` | Evidence artifacts (YYYY-MM-DD-[GOAL-ID]/) |
| `.ai/10_state/` | Current state, decisions, known issues |
| `.ai/06_specs/` | Feature and technical specifications |
| `src/lib/domain/` | Core domain model |
| `src/lib/repositories/` | Data access layer |
| `src/lib/supabase/` | Supabase clients and types |
| `tests/integration/` | Integration tests (RLS, storage, API) |
| `tests/e2e/` | Playwright E2E specs |
| `tests/unit/` | Bun unit tests |
| `tests/vitest/` | Vitest DOM/component tests |
