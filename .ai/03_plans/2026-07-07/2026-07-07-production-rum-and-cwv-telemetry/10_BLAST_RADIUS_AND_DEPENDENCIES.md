# 10 — Blast Radius And Dependencies — Production RUM And CWV Telemetry

## Direct impact

| Area | Impact class | Note |
|---|---|---|
| `src/app/providers.tsx` | Required change | Mount `RumReporter` (one import + one render) |
| `package.json` / lockfile | Required change | Add `web-vitals@^5` |
| `wrangler.jsonc` | Required change | Add `analytics_engine` binding `RUM` |
| `worker.ts` | Probable change | Branch in `scheduled()` for the rollup cron (or add a cron entry) |
| `next.config.ts` | Probable change | Explicit `connect-src 'self'` for `/api/internal/rum` in both Report-Only policies |
| `src/app/privacy/…` | Probable change | Privacy-notice content update |
| New files (`src/components/observability/RumReporter.tsx`, `src/lib/observability/rum-client.ts`, `src/lib/observability/rum-route-bucket.ts`, `src/lib/observability/rum-server.ts`, `src/app/api/internal/rum/route.ts`) | New | The core of the implementation |
| New migration `migrations/0039_rum_rollup.sql` | New | D1 rollup table |
| Tests (`tests/vitest/`, `e2e/`) | New | Unit/DOM/E2E |
| `cloudflare-env.d.ts` | Generated change | `cf:typegen` after binding add |

## Transitive / verification-only

| Area | Impact class | Note |
|---|---|---|
| `WebVitalsProbe.tsx` | Explicitly unaffected | Left as dev-only probe |
| `src/lib/perf/server-timing.ts` | Explicitly unaffected | No Server-Timing work |
| `e2e/route-transition-performance.spec.ts` | Verification only | Must stay green (bfcache, budgets) |
| `scripts/check-performance-budgets.mjs` | Verification only | Must still pass; bundle check |
| `/api/internal/client-error` | Explicitly unaffected | Separate concern; model only |
| `src/lib/observability/client-error-report.ts` | Verification only | Pattern reference |
| Existing repositories / auth / session | Explicitly unaffected | No RUM coupling to auth |
| Synthetic perf scripts (`perf:*`) | Explicitly unaffected | Independent (PROMPT.md) |
| Existing D1 tables | Explicitly unaffected | Only `rum_rollup` added |

## Cross-pack dependencies

| Sibling pack | Relationship | Coordination note |
|---|---|---|
| `2026-07-07-global-nonced-csp-enforcement` | Coordinate | CSP `connect-src` additions for `/api/internal/rum`; nonce work is theirs |
| `2026-07-07-cloudflare-worker-production-observability-and-budgets` | Boundary | Server/edge observability only; no RUM/CWV overlap |
| `2026-07-07-observability-alert-proof-and-log-retention` | Boundary | Server alerting/log retention; no overlap. Note: it treats Cloudflare Web Analytics readiness-script gate as operator-flag theater to convert to artifact proof — the RUM landing enablement (Phase 1) should produce the artifact that gate wants |
| `2026-07-07-launch-readiness-evidence-gate` | Integrate | REL-CWV-01: ALERT-01 CWV gate feeds launch readiness |
| `2026-07-07-public-share-activity-minimization` | Boundary | Public share routes are covered by the landing managed beacon + first-party sink; route-bucket normalizer treats `/share/:id` → `/share/:id` |

## Backward compatibility

- All changes are additive. No existing route, contract, or data shape changes.
- The new endpoint is opt-in (only fires when `NEXT_PUBLIC_RUM_SAMPLE_RATE > 0`).
- Workshop RUM enablement is gated behind `OPEN-CONSENT-01`.

## Effect on other active work

- Concurrent agents editing `providers.tsx`, `next.config.ts`, `wrangler.jsonc`,
  or `worker.ts` are the collision risk. Mitigation: file-scope ownership, fresh
  `git status`, re-read immediately before edit (AGENTS.md shared-workspace rules).

## Documentation impact

- `src/app/privacy/…` update (PRIV-08).
- New runbook (DOC-01).
- Optional: a short note in any developer docs about `NEXT_PUBLIC_RUM_SAMPLE_RATE`.
