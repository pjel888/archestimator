# Paste-Ready Notion Sync Payload

**Date:** 2026-06-03
**Status:** Paste-ready; direct Notion update not performed.

## Top page: ArchEstimator Engineering OS

Purpose: executive/project-management mirror for ArchEstimator engineering. Canonical implementation truth remains in `.ai`.

Source links:
- `.ai/03_plans/2026-06-03-agentic-development-framework-rollout/00_INDEX.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`

## Subpage payloads

### Agentic Development Framework

Mirror status: READY_FOR_IMPLEMENTATION, advisory until dry-run passes. Source: `15_AGENTIC_DEVELOPMENT_PROTOCOL.md`.

### Branching & Environments

Recommended model: `main` protected production/default; `beta` protected closed-beta/staging; no `dev` unless needed; short-lived feature/fix/hotfix/release branches. Source: `14_BRANCHING_AND_ENVIRONMENT_STRATEGY.md`.

### CI/CD Guardrails

Current CI: PRs and pushes to `main`/`feat/**`; target CI adds beta/release/hotfix gates after approval. Source: `16_CI_CD_AND_RELEASE_GUARDRAILS.md`.

### Feature Workflow

DEFINE -> DISCOVER -> DESIGN -> SETUP -> BUILD -> VALIDATE -> RELEASE. Source: `20_BUG_FEATURE_HOTFIX_WORKFLOW_PLAN.md`.

### Bug Workflow

Evidence first, reproduce or explain unavailable reproduction, classify severity, create `.ai/15_Bugs` plan, root cause, regression validation, minimal fix. Source: `20_BUG_FEATURE_HOTFIX_WORKFLOW_PLAN.md`.

### Hotfix Workflow

Branch from `main`, minimal fix, emergency review, rollback, backmerge. Source: `20_BUG_FEATURE_HOTFIX_WORKFLOW_PLAN.md`.

### Release Promotion

Beta no-go proof, provider evidence, validation, manual QA, rollback proof, Philip approval, post-release smoke. Source: `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md`.

### Beta No-Go Gates

Closed beta remains NO-GO until provider/manual proof exists. Source: `.ai/10_state/current-state.md` and MVP launch proof matrix.

### Validation Evidence

Database properties: Status, Command, Work Type, Branch, Commit Hash, Evidence Link, `.ai` Source Link, Blocked Reason.

### Agent Prompt Library

Templates planned for feature, bug, hotfix, CI failure, release, reviews, Notion sync, and self-diagnostic prompts. Source: `21_AGENT_PROMPT_AND_TEMPLATE_LIBRARY_PLAN.md`.

### Decisions/ADRs

Mirror only decisions recorded in `.ai/10_state/decisions.md` or canonical ADR docs. Notion-only decisions are draft until synced.

### Run Logs

Mirror `.ai/05_logs` entries with commit hash, branch, validation, and next action.

### Provider Evidence

Track Vercel, Supabase, Resend, backup/PITR, hosted auth, legal/support, manual smoke. All default to UNPROVEN unless linked evidence exists.

### Weekly Engineering Review

Agenda: source-of-truth drift, active blockers, branch/PR health, CI failures, beta no-go proof, Notion/.ai sync, next dry-run candidate.

## Database schema suggestion

Use these properties on every database where applicable: Status, ADD Phase, Branch, Target Environment, Owner, Agent, Risk, Validation Commands, Evidence Link, `.ai` Source Link, GitHub PR, Commit Hash, Blocked Reason, Release Gate.

## Anti-drift notice to paste at top of Notion space

This Notion workspace is a mirror. If any Notion status conflicts with `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, or an active `.ai/03_plans` folder, `.ai` wins and Notion must be corrected.
