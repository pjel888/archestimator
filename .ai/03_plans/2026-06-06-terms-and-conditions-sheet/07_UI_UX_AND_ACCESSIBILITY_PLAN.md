# UI, UX, and Accessibility Plan

## User journey

### New invited user

1. User opens `/login` and sees Terms/Privacy links.
2. User authenticates with Google or email magic link.
3. Closed-beta allowlist gate runs.
4. If current Terms not accepted, user sees acceptance page/sheet before protected workshop.
5. User opens Terms/Privacy links, reviews version/effective date, affirms responsibility to verify outputs, accepts.
6. Server persists acceptance and redirects to intended protected destination.

### Returning accepted user

1. User signs in or opens `/workshop`.
2. Acceptance status check confirms current version.
3. User proceeds without repeated prompt.

### Existing user after material Terms update

1. User opens protected app.
2. Re-acceptance banner/interstitial explains Terms changed.
3. User can read full Terms/Privacy and accept new version.
4. Old acceptance remains in history; new acceptance records context `reacceptance`.

## Screen/component impact

| Surface | Recommendation |
| --- | --- |
| `/terms` | Public, canonical Terms page with version/effective date, legal review status, Privacy link, no final unreviewed legal claims. |
| `/privacy` | Public Privacy Notice/Policy with version/effective date if linked to Terms acceptance. |
| `/login` | Keep notice links; optional explicit pre-auth checkbox only as supplemental because persistence must happen post-auth. |
| Post-auth gate | Prefer page/interstitial inside protected app boundary for first implementation; avoid hiding long legal text inside cramped modal if full content must be read. |
| Account/settings | Add legal card/status: current accepted version, accepted date, links to Terms/Privacy, support/legal contact. |
| Future checkout | Require Terms acceptance immediately before recurring billing consent if billing is later introduced. |

## Modal/sheet/page decision

- **Recommended first implementation:** page/interstitial or full-height sheet after auth. It is simpler for long legal content, accessibility, and mobile.
- **Modal/sheet acceptable if:** focus trap, escape/close policy, scroll area, sticky accept/decline controls, and Terms link are accessible.
- **Avoid:** tiny scroll box with hidden terms and unclear decline behavior; passive footer-only browsewrap as the binding mechanism.

## Empty/loading/error/success states

- Loading: “Checking legal acceptance...” with compact skeleton/spinner using shared primitives.
- Missing acceptance: show Terms version/effective date and actions.
- Save pending: button disabled with spinner; prevent double-submit.
- Save error: explain acceptance could not be saved, offer retry and support contact, do not expose DB details.
- Success: redirect to intended destination; optional toast/banner.
- Old version: explain updated Terms require re-acceptance, with effective date and changed-section summary if available.

## Responsive behavior

- Desktop: compact centered panel or right-sized sheet; keep long Terms readable with max width and scroll.
- Mobile: full-page or full-screen sheet preferred; sticky action footer, no horizontal overflow.
- Public Terms page: readable line length; headings remain within design scale if app/workshop context; landing/public shell may have broader landing allowances but legal text should remain calm/readable.

## Keyboard/focus behavior

- Tab order: heading -> summary -> Terms link -> Privacy link -> checkbox -> accept -> decline/sign out/help.
- Focus visible on all interactive elements.
- Modal/sheet focus trap if used, initial focus on heading or first actionable control, return focus after close.
- Enter/Space activates checkbox/button correctly.
- Escape behavior must not bypass required acceptance into protected app.

## Accessibility checks

- Accessible names for checkbox/button/links.
- Error messages announced with `aria-live` or associated descriptions.
- Color contrast passes for neutral text and links.
- Long legal content has semantic headings.
- Acceptance summary is concise but does not replace full Terms.
- Print/save stable URL available for full Terms.

## Copy/content requirements

Acceptance UI must include clear non-final/legal-reviewed copy such as:

- User is accepting Terms version `[version]`, effective `[date]`.
- ArchEstimator is a software tool only.
- ArchEstimator is not a licensed professional, contractor, estimator-of-record, architect-of-record, engineer-of-record, quantity surveyor, financial adviser, legal adviser, or construction authority.
- Users remain responsible for reviewing, verifying, approving, and using estimates, assumptions, outputs, reports, templates, calculations, material quantities, pricing guidance, schedules, design-support information, recommendations, exports, and project decisions.
- User must review local codes, regulations, permitting, supplier/labor pricing, taxes, site conditions, and project-specific requirements with qualified professionals where needed.
- Final binding wording must match lawyer-approved Terms, not ad hoc UI copy.

## Design-system alignment

- Follow `DESIGN.md` for non-landing app/workshop UI:
  - SF Pro stack.
  - Regular/medium weights only.
  - 12px maximum visible app/workshop text unless explicitly approved.
  - Normal controls/body/table/input/button around 10px.
  - Labels/meta/helper around 8-9px.
  - Zero letter spacing.
  - `xs` / 3px radius only.
  - Phosphor regular outline icon style.
  - Reuse `src/components/ui` and `src/components/workshop` primitives before local controls.
  - Design-system lint failures are blocking.

## UX recommendations

- Terms link in signup/login: keep existing login links but do not rely on them as sole binding acceptance.
- Terms link in footer/account/settings: add settings card/status for authenticated users; retain public/legal route links.
- Scrollable content: use page or full-height sheet; avoid tiny hidden scroll boxes.
- Disabled accept button: use only when legally/product-wise required affirmation checkbox is unchecked; do not force full scroll-to-bottom unless counsel requires it.
- Checkbox language: “I have read and agree to the ArchEstimator Terms of Service version X, and I understand I remain responsible for independently reviewing all outputs.” Counsel should approve final text.
- Re-acceptance: use banner/interstitial with changed-effective-date explanation.
- Error recovery: retry/save again, sign out, support contact.
- Print/download/copy: stable `/terms` URL; optional print CSS later.
