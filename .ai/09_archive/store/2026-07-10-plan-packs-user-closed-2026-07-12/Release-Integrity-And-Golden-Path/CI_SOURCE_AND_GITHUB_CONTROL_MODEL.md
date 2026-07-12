# CI Source And GitHub Control Model

This is a supporting review artifact for `REQ-001`, `REQ-007`, `REQ-009`,
`UNIT-001/007/008`, and `AUTH-001`. Stable IDs remain in the existing canonical
files; local workflow source never proves hosted enforcement.

## Two-Layer Control Model

| Layer | Planned owner | What it can prove | What it cannot prove |
|---|---|---|---|
| Repository workflow source | `UNIT-001` | Frozen install, full action pins, permissions, job/dependency contracts, explicit timeouts, fork-safe triggers | Active ruleset, required context/source app, retention, scan state, or environment policy |
| Read-only hosted discovery | `UNIT-007` | Current repository/plan/visibility, rulesets, checks, merge queue, environments, runs/artifact expiry, scan endpoint state | Permission to mutate a control or that an inaccessible endpoint is clean |
| Authorized mutation/readback | `UNIT-008` under `AUTH-001` | Exact approved control changed and read back for branch/workflow SHA | Staging execution, production deploy, paid service, or another repository |

## Local Workflow Contract

- Use `bun install --frozen-lockfile` and pin every third-party action to a full
  commit SHA. Keep permissions least-privilege at workflow/job scope.
- Typecheck remains an independent required job because the current Next config
  permits build-time TypeScript errors. Lint and error-handling are explicit;
  they are not inferred from `next build`.
- The aggregate required result fails on missing, failed, skipped, neutral,
  cancelled, or `continue-on-error` dependencies. A green optional job does not
  conceal a failed required job.
- Pull-request jobs do not expose secrets to untrusted fork code. Scheduled and
  release jobs use explicit concurrency/timeout behavior and immutable inputs.
- Add `merge_group` only if live discovery proves a merge queue is enabled.

## Hosted Discovery Contract

GET-only collectors paginate completely, request secret-scanning data with
`hide_secret=true`, allowlist/redact before stdout or persistence, and record
endpoint, collection time, page count/completeness, result digest, and status.
Missing credentials, 401/403/404/503, rate limit, partial pagination, unsupported
plan features, or unavailable endpoints render `UNKNOWN`, never `PASS` or clean.

## `AUTH-001` Packet And Readback

The mutation packet binds repository/owner, branch, ruleset/check names, expected
source app, qualifying successful run from the prior seven days, environment,
workflow SHA, retention/scanning changes, bypass policy, current digest, exact
mutation, rollback payload, exclusions, and proof destination. Before/after
readback must match the approved target and expected source integration.

## Proof And Resume

`TEST-001/007` prove source and mocked discovery locally. `TEST-009` remains a
hosted boundary until an authorized mutation plus readback runs. Resume local
work at `UNIT-001`; after `UNIT-007`, resume hosted control work only from the
current, unexpired `github-control-packet.json`.
