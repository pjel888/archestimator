# 10 — Blast Radius and Dependencies

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

## Direct and transitive impact

The audit's recommendations — when remediated by a future implementation agent — will touch the following surfaces. Each entry is `required change`, `probable change`, `possible change`, `verification only`, or `explicitly unaffected`.

### Future remediation — `required change`

| Surface | Why required | Risk | Files |
|---|---|---|---|
| D1 access layer centralization (REQ-ARCH-001) | All Server Actions that touch D1 must funnel through one repository module with per-table `workspace_id`/`owner_id` scoping | High — touches every Server Action file | All `src/lib/**/actions.ts` (30 files); new `src/lib/cloudflare/d1-access/` module |
| Per-Action verdict completion (REQ-SEC-002) | TBD → PASS/WARN/FAIL per Server Action | High | All action files |
| Error envelope `{ok, data, error}` (REQ-API-002, REQ-API-003) | Stable client contract | High — every Route Handler + Server Action | All route handlers + action files |
| Idempotency keys (REQ-API-004) | Duplicate-submit safety | Medium | Mutation handlers |
| Internal route secret gating (REQ-API-007) | Reject anonymous PIR | Low | `src/app/api/internal/*/route.ts` (4 files) |
| Credential-material type module (REQ-SEC-003) | Distinct types | Medium | New `src/lib/auth/credentials/*` + `src/lib/publication/actions.ts` + `src/lib/collaboration/actions.ts` |
| DLQ alert (REQ-REL-002) | Hidden queue failures | Low | Workers Observability / cron check |
| Workers Observability sampling decision (OPEN-002) | P0 visibility | Medium | `wrangler.jsonc:observability.head_sampling_rate` |
| DMARC `p=reject` (OPEN-006) | Public email integrity | Low | Cloudflare DNS zone |

### `probable change`

| Surface | Why | Files |
|---|---|---|
| DO WS ticket mint surface (REQ-SEC-010) | Verify + audit mint path | `src/lib/cloudflare/collaboration-room{,-router}.ts`, `worker.ts` |
| Better Auth ratelimiter D1 storage (REQ-SEC-008) | Verify + scope adapter config | `src/lib/auth/better-auth-cloudflare.ts`, `src/lib/auth/cloudflare-better-auth-runtime.ts` |
| Better Auth `BETTER_AUTH_TRUSTED_ORIGINS` exact-match parsing (REQ-SEC-007) | Verify parsing; modify if wildcard detected | `src/lib/auth/better-auth-cloudflare.ts` |
| Share session cookie scoping (REQ-A11Y-001) | Scope cookie to share-token session | `src/lib/publication/**` |
| AI outbound SSRF guard (REQ-SEC-009) | Allowlist + private-IP block | `src/lib/ai/**` |
| Google Maps outbound SSRF guard (REQ-SEC-009) | Allowlist + private-IP block | `src/lib/projects/location-actions.ts` |
| Cron `controller.cron` dispatch verification (SRC-013) | Verify both crons dispatch correctly | `src/lib/cloudflare/scheduled-upload-jobs.ts` |
| Queue consumer dedup key (SRC-014) | Verify; implement if missing | `src/lib/cloudflare/upload-job-queue.ts` |

### `possible change`

| Surface | Why | Files |
|---|---|---|
| WAF / rate-limit rules (`OPEN-003`) | When WAF activated, every public endpoint needs a rule | `wrangler.jsonc` (WAF config) — sibling plan pack `.ai/03_plans/2026-06-29-Rate-Limiting/` owns |
| README root stack drift (REQ-DOC-001) | Update Supabase/Resend → Cloudflare-only | `README.md` (repo root) |
| Server Action manifest (REQ-ARCH-002) | Auto-generation or manual ledger | New `scripts/generate-server-action-manifest.ts` |
| Public static page cache invalidation (PERF-001) | Confirm static-cache eligibility per route | `worker.ts` `routeStaticPublicPageThroughCache` |
| TanStack Query staleTime tuning (PERF-002) | Verify 30s default per surface | `src/hooks/use-estimate-query.ts`, related hooks |
| Pre-existing RED tests triage (SRC-018) | Mark owners; non-blocking | `tests/vitest/` (~36 files) |

