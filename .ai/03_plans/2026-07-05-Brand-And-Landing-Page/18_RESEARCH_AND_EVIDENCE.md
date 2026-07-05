# 18 — Research and Evidence

**Source authority:** This plan + `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` v4.3 §2 (competitive research canon).
**Verification mode:** `emulated` — background librarian (bg_57b2df9e) failed; substitute is `MASTER §2` canon + lead's AEC market knowledge.

---

## 1. Research attempted

| Task ID | Lane | Goal | Status | Substitute |
|---|---|---|---|---|
| `bg_57b2df9e` | Librarian (background) | Cited external research on SaaS/AEC landing page best practices, competitive landscape, QS software, freemium pricing, trust signals, SEA construction SaaS | ⛔ Failed (30min timeout) | Emulated synthesis from `MASTER §2` (canon) + lead's direct market knowledge |
| `bg_2aafffb3` | Explore (background) | Line-level beta-wording + brand asset inventory | ⛔ Cancelled (24min timeout) | Lead-direct `rg` + file reads; output captured in `03` §3 |

---

## 2. Primary source: `MASTER §2` (canon)

`.ai/00_corpus/ARCHESTIMATOR_MASTER.md` v4.3 §2 contains competitive research ratified in v3.0 (2026-06-12). It is the authoritative source for this plan's competitive positioning.

### 2.1 Cited competitors (from `MASTER §2`)

| Competitor | Position | Source |
|---|---|---|
| InEight Estimate | Benchmarks new estimates against historical/as-built project data; reusable templates; "improve defensibility." | `MASTER §2` Finding 2 |
| Ediphi | Saves completed projects into a searchable cost history; pull from past bids to price similar work fast. | `MASTER §2` Finding 2 |
| Beck Technology (DESTINI Estimator) | Centralized historical cost database; "tell a story about your estimate" and defend it; version comparison. | `MASTER §2` Finding 2 |
| Zebel | Your project history becomes a database that "evolves with your business" (blends anonymized cross-customer market data). | `MASTER §2` Finding 2 |
| RSMeans Data Online | Historical + predictive cost data, plus Flash AI estimating. | `MASTER §2` Finding 2 |
| ConWize | Price benchmarks from previous-project data; frames the exact pain of disorganized, un-findable past data. | `MASTER §2` Finding 2 |
| CloudZero | "Cost intelligence platform for cloud/FinOps" — owns the bare phrase "cost intelligence". | `MASTER §2` Finding 1 |

### 2.2 Differentiation position (from `MASTER §2`)

