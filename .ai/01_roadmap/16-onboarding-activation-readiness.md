# Onboarding, Activation & Readiness

**Last updated: 2026-05-30**
**Code-reconciliation pass: 2026-06-18** — status fields and stale code claims below were reconciled against the actual codebase. Inline `[code-sync 2026-06-18: …]` notes mark every status/claim changed in this pass, with a file-path evidence pointer. Drifts corrected this pass: the estimate tree bootstrap is no longer `Lot→Structure→Level→Area` (single-node "Area" model, `src/lib/estimates/tree-hierarchy.ts`); project creation does NOT auto-create an estimate (`src/lib/projects/actions.ts` `createProject` redirects to the project dashboard, not into an estimate); workshop route error/loading boundaries and a support-email path now exist (Phase 12); and activity-based resumption now exists in the dashboard (Phase 11). Provider/manual facts (Google OAuth verification, real email/invite delivery, user validation) are left at their existing pending status — code cannot prove them.

---

## Status Overview

| Mode | Status |
|------|--------|
| Manual beta | **CURRENT** — Philip guides each user personally |
| Product-led | **PLANNED** — in-app guidance, tooltips, progressive disclosure |
| Public self-serve | **PLANNED** — full product-led plus signup without manual intervention |

---

## 12 Onboarding Phases

### Phase 1: Pre-Login Orientation

| Field | Detail |
|-------|--------|
| **Phase** | 1. PRE-LOGIN ORIENTATION |
| **User Question** | "What is this, and should I use it?" |
| **Product Answer** | Landing page with honest claims, clear CTA, no misleading pricing |
| **Screen / Surface** | `/` (landing page) |
| **Trigger** | User visits `/` |
| **Desired Action** | User clicks "Start estimating" or "Sign in" |
| **Success State** | User proceeds to auth |
| **Failure State** | User bounces without clicking |
| **Recovery Prompt** | Retargeting, email follow-up |
| **Required UI Evidence** | Landing page screenshots, CTA click-through data |
| **Required Analytics Event** | `landing_page_view`, `cta_click` |
| **Owner Decision** | Philip |
| **Status** | IMPLEMENTED / NEEDS EVIDENCE (landing exists, needs non-technical user validation) |

### Phase 2: Auth / Login

| Field | Detail |
|-------|--------|
| **Phase** | 2. AUTH / LOGIN |
| **User Question** | "How do I get in?" |
| **Product Answer** | Google OAuth or email sign-in link |
| **Screen / Surface** | `/login` or auth modal |
| **Trigger** | User clicks login CTA from landing page |
| **Desired Action** | Complete authentication flow |
| **Success State** | Authenticated, redirected to `/workshop` |
| **Failure State** | Auth error, unverified app warning (Google OAuth testing mode) |
| **Recovery Prompt** | Error page with retry button and explanation |
| **Required UI Evidence** | Successful auth flow screenshot, error state screenshot |
| **Required Analytics Event** | `auth_start`, `auth_success`, `auth_error` |
| **Owner Decision** | Philip |
| **Status** | IMPLEMENTED / NEEDS EVIDENCE (code exists, Google OAuth in testing mode) |

### Phase 3: First Workspace Context

| Field | Detail |
|-------|--------|
| **Phase** | 3. FIRST WORKSPACE CONTEXT |
| **User Question** | "Where am I and what can I do?" |
| **Product Answer** | `/workshop` with bento grid layout, project shortcuts if any exist |
| **Screen / Surface** | `/workshop` |
| **Trigger** | Post-auth redirect |
| **Desired Action** | User understands this is their home base for all project work |
| **Success State** | User recognizes bento grid as navigation hub, clicks into a project or creates one |
| **Failure State** | Blank workspace feels empty and confusing, user doesn't know what to do next |
| **Recovery Prompt** | Guided empty-state CTA: "Create your first project" with contextual help text |
| **Required UI Evidence** | Empty-state screenshot, populated-state screenshot |
| **Required Analytics Event** | `workshop_view`, `workshop_first_action` |
| **Owner Decision** | Philip |
| **Status** | PARTIAL (bento grid exists, but no guided first-run experience) |

### Phase 4: First Project Creation

