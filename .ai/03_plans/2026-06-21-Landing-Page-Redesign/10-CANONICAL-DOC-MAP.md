# 10 — Canonical Doc Map (the cross-link source of truth)

> **STATUS: PLANNING · 2026-06-21 · revised 2026-06-22 · not code.**
> **Purpose:** Be the single source of truth for every doc's canonical filename in this pack.
> Every cross-doc link in every doc must resolve to a name in this table. If a doc references
> a sibling by a name not in this table, the link is broken and must be patched.

This doc exists because the pack was authored in parallel and the eight original docs each
invented their own naming convention (see `MASTER-AUDIT-AND-SCORECARD.md` §2 for the
forensic detail). This is the fix.

> **2026-06-22 update.** All 28 markdown docs now `exist` on disk (the prior "missing (M-x)" flags were
> the 2026-06-21 baseline state and are all cleared). `23-AUTH-EXPERIENCE.md` was added
> 2026-06-22 (D-2) and owns the **Auth experience** dimension. The type-pairing for doc 03 was
> corrected from "Source Serif 4" to the Glass Brand pairing (Doto / Roboto Mono / SF Pro;
> Source Serif 4 DEFERRED per D-1). `MASTER-IMPLEMENTATION-PLAN.md` is the execution-layer handoff,
> not another strategy source.

---

## 1. The canonical filenames

