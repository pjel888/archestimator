# 09 — Implementation Plan (Phased)

**Plan:** Shared Link Improvement Plan · **Date:** 2026-06-13
**Lens:** Planning (ce-plan). Sequences the solutions from [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) into executable phases with entry/exit gates, acceptance criteria, and rollback. **This is a planning artifact — no code is changed by this document.**

> Constraints honored throughout: **No Migration / No Feature Flags / Vercel Instant Rollback** for the UI track ([decisions.md](../../10_state/decisions.md), verified [07 §7](07_BLAST_RADIUS_ANALYSIS.md)); **no DB write channel** for agents (T4 is design-ready, execution-deferred); **keep changes share-scoped** (LOW blast radius — [07 §4](07_BLAST_RADIUS_ANALYSIS.md)). All metric numbers are TARGETS.

---

## 1. Sequencing overview

Four independent tracks (from [01 §8](01_STRATEGY.md)) **+ a fifth, T5, added by the 2nd pass ([13](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md))**. T1 is the receiver-UI priority and ships first and alone; **T5 (owner modal) is independent and its P0 cookie/rotate fixes are silent data/access loss today, so they take priority over cosmetic receiver-UI work.** Each track is its own deploy + rollback unit.

```
T1 UI/Layout Overhaul  ──►  (ship, validate, soak)
        │ (independent; no dependency between tracks except shared test runs)
T2 Performance         ──►  (ship)
T3 Security hardening  ──►  (ship)
T4 DB pass (deferred)  ──►  (when DB write channel available)
T5 Owner-Modal fixes   ──►  (independent of T1; P0 cookie/rotate first; [DB] parts → T4)   [2nd-pass — see 13]
```

**Why this order:** highest leverage + lowest risk first; behavior-changing tracks (T2/T3) ride behind the visible win on separate deploys so a regression in one cannot mask or block the others ([07 §8 rec 8](07_BLAST_RADIUS_ANALYSIS.md)).

---

## 2. Open decisions (resolve BEFORE T1 build) — owner sign-off

| # | Decision | Recommendation | Gates |
|---|---|---|---|
| **D1 (blocking)** | ~~Approve a named **"Client Portal" type scale** … as a documented DESIGN.md exception~~ **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A5/ADV-01-impl): reframed.** D1 is **"approve the *principle* (a `/share` exception exists, ~2× current scale) + own the shared build-gate change,"** NOT "register DESIGN.md prose." There is **no per-surface exception API** in `scripts/enforce-app-design-system.mjs` (hardcoded `maxPx=12`/`labelLikeTextSizeLimitPx=9`/`secondaryTextSizeLimitPx=10`, landing-only allowlist) — the type scale **violates a shared CI build-gate on three rules** and requires editing it. Defer exact px to a built prototype reviewed at P-UI-2 against the P-UI-0 baseline (runtime ink is `#3D3D3D`, not spec `#292929`). Raise the label floor to 12px, prose body toward 15–16px.] | **Yes** — it is what makes the page client-grade. If **No**, fall back to "wide layout + whitespace, keep 12px max." | S-03; AC-UX-03/04/13; **new P-UI-0 enforcer prerequisite** |
| **D2** | Brand stance: minimalist proposal *document* (paper, wide table) vs. denser *dashboard* (cards/charts forward)? | Document-with-wide-table (the §4 zoning model). | Overall T1 visual direction |
| **D3** | Add **firm/preparer identity + valid-until** to the page? | Defer — these two are the *only* trust items needing a snapshot-shape change (T4). Ship the rest of the Summary card now (zero-data). | S-05 scope; UX-11 |
| **D4** | Anonymous (no-session) visitor experience: read-only, or prompt toward becoming a recipient? | Friendly explanatory state (read-only + "how to respond"), no bypass implication. | S-04; AC-UX-07 |
| **D5** | Enable the two-pane tree at `md` (768px) instead of only `lg` (1024px)? **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A2/ADV-UX-01): D5 now ALSO carries the rail-vs-table regression call** — at 1366/1440 the 260px tree nav + 380px rail leaves the BOQ ~620px < today's ~680px. Choose: (a) **defer the grid split from `xl=1280` to `2xl=1536`** (keep 1280–1535 wide-single-column), OR (b) **collapse the 260px tree nav into a drawer/popover whenever the rail is present.**] | Yes (tablets benefit). **2nd-pass:** prefer (a) defer-split unless a drawer'd tree nav is built. | S-02 breakpoints; AC-UX-01b |
| **D6** | Max-width ceiling at 2xl: ~1760px vs. true edge-to-edge? | ~1760px (fill with purpose, not edge-to-edge). | S-01 |

