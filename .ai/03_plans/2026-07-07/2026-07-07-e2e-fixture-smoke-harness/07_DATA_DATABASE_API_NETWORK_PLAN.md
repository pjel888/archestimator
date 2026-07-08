# 07 — Data, Database, API, and Network Plan

## Provider/resource boundary (authoritative)

From `wrangler.jsonc` + `wrangler.next-dev.jsonc`:
- **Worker:** `archestimator-proof` (deploy), `archestimator-next-dev-bindings` (dev).
- **D1 `ARCH_DB`:** `archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`, **preview id `363c756a-7c4d-42fe-908f-6d328bfa4acb`** ← the smoke harness's only D1 target.
- **R2 `ARCH_UPLOADS_R2`:** `archestimator-proof-uploads`, **preview `archestimator-proof-uploads-dev`** ← the smoke harness's only R2 target.
- **Queue `UPLOAD_JOBS_QUEUE`**, **DO `COLLAB_ROOMS`** (class `CollaborationRoom`), **Email `EMAIL`**, **Images `IMAGES`**.

**Standing mandate (AGENTS.md):** local preview D1/R2/DO/Queue/Email work is pre-authorized inside the bound resources. The harness uses **local preview only** (`--local`). It **must not** write remote `ARCH_DB` (`9bdb29bb-…`), remote R2 (`archestimator-proof-uploads`), or any other Cloudflare account/project. Supabase `ebxxqidacheyapmmzavr` is historical only — irrelevant to smoke.

## Data ownership (smoke surface)

| Data | Owner | Lifetime | Cleanup |
|---|---|---|---|
| smoke profile (D1 `profiles`) | `scripts/e2e/seed-local.ts` | per run-session | sentinel-scoped DELETE in `e2e:reset` |
| smoke workspace + owner membership | seed script | per run | scoped DELETE |
| sentinel project/estimate/rows | seed script | per run | scoped DELETE by `ESTIMATES_E2E_PROJECT_ID` |
| library item | seed script | per run | scoped DELETE |
| publications + recipients | seed or action | per run | scoped DELETE by sentinel publication ids |
| upload objects (preview R2) | direct-upload API | per run | prefix delete `e2e-smoke/*` in preview bucket |
| rate-limit rows (publication password lockout) | app | per token | use a **fresh token** per lockout test; never reset global limiter |

## Schema evidence (relevant tables)

- **`profiles`** (`migrations/0003_profiles.sql`): `id TEXT PK`, `email TEXT NOT NULL UNIQUE CHECK(lowercase-trimmed)`, `display_name TEXT`, `role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('ceo','admin','member'))`, `avatar_url TEXT`, timestamps. → Seed must lowercase email and use `role='admin'` (so RBAC-dependent flows pass) or `'member'`.
- **`workspace_members`** + owner backfill (`0030_workspace_owner_membership_backfill.sql`): smoke profile must own the smoke workspace via a `workspace_members` owner row. → Seed includes it.
- **Projects/estimates/rows/library/publications/recipients:** exact columns confirmed by executor in Phase 2 (T2.0 discovery reads the relevant `migrations/` files). The seed SQL is written against current schema; if a column drifts, the seed's idempotent INSERT fails fast (acceptable — surfaces drift early).

## Database Change Blueprint (per smoke-data task)

There is **no schema migration** in this plan (D-6: seed is script-based, local-only). Each seed task is a script + SQL pair:

