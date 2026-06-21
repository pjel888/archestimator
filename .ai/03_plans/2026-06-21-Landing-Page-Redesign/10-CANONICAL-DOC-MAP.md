# 10 — Canonical Doc Map (the cross-link source of truth)

> **STATUS: PLANNING · 2026-06-21 · not code.**
> **Purpose:** Be the single source of truth for every doc's canonical filename in this pack.
> Every cross-doc link in every doc must resolve to a name in this table. If a doc references
> a sibling by a name not in this table, the link is broken and must be patched.

This doc exists because the pack was authored in parallel and the eight original docs each
invented their own naming convention (see `MASTER-AUDIT-AND-SCORECARD.md` §2 for the
forensic detail). This is the fix.

---

## 1. The canonical filenames

| # | Canonical filename | One-line purpose | Status |
|---|---|---|---|
| 00 | `00-OVERVIEW.md` | Front door: locked decisions, pillars, scope, doc map, success criteria, sign-off items. | exists |
| 01 | `01-DESIGN-DIRECTION.md` | Direction rationale + Intercom/Amigo peg study + Hallmark diversification notes. | exists |
| 02 | `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` | Canonical homepage DOM-order section taxonomy + per-route inventories + nav/footer archetypes + funnel logic. | exists |
| 03 | `03-VISUAL-LANGUAGE-AND-TOKENS.md` | Additive token layer for `globals.css` + 2+1 type pairing (Source Serif 4 / SF Pro / Roboto Mono) + motion. | exists |
| 04 | `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` | Named, claims-tagged SVG architecture plate spec (the moat move). | exists |
| 05 | `05-COPY-SKELETON.md` | Voice-locked, claims-tagged copy per section per route. | exists |
| 06 | `06-PROOF-AND-CLAIMS-DISCIPLINE.md` | Honesty-as-proof system: `<ClaimsLedger>` component, CLAIMS MATRIX, private-by-design block, `/trust` content, claims-status update process. | exists |
| 07 | `07-ENGINEERING-CONSTRAINTS.md` | RSC-first build, responsive floor 320/375/414/768, perf/a11y budget, the "Start free" funnel + its co-dependency gates. | exists |
| 08 | `08-ROLLOUT-AND-ANALYTICS.md` | `/newdesign` preview route, A/B old vs new, claims sign-off gate, analytics events per route. | **missing (M-1)** |
| 09 | `09-CLAIMS-LEDGER-SIGN-OFF.md` | The public claims-sign-off gate; the §7.5 "public claims matrix complete" launch gate, operationalized. | **missing (M-2)** |
| 10 | `10-CANONICAL-DOC-MAP.md` | This doc. | exists |
| 11 | `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` | React/RSC component inventory: file paths, props, copy → component map, nav/header/footer anatomy. | **missing (M-3)** |
| 12 | `12-ACCESSIBILITY-AUDIT.md` | Consolidated WCAG 2.1 AA audit + test plan + compliance evidence. | **missing (M-7)** |
| 13 | `13-SEO-AND-DISCOVERY.md` | Keyword strategy, meta copy, sitemap, robots, structured data, internal linking, PH/SEA validation. | **missing (M-8)** |
| 14 | `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` | CWV targets, field-vs-lab methodology, PH+SEA device class, CI regression gate, remediation playbook. | **missing (M-9)** |
| 15 | `15-FORMS-AND-ABUSE-GUARDRAILS.md` | `/contact` + `/signup` form-spam defense, rate-limit config, honeypot, CAPTCHA decision, abuse monitoring. | **missing (M-10)** |
| 16 | `16-TEST-AND-VERIFICATION-PLAN.md` | Unit / component / e2e / visual / a11y test plan. | **missing (M-11)** |
| 17 | `17-ANALYTICS-AND-OBSERVABILITY.md` | Event schema, tool decision, consent model, retention, dashboard, moat-metric instrumentation. | **missing (M-12)** |
| 18 | `18-I18N-AND-LOCALIZATION.md` | Locale strategy (EN-only at launch? EN+FIL?), hreflang, sitemap localization, validation plan. | **missing (M-13)** |
| 19 | `19-ASSET-PIPELINE-AND-IMAGERY.md` | Favicons, OG images, founder photo, wordmark SVG, asset pipeline, "what we will not ship" rail. | **missing (M-14)** |
| 20 | `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` | Who writes/reviews/signs off, where copy lives, update cadence, bilingual workflow. | **missing (M-15)** |
| 21 | `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` | File-level change inventory, deletion rail, migration order, risk register. | **missing (M-16)** |
| 22 | `22-PEG-STUDY-DEEP-DIVE.md` | Full DNA extraction from Intercom + Amigo with screenshots / URLs / dates for evidence. | **missing (M-17)** |
| — | `MASTER-AUDIT-AND-SCORECARD.md` | The audit + scorecard (this pack's quality gate). | exists |
| — | `LOOP_LEDGER.md` | Plan-pack loop ledger: open decisions, iteration state, owner-decision queue. | **missing (M-4)** |
| — | `README.md` | Pack entry point: doc-order, dimensions, definition of 100 %. | **missing (M-5)** |

---

## 2. Alias table (the broken names → canonical names)

When patching cross-links, replace any name in the **Alias** column with the canonical name.

| Alias (broken name found in the pack) | Canonical filename |
|---|---|
| `01-COMPETITIVE-PEG-STUDY` · `01-PEG-STUDY-AND-POSITIONING` · `01-PEG-STUDY` | `01-DESIGN-DIRECTION.md` |
| `02-SECTION-TAXONOMY-AND-IA` · `02-SECTION-TAXONOMY-AND-REMOVALS` · `02-HERO-AND-VOICE` · `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` | `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` |
| `03-VISUAL-AND-TOKEN-SYSTEM` · `03-VISUAL-TOKENS-AND-TYPOGRAPHY` · `03-VISUAL-AND-TYPE` · `03-VISUAL-TOKENS-AND-TYPE` | `03-VISUAL-LANGUAGE-AND-TOKENS.md` |
| `05-COPY-LEDGER` · `05-SECTION-MARKUP-AND-COPY` | `05-COPY-SKELETON.md` |
| `06-COMPONENT-INVENTORY-AND-CONTENT-MAP` (when cited as a sibling of `06-PROOF`) | `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` (the real component-inventory doc, number 11) |
| `07-ENGINEERING-SPEC` · `07-ENGINEERING-AND-A11Y` · `07-ENGINEERING-AND-RSC` · `07-ENGINEERING-AND-RSC-PLAN` · `07-ENGINEERING` | `07-ENGINEERING-CONSTRAINTS.md` |
| `08-ROLLOUT-AND-METRICS` · `08-ROLLOUT-AND-CLAIMS-SIGN-OFF` | `08-ROLLOUT-AND-ANALYTICS.md` |
| `07-CLAIMS-LEDGER-SIGN-OFF` · `09-CLAIMS-LEDGER-SIGN-OFF.md` | `09-CLAIMS-LEDGER-SIGN-OFF.md` |
| `06-RESPONSIVE-AND-A11Y` (responsive+a11y doc) | `12-ACCESSIBILITY-AUDIT.md` (owns a11y; responsive-collapse lives in `02` §1 + `07` §2) |

---

## 3. Numbering convention (why 11+ for new docs)

The pack's original 0–7 numbering was authored before the missing-doc inventory
(`MASTER-AUDIT-AND-SCORECARD.md` §4) surfaced 17 gaps. Rather than renumber the existing
docs (which would break every citation in MASTER, Notion, and chat history), the new docs
take numbers 08–22, with `08` and `09` reserved for the two missing docs the pack already
references by those numbers (rollout + claims-sign-off). The audit (`09-MASTER-AUDIT-AND-
SCORECARD.md`) and this map (`10-CANONICAL-DOC-MAP.md`) are unnumbered-suffix docs because
they are meta — they measure and map the pack, they are not part of the implementation
sequence.

**Implementation entry order** (what to read first, for a new dev):

```
README.md  →  00-OVERVIEW  →  01-DESIGN-DIRECTION  →  10-CANONICAL-DOC-MAP (this doc)
           →  02-SECTION-TAXONOMY  →  03-VISUAL-LANGUAGE-AND-TOKENS
           →  04-COMMERCIAL-GRAPH-PLATE  →  05-COPY-SKELETON
           →  06-PROOF-AND-CLAIMS-DISCIPLINE  →  07-ENGINEERING-CONSTRAINTS
           →  08-ROLLOUT-AND-ANALYTICS  →  09-CLAIMS-LEDGER-SIGN-OFF
           →  11-COMPONENT-INVENTORY  →  dimension docs (12–22) on demand
           →  LOOP_LEDGER (open decisions)  →  21-BLAST-RADIUS (before any code)
```

---

## 4. Cross-link patch procedure (one mechanical pass per doc)

For each existing doc (00, 01, 02, 03, 04, 05, 06, 07):

1. Open the doc.
2. For every reference to a sibling doc, replace any alias in §2 with the canonical name.
3. For every reference to a doc that does not exist yet (08, 09, 11–22, LOOP_LEDGER, README),
   keep the reference but mark it `(to be created — see 10-CANONICAL-DOC-MAP.md §1)` until
   the doc lands, then strip the marker.
4. Verify with: `rg -n "01-COMPETITIVE|01-PEG-STUDY|02-HERO-AND-VOICE|02-SECTION-TAXONOMY-AND-IA|02-SECTION-TAXONOMY-AND-REMOVALS|03-VISUAL-AND-TOKEN|03-VISUAL-TOKENS|05-COPY-LEDGER|05-SECTION-MARKUP|06-COMPONENT-INVENTORY-AND-CONTENT|07-ENGINEERING-SPEC|07-ENGINEERING-AND-|07-CLAIMS-LEDGER|08-ROLLOUT-AND-METRICS|08-ROLLOUT-AND-CLAIMS" .ai/03_plans/2026-06-21-Landing-Page-Redesign/`
   — the command returns zero matches when the patch is complete.

The patch is tracked as gaps Q-CL-1 through Q-CL-9 in `MASTER-AUDIT-AND-SCORECARD.md`.

---

## 5. Dimension ownership (which doc owns which dimension)

This is the contract `README.md` → "Definition of 100 %" reconciles against. A dimension
without an owner is a gap.

| Dimension | Owning doc | Status |
|---|---|---|
| Strategy / direction | `01-DESIGN-DIRECTION.md` | ✓ |
| Section taxonomy / IA / funnel | `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` | ✓ |
| Visual language / tokens / type | `03-VISUAL-LANGUAGE-AND-TOKENS.md` | ✓ |
| The commercial-graph plate | `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` | ✓ |
| Copy / voice | `05-COPY-SKELETON.md` | ✓ |
| Claims discipline / proof model | `06-PROOF-AND-CLAIMS-DISCIPLINE.md` | ✓ |
| Engineering / RSC / responsive / funnel | `07-ENGINEERING-CONSTRAINTS.md` | ✓ |
| Rollout / A/B / analytics events | `08-ROLLOUT-AND-ANALYTICS.md` | ✗ missing |
| Claims-sign-off gate | `09-CLAIMS-LEDGER-SIGN-OFF.md` | ✗ missing |
| Component inventory / anatomy | `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` | ✗ missing |
| Accessibility (WCAG 2.1 AA) | `12-ACCESSIBILITY-AUDIT.md` | ✗ missing |
| SEO / discovery | `13-SEO-AND-DISCOVERY.md` | ✗ missing |
| Performance / Core Web Vitals | `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` | ✗ missing |
| Forms / abuse guardrails | `15-FORMS-AND-ABUSE-GUARDRAILS.md` | ✗ missing |
| Test / verification | `16-TEST-AND-VERIFICATION-PLAN.md` | ✗ missing |
| Analytics / observability | `17-ANALYTICS-AND-OBSERVABILITY.md` | ✗ missing |
| i18n / localization (PH + SEA) | `18-I18N-AND-LOCALIZATION.md` | ✗ missing |
| Asset pipeline / imagery | `19-ASSET-PIPELINE-AND-IMAGERY.md` | ✗ missing |
| Content workflow / governance | `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` | ✗ missing |
| Blast radius / migration | `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` | ✗ missing |
| Peg-study deep dive (evidence) | `22-PEG-STUDY-DEEP-DIVE.md` | ✗ missing |
| Cross-link integrity | `10-CANONICAL-DOC-MAP.md` (this doc) | ✓ |
| Audit / scorecard | `MASTER-AUDIT-AND-SCORECARD.md` | ✓ |
| Loop state / open decisions | `LOOP_LEDGER.md` | ✗ missing |
| Pack navigation | `README.md` | ✗ missing |
