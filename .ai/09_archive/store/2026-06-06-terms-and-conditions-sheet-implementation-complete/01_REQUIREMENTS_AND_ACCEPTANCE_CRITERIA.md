# Requirements and Acceptance Criteria

> This document defines implementation requirements only. It does not draft final legal language and does not provide legal advice.

## Requirement priorities

- `MUST` — required for implementation readiness and safe launch.
- `SHOULD` — strongly recommended for legal/product robustness.
- `COULD` — useful enhancement that can follow once the core gate is stable.
- `OUT_OF_SCOPE` — explicitly excluded from this feature or docs-only task.

## Functional requirements

| ID | Priority | Requirement | Repo evidence / rationale | Pass/fail acceptance criterion |
| --- | --- | --- | --- | --- |
| FR-001 | MUST | Provide a Terms of Service / Terms and Conditions page or sheet available without authentication. | `/terms` is public in `src/proxy.ts:10` and exists at `src/app/terms/page.tsx`. | PASS if `/terms` renders current version, effective date, legal-review status, and Privacy link without requiring auth. |
| FR-002 | MUST | Preserve a Privacy Policy / Privacy Notice link dependency wherever Terms acceptance is requested. | `/privacy` exists and is public; login already links both at `src/app/login/page.tsx:77-86`. | PASS if acceptance UI links both Terms and Privacy and both are keyboard-accessible. |
| FR-003 | MUST | Show Terms version identifier and effective date in Terms UI and acceptance UI. | Current Terms only has a last-updated string at `terms/page.tsx:60-61`; no versioned acceptance. | PASS if every acceptance record can be tied to exactly one version/effective date/hash. |
| FR-004 | MUST | Require explicit affirmative acceptance for the legally binding flow, not only passive continued-use copy. | EFF research favors affirmative clickwrap over browsewrap. Login copy is currently continued-use notice only. | PASS if future acceptance requires a checkbox/button or equivalent affirmative action before protected app use or checkout, as chosen by legal/product. |
| FR-005 | MUST | Persist acceptance timestamp, accepted Terms version, accepting user id, and acceptance context. | Supabase Auth user id is available through server clients; `account_security_events` shows server-side audit patterns. | PASS if DB rows contain user id, version, `accepted_at`, context, and immutable created timestamp. |
| FR-006 | SHOULD | Store optional IP/user-agent evidence only if privacy-appropriate; prefer hashed/minimized metadata. | `account-audit.ts:41-56` already hashes IP/user-agent; FTC/ICO guidance treats minimization and online identifiers as privacy concerns. | PASS if the plan/legal decision documents raw vs hashed vs omitted IP/UA and implementation matches it. |
| FR-007 | MUST | Detect whether the current authenticated user has accepted the required Terms version. | Protected user context uses `getCurrentUserContext()` in `src/lib/auth/session.ts`. | PASS if users who accepted current version are not repeatedly blocked. |
| FR-008 | MUST | Support material-change re-acceptance when required Terms version changes. | Current `/terms` copy can change but no acceptance tracking exists. | PASS if old-version acceptance triggers re-acceptance under the configured material-change policy. |
| FR-009 | MUST | Decide and implement blocking vs non-blocking behavior for existing users after Terms updates. | Closed beta has known users; all-user lockout risk is material. | PASS if existing-user behavior is explicit: immediate hard gate, grace banner, or role/phase feature flag with documented risk. |
| FR-010 | MUST | Keep legal routes exempt from auth/Terms loops. | `src/proxy.ts:10` exempts `/privacy`, `/terms`, `/invite`, `/share`, `/beta`; threat model flags redirect loops. | PASS if `/terms`, `/privacy`, `/login`, `/auth/callback`, `/beta/access-required`, `/invite`, `/share`, and static assets remain reachable. |
| FR-011 | SHOULD | Add account/settings legal surface showing accepted version and link to current Terms. | Settings routes exist at `src/app/workshop/settings/*`. | PASS if authenticated user can find current Terms/Privacy and current acceptance state from account/settings. |
| FR-012 | SHOULD | Provide admin/support/legal evidence retrieval for a user's acceptance history without exposing records to other users. | Existing admin patterns include platform-admin settings and server-owned audits. | PASS if support/legal retrieval is server-only or admin-scoped and user RLS cannot enumerate others. |
| FR-013 | MUST | If billing/subscription is introduced later, require Terms acceptance before checkout/payment and include cancellation/refund/tax/renewal disclosures. | Current closed beta has no Stripe/checkout/subscription; future billing is deferred. FTC recurring-subscription guidance requires consent proof and easy cancellation. | PASS if billing remains marked N/A now, and future billing cannot launch without Terms acceptance at checkout and billing-policy copy. |
| FR-014 | MUST | Include clear user-facing statement that estimates/outputs must be independently reviewed. | `terms/page.tsx:43-46` already disclaims estimate accuracy. User requested stronger posture. | PASS if Terms content and acceptance summary say users remain responsible for review, verification, approval, and use of all outputs. |

## Non-functional requirements

| ID | Priority | Requirement | Acceptance criterion |
| --- | --- | --- | --- |
| NFR-001 | MUST | No production source changes in this planning task. | Only `.ai` docs are changed by this commit. |
| NFR-002 | MUST | Implementation must be idempotent for duplicate clicks/retries. | Duplicate acceptance attempts for same user/version do not create ambiguous records or errors visible as app failure. |
| NFR-003 | MUST | Acceptance gate must fail safely without exposing protected project data. | If acceptance status cannot be read, protected app data does not render; user gets a recoverable error or retry path. |
| NFR-004 | SHOULD | Acceptance status read should be low latency and not added to slow proxy hot path unless necessary. | Acceptance check is in a protected server boundary/cacheable per-request helper, not a slow broad DB query inside proxy unless measured and justified. |
| NFR-005 | SHOULD | Acceptance evidence should be append-only for auditability. | New version acceptance creates history; old rows are not overwritten except possibly metadata backfill under explicit legal decision. |

