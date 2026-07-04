# Audit Findings Inventory — Vercel + Supabase Remnants

**Audit date:** 2026-07-04
**Method:** Direct `rg`/`ls`/`head` inspection by lead agent (4 parallel `explore` subagents — `bg_22a92b90`, `bg_15f92b52`, `bg_d9367b2c`, `bg_987e3078` — timed out at 30min wall and were abandoned; anti-duplication rule lifted, lead executed the scans directly).
**Evidence class:** Local-static (file paths + line refs). No provider/hosted/runtime claims.

---

## Classification legend

| Class | Meaning |
|---|---|
| `live-runtime` | Active runtime code that will execute against the legacy stack — **MUST FIX** |
| `runtime-broken` | Code that imports packages no longer installed or env vars no longer set — **MUST FIX or DELETE** |
| `dead-code` | Defined but never reached at runtime |
| `comment-historical` | Accurate historical reference (legacy framed as legacy) — **LEAVE** |
| `STALE-active-claim` | Doc/spec/roadmap describes legacy as if it were still active — **MUST FIX** |
| `STALE-link` | URL/dashboard pointer to legacy as if active — **MUST FIX** |
| `migration-archaeology` | Intentional legacy artifact retained for evidence — **LEAVE (with banner)** |
| `tooling-cache-clean` | Tooling cache (.cursor/.codex/etc.) with no stale stack assumption — **LEAVE** |

---

## WS-1: Source code (`src/`)

### Finding F-010 — `src/lib/supabase/types.ts`

- **Path:** `src/lib/supabase/types.ts`
- **Class:** `dead-code` (single-file folder; the README states `src/lib/supabase/` is "Historical/migration-archaeology clients and generated types (not active runtime)")
- **Sub-findings from `src/` scan:** ZERO imports of `@supabase/`, ZERO references to `supabase-js`, ZERO `SUPABASE_` env vars, ZERO references to legacy project `ebxxqidacheyapmmzavr`, ZERO `@vercel/` imports, ZERO `VERCEL_` env vars, ZERO references to `resend` as a runtime provider.
- **Conclusion:** `src/` runtime code is fully migrated. Only `src/lib/supabase/types.ts` remains as the lone holdout — likely generated TypeScript types from the legacy Postgres schema.
- **Action:** Verify zero `src/` files import from `@/lib/supabase/types` or `src/lib/supabase/types`. If confirmed unused → delete the folder. If any imports remain → trace and replace with the D1-shaped type, then delete.

### Source scan receipts

| Search | Scope | Hits |
|---|---|---|
| `@supabase/` | `src/` | 0 |
| `supabase-js\|createClient.*supabase` | `src/` | 0 |
| `SUPABASE_\|NEXT_PUBLIC_SUPABASE` | `src/` | 0 |
| `ebxxqidacheyapmmzavr` | `src/` | 0 |
| `@vercel/\|VERCEL_\|vercel.json` | `src/` | 0 |
| `resend` (case-insensitive) | `src/` | 0 |

---

## WS-2: Scripts (`scripts/`)

### Finding F-007 — Legacy readiness-check scripts (DELETE candidates)

| File | Class | Action |
|---|---|---|
| `scripts/check-supabase-backup-readiness.ts` | `dead-code` | Delete + drop any `package.json` reference |
| `scripts/check-supabase-linked-readiness.ts` | `dead-code` | Delete + drop any `package.json` reference |
| `scripts/check-supabase-migration-readiness.ts` | `dead-code` | Delete + drop any `package.json` reference |
| `scripts/check-vercel-env-readiness.ts` | `dead-code` | Delete + drop any `package.json` reference |
| `scripts/check-vercel-health-readiness.ts` | `dead-code` | Delete + drop any `package.json` reference |
| `scripts/check-vercel-production-readiness.ts` | `dead-code` | Delete + drop any `package.json` reference |

### Finding F-008 — One-shot D1 backfill scripts (already executed — ARCHIVE candidates)

