# 07 — Engineering Constraints & the Start-Free Funnel

> **PLANNING ONLY · 2026-06-21 · not code.**
> Status banner — this document is a plan-pack artifact. Nothing here is implemented;
> every "we will" is a recommendation to the owner and the implementation lane (Codex),
> gated on the open decisions listed at the bottom.

**One-line purpose.** Define the engineering contract for the landing system — an
RSC-first, statically-rendered marketing surface with near-zero client JS, a hard
responsive floor, a perf/a11y budget — and scope the **"Start free" funnel** plus its
co-dependency gates (onboarding, demo-data/reset, abuse guardrails, first-run flow) so
the primary CTA can actually take a visitor to a working Free tier.

---

## 0. What this doc owns vs. cross-links

This doc owns: rendering architecture, responsive + perf + a11y budgets for the landing
routes, the funnel mechanics + activation metric + analytics events, and the explicit
Go/No-Go co-dependencies the "Start free" CTA leans on.

It does **not** own (cross-link instead):
- Visual tokens, the serif/sans/mono type pairing, motion, the deferred-glass arm pattern,
  paper/hairline/ink colour values → **`03-VISUAL-LANGUAGE-AND-TOKENS.md`**.
- The commercial-graph SVG plate's content (nodes, claims tags) and its collapse/stack
  behavior at the *content* level → **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`**;
  this doc owns only the *rendering* contract for that plate (§2.3 below).
- Copy lines and the section taxonomy / DOM order → **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`**
  and **`05-COPY-SKELETON.md`**.
- Routes scope (the `/`, `/features`, `/pricing`, `/about`, `/contact`, `/trust` set) and
  rollout (preview route under the existing `/newdesign` + `/design-sync` convention,
  A/B old-vs-new, claims sign-off gate) → **`00-OVERVIEW.md`** and **`08-ROLLOUT-AND-ANALYTICS.md`**.
- The claims-discipline sign-off itself (Live/Building/Planned ledger) → **`05-COPY-SKELETON.md`**
  section 7 ("What is real today"); this doc only requires that a signed-off ledger object
  exists before public render (§3.2).
- The launch loop, evidence registration, and owner-decision queue → **`LOOP_LEDGER.md`**.

The canonical DESIGN BRIEF (header of this plan pack) and **`MASTER.md` §15** govern every
public word suggested below.

---

## 1. Rendering architecture: RSC-first, mirror the workshop-dashboard pattern

### 1.1 The pattern to copy (proven in repo)

The workshop dashboard was already moved to RSC with zero visual change (see MEMORY:
*Workshop dashboard RSC*). The landing system mirrors that exact pattern:

- **`src/app/page.tsx`** (and each route: `/features`, `/pricing`, `/about`, `/contact`,
  `/trust`) is a **Server Component**. It does not carry `"use client"`. It renders the
  page's static marketing content as a server-rendered tree and passes that tree as
  `children` to a thin client shell.
- A **`LandingShellClient`** (or per-route equivalent) is the `"use client"` boundary.
  It takes the server content as `children: ReactNode` and is responsible only for the
  things that genuinely need the client: scroll-reveal orchestration, the architecture-plate
  hover/claims interaction, analytics boot, and (where used) A/B bucket assignment.
- Only the **interactive leaves** hydrate. Each leaf is its own small `"use client"`
  component, so the rest of the page ships no client JS. This is the workshop-dashboard
  discipline: `WorkshopDashboard.tsx` is a Server Component; `WorkshopHomebaseClient.tsx`
  is the client shell; only the ~5 interactive leaves hydrate.

Reference files (read-only; do not modify during planning):
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/dashboard/WorkshopDashboard.tsx`
  (RSC — no `"use client"`).
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/WorkshopHomebaseClient.tsx`
  (`"use client"`; accepts `children: ReactNode`).

### 1.2 What is static, what hydrates