### Blueprint SEED-PROFILE (FR-SEED1)
- **Target:** local preview D1 `profiles`.
- **SQL shape:** `INSERT INTO profiles (id, email, display_name, role, …) VALUES ('<sentinel>', '<smoke-email>', 'E2E Smoke', 'admin', …) ON CONFLICT(id) DO NOTHING;` (executor fills timestamps/columns per schema read).
- **Idempotency:** `ON CONFLICT(id) DO NOTHING` (or `DO UPDATE SET …`).
- **Concurrency:** single globalSetup writer; sentinel id prevents collision.
- **Backfill:** none (new row).
- **Cardinality:** 1 row.
- **Rollback:** `DELETE FROM profiles WHERE id='<sentinel>';` (reset script).
- **Local proof:** `bun run e2e:seed` then `getDevCurrentUserContext()` resolves (FR-S2 passes).
- **Provider-proof boundary:** local preview only; remote `ARCH_DB` untouched (verified by the script's exclusive use of `--local`).
- **EXPECTED:** executor runs `wrangler d1 execute ARCH_DB --local --command "select id,email from profiles where id='<sentinel>'"` to confirm.

### Blueprint SEED-WORKSPACE (FR-SEED2)
- Insert smoke workspace + `workspace_members` owner row (profile = smoke profile, role owner).
- Rollback: scoped DELETE by workspace sentinel id + membership rows.

### Blueprint SEED-PROJECT/ESTIMATE (FR-SEED2 cont.)
- Insert project (`id=ESTIMATES_E2E_PROJECT_ID` default `22222222-…`), an estimate, a node, and a priced row.
- Rollback: scoped DELETE cascading by project id (respecting FKs / manual child deletes per schema).

### Blueprint SEED-LIBRARY (FR-SEED3)
- Insert cost-library component + price option in smoke workspace.

### Blueprint SEED-PUBLICATION (FR-SEED4)
- Insert (or create via `createProjectPublication` action) one open + one password publication + a recipient.
- Tokens minted with locally-set `PUBLICATION_TOKEN_*` secrets. Password = a known test value (`e2e-smoke-pw`), never a real credential.
- Lockout test (FR-S11) uses a **fresh password publication per run** so the 5-try lockout doesn't persist across runs.

## API / network contracts the smoke observes

| Route | Method | Auth | Smoke assertion |
|---|---|---|---|
| `/` and public marketing | GET | none | 200 + landmark + no console error |
| `/login` | GET | none | 200 + Google btn + email field |
| `/workshop` (unauth) | GET | none | 302 → `/login?next=` |
| `/workshop` (dev-auth cookie) | GET | dev-auth | 200 + shell root |
| `/workshop/projects` | GET | dev-auth | 200 + sentinel project listed |
| `/workshop/projects/[id]` | GET | dev-auth | 200 + heading |
| `/workshop/projects/[id]/estimates/[nodeId]` | GET | dev-auth | 200 + row |
| `/api/projects/[id]/estimates/[eid]/export/proposal.xlsx` | GET | dev-auth | 200 + xlsx content-type + rate-limit on 2nd call |
| `/share/[token]` (open) | GET | recipient session/none | 200 + review workspace |
| `/share/[token]` (password) | GET | none | 200 + password gate |
| `/api/share/[token]/password` | POST | none | 200 on correct; lockout after 5 wrong |
| `/api/share/[token]/comment` `/decision` | POST | recipient session | 200 + state change |
| `/workshop/proposals` | GET | dev-auth | 200 + shared proposal listed |
| `/api/component-library/attachments/direct-upload` | POST | dev-auth | reserve 200 → finalize 200 |
| `/api/health` | GET | none | 200 (probe) |

**Idempotency:** project/estimate/publication creation flows are **not** idempotent by nature — smoke re-creates them per run against fresh seeded data (reset→seed→run cycle). The proposal-export route is GET (idempotent). Share comment/decision mutate state — smoke uses fresh seeded publications per run.

**Rate limits:** proposal export (`checkProposalExportRateLimit`) and publication password (5-try lockout) are the two rate-limited surfaces smoke touches. Smoke asserts the documented behavior (export: second call within window behaves per limiter; password: 5 wrong → lockout). Reset uses fresh tokens, never global limiter resets.

**Timeouts/retries:** Playwright `timeout:30_000`, `expect.timeout:5_000`, `webServer.timeout:120_000`. No network-layer retries beyond Playwright's `retries:1` on CI.

## Transaction / consistency needs

Smoke does **not** require multi-statement transactions in seed (SQLite/D1 local is single-writer; globalSetup runs sequentially). Seed order respects FK dependencies: profile → workspace → membership → project → estimate → row → library → publication → recipient.

## Access-path matrix (smoke → resource) — Improve-Plan-Prompt §6 required schema

`Source | Chosen API/repository/binding | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback`

| Source | Chosen API/repository/binding | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| smoke profile (D1 `profiles`) | `wrangler d1 execute ARCH_DB --local` (seed) + `getProfileByEmailFromCloudflareD1` (runtime resolve via `src/lib/cloudflare/d1.ts:37` `getCloudflareContext`) | dev-auth bypass (localhost) | `isDevAuthBypassRequest`: `NODE_ENV!=production` + `isLocalDevHostname` + secret ≥32 (`dev-auth-gate.ts:12-47`) | `migrations/0003_profiles.sql` CHECKs (email lowercase-unique, role ceo/admin/member); idempotent seed `ON CONFLICT DO NOTHING` | FR-S2 (02 spec); `wrangler d1 … --local --command "select …"` | if ASSUMP-2 false (T0.1) ⇒ escalate to miniflare/test-Worker (RISK-A2) |
| smoke workspace + membership | seed → D1 `workspaces`, `workspace_members` (owner row per `0030_*`) | dev-auth (admin/owner) | workspace membership owner row; workspace RBAC | `migrations/0030_workspace_owner_membership_backfill.sql` semantics; current-state authz hardening (4 files/30 tests green) | FR-S5 (project list renders) | T0.2 schema read confirms columns |
| smoke project/estimate/rows | seed → D1 `projects`, estimate nodes/rows/tabs; runtime via `createProject`/`createEstimate` Server Actions + repository reads | dev-auth (manager) | `requireAuth` + workspace membership + estimate-level access | current migrations `0034-0038`; app-authz (created_by branch removed per current-state) | FR-S5/S6 | scoped seed row delete on reset |
| component-library item | seed → D1 cost-library tables; runtime via `loadCurrentWorkspaceComponentLibrary` | dev-auth | workspace membership | `0036_cost_library_component_drafts.sql`, `0037_*`, `0038_*` (latest) | FR-S7 | T0.2 |
| publication token (mint) | `createProjectPublication` action (`src/lib/publication/actions.ts:775`) with local `PUBLICATION_TOKEN_*` secrets | dev-auth (publication manager) | `assertProjectPublicationManager` RBAC | D1 proc `replace_project_publication`; secrets from `.env.e2e.example` | FR-S9 | if secret unset ⇒ action fails fast (visible) |
| publication snapshot (read) | `/share/[token]` page + `/api/share/[token]` (token hash resolve) | anonymous/recipient | token resolve → hash compare; password gate; recipient session | `force-dynamic` (`page.tsx:34`, `route.ts:13`); snapshot DTO omits totals/client-name to anonymous | FR-S10/S11 | rotated/expired token → 404/not-found (AQ-9) |
| publication password verify | `/api/share/[token]/password` | anonymous (gate) | 5-try lockout `project_publication_password` (1h window, current-state 2026-07-07) | durable D1 limiter; `force-dynamic` (`route.ts:16`); same-origin | FR-S11 (lockout) | fresh token per run (no global reset) |
| recipient comment/decision | `/api/share/[token]/{comment,decision}` | recipient session cookie | recipient session + same-origin (`assertSameOriginPublicPost/Delete`) | `force-dynamic`; body length caps | FR-S10 | fresh publication per run |
| recipient inbox | `/workshop/proposals` → `listRecipientProposals` (`recipient-proposals-repository.ts`) | dev-auth (recipient) | recipient authorization via D1 proc `authorize_recipient_publication_for_current_user` | current-state recipient-proposals repository | FR-S12 | — |
| upload (R2 object) | `/api/component-library/attachments/direct-upload` → `createRuntimeUploadStorageProvider` (R2 binding) + admission control | dev-auth | `requireCurrentUserContext` + `reserveUploadAdmission` + session strategy | preview bucket `archestimator-proof-uploads-dev` (`wrangler.next-dev.jsonc`); `ARCH_UPLOAD_HOSTED_*` limits; `node-sharp` image provider | FR-S13 (object under `e2e-smoke/` prefix) | if preview R2 unreachable ⇒ quarantine upload flow (RISK-A11) |
| proposal export | `/api/projects/[id]/estimates/[eid]/export/proposal.xlsx` (nodejs runtime, `maxDuration=60`) | dev-auth (manager) | `getCurrentUserContext` (401) + workspace membership + audience gate (`isWorkspaceMemberInD1`) | `force-dynamic` (`route.ts:18`); `checkProposalExportRateLimit` per-user | FR-S08 | — |
| health probe | `/api/health` | anonymous | none | none | globalSetup probe | fail-fast actionable msg |

**P0 rule (per Improve-Plan-Prompt §6):** if any chosen runtime path cannot read/write/call the source after current D1 migrations, app-authz checks, object policies, or legacy deny policies, it is a P0 planning defect ⇒ either add a scoped implementation work item or remove the source from v1. **Current status: no P0 path defects identified** — every path's authz/schema is confirmed by repo evidence above. The only gated unknowns are ASSUMP-1/2 (binding resolution, falsified in T0.1) and the T0.2/T0.3 schema/terms discovery (mechanical, not a contract gap).

## Data retention / deletion

- All smoke data is ephemeral, scoped to sentinel ids/prefixes, deleted by `e2e:reset`.
- No smoke data is retained in remote `ARCH_DB` or production R2.
- Upload test objects live under preview-R2 prefix `e2e-smoke/`; reset deletes the prefix.
- Rate-limit rows are avoided by fresh-token-per-run, not global resets.

## Backup / recovery implications

None. Smoke touches local preview DB/bucket only. Daily remote D1 backups (per AGENTS.md cost posture) are unaffected. The `cf:d1-restore-rehearsal` path is unrelated.

## Rollback / fix-forward

- Seed failure ⇒ `e2e:reset` cleans partial state; fix seed SQL; re-run.
- A flaky/broken smoke flow ⇒ quarantine (`@quarantine`), not deletion; fix forward.
- Worst case: `wrangler d1 migrations apply ARCH_DB --local` re-applies clean schema; `e2e:reset` clears smoke rows. No remote state to recover.
