# Cloudflare Hosted Estimate Note Refresh Proof

Generated: 2026-07-02T00:51:54Z

## Result

PASS. A signed-in production browser session edited the hosted estimate-list
Notes field on `https://archestimator.com`, and a read-only remote D1 query
returned the same persisted value.

## Browser Proof

- Page:
  `/workshop/projects/bd9a8e68-4e24-49d8-aeed-e4651b7cab0b/estimates`
- Project: `Codex Cloudflare Smoke 2026-07-01`
- Estimate: `ES-001 Estimate`
- Estimate ID: `985f6690-741e-4136-9fa1-a4896cd364e4`
- Edited field: `estimates.notes`
- Previous value: `Cloudflare QA 2026-07-02`
- New value: `Cloudflare hosted QA 2026-07-02 00:51Z`
- Updated cell after save: `7/2/26, 8:50 AM`

## D1 Readback

Read-only command:

```bash
bunx wrangler d1 execute archestimator-proof-db --remote --command "SELECT id, project_id, name, sheet_code, notes, updated_at FROM estimates WHERE id = '985f6690-741e-4136-9fa1-a4896cd364e4' LIMIT 1;"
```

Returned row:

| Field | Value |
| --- | --- |
| `id` | `985f6690-741e-4136-9fa1-a4896cd364e4` |
| `project_id` | `bd9a8e68-4e24-49d8-aeed-e4651b7cab0b` |
| `name` | `ES-001 Estimate` |
| `sheet_code` | `ES-001` |
| `notes` | `Cloudflare hosted QA 2026-07-02 00:51Z` |
| `updated_at` | `2026-07-02T00:50:13.126Z` |

D1 meta: served by `v3-prod` in `APAC` / `SIN`, primary served the read,
`rows_read=1`, `rows_written=0`, `changed_db=false`, and one total attempt.

## Remaining Gaps

This refresh closes a fresh hosted authenticated estimate-list scalar write and
remote D1 persistence proof. The broader estimate workflow still needs hosted
tab lifecycle, rollback, idempotency/retry replay, and denial proof.