| Field | Detail |
|-------|--------|
| **Phase** | 4. FIRST PROJECT CREATION |
| **User Question** | "How do I start organizing work?" |
| **Product Answer** | Create first project via NewProjectModal. NOTE: project creation does NOT auto-create an estimate; the estimate is a separate explicit action (`createEstimate` / `createEstimateSheetDraft`) |
| **Screen / Surface** | NewProjectModal → redirected to the **project dashboard** (`/workshop/projects/[projectId]`), not directly into an estimate |
| **Trigger** | Empty-state CTA or "New Project" button |
| **Desired Action** | User fills in project name and details, submits |
| **Success State** | Project created, user lands on the project dashboard, then explicitly creates an estimate sheet (which seeds a default tree — see Phase 5) |
| **Failure State** | Creation fails silently, project doesn't appear |
| **Recovery Prompt** | Error toast with retry option |
| **Required UI Evidence** | Modal screenshot, success state screenshot |
| **Required Analytics Event** | `project_create_start`, `project_create_success`, `project_create_error` (NOTE: these named analytics events are not yet emitted in code; only landing `cta_click` exists via `src/components/landing/*`) |
| **Owner Decision** | Philip |
| **Status** | IMPLEMENTED / NEEDS EVIDENCE [code-sync 2026-06-18: project create + redirect-to-dashboard verified in `src/lib/projects/actions.ts` (`createProject` redirects to `/workshop/projects/${project.id}`, no estimate auto-create); corrected the "estimate draft auto-created"/"lands inside the estimate" claim] |

### Phase 5: First Estimate Creation

| Field | Detail |
|-------|--------|
| **Phase** | 5. FIRST ESTIMATE CREATION |
| **User Question** | "Where do I put my numbers?" |
| **Product Answer** | Estimate shell created on an explicit "create estimate" action (NOT auto-created with the project). Default tree bootstrap (`createEstimateWithDefaultTree`) seeds a NESTED multi-level tree, not a flat list: root "Project Scope" (a group) containing "General Requirements", "Site Works", and a building group named after the project (`project.name`, NOT the literal word "Building"); the building group contains a "Ground Floor" group; "Ground Floor" contains a single leaf node "Project-wide" — the ONLY `kind:'area'` row, with the other five nodes written as `kind:'group'`. Every node renders to the user under one display label ("Area" per `ESTIMATE_NODE_DISPLAY_NAME`) because the old Lot → Structure → Level → Area hierarchy was UNIFIED into one display concept and `kind` no longer drives nesting; the DB write path still distinguishes group vs area kinds |
| **Screen / Surface** | Estimate detail view with tree sidebar |
| **Trigger** | User explicitly creates an estimate sheet from the project dashboard |
| **Desired Action** | User sees the tree structure and understands the hierarchy |
| **Success State** | User recognizes the single "Area" node model as the organizing framework |
| **Failure State** | Empty estimate with no rows, user unsure how to start |
| **Recovery Prompt** | Guided first-row prompt: "Add your first line item to Area 1" |
| **Required UI Evidence** | Bootstrap tree screenshot, empty estimate view screenshot |
| **Required Analytics Event** | `estimate_view`, `tree_node_click` (NOTE: not yet emitted in code) |
| **Owner Decision** | Philip |
| **Status** | IMPLEMENTED / NEEDS EVIDENCE [code-sync 2026-06-18: corrected stale "Lot→Structure→Level→Area" + "auto-created with project". Single-node display unification: `src/lib/estimates/tree-hierarchy.ts` (`ESTIMATE_NODE_DISPLAY_NAME = "Area"`). Default seed tree is NESTED (6 nodes, multi-level — not a flat 4-node list): `src/lib/estimates/actions.ts` `createEstimateWithDefaultTree` (lines ~1119-1212) inserts root "Project Scope" (group) → {"General Requirements" (group), "Site Works" (group), `project.name` building group} → "Ground Floor" (group) → leaf "Project-wide" (the only `kind:'area'` row; the other five are `kind:'group'`). Display-name unification makes every node read as "Area" to the user, but the write path still distinguishes group vs area kinds. Estimate creation is a separate action: `createEstimate` / `createEstimateSheetDraft`] |

### Phase 6: First Line Item or Package