**Static (server-rendered, no JS):** the entire editorial body — Header (N1b masthead),
Hero (§11.1), The Problem, The Layer prose, What-you-get (§11.2), How-it-works (§7.3
5-step), Who-it-is-for (§11.3), the claims ledger **list** itself (server-rendered from a
signed-off data object — see §3.2), Why-not-a-spreadsheet (§11.4), the founder/company
section (§11.5), Pricing-honestly (§9.3 philosophy), Final CTA, Footer sitemap. All paper,
all serif, all server HTML.

**Hydrating leaves (the only client JS on the page):**
1. **Architecture-plate interaction** — hover/focus reveal of the claims tag on each node
   of the commercial-graph SVG (doc 04). The plate itself renders as static SVG
   server-side; only the interaction handler is a client leaf.
2. **Claims-ledger interactivity** — if section 7 exposes a Live/Building/Planned filter
   or expand, that control is a client leaf over a server-rendered list. If the ledger is
   rendered as a static table (no filter), this leaf is absent and the section is pure HTML.
3. **Scroll-reveal orchestration** — the restrained fades (doc 03). Prefer a single tiny
   IntersectionObserver driver mounted once in the shell; leaves opt in via `data-reveal`.
   Respect `prefers-reduced-motion` (§4.4).
4. **Analytics boot + A/B assignment** — only if the owner selects an analytics tool
   (⚠️ NEEDS INPUT §17 #8) and an A/B provider for the rollout (doc 08). Until then, absent.
5. **Cookie/consent + Clarity script loaders** — the repo already ships
   `LandingAnalyticsLoader.tsx`, `CookieConsentBanner.tsx`, `ClarityScript.tsx`,
   `ABExperimentProvider.tsx`; reuse the existing loaders rather than re-adding. Audit them
   for the removals rail (§5) — none carry banned copy, but confirm during implementation.

**Target:** the marketing routes ship close to zero client JS for the editorial reading
experience; the few hydrating leaves are individually small and code-split.

### 1.3 Static generation

All six routes are statically generatable (no per-request data, no auth-gated content on
the marketing surface). Configure them for static generation (`generateStaticParams` where
applicable; otherwise SSG by default for content-only pages). The only dynamic surface the
landing touches is the hosted Supabase call path inside the **app** after signup — the
landing itself never calls Supabase. This keeps the landing's hero path from inheriting the
network-bound hero-path latency documented for the hosted-Supabase app (MEMORY:
*Hero-path perf is network-bound*); the landing hero is a text headline, not a DB call.

---

## 2. Responsive contract — Hallmark 320/375/414/768 hard floor

### 2.1 Breakpoints and hard floor

The landing **must** render correctly at **320 / 375 / 414 / 768 px** viewport widths, and
at every width in between. 320px is the hard floor: no horizontal scroll, no clipped
content, no overlapping the redline accent. This is the Hallmark responsive floor; treat
it as a gate, not a best-effort.

Existing repo breakpoints and the responsive-collapse pattern established for the workshop
dashboard bento (MEMORY: *Workshop dashboard responsive*) are the reference: the dashboard
went 7-col → 2-up → 1-col. The landing follows the same discipline — editorial column at
desktop, narrower measure at tablet, single column at phone — but the landing's column is
**prose-optimized for serif readability**, not a bento grid.

### 2.2 Overflow handling

- `overflow-x: clip` (not `hidden`) on `html` and `body`. `hidden` breaks sticky positioning
  and scroll anchoring in some engines; `clip` does not. This prevents the architecture-plate
  SVG or any wide editorial figure from inducing a horizontal scrollbar at narrow widths.
- The architecture plate and any wide figure must additionally be wrapped in a container
  whose own `overflow-x` is bounded, so the clip on `body` is a backstop, not the primary
  defense.

### 2.3 Architecture-plate collapse

The commercial-graph plate (doc 04) renders as a horizontal architecture diagram at desktop.
At tablet and phone widths it **collapses to a vertical stack** of the named nodes, each
with its claims tag visible inline (rather than on hover), so a phone reader sees the same
information without interaction. The collapse is a CSS layout concern (doc 04 owns the
content/layout of the collapse); this doc owns the rendering contract: the SVG must be
authorable as a vertical stack without re-authoring per breakpoint — prefer a node-list
data structure rendered once, with a layout switch, rather than two hand-maintained
SVGs. The phone-stack view must not require hover to reveal any claim.

### 2.4 Touch

All interactive leaves must work with touch (no hover-only discovery). The architecture
plate's hover-reveal claims tag must have a `:focus` / tap equivalent, and on touch
devices the claims tags are best shown inline (collapse behavior, §2.3) rather than gated
behind a tap that a phone reader might not attempt.

---

## 3. Performance budget & Core Web Vitals targets

### 3.1 LCP strategy — text headline, not a hero image

LCP element is the **Hero headline** (§11.1, the cost-intelligence-layer line), which is
server-rendered serif text. No hero image. The 2.3MB frosted-construction hero PNG and the
construction-photo slideshow are on the removals rail (§5) and must not be replaced by
another heavy image; the credibility move is craft + honesty, not photography (BRIEF; §12.9
"documents you would trust, not dashboards that perform").

This makes the hero path a text-rendering problem, not an asset-download problem, and keeps
it independent of the hosted-Supabase RTT that bounds the in-app hero (MEMORY:
*Hero-path perf is network-bound*). The landing is static; measure LCP on a cold cache on
the deploy target (Vercel), not against local dev hitting hosted Supabase.

### 3.2 Targets (landing marketing routes)

| Metric | Target | Notes |
|---|---|---|
| LCP | < 2.0s on cold cache, fast 4G, Moto G-class | Text headline; achievable for static HTML. |
| CLS | < 0.05 | Reserve space for the architecture plate and any figure; no late-loading fonts causing reflow (§3.3). |
| INP | < 200ms | Near-zero JS; the few leaves are tiny. Scroll-reveal must not jank. |
| JS shipped (initial, marketing routes) | As close to 0 as feasible; only the hydrating leaves in §1.2 | RSC-first; no client framework for the editorial body. |
| Font payload | Source Serif 4 subset (latin + peso sign ₱ + the glyphs in the copy), SF Pro already system-available, Roboto Mono already in repo | Self-host or use `next/font` with `display: swap` and preloaded; see §3.3. |

These are the Core Web Vitals targets to validate against on Vercel in-region (the BRIEF's
"Core Web Vitals targets" line). ⚠️ NEEDS INPUT: an explicit performance-targets decision
(MASTER §17 #16 asks for "Performance targets + admin controls; public API decision") — the
targets above are a planning recommendation; ratify before treating as a gate.

### 3.3 Fonts — no layout shift, peso-sign safe

- **Source Serif 4** (display + body prose, per doc 03) is the load-bearing addition. It is
  **not yet in the repo** (verified: no `source-serif` / `SourceSerif` reference in
  `src/app` or `next.config`). Load via `next/font/google` (or self-hosted) with
  `display: swap`, `preload`, and `adjustFontFallback` to neutralise CLS. Subset to latin
  **plus the peso sign ₱ (U+20B1)** and any non-latin glyphs in the signed-off copy — peso
  matters because pricing-philosophy copy and the cement-anchor concept both use ₱ (§9.2,
  §12.11). Confirm the subset includes ₱ before ship; a missing-glyph fallback for ₱ would
  undermine the pricing section.
- **SF Pro** is already system-available (token `--font-sf-pro` exists in `globals.css`); no
  payload for UI chrome/labels/buttons.
- **Roboto Mono** is already in the repo for numbers/data; reuse, do not re-add.
- Match the existing additive-tokens rule (doc 03): add the new tokens to `globals.css`,
  do **not** clobber existing directives. The `--proposal-paper: #fffdf8` token already
  exists in `globals.css` (verified) — reuse it; do not re-declare.

### 3.4 Images

Any image used (none required by the BRIEF's hero strategy; the founder section §11.5 is
gated on founder-bio assets — see §6) goes through `next/image` with explicit `width` /
`height` (CLS = 0) and is lazy-loaded below the fold. No construction-photo slideshow; no
auto-playing carousel of any kind.

---

## 4. Accessibility contract

### 4.1 Contrast — no #7F7F7F load-bearing text

`--tertiary: #7f7f7f` is already in `globals.css` but is **sanctioned by DESIGN.md yet fails
WCAG AA** (MEMORY: *DESIGN.md tertiary fails AA*; the BRIEF locks `--secondary: #5D5D5D` for
load-bearing meta). For the landing: **no load-bearing text uses #7F7F7F**. Body ink
`#292929`, secondary `#5D5D5D`, hairlines tinted near `#ECE7DC` (doc 03). The accent-as-
redline (`#F24405` signal) is used as an annotation mark, sparingly (accent discipline,
doc 03); when it appears on small text-on-light it must use the `--brand-orange-dark`
(`#C63804`, ~5.3:1 on white) variant already defined in `globals.css` — never raw `#F24405`
on small light text (it sits at ~3.75:1, below AA 4.5:1).

### 4.2 Focus — instant `:focus-visible` ring

Every interactive element (links, the two CTAs, the architecture-plate nodes, any claims
filter, the menu) has an instant `:focus-visible` ring. Use the existing focus-ring pattern
from the repo (`--brand-orange` ring). Keyboard-only users must be able to reach and operate
every CTA and every plate node without a pointer. The architecture-plate nodes are keyboard-
focusable and the claims tag is revealed on focus (not only on hover).

### 4.3 Semantics and structure

Semantic HTML throughout: real headings (the serif is the signal, but the heading hierarchy
must be real, not visual-only), `header` / `main` / `section` / `footer` landmarks, lists
where the content is a list (the 5-step workflow, the Live/Building/Planned ledger). The
footer is a document-styled sitemap (not a logo-only block — removals rail §5). The two CTAs
("Start free", "Book a walkthrough") are real links to real destinations (§5.1).

### 4.4 Motion — `prefers-reduced-motion` respected

Scroll-reveal fades are the only motion (doc 03), plus the repo's existing deferred-glass
arm pattern if any glass surface is used on the landing (the BRIEF scopes glass to the
workshop; the landing is "The Document" — paper, not glass — so glass is likely absent on
the marketing surface; confirm during implementation). All motion respects
`prefers-reduced-motion`: under reduced-motion, reveals appear instantly with no fade, and
no animation runs. No parallax, no auto-scroll, no carousel (§3.4).

### 4.5 Readability

Serif body prose sized for comfortable reading on phone (the serif is body prose per doc 03,
not only display). Measure (line length) capped for readability at desktop; collapses to
single column at phone. The font-size floor obeys the repo's existing type scale.

---

## 5. Removals rail — Hallmark deletion gate

These exist in the current landing and must be removed (per the BRIEF's REMOVALS list and
§15/§16.4). Each is a deletion, owner-confirmed:

- **The 3 fabricated testimonials** (`TestimonialSection.tsx`, `company-proof-data.ts`) —
  §15 forbids invented testimonials; none exist yet and none may be invented (§12.8).
- **The hype hero copy** ("Start Winning / Win More Bids / Estimate with Precision. Win
  with Clarity") — §10.4/§16.4 BANNED family; replace with the cost-intelligence-layer
  hero (§11.1, owned by docs 02/05).
- **The construction-photo slideshow + the 2.3MB frosted-construction hero PNG** — §12.9
  ("dashboards that perform"); the new hero is text (§3.1).
- **The logo-only footer block** — replaced by a document-styled sitemap footer (doc 02,
  taxonomy Footer).
- **Audit `ProductPreviewVariants.tsx` and any re-drawn browser/IDE chrome** — Hallmark bans
  re-drawn fake chrome. If any landing component fakes a browser/IDE window, it is on this
  rail; confirm during implementation.

⚠️ GATED ON: explicit owner confirmation of each deletion (the BRIEF marks the REMOVALS as
"needs owner confirmation — Hallmark deletion rail"). The plan assumes confirmation; the
implementation lane does not delete until confirmed in `LOOP_LEDGER.md`.

---

## 6. The "Start free" funnel

### 6.1 The CTA destinations

Primary CTA **"Start free"** → self-serve Free-tier signup (§9.2). The repo currently has
`/auth` and `/login` routes but **no `/signup`** (verified). Decision for implementation:
"Start free" links to either a new `/signup` (or `/auth/signup`) route or to `/login` with
a signup affordance. ⚠️ GATED ON: the owner's auth-route decision; recommend a dedicated
`/signup` for funnel clarity so the marketing CTA lands the visitor directly on signup,
not on a login screen that asks them to find the signup link.

Secondary CTA **"Book a walkthrough"** → `/contact` (exists) with intent captured as a
walkthrough-request event (§7). The walkthrough is founder-led (§9.4 founder-led motion);
the form should capture role and current method to feed discovery (§9.3), not gate signup.

### 6.2 What the Free tier is (and is not), per §9.2

Free (Starter), ₱0: 1 user · ~2 active projects · build the component library · estimates,
inline editing, templates · marked `.xlsx` export · basic delete only (no trash or
archiving) · **no client sharing** · community support. The Free tier's job is to **seed
the library** — the lock-in — so a self-serve signup that reaches the activation metric
(§7) compounds. This is the funnel's purpose, restated in engineering terms: the landing's
"Start free" must deliver a visitor into a first-run path that gets them to **first reuse**
before friction sends them away.

### 6.3 Self-serve Free does NOT require validated pricing or billing

Make explicit (the BRIEF requires it): self-serve **Free-tier signup does not need the
validated pricing decision (§9.3) or the billing mechanism (§18.6)**. Pricing validation
gates **publishing a price**, not opening a free signup; billing gates **charging**, not
onboarding a free user. The Free tier is ₱0 with no payment instrument, so the entity/BIR
prerequisites for *charging* (§18.2, §18.6) do not block a free signup either — though the
**user-facing legal docs** (ToS, Privacy Policy, Acceptable Use, Refund/Cancellation) and
**Data Privacy Act** posture (DPO, PIA, breach plan) are still launch gates for **any**
signup, free or paid (§17 #3, #4; see §8 below). Do not let pricing-or-billing uncertainty
block the "Start free" CTA; do let the legal/DPA gates block it.

---

## 7. Activation metric + analytics events (§14.4, §18.5)

### 7.1 The activation metric — the moat metric

The funnel's north-star activation event (§14.4, §18.3): **the first real estimate that
reuses at least one library component**. This is "the moat metric" — it is the moment a
free user starts building the library that compounds switching cost, instead of bouncing.
The landing's job is to deliver signups; the first-run path's job (§8) is to carry them to
this event. Instrument it as a first-time-per-user boolean, not a raw count, so retention
analysis can ask "did this signup activate?" cleanly.

### 7.2 Instrumented events (§18.5)

These are the events the landing funnel contributes to or feeds. The full event schema and
tool are ⚠️ GATED ON the analytics-tool decision (§17 #8); the **set** is canonical per
§18.5:

- `signup` — fired on Free-tier account creation (the CTA's direct conversion event).
- `first_estimate_created` — first estimate in a new account.
- `component_reused` — **the moat metric** (§7.1); first reuse per user is the activation
  signal.
- `proposal_shared` — first shared proposal link (note: sharing is a **paid** capability,
  §9.2 — Free has no client sharing — so this event fires for users who upgrade or for the
  walkthrough path; do not imply Free shares).
- `export` — `.xlsx` export (Free has marked export; instrument the event).
- `weekly_return` — retention signal (§18.5).
- Landing-side events feeding the funnel: `hero_cta_click` (Start free), `secondary_cta_click`
  (Book a walkthrough), `plate_node_focus` (architecture-plate engagement), `claims_ledger_
  expand` (section-7 engagement, if interactive), `pricing_philosophy_engagement` (§9.3
  philosophy section — to validate the cement-anchor framing as a hypothesis, not to publish
  a locked price).

All landing copy in these events obeys §15 (no invented metrics, no superiority claims);
the events themselves capture behavior, not marketing claims.

---

## 8. Co-dependencies — Go/No-Go gates for "Start free"

The "Start free" CTA is only credible if the thing it lands on works. These are the
co-dependencies the plan must flag (BRIEF; §7.5; §18.1–§18.6). Each is a **gate**: the CTA
does not go public until the gate is closed, or the owner explicitly accepts the risk.

| # | Gate | Status / source | Blocks |
|---|---|---|---|
| G1 | **Beta onboarding + demo-data/reset rules** | §7.5 launch gate; §18.3. Demo data with reset rules is a launch gate. ⚠️ NEEDS INPUT: design the first-run flow; build a demo project (a simple CHB or residential BOQ) — §18.3. | Signup → activation path; the moat metric (§7.1) depends on a working first-run. |
| G2 | **Abuse guardrails (P1)** | §18.1 near-term engineering blockers: **durable rate limiting**, **POST-only invite acceptance**, **token hashing with a server pepper**. | Any public self-serve signup surface. Without rate limiting, "Start free" is an abuse magnet; without POST-only invites + peppered token hashing, the invite path is exploitable. These are P1, ahead of public launch. |
| G3 | **First-run flow** | §18.3 ⚠️ NEEDS INPUT (NEEDS-INPUT register #7). The path: signup → sample/demo project → guided first estimate → first reuse → first client share. | Activation (the moat metric). Without a designed first-run, free users bounce before first reuse. |
| G4 | **Legal docs (ToS, Privacy Policy, Acceptable Use, Refund/Cancellation)** | §17 #3, §18.2. Required before **any** signup (free or paid). | Any signup. |
| G5 | **Data Privacy Act posture (DPO, PIA, breach plan, cross-border safeguards)** | §17 #4, §18.2. Data sits on Supabase in `ap-southeast-2` (Australia) — a cross-border transfer needing model contractual clauses or equivalent. Applies regardless of entity size. | Any signup handling personal data. |
| G6 | **P0 launch gates** | §18.1: invite config + environment variables + docs cleanup. These are P0 and must close before public launch of anything. | Public launch. |
| — | **NOT a gate: validated pricing (§9.3)** | §9.3 gates **publishing a price**, not opening a free signup. | Does NOT block "Start free". |
| — | **NOT a gate: billing mechanism (§18.6)** | §18.6 gates **charging**, not onboarding a free user. Free is ₱0, no payment instrument. | Does NOT block "Start free". |

**Sequencing read:** G6 (P0) and G2 (P1 abuse) are engineering blockers with the shortest
path to close; G1 + G3 (onboarding + first-run + demo data) are the activation-critical
design and build work; G4 + G5 (legal + DPA) have lead time (§18.2: "start it first") and
are prerequisites for *any* signup. Pricing and billing are explicitly downstream of free
signup — they gate charging, not onboarding.

---

## 9. Engineering guardrails (summary for the implementation lane)

1. RSC-first: routes are Server Components; only the §1.2 leaves hydrate; mirror
   `WorkshopDashboard`/`WorkshopHomebaseClient`.
2. Static generation for all six marketing routes; the landing never calls Supabase.
3. Responsive hard floor 320/375/414/768; `overflow-x: clip` on `html` + `body`; plate
   collapses to a vertical stack with inline claims tags at narrow widths.
4. LCP = text headline; no hero image; no carousel; `next/image` with dimensions for any
   image.
5. Source Serif 4 via `next/font`, `display: swap`, subset including ₱; reuse
   `--proposal-paper: #fffdf8` and `--brand-orange-dark` tokens already in `globals.css`;
   additive tokens only.
6. No #7F7F7F load-bearing text; instant `:focus-visible` ring; semantic HTML;
   `prefers-reduced-motion` respected.
7. Reuse existing loaders (`LandingAnalyticsLoader`, `CookieConsentBanner`,
   `ClarityScript`, `ABExperimentProvider`); audit them against the removals rail.
8. "Start free" → dedicated `/signup` (recommended) landing on a working Free tier; do not
   gate on pricing or billing; **do** gate on legal docs + DPA + abuse guardrails +
   onboarding/first-run.
9. Instrument the §7.2 event set; the moat metric is first-reuse.
10. No invented features/metrics/testimonials/prices/partner names on any public surface
    (§15); every copy suggestion is owned by doc 05 and signed off via the claims ledger
    gate (§3.2 / doc 05 section 7).

---

## Cross-links

- **`00-OVERVIEW.md`** — pack overview, routes scope, the locked decisions this doc obeys.
- **`02-SECTION-TAXONOMY-AND-NARRATIVE-ARC.md`** — DOM order; this doc renders it.
- **`03-VISUAL-LANGUAGE-AND-TOKENS.md`** — tokens, type pairing, motion, paper; this doc
  consumes them additively.
- **`04-COMMERCIAL-GRAPH-ARCHITECTURE-PLATE.md`** — plate content + collapse; this doc owns
  its rendering contract (§2.3).
- **`05-COPY-SKELETON.md`** — copy + the signed-off claims ledger object this doc renders.
- **`08-ROLLOUT-AND-ANALYTICS.md`** — preview route (`/newdesign` + `/design-sync`
  convention), A/B, claims sign-off gate, analytics events (this doc defines the event set;
  doc 08 owns the rollout mechanics).
- **`LOOP_LEDGER.md`** — owner confirmations for the removals rail (§5) and the Go/No-Go
  gates (§8); evidence registration for the perf/a11y targets (§3.2).

---

## ⚠️ Gated on / Open decisions

- **G — Owner confirmation of the removals rail (§5).** The plan assumes confirmation; the
  implementation lane does not delete until confirmed in `LOOP_LEDGER.md`. Includes the 3
  fabricated testimonials, the hype hero, the construction-photo slideshow + 2.3MB PNG, the
  logo-only footer, and any re-drawn browser/IDE chrome.
- **G — Auth route for "Start free" (§6.1).** No `/signup` exists today (`/auth` and
  `/login` do). Recommend a dedicated `/signup`; owner to decide.
- **G — Founder-bio assets (§11.5, the founder/company section).** ⚠️ NEEDS INPUT register
  #17. The section is on the taxonomy but its content is gated on founder public-bio assets;
  engineering-wise, the section renders as static HTML once assets exist, with `next/image`
  if a photo is included.
- **G — Analytics tool + event schema (§7.2).** ⚠️ NEEDS INPUT register #8. The event *set*
  is canonical (§18.5); the *tool* and *schema* are not chosen. The analytics-boot leaf
  (§1.2 #4) is absent until a tool is selected.
- **G — A/B provider for the rollout (§1.2 #4, doc 08).** The repo ships
  `ABExperimentProvider.tsx`; reuse if it fits, else select. Gates the A/B old-vs-new
  comparison, not the static render.
- **G — Performance targets ratification (§3.2).** ⚠️ NEEDS INPUT register #16 asks for
  explicit perf targets. The §3.2 numbers are a planning recommendation; ratify before
  treating as a gate.
- **G — The full Go/No-Go gate set (§8):** G1 onboarding/demo-data/reset (§7.5/§18.3),
  G2 abuse guardrails P1 (§18.1), G3 first-run flow (§18.3), G4 legal docs (§18.2),
  G5 DPA posture (§18.2), G6 P0 launch gates (§18.1). Pricing (§9.3) and billing (§18.6)
  are **not** gates for "Start free".
- **O — Source Serif 4 peso-sign subset (§3.3).** Confirm the ₱ glyph (U+20B1) is in the
  subset before ship; a fallback would undermine the pricing-philosophy section.
- **O — Glass on the landing (§4.4).** The BRIEF scopes glass to the workshop; the landing
  is paper. Confirm during implementation whether any glass surface appears on the marketing
  routes; if not, the deferred-glass arm pattern is inherited from the workshop unchanged
  and irrelevant here.
