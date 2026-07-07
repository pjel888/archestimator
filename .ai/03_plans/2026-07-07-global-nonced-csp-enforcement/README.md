# Global Nonced CSP Enforcement — Plan Pack

**Date:** 2026-07-07
**Plan profile:** `exhaustive` (high-blast-radius security work)
**Status:** `CONDITIONALLY READY`
**verification_mode:** `emulated` (caps overall readiness at 97; see `17_FINAL_READINESS_REVIEW.md`)

> Planning-only pack. No application code, tests, migrations, or config was modified
> to produce this pack. The future implementation task will edit code; this pack tells
> that task exactly what to do, in what order, with what proof and rollback.

## What this pack delivers

A phased, evidence-gated path from Archestimator's current **partial / Report-Only
CSP** posture to a **globally enforced, per-request-nonced Content-Security-Policy**,
using the official Next.js 16 proxy-based nonce pattern, without breaking the
OpenNext/Cloudflare Workers deployment.

## Implementation start document

👉 **`11_IMPLEMENTATION_PLAN.md`** — the authoritative execution guide (phases P1–P5,
work packages, exact paths/symbols, proof gates, rollback).

## Phase order + dependency graph

```
P1 nonce pipeline + report endpoint (Report-Only, zero risk)
  └─ P2 close content gaps (wss:, avatars, seed-host decision)
       ├─ P3 enforce /share + /invite  (token-bearing, already dynamic)
       ├─ P4 enforce /workshop        (auth-gated, already dynamic)
       └─ P5 enforce /auth + landing  (gated by DEC-11 perf)
```

- P1 + P2 are **Report-Only** → safe to implement/land immediately; no user-visible
  breakage possible.
- P3–P5 are **Enforced** → each gated by the observation window (`OPS-02`) and browser
  proof (`TEST-03`).

## Conditions before implementation begins

1. **DEC-11** (owner): marketing-page dynamic-rendering tradeoff — gates **P5 only**.
   P1–P4 can proceed regardless.
2. **DEC-12** (owner): seed-host `imageUrl` migration vs allowlist — gates workshop
   img-src correctness, not the core nonce pipeline.
3. **Independent reviewer or explicit owner acceptance** to lift the emulated-
   verification cap → required for `IMPLEMENTATION-READY`. Without it, P1+P2
   (Report-Only, zero user risk) can still safely begin.

## Commands to run before the first edit

```bash
git status --short --branch          # coordinate with concurrent agents
node -e "console.log(require('next/package.json').version)"   # confirm 16.2.10
# Re-read immediately before editing (shared live worktree):
#   next.config.ts, src/proxy.ts, src/lib/auth/request-proxy.ts,
#   src/app/layout.tsx, worker.ts
# Re-read the official nonce guide:
#   node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
```

Validation gates during implementation:
```bash
bun run type-check
bun run lint
bunx vitest run <file>          # fast iteration (test:dom is serial)
bun run test:dom                # full vitest suite (serial, load-bearing)
bun run validate                # FULL gate: type-check + lint + design + test + test:dom
bunx playwright test            # enforcement browser proofs (P3–P5)
bun run launch:verify-hosted-sensitive-routes   # hosted header smoke
```
(Recommended new script: `test:csp` bundling CSP-specific vitest files — DEC-10.)

## Requirement/task/test traceability