| Field | Detail |
|-------|--------|
| **Phase** | 6. FIRST LINE ITEM OR PACKAGE |
| **User Question** | "How do I add actual costs?" |
| **Product Answer** | Add row items manually or via package-builder |
| **Screen / Surface** | Area detail panel with row editor, package-builder side panel |
| **Trigger** | User clicks into an area node in the tree |
| **Desired Action** | User adds a line item row with description, quantity, unit, unit cost |
| **Success State** | First row appears in the estimate table with calculated cost |
| **Failure State** | No rows added, user clicks around but doesn't commit data |
| **Recovery Prompt** | "Add your first item" inline prompt, or package-builder suggestion for common trades |
| **Required UI Evidence** | Row editor screenshot, first-row-added screenshot, package-builder screenshot |
| **Required Analytics Event** | `row_add`, `package_builder_open` (NOTE: not yet emitted in code) |
| **Owner Decision** | Philip |
| **Status** | PARTIAL [code-sync 2026-06-18: manual row add is BUILT/VERIFIED (`src/lib/estimates/actions.ts` row CRUD via history RPC). The AI package-builder code exists (`src/app/api/ai/package-builder/`) but is DISABLED BY DEFAULT for closed beta (`ARCHESTIMATOR_AI_ENABLED` default false → 404). So the "package-builder" half of this phase is not live out-of-the-box; needs the flag flipped + DeepSeek key + user validation] |

### Phase 7: First Cost Confidence Moment

| Field | Detail |
|-------|--------|
| **Phase** | 7. FIRST COST CONFIDENCE MOMENT |
| **User Question** | "Are my numbers right?" |
| **Product Answer** | Row totals, estimate summary totals, charts showing cost breakdown |
| **Screen / Surface** | Estimate detail view with summary panel and chart widgets |
| **Trigger** | User has added enough rows to produce a meaningful total |
| **Desired Action** | User reviews totals, cross-checks against mental model, feels confident |
| **Success State** | User feels the estimate is accurate and trustworthy |
| **Failure State** | Totals appear wrong, confusing, or don't match expectations |
| **Recovery Prompt** | Clear labeling of what each total represents, chart context tooltips, "understand your estimate" explainer |
| **Required UI Evidence** | Summary panel screenshot, chart screenshot |
| **Required Analytics Event** | `estimate_summary_view`, `chart_interaction` |
| **Owner Decision** | Philip |
| **Status** | UNKNOWN (no user validation) |

### Phase 8: First Export / Share

| Field | Detail |
|-------|--------|
| **Phase** | 8. FIRST EXPORT / SHARE |
| **User Question** | "How do I show this to my client?" |
| **Product Answer** | XLSX export download or create shared link |
| **Screen / Surface** | Export button / Share panel |
| **Trigger** | User wants to share the estimate with someone outside the app |
| **Desired Action** | User exports XLSX successfully or creates a shareable link |
| **Success State** | Export file downloads and is valid, or shared link is created and accessible |
| **Failure State** | Export fails, file is corrupt, link generation fails |
| **Recovery Prompt** | Error message with retry button, alternative format suggestion |
| **Required UI Evidence** | Export menu screenshot, exported file sample |
| **Required Analytics Event** | `export_start`, `export_success`, `export_error`, `share_link_create` |
| **Owner Decision** | Philip |
| **Status** | IMPLEMENTED / NEEDS EVIDENCE |

### Phase 9: First Collaboration

| Field | Detail |
|-------|--------|
| **Phase** | 9. FIRST COLLABORATION |
| **User Question** | "Can my team help?" |
| **Product Answer** | Invite team member via Teamspaces |
| **Screen / Surface** | Team invite modal, invite acceptance page |
| **Trigger** | User clicks team/invite UI element |
| **Desired Action** | Invite sent successfully, collaborator receives invite, accepts, and sees the correct project |
| **Success State** | Collaborator is added to team, can see shared projects and estimates |
| **Failure State** | Invite lost in transit, wrong access level granted, collaborator lands in wrong workspace |
| **Recovery Prompt** | Re-invite button, wrong-account detection and switch flow |
| **Required UI Evidence** | Invite modal screenshot, acceptance page screenshot, team roster screenshot |
| **Required Analytics Event** | `invite_send`, `invite_accept`, `team_view` |
| **Owner Decision** | Philip |
| **Status** | IMPLEMENTED / NEEDS EVIDENCE |

### Phase 10: First AI-Assisted Action

