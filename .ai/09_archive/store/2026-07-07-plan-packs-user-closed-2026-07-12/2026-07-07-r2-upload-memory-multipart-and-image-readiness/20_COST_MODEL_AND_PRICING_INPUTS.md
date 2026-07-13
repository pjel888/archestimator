# 20 — Cost Model and Pricing Inputs

Pricing is **input-sheet** only (per directive: do not claim savings from pricing pages alone).
Free-tier allowances are the operative budget. All figures from official Cloudflare docs fetched
2026-07-08 (see `19`).

## Free-tier allowances (operative budget)

| Resource | Free allowance / month | Source |
|---|---|---|
| Workers requests | 100,000/day | Workers pricing |
| Workers CPU | 10 ms / request | Workers limits |
| Workers bundle | 3 MiB (gzipped) | Workers limits |
| R2 storage | 10 GB-month | R2 pricing |
| R2 Class A ops (writes/lists/multipart initiates) | 1,000,000 | R2 pricing |
| R2 Class B ops (reads/head) | 10,000,000 | R2 pricing |
| R2 egress | free (zero) | R2 pricing |
| Images transformations | 5,000 unique | Images pricing (community-corroborated) |
| D1 | always-free (proto/experiment) | D1 pricing |
| Analytics Engine | 100,000 writes/day, 10,000 queries/day (currently unbilled) | Analytics Engine pricing |
| Smart Placement | available on all plans (free) | Placement docs |

## Upload operation cost model (per upload)

| Operation | Class | Count per upload (single-part) | Count per upload (multipart, n parts) |
|---|---|---|---|
| R2 `put` (single) | Class A | 1 | 0 |
| R2 `createMultipartUpload` | Class A | 0 | 1 |
| R2 `uploadPart` × n | Class A | 0 | n |
| R2 `complete` | Class A | 0 | 1 |
| R2 `get` (download) | Class B | 1 per read | 1 per read |
| R2 `head` | Class B | 0–1 | 0–1 |
| R2 `delete` | Class A | 1 on delete | 1 on delete |
| R2 `list` (reconcile) | Class B | 1 per page (capped) | 1 per page |
| D1 writes (finalize) | (D1 free) | ~3 rows | ~3 + n part rows |
| Images transform (DEC-07) | transform quota | 1–2 (optimized + thumb) | n/a |

## First-user volume projection (illustrative — owner to confirm real projection)

Assume first 100 users × 5 uploads/month = 500 uploads/month.

| Metric | Single-part | Multipart (avg 2 parts) |
|---|---|---|
| Class A ops | ~500 puts + ~500 deletes = 1,000 | ~500×(1+2+1) + deletes = ~3,000 |
| Class B ops | ~500 reads + reconcile pages | similar |
| Storage | ~500 × avg size | same |
| Images transforms (DEC-07) | ~1,000 (2/upload) | n/a |

All well within free tier (1M Class A / 10M Class B / 5,000 Images transforms). **Images transforms
(5,000) is the binding constraint** at ~2,500 image uploads/month — monitor (AC-FR-08c).

## Operation-count budget gate (DEC-03 multipart)

Before enabling multipart, confirm projected monthly Class A ops (puts + parts + completes + deletes)
remain < ~70% of the 1M free quota, leaving headroom for non-upload R2 use. If projection exceeds,
either (a) defer multipart, (b) raise the multipart threshold so fewer uploads use it, or (c) owner
approves R2 paid ($4.50/million Class A). Recorded as a DEC-03 gate.

## Paid add-ons explicitly NOT recommended (free-tier constraint)

- Workers Paid ($5/mo) — not needed (10 ms CPU is fine for streaming/IO-bound uploads).
- R2 paid — not needed at first-user volume.
- D1 paid — not needed.
- Images paid — only if DEC-07 quota binds (owner decision).
- Smart Placement paid — n/a (free on all plans).
- Dedicated egress — n/a (R2 egress free).
- Cloudflare CDR — future paid (recorded, not now).

## Usage-based cost inputs still needed (owner)

- Real first-user upload volume projection (replaces illustrative 500/month).
- Average upload size (for storage projection).
- Image-vs-attachment ratio (for Images transform projection).
- Expected concurrent upload peak (for admission/concurrency sizing).

These are inputs the owner should provide before DEC-03/DEC-07 enablement to validate the budget.
The plan does not claim savings; it confirms the free-tier posture and names the binding constraints.
