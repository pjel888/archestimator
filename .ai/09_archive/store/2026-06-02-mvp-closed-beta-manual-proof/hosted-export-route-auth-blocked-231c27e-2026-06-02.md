# Hosted Export Route Auth-Blocked Probe - 2026-06-02

Status: blocked; no hosted workbook generation proof.

## Scope

- Commit inspected: `231c27e2b95291b8c9770e327344ba3809f03f9d`
- Preview deployment: `dpl_HUvjmre3YPya25GVDir18qHxmfSN`
- Preview URL: `https://archestimator-41fhr533d-philipjonlewis-projects.vercel.app`
- Route probed: `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`
- Provider mutation: none
- Data mutation: none

## Read-Only Route Map

`omx explore` mapped the XLSX route to:

- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/auth/session.ts`

The route calls `getProjectEstimateTreeByEstimate(projectId, estimateId)`. That repository path resolves project/workspace data through `ensureDefaultWorkspace()` and `requireCurrentUserContext()`. Because `src/proxy.ts` bypasses `/api` routes, the export auth boundary is inside the route's repository call chain, not middleware.

Conclusion: a meaningful hosted workbook timing/memory proof requires a logged-in hosted app session plus real authorized `projectId` and `estimateId`. An anonymous `vercel curl` probe cannot prove workbook generation.

## Hosted Probes

Authenticated provider health was already available for this deployment:

```text
vercel inspect archestimator-41fhr533d-philipjonlewis-projects.vercel.app --non-interactive
status: Ready

vercel curl https://archestimator-41fhr533d-philipjonlewis-projects.vercel.app/api/health
{"ok":true,"service":"archestimator","timestamp":"2026-06-02T03:55:59.068Z"}
```

Fake-ID export probe:

```text
vercel curl https://archestimator-41fhr533d-philipjonlewis-projects.vercel.app/api/projects/00000000-0000-4000-8000-000000000001/estimates/00000000-0000-4000-8000-000000000002/export/proposal.xlsx
```

Observed result:

- No XLSX bytes were produced.
- A raw probe surfaced the Next.js 404 not-found page for the fake route/data combination.
- A clean rerun through `vercel curl` exited `0` after roughly 3 seconds with `0` captured response bytes.

This is acceptable as a fail-closed probe for unauthenticated/fake data. It is not an export-route pass because it does not exercise `buildProposalExportModel()` or `createProposalWorkbookBuffer()` in the hosted environment.

## Launch Meaning

This artifact narrows the remaining export blocker:

- Local route-handler workbook proof exists.
- Local workbook benchmark proof exists.
- Vercel preview health for `231c27e` exists.
- Hosted export-route workbook generation timing/memory proof is still missing because it requires a real hosted session and authorized estimate.
- Spreadsheet-app open/recalc/print proof is still missing.

Closed beta remains **NO-GO**.
