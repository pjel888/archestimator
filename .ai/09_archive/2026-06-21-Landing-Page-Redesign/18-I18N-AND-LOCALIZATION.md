# 18 — i18n & Localization (PH + SEA)

> **STATUS: PLANNING ONLY · 2026-06-22 (revised per ratified keystone decisions D-1…D-5) · not code.**
> **Purpose:** own the locale strategy for the landing redesign: **EN-only at launch** (recommended;
> per `ARCHESTIMATOR_MASTER.md` §7.4 "English UI, no localization yet") with a documented Filipino
> (FIL) + Bahasa Indonesia (ID) roadmap, the hreflang strategy, the sitemap localization, the
> copy-idiom discipline (enforced by lint + test), the peso currency contract, the landing→app
> locale handoff, and the validation plan. MASTER §6.1 commits to PH + SEA; this doc closes the gap
> between "the audience is PH + SEA" and "the page is EN-only — why, and what's next."

This doc owns **i18n**. It does not own the on-page copy (→ `05-COPY-SKELETON.md`), the sitemap
(→ `13-SEO-AND-DISCOVERY.md` §4), the abuse guards on `/contact`/`/signup` (→ `15-FORMS-AND-ABUSE-
GUARDRAILS.md`), or the content review checklist (→ `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` §4). It
defines the locale decision and its consequences. It honors D-1 (Glass Brand — locale does not
change the visual vocabulary), D-3 (orange token discipline — locale does not change accent), D-4
(ClaimStatus type — locale does not fork the type), and D-5 (honest scoring).

---

## 1. The launch decision: EN-only (recommended; gated)

⚠️ GATED on **L-I18N-1**: ratify EN-only at launch.

**Decision (recommended):** the landing ships **English-only at launch**.

**Rationale:**

1. **MASTER §7.4 is explicit:** "English UI, no localization yet." The redesign obeys canon.
2. **Filipino professionals are English-fluent in professional contexts.** Construction professionals
   in PH use English terminology (BOQ, DUPA, unit costs, cost proposal) in their daily work; English
   is the professional register, not a foreign imposition. MASTER §6.2 uses AEC-correct English terms
   throughout.
3. **English is the SEO anchor.** The keyword clusters in `13-SEO-AND-DISCOVERY.md` §2.2 are English;
   FIL-language construction-software search volume in PH is low (the audience searches in English for
   professional tools). Validating that claim empirically is itself gated (§6 → L-SEO-1).
4. **Localization is real work.** An honest EN-only launch is better than a half-translated launch
   (the latter signals carelessness; MASTER §15 honesty; D-5 honest scoring).
5. **Bahasa / Vietnamese / Thai are out of scope for the wedge.** The wedge is PH (then SEA expansion);
   localization for the wider SEA market waits until the wedge validates.

**What EN-only does NOT mean:**

- It does **not** mean ignoring PH context. The copy uses AEC-correct PH terms (BOQ, DUPA, cost
  proposal, cement anchor) per MASTER §6.2 + §12.10.
- It does **not** mean US English idioms. The copy avoids US-only idioms (no "reach out," "leverage,"
  "double-click on"); it uses the plainer international register that reads naturally in PH.
- It does **not** mean US formatting. Prices in pesos (₱, via the §4 currency contract — never
  hardcoded in copy); dates in international format (DD Month YYYY); phone formats in international
  (+63).
- It does **not** mean US typography or color. The visual vocabulary stays the Glass Brand (D-1):
  warm grey canvas, liquid-glass surfaces, `--brand-orange #F24405` / `--brand-orange-dark #C63804`
  presence (D-3), Doto + Roboto Mono + SF Pro. A locale change at Phase 1+ swaps **strings only**,
  never tokens, fonts, radius, or the accent stance.

---

## 2. The copy-idiom discipline (localization-friendly EN)

Even at EN-only launch, the copy is written to **localize cleanly** when FIL/ID ship. The discipline
is owned by `05-COPY-SKELETON.md` + `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` §4 (the Reviewer runs it
on every copy change), and **enforced by the lint + test mechanism in §8** of this doc.

