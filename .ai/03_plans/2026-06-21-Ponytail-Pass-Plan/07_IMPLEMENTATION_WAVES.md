# 07 — Implementation Waves

**Date:** 2026-06-21 · **Status:** PLANNING / READINESS ONLY

This document defines the phased execution plan for the Ponytail Pass. Waves are ordered by **payoff / risk ratio** — highest payoff with lowest risk first. Each wave is independently shippable. Each wave has its own verification gate (see `08_VERIFICATION_STRATEGY.md`).

## Wave map

| Wave | Scope | Risk | Owner gate? | Estimated effort | Payoff |
|------|-------|------|-------------|-----------------|--------|
| **Wave 1A** | Zero-risk dep removals (T1.1, T1.2) | Zero | No | ~5 min | 2 deps removed |
| **Wave 1B** | Contained dep swaps/narrowing (T1.3, T1.4) | Low-to-medium | No | ~10-20 min | 1 dep swapped, 1 umbrella narrowed |
| **Wave 2A** | Owner decisions: visual deps (T1.5-T1.8) + speculative features (SF.1, SF.2) | Medium | **Yes** | ~30 min decision session | Decision records, not source edits |
| **Wave 2B** | Owner-free quick cuts (T3.1-T3.5) | Low-to-high by item | No | ~1-2 hours | 5 small fixes with targeted gates |
| **Wave 2C** | Validated backlog quick cuts/evaluations (T3.6-T3.14) | Low-to-high by item | Item-specific | ~2-4 hours | 9 more refactor/evaluation units |
| **Wave 3 (ongoing)** | Mega-file diffs (T2.1-T2.7) via `/ponytail-review` | Medium-to-high | No (per-diff) | Ongoing | Diff-by-diff shrinkage; no one-shot refactor |

---

## Wave 1 — Dependency removals and contained swaps

**Goal:** Remove unused dependencies and swap/narrow contained dependencies. T1.1/T1.2 are zero-risk. T1.3/T1.4 are contained but require targeted analytics/chart proof.

**Owner gate:** No. These are safe code-only changes.

**Prerequisite:** Check `git log` — if `2026-06-14-Codebase-Cleanup-Plan` already executed any of T1.1/T1.2/T1.4, skip them.

### Wave 1 steps (in order — **T1.1/T1.2 ✅ DONE; start at T1.3**)

> **2026-06-24 audit:** Step 1.1 (`class-variance-authority`) executed via commit `e65e2848` on 2026-06-23. Step 1.2 (`three`) executed 2026-06-24 via the React Doctor warning cleanup pass (`.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md`). Start Wave 1A residuals at Step 1.3.

#### ~~Step 1.1 — Remove `class-variance-authority` (T1.1)~~ ✅ DONE 2026-06-23

> Commit: `e65e2848` "chore(deps): remove class-variance-authority and use local react-doctor binary". Confirmed absent from `package.json` and 0 importers as of 2026-06-24 audit.

#### ~~Step 1.2 — Remove `three` (T1.2)~~ ✅ DONE 2026-06-24

> Removed as part of the React Doctor warning cleanup pass (`.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md`). `package.json` confirms `three` and `@types/three` are absent. Confirmed 0 importers as of 2026-06-24 audit.

#### Step 1.3 — Swap `@next/third-parties` → `next/script` (T1.3)

**Critical:** Must preserve `window.gtag` for `experiment-tracker.ts`.

```bash
# Pre-check
rg -l "@next/third-parties" src
# Expected: only src/components/landing/LandingAnalyticsLoader.tsx

# Read the existing pattern + the experiment tracker
cat src/components/landing/ClarityScript.tsx
cat src/lib/ab-testing/experiment-tracker.ts   # note window.gtag / window.clarity usage

# Rewrite LandingAnalyticsLoader.tsx to use next/script with GA tag
# CRITICAL: explicitly assign window.gtag = gtag; in the inline script
# (edit the file)

# Edit package.json — remove "@next/third-parties" line
bun install
bun run type-check
bun run build

# Run the 3 affected tests
bun run test:dom -- landing-ab-testing closed-beta-env-manifest project-publication-security

# Browser QA
bun run dev
# Open http://localhost:3000
# DevTools → Network → "google-analytics.com" — verify GA fires
# Console: typeof window.gtag — must be "function"
# Verify consent banner still gates GA correctly
# Trigger an experiment view — verify gtag('event', ...) fires
```

