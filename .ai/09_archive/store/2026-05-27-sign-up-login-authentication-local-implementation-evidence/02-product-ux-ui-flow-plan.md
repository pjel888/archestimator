# 02 - Product UX/UI Flow Plan

**Date:** 2026-05-27
**Scope:** sign-up, log-in, invitation, first-run onboarding, UI states, accessibility, internationalization
**Mode:** planning only
**Second-pass note:** this first-pass companion doc is supplemental only. The current canonical auth route is `/login`; `/signup` is non-canonical unless `README.md` and `11-second-pass-adversarial-review-and-blast-radius.md` are updated first.

## Experience Principle

The authentication experience should feel like a serious estimating product, not a generic SaaS splash screen. It should get a contractor or collaborator into the workshop quickly, explain the trust boundary clearly, and avoid every password-related flow until the product explicitly chooses to support passwords.

## Primary Jobs

1. **New contractor owner signs up**
   - Wants to create an Archestimator account quickly.
   - Uses Google if available.
   - Can use an email link if Google is not desired.
   - Lands in a first-run workspace/company setup flow.

2. **Existing user logs in**
   - Uses Google or email link.
   - Returns to the protected `next` path if valid.
   - Sees a generic recovery path if a link expires.

3. **Invited collaborator accepts access**
   - Opens invite email.
   - Authenticates with Google or email link.
   - Lands in the project/sheet they were invited to.
   - Understands their role: owner, admin, editor, or viewer.

4. **Corporate admin prepares the account**
   - Uses normal v1 auth initially.
   - Can later verify a domain, enforce invite-only access, require MFA for privileged roles, and configure SSO.

## Routes And Screens

### `/signup`

Purpose: explicit acquisition/sign-up intent from public marketing pages.

Recommended behavior:

- Render the same underlying auth component as `/login`, with sign-up-oriented heading and copy.
- Primary button: `Continue with Google`.
- Secondary section: `Email me a sign-in link`.
- No password field.
- Footer links:
  - `Privacy`
  - `Terms`
  - `Cookie Notice`
  - `Contact support`
- Legal copy:
  - "By continuing, you agree to the Terms and acknowledge the Privacy Notice."
  - Marketing email consent is a separate unchecked checkbox only if marketing emails are implemented.
- If a user is already authenticated, redirect to `/workshop`.

### `/login`

Purpose: returning-user entry and fallback for protected-route redirects.

Recommended behavior:

- Same component as `/signup`.
- Heading: `Log in to Archestimator`.
- Supporting copy: "Use Google or a secure email link. No password required."
- Preserve sanitized `next`.
- If `next` points to an invite/project path, include a small contextual line: "You will continue to the project after sign-in."
- If authenticated, redirect to the sanitized destination or `/workshop`.

### `/auth/callback`

Purpose: auth-code exchange and redirect continuation.

Recommended behavior:

- Stay a route handler.
- Keep the UI-free callback path.
- Exchange code, set cookies, then redirect.
- On failure, redirect to `/login` with generic error copy and an internal event id.

### `/workshop/onboarding`

Purpose: first-run owner setup after public sign-up.

Recommended first slice:

- Ask for company/workspace name.
- Optional display name confirmation.
- Optional country/region and default currency, if product needs it for estimating defaults.
- Do not ask for phone number, job title, team size, or billing data in v1.
- Create/update the default workspace and owner membership.
- Route to `/workshop` after completion.

### `/account/security` Later Surface

Purpose: corporate/security controls after the basic auth feature is stable.

Deferred controls:

- Active sessions list.
- Sign out all sessions.
- Linked identities.
- MFA enrollment.
- Domain and SSO status for admins.
- Download auth/audit events for enterprise accounts.

## UI Layout

Use a compact centered auth panel with the Archestimator brand visible in the first viewport. Avoid marketing hero composition. The auth surface is a utility route.

Recommended layout:

- Page background: neutral, calm, not gradient-heavy.
- Container: max width around current `360px`, responsive full-width on mobile.
- Header:
  - `Archestimator`
  - `Sign up` or `Log in`
  - One-line support copy.
- Actions:
  - Google button first, with a Google mark if asset licensing is handled correctly.
  - Divider labeled `Email link`.
  - Email input and send button.