These `migrate-*-to-d1.ts` scripts were the migration's data backfill tooling. They reference Supabase project `ebxxqidacheyapmmzavr` because that was the source. They have already been executed (see `package.json` scripts `cf:d1-*-backfill`).

| File | Class | Action |
|---|---|---|
| `scripts/migrate-legal-terms-acceptances-to-d1.ts` | `migration-archaeology` | Archive to `supabase/migration-evidence/backfill-scripts/` (or keep with banner) |
| `scripts/migrate-account-security-events-to-d1.ts` | `migration-archaeology` | Same |
| `scripts/migrate-ai-audit-to-d1.ts` | `migration-archaeology` | Same |
| `scripts/migrate-beta-feedback-to-d1.ts` | `migration-archaeology` | Same |
| `scripts/migrate-closed-beta-allowlist-to-d1.ts` | `migration-archaeology` | Same |
| `scripts/migrate-profiles-to-d1.ts` | `migration-archaeology` | Same |
| `scripts/migrate-account-settings-to-d1.ts` | `migration-archaeology` | Same |

**Total:** 7 backfill scripts. Also drop the corresponding `cf:d1-*-backfill` script entries from `package.json` after archiving.

### Finding F-009 — Provider-parity proof scripts (HISTORICAL — KEEP or ARCHIVE)

These 29 `prove-*-provider-postgres*.{ts,mjs}` scripts were used to validate provider parity during migration. They are referenced by various `cf:*` proof scripts.

**Files (sample — see full list in `package.json` scripts):**
- `scripts/prove-shared-link-duplicate-decision-race-http.ts`
- `scripts/prove-shared-link-hosted-password-route.ts`
- `scripts/prove-shared-link-provider-perf.ts`
- `scripts/prove-shared-link-hosted-recipient-activity.ts`
- `scripts/prove-shared-link-current-preview-smoke.ts`
- `scripts/prove-recipient-proposals-browser.mjs`
- `scripts/prove-project-dashboard-route-browser.mjs`
- `scripts/prove-project-activity-route-browser.mjs`
- `scripts/prove-upload-cleanup-provider-postgres.ts`
- `scripts/prove-upload-scan-worker-provider-postgres.ts`
- `scripts/prove-upload-scan-rpc-provider-postgres.ts`
- `scripts/prove-upload-session-capacity-provider-postgres.ts`
- `scripts/prove-upload-signed-provider-postgres.ts`
- `scripts/prove-upload-signed-route-provider-postgres.ts`
- `scripts/prove-upload-tus-provider-postgres.ts`
- `scripts/prove-upload-domain-rls-postgres.mjs`
- `scripts/prove-upload-storage-denial-postgres.mjs`
- `scripts/prove-upload-clean-download-provider-postgres.ts`
- `scripts/prove-t4-shared-link-db-hygiene-postgres.mjs`
- …and ~10 more

**Class:** `migration-archaeology` — historical provider-parity evidence.
**Action:** Owner decision required: (a) keep as historical evidence (current state), (b) move under `supabase/migration-evidence/provider-parity-proofs/`, or (c) delete. Recommend (b) for cleanliness.

### Finding F-016 — SQL files under `scripts/sql/`

- `scripts/sql/unify-p6-rpc-relax.sql`
- `scripts/sql/unify-rollback-pre-apply.sql`

**Class:** `migration-archaeology` — legacy RPC relaxation SQL.
**Action:** Move to `supabase/migration-evidence/sql/` or delete.

### Finding F-017 — Misc scripts referencing legacy (REVIEW)

These scripts mention `supabase`/`vercel`/`resend` keywords but may be legitimate Cloudflare-era tooling that mentions legacy for inventory/audit reasons. **Each needs human review before deletion.**

