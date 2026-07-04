# Implementation Plan — Waves, Sequencing, and Parallelism

**Plan:** Vercel + Supabase Cleanup (2026-07-04)
**Status:** Planning — awaiting owner approval

---

## Wave plan

The cleanup is organized into 5 waves. Within each wave, all tasks are parallel-safe unless noted. Between waves, dependencies must be respected.

```
Wave 0 (Pre-flight)  → Wave 1 (HIGH severity)    → Wave 2 (MEDIUM) → Wave 3 (LOW) → Wave 4 (Closeout)
```

### Wave 0 — Pre-flight (15 min, single agent)

**Goal:** Lock the working tree, confirm baseline build passes, capture pre-state.

| Step | Action | Tool |
|---|---|---|
| 0.1 | `git status --short --branch` | bash |
| 0.2 | Stash or commit any unrelated dirty work (DO NOT overwrite) | git |
| 0.3 | Create cleanup branch: `git checkout -b cleanup/vercel-supabase-2026-07-04` | git |
| 0.4 | Baseline: `bun run type-check && bun run lint && bun run test && bun run test:dom` | bash |
| 0.5 | Record baseline test count + pass rate in `LOOP_LEDGER.md` | edit |
| 0.6 | Snapshot: `git tag pre-cleanup-2026-07-04` (rollback anchor) | git |

**Gate to Wave 1:** Wave 0.4 exits 0 (or pre-existing failures explicitly noted).

---

### Wave 1 — HIGH severity fixes (parallel-safe across lanes)

**Goal:** Eliminate the 4 HIGH-severity findings (F-001, F-002, F-003, F-004).

#### Lane 1A: Source + e2e (F-001, F-010) — single agent

```
WS-A (A-1 → A-3, A-4)
  ↓
WS-C task C-3 (e2e fix)
  ↓
WS-C task C-5 (other e2e review)
```

**Why sequenced:** C-3 needs the D1-seed helper. If `src/lib/supabase/types.ts` has active importers, A-3 must land before C-3.

#### Lane 1B: Env sanitization (F-002) — single agent, parallel to 1A

```
WS-D tasks D-1, D-3, D-4
  ↓
WS-D task D-2 (owner rotation, outside repo)
```

**Parallel-safe with 1A** (no shared files).

#### Lane 1C: Documentation HIGH fixes (F-003, F-004) — single agent, parallel to 1A/1B

```
WS-E task E-1 (archive 2 STALE specs)
```

**Parallel-safe with 1A and 1B** (different files).

**Gate to Wave 2:** All Wave 1 lanes complete. Wave 1 verification (`04_VERIFICATION_AND_PROOF.md` section "Wave 1 proofs") passes.

---

### Wave 2 — MEDIUM severity fixes (parallel-safe across lanes)

**Goal:** Eliminate MEDIUM findings (F-005, F-006, F-007, F-010 if not done in Wave 1, F-012).

#### Lane 2A: Scripts dead-code purge (F-007) — single agent

```
WS-B task B-1 (delete 6 check-supabase/check-vercel scripts + package.json entries)
```

#### Lane 2B: Folder cleanup (F-012) — single agent, parallel to 2A

```
WS-F task F-1 (delete .vercel/, .vercelignore, .gitignore:57-58)
```

#### Lane 2C: Documentation MEDIUM fixes (F-005, F-006) — single agent, parallel to 2A/2B

```
WS-E task E-2 (archive 2 STALE roadmap items)
WS-E task E-3 (fix AGENTS.md:97 stale tool reference)
```

**Gate to Wave 3:** Wave 2 verification passes. Test cascade (C-1) starts to validate that deleting legacy scripts didn't break tests.

---

### Wave 3 — LOW severity + archaeology disposition (mostly parallel)

**Goal:** Address LOW findings (F-008, F-009, F-011, F-014) and TRIVIAL (F-013, F-015, F-018).

#### Lane 3A: Test cascade (F-014) — single agent

**Depends on:** Wave 2 Lane 2A (legacy scripts deleted).

```
WS-C task C-1 (delete 4 high-confidence legacy tests)
WS-C task C-2 (archive tests of backfill scripts)
WS-C task C-4 (review remaining 190+ tests)
```

#### Lane 3B: Backfill script archive (F-008) — single agent, parallel to 3A

```
WS-B task B-2 (move 7 backfill scripts to supabase/migration-evidence/backfill-scripts/)
WS-B task B-4 (move scripts/sql/ to supabase/migration-evidence/sql/)
```

#### Lane 3C: Proof script decision (F-009) — owner action

