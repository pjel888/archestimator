# 00 — Agent Coordination

**Plan folder:** `.ai/03_plans/2026-07-07-publisher-owner-mobile-sender-readiness`
**Task mode:** `planning-only` (no application code, tests, migrations, or provider state changed).
**Plan profile:** `exhaustive` (touches publication/shared links, sender authz, revoke/resend, release readiness — see `AGENTS.md` plan-pack discipline).
**Date (Asia/Manila):** 2026-07-08
**Verification mode:** `emulated` (single planning agent performing separated review passes; no second native agent was available in this session). Readiness cap applied in `17_FINAL_READINESS_REVIEW.md`.

---

## Master `/goal`

Turn the publisher surface into an **owner-operable sender workflow across expected devices**, with a clear, honest checklist for every sender action and a documented decision (and proof) for whether heavy mobile parity is in or out of scope.

### User / business outcome
A workspace/project owner or admin must be able to take a published proposal and perform the full sender lifecycle — generate, copy, email, resend, revoke, and confirm client access — without being blocked by the current mobile "needs more width" wall, and with unambiguous status, error, and recovery feedback at each step.

### Problem being solved
- `PublisherRosterClient.tsx:224,228` hides the entire roster below 768px and renders `PublisherNoRowsEmptyState variant="mobile"` ("Publisher needs more width"). Every owner action (copy/open/manage/drawer → recipients/rotate/revoke) is only reachable from buttons inside the desktop-only `<table>` → owners are fully blocked on phones.
- There is no single owner-facing checklist mapping each sender action to its current state, success signal, failure path, and recovery step.
- Sender error and recovery states are spread across `actions.ts`, `usePublisherDrawer.ts`, `RecipientEmailComposer.tsx`, and `PublisherDrawer.tsx` without a consolidated, honest state matrix (e.g., resend rate-limit, email-delivery-not-configured, rotate-invalidates-recipients, revoked link).
- Sibling packs (`client-ready-proposal-package-workflow`, `proposal-export-and-immutable-deliverable-trust`) are already planning readiness gating, snapshot immutability, and owner-message work. This pack must own the **device operability + sender-action clarity + owner-side error/recovery/audit-proof/a11y** angle without duplicating their slices.

### Intended feature behavior
1. Owners can reach and operate the sender surface on mobile via a deliberate, documented path (either a mobile layout or an explicit, proof-backed desktop guard).
2. Every sender action (generate, copy, email, resend, revoke, confirm client access) has a defined happy path, pending state, success state, failure state, recovery path, and owner-visible status.
3. Resend/revoke rules and their downstream effects (token rotation invalidates emailed links; revoke blocks access) are surfaced honestly in the owner UI and tested.
4. Accessibility, keyboard, and focus behavior are defined for every owner action.
5. An audit/proof trail (structured logs + activity feed + tests) covers each sender transition.

### Planning scope (in)
- Owner-side publisher UX operability across desktop/tablet/mobile, including the mobile decision (guard vs. layout).
- Sender action state matrix (generate/copy/email/resend/revoke/confirm-access).
- Owner-side error, recovery, and audit/proof design.
- Accessibility for owner sender actions.
- Test/validation design and adversarial QA matrix for owner sender behavior.
- Coordination boundaries with the four sibling packs.

### Non-goals (out)
- N1: Recipient inbox IA/recovery — owned by `2026-07-07-recipient-proposals-inbox-ia-recovery`.
- N2: Readiness/Preflight model + owner-composed recipient message + `responded` wiring + notification dispatch + honest delivery labels + Phase-6 owner UX gating — owned by `2026-07-07-client-ready-proposal-package-workflow`. This pack *consumes* those (when landed) and *coordinates* the shared files, but does not duplicate them.
- N3: Snapshot immutability / SHA-256 content addressing / export integrity — owned by `2026-07-07-proposal-export-and-immutable-deliverable-trust`.
- N4: Public share activity minimization / `/api/share/[token]/activity` contract — owned by `2026-07-07-public-share-activity-minimization`.
- N5: PDF generation, R2 snapshot blobs, new `proposals` table (all deferred sibling-scope).
- N6: Backend credential cryptography redesign (HMAC + AES-GCM is sound; this pack audits it, does not re-architect it).
- N7: Full mobile parity for **heavy estimate editing** — explicitly out of scope per `DESIGN.md:519-524` (dense editing becomes simplified task flows, not a squeezed table). Only the **sender** surface is in scope for mobile operability.

