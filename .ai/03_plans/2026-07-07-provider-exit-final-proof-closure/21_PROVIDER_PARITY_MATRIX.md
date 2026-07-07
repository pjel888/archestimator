# 21 — Provider Parity Matrix

## 21.1 Provider-state matrix (per directive §8A)

| Surface | State | Evidence | This plan touches it? |
|---|---|---|---|
| Cloudflare Worker `archestimator-proof` | **active** | `wrangler.jsonc`; deploy-source-smoke artifact (v96, 100% traffic) | read-only smoke only |
| D1 `ARCH_DB` | **active** | `wrangler.jsonc`; 39 migrations; Better Auth `database: options.d1Database` | no (read-only readback in smoke) |
| R2 `ARCH_UPLOADS_R2` | **active** | `wrangler.jsonc`; provider-resource readback | no (read-only readback in smoke) |
| DO `COLLAB_ROOMS` | **active** | `wrangler.jsonc`; SQLite-backed | no |
| Queue `UPLOAD_JOBS_QUEUE` | **active** | `wrangler.jsonc`; DLQ configured | no |
| Email `EMAIL` | **active** | `wrangler.jsonc`; email readiness artifact | no |
| Images `IMAGES` | **active** | `wrangler.jsonc` | no |
| Supabase `ebxxqidacheyapmmzavr` | **legacy** (historical evidence only) | `AGENTS.md`; `supabase/README.md` | **decision only** (OPEN-PE-01); no mutation |
| Vercel | **legacy** (historical hosting) | parent migration runbook | no |
| Resend | **legacy** (historical email) | operator record `resendStatus` (recorded) | no |

No surface is `transitional` or `decommission-target` in a way that requires
*this* plan to act. The Supabase posture (`legacy` → eventually
`decommission-target` or retained) is the subject of OPEN-PE-01.

## 21.2 Active-vs-legacy migration sources

| Migration source | Status | Active D1? | This plan |
|---|---|---|---|
| `migrations/` (39 SQL) | active | yes | no change |
| `supabase/migrations/` (182 SQL) | legacy archaeology | no | no change (DO NOT RUN) |
| `supabase/migration-evidence/` (backfill scripts) | legacy one-shot | already applied | no change |

## 21.3 Legacy-provider-exit parity (this plan's scope)

This **is** the provider-exit closure plan. Parity is already proven at the
source/runtime level:

| Legacy capability | Active Cloudflare replacement | Parity proof | Exit gate |
|---|---|---|---|
| Supabase Postgres (app data) | D1 `ARCH_DB` | 39 active migrations; 0 Supabase refs in `src/`; repositories use D1 | source-scan gate 5 PASS |
| Supabase Auth | Better Auth (D1-backed) | `createCloudflareBetterAuthForD1`, `database: options.d1Database` | hosted-auth-matrix gate 4 PASS |
| Supabase Storage | R2 `ARCH_UPLOADS_R2` | provider-resource readback; upload proof scripts | gate 2 PASS |
| Vercel hosting | Cloudflare Workers/OpenNext | Worker deployed 100% on `archestimator.com` | gate 6 PASS |
| Resend email | Cloudflare Email `EMAIL` | email readiness artifact | gate 3 PASS |
| Supabase Realtime | DO `COLLAB_ROOMS` (WebSockets) | DO binding; realtime readiness (sibling pack) | (sibling track) |

**Remaining exit gates (not parity — retention/proof)**:
- OPEN-PE-01: data retention/export/loss *decision* (not a parity gap — the
  runtime doesn't need Supabase; this is about historical data posture).
- OPEN-PE-02: post-exit smoke (operational confirmation).
- OPEN-PE-03/04: persona/mailbox proof (real-world auth/email delivery
  confirmation, not a capability gap).

## 21.4 D1-specific parity notes

- D1 is treated as the active SQLite/auth store, not a Postgres port (per
  directive §8A). The 39 migrations are D1-native.
- No transaction/consistency change proposed.
- Backup/restore: daily D1 backups + `cf:d1-restore-rehearsal` (sibling pack
  `2026-07-07-d1-r2-backup-restore-operational-readiness`).

## 21.5 R2 / DO / Queue / Email parity notes

- All active, unchanged. Smoke readback confirms health.
- No object-policy, DO-state, Queue-config, or Email change.

## 21.6 Confirmation

Provider facts are from `wrangler.jsonc`, `AGENTS.md`, `package.json`, and
current source — not memory. No legacy-provider mutation is proposed. The only
legacy-provider "action" is the owner's OPEN-PE-01 decision, which this plan
frames but does not perform. The active runtime is Cloudflare-only and proven
so at the source level.
