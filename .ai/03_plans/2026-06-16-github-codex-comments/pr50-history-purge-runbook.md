# PR #50 BOQ History Purge Runbook

Date: 2026-06-16
Thread: `PRRT_kwDOSfSDcs6JokL3`
GitHub comment: `https://github.com/pjel888/archestimator/pull/50#discussion_r3414842338`

## Current State

- `main` and `origin/main` were in parity before this runbook was written:
  `git rev-list --left-right --count main...origin/main` returned `0 0`.
- The only remaining unresolved Codex review thread is PR `#50`, titled
  `Purge the sensitive BOQ blobs from Git history`.
- The current HEAD files are sanitized, but historical BOQ artifact blobs remain
  reachable from repository history.
- The exact commit named by the GitHub comment,
  `df15eb926b65be93739366f37358a7b458c52d40`, is not present in this local
  clone. The sensitive history issue is still real because older BOQ artifact
  blobs are present by path.

## Sensitive Historical Blobs Verified Locally

Do not print historical file contents. Use object IDs and sizes only.

- `_research/02a-boq-raw-dump.txt`
  - historical blob: `9834285c51554bb6feffe6de7e026f6cf51f8374`
  - size: `285043`
- `_research/02a-boq-reference-extraction.md`
  - historical blob: `bf3aa463594adaa4324cea67f954f92d56d30318`
  - size: `22796`
- `02_boq-format-benchmark.md`
  - historical blob: `4e34f4c6988919ba97e98ad65c424434812bd2f0`
- `_research/02b-boq-format-gap.md`
  - historical blob: `de5f3b9b990f17edc9137b0443be644e41d1952d`

## Approval Gate

Do not run the real purge without explicit owner approval because it requires:

- rewriting local and remote Git history;
- force-pushing rewritten `main` with `--force-with-lease`;
- coordinating the 12 currently open PR branches (`#66, #70, #71, #73, #74,
  `#75`, `#77`, `#80`, `#82`, `#84`, `#85`, `#86`);
- telling collaborators and agents to reclone or hard-reset after the rewrite;
- accepting that GitHub or downstream caches may retain old objects for some
  time and may require support-side cleanup.

## Rehearsal Proof

A non-destructive rehearsal was run in:

```text
/tmp/archestimator-history-purge-rehearsal/repo
```

After rewriting, deleting `refs/original/*`, expiring reflogs, and running GC:

```bash
git rev-list --objects --all | rg '9834285c51554bb6feffe6de7e026f6cf51f8374|bf3aa463594adaa4324cea67f954f92d56d30318|4e34f4c6988919ba97e98ad65c424434812bd2f0|de5f3b9b990f17edc9137b0443be644e41d1952d'
```

returned no matches, while `git cat-file -e HEAD:<path>` succeeded for the
current sanitized BOQ artifacts.

## Real Execution Shape

Use the guarded helper script:

```bash
ARCHESTIMATOR_CONFIRM_HISTORY_REWRITE=PURGE_BOQ_HISTORY \
  bash .ai/03_plans/2026-06-16-github-codex-comments/scripts/purge-boq-history.sh
```

The script intentionally stops before pushing unless
`ARCHESTIMATOR_CONFIRM_FORCE_PUSH=FORCE_WITH_LEASE_MAIN` is also set.

After the force push, run a provider audit:

```bash
gh api graphql -f query='query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){nodes{id isResolved path comments(first:20){nodes{databaseId body author{login}}}}}}}}' \
  -F owner=pjel888 \
  -F name=archestimator \
  -F number=50
```

Only resolve `PRRT_kwDOSfSDcs6JokL3` after the rewritten pushed refs no longer
expose the historical sensitive blob IDs and the current sanitized files remain
present at HEAD.

## 2026-06-16 Execution Result

Owner approval was granted and the branch-history rewrite was executed.

- `main` was force-updated with `--force-with-lease` to
  `d331c06b45ef69dad77243738d8892e78b9c9e32`.
- The 37 affected `codex/*` branch heads were force-updated with per-branch
  leases.
- Fresh mirror verification of branch heads returned no matches for the four
  known old BOQ blob IDs.
- The local working checkout was reset to rewritten `origin/main`; local object
  verification reported the four old blob IDs absent.

Remaining provider blocker:

- GitHub still advertises read-only `refs/pull/*/head` refs containing the old
  PR snapshots. `refs/pull/50/head` remains at
  `bf9e54df7deb408bb7befbc743d52e9803195d02`.
- Git rejected a push to `refs/pull/50/head` with `deny updating a hidden ref`.
- GitHub REST deletion of `repos/pjel888/archestimator/git/refs/pull/50/head`
  returned HTTP `422`: `refs/pull/* is read-only`.

The unresolved thread should remain unresolved until GitHub-side pull-ref
retention is cleared or GitHub confirms those hidden refs are outside the
remediation boundary.