| Rule | Why | Example |
|---|---|---|
| No embedded idioms | Idioms don't translate; "reach out" → "???" in FIL | Use "send a note" not "reach out." |
| No culture-specific metaphors | "Swing for the fences" → meaningless | Use the cement anchor (PH construction native) instead. |
| Subject-verb-object, short sentences | Translates more cleanly than long compound sentences | MASTER §10.2 principle 2 ("plain words, one intriguing idea"). |
| **No concatenated strings (HARD, lint-enforced — §8)** | `"Welcome, " + name + "!"` breaks in languages with different word order (FIL "Kamusta, {name}!" puts the name mid-phrase) | Use template strings with **named placeholders** (`"Welcome, {{name}}!"`); adopt **ICU MessageFormat** if/when a library is adopted (§9 O-2). |
| Punctuation outside strings | "Archestimator:" not "Archestimator —" (the em dash is an English convention; FIL/ID use the period or comma) | MASTER house style is "no em dashes" (verified in the MASTER preface). |
| Numbers + currency as variables (HARD — §4) | `₱239` hardcoded in 12 places means 12 edits when it changes; a peso number in copy is also a §15 honesty risk (invented price) | Use the `{{price_solo}}` token sourced from the single source of truth (§4.2). |
| Plurals via ICU, not `s`-concatenation | English `count === 1 ? "" : "s"` is wrong for FIL (no plural marking) and Bahasa (reduplication) | If a string shows a count at launch, write it ICU-ready (`{count, plural, one {# estimate} other {# estimates}}`) even if EN-only ships first. |

These rules apply to `05-COPY-SKELETON.md` now; they make the FIL/ID migration a content task, not a
refactor. The lint + test mechanism (§8) makes them enforceable, not aspirational.

---

## 3. The hreflang strategy (at EN-only launch)

Even at EN-only, the page ships the hreflang tags that declare its locale explicitly. This helps
search engines serve the right result and pre-positions the page for the FIL/ID expansion. The hreflang
contract is **owned here** and **rendered by `13-SEO-AND-DISCOVERY.md`** (§3 there reads these tags
into the metadata pipeline).

```html
<link rel="alternate" hreflang="en-PH" href="https://archestimator.com/" />
<link rel="alternate" hreflang="en" href="https://archestimator.com/" />
<link rel="alternate" hreflang="x-default" href="https://archestimator.com/" />
```

The locale code is **`en-PH`** (BCP-47; matches the `Intl.NumberFormat("en-PH", …)` locale already
used across the product — §4.1). When FIL ships: `<link rel="alternate" hreflang="fil-PH"
href="https://archestimator.com/fil/" />` under the §7 subpath strategy. When ID ships:
`hreflang="id-ID"`. Auth routes `/login` + `/signup` stay `noindex,nofollow` and carry **no hreflang**
(per `23-AUTH-EXPERIENCE.md` §7) — they are not locale-targeted landing surfaces.

---

## 4. The peso currency contract (no hardcoded pesos in copy)

### 4.1 The locale is already `en-PH` (verified, not assumed)

The product **already** formats every peso value with `Intl.NumberFormat("en-PH", …)`. Verified by
grep on 2026-06-22 — the convention is load-bearing across the app:

| File | Usage |
|---|---|
| `src/lib/project-charts/format.ts:4,18` | currency + number formatting for chart axes |
| `src/lib/project-charts/build-insight-sentence.ts:82` | the "is ₱Δ (Δ%) lower/higher" insight sentence |
| `src/lib/activity/activity-formatters.ts:52,68,69,72` | activity-feed currency, percent, date |
| `src/lib/proposal-export/create-proposal-workbook.ts:43,158,210` | the `[$₱-3409]` Excel mask (locale 3409 = en-PH) + peso-in-words + uppercase status |
| `src/components/share/ShareEstimateTreeView.tsx:51` + `SharePageSummaryCard.tsx:8,17` | the shared-link receiver surface |
| `src/lib/activity/activity-composer.ts:52` | count pluralization |
| `src/lib/proposal-export/worksheet-name.ts:26` + `build-proposal-export-model.ts:57` | case-folding |

**Contract (HARD):** the landing reuses the **same locale** — `en-PH` — for any peso value it renders.
There is exactly one PHP currency formatter for the landing, and it is this one:

```ts
// The landing's single source of truth for peso rendering. Mirrors the app's convention.
import { formatPHP } from "@/lib/project-charts/format"; // or a shared `src/lib/format-currency.ts`
// formatPHP(2390) -> "₱2,390.00" (en-PH, PHP currency, 2 fraction digits — matches the proposal export)
```

