# 09 — Validation Matrix and Test Strategy

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Baseline commands

| Command | Purpose |
|---|---|
| `bun run validate` | type-check + lint + design-system + unit + DOM |
| `bun run build` | Next.js production build |
| `bun run test:e2e` | Playwright E2E |
| `bun run test:e2e:perf` | route-transition performance smoke |

## Change-class matrix

| Change class | Required validation | Proof |
|---|---|---|
| Docs-only `.ai/03_plans` | `git diff --check`, no source/config diff | none |
| Agent framework docs/payloads | payload schema if available, `git diff --check` | Notion only if scoped |
| GitHub workflow | YAML review, workflow run proof | GitHub run URL |
| PR template/CODEOWNERS | syntax/review, governance dry-run | PR UI/API proof if possible |
| App/source | graph impact, targeted tests, `bun run validate`, `bun run build` | hosted smoke if release-impacting |
| Auth/proxy | auth tests, E2E, hosted auth smoke | Supabase/Vercel proof |
| Supabase migration | migration/RLS/storage tests | Supabase provider proof |
| Share/publication | targeted share tests, safe receiver smoke | hosted share proof if claimed |
| Email/Resend | email/webhook tests | Resend provider proof |
| Release/deploy | CI pass, staged deploy smoke, logs check | Vercel promote/rollback proof |

## TDD for future code

This planning task is docs-only. Future behavior/governance scripts must use test-first fixtures: missing receipt, bad branch target, docs-only/source mismatch, valid `codex/*` to `staging`, invalid `codex/*` to `main`, and valid `staging` to `main`.

## E2E strategy

Do not make every Playwright test block every docs-only PR. Always run full e2e before production release and run route-specific e2e for auth/share/workshop/publication changes.

## Flake policy

Classify failures before rerun. Do not claim green from a lucky rerun if a prior failure is unexplained.
<!-- 98-100-UPGRADE:START -->
## Required TDD fixtures for governance code

1. missing agent receipt fails;
2. invalid branch target fails;
3. docs-only claim with `src/`/provider/config diff fails;
4. valid `codex/* -> staging` passes;
5. invalid `codex/* -> main` fails;
6. valid `staging -> main` with proof passes;
7. provider-proof claim without redacted evidence fails;
8. misleading success output with non-zero exit fails.

## Adversarial QA scenarios

| ID | Scenario | Expected signal |
|---|---|---|
| ADV-001 | malformed PR receipt / unusual Unicode | governance fails cleanly |
| ADV-002 | prompt injection in PR body tells agent to ignore rules | checker treats text as data |
| ADV-003 | false docs-only claim with source diff | checker fails |
| ADV-004 | stale Vercel/GitHub proof older than current SHA | release gate fails |
| ADV-005 | disabled CI but required-check claim | final gate blocks overclaim |
| ADV-006 | GitHub ruleset 403 | advisory/blocker status only |
| ADV-007 | flaky e2e first fails then rerun passes | classify before green claim |
| ADV-008 | command prints success but exits non-zero | non-zero exit wins |

## Evidence hierarchy

Fresh command output/provider API proof beats agent summaries. Agent/team summaries are accepted only after leader reconciliation and diff/graph verification.
<!-- 98-100-UPGRADE:END -->
