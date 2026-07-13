# 21 — Provider Parity Matrix

Archestimator's active runtime is Cloudflare (Workers/OpenNext + D1 + R2 + DO + Queues + Email +
Images). Supabase/Vercel/Resend are **historical** (migration archaeology / provider-exit evidence
only). This matrix records provider-state + parity for the upload surfaces this plan touches.

## Provider-state matrix (upload surfaces)

| Surface | Active (Cloudflare) | Transitional | Legacy (Supabase/Vercel/Resend) | Decommission-target |
|---|---|---|---|---|
| Object storage | R2 `ARCH_UPLOADS_R2` | — | Supabase Storage (historical) | Supabase Storage |
| App/auth DB | D1 `ARCH_DB` | — | Supabase Postgres (historical) | Supabase Postgres |
| Image processing | `IMAGES` binding (proof) / sharp (runtime) | DEC-07 flips to binding | n/a | sharp-stub (proof-build 501) |
| Malware scan | policy scanner (floor) / ClamAV (upgrade) | OPEN-02 | n/a | n/a |
| Background jobs | Queues `UPLOAD_JOBS_QUEUE` + cron | — | n/a | n/a |
| Email | Cloudflare Email `EMAIL` | — | Resend (historical) | Resend |
| Hosting | Workers/OpenNext | — | Vercel (historical) | Vercel |

No active runtime path depends on Supabase/Vercel/Resend for uploads. Legacy `supabase/migrations/`
are migration archaeology only — never run/extend as active remediation.

## R2 vs Supabase Storage parity (upload lifecycle)

| Capability | R2 (active) | Supabase Storage (legacy) | Parity note |
|---|---|---|---|
| Single PUT max | 5 GiB | 50 MiB (tier-dependent) | R2 exceeds |
| Multipart max | 5 TiB (10,000 × ≤5 GiB) | supported | R2 exceeds |
| Streaming put | `put(key, ReadableStream)` | S3 SDK put | both support; R2 native binding |
| customMetadata | supported (this plan adds) | supported | parity after FR-04 |
| list | supported (this plan adds) | supported | parity after FR-05 |
| Public URL | private (app-mediated) | public bucket option | Archestimator keeps private (app GET routes) — intentional |
| Presign | app-owned re-entry (no raw presign) | S3 presign | Archestimator intentional choice (authz/metadata/scan) |
| Lifecycle rules | available (not used; app-driven) | bucket policies | Archestimator uses app-driven cron (FR-05/06) |
| Egress | free | tier-dependent | R2 free egress |

No parity gap blocks this plan. R2 meets or exceeds Supabase Storage on every upload capability.

## Cloudflare Images vs sharp parity (DEC-07)

| Capability | `IMAGES` binding | sharp (Node) | Note |
|---|---|---|---|
| Input formats | common web (JPEG/PNG/WebP/GIF/AVIF — official list not enumerated) | broad | sharp broader |
| Input cap | 20 MB | memory-bound | Images caps |
| Output formats | AVIF/WebP/JPEG (required, no default) | broad | sharp broader |
| Streaming output to R2 | `Response.body` → put(stream) | buffer → put | DEC-07 streams |
| Workers runtime | native binding | stubbed in proof build | Images wins on Workers |
| Bundle size | none | heavy | Images wins |
| Quota | 5,000 transforms/month free | none | sharp wins |
| Quality control | transform options | full pipeline | sharp richer |

Parity is acceptable for first-user webp output (the repo's current output format). DEC-07 is
owner-gated because of the 20 MB input cap and 5,000/month quota.

## Scanner parity

| Option | Type | Free-tier? | Reachability | Status |
|---|---|---|---|---|
| Policy scanner | content-validation floor (EICAR + content-type + macro reject) | yes | in-process | default (DEC-06) |
| ClamAV (clamd) | real AV | yes (if reachable) | network egress from Worker (OPEN-02) | upgrade |
| Cloudflare CDR | advanced threat detection | **paid** | binding | future (not now) |

Parity gap: default is not real AV. Documented honestly (FR-07). ClamAV is the free-tier upgrade
subject to egress reachability (OPEN-02).

## Legacy exit evidence (not blocking this plan)

- Supabase project `ebxxqidacheyapmmzavr`: historical only; never mutate.
- `supabase/migrations/` (182 files): migration archaeology; never run/extend.
- Vercel/Resend: historical hosting/email; Cloudflare is active.

No active-provider proof, cost input, or legacy-provider parity/export evidence required by this
plan is missing. The only owner inputs needed are the cost-model volume projections (`20`) and the
OPEN/DEC decisions (`15`).