| File | Reason for flag |
|---|---|
| `scripts/check-cloudflare-d1-auth-realtime-readiness.ts` | Mentions legacy for parity comparison |
| `scripts/check-cloudflare-provider-resources.ts` | Mentions Resend for provider-exit comparison |
| `scripts/check-cloudflare-provider-readiness.ts` | Same |
| `scripts/check-cloudflare-dns-delegation.ts` | Mentions Resend |
| `scripts/check-cloudflare-release-gates.ts` | Mentions Resend for release gate |
| `scripts/verify-cloudflare-hosted-routes.ts` | Mentions legacy |
| `scripts/verify-cloudflare-hosted-performance.ts` | Mentions legacy |
| `scripts/verify-upload-alert-delivery.ts` | Mentions legacy alert path |
| `scripts/collect-live-db-performance-evidence.ts` | Compares against legacy |
| `scripts/seed-shared-link-smoke.ts` | Legacy seeding reference |
| `scripts/generate-cloudflare-migration-inventory.ts` | Inventory script (mentions legacy by design) |
| `scripts/generate-cloudflare-better-auth-proof.ts` | Better Auth proof (mentions legacy for comparison) |
| `scripts/generate-cloudflare-provider-exit-pack.ts` | Provider-exit pack (mentions legacy by design — KEEP) |
| `scripts/generate-cloudflare-cost-performance-workbook.ts` | Mentions legacy for cost comparison |

**Class:** Mostly `comment-historical` or `tooling-reference`.
**Action:** Read each; for any that *only* exist to compare CF vs legacy, decide keep/archive based on whether the comparison is still useful.

---

## WS-3: Root configs

### Source-of-truth configs (CLEAN — no action)

| File | Status |
|---|---|
| `package.json` | Clean of `@supabase/*` and `@vercel/*` deps |
| `tsconfig.json` | Clean |
| `next.config.ts` | Clean (Next.js config — no Vercel-specific flags) |
| `wrangler.jsonc` | Clean — Cloudflare Worker config intact |
| `eslint.config.*` | Clean |
| `components.json` | Clean |
| `doctor.config.ts` | Clean |
| `.mcp.json` | Clean |
| `.windsurfrules` | Clean |
| `cloudflare-env.d.ts` | Clean — generated Worker env types |

### Finding F-018 — `.gitignore` line 58

- **Path:** `.gitignore:58` — `# vercel` comment + `.vercel` entry
- **Class:** `tooling-cache-clean` (will become dead once `.vercel/` is deleted)
- **Action:** Remove these two lines after `.vercel/` deletion in WS-5.

---

## WS-4: Documentation

### Root documentation (mostly accurate-historical — LEAVE)

| File | Mentions | Status | Action |
|---|---|---|---|
| `README.md` | 5 | All `comment-historical` — proper migration-archaeology framing ("Legacy Supabase migrations retained only as migration archaeology — do not run, apply, or extend them") | **LEAVE** |
| `AGENTS.md` | 7 | Mostly `comment-historical`. **One stale item:** line 97 references `vercel:agent-browser` as a current loop vocabulary tool | **FIX line 97** |
| `CLAUDE.md` | 1 | Likely historical | Verify and leave if accurate |
| `CODEX.md` | 1 | Likely historical | Verify and leave if accurate |
| `GEMINI.md` | 0 | — | — |
| `PRODUCT.md` | 0 | — | — |
| `DESIGN.md` | 0 | — | — |

### Finding F-013 — `AGENTS.md:97` stale tool reference

- **Path:** `AGENTS.md:97`
- **Snippet:** `…vercel:agent-browser for browser-facing proof.`
- **Class:** `STALE-active-claim` — `vercel:agent-browser` is no longer the project's browser-proof tool (project is Cloudflare-native; Playwright/agent-browser on Vercel is obsolete)
- **Action:** Remove the `vercel:agent-browser` clause or replace with current browser-proof vocabulary (e.g. `playwright` skill, `playwright-mcp`).

### `.ai/` documentation (DETAILED — see sub-sections)

#### `.ai/00_system/` (4 files mention legacy)

| File | Action |
|---|---|
| `AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` | Review for stale legacy instructions |
| `AGENT_FRAMEWORK_PROTOCOL.md` | Review |
| `AGENT_OPERATING_PROTOCOL.md` | Review |
| `VALIDATION_MATRIX.md` | Review |

**Class:** Likely `comment-historical` (these are governance docs that reference legacy as historical context). Each needs a quick scan to confirm none instruct active legacy use.