| Field | Detail |
|-------|--------|
| **Phase** | 10. FIRST AI-ASSISTED ACTION |
| **User Question** | "Can AI help me?" |
| **Product Answer** | Ask Flip a question or use the package-builder to generate cost packages |
| **Screen / Surface** | Flip AI panel, package-builder side panel |
| **Trigger** | User opens AI panel or package-builder |
| **Desired Action** | User asks a question and gets a useful answer, or builds a package draft from AI suggestions |
| **Success State** | Useful, accurate answer or usable package draft generated |
| **Failure State** | AI returns confusing, incorrect, or irrelevant output |
| **Recovery Prompt** | Deterministic fallback options, clear AI limitations disclosure: "Flip can help with common estimating tasks but always double-check the numbers" |
| **Required UI Evidence** | AI panel screenshot, package-builder with AI output screenshot |
| **Required Analytics Event** | `flip_query`, `flip_response`, `package_ai_generate` (NOTE: not yet emitted in code) |
| **Owner Decision** | Philip |
| **Status** | IMPLEMENTED BUT FLAG-GATED OFF / NEEDS EVIDENCE [code-sync 2026-06-18: Ask Flip (`src/app/api/ai/ask/route.ts`) + Package Builder (`src/app/api/ai/package-builder/route.ts`) exist and are tested, but are DISABLED BY DEFAULT for closed beta — route returns 404 unless `ARCHESTIMATOR_AI_ENABLED` is set (default false in `.env.example`), and the Ask Flip UI needs `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` (default false). Provider is DeepSeek (requires `DEEPSEEK_API_KEY`), not Anthropic/OpenAI. Whether AI answers work end-to-end is a provider/flag/runtime fact code cannot prove] |

### Phase 11: Returning-User Continuation

| Field | Detail |
|-------|--------|
| **Phase** | 11. RETURNING-USER CONTINUATION |
| **User Question** | "Where was I?" |
| **Product Answer** | Workshop home shows recent projects and estimates, favorite shortcuts |
| **Screen / Surface** | `/workshop` |
| **Trigger** | Repeat login, return to app |
| **Desired Action** | User quickly finds and resumes their most recent work |
| **Success State** | User clicks into a recent project within seconds of landing |
| **Failure State** | User feels disoriented, can't find their work from last session |
| **Recovery Prompt** | Activity-based feed: "You were last working on [Project Name] / [Estimate Name]", favorited shortcuts surfacing |
| **Required UI Evidence** | Workshop with recent activity screenshot, favorites screenshot |
| **Required Analytics Event** | `workshop_return_view`, `recent_project_click`, `session_resume` (NOTE: not yet emitted in code) |
| **Owner Decision** | Philip |
| **Status** | IMPLEMENTED / NEEDS EVIDENCE [code-sync 2026-06-18: was "PARTIAL (no activity-based resumption)". Activity-based resumption now exists in the Workshop dashboard homebase: `src/components/workshop/dashboard/ContinueCard.tsx` ("Continue where you left off" → most recent sheet), `RecentSheetsList.tsx`, `RecentProjectsList.tsx`, plus `FavoritesTree.tsx`. Built 2026-06-17 (`src/components/workshop/dashboard/`). Live user validation still open] |

### Phase 12: Error / Recovery Onboarding