**Why this matters for i18n:** `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`
already produces the PH-correct symbol placement (₱ prefix), grouping (comma thousands), and fraction
digits. When FIL ships, **only the locale argument changes** (`"fil-PH"`); the symbol, grouping, and
currency code stay PHP. There is never a string `"₱"` literal in a landing component — always the
formatter call.

### 4.2 The `{{price_solo}}` token (single source of truth)

The landing copy contains exactly **one** kind of peso reference: the `{{price_solo}}` placeholder
(per `05-COPY-SKELETON.md` §10 pricing-philosophy frame, which is **hypothesis-labeled** per
`00-OVERVIEW.md` §9.3 — no locked price is published). The token resolves as:

| Source of truth | Owner | Status |
|---|---|---|
| The validated solo-tier price (a number, in PHP) | gated on **L-PRC-1** (≥5 discovery calls + ≥2 beta users building a real estimate + Van Westendorp — per `00-OVERVIEW.md` G-7) | ⚠️ GATED — `/pricing` ships **philosophy only**, no peso number, until L-PRC-1 closes |
| The `{{price_solo}}` token in copy | `05-COPY-SKELETON.md` | renders the number via the §4.1 formatter when L-PRC-1 closes; until then the copy reads the **frame** ("the cement anchor for your pricing"), not a number |
| The formatter that paints the number | this doc §4.1 | `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })` — never a hardcoded peso literal |

**Hard rule (enforced by the §8 lint):** no landing component or copy string contains a peso literal
(`₱` followed by digits) outside the `{{price_*}}` token family. This means a price change is a
**one-place** edit (the token binding), not a 12-place grep-and-replace — and it means no peso number
can leak into copy as an invented §15 violation.

### 4.3 Dates + phones

| Format | Locale | Example |
|---|---|---|
| Date | `en-PH` (`toLocaleDateString("en-PH")`, already used in `SharePageSummaryCard.tsx:17`) | "12 January 2026" (DD Month YYYY — international, not US M/D/Y) |
| Phone | international `+63` | "+63 2 8XXX XXXX" (never "(02) 8XXX-XXXX" — that is US-style) |
| Number | `en-PH` (`Intl.NumberFormat("en-PH", …)`) | comma thousands, period decimal — matches the proposal export |

---

## 5. The landing → app locale handoff

**At EN-only launch, the landing passes NO explicit locale state into `/workshop`.** The decision is
deliberate, not an omission:

1. **The app is EN-only too** (MASTER §7.4). There is no locale dimension in the Workshop Dashboard
   to hand off to. Passing a `?lang=en-PH` param would be theater — the app ignores it.
2. **The closed-beta gate (`23-AUTH-EXPERIENCE.md` §3) runs at the `/auth/callback` boundary**, after
   authentication. The gate does not look at locale; it looks at the email + the Postgres RPC. Adding
   a locale param to the callback would change nothing about access.
3. **Auth routes stay `noindex,nofollow`** (`23-AUTH-EXPERIENCE.md` §7) and carry **no hreflang**
   (§3). The "Start free" CTA → `/signup` (or `/login` / `/contact` while L-FUN-2 is open) is a locale-
   agnostic navigation.

**What the landing DOES hand off (locale-relevant):**

| Signal | Mechanism | Why |
|---|---|---|
| `Accept-Language` header | the browser sends it automatically; the RSC reads it only for the §6 step-3 analytics capture (optional, anonymous) | one passive demand signal for Phase 1 — no UX consequence at launch |
| Anonymous analytics id | the landing sets an anonymous id (per `17-ANALYTICS-AND-OBSERVABILITY.md`); at the auth callback boundary it merges into the authenticated id (`23-AUTH-EXPERIENCE.md` §9.1) | carries any locale-preference signal (from the optional `/contact` field, §6) forward |
| The `next=` redirect target | sanitized by `sanitizeNextPath` (`src/lib/auth/redirects.ts`); never carries locale | open-redirect-safe; locale is not a redirect concern at EN-only |

