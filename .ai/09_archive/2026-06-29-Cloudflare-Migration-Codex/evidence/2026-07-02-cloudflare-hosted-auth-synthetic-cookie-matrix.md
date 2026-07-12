# Cloudflare Hosted Auth Synthetic Cookie Matrix

Status: **PASSED**

Generated: `2026-07-03T10:32:07.954Z`

Base URL: `https://archestimator.com`

D1 database: `archestimator-proof-db`

Workspace fixture: `258b50ee-3fde-4f6a-a9d9-c360ec44cd0b`

| Case | Result | Latest status | Latest redirect path | Cache-Control | Avg duration | Error |
| --- | --- | --- | --- | --- | --- | --- |
| signedOut | pass | 307 | /login?next=%2Fworkshop | private, no-cache, no-store, max-age=0, must-revalidate | 951ms |  |
| allowed | pass | 200 | n/a | private, no-cache, no-store, max-age=0, must-revalidate | 2111ms |  |
| denied | pass | 307 | /access-required | private, no-cache, no-store, max-age=0, must-revalidate | 1346ms |  |
| revoked | pass | 307 | /access-required?status=revoked | private, no-cache, no-store, max-age=0, must-revalidate | 208ms |  |
| expired | pass | 307 | /login?next=%2Fworkshop | private, no-cache, no-store, max-age=0, must-revalidate | 155ms |  |
| malformed | pass | 307 | /login?next=%2Fworkshop | private, no-cache, no-store, max-age=0, must-revalidate | 56ms |  |

| Fixture | Email | User id | Closed beta status | Session expiry |
| --- | --- | --- | --- | --- |
| allowed | codex-authz-allowed-20260703103207954@example.invalid | c49290e9-4b87-4132-9be5-2b9abf734dd6 | active | 2026-07-03T11:32:07.954Z |
| denied | codex-authz-denied-20260703103207954@example.invalid | 29574097-ae8f-4235-a3b3-db2cfa6834fe | missing | 2026-07-03T11:32:07.954Z |
| revoked | codex-authz-revoked-20260703103207954@example.invalid | 93f096c2-05b3-4256-9c4c-2cfca0c413c5 | revoked | 2026-07-03T11:32:07.954Z |
| expired | codex-authz-expired-20260703103207954@example.invalid | 15ad668c-62c5-4a28-9b00-4eec1d4b3eed | active | 2026-07-03T09:32:07.954Z |

Cleanup counts after proof:

| Users | Sessions | Profiles | Memberships | Closed-beta rows | Terms rows | Synthetic workspaces |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Notes:
- Session cookies and signed token values were generated in memory only and are not written to this report.
- The hosted verifier exercises `/workshop` on the production Worker with anonymous, allowed, missing-allowlist, revoked, expired, and malformed Better Auth session states.
- A pass requires the expected route behavior plus private/no-store cache control and zero synthetic D1 residue after cleanup.