| Field | Detail |
|-------|--------|
| **Phase** | 12. ERROR / RECOVERY ONBOARDING |
| **User Question** | "Something went wrong — now what?" |
| **Product Answer** | Custom error pages, recovery prompts, support contact path |
| **Screen / Surface** | Error pages (404, 500, auth error, network error), recovery modals |
| **Trigger** | Any failure state across any phase |
| **Desired Action** | User recovers from error or knows exactly how to get help |
| **Success State** | User either self-recovers or contacts support and gets a timely response |
| **Failure State** | User abandons the product after encountering an error |
| **Recovery Prompt** | Clear error messaging that explains what happened and what to do next, visible support contact (email, chat, or form) |
| **Required UI Evidence** | Error page screenshots for each error type |
| **Required Analytics Event** | `error_page_view`, `error_recovery_action`, `support_contact` (NOTE: not yet emitted in code) |
| **Owner Decision** | Philip |
| **Status** | PARTIAL [code-sync 2026-06-18: was "LEFT TO DO (no custom error pages, no support path)". Per-route error boundaries with sanitized retry UI NOW EXIST on the data-heavy workshop routes (`error.tsx` in `src/app/workshop/library`, `library/components`, `library/templates`, `library/templates/[templateId]`, `projects/[projectId]/data`, `projects/[projectId]/estimates`, `projects/[projectId]/estimates/[nodeId]`; shared `WorkshopRouteErrorState`; tested by `tests/vitest/workshop-route-error-boundaries.test.tsx`). A support-contact path also exists: `support@archestimator.com` surfaced on `src/app/contact/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, and `src/app/beta/access-required/page.tsx`. STILL MISSING: no root `src/app/not-found.tsx` (custom 404), no `src/app/global-error.tsx`/root `error.tsx`, and no error boundaries on workshop home, projects list, settings, feedback, terms, onboarding, or on marketing/login/share/invite routes. Whether the support inbox is monitored is an external/manual fact] |

---

## 6 Onboarding Variants

| Variant | Starting State | Onboarding Path | Key Moments | Status | Owner Decision |
|---------|---------------|-----------------|-------------|--------|----------------|
| Founder / contractor from blank workspace | No account, no projects | Phases 1 through 12 sequentially | Landing page → signup → first project → first estimate → first export → return | MANUAL BETA ONLY | Philip guides personally |
| Estimator creating first estimate (invited to existing project) | Has account via invite, lands in existing project | Phases 2, 6 through 8 | Auth → first line item → cost confidence → export | PARTIAL / BLOCKED BY INVITE CONFIG | Validate after collaboration Wave 1 and Wave 2 unblock invite entry |
| Team collaborator accepting invite | Receives invite email | Phases 2, 9 | Auth via invite link → accepts → sees correct project | IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN | Configure/prove Supabase Auth email/env and hosted invite template/confirmation settings, then validate real invite acceptance flow from inbox click-through |
| Client / recipient opening shared link | No account, receives shared link | Phase 13 in journey matrix (no auth required) | Opens link → views estimate read-only → optionally exports | IMPLEMENTED / NEEDS EVIDENCE | Validate shared link experience |
| Returning user | Has account, has existing work | Phase 11 | Login → workshop with recent activity → resume work | IMPLEMENTED / NEEDS EVIDENCE [code-sync 2026-06-18: activity-based resumption shipped in `src/components/workshop/dashboard/` (ContinueCard, RecentSheetsList, RecentProjectsList)] | Live user validation still open |
| Beta design partner (manual guidance) | Curated invite, direct relationship with Philip | All phases, Philip-facilitated walkthrough | Personal onboarding session, feedback collection, iterative guidance | DRAFTED (see 12-beta doc) | Philip manages schedule and relationships |

---

## Onboarding Modes

### Manual Beta Onboarding (CURRENT)

Philip guides each user personally through the product. This mode is adequate for fewer than 10 beta users and provides high-touch feedback loops. Every feature interaction is observed or debriefed. The product itself does not need to teach the user because Philip does that directly. This is the current state and the only mode operating today.

What manual beta enables:
- Direct observation of confusion points
- Immediate answers to user questions
- Rapid iteration based on live feedback
- Trust building through personal relationship

What manual beta cannot scale past:
- Philip's available time becomes the bottleneck
- Onboarding quality varies session to session
- No self-serve path exists for curious visitors
- Cannot support organic growth or word-of-mouth signups

### Product-Led Onboarding (PLANNED)

In-app guidance replaces Philip's voice. Tooltips, empty states with clear CTAs, progressive disclosure of complex features, and contextual help text teach the user what to do and why. The user should never feel lost, even on their first visit. This mode is planned for the public launch.

Key product-led mechanisms to build:
- **Guided empty states**: Every blank screen has a clear next action, not just "nothing here yet"
- **Tooltip tours**: First-run walkthrough of key surfaces (workshop, estimate tree, row editor)
- **Progressive disclosure**: Hide advanced features (AI, teamspaces, complex chart config) until the user has completed basic actions
- **Contextual help**: Inline explainers for domain concepts (Lot vs Structure vs Level vs Area)
- **Success celebrations**: Subtle positive feedback when the user completes a meaningful action (first estimate exported, first collaborator added)

Success metric: A user who signs up without speaking to Philip can create and export a basic estimate within their first session.

### Public Self-Serve Onboarding (PLANNED)

Full product-led experience plus signup without any manual intervention. No gatekeeping, no approval flow, no waitlist. Anyone can create an account and start estimating immediately. This is the end-state target, planned for post-public-launch after product-led onboarding has been validated with real users.

Prerequisites before entering this mode:
- Product-led onboarding proven with at least 10 unguided users
- Error/recovery phase (Phase 12) fully implemented
- Support path exists (even if lightweight: email or chat)
- Analytics instrumentation complete across all phases
- Auth moves from Google OAuth testing mode to production

Success metric: A stranger who finds the product through search or word of mouth can create an account, build an estimate, and export it without ever contacting support.

---

## Activation-Oriented Journey Maps (Codex-Ready)

**Added:** 2026-05-30
**Purpose:** Makes this document directly usable by Codex for implementation (BETA-P0-UX-001).

### Definitions

| Term | Definition |
|------|------------|
| **First value** | User creates a project, adds at least one estimate with at least one row item, and sees a calculated total. |
| **Activation** | Workspace has 1+ project, 1+ estimate, 1+ row item. The user has started estimating. |
| **Activation rate** | % of new workspaces that reach activation within 7 days of creation. |

### Journey: First 10 Minutes (New User)

| Step | Trigger | Screen | User Action | System Response | Guidance Needed | Empty State | Loading State | Error State | Recovery Path | Success Metric | Codex Goal Card |
|------|---------|--------|-------------|-----------------|-----------------|-------------|---------------|-------------|---------------|----------------|-----------------|
| 1 | Visit `/` | Landing page | Read value proposition, click "Sign In" | Show landing with hero, CTA | Clear "what is this?" answer in hero | N/A | Page load skeleton | Page fails: retry link | Retry button | Visitor scrolls past hero | BETA-P0-UX-001 |
| 2 | Click sign-in | `/login` | Complete Google OAuth or email magic link | Auth flow: consent screen → callback → session → redirect | "Sign in with Google" is clear CTAs | N/A | "Signing you in…" spinner | OAuth unavailable: "try email link" | Email sign-in fallback | Auth completes < 2s | BETA-P0-UX-001 |
| 3 | Post-auth redirect | `/workshop` | See bento grid, understand this is home base | Load workspace with empty state or project cards | "This is your workspace" — bento grid should self-explain | "Create your first project" CTA | Bento grid skeleton | Workshop fails: error boundary with retry | Retry button or go home | Workshop renders < 1.5s | BETA-P0-UX-001 |
| 4 | Create project | NewProjectModal | Enter project name, submit | Create project, redirect to project dashboard (estimate is NOT auto-created — separate explicit step) [code-sync 2026-06-18: `src/lib/projects/actions.ts` `createProject` redirects to `/workshop/projects/[projectId]`, no estimate draft] | "Name your project" — simple, single field | Modal with name input autofocused | Submit button shows spinner | Creation fails: error toast with retry | Retry creation | Project created < 1s | BETA-P0-UX-001 |
| 5 | Create estimate sheet | Estimate editor | See tree sidebar + grid; understand hierarchy | Render seeded default tree — a NESTED multi-level tree (not a flat list): root "Project Scope" (group) → {"General Requirements", "Site Works", a building group named after the project (`project.name`)} → "Ground Floor" (group) → leaf "Project-wide" (the only `kind:'area'` row; the other five are `kind:'group'`); every node displays to the user as "Area". Empty grid [code-sync 2026-06-18: corrected stale "Lot→Structure→Level→Area", "Enter estimate" trigger, and the flat "Project Scope / General Requirements / Site Works / Building — all single Area-type nodes" claim; `src/lib/estimates/actions.ts` `createEstimateWithDefaultTree` (lines ~1119-1212) + `src/lib/estimates/tree-hierarchy.ts` `ESTIMATE_NODE_DISPLAY_NAME = "Area"` display unification] | "This is your estimate. Add areas and rows below." | Empty tree with "Add Area" prompt; empty grid with "Add Row" prompt | Tree/grid skeleton during load | Editor fails to load: error boundary (`src/app/workshop/projects/[projectId]/estimates/error.tsx`) | Reload editor | Editor renders < 2s | BETA-P0-UX-002 |

### Journey: First 30 Minutes (First Estimate)

| Step | Trigger | Screen | User Action | System Response | Guidance Needed | Empty State | Loading State | Error State | Recovery Path | Success Metric | Codex Goal Card |
|------|---------|--------|-------------|-----------------|-----------------|-------------|---------------|-------------|---------------|----------------|-----------------|
| 6 | Click "Add Area" | Tree sidebar | Name first area (e.g., "Foundation") | Create area node in tree | "Areas group related work. Name your first area." | "Add your first area" prompt with + button | Inline input with submit | Duplicate name: warn but allow | Edit area name | Area created < 500ms | BETA-P0-UX-002 |
| 7 | Select area, click "Add Row" | Grid view | Fill row: description, quantity, unit, unit cost | Create row, compute line_total, update area subtotal + grand total | "Add a line item — what work, how much, at what cost?" | "Add your first line item" CTA in empty grid | Inline row editor with field validation | Non-numeric qty/cost: inline error | Fix input values | Row saved + totals updated < 500ms | BETA-P0-UX-002 |
| 8 | Add 3-5 rows | Grid view | Each row: description, qty, unit, cost | Each row computed, totals cascade | "Keep adding items. Your estimate total updates automatically." | (populated — no empty state) | Optimistic UI: row appears immediately | Save fails: "Unsaved changes" indicator | TanStack Query retry | All rows saved, totals accurate | BETA-P0-UX-002 |
| 9 | Review totals | Estimate footer/summary | See grand total, verify it matches mental estimate | Display accurate grand total with area breakdowns | "This is your total. Review it. You can adjust anything." | "No items yet" if all rows deleted | Totals recalculate on each edit | Totals mismatch: refresh from server | Refresh button | Totals match server within 100ms | BETA-P0-UX-002 |
| 10 | Export or share | Export/Share toolbar | Click Export (XLSX) or Share (create link) | Generate XLSX download or create shared link | "Ready to share? Export to Excel or create a shareable link." | Export/Share buttons always visible (even if empty, warn) | "Generating spreadsheet…" with progress | Export fails: error toast with retry | Retry export or try Share instead | Export < 10s for 500 rows; share link created < 1s | BETA-P0-UX-002 |

### Journey: Returning User

| Step | Trigger | Screen | User Action | System Response | Guidance Needed | Empty State | Loading State | Error State | Recovery Path | Success Metric | Codex Goal Card |
|------|---------|--------|-------------|-----------------|-----------------|-------------|---------------|-------------|---------------|----------------|-----------------|
| 1 | Sign in | `/workshop` | See recent projects, resume last work | Show bento grid with recent project cards first | "Pick up where you left off" — recent projects at top | (populated — returning user has projects) | Bento grid loads with cached data | Grid fails: show workspace with retry | Retry or navigate via sidebar | User clicks into recent project < 10s after login | BETA-P0-UX-001 |

### Journey: Invited Collaborator

| Step | Trigger | Screen | User Action | System Response | Guidance Needed | Empty State | Loading State | Error State | Recovery Path | Success Metric | Codex Goal Card |
|------|---------|--------|-------------|-----------------|-----------------|-------------|---------------|-------------|---------------|----------------|-----------------|
| 1 | Open invite link | Invite entry page | See "You've been invited to [Project] by [Owner]" | Validate token, show invite context | "[Owner] invited you to collaborate on [Project]" | N/A | Token validation spinner | Invalid/expired token: clear message | "Ask [Owner] to send a new invite" | User understands invite context | BETA-P0-UX-001 |
| 2 | Authenticate | Auth flow | Sign in (or create account) | OAuth or magic link → redirect back to invite | "Sign in to accept the invitation" | N/A | "Signing you in…" | Wrong account: "You're signed in as [email]. Switch accounts?" | Sign-out-and-continue flow | User signs in with correct account | BETA-P0-UX-001 |
| 3 | Accept invite | Redirect to project | Auto-accept, land in project | Accept invitation, add to project_members, redirect | "Welcome to [Project]!" | N/A | Redirect transition overlay | Acceptance fails: error + "contact project owner" | Owner can re-invite | Collaborator lands in correct project < 3s | BETA-P0-UX-001 |

### Journey: Client/Recipient (Shared Link)

| Step | Trigger | Screen | User Action | System Response | Guidance Needed | Empty State | Loading State | Error State | Recovery Path | Success Metric | Codex Goal Card |
|------|---------|--------|-------------|-----------------|-----------------|-------------|---------------|-------------|---------------|----------------|-----------------|
| 1 | Open shared link | Shared receiver | See estimate content, understand it's an estimate | Load shared estimate in read-only view | "This is an estimate from [Company]. Review it below." | N/A (estimate always has content) | Receiver skeleton during load | Token invalid: "This link is no longer available" | "Contact the sender for an updated link" | Receiver FMP < 2s | BETA-P0-UX-003 |
| 2 | Navigate tabs | Tabs: Link, Sheets, Comments, Decisions | Click tabs to explore | Show tab content: estimate view, comments, decisions | "Use the tabs above to review the estimate, leave comments, or mark decisions." | Comments tab: "No comments yet. Be the first." | Tab content skeleton | Tab fails: error boundary with retry | Reload tab | User navigates at least 2 tabs | BETA-P0-UX-003 |
| 3 | Leave comment | Comments tab | Type comment, submit | Save comment, show in thread | "Leave a comment or question about any part of this estimate." | "No comments yet" | Submit button spinner | Submit fails: "Could not save comment. Try again." | Retry submit | Comment posted < 1s | BETA-P0-UX-003 |

### Journey: AI-Assisted

> [code-sync 2026-06-18] This entire journey is FLAG-GATED OFF for closed beta. Both Ask Flip (`src/app/api/ai/ask/`) and Package Builder (`src/app/api/ai/package-builder/`) return 404 unless `ARCHESTIMATOR_AI_ENABLED` is set (default false in `.env.example`); Ask Flip's UI also needs `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` (default false). Provider is DeepSeek (needs `DEEPSEEK_API_KEY`), not Anthropic/OpenAI. The flows below are aspirational targets that only apply once AI is enabled.

| Step | Trigger | Screen | User Action | System Response | Guidance Needed | Empty State | Loading State | Error State | Recovery Path | Success Metric | Codex Goal Card |
|------|---------|--------|-------------|-----------------|-----------------|-------------|---------------|-------------|---------------|----------------|-----------------|
| 1 | Open Ask Flip | AI panel beside estimate | Ask a question about estimate | DeepSeek responds with workspace-scoped context | "Ask Flip anything about your estimates. Flip can see your current workspace data." | "Ask me anything about your estimates…" prompt | "Flip is thinking…" with animated indicator | AI timeout (30s): "Flip is taking longer than expected. Try again?" | Retry button | Useful response received < 15s | BETA-P0-AI-001 |
| 2 | Open Package Builder | Package builder panel | Describe scope (e.g., "2-bedroom apartment electrical rough-in") | AI generates draft package of line items | "Describe the scope of work. Flip will draft a package for you to review." | "Describe a scope of work to get started" | "Building your package…" with progress | AI timeout: "Could not complete. Try a more specific scope." | Retry with refined description | Draft appears < 30s | BETA-P0-AI-001 |
| 3 | Review draft | Package builder panel | Review AI-generated items, modify quantities/costs | Items displayed as editable draft | "Review each item carefully. Only you can apply changes to your estimate." | "No items generated" if AI empty response | Draft items load incrementally | AI returns irrelevant items: "Not what you needed? Refine your scope." | Refine and regenerate | User modifies < 50% of AI-generated values | BETA-P0-AI-001 |
| 4 | Apply confirmed | Confirmation dialog | Click "Apply to Estimate" | Insert all confirmed items into estimate | "This will add X items to your estimate. Confirm to proceed." | N/A | Apply button shows progress | Apply partially fails: "Some items could not be added. Your estimate is unchanged." | Rollback, retry apply | All confirmed items added < 2s | BETA-P0-AI-001 |

### Manual Beta Onboarding Script

**Purpose:** Philip's 30-minute facilitated session for each design partner.

**Session structure:**
1. **Welcome (2 min):** "Thanks for helping test Archestimator. This is pre-release software — your feedback shapes what we build."
2. **Sign-in (3 min):** Guide partner through Google OAuth. Handle auth issues live.
3. **Workspace tour (5 min):** "This is your workspace. Projects live here. This bento grid is your home base."
4. **First project (5 min):** "Create a project. This could be a real one or a test one. Name it whatever you want."
5. **First estimate (10 min):** "Add areas for different parts of the work. Then add line items — what work, how much, at what cost."
6. **Export/Share (3 min):** "You can download this as Excel or share a link with your client."
7. **AI intro (2 min, optional):** "This is Flip — it can answer questions about your estimates and suggest packages."
8. **Feedback (5 min):** "What was confusing? What's missing? What would make you use this instead of a spreadsheet?"
9. **Next steps:** "I'll check in next week. Email me anytime at [support email]."

### Product-Led Onboarding Backlog (Post-Beta)

Items deferred to post-beta when product-led onboarding replaces manual:

1. Tooltip tours for first-run workspace navigation
2. Progressive disclosure: hide AI/charts until user has 5+ rows
3. Inline domain explainers: "What's the difference between Lot, Structure, Level, and Area?"
4. Success celebrations: subtle animation on first export, first share
5. ~~Activity-based resumption: "You were last working on [Project Name]"~~ [code-sync 2026-06-18: DONE — shipped in `src/components/workshop/dashboard/ContinueCard.tsx` + RecentSheetsList/RecentProjectsList; no longer deferred]
6. Guided empty states replacing manual CTAs
7. In-app feedback widget (not just email to Philip)

These are NOT beta requirements. Manual beta onboarding (Philip-guided) is sufficient for 3-5 design partners.
