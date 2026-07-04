# Verification and Proof

**Plan:** Vercel + Supabase Cleanup (2026-07-04)
**Status:** Planning

Per Multi-Agent Execution Directive §11 (Validation and Evidence Rules), every claim requires the smallest proof that actually proves the claim. Per Ponytail mode, leave one runnable check for non-trivial logic.

---

## Evidence class matrix

| Class | Use for this plan |
|---|---|
| Local static | File path / `rg` receipt proving a remnant is gone |
| Local automated | `bun run type-check`, `bun run lint`, `bun run test`, `bun run test:dom` |
| Local runtime | `bun run cf:preview` + targeted Playwright spec run |
| Provider-backed | `wrangler d1 execute ARCH_DB --local --command "SELECT ..."` to confirm D1 still has expected schema |
| Hosted/production | OUT OF SCOPE — no production changes |

---

## Wave 0 — Pre-flight proofs

| ID | Claim | Proof |
|---|---|---|
| V-0.1 | Working tree state captured | `git status --short --branch` output saved to `LOOP_LEDGER.md` |
| V-0.2 | Baseline build passes | `bun run type-check && bun run lint && bun run test && bun run test:dom` exit 0 |
| V-0.3 | Rollback anchor exists | `git tag pre-cleanup-2026-07-04` shows in `git tag` |
| V-0.4 | Cleanup branch active | `git branch --show-current` returns `cleanup/vercel-supabase-2026-07-04` |

---

## Wave 1 proofs

### Lane 1A — Source + e2e

| ID | Claim | Proof |
|---|---|---|
| V-1A.1 | `src/lib/supabase/` folder removed | `ls src/lib/supabase/` returns "No such file or directory" |
| V-1A.2 | Zero `@supabase/` imports in `src/` | `rg "@supabase/" src/` returns 0 hits |
| V-1A.3 | Zero `supabase-js` in `src/` | `rg "supabase-js" src/` returns 0 hits |
| V-1A.4 | Type check passes post-deletion | `bun run type-check` exit 0 |
| V-1A.5 | `e2e/estimate-tabs.spec.ts` runs without Supabase import | `rg "@supabase" e2e/estimate-tabs.spec.ts` returns 0 hits |
| V-1A.6 | `e2e/estimate-tree-dnd.spec.ts` runs without Supabase import | `rg "@supabase" e2e/estimate-tree-dnd.spec.ts` returns 0 hits |
| V-1A.7 | Both e2e specs run to completion (with env flag) | `ARCHESTIMATOR_E2E_MUTATING_DND=1 bun run test:e2e e2e/estimate-tree-dnd.spec.ts` exits 0 |

### Lane 1B — Env

| ID | Claim | Proof |
|---|---|---|
| V-1B.1 | `.env.local` has no `SUPABASE_*` entries | `rg "^SUPABASE_\|^NEXT_PUBLIC_SUPABASE" .env.local` returns 0 hits |
| V-1B.2 | `.env.local` has no `RESEND_*` entries | `rg "^RESEND_" .env.local` returns 0 hits |
| V-1B.3 | `.env.local` has no Postgres `DATABASE_URL` | `rg "postgresql://.*supabase" .env.local` returns 0 hits |
| V-1B.4 | `.env.local` still gitignored | `git check-ignore .env.local` returns the path |

### Lane 1C — Documentation

| ID | Claim | Proof |
|---|---|---|
| V-1C.1 | `.ai/06_specs/supabase-auth-setup.md` archived | `ls .ai/06_specs/supabase-auth-setup.md` returns "No such file"; `ls .ai/09_archive/06_specs/supabase-auth-setup.md` returns the file |
| V-1C.2 | `.ai/06_specs/state-and-supabase-foundation.md` archived | Same check for the second file |
| V-1C.3 | Both archived files have superseded banner | `head -10 .ai/09_archive/06_specs/supabase-auth-setup.md` shows banner |
| V-1C.4 | `.ai/06_specs/README.md` updated | The two specs no longer in the active list |

---

## Wave 2 proofs

### Lane 2A — Scripts delete

| ID | Claim | Proof |
|---|---|---|
| V-2A.1 | 6 legacy check scripts gone | `ls scripts/check-supabase-* scripts/check-vercel-* 2>/dev/null` returns empty |
| V-2A.2 | `package.json` has no `check-supabase` / `check-vercel` entries | `rg "check-supabase\|check-vercel" package.json` returns 0 hits |
| V-2A.3 | `bun install` still resolves cleanly | `bun install --frozen-lockfile` exit 0 |

### Lane 2B — Folders

| ID | Claim | Proof |
|---|---|---|
| V-2B.1 | `.vercel/` deleted | `ls .vercel/ 2>/dev/null` returns "No such file or directory" |
| V-2B.2 | `.vercelignore` deleted | `ls .vercelignore 2>/dev/null` returns "No such file or directory" |
| V-2B.3 | `.gitignore` cleaned | `rg "vercel" .gitignore` returns 0 hits |

### Lane 2C — Documentation MEDIUM

| ID | Claim | Proof |
|---|---|---|
| V-2C.1 | 2 STALE roadmap items archived | `ls .ai/01_roadmap/03-supabase-rls-storage-readiness.md` returns "No such file"; archived file exists |
| V-2C.2 | Same for `04-auth-provider-vercel-environment-readiness.md` | Same check |
| V-2C.3 | `AGENTS.md:97` no longer mentions `vercel:agent-browser` | `rg "vercel:agent-browser" AGENTS.md` returns 0 hits |

---

## Wave 3 proofs

### Lane 3A — Test cascade

