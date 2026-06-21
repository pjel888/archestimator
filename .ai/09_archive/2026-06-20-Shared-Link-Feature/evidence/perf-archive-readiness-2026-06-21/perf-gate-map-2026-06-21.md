# Shared-Link Perf Archive Readiness Gate Map

Date: 2026-06-21
Git SHA inspected: `704010cb`
Scope: PERF-01A hosted recipient-link timing and PERF-04 hosted/provider activity p95.

## Verdict

Status: **SUPERSEDED BY LATER PERF EVIDENCE**.

This map captured a mid-run blocker. It was superseded by hosted recipient-link timing (`hosted-recipient-activity-summary.md` for PERF-01A), provider activity timing (`../perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md` for PERF-04), hosted password timing (`../perf-hosted-password-route-2026-06-21/hosted-password-route-summary.md` for PERF-09), and current-preview §6 smoke (`../current-preview-smoke-2026-06-22/current-preview-section-6-smoke-summary.md`).

At the time of this mid-run map, neither target perf gate could be closed from that environment:

- PERF-01A hosted recipient-link timing requires a real hosted recipient-link `SHARE_URL`. The current shell has no `SHARE_URL` or `SHARE_COOKIE`; the only checked-in URL env file points to `http://127.0.0.1:3000/...`, and hosted evidence redacts the share token.
- PERF-04 activity p95 has local CPU/query-shape evidence and provider read-only EXPLAIN evidence, but no hosted/provider p95 timing for the valid activity read path. Existing provider perf proof measures publish, republish, and rotate only.

## Current Evidence Numbers

| Gate | Evidence | Env | p50 | p95 | Budget | Result | Notes |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| PERF-01A | `scripts/measure-shared-link-perf-budgets.ts --mode recipient-session-tti` attempted this pass | hosted | n/a | n/a | 2500 ms | **BLOCKED** | `SHARE_URL` missing; command exited before writing output. |
| PERF-04 | `evidence/shared-link-activity-benchmark.md` | local CPU only | n/a | n/a | n/a | **PARTIAL** | Explicitly says it does not prove Supabase latency, RLS cost, hosted function duration, or production p95/p99. |
| PERF-04 | `evidence/perf-oracle-live-db-2026-06-21/provider-explain-summary.md` | linked provider read-only | n/a | n/a | n/a | **PARTIAL** | Indexed/read-only EXPLAIN slice only; no valid hosted/provider activity p95. |
| Publish timing | `evidence/perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md` | linked provider | 69.34 ms | 77.30 ms | 6000 ms | **PASS** | Useful adjacent provider proof, not PERF-04 activity p95. |
| Republish timing | same as above | linked provider | 60.85 ms | 63.67 ms | 6000 ms | **PASS** | Useful adjacent provider proof, not PERF-04 activity p95. |
| PERF-12 rotate, 10 recipients | same as above | linked provider | 67.64 ms | 68.07 ms | 500 ms | **PASS** | Already closed outside this gate map. |
| PERF-12 rotate, 100 recipients | same as above | linked provider | 70.93 ms | 71.19 ms | 2000 ms | **PASS** | Already closed outside this gate map. |
| PERF-12 rotate, 1000 recipients | same as above | linked provider | 104.53 ms | 105.34 ms | 8000 ms | **PASS** | Already closed outside this gate map. |
| PERF-09 hosted password route | `evidence/perf-hosted-password-route-2026-06-21/hosted-password-route-summary.md` | hosted | 1322.66 ms | 2327.11 ms | 2500 ms | **PASS** | Adjacent hosted route proof; does not close PERF-01A. |

## Missing Inputs To Close

PERF-01A requires:

```bash
SHARE_URL="<hosted recipient URL with ?recipient=... or equivalent recipient token>" \
bun scripts/measure-shared-link-perf-budgets.ts \
  --mode recipient-session-tti \
  --samples 20 \
  --rows 1 \
  --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-archive-readiness-2026-06-21/recipient-session-tti.md
```

Optional only if the hosted share route requires existing access state:

```bash
SHARE_COOKIE="<redacted cookie value>" SHARE_URL="<hosted recipient URL>" ...
```

Do not record the raw recipient token or cookie in evidence. The current script records only timing rows, git SHA, fixture label, and pass/fail.

PERF-04 requires one of these evidence shapes:

1. A valid hosted public activity endpoint timing probe against:

```text
https://<ready-host>/api/share/<redacted-valid-share-token>/activity?limit=100
```

For recipient-session activity, include the sanitized recipient session cookie only in the request, not in output.

