# Cleanup Workstreams

**Plan:** Vercel + Supabase Cleanup (2026-07-04)
**Status:** Planning — awaiting owner approval
**Convention:** Each workstream (WS) is independently parallelizable unless explicit dependencies are noted. Tasks inside a WS are sequenced where deletion must follow import-removal.

---

## WS-A: Source Code Remediation (owner: build lane)

**Goal:** Confirm `src/` is 100% Cloudflare-native; remove the lone legacy types file.

### Tasks

| ID | Task | Files | Verifies |
|---|---|---|---|
| A-1 | Scan all `src/**` for imports of `@/lib/supabase/types`, `src/lib/supabase/types`, or any reference to the legacy types file | `src/` | `rg "@/lib/supabase|lib/supabase/types" src/` returns 0 hits |
| A-2 | If A-1 returns 0 hits → delete `src/lib/supabase/` folder (only contains `types.ts`) | `src/lib/supabase/types.ts`, `src/lib/supabase/` | Folder no longer exists |
| A-3 | If A-1 returns hits → trace each import, replace with D1-shaped type from `src/lib/repositories/` or current schema, then delete `src/lib/supabase/` | case-by-case | Type errors resolved, then folder deleted |
| A-4 | Re-run `bun run type-check` to confirm no regressions | `tsc --noEmit` | Exit code 0 |

**Dependencies:** None (safe to run first).
**Parallelizable with:** WS-B (scripts), WS-D (env), WS-E (folders).

---

## WS-B: Scripts Remediation (owner: build lane)

**Goal:** Remove dead legacy check scripts; archive one-shot backfill scripts; decide on provider-parity proof scripts.

### Tasks

#### B-1 — Delete legacy readiness-check scripts (F-007)

For each of the 6 dead check scripts:
1. Confirm no other script imports from it (`rg "check-supabase-|check-vercel-" scripts/ package.json`).
2. Check `package.json` for corresponding script entry (e.g. `cf:check-supabase-backup`); if present, remove the entry.
3. Delete the file.

**Files to delete:**
- `scripts/check-supabase-backup-readiness.ts`
- `scripts/check-supabase-linked-readiness.ts`
- `scripts/check-supabase-migration-readiness.ts`
- `scripts/check-vercel-env-readiness.ts`
- `scripts/check-vercel-health-readiness.ts`
- `scripts/check-vercel-production-readiness.ts`

#### B-2 — Archive one-shot D1 backfill scripts (F-008)

**Decision required:** archive vs. keep-in-place.

**Recommended:** Move to `supabase/migration-evidence/backfill-scripts/` (preserves the historical evidence chain). Create the destination dir first.

**Files to move:**
- `scripts/migrate-legal-terms-acceptances-to-d1.ts`
- `scripts/migrate-account-security-events-to-d1.ts`
- `scripts/migrate-ai-audit-to-d1.ts`
- `scripts/migrate-beta-feedback-to-d1.ts`
- `scripts/migrate-closed-beta-allowlist-to-d1.ts`
- `scripts/migrate-profiles-to-d1.ts`
- `scripts/migrate-account-settings-to-d1.ts`

**Also:** drop the corresponding `cf:d1-*-backfill` script entries from `package.json` (7 entries). Search `package.json` for `migrate-*-to-d1` to find each entry.

#### B-3 — Decide on provider-parity proof scripts (F-009)

**Owner decision required (3 options):**
- **(a) KEEP IN PLACE** — leave the 29 `prove-*-provider-postgres*` scripts in `scripts/` (current state, lowest effort, messiest).
- **(b) ARCHIVE** — move to `supabase/migration-evidence/provider-parity-proofs/` (recommended — preserves evidence, cleans `scripts/`).
- **(c) DELETE** — remove entirely (NOT RECOMMENDED — loses provider-exit evidence).

**Recommended:** (b). Also drop any `cf:*` package.json entries that reference these scripts if they're no longer needed for ongoing proof.

#### B-4 — Move legacy SQL files (F-016)