#### `.ai/01_roadmap/` — **2 STALE roadmap items (HIGH priority)**

### Finding F-005 — `.ai/01_roadmap/03-supabase-rls-storage-readiness.md`

- **Path:** `.ai/01_roadmap/03-supabase-rls-storage-readiness.md`
- **Status header:** "Last updated: 2026-05-30"
- **Class:** `STALE-active-claim` — entire roadmap item about Supabase RLS/Storage readiness is obsolete. D1 has no RLS (replaced by app-layer authorization), and Supabase Storage is replaced by R2.
- **Action:** Move to `.ai/09_archive/01_roadmap/` with a superseded banner; or delete the body and leave a redirect note.

### Finding F-006 — `.ai/01_roadmap/04-auth-provider-vercel-environment-readiness.md`

- **Path:** `.ai/01_roadmap/04-auth-provider-vercel-environment-readiness.md`
- **Status header:** "Last updated: 2026-06-18 (code-sync pass)" / "Status: Active audit — external provider/dashboard proof still open."
- **Class:** `STALE-active-claim` — roadmap item assumes Supabase Auth + Vercel env are active runtime. Both are replaced (Better Auth + Cloudflare Workers).
- **Action:** Move to `.ai/09_archive/01_roadmap/` with a superseded banner; or replace body with a redirect to the current auth readiness source-of-truth.

#### Other `.ai/01_roadmap/` files (33+ mention legacy keywords)

Most are accurate-historical references or general roadmap items that mention legacy as comparison context. **Each needs a quick scan** to confirm none describe Supabase/Vercel as the active runtime.

Files requiring scan (sample):
- `00-production-readiness-dashboard.md`
- `01-launch-gates-master-checklist.md`
- `02-security-tenancy-data-protection.md`
- `06-performance-reliability-observability.md`
- `07-qa-test-validation-matrix.md`
- `09-support-incident-rollback-runbooks.md`
- `10-ai-safety-readiness.md`
- `11-release-deployment-go-no-go.md`
- `12-beta-launch-feedback-loop.md`
- `13-risk-register.md`
- `15-product-management-operating-model.md`
- `17-personas-jobs-to-be-done.md`
- `18-happy-path-user-journey-matrices.md`
- `19-feature-adoption-success-metrics.md`
- `21-usability-research-and-beta-learning-plan.md`
- `22-ruthless-prioritization-for-beta.md`
- `23-codex-goal-execution-plan.md`
- `25-active-workstreams.md`
- `26-codex-goal-cards.md`
- `27-performance-budget-and-regression-gates.md`
- `28-evidence-artifact-index.md`
- `29-enterprise-mvp-scope-and-owner-defaults.md`
- `32-test-infrastructure-execution-spec.md`
- `34-roadmap-consistency-index.md`
- `35-codex-goal-start-pack.md`
- `_SYNC_REPORT.md`
- `action-plan.md`
- `production-readiness-audit.md`
- `status-tracker.md`
- `99-roadmap-quality-self-audit.md`

#### `.ai/02_audits/` — 10 files (LEAVE — audits are historical by nature)

| File | Action |
|---|---|
| `2026-06-18-plan-inventory-implementation-status.md` | Leave (historical audit) |
| `estimate-sheet-tree/README.md` | Leave |
| `2026-06-13-improve-deep-audit/01-priority-findings.md` | Leave |
| `2026-06-13-improve-deep-audit/02-category-inventory.md` | Leave |
| `OPENCODE-GLM5.2-2026-06-21-Estimate-Sheet-Plan-Audit.md` | Leave |
| `2026-06-16-github-codex-comments/unresolved-codex-threads.json` | Leave |
| `2026-06-15-Express-Components-claude-3rd-pass-audit/*` | Leave |
| `kimi-2026-06-21-estimate-sheet-comprehensive-audit.md` | Leave |

#### `.ai/03_plans/` — many files (mostly LEAVE — plans are historical by nature)

