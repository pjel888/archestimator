# GitHub Codex Comment Resolution Plan

Date: 2026-06-16
Repo: `pjel888/archestimator`
Branch at intake: `main`

## Goal

Resolve all outstanding `chatgpt-codex-connector` GitHub review threads for
Archestimator with evidence. Resolution means one of:

- the thread is fixed on current `main` and verified;
- the thread targets superseded/deleted historical code and is resolved as
  obsolete with local evidence;
- the thread is already outdated/resolved in GitHub and is verified closed.

## Intake Evidence

- Open PRs at intake: `#66, #70, #71, #73, #74, #75, #77, #80, #82, #84, #85, #86`.
- Open PR review threads/comments at intake: zero on all 12 open PRs.
- Recent open/closed/merged PR snapshot: `.ai/02_audits/2026-06-16-github-codex-comments/recent-pr-thread-snapshot.json`.
- Unresolved Codex-only thread list: `.ai/02_audits/2026-06-16-github-codex-comments/unresolved-codex-threads.json`.
- Total unresolved Codex threads in snapshot: 86.
- Already GitHub-outdated threads: 14.
- Not marked outdated by GitHub: 72.

## Work Buckets

### Active implementation clusters

These point at current files or current behavior and must not be resolved until
the code/docs/tests are fixed or proven already fixed:

- `#69` reusable project-source search: estimate sheet-code cap, raw query cap,
  and batched estimate candidate reads.
- `#56/#57` notification RLS proof cleanup and local Postgres socket handling.
- `#59` Impeccable live server origin/header handling.
- `#64` project route/sidebar/docs smoke: charts deep-link compatibility,
  canonical plan location, express promotion surface, and route-error smoke.
- `#30` overlay primitives: focus, accessible names, nested triggers, pointer
  passthrough, and modal focus trap.
- `#32` library/template editor: sort updates, root area insert disable,
  serialized category inserts, component drawer supplier/brand/lifecycle state.
- `#16` component image upload host/MIME handling where current files still
  exist.
- `#37/#39/#48/#49` auth/publication/share flows if current main still carries
  the reviewed behavior.
- `#11/#12/#38/#47/#50/#54` small current-path doc/test/tooling/archive checks.

### Superseded historical clusters

These target deleted local-first prototype files and should be resolved only
after the deletion/supersession evidence is recorded:

- `src/components/estimate-workspace.tsx`
- `src/lib/estimates/library-insert.ts`
- `src/lib/local-data/schemas.ts`
- `src/lib/local-data/mutations.ts`
- `src/lib/estimate-grid/adapter.ts`
- `src/components/estimate-grid-spike.tsx`
- `tests/vitest/projects-page.test.tsx`

### GitHub mutation policy

Resolve review threads only after:

1. current-code fixes are committed or otherwise verified on `main`;
2. superseded-path evidence is captured for historical threads;
3. a fresh thread inventory confirms the target thread IDs are still unresolved.

Use the GitHub connector or `gh api graphql` thread IDs from the audit snapshot.
Do not resolve open-PR threads blindly; open PRs must be checked live first.

## Active Lanes

- Lead: GitHub inventory, tracker, integration, final resolution mutations.
- `#69` search lane: `src/lib/repositories/project-estimate-sheets-repository.ts`,
  `src/lib/reusable-sources/actions.ts`, related tests.
- `#56/#57` proof lane: `tests/vitest/notification-rls-proof.test.ts`,
  `scripts/prove-notification-rls-postgres.mjs`.
- `#59` live-server lane: `.agents/skills/impeccable/scripts/live-server.mjs`.
- `#30` overlay lane: `src/components/ui/overlays/*`.
- `#64` route/sidebar lane: project `data`/`charts` routes, mini-sidebar, and
  misplaced docs plan bridge.

## Stop Condition

The run is complete only when a fresh GitHub review-thread audit shows no
unresolved actionable Codex review threads remain, local `main` is clean and in
parity with `origin/main`, and verification evidence is recorded in
`.ai/05_logs/2026-06-16-github-codex-comments/`.