## UX/UI requirements

| ID | Priority | Requirement | Acceptance criterion |
| --- | --- | --- | --- |
| UX-001 | MUST | Terms link appears on login/signup entry and legal acceptance flow. | Keyboard and screen-reader users can reach links before accepting. |
| UX-002 | MUST | Acceptance UI states include loading, error, disabled/pending, success, and retry. | Save failure does not silently proceed or trap the user. |
| UX-003 | MUST | Long Terms content is readable and scrollable without hiding decline/cancel/help paths. | Modal/sheet uses focus management; page flow avoids scroll traps. |
| UX-004 | MUST | App/workshop UI follows `DESIGN.md` constraints. | `bun run lint:design-system` passes for app/workshop UI changes. |
| UX-005 | SHOULD | Re-acceptance uses a banner or interstitial sheet explaining the update and links to changed Terms. | Existing users can understand why acceptance is requested. |

## Security requirements

| ID | Priority | Requirement | Acceptance criterion |
| --- | --- | --- | --- |
| SEC-001 | MUST | RLS prevents one user from reading/writing another user's acceptance records. | RLS denial tests pass for cross-user select/insert/update. |
| SEC-002 | MUST | Server derives `user_id`, `accepted_at`, required version, and sensitive metadata where feasible. | Browser cannot forge another user/version/time/IP/UA. |
| SEC-003 | MUST | Do not expose service-role key to browser; service-role use only server-only and bounded if admin retrieval is needed. | Static review and tests find no service-role public-client path. |
| SEC-004 | MUST | Never touch archestimator resources. | Supabase project reference remains ArchEstimator `ebxxqidacheyapmmzavr`. |
| SEC-005 | SHOULD | Hash or omit IP/user-agent unless legal/privacy review says raw is required. | Privacy impact decision is documented and implemented. |

## Performance requirements

| ID | Priority | Requirement | Acceptance criterion |
| --- | --- | --- | --- |
| PERF-001 | MUST | Acceptance check must not add broad N+1 queries to workshop/project pages. | One bounded query or server helper per authenticated request; no route-wide fanout. |
| PERF-002 | SHOULD | Terms page can be mostly static while still showing current version metadata. | Terms rendering does not require unnecessary DB query for every public visitor. |
| PERF-003 | SHOULD | Re-acceptance gate should not block public marketing/legal pages. | Public routes keep existing cache-control/public access behavior. |

## Data/migration requirements

| ID | Priority | Requirement | Acceptance criterion |
| --- | --- | --- | --- |
| DATA-001 | MUST | Add acceptance persistence if Terms are enforced beyond passive notice. | Migration creates required tables/RLS/grants/types and tests prove insert/select paths. |
| DATA-002 | MUST | Store only data necessary to prove acceptance and meet legal/business need. | Schema excludes raw provider payloads and unnecessary tracking fields. |
| DATA-003 | SHOULD | Store Terms content hash or immutable version metadata. | Evidence can prove which reviewed copy a user accepted even after future copy changes. |
| DATA-004 | MUST | Generated Supabase types updated if migration changes schema. | `src/lib/supabase/types.ts` matches migration after repo-approved type command. |
| DATA-005 | MUST | Supabase Data API grants are explicit where needed. | Migration includes grants and RLS as a unit, per 2026 Supabase changelog. |

## Accessibility requirements

| ID | Priority | Requirement | Acceptance criterion |
| --- | --- | --- | --- |
| A11Y-001 | MUST | Acceptance flow supports keyboard-only use. | Tab order reaches Terms/Privacy links, checkbox/button, error/retry controls. |
| A11Y-002 | MUST | Modal/sheet has focus trap and visible focus if used. | DOM/E2E test or manual QA confirms focus remains within modal and restores after close. |
| A11Y-003 | MUST | Copy is readable at repo-approved sizes and has sufficient contrast. | Design-system lint and manual contrast review pass. |
| A11Y-004 | SHOULD | Users can print/save/copy Terms link. | Terms page exposes a stable URL and optional print-friendly layout. |

## Compatibility requirements

- Preserve current closed-beta allowlist behavior.
- Preserve `/share/[token]` public-recipient behavior unless product/legal explicitly chooses otherwise.
- Preserve invite routes and pending-invite auth bridge.
- Preserve dev auth bypass safety: local-only, never production, no secrets.
- Avoid middleware/proxy slow authorization; Next local docs say proxy is not for slow data fetching/full authorization.

## Explicit non-goals

- Drafting attorney-approved final Terms language.
- Guaranteeing zero liability.
- Enabling Stripe, checkout, billing, invoices, or subscription plans.
- Implementing a CMS-driven legal editor unless future legal operations need it.
- Changing auth provider setup, DNS, Vercel, Supabase provider settings, or secrets.

## Assumptions

- Current closed beta remains invite-only and no-payment unless Philip changes the launch posture.
- Terms acceptance should be tied to authenticated Supabase user id, not only pre-auth login screen notice.
- Final legal copy, entity name, governing law, notices address, arbitration/class waiver, and consumer/business positioning require Philip/legal counsel decisions before production enforcement.
