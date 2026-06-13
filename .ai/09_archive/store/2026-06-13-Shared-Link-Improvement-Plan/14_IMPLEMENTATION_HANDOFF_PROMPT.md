# Shared Link Improvement — Implementation Handoff Prompt

> **For the implementing session (human or agent):** This is the entry point. The **spec** lives in the sibling docs `00`–`13` in this folder; this prompt orders the work, encodes the non-negotiables, and hands off to a per-task execution skill. **REQUIRED SUB-SKILL at execution time:** use `superpowers:subagent-driven-development` (recommended — fresh subagent per task, review between) or `superpowers:executing-plans` (inline, batched with checkpoints). Per-task TDD steps (failing test → run → implement → run → commit) are expanded against the **live code** at execution — they are intentionally not pre-written here because (a) several tasks are gated on owner decisions, and (b) the real `/share` page has not been pixel-verified yet (see §0).

**Goal:** Make the shared-link feature trustworthy and effective — first stop the silent owner-side data/access-loss bugs, then give the public proposal page a legible, full-browser layout — with zero schema change on the UI track, low blast radius, and instant rollback.

**Architecture:** Five independent tracks, each its own branch + deploy + rollback unit. No cross-track dependency except shared test runs. T5 (owner-modal fixes) and T1 (receiver UI) are independent; T5's P0 items are losing data today, so they go first. T2/T3 ride behind on separate deploys. T4 (DB) is design-ready but execution-deferred until a DB write channel exists.

**Tech stack:** Next.js 16 (App Router, RSC, `after()`, `React.cache`, PPR/Cache Components) · React 19 · Bun · Supabase/Postgres (service-role for public reads; RLS as defense-in-depth) · TanStack Query · Zustand · Tailwind v4 · `d3-shape` · Playwright + Vitest.

---

## 0. STATUS — read before you start