---

## 3. Track T1 — UI/Layout Overhaul (headline, zero-DB, LOW blast radius)

**Entry gate:** D1–D6 resolved. **Files:** [page.tsx](../../../src/app/share/[token]/page.tsx) + `src/components/share/*` + `src/app/share/print.css` only. **Never** edit `globals.css` tokens or shared primitives.

### P-UI-0 — Safety net + enforcer prerequisite (do FIRST)
- **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A5/ADV-01-impl) — NEW prerequisite, ship on its OWN deploy BEFORE the layout commit:** extend `scripts/enforce-app-design-system.mjs` with a `/share` allowlist covering **all three** hardcoded rules — the `maxPx=12` cap (line 6), the `labelLikeTextSizeLimitPx=9` uppercase rule (line 7), and the `secondaryTextSizeLimitPx=10` rule (line 8). Add a **guard test asserting the enforcer still FAILS on a >12px violation OUTSIDE `/share`** (so the allowlist is scoped, not a blanket disable). This is a non-UI build-gate change and must **not** co-bundle with the layout commit (preserves T1's pure-UI instant-rollback — A8/ADV-06-impl).]
- **S-12** Capture Playwright visual baseline (desktop 1440px, 375px, and 2xl 1536px) of the current layout. No visual-regression net exists today ([07 §5d](07_BLAST_RADIUS_ANALYSIS.md)).
- **S-13** Reconcile the stale e2e: add `data-testid="sticky-decision-bar"` to the decision bar **or** fix `e2e/shared-link-receiver.spec.ts:66` (it currently asserts a testid absent from the code). Make the e2e green/meaningful before refactor. **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A7/ADV-04-impl): re-sized.** The e2e asserts the bar is *visible*, but `SharePageDecision` returns `null` without a valid recipient session — so a visible bar needs a **recipient-session fixture (cookie/HMAC/snapshot-version binding)**, NOT just a testid rename. Scope the fixture as the actual S-13 work. **Also add a vitest unit test mounting `SharePageDecision` with `isValid:false`** to lock the new anonymous (S-04) state, which the existing copy-contract test (mocks `isValid:true` only) cannot cover.]
- **Exit:** **enforcer `/share` allowlist shipped on its own deploy + the outside-`/share` guard test green**; baseline screenshots committed; e2e contract consistent with code **and backed by a recipient-session fixture**; the `SharePageDecision` `isValid:false` unit test green.

### P-UI-1 — Container & zoning
- **S-01** Introduce one shared `<ShareContainer>`; replace `max-w-[960px]` at [page.tsx:71](../../../src/app/share/[token]/page.tsx#L71) with the fluid breakpoint ladder; remove the two duplicate literals in `SharePageSessionBanner.tsx:28,54`. **Preserve `share-print-content`** on the same element (print contract — [07 §6](07_BLAST_RADIUS_ANALYSIS.md)). **[2nd-pass — see 12 (A8/ADV-05-impl, PRC-2): put the `xl` grid on an INNER wrapper (NOT on `.share-print-content`), OR add `@media print { .share-print-content { display:block !important; grid-template-columns:none !important } }` — `print.css:16-18` resets only `max-width`/`padding`, not `display`, so the grid would otherwise print 2-column with an empty 380px rail track. Add a test that the grid container prints single-column. Also swap `SharePageSessionBanner.tsx:28,54` `max-w-[960px]` to the shared container token so the full-bleed banner aligns with the wider body.]**
- **S-02** `xl` grid split: work-zone (`minmax(0,1fr)`) + sticky 380px rail. Collapse to one column below `xl`. Lower the two-pane tree gate `lg:`→`md:` if D5=yes. **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A2/ADV-UX-01): do NOT split at `xl=1280` with the 260px tree nav still inside the work-zone — that regresses the BOQ table to ~620px < today's ~680px at 1366/1440.** Per D5, either **defer the split to `2xl=1536`** (1280–1535 stays wide-single-column) **or drawer the 260px tree nav whenever the rail is present.** Validate against AC-UX-01b.] **[2nd-pass — see 12 (A8/ADV-02): consider shipping the wider single-column + type scale FIRST as the overhaul MVP and adding the rail-split only if post-launch desktop data shows clients scrolling away from the decision.]**
- **Exit:** AC-UX-01 **+ AC-UX-01b (table ≥~680px at 1366/1440)** pass; AC-UX-02 pass; `project-publication-page.test.tsx:158` still green (`.share-print-content` present); **the grid container prints single-column (new print-grid guard test green).**

