# 06 — Proof & Claims Discipline (honesty as the proof system)

> **PLANNING ONLY · 2026-06-21 (revised 2026-06-22 per ratified keystone decisions D-1…D-5) · not code.**
> **Direction:** THE GLASS BRAND (keystone decision D-1). The honesty proof engine survives the
> pivot verbatim — it is on D-1's preserve-list (`00-OVERVIEW.md` §0). What changes is only the
> skin: the ledger floats on a `.dashboard-glass` surface over `--warm-canvas #f5f5f5`, status
> badges use the D-4 status→color map (`03-VISUAL-LANGUAGE-AND-TOKENS.md` §6.1), and the signal
> `--brand-orange #F24405` is reserved for the **redline annotation mark** and **presence**
> (never for claim-status decoration — D-3, §2.3).
>
> **Purpose:** The honesty-as-proof system for the landing redesign — the reusable claims-ledger
> React/RSC component spec (§2), the exhaustive **CLAIMS MATRIX** (every public claim → status →
> § source, §3), the private-by-design trust block (§5), the §15 REMOVALS list with justification
> (§4), the `/trust` page content (§6), and the process that keeps claims honest as features ship
> (§7). This is the §15-enforcement doc. Be strict and exhaustive.

This doc owns **proof** and **claims discipline**. It does not own section order
(`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`), visual tokens
(`03-VISUAL-LANGUAGE-AND-TOKENS.md`), the commercial-graph plate spec
(`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`), the section copy (`05-COPY-SKELETON.md` — it
consumes this doc's matrix), the component inventory
(`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`), the engineering structure
(`07-ENGINEERING-CONSTRAINTS.md`), or rollout (`08-ROLLOUT-AND-ANALYTICS.md`). Cross-link, do
not duplicate.

**The core idea (`00-OVERVIEW.md` P2, MASTER §4.4 #6, §15):** Archestimator is pre-launch. It has
no customers, no metrics, no testimonials, no integrations, no compliance badges, and no AI in
the product. What it has is a real, working MVP and a deliberate honesty posture. So honesty is
not a nice-to-have on this page — it **is** the proof engine. Where a competitor stacks logos
and stats, this page stacks labeled truth. The CLAIMS MATRIX below (§3) is the single source
every public word must reconcile to.

---

## 1. The honesty-as-proof system, in one paragraph

A visitor who has been burned by vapor-heavy SaaS marketing is looking for the lie. On this
page, the lie is not there to find — and the page shows its work so the visitor can verify that
themselves. Every capability claim carries a **status badge** (`Live` / `Building` / `Planned`).
The limitations are stated in plain language on the same surface that sells the benefits. The
privacy posture names what the product is *not* (not an aggregator, not a database of other
people's estimates). The security posture states only what is actually shipped. There is no
logo wall because there are no logos; no testimonials because there are no customers to quote;
no stats because nothing is measured; no compliance badges because the entity and DPA work are
not done (§17 #2/#4, §18.2). The product earns trust by **saying exactly what it does today and
what it does not**, in the same calm voice it uses everywhere else (§10). That is the proof
system.

---

## 2. The claims-ledger component (`<ClaimsLedger>` / `<ClaimRow>` / `<ClaimFilter>`)

This is the reusable React/RSC unit that renders the matrix. It is one of the **two interactive
leaves that hydrate** on the page (the other is the commercial-graph plate hover), per
`07-ENGINEERING-CONSTRAINTS.md`. Everything else is static.

### 2.1 Component shape

```
<ClaimsLedger title="What is real today" enableFilter>
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

- **RSC-first.** `ClaimsLedger` and `ClaimRow` render as Server Components by default (static
  content from the matrix). The only client interactivity is the **status filter** (a
  `<ClaimFilter>` client island: All / Live / Building / Planned) and per-row **expand-to-source**
  disclosure. Mirror the existing workshop-dashboard RSC pattern referenced in `CLAUDE.md`
  (memory: `workshop-dashboard-rsc`).
- **Status badge** consumes the shared `StatusPill` (§2.5) and the D-4 status→color map
  (`03-VISUAL-LANGUAGE-AND-TOKENS.md` §6.1): **Live** = `--success #15803d`; **Building** =
  `--warning #b45309`; **Planned** = `--ink #3D3D3D`; **NotUs** = `--muted-foreground #6b6b6b`
  (NotUs is carried by the type but is **not** a row in the public ledger — §3.4 explains the
  boundary rows reuse the same type). The badge is **never** the signal `--brand-orange #F24405`;
  the signal is reserved for the **redline annotation mark** (§2.3, D-3).
- **`note`** renders in `--secondary #5D5D5D` (NOT `--tertiary #7F7F7F` — fails WCAG AA, per
  DESIGN.md and memory `designmd-tertiary-fails-aa`) under the claim line.
- **`source`** renders as a small Roboto Mono tag (`--font-numeric`), e.g. `§7.2`. It is the
  audit trail: every public claim points back to MASTER.

### 2.2 Status states (the four the system uses — D-4 binding)

Per keystone decision **D-4**, the single shared `ClaimStatus` type is
`"Live" | "Building" | "Planned" | "NotUs"` and lives in **one component** —
`src/components/landing/shared/StatusPill.tsx` (§2.5). Every consumer (the ledger here, the plate
in `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`, the inventory in
`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`) imports it from that one path. No divergent type
definitions anywhere in the pack.

| Status | Meaning | Copy rule | Pill color (`03` §6.1) |
|---|---|---|---|
| **Live** | Ships in the MVP today. Safe to claim as current. | Present tense. | `--success #15803d` |
| **Building** | Partial today; actively improving. | "Improving" / "in progress"; never as fully shipped. | `--warning #b45309` |
| **Planned** | On the roadmap; not shipped. | Direction only; "planned" / "on the roadmap"; never as current. | `--ink #3D3D3D` (not "grey = maybe"; Planned is a stated intent, rendered in body ink) |
| **NotUs** | Explicit boundary — what Archestimator is not, or what is not built and not yet committed. | State plainly it is not built / not a claim we make. | `--muted-foreground #6b6b6b` |

> **Dormant** (the fourth value in MASTER §15's prose — "Live/Partial/Planned/**Dormant**") is
> folded into **NotUs** here. We render four states, not five, to keep the legend readable;
> NotUs carries the Dormant meaning. The public ledger (§3.1–3.3) and the commercial-graph plate
> (doc 04) use the **Live/Building/Planned subset**; the boundary rows in §3.4 carry the NotUs
> value. This is the D-4 narrowing-at-call-site pattern: same type, narrower rendering per surface.

### 2.3 The redline annotation mark (the only place signal orange touches the ledger)

The signal `--brand-orange #F24405` is used **as an architect's redline** — the mark an architect
draws on a drawing to flag something load-bearing. On the ledger it appears as a small 2px
**accent rail** down the left edge (per `03` §5) of the **honesty-anchor** rows and the **NotUs**
rows that protect the brand (the "not an aggregator" row, the "AI is deferred" row, the "exports
are working documents" row). **Copy is never colored; the redline is a visual annotation, not
text color** — text on the rail stays in `--ink #3D3D3D` / `--secondary #5D5D5D`. The redline
mechanic is the same "presence as accent rail" pattern `03` §5 sanctions; it does not introduce
a new accent family. D-3 honored: one accent, used sparingly; clay `#AA412A` is not a token and
not referenced.

### 2.4 Where `<ClaimsLedger>` appears

| Surface | Treatment | Cross-link |
|---|---|---|
| Homepage **Section 7 — What is real today** | The canonical rendering. Interactive filter on (`enableFilter`). Sits on a `.dashboard-glass` panel (`03` §4.2). | `05` Section 7; `02` |
| `/features` | Expanded per-feature (each row can expand to a short mechanic-forward paragraph). | `05` `/features` |
| `/trust` Section A | Full ledger, verbatim from the matrix (the trust surface must reconcile to the same source). | §6 below; `05` `/trust` |
| Footer "honesty line" | A **static, abbreviated** 3-row summary (Live foundation / AI deferred / exports are working documents), not the interactive ledger (`enableFilter={false}`). | `05` Footer |

> **Single source of truth:** the **CLAIMS MATRIX in §3 below** feeds every rendering. If the
> homepage ledger, `/features`, and `/trust` ever disagree, the matrix wins, and the public
> sign-off gate (`09-CLAIMS-LEDGER-SIGN-OFF.md`) blocks the release until they reconcile.

### 2.5 File layout + TS interfaces (implementer contract)

The claims-ledger components live under `src/components/landing/claims-ledger/` (per
`11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` §2.4). The shared `StatusPill` lives under
`src/components/landing/shared/` — the one canonical path D-4 fixes for the `ClaimStatus` type.
Exact files + the TS interfaces the implementer builds against:

```
src/components/landing/
├── shared/
│   └── StatusPill.tsx       # RSC shared — owns the ClaimStatus type (D-4). Used by ClaimRow + PlateNode.
└── claims-ledger/
    ├── ClaimsLedger.tsx     # RSC — renders the matrix as a list of <ClaimRow>
    ├── ClaimRow.tsx         # RSC — a single row (claim + StatusPill + source + note)
    └── ClaimFilter.tsx      # "use client" — All / Live / Building / Planned filter island
```

```ts
// src/components/landing/shared/StatusPill.tsx — THE single ClaimStatus definition (D-4 hard contract).
// The commercial-graph plate (04) and the inventory (11) import ClaimStatus from HERE.
export type ClaimStatus = "Live" | "Building" | "Planned" | "NotUs";

export interface StatusPillProps {
  status: ClaimStatus;
  redline?: boolean;        // the redline annotation mark (§2.3) — adds the --brand-orange accent rail
  size?: "sm" | "md";       // sm = inline tag; md = ledger row default
}

// src/components/landing/claims-ledger/ClaimsLedger.tsx
import type { ClaimStatus } from "@/components/landing/shared/StatusPill";

export interface ClaimRowData {
  claim: string;            // "Estimate workspace with a hierarchical tree (Group / Area / rows)"
  status: ClaimStatus;
  source: string;           // "§7.2" — points back to MASTER for the audit trail
  note?: string;            // optional honest qualifier, e.g. "Working document; not an immutable issued record"
  redlineNote?: string;     // optional architect-redline annotation (§2.3) — the honesty-anchor rows
}

export interface ClaimsLedgerProps {
  rows: ClaimRowData[];     // sourced from §3 (parsed at build time by scripts/claims-matrix-check.mjs)
  title?: string;           // default "What is real today"
  enableFilter?: boolean;   // default true on homepage section 7 + /trust; false in footer
}

// ClaimRow.tsx and ClaimFilter.tsx consume ClaimRowData / ClaimStatus; their full prop lists
// are finalized in 11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md §2.4.
```

The `rows` prop is populated at build time from a parsed representation of §3 — the same source
`scripts/claims-matrix-check.mjs` reconciles against the Feature Inventory (§7.3, §3.0). This
keeps the rendered ledger and the reconciliation gate on a single source. **The sign-off gate
that enforces this lives in `09-CLAIMS-LEDGER-SIGN-OFF.md`** — the §7.5 "public claims matrix
complete" launch gate, operationalized. This doc feeds it; it does not own the gate.

---

## 3. The CLAIMS MATRIX (compile from §7.2 + §15)

Every public-facing claim the landing system may make, mapped to its status and its § source in
`ARCHESTIMATOR_MASTER.md`. **If a claim is not in this matrix, it cannot appear on the public
site.** This is the canonical ledger; `05-COPY-SKELETON.md` consumes it row-for-row.

### 3.0 Reconciliation header (the drift-control bar)

> **`last_reconciled`: 2026-06-22** (initial matrix authoring against MASTER v4.3, 2026-06-18).
> **`feature_inventory_id`:** Notion `/p/aa13f3aafe3e8394b9298102f99c87b1` (MASTER §18 — the
> canonical internal status tracker MASTER §7.2 binds marketing to).
> **`sync_status`: DRIFT-PRONE** — the Feature Inventory is a live Notion doc; this matrix is a
> snapshot. Drift is expected between releases; the reconciliation gate (§7.3) catches it before
> any public change. **The matrix is downstream of the Feature Inventory, never upstream**
> (§7.1).
> **`next_reconciliation`:** before the next public release of the landing (§7.4 cadence) or on
> any Feature Inventory status change that touches a row in §3.1–3.3, whichever comes first.
> **Drift owner:** the claims-discipline owner (this doc). Reconciliation is run by
> `scripts/claims-matrix-check.mjs` (§7.3 step 1 + the CI fixture in §3.7).

### 3.1 Live (ships today)

| Claim (public wording, short) | Status | § source | Notes / qualifiers |
|---|---|---|---|
| Estimate workspace with a hierarchical tree (Group / Area / rows; drag-drop reorder) | Live | §7.2, §8.3 | The Estimate Tree node on the plate (`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`). |
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
| Security posture as shipped (bearer-secret tokens ≥32 bytes, HMAC-SHA256 + server pepper, expiry/revocation, POST-only mutations, HttpOnly/Secure/SameSite cookies, durable rate limiting with `Retry-After`, audit logging, RLS on every table) | Live (as shipped) | §8.6 | State only what exists. ⚠️ P1 items (durable rate limiting, POST-only invite acceptance, token hashing w/ pepper) are the co-dependency for the "Start free" funnel — see `07`. Rate limiting is **Postgres** (`rate_limit` table), NOT Redis. |
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
| AI copilot (Ask-only first; then Draft/Apply behind confirmation) | Planned (deferred) | §7.2, §8.5, §16.1 | **DEFERRED — must not feature as current.** When shipped: Pro and up; Ask-only first; visible DeepSeek/privacy note near every AI mention. Held-in-reserve disclosure copy in §3.6. |
| Public claims matrix (this ledger, public) | Planned (as a tracked Notion artifact) | §7.2, §7.5 | This page *is* the public rendering of it; the Notion tracker stays canonical internally. |
| Hosted auth redirect verification | Planned (launch gate) | §7.2, §7.5 | A P0 gate, not a marketing claim. |
| Revision intelligence; proposal comparisons | Planned | §7.2 | — |
| Supplier catalog → quote requests → product comparison → procurement bridge | Planned (Later) | §7.2, §4.4 #3 | The Supplier Bridge node on the plate (`04`). The genuinely under-built part (§2). |
| Client-side proposal record / archive | Planned (Later) | §7.2, §9.1 | Client-archive cannot be sold before retention/deletion/permission rules exist (§8.6, §13.4). |
| Design/product bridge + takeoff bridge; ERP/procurement handoff; approval-to-payment; milestone payment tracking | Planned (Later) | §7.2 | Far horizon; appear only as roadmap direction. |
| Public API | Planned (undecided) | §8.6 | ⚠️ NEEDS INPUT; do not claim. |
| Education tier; Owner/Portfolio tier | Planned (tier shape) | §9.2 | Names may appear as the *shape* of the model on `/pricing`; no numbers. |

> **Correction note:** a prior draft of §3.3 listed "Surfacing / recall of your own history by
> client/typology" as a second, duplicate row. It is the same claim as the first §3.3 row and is
> removed here — the matrix lists each claim exactly once. The reconciliation gate (§7.3 step 2
> + §3.7) would fail the build on any future duplicate.

### 3.4 NotUs (the explicit boundary, §15; carries NotUs in the D-4 type)

These are the rows that protect the brand. Each is a refusal to claim something the product is
not. Most carry the **redline mark** (§2.3). Per D-4 these rows carry the `NotUs` value from the
shared type; the public ledger renders them in a clearly delimited "What we are **not**" block so
they read as boundaries, not as a fourth status bucket competing with Live/Building/Planned.

| Boundary claim (what we state plainly) | Status | § source | Why it matters |
|---|---|---|---|
| "Not production-hardened enterprise SaaS." | NotUs | §7.4, §15 | Maturity honesty. |
| "Exports are working documents, **not** immutable issued records, legal documents, or POs." | NotUs (redline) | §7.4, §16.2, §15 | Drift-register resolved: shared links exist; "immutable / issued record" stays banned until the policy gate (§16.2). |
| "AI is on the roadmap, not in the product today." | NotUs (redline) | §7.2, §8.5, §16.1, §15 | AI deferred 2026-06-18. Must not feature as current. Disclosure copy held in reserve (§3.6). |
| "Not procurement, ERP, or payment execution." | NotUs | §7.4, §15 | — |
| "Not an aggregator, not a database of other people's estimates, not a bulk import of your old files." | NotUs (redline) | §3.3, §15, R10 | The privacy posture. The intelligence is **yours**, built from your work. |
| "No BIM or drawing ingestion today." | NotUs | §7.4, §8.6 | Takeoff bridge is Later. |
| "English UI, no localization yet." | NotUs | §7.4 | — |
| "No `the only tool that…` / `only we…` superiority claims." | NotUs (redline) | §2, §10.4, §15 | Reusable cost intelligence is enterprise table stakes (§2); we compete on fit/reach/price + proposal-to-approval + client record + supplier bridge + private-by-design (§4.4). |
| "No logos, testimonials, adoption metrics, or partner names — none exist yet." | NotUs | §12.8, §14.1, §15 | §15 forbids inventing them. |
| "No compliance badges (SOC2/GDPR/HIPAA/DPA) — entity and DPA work are not done." | NotUs | §4.4, §17 #2/#4, §18.2 | Do not badge until the entity + DPA registration assessment close. |
| "No guaranteed accuracy / fully automated estimating." | NotUs | §10.6, §15, §8.4 | Deterministic arithmetic over the user's inputs (§8.4). |

> **Naming note (open, owner A/B):** the §2.2 legend calls the fourth value **NotUs** (D-4 type
> name). Whether the public-facing pill renders the text "Not us" vs. "Not yet" vs. a single
> "Boundary" label is a voice A/B for the owner (carried as an open decision, §9); all three are
> within §10/§15. The **type value is `NotUs`** regardless of the rendered label — this keeps the
> D-4 contract single-source while leaving the public wording to the owner.

### 3.5 FORBIDDEN (do not appear anywhere on the public site, per §15)

These are not rendered as ledger rows — they are the negative list the writers/checkers reconcile
against. Listed here so the gate (`09-CLAIMS-LEDGER-SIGN-OFF.md`, §7.3 step 5) can fail a build
on any of them.

- "Production hardened" / "legally automated" / "immutable audit trail" / "legally binding archive."
- Calling current exports immutable/issued records.
- PO execution, legal-document automation, full procurement/ERP, payment-platform language.
- Fake adoption, fake integrations, fake metrics, fake testimonials, fake partner names.
- Legal/compliance guarantees; compliance badges before the entity/DPA work.
- AI as a current capability; any autonomous-estimating implication.
- "Guaranteed accuracy," "fully automated estimating."
- Aggregator / "database of estimates" language; "the only tool that…"; any superiority theater.
- Banned voice lines (§10.4): "Winners use Archestimator," "stop being left behind," "only the
  smart ones," "you are losing because…," "your competitors are winning because they use
  Archestimator."
- The superseded May hero (§16.4): "Start Winning," "Win More Bids," "Estimate with Precision.
  Win with Clarity," "Only the smart ones create cost estimates this way." See §4 REMOVALS.
- Any peso price, tier number, or tier table presented as decided (§9.3 — HYPOTHESIS until
  validation gates close).

### 3.6 AI disclosure reserve copy (activates only when AI ships at Pro+)

Per MASTER §8.5 + §15, AI is deferred. **Activation trigger:** AI ships at Pro and up, Ask-only
first. Until that trigger fires, surfacing this copy on the public site would imply AI is live (a
§15 violation), so it is **held in reserve**. When the trigger fires, the following copy is
**already-approved** so the disclosure ships with the feature, not after. This is not a Live
claim today; it is a row that moves from §3.3 to §3.1 when the AI row promotes.

**The mandatory disclosure sentence (rides with EVERY AI mention when AI ships):**

> Archestimator's AI copilot is Ask-only: it answers questions about your workspace, it does not
> write, edit, or estimate for you. Your numbers always come from your library and your inputs.
> AI responses are generated by a third-party model (DeepSeek); your data is sent to that model
> only when you ask a question, and is never used to train it.

**Status transition rule (when the activation trigger fires):**

1. Move the §3.3 AI row to §3.1 (Live) **and** reword from "deferred" to present tense.
2. Add the disclosure sentence above to every AI-adjacent surface (homepage, `/features`,
   `/trust` Section F, the in-app AI surface itself).
3. Re-run the sign-off gate (`09-CLAIMS-LEDGER-SIGN-OFF.md`); the §8.5 disclosure check verifies
   the sentence rides with every AI mention.
4. Update the `/trust` Section F copy from "deferred" framing to "shipped, Ask-only, with the
   disclosure above."

Until the transition fires, **the disclosure sentence is held in reserve**. Tracked in
`LOOP_LEDGER.md` (the AI-status owner decision, Gated #10).

### 3.7 The forbidden-list regex (CI fixture)

The §7.3 step 5 "FORBIDDEN-list check" is a literal string/regex sweep over the rendered public
pages. The exact regex is a **checked-in CI fixture** at `scripts/fixtures/claims-forbidden.txt`
(one pattern per line, blank lines and `#` comments allowed) consumed by
`scripts/claims-matrix-check.mjs --forbidden` (§7.6). Seed contents (the §3.5 list, anchored on
literal substrings so the sweep is unambiguous):

```
# claims-forbidden.txt — the §3.5 negative list as literal substrings.
# One pattern per line. Blank lines and lines starting with # are ignored.
# Edited through the §20 content-workflow (claims-discipline owner), NOT by individual writers.
production hardened
production-hardened
legally automated
immutable audit trail
legally binding archive
issued record
fully automated estimating
guaranteed accuracy
Winners use Archestimator
stop being left behind
only the smart ones
you are losing because
your competitors are winning
the only tool that
only we
Start Winning
Win More Bids
Win with Clarity
database of estimates
database of other people
AI-powered estimating
```

The CI job compiles each non-comment line to a case-insensitive substring pattern, sweeps the
rendered HTML of `/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`, and the footer
honesty line, and **fails the build on any hit**. False-positive escapes (a legitimately-ok
phrase that contains a forbidden substring) are resolved by editing the matrix in §3.5 first,
then the fixture — never by weakening the sweep.

---

## 4. REMOVALS (the §15 deletion rail; needs owner confirmation)

Each item below is in the current `src/components/landing/` tree and **violates §15 or the
ratified design direction (D-1)**. Removal is the default; the owner confirms via the plan
sign-off (`MASTER-AUDIT-AND-SCORECARD.md` + `09-CLAIMS-LEDGER-SIGN-OFF.md`), not this doc. File
paths are absolute for the implementer. The full file-level change inventory + 7-phase migration
order + rollback playbook live in `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` — read that before any
deletion.

### 4.1 The fabricated testimonials (§15 violation — none may be invented)

- **`/Users/philiplewis/Documents/archestimator/src/components/landing/ProcessBandSection.tsx`**
  — `testimonialSlides` array (lines ~25, ~76–88), rendered as "Closed beta testimonial
  carousel." There is no closed beta with named quotable users (§14.1: commercial certainty "not
  yet proven"; §12.8: none exist, none may be invented).
- **`/Users/philiplewis/Documents/archestimator/src/components/landing/CompanyProofCarouselSection.tsx`**
  — `testimonialSlides` array (line ~46), second "Closed beta testimonial carousel" (lines
  ~163–177). Same violation.
- **`/Users/philiplewis/Documents/archestimator/src/components/landing/TestimonialSection.tsx`**
  — the entire `TestimonialSection` component (props: `quote`, `name`, `role`, `imageLabel`). A
  reusable testimony renderer with no real testimony to render. Remove the component and its
  export in **`/Users/philiplewis/Documents/archestimator/src/components/landing/index.ts`**
  (line ~22).
- **`/Users/philiplewis/Documents/archestimator/src/components/landing/company-proof-data.ts`**
  — the `placeholderCompanyProof` array (line ~54) and the placeholder/logo machinery.
  "Placeholder" partner logos are the thin end of the §15 wedge (imply relationships that do not
  exist). Remove with the proof carousel.

> **Justification (§):** §15 ("fake adoption/integrations/metrics" forbidden), §12.8 ("none
> exist; none may be invented"), §14.1 (commercial certainty not yet proven), §4.4 #6 (honesty as
> brand). The locked proof strategy replaces these with the claims ledger + private-by-design +
> named commercial-graph architecture (D-1 preserve-list).

### 4.2 The hype hero (§10.4 / §16.4 violation)

- **`/Users/philiplewis/Documents/archestimator/src/components/landing/HeroSection.tsx`** — the
  banned lines:
  - `PRECISION_TO_WIN_HEADLINE = "Estimate with Precision. Win with Clarity."` (line ~83)
  - the `'Estimate with Precision. Win with Clarity.'` variant (line ~95)
  - `"Win More Bids."` / `"Close Projects Faster."` (line ~269)
  - `"Start Winning"` (line ~294)

> **Justification (§):** §16.4 (the May hero is superseded; ship the §11.1 cost-intelligence-layer
> hero), §10.4 (banned lines: superiority theater, "win" framing that attacks the reader's
> standing). The ratified decision replaces the hero with `Your cost intelligence layer.`
> (§11.1), voice = Controlled Confidence. The lines are also in the §3.7 forbidden-list regex,
> so CI fails the build if they re-appear.

### 4.3 The construction-photo slideshow + the frosted-construction hero PNG (§12.9 violation)

- **`/Users/philiplewis/Documents/archestimator/src/components/landing/HeroSection.tsx`** — the
  9-slide `construction-slide-01.jpg` … `construction-slide-09.jpg` array (lines ~21–61), with
  `alt` text like "Frosted commercial construction site with crane," and the
  `landing-hero-frosted-visual` element (line ~301).
- The associated ~2.3MB frosted-construction hero PNG / slide assets under
  `/public/landing/hero-slides/` (verify the exact byte size at removal time).

> **Justification (§):** §12.9 ("documents you would trust, not dashboards that perform"). D-1
> sets the page on the **Glass Brand** — `.dashboard-glass` over `--warm-canvas #f5f5f5`, with the
> hero brand panel carrying an abstract gradient composition built from `--grad-hero-continue` /
> `--grad-hero-create` (no photographs, no fake product screenshots, per D-2 + radical honesty).
> There is no construction-photo slideshow and no heavy hero image. LCP target = the Doto text
> headline, no heavy hero image (per `07`). (Prior direction text referencing proposal-paper +
> Source Serif 4 is obsolete under D-1 — Source Serif 4 is DEFERRED; see `03` §7.4.)

### 4.4 The logo-only footer (replacement rail)

- **`/Users/philiplewis/Documents/archestimator/src/components/landing/LandingFooter.tsx`** —
  imports `ArchestimatorLogo` (line ~3) and renders a logo-only block. Not a §15 violation, but
  the ratified decision replaces it with a **glass-skin sitemap** (per the canonical brief and
  `05` Footer): wordmark + tagline + sitemap columns (Product / Company / Pre-launch MVP preview
  badge) + the honesty line, on a `.dashboard-glass` bar (`03` §4.2).

> **Justification (§):** the canonical brief's "Footer (document-styled sitemap, replace
> logo-only block)" — re-skinned to glass under D-1; §11.6 (tagline `Archestimator: the cost
> intelligence layer for AEC teams. From cost proposal to client approval.`); §7.4/§15 (the
> honesty line carries the maturity disclosure).

### 4.5 Other §15-adjacent removals to verify at implementation time

- **`PartnerSection.tsx`** (`partnerCards`) — verify whether the cards imply real partnerships; if
  they do, remove under §15; if they are generic capability cards, they may be reworked (defer
  to `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`).
- Any remaining "closed beta" / "trusted by" / social-proof copy elsewhere in
  `src/components/landing/` — sweep at implementation; the §4.1–4.4 list is the confirmed set,
  not necessarily exhaustive of every imply-adoption string. The §3.7 regex catches the banned
  substrings if they survive the sweep.

---

## 5. The private-by-design trust block (R10, §4.4 #4)

This is the trust posture that replaces a logo wall. It is rendered as a **static block** (no
hydration needed) on `/trust` Section B and as a one-liner on `/about`. Copy is locked to MASTER.

### 5.1 The block, verbatim (from `05` `/trust` Section B)

> Your data is yours. Archestimator is not an aggregator and not a database of other people's
> estimates. The intelligence in your workspace is built from your work, never pooled or
> anonymized across customers. `[Claims: Live — privacy posture]` (§3.3, §4.4 #4, R10)

### 5.2 Why this is a trust asset, not a sacrifice

MASTER §2 Finding 2 calls out Zebel explicitly: it "blends anonymized cross-customer market
data." Archestimator's deliberate opposite (R10) is a clean privacy story that **foregoes** the
cross-customer benchmark. The trust block names the trade honestly: the intelligence is
**yours**, never pooled. This is a positioning choice the owner has ratified (R10), not a
limitation to apologize for. Copy must never hedge it ("…for now") or imply the pooling is coming.

### 5.3 Boundary (what the block does NOT claim)

- It does **not** claim SOC2/GDPR/HIPAA/DPA compliance (entity and DPA work not done — §17 #2/#4,
  §18.2).
- It does **not** claim a published Privacy Policy or ToS (⚠️ NEEDS INPUT — §17 #3, §18.2). Until
  those exist, the block states the **posture**, not legal guarantees.
- It does **not** claim data residency in the Philippines; data sits on Supabase in
  `ap-southeast-2` (Australia) — a cross-border transfer (§18.2). If/when this is surfaced
  publicly, it is stated plainly, not hidden.

---

## 6. The `/trust` page, in depth

`/trust` is a route on the locked scope list (`00-OVERVIEW.md` §4). It is where honesty is
**operationalized** as a standalone surface, not just a homepage section. IA and chrome in `02`;
copy essentials in `05`. This section owns its **structure and claims discipline**.

### 6.1 Page purpose (one line)

A pre-launch product earns trust by showing its work. `/trust` is the page that shows its work in
full: every claim with a status, the privacy posture, the security posture as shipped, and the
honest limitations.

### 6.2 Page sections (claims-tagged)

| Section | Content | Status mix | Cross-link |
|---|---|---|---|
| **A. The claims ledger** | The full CLAIMS MATRIX (§3 above), rendered via `<ClaimsLedger>` with `enableFilter`. | Live + Building + Planned + NotUs | §2, §3 |
| **B. Privacy by design** | The §5.1 block verbatim. | Live (posture) | §5 |
| **C. Security posture (as shipped)** | State only what exists: bearer-secret invite/share tokens (≥32 bytes, base64url, HMAC-SHA256 + server pepper, never logged raw), expiry + revocation, POST-only mutations, HttpOnly/Secure/SameSite cookies, no localStorage tokens, durable composite-key rate limiting (`rate_limit` table — Postgres, NOT Redis) with `Retry-After`, audit logging + metrics/alerts, indexes on high-traffic collaboration tables, `Cache-Control: no-store` for tokenized pages, fail-closed on missing config, RLS on every table. | Live (as shipped) | §8.6 |
| **D. Maturity & limitations** | The §7.4 honest list: pre-launch MVP, not production-hardened; AI deferred; exports are working documents; no procurement/ERP/payment execution; no BIM/takeoff ingestion yet; English UI, no localization yet. | Live (honest limitations) | §7.4 |
| **E. Data residency & cross-border** | Plain statement: workspace data sits on Supabase in `ap-southeast-2` (Australia); a cross-border transfer. **BUILD-TIME CONDITIONAL — ships only when the DPA safeguards are in place** (§6.5). | Live (fact) / GATED on DPA | §8.2, §18.2 |
| **F. What's next (roadmap, honestly)** | The Planned rows from §3.3, restated as direction. Includes the deferred AI copilot with the privacy note. | Planned | §3.3 |
| **G. Contact / CTA** | "Start free" (routes to `/signup` or `/login` per L-FUN-1/L-FUN-2) + "Book a walkthrough." | Live | `05` `/trust`; `23-AUTH-EXPERIENCE.md` |

### 6.3 The AI disclosure rule on `/trust`

Per §8.5 / §15: AI is deferred. On `/trust` it appears **only** under Section F (Planned), phrased
as: the AI copilot is on the roadmap, not in the product; when it ships it enters as an Ask-only
copilot at Pro and up, with a visible privacy note (DeepSeek disclosure). **No AI-hero, no
"AI-powered estimating," no autonomous-estimating implication.** If/when AI ships, the §3.6
reserve disclosure rides with every AI mention (§8.5).

### 6.4 What `/trust` must NOT contain

- No compliance badges (SOC2/GDPR/HIPAA/DPA) — entity/DPA not done (§17 #2/#4).
- No "trusted by," no logos, no testimonials, no stats (§15; §4.4 #6).
- No legal guarantees (no "legally binding," "immutable audit trail," "compliance record,"
  "guaranteed dispute protection") — §15; all are also §3.7 forbidden-list entries.
- No claim of a published Privacy Policy or ToS until they exist (§17 #3).

### 6.5 Section E is a build-time conditional (DPA-gated)

Section E (data residency / cross-border) is the only `/trust` section whose rendering is
gated. It compiles in **only when `DATA_RESIDENCY_PUBLIC=true`** (an env flag the
claims-discipline owner sets after the DPA safeguards close — Gated #4). When the flag is unset,
Section E is absent and the section nav skips from D → F (no broken anchor, no "coming soon"
stub — the page reads as complete either way). This keeps the page honest: we do not surface a
cross-border transfer until the legal posture that governs it is in place. Code shape (for the
implementer; owned by `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md`):

```tsx
// /trust page RSC
{process.env.DATA_RESIDENCY_PUBLIC === "true" && <DataResidencySection />}
```

The flag is a **build-time** switch (Next.js inlines `process.env.*` at build), so the section is
either in the shipped HTML or not — no client toggle, no SSR per-request branch. The build job
sets the flag from the DPA-gate status in `LOOP_LEDGER.md`; `08-ROLLOUT-AND-ANALYTICS.md` owns
the build pipeline.

---

## 7. Keeping the system honest as features ship (the claims-status update process)

The ledger is a living artifact. If it goes stale, it becomes a lie — which defeats the entire
proof system. This section defines the process that keeps it honest. It is the operational
counterpart to the §7.5 launch gate ("public claims matrix complete") and the §13.2 cadence ("per
release: verify claims → QA snapshot"). **The gate itself is owned by
`09-CLAIMS-LEDGER-SIGN-OFF.md`; this doc feeds it.**

### 7.1 The single internal source

- **Canonical internal source:** the Notion **Feature Inventory**
  (`/p/aa13f3aafe3e8394b9298102f99c87b1`, per §18) — the status tracker MASTER §7.2 binds
  marketing to.
- **This CLAIMS MATRIX (§3 above)** is the **public projection** of the Feature Inventory. It
  must reconcile to the Feature Inventory before every public change (§3.0 reconciliation header).
- **Never** edit the public matrix without checking the Feature Inventory first. The matrix is
  downstream, not upstream.

### 7.2 Status-transition rules

| From → To | Trigger | Required action |
|---|---|---|
| Planned → Building | Feature enters active development with a ship target. | Move row in §3.3 to §3.2; update copy from "on the roadmap" to "in progress." |
| Building → Live | Feature ships to production and the §7.5 smoke test for it passes. | Move row to §3.1; update copy to present tense; add to the Live count on `/trust` Section A. |
| Live → (no backwards move) | A Live feature may be deprecated, but it does not silently revert to Planned. | If deprecated: add a **NotUs** row explaining the change; do not hide the history. |
| NotUs → Live | Only when the underlying reality changes (e.g., DPA registration closes → a compliance claim becomes permissible). | Add a new Live row; keep the old NotUs boundary row only if the boundary still partly applies. |

### 7.3 The pre-release reconciliation gate (ties to `08-ROLLOUT-AND-ANALYTICS.md` + `09-CLAIMS-LEDGER-SIGN-OFF.md`)

Before any public release of the landing system (or any claim-changing release of the product):

1. **Diff the Feature Inventory** against the public CLAIMS MATRIX since the last release. Any
   status change must propagate to the matrix. The diff is run by
   `scripts/claims-matrix-check.mjs` (§7.6).
2. **Sweep the public surfaces** (homepage ledger, `/features`, `/trust`, footer honesty line,
   the copy in `05`) for any line that implies something the matrix marks Planned/NotUs. If found,
   the line loses.
3. **Sign-off gate** (`09-CLAIMS-LEDGER-SIGN-OFF.md`): the owner signs that the matrix reconciles
   to the Feature Inventory. **No sign-off, no release.** This is the §7.5 "public claims matrix
   complete" gate, operationalized — the gate is *owned* by doc 09, *fed* by this doc.
4. **AI disclosure check:** if anything AI-adjacent shipped, verify the §8.5 privacy note rides
   with every AI mention (§15) — i.e., the §3.6 reserve copy activated correctly.
5. **FORBIDDEN-list check:** run `scripts/claims-matrix-check.mjs --forbidden` (§3.7) against the
   rendered pages. A hit fails the build.

### 7.4 Cadence

- **Per release** (§13.2): steps 1–5 above. This is the non-negotiable gate.
- **Weekly** (§13.2, "product truth, claims, beta readiness"): a lighter check that nothing in
  the Feature Inventory moved without the matrix following.
- **Per call** (§13.2): capture any prospect/beta objection that touches a claim ("I thought
  this did X?") and route it to the matrix as a candidate clarification.

### 7.5 The moat metric tie-in (§14.4)

The honesty system also tells us what to measure. Per §14.4, the moat metric is **reused
components/templates per estimate** — the behavioral signal that the "your work compounds" claim
(§3) is becoming true in the user's workspace. Until that metric is measured, the "compounds"
claim stays framed as the Live foundation + the Planned surfacing payoff (§3.3 honesty anchor).
When the metric is live, it becomes evidence — but **never** a public stat until §15 is satisfied
(measured, not inflated, not invented). See `08-ROLLOUT-AND-ANALYTICS.md` and
`17-ANALYTICS-AND-OBSERVABILITY.md` for the analytics events.

### 7.6 `scripts/claims-matrix-check.mjs` — the contract

This is the CI job that automates steps 1 and 5 of the reconciliation gate. It is **owned by this
doc** (the claims-discipline owner), checked into `scripts/`, and wired into the CI shape in
`16-TEST-AND-VERIFICATION-PLAN.md`. Contract:

- **Modes:**
  - `claims-matrix-check.mjs` (default) — **the drift check.** Parses the §3 markdown tables
    (§3.1 Live, §3.2 Building, §3.3 Planned, §3.4 NotUs) into a normalized row list
    (`{ claim, status, source }`), diffs against a **checked-in Feature Inventory snapshot** at
    `scripts/fixtures/feature-inventory.snapshot.json` (the canonical Notion doc exported by the
    §20 content-workflow owner), and **exits non-zero on drift**: a row whose status in the
    snapshot differs from the matrix, a matrix row absent from the snapshot, or a duplicate
    claim across the four tables (catches the §3.3 duplicate-Surfacing bug class).
  - `claims-matrix-check.mjs --forbidden` — **the §3.5 sweep.** Loads
    `scripts/fixtures/claims-forbidden.txt` (§3.7), compiles each pattern case-insensitively,
    sweeps the rendered HTML of `/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust`, and
    the footer honesty line (HTML files passed as args or fetched from a preview build), and
    exits non-zero on any hit.
- **Inputs (checked-in fixtures, NOT live network calls in CI):**
  - `scripts/fixtures/feature-inventory.snapshot.json` — the Feature Inventory snapshot. Updated
    by the §20 content-workflow owner; CI diffs against the checked-in version, so a Notion doc
    changing under us never silently flips a status. Drift between the snapshot and live Notion
    is a §20 workflow responsibility, not a CI responsibility.
  - `scripts/fixtures/claims-forbidden.txt` — the §3.5 forbidden-list regex (§3.7).
- **Output (both modes):** a JSON report on stdout (`{ ok: boolean, drifts?: [...], hits?: [...] }`)
  plus a human-readable summary on stderr; non-zero exit on `ok:false`. The JSON shape is stable
  so `16-TEST-AND-VERIFICATION-PLAN.md` can parse it in CI.
- **Fail-closed:** any parse error (malformed matrix table, missing fixture, malformed fixture)
  exits non-zero. The gate never silently passes.
- **What it does NOT do:** it does not edit the matrix, it does not call Notion, it does not
  render pages. It is a pure diff/sweep over checked-in inputs.

The drift check + the forbidden sweep together are the §7.3 steps 1 and 5 in code; the owner
sign-off (step 3) is the human gate that `09-CLAIMS-LEDGER-SIGN-OFF.md` operationalizes on top.

---

## 8. Voice check (every claim obeys §10)

Controlled Confidence (§10.1): calm conviction, no hype. Applied to this doc's outputs:

- **Lead with the change, not the mechanism (§10.2 #1):** the ledger leads with what the user gets
  ("Stop starting from zero"), with the status badge as the credibility clause.
- **Plain words, one intriguing idea (§10.2 #2):** "Your cost intelligence layer," surrounded by
  plain ledger rows.
- **Calm conviction, never hype (§10.2 #3):** "We would rather tell you exactly what it does today
  than oversell it" (§11.5). State things; do not sell them.
- **Attack the workflow, never the user (§10.2 #4):** the villain is the spreadsheet-rebuild loop,
  never the reader.
- **Earn every claim (§10.2 #5):** the badge system. The honesty is the voice.

Banned (§10.4): no "Winners use Archestimator," no "stop being left behind," no "only we / the
only tool that…," no superiority theater, no FOMO. The superseded May hero is removed (§4.2) and
its lines are in the §3.7 forbidden regex.

---

# Cross-links

- `00-OVERVIEW.md` — plan overview, the five ratified keystone decisions (the honesty proof
  strategy is D-1's preserve-list item; ClaimStatus is D-4; honest scoring is D-5).
- `01-DESIGN-DIRECTION.md` — why we borrow Intercom/Amigo's craft + named-architecture move but
  **replace** their proof engine (logos/testimonials/stats/badges) with honesty.
- `02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md` — canonical DOM order; Section 7 is where
  `<ClaimsLedger>` renders on the homepage.
- `03-VISUAL-LANGUAGE-AND-TOKENS.md` — the Glass Brand surface, the redline accent as annotation
  mark (§5), the D-4 status→color map (§6.1) the `StatusPill` consumes, motion.
- `04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md` — node-by-node claims tags on the plate; each plate
  node must reconcile to a row in §3 (the plate narrows the D-4 type to Live/Building/Planned).
- `05-COPY-SKELETON.md` — consumes this matrix row-for-row; every `[Claims: X]` tag in `05`
  points back to §3 here.
- `07-ENGINEERING-CONSTRAINTS.md` — RSC-first structure; the two interactive leaves
  (architecture-plate hover + claims-ledger filter); the "Start free" funnel co-dependencies.
- `08-ROLLOUT-AND-ANALYTICS.md` — preview route, A/B old vs new, the claims sign-off gate step,
  analytics events (signup, first estimate, component reused = moat metric, proposal shared,
  export); owns the `DATA_RESIDENCY_PUBLIC` build pipeline.
- `09-CLAIMS-LEDGER-SIGN-OFF.md` — **the public sign-off gate this matrix reconciles to** (§7.3
  step 3). Owns the gate; this doc feeds it.
- `11-COMPONENT-INVENTORY-AND-CONTENT-MAP.md` — the `<ClaimsLedger>` / `<ClaimRow>` /
  `<ClaimFilter>` / `StatusPill` component inventory entries (§2.5 file layout).
- `15-FORMS-AND-ABUSE-GUARDRAILS.md` — owns the Postgres rate-limit + honeypot the "Start free"
  funnel depends on.
- `16-TEST-AND-VERIFICATION-PLAN.md` — owns the CI shape `claims-matrix-check.mjs` (§7.6) plugs
  into, and the visual-regression gate.
- `17-ANALYTICS-AND-OBSERVABILITY.md` — owns the moat-metric instrumentation (§7.5) and the
  anonymous→authenticated session merge.
- `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` — owns the Feature Inventory snapshot update workflow
  and the §3.7 fixture edit path.
- `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` — the file-level change inventory + migration order for
  the §4 REMOVALS; read before any deletion.
- `23-AUTH-EXPERIENCE.md` — owns the `/login` + `/signup` routes the "Start free" CTA routes to
  (L-FUN-1/L-FUN-2); the auth glass panel imports `StatusPill` if it ever carries a claim (D-4).
- `LOOP_LEDGER.md` — plan loop state; every Gated item below is a row there.

---

# ⚠️ Gated on / Open decisions

Per D-5, no gate is silently marked closed. Everything below is a dependency this doc leans on
but cannot resolve from MASTER alone. Each must close before the affected claim goes public, and
each has a row in `LOOP_LEDGER.md`.

1. ⚠️ **GATED (L-CLM-1)** on the Feature Inventory being authoritative and current — the CLAIMS
   MATRIX (§3) is its public projection. If the Feature Inventory drifts, the matrix lies.
   Reconcile before every release (§7.3). MASTER §7.2, §18.
2. ⚠️ **GATED (L-RAT-1…6)** on ratification of R1–R11 (MASTER §1) — the hook, the promise, the
   UVP, and the private-by-design posture (R10) are `[PROPOSED]` until signed off. Several Live
   rows in §3.1 ride on R10.
3. ⚠️ **GATED (L-EXP-1)** on the proposal export policy decision (issued/immutable snapshot) —
   blocks any "issued record" / "immutable snapshot" claim. Exports stay "working documents"
   (§3.2, §3.4). MASTER §7.2, §16.2.
4. ⚠️ **GATED (L-LEG-2 / L-LEG-4)** on published Privacy Policy + ToS and the DPA registration
   assessment — blocks any compliance-badge or legal-guarantee language on `/trust` and blocks
   `/trust` Section E from compiling in (§6.5). No SOC2/GDPR/HIPAA/DPA badges. The §5 privacy
   block states the **posture**, not legal guarantees, until these close. MASTER §17 #3/#4, §18.2.
5. ⚠️ **GATED (L-LEG-1)** on the entity (OPC vs DTI) — blocks any "Archestimator Inc."-style
   legal-entity claim. MASTER §17 #2, §18.2.
6. ⚠️ **GATED (L-PRC-1)** on pricing validation gates + Van Westendorp — blocks any peso number or
   tier table on the public site. The matrix deliberately has **no** pricing rows in §3.1; tier
   *names* may appear as Planned shape only. MASTER §9.3, §17 #6.
7. ⚠️ **GATED (L-ROL-1)** on canonical role names + permissions (Access Matrix) — the
   "collaboration invites with roles" Live row must not enumerate permission granularity publicly
   until role names are fixed. MASTER §7.3, §17 #15.
8. ⚠️ **GATED (L-FND-1)** on the founder public bio assets — does not block this doc, but blocks
   the founder one-liner elsewhere (`05` Section 9, `/about`). MASTER §13.1, §17 #17.
9. ⚠️ **GATED (L-REM-1…4)** on owner confirmation of the REMOVALS list (§4) — the deletion rail is
   the default per the ratified design direction, but the owner confirms at plan sign-off
   (`09-CLAIMS-LEDGER-SIGN-OFF.md`). File paths in §4 are the confirmed set; §4.5 flags items to
   verify at implementation. `21-BLAST-RADIUS-AND-MIGRATION-PLAN.md` owns the migration order.
10. ⚠️ **GATED (L-AI-1)** on the AI copilot remaining deferred — if AI ships, the §3.3 AI row moves
    to Building/Live **and** the §3.6 reserve disclosure (DeepSeek note) must ride with every AI
    mention, and the `/trust` Section F copy changes. Until then, AI is Planned and must not
    feature as current. MASTER §7.2, §8.5, §16.1.
11. ⚠️ **GATED (L-ENG-3)** on analytics instrumentation for the moat metric — until "reused
    components per estimate" is measured, the "compounds" claim stays framed as Live foundation +
    Planned surfacing (§3.3, §7.5). MASTER §14.4, §17 #8.

**Open decisions owned here (not blocking, but flagged):**

- The rendered text of the NotUs pill ("Not us" vs. "Not yet" vs. "Boundary") is a voice A/B for
  the owner (§3.4); all three are within §10/§15 and the **type value is `NotUs`** regardless.
- Whether the `<ClaimFilter>` is a toggle or tabs is a visual/UX decision — deferred to
  `03`/`11`.
- Whether `/trust` Section E (data residency / cross-border) ships at launch or waits for DPA
  safeguards — resolved mechanically: it is a build-time conditional on `DATA_RESIDENCY_PUBLIC`
  (§6.5), so it compiles in only when the DPA gate (Gated #4) closes.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.**
Every public-word implication is grounded in MASTER §X.Y citations; pricing framing stays
hypothesis-labeled per §9.3 (no locked price). Rate-limiting is Postgres (`rate_limit` table),
NOT Redis (project position). Turnstile is NOT yet built (planned); `/contact` + `/signup` abuse
= honeypot + Postgres rate-limit + validation; CAPTCHA escalation-only.