2. An owner-authenticated hosted server-action/browser probe for `loadSharedLinkActivity(...)` with a real manager session and valid publication token, recording sanitized p50/p95.

3. A dedicated provider-side harness that creates a disposable publication with representative comments/responses/events/access telemetry, runs the same indexed query shapes used by `src/app/api/share/[token]/activity/route.ts` and/or `src/lib/publication/actions.ts`, records p50/p95, and cleans up all fixture rows.

## Commands Run This Pass

```bash
pwd && sed -n '1,220p' AGENTS.md
```

Result: PASS; loaded repo instructions.

```bash
sed -n '1,140p' .ai/10_state/current-state.md
```

Result: PASS; fast path says PERF-01A hosted recipient-link timing and PERF-04 activity p95 remain measurement-open.

```bash
rg --files scripts | sort | rg -i 'perf|share|link|activity|provider|hosted|recipient|bench|timing'
```

Result: PASS; identified relevant perf/share scripts.

```bash
find .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence -maxdepth 3 -type f | sort
```

Result: PASS; inventoried evidence files.

```bash
rg -n "PERF-01A|PERF-04|recipient-link|recipient link|activity p95|provider activity|hosted|p95|p50" .ai/03_plans/2026-06-20-Shared-Link-Feature scripts package.json
```

Result: PASS; confirmed current docs mark PERF-01A/PERF-04 as open and found existing p50/p95 evidence for adjacent gates.

```bash
sed -n '1,380p' scripts/measure-shared-link-perf-budgets.ts
sed -n '1,430p' scripts/prove-shared-link-provider-perf.ts
sed -n '1,430p' scripts/benchmark-shared-link-activity.ts
sed -n '1,260p' .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md && sed -n '1,120p' .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-archive-readiness-2026-06-21.md && sed -n '1,140p' .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-oracle-live-db-2026-06-21/provider-explain-summary.md
```

Result: PASS; inspected script contracts and existing summarized evidence.

```bash
printf 'SHARE_URL=%s\nSHARE_COOKIE=%s\nHOSTED_AUTH_BASE_URL=%s\n' "${SHARE_URL:+set}" "${SHARE_COOKIE:+set}" "${HOSTED_AUTH_BASE_URL:+set}"
```

Result: PASS; all three were unset.

```bash
sed -n '1,120p' .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-smoke/url.env && sed -n '1,160p' .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-smoke/hosted-preview-2026-06-21/headers-2026-06-21.md && sed -n '1,130p' .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/deploy-archive-readiness-2026-06-21/hosted-deploy-smoke-attempt-2512edd4-2026-06-21.md
```

Result: PASS; local URL exists, hosted smoke token is redacted, and current-commit hosted deploy smoke was previously blocked by build failure.

```bash
rg -n "activity|PERF-04|/api/share/.*/activity|loadSharedLinkActivity|shared-link activity|activity p95" scripts src/app src/lib tests/vitest .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence -g '!**/*.png' -g '!**/*.pdf'
```

Result: PASS; mapped public activity route, owner server action, tests, and evidence. No dedicated hosted/provider activity p95 script found.

```bash
git status --short
```

Result: PASS; worktree already had many unrelated modifications/untracked files before this report.

```bash
sed -n '1,280p' 'src/app/api/share/[token]/activity/route.ts'
sed -n '1340,1625p' src/lib/publication/actions.ts
sed -n '1,180p' scripts/verify-hosted-sensitive-route-fail-closed.ts
cat package.json | sed -n '1,90p'
```

Result: PASS; confirmed the valid public activity endpoint and owner-only `loadSharedLinkActivity` path; package scripts do not include a valid hosted activity p95 proof command.

```bash
git rev-parse --short HEAD
```

Result: PASS; `704010cb`.

```bash
bun scripts/measure-shared-link-perf-budgets.ts --mode recipient-session-tti --samples 3 --rows 1 --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-archive-readiness-2026-06-21/recipient-session-tti-not-run.md
```

Result: FAIL/BLOCKED; exited `1` with `SHARE_URL is required for --mode recipient-session-tti.`

```bash
test -f .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-archive-readiness-2026-06-21/recipient-session-tti-not-run.md; printf 'recipient-session-output-created=%s\n' "$?"
```

Result: PASS; printed `recipient-session-output-created=1`, meaning the file does **not** exist.

```bash
mkdir -p .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-archive-readiness-2026-06-21
```

Result: PASS; created the allowed evidence directory for this report if absent.
