# Risk Register and Rollback Strategy

**Plan:** Vercel + Supabase Cleanup (2026-07-04)
**Status:** Planning

---

## Risk register

| ID | Risk | Likelihood | Impact | Severity | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R-01 | Deleting `src/lib/supabase/types.ts` breaks hidden type imports (e.g. via `import type` from a poorly-grepped path) | Low | Medium | LOW | WS-A task A-1 explicitly greps all path variants; type-check runs immediately after deletion (A-4) | build lane |
| R-02 | Fixing the 2 e2e specs (F-001) requires creating a D1-seed helper that itself has bugs | Medium | Medium | MEDIUM | WS-C task C-3 establishes the helper as a shared file under `e2e/support/`; targeted run validates before moving on | QA lane |
| R-03 | `.env.local` cleanup removes a var that Better Auth or another active service still uses | Low | High | MEDIUM | WS-D task D-1 explicitly lists only `SUPABASE_*`, `RESEND_*`, Postgres-shaped `DATABASE_URL` for removal; all other vars preserved | dev lane |
| R-04 | Leaked Supabase service-role key is abused before rotation completes | Low (Low likelihood but High consequence) | High | HIGH | WS-D task D-2 makes rotation mandatory; owner must rotate BEFORE merging the cleanup branch | owner |
| R-05 | Archiving a STALE spec breaks a link in another active doc | Medium | Low | LOW | WS-E tasks E-1 to E-9 include scanning for inbound links before archiving; superseded banner points readers to current replacement | tech-writing lane |
| R-06 | Deleting a legacy check script breaks a `package.json` script entry another tool depends on | Low | Low | LOW | WS-B task B-1 verifies no other script imports the deleted file before deletion; `bun install --frozen-lockfile` validates after | build lane |
| R-07 | Test cascade (WS-C task C-4) misclassifies a test as `comment-historical` when it's actually load-bearing | Medium | Medium | MEDIUM | Each test must be read before classification; failing tests after WS-B deletions are the backstop signal | QA lane |
| R-08 | `supabase/` folder disposition (Option B - move to archive) breaks migration-exit evidence references | Low | Medium | LOW | WS-F task F-2 Option A (leave in place + banner) is preferred to Option B for exactly this reason; Option B requires path-reference updates | dev lane |
| R-09 | Cleanup branch diverges from `main` and conflicts with concurrent work | Medium | Low | LOW | Wave 0 step 0.2 stashes unrelated dirty work; cleanup branch is short-lived (~1 day); rebase before merge | dev lane |
| R-10 | Owner disengages during disposition decisions (B-3 proof scripts, F-2 supabase folder) | Medium | Low | LOW | Stop condition (per `03_IMPLEMENTATION_PLAN.md`) — pause Wave 3, document in `LOOP_LEDGER.md`, resume when owner returns | owner |
| R-11 | Hidden stale reference discovered post-merge (e.g. in `.design-shots/` or `.headroom/` cache) | Medium | Trivial | TRIVIAL | Wave 4 step V-4.9 runs comprehensive scan; post-merge findings can be addressed in a follow-up PR | dev lane |
| R-12 | Provider-exit pack (`bun run cf:provider-exit-pack`) generates evidence that contradicts cleanup claims | Low | Medium | LOW | If evidence pack shows live legacy references, investigate before declaring complete | dev lane |
| R-13 | CI fails on cleanup branch due to a workflow that still expects Vercel/Supabase env | Low | Medium | LOW | WS-G task G-1 scans `.github/workflows/ci.yml` before merge; if found, update or remove the workflow step | dev lane |

---

## Blast radius analysis

### High-blast-radius changes (require extra care)

| Change | Blast radius | Why high |
|---|---|---|
| Sanitizing `.env.local` (F-002) | Local dev environment | If a Better Auth or AI var is accidentally removed, local dev breaks for everyone on the team |
| Deleting `src/lib/supabase/types.ts` (F-010) | Source compile | If any hidden importer exists, type-check fails across the codebase |
| Archiving 2 STALE specs (F-003, F-004) | Agent context | If another agent has a stale link, it may produce contradictory plans |
| Fixing 2 e2e specs (F-001) | E2E suite | The D1-seed helper pattern becomes a precedent — if wrong, future e2e specs inherit the bug |

### Medium-blast-radius changes

| Change | Blast radius |
|---|---|
| Deleting 6 legacy check scripts (F-007) | Anyone running `bun run cf:check-supabase-*` or `cf:check-vercel-*` |
| Archiving 2 STALE roadmap items (F-005, F-006) | Anyone linking to the roadmap |
| Deleting `.vercel/` (F-012) | Anyone with Vercel CLI still configured locally |
| Updating `AGENTS.md:97` (F-013) | All agents reading the loop vocabulary |

