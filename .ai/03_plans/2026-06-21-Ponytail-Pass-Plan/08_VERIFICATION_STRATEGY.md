# 08 — Verification Strategy

**Date:** 2026-06-21 · **Status:** PLANNING / READINESS ONLY

This document defines how to verify each change from `07_IMPLEMENTATION_WAVES.md` is safe before declaring it done. Verification is proportional to risk — zero-risk dep removals get light verification; trust-boundary swaps get heavy verification.

## Verification gates by change class

| Change class | Gate | What to run | What to check |
|---|---|---|---|
| Zero-risk dep removal (T1.1, T1.2) | Light | `bun install && bun run type-check && bun run build` | Exit 0. No new type errors. Build artifacts present. |
| Dep swap, one-file (T1.3, T1.4) | Standard | Light + browser QA | Light gate passes. Browser: the specific feature still works (GA fires, chart renders). |
| Visual dep swap (T1.5-T1.8) | Visual QA | Standard + visual comparison | Standard gate passes. Before/after screenshot. Owner approves visual. |
| Barrel removal (T3.1, T3.2) | Standard | Light + grep | Light gate passes. No broken imports (grep for old paths returns 0). |
| Cast removal (T3.4) | Standard + targeted test | Light + the test that covers the optional query | Light gate passes. Test passes. Verify null/undefined case handled. |
| Empty catch fix (T3.3) | Standard | Light + the test that covers localStorage prefs | Light gate passes. Test passes. Verify error is now handled, not swallowed. |
| Trust-boundary swap (T3.5) | Heavy | Standard + XSS payload test suite | Standard gate passes. XSS payloads (`<script>`, `<img onerror>`, encoded entities) are stripped. Test with OWASP payload list. |
| Speculative feature cut (SF.1, SF.2) | Owner gate + baseline-diff full gate | Targeted contract tests + `bun run build`; broader `bun run validate`/`bun run test:dom` compared to recorded baseline | No new failures versus baseline. Owner confirms the feature is cut, not hidden. Audit tables + security tests preserved (SF.1). Sheet cursor collaboration preserved unless explicitly cut. |
| Mega-file diff (T2.1-T2.7) | Baseline-diff full + browser QA | Targeted tests + `bun run build`; broader gates only with baseline comparison + browser QA on the affected surface | No new failures versus baseline. Browser: the specific user flow still works (estimate editing, library management, publication). `/ponytail-review` clean on the diff. |

## Baseline-diff rule for this repo

Current project state has known pre-existing validation failures documented in `.ai/10_state/current-state.md`: full `bun run validate` is red, design lint has a `ProposalExportPreviewDialog` hotspot, charts can trigger `set-state-in-effect`, and all-DOM can hang. Therefore:

1. Before implementation, capture a fresh baseline: command, exit code, failing test/file list, and timestamp.
2. Run the narrow targeted tests listed for the changed item.
3. Run `bun run build` for dependency/package changes.
4. Run broader `validate`/`test:dom` only when risk justifies it, and compare the failing set to the baseline.
5. Pass means: targeted gates pass, build passes unless the baseline already proves a build failure, and there are no new failures versus baseline.

Do not claim a full-suite green result in future implementation reports unless the suite actually exits 0 on that date.

## The validation matrix

From `package.json` scripts:

```bash
# Light gate (zero-risk changes)
bun install
bun run type-check       # tsc --noEmit
bun run build            # Next.js production build

# Standard gate (dep swaps, barrel removal, cast removal)
bun install
bun run type-check
bun run lint             # ESLint
bun run lint:design-system  # Custom design-system enforcement
bun run build

# Baseline-diff broad gate (visual dep swaps, speculative feature cuts, mega-file diffs)
bun install
bun run validate         # compare failure set to baseline; no new failures allowed
bun run build
bun run test             # Bun unit tests
bun run test:dom         # Vitest DOM tests; use targeted patterns if all-DOM hangs
# Optional: bun run test:e2e   # Playwright E2E (slow; run for mega-file diffs)
```