**Gate:** `type-check` exit 0, `build` exit 0, 3 tests pass, GA fires in browser, `window.gtag` defined, consent respected, experiment tracking fires.

#### Step 1.4 — Narrow `d3` → `d3-shape` (T1.4, Option A recommended)

```bash
# Pre-check: find all d3 imports
rg "from ['\"]d3['\"]|from ['\"]d3-" src
# Expected: only CostDonutChart.tsx importing from d3-shape

# Edit package.json — replace "d3" with "d3-shape", replace "@types/d3" with "@types/d3-shape"
# Edit CostDonutChart.tsx — update import path from "d3" to "d3-shape" (if needed)

bun install
bun run type-check
bun run build

# Run the 4 affected tests
bun run test:dom -- cost-donut-chart project-dashboard-charts

# Browser QA
bun run dev
# Open a project with charts
# Verify CostDonutChart renders correctly (donut shape, arcs, labels, hover state)
```

**Gate:** `type-check` exit 0, `build` exit 0, 4 tests pass, chart renders.

**Option B (inline native SVG math, −25 LOC, stricter ponytail):** Only pursue if bundle size is a launch gate. Must produce byte-identical SVG paths or `cost-donut-chart-hydration.test.tsx` breaks. See `04_TIER_1_DEPENDENCY_CLEANUP_PLAN.md` § T1.4 Option B.

### Wave 1 completion criteria

- [ ] T1.1 done — `class-variance-authority` removed, gates pass
- [ ] T1.2 done — `three` + `@types/three` removed, gates pass
- [ ] T1.3 done — `@next/third-parties` swapped to `next/script`, `window.gtag` preserved, GA fires, consent respected, experiment tracking fires, 3 tests pass
- [ ] T1.4 done — `d3` narrowed to `d3-shape` (Option A) or inlined (Option B), chart renders, 4 tests pass
- [ ] `bun run type-check && bun run build` exit 0, or any failure is documented as pre-existing in the fresh baseline from `08_VERIFICATION_STRATEGY.md`
- [ ] No NEW test failures (pre-existing failures are OK — see `08_VERIFICATION_STRATEGY.md`)

### Wave 1 commit

Single commit or 4 commits (one per step). Suggested commit message:

```
chore(deps): remove unused deps and swap @next/third-parties for next/script

- Remove class-variance-authority (0 imports)
- Remove three (0 imports)
- Swap @next/third-parties GoogleAnalytics → next/script (matches ClarityScript pattern)
- Narrow d3 → d3-shape (only d3-shape is imported)

Wave 1 of the Ponytail Pass Plan (.ai/03_plans/2026-06-21-Ponytail-Pass-Plan)
```

---

## Wave 2 — Owner decisions, quick cuts, and validated backlog

**Goal:** Owner decides which visual deps and speculative features survive closed beta. Owner-free quick cuts (barrels, casts, empty catches, hand-rolled HTML stripping) execute separately from those decisions. Validated second-pass findings become Wave 2C units or documented no-ops.

**Owner gate:** **Yes.** Visual dep decisions (T1.5-T1.8) and speculative feature decisions (SF.1, SF.2) require owner input. Quick cuts (T3.1-T3.5) do not.

**Prerequisite:** Wave 1 complete. Package/dependency edits are serialized because Wave 1 and visual swaps all touch `package.json`.

### Wave 2 lane split

| Lane | Scope | Can run without owner? | Serialization |
|---|---|---|---|
| Wave 2A | T1.5-T1.8 and SF.1/SF.2 decisions only | No | Owner decision session first |
| Wave 2B | T3.1-T3.5 quick cuts | Yes, except T3.5 security dependency approval if new dep is needed | Source/test files can parallelize; shared imports serialized by file |
| Wave 2C | T3.6-T3.14 backlog/evaluations | Mixed | Security-sensitive helpers and public routes use `14_SECURITY_AND_NETWORK_CONTRACTS.md` |

### Wave 2 steps

#### Step 2.1 — Owner decision: visual deps (T1.5-T1.8)