The four defensible wedges (`08` §6):
1. Fit, reach, price (SEA SMB + supplier segment enterprise ignores)
2. Proposal-to-approval + 2-sided client record
3. Supplier-linked bridge (estimate → catalog → quote → procurement)
4. Private by design (deliberate opposite of Zebel's cross-customer benchmark)

---

## 3. Secondary sources (lead's AEC market knowledge)

These are emulated findings that the lead brought to the plan. They are NOT cited external research; they're the lead's general market knowledge. **Treat as `inference` per `Multi-Agent-Execution-Directive.md` §11 evidence classes.**

### 3.1 B2B SaaS landing page best practices (emulated)

- Hero copy should answer "what is this, who is it for, can I try it" in the first scroll. (Standard SaaS landing wisdom.)
- Pricing page leads with model shape, not "we are validating". (Common B2B SaaS pattern.)
- Founder-led pages need a real founder block; empty slots signal pre-product. (Common B2B buyer behavior.)
- Customer proof is the strongest conversion signal; without it, product proof (screenshots) is the next best. (Standard B2B conversion research.)
- FAQ should answer buyer-journey objections (different-from-X, data-ownership, cancellation), not product-feature questions. (Standard B2B FAQ pattern.)

### 3.2 AEC industry copy conventions (emulated)

- AEC buyers respond to discipline-specific vocabulary: BOQ, DUPA, unit cost, source note, assembly, variant, finish option, change order.
- Enterprise estimating software emphasizes "defend your number" + "historical benchmarks".
- Philippine/SEA construction industry runs on Excel + WhatsApp + PDF. Spreadsheets are the status quo, not the exception.
- Trust signals that resonate in SEA: founder photo, local presence, peso pricing, data residency (Cloudflare edge).

### 3.3 Cloudflare Workers + Better Auth as trust signal (emulated)

- Cloudflare Workers is recognized as modern, edge-native, performant infrastructure.
- Better Auth 1.6.22 is a recognized modern auth library (Google OAuth + magic link).
- The combination signals "modern SaaS stack" to a technical buyer. To a non-technical AEC buyer, the line "Private by design. Built on Cloudflare Workers, D1, R2, and Better Auth" reads as legitimate substance, not marketing fluff.

---

## 4. Substitutes and evidence gaps

| Source | Original plan | Substitute | Gap |
|---|---|---|---|
| B2B SaaS landing best practices | Librarian bg_57b2df9e (failed) | Lead's emulated synthesis | No cited primary research; relies on general knowledge |
| AEC competitive landscape | Librarian bg_57b2df9e (failed) | `MASTER §2` canon | `MASTER §2` is from 2026-06-12; may need refresh if competitors ship new features |
| Beta-wording line inventory | Explore bg_2aafffb3 (cancelled) | Lead-direct `rg` + file reads | Complete; no gap |
| Landing page section best practices | N/A | Lead's emulated synthesis | No cited primary research |
| Cloudflare stack trust signal | N/A | Lead's emulated synthesis | Adoption perception unmeasured (ASSUMP-010) |

**Evidence gaps accepted:** The plan's competitive positioning is canon-grounded (`MASTER §2`). The landing-page section architecture is emulated best-practice. The brand voice recasts are source-grounded (`MASTER §10.2`). The beta-wording inventory is repo-grounded (direct `rg` output). All four are sufficient for planning; the gaps would only matter for marketing-channel optimization (out of scope for this plan).

---

## 5. What was searched for but not found

| Question | Status |
|---|---|
| Are there cited, current (2025-2026) studies on AEC software landing page conversion? | Not searched (librarian failed) |
| What do SEA/Philippine AEC buyers specifically look for in SaaS trust signals? | Not searched (librarian failed) |
| What's the average B2B SaaS hero CTA click-through benchmark? | Not searched (librarian failed) |
| What's the average B2B SaaS pricing page conversion benchmark? | Not searched (librarian failed) |

These gaps are accepted because:
- The plan's goal is brand + landing page recast, not channel optimization.
- Channel benchmarks matter for Phase 6 A/B test analysis, not for planning.
- The substitutes (`MASTER §2` canon + lead's market knowledge) are sufficient for the planning decisions.

---

## 6. Recommendations for the implementation pass

When the implementation agent reaches Phase 6 (A/B + analytics), they should:
1. Use the measurement plan to collect real CTR / scroll-depth / signup-conversion data.
2. Compare against industry benchmarks if available (Search: "B2B SaaS landing page conversion benchmark 2026").
3. Use the A/B test variant B result to validate or invalidate the hero CTA recast.
4. Use scroll-depth data to validate or invalidate the section altitude graph (`07` §1).

The plan does not block on these — they're measurement-phase activities.

---

## 7. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1 Research attempted | `00` §4.3 skill discovery honesty + `17` §3.2 verification mode cap |
| §2 `MASTER §2` canon | `10` competitive positioning + `08` §6 wedges |
| §3 Emulated findings | `07` section architecture + `06` voice recasts |
| §4 Substitutes and gaps | `14` RISK-014 (independent verifier) |
| §5 Not found | `11` Phase 6 measurement plan |
| §6 Recommendations | `11` Phase 6 + `13` analytics instrumentation |
