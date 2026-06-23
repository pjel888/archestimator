# Copy, CTA, And Content Best Practices

Date: 2026-06-22
Scope: future Archestimator landing-page implementation

This document translates general landing-page writing practice into Archestimator
rules. It should be read after `05-PRODUCT-TRUTH-FOR-LANDING.md`,
`06-LANDING-CONTENT-ARCHITECTURE.md`, and
`07-CODEBASE-AI-BUILD-BRIEF.md`.

## Source Basis

External sources checked on 2026-06-22:

- Nielsen Norman Group, "Concise, Scannable, and Objective: How to Write for the
  Web": <https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/>
- Nielsen Norman Group, "Better Link Labels: 4Ss for Encouraging Clicks":
  <https://www.nngroup.com/articles/better-link-labels/>
- Nielsen Norman Group, "'Learn More' Links: You Can Do Better":
  <https://www.nngroup.com/articles/learn-more-links/>
- Nielsen Norman Group, "How Little Do Users Read?":
  <https://www.nngroup.com/articles/how-little-do-users-read/>
- Nielsen Norman Group, "Writing Hyperlinks: Salient, Descriptive, Start with
  Keyword": <https://www.nngroup.com/articles/writing-links/>
- W3C, WCAG 2.2 link purpose and label-in-name criteria:
  <https://www.w3.org/TR/WCAG22/>
- Framer Marketplace, "Parley Agent":
  <https://www.framer.com/community/marketplace/templates/parley-agent/>

Internal anchors:

- `ARCHESTIMATOR_MASTER.md:44-84` for category, core thesis, live features, and
  target audience.
- `ARCHESTIMATOR_MASTER.md:475-525` for Controlled Confidence voice.
- `ARCHESTIMATOR_MASTER.md:533-552` for deployable hero, benefits, who-it-is-for,
  and spreadsheet-problem copy.
- `archestimator-app-bible.md:112-155` for estimate, library, shared link, and
  export capabilities.
- `01-beta-product-thesis-and-prioritization.md:7-37` for the beta golden path.
- `04-ux-state-accessibility-and-content-contracts.md:7-19` for public-site copy
  honesty.

## Writing Principle

Use concise, scannable, objective copy. For Archestimator, that means:

- one product idea per section;
- no marketing fluff;
- no fake scale;
- no generic AI/productivity language;
- no contractor-first framing;
- no "only tool", "guaranteed", "fully automated", "enterprise-grade", or
  "industry standard" claims;
- proof-led present tense only where the app already supports the claim.

The voice is Controlled Confidence: calm, direct, commercially aware, and earned.
The page should sound like serious software for people who defend estimates, not
like a startup trying to sound bigger than it is.

## Homepage Content Role

The homepage is a polished sneak peek, not the complete product manual.

It must answer four questions quickly:

1. What is Archestimator?
2. Why does this matter versus spreadsheet estimating?
3. What product surfaces exist today?
4. What should an interested AEC team do next?

Move the long evaluation work elsewhere:

| Need | Destination |
| --- | --- |
| Detailed feature breakdown | `/features` |
| Pricing hypotheses, package comparison, plan details | `/pricing` |
| Security, proof honesty, beta readiness | `/trust` |
| Founder story and company context | `/about` |
| Walkthrough, early access, design partner route | `/contact` |

## Copy Budget Table

These are Archestimator implementation budgets, not universal rules. They exist
to prevent bloated copy and giant-font composition.

