# Issue Definition -- UX-001 Public Copy And Legal Readiness

Date: 2026-06-23

---

## What Is Wrong

Public marketing and pricing copy on the Archestimator site can drift ahead of implemented closed-beta capability. A visitor may read a claim on `/`, `/features`, `/pricing`, or `/about` that describes a feature as available, when in reality that feature is still in a "Building" or "Planned" state. This creates an expectation mismatch that erodes trust during the closed-beta period, when the brand promise is radical honesty.

The current site already uses a ClaimsLedger (`src/components/landing/claims-ledger/ClaimsLedger.tsx`) on `/features`, but the remaining public routes do not enforce the same maturity-label discipline. Copy in `src/components/landing/FeaturesSection.tsx`, `src/components/landing/PricingSection.tsx`, `src/components/landing/FAQSection.tsx`, and the `src/app/about/page.tsx` and `src/app/pricing/page.tsx` route files can become stale when the canonical feature-status spreadsheet changes.

---

## Who Is Affected

1. **Anonymous visitors** who land on `/`, `/features`, `/pricing`, `/about`, or `/contact` and form an impression of what the product can do today.
2. **Prospective beta users** who request access based on feature claims that may not yet be implemented.
3. **The brand** -- radical honesty is a core posture; drifted copy directly contradicts the "You never start from zero again" promise.
4. **Support and operations** -- if public copy overclaims, beta feedback and support volume will include disappointed users who expected features that do not exist.

---

## Current Behavior

- `src/components/landing/FeaturesSection.tsx` (lines 4-55) lists five feature blocks with titles like "Structured Estimate Tabs", "Reusable Catalog", "Traceable Revisions", "Proposal Comparisons", and "Spreadsheet And Document Handoff". Each block contains card-level copy that does not carry a maturity label. A visitor cannot tell which cards describe Live features and which describe Planned ones.
- `src/components/landing/PricingSection.tsx` (lines 7-51) frames pricing as "Closed beta partnership" and states "Payment, checkout, and public plans are deferred until after beta" (line 25), but there is no visual status pill or maturity tag reinforcing this.
- `src/components/landing/FAQSection.tsx` (lines 27-40) answers "Can I import my existing Excel quote sheets?" with "Direct Excel importing is not yet supported, and spreadsheet/document handoff remains a planned workflow" (line 34-35). This is honest, but it is the only FAQ answer that names a status; the others do not.
- `src/app/about/page.tsx` (lines 168-175) lists `LIMITATIONS` including "Pre-launch MVP, not production-hardened enterprise SaaS" and "AI is on the roadmap, not in the product today." These are honest, but they are static arrays with no connection to the canonical claims data in `src/components/landing/claims-ledger/claims-data.ts`.
- `src/app/pricing/page.tsx` (lines 168-188) defines `NEVER_METERED`, `TIER_SHAPE`, and `VALIDATION` arrays. The tier shape includes "Pro" and "Team" tiers whose feature descriptions (lines 176-179) are not validated against the canonical CSV.
- `src/components/landing/claims-ledger/claims-data.ts` (lines 39-215) is the single canonical source for feature claims, with `ClaimStatus` typed as `"Live" | "Building" | "Planned" | "NotUs"`. This data drives `/features` but is not consumed by `/`, `/pricing`, `/about`, or `/contact`.

---

## Expected Behavior

Every public route that makes a feature claim must either:

1. Consume the canonical claims data from `src/components/landing/claims-ledger/claims-data.ts`, or
2. Carry an explicit maturity label inline (e.g., a `StatusPill` or `MaturityTag`) that is kept in sync with the canonical CSV, or
3. Be covered by a text-contract test that fails when the claim wording drifts from the canonical source.

No public page should promise a feature without a visible status that matches the canonical spreadsheet.

---

## Evidence

### Audit evidence

- [`ux-logistical-errors-and-fixes.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md) line 9: "Public marketing or pricing copy can drift ahead of implemented closed-beta capability."
- [`02-implementation-decomposition.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md) line 22: IU-01 maps UX-001 to "Public copy and legal readiness" with scope posture "Copy/state hardening".
- [`04-ux-state-accessibility-and-content-contracts.md`](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/04-ux-state-accessibility-and-content-contracts.md) line 9: "Copy must separate implemented, beta, and planned capability."

### Codebase evidence (real src/ paths)

1. `src/components/landing/FeaturesSection.tsx` lines 4-55 -- feature blocks without maturity labels.
2. `src/components/landing/PricingSection.tsx` lines 7-51 -- pricing copy without a status pill.
3. `src/components/landing/FAQSection.tsx` lines 27-40 -- FAQ answers with inconsistent status naming.
4. `src/app/about/page.tsx` lines 168-175 -- static `LIMITATIONS` array not bound to canonical data.
5. `src/app/pricing/page.tsx` lines 168-188 -- static `TIER_SHAPE` and `VALIDATION` arrays not bound to canonical data.
6. `src/components/landing/claims-ledger/claims-data.ts` lines 39-215 -- canonical `CLAIM_GROUPS` that are authoritative but under-consumed.
7. `tests/vitest/closed-beta-pricing-copy.test.ts` lines 1-50 -- existing text-contract test that reads `src/app/pricing/page.tsx` and `src/components/landing/PricingSection.tsx`, but does not enforce maturity-label presence.

---

## Severity Rationale

Severity is **Medium** because:

- The risk is trust erosion, not data loss or security breach.
- The site already has honest copy in many places (FAQ, about limitations, pricing philosophy).
- The ClaimsLedger on `/features` already demonstrates the correct pattern.
- However, a single overclaim on `/` or `/pricing` during closed-beta recruitment can generate unqualified leads and support debt.
- The fix is low-blast-radius copy hardening; no migration or RLS change is required.

---

## Linkage To Canonical CSV Rows

The canonical spreadsheet `canonical-feature-status.csv` contains rows where this surfaces:

- Rows describing "public site", "landing page", "pricing page", and "features page" coverage classes.
- Rows with coverage class "public route inventory" and evidence status "related tests exist" but not "browser-verified" or "provider-verified".
- Rows where the targeted verification is `TV-PUBLIC` and the external proof needed is "browser check on public routes".

The CSV row for UX-001 specifically ties to:
- **Persona group:** Anonymous Visitor
- **Coverage class:** Public site
- **Evidence status:** Related tests exist (landing/public tests)
- **Targeted verification:** `TV-PUBLIC`
- **External proof needed:** Browser check on `/`, `/features`, `/pricing`, `/contact`

---

## Post-Fix Scenario

A visitor sees implemented, beta, and planned claims clearly separated. Every feature claim on every public route carries a visible maturity label or is bound to the canonical claims data. The `tests/vitest/closed-beta-pricing-copy.test.ts` suite is expanded to enforce that no public page drifts from the canonical CSV.
