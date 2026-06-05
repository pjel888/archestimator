# 09 — Validation Matrix and Test Strategy

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

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