The `2026-06-29-Cloudflare-Migration-Codex/` pack is the source-of-truth migration plan and is accurate-historical. The `2026-06-01-security-owasp-compliance-audit/` pack has many files mentioning legacy as comparison context — accurate-historical.

**No action required** in `.ai/03_plans/` for this cleanup.

#### `.ai/06_specs/` — **2 STALE specs (HIGH priority)**

### Finding F-003 — `.ai/06_specs/supabase-auth-setup.md`

- **Path:** `.ai/06_specs/supabase-auth-setup.md`
- **Header:** `**Status:** Active as of 2026-05-18` / `**Project:** ebxxqidacheyapmmzavr`
- **Body claim:** "`/login` sends Supabase magic links. `/auth/callback` exchanges the auth code…"
- **Class:** `STALE-active-claim` — spec describes Supabase Auth as currently active. **Reality:** Better Auth 1.6.22 replaced it; the `/auth/callback` route is migration-archaeology only.
- **Action:** Move to `.ai/09_archive/06_specs/` with superseded banner; update README of `.ai/06_specs/` to remove from active spec list.

### Finding F-004 — `.ai/06_specs/state-and-supabase-foundation.md`

- **Path:** `.ai/06_specs/state-and-supabase-foundation.md`
- **Header:** `**Date:** 2026-05-18` / `**Status:** Approved direction / schema foundation added`
- **Body claim:** "Archestimator will use a three-layer state model: 1. **Supabase/Postgres** for canonical persisted data."
- **Class:** `STALE-active-claim` — spec describes Supabase/Postgres as the canonical data layer. **Reality:** D1 is canonical.
- **Action:** Move to `.ai/09_archive/06_specs/` with superseded banner; replace with current D1 foundation spec or remove from active spec list.

#### Other `.ai/06_specs/` files (review)

| File | Action |
|---|---|
| `walkthrough-shared-link-overhaul.md` | Scan for stale legacy references |
| `deep/architecture-overview.md` | Scan — likely needs update to reflect CF stack |
| `README.md` | Update to remove stale specs from active list |
| `feature-inventory.md` | Scan |

#### `.ai/10_state/` — 4 files (REVIEW for stale claims)

| File | Action |
|---|---|
| `current-state.md` | Scan for stale legacy claims (FAST PATH block is the canonical source — likely accurate) |
| `decisions.md` | Scan for contradictory or superseded decisions |
| `known-issues.md` | Scan for legacy issues that have been resolved by migration |
| `walkthrough-shared-link-overhaul.md` | Scan |

---

## WS-5: Tests + CI + Env + Folders

### Finding F-001 — e2e specs importing `@supabase/supabase-js` (**HIGH**)

| File | Line | Snippet |
|---|---|---|
| `e2e/estimate-tabs.spec.ts` | 4 | `import { createClient } from "@supabase/supabase-js";` |
| `e2e/estimate-tabs.spec.ts` | 24-25 | `process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY` |
| `e2e/estimate-tabs.spec.ts` | 30-31 | `const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;` |
| `e2e/estimate-tree-dnd.spec.ts` | 4 | `import { createClient } from "@supabase/supabase-js";` |
| `e2e/estimate-tree-dnd.spec.ts` | 83-84 | `process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY` |
| `e2e/estimate-tree-dnd.spec.ts` | 89-90 | `const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;` |

**Class:** `runtime-broken` — `@supabase/supabase-js` is no longer in `package.json`. These specs cannot run as-is. They are gated behind env flags (`ARCHESTIMATOR_E2E_MUTATING_DND=1`) and likely fail silently or skip.
**Action:** Replace Supabase seeding with D1-seeding equivalent (e.g. wrangler D1 commands or a Cloudflare-Equivalent seed script). Update env var names. Confirm spec behavior end-to-end.

### Finding F-014 — `tests/vitest/` legacy references (197 files)

The 197 files mentioning `supabase|vercel|resend` are predominantly tests OF the legacy scripts in WS-2 (e.g. `tests/vitest/supabase-migration-readiness-script.test.ts` tests `scripts/check-supabase-migration-readiness.ts`).