| Surface | Target | Hard ceiling | Notes |
| --- | ---: | ---: | --- |
| Meta title | 48-62 characters | 70 characters | Include Archestimator and cost intelligence/AEC when possible. |
| Meta description | 135-155 characters | 165 characters | Use one plain product sentence. No roadmap claims. |
| Nav label | 1-2 words | 12 characters each if possible | Features, Pricing, Trust, Contact. |
| Announcement strip | 8-13 words | 90 characters | Use only for real beta/update message. |
| Hero H1 | 3-7 words | 42 characters | Prefer "Your cost intelligence layer." |
| Hero support | 18-32 words | 210 characters | Plain payoff plus current capability. |
| Hero maturity line | 5-9 words | 80 characters | Example: "Pre-launch MVP preview for AEC teams." |
| Primary CTA | 2-4 words | 24 characters | "Request early access" or "Start free" only if true. |
| Secondary CTA | 2-4 words | 24 characters | "Book a walkthrough", "View product proof". |
| Section eyebrow | 1-3 words | 28 characters | Use mono/numeric texture sparingly. |
| Section H2 | 4-9 words | 62 characters | Clear thesis, no poster slogans. |
| Section intro | 16-28 words | 180 characters | One explanatory sentence. |
| Product proof card title | 3-6 words | 44 characters | Concrete object: Estimate Sheet, Cost Library, Proposal Record. |
| Product proof card body | 10-22 words | 140 characters | State the user-facing value. |
| Role card body | 10-18 words | 120 characters | One job/benefit, no fake persona story. |
| Community section title | 3-6 words | 44 characters | "Follow the build" is stronger than fake community scale. |
| Footer description | 12-24 words | 155 characters | Product identity plus AEC audience. |

## Hero Copy Direction

Canonical H1:

> Your cost intelligence layer.

Canonical support copy:

> Build AEC estimates from your own prices and suppliers, keep every revision on
> the record, and send proposals clients can review and approve.

Short maturity line:

> Pre-launch MVP preview for AEC estimating teams.

Approved CTA pair:

- Request early access
- Book a walkthrough

Alternative H1 if the future visual direction needs a warmer line:

> Cost proposals that remember the work.

Use the alternate only if the first viewport still says AEC and cost
intelligence in the support copy. Do not let the alternate make the page feel
like a generic proposal tool.

Three-second comprehension test:

- A new visitor should be able to answer, within the first viewport: what is it,
  who is it for, and why should I trust that it is real?
- If "Your cost intelligence layer." feels too internally elegant when paired
  with the visual proof, switch to "Cost proposals that remember the work." and
  keep "cost intelligence" in the support copy or maturity line.
- If the hero visual does not clearly show Estimate Sheet/product proof, do not
  rely on category-making language alone. Choose the warmer, more literal H1.

Do not use:

- "The future of estimating"
- "AI-powered estimates in seconds"
- "Contractor-first cost estimating"
- "All-in-one construction ERP"
- "Never make a mistake again"

## CTA Strategy

Every CTA must set the expectation that the destination immediately fulfills.
Do not use standalone "Learn more" unless it is qualified by the destination.

Canonical CTA behavior:

| CTA | Label | Destination | State |
| --- | --- | --- | --- |
| Primary hero/nav/final, signed out | `Request early access` | `/contact?intent=early-access` | Real form/contact path, not `/signup`. |
| Secondary hero, signed out | `Book a walkthrough` | `/contact?intent=walkthrough` | Scheduling/contact intent. |
| Product proof | `View product proof` | `#product-proof` | In-page proof anchor. |
| Feature route | `See the feature tour` | `/features` | Deeper product breakdown. |
| Pricing route | `See pricing` | `/pricing` | Dedicated pricing page; no homepage pricing cards. |
| Trust route | `Read trust notes` | `/trust` | Claims/privacy/security detail. |
| Signed-in state | `Open workspace` | `/workshop` | Authenticated product workspace. |
| Existing account fallback | `Sign in` | `/login` | Only when needed as a secondary nav action. |

Primary CTA rules:

- Use one dominant action in nav, hero, product-proof turn, and final CTA.
- For signed-out visitors, prefer `Request early access` or `Book a walkthrough`
  until general availability is real.
- For signed-in users, `Open workspace` is acceptable.
- Do not use `Start free` unless signup actually creates a usable free path.

Secondary CTA rules:

- Use destination-specific labels:
  - `View product proof`
  - `See the feature tour`
  - `Read trust notes`
  - `See pricing`
  - `Join launch updates`
- Avoid repeated `Learn more`, `Read more`, and `Explore`.
- Do not create more than two CTAs in one section.
- Form fields, thank-you states, analytics events, and no-PII tracking rules are
  canonical in doc `12`.

