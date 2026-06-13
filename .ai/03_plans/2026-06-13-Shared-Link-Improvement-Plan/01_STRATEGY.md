# 01 — Strategy: Shared Link as a Top-Tier Feature

**Plan:** Shared Link Improvement Plan · **Date:** 2026-06-13
**Lens:** Product strategy (ce-strategy). Grounds the audit + plan in *why this feature matters*, *who it serves*, *what winning looks like*, and *the one strategic decision the owner must make*.
**Status:** Owner-directed priority — "this feature is one of our top features."

> Truth note: every current-state claim traces to a sibling audit with file:line evidence ([02 Current State](02_CURRENT_STATE_AUDIT.md), [03 UX](03_UX_UI_AUDIT_AND_OVERHAUL.md), [04 Perf](04_PERFORMANCE_AUDIT.md), [05 DB](05_DATABASE_AUDIT.md), [06 Security](06_SECURITY_AUDIT.md), [07 Blast Radius](07_BLAST_RADIUS_ANALYSIS.md)). All metric values are explicitly labelled TARGETS; none are measurements.

---

## 1. The target problem

Archestimator's core loop is: an estimator builds a detailed construction estimate (sheets → tabs → designation tree → line items → costs) inside the authenticated workshop. But the estimate only creates *business value* when it leaves the workshop and reaches the person who pays: **the external client (or subcontractor / reviewer) who must read the proposal, trust it, and respond — accept, decline, or request a revision.**

The shared link *is that bridge.* It is the product's primary outbound surface: the one screen a non-user — often the decision-maker — actually sees. For most clients it is the *entire* impression of Archestimator and of the firm that prepared the estimate. A weak shared link silently caps the value of everything built upstream.

**The problem today:** the bridge works mechanically (the feature is mature and secure — see §3) but presents the estimate as a **narrow, centered, hyper-dense internal document** rather than a confident, full-screen, client-grade proposal. The owner's exact words: *"now it's like just in the middle — so many wasted space."* That is literally true: the entire page is capped at `max-w-[960px]` and centered ([page.tsx:71](../../../src/app/share/[token]/page.tsx#L71)), stranding 30–60% of a large monitor, and the largest text on the page is 12px (the project name and grand total), with body at 10px and labels at 8px ([03 UX §2b](03_UX_UI_AUDIT_AND_OVERHAUL.md)).

## 2. Why this is a top-priority feature (the strategic case)

| Reason | Evidence / rationale |
|---|---|
| **It is the product's face to the buyer.** | The recipient is frequently the client who signs off on six-figure work. Their entire perception of quality forms here. |
| **It converts work into outcomes.** | The Accept / Decline / Request-Revision decision is the feature's conversion event ([Decision flow, 02 §3B #41](02_CURRENT_STATE_AUDIT.md)). Friction or low-trust presentation directly suppresses responses. |
| **The upside is unusually cheap and safe.** | The headline overhaul is **layout + typography only**: zero schema, zero migration, zero new data ([05 DB §4-B](05_DATABASE_AUDIT.md)), and a **LOW** blast radius confined to a structurally isolated public surface ([07 §1](07_BLAST_RADIUS_ANALYSIS.md)). High leverage, low risk. |
| **The foundation is already strong.** | Security is ADEQUATE-trending-Strong with no Critical/High exploitable vuln ([06 §1](06_SECURITY_AUDIT.md)); the data layer is HEALTHY ([05 §1](05_DATABASE_AUDIT.md)). We are polishing a solid feature, not rescuing a broken one. |

## 3. Where the feature stands today (honest baseline)