Move `scripts/sql/unify-p6-rpc-relax.sql` and `scripts/sql/unify-rollback-pre-apply.sql` to `supabase/migration-evidence/sql/`. If `scripts/sql/` becomes empty, delete the folder.

#### B-5 — Review misc scripts referencing legacy (F-017)

For each of the 14 flagged scripts in `01_AUDIT_FINDINGS.md`:
1. Read the script body.
2. Classify as `comment-historical` (mention is comparison-only) vs `dead-code` (script only exists for legacy).
3. If `dead-code` → delete + drop `package.json` entry.
4. If `comment-historical` → leave.

**Dependencies:** B-1, B-2, B-3, B-4 must complete before B-5 (to avoid reviewing scripts that will already be deleted).

---

## WS-C: Tests Remediation (owner: QA lane)

**Goal:** Remove tests of deleted scripts; fix or replace runtime-broken e2e specs.

### Tasks

#### C-1 — Delete tests of legacy check scripts (F-014 high-confidence subset)

**Files to delete** (cascade from B-1):
- `tests/vitest/supabase-migration-readiness-script.test.ts`
- `tests/vitest/vercel-env-readiness-script.test.ts`
- `tests/vitest/vercel-health-readiness-script.test.ts`
- `tests/vitest/vercel-analytics-removed.test.ts`

(Verify each test targets a deleted script before deletion.)

#### C-2 — Archive tests of backfill scripts (F-014 cascade from B-2)

Move to `supabase/migration-evidence/backfill-scripts/tests/` (mirror the script archive). Identify by searching for tests of `migrate-*-to-d1` script names.

#### C-3 — Fix runtime-broken e2e specs (F-001) — **HIGH PRIORITY**

For `e2e/estimate-tabs.spec.ts` and `e2e/estimate-tree-dnd.spec.ts`:
1. Replace `import { createClient } from "@supabase/supabase-js"` with a Cloudflare-equivalent seed helper (e.g. `wrangler d1 execute ARCH_DB --local --command "INSERT INTO …"` or a TS helper that calls the D1 binding directly).
2. Replace `process.env.NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` with `process.env.ARCH_DB_LOCAL_PATH` or equivalent D1-local binding env.
3. Run the spec locally: `ARCHESTIMATOR_E2E_MUTATING_DND=1 bun run test:e2e e2e/estimate-tree-dnd.spec.ts`.
4. Confirm it seeds D1, runs the test, and tears down without error.

**Dependencies:** This task is coupled to **WS-A (Source Code)** if the e2e helper is shared. Consider creating a single `e2e/support/d1-seed.ts` helper that both specs import.

#### C-4 — Review remaining 190+ tests/vitest/ files with legacy refs

After C-1 and C-2 cascade, scan the remaining tests. For each:
1. If the test targets a script deleted in WS-B → delete the test.
2. If the test references legacy schema in fixtures/mocks but targets active code → keep but update the fixture to D1-shaped data.
3. If the test is unclear → flag for human review.

**Dependencies:** C-1, C-2 must complete first.

#### C-5 — Review e2e/ files with legacy refs (14 files)

For each e2e file flagged in `01_AUDIT_FINDINGS.md` (other than the F-001 specs already handled in C-3):
1. Read body.
2. Classify (`comment-historical` vs `runtime-broken`).
3. If `runtime-broken` → fix or delete.

**Dependencies:** C-3 should complete first to establish the D1-seed pattern.

---

## WS-D: Env + Secrets Sanitization (owner: dev lane)

**Goal:** Remove stale credentials; rotate any leaked secrets.

### Tasks

#### D-1 — Sanitize `.env.local` (F-002) — **HIGH PRIORITY**