For each visual dep, the owner decides: **keep** or **swap**?

Use `13_VISUAL_DECISION_AND_QA_MATRIX.md` as the required decision record. Do not execute a visual swap from the short table below alone.

| Dep | Component | Visual effect | LOC delta (swap) | Risk | Keep | Swap to |
|-----|-----------|---------------|----:|---|------|---------|
| `@firecms/neat` | `NeatWireframeBackground.tsx` | WebGL wireframe background (patched v0.8.0 with `paused` support) | −130 | High | dep stays | CSS gradient + SVG noise (preserve reduced-motion/mobile gating + pause support) |
| `lenis` | `LandingSmoothScrollProvider.tsx` | Momentum smooth scroll (wraps `ReactLenis`) | −30 | Low-medium | dep stays | `scroll-behavior: smooth` + `scroll-margin-top` + `prefers-reduced-motion` (preserve `data-lenis-prevent` semantics or drop intentionally) |
| `rough-notation` | `HeroSection.tsx`, `LaunchFeatureHeading.tsx` | Hand-drawn underline/circle annotations on hero copy | −120 | Medium | dep stays | CSS `text-decoration: wavy underline` or SVG underline/circle overlay |
| `roughjs` | `AnimatedProposalRecordSection.tsx` | Sketch-style SVG illustration (cards, arrows, revision loop, bubble quote — ~684 LOC depend on it) | **−500** | High | dep stays | Authored SVG asset (static or CSS-animated), or drop illustration entirely |

For each **swap** decision, see `04_TIER_1_DEPENDENCY_CLEANUP_PLAN.md` § T1.5-T1.8 for the detailed step-by-step (including affected test files to run).

#### Step 2.2 — Owner decision: speculative features (SF.1, SF.2)

| Feature | Current state | Keep hidden | Cut |
|---------|---------------|-------------|-----|
| AI surface (SF.1) | Routes/UI default disabled | Code stays for future enable, with route-level denial while disabled | Remove routes/lib/components/tests; **keep audit tables + security tests** |
| Project-wide cursors (SF.2) | Project cursor flag default disabled; estimate-sheet cursor broadcast default enabled | Code stays | Remove project-wide cursor/presence surface only; keep estimate-sheet cursor broadcast, collaboration invitations, project members, estimate sheet members |

For each **cut** decision:
```bash
# Remove the surface
# KEEP audit tables + security tests (SF.1); keep sheet cursor collaboration (SF.2)
# Run targeted contract tests plus baseline-diff broad gates from 08.
bun run validate
bun run build
bun run test:dom
# Owner sign-off: confirm cut, not hidden
```

#### Step 2.3 — Quick cuts (T3.1-T3.5)

These do NOT require owner input. Execute in any order.

**T3.1 — Remove `src/components/landing/index.ts` barrel (if no importer uses it):**
```bash
rg "from ['\"]@/components/landing['\"]" src
# Expected: 7 source importers. Update each to direct file import, then delete the barrel.
bun run type-check && bun run build
```

**T3.2 — Remove `src/lib/activity/index.ts` barrel:**
```bash
rg "from ['\"]@/lib/activity['\"]" src
# Expected: 4 source importers plus tests/fixtures. Update source and tests to direct imports, then delete the barrel.
bun run type-check && bun run build
```

**T3.3 — Fix empty catches in `ProjectEstimatesTable.tsx:99-121`:**
```bash
# Read the file
# Either: handle the error (log + fallback) or drop the wrapper
# Add a test that verifies the error is no longer swallowed
bun run type-check && bun run test:dom && bun run build
```

**T3.4 — Remove `as unknown as` cast in `reusable-sources/actions.ts:192-217`:**
```bash
# Read the file
# Replace cast with typed helper or simpler branch
# Verify the optional query still handles null/undefined
bun run type-check && bun run test:dom && bun run build
```

**T3.5 — Replace hand-rolled HTML stripping in `sanitize-recipient-text.ts` (TRUST BOUNDARY — heavy verification):**
```bash
# Read the file
# Replace with a server-safe sanitizer path (DOMPurify + existing jsdom, or an isomorphic sanitizer)
# Run XSS payload test suite (see 08_VERIFICATION_STRATEGY.md)
bun run type-check && bun run test:dom -- project-publication-comments project-publication-decision share/recipient-content-escaping && bun run build
# Test with OWASP XSS payload list — verify all stripped
```

