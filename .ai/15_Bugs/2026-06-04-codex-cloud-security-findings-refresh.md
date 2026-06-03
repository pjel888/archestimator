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

## Additional Repo Remediation Pending Rescan

- Production deploy: `dpl_4pGbs2jq95XDaXJotdc84D2QMy4n`, Ready, target `production`, URL `https://archestimator-9xupmkzu7-philipjonlewis-projects.vercel.app`.
- Aliases verified by Vercel inspect: `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`.
- Hosted smoke after deploy: `https://www.archestimator.com/api/health` returned app health JSON with HTTP 200; `https://archestimator.vercel.app/api/health` returned HTTP 200; apex `/api/health` redirected to `www`; signed-out `HEAD /workshop` returned HTTP 307 to `/login?next=%2Fworkshop`; `HEAD /login` returned HTTP 200.
- HTML marker scan after deploy: homepage contained 0 `SpeedInsights`, `speed-insights`, `/_vercel/speed-insights`, or `va.vercel-scripts.com` markers.
- Production deploy: `dpl_8ZQDQopHv95H94m1uR6xZgU8RvYD`, Ready, target `production`, URL `https://archestimator-f6dbdasoj-philipjonlewis-projects.vercel.app`.
- Aliases verified by Vercel inspect: `https://www.archestimator.com`, `https://archestimator.com`, and `https://archestimator.vercel.app`.
- Hosted smoke after deploy: `https://www.archestimator.com/api/health` returned HTTP 200; signed-out `HEAD /workshop` returned HTTP 307 to `/login?next=%2Fworkshop`; `HEAD /login` returned HTTP 200.
- HTML marker scan after deploy: homepage contained no `SpeedInsights`, `speed-insights`, `/_vercel/speed-insights`, or `va.vercel-scripts.com` markers.
- Finding: `New share review GET APIs are not rate limited`.
  - Repo fix: comment-history and decision-state GET handlers now apply durable recipient-scoped read rate limits before loading review data.
  - Verification: focused publication/auth suites passed 8 files / 106 tests.
- Finding: `Denied beta users keep Supabase sessions`.
  - Repo fix: denied or revoked beta access in both `/auth/callback` and `src/proxy.ts` now calls Supabase `signOut()` before redirecting to `/beta/access-required`; proxy redirects preserve cookie-clearing response cookies.
  - Verification: focused auth suites passed 3 files / 27 tests, then passed again inside the 8-file focused suite.
- Findings: `Committed Lighthouse reports leak Supabase session cookies`, `Committed public share token and user project data`, and `Confidential client proposal committed to repository`.
  - Repo fix: raw authenticated Lighthouse `.report.html` / `.report.json` artifacts were deleted, old auth/share seed evidence was redacted or removed, and the client-identifying Grand Hyatt proposal extraction was replaced with a redacted README.
  - Verification: targeted repository scan no longer finds the raw Supabase auth cookie value patterns, raw access/refresh tokens, or the removed Grand Hyatt client-identifying terms in the cleaned archive paths.
- Finding: `Hosted auth smoke sends cookies to unvalidated URL`.
  - Repo fix deployed in `e5b17dc` / production `dpl_4pGbs2jq95XDaXJotdc84D2QMy4n`: `scripts/verify-hosted-auth-routes.ts` now validates `HOSTED_AUTH_BASE_URL` against `HOSTED_AUTH_ALLOWED_ORIGINS` (or safe production defaults) and refuses to send hosted cookies to unapproved or non-HTTPS origins.
  - Verification: `tests/vitest/hosted-auth-route-smoke-script.test.ts` passed inside the 12-file / 127-test security-focused suite.
- Finding: `Beta feedback RLS allows forged cross-tenant context`.
  - Local repo fix: new forward migration `20260603191535_harden_beta_feedback_context.sql` replaces the insert policy so authenticated direct inserts must match `auth.uid()`, the JWT email, actor workspace membership, actor project access, and project/workspace consistency.
  - Linked Supabase proof: exact-file `db query --linked` apply succeeded, `migration repair --status applied 20260603191535` succeeded, and targeted readback verified exactly 1 hardened feedback insert policy with actor/email/workspace/project checks.
  - Verification: `tests/vitest/beta-feedback.test.ts` passed inside the 12-file / 127-test security-focused suite.
- Finding: `Unauthenticated digest server action emails owners`.
  - Repo fix deployed in `e5b17dc` / production `dpl_4pGbs2jq95XDaXJotdc84D2QMy4n`: `maybeTriggerSharedLinkActivityDigest` now returns `digest-auth-required` before sending when invoked without an authenticated current-user context.
  - Verification: `tests/vitest/project-publication-activity.test.tsx` passed inside the 12-file / 127-test security-focused suite.
- Finding: `Mass deletion audit records are caller-tamperable`.
  - Repo fix deployed in `e5b17dc` / production `dpl_4pGbs2jq95XDaXJotdc84D2QMy4n`: new forward migration `20260603191903_harden_mass_deletion_actor_derivation.sql` drops the caller-supplied execute signatures and recreates mass deletion execute RPCs with `actor_id := auth.uid()`; app RPC calls and generated Supabase types no longer pass `acting_user_id` for project/sheet/component bulk delete/archive.
  - Linked Supabase proof: exact-file `db query --linked` apply succeeded, `migration repair --status applied 20260603191903` succeeded, and targeted readback verified 3 actor-derived execute RPCs, 0 legacy `acting_user_id` execute args, and applied version `20260603191903`.
  - Verification: `tests/vitest/mass-deletion-contract.test.ts`, `tests/vitest/mass-deletion-action-contract.test.ts`, and `tests/vitest/mass-deletion-ui-contract.test.ts` passed inside focused verification.
- Finding: `Role demotion migration is blocked by its own trigger`.
  - Repo fix committed in `e5b17dc`: `20260602090000_harden_beta_allowlist_admin.sql` now disables `profiles_prevent_role_self_update` only around its controlled demotion repair and re-enables it immediately afterward. This already-applied historical migration was not re-run on linked Supabase during the follow-up pass.
  - Verification: `tests/vitest/security-findings-contracts.test.ts` passed after adding the trigger-order contract.
- Dashboard status: all entries in this section still require Codex cloud rescan/closure before they can be treated as closed.

## Immediate Triage Order

1. Fix or disable unscoped Speed Insights on sensitive routes before beta traffic.
2. Triage findings involving committed secrets/tokens/session cookies/artifacts.
3. Triage public share/invite/auth/RLS findings before inviting any external tester beyond the owner account.
4. Separate informational workflow/config findings from runtime security blockers after the medium findings are handled.

## Proof Boundary

- This is a dashboard snapshot, not independent code-level validation of every finding.
- No signed validation-artifact URLs or credential values are copied into this repo note.
- Source of truth for current status remains the live Codex Security dashboard plus repo-local fix evidence.