### Required codebase analysis
- Publisher client/row/drawer/empty-state components and their mobile breakpoint.
- Publication server actions (`create/republish/rotate/revoke/refresh` + recipient `add/list/resend/remove` + `openRecipientProposalAction`).
- D1 publication/recipient schema + app-authz (`assertProjectPublicationManager`).
- Credential material (publication token hash+encrypted; recipient token hash-only; password scrypt; session/access/CSRF cookies).
- Cloudflare Email send path + delivery readiness + resend rate limit.
- Existing test inventory for these surfaces.
- Sibling pack boundaries.

### Required specialist workstreams
1. Product strategy, scope, requirements (lead).
2. Source & codebase architecture (lead + read-only Explore lane).
3. UX/UI/accessibility (lead).
4. Frontend components/state/interaction (lead).
5. Backend services/API/integrations (lead + read-only Explore lane).
6. Data models/D1/app-authz (read-only Explore lane).
7. Security/privacy/threat model (lead).
8. Performance/reliability/observability (lead).
9. Testing/QA (lead).
10. Deployment/rollout/rollback (lead).
11. Blast radius/dependencies (lead).
12. Adversarial gap analysis + final verification (lead, emulated).

### Implementation-readiness criteria
- Every owner sender action has an explicit state matrix (happy/pending/success/failure/recovery) and is traced to code + test.
- The mobile decision is resolved (owner-delegated where needed) with a proof-backed rationale.
- No duplication with the four sibling packs; file-scope ownership is explicit.
- All planning gates in `Creating-Plan-Prompt.md` §17 are satisfied or honestly blocked.

### Validation criteria
- `git diff --check` clean on the plan folder (no application files touched).
- Two critique-and-revision cycles completed for this `exhaustive` profile (or bounded exception recorded).
- Requirements traceability complete (every REQ → task → test → rollout).

### Final planning deliverables
`00–19` + `README.md` per the exhaustive profile.

### Stop condition
The pack is complete when proposal sending can be **planned** as an owner-operable workflow across expected devices — i.e., the mobile decision is resolved, every sender action has a state matrix, errors/recovery/audit-proof/a11y/tests are defined, and sibling-pack boundaries are non-overlapping.

---

## Lanes, goals, and status

| Lane / role | Goal | Native or emulated | Status |
|---|---|---|---|
| Lead coordinator (this agent) | Scope, synthesis, integration, final claim | emulated (single agent) | COMPLETE |
| Source & codebase architecture (Explore) | Audit publisher/publication/sender files + mobile block | native Explore subagent | COMPLETE |
| Backend/authz/data (Explore) | Audit actions, D1 schema, app-authz, credentials, email, rate limits, tests | native Explore subagent | COMPLETE |
| Plan/Doc/sibling-trace (Explore) | `.ai/03_plans/` siblings, FAST PATH, DESIGN.md, specs | native Explore subagent | COMPLETE |
| Product/UX/a11y planner | Journeys, state matrix, mobile decision | emulated by lead | COMPLETE |
| Security/privacy reviewer | Threat model, authz, abuse | emulated by lead | COMPLETE |
| Performance/reliability reviewer | Budgets, failure modes, observability | emulated by lead | COMPLETE |
| Test/QA strategist | Test matrix, commands, adversarial matrix | emulated by lead | COMPLETE |
| Adversarial reviewer | Find omissions, contradictions, vague tasks | emulated by lead | COMPLETE (cycle 1 + 2) |
| Final verifier | Requirement-by-requirement audit | emulated by lead (cap applies) | COMPLETE (emulated) |

Three native Explore subagents were genuinely dispatched (agent ids returned by the tooling). The remaining lanes were emulated as separated passes because no additional native delegation lane was available for synthesis. This is recorded honestly; `verification_mode: emulated` caps are applied in `17`.

---

## Skills discovered and used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | Yes | Binds the dated `.ai/03_plans/<date>-<slug>/` convention, plan-pack-vs-in-session decision, and loop contract to this repo. Confirmed this work is high-blast-radius (publication/shared links/sender authz/release) → exhaustive plan pack is required. |
| `Creating-Plan-Prompt.md` (planning directive) | Yes | Authoritative structure + completion gates for the exhaustive profile (00–19 + README). |
| `Multi-Agent-Execution-Directive.md` | Yes | Authority model, verification-mode caps, concurrent-repo safety, evidence classes. |
| Explore (read-only search agent) | Yes | Dispatched 3 native lanes for publisher UI, backend/authz/data, and sibling-plan trace. |
| `gitnexus` | Not used | The mobile block and sender surface are narrow, well-localized edits; `rg` + targeted reads covered the call graph per the AGENTS.md proportional graph policy. |
| Cloudflare skills (`cloudflare`, `cloudflare-email-service`) | Consulted conceptually | Used the *audit findings* from the backend lane (EMAIL binding send path) rather than re-loading the skills; no provider mutation in a planning-only task. |