#### Step 2.4 — Validated backlog quick cuts/evaluations (T3.6-T3.14)

These were validated after the first pass and are executable only when each row's gate is satisfied.

| Item | Action | Gate | Owner/security gate |
|---|---|---|---|
| T3.6 collaboration invite auth boilerplate | Extract `assertInviteAccess` / `rateLimitInvite` helper | Collaboration action tests + deny-before-mutate cases | Use `14_SECURITY_AND_NETWORK_CONTRACTS.md` |
| T3.7 publication RBAC/limiter boilerplate | Extract `assertPublicationAccess` helper | Publication action tests + public-share route tests | Use `14_SECURITY_AND_NETWORK_CONTRACTS.md` |
| T3.8 Storybook fixtures | Trim static fixtures or move shared fixture data | Storybook-related static checks if present; no production gate needed | No owner gate unless screenshots change |
| T3.9 registry bridges | Inline sole consumer bridge; remove dormant telemetry sink only if still zero callers | Type-check + focused consumer tests | No |
| T3.10 hydration hook | Keep if name clarity is valuable; otherwise inline | Type-check + hydration tests | No |
| T3.11 date formatting | Extract one shared helper | Targeted format tests + affected UI tests | No |
| T3.12 query-string parsing | Extract shared parser only if a real third use or active edit justifies it | Targeted tests for ProjectDataClient and ComponentLibraryManager | No |
| T3.13 debounce | No extraction now; add `ponytail:` ceiling comment if touched | Type-check | No |
| T3.14 zero-client-caller routes | Keep health/webhook; evaluate public share routes with route contract before any cut | Public-share contract tests | Owner/security gate required |

### Wave 2 completion criteria

- [ ] Owner decisions recorded for T1.5-T1.8 and SF.1, SF.2
- [ ] All **swap** decisions executed and visually verified
- [ ] All **cut** decisions executed and baseline-diff verification shows no new failures
- [ ] T3.1-T3.5 executed (or documented why skipped)
- [ ] T3.6-T3.14 either executed with row-level gates or explicitly marked backlog/no-op with rationale
- [ ] `bun run build` exits 0 and broader gates show no new failures versus the recorded baseline
- [ ] No NEW test failures

### Wave 2 commits

Separate commits per logical change. Suggested grouping:
- `chore(landing): swap <dep> for CSS/SVG` (per visual dep swap)
- `chore(ai): cut AI surface for closed beta` (if SF.1 cut)
- `chore(collab): cut project cursors for closed beta` (if SF.2 cut)
- `refactor(barrels): remove landing and activity barrel re-exports`
- `fix(estimates): handle localStorage errors instead of swallowing`
- `refactor(reusable-sources): replace as-unknown-as cast with typed helper`
- `security(share): replace hand-rolled HTML stripping with DOMPurify`

---

## Wave 3 — Mega-file diffs (ongoing)

**Goal:** Shrink the 7 mega-files diff-by-diff, not in one shot. Run `/ponytail-review` on every PR that touches a Tier 2 file.

**Owner gate:** No (per-diff). But diffs >50 LOC should get owner review.

**Prerequisite:** Wave 1 complete. Wave 2 optional (but recommended — smaller dep tree makes mega-file diffs cleaner).

### Wave 3 protocol (per mega-file)

For each PR that touches a Tier 2 file:

1. **Before the PR:** Run `/ponytail-review` (OpenCode) or `@ponytail-review` (Codex) on the planned diff.
2. **Apply ponytail's delete-list** where safe, but explicitly preserve trust-boundary validation, data-loss handling, security, accessibility, auth/RLS, audit, and rate-limit invariants.
3. **Keep the diff ≤50 LOC** if possible. Smaller diffs are easier to review and revert.
4. **Gate:**
   ```bash
   bun run validate   # compare against the fresh baseline; no new failures allowed
   bun run build
   bun run test:dom
   ```
5. **Browser QA on the affected surface** (see `08_VERIFICATION_STRATEGY.md` for per-file QA steps).
6. **If any browser QA fails,** revert the diff and try again with a smaller change.