**Cascade rule:** When a WS-2 script is deleted, its corresponding test must also be deleted (or archived). When a script is archived, its test should be archived alongside.

**Specific high-confidence Delete candidates** (tests of legacy scripts):
- `tests/vitest/supabase-migration-readiness-script.test.ts`
- `tests/vitest/vercel-env-readiness-script.test.ts`
- `tests/vitest/vercel-health-readiness-script.test.ts`
- `tests/vitest/vercel-analytics-removed.test.ts`

**Other tests referencing legacy (REVIEW):** The remaining ~190 files need a per-file scan to classify. Many are likely `comment-historical` (test data referencing legacy schema for legacy-script testing) and will cascade away when WS-2 scripts are deleted.

### e2e/ files with legacy refs (14 — REVIEW)

| File | Likely class |
|---|---|
| `e2e/estimate-sources-drawer.spec.ts` | Review |
| `e2e/estimate-row-move.spec.ts` | Review |
| `e2e/notifications-e2e-helpers.ts` | Review |
| `e2e/estimate-tabs.spec.ts` | **F-001 — runtime-broken** |
| `e2e/workshop-library-routes.spec.ts` | Review |
| `e2e/estimate-sheet-loading-performance.spec.ts` | Review |
| `e2e/workshop-template-insert-smoke.spec.ts` | Review |
| `e2e/workshop-project-specific-unlink-smoke.spec.ts` | Review |
| `e2e/estimate-tree-dnd.spec.ts` | **F-001 — runtime-broken** |
| `e2e/ask-flip-package-builder-live.spec.ts` | Review |
| `e2e/publisher-e2e-helpers.ts` | Review |
| `e2e/teamspace-collaboration.spec.ts` | Review |
| `e2e/project-invite-entry.spec.ts` | Review |
| `e2e/support/estimate-row-fixture.ts` | Review |

### Finding F-002 — `.env.local` contains live legacy credentials (**HIGH**)