- Requirements: `04_REQUIREMENTS_SPECIFICATION.md` (SEC/ARCH/PERF/REL/OPS/TEST/DOC).
- Traceability matrix (both directions): `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.
- Test execution matrix: `12_TEST_AND_VALIDATION_STRATEGY.md`.
- Adversarial matrix: `12` §12.3 (ADV-01..ADV-15).

## Blocked decisions table

| Decision | Owner | Blocks | Options | Recommendation |
|---|---|---|---|---|
| DEC-11 marketing dynamic tradeoff | Philip | P5 (landing only) | (A) enforce+dynamic / (B) keep Report-Only | start (B); flip to (A) after PERF-01 |
| DEC-12 seed-host migration | Philip | workshop img-src correctness | (A) migrate local / (B) allowlist | migrate local |
| emulated-verification cap | reviewer/owner | IMPLEMENTATION-READY label | independent review / owner accept | owner accept or dispatch reviewer |

## Files explicitly off-limits during implementation

- `migrations/*`, `supabase/migrations/*` — no D1 change; legacy archaeology.
- `wrangler.jsonc`, `wrangler.next-dev.jsonc`, `open-next.config.ts` — no change needed.
- Data-plane source: `src/lib/{cloudflare,compliance,collaboration,uploads,ai}...` —
  untouched.
- `DESIGN.md`, Storybook stories — not security surfaces.
- Git branches/worktrees — none created (shared worktree).

## Files and systems intentionally unaffected

- All `/api/*` JSON route handlers (except the new `/api/csp-report`).
- D1 / R2 / DO / Queue / Email / Better Auth.
- Client JS bundle / RSC payload / asset graph (CSP adds headers only).

## External proof that remains required before production rollout

- Per-phase browser proof (Playwright) on `/share`, `/invite`, `/workshop`, `/auth`,
  landing (`TEST-03`).
- TTFB before/after artifacts for marketing (`PERF-01`).
- Observation-window telemetry (`OPS-02`): ≥ 3–7 days Report-Only with zero unexpected
  violations before P3.

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, authority, lanes, verification mode |
| `01_EXECUTIVE_SUMMARY.md` | What/why/phases/verdict |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, source strength, in/out scope |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Current CSP matrix, inline scripts, 3p origins, tests, proxy |
| `04_REQUIREMENTS_SPECIFICATION.md` | SEC/ARCH/PERF/REL/OPS/TEST/DOC + shadow-path matrix |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Failure modes, non-regression a11y |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Target architecture, per-class policies, reporting endpoint |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | No data-plane change (recorded); `/api/csp-report` contract |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Trust boundaries, bypass vectors, denial tests |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | PERF evaluator, failure modes, observability |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Direct + transitive impact, test/CI impact |
| `11_IMPLEMENTATION_PLAN.md` | **Execution guide** — phases P1–P5, work packages, paths/symbols |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix, adversarial matrix, validation classes |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Phased rollout, per-phase rollback, perf gates, flags |
| `14_RISK_REGISTER.md` | RISK-01..RISK-17 with mitigation |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | DEC-01..DEC-13, ASSUMP-01..07 |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Requirement ↔ task ↔ test both directions |
| `17_FINAL_READINESS_REVIEW.md` | Scores, verifier findings, CONDITIONALLY READY verdict |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, skills, critique cycles, gaps |
| `LOOP_LEDGER.md` | Append-only coordination log |

## Stale-plan revalidation checklist (before implementation)

- [ ] Confirm Next.js still 16.2.10 (or re-read the CSP guide if upgraded).
- [ ] Confirm `next.config.ts` CSP strings + `headers()` unchanged since this audit.
- [ ] Confirm `src/proxy.ts` / `request-proxy.ts` matcher + `createRequestPathResponse`
      unchanged.
- [ ] Confirm `src/app/layout.tsx` still sync / renders the same inline scripts.
- [ ] Re-confirm `/trust`,`/privacy`,`/terms`,`/security`,`/new` still load analytics
      via `PublicPageShell` (the coverage gap).
- [ ] Re-confirm no new nonce infra was added independently.
- [ ] Confirm `wrangler.jsonc` has no `headers[]` block.

## Archive policy

Archive this pack (move to `.ai/03_plans/_archive/` or mark completed) only after all
P1–P5 phases land in production AND `current-state.md` P0.2 row reads CLOSED. Do not
archive after only the planning task completes — planning completion is not
implementation completion.

---

**Summary:** This pack converts the PROMPT.md brief into a complete, codebase-specific,
phased implementation plan. The core engineering move is the official Next.js 16
proxy-based nonce pattern (validated against the local doc + repo evidence). The two
Report-Only phases (P1, P2) are safe to begin immediately; enforcement phases (P3–P5)
are gated on observation-window telemetry and browser proof, with one-command rollback
each. The package is `CONDITIONALLY READY` pending two owner decisions (DEC-11, DEC-12)
and independent/owner verification acceptance.
