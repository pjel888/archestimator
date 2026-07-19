# 00 — Executive Verdict

Audit commit `a41a07d01` · 2026-07-18 · READ-ONLY startup readiness audit.

## 1. Readiness table

| Stage | Verdict | Confidence | Primary blockers |
|---|---|---|---|
| **A — Controlled Design-Partner MVP** (5–8 invited users, founder-led) | **CONDITIONAL GO** — fix G-01 (lead capture) + G-04 (product telemetry, narrow) + G-03 (mount activation UI / pick the guided-sample path as default first session) before approaching partner #1. ~3–5 days. | CONFIRMED | Lead-capture pipeline is a dead `mailto:` with no D1 store; no product-event telemetry; activation UI unmounted; spreadsheet import absent. Trust core (auth, share-token, totals oracle) is built and proven-in-source. |
| **B — Learning-Complete Beta** (repeated real estimates, measurable activation & week-N retention) | **CONDITIONAL GO** — Stage A items plus G-05 (single founder dashboard), G-07 (close feedback→decision loop), G-08 (week-N retention metric). Manual founder operation is acceptable; productization is not required. | STRONG_INFERENCE | No week-N retention metric exists (only data-TTL "retention"); feedback→decision loop closes in D1 but is not synthesized; founder dashboard is scattered across exactly 21 admin pages (`find src/app/admin -name page.tsx \| wc -l`). |
| **C — Paid MVP** (first paying users, defensible paid boundary, manual invoicing OK) | **NO-GO until WTP evidence** — pricing hypothesis is healthy; the missing input is *evidence* (5+ problem interviews, Van Westendorp, ≥2 active users naming a budget). Billing code correctly absent; manual invoicing helper is the right Stage C path. | STRONG_INFERENCE | No billing (correct); no entitlement concept; no manual-invoice helper; no immutable proposal snapshot on legacy shared-link path (Client Portal has it but XLSX export does not); VAT/invoice/accounting needs owner decision. |
| **D — Public Self-Service** (open signup, automated billing, abuse prevention, scalable support) | **DEFER** — out of immediate scope; one architectural dead-end to avoid is noted (the orphaned `POST /contact` form and unauthenticated webhook trust). | HYPOTHESIS | Self-serve signup route gated behind `L-FUN-2`; no abuse prevention beyond per-IP rate limits; legal pages need full counsel review + complete subprocessor list (Google omitted); no backups/PITR config; no external uptime monitor. |

**The immediate audit priority (per master prompt §6) is Stages A and B.** Stage C is mapped. Stage D is scoped only enough to avoid dead-end architecture.

## 2. Recommended beachhead ICP

**Primary beachhead: the independent/freelance cost estimator or quantity surveyor in the Philippines** who runs 4–15 estimates per quarter for small-to-mid contractors, architects, or fit-out firms, and currently does this work in Excel.

**Why this segment wins on every lens** (full scoring in `01-CAPABILITY-AND-GAP-AUDIT.md` §A):

- **Pain severity:** highest. Excel estimating means re-keying supplier prices every bid, no reuse, no audit trail, version drift across revisions. The product promise "you never start from zero again" maps directly onto their weekly pain.
- **Frequency:** weekly to multiple-times-weekly. This is a *retention-positive* segment, not a once-a-quarter event.
- **Tool dissatisfaction:** extreme. Excel is the default not by preference but by absence of affordable PH-native alternatives.
- **Ease of founder access:** solo operators are reachable on LinkedIn, in PH construction groups, and through direct referral; their signup friction is the lowest of any AEC segment.
- **Onboarding complexity:** lowest. A solo estimator needs one workspace, one project, one estimate — not multi-seat onboarding.
- **Library/template reuse value:** highest. This segment bids repeatedly and benefits most from a reusable, price-tracked component library.
- **Willingness to pay:** moderate-to-good *if* it saves measurable hours per bid. Solo operators pay out of pocket and are price-sensitive (favor peso-pricing, founding-member rate), but they have authority to buy.
- **Sales-cycle length:** shortest. The decision maker is the user.
- **Support burden:** lowest of any segment (one person, no IT gatekeeper).

**Secondary segment: the solo architect or small (1–3 person) architectural practice** that produces estimates as part of design proposals. Same reuse thesis, slightly lower frequency.

**Segments to exclude from the first beta cohort:**

- **Material suppliers / brands.** Wrong side of the marketplace until the buyer side has density.
- **Engineering consultancies and mid+ contractor firms.** Multi-seat, procurement-gated, slow sales cycles — they will consume disproportionate support and pull the roadmap toward enterprise ceremony before the thesis is validated.
- **Pure interior-design practices.** Lower estimating rigor; their value moment is visualization, which Archestimator does not currently do well.

## 3. Core job-to-be-done

