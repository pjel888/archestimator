# 05 — Information Security Audit

**Scope:** `/workshop/projects/[projectId]/charts` (read-only analytics). RLS
verified directly from migration SQL (the authoritative source of applied
policies; live MCP read required interactive OAuth not completed in-session).

## Verdict up front

This is a **low-risk page.** The two BOLA vectors a reviewer would worry about — a
forged `projectId` and the unfiltered `component_category_nodes` load — are both
**already closed** by RLS, by design. There are **no High findings.** The
actionable items are Medium-or-below: client-side over-fetch of per-row cost facts
(fixed as a side-effect of the performance work) and the page-independent absence
of `/workshop` security headers. The prior "full estimates row shipped to client"
finding does **not** reproduce here — this repository ships a deliberately narrowed
fact shape and the raw `source_snapshot` jsonb never crosses the wire.

---

## ALREADY SAFE — do not chase these in the plan

- **SAFE-1 — Cross-workspace BOLA via forged `projectId` is closed.** Page →
  `getProjectChartsData(projectId)` → `getCurrentWorkspaceProject(projectId)`
  (`workspace-repository.ts:1146`): `isUuid` validation (→ `notFound()` on
  malformed), then `select * from projects where id = projectId` under RLS
  `"project viewers can read projects" … using (public.can_access_project(id))`
  (`20260526142913:717`). A project in another workspace returns zero rows →
  `project: null` → page `notFound()`. App gate + RLS are redundant and mutually
  sufficient.
- **SAFE-2 — Estimate fact loads are RLS-scoped per estimate.** `loadRowFacts`/
  `loadNodeFacts` filter `.in("estimate_id", …)`; even a forged id is filtered by
  `"estimate viewers can read estimate rows" … using (can_access_estimate(estimate_id))`
  (`20260526142913:751`). `estimateIdsToLoad` derives only from estimates already
  read under the project gate.
- **SAFE-3 — `searchParams` are not an injection vector.** `left`/`right` →
  `normalizeSelectedEstimateIds`, intersected against the allow-set of loaded
  estimate ids (`repository:273-276`); `mode` whitelisted to `space|category|supplier`
  with a `space` fallback (`page.tsx:44`). Values reach Supabase only as
  parameterized `.in()/.eq()` filters (PostgREST), never concatenated SQL.
- **SAFE-4 — `source_snapshot` jsonb does NOT cross the wire.** `loadRowFacts`
  parses it server-side and emits only derived scalars into `ProjectChartRowFact`
  (`types.ts:13-26`). The rich keys (`pricingSource`, `pricingDate`,
  `priceOptionLabel`, `confidence`, `sourceLibraryItemId`, `sourceTemplateId/Name`,
  …) are **never** serialized to the client. Good data-minimization already in
  place. (This is the correction to the prior "full estimates row" finding.)

---

## Findings

### SEC-1 — Per-row cost facts cross the wire to the client (over-fetch) — Medium

**Evidence:** `getProjectChartsData` returns `rowFacts: ProjectChartRowFact[]`
(`repository:116`, `types.ts:58`) with `quantity`, `unitCost`,
`contingencyPercentage`, `miscCost`, plus supplier fields per individual line item,
up to 5,000 rows. The client only ever renders **aggregated buckets**. The page
already does cost arithmetic server-side for `estimateOptions.totalCost`
(`repository:105-108`), so the aggregation logic exists server-side.

**Why Medium, not High:** the viewer is, by RLS, already authorized to read these
estimate rows (`can_access_estimate`) — not a privilege-escalation leak. The
exposure is (a) granular per-line cost basis in the page payload / browser memory /
devtools when only sums are needed, and (b) supplier↔line-item↔unit-cost
correlation readable off the wire by an authorized-but-curious viewer-role
collaborator. A data-minimization gap, not a boundary breach.

**Remediation:** move bucket aggregation server-side and ship only
`ProjectChartBucket[]` + `estimateOptions`; drop raw `rowFacts`/`nodeFacts` from the
serialized payload. **This is the same change as `01` PERF-2 / `02` DB-4** — one
fix closes a performance *and* a security finding. If client-side re-grouping by
`mode` must stay instant, ship pre-aggregated buckets for all three modes rather
than 5,000 raw rows. Enhancement, not a blocker.

### SEC-2 — `/workshop/*` has zero security headers — Medium (page-independent, known)

