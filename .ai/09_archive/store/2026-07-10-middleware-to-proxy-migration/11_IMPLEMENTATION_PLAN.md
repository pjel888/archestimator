# Implementation Plan

## Phase overview

| Phase | Scope | Status | Blocker |
|---|---|---|---|
| Phase 1 | Doc-only: in-source comment + state-doc reconciliation + README note | `IMPLEMENTATION-READY` (after owner approval) | None |
| Phase 2 | Optional: scratch-build experiment to re-verify OpenNext 1.20.1 behavior | `IMPLEMENTATION-READY` (after owner approval) | None |
| Phase 3 | BLOCKED: rename `src/middleware.ts` → `src/proxy.ts` + update 13 files | `NOT READY` | OpenNext Cloudflare proxy.ts support |
| Phase 4 | Ongoing: monitor upstream + optional OSS contribution | `IMPLEMENTATION-READY` (passive monitoring) | None |

Each phase below uses the Ultragoal-style durable-goal ledger pattern.

---

## Phase 1: Doc-only hardening (recommended immediate action)

**Goal ID:** GOAL-PHASE-1-DOC-HARDENING
**Objective:** Document the intentional `middleware.ts` choice at the warning site + canonical state doc + README.

### Work packages

#### WP-1.1: Add explanatory comment in `src/middleware.ts`

**File:** `src/middleware.ts`
**Change:** Insert a 3-5 line comment immediately above `export function middleware(request: NextRequest) {` explaining:
- Next.js 16 deprecated `middleware` in favor of `proxy`
- OpenNext Cloudflare 1.20.1 (current) does not honor `proxy.ts`
- See this plan pack: `.ai/03_plans/2026-07-09/middleware-to-proxy-migration/`
- Do NOT rename without verifying OpenNext support + updating all 13 reference sites

**Suggested comment shape:**
```typescript
// ponytail: middleware.ts is intentional despite Next.js 16 deprecation warning.
// OpenNext Cloudflare 1.20.1 does not honor src/proxy.ts as Edge entrypoint.
// See .ai/03_plans/2026-07-09/middleware-to-proxy-migration/ for full context.
// Rename requires updating 13 reference sites + verifying OpenNext proxy.ts support.
```

**Verification:** `git diff src/middleware.ts` shows only the added comment; `bun run test:dom` still passes 26 middleware-related tests; `bun run type-check` passes.

#### WP-1.2: Reconcile `.ai/10_state/current-state.md`

**File:** `.ai/10_state/current-state.md`
**Change:** Mark lines 861-867 as superseded. Add a Jul-9 entry citing this plan pack and the Jul-8 commit `5558c5fa4`. Update lines 4176, 4186 (and similar stale `src/proxy.ts` references in present tense) to reflect that `src/middleware.ts` is the current entrypoint.

**Suggested approach:** Use `rg "src/proxy\.ts"` against the file to enumerate stale references; for each, either mark as historical (if clearly a log entry) or update to current truth.

**Verification:** `rg "src/proxy\.ts" .ai/10_state/current-state.md` returns only historical/log entries; no present-tense claims remain.

#### WP-1.3: Add note to `README.md`

**File:** `README.md`
**Change:** In the "Project structure" section (around line 176), update the `middleware.ts` entry to indicate the deprecation is intentional. Suggested:

```
├── middleware.ts                   # Next.js Edge middleware (NOT renamed to proxy.ts — OpenNext Cloudflare 1.20.1 does not honor proxy.ts; see .ai/03_plans/2026-07-09/middleware-to-proxy-migration/)
```

**Verification:** `grep "middleware.ts" README.md` shows the updated entry.

### Durable-goal contract

| Field | Value |
|---|---|
| Goal ID | GOAL-PHASE-1-DOC-HARDENING |
| Objective | Make the intentional middleware.ts choice self-explanatory at the warning site |
| Scope | 3 files (src/middleware.ts comment, README.md note, .ai state-doc reconciliation) |
| Requirements covered | REQ-001, REQ-005, REQ-008 |
| Required evidence | `git diff` of 3 files; `bun run test:dom` still passes; `bun run type-check` passes |
| Completion audit | All 3 files updated; cross-references resolve; no other files touched |
| Checkpoint artifacts | `git diff --stat` output saved to evidence/ |
| Stop condition | All 3 files updated + verify commands green |
| Blocker condition | Owner declines to approve; OR concurrent agent edit conflict |
| Review gate | Owner review of diff before merge |
| QA gate | Phase 1 is doc-only; no functional QA needed |

---

## Phase 2: Scratch-build experiment (optional, on-demand)

