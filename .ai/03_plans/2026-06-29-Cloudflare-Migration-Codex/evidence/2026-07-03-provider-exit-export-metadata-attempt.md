# Provider Exit Export Metadata Attempt

Generated: `2026-07-03T22:15:21Z`

Status: **blocked, not a passing export gate**.

This pass created the owner-local dated provider-exit backup directory outside
the repository with `700` permissions and refreshed read-only Vercel and
Cloudflare metadata. It did not create a Supabase SQL dump or any raw provider
export, and no raw database content, provider secrets, tokens, cookies, mailbox
content, or private screenshots were added to the repository.

## Results

| Area | Result | Evidence |
| --- | --- | --- |
| Backup location | Created outside the repo; no export files observed. | Owner-local dated provider-exit backup directory under Documents, permission `700`; checksum not applicable because file count is `0`. |
| Supabase | Blocked. | Homebrew and package-runner Supabase `2.105.0` binaries were killed in the earlier attempt. The 22:15 UTC refresh found no `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, or `SUPABASE_PROJECT_REF` in the process environment; the Homebrew CLI still exited `137` before output; `bunx supabase@latest --version` returned `2.109.0`, but `projects list` produced no output in the bounded wait and was interrupted. No raw dump was created. |
| Vercel | Metadata recorded. | `vercel projects ls` found `archestimator` under `philipjonlewis-projects`; `vercel domains ls` found `0` account-level domains; `vercel env ls` showed encrypted env names only; `vercel ls archestimator --format=json` returned ready deployment metadata and a rollback-capable deployment list. |
| Cloudflare | Metadata recorded. | `bun run cf:check-wrangler-auth`, `bun run cf:check-provider-resources`, and `bun run cf:check-email` passed with no blockers. |

## Decision

The provider-exit export/retention gate remains open. Closing it still requires
one of:

- a working Supabase export for project `ebxxqidacheyapmmzavr` with raw dumps
  stored outside the repo and repo evidence containing only filenames, sizes,
  and checksums, or
- an explicit accepted-retention/accepted-loss decision with rollback and
  data-retention posture recorded in the sanitized operator record.

No provider downgrade, cancellation, deletion, obsolete-secret rotation, or
post-exit smoke should be claimed from this artifact.
