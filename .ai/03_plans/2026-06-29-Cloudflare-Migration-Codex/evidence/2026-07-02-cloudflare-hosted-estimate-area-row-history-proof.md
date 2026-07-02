# Hosted Estimate Area, Row, And History Proof

Generated: 2026-07-01T20:29:30Z

Status: **PASS for hosted authenticated area, row item, reload persistence, and history readback**.

Base URL: `https://archestimator.com`

Project: `bd9a8e68-4e24-49d8-aeed-e4651b7cab0b`

Estimate: `985f6690-741e-4136-9fa1-a4896cd364e4`

## Browser Proof

The Codex in-app browser was authenticated as Philip Lewis (`philipjonlewis@gmail.com`) on `archestimator.com`.

The hosted estimate UI:

- created an estimate area;
- renamed it to `Cloudflare QA Area 2026-07-02 04:24`;
- inserted one row item;
- edited material, supplier, unit cost, description, unit, quantity, contingency, and adjustment fields;
- reloaded the page and still showed the QA area, row inputs, supplier, description, unit cost, quantity/percentage values, and calculated total;
- opened Activity History, which showed the QA component audit trail for material, supplier, unit cost, description, unit, quantity/contingency, adjustment, row insertion, area rename, and area creation.

## D1 Readback

Read-only remote Cloudflare D1 query returned:

| Table | Key evidence |
| --- | --- |
| `estimate_nodes` | Area node `e4b71a81-47fc-4f5a-bead-35e4e8050eae`, estimate `985f6690-741e-4136-9fa1-a4896cd364e4`, tab `5bf33713-4fec-4d82-b408-bbf11cb2cb91`, name `Cloudflare QA Area 2026-07-02 04:24`, kind `area`. |
| `estimate_row_items` | Row `878e98e0-6a5a-4e58-ac42-4b73284eae4d`, material `Cloudflare QA Component 2026-07-02`, supplier `Codex QA Supplier`, description `Hosted D1 browser row mutation proof`, unit `sqm`, quantity `3.15`, unit cost `123.45`, contingency `5`, adjustment `2`, row revision `9`. |
| `estimate_sheet_events` | Recent events include `estimate_node_created`, `estimate_node_renamed`, `row_inserted`, and `row_updated` entries for material, supplier, unit cost, description, unit, quantity/contingency, and adjustment. |

The readback was served by Cloudflare D1 (`v3-prod`, APAC/SIN) with `changed_db=false` and `rows_written=0`.

## Still Open

This artifact narrows the estimate gap, but it does not prove tab lifecycle, rollback, idempotency/retry replay, cross-workspace/viewer denial, real upload scanning, publication recipient response, or two-client realtime UI.