## Per-change verification (the full checklist)

### T1.1 `class-variance-authority` removal — Light gate

```bash
# 1. Pre-check: confirm 0 imports
rg "from ['\"]class-variance-authority['\"]|require\(['\"]class-variance-authority['\"]\)|cva\(" src tests --type ts --type tsx
# Expected: 0 matches

# 2. Remove from package.json
# (edit package.json — remove the class-variance-authority line)

# 3. Install + gate
bun install
bun run type-check
bun run build

# 4. Verify
# - exit 0 on all three
# - no new type errors
# - build artifacts present (.next/)
```

### T1.2 `three` removal — Light gate

```bash
# 1. Pre-check: confirm 0 imports (multi-pattern)
rg "from ['\"]three['\"]|require\(['\"]three['\"]\)|THREE\.|threejs" src tests --type ts --type tsx
# Expected: 0 matches

# 2-4. Same as T1.1
```

### T1.3 `@next/third-parties` → `next/script` swap — Standard + browser QA

```bash
# 1. Pre-check: find all importers
rg -l "@next/third-parties" src
# Expected: only src/components/landing/LandingAnalyticsLoader.tsx

# 2. Read the existing pattern
cat src/components/landing/ClarityScript.tsx
# (note how next/script is used)

# 3. Rewrite LandingAnalyticsLoader.tsx to use next/script
# (edit the file — swap GoogleAnalytics import for next/script with the GA tag)

# 4. Remove @next/third-parties from package.json
# (edit package.json)

# 5. Gate
bun install
bun run type-check
bun run build

# 6. Browser QA
# - bun run dev
# - open http://localhost:3000
# - open DevTools → Network
# - filter "google-analytics.com"
# - verify GA script fires on landing load
# - verify consent banner interaction (if present) still gates GA correctly
```

### T1.4 `d3` → `d3-shape` narrowing — Standard

```bash
# 1. Pre-check: find all d3 imports
rg "from ['\"]d3['\"]|from ['\"]d3-" src
# Expected: only CostDonutChart.tsx (and maybe project-charts/)

# 2. Read CostDonutChart.tsx — note exactly what's imported from d3-shape
# (if only arc + pie, replace "d3" with "d3-shape" in package.json)
# (if other d3 sub-packages are used, keep them; only remove the d3 umbrella)

# 3. Edit package.json — replace "d3" with "d3-shape"
# 4. Edit CostDonutChart.tsx — update import path
# 5. Gate
bun install
bun run type-check
bun run build

# 6. Browser QA (quick)
# - bun run dev
# - open a project with charts
# - verify CostDonutChart renders correctly
```

### T1.5-T1.8 Visual dep swaps — Standard + visual QA + owner approval

**For each visual dep (`@firecms/neat`, `lenis`, `rough-notation`, `roughjs`), use the detailed acceptance matrix in `13_VISUAL_DECISION_AND_QA_MATRIX.md`:**

```bash
# 1. Pre-check: find all importers
rg -l "<dep-name>" src
# Expected: only the known single importer (see 02_CODEBASE_ANALYSIS.md)

# 2. Owner decision: keep or swap?
# - if keep: close this finding, move on
# - if swap: continue

# 3. Read the component — understand the visual effect
# 4. Write the CSS/SVG replacement
# 5. Remove the dep from package.json
# 6. Gate
bun install
bun run type-check
bun run lint:design-system
bun run build

# 7. Visual QA
# - bun run dev
# - open the landing page section affected
# - before/after screenshots at 390x844, 768x1024, and 1440x900 unless the changed surface is narrower
# - owner approves the visual
# - verify prefers-reduced-motion is respected
# - verify no focus trap, click overlay, layout shift, or hidden-text regression
```

### T3.1, T3.2 Barrel removal — Standard