CTA placement:

1. Nav: one compact primary CTA plus sign-in when relevant.
2. Hero: primary early-access CTA plus walkthrough/product-proof secondary.
3. After product proof: route to `/features` or `/contact`.
4. Community: follow/update CTA, not a sales CTA.
5. Footer/final: repeat early-access or walkthrough CTA.

Homepage pricing boundary:

- The homepage may mention that pricing is available on `/pricing`.
- It must not include plan cards, package names, price anchors, discount language,
  or beta package comparisons.
- If a pricing link appears, its label must be `See pricing` or another equally
  direct destination label.

## Community And Social Section

Include a lightweight community/follow area near the footer or final CTA only
when at least one maintained destination exists. If no real destinations exist,
omit the section and document that decision in the implementation notes.

Purpose:

- give interested visitors a lower-commitment path;
- support founder-led beta learning;
- make the build feel active without inventing traction.

Recommended copy:

> Follow the build.
>
> Get launch notes, product updates, and early workflow examples as
> Archestimator moves through closed beta.

Channel order if real links exist:

1. LinkedIn
2. Instagram
3. WhatsApp
4. Facebook
5. Email/newsletter

Implementation rules:

- Use icon+label links.
- Do not show placeholders or dead links.
- Do not imply a large existing community.
- WhatsApp must use a maintained number, group, or channel link.
- Use `aria-label` only when the visible label is not enough.
- Keep social icons visually quiet; they should not compete with the product CTA.

Channel manifest rule:

```ts
type LandingCommunityChannel = {
  label: "LinkedIn" | "Instagram" | "WhatsApp" | "Facebook" | "Newsletter";
  href: string;
  ariaLabel?: string;
};
```

Only render channels with a non-placeholder `href`. Avoid `#`, empty strings,
fake WhatsApp links, or "coming soon" social buttons.

## Product Proof Copy Matrix

| Product object | Benefit line | Proof detail to show |
| --- | --- | --- |
| Estimate Sheet | Build the estimate in project structure. | Project tree, Areas, rows, quantities, totals, save state. |
| Cost Library | Reuse prices, suppliers, variants, and templates. | Component card, supplier/source metadata, template insert. |
| Revision Record | Keep the logic behind every number attached. | Activity/history rail, changed row, timestamp, note. |
| Shared Proposal | Send one review surface for comments and decisions. | Recipient page, comment, decision, password/recovery state. |
| Export/Charts | Package the work for handoff and review. | XLSX export and project charts as supporting proof. |

Avoid abstract phrases such as "smarter workflows" unless the product object is
visible in the same viewport.

## Typography Restraint For Copy

The current landing code uses several headline clamps that can reach about 6rem.
That is too large for this direction. The future implementation should target:

- desktop hero H1: roughly 42-56px;
- absolute professional ceiling: about 64px unless Philip explicitly approves a
  campaign/poster treatment;
- section H2: roughly 32-48px;
- product-card title: roughly 22-34px;
- body copy: 15-18px on the public site, with 10-12px only for app-like labels.

Use the "robotic font thing" as a precise accent:

- one word or short phrase in the hero;
- process labels;
- ordinals;
- totals and status chips;
- never full paragraphs.

## Claim QA Checklist

Before a future codebase AI calls the copy ready, scan for:

- [ ] AEC appears in metadata, hero support, or first screen.
- [ ] Contractor appears only as one audience or role, not the brand identity.
- [ ] Pricing depth lives on `/pricing`, not the homepage.
- [ ] The homepage says pre-launch/beta honestly.
- [ ] Every product claim maps to a live or clearly qualified capability.
- [ ] No fake testimonials, fake logos, or fake traction metrics.
- [ ] CTAs describe their destination.
- [ ] Community/social links are real or omitted.
- [ ] Hero and section copy fit the copy budget table.
- [ ] There is one visible H1.
- [ ] CTA visible labels are descriptive and match accessible names.
- [ ] Metadata and Open Graph copy match the AEC-first positioning.
- [ ] Existing landing tests that encode stale copy are intentionally updated, not
      ignored.
