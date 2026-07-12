# Cloudflare Authz And Protected Cache Hardening

Captured: 2026-07-02 00:39 UTC

## Scope

Closed the local P0 authz/security findings that were blocking the Cloudflare-only migration ledger:

- `profiles.default_workspace_id` is validated against creator/admin/workspace membership before use.
- Central project lookup returns `project: null` unless `canAccessProjectInD1()` passes.
- Project estimate lists and lightweight sheet pickers filter through `canAccessEstimateInD1()`.
- Sheet-only collaboration summaries no longer expose project-wide collaborator rosters or project-scope pending invitations.
- Protected project images, component-library images, and component-library attachments now use `private, no-cache, no-store, max-age=0, must-revalidate` even on successful responses.
- Hosted auth verifier now expects the live `/access-required` route instead of stale `/beta/access-required`.

## Verification

Passed:

```bash
bunx vitest run tests/vitest/workspace-repository-authz-contract.test.ts tests/vitest/workspace-collaboration-summary-authz.test.ts tests/vitest/list-project-estimates-columns.test.ts tests/vitest/project-publication-summary.test.ts --maxWorkers=1
```

Result: `4` files, `12` tests passed.

Passed:

```bash
bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/workspace-repository-authz-contract.test.ts tests/vitest/workspace-collaboration-summary-authz.test.ts tests/vitest/list-project-estimates-columns.test.ts tests/vitest/project-publication-summary.test.ts --maxWorkers=1
```

Result: `5` files, `77` tests passed.

Passed:

```bash
bunx vitest run tests/vitest/hosted-auth-route-smoke-script.test.ts tests/vitest/auth-session-closed-beta.test.ts tests/vitest/auth-proxy.test.ts --maxWorkers=1
```

Result: `3` files, `47` tests passed.

Hosted signed-out smoke:

```bash
bun -e 'import { verifyHostedAuthRoutes } from "./scripts/verify-hosted-auth-routes.ts"; const r = await verifyHostedAuthRoutes({ baseUrl: "https://archestimator.com", allowedOrigins: ["https://archestimator.com"], cases: [{ name: "signedOut", required: true }], runs: 1 }); console.log(JSON.stringify({ passed: r.passed, cases: r.cases.map(c => ({ name: c.name, status: c.status, location: c.location, normalizedLocationPath: c.normalizedLocationPath, cacheControl: c.cacheControl, passed: c.passed })) }, null, 2)); if (!r.passed) process.exit(1);'
```

Result:

```json
{
  "passed": true,
  "cases": [
    {
      "name": "signedOut",
      "status": 307,
      "location": "/login?next=%2Fworkshop",
      "normalizedLocationPath": "/login?next=%2Fworkshop",
      "cacheControl": "private, no-cache, no-store, max-age=0, must-revalidate",
      "passed": true
    }
  ]
}
```

Passed:

```bash
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
git diff --check
```

## Remaining Gap

The hosted auth verifier still needs sanitized allowed/denied/revoked/expired session-cookie fixtures to prove the full hosted matrix against `archestimator.com`. The signed-out hosted case is proven.
