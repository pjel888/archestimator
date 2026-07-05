# 08 — Product Definition and Features

**Source authority:** `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` v4.3 §0 (canon on one page), §3 (cost intelligence layer), §6.2 (AEC role map), §7.2 (feature status), §8 (architecture), `claims-data.ts` (Live/Building/Planned/NotUs).
**Purpose:** The product, nailed down. The features, listed. The sell, structured. This is the one doc a future implementation agent, marketer, or salesperson can use as ground truth for "what Archestimator is".

---

## 1. What Archestimator IS — in one breath

**Archestimator is a construction cost estimating and proposal workspace for AEC teams.**

It is one connected workflow:

```
Estimate tree  →  Reusable cost library  →  Client-ready proposal  →  Comments / revisions / approvals  →  Recorded decision history
```

Today, AEC teams run this workflow in spreadsheets, email, and PDF. Every step loses context. Every project starts from a copied sheet. Every revision overwrites why the number changed. Every approval lives in an inbox. The intelligence inside the work dies on file close.

Archestimator turns that workflow into one workspace where the intelligence compounds.

---

## 2. What Archestimator IS NOT

| What it is NOT | Why we say so |
|---|---|
| Not enterprise estimating software (Procore, DESTINI Estimator, Ediphi, InEight Estimate) | Those tools serve US enterprise GCs, are enterprise-priced, take weeks to set up, and stop at estimating/bidding. Archestimator is built for the spreadsheet-bound SEA team and extends past estimating into proposal-to-approval. |
| Not procurement, ERP, or payment execution | Archestimator captures commercial decisions; it does not execute payments, POs, or warehouse management. |
| Not an aggregator / not a database of other people's estimates | `MASTER §3.3`: the cost intelligence layer is **yours**, built from **your** work. We do not ingest external data or pool customer estimates. |
| Not AI-generated pricing | `MASTER §8.4`: deterministic arithmetic. No probabilistic ranges. No takeoff. The numbers come from your library and your inputs. |
| Not a BIM or drawing-ingestion tool | No BIM, no CAD, no drawing takeoff today. English UI only, no localization yet. (Boundary line — recorded on `/trust`.) |
| Not a takeoff tool | Quantities come from the user, not from auto-counting on drawings. |
| Not a project-management tool | Archestimator tracks decisions on estimates and proposals; it is not a Gantt / RACI / critical-path tool. |

These boundary lines are part of the brand (`MASTER §15`, claims discipline). They are honest. They stop being conversion-surface leads (`06` §3).

---

## 3. The Live feature matrix (what ships today)

This is the authoritative list of what a buyer can do in Archestimator today. Each row maps to a row in `claims-data.ts` (Live group) and to a screenshot in the rebuilt FeatureChapters (`07` §4.6).

| # | Feature | What it does | The proof (screenshot) |
|---|---|---|---|
| L1 | **Hierarchical estimate tree** | Group → Area → row items, with drag-and-drop reorder, inline editing, and optimistic local-state mutations. Organize by phase, location, room, package, trade, scope, or any hierarchy that matches how the work will be built. | Estimate tree in `/workshop/projects/[id]/estimates/[nodeId]` |
| L2 | **Reusable cost component library** | Components, brands, suppliers, variants, pricing, images, attachments, and misc_cost entries. Each component carries its source note, pricing date, and supplier context. | Library dock in `/workshop/library` |
| L3 | **Drag-and-drop library insertion** | Pull components and templates into the estimate sheet instead of rebuilding line items by hand. Each insert carries the source component's context (linked / overridden / detached / source-changed state). | Estimate tree right-dock library mode |
| L4 | **Inline sheet editing** | Optimistic, UUID-safe rows. Quantity, unit, rate, source — all editable inline. Totals roll up live as the sheet changes. | Estimate sheet |
| L5 | **Estimate templates** | Save estimate structures as templates; reuse across projects. | Templates panel |
| L6 | **Activity + Node Activity + row Version History** | What changed, when, why. Every comment, every line change, every version, every decision — searchable, attributable, recoverable. | Activity panel |
| L7 | **D3 project comparison charts** | Donut + bubble charts grouped by space, category, or supplier. SVG ≥11px text floor with a data-table alternative for zoom/accessibility. | Project charts route |
| L8 | **Project publication with shared links** | Generate a hashed-token shared link with optional password protection. Comments, decisions, and revision requests live on the link. Open-event tracking on the publication. | Publication viewer at `/share/[token]` |
| L9 | **Collaboration invites with roles + realtime cursors** | Email invite, role-based access, realtime cursor positions broadcast via Cloudflare Durable Objects. | Estimate sheet collaboration mode |
| L10 | **Excel .xlsx proposal export** | One click to a clean BOM/BOQ workbook via ExcelJS. Working document, not an immutable issued record (boundary line). | Export menu in the estimate sheet |
| L11 | **Private by design** | Your data is yours, never pooled or anonymized across customers. We do not run cross-customer benchmarks. Built on Cloudflare Workers, D1, R2, Durable Objects, Better Auth. | R10 competitive wedge |