> "When a client asks me to bid on a fit-out or small build, help me turn my
> hard-won supplier prices, quantities, and scope into a credible,
> BOQ-formatted, peso-denominated proposal in a fraction of the time it takes
> me in Excel — and let me reuse everything I just figured out the next time a
> similar job comes in."

## 4. Core value proposition (one sentence)

> "Estimate faster, never re-price the same material twice, and hand a client a
> BOQ they can actually read — without leaving your spreadsheet behind."

## 5. Core value loop

```
capture/import reusable costs (library)
  → build estimate (tree + rows + totals oracle)
  → see trustworthy total (PHP, VAT-correct, formula-auditable)
  → export BOQ XLSX / share secure client link
  → receive client comment or decision
  → revise → reuse library/template knowledge in next estimate
```

Loop citation: library insert (`use-estimate-row-handlers.ts:786-906`), totals oracle (`src/lib/estimates/estimate-row-total.ts`), BOQ export (`create-proposal-workbook.ts:321` "BID FORM / BILL OF QUANTITIES"), shared link + decisions (`src/app/share/[token]/page.tsx`, `decision/route.ts:193`), template reuse (`migrations/0092_linked_estimate_template_instances.sql`, `template-instance-actions.ts:352`).

**True value moment:** the first time the user reuses a previously-priced component in a new estimate and saves measurable re-keying. That is the moment the "never start from zero" thesis becomes true for them.

## 6. Activation event

**Primary: `first_valid_total`** — the moment a user inserts a priced row that produces a non-zero estimate total. Source: `src/lib/estimates/d1-intents/rows.ts:2015-2033` writes the activation outbox intent when this fires; `first_value_completed_at` is stamped on the progress row (`activation-repository.ts:186`).

**Secondary activation target (week-1): `export_completed` OR `publication_created`** — the user has handed something to a client.

## 7. Likely retention event

**Week-1 retention proxy: a second estimate is created in workspace within 7 days of the first.** Today this is not measured (no week-N retention metric — see G-08).

**Stronger retention signal (week-4): library or template reuse** — `source_library_item_id` linkage on a row in a *new* estimate that was originally priced in an *earlier* estimate. The schema supports this (`estimate_row_items.source_library_item_id`, `pricing_provenance_origin`) but no metric computes it.

## 8. North-star metric

**Weekly active estimating workspaces that produced or revised at least one estimate in the last 7 days.**

This is preferable to "logins" (master prompt §10.E forbids equating login with retention) and preferable to "estimates created" (which over-weights new bids and under-weights revisions, which is where the reuse value lives). It is computable from `estimate_row_items` writes and the `beta_activation_events` ledger, and it maps directly to the core loop.

**Supporting metric set** in `03-EXPERIMENTS-METRICS-AND-OPERATING-PLAN.md`.

## 9. Ten highest-leverage gaps (ranked)

Full evidence in `01-CAPABILITY-AND-GAP-AUDIT.md` §M and `02-PRIORITIZED-MVP-BACKLOG.md`.

| # | Gap | Priority lane | Confidence | Effort |
|---|---|---|---|---|
| 1 | **G-01** No lead capture: every public CTA terminates in `mailto:`; `ClosedBetaGate` `POST /contact` has no handler; no D1 table for leads/access-requests/beta-requests | MVP-BLOCKER | CONFIRMED | S |
| 2 | **G-04** No first-party product-event emitter; GA4 is mounted for landing pageviews/A-B variant events but no activation-funnel or attribution events are emitted; activation ledger covers in-product milestones only | MVP-BLOCKER (narrow scope) | CONFIRMED | S–M |
| 3 | **G-02** No spreadsheet import — every library row is hand-keyed via one modal; this is the largest adoption blocker | MVP-EXPERIENCE-P1 | CONFIRMED | M |
| 4 | **G-03** Onboarding/activation UI is built but unmounted: `/workshop/onboarding` and `/workshop/getting-started` are 5-line redirect stubs; `FirstEstimateChecklist` has no production consumer; milestone `health_reviewed` declared but never emitted | MVP-EXPERIENCE-P1 | CONFIRMED | S |
| 5 | **G-05** No single founder dashboard; "Active teams" metric literally `"—"` with hint `"Repository lane pending"`; insight scattered across exactly 21 admin pages | MVP-LEARNING-P0 | CONFIRMED | M |
| 6 | **G-07** Feedback→decision loop closes in D1 but produces no in-app notification to the founder; comment/decision/invite events have no producer in the notification fan-out system (kinds are defined but never written) | MVP-LEARNING-P0 | CONFIRMED | S |
| 7 | **G-08** No week-N retention metric (only data-TTL "retention"); cohort stalled-state exists but no return-rate or reuse-rate computed | MVP-LEARNING-P0 | CONFIRMED | S |
| 8 | **G-10** No manual-invoicing helper or paid-entitlement boundary anywhere in code — correct for now, but means there is no defined path from "user names a budget" to "user is invoiced and entitlement is recorded" | PAID-MVP-P1 | CONFIRMED | M |
| 9 | **G-11** No backups / PITR / restore-proof referenced in `wrangler.jsonc`; D1 has Cloudflare-managed PITR but it is not configured, tested, or documented | MVP-BLOCKER (trust) | CONFIRMED | S (config) / M (proof) |
| 10 | **G-09** XLSX proposal export has placeholder-only Commercial Terms sheet ("To be confirmed") and no contractor/identity profile — the credibility of the artifact handed to a PH client is the activation-and-trust moment, and it is unfinished | MVP-EXPERIENCE-P1 | CONFIRMED | S |