**Goal ID:** GOAL-PHASE-2-SCRATCH-VERIFY
**Objective:** Empirically verify whether OpenNext Cloudflare 1.20.1 can consume a `src/proxy.ts`-sourced Next.js 16 build.

### Work packages

#### WP-2.1: Create scratch copy of repo

**Approach:** Use `cp -r` to a `/tmp/` directory OR use `git stash` + scratch edit + restore. The `cp -r` approach is safer (no shared-worktree risk).

**Steps:**
1. `cp -r /Users/philiplewis/Documents/archestimator /tmp/archestimator-proxy-experiment`
2. `cd /tmp/archestimator-proxy-experiment`
3. `git status` (clean expected; this is a snapshot)

#### WP-2.2: Apply rename in scratch copy

**Steps:**
1. `mv src/middleware.ts src/proxy.ts`
2. Edit `src/proxy.ts`: change `function middleware` → `function proxy`
3. Update tests (just to make build runnable): `tests/vitest/proxy-file-convention.test.ts` — temporarily skip or rewrite assertions
4. Do NOT update scripts or README — they don't affect the build

#### WP-2.3: Run cf:build in scratch copy

**Command:** `cd /tmp/archestimator-proxy-experiment && bun install --frozen-lockfile && bun run cf:build`

**Capture:**
- Exit code
- Stdout/stderr
- Inspect `.next/middleware-manifest.json` (does it have the same keys as a `middleware.ts`-sourced build?)
- Inspect `.open-next/` output

#### WP-2.4: Compare with control build

**Control:** Run `bun run cf:build` on the unchanged main repo. Compare manifest contents.

#### WP-2.5: Cleanup

**Steps:**
1. `cd /Users/philiplewis/Documents/archestimator` (back to main repo)
2. `rm -rf /tmp/archestimator-proxy-experiment`
3. Verify `git status` on main repo is still clean

### Durable-goal contract

| Field | Value |
|---|---|
| Goal ID | GOAL-PHASE-2-SCRATCH-VERIFY |
| Objective | Empirical answer to "does OpenNext 1.20.1 support proxy.ts?" |
| Scope | /tmp/ scratch copy only; zero edits to main repo |
| Requirements covered | REQ-006 (partial), ASSUMP-002 (validation) |
| Required evidence | `cf:build` exit code + `.next/middleware-manifest.json` diff (scratch vs control) |
| Completion audit | Experiment ran, evidence captured, scratch cleaned up |
| Checkpoint artifacts | `evidence/phase2-build-output.txt`, `evidence/phase2-manifest-diff.txt` |
| Stop condition | Build succeeds OR fails deterministically |
| Blocker condition | `cf:build` hangs > 10 minutes → kill and report |
| Review gate | Owner reviews finding before considering Phase 3 |
| QA gate | N/A (experiment, not feature) |

### Possible outcomes

| Outcome | Implication |
|---|---|
| Build succeeds + manifest matches control | OpenNext silently supports proxy.ts. Phase 3 unblocks. Philip's Jul-8 revert was for a different reason. Update plan. |
| Build succeeds + manifest differs | OpenNext partially handles proxy.ts; runtime behavior unknown. Run cf:deploy to staging to verify. |
| Build fails | Confirms OpenNext 1.20.1 does not support proxy.ts. Phase 3 remains blocked. Phase 4 monitoring activated. |

---

## Phase 3: Rename (BLOCKED)

**Goal ID:** GOAL-PHASE-3-RENAME
**Objective:** Rename `src/middleware.ts` → `src/proxy.ts` and update all 12 reference sites atomically.

**BLOCKER:** Phase 2 must confirm OpenNext supports proxy.ts (either via empirical scratch-build OR upstream release notes).

### Work packages (in execution order)

#### WP-3.1: Update Phase 3 plan based on Phase 2 findings

If Phase 2 reveals unexpected manifest behavior, adjust the rename sequence accordingly.

#### WP-3.2: Atomic rename + reference update

Single atomic commit (or serialized small commits in correct order):

1. Rename `src/middleware.ts` → `src/proxy.ts`
2. Edit `src/proxy.ts`: `function middleware` → `function proxy`
3. Update `tests/vitest/auth-proxy.test.ts`: 22 import sites (use `replaceAll` with `@/middleware` → `@/proxy`)
4. Rewrite `tests/vitest/proxy-file-convention.test.ts`: invert assertions
5. Update `tests/vitest/proxy-sensitive-cache-headers.test.ts`: imports
6. Update `tests/vitest/provider-exit-pack-script.test.ts`: assertions
7. Update `tests/vitest/cloudflare-latest-deploy-source-smoke-script.test.ts`: assertions
8. Update 6 scripts: replace `"src/middleware.ts"` → `"src/proxy.ts"` (use `replaceAll`)
9. Update `README.md` lines 176, 270
10. Update `e2e/route-transition-performance.spec.ts` (verify reference)

