# Codex Cloud Security Findings Refresh Blocks Beta Readiness

**Detected:** 2026-06-04 local / 2026-06-03T18:39:31.434Z UTC
**Source:** Authenticated Chrome visit to `https://chatgpt.com/codex/cloud/security/findings`, refreshed via the Codex Security UI.
**Status:** OPEN
**Severity:** Launch blocker until triaged; current dashboard contains 27 medium, 6 low, and 9 informational findings.

## Why This Exists

The cheaper closed-beta provider path is partially proven, but the current Codex Security dashboard still lists open findings against `pjel888/archestimator`. Closed beta cannot be honestly called launch-ready until the medium findings are triaged and either fixed, accepted by owner/legal/security judgment, or proven stale/false-positive with evidence.

## Current Findings Snapshot

| # | Severity | Finding |
|---|---|---|
| 1 | medium | Unscoped Speed Insights exposes sensitive app URLs |
| 2 | medium | New share review GET APIs are not rate limited |
| 3 | medium | Mass deletion audit records are caller-tamperable |
| 4 | medium | Role demotion migration is blocked by its own trigger |
| 5 | medium | Hosted auth smoke sends cookies to unvalidated URL |
| 6 | medium | Beta feedback RLS allows forged cross-tenant context |
| 7 | medium | Denied beta users keep Supabase sessions |
| 8 | medium | Committed Lighthouse reports leak Supabase session cookies |
| 9 | medium | Unauthenticated digest server action emails owners |
| 10 | medium | Revoked invite RPC leaks project and email metadata |
| 11 | medium | Committed public share token and user project data |
| 12 | medium | Unbounded share tree parsing can DoS share renders |
| 13 | medium | Global comment circuit breaker can be tripped by bad UUIDs |
| 14 | medium | Unvalidated share image URLs enable client tracking |
| 15 | medium | Stale share sessions can approve newer publication snapshots |
| 16 | medium | Stale recipient sessions can post share comments |
| 17 | medium | Password-protected share metadata leaks project details |
| 18 | medium | Republish can widen shared links to all estimate sheets |
| 19 | medium | Project images are uploaded to a public listable bucket |
| 20 | medium | AI Ask endpoint lacks quota and fails open on audit |
| 21 | medium | Unbounded chart and XLSX export loading can exhaust server resources |
| 22 | medium | Direct RLS grants bypass component price audit |
| 23 | medium | Viewer members can mutate library folders |
| 24 | medium | CSV export allows spreadsheet formula injection |
| 25 | medium | Unpinned MCP tooling auto-executes external packages |
| 26 | medium | Proposal pages now expose internal unit-rate details |
| 27 | medium | Confidential client proposal committed to repository |
| 28 | low | Public activity cursors leak raw database IDs |
| 29 | low | Client activity view models leak raw UUID identifiers |
| 30 | low | Hosted export proof leaks project names in artifacts |
| 31 | low | Unescaped tree node IDs can crash share-page navigation |
| 32 | low | Persisted row image URLs can track estimate viewers |
| 33 | low | Unvalidated component source URLs allow script links |
| 34 | informational | Prompt overrides no-auto-merge policy and pushes main |
| 35 | informational | Bid workbook formulas omit contingency costs |
| 36 | informational | Shared-link recipient email exposed to project viewers |
| 37 | informational | Codex config auto-runs unpinned external tooling |
| 38 | informational | Folder delete can fail from sort-order collision |
| 39 | informational | Workspace seed migration reuses global item UUIDs |
| 40 | informational | Optimistic tree IDs can be submitted as parents |
| 41 | informational | Luna Heights seed estimate is rebuilt then deleted |
| 42 | informational | Production grid accepts negative estimate numbers |

## Speed Insights Finding Remediation

- Finding: `Unscoped Speed Insights exposes sensitive app URLs`.
- Repo fix: `5b9c3cb` on `main` removes `@vercel/speed-insights`, the root-layout import, and `<SpeedInsights />`.
- Production deploy: `dpl_CrCtjK3HfEKszvS44DWdQy8mEj8a`, Ready, target `production`, URL `https://archestimator-rb9kpgrst-philipjonlewis-projects.vercel.app`.
- Aliases verified by Vercel inspect: `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`.
- Hosted smoke: `https://www.archestimator.com/api/health` returned HTTP 200 after deploy.
- HTML marker scan: homepage contained no `SpeedInsights`, `speed-insights`, `/_vercel/speed-insights`, or `va.vercel-scripts.com` markers after deploy.
- Dashboard status: still pending Codex cloud rescan/closure; do not mark the overall 42-finding blocker closed from this single fix.

## Immediate Triage Order

1. Fix or disable unscoped Speed Insights on sensitive routes before beta traffic.
2. Triage findings involving committed secrets/tokens/session cookies/artifacts.
3. Triage public share/invite/auth/RLS findings before inviting any external tester beyond the owner account.
4. Separate informational workflow/config findings from runtime security blockers after the medium findings are handled.

## Proof Boundary

- This is a dashboard snapshot, not independent code-level validation of every finding.
- No signed validation-artifact URLs or credential values are copied into this repo note.
- Source of truth for current status remains the live Codex Security dashboard plus repo-local fix evidence.