```bash
# 1. Pre-check: find all importers of the barrel
rg "from ['\"]@/components/landing['\"]|from ['\"]@/lib/activity['\"]" src
# Expected: list of files importing from the barrel

# 2. For each importer, update the import to point at the direct file
# (e.g., from "@/components/landing" → from "@/components/landing/HeroSection")

# 3. Delete the barrel file
# 4. Gate
bun install
bun run type-check
bun run build

# 5. Verify no broken imports
rg "from ['\"]@/components/landing['\"]|from ['\"]@/lib/activity['\"]" src
# Expected: 0 matches
```

### T3.3 Empty catch fix — Standard + targeted test

```bash
# 1. Read ProjectEstimatesTable.tsx:99-121
# 2. Either:
#    a) Handle the error (log + fallback value)
#    b) Drop the wrapper and use localStorage directly with a single try/catch at the call site
# 3. Gate
bun run type-check
bun run test:dom     # run the test that covers ProjectEstimatesTable
bun run build

# 4. Verify the error is no longer swallowed
# (write a test that throws in localStorage and verify the error surfaces)
```

### T3.4 `as unknown as` cast removal — Standard + targeted test

```bash
# 1. Read reusable-sources/actions.ts:192-217
# 2. Replace the cast with a typed helper or a simpler branch
# 3. Gate
bun run type-check
bun run test:dom     # run the test that covers reusable-sources actions
bun run build

# 4. Verify the optional query still handles null/undefined
# (test with the optional tab absent)
```

### T3.5 Hand-rolled HTML stripping swap — Heavy (trust-boundary)

```bash
# 1. Read sanitize-recipient-text.ts
# 2. Replace with server-safe DOMPurify + existing jsdom or an isomorphic sanitizer.
#    Browser-only DOMParser is not valid in route-handler callers.
# 3. Gate
bun run type-check
bun run test:dom -- project-publication-comments project-publication-decision share/recipient-content-escaping
bun run build

# 4. XSS payload test suite
# Test these inputs and verify the output is safe:
# - "<script>alert('xss')</script>"
# - "<img src=x onerror=alert('xss')>"
# - "javascript:alert('xss')"
# - "<svg onload=alert('xss')>"
# - "&lt;script&gt;alert('xss')&lt;/script&gt;" (encoded)
# - "<SCRIPT>alert('xss')</SCRIPT>" (case-variant)
# - "<scr<script>ipt>alert('xss')</script>" (nested)
# Verify all produce safe output (no executable script, no event handlers)

# 5. If any payload is not stripped, revert and use DOMPurify
```

### SF.1 AI surface — Owner gate + baseline-diff full gate

If the owner chooses **keep hidden**, this is still a security contract, not a no-op:

- Disabled flags must deny direct route access.
- Enabled routes must require auth, workspace/project scope, rate limits, input-size limits, and audit logging.
- Provider calls must not happen when flags are false.
- Provider secrets remain env-only.
- Prompt-injection/data-exfiltration guard tests remain.

If the owner chooses **cut**, use the sequence below and `14_SECURITY_AND_NETWORK_CONTRACTS.md`.

```bash
# 1. Owner decision: keep hidden or cut?
# 2. If cut:
#    - remove src/lib/ai/ (or move to archive if preserving for future)
#    - remove src/app/api/ai/ask/, src/app/api/ai/package-builder/
#    - remove src/components/workshop/EstimateCopilotFloatingButton.tsx
#    - remove src/lib/ai/feature-flags.ts
#    - remove tests/vitest/ai-package-builder-*.test.ts
#    - KEEP AI audit tables (ai_action_runs, ai_tool_calls, ai_data_access_events) — they may be needed for compliance
#    - KEEP security-contract tests
# 3. Gate
bun run validate   # baseline-diff: no new failures
bun run build
bun run test:dom
# 4. Owner sign-off: confirm the feature is cut, not hidden
```

### SF.2 Project-wide cursors cut — Owner gate + baseline-diff full gate

SF.2 is project-wide cursors/presence, not all cursor collaboration. `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST` estimate-sheet cursor broadcast defaults true and must stay unless the owner explicitly broadens the cut.