- State panel:
  - Sent state.
  - Expired link state.
  - Rate-limited state.
  - Invite continuation state.
- Footer:
  - Terms/privacy/cookie/support links.

Follow the app/workshop design system for density: regular/medium weights, zero letter spacing, compact text, neutral color hierarchy, xs radius, and shared primitives. Auth pages can be slightly more spacious than dense worktables, but they should not become a landing page.

## Copy Rules

### Required

- Use "Google" and "email link", not "passwordless" as the main user-facing phrase.
- Make "No password required" explicit.
- Keep failures generic:
  - `We could not start sign-in. Try again or use the email link.`
  - `That link expired or was already used. Request a new sign-in link.`
- Keep sent state actionable:
  - `Check your email. The link works once and expires soon.`
- Keep invite context clear:
  - `After sign-in, you will continue to the project invitation.`

### Remove From Production UI

- Founder-specific copy such as CEO access assigned to a specific email.
- Any mention of service-role keys, dev auth bypass, Supabase internals, or platform role resolver.
- Raw provider error messages.
- Password reset, "forgot password", password requirements, or password strength copy.

## Flow Details

### Sign Up With Google

1. User clicks `Continue with Google`.
2. Server action starts Supabase Google OAuth.
3. Google handles consent and returns to Supabase/Auth callback.
4. App callback exchanges the code and creates the session.
5. Profile bootstrap runs.
6. If the user has a pending invitation, apply/resolve it and continue to the invited resource.
7. If no workspace exists, redirect to `/workshop/onboarding`.
8. Otherwise redirect to sanitized `next` or `/workshop`.

### Sign Up / Log In With Email Link

1. User enters email.
2. Server action sends Supabase OTP/magic link.
3. UI shows sent state without revealing whether the email was new or existing.
4. User clicks the email link.
5. Callback exchanges the code.
6. Profile/bootstrap/invite logic runs.
7. User lands on onboarding, invited project, or sanitized destination.

### Invited Collaborator

1. Manager sends invite from Teamspaces.
2. Email lands with project/account context and a secure link.
3. User authenticates with Google or email link.
4. On first auth user creation, pending invitation is associated.
5. App shows the project and a short role confirmation.

## Accessibility Requirements

- Every form control has a visible label.
- Error/sent states use `aria-live="polite"`.
- Buttons have stable dimensions and do not shift between loading/error states.
- Keyboard-only users can complete both flows.
- Focus moves to the state message after send/failure.
- Color is not the only signal for success/error.
- Use `autocomplete="email"` and correct input mode.
- Do not trap focus on the auth page.

## Internationalization Readiness

Do not translate the UI in the first implementation unless a full localization workflow is chosen. Build the auth component so it can be translated later:

- Keep all display strings centralized in a small auth copy object.
- Avoid string concatenation that breaks grammar.
- Do not hardcode country-specific compliance copy into the button text.
- Date/time expiry language should be relative and simple.
- Names should support non-English characters.
- Email normalization should lower-case email addresses but must not alter display names.
- Do not collect phone numbers or government IDs in v1.

## Privacy And Consent UX

Sign-up is not a marketing opt-in. The auth UI must separate:

- **Terms acceptance / privacy acknowledgment**: necessary to create and operate the account.
- **Marketing consent**: optional, separate, unchecked by default, and not required for service access.
- **Cookie consent**: only needed for non-essential analytics/marketing storage. Essential session cookies should be disclosed in the cookie notice, not hidden behind a banner.

## Edge States

- Expired magic link.
- Link already used.
- Invalid callback code.
- OAuth provider denied consent.
- Google account lacks verified email.
- Email provider delivery delay.
- Rate limit reached.
- Invite expired.
- Invite already accepted.
- Authenticated user opens `/login` or `/signup`.
- User opens protected route without session.
- User authenticates but has no workspace.
- User authenticates with email case differences.
- User has multiple providers tied to the same email.

## Non-Goals

- Password entry.
- Password reset.
- SMS OTP.
- Passkey enrollment.
- Usernames.
- Public user directory.
- Full account settings.
- Billing sign-up.
- SCIM.
- SAML SSO UI in the first implementation.
