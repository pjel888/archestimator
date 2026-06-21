# 06 — Proof & Claims Discipline (honesty as the proof system)

> **PLANNING ONLY · 2026-06-21 · not code.**
> **Purpose:** The honesty-as-proof system for the landing redesign — the reusable claims-ledger React/RSC component spec, the exhaustive CLAIMS MATRIX (every public claim → status → § source), the private-by-design trust block, the §15 REMOVALS list with justification, the `/trust` page content, and the process that keeps claims honest as features ship. This is the §15-enforcement doc. Be strict and exhaustive.

This doc owns **proof** and **claims discipline**. It does not own section order (`02-SECTION-TAXONOMY-AND-IA.md`), visual tokens (`03-VISUAL-AND-TOKEN-SYSTEM.md`), the commercial-graph plate spec (`04-COMMERCIAL-GRAPH-PLATE.md`), the section copy (`05-COPY-SKELETON.md` — it consumes this doc's matrix), the component inventory (`06-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`, sibling naming per pack), the engineering structure (`07-ENGINEERING-SPEC.md`), or rollout (`08-ROLLOUT-AND-ANALYTICS.md`). Cross-link, do not duplicate.

**The core idea (§4.4 #6, §15):** Archestimator is pre-launch. It has no customers, no metrics, no testimonials, no integrations, no compliance badges, and no AI in the product. What it has is a real, working MVP and a deliberate honesty posture. So honesty is not a nice-to-have on this page — it **is** the proof engine. Where a competitor stacks logos and stats, this page stacks labeled truth. The CLAIMS MATRIX below is the single source every public word must reconcile to.

---

## 1. The honesty-as-proof system, in one paragraph

A visitor who has been burned by vapor-heavy SaaS marketing is looking for the lie. On this page, the lie is not there to find — and the page shows its work so the visitor can verify that themselves. Every capability claim carries a **status badge** (`Live` / `Building` / `Planned`). The limitations are stated in plain language on the same surface that sells the benefits. The privacy posture names what the product is *not* (not an aggregator, not a database of other people's estimates). The security posture states only what is actually shipped. There is no logo wall because there are no logos; no testimonials because there are no customers to quote; no stats because nothing is measured; no compliance badges because the entity and DPA work are not done (§17 #2/#4, §18.2). The product earns trust by **saying exactly what it does today and what it does not**, in the same calm voice it uses everywhere else (§10). That is the proof system.

---

## 2. The claims-ledger component (`<ClaimsLedger>` / `<ClaimRow>`)

This is the reusable React/RSC unit that renders the matrix. It is one of the **two interactive leaves that hydrate** on the page (the other is the architecture-plate hover), per `07-ENGINEERING-SPEC.md`. Everything else is static.

### 2.1 Component shape

```
<ClaimsLedger>
  <ClaimRow
    claim="Estimate workspace with a hierarchical tree (Group / Area / rows)"
    status="Live"
    source="§7.2"
    note?: string              // optional honest qualifier
    redlineNote?: string       // optional architect-redline annotation text
  />
  ...
</ClaimsLedger>
```

- **RSC-first.** `ClaimsLedger` and `ClaimRow` render as Server Components by default (static content from the matrix). The only client interactivity is the **status filter** (a `<ClaimFilter>` client island: All / Live / Building / Planned) and per-row **expand-to-source** disclosure. Mirror the existing workshop-dashboard RSC pattern referenced in `CLAUDE.md` (memory: `workshop-dashboard-rsc`).
- **Status badge** = a small SF Pro label, document-styled, in the status color from `03` (Live = ink `#292929`; Building = secondary ink `#5D5D5D`; Planned = warm hairline `#ECE7DC` with ink text). The badge is **not** the signal `#F24405`; the signal is reserved for the **redline annotation mark** (see §2.3).
- **`note`** renders in secondary ink `#5D5D5D` (NOT `#7F7F7F` — fails WCAG AA, per DESIGN.md and memory `designmd-tertiary-fails-aa`) under the claim line.
- **`source`** renders as a small mono (Roboto Mono) tag, e.g. `§7.2`. It is the audit trail: every public claim points back to MASTER.

### 2.2 Status states (the four the system uses)

| Status | Meaning | Copy rule | Badge |
|---|---|---|---|
| **Live** | Ships in the MVP today. Safe to claim as current. | Present tense. | ink `#292929` |
| **Building** | Partial today; actively improving. | "Improving" / "in progress"; never as fully shipped. | secondary ink `#5D5D5D` |
| **Planned** | On the roadmap; not shipped. | Direction only; "planned" / "on the roadmap"; never as current. | warm hairline `#ECE7DC` + ink text |
| **Not yet / Not us** | Explicit boundary — what Archestimator is not, or what is not built and not yet committed. | State plainly it is not built / not a claim we make. | hairline + ink, with a redline mark on the most load-bearing ones |

> **Dormant** (the fourth value in MASTER §15's prose — "Live/Partial/Planned/**Dormant**") is treated as a synonym for **Not yet / Not us** here. We render four states, not five, to keep the legend readable; "Not yet / Not us" carries the Dormant meaning.

### 2.3 The redline annotation mark

The accent `#F24405` is used **as an architect's redline** — the mark an architect draws on a drawing to flag something load-bearing. On the ledger it appears as a small redline mark next to the **honesty-anchor** rows and the **Not yet / Not us** rows that protect the brand (the "not an aggregator" row, the "AI is deferred" row, the "exports are working documents" row). Copy is never colored; the redline is a visual annotation, not text color. See `03-VISUAL-AND-TOKEN-SYSTEM.md` for the token. Accent discipline: one accent, used sparingly (per the canonical brief).

### 2.4 Where `<ClaimsLedger>` appears

| Surface | Treatment | Cross-link |
|---|---|---|
| Homepage **Section 7 — What is real today** | The canonical rendering. Interactive filter on. | `05` Section 7; `02` |
| `/features` | Expanded per-feature (each row can expand to a short mechanic-forward paragraph). | `05` `/features` |
| `/trust` Section A | Full ledger, verbatim from the matrix (the trust surface must reconcile to the same source). | §6 below; `05` `/trust` |
| Footer "honesty line" | A **static, abbreviated** 3-row summary (Live foundation / AI deferred / exports are working documents), not the interactive ledger. | `05` Footer |

> Single source of truth: the **CLAIMS MATRIX in §3 below** feeds every rendering. If the homepage ledger, `/features`, and `/trust` ever disagree, the matrix wins, and the public sign-off gate (§7, and `07-CLAIMS-LEDGER-SIGN-OFF.md` per the pack) blocks the release until they reconcile.

---

## 3. The CLAIMS MATRIX (compile from §7.2 + §15)

Every public-facing claim the landing system may make, mapped to its status and its § source in `ARCHESTIMATOR_MASTER.md`. **If a claim is not in this matrix, it cannot appear on the public site.** This is the canonical ledger; `05` consumes it row-for-row.

### 3.1 Live (ships today)

| Claim (public wording, short) | Status | § source | Notes / qualifiers |
|---|---|---|---|
| Estimate workspace with a hierarchical tree (Group / Area / rows; drag-drop reorder) | Live | §7.2, §8.3 | The Estimate Tree node on the plate (`04`). |
| Reusable component library: components, brands, suppliers, variants, pricing, images, attachments; `misc_cost` | Live | §7.2, §6.5 | The Component Library node. |
| Inline sheet editing (optimistic, UUID-safe rows) | Live | §7.2 | — |
| Estimate templates | Live | §7.2 | — |
| D3 comparison charts (donut + bubble) | Live | §7.2 | "Project charts," not "analytics." |
| Project publication + shared links: comments, decisions, password protection | Live | §7.2, §6.6 | The Proposal Handoff node. Shared links exist; the *issued/immutable snapshot* does not (Building). |
| Collaboration invites: email, roles, realtime cursors | Live | §7.2, §7.3 | Role *names* + permissions are ⚠️ NEEDS INPUT (§7.3, §17 #15); do not enumerate permission granularity publicly. |
| Activity, Node Activity, and row Version History | Live | §7.2 | The Activity Record node. |
| Excel `.xlsx` proposal export (preview + download) | Live | §7.2 | Working document; **not** an immutable issued record (Building/§16.2). |
| "Your cost intelligence layer" (the hook, as direction + Live foundation) | Live (as direction) / Live (foundation) | §3, §3.3, §0 | Market as the **direction** with the Live foundation as proof; surfacing is Planned (§3.3 honesty anchor). |
| "Stop starting from zero" (reusable library) | Live | §11.2, §6.5 | — |
| "Defend every number" (Activity + version history) | Live | §11.2 | — |
| "From estimate to approval" (shared links + comments + decisions + password + `.xlsx`) | Live | §11.2 | — |
| Deterministic arithmetic; no AI-generated pricing, no probabilistic ranges, no takeoff | Live (as a limitation/proof point) | §8.4 | Honesty point: numbers come from the user's library and inputs. |
| Private by design — your data is yours, never pooled or anonymized across customers | Live (positioning) | §4.4 #4, R10, §3.3 | The deliberate opposite of Zebel's cross-customer benchmark (§2). |
| Security posture as shipped (bearer-secret tokens ≥32 bytes, HMAC-SHA256 + server pepper, expiry/revocation, POST-only mutations, HttpOnly/Secure/SameSite cookies, durable rate limiting with `Retry-After`, audit logging, RLS on every table) | Live (as shipped) | §8.6 | State only what exists. ⚠️ P1 items (durable rate limiting, POST-only invite acceptance, token hashing w/ pepper) are the co-dependency for the "Start free" funnel — see `07`. |
| Pre-launch MVP / MVP preview (maturity disclosure) | Live (as disclosure) | §7.4, §15 | Mandatory wherever maturity matters. |
| Free tier exists (self-serve signup) | Live | §9.2 | The "Start free" CTA gates on co-dependencies in `07`, not on pricing validation. |

### 3.2 Building (partial today, improving)

| Claim | Status | § source | Copy rule |
|---|---|---|---|
| Activity rollups + action taxonomy | Building | §7.2 | "Improving." |
| Proposal export policy — preview/download exist today; **issued/immutable snapshot is an open decision** | Building | §7.2, §16.2 | "Open decision," not "shipped." Exports are "working documents" until the policy gate closes. |
| The cost intelligence layer "already compounds" (foundation) while surfacing is built | Building (the surfacing half) | §3.3 | The honesty anchor: foundation is Live, surfacing is the near-term commitment. Never claim surfacing is shipped. |

### 3.3 Planned (on the roadmap; never as current)

| Claim | Status | § source | Notes |
|---|---|---|---|
| Surfacing your own accumulated history by client, project type, and supplier | Planned | §3.3, §7.2, §17 #13 | **The payoff the hook commits to.** Highest-stakes Planned row: the page must not imply this is shipped. |
| Proposal snapshots / issued exports (policy gate first) | Planned | §7.2, §16.2 | Gated on the export-policy decision. |
| Archiving + trash (restore deleted projects/estimates; a paid-tier capability) | Planned | §7.2, §9.2 | Tiered. |
| Proposal open-tracking (tiered; the sender sees when a client opens the shared link) | Planned | §7.2, §9.2, §18.1 (P2) | Tiered; behind Solo's "see when your client opens it." |
| Beta onboarding + first-run flow + demo-data/reset rules | Planned | §7.5, §18.3, §17 #7 | A launch gate (§7.5). Co-dependency for "Start free." |
| AI copilot (Ask-only first; then Draft/Apply behind confirmation) | Planned (deferred) | §7.2, §8.5, §16.1 | **DEFERRED — must not feature as current.** When shipped: Pro and up; Ask-only first; visible DeepSeek/privacy note near every AI mention. |
| Public claims matrix (this ledger, public) | Planned (as a tracked Notion artifact) | §7.2, §7.5 | This page *is* the public rendering of it; the Notion tracker stays canonical internally. |
| Hosted auth redirect verification | Planned (launch gate) | §7.2, §7.5 | A P0 gate, not a marketing claim. |
| Revision intelligence; proposal comparisons | Planned | §7.2 | — |
| Supplier catalog → quote requests → product comparison → procurement bridge | Planned (Later) | §7.2, §4.4 #3 | The Supplier Bridge node on the plate (`04`). The genuinely under-built part (§2). |
| Client-side proposal record / archive | Planned (Later) | §7.2, §9.1 | Client-archive cannot be sold before retention/deletion/permission rules exist (§8.6, §13.4). |
| Design/product bridge + takeoff bridge; ERP/procurement handoff; approval-to-payment; milestone payment tracking | Planned (Later) | §7.2 | Far horizon; appear only as roadmap direction. |
| Public API | Planned (undecided) | §8.6 | ⚠️ NEEDS INPUT; do not claim. |
| Surfacing / recall of your own history by client/typology | Planned | §3.3, §17 #13 | (Same as first Planned row; listed once here for completeness.) |
| Education tier; Owner/Portfolio tier | Planned (tier shape) | §9.2 | Names may appear as the *shape* of the model on `/pricing`; no numbers. |

### 3.4 Not yet / Not us (the explicit boundary, §15)

These are the rows that protect the brand. Each is a refusal to claim something the product is not. Most carry the **redline mark** (§2.3).

| Boundary claim (what we state plainly) | Status | § source | Why it matters |
|---|---|---|---|
| "Not production-hardened enterprise SaaS." | Not us | §7.4, §15 | Maturity honesty. |
| "Exports are working documents, **not** immutable issued records, legal documents, or POs." | Not us (redline) | §7.4, §16.2, §15 | Drift-register resolved: shared links exist; "immutable / issued record" stays banned until the policy gate (§16.2). |
| "AI is on the roadmap, not in the product today." | Not us (redline) | §7.2, §8.5, §16.1, §15 | AI deferred 2026-06-18. Must not feature as current. |
| "Not procurement, ERP, or payment execution." | Not us | §7.4, §15 | — |
| "Not an aggregator, not a database of other people's estimates, not a bulk import of your old files." | Not us (redline) | §3.3, §15, R10 | The privacy posture. The intelligence is **yours**, built from your work. |
| "No BIM or drawing ingestion today." | Not yet | §7.4, §8.6 | Takeoff bridge is Later. |
| "English UI, no localization yet." | Not yet | §7.4 | — |
| "No `the only tool that…` / `only we…` superiority claims." | Not us (redline) | §2, §10.4, §15 | Reusable cost intelligence is enterprise table stakes (§2); we compete on fit/reach/price + proposal-to-approval + client record + supplier bridge + private-by-design (§4.4). |
| "No logos, testimonials, adoption metrics, or partner names — none exist yet." | Not us | §12.8, §14.1, §15 | §15 forbids inventing them. |
| "No compliance badges (SOC2/GDPR/HIPAA/DPA) — entity and DPA work are not done." | Not us | §4.4, §17 #2/#4, §18.2 | Do not badge until the entity + DPA registration assessment close. |
| "No guaranteed accuracy / fully automated estimating." | Not us | §10.6, §15, §8.4 | Deterministic arithmetic over the user's inputs (§8.4). |

### 3.5 FORBIDDEN (do not appear anywhere on the public site, per §15)

These are not rendered as ledger rows — they are the negative list the writers/checkers reconcile against. Listed here so the gate (§7) can fail a build on any of them.

- "Production hardened" / "legally automated" / "immutable audit trail" / "legally binding archive."
- Calling current exports immutable/issued records.
- PO execution, legal-document automation, full procurement/ERP, payment-platform language.
- Fake adoption, fake integrations, fake metrics, fake testimonials, fake partner names.
- Legal/compliance guarantees; compliance badges before the entity/DPA work.
- AI as a current capability; any autonomous-estimating implication.
- "Guaranteed accuracy," "fully automated estimating."
- Aggregator / "database of estimates" language; "the only tool that…"; any superiority theater.
- Banned voice lines (§10.4): "Winners use Archestimator," "stop being left behind," "only the smart ones," "you are losing because…," "your competitors are winning because they use Archestimator."
- The superseded May hero (§16.4): "Start Winning," "Win More Bids," "Estimate with Precision. Win with Clarity," "Only the smart ones create cost estimates this way." See §4 REMOVALS.
- Any peso price, tier number, or tier table presented as decided (§9.3 — HYPOTHESIS until validation gates close).

---

## 4. REMOVALS (the §15 deletion rail; needs owner confirmation)

Each item below is in the current `src/components/landing/` tree and **violates §15 or the locked design direction**. Removal is the default; the owner confirms via the plan sign-off (not this doc). File paths are absolute for the implementer.

### 4.1 The fabricated testimonials (§15 violation — none may be invented)

- **`/Users/philiplewis/Documents/archestimator/src/components/landing/ProcessBandSection.tsx`** — `testimonialSlides` array (lines ~25, ~76–88), rendered as "Closed beta testimonial carousel." There is no closed beta with named quotable users (§14.1: commercial certainty "not yet proven"; §12.8: none exist, none may be invented).
- **`/Users/philiplewis/Documents/archestimator/src/components/landing/CompanyProofCarouselSection.tsx`** — `testimonialSlides` array (line ~46), second "Closed beta testimonial carousel" (lines ~163–177). Same violation.
- **`/Users/philiplewis/Documents/archestimator/src/components/landing/TestimonialSection.tsx`** — the entire `TestimonialSection` component (props: `quote`, `name`, `role`, `imageLabel`). A reusable testimony renderer with no real testimony to render. Remove the component and its export in **`/Users/philiplewis/Documents/archestimator/src/components/landing/index.ts`** (line ~22).
- **`/Users/philiplewis/Documents/archestimator/src/components/landing/company-proof-data.ts`** — the `placeholderCompanyProof` array (line ~54) and the placeholder/logo machinery. "Placeholder" partner logos are the thin end of the §15 wedge (imply relationships that do not exist). Remove with the proof carousel.

> **Justification (§):** §15 ("fake adoption/integrations/metrics" forbidden), §12.8 ("none exist; none may be invented"), §14.1 (commercial certainty not yet proven), §4.4 #6 (honesty as brand). The locked proof strategy replaces these with the claims ledger + private-by-design + named commercial-graph architecture.

### 4.2 The hype hero (§10.4 / §16.4 violation)

- **`/Users/philiplewis/Documents/archestimator/src/components/landing/HeroSection.tsx`** — the banned lines:
  - `PRECISION_TO_WIN_HEADLINE = "Estimate with Precision. Win with Clarity."` (line ~83)
  - the `'Estimate with Precision. Win with Clarity.'` variant (line ~95)
  - `"Win More Bids."` / `"Close Projects Faster."` (line ~269)
  - `"Start Winning"` (line ~294)

> **Justification (§):** §16.4 (the May hero is superseded; ship the §11.1 cost-intelligence-layer hero), §10.4 (banned lines: superiority theater, "win" framing that attacks the reader's standing). The locked decision replaces the hero with `Your cost intelligence layer.` (§11.1), voice = Controlled Confidence.

### 4.3 The construction-photo slideshow + the frosted-construction hero PNG (§12.9 violation)

- **`/Users/philiplewis/Documents/archestimator/src/components/landing/HeroSection.tsx`** — the 9-slide `construction-slide-01.jpg` … `construction-slide-09.jpg` array (lines ~21–61), with `alt` text like "Frosted commercial construction site with crane," and the `landing-hero-frosted-visual` element (line ~301).
- The associated ~2.3MB frosted-construction hero PNG / slide assets under `/public/landing/hero-slides/` (verify the exact byte size at removal time).

> **Justification (§):** §12.9 ("documents you would trust, not dashboards that perform"). The locked design direction ("The Document") sets the page on proposal-paper `#FFFDF8` with Source Serif 4 — the serif IS the argument; there is no construction-photo slideshow and no heavy hero image. LCP target = text headline, no heavy hero image (per `07`).

### 4.4 The logo-only footer (replacement rail)

- **`/Users/philiplewis/Documents/archestimator/src/components/landing/LandingFooter.tsx`** — imports `ArchestimatorLogo` (line ~3) and renders a logo-only block. Not a §15 violation, but the locked decision replaces it with a **document-styled sitemap** (per the canonical brief and `05` Footer): wordmark + tagline + sitemap columns (Product / Company / Pre-launch MVP preview badge) + the honesty line.

> **Justification (§):** the canonical brief's "Footer (document-styled sitemap, replace logo-only block)"; §11.6 (tagline `Archestimator: the cost intelligence layer for AEC teams. From cost proposal to client approval.`); §7.4/§15 (the honesty line carries the maturity disclosure).

### 4.5 Other §15-adjacent removals to verify at implementation time

- **`PartnerSection.tsx`** (`partnerCards`) — verify whether the cards imply real partnerships; if they do, remove under §15; if they are generic capability cards, they may be reworked (defer to `06-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`).
- Any remaining "closed beta" / "trusted by" / social-proof copy elsewhere in `src/components/landing/` — sweep at implementation; the §4.1–4.4 list is the confirmed set, not necessarily exhaustive of every imply-adoption string.

---

## 5. The private-by-design trust block (R10, §4.4 #4)

This is the trust posture that replaces a logo wall. It is rendered as a **static block** (no hydration needed) on `/trust` Section B and as a one-liner on `/about`. Copy is locked to MASTER.

### 5.1 The block, verbatim (from `05` `/trust` Section B)

> Your data is yours. Archestimator is not an aggregator and not a database of other people's estimates. The intelligence in your workspace is built from your work, never pooled or anonymized across customers. `[Claims: Live — privacy posture]` (§3.3, §4.4 #4, R10)

### 5.2 Why this is a trust asset, not a sacrifice

MASTER §2 Finding 2 calls out Zebel explicitly: it "blends anonymized cross-customer market data." Archestimator's deliberate opposite (R10) is a clean privacy story that **foregoes** the cross-customer benchmark. The trust block names the trade honestly: the intelligence is **yours**, never pooled. This is a positioning choice the owner has ratified (R10), not a limitation to apologize for. Copy must never hedge it ("…for now") or imply the pooling is coming.

### 5.3 Boundary (what the block does NOT claim)

- It does **not** claim SOC2/GDPR/HIPAA/DPA compliance (entity and DPA work not done — §17 #2/#4, §18.2).
- It does **not** claim a published Privacy Policy or ToS (⚠️ NEEDS INPUT — §17 #3, §18.2). Until those exist, the block states the **posture**, not legal guarantees.
- It does **not** claim data residency in the Philippines; data sits on Supabase in `ap-southeast-2` (Australia) — a cross-border transfer (§18.2). If/when this is surfaced publicly, it is stated plainly, not hidden.

---

## 6. The `/trust` page, in depth

`/trust` is the new route (locked decision #3). It is where honesty is **operationalized** as a standalone surface, not just a homepage section. IA and chrome in `02`; copy essentials in `05`. This section owns its **structure and claims discipline**.

### 6.1 Page purpose (one line)

A pre-launch product earns trust by showing its work. `/trust` is the page that shows its work in full: every claim with a status, the privacy posture, the security posture as shipped, and the honest limitations.

### 6.2 Page sections (claims-tagged)

| Section | Content | Status mix | Cross-link |
|---|---|---|---|
| **A. The claims ledger** | The full CLAIMS MATRIX (§3 above), rendered via `<ClaimsLedger>` with the filter on. | Live + Building + Planned + Not us | §2, §3 |
| **B. Privacy by design** | The §5.1 block verbatim. | Live (posture) | §5 |
| **C. Security posture (as shipped)** | State only what exists: bearer-secret invite/share tokens (≥32 bytes, base64url, HMAC-SHA256 + server pepper, never logged raw), expiry + revocation, POST-only mutations, HttpOnly/Secure/SameSite cookies, no localStorage tokens, durable composite-key rate limiting with `Retry-After`, audit logging + metrics/alerts, indexes on high-traffic collaboration tables, `Cache-Control: no-store` for tokenized pages, fail-closed on missing config, RLS on every table. | Live (as shipped) | §8.6 |
| **D. Maturity & limitations** | The §7.4 honest list: pre-launch MVP, not production-hardened; AI deferred; exports are working documents; no procurement/ERP/payment execution; no BIM/takeoff ingestion yet; English UI, no localization yet. | Live (honest limitations) | §7.4 |
| **E. Data residency & cross-border** | Plain statement: workspace data sits on Supabase in `ap-southeast-2` (Australia); a cross-border transfer. (Include only if/when DPA safeguards are in place — ⚠️ GATED, §18.2.) | Live (fact) / GATED on DPA | §8.2, §18.2 |
| **F. What's next (roadmap, honestly)** | The Planned rows from §3.3, restated as direction. Includes the deferred AI copilot with the privacy note. | Planned | §3.3 |
| **G. Contact / CTA** | "Start free" + "Book a walkthrough." | Live | `05` `/trust` |

### 6.3 The AI disclosure rule on `/trust`

Per §8.5 / §15: AI is deferred. On `/trust` it appears **only** under Section F (Planned), phrased as: the AI copilot is on the roadmap, not in the product; when it ships it enters as an Ask-only copilot at Pro and up, with a visible privacy note (DeepSeek disclosure). **No AI-hero, no "AI-powered estimating," no autonomous-estimating implication.** If/when AI ships, the disclosure rule persists: a privacy note near every AI mention (§8.5).

### 6.4 What `/trust` must NOT contain

- No compliance badges (SOC2/GDPR/HIPAA/DPA) — entity/DPA not done (§17 #2/#4).
- No "trusted by," no logos, no testimonials, no stats (§15; §4.4 #6).
- No legal guarantees (no "legally binding," "immutable audit trail," "compliance record," "guaranteed dispute protection") — §15.
- No claim of a published Privacy Policy or ToS until they exist (§17 #3).

---

## 7. Keeping the system honest as features ship (the claims-status update process)

The ledger is a living artifact. If it goes stale, it becomes a lie — which defeats the entire proof system. This section defines the process that keeps it honest. It is the operational counterpart to the §7.5 launch gate ("public claims matrix complete") and the §13.2 cadence ("per release: verify claims → QA snapshot").

### 7.1 The single internal source

- **Canonical internal source:** the Notion **Feature Inventory** (`/p/aa13f3aafe3e8394b9298102f99c87b1`, per §18) — the status tracker MASTER §7.2 binds marketing to.
- **This CLAIMS MATRIX (§3 above)** is the **public projection** of the Feature Inventory. It must reconcile to the Feature Inventory before every public change.
- **Never** edit the public matrix without checking the Feature Inventory first. The matrix is downstream, not upstream.

### 7.2 Status-transition rules

| From → To | Trigger | Required action |
|---|---|---|
| Planned → Building | Feature enters active development with a ship target. | Move row in §3.3 to §3.2; update copy from "on the roadmap" to "in progress." |
| Building → Live | Feature ships to production and the §7.5 smoke test for it passes. | Move row to §3.1; update copy to present tense; add to the Live count on `/trust` Section A. |
| Live → (no backwards move) | A Live feature may be deprecated, but it does not silently revert to Planned. | If deprecated: add a **Not yet** row explaining the change; do not hide the history. |
| Not us → Live | Only when the underlying reality changes (e.g., DPA registration closes → a compliance claim becomes permissible). | Add a new Live row; keep the old "Not us" boundary row only if the boundary still partly applies. |

### 7.3 The pre-release reconciliation gate (ties to `08-ROLLOUT-AND-ANALYTICS.md`)

Before any public release of the landing system (or any claim-changing release of the product):

1. **Diff the Feature Inventory** against the public CLAIMS MATRIX since the last release. Any status change must propagate to the matrix.
2. **Sweep the public surfaces** (homepage ledger, `/features`, `/trust`, footer honesty line, the copy in `05`) for any line that implies something the matrix marks Planned/Not-yet. If found, the line loses.
3. **Sign-off gate** (`07-CLAIMS-LEDGER-SIGN-OFF.md`, per the pack): the owner signs that the matrix reconciles to the Feature Inventory. No sign-off, no release. This is the §7.5 "public claims matrix complete" gate, operationalized.
4. **AI disclosure check:** if anything AI-adjacent shipped, verify the §8.5 privacy note rides with every AI mention (§15).
5. **FORBIDDEN-list check:** run §3.5 against the rendered pages (a literal string/regex sweep for the banned lines and the superseded hero). A hit fails the build.

### 7.4 Cadence

- **Per release** (§13.2): steps 1–5 above. This is the non-negotiable gate.
- **Weekly** (§13.2, "product truth, claims, beta readiness"): a lighter check that nothing in the Feature Inventory moved without the matrix following.
- **Per call** (§13.2): capture any prospect/beta objection that touches a claim ("I thought this did X?") and route it to the matrix as a candidate clarification.

### 7.5 The moat metric tie-in (§14.4)

The honesty system also tells us what to measure. Per §14.4, the moat metric is **reused components/templates per estimate** — the behavioral signal that the "your work compounds" claim (§3) is becoming true in the user's workspace. Until that metric is measured, the "compounds" claim stays framed as the Live foundation + the Planned surfacing payoff (§3.3 honesty anchor). When the metric is live, it becomes evidence — but **never** a public stat until §15 is satisfied (measured, not inflated, not invented). See `08-ROLLOUT-AND-ANALYTICS.md` for the analytics events.

---

## 8. Voice check (every claim obeys §10)

Controlled Confidence (§10.1): calm conviction, no hype. Applied to this doc's outputs:

- **Lead with the change, not the mechanism (§10.2 #1):** the ledger leads with what the user gets ("Stop starting from zero"), with the status badge as the credibility clause.
- **Plain words, one intriguing idea (§10.2 #2):** "Your cost intelligence layer," surrounded by plain ledger rows.
- **Calm conviction, never hype (§10.2 #3):** "We would rather tell you exactly what it does today than oversell it" (§11.5). State things; do not sell them.
- **Attack the workflow, never the user (§10.2 #4):** the villain is the spreadsheet-rebuild loop, never the reader.
- **Earn every claim (§10.2 #5):** the badge system. The honesty is the voice.

Banned (§10.4): no "Winners use Archestimator," no "stop being left behind," no "only we / the only tool that…," no superiority theater, no FOMO. The superseded May hero is removed (§4.2).

---

# Cross-links

- `00-OVERVIEW.md` — plan overview, locked decisions (the honesty proof strategy is locked decision #4).
- `01-COMPETITIVE-PEG-STUDY.md` — why we borrow Intercom/Amigo's craft + named-architecture move but **replace** their proof engine (logos/testimonials/stats/badges) with honesty.
- `02-SECTION-TAXONOMY-AND-IA.md` — canonical DOM order; Section 7 is where `<ClaimsLedger>` renders on the homepage.
- `03-VISUAL-AND-TOKEN-SYSTEM.md` — paper, serif, the redline accent as annotation mark, status-badge colors, motion.
- `04-COMMERCIAL-GRAPH-PLATE.md` — node-by-node claims tags on the plate; each plate node must reconcile to a row in §3.
- `05-COPY-SKELETON.md` — consumes this matrix row-for-row; every `[Claims: X]` tag in `05` points back to §3 here.
- `06-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` — the `<ClaimsLedger>` / `<ClaimRow>` component inventory entry.
- `07-ENGINEERING-SPEC.md` — RSC-first structure; the two interactive leaves (architecture-plate hover + claims-ledger filter); the "Start free" funnel co-dependencies.
- `07-CLAIMS-LEDGER-SIGN-OFF.md` (sibling naming per pack) — the public sign-off gate this matrix reconciles to (§7.3).
- `08-ROLLOUT-AND-ANALYTICS.md` — preview route, A/B old vs new, the claims sign-off gate step, analytics events (signup, first estimate, component reused = moat metric, proposal shared, export).
- `LOOP_LEDGER.md` — plan loop state.

---

# ⚠️ Gated on / Open decisions

Everything below is a dependency this doc leans on but cannot resolve from MASTER alone. Each must close before the affected claim goes public.

1. ⚠️ **GATED ON** the Feature Inventory being authoritative and current — the CLAIMS MATRIX (§3) is its public projection. If the Feature Inventory drifts, the matrix lies. Reconcile before every release (§7.3). MASTER §7.2, §18.
2. ⚠️ **GATED ON** ratification of R1–R11 (MASTER §1) — the hook, the promise, the UVP, and the private-by-design posture (R10) are `[PROPOSED]` until signed off. Several Live rows in §3.1 ride on R10.
3. ⚠️ **GATED ON** the proposal export policy decision (issued/immutable snapshot) — blocks any "issued record" / "immutable snapshot" claim. Exports stay "working documents" (§3.2, §3.4). MASTER §7.2, §16.2.
4. ⚠️ **GATED ON** published Privacy Policy + ToS and the DPA registration assessment — blocks any compliance-badge or legal-guarantee language on `/trust`. No SOC2/GDPR/HIPAA/DPA badges. The §5 privacy block states the **posture**, not legal guarantees, until these close. MASTER §17 #3/#4, §18.2.
5. ⚠️ **GATED ON** the entity (OPC vs DTI) — blocks any "Archestimator Inc."-style legal-entity claim. MASTER §17 #2, §18.2.
6. ⚠️ **GATED ON** pricing validation gates + Van Westendorp — blocks any peso number or tier table on the public site. The matrix deliberately has **no** pricing rows in §3.1; tier *names* may appear as Planned shape only. MASTER §9.3, §17 #6.
7. ⚠️ **GATED ON** canonical role names + permissions (Access Matrix) — the "collaboration invites with roles" Live row must not enumerate permission granularity publicly until role names are fixed. MASTER §7.3, §17 #15.
8. ⚠️ **GATED ON** the founder public bio assets — does not block this doc, but blocks the founder one-liner elsewhere (`05` Section 9, `/about`). MASTER §13.1, §17 #17.
9. ⚠️ **GATED ON** owner confirmation of the REMOVALS list (§4) — the deletion rail is the default per the locked design direction, but the owner confirms at plan sign-off. File paths in §4 are the confirmed set; §4.5 flags items to verify at implementation.
10. ⚠️ **GATED ON** the AI copilot remaining deferred — if AI ships, the §3.3 AI row moves to Building/Live **and** the §8.5 privacy note (DeepSeek disclosure) must ride with every AI mention, and the `/trust` Section F copy changes. Until then, AI is Planned and must not feature as current. MASTER §7.2, §8.5, §16.1.
11. ⚠️ **GATED ON** analytics instrumentation for the moat metric — until "reused components per estimate" is measured, the "compounds" claim stays framed as Live foundation + Planned surfacing (§3.3, §7.5). MASTER §14.4, §17 #8.

**Open decisions owned here (not blocking, but flagged):**
- Whether the `<ClaimsLedger>` filter (All / Live / Building / Planned) is a toggle or tabs is a visual/UX decision — deferred to `03`/`06`.
- Whether `/trust` Section E (data residency / cross-border) ships at launch or waits for DPA safeguards — deferred to the DPA gate (§6.2, Gated #4).
- The exact wording of the "Not yet / Not us" badge (whether it reads "Not yet" vs. "Not us" vs. a single "Boundary" label) is a voice A/B for the owner; all three are within §10/§15.
