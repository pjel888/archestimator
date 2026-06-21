# Shared-Link Hosted Deploy Smoke Attempt

Date: 2026-06-21
Commit: `2512edd45ed78c5614289f651fe839288b070687`
Worktree used: clean detached worktree at `/tmp/archestimator-deploy-2512edd4`
Vercel project: `archestimator` in `philipjonlewis-projects`

## Verdict

Status: **BLOCKED** for the hosted deploy/post-deploy smoke gate.

The Vercel project is linked and local Vercel credentials are available, but the preview deploy for the current
commit failed during `bun run build`. Because no Ready deployment exists for this commit, the `/share/[token]`
hosted security-header smoke and post-deploy shared-link checks could not run.

## Deployment State

- `vercel whoami`: authenticated as `philipjonlewis`.
- Current production inspect: `https://www.archestimator.com` resolves to Ready production deployment
  `dpl_8ymooyEM51amXCJ7xNstAHEkTeGq`, created 2026-06-20.
- Current commit deployment lookup: `vercel ls archestimator --format=json -m githubCommitSha=2512edd45ed78c5614289f651fe839288b070687`
  returned an empty deployment list before and after the preview attempt.
- Preview attempt 1: `vercel deploy --yes --archive=tgz` from the clean worktree stalled during upload at
  `4.2MB/16.7MB`; no deployment object appeared for the commit. The CLI process was interrupted after it remained
  stuck.
- Preview attempt 2: `vercel deploy --yes` from the clean worktree uploaded successfully and created preview URL
  `https://archestimator-317zvzlo9-philipjonlewis-projects.vercel.app`, deployment
  `dpl_4jqCjvQV9gvyZz5J6yhAp8LaNAW7`, but ended in `ERROR`.

## Exact Build Blocker

Remote Vercel result:

```text
readyState: ERROR
error: BUILD_ERROR
message: Command "bun run build" exited with 1
```

Local reproduction in the same clean `HEAD` worktree:

```text
Error: Turbopack build failed with 69 errors:
./src/lib/estimates/actions.ts:44:1
Only async functions are allowed to be exported in a "use server" file.
export const ESTIMATE_ROW_REVISION_CONFLICT_CODE = "estimate_sheet_row_revision_conflict";
```

Impact: Next/Turbopack treats `src/lib/estimates/actions.ts` as an invalid `"use server"` module because it exports
non-async values/classes. That causes downstream imports from `@/lib/estimates/actions` to appear unavailable, producing
the remaining cascade of missing-export errors.

## Commands Run

```bash
git rev-parse HEAD
vercel whoami
vercel --version
vercel ls archestimator --format=json -m githubCommitSha=2512edd45ed78c5614289f651fe839288b070687
vercel inspect https://www.archestimator.com --timeout 10s
git worktree add --detach /tmp/archestimator-deploy-2512edd4 2512edd45ed78c5614289f651fe839288b070687
cp .vercel/project.json /tmp/archestimator-deploy-2512edd4/.vercel/project.json
vercel deploy --yes --archive=tgz
vercel deploy --yes
vercel inspect https://archestimator-317zvzlo9-philipjonlewis-projects.vercel.app --timeout 10s
vercel logs https://archestimator-317zvzlo9-philipjonlewis-projects.vercel.app
bun install --frozen-lockfile
bun run build
```

## Artifacts

- `vercel-deployments-current-commit-refresh.json`
- `vercel-inspect-www-refresh.stderr.txt`
- `vercel-preview-deploy-2512edd4.stderr.txt`
- `vercel-preview-deploy-2512edd4-noarchive.stderr.txt`
- `vercel-preview-deploy-2512edd4-noarchive.stdout.txt`
- `vercel-preview-inspect-2512edd4.stderr.txt`
- `vercel-preview-logs-2512edd4.stderr.txt`
- `local-clean-head-bun-install-2512edd4.txt`
- `local-clean-head-build-2512edd4.txt`

## Next Command

After the build blocker is fixed in source and committed, rerun from a clean worktree:

```bash
vercel deploy --yes
vercel inspect <preview-url> --timeout 10s
SHARE_URL="<known-published-no-password-preview-share-url>" bun scripts/smoke-share-headers.mjs
```

If no hosted no-password `SHARE_URL` exists, seed or publish one against the target environment first, then run the
same smoke command. Do not promote to production until the preview is Ready and the shared-link smoke passes.

## Go / No-Go Implication

**NO-GO** for Shared-Link archive readiness and deploy signoff. Provider/schema evidence remains useful, but app
deploy and hosted post-deploy smoke are blocked by the current commit's production build failure.