- **This plan was hardened by a 2nd adversarial pass.** The first pass's "100% implementation readiness" was **overstated**; the corrected, honest confidence is **~90%+ after the amendments are applied (they are)**, with one residual that cannot be closed on paper. See [11 §7](11_SCORING_AND_INTEGRITY.md).
- **THE ONE OPEN PREREQUISITE — live pixels.** Neither audit pass saw the real `/share` page render. Before locking T1's exact classes (rail width math at 1366/1440, donut placement, type sizes against runtime ink `#3D3D3D`), get a **live share-link URL** (or the owner's browser session) and verify the current page + the P-UI-0 baseline. The mockup ([assets/proposed-layout-mockup.html](assets/proposed-layout-mockup.html)) is a **direction artifact, not pixel-final**.
- **Verified-fixed on `main` — DO NOT "re-fix":** CSRF on comment/decision/activity; activity-GET 403; CostDonutChart hydration (svg-rounding); durable rate limiting. (Stale memory said otherwise; it's wrong — see [11 §3](11_SCORING_AND_INTEGRITY.md).)

## 1. Read in this order

1. [00_INDEX_AND_SCORECARD.md](00_INDEX_AND_SCORECARD.md) — map + honest scorecard (§3a is the reality check).
2. The track you're about to do (see §3). Each names its authoritative spec doc.
3. [07_BLAST_RADIUS_ANALYSIS.md](07_BLAST_RADIUS_ANALYSIS.md) — what must stay share-scoped.
4. `AGENTS.md`, `CLAUDE.md`, `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` — the repo's operating protocol (MCP impact analysis, validation gates).

## 2. HARD CONSTRAINTS (violating any of these is a failed task)

1. **Keep every UI change share-scoped.** Edit only `src/app/share/[token]/page.tsx`, `src/components/share/*`, `src/app/share/print.css`. **NEVER** edit shared design tokens (`src/app/globals.css` `:root`/`@theme`) or shared primitives (`src/components/ui/button.tsx` — ~90 importers; `workshop-tree`; `tree-visual-style`) to achieve the look. ([07 §4](07_BLAST_RADIUS_ANALYSIS.md))
2. **No DB write channel.** Docker is absent and hosted Supabase SQL by agents is denied. Anything tagged **[DB]** (Track T4 + a few T5 items) is **design-only — do not run migrations**. Ship the code paths that don't need DB; leave the migration as a ready, reviewed `.sql` for a human to apply.
3. **No new schema for the UI track.** T1 consumes the existing `snapshot` ([05 §4-B](05_DATABASE_AUDIT.md)). The only data-shape change anywhere near T1 is firm-identity/valid-until (deferred, D3).
4. **MUST run MCP impact analysis before editing any symbol** (per `CLAUDE.md`): `code-review-graph` `get_impact_radius` / `get_affected_flows` + `detect_changes` before/after. Confirm `ProjectChartsPage` does NOT enter the radius (i.e. you only touched `CostDonutChart`'s `compact` branch, never the shared FULL path). Re-run `npx gitnexus analyze` first if the index is stale.
5. **No feature flags; rely on Vercel instant rollback.** Each track is one deploy = one rollback unit. Do not co-bundle behavior changes (T2/T3) with the layout commit (T1), and ship the **design-enforcer change on its own deploy** before T1's layout commit.
6. **Evidence before "done."** No success claim without the command output (`superpowers:verification-before-completion`). Targets in the docs are TARGETS — measure at execution, don't assert.

## 3. TRACK EXECUTION ORDER (owner-agreed 2026-06-13)

> **T5 first, then the cheaper T1 MVP, then T2/T3. T4 when a DB channel exists.** Rationale: T5's P0 bugs are silent data/access loss happening in production today; they outrank cosmetic work.

### Track T5 — Owner-Modal Functional Fixes  ·  **DO FIRST**
- **Branch:** `fix/shared-link-owner-modal-p0`
- **Spec:** [13_OWNER_MODAL_FUNCTIONAL_AUDIT.md](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md) (register §2.2, fixes §3–8, ACs §10) · phases in [09 §6b](09_IMPLEMENTATION_PLAN.md) (P-Mod-0..3) · mapping in [10 §8](10_TRACEABILITY_MATRIX.md).
- **Entry-gate owner decisions (resolve first):** (a) does `expires_at` get a manager UI input (AC-MOD-10)? (b) does the cookie-eviction decouple add a `credential_version` column **[DB → defer the column, ship the snapshot-diff approach if chosen]** or diff the snapshot?
- **P-Mod-0 (do before touching code):** write regression Vitest cases that FAIL on today's behavior for the two headline bugs — the `snapshot_version`→cookie-eviction chain (a benign "Update" must not invalidate a valid in-session recipient) and the rotate-orphans-recipients path. These tests are the safety net.
- **P-Mod-1 (P0, High-severity — the reason T5 is first):**
  - **MOD-PW-01:** decouple the access/session **cookie binding from `snapshot_version`** so a routine "Update shared page" no longer silently evicts in-session recipients (re-prompt + identity loss). Staleness is already protected by the RPC `p_expected_snapshot_version` locks — the cookie binding is redundant. Evidence: `security.ts:144,196,289,337-339`; `page.tsx:136-172`; `actions.ts:569`.
  - **MOD-ROT-01/REC-01:** rotate must **carry recipients forward** (in-place rotate) or offer a re-invite path — today it orphans the invite list and 404s emailed `/share/<oldToken>` links. Evidence: `actions.ts:605-626`; recipients resolved by newest `publicationId`.
  - **MOD-REC-02:** `resendSharedLinkRecipientEmail` must **send before** overwriting `recipient_token_hash`, or roll back on send failure (`actions.ts:1062-1087`).
  - **MOD-REC-04:** removing a recipient needs a **confirmation** and must not silently CASCADE-destroy their locked decision (`shared_link_responses` FK is NOT NULL + ON DELETE CASCADE) — switch to soft-delete/SET NULL **[DB → ready migration]** or block-with-warning in the UI now.
  - **MOD-STALE-01/STATE-02:** reconcile the optimistic `localResult` against the revalidated summary so the modal can't show a revoked/expired link as "Link live" (`ProjectPublicationHeader.tsx:248,68-69,187,255-259`).
- **P-Mod-2 (P1, Medium)** and **P-Mod-3 (P2, Low):** the remaining AC-MOD items in [13 §10](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md) (Realtime feed false "Live" claim; unseen-activity dot watching the wrong signal; open-count inflation; expiry footgun UI; etc.). Tag each [L]/[S]/[DB]; defer [DB].
- **Note the true register size:** 42 distinct bugs / 47 rows (High ×7, Med ×17, Low ×18). Component path is `src/components/workshop/publication/RecipientEmailComposer.tsx`.

### Track T1 — Receiver UI / Layout Overhaul  ·  **DO SECOND (ship the MVP first)**
- **Branch:** `feat/share-page-full-browser-overhaul` (enforcer prerequisite on its own branch first: `chore/design-enforcer-share-allowlist`)
- **Spec:** [03_UX_UI_AUDIT_AND_OVERHAUL.md](03_UX_UI_AUDIT_AND_OVERHAUL.md) (§4 design, §5 per-component changes, §6 ACs incl. the 2nd-pass AC-UX-01b/02b/06b) · phases [09 §3](09_IMPLEMENTATION_PLAN.md) (P-UI-0..3) · the 8 hardening amendments [12](12_SECOND_PASS_HARDENING.md).
- **Blocking decision D1:** approve the **principle** of a larger "Client Portal" type scale for `/share` **and** that it requires editing the shared CI gate. If No → fallback "wide layout + whitespace, keep 12px."
- **SHIP THE CHEAPER MVP FIRST** (the red-team's recommendation, owner-agreed): wider single-column container (~1200–1280px) + the type scale + decision kept **inline-but-anchored** — **NO sticky-rail grid split yet**. This delivers the owner's *confirmed* complaint (gutters + tiny type) immediately and de-risks the speculative rail. Add the `xl` rail-split as a follow-up **only if** post-launch desktop data shows clients scrolling away from the decision. ([08 §2 cheaper-MVP](08_SOLUTIONS_AND_OPTIMIZATIONS.md), [09 P-UI-1](09_IMPLEMENTATION_PLAN.md))
- **P-UI-0 prerequisites (own deploy, before any layout commit):**
  1. Extend `scripts/enforce-app-design-system.mjs` with a `/share` allowlist for the three hardcoded rules (`maxPx=12` line 6, `labelLikeTextSizeLimitPx=9` line 7, `secondaryTextSizeLimitPx=10` line 8) + a guard test that it still FAILS on a >12px violation **outside** `/share`. Ship this alone.
  2. Capture the Playwright visual-regression baseline (1440, 1536, 375) — none exists today.
  3. Build the recipient-session e2e fixture (cookie/HMAC/snapshot-version) so `e2e/shared-link-receiver.spec.ts:66` is meaningful (it asserts a `sticky-decision-bar` that returns `null` without a session); add a `SharePageDecision` `isValid:false` unit test for the new anonymous state.
- **Landmines (from the 2nd pass — design around these):**
  - Decision CTA is the shared `Button` primitive (`button.tsx:55` `!text-[10px]`). "Unmistakable CTA" is **[deeper]** — hand-roll share-scoped button styling (re-verify focus/a11y) **or** keep 10px and anchor on the 24px total. Add an AC that `button.tsx` is NOT in the T1 diff.
  - If you later build the rail: only **Summary+Decision** sticky (not Comments — exceeds a 1366×768 viewport); `position:sticky/top-6/self-start`, no `overflow-hidden/transform/contain` (would clip the confirm modal). Put the grid on an **inner wrapper**, not `.share-print-content` (print would otherwise render a 2-col page with an empty rail track). Measure BOQ width at 1366/1440 ≥ today's ~680px (AC-UX-01b).
  - Constrain the `compact` donut container (`max-w-[560px]`) so it doesn't re-create wasted space in a wide work-zone; tune only the COMPACT constant block in `CostDonutChart.tsx`; re-run `cost-donut-chart-hydration.test.tsx`.

### Track T2 — Performance  ·  third
- **Branch:** `perf/share-page-hot-path` · **Spec:** [04_PERFORMANCE_AUDIT.md](04_PERFORMANCE_AUDIT.md) (OPT-1..10), [09 §4](09_IMPLEMENTATION_PLAN.md).
- **P-Perf-0:** capture the baseline (TTFB, snapshot bytes) first. **P-Perf-1 (quick wins):** `after()` for the two blocking telemetry writes; `React.cache` to de-dup the 4–6× publication-row SELECT; one service client/request; `Promise.all` independent reads; hero `priority`. **P-Perf-2:** server-side version-keyed snapshot cache (invalidate on create/republish/rotate/revoke; **never public CDN**; keep the active-state gate uncached); Suspense/PPR shell; memoize chart geometry + virtualize long lists.

### Track T3 — Security hardening  ·  fourth
- **Branch:** `fix/share-security-hardening` · **Spec:** [06_SECURITY_AUDIT.md](06_SECURITY_AUDIT.md) (SEC-01..15), [09 §5](09_IMPLEMENTATION_PLAN.md).
- **P-Sec-1 (tiny):** HMAC `ip_hash`/`ua_hash` (SEC-02); add `publication_id` to recipient lookups (SEC-06); generic 500 envelope (SEC-15); no-`dangerouslySetInnerHTML` regression test (SEC-08). **P-Sec-2:** `Referrer-Policy: no-referrer` on `/share` then move recipient token off the URL (SEC-01); CSP tighten + HSTS + `noindex` (SEC-05, **own deploy**); unsubscribe interstitial (SEC-14).

### Track T4 — Database pass  ·  DEFERRED (needs DB write channel)
- **Spec:** [05 §4-A](05_DATABASE_AUDIT.md). Order when opened: index hygiene (gate drops on `EXPLAIN` zero-scan) → RLS-on-events → event retention (pg_cron) → rate-limit GC → snapshot row de-dup (versioned) → activity UNION RPC. **Design-ready DDL only — do not apply.**

## 4. VERIFICATION GATE (every track, before PR)

Run and paste the output — do not claim green without it:
- `bun run validate` (typecheck + ESLint + design-system lint + unit + DOM Vitest) — must pass.
- `bun run build` (Next 16 production build) — must pass.
- Targeted suites for the track: `tests/vitest/project-publication-*`, `tests/vitest/share/*`, `tests/vitest/publication-client-csrf.test.ts`, `tests/vitest/share-no-store-invariants.test.ts`; + the new T5/T1 regression tests.
- `code-review-graph` `detect_changes` on the diff — confirm only the intended share surface; `ProjectChartsPage` absent unless the shared chart was intentionally touched.
- **T1 only:** visual diff vs the P-UI-0 baseline (expected churn only); manual browser pass at 375/768/1366/1440/1536 once a live URL is available.

## 5. COMMIT & PR CONVENTION (match the repo's `git log`)

- Conventional commits scoped to the feature: `fix(shared-link): …`, `feat(share): …`, `perf(share): …`, `chore(design-system): …`.
- Frequent, small commits (one per task/step per the execution skill).
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- One PR per track; PR body links the track's spec doc + the verification output. Do not push or open PRs unless the owner asks.

## 6. DEFINITION OF DONE (per track)

The track's ACs pass; `bun run validate` + `bun run build` green with output shown; targeted suites green; the MCP graph shows only the intended surface; the change is on its own branch/deploy with a verified instant-rollback path; (T1) the visual diff shows only intended churn and a live-browser pass was done; (T5) the P-Mod-0 regression tests now pass and the data-loss bugs are demonstrably closed.

## 7. WHAT NOT TO DO (the traps the 2nd pass surfaced)

- ❌ Don't edit `globals.css` tokens or `button.tsx`/`workshop-tree` to restyle `/share` (turns LOW → app-wide HIGH blast radius).
- ❌ Don't treat the type scale as a config line — it needs the enforcer change on its own deploy first.
- ❌ Don't build the `xl` sticky rail before shipping the cheaper MVP, and never make Comments part of the sticky block.
- ❌ Don't run any migration (no DB channel) — leave [DB] items as ready `.sql` for a human.
- ❌ Don't wire in `ShareFloatingTreeNav` (dead code — remove it).
- ❌ Don't re-chase the already-fixed CSRF/activity-403/hydration "bugs."
- ❌ Don't claim a target as measured — measure at execution or label it.

---

*Spec set: [00](00_INDEX_AND_SCORECARD.md)–[13](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md) in this folder. Honest confidence + the rubric: [11](11_SCORING_AND_INTEGRITY.md). This handoff prompt is the entry point; expand per-task TDD steps at execution via `superpowers:subagent-driven-development` / `superpowers:executing-plans`.*