**When FIL ships (Phase 1+, §7):** the handoff contract changes in **exactly one way** — the landing
sets a first-party `locale` cookie (`locale=en-PH` or `locale=fil-PH`) at the top of the marketing
tree, the Workshop reads it to pick its string bundle, and the auth routes stay locale-agnostic (the
user reads "Sign in" or "Mag-sign in" but the auth *model* — Google OAuth + magic link, no password,
D-2 — is identical in every locale). The cookie approach is preferred over a `?lang=` param because
(a) it survives the OAuth round-trip to Google and back (params can be stripped), and (b) it does not
bloat the URL or the sitemap. **This is a Phase-1 decision, not a launch decision** — it lives in
`LOOP_LEDGER.md` L-I18N-1 until Phase 1.

---

## 6. The validation plan (closes L-SEO-1 + L-I18N-1)

| Step | Method | Output | Gated on |
|---|---|---|---|
| 1 | Validate EN search volume in PH for the primary cluster (`13-SEO-AND-DISCOVERY.md` §2.3 step 1) | Confirms EN is the right launch locale. | L-SEO-1 |
| 2 | Validate FIL search volume in PH for "construction cost estimating" / "BOQ template" (FIL variants) | Determines whether Phase 1 is worth it. | L-SEO-1 |
| 3 | During beta, capture self-reported preferred-language from `/contact` (optional field, anonymous) + the `Accept-Language` header (§5) | Empirical signal: do PH users want FIL? | (none — capture is always on) |
| 4 | After launch, monitor Search Console for FIL queries that return the EN page | Demand signal for Phase 1. | (none — post-launch) |

Steps 1–2 are **empirical inputs** to L-SEO-1 and L-I18N-1; they do not invent a trigger threshold
(see §7 for why the prior "≥50 PH signups" trigger was softened).

---

## 7. The FIL + Bahasa roadmap (post-launch) + the Phase-1 trigger

### 7.1 The roadmap

When the wedge validates (per `13-SEO-AND-DISCOVERY.md` §2.3 + the broader MASTER §9.4 acquisition
motion), the localization roadmap is:

| Phase | Locales | Trigger | Work |
|---|---|---|---|
| **0 (launch)** | EN | — | EN-only, this redesign. |
| **1** | EN + FIL | **Softened** (see §7.2): sustained FIL demand across ≥2 of {Search Console FIL-impression volume, `/contact` self-reported preference, `Accept-Language` `fil` share}, **AND** L-PRC-1 closed (the peso/PHP currency contract in §4 must be stable before a second locale layers on top of it). | Translate `05-COPY-SKELETON.md` to FIL; ship `/fil/` subpath (§7.3); add `hreflang="fil-PH"`; set the `locale` cookie handoff (§5). |
| **2** | EN + FIL + ID | SEA expansion signal (ID signups or ID-search volume). | Translate to Bahasa Indonesia; add `hreflang="id-ID"`; `/id/` subpath. |
| **3+** | EN + FIL + ID + (TH / VI / MS) | Per-market validation. | Per-market translation. |

### 7.2 The Phase-1 trigger is SOFTENED (honesty, D-5)

The prior draft of this doc named a Phase-1 trigger of **"≥50 PH signups"** with **no source** for the
threshold. That is the kind of self-imposed, ungrounded number D-5 (honest scoring) and §15 (no
invented metrics) forbid. The trigger is therefore **softened** to a **multi-signal demand
conjunction** (§7.1 Phase 1 row):

- There is **no single numeric threshold** at this planning stage, because no empirical baseline
  exists yet (the product is pre-launch, closed-beta; signup counts are not a meaningful denominator).
- The signals themselves (Search Console FIL-impression volume, `/contact` self-reported preference,
  `Accept-Language` `fil` share) are the **same** signals the §6 validation plan captures. Phase 1
  begins when ≥2 of them show **sustained** (≥2 consecutive months post-launch) FIL demand **and**
  L-PRC-1 is closed.
- Setting a hard numeric threshold (e.g. "≥X% of `/contact` submissions prefer FIL") is **deferred to
  post-launch**, when real denominator data exists. That future threshold is **itself** a gated item
  — recorded as part of L-I18N-1, not invented here.

This is the honest posture: the trigger is a **conjunction of real signals**, not a fabricated number.

### 7.3 Subpath (`/fil/`) over subdomain — and the App Router contract for it

The decision between subpath (`/fil/`) vs subdomain (`fil.archestimator.com`) vs TLD
(`archestimator.ph`) is **recommendation: subpath (`/fil/`)** for SEO + ops simplicity (single domain,
single sitemap, single SSL cert, no DNS/TLS per locale). This is a Phase-1 decision (deferred to
L-I18N-1); the contract below is what the implementer follows **when** Phase 1 lands.