## 10. Five most dangerous assumptions

1. **"Closed beta is invite-only, so the mailto-based access funnel is fine."** It is fine *as security*, not as a *learning system*. (G-01.)
2. **"The guided sample proves the product's value."** It proves the *engine* works. The blank path real users take is ~6 navigation hops with no in-product guidance; the activation UI to scaffold it is unmounted. (G-02, G-03.)
3. **"Pricing is a hypothesis we will validate."** Correct stance, but no instrument exists to validate it through. No WTP interview template, no pricing-conversation event, no manual-invoice path. (G-04, G-10.)
4. **"D1 is durable because Cloudflare manages it."** True for the platform, unproven for *this* project — no PITR configuration, no restore drill. The PITR default-state claim is `STRONG_INFERENCE` pending current-doc re-verification (RISK-001). (G-11.)
5. **"The Client Portal immutable-issues system satisfies the proposal credibility requirement."** The Client Portal has it; the legacy shared-link path the XLSX export actually feeds does not. (Lens J, deferred to Stage C.)

## 11. Five things NOT to build now

1. **Stripe / automated billing.** No WTP evidence yet. Master prompt §17 forbids it. The correct Stage C path is a manual-invoice helper that records entitlements in a `manual_invoices` table. (G-10.)
2. **A CRM.** A one-table D1 lead-capture with a flat admin list view is the right Stage A shape. Do not introduce HubSpot/Salesforce/Notion-as-CRM. (G-01.)
3. **PDF generation.** Not a beta blocker for the BOQ-formatted XLSX ICP. PH contractors and architects live in Excel. Defer until a paying client specifically asks, or until public self-service. (Master prompt §16 Q19.)
4. **Enterprise collaboration features / advanced admin depth.** The solo estimator beachhead does not need multi-seat roles, SSO, or audit-log export. The existing role system (`roles.ts`) and admin shell are already overbuilt for Stage A. (G-13, Lens L.)
5. **AI Ask / Package Builder exposure.** Both default OFF (`isAiRoutesEnabled()` / `isAskFlipUiEnabled()` at `src/lib/ai/feature-flags.ts:13,17`). Leave them off. AI is a distraction and a trust risk in a closed beta whose thesis is *cost accuracy*. The codebase improve audit's spike (`033-spike-ask-flip-copilot.md`) is the right disposition: investigate, do not ship.

## 12. The single recommended next action

> **Before approaching any design partner, ship a single bundled ~3–5-day spike that does three things at once:**
>
> 1. **Add a `beta_access_requests` D1 table + a working server action on `POST /contact` (or `/api/access-requests`) that captures name, email, persona, company, estimating volume, current tool, source CTA, and `status` (`new|qualified|invited|active|rejected`).** Rewire `ClosedBetaGate` and `ContactForm` to it. Keep the existing `closed_beta_allowed_emails` mechanism for the actual grant — the new table is the *funnel*, not the gate. (G-01)
> 2. **Wire a minimal product-event emitter (single `recordProductEvent(name, props)` helper writing to a new `product_events` D1 table) and emit ~8 events: `landing_cta_click`, `access_request_submitted`, `access_request_qualified`, `invite_accepted`, `project_created`, `first_valid_total` (mirror of existing activation), `export_completed`, `publication_created`.** No external SDK. The activation milestone ledger already captures most of this; the missing pieces are landing-side and lead-side. (G-04, narrow scope)
> 3. **Surface the existing activation cohort + the new lead funnel on `/admin` as a single "Beta health" card** replacing the `"Active teams — Repository lane pending"` placeholder. Reuse `listActivationCohort` (`activation-cohort-repository.ts`) and the new table. (G-05, partial)

**Why this move:** it removes the three blockers that make every later cohort harder to learn from (lead attribution, activation observability, founder dashboard) in the smallest possible scope, and it makes every other decision in this audit — pricing, ICP confirmation, retention — answerable with evidence instead of guesswork. It also creates the substrate on which the *real* next decision (whether to invest in import, in mobile, in client portal polish, or in pricing) can be made with data.

**What this move deliberately does NOT include:** import (G-02), onboarding UI mount (G-03), feedback→notification wiring (G-07), retention metric (G-08). Those follow in the order in `02-PRIORITIZED-MVP-BACKLOG.md` once the cohort is being recruited, because they are valuable only against real users.