- **Path:** `.env.local` (gitignored, but present in working tree)
- **Class:** `runtime-broken` + credential-hygiene issue
- **Contents (lines 1-14, partial):**
  - `NEXT_PUBLIC_SUPABASE_URL=https://ebxxqidacheyapmmzavr.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...` (redacted)
  - `SUPABASE_SERVICE_ROLE_KEY=sb_secret_...` (redacted — **service-role secret**)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` (redacted)
  - `DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.ebxxqidacheyapmmzavr.supabase.co:5432/postgres`
  - `RESEND_API_KEY=re_...` (redacted — **Resend API key**)
- **Action:** Sanitize `.env.local`: remove all `SUPABASE_*`, `RESEND_*`, and Postgres-shaped `DATABASE_URL` entries. Keep only Cloudflare & Better Auth & AI vars. Verify `.env.local` is in `.gitignore` (it is — line 56 `.env*` with `!.env.example` exception). **Strongly consider rotating the leaked Supabase service-role key and Resend API key** since they have been sitting in plaintext (even if gitignored).

### Other env files (CLEAN — verified)

| File | Status |
|---|---|
| `.env.example` | Clean — only contains `DATABASE_URL=` placeholder |
| `.dev.vars` | Clean (Cloudflare-only) |
| `.dev.vars.example` | Clean |

### Finding F-012 — `.vercel/` folder + `.vercelignore`

- **Path:** `.vercel/`
- **Contents:** `README.txt`, `project.json`
- **`project.json` body:** `{"projectId":"prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E","orgId":"team_eRuwqQwhMbYYDmvgIgpQW1GS","projectName":"archestimator"}`
- **Class:** `legacy-config` — Vercel project link still in working tree
- **Action:** Delete `.vercel/` folder entirely. Delete `.vercelignore`. Remove `.vercel` entry from `.gitignore:58`.

### Finding F-011 — `supabase/` legacy folder

- **Path:** `supabase/`
- **Contents:**
  - `.DS_Store` (trash)
  - `.gitignore`
  - `.temp/` (supabase CLI scratch)
  - `config.toml` (15KB — Supabase CLI config)
  - `migrations/` (182 SQL files — legacy schema archaeology)
  - `migrations-pending-review/` (14 SQL files — never-applied legacy)
  - `seed.sql` (18KB)
- **Class:** `migration-archaeology` (already labeled as such in `AGENTS.md` and `README.md`)
- **Action (owner decision required — 3 options):**
  - **Option A (PREFERRED — least disruption):** Leave in place. Add a top-level `supabase/README.md` banner reinforcing "MIGRATION ARCHAEOLOGY — DO NOT RUN, APPLY, OR EXTEND. Reference only."
  - **Option B (cleaner):** Move entire folder to `.ai/09_archive/supabase-legacy/`. Update `README.md` and `AGENTS.md` path references.
  - **Option C (aggressive):** Delete entirely. **NOT RECOMMENDED** — loses provider-exit evidence and migration archaeology value.

### CI/CD (`.github/workflows/`)

- `ci.yml` — review for Vercel/Supabase deployment steps
- `codeql.yml` — likely clean (CodeQL is GitHub-native)
- `react-doctor.yml` — likely clean

**Action:** Quick scan of `ci.yml` to confirm no `vercel`/`supabase` CLI calls or env-var assumptions. (High-confidence clean — the project deploys via `cf:deploy` per `package.json`, but verify.)

### Other `.github/` matches

The `rg` hits in `.github/skills/impeccable/scripts/*` are false positives — those are bundled impeccable-skill scripts unrelated to the project stack. **LEAVE.**

### Tooling caches (`.cursor/`, `.codex/`, `.claude/`, `.agents/`, `.commandcode/`, `.gemini/`)

**Action:** Light scan of `.cursor/rules/*.mdc` (already shown in environment — the rules are accurate-historical references like "When migrating from Vercel/Supabase…"). Other caches are tooling-internal and likely clean. No action unless a stale stack assumption is found.

---

## Recap by severity

| Severity | Count | Examples |
|---|---|---|
| **HIGH** (MUST FIX — runtime/spec contradiction) | 4 | F-001 (broken e2e), F-002 (stale creds), F-003, F-004 (stale specs) |
| **MEDIUM** (SHOULD FIX — dead code, stale docs) | 5 | F-005, F-006 (stale roadmap), F-007 (dead check scripts), F-010 (dead types), F-012 (.vercel folder) |
| **LOW** (owner decision — archaeology disposition) | 4 | F-008, F-009 (backfill + proof scripts), F-011 (supabase/ folder), F-014 (test cascade) |
| **TRIVIAL** | 3 | F-013 (1 stale tool ref), F-015 (.gitignore line), F-018 (.gitignore vercel entry) |

**Total findings:** 18 distinct items (F-001 through F-018).

---

## What was NOT audited (residual unknowns)

1. **`scripts/prove-*-provider-postgres*` full file list** — only a sample was enumerated. The full count is 29 per `ls scripts/prove-*-provider-postgres* scripts/prove-*-postgres* | wc -l`. The remaining files need enumeration before deletion/archiving.
2. **Per-file scan of the 33+ `.ai/01_roadmap/*.md` files** — keyword matches were found, but each needs a content check to confirm whether mentions are accurate-historical or stale.
3. **Per-file scan of `.ai/00_system/*.md` files** — same as above.
4. **`tests/vitest/` per-file classification** — 197 files have keyword matches; each needs cascade analysis after WS-2 script disposition.
5. **`ci.yml` content** — assumed clean (project uses `cf:deploy`), but content scan is required before declaring WS-5 complete.
6. **`.storybook/`, `.design-shots/`, `.design-sync/`, `.headroom/`, `.impeccable/`, `.hallmark/`, `.vibe/`, `.chunkhound/`, `.gitnexus/`, `.code-review-graph/`, `.ultragoal/`, `.omo/`, `.omx/`, `.supermemory/`, `.playwright-mcp/`** — these are tooling caches; light scan recommended but likely clean.

These unknowns become work items in `02_CLEANUP_WORKSTREAMS.md`.