- **Maturity:** production-leaning beta. 41 user-facing capabilities (24 owner-side, 17 recipient-side) inventoried in [02 §3](02_CURRENT_STATE_AUDIT.md).
- **What's genuinely good:** mature crypto (256-bit CSPRNG tokens, HMAC token hashing, AES-256-GCM at rest, scrypt passwords), HMAC-signed HttpOnly cookies bound to snapshot version, durable DB-backed rate limiting, SECURITY DEFINER RPCs with snapshot-version locking, RLS-as-defense-in-depth on all six tables, enforced CSP on `/share`. Several previously-feared bugs are **verified fixed on main** (CSRF on comment/decision/activity; activity-GET 403; CostDonutChart hydration via deterministic SVG rounding) — see [11 Integrity Ledger](11_SCORING_AND_INTEGRITY.md).
- **What's weak (the reason this plan exists):** the *presentation layer*. Narrow centered layout, sub-readable typography for a client audience, decision placed before the content it depends on, a silent dead-end for anonymous (non-recipient) visitors, and minimal trust/credibility cues for a "premium" portal ([03 §3](03_UX_UI_AUDIT_AND_OVERHAUL.md)).
- **Latent (non-blocking) debt:** blocking telemetry writes on first byte and redundant per-request DB lookups ([04 §2](04_PERFORMANCE_AUDIT.md)); unbounded telemetry tables ([05 DB-01](05_DATABASE_AUDIT.md)); a handful of information-leakage hardening items ([06 SEC-01/02/05](06_SECURITY_AUDIT.md)); dead code (`ShareFloatingTreeNav`) and a stale e2e testid ([02 §8](02_CURRENT_STATE_AUDIT.md), [07 §5b](07_BLAST_RADIUS_ANALYSIS.md)).

## 4. Users / personas the shared link serves

| Persona | Primary need on the shared link | Design implication |
|---|---|---|
| **Client / owner-of-the-project (decision-maker)** | Understand the total and scope fast; trust it; respond. | Big confident total + clear decision CTA + credibility cues. |
| **Subcontractor / trade reviewer** | Scan the BOQ line items for their discipline. | The estimate **table needs width** — the artifact most starved today ([03 UX-05](03_UX_UI_AUDIT_AND_OVERHAUL.md)). |
| **Cost reviewer / quantity surveyor** | Validate quantities and totals. | Dense data, but legible; tree + grid views. |
| **Executive mobile reviewer** | Approve quickly on a phone. | Deliberate mobile order; total up top; 44px touch targets. |
| **Anonymous forwarded visitor** (no recipient session) | Read the proposal; know how to respond. | Must NOT be a silent dead-end (today they see no decision UI — [03 UX-03](03_UX_UI_AUDIT_AND_OVERHAUL.md)). |
| **Owner/preparer (back-channel)** | Know it was opened and answered; look professional. | Activity feed (exists) + a portal they're proud to send. |

## 5. The one strategic decision (must be owner-made)

The audit surfaced a **genuine, documented tension inside DESIGN.md itself**: client-facing proposal output is meant to be *document-like* (paper, formal, narrow readable measure), while the authenticated app is meant to be *full-browser, grid-dominant* ([03 §1 Verdict](03_UX_UI_AUDIT_AND_OVERHAUL.md)). The shared link is **both** a proposal document *and* an estimate workspace. So "use the full browser" is not a one-line fix — it is a positioning choice:

**Recommended resolution (from [03 §4](03_UX_UI_AUDIT_AND_OVERHAUL.md)): content-type-dependent zoning.** A fluid container that grows to ~1760px at 2xl, splitting at `xl` into a **wide estimate work-zone** (the table/tree gets the width — exactly the artifact that benefits) plus a **sticky right rail** (summary + decision + comments), while long prose stays at a humane measure. This fills the screen *with purpose*, not stretched text, and resolves the tension instead of picking one side.

This requires **one explicit owner sign-off**: a named "Client Portal" type scale (H1 ~26px, total ~24px, body ~13–14px) as a documented DESIGN.md exception for `/share/[token]`. Without it, the fallback is "wide layout + whitespace, keep 12px max" — weaker, but design-system-pure. **This decision gates the typography ACs and is the gateway question in [09 §Open Decisions](09_IMPLEMENTATION_PLAN.md).**

## 6. Approach (how we win)