1. Open `.env.local`.
2. Remove these entries:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (Postgres-shaped — keep only if it's a D1-shaped value)
   - `RESEND_API_KEY`
3. Keep Cloudflare/Better Auth/AI vars intact.
4. Save.
5. Confirm `.env.local` is still gitignored (`.gitignore:56` `.env*` with `!.env.example` exception).

#### D-2 — Rotate leaked credentials (owner action — outside repo)

**Strong recommendation to Philip:**
- Rotate the Supabase service-role key for project `ebxxqidacheyapmmzavr` (even though the project is historical, the key is still valid until rotated).
- Rotate the Resend API key (Resend account → API Keys → Revoke + Create new).
- Confirm the Resend account is no longer being billed.

**Why:** The credentials sat in plaintext in `.env.local` even though gitignored. If the file was ever shared, copied, or backed up to cloud storage, the secrets may have leaked.

#### D-3 — Verify `.env.example` cleanliness (already clean)

Quick re-confirm: `.env.example` contains only `DATABASE_URL=` placeholder. No action.

#### D-4 — Verify `.dev.vars` cleanliness (already clean)

Quick re-confirm: `.dev.vars` and `.dev.vars.example` are Cloudflare-only. No action.

---

## WS-E: Documentation Remediation (owner: tech-writing lane)

**Goal:** Fix STALE docs that contradict the current Cloudflare runtime; leave accurate-historical docs intact.

### Tasks

#### E-1 — Archive STALE specs (F-003, F-004) — **HIGH PRIORITY**

1. Create `.ai/09_archive/06_specs/` if it doesn't exist.
2. Move:
   - `.ai/06_specs/supabase-auth-setup.md` → `.ai/09_archive/06_specs/supabase-auth-setup.md`
   - `.ai/06_specs/state-and-supabase-foundation.md` → `.ai/09_archive/06_specs/state-and-supabase-foundation.md`
3. Prepend a superseded banner to each (after the move):
   ```markdown
   > **SUPERSEDED (2026-07-04):** This spec described the legacy Supabase/Postgres foundation.
   > Archestimator now runs on Cloudflare D1 + Better Auth. See:
   > - Current data layer: `src/lib/repositories/` + `migrations/`
   > - Current auth: `src/lib/auth/better-auth-cloudflare.ts`
   > - Migration plan: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/`
   ```
4. Update `.ai/06_specs/README.md` to remove the two archived specs from the active list.

#### E-2 — Archive STALE roadmap items (F-005, F-006)

1. Create `.ai/09_archive/01_roadmap/` if needed.
2. Move:
   - `.ai/01_roadmap/03-supabase-rls-storage-readiness.md` → archived
   - `.ai/01_roadmap/04-auth-provider-vercel-environment-readiness.md` → archived
3. Prepend superseded banner (same template as E-1).
4. Update `.ai/01_roadmap/README.md` and `34-roadmap-consistency-index.md` if they index these items.

#### E-3 — Fix `AGENTS.md:97` stale tool reference (F-013)

Edit `AGENTS.md` line 97. Current:
```
… `omo:ultraresearch` for exhaustive cited research, `ultraqa` for adversarial QA, and `vercel:agent-browser` for browser-facing proof.
```

Replace `vercel:agent-browser` with the current browser-proof tool. Recommended replacement: `playwright` skill (per the project's existing toolset — `.playwright-mcp/` and the `playwright` skill).

#### E-4 — Scan `.ai/00_system/` 4 files for stale legacy instructions

For each:
- `AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
- `AGENT_FRAMEWORK_PROTOCOL.md`
- `AGENT_OPERATING_PROTOCOL.md`
- `VALIDATION_MATRIX.md`

Read; if any section instructs active legacy use (e.g. "run `supabase migration list`"), update to current CF equivalent or remove.

#### E-5 — Scan `.ai/01_roadmap/` remaining 31 files

For each file flagged in `01_AUDIT_FINDINGS.md` (other than the 2 archived in E-2):
1. Read body.
2. Classify (`comment-historical` vs `STALE-active-claim`).
3. If `STALE` → update wording to reflect CF reality, or move to archive.

**Dependencies:** E-2 must complete first (to avoid re-scanning archived files).

#### E-6 — Scan `.ai/10_state/` 4 files

For each:
- `current-state.md` (FAST PATH block is canonical — likely clean)
- `decisions.md`
- `known-issues.md`
- `walkthrough-shared-link-overhaul.md`

Update STALE entries; leave accurate-historical entries.

#### E-7 — Scan `.ai/06_specs/` remaining files

For each (other than the 2 archived in E-1):
- `walkthrough-shared-link-overhaul.md`
- `deep/architecture-overview.md`
- `README.md`
- `feature-inventory.md`

#### E-8 — Verify root `.md` files

- `README.md` (5 mentions — confirmed accurate-historical, LEAVE)
- `AGENTS.md` (7 mentions — fix line 97 per E-3, LEAVE others)
- `CLAUDE.md` (1 mention — verify)
- `CODEX.md` (1 mention — verify)

#### E-9 — Scan tooling-caches for stale stack assumptions

`.cursor/rules/*.mdc`, `.codex/`, `.commandcode/`, `.agents/`, `.claude/`, `.gemini/`. Light scan; flag any stale stack assumption.

---

## WS-F: Legacy Folder Disposition (owner: dev lane)

**Goal:** Delete `.vercel/`; formalize `supabase/` archaeology status.

### Tasks

#### F-1 — Delete `.vercel/` folder + `.vercelignore` (F-012, F-015)

1. Confirm `.vercel/project.json` does not affect runtime (it's a Vercel deployment link, irrelevant post-CF migration).
2. `rm -rf .vercel/`
3. `rm .vercelignore`
4. Edit `.gitignore` — remove lines 57-58 (`# vercel` + `.vercel`).
5. Commit deletion.

#### F-2 — Formalize `supabase/` folder status (F-011)

**Owner decision required** (3 options listed in `01_AUDIT_FINDINGS.md`).

**Recommended (Option A):** Add `supabase/README.md` with banner:
```markdown
# Supabase Migration Archaeology

**DO NOT RUN, APPLY, OR EXTEND any file in this folder.**

This folder is retained as historical migration evidence of the pre-Cloudflare
stack. The active runtime uses Cloudflare D1 (`ARCH_DB`), R2 (`ARCH_UPLOADS_R2`),
Durable Objects (`COLLAB_ROOMS`), Queues (`UPLOAD_JOBS_QUEUE`), and Email (`EMAIL`).

Active D1 migrations live in `./migrations/` (repo root), NOT here.

For the migration plan, see `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/`.
For the cleanup plan that formalized this status, see
`.ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/`.
```

Also delete `supabase/.DS_Store` (trash).

If Option B is chosen (move to `.ai/09_archive/supabase-legacy/`):
1. Move entire `supabase/` folder to `.ai/09_archive/supabase-legacy/`.
2. Update `AGENTS.md` and `README.md` path references (`./supabase/migrations/` → `.ai/09_archive/supabase-legacy/migrations/`).
3. Update this plan pack to reflect the new path.

---

## WS-G: CI/CD Verification (owner: dev lane)

**Goal:** Confirm CI does not deploy to Vercel or run Supabase CLI commands.

### Tasks

#### G-1 — Scan `.github/workflows/ci.yml`

Read the full file. Flag any:
- `vercel deploy` / `vercel build` commands
- `supabase` CLI commands
- References to `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, or similar secrets
- Deployment steps that don't use `bun run cf:deploy`

If clean → no action. If legacy → update to `cf:deploy` or remove.

#### G-2 — Scan other workflows

`.github/workflows/codeql.yml`, `.github/workflows/react-doctor.yml`. Likely clean.

---

## WS-H: Provider-Exit Evidence Pack (owner: dev lane, OPTIONAL)

**Goal:** Generate a final provider-exit evidence pack to document the migration as closed.

### Tasks

#### H-1 — Run `bun run cf:provider-exit-pack`

The script `scripts/generate-cloudflare-provider-exit-pack.ts` already exists and generates a provider-exit evidence pack. Run it to capture a snapshot of the post-cleanup state.

**Output location:** per script default (likely `.ai/02_audits/` or a cloudflare-evidence folder).

**Dependencies:** All other WS complete first (so the evidence pack reflects the cleaned state).

---

## WS-V: Verification Lane (owner: verifier, independent from build lane)

**Goal:** Prove the cleanup is complete with concrete evidence.

**Tasks defined in `04_VERIFICATION_AND_PROOF.md`.**

This lane runs in parallel with implementation lanes (each task triggers its own verification step) and a final full-suite verification at the end.