```
Owner decides: keep / archive / delete (recommend archive per WS-B task B-3)
WS-B task B-3 executed per owner decision
```

#### Lane 3D: supabase/ folder formalization (F-011) — single agent

```
WS-F task F-2 (add banner README per Option A OR move to archive per Option B)
```

#### Lane 3E: Doc review (F-017 misc scripts, .ai/00_system, .ai/10_state) — single agent

```
WS-B task B-5 (review 14 misc scripts)
WS-E task E-4 (scan .ai/00_system/ 4 files)
WS-E task E-5 (scan .ai/01_roadmap/ remaining 31 files)
WS-E task E-6 (scan .ai/10_state/ 4 files)
WS-E task E-7 (scan .ai/06_specs/ remaining files)
WS-E task E-9 (scan tooling caches)
```

**Gate to Wave 4:** Wave 3 verification passes.

---

### Wave 4 — Closeout (single agent)

**Goal:** Final CI check, evidence pack, plan completion.

| Step | Action |
|---|---|
| 4.1 | Run full validation: `bun run validate && bun run build` |
| 4.2 | Run targeted E2E: `bun run test:e2e` (focus on estimate-tabs + estimate-tree-dnd per C-3) |
| 4.3 | WS-G task G-1 (scan `.github/workflows/ci.yml`) |
| 4.4 | WS-H task H-1 (run `bun run cf:provider-exit-pack`) |
| 4.5 | Update `LOOP_LEDGER.md` with final test counts + verification artifacts |
| 4.6 | Update `.ai/10_state/current-state.md` FAST PATH block — note cleanup complete |
| 4.7 | Tag: `git tag post-cleanup-2026-07-04` |
| 4.8 | Owner review + merge to `main` |

---

## Parallelism matrix

| WS | Wave | Parallel with |
|---|---|---|
| WS-A (Source) | 1A | 1B, 1C |
| WS-D (Env) | 1B | 1A, 1C |
| WS-E-1 (HIGH specs) | 1C | 1A, 1B |
| WS-B-1 (Scripts delete) | 2A | 2B, 2C |
| WS-F-1 (Folders) | 2B | 2A, 2C |
| WS-E-2,3 (MEDIUM docs) | 2C | 2A, 2B |
| WS-C (Tests cascade) | 3A | 3B, 3C, 3D, 3E (after B-1 done) |
| WS-B-2 (Backfill archive) | 3B | 3A, 3C, 3D, 3E |
| WS-B-3 (Proof scripts) | 3C | 3A, 3B, 3D, 3E |
| WS-F-2 (supabase/ banner) | 3D | 3A, 3B, 3C, 3E |
| WS-E 4-9 (Doc reviews) | 3E | 3A, 3B, 3C, 3D |

**Maximum theoretical concurrency:** 3 lanes (Waves 1 and 2). Wave 3 can sustain up to 5 lanes if owner dispositions B-3 in time.

---

## Critical path

```
Wave 0 (15m) → Wave 1A (45m) → Wave 2A (30m) → Wave 3A (60m) → Wave 4 (45m)
```

**Estimated total wall-clock:** ~3.5 hours single-agent; ~1.5 hours with 3 parallel lanes.

---

## Stop conditions

Per Multi-Agent Execution Directive §8 (Execution Loop) and §13 (Blockers and Escalation):

1. **Block — credential discovery:** If any new Supabase/Vercel/Resend credential is found during cleanup that wasn't in the audit → STOP, do not delete the file containing it, escalate to owner.
2. **Block — test red after script deletion:** If deleting a legacy script causes unrelated tests to fail (not cascade tests) → STOP, investigate, do not delete the test.
3. **Block — e2e spec cannot be repaired:** If C-3 (e2e fix) requires a deeper D1-seed refactor than expected → STOP, document, escalate.
4. **Stop — owner disengages:** If owner stops responding during disposition decisions (B-3, F-2 options) → pause Wave 3, document blocker in `LOOP_LEDGER.md`.

---

## Anti-scope-creep guardrails

Per Multi-Agent Execution Directive §0: this is `planning-only` until owner approves implementation. Even after approval:

1. **NO** unrelated refactors (e.g. "while I'm here, let me also clean up these imports").
2. **NO** design changes (CSS, component structure, route shape).
3. **NO** feature additions or removals (legacy scripts being deleted are dead code, not features).
4. **NO** migration re-runs or provider mutations.
5. **NO** changes to `.ai/00_system/` core protocols beyond stale-link fixes.

Any agent executing this plan must reference the user's verbatim instruction: *"This is not a coding task, this is a planning, audit task."* Implementation requires fresh authorization.