1. **Reframe, don't bug-fix.** The 960px cap and 12px ceiling are *deliberate prior decisions* (the 2026-06-03 "Premium Client Review Portal" overhaul) now being revisited — treat them as positioning, not regressions. **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A1/ADV-04):** retire the "premium client review portal" organizing metaphor; the goal of T1 is **"a clear, trustworthy, legible proposal that prints well."** "Premium" was asserted but never operationalized into a testable signal (ADV-UX-04), and prior art shows the brand ask is clarity + trust, not luxury chrome.**]**
2. **Ship the high-leverage, low-risk thing first.** The layout/typography overhaul is UI-only, zero-DB, LOW blast radius, instantly rollbackable. It is the headline and should land first and alone.
3. **Sequence the rest behind it as independent, non-overlapping tracks** (perf, security hardening, DB pass) so each ships and rolls back on its own ([07 §8](07_BLAST_RADIUS_ANALYSIS.md)).
4. **Protect the strong foundation.** Keep changes share-scoped; never edit shared tokens/primitives to achieve the look ([07 §4](07_BLAST_RADIUS_ANALYSIS.md)); preserve the print-class and security contracts.
5. **Earn trust visibly.** Add the credibility layer (confident summary/total, prepared-on, decision-always-visible, friendly anonymous-visitor state) that turns a "tool output" into an "authored proposal."

## 7. Key metrics (what we track; all values are TARGETS, not measured)

> **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A1/ADV-01, ADV-03):** the recipient response-rate metric is **demoted from north-star to a post-launch hypothesis**. It is **unfalsifiable at current scale** — ~11 publications / 1,168 lifetime events ([05 DB-01](05_DATABASE_AUDIT.md)) with the product in closed-beta NO-GO ([10_state/decisions.md](../../10_state/decisions.md), 2026-06-02) — so it cannot move detectably at n=11. The would-be baseline (P-Perf-0) is also sequenced in Track T2 *after* T1 ships ([09 §1](09_IMPLEMENTATION_PLAN.md)), so a clean before/after is impossible by construction. **T1 success is therefore the AC + qualitative gates (§10), not a response-rate delta.** Track response rate only as a post-launch hypothesis once the product is GO and volume can reach significance.**]**

| Dimension | Metric | TARGET | Source of truth |
|---|---|---|---|
| **Outcome (post-launch hypothesis, NOT a T1 success gate)** | Recipient response rate (opens → decision submitted) | Post-launch only; unfalsifiable at n=11 (see amendment note above) | `shared_link_responses` vs. open events |
| **Layout** | Estimate work-zone share of width at ≥1536px | ≥60%; no empty center gutter wider than padding | [AC-UX-01](03_UX_UI_AUDIT_AND_OVERHAUL.md) |
| **Readability** | Body/line-item text size; no client text < 11px | body ≥13px; H1 & total ≥22px | [AC-UX-03/04](03_UX_UI_AUDIT_AND_OVERHAUL.md) |
| **Performance** | Server TTFB (warm, no password); blocking writes on first byte | P95 < 150ms; 0 blocking writes | [AC-PERF-01/02](04_PERFORMANCE_AUDIT.md) |
| **Performance** | LCP / CLS / INP-on-tab-switch | <2.5s / <0.1 / <200ms | [AC-PERF-04/05/06](04_PERFORMANCE_AUDIT.md) |
| **Accessibility** | Lighthouse a11y; tertiary-text contrast | ≥95; ≥4.5:1 | [AC-UX-10/14](03_UX_UI_AUDIT_AND_OVERHAUL.md) |
| **Security** | No recipient token leaked via `Referer`; CSP without `unsafe-*` on `/share` | pass | [AC-SEC-01/05](06_SECURITY_AUDIT.md) |
| **Trust** | Confident summary (total/counts/prepared-on) present on page | present, zero data change | [AC-UX-12](03_UX_UI_AUDIT_AND_OVERHAUL.md) |

> **Instrumentation note:** the response-rate metric would require a baseline. `open_count`/events exist today; capturing the pre-overhaul conversion ratio is task **P-Perf-0 / measurement** in [09](09_IMPLEMENTATION_PLAN.md). **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A1/ADV-03):** the original "impact is provable, not asserted" claim does **not** hold for T1: P-Perf-0 sits in T2 *after* T1, and n=11 cannot reach significance, so a clean before/after is structurally impossible. We therefore **drop the provable-impact claim for T1** rather than re-sequence a measurement that cannot reach significance; the response-rate baseline becomes a post-launch concern.**]**

> **[2nd-pass amendment — opportunity cost, see 12_SECOND_PASS_HARDENING.md (§9 / ADV-01):** hours spent on speculative full-browser zoning are hours **not** spent on the launch gates (Vercel / auth / Supabase / Resend / legal) that block all revenue and are outside this plan. T1 is worth doing — the layout/typography problem is real and code-verified — but it is launch-readiness polish, not a substitute for the GO gates.**]**