**Live total: 11 capabilities.** Each is tagged Live in the Claims Ledger. Each is safe to claim as current.

---

## 4. The Building list (partial today, improving)

| # | Capability | Status |
|---|---|---|
| B1 | Activity rollups + action taxonomy | Improving |
| B2 | Proposal export policy — preview and download exist; an issued, immutable snapshot is an open decision | Building |

**Building total: 2 capabilities.** Phrased as in-progress, never as fully shipped.

---

## 5. The Planned list (on the roadmap, not yet shipped)

| # | Capability | Why it's on the roadmap |
|---|---|---|
| P1 | Surfacing accumulated history by client, project type, and supplier | `MASTER §3.3` honesty anchor — the payoff the cost-intelligence-layer hook commits to. Currently the foundation (Live library + Activity history) compounds; making the patterns easily surfaceable is the near-term roadmap commitment. |
| P2 | Proposal snapshots / issued exports (policy gate first) | The immutable-issued-record decision is open. Once policy closes, the technical work follows. |
| P3 | Archiving and trash (paid-tier capability) | A paid-tier capability. |
| P4 | Proposal open-tracking (tiered) | The sender sees when a client opens the shared link. |
| P5 | Onboarding and first-run flow with demo-data/reset rules | The current first-run is minimal. |
| P6 | Supplier catalog → quote requests → product comparison → procurement bridge | The long-term layer (`MASTER §4.4 #3`). This is where the "underserved / unclaimed" position survives. |
| P7 | Client-side proposal record / archive | The two-sided client record (`MASTER §9.1`). |
| P8 | AI Copilot "Ask Flip" | `MASTER §8.5`: deferred to roadmap. Ask-only at Pro and up, with a visible privacy note. Will not write, edit, or estimate for the user. |

**Planned total: 8 items.** On the roadmap, never phrased as current.

---

## 6. The competitive wedge (the four defensible differentiators)

From `MASTER §2` (the competitive reality research):

| # | Wedge | Why it's defensible |
|---|---|---|
| W1 | **Fit, reach, price.** Built for the spreadsheet-bound SEA SMB and supplier segment enterprise tools ignore. | Every enterprise competitor (InEight, Ediphi, DESTINI, Zebel, RSMeans, ConWize) is US-centric, enterprise-priced, complex, and estimating-only. None serve the quote-heavy SEA SMB. |
| W2 | **Proposal to approval + the two-sided client record.** | Most competitors stop at estimating/bidding. The shared proposal, comments, decisions, and a persistent client-side record are less commoditized. |
| W3 | **The supplier-linked bridge.** Estimate → supplier catalog → quote request → procurement. | The one part nobody has built. This is where the "underserved / unclaimed" claim honestly survives, and it is the infrastructure thesis. |
| W4 | **Private by design.** Your data is yours, never pooled. | The deliberate opposite of anonymized cross-customer benchmarking. A clean privacy story, stated without overclaiming compliance badges. |

**These are the four wedges.** Every homepage section, every feature chapter, every FAQ answer should ladder to at least one.

---

## 7. The product by persona (the 7-role AEC map from `MASTER §6.2`)

| Persona | What they do in Archestimator | The directed message |
|---|---|---|
| **Architect** | Scope by area, phase, package, finish option. Build estimate trees that mirror design intent. Keep finish options, exclusions, and client decisions attached from first concept to final approval. | "Your design intent, fully costed. From first concept to client sign-off, every finish option and every exclusion stays attached." |
| **Engineer** | Discipline-specific assemblies (structural, MEP, sanitary). Variant costing, supplier context, labor logic move with the assembly. | "Build reusable assemblies per discipline. Variant costing, supplier context, and labor logic move with the assembly." |
| **General contractor** | Phases, locations, trades, bid packages, allowances. Preserve the assumptions behind the total. | "Organize costs across phases, locations, trades, bid packages, and allowances. Preserve the assumptions behind the total." |
| **Specialty / fit-out contractor** | Reusable assemblies, supplier variants, labor logic. Scope packages that move into future estimates. | "Build reusable assemblies, variants, supplier references, labor logic, and scope packages that move into future estimates." |
| **Cost estimator / QS** | BOQ structure, unit-rate discipline, source notes. Every rate keeps its source; every quantity keeps its assumption. | "Structure BOQ-grade estimates with unit-rate discipline. Every rate keeps its source note, every quantity keeps its assumption." |
| **Interior designer** | Rooms, finishes, options, client decisions. From first estimate through final approval. | "Keep rooms, finishes, options, exclusions, and client decisions connected from the first estimate through final approval." |
| **Project manager** | Approved proposals, change orders, decision trail. Walk into every pricing conversation with the full record. | "Walk into every pricing conversation with the full record: what was proposed, what changed, what was approved, when, and by whom." |

**Total: 7 personas.** Each gets a directed message in the Specialties section (Phase 2C expansion, `06` §4.8).

---

## 8. The pricing shape (without the numbers)

`MASTER §9` controls pricing. The plan does not propose numbers. The plan does propose how to **talk** about pricing on the public surface.