| # | Canonical filename | One-line purpose | Status |
|---|---|---|---|
| 00 | `00-OVERVIEW.md` | Front door: the five ratified decisions (D-1..D-5), pillars, scope, doc map, success criteria, sign-off items. | exists |
| 01 | `01-DESIGN-DIRECTION.md` | Direction rationale — **The Glass Brand** (D-1) primary, "The Document" demoted to Direction D — + Intercom/Amigo peg study + Hallmark notes. | exists |
| 02 | `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` | Canonical homepage DOM-order section taxonomy + per-route inventories + nav/footer archetypes + funnel logic + the gated auth entry (D-2). | exists |
| 03 | `03-VISUAL-LANGUAGE-AND-TOKENS.md` | Additive token layer for `globals.css` + Glass Brand type pairing (**Doto `--font-display` / Roboto Mono `--font-numeric` / SF Pro `--font-sf-pro`**; Source Serif 4 DEFERRED per D-1) + the glass-application + motion contract. | exists |
| 04 | `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` | Named, claims-tagged SVG architecture plate spec (the moat move); re-skinned as a glass surface. | exists |
| 05 | `05-COPY-SKELETON.md` | Voice-locked, claims-tagged copy per section per route (+ auth microcopy cross-linked to 23). | exists |
| 06 | `06-PROOF-AND-CLAIMS-DISCIPLINE.md` | Honesty-as-proof system: `<ClaimsLedger>` component, CLAIMS MATRIX, private-by-design block, `/trust` content, claims-status update process. | exists |
| 07 | `07-ENGINEERING-CONSTRAINTS.md` | RSC-first build, responsive floor 320/375/414/768, glass perf model, the "Start free" funnel + its co-dependency gates. | exists |
| 08 | `08-ROLLOUT-AND-ANALYTICS.md` | `/newdesign` preview route, A/B old vs new, claims sign-off gate, analytics events per route. | exists |
| 09 | `09-CLAIMS-LEDGER-SIGN-OFF.md` | The public claims-sign-off gate; the §7.5 "public claims matrix complete" launch gate, operationalized. | exists |
| 10 | `10-CANONICAL-DOC-MAP.md` | This doc. | exists |
| 11 | `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` | React/RSC component inventory: file paths, props, copy → component map, nav/header/footer anatomy, the auth component set (cross-linked to 23). | exists |
| 12 | `12-ACCESSIBILITY-AUDIT.md` | Consolidated WCAG 2.1 AA audit + test plan + compliance evidence (+ auth-surface a11y). | exists |
| 13 | `13-SEO-AND-DISCOVERY.md` | Keyword strategy, meta copy, sitemap, robots, structured data, internal linking, auth-page noindex policy, PH/SEA validation. | exists |
| 14 | `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` | CWV targets, field-vs-lab methodology, glass/`backdrop-filter` perf model + deferred-glass arming, PH+SEA device class, CI gate, remediation. | exists |
| 15 | `15-FORMS-AND-ABUSE-GUARDRAILS.md` | `/contact` + `/signup` form-spam defense, Postgres `security_rate_limit_events` rate-limit config, honeypot, CAPTCHA decision, abuse monitoring. | exists |
| 16 | `16-TEST-AND-VERIFICATION-PLAN.md` | Unit / component / e2e / visual / a11y / perf / claims test plan (+ auth-flow e2e + glass visual regression). | exists |
| 17 | `17-ANALYTICS-AND-OBSERVABILITY.md` | Event schema, tool decision, consent model, retention, anonymous→authenticated session merge, dashboard, moat-metric instrumentation. | exists |
| 18 | `18-I18N-AND-LOCALIZATION.md` | Locale strategy (EN-only at launch, gated `L-I18N-1`), hreflang, sitemap localization, validation plan. | exists |
| 19 | `19-ASSET-PIPELINE-AND-IMAGERY.md` | Wordmark, favicons, OG images, founder photo, the brand-composition assets for the glass surfaces, "what we will not ship" rail. | exists |
| 20 | `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` | Who writes/reviews/signs off (owner-only at launch, honestly stated), where copy lives, update cadence, bilingual workflow. | exists |
| 21 | `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` | File-level change inventory, deletion rail, migration order, risk register (rated LOW blast radius), rollback playbook. | exists |
| 22 | `22-PEG-STUDY-DEEP-DIVE.md` | Full DNA extraction from Intercom + Amigo + the Workshop Dashboard as an in-house peg, with URLs / dates for evidence. | exists |
| 23 | `23-AUTH-EXPERIENCE.md` | **D-2** — the full-page 2-column auth surface (`/login` + `/signup`): brand glass panel left, fields right, Google OAuth + magic link (no password), closed-beta gate, mobile collapse, noindex. | exists |
| — | `MASTER-AUDIT-AND-SCORECARD.md` | The audit + scorecard (this pack's quality gate). | exists |
| — | `LOOP_LEDGER.md` | Plan-pack loop ledger: open decisions, iteration state, owner-decision queue, sign-off log. | exists |
| — | `README.md` | Pack entry point: doc-order, dimensions, the honesty-aware Definition of 100 %. | exists |
| — | `MASTER-IMPLEMENTATION-PLAN.md` | Execution handoff: current-codebase checkpoint, minimum shippable slice, implementation phases, coordination protocol. | exists |

**Pack inventory: 28 markdown docs on disk** (24 numbered docs `00`–`23` + 4 meta/execution docs:
`MASTER-AUDIT-AND-SCORECARD`, `LOOP_LEDGER`, `README`, `MASTER-IMPLEMENTATION-PLAN`). Verified by
`find .ai/03_plans/2026-06-21-Landing-Page-Redesign -maxdepth 1 -name '*.md'`.

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
| `07-CLAIMS-LEDGER-SIGN-OFF` · `09-CLAIMS-LEDER-SIGN-OFF` | `09-CLAIMS-LEDGER-SIGN-OFF.md` |
| `06-RESPONSIVE-AND-A11Y` (responsive+a11y doc) | `12-ACCESSIBILITY-AUDIT.md` (owns a11y; responsive-collapse lives in `02` §1 + `07` §2) |

---

## 3. Numbering convention (why 11+ for new docs)

The pack's original 0–7 numbering was authored before the missing-doc inventory
(`MASTER-AUDIT-AND-SCORECARD.md` §4) surfaced 17 gaps. Rather than renumber the existing
docs (which would break every citation in MASTER, Notion, and chat history), the new docs
take numbers 08–23, with `08` and `09` reserved for the two docs the pack already references
by those numbers (rollout + claims-sign-off). `23-AUTH-EXPERIENCE.md` was added 2026-06-22
when the auth surface (D-2) became explicit scope. The audit (`MASTER-AUDIT-AND-SCORECARD.md`)
and this map (`10-CANONICAL-DOC-MAP.md`) are unnumbered-suffix docs because they are meta —
they measure and map the pack, they are not part of the implementation sequence.

**Implementation entry order** (what to read first, for a new dev):

```
README.md  →  00-OVERVIEW  →  01-DESIGN-DIRECTION  →  10-CANONICAL-DOC-MAP (this doc)
           →  03-VISUAL-LANGUAGE-AND-TOKENS  →  23-AUTH-EXPERIENCE
           →  02-SECTION-TAXONOMY  →  04-COMMERCIAL-GRAPH-PLATE  →  05-COPY-SKELETON
           →  06-PROOF-AND-CLAIMS-DISCIPLINE  →  07-ENGINEERING-CONSTRAINTS
           →  08-ROLLOUT-AND-ANALYTICS  →  09-CLAIMS-LEDGER-SIGN-OFF
           →  11-COMPONENT-INVENTORY  →  dimension docs (12–22) on demand
           →  LOOP_LEDGER (open decisions)  →  21-BLAST-RADIUS (before any code)
           →  MASTER-IMPLEMENTATION-PLAN (execution handoff; last stop before edits)
```

---

## 4. Cross-link patch procedure (one mechanical pass per doc)

For each doc:

1. Open the doc.
2. For every reference to a sibling doc, replace any alias in §2 with the canonical name.
3. Verify with:

```bash
# (a) stale aliases in active planning docs — must return ZERO matches.
# Exclude this alias table and MASTER audit/history contexts; those intentionally preserve old names.
rg -n "01-COMPETITIVE|01-PEG-STUDY-AND|02-HERO-AND-VOICE|02-SECTION-TAXONOMY-AND-IA|02-SECTION-TAXONOMY-AND-REMOVALS|03-VISUAL-AND-TOKEN|03-VISUAL-TOKENS|05-COPY-LEDGER|05-SECTION-MARKUP|06-COMPONENT-INVENTORY-AND-CONTENT|07-ENGINEERING-SPEC|07-ENGINEERING-AND-|07-CLAIMS-LEDGER|08-ROLLOUT-AND-METRICS|08-ROLLOUT-AND-CLAIMS|09-CLAIMS-LEDER" .ai/03_plans/2026-06-21-Landing-Page-Redesign/ -g '*.md' -g '!10-CANONICAL-DOC-MAP.md' -g '!MASTER-AUDIT-AND-SCORECARD.md'

# (b) wrong rate-limit table name — must return ZERO matches (the real table is security_rate_limit_events)
rg -n "\brate_limit\b" .ai/03_plans/2026-06-21-Landing-Page-Redesign/ -g '*.md' -g '!10-CANONICAL-DOC-MAP.md' -g '!MASTER-AUDIT-AND-SCORECARD.md' -g '!LOOP_LEDGER.md'

# (c) typo in the proof doc filename — must return ZERO matches
rg -n "06-PROOF-AND-CLAIMS-CLAIMS-DISCIPLINE" .ai/03_plans/2026-06-21-Landing-Page-Redesign/ -g '*.md' -g '!10-CANONICAL-DOC-MAP.md'

# (d) the recalled dishonest score — must return ZERO matches outside the audit/history context
rg -n "100 / 100 / 100 across|Pack-weighted score.*Strategy 100" .ai/03_plans/2026-06-21-Landing-Page-Redesign/
```

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
| Rollout / A/B / analytics events | `08-ROLLOUT-AND-ANALYTICS.md` | ✓ |
| Claims-sign-off gate | `09-CLAIMS-LEDGER-SIGN-OFF.md` | ✓ |
| Component inventory / anatomy | `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` | ✓ |
| **Auth experience (D-2)** | **`23-AUTH-EXPERIENCE.md`** | ✓ |
| Accessibility (WCAG 2.1 AA) | `12-ACCESSIBILITY-AUDIT.md` | ✓ |
| SEO / discovery | `13-SEO-AND-DISCOVERY.md` | ✓ |
| Performance / Core Web Vitals | `14-PERFORMANCE-AND-CORE-WEB-VITALS.md` | ✓ |
| Forms / abuse guardrails | `15-FORMS-AND-ABUSE-GUARDRAILS.md` | ✓ |
| Test / verification | `16-TEST-AND-VERIFICATION-PLAN.md` | ✓ |
| Analytics / observability | `17-ANALYTICS-AND-OBSERVABILITY.md` | ✓ |
| i18n / localization (PH + SEA) | `18-I18N-AND-LOCALIZATION.md` | ✓ |
| Asset pipeline / imagery | `19-ASSET-PIPELINE-AND-IMAGERY.md` | ✓ |
| Content workflow / governance | `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` | ✓ |
| Blast radius / migration | `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` | ✓ |
| Peg-study deep dive (evidence) | `22-PEG-STUDY-DEEP-DIVE.md` | ✓ |
| Implementation execution handoff | `MASTER-IMPLEMENTATION-PLAN.md` | ✓ |
| Cross-link integrity | `10-CANONICAL-DOC-MAP.md` (this doc) | ✓ |
| Audit / scorecard | `MASTER-AUDIT-AND-SCORECARD.md` | ✓ |
| Loop state / open decisions | `LOOP_LEDGER.md` | ✓ |
| Pack navigation | `README.md` | ✓ |
