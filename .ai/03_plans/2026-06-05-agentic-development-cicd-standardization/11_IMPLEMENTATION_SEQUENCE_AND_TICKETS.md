# 11 — Implementation Sequence and Tickets

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

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