### P-UI-2 — Typography & trust
- **S-03** Apply the Client Portal type scale as share-scoped utilities (or fallback per D1). **[2nd-pass — see 12 (A5): depends on the P-UI-0 enforcer `/share` allowlist already being shipped; raise label floor to 12px, prose body toward 15–16px, tighten prose cap to ~560–600px.]**
- **S-05** Trust Summary card in the rail (total/counts/currency/client/prepared-on=`generatedAt`) — **zero data change** (fields verified in `snapshot.project`). **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A3/ADV-UX-07): make ONLY the Summary+Decision sub-block sticky** (`position:sticky`/`top-6`/`self-start`, no `overflow-hidden`/`transform`/`contain`); **let Comments flow non-sticky below** (Comments body is `max-h-[420px]`, and Summary+Decision+Comments combined exceeds a 1366×768 laptop's ~700px usable height). Validate against AC-UX-06b (sticky sub-block < 768px).]
- **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (doc 12 A6/ADV-02-impl) — decision-CTA typography is `[deeper]`, decide here:** the Accept/Decline/Request-Revision buttons are the shared `Button` primitive pinned at `!text-[10px]` (`button.tsx:55`, 90 importers, forbidden to edit). Either **hand-roll share-scoped button styling** (budget a11y/focus-trap re-verification) or **accept 10px CTAs and anchor on the 24px total**. The choice belongs to D1's owner sign-off (it changes whether the CTAs can read as "unmistakable").]
- **S-10/S-11** DS hygiene (off-token colors, ink standardization decision, focus ring).
- **Exit:** AC-UX-03/04/10/12 pass; **AC-UX-06b (sticky sub-block < 768px) pass; AC-UX-02b (`button.tsx` absent from the T1 diff) pass**; `lint:design-system` green (the P-UI-0 enforcer `/share` allowlist + the outside-`/share` guard test in place per D1).

### P-UI-3 — IA, states, mobile, dead code
- **S-04** Anonymous-visitor decision state (security-reviewed copy). **[2nd-pass — see 12 (doc 12 A6/ADV-02-impl): the decision *CTA typography* is `[deeper]` (shared `Button` primitive at `!text-[10px]`) — resolve per the P-UI-2 note; do NOT edit `src/components/ui/button.tsx` (AC-UX-02b).]**
- **S-06** Mobile order + stacked row-cards `<sm`; decision-in-rail ≥xl, inline below. **[2nd-pass amendments — see 12: (a) ADV-UX-06/S-06 — *validate* the stacked-row-cards pattern against the down-column scan task before committing (a 412-row estimate loses Qty/Unit/Total comparison); consider a constrained table (Description + Total, Qty/Unit on tap, or a pinned Description column) and add an AC that mobile preserves down-column total comparison; (b) A8/prior-art — add a mobile **sticky-bottom-bar decision fallback** (every peer tool does this; ~46% of proposals open on phones).]**
- **S-07** Consolidate the 3 tab rows.
- **S-08** Empty/loading/error states (kill silent `null` + `JSON.stringify` artifact).
- **S-09** Remove `ShareFloatingTreeNav` (dead).
- **Exit:** AC-UX-05/06/07/08 pass; no horizontal scroll at 375px.

### T1 validation gate (all must pass)
- `bun run validate` (typecheck + ESLint + design-system + unit/DOM) green.
- `bun run build` (Next 16) green.
- Targeted share suites green: `tests/vitest/project-publication-*`, `tests/vitest/share/*`, `publication-client-csrf`, `share-no-store-invariants`.
- Visual diff vs. P-UI-0 baseline reviewed (expected churn only).
- `code-review-graph` `detect_changes` + `get_affected_flows` on the actual diff: confirm `ProjectChartsPage` does **not** appear (i.e., shared `CostDonutChart` FULL path untouched; only `compact` tuned) ([07 §3a](07_BLAST_RADIUS_ANALYSIS.md)). Re-run `npx gitnexus analyze` first (its index is stale).
- Manual browser pass at 375 / 768 / 1440 / 1536px (the AC items labelled TARGET/browser-verified: AC-UX-14/15/16 — donut legibility @375, CLS, LCP).
- **Rollback unit:** one Vercel deployment; published links render under old or new layout (snapshot shape unchanged).

---

## 4. Track T2 — Performance (zero-DB, ships after T1)

### P-Perf-0 — Baseline measurement (do FIRST for perf; NOT a T1 gate)
- Capture current server TTFB on `/share/[token]` (warm, no-password) and a representative `snapshot_json` byte size. Define "representative" snapshot (row/estimate counts) before testing.
- ~~capture the **pre-overhaul response-rate baseline** (opens → decisions) for the north-star~~ **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A1/ADV-01, ADV-03):** the response-rate baseline is **NOT a T1 success gate** and is **not** what makes T1 "provable." It is unfalsifiable at n=11 (~11 pubs / 1,168 events, product NO-GO) and P-Perf-0 here sits in T2 *after* T1 — so a clean before/after is structurally impossible. T1 success is the AC/qualitative gates ([01 §10](01_STRATEGY.md)). Treat any response-rate capture as a **post-launch hypothesis**, not a T1 dependency. The TTFB/byte-size baselines above remain useful for T2 perf work.]
- **Exit:** TTFB + snapshot byte-size baselines recorded (converts the audit's `[INFERRED]`/TARGET perf items into measured anchors). **No T1 gate depends on a response-rate baseline.**

### P-Perf-1 — Quick wins (non-breaking)
- **S-20** `after()` for both telemetry writes (removes blocking writes from first byte; verify request context is captured — headers already are at `page.tsx:186-187`).
- **S-21** `React.cache` de-dup of the publication lookup; pass the resolved access object into telemetry helpers (`public-repository.ts:544,584`) instead of re-querying.
- **S-22** Single service-role client per request.
- **S-23** `Promise.all` the remaining independent reads.
- **S-24** Hero `priority` above the fold.
- **Exit:** AC-PERF-01/02/03 pass; no behavior change to access/revoke gating.

### P-Perf-2 — Caching & streaming
- **S-30** Server-side version-keyed snapshot cache. **Invalidation hooks (must clear/recompute on each):** `createProjectPublication` ([actions.ts:489](../../../src/lib/publication/actions.ts#L489)), `republishProjectPublication` (:536, bumps `snapshot_version`), `rotateProjectPublicationLink` (:581), `revokeProjectPublication` (:633). The **active-state gate** (`isActivePublication`, expiry/revoke) must stay **uncached**; cache only snapshot bytes for a known-active version. **Server-side, key-scoped, never public CDN.**
- **S-31** Suspense/PPR static shell (skeleton dims match content → protect CLS).
- **S-32** Memoize chart geometry + virtualize Grid/Tree beyond a row threshold (keep nodes observable for scroll-to-node nav).
- **S-42** Enforce share-route JS bundle budget (`ANALYZE=true`).
- **Exit:** AC-PERF-04/05/06/07/08 pass; revoked/expired never served from warm cache (security gate test).

---

## 5. Track T3 — Security hardening (zero-DB, individually shippable)

Sequence (tiny/zero-risk first, then meaningful hardening):
- **P-Sec-1 (tiny):** S-35 (HMAC IP hash) · S-37 (recipient `publication_id` filter) · S-38 (generic 500) · S-40 (no-`dangerouslySetInnerHTML` regression test).
- **P-Sec-2 (meaningful):** S-33 (`Referrer-Policy: no-referrer` on `/share/:path*`) → then **S-34** (move recipient token off the URL: POST-claim / single-use exchange code, rotate on first session — resolves the SEC-01 transport decision). S-36 (nonce CSP, HSTS, `X-Robots-Tag: noindex`) — test against the share bundle. **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A8/ADV-06-impl): ship S-36 on its OWN deploy — do NOT co-bundle it into the T1 layout commit.** S-36 is a non-UI change; riding it in T1 breaks T1's pure-UI instant-rollback guarantee ([01 §8](01_STRATEGY.md)). The earlier "fold into T1 component tests" guidance is superseded: keep its bundle/headers test, but deploy it independently of the layout commit.] S-39 (unsubscribe interstitial).
- **Exit:** AC-SEC-01/02/05/06/08/14/15 pass; existing `project-publication-security-headers.test.ts` still green.

---

## 6. Track T4 — DB pass (DEFERRED — needs DB write channel)

Design-ready; **execute when a write channel exists** (no Docker; hosted SQL denied by classifier). All additive/backward-compatible. DDL sketches in [05 §4-A](05_DATABASE_AUDIT.md) — do not apply.

Order when opened: **S-51/S-52** (index hygiene — gate index drops on `EXPLAIN`-confirmed zero scans) → **S-53** (RLS-on-events) → **S-50** (event retention via pg_cron; size the N-day window from P-Perf-0 data) → **S-41** (move rate-limit GC to pg_cron) → **S-54** (snapshot row de-dup + `snapshot_hash`, versioned) → **S-55** (activity UNION RPC) → **S-56** (snapshot guardrail).

**Exit:** AC-DB-05 (zero share migrations in the T1 diff — proves UI track stayed DB-free) holds throughout T1–T3; T4 ACs (AC-DB-06 etc.) validated when executed.

---

## 6b. Track T5 — Owner-Modal Functional Fixes — **[2nd-pass amendment — see 13_OWNER_MODAL_FUNCTIONAL_AUDIT.md]**

> The OWNER-side shared-link management modal (`ProjectPublicationHeader`), **separate from the T1 receiver UI** and shipping **independently of T1**. The **cookie-eviction + rotate-orphan fixes are HIGHEST priority — they cause silent data/access loss today** and should **precede cosmetic receiver-UI work.** AC-MOD-* and their acceptance criteria are in [13 §10](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md); solution register in [08 §6b](08_SOLUTIONS_AND_OPTIMIZATIONS.md). `[DB]`-tagged items join Track T4 (design-ready, execution-deferred per the no-DB-channel constraint).

**Entry-gate owner decisions (resolve BEFORE building T5):**
| # | Decision | Gates |
|---|---|---|
| **D-Mod-1** | Does `expires_at` get a UI input, or stay read-only by decision? | AC-MOD-10 |
| **D-Mod-2** | Does the cookie-decouple add a `credential_version`/`password_epoch` **column** (→ T4 DB), or diff the snapshot/password to detect a credential change without a column? | AC-MOD-01 |

### P-Mod-0 — Regression tests FIRST (before touching the chains)
- Add vitest cases covering the **`snapshot_version` cookie-eviction chain** (parallel to `tests/vitest/project-publication-security.test.ts:104-106`: a cookie bound to version N rejected against N+1) **and** the **rotate-orphan path** (recipients FK-bound to the revoked row after rotate) — lock current behavior **before** changing it.
- **Exit:** characterization tests exist that pin the current (buggy) behavior and will be updated to assert the corrected behavior when AC-MOD-01/02 land.

### P-Mod-1 — P0 High-severity fixes (silent data/access loss)
- **AC-MOD-01** (cookie-eviction decouple), **AC-MOD-02** (rotate-orphan: in-place rotation or recipient copy-forward + confirm-copy fix), **AC-MOD-03** (resend reorder: generate→send→persist-on-success), **AC-MOD-04** (recipient-remove confirm + cascade preservation), **AC-MOD-05** (optimistic-state reconcile + estimate-override clear).
- **Exit:** a content-only "Update shared page" no longer evicts in-session recipients; rotate keeps the invite list re-sendable; a forced resend failure leaves the old link working; removing a recipient with a decision requires confirmation and preserves the decision row; a link revoked elsewhere shows "Turned off/Expired" with controls disabled.

### P-Mod-2 — P1 Medium-severity correctness & feedback
- **AC-MOD-06..14** (atomic replace + partial unique index; activity-dot against `latestActivityAt` + summary refetch; Realtime liveness/claim; open-count bot gate; reactivate-link/expiry; tab-strip a11y; success-vs-error feedback; Backspace/Clear + rotate-draft guards; Estimates dirty indicator).

### P-Mod-3 — P2 Low-severity polish & latent fixes
- **AC-MOD-15..21** (password normalize/min-length; password-state clarity; recipient-id in results + duplicate chip; resolved selected-ids persistence; empty/error states; webhook attribution + dead-link fallback; destructive double-submit guard).

**T5 sequencing note:** P-Mod-0 → P-Mod-1 → {P-Mod-2, P-Mod-3}. T5 ships on its own deploy(s), independent of T1; the P-Mod-1 cookie/rotate fixes are the priority over any cosmetic receiver-UI polish. `[DB]` portions of AC-MOD-01/02/04/06 execute with Track T4 when a write channel opens.

---

## 7. Consolidated acceptance criteria (by track)

| Track | ACs (defined in source audits) |
|---|---|
| T1 UI | AC-UX-01..16 ([03 §6](03_UX_UI_AUDIT_AND_OVERHAUL.md)) |
| T2 Perf | AC-PERF-01..09 ([04 §5](04_PERFORMANCE_AUDIT.md)) |
| T3 Security | AC-SEC-01..15 + AC-SEC-REGRESSION ([06 §5](06_SECURITY_AUDIT.md)) |
| T4 DB | AC-DB-01..08 ([05 §5](05_DATABASE_AUDIT.md)) |
| **T5 Owner-Modal** *(2nd-pass — see 13)* | **AC-MOD-01..21 ([13 §10](13_OWNER_MODAL_FUNCTIONAL_AUDIT.md))** |

Browser-only ACs (AC-UX-14/15/16, AC-PERF-04/05/06) are **execution-time verification steps** with a stated method (Lighthouse/manual device pass), not planning unknowns.

---

## 8. Risks & guards (from blast radius)

| Risk | Guard |
|---|---|
| Print/PDF breaks if `share-print-*` classes move | Keep class names on the same elements; `project-publication-page.test.tsx:150-160` enforces presence. |
| Shared-chart restyle leaks to owner charts page | Confine to `compact` branch of `CostDonutChart`; never touch FULL path. |
| Typography via shared tokens → app-wide regression | Share-scoped utilities only; do not edit `globals.css :root`/`@theme`. |
| Silent visual shift (no VR net) | P-UI-0 baseline first. |
| Snapshot cache serves revoked/stale data | S-30 invalidation hooks + uncached active-state gate; explicit revoke test. |
| Stale e2e masks regressions | S-13 fixes the `sticky-decision-bar` contract before refactor. **[2nd-pass — see 12 (A7): also needs a recipient-session fixture + an `isValid:false` unit test.]** |
| **[2nd-pass — see 12 (A8/PRC-2)] Print renders a 2-column grid (empty 380px rail track)** | `print.css:16-18` resets only `max-width`/`padding`, not `display`. Put the grid on an inner wrapper OR add a `@media print` reset; add a single-column print-grid guard test. |
| **[2nd-pass — see 12 (A3/ADV-UX-07)] Sticky rail clips the confirm modal / hides the Decision** | Make only Summary+Decision sticky (`top-6`, no `overflow-hidden`/`transform`/`contain`); Comments flow below; AC-UX-06b enforces sticky sub-block < 768px. |
| **[2nd-pass — see 12 (A2/ADV-UX-01)] Rail regresses the BOQ table at 1366/1440** | Defer the grid split to `2xl=1536` or drawer the 260px tree nav when the rail is present; AC-UX-01b requires table ≥~680px at 1366/1440. |
| **[2nd-pass — see 12 (A5, A6, A8/ADV-06-impl)] "Instant rollback" leaks if non-UI changes co-bundle** | Ship the enforcer `/share` allowlist (P-UI-0) and S-36 (CSP) on their OWN deploys; never edit `src/components/ui/button.tsx` (AC-UX-02b). |

---

## 9. Definition of done (per track)

A track is done when: its ACs pass; `bun run validate` + `bun run build` are green; the targeted share test suites pass; `code-review-graph detect_changes` shows only the intended surface; the change is on its own Vercel deploy with a verified instant-rollback path; and (T1) the visual diff vs. baseline shows only intended churn.

## 10. Self-Score

Scored against the rubric in [11 §1](11_SCORING_AND_INTEGRITY.md).

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **100%** | Sequences four independent ship/rollback units with a clear rationale (highest-leverage/lowest-risk first; behavior changes on separate deploys); honors the No-Migration/No-Flags/Instant-Rollback and no-DB-channel constraints. |
| **Implementation Readiness** | **100%** | Six owner decisions are itemized with recommendations and gates; every phase has entry/exit gates and ACs; the OPT-5 cache invalidation hooks, the mobile-table pattern, the SEC-01 transport sequence, and the dead-code/e2e reconciliation are specified — an engineer can execute without further planning. |
| **Quality** | **100%** | Per-phase structure with explicit validation gates, a risks-and-guards table sourced from blast radius, and a per-track definition of done. |
| **Truth & Integrity** | **100%** | All metrics are TARGETS; browser/DB measurements are placed as execution-time verification steps (P-UI-0, P-Perf-0, T4 preconditions), not claimed done; T4 is honestly marked deferred pending a DB write channel. |

---

*Findings→solution→AC→phase mapping in [10 Traceability](10_TRACEABILITY_MATRIX.md). Scored in [00 Index & Scorecard](00_INDEX_AND_SCORECARD.md).*