**Evidence:** `next.config.ts headers()` (`:60-116`) returns header sets only for
landing routes (`Report-Only` CSP) and `/share/:path*` + `/api/share/:path*`
(enforced CSP + `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS,
nosniff). **No matcher for `/workshop`.** The charts page serves with no CSP, no
`X-Frame-Options` (clickjackable), no `nosniff`, no HSTS. `proxy.ts` sets only
`Cache-Control`.

**Why Medium, not High:** confirmed org-wide in prior audits — a hardening gap that
includes this page, not a charts-specific bug. The page renders no user-controlled
HTML and has no obvious stored-XSS sink, so missing CSP is defense-in-depth;
clickjacking risk on a read-only analytics view is low.

**Remediation:** extend `headers()` with a `/workshop/:path*` entry — at minimum
`X-Frame-Options: DENY` (or `frame-ancestors 'none'`), `X-Content-Type-Options:
nosniff`, `Referrer-Policy: same-origin`, and a `Content-Security-Policy-Report-Only`
to start (the app pages need `'unsafe-inline'`/`'unsafe-eval'` for Next — enforce
gradually). **Belongs in a cross-cutting hardening ticket, referenced from this
plan (P4), not owned by it.** Coordinate with the estimates/library plans, which
raise the same gap.

### SEC-4 — Heavy over-fetch as a soft-DoS / RLS re-eval cost — Low

**Evidence:** on a large project, up to 5,000 row-items + 1,500 nodes + 1,000
categories + 1,000 suppliers per request (`Promise.all`, `repository:87-92`); no
per-user rate limiting (`proxy.ts` only does auth).

**Why Low:** the actor must already be authorized for the project (their own data),
`limit(+1)` caps every query, and `loadMode` flips to `selected-pair` above 20
estimates — bounding fan-out. Self-inflicted-load, not attacker amplification.
Fixing SEC-1 (ship buckets, aggregate server-side) removes most payload pressure.
No dedicated rate-limit work warranted for a read page at MVP.

---

## NOT findings (verified, correctly gated)

- **SEC-3 — `component_category_nodes` unfiltered load — NOT A FINDING.** The table
  has no `workspace_id` (it is a **global taxonomy** by schema design,
  `20260522064018:5-16`; comment "Categories are global taxonomy nodes"); its
  SELECT policy `using(true)` (`:59-60`) is *correct* because there is no tenant
  boundary on a global dictionary; mutations are gated to `ceo/admin`
  (`20260522070956`). No remediation. **Forward note:** if categories ever become
  workspace-customizable, this `using(true)` + unfiltered load become live BOLA —
  flag for any future taxonomy-tenancy change (`02` DB-1).
- **SEC-5 — `assertRouteErrorSmoke` injection — NOT A FINDING (correctly gated).**
  `route-error-smoke.ts:9` returns immediately unless
  `process.env.ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE === "1"`. In prod that var is
  unset, so `?routeErrorSmoke=1` is inert and cannot force a 500. **Residual
  action:** one-line ops check that the env var is never set in prod/preview (`11`).

---

## Summary table

| ID | Severity | Status |
|----|----------|--------|
| SEC-1 Per-row cost facts shipped to client | Medium | Open — fixed as a side-effect of PERF-2/DB-4 |
| SEC-2 No `/workshop/*` security headers | Medium | Open — cross-cutting ticket (P4 reference, not charts-owned) |
| SEC-4 Heavy over-fetch soft-DoS | Low | Mitigated by limits; fixed via SEC-1 |
| SEC-3 `component_category_nodes` unfiltered | Not a finding | Global taxonomy by design |
| SEC-5 `assertRouteErrorSmoke` param | Not a finding | Env-gated; verify prod env unset |
| SAFE-1..4 | — | Closed (BOLA, params, snapshot minimization) |

**Net for the plan:** two Medium lines — SEC-1 (do aggregation server-side; a
genuine data-minimization win that *is* the performance fix) and SEC-2 (fold into
the existing `/workshop` headers gap). Everything else is already safe or correctly
gated; don't spend plan budget re-litigating the BOLA, the taxonomy load, or the
smoke param.

---

## Quality posture

The infosec audit is proportionate to a read-only page, lists already-safe paths so
the plan does not waste budget, and keeps the real data-minimization issue tied to
the payload/RPC work. Provider and ops checks remain implementation evidence.
