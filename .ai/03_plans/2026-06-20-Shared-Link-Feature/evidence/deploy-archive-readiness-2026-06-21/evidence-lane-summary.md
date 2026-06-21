# Shared-Link Archive Readiness Evidence Lane

Date: 2026-06-21
Scope: deploy/performance/observability evidence only.
Boundary: read-only local checks and read-only linked-provider checks against `ebxxqidacheyapmmzavr`; no production deploy, no provider mutation, no source/test/doc edits.

## Verdict

Status: PARTIAL.

Closed from this lane:

- Local PERF-06 snapshot byte budget: PASS.
- Local PERF-09 CPU-only password verification budget: PASS.
- Local PERF-12 CPU-only rotate token-hash loop: PASS.
- Linked-provider DB performance inventory: captured.
- Deploy ledger snapshot and shared-link index snapshot: captured.
- Hosted production health endpoint: reachable with `cache-control: no-store`.
- Source-level observability emitters/sinks: present by grep evidence.

Still open / deploy-only:

- Current commit has no Vercel deployment in `vercel ls ... -m githubCommitSha=<current>`.
- No new app deploy was performed.
- No Shared-Link post-deploy smoke ran against a hosted share URL.
- No hosted/browser recipient TTI or visual/mobile/print proof was captured.
- No provider EXPLAIN, password-route DB/backoff timing, or rotate lock/update timing was captured.
- No Vercel log drain proof was captured; `vercel drains ls` is not a valid CLI subcommand in Vercel CLI 54.9.1.
- Supabase policy/RPC-grant snapshot retries were blocked by provider CLI auth/temp-role failures; existing provider-readback evidence remains the latest proof for those invariants.

## Commands And Artifacts

| Command | Exit | Artifact / result |
| --- | ---: | --- |
| `supabase --version` | 0 | `supabase-version.txt` (`2.105.0`) |
| `supabase migration list --linked` | 0 | `migration-list-linked.txt`; shared-link versions `20260620064601`, `20260620142000`, `20260621042221`, `20260621051701` are Local+Remote; global drift remains. |
| duplicate migration name scan | 0 | `duplicate-migration-names.txt`; `allow_project_deletion_with_active_publications.sql`, `project_groups.sql`. |
| shared-link index snapshot query | 0 | `live-indexes.json`. |
| shared-link policy snapshot query | 1 | `live-policies.json` is empty; CLI temp role auth failed and requested `SUPABASE_DB_PASSWORD`. |
| shared-link RPC grants snapshot query | 1 | `live-rpc-grants.json` is empty; concurrent CLI telemetry rename failure. |
| `bun scripts/collect-live-db-performance-evidence.ts --mode linked --run-sql ...` | 0 | `../perf-live-db-archive-readiness-2026-06-21/`; read-only linked-provider evidence captured. |
| snapshot byte budget helper | 0 | `../perf-archive-readiness-2026-06-21.md`; all rows PASS. |
| password unlock helper | 0 | `../perf-password-unlock-archive-readiness-2026-06-21.md`; all rows PASS, CPU-only. |
| rotate cost helper | 0 | `../perf-rotate-cost-archive-readiness-2026-06-21.md`; all rows PASS, CPU-only. |
| `vercel ls archestimator --format=json -m githubCommitSha=<current>` | 0 | `vercel-deployments-current-commit.json`; empty deployment list. |
| `vercel inspect https://www.archestimator.com --timeout 10s` | 0 | `vercel-inspect-www.stderr.txt`; production deployment `dpl_8ymooyEM51amXCJ7xNstAHEkTeGq` is Ready. |
| `curl https://www.archestimator.com/api/health` | 0 | `health-headers.txt`, `health-body.txt`; HTTP 200, `cache-control: no-store`. |
| observability source grep | 0 | `../observability-archive-readiness-2026-06-21/source-sink-grep.txt`; 90 source hits. |
| `vercel drains ls` | 1 | `../observability-archive-readiness-2026-06-21/vercel-drains-ls.stderr.txt`; unsupported CLI subcommand. |
| `vercel logs --help` | 0 | `../observability-archive-readiness-2026-06-21/vercel-logs-help.txt`; read-only log search surface exists. |
| `curl https://mcp.supabase.com/mcp` | 0 | `../observability-archive-readiness-2026-06-21/supabase-mcp-reachability.txt`; HTTP 401, expected unauthenticated reachability. |

## Linked DB Summary

From `../perf-live-db-archive-readiness-2026-06-21/live-evidence-summary.json`:

- `has_pg_stat_statements`: false, so query-text performance proof and provider EXPLAIN remain separate work.
- Public table count: 57.
- Index-usage rows captured: 213.
- Unindexed foreign-key rows reported by the generic detector: 78.
- Shared-link row counts include `project_publication_events=1169`, `project_publications=11`, `security_rate_limit_events=1`, `shared_link_comments=1`, `shared_link_responses=0`.

## Conflicts / Worktree Notes

The worktree was already dirty before this lane and continued changing during verification. This lane only added files under allowed evidence paths and did not modify source, tests, or runbook docs.