| Element | What we say publicly |
|---|---|
| Model | Freemium. Seat-based. Priced in pesos. Never metered on estimating, exports, or BOQ lines. |
| Why freemium | The compounding cost library is the lock-in, so we let you build it free and charge to share, collaborate, and scale. |
| Why never metered | Metering the core behavior (estimating, exports, BOQ lines) would tax the exact behavior that builds the moat. |
| Tier shape | Free → Solo → Pro → Team. Plus an Education tier and a future Owner/Portfolio tier for the client side. |
| Solo tier anchor | The cement-anchor metaphor: "A tool that compounds on every estimate should cost less, per month, than a material you pour once." (`MASTER §9.3`) |
| Numbers | Pre-publication hypothesis. Numbers come when discovery closes. Stated as "we are still validating price" only on a small lower-page section, not as the lead. |

**The reframe (OPEN-DEC-002):** The /pricing page leads with the model shape and the cement anchor. The validation framing moves to a smaller "How we set the price" section. The page stops destroying its own legitimacy in the first screen.

---

## 9. The business model

`MASTER §0` and §9.1:

- **Today:** Proposer-side SaaS wedge. Architects, engineers, contractors, estimators, fit-out firms, interior designers, and suppliers pay for estimate creation, reusable components, proposal sharing, comments, approvals, and version/Activity history.
- **Future layer 1:** Client-side proposal-record subscriptions.
- **Future layer 2:** Enterprise portfolio plans.
- **Future layer 3:** Supplier catalogs and quote-request fees; transaction-linked revenue.

The landing page sells the today layer. The future layers inform the investor frame but stay off the public surface.

---

## 10. The technical stack (the proof substance)

| Layer | What | Why it's a trust signal |
|---|---|---|
| Framework | Next.js 16 (App Router, RSC) | Modern, performant, edge-deployable |
| UI | React 19 | Current |
| Runtime | Bun | Fast, modern |
| Language | TypeScript (strict) | Type-safe, maintainable |
| Styling | Tailwind CSS v4 | Modern utility-first |
| Deploy | OpenNext for Cloudflare Workers | Edge-native, fast cold-start, pay-per-use |
| Database | Cloudflare D1 (SQLite, 29 migrations) | ACID, SQL, regional |
| Storage | Cloudflare R2 | S3-compatible object storage |
| Realtime | Cloudflare Durable Objects (SQLite-backed) | Collaboration-grade presence + cursors |
| Background jobs | Cloudflare Queues + Cron | Async upload scan, lifecycle, cleanup |
| Auth | Better Auth 1.6.22 (Google OAuth + magic link, D1-backed) | Modern session management |
| Email | Cloudflare Email Service | Transactional email |
| Images | Cloudflare Images | Optimized delivery |
| State | TanStack Query 5, Zustand 5 | Best-in-class client state |
| Charts | D3 7 | Industry standard |
| Tree UI | React Complex Tree 2 | Purpose-built tree editor |
| Testing | Bun test, Vitest + jsdom, Playwright E2E (115 test files) | Modern coverage |

**The footer line for the rebuilt footer (`06` §4.12):**

> "Private by design. Built on Cloudflare Workers, D1, R2, and Better Auth. Your data is yours, never pooled or anonymized across customers."

---

## 11. The canonical brand strings (`MASTER §0`)

These appear **nowhere** on the current public surface (`03` §4.1). The plan surfaces them:

| String | Where it surfaces |
|---|---|
| "From cost proposal to client approval." (campaign tagline) | Homepage final CTA body; footer copyright line; meta description on `/` |
| "You never start from zero again. Your numbers hold up." (brand promise) | Homepage hero below-CTA line; OR proof section closer |
| "Your cost intelligence layer." (canonical hook) | Homepage problem-section closer; OR workflow section eyebrow |
| "Construction cost estimating and proposal workspace for AEC teams." (plain anchor) | Homepage hero eyebrow; OR meta description |
| "The compounding cost intelligence enterprise estimators have had for years, finally built for the AEC teams who still run on spreadsheets." (UVP) | /about mission section; OR sales-call leave-behind (not for landing hero) |

---

## 12. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1-2 What it IS / IS NOT | `07_LANDING_PAGE_SECTIONS.md` hero subhead + /features page framing |
| §3 Live matrix (L1-L11) | `07` §4.6 FeatureChapters screenshots + `12` Test Execution Matrix |
| §4-5 Building/Planned | `claims-data.ts` reorganization in Phase 3B |
| §6 Competitive wedge | `10_COMPETITIVE_AND_MARKET_POSITIONING.md` + `07` comparison section |
| §7 Persona map (7 roles) | `07` §4.8 Specialties section + `19_COPY_DEPLOYABLE_PACK.md` directed messages |
| §8 Pricing shape | `07` §4.13 /pricing page reframe |
| §9 Business model | `10` investor-frame positioning |
| §10 Technical stack | `07` §4.9 ProofSection + `06` §4.12 footer compliance line |
| §11 Canonical brand strings | `19_COPY_DEPLOYABLE_PACK.md` ready-to-paste strings |
