# 14 — Future Implementation Prompts

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Prompt 1 — CI restoration

```txt
Implement Phase A from `.ai/03_plans/2026-06-05-agentic-development-cicd-standardization/11_IMPLEMENTATION_SEQUENCE_AND_TICKETS.md`.
Scope: re-audit GitHub workflow state, then with explicit owner authorization re-enable/replace disabled CI and prove a current run. Non-goals: no branch protection, no Vercel deploy, no provider mutation. Validation: workflow list, run view URL, and changed-file diff check if workflow code changes.
```

## Prompt selection rule

Use one prompt at a time. Do not paste the generic `.ai/08_prompts/003-PLAN-IMPLEMENTATION-PROMPT.MD` with this entire folder unless the owner also names the exact phase bundle and provider authority for that run. Without that authority, the safe default is Prompt 1 only.

## Prompt 2 — CI hardening

```txt
Implement Phase B. Update `.github/workflows/ci.yml` with permissions, concurrency, split jobs, and artifacts. If adding governance code, write failing fixtures first. Validate with workflow YAML view and GitHub run proof.
```

## Prompt 3 — PR template and CODEOWNERS

```txt
Implement Phase C1-C2 only. Add `.github/pull_request_template.md` and `.github/CODEOWNERS`. No source/workflow/provider/branch-protection changes. Validate `git diff --check` and syntax review.
```

## Prompt 4 — Advisory governance check

```txt
Implement advisory governance CI. Add tests/fixtures first for missing receipt, bad branch target, docs-only/source mismatch, valid codex-to-staging, invalid codex-to-main, and valid staging-to-main. Keep advisory until dry-runs pass.
```

## Prompt 5 — Branch protection/rulesets

```txt
Only after GitHub capability exists, configure `main` protection and create/protect `staging`. Record API proof. Do not deploy. Do not change source.
```

## Prompt 6 — Controlled Vercel release workflow

```txt
Implement manual production release workflow with GitHub Environment approval, staged Vercel production deployment (`--prod --skip-domain`), hosted smoke, and explicit promote. Do not re-enable Vercel Git auto-deploy unless separately approved.
```
<!-- 98-100-UPGRADE:START -->
## Prompt 7 — audit v2 docs-health follow-up

```txt
Implement Phase G as a separate docs-governance PR. Triage non-canonical `.ai` dirs, root standard docs, package/docs version sync, and source/migration documentation conventions. Non-goals: no app feature work, no provider mutation, no pretending existing source/migration docs are fixed. Validate with docs-health advisory output, canonical map/decision updates, `git diff --check`, and traceability update.
```

## Prompt discipline for every future implementation run

Start by reading `README.md`, `00_INDEX.md`, `11_IMPLEMENTATION_SEQUENCE_AND_TICKETS.md`, `15_FINAL_READINESS_GATE.md`, and the specific phase doc. Reconfirm live GitHub/Vercel facts before acting. Preserve proof boundaries/redactions. Use branch/worktree isolation. Do not claim enforcement until `15` is satisfied with fresh evidence.
<!-- 98-100-UPGRADE:END -->
