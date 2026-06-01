# MVP Scope Cutline

## Fourth-Pass Closed Beta Scope Cutline - 2026-06-02

Public paid-launch scope is superseded. Closed beta scope is invite-only, no-payment, and feedback-led.

| Area | Closed beta decision | Public launch decision | Payment relevance | Whitelist impact | Visible in closed beta? | Ticket ID |
| --- | --- | --- | --- | --- | --- | --- |
| Closed beta access control | P0 | Replaced later by broader entitlement model | None | Required | Yes | `BETA-AUTH-001..006` |
| Google Sign-In | P0 | P0 | None | Must feed allowlist check | Yes | `BETA-AUTH-003` |
| Public self-serve signup | Deferred | Needed later | None | Must be blocked | No | Deferred |
| Pricing/payment/billing | Deferred/not applicable | Needed later | Deferred | None | No paid UI | Deferred |
| Pricing page | Reframe or hide | Public pricing later | Future-only | Public route | Maybe, beta copy only | `BETA-COPY-001` |
| Feedback path | P0 lightweight | P0 scalable later | None | Prefer allowed-user context | Yes | `BETA-FEEDBACK-001` |
| Resend onboarding invites | P1 if manual invites | P0 for automation | None | None | Optional | `BETA-OPS-001` |
| Resend share/invite email | Conditional P0 if visible/required | P0 | None | May affect invited users | Depends | Existing share/invite tickets |
| Beta terms/privacy/AUP | P0 | Public terms later | Must not mention active billing | None | Yes | `BETA-LEGAL-001` |
| Ask Flip/AI | Deferred/hidden | Later safe launch | None | None | No | AI deferred |
| Admin beta management UI | Deferred | Maybe later | None | Manual Supabase enough | No | Deferred |
| Component library/templates | P0 useful | P0 fuller | None | Allowed users only | Yes | Existing P0 |
| Project-specific unlink | P0 | P0 | None | Allowed users only | Yes | Existing P0 |
| Excel export | P0 | P0 | None | Allowed users only | Yes | Existing P0 |

## Third-Pass Production Cutline

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. This section supersedes any weaker second-pass wording. "Visible" means reachable through route, navigation, sidebar/footer, CTA, direct URL, API, or launch copy.

| Surface | Exact route/file | Launch visible? | Feature flag / control | Owner | Ticket | Beta/investor risk | Final decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Landing | `src/app/page.tsx` | Yes | none | Product | `LEGAL-001`, `DEMO-001` | Claim overreach | Keep, but claims must match evidence. |
| Pricing | `src/app/pricing/page.tsx` | Yes | none | Product/Legal | `BETA-COPY-001`, `32` | Paid-launch confusion | Hide or reframe as closed beta access/contact only. |
| Terms/Privacy | `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` | Yes | none | Legal/Product | `BETA-LEGAL-001` | Current placeholders block closed beta | Replace with beta terms/privacy/AUP/disclaimers before beta. |
| Login/callback | `src/app/login/page.tsx`, `src/app/auth/callback/route.ts` | Yes | Supabase provider config | Eng | `ONB-001`, `INFRA-001` | Auth failure blocks all users | Keep; hosted proof required. |
| Workshop | `src/app/workshop/**` | Yes | auth proxy | Eng/Product | `QA-002` | Prototype feel if empty states fail | Keep; first-run QA required. |
| Component library | `src/app/workshop/library/**`, sidebar | Yes | auth only | Product/Eng | `LIB-001` | Demo credibility risk | Keep after polish/proof. |
| Templates | `src/app/workshop/templates/**`, sidebar | Yes | auth only | Product/Eng | `TPL-001` | Demo credibility risk | Keep after polish/proof. |
| Project-specific unlink | estimate row UI/actions | Yes only after PR | none yet | Eng/Product | `UNLINK-001` | Data corruption/user ambiguity | Block until implemented/proven. |
| Excel export | export preview/dialog/API | Yes only after PR | auth | Eng/Product | `EXP-001` | Raw dump undermines promise | Block until bid workbook proof. |
| Share/invite/email | `src/app/share/**`, `src/app/invite/**`, Resend webhook | Conditional | publication/invite/email env | Eng/Security | `SEC-001`, `INFRA-002` | Public token/privacy/email risk | Enable only after security/email proof. |
| Ask Flip / AI | `WorkshopPageShell`, `/api/ai/*` | No | `NEXT_PUBLIC_ASK_FLIP_ENABLED=false`, `AI_ASK_ENABLED=false`, `AI_PACKAGE_BUILDER_ENABLED=false` | Eng | `AI-001` | Unfinished AI visible/cost/write risk | Hide/fail closed for MVP. |
| Upload/image APIs | component/project image routes | Conditional | auth/storage policies | Eng/Security | `SEC-001` | Storage leak/upload abuse | Prove storage policies first. |
| Billing/PDF/bid tabulation | no launch-ready implementation | No | none | Product | `32`, `18` | Scope/claim risk | Billing is post-beta; PDF/bid tabulation are post-MVP unless separately approved. |