| ID | Claim | Proof |
|---|---|---|
| V-3A.1 | 4 high-confidence legacy tests deleted | `ls tests/vitest/supabase-migration-readiness-script.test.ts tests/vitest/vercel-env-readiness-script.test.ts tests/vitest/vercel-health-readiness-script.test.ts tests/vitest/vercel-analytics-removed.test.ts 2>/dev/null` returns empty |
| V-3A.2 | Test suite still passes | `bun run test && bun run test:dom` exit 0 (or pre-existing failures noted) |

### Lane 3B — Backfill archive

| ID | Claim | Proof |
|---|---|---|
| V-3B.1 | 7 backfill scripts moved to archive | `ls scripts/migrate-*-to-d1.ts 2>/dev/null` returns empty; `ls supabase/migration-evidence/backfill-scripts/` returns 7 files |
| V-3B.2 | `package.json` no longer has `cf:d1-*-backfill` entries | `rg "cf:d1-.*-backfill" package.json` returns 0 hits (or only the historical entries retained by owner choice) |

### Lane 3C — Proof script decision

| ID | Claim | Proof |
|---|---|---|
| V-3C.1 | Owner disposition applied | Either scripts remain (Option A) OR moved to `supabase/migration-evidence/provider-parity-proofs/` (Option B) OR deleted (Option C). Documented in `LOOP_LEDGER.md`. |

### Lane 3D — supabase/ folder

| ID | Claim | Proof |
|---|---|---|
| V-3D.1 | Banner README exists (Option A) OR folder moved (Option B) | Per owner disposition |
| V-3D.2 | `.DS_Store` removed from supabase/ | `ls supabase/.DS_Store 2>/dev/null` returns empty |

### Lane 3E — Doc review

| ID | Claim | Proof |
|---|---|---|
| V-3E.1 | `.ai/00_system/` 4 files scanned | Each file's STALE-claim status documented in `LOOP_LEDGER.md` |
| V-3E.2 | `.ai/01_roadmap/` 31 remaining files scanned | Same |
| V-3E.3 | `.ai/10_state/` 4 files scanned | Same |
| V-3E.4 | `.ai/06_specs/` remaining files scanned | Same |

---

## Wave 4 proofs (final)

| ID | Claim | Proof |
|---|---|---|
| V-4.1 | Full validation suite passes | `bun run validate` exit 0 |
| V-4.2 | Build succeeds | `bun run build` exit 0 |
| V-4.3 | Targeted e2e suite passes | `bun run test:e2e` exit 0 (or pre-existing failures noted) |
| V-4.4 | `.github/workflows/ci.yml` clean | `rg "vercel\|supabase" .github/workflows/ci.yml` returns 0 hits |
| V-4.5 | Provider-exit evidence pack generated | `bun run cf:provider-exit-pack` runs; output file exists |
| V-4.6 | `LOOP_LEDGER.md` finalized | All waves marked complete; verification artifacts listed |
| V-4.7 | `.ai/10_state/current-state.md` updated | FAST PATH block notes cleanup complete |
| V-4.8 | Post-cleanup tag exists | `git tag post-cleanup-2026-07-04` shows in `git tag` |
| V-4.9 | Final comprehensive scan | `rg "@supabase/\|supabase-js" src/ scripts/ e2e/ tests/` returns only `migration-archaeology` references (in `supabase/` folder if retained) |

---

## Final acceptance criteria

The cleanup is **complete** when ALL of the following hold:

1. ✅ All HIGH findings (F-001, F-002, F-003, F-004) have passing Wave 1 proofs.
2. ✅ All MEDIUM findings (F-005, F-006, F-007, F-010, F-012) have passing Wave 2 proofs.
3. ✅ All LOW findings (F-008, F-009, F-011, F-014) have owner disposition + Wave 3 proofs.
4. ✅ All TRIVIAL findings (F-013, F-015, F-018) fixed.
5. ✅ `bun run validate && bun run build` exit 0.
6. ✅ Targeted e2e suite (estimate-tabs, estimate-tree-dnd) exits 0 with env flag set.
7. ✅ `LOOP_LEDGER.md` documents every finding's resolution.
8. ✅ Owner has rotated the leaked Supabase service-role key and Resend API key (outside repo; owner attestation).
9. ✅ `git diff main..cleanup/vercel-supabase-2026-07-04` shows only cleanup-related changes (no scope creep).

---

## Skipped validations (residual risk)

| Validation | Reason skipped | Risk | Substitute | Required for completion |
|---|---|---|---|---|
| Production deploy proof | Out of scope (planning-only) | Cleanup may surface runtime issues only visible in production | Wave 4 Lane 4.4 provider-exit pack + Wave 1A Lane 1A e2e proof | No — production changes require fresh owner authorization |
| Full Playwright suite | Time-bounded; only specs touching legacy stack run | Other specs may have hidden legacy coupling | V-1A.5, V-1A.6, V-1A.7 (targeted) | Yes for the 2 known-broken specs; others optional |
| Tooling-cache deep scan | Low signal | `.cursor/`, `.codex/` etc. may contain stale refs but they're agent adapters, not runtime | WS-E task E-9 light scan | Yes |

---

## Ponytail single-check rule

Per Ponytail mode: non-trivial cleanup logic should leave ONE runnable check behind. For this plan, the standing check is:

```bash
# Ponytail: single command proving source-tree cleanliness post-cleanup
rg "@supabase/|supabase-js|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|@vercel/|VERCEL_|RESEND_API_KEY" src/ scripts/ e2e/ tests/ --glob '!supabase/**' --glob '!.ai/**' 2>/dev/null
```

Expected: 0 hits (or only `comment-historical` references with surrounding context). If anything matches → cleanup is incomplete.

This belongs in `LOOP_LEDGER.md` Wave 4 final check.