### `verification only`

| Surface | Why | Files |
|---|---|---|
| D1 performance budgets (green per FAST PATH) | No change needed; keep monitor | existing scripts |
| DO WebSocket hibernation (existing) | Verify | DO class file |
| Image binding | Verify scope | `src/lib/uploads/**` |

### `explicitly unaffected`

| Surface | Why |
|---|---|
| Storybook configuration | Review surface only; not on runtime path |
| Design-system linter | Cosmetic-only; not on runtime path |
| Vitest config + Bun config files | Test framework config, no API surface |
| Provider state | No `wrangler deploy`, no migrations run from this audit |

## Cross-cutting dependencies

When the future remediation plan runs:

- **Server Action change** → must update D1 access layer → must update D1 access-path matrix in `07_*.md` re-verification → must re-run `cf:d1-authz-matrix` → confirm `ARCH_DB` schema still matches generated types via `cf:typegen`.
- **Credential-material module change** → must update `08_*.md` taxonomy → verify all share/invite/WS/AI surfaces use the new module.
- **Workers Observability sampling change** → re-verify P0 forensic visibility (OPEN-002) → update `09_*.md` and `13_*.md` alert posture.
- **DMARC `p=reject` change** (OPEN-006) → coordinate with email deliverability (bounce handling) → update `08_*.md` DMARC posture row + `13_*.md` rollback.
- **Internal route secret-gate change** (REQ-API-007) → must verify both `CRON_SECRET` and `UPLOAD_*_JOB_SECRET` rotate after exposure; update `00_AGENT_COORDINATION.md` secret rotation log.

## Compatibility

| Backward-compat risk | Why | Mitigation |
|---|---|---|
| Error envelope change | Old clients may not parse new envelope | Phase: server returns both `message` and `code`; clients read `code`; old clients read `message` |
| Credential-material module rename | Imports across modules could break | Codemod + typecheck; preserve original SHA-256 hash columns |
| D1 access layer centralization | Server Actions might call D1 directly; centralization means migration of every call site | Codemod: replace direct D1 calls with repository-function calls, gate by type-check |
| Internal route secret rotation | Same secret now used in two places (Worker + route) | Single source: `cloudflare-env.d.ts`; rotation procedure documented in `13_*.md` |
| Better Auth `BETTER_AUTH_TRUSTED_ORIGINS` parsing change | If currently wildcard, removing wildcard may break legitimate origins | Test addOrigin / removeOrigin separately; document exact-match expectation in deployment runbook |

## Affected documentation

| Doc | Why | When |
|---|---|---|
| `README.md` (repo root) | Stale stack description (REQ-DOC-001) | during remediation phase 1 |
| `.ai/10_state/current-state.md` | Add OPEN entry for each new stable ID | at audit pack completion |
| `.ai/10_state/decisions.md` | Add DEC-* decisions | during remediation phase 1 |
| `.ai/02_audits/` | None added by this audit | n/a |
| `.ai/03_plans/2026-07-21-API-Audit/LOOP_LEDGER.md` | Loop iterations of this audit pack | at each iteration of audit |
| `.ai/03_plans/2026-06-29-Rate-Limiting/` (sibling) | Shared ID space; verify no duplicate IDs | at audit completion |
| `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/` (sibling) | Shared evidence artifacts | at audit completion |
| `/privacy`, `/terms`, `/help` (user docs) | Share-link cookie curriculum, AI feature disclosure, real-time cursor disclosure | during remediation phase 2 |
| `DESIGN.md` (alpha) | API error-state design tokens | during remediation phase 3 |

## Affected testing surfaces (preview)

(Full Test Execution Matrix in `12_*.md`.)