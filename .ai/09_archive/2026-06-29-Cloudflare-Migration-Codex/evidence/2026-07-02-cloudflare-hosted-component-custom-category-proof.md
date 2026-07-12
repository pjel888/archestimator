# Cloudflare Hosted Component Custom Category Proof

Generated: 2026-07-02T01:11:20Z

## Result

PASS. A signed-in production browser on `archestimator.com` created a component
with a free-typed custom category and blank supplier/brand fields, and remote
D1 readback confirms the item, price option, current cost entry, and version
row.

## Browser Proof

| Field | Value |
| --- | --- |
| Component ID | `f7007706-def3-4f7a-bd7c-020b2eb8bbbe` |
| Name | `Cloudflare QA Custom Blank Category 2026-07-02 00:56Z` |
| Description | `Hosted blank category normalization proof` |
| Category | `Cloudflare Custom Category 2026-07-02` |
| Supplier / brand | blank |
| Unit / cost | `unit` / `91.25` |
| UI result | `Component saved.`; inspector shows `Available`, `v1 current`, and `0 template rows · 0 estimate rows`. |

## Remote D1 Readback

| Row | Evidence |
| --- | --- |
| `cost_library_items` | Item exists with category `Cloudflare Custom Category 2026-07-02`, `category_node_id = NULL`, `supplier_id = NULL`, `brand_id = NULL`, `unit_cost = 91.25`, and lifecycle `available`. |
| `cost_library_item_price_options` + `cost_library_item_variant_cost_entries` | Default active price option `6dca209c-d33c-4a1b-8eb4-697df7d127a4` and current cost entry `b07d4b62-ca80-459d-a86f-914503d55e3d` both persist `91.25 PHP` for `2026-07-02`. |
| `cost_library_item_versions` | Version `1` exists with change summary `Component created`. |
| Uniqueness check | Exactly `1` row matches the name, custom category, and null supplier/brand/category-node predicate. |

All readbacks were executed against remote D1 `archestimator-proof-db`
(`9bdb29bb-687e-4f51-ae81-7659c426ea5f`) and were served by `v3-prod` in
`APAC` / `SIN` primary with `changed_db=false`.

## Remaining Library Gaps

This closes the hosted custom/free-typed category create proof. Remaining P0
library evidence: hosted folder mutation, hosted template insertion, and hosted
viewer-denial proof.
