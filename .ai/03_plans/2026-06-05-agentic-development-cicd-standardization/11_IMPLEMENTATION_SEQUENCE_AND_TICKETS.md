# 11 — Implementation Sequence and Tickets

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Sequencing principle

Do not enable enforcement before the checks it depends on are stable.

## Phase A — CI visibility restoration

### A1 Re-enable or replace GitHub CI
- Re-run workflow audit.
- With owner authorization, enable `CI` or create replacement.
- Trigger current run.
- Record run URL/result.

### A2 Stabilize baseline CI
- Run on `main`.
- Classify failures.
- Do not broaden governance until baseline is green or documented.

## Phase B — CI hardening

### B1 Add permissions/concurrency
### B2 Split jobs: `governance`, `quality-validate`, `quality-build`, `e2e-smoke`, `perf-smoke`
### B3 Upload artifacts
### B4 Pin/document action policy

## Phase C — PR governance

### C1 Add PR template
### C2 Add CODEOWNERS
### C3 Add advisory governance check
### C4 Promote governance check to blocking after dry-runs

## Phase D — GitHub capability and branch protection

### D1 Resolve private protection/ruleset blocker
### D2 Protect `main`
### D3 Create/protect `staging`

## Phase E — Vercel release workflow

### E1 Add manual production release workflow
### E2 Add hosted smoke checks
### E3 Add manual promote workflow/step
### E4 Run rollback drill

## Phase F — Adoption

### F1 Run dry-run matrix
### F2 Update `.ai` state/docs
### F3 Decide whether Vercel Git auto-deploy can be safely re-enabled

## Minimal first implementation PR

Limit first PR to CI restoration/hardening, PR template, CODEOWNERS, and status docs. Do not combine branch protection and release automation in the first PR.
<!-- 98-100-UPGRADE:START -->
## Acceptance criteria by phase

| Phase | Acceptance proof |
|---|---|
| A CI visibility | fresh workflow enabled/run evidence for current SHA |
| B CI hardening | explicit permissions, concurrency, split jobs, artifacts, docs-health advisory |
| C PR governance | PR template, CODEOWNERS, TDD governance fixtures, advisory report |
| D protection | GitHub capability resolved or blocker status recorded; API/UI proof for rules |
| E Vercel release | workflow_dispatch, environment approval, staged deploy, smoke, promote, rollback |
| F adoption | representative dry-runs with receipts and proof boundaries |
| G audit-v2 docs-health | non-canonical dirs/root docs/source-migration conventions triaged |

## Phase G — broader documentation ecosystem hardening from audit v2

- G1: Triage `.ai/05_decisions`, `.ai/07_design`, `.ai/14_code_intelligence`, `.ai/15_Bugs`, `.ai/99_scratch` into canonical map, moved content, or explicit deferral.
- G2: Create or explicitly defer root `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `LICENSE`.
- G3: Add source/migration documentation conventions for future exported APIs and migrations.
- G4: Add package/docs version-sync check to docs-health.

These are follow-up tickets, not silent changes in this plan-pack pass.
<!-- 98-100-UPGRADE:END -->