### Wave 3 mega-file priorities

Ordered by ponytail payoff (LOC cut potential) × safety (how contained the blast radius is):

| Priority | File | LOC | Strategy | See |
|---|------|----:|---|---|
| 1 | `src/lib/publication/actions.ts` | ~1538 | Extract shared auth/rate-limit helper | `05_TIER_2_MEGA_FILE_STRATEGY.md` |
| 2 | `src/lib/component-library/actions.ts` | ~1591 | Factor duplicated access checks | `05_TIER_2_MEGA_FILE_STRATEGY.md` |
| 3 | `src/lib/repositories/workspace-repository.ts` | 2695 | Separate access/query/mapping | `05_TIER_2_MEGA_FILE_STRATEGY.md` |
| 4 | `src/components/workshop/component-library/index.tsx` | 2541 | Peel off local hooks/helpers | `05_TIER_2_MEGA_FILE_STRATEGY.md` |
| 5 | `src/components/workshop/EstimateSheetContent.tsx` | 2950 | Split by concern | `05_TIER_2_MEGA_FILE_STRATEGY.md` |
| 6 | `src/lib/ai/read-context.ts` | 2023 | Break by intent/domain (only if AI kept) | `05_TIER_2_MEGA_FILE_STRATEGY.md` |
| 7 | `src/lib/ai/package-builder/draft.ts` | 2412 | Collapse by concern (only if AI kept) | `05_TIER_2_MEGA_FILE_STRATEGY.md` |

**Note:** T2.4 and T2.5 (AI mega-files) are only refactored if SF.1 decides to keep AI. If AI is cut, delete the files instead.

### Wave 3 completion criteria

Wave 3 is **ongoing** — there's no single completion. The success metric is: over time, the mega-files shrink. Track via:
- Monthly `/ponytail-audit` to measure LOC delta
- Every PR touching a Tier 2 file has a `/ponytail-review` in the PR description

### Wave 3 anti-patterns (DO NOT)

- **DO NOT one-shot refactor a mega-file.** "I'll just rewrite EstimateSheetContent.tsx this weekend" is how behavior regressions ship.
- **DO NOT skip `/ponytail-review`** because "the diff is small." Small diffs are exactly where ponytail catches over-build before it accumulates.
- **DO NOT add a new abstraction to a mega-file** without ponytail's 3+ callers check. Ponytail asks "does this need to exist?" — answer honestly.
- **DO NOT refactor a mega-file while another agent is editing it.** Check `git status` and the agent coordination ledger first.

---

## Wave timing summary

| Wave | When | Duration | Ship cadence |
|------|------|----------|--------------|
| Wave 1 | Immediately (no owner gate) | ~15 min | Single PR |
| Wave 2 | After owner input session | ~2-4 hours | 3-7 PRs (one per logical change) |
| Wave 3 | Ongoing, starting after Wave 1 | Ongoing | Per-PR, continuous |

## What NOT to do

- **Do not execute Wave 2 without owner input.** Visual dep swaps and feature cuts are owner decisions.
- **Do not execute Wave 3 as a one-shot.** Mega-file refactors are diff-by-diff only.
- **Do not skip the verification gate.** Every wave has a gate. Every gate is run. See `08_VERIFICATION_STRATEGY.md`.
- **Do not execute if `git status` is dirty** (another agent's work). Wait or coordinate.
- **Do not re-execute Wave 1 if `2026-06-14-Codebase-Cleanup-Plan` already did.** Check `git log` first.
- **Do not cut AI audit tables or security tests** if SF.1 is cut. They're needed for compliance even if the UI is gone.

## Rollback

Every wave is rollback-safe because:
- Wave 1: deps can be re-added to `package.json` + `bun install`.
- Wave 2: visual dep swaps can be reverted (keep the old component in git history); feature cuts can be reverted (keep the files in git history). Security-sensitive cuts also require restoring disabled feature flags to safe defaults, preserving audit/security tests, confirming no route reappears without auth, confirming provider/env secrets are unchanged, and documenting retained audit-table behavior.
- Wave 3: each diff is a separate commit. Revert the specific commit.

If a wave introduces a regression, `git revert <commit>` is the rollback. No database migrations, no provider changes, no irreversible actions in this plan.