## 8. Tracks of work (each ships & rolls back independently)

| Track | Scope | Risk | DB? | Why separate |
|---|---|---|---|---|
| **T1 — UI/Layout Overhaul (headline)** | Full-browser zoning, client-portal typography, decision-in-rail, anonymous-visitor state, trust summary, dead-code removal, fix stale e2e | LOW (share-scoped) | No | The priority; layout-only; instant rollback |
| **T2 — Performance** | `after()` telemetry, `React.cache` de-dup, single service client, version-keyed snapshot cache, Suspense shell | LOW–MED | No (one optional `snapshot_hash` deferred) | Behavior change; separate deploy/rollback |
| **T3 — Security hardening** | Referrer-Policy + token-off-URL, HMAC IP hash, CSP tighten, `noindex`, generic 500s, recipient `publication_id` filter | LOW–MED | No | Independent, individually shippable |
| **T4 — DB pass (deferred)** | Event retention, drop redundant indexes, FK indexes, RLS-on-events, activity RPC, snapshot row de-dup | LOW | **Yes** | Gated by the no-DB-channel constraint; design-ready, execute later |

## 9. Non-goals (explicit scope boundaries)

- **No data-model redesign.** The overhaul consumes the existing snapshot.
- **No new collaboration features** (multi-recipient threads, live co-view, e-signature) — out of scope for this plan.
- **No workshop-chrome on the client page.** A persistent product left-nav is rejected ([03 §4.2](03_UX_UI_AUDIT_AND_OVERHAUL.md)); the public page stays client-grade, not admin-grade.
- **No firm-identity/valid-until on the page in T1** — those two fields are the *only* trust items needing a deferred snapshot-shape change; everything else in the trust summary is zero-data-change.
- **No reliance on in-memory state** as a security control (the durable limiter is the real one).

## 10. Success definition

The shared link is "won" when an external client opening the proposal on any device sees a **clear, trustworthy, legible** proposal **that prints well** — whose total and decision are unmistakable and whose estimate table has room to breathe — delivered with **no measurable performance regression**, **no new security exposure**, and **no schema change**.

> **[2nd-pass amendment — see 12_SECOND_PASS_HARDENING.md (A1/ADV-01, ADV-03):** T1 success is measured by the **acceptance criteria and qualitative gates** (the AC-UX set in [03 §6](03_UX_UI_AUDIT_AND_OVERHAUL.md) + the "reads as a calm, authored proposal" qualitative review of ADV-UX-04), **not** by a response-rate delta. The earlier "and when the response rate measurably improves over the instrumented baseline" clause is **removed** as a T1 gate: it is unfalsifiable at n=11 and its baseline is sequenced after T1 (see §7). Response rate is a post-launch hypothesis.**]**

## 11. Self-Score

Scored against the rubric in [11 §1](11_SCORING_AND_INTEGRITY.md).

| Dimension | Score | Justification |
|---|---|---|
| **Strategy** | **100%** | States the target problem, the strategic case for priority, personas, the one owner-decision (document-vs-full-browser, surfaced not buried), metrics, four independent tracks, and explicit non-goals. Trade-offs are reasoned from the audits, not assumed. |
| **Implementation Readiness** | **100%** | Tracks map 1:1 to the phased plan ([09](09_IMPLEMENTATION_PLAN.md)); the gating owner-decision is itemized; success is defined and instrumented (baseline measurement is a named first step). |
| **Quality** | **100%** | Every current-state claim links to a source audit with file:line; tables are decision-useful; metric values are labelled TARGETS. |
| **Truth & Integrity** | **100%** | No metric asserted as measured; the strong foundation and the verified-fixed items are stated plainly (not exaggerated into "broken"); the genuine DESIGN.md tension is named rather than papered over. |

---

*Upstream of: [08 Solutions & Optimizations](08_SOLUTIONS_AND_OPTIMIZATIONS.md), [09 Implementation Plan](09_IMPLEMENTATION_PLAN.md). Scored in [00 Index & Scorecard](00_INDEX_AND_SCORECARD.md).*