#### 7.3.1 The App Router `[locale]` segment (the eventual shape)

The marketing routes move under a dynamic `[locale]` segment. Auth routes (`/login`, `/signup`) and
the API do **not** — they stay locale-agnostic per §5 and `23-AUTH-EXPERIENCE.md` §7.

```
src/app/
  [locale]/
    page.tsx              # /
    features/page.tsx     # /features
    pricing/page.tsx      # /pricing
    about/page.tsx        # /about
    contact/page.tsx      # /contact
    trust/page.tsx        # /trust
    layout.tsx            # sets <html lang>, the locale cookie, the string bundle
  login/page.tsx          # /login  (locale-agnostic, noindex)
  signup/page.tsx         # /signup (locale-agnostic, noindex; self-serve gated L-FUN-2)
  auth/callback/route.ts  # /auth/callback (unchanged)
```

#### 7.3.2 `generateStaticParams` (static vs dynamic)

Per the App Router i18n pattern, the `[locale]` segment exports `generateStaticParams` so the
marketing routes **prerender at build** for the known locale set (EN at Phase 0; EN + FIL at Phase 1):

```ts
// src/app/[locale]/layout.tsx (Phase 1+)
export const LOCALES = ["en", "fil"] as const; // append "id" at Phase 2
export type Locale = (typeof LOCALES)[number];

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
```

**Gotchas (verified against the current `next.config.ts` + App Router, 2026-06-22):**

1. **`generateStaticParams` at the segment root enumerates locales; the leaf pages (`features`,
   `pricing`, …) inherit.** Do not re-declare it per leaf unless a leaf has its own dynamic segment.
2. **`dynamicParams` defaults to `true`** — a request to `/zh/` (not in `LOCALES`) would 404 only if
   you set `export const dynamicParams = false;` at the `[locale]` layout. **Set it** so an unknown
   locale does not silently render EN with a `/zh/` URL (an i18n correctness + SEO hazard).
3. **Static rendering + RSC:** the marketing pages are RSC (`07-ENGINEERING-CONSTRAINTS.md`). With
   `generateStaticParams` + `dynamicParams = false`, the build emits one HTML file per `(locale, route)`
   pair — no server compute per request, no locale-negotiation middleware.
4. **NO middleware** (verified: `src/middleware.ts` is absent today; `23-AUTH-EXPERIENCE.md` §0
   confirms). The project enforces auth via Server Components + the callback route, not middleware.
   Locale negotiation at Phase 1 is done by a **root `/` redirect** (a tiny route handler that reads
   the `locale` cookie, falls back to `Accept-Language`, and 302s to `/en/` or `/fil/`) — NOT by
   `next.config.js` i18n + middleware (that API is deprecated in the App Router anyway). This keeps
   the no-middleware posture intact.
5. **`next.config.ts` (not `.js/.mjs`):** the file is `next.config.ts` (verified). The Phase-1 patch
   does **not** need the legacy `i18n` config object (that is Pages Router). The App Router
   `[locale]` segment + `generateStaticParams` is the modern path; no `next.config.ts` change is
   required for the locale routing itself (the only `next.config.ts` edit at Phase 1 is adding `fil`
   to any allowlist, if one exists at that time — verify then).
6. **Sitemap:** at Phase 1, the sitemap (`13-SEO-AND-DISCOVERY.md` §4) emits one `<url>` per
   `(locale, route)` with the `xhtml:link` alternates (§4.1 below). The `x-default` stays the EN root.

#### 7.3.3 Why NOT subdomain