#### WP-3.3: Validation gate

```bash
bun run type-check
bun run lint
bun run test:dom           # 26 tests must pass
bun run cf:build           # must succeed
bun run cf:check-readiness # must succeed
```

Optional: `bun run cf:preview` for local runtime verification.

#### WP-3.4: Deploy verification

Per `AGENTS.md` deploy mandate: production deploy requires owner authorization.

### Durable-goal contract

| Field | Value |
|---|---|
| Goal ID | GOAL-PHASE-3-RENAME |
| Objective | Migrate to Next.js 16 proxy convention end-to-end |
| Scope | 13 files |
| Requirements covered | REQ-001, REQ-002, REQ-003, REQ-004, REQ-006 |
| Required evidence | All 4 validation commands green; cf:build artifact present; manifest diff matches Phase 2 control |
| Completion audit | 13-file diff review; 26 tests green; build green |
| Checkpoint artifacts | Pre-rename commit SHA, post-rename commit SHA, test output |
| Stop condition | All validation gates pass |
| Blocker condition | Any validation fails → revert immediately |
| Review gate | Owner + independent code reviewer |
| QA gate | Adversarial QA per `12_TEST_AND_VALIDATION_STRATEGY.md` |

---

## Phase 4: Upstream monitoring (ongoing)

**Goal ID:** GOAL-PHASE-4-UPSTREAM-MONITOR
**Objective:** Detect when OpenNext Cloudflare adds `proxy.ts` support so Phase 3 can unblock.

### Work packages

#### WP-4.1: Subscribe to OpenNext release notifications

- Watch `@opennextjs/cloudflare` on npm
- Watch `cloudflare/workers-sdk` and `opennextjs/cloudflare` on GitHub
- Keyword triggers: "proxy", "Next.js 16 middleware", "middleware deprecation"

#### WP-4.2: Periodic manual check (owner-driven)

- Monthly: review `node_modules/@opennextjs/cloudflare/CHANGELOG.md` after `bun install`
- On any `@opennextjs/cloudflare` version bump: re-read `dist/cli/build/utils/middleware.js` (or successor) for `proxy` handling

#### WP-4.3: Optional upstream contribution

If 90+ days pass without upstream support:
- Open issue on `opennextjs/cloudflare` describing the Next.js 16 deprecation + adapter gap
- Optionally: open PR adding `useNodeProxy()` utility
- Requires owner authorization for OSS contribution

### Durable-goal contract

| Field | Value |
|---|---|
| Goal ID | GOAL-PHASE-4-UPSTREAM-MONITOR |
| Objective | Detect upstream unblock signal |
| Scope | Passive monitoring + optional OSS contribution |
| Requirements covered | REQ-007 |
| Required evidence | Periodic log entry in `.ai/10_state/current-state.md` confirming check ran |
| Completion audit | Trigger Phase 3 when signal detected |
| Stop condition | OpenNext proxy.ts support confirmed |
| Blocker condition | None (passive) |
| Review gate | None |
| QA gate | None |

---

## Available-Agent-Types Roster (for future execution handoff)

When owner approves Phase 1 (or any future phase), the following agents are suitable:

| Phase | Recommended agent | Suggested reasoning level | Why |
|---|---|---|---|
| Phase 1 | `task(category="quick", load_skills=["git-master"])` | low | Doc-only, 3 files, atomic commit |
| Phase 2 | `task(subagent_type="explore")` for setup + lead for build | medium | Experiment design + capture |
| Phase 3 | `task(category="deep", load_skills=["git-master", "ecc:typescript-reviewer"])` + parallel `task(subagent_type="oracle")` for review | high | 13-file atomic change with auth-gate risk |
| Phase 4 | Owner manual / lead periodic check | low | Passive |

## Goal-Mode Follow-up Suggestions

- **Default:** `$ultragoal` for Phase 1–3 durable goal tracking
- **Not recommended:** `$autoresearch-goal` (not a research project)
- **Not recommended:** `$performance-goal` (not a perf optimization project)

## Team Launch Hints

If owner prefers coordinated parallel execution:

```
$team --plan .ai/03_plans/2026-07-09/middleware-to-proxy-migration/11_IMPLEMENTATION_PLAN.md
```

Team verification path:
- Worker 1: Phase 1 doc edits
- Worker 2 (parallel, read-only): verify all reference sites are correctly cataloged
- Lead: integrate, run validation, commit

## Ralph Fallback

Not recommended. Ralph is for persistent single-owner verification loops; this plan is bounded and atomic. Use `$ultragoal` instead.
