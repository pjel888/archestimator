# Cloudflare Hosted Auth Synthetic Cookie Matrix

Status: **PASSED**

Generated: `2026-07-02T06:22:55.331Z`

Base URL: `https://archestimator.com`

D1 database: `archestimator-proof-db`

Workspace fixture: `258b50ee-3fde-4f6a-a9d9-c360ec44cd0b`

| Case | Result | Latest status | Latest redirect path | Cache-Control | Avg duration | Error |
| --- | --- | --- | --- | --- | --- | --- |
| signedOut | pass | 307 | /login?next=%2Fworkshop | private, no-cache, no-store, max-age=0, must-revalidate | 920ms |  |
| allowed | pass | 200 | n/a | private, no-cache, no-store, max-age=0, must-revalidate | 1545ms |  |
| denied | pass | 307 | /access-required | private, no-cache, no-store, max-age=0, must-revalidate | 4181ms |  |
| revoked | pass | 307 | /access-required?status=revoked | private, no-cache, no-store, max-age=0, must-revalidate | 2001ms |  |
| expired | pass | 307 | /login?next=%2Fworkshop | private, no-cache, no-store, max-age=0, must-revalidate | 329ms |  |

| Fixture | Email | User id | Closed beta status | Session expiry |
| --- | --- | --- | --- | --- |
| allowed | codex-authz-allowed-20260702062255331@example.invalid | 7c3b7c19-ea5a-4473-b51e-62e3e08f42fc | active | 2026-07-02T07:22:55.331Z |
| denied | codex-authz-denied-20260702062255331@example.invalid | 5476a0f3-2141-4212-b0d8-69b9f8542b15 | missing | 2026-07-02T07:22:55.331Z |
| revoked | codex-authz-revoked-20260702062255331@example.invalid | 7f8c76af-85da-4c30-98b3-b0c48e52ec85 | revoked | 2026-07-02T07:22:55.331Z |
| expired | codex-authz-expired-20260702062255331@example.invalid | 2f5e4c78-307c-42f0-84b8-9a6f8b20a4ff | active | 2026-07-02T05:22:55.331Z |

Cleanup counts after proof:

| Users | Sessions | Profiles | Memberships | Closed-beta rows | Terms rows | Synthetic workspaces |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Notes:
- Session cookies and signed token values were generated in memory only and are not written to this report.
- The hosted verifier exercises `/workshop` on the production Worker with anonymous, allowed, missing-allowlist, revoked, and expired Better Auth session states.
- A pass requires the expected route behavior plus private/no-store cache control and zero synthetic D1 residue after cleanup.