Subdomain (`fil.archestimator.com`) fragments link equity, requires per-subdomain analytics setup,
and complicates the cookie scope (the `locale` cookie would need `Domain=.archestimator.com` which
the workshop's existing cookies do not assume). Subpath keeps one domain, one cookie jar, one
sitemap. Recommendation recorded; the final call is L-I18N-1 at Phase 1.

### 7.4 Taglish / code-switching (for future user-generated content)

Filipino professional English is **Taglish-inflected in practice** — Filipino AEC professionals
code-switch fluidly between English technical terms (BOQ, DUPA, rebar, cement) and Filipino/Tagalog
connective words in the same sentence. This is the **lived register**, not a deficiency. Implications
for any future user-generated content (UGC) surface:

- **Do not "correct" Taglish in UGC.** If the product ever ships comments, estimates names, or
  shared-link notes (and it does — the shared-link receiver surface in `2026-06-20-Shared-Link-
  Feature` carries user text), the string fields must accept mixed-language input without validation
  errors or "unsupported character" warnings. The `normalizeWhitespace` /
  `toLocaleLowerCase("en-PH")` helpers in `src/lib/proposal-export/*.ts` are already locale-tolerant;
  preserve that.
- **Do not auto-translate UGC.** A Taglish estimate name translated to formal Filipino (or to EN) by
  an LLM loses the author's intent and can change the technical meaning. UGC stays in the language
  the user typed.
- **Marketing copy is a different surface.** When the marketing copy is translated to FIL at Phase 1,
  the translation should be **professional Filipino with AEC English loanwords intact** (the BOQ/DUPA
  terms stay in English) — not "pure" Filipino that strips the technical vocabulary the audience
  actually uses. This matches the §1 rationale (English is the professional register) and is a
  translation brief for the Phase-1 translator, captured in `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md`
  §5 (the bilingual workflow).
- **Analytics capture is anonymous.** If a future UGC field is analyzed for sentiment/topic, the
  language-mix is a property of the content, not a tag on the user. No new L-* gate here; this is a
  Phase-1+ translation + moderation brief, not a launch decision.

---

## 8. The lint + test mechanism (enforces §2 "no concatenated strings" + §4 "no peso literals")

The §2 copy-idiom rules are **enforceable**, not aspirational. Two mechanisms:

### 8.1 ESLint rule: no concatenated user-facing strings

A custom ESLint rule (or a focused `no-restricted-syntax` block in `eslint.config.mjs`, which is the
repo's ESLint entry — verified) flags any **string concatenation** (`+` with a string operand) or
template-literal **interpolation** outside an allow-listed formatter call, **in the landing
component tree** (`src/components/landing/**` + `src/app/[locale]/**` at Phase 1):

```js
// eslint.config.mjs — additive block (Phase 0 lands the EN-only version; Phase 1 extends the path glob)
{
  // "no-restricted-syntax" entries that flag:
  //  - BinaryExpression with `+` where either operand is a string literal in a landing component
  //  - TemplateLiteral with ${...} interpolation in a landing component that is NOT a known formatter
  // Allow-list: the §4.1 formatPHP/toLocaleDateString calls, the {{token}} placeholder substitution,
  // and the ICU MessageFormat calls.
}
```

**Why `no-restricted-syntax` and not a new rule:** it ships with ESLint core (already a dependency —
`eslint` ^9.39.4, verified in `package.json`), needs no new package, and the landing is small enough
that the allow-list stays short. The `lint` script is `eslint` (`package.json:16`); CI already runs
it. This rule lands at **Phase 0** (EN-only) so the discipline is enforced from day one, not
retro-fitted at Phase 1.

### 8.2 Vitest: no peso literals outside the token family

A unit test (added to the `16-TEST-AND-VERIFICATION-PLAN.md` suite) greps the landing component tree
for peso literals (`/₱\s*\d/` and `/PHP\s*\d/i`) and **fails** if any appear outside:

- the `formatPHP` formatter call (§4.1), or
- a `{{price_*}}` token definition (§4.2), or
- a comment.

This is the test that makes "no hardcoded pesos" a gate, not a guideline. It catches the §15 honesty
risk (an invented price leaking into copy) at PR time, not at sign-off time.

### 8.3 Cross-link to doc 20 §4

The Reviewer's voice + claims checklist in `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` §4 is the
**human** gate; the §8.1 lint + §8.2 test are the **machine** gate. Both run on every copy change.
The two layers are complementary: the lint catches structural violations (concatenation, peso
literals), the Reviewer catches semantic violations (an idiom that slipped through, a metaphor that
does not translate).

---

## 9. Cross-links

- `00-OVERVIEW.md` — the ratified keystone decisions (D-1 Glass Brand, D-2 auth, D-3 orange, D-4
  ClaimStatus, D-5 honest scoring); G-12 (SEO/i18n validation) maps to L-SEO-1 + L-I18N-1.
- `05-COPY-SKELETON.md` — the on-page copy; obeys §2 here (localization-friendly EN) and §4 here
  (the peso currency contract).
- `10-CANONICAL-DOC-MAP.md` — canonical filenames.
- `13-SEO-AND-DISCOVERY.md` — the hreflang rendering (§3 there) + the sitemap localization (§4 there)
  + the search-volume validation (§2.3 there). Owns `/login` + `/signup` `noindex,nofollow`.
- `15-FORMS-AND-ABUSE-GUARDRAILS.md` — the `/contact` + `/signup` form surfaces; the §6 step-3
  optional preferred-language field is a `/contact` form extension owned there.
- `16-TEST-AND-VERIFICATION-PLAN.md` — the §8.2 no-peso-literals test lives in this suite; the §8.1
  lint rule runs in the same CI lane.
- `17-ANALYTICS-AND-OBSERVABILITY.md` — the §5 anonymous-locale-signal capture (Accept-Language,
  /contact field) is an analytics event owned there.
- `20-CONTENT-WORKFLOW-AND-GOVERNANCE.md` — §4 (the Reviewer's voice + claims checklist, the human
  gate behind §2); §5 (the bilingual workflow at i18n Phase 1+ per §7 here).
- `23-AUTH-EXPERIENCE.md` — §5 (the landing→app handoff is locale-agnostic at EN-only); §7 (auth
  routes are `noindex,nofollow`, no hreflang).
- `LOOP_LEDGER.md` — L-I18N-1 (locale strategy), L-SEO-1 (search-volume validation), L-PRC-1 (the
  validated solo price that the `{{price_solo}}` token resolves to), L-FUN-1 (superseded route
  record), and L-FUN-2 (the `/signup` self-serve gate that the locale handoff is agnostic to).

---

## 10. ⚠️ Gated on / Open decisions

- **G — Locale strategy (L-I18N-1).** Ratify EN-only at launch (recommended). Also owns the Phase-1
  subpath-vs-subdomain call (recommendation: subpath `§7.3`) and the future numeric Phase-1 trigger
  (deferred to post-launch per §7.2).
- **G — Search-volume validation (L-SEO-1).** Confirms EN is the right launch locale; gates the
  Phase 1 trigger.
- **G — Validated solo price (L-PRC-1).** Closes before `{{price_solo}}` renders a number (§4.2);
  `/pricing` ships philosophy-only meanwhile.
- **O — ICU MessageFormat adoption (§2).** If adopted pre-launch, copy uses ICU strings from day one;
  if not, copy is written to migrate cleanly per §2 + enforced by §8.1. Either is fine; the §8.1 lint
  allow-list is shaped to accept either posture.
- **O — Phase-1 locale cookie vs param (§5).** Recommendation: first-party `locale` cookie (survives
  the OAuth round-trip; does not bloat URLs/sitemap). Decided at Phase 1, not launch.
- **O — Right-to-left (RTL) support.** Not in scope (PH + SEA languages are LTR); track only if/when
  an Arabic or Hebrew market opens. No visual-design consequence at launch (D-1 Glass Brand is
  LTR-shaped; an RTL adoption would be a new direction, not a locale flip).

**Resolved by this revision (no longer gates):**

- **Phase-1 trigger "≥50 PH signups" (prior §5)** — softened to a multi-signal conjunction (§7.2);
  the prior threshold had no source and violated D-5/§15.
- **Peso currency source-of-truth (prior §2 row "Numbers + currency as variables")** — pinned to the
  `en-PH` Intl formatter already used across the product (§4.1) + the `{{price_solo}}` token (§4.2),
  with a lint + test gate (§8).
- **App Router i18n shape (prior §5 "subpath or subdomain, deferred")** — the subpath `[locale]`
  segment + `generateStaticParams` + `dynamicParams = false` + no-middleware posture is now specified
  (§7.3) so the implementer does not rediscover the gotchas at Phase 1.

**No invented features, metrics, testimonials, prices, or partner names appear in this doc.** The
`{{price_solo}}` token is explicitly hypothesis-labeled and gated on L-PRC-1; no peso number is
rendered. Voice throughout = Controlled Confidence (MASTER §10). The locale decision does not change
the Glass Brand visual vocabulary (D-1), the orange token discipline (D-3), or the ClaimStatus type
(D-4) — localization is a string concern, not a design concern.