No skill was fabricated. No unavailable capability was misrepresented.

---

## Shared coordination ledger

| Lane | Owned scope | Dependencies | Current work | Key findings | Conflicts | Status |
|---|---|---|---|---|---|---|
| Source/UI audit | `src/components/workshop/publisher/*`, `publication/*` | none | Publisher surface audit | Mobile block at `PublisherRosterClient.tsx:224,228`; drawer reachable only via desktop table | none | COMPLETE |
| Backend/authz/data audit | `src/lib/publication/*`, `src/lib/publisher/*`, `migrations/0014` | none | Actions + D1 + credentials + email | Sender backend fully wired; resend 1/5min; rotate invalidates recipients; no rate limit on create/rotate/revoke | none | COMPLETE |
| Sibling/plan trace | `.ai/03_plans/*`, `DESIGN.md`, specs | none | Boundary mapping | 4 sibling packs overlap; workflow pack owns readiness/gating/Preflight | Boundary risk with workflow pack → resolved via file-scope ownership | COMPLETE |
| Lead synthesis | whole pack | all 3 lanes | Writing 00–19 + README | Mobile decision + sender state matrix are the spine | none | COMPLETE |

### Conflict resolution log
- **Conflict (potential):** `client-ready-proposal-package-workflow` Phase 6 owns resend/revoke gating + Preflight owner UX in the same files this pack touches (`src/components/workshop/publisher/*`, `src/lib/publication/*`).
- **Resolution:** This pack owns **device operability + sender-action clarity + owner-side error/recovery/audit-proof/a11y**. Where implementation touches the same files as the workflow pack, this pack treats the workflow pack's Phase-6 changes as a **dependency** (`depends-on-workflow-pack`) and serializes (see `10_BLAST_RADIUS_AND_DEPENDENCIES.md`). No logic is duplicated; shared-file tasks are marked `SEQUENTIAL-DEPENDS-ON-WORKFLOW-PACK`.
- **Rejected alternative:** Merging this scope into the workflow pack. Rejected because the mobile decision + sender checklist + owner-side error/recovery are a distinct, separately-reviewable concern, and the PROMPT explicitly scopes them here.

---

## File/module ownership for future implementation

| File / area | Owner pack | Notes |
|---|---|---|
| `src/components/workshop/publisher/PublisherRosterClient.tsx` (mobile layout decision) | **THIS PACK** | Mobile operability is the spine. |
| `src/components/workshop/publisher/PublisherEmptyState.tsx` (`mobile` variant copy) | **THIS PACK** | Only if mobile decision changes the message; else read-only. |
| `src/components/workshop/publisher/PublisherRosterRow.tsx` (action affordances) | **THIS PACK** | Sender action clarity (copy/open/manage labels + states). |
| `src/components/workshop/publisher/PublisherDrawer.tsx` (sender-action states) | **THIS PACK** (states/a11y) + workflow pack (gating) | Serialize on this file; see `10`. |
| `src/components/workshop/publication/RecipientEmailComposer.tsx` (sender clarity) | **THIS PACK** (clarity/states) + workflow pack (message) | Serialize; see `10`. |
| `src/lib/publication/actions.ts` (create/republish/rotate/revoke + recipient add/resend/remove) | **shared, serialized** | Do not duplicate workflow-pack readiness gating; audit-only here. |
| `src/lib/publication/security.ts` (credential material) | **audit-only** this pack | No crypto redesign. |
| `migrations/0014_publication_shared_links.sql` | **audit-only** this pack | No new migration in this pack (see `07`). |
| `src/app/workshop/publisher/page.tsx` | **THIS PACK** (if mobile needs server changes) | Read-only unless mobile layout needs server data shape changes. |
| Owner-side structured logs / activity feed | **THIS PACK** | Audit/proof design. |
| Recipient inbox (`proposals-page/*`, `lib/recipient-proposals/*`) | sibling recipient-inbox pack | off-limits. |
| Readiness/Preflight/notifications/`responded` | sibling workflow pack | off-limits. |
| Snapshot immutability/export | sibling deliverable-trust pack | off-limits. |
| `/api/share/[token]/activity` contract | sibling activity-minimization pack | off-limits. |
