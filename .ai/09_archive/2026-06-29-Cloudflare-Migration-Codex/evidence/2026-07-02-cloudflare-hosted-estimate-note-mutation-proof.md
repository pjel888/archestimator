# Cloudflare Hosted Estimate Note Mutation Proof

Generated: 2026-07-01T19:33:11Z

## Result

PASS. A signed-in production browser session edited an estimate-list Notes field
on `https://archestimator.com`, the value survived a full page reload, and a
read-only remote D1 query returned the same persisted value.

## Browser Proof

- Page:
  `/workshop/projects/bd9a8e68-4e24-49d8-aeed-e4651b7cab0b/estimates`
- Project: `Codex Cloudflare Smoke 2026-07-01`
- Estimate: `ES-001 Estimate`
- Estimate ID: `985f6690-741e-4136-9fa1-a4896cd364e4`
- Edited field: `estimates.notes`
- Persisted value: `Cloudflare QA 2026-07-02`
- After reload: the Notes field still rendered `Cloudflare QA 2026-07-02`
- Updated cell after save/reload: `7/2/26, 3:30 AM`

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
| `notes` | `Cloudflare QA 2026-07-02` |
| `updated_at` | `2026-07-01T19:30:24.267Z` |

D1 meta: served by `v3-prod` in `APAC` / `SIN`, primary served the read,
`rows_read=1`, `rows_written=0`, and `changed_db=false`.

## Remaining Gaps

- This closes a hosted authenticated estimate-list scalar mutation proof.
- Full estimate tab, row item, history event, rollback, idempotency, and
  cross-workspace denial journeys still need hosted Worker+D1 proof.
- Provider-backed export/import restore proof for estimate-history tables is
  still required.