No unknown launch-visible surface is acceptable. If implementation finds another route/nav/API, add it here before launch.

This cutline is route/action/API based. "Launch visible" means visible or callable by default in production.

## Scope Table

| Surface | Evidence | Launch visible? | MVP decision | Ticket | Owner decision needed? |
| --- | --- | --- | --- | --- | --- |
| `/workshop` home shell | `WorkshopPageShell.tsx:123` renders Ask Flip footer. | Yes today | Keep workshop, hide Ask Flip. | AI-001 | No |
| Ask Flip footer assistant | `EstimateCopilotFloatingButton.tsx:98`, `:533`, `:585`, `:677`, `:920`. | Yes today | Hide by default with public client flag. | AI-001 | No |
| `/api/ai/ask` | `route.ts:3` delegates to handler. | Yes today | Disabled by default before handler/provider/context/audit. | AI-001 | No |
| `/api/ai/package-builder` | `route.ts:3` delegates to handler. | Yes today | Disabled by default before handler/provider/context/audit/apply. | AI-001 | No |
| AI read tools/draft/apply flags | `feature-flags.ts:18` existing partial flags. | Partly internal | Add top-level `AI_ASK_ENABLED` and `AI_PACKAGE_BUILDER_ENABLED`. | AI-001 | No |
| `/workshop/projects` | Build output dynamic; route remains core. | Yes | Keep. | QA-002 | No |
| Estimate sheet row editing | `EstimateSheetContent.tsx:3294`, `use-estimate-row-mutations.ts:114`. | Yes | Complete project-specific row behavior. | UNLINK-001 | No |
| Library row insertion/replacement/delete | `actions.ts:1677`, `:1771`, `:1808`. | Yes | Keep and regression-test. | UNLINK-001 | No |
| Dedicated unlink | Not implemented. | No | Add schema-safe RPC/action/hook/UI. | UNLINK-001 | No |
| Detached row field editor | Current row details component tab is read-oriented; `EstimateSheetContent.tsx:2504`. | Partial | Add editable project-specific fields only after detach. | UNLINK-001 | UX copy approval |
| `/workshop/library` | `page.tsx:13`, `LibraryPageClient.tsx:55`. | Yes | Polish only; no bulk import/export. | LIB-001 | No |
| `/workshop/templates` | `page.tsx:6`, `TemplatesPageClient.tsx:10`. | Yes | Polish; templates are structure bundles, not cost rows. | TPL-001 | No |
| Template seed migrations | `20260522091621_component_library_templates.sql:425`. | Backend | Do not duplicate seeds. | TPL-001 | No |
| Template insertion into estimate | `EstimateSheetContent.tsx:3759`, `actions.ts:1645`. | Yes inside estimate | Keep; add feedback tests. | TPL-001 | No |
| Proposal Excel export API | `proposal.xlsx/route.ts:41`. | Yes | Rewrite model/workbook contract. | EXP-001 | Owner must approve commercial defaults |
| Export preview dialog | `ProposalExportPreviewDialog.tsx:40`. | Yes | Keep preview/download parity. | EXP-001 | No |
| Public share routes | Build output includes `/share/[token]` and APIs. | Yes but not launch focus | Do not expand; only resolve blocking `test:dom` source-contract failure. | QA-002 | No |
| Teamspaces | `.ai/06_specs/teamspaces-collaboration-spec.md` only. | No | Defer. | None | No |
| Public landing/pricing/about | Build output visible. | Yes | Not part of MVP feature completion except launch smoke. | QA-002 | Owner copy approval only if changed |

## Feature Flags

| Flag | Type | Default | Purpose | Ticket |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_ASK_FLIP_ENABLED` | Client-public | `false` | Controls footer assistant rendering. | AI-001 |
| `AI_ASK_ENABLED` | Server-only | `false` | Gates `/api/ai/ask` before handler. | AI-001 |
| `AI_PACKAGE_BUILDER_ENABLED` | Server-only | `false` | Gates `/api/ai/package-builder` before handler. | AI-001 |
| Existing `AI_PACKAGE_BUILDER_*` flags | Server-only | Existing defaults | Keep as sub-feature flags behind top-level disabled gate. | AI-001 |

## Unknowns

| Unknown | Why it matters | Owner |
| --- | --- | --- |
| Final commercial terms defaults for export. | Workbook needs estimate/proposal payment terms, validity, warranty, exclusions, signature/conforme blocks. This is export content, not app billing. | Philip |
| Whether launch wants 0% or 12% VAT default. | Affects formulas and client totals. | Philip |
| Whether duration/cost per sqm are required inputs or safe blanks. | Affects model and workbook validation. | Philip |
