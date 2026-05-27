# Product, UX, And UI Plan

**Status:** planning only
**Primary routes:** `/login`, optional `/sign-in`, optional `/sign-up`, `/auth/callback`
**Canonical route decision:** `/login` is the only MVP auth entry unless the plan is reopened.
**Product principle:** one passwordless entry point that feels polished enough for customers and simple enough for a startup to maintain.

## User Jobs

### First-time solo founder / contractor

The user wants to enter Archestimator quickly, probably from a landing page CTA, without thinking about account setup.

Success:

- clicks `Start free` or `Sign up`;
- chooses Google or email link;
- lands in `/workshop`;
- gets a default workspace without configuration friction;
- can create or open project work immediately.

### Returning user

The user wants to get back into an estimate or project.

Success:

- clicks `Log in`;
- uses the same Google or email-link flow;
- returns to the protected route originally requested through `next`;
- does not have to remember whether they "signed up" or "logged in."

### Invited collaborator

The user receives an invite from a project owner/admin.

Success:

- invite opens the auth flow if needed;
- auth preserves project/sheet destination;
- after auth, the app applies pending invitation state and lands on the invited project/sheet;
- if the invite is expired or revoked, the user gets a clear recovery path.

### Corporate lead

The user has a company domain and may later need SSO, ownership, audit logs, or account transfer.

Success now:

- can create a workspace normally;
- can invite coworkers;
- can manage project/sheet access;
- sees no fake enterprise promises.

Success later:

- can verify a domain, enforce provider policy, enable SSO, require MFA, manage directory users, and export audit logs.

## Route Strategy

### Recommended MVP Route Shape

- Keep `/login` as the canonical app route for now because it already exists and protects `/workshop`.
- Add `/sign-in` and `/sign-up` aliases only if landing-page IA needs separate CTAs.
- Both aliases should render or redirect to the same passwordless auth entry, with a mode hint:
  - `/sign-up` -> `/login?mode=signup`
  - `/sign-in` -> `/login?mode=signin`
- Do not build separate sign-up and login forms. Passwordless auth makes that distinction mostly copy and intent, not a separate system.
- Do not implement `/signup`; that spelling exists only in older companion docs and is not current authority.

### Auth Route Contract

| Route | MVP Behavior | Notes |
| --- | --- | --- |
| `/login` | Render unified auth entry. | `mode=signup` and `mode=signin` alter copy only. |
| `/auth/callback` | Exchange Supabase code, map errors, route to safe destination. | Never display raw provider errors. |
| `/sign-in` | Optional alias. | Redirect/render `/login?mode=signin`; add to proxy auth routes if built. |
| `/sign-up` | Optional alias. | Redirect/render `/login?mode=signup`; add to proxy auth routes if built. |
| `/signup` | Do not build in MVP. | Reopen route IA if this spelling is desired later. |

### Why Unified Is Better

- No password reset surface.
- No duplicate validation paths.
- No confusion around whether email magic link creates an account.
- Easier compliance copy because the user has one account-entry moment.
- Better invite handling because sign-up/log-in both resolve through the same callback.

## Auth Page Information Architecture

The page should have five regions:

1. **Brand and context**
   - Product name.
   - Short signed-out value statement.
   - Optional route context: `Continue to Lewis Residence estimate` if safe to display.

2. **Primary action**
   - `Continue with Google`.
   - Icon button style may use Google mark if licensing/brand guidelines are followed.
   - If no official Google mark asset is included, use text-only with a neutral icon or no icon.

3. **Fallback action**
   - Email field.
   - Button: `Send sign-in link`.
   - Copy: `No password required. We will email a one-time link.`

4. **Trust/legal footer**
   - `By continuing, you agree to the Terms and acknowledge the Privacy Notice.`
   - Links to `/terms` and `/privacy` or temporary public docs if routes are not built yet.
   - If analytics cookies are added later, add `Cookie Notice` and consent controls.

5. **Operational support**
   - resend state;
   - expired link state;
   - invalid/blocked domain state;
   - contact support link;
   - invite-specific recovery state.

## Auth State Matrix