```bash
# 1. Owner decision: keep hidden or cut?
# 2. If cut:
#    - remove src/components/workshop/ProjectCursorLayer.tsx
#    - remove or narrow src/hooks/use-project-presence.ts
#    - preserve src/hooks/use-estimate-cursor-broadcast.ts unless owner broadens the cut
#    - remove only project cursor/presence flag branches in src/lib/collaboration/feature-flags.ts
#    - update tests to distinguish project cursors from estimate-sheet cursor broadcast
#    - KEEP collaboration_invitations, project_members, estimate_sheet_members
# 3. Gate
bun run validate   # baseline-diff: no new failures
bun run build
bun run test:dom
# 4. Owner sign-off
```

### Public-share route contract before any T3.14 route cut

Before deleting or simplifying any `src/app/api/share/[token]/*` route, prove all of the following:

- Valid, invalid, expired, and revoked token behavior.
- Password and recipient/session authorization requirements.
- `Cache-Control: no-store` or the documented cache policy.
- Rate limits and body validation.
- Anonymous write limits for comments, events, and decisions.
- Unsubscribe token authority.
- Email/server indirect callers, not just browser client callers.

Run or add tests around `project-publication-comments`, `project-publication-decision`, `project-publication-activity`, `activity-security`, and route-specific share tests.

### T2.1-T2.7 Mega-file diffs — Full + browser QA + `/ponytail-review`

**For every PR that touches a Tier 2 mega-file:**

```bash
# 1. Before the PR: run /ponytail-review on the planned diff
#    (in OpenCode: /ponytail-review)
#    (in Codex: @ponytail-review)
# 2. Apply ponytail's delete-list where safe
# 3. Keep the diff ≤50 LOC if possible
# 4. Gate
bun run validate   # baseline-diff: no new failures
bun run build
bun run test:dom
# 5. Browser QA on the affected surface:
#    - T2.1 (EstimateSheetContent): open an estimate, edit rows, add/remove nodes, use history, export
#    - T2.2 (component-library/index): open the library sidebar, search, filter, drag a component into an estimate
#    - T2.3 (workspace-repository): open the workshop homebase, verify data loads
#    - T2.4-T2.5 (AI): only if AI is enabled — skip if cut
#    - T2.6 (publication/actions): create a share link, verify it works
#    - T2.7 (component-library/actions): add/edit a library component, verify it persists
# 6. If any browser QA fails, revert the diff and try again with a smaller change
```

## What verification is NOT

- **"It compiles" is not verification.** Type-check passes don't catch logic bugs.
- **"Tests pass" is not verification (alone).** Tests cover known cases. Does the actual feature work as the user expects? Run it.
- **"lsp_diagnostics is clean" is not verification.** That's a TYPE check, not a FUNCTIONAL check.
- **"The build succeeded" is not verification for visual changes.** Open the page. Look at it.

## Evidence to capture per change

For each change, capture:

1. **The command output** (exit code + key lines) for every gate that ran.
2. **For browser QA:** a description of what was tested and what was observed (not a screenshot — a description is sufficient for most changes; screenshots for visual dep swaps).
3. **For `/ponytail-review`:** the review output (the delete-list and what was applied).
4. **For owner decisions:** the decision and the date.

Store evidence in the PR description or in `.ai/05_logs/` if working outside a PR.

## Pre-existing failures (not blockers, but track them)

From `2026-06-14-Codebase-Cleanup-Plan` § "Honest quality notes":

- `lint` has 65 errors / 409 warnings (overwhelmingly test-file `no-unused-expressions`/`no-explicit-any`). Pre-existing.
- `lint:design-system` fails on `ProposalExportPreviewDialog` (font-size + `rounded-full`). Pre-existing.
- 2 of 2,200 `test:dom` tests fail (`estimate-sheet-version-control-ui`, `proposal-export-preview`). Pre-existing.

**Rule:** A change is verified if it doesn't introduce NEW failures. Diff the failing-test set against baseline, not just exit codes. If a pre-existing failure starts passing because of your change, note it. If a passing test starts failing, revert.
