# 09 — Risk Register

**Date:** 2026-06-21 · **Status:** PLANNING / READINESS ONLY

## Top risks

| # | Risk | Likelihood | Impact | Affected | Mitigation |
|---|------|-----------|--------|----------|------------|
| R1 | Removing a "dead" dependency that is reachable via dynamic import / string ref / Next.js auto-loading | Low | High | bundle, runtime | Blast-radius agent (Agent A) runs multi-pattern grep: `from "dep"`, `require("dep")`, `import("dep")`, dynamic imports, string-references. Zero-match required before removal. |
| R2 | Dependency removal breaks a transitive/runtime path (`@next/third-parties` → GA script doesn't fire OR `window.gtag` lost; `d3`→`d3-shape` missing a sub-import OR hydration SVG path mismatch) | Low | High | analytics, experiment tracking, charts | **Agent A finding:** `@next/third-parties` swap MUST preserve `window.gtag` for `experiment-tracker.ts` (including `trackConversion` from `HeroSection.tsx:291`). Explicitly assign `window.gtag = gtag;` in the inline script. Run 3 affected tests: `landing-ab-testing`, `closed-beta-env-manifest`, `project-publication-security`. For `d3`→`d3-shape`: only `d3-shape` is used (Agent A confirmed); run 4 affected tests including `cost-donut-chart-hydration` (byte-identical SVG paths required for Option B). |
| R3 | Mega-file refactor (Tier 2) regresses user-facing behavior — estimate editing, library management, publication, workshop data | Med | High | core app | **Never one-shot refactor Tier 2 files.** Diff-by-diff only. `/ponytail-review` on every PR. Each diff ≤50 LOC. Full `bun run validate` + browser QA on every diff. **Start with dead-export removal (57 total)** — safest first PRs that shrink public API without touching consumed exports. `workspace-repository.ts` has 37 importers — any public API change touches 37 files. |
| R4 | Cutting AI surface (SF.1) loses audit/compliance tables or security-contract tests | Low | High | AI audit, security | Keep AI audit tables + security-contract tests even if UI/routes are cut. Owner decision. Overlaps with cleanup plan R9. |
| R5 | Cutting project cursors (SF.2) breaks Realtime channel setup that other features depend on | Low | Med | collaboration | Verify no other Realtime channel consumer depends on cursor/presence infrastructure. Cleanup plan found follow-mode helpers have zero callers — strong cut signal. |
| R6 | Visual dep swap (T1.5-T1.8) changes landing page aesthetics owner didn't approve — especially `roughjs` (−500 LOC, ~684 lines of the file depend on it, large custom illustration) | Med | Med | landing | Owner decision before any swap. Keep option A (keep dep) as default. Only swap on explicit approval. **T1.8 (`roughjs`) is the highest visual complexity swap** — the sketch illustration is a distinctive element; replacement SVG must be authored carefully. |
| R7 | `@next/third-parties` → `next/script` swap loses `window.gtag` global, breaking experiment tracking (`trackConversion`, `trackExperimentView`) | Med | High | landing, analytics, A/B testing | **Agent A finding:** `experiment-tracker.ts` consumes `window.gtag` and `window.clarity`. Swap MUST explicitly assign `window.gtag = gtag;` in the inline script. Verify `typeof window.gtag === "function"` in browser QA. Run 3 affected tests. |
| R8 | `d3`→`d3-shape` Option B (inline native SVG) produces different SVG paths, breaking `cost-donut-chart-hydration.test.tsx` (deterministic SVG output check) | Med | Med | charts | Option A (simple dep narrowing) has zero LOC change and zero path risk. Option B must produce byte-identical SVG paths. If paths differ, revert to Option A. |
| R9 | Barrel file removal (T3.1, T3.2) breaks imports across many files | Med | Low | components, lib | Grep for `from "@/components/landing"` and `from "@/lib/activity"` before removal. Update all importers in the same PR. |
| R10 | `as unknown as` cast removal (T3.4) changes runtime behavior of the optional tab query | Low | Med | reusable-sources | Replace with typed helper, not just delete the cast. Verify the optional query still handles the `null`/`undefined` case. |
| R11 | Hand-rolled HTML stripping swap (T3.5) is weaker than the original — XSS via share recipient text | Low | High (security) | share | This is a **trust-boundary input.** Ponytail explicitly preserves trust-boundary validation. Swap must be at least as robust. Test with OWASP XSS payload list. Prefer `DOMPurify` over `DOMParser` for sanitizer-grade robustness. |
| R12 | Empty catch removal (T3.3) changes error behavior in a way that surfaces errors users didn't see before | Low | Low | estimates table | Either handle (log + fallback) or keep the wrapper. Don't just delete the catch. |
| R13 | Ponytail ruleset influences an auth/RLS/security decision during a bug fix | Low | Critical | auth, RLS, security | Turn ponytail `off` for auth/RLS/data-integrity work. Don't lean on the "not lazy about" list — explicitly disable. |
| R14 | `/ponytail-review` on a Tier 2 PR adds latency and friction that discourages its use | Med | Med | dev workflow | Make it a habit, not a gate. Run it as part of PR self-review, not as a CI requirement. Reports are fast (seconds). |
| R15 | Multiple agents editing the same file concurrently (the user's vigilance concern) | Med | Med | any file | Agent coordination ledger (`11_AGENT_COORDINATION_LEDGER.md`) defines file-locking convention. Agents announce intent before editing. Conflicts resolved by last-writer-respect-first-writer. |
| R16 | Ponytail plugin update changes the ruleset in a way that affects ongoing work | Low | Low | all | Pin to v4.7.0. Update deliberately. Re-read `10_PONYTAIL_OPERATING_MODEL.md` after any update. |
| R17 | Mega-file LOC counts in this plan drift from reality (graph index is 2026-06-19) | Med | Low | planning accuracy | Re-verify with `wc -l` before any refactor. Graph stats are a snapshot, not live. **2026-06-24 audit realized this risk:** all 7 Tier 2 files grew +2460 LOC total. Refreshed tables in `03_BLAST_RADIUS_ANALYSIS.md` and `05_TIER_2_MEGA_FILE_STRATEGY.md`. See `16_AUDIT_LOG_2026-06-24.md`. |
| R18 | Overlap with `2026-06-14-Codebase-Cleanup-Plan` causes double-execution of the same dep removal | Low | Low | deps | Cross-reference table in `02_CODEBASE_ANALYSIS.md`. If cleanup plan already executed T1.1/T1.2/T1.4, skip them here. Check `git log` before executing. |
| R19 | Future implementer treats known baseline-red validation as a new failure or ignores a new failure as "baseline" | Med | Med | verification | Capture a fresh baseline before implementation and compare failure sets. See `08_VERIFICATION_STRATEGY.md`. |
| R20 | T2.6/T2.7 auth helper extraction centralizes access checks incorrectly and permits cross-workspace/project/library mutation | Low | Critical | auth/RLS/server actions | Use the per-action invariant checklist in `14_SECURITY_AND_NETWORK_CONTRACTS.md`: actor, role, scope, RLS, service-role boundary, rate-limit key, deny-before-mutate, and forbidden cross-workspace tests. |
| R21 | Public share route with no client caller is deleted/simplified while still reachable through email, server, token, unsubscribe, or telemetry flows | Med | High | public share routes | T3.14 is evaluate-only. Run the public-share route contract in `14_SECURITY_AND_NETWORK_CONTRACTS.md` before any cut. |
| R22 | AI routes stay hidden in UI but remain callable directly when flags/env drift | Med | Critical | AI/security/provider network | Keep-hidden path requires route-level disabled denial, auth, rate limits, workspace/project scope, input-size limits, prompt-injection/data-exfiltration tests, audit logging, and no provider calls while flags are false. |
| R23 | Analytics swap violates CSP, consent, privacy, or network policy | Low | High | landing analytics/public pages | T1.3 must satisfy CSP `script-src`/`connect-src`, nonce/hash handling if CSP is active, GA ID env allowlisting/escaping, no GA/Clarity on share/publication routes, no pre-consent request, and no PII/project IDs in payloads. |

## Blast-radius by finding class

- **Zero/near-zero blast (execute immediately):** T1.1 (`class-variance-authority`), T1.2 (`three`) — no runtime callers; multi-pattern grep + cleanup plan agree.
- **Contained blast (one-file edit + verify):** T1.3 (`@next/third-parties` -> `next/script`), T1.4 (`d3` -> `d3-shape`), T3.1 (landing barrel), T3.2 (activity barrel), T3.3 (empty catch), T3.4 (cast removal), T3.12 (query parsing).
- **Medium blast (one-file edit + browser QA):** T1.5 (`@firecms/neat`), T1.6 (`lenis`), T1.7 (`rough-notation`), T1.8 (`roughjs`).
- **High blast (trust-boundary, security-sensitive):** T3.5 (`sanitize-recipient-text` swap) — must be at least as robust as hand-rolled. Test with XSS payloads.
- **Product-level blast (owner decision):** SF.1 (AI surface), SF.2 (project cursors) — affects feature scope, not correctness.
- **Diff-by-diff only (never one-shot):** T2.1-T2.7 (mega-files) — core app surfaces. Any one-shot refactor risks behavior regression.

## Confidence in the audit itself

- **High** for dependency findings (multi-pattern grep + `2026-06-14-Codebase-Cleanup-Plan` cross-reference + Agent A blast-radius validation).
- **High** for mega-file LOC counts (code-review-graph index, 2026-06-19). **Medium** for whether the LOC is still exactly the same (graph is a snapshot — re-verify with `wc -l` before refactor).
- **High** for ponytail ruleset and commands (read from source at `~/.local/share/ponytail/`). **Medium** for mode-specific prose (Agent D is extracting the full verbatim text — summary in `10_PONYTAIL_OPERATING_MODEL.md` is accurate but not exhaustive).
- **High** for second-pass findings now integrated into `02_CODEBASE_ANALYSIS.md` § "Second-pass findings" and routed through `06_TIER_3_QUICK_CUTS.md` / `07_IMPLEMENTATION_WAVES.md`.
- **Self-correction applied:** the first pass reported `class-variance-authority` and `three` as unused. The cleanup plan independently confirmed both. Agent A runs a third grep pass with different patterns (`cva`, `THREE.`, `threejs`) to be 100% sure. Three independent confirmations = high confidence.

## Non-ponytail hotspot (fix-forward, tracked here)

`ProposalExportPreviewDialog.tsx` owns BOTH a failing dom test (`proposal-export-preview`) AND the `lint:design-system` failures (font-size + `rounded-full`). It is a quality hotspot to fix forward independently — not a ponytail cut. Overlaps with cleanup plan's non-cleanup hotspot note.

## Risks NOT addressed by this plan

- **Git-history exposure** (owner-accepted Codex findings) — out of scope; code-tree cleanup does NOT purge history. Tracked in cleanup plan R12.
- **Provider/production deployment risk** — this plan is local-only. No Vercel/Supabase/GitHub mutations. Provider proof is a separate gate.
- **Database schema risk** — no DB changes in this plan. If a future wave touches DB (e.g., dropping AI audit tables on SF.1 cut), that's a separate migration with its own risk register.