| State | Visible Copy/Surface | CTA | Recovery | Notes |
| --- | --- | --- | --- | --- |
| Default signed-out | `Sign in to Archestimator`; Google first; email fallback. | `Continue with Google`, `Send sign-in link`. | Switch provider. | Same surface handles sign-up and sign-in. |
| `mode=signup` | `Create your Archestimator account`. | Same CTAs. | Switch provider. | Must still say no password required. |
| Submitting email | Email button loading, stable size. | Disabled while pending. | None until result. | Prevent duplicate clicks. |
| Email sent | `Check your email for a one-time sign-in link.` | `Resend link` after cooldown. | `Use another email`, Google fallback. | Enumeration-safe. |
| Email rate-limited | Generic cooldown message. | Wait or use Google. | Support link. | Do not reveal backend limits. |
| Link expired/used | Link no longer works. | Request new link. | Support link. | One-time link behavior. |
| Link opens on another browser/device | Continue if callback succeeds. | Request a new link if state cannot be recovered. | Change email/resend. | Invite and `next` state must be URL/server-backed, not localStorage-only. |
| Google canceled | Google sign-in was not completed. | Try again. | Email fallback. | No scary error. |
| Google unverified/disallowed email | This Google account cannot be used here yet. | Use invited email/support. | Reissue invite. | Only after provider email verification is checked. |
| Callback failure | Generic recoverable error. | Try again. | Support link with event id if available. | No raw Supabase/provider string. |
| Signed-in user visits auth route | Redirect to safe destination. | None. | None. | Unsafe `next` falls back to `/workshop`. |
| Invite pending | Sign in to accept project invite. | Authenticate. | Decline/request invite. | Show only safe project/workspace context. |
| Invite wrong email | Invite was sent to another email. | Switch account. | Ask inviter to resend. | Never grant mismatched email. |
| Invite expired/revoked | Invite is unavailable. | Request new invite. | Return to workspace/login. | Idempotent no-access state. |

## UI Requirements

Follow the non-landing app design system:

- SF Pro/system stack.
- Compact product UI.
- Visible app text at or below `12px`.
- Regular/medium weights.
- zero letter spacing.
- neutral color rhythm.
- `rounded-xs`.
- shared UI primitives first.
- no marketing-card hero treatment inside the app login.

The auth page should feel quieter and more secure than the public landing page. Avoid oversized SaaS hero patterns. The user is trying to get into work.

## Proposed Screen States

### Default

Primary content:

- Heading: `Sign in to Archestimator`
- Subcopy: `Use Google or get a one-time link by email. No password required.`
- Primary button: `Continue with Google`
- Divider: `or`
- Email input.
- Secondary submit: `Send sign-in link`.

If `mode=signup`:

- Heading can become `Create your Archestimator account`.
- Body remains clear that the same passwordless methods apply.

If `mode=signin`:

- Heading can remain `Sign in to Archestimator`.

### Email Submitted

Show neutral success:

- `Check your email for a one-time sign-in link.`
- If showing the email, show only the submitted value after the user entered it. Do not expose whether that account already exists.
- Add `Resend link` only after a visible cooldown.

### Google OAuth Failure

Show stable classes, not raw provider internals:

- `Google sign-in could not start. Try again or use email link.`
- `This Google account cannot be used here yet.` for domain/allowlist policy later.

### Callback Failure

Cases:

- missing code;
- expired link;
- already used link;
- provider denied access;
- redirect destination rejected;
- invite expired/revoked;
- account disabled/deactivated.

Copy should be recoverable and support-oriented, not stack-error oriented.

### Invite Acceptance

If the auth link is reached from an invite:

- signed-out screen should say `Sign in to accept the project invite`.
- after callback, land on the project route when current invite URLs support it.
- estimate-sheet-specific destinations are a future improvement unless invite URLs start carrying sheet route state.
- if the user uses a different email from the invited email, show `This invite was sent to another email address` and offer to request a new invite.
- if already signed in as the wrong user, provide a switch-account/sign-out path before accepting.
- if the invite was revoked after auth started, show a no-access state and do not create membership.
- invite state must be recoverable when the email link opens in a different browser or on mobile.

### First Workspace Bootstrap

After first auth:

- current repo behavior creates a default workspace when protected workspace data loads and `profile.default_workspace_id` is missing.
- display a short first-run intake step before dropping self-serve users into the workspace.
- collect enough first-party data to understand the user and configure the workspace, without turning auth into a long sales form.
- Do not block first-use with enterprise settings, billing setup, SSO setup, or procurement questions.
- If the product later wants invited users to skip personal workspace creation, that requires an explicit workspace-bootstrap refactor and tests.

### First-Run Intake Form

This should happen **after** Google/email authentication, not before. The signed-out auth screen stays lean; the intake screen is the first authenticated setup step.

Required MVP fields:

- `Display name`
  - Pre-fill from Google/profile metadata when available.
  - Let the user edit it.
- `Organization / workspace name`
  - Label should allow solo users: `Company, studio, school, or workspace name`.
  - Default suggestion can be `{First name}'s Workspace` only as a fallback, not the desired final data.
- `I am a...`
  - Options: `Contractor / builder`, `Estimator / QS`, `Architect / designer`, `Engineer`, `Project manager`, `Supplier / manufacturer`, `Student`, `Educator`, `Owner / founder`, `Other`.
  - Store this as a product/user category, not as an authorization role.
- `Organization type`
  - Options: `Solo practice`, `Construction company`, `Architecture / design firm`, `Engineering firm`, `Developer / owner`, `Supplier / manufacturer`, `School / university`, `Student project`, `Other`.
- `Country / region`
  - Used for currency, locale, compliance posture, and support prioritization.

Optional MVP fields:

- `Primary use`
  - Options: `Cost estimating`, `BOQ / quantity takeoff`, `Proposal export`, `Component price library`, `Team collaboration`, `Learning / class project`, `Exploring`.
- `Company size`
  - Options: `Just me`, `2-10`, `11-50`, `51-200`, `200+`.
- `Default currency`
  - Preselect from country/region where possible.
- `Marketing consent`
  - Separate unchecked opt-in only. Never bundle with Terms/Privacy acknowledgement.

Do not collect in MVP:

- phone number;
- full mailing address;
- government IDs;
- payment card data;
- date of birth, unless a legal age gate is explicitly approved later;
- sensitive personal data;
- procurement/security questionnaires.

Intake UX rules:

- Keep it to one compact authenticated screen.
- Use dropdown/segmented options for category fields so analytics are clean.
- Include `Skip optional details` only for optional fields, not for required workspace/profile basics.
- Explain why the data is being asked in short operational copy: configuring workspace defaults, support, templates, and product prioritization.
- Do not show compliance or enterprise claims on this screen.
- Invited collaborators should see a lighter path: confirm display name and continue to the invited resource unless they are creating a new workspace.

### Settings Edit Path

Every first-run intake field must have an authenticated edit path after onboarding. Users should not be trapped with incorrect setup data.

Recommended MVP settings routes:

- `/workshop/settings/profile`
  - display name;
  - user category/profession;
  - primary use;
  - student/educator detail;
  - marketing consent preference if implemented.
- `/workshop/settings/workspace`
  - organization/workspace name;
  - organization type;
  - country/region;
  - default currency;
  - company size.

Settings UX rules:

- A user can edit their own profile/intake fields.
- Workspace owners/admins can edit workspace/organization fields.
- Non-owner collaborators can see workspace name/type only where useful, but cannot edit organization settings.
- Edits should be audited when they affect workspace identity, default currency, legal acknowledgement, marketing consent, or future corporate policy.
- Fields must remain correction/export/delete capable for privacy rights workflows.
- Settings should use the same labels/options as onboarding so analytics and support data do not drift.

### Onboarding State Machine

| User Type | Workspace State | Destination | Required Handling |
| --- | --- | --- | --- |
| Self-serve new user | No workspace | Create default workspace, then `/workshop`. | Keep onboarding minimal. |
| Self-serve new user | No workspace and intake incomplete | Authenticated first-run intake, then `/workshop`. | Collect required profile/workspace fields once. |
| Invited new user | Pending project invite | Apply invite via auth trigger/post-auth checks, then project route if available. | Do not force organization setup unless the user creates a workspace. |
| Returning user | Existing default workspace | Safe `next` or `/workshop`. | Respect sanitized destination. |
| Existing user with no workspace | Missing/default broken | Create or recover default workspace. | Show recoverable error if bootstrap fails. |
| Abandoned onboarding | Profile exists, workspace may exist | Resume `/workshop` or workspace setup. | Avoid duplicate workspace creation. |
| Disabled/deactivated user | Membership disabled | Account unavailable state. | Sign out/support path. |

## Accessibility Requirements

- Email input has a visible label.
- Email errors use `aria-describedby`.
- Error/success states use `aria-live`.
- OAuth and email buttons are reachable by keyboard.
- Loading/submitting states keep button dimensions stable.
- Focus indicators are visible at desktop and mobile sizes.
- Loading text is screen-reader safe and does not repeat endlessly.
- Color is never the only indicator of error/success.
- Focus returns to the first actionable field after errors.
- The callback loading state must not trap users indefinitely.

## Mobile Requirements

- Single-column layout.
- Buttons have at least comfortable touch height.
- The email input does not zoom on mobile.
- Success/error text wraps without layout shift.
- Legal links remain tappable without crowding.
- Layout remains usable with the software keyboard open.
- Legal/support actions cannot fall below an unreachable viewport area.

## Copy Rules

Use:

- `Sign in`
- `Create account`
- `Continue with Google`
- `Send sign-in link`
- `No password required`
- `Check your email`

Avoid:

- `magic link` as the primary customer-facing term unless secondary copy explains it;
- `CEO access`;
- `platform admin`;
- raw Supabase/provider error strings;
- compliance claims like `GDPR compliant` before legal review.

## Non-Goals

- Password fields.
- Password reset.
- SMS login.
- Multi-provider social login beyond Google.
- Passkeys in the first slice.
- Enterprise SSO UI in the first slice.
- A full enterprise/admin settings console. Basic profile and workspace settings for onboarding-field correction are required.

## UX Acceptance Criteria

- A new user can enter through Google or email link without password creation.
- A returning user can enter through the same screen without confusion.
- An invited user can authenticate and continue to the invited route.
- A self-serve user can correct onboarding profile/workspace data later from settings.
- Errors are clear, recoverable, and do not leak sensitive internals.
- The UI matches the compact app design system.
- Public legal links are present before production launch.