### Low-blast-radius changes

| Change | Blast radius |
|---|---|
| Test cascade (F-014) | Test suite only — validated by `bun run test` |
| Backfill script archive (F-008) | Historical evidence only |
| Proof script disposition (F-009) | Historical evidence only |
| `supabase/` folder banner (F-011) | Documentation only |
| `.gitignore` line removal (F-015, F-018) | Git only |

---

## Rollback strategy

### Per-wave rollback

| Wave | Rollback trigger | Rollback action |
|---|---|---|
| Wave 0 | Baseline build fails | Do not start cleanup; investigate baseline first |
| Wave 1 | Any HIGH fix causes unrelated failure | `git reset --hard pre-cleanup-2026-07-04` (the Wave 0 tag) — full rollback to pre-cleanup state |
| Wave 2 | MEDIUM fix breaks test suite | `git revert <wave-2-commit>` — revert just Wave 2; Wave 1 stays |
| Wave 3 | LOW fix cascade misclassifies a test | `git revert <specific-commit>` — targeted revert per finding |
| Wave 4 | Final validation fails | Re-enter Wave 3 (return-to-plan per Multi-Agent Execution Directive §8) |

### Full rollback (nuclear option)

If the cleanup branch is fundamentally broken:

```bash
git checkout main
git branch -D cleanup/vercel-supabase-2026-07-04
# pre-cleanup-2026-07-04 tag preserves the pre-state
# post-cleanup-2026-07-04 tag should NOT be created if rollback is needed
```

### Credential rollback (special case)

If `.env.local` sanitization accidentally removes a needed var:

```bash
# .env.local is gitignored, so git revert won't restore it
# Restore from the snapshot taken in Wave 0 step 0.5
# (LOOP_LEDGER.md should record the pre-cleanup .env.local content)
```

**Recommendation:** Before Wave 1 Lane 1B (D-1), manually copy `.env.local` to `.env.local.pre-cleanup-backup` so it can be restored without git.

---

## Operational runbook

### Pre-merge checklist

- [ ] All Wave 1-3 proofs pass
- [ ] `bun run validate` exit 0
- [ ] `bun run build` exit 0
- [ ] Targeted e2e suite (`estimate-tabs`, `estimate-tree-dnd`) exit 0
- [ ] Owner has rotated Supabase service-role key (attestation in `LOOP_LEDGER.md`)
- [ ] Owner has rotated Resend API key (attestation)
- [ ] `LOOP_LEDGER.md` final entry records completion
- [ ] `git diff main..cleanup/vercel-supabase-2026-07-04` reviewed — only cleanup changes

### Merge strategy

**Recommended:** Squash-merge to `main` with conventional-commit message:

```
chore: remove Vercel + Supabase remnants post-Cloudflare migration

Cleanup plan: .ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/

Removed:
- 6 legacy check-supabase/check-vercel scripts + package.json entries
- .vercel/ folder + .vercelignore
- .env.local Supabase/Resend credentials (rotated)
- src/lib/supabase/ dead types folder
- 4 tests of deleted legacy scripts

Archived:
- 2 STALE specs (supabase-auth-setup, state-and-supabase-foundation)
- 2 STALE roadmap items (supabase-rls, vercel-env-readiness)
- 7 one-shot D1 backfill scripts (already executed)

Fixed:
- e2e/estimate-tabs.spec.ts and e2e/estimate-tree-dnd.spec.ts (replaced
  @supabase/supabase-js with D1 seed helper)
- AGENTS.md:97 stale vercel:agent-browser reference
- supabase/ folder banner formalizing migration-archaeology status

Verification:
- bun run validate: PASS
- bun run build: PASS
- targeted e2e: PASS
```

### Post-merge

- [ ] Tag `post-cleanup-2026-07-04` on the merge commit
- [ ] Update `.ai/10_state/current-state.md` FAST PATH block (note cleanup complete)
- [ ] Delete cleanup branch: `git branch -D cleanup/vercel-supabase-2026-07-04`
- [ ] Remove `.env.local.pre-cleanup-backup` after 7-day observation period
- [ ] Schedule 30-day follow-up audit to catch any latent stale references

---

## Stop-the-line conditions

**STOP IMMEDIATELY** if any of these occur:

1. **Credential discovery** beyond what's documented in F-002 → escalate to owner before continuing.
2. **Test suite failure cascade** where more than 5 unrelated tests fail after a WS-B deletion → rollback, investigate.
3. **Build failure** that can't be attributed to a specific cleanup change → rollback to Wave 0 tag.
4. **Owner revokes authorization** during implementation → preserve progress, pause.
5. **Discovery of active Supabase/Vercel runtime dependency** (not just dead code) → this would invalidate the migration's completion claim and requires owner decision.
