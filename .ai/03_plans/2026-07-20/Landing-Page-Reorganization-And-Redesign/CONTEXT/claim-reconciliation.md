# Directive and Product-Claim Reconciliation Ledger

This ledger is the clause-level authority for material claims and directives that may affect the `/new` implementation. It reconciles the supplied corpus against the founder's current task directive and current repository source. A corpus statement not represented here cannot become public landing copy or product proof without a fresh source check and a ledger update.

## Status Semantics

- **ACCEPTED:** may control implementation or public copy at the stated strength.
- **PARTIAL:** only the explicitly named subset is current; the excluded implication is prohibited.
- **SUPERSEDED:** retained as historical context but cannot control this redesign.
- **PROHIBITED:** cannot appear as copy, proof, UI theater, metadata, or conversion behavior.

## Design and Route Directives

| Material directive | Status | Exact authority / current source | Implementation disposition |
|---|---|---|---|
| Rebuild `/new` from scratch, using current Attio structure, type, and motion as the primary grammar | ACCEPTED | Founder task directive recorded in `CONTEXT/README.md`; live study in `evidence/reference-studies/attio-com-grammar.md` | Use the 18-beat one-to-one functional mapping in `architecture/section-system.md`. |
| Use Comand and Intercom only as secondary cues | ACCEPTED | Founder task directive recorded in `CONTEXT/README.md`; studies in `evidence/reference-studies/comand-ai-grammar.md` and `evidence/reference-studies/intercom-com-grammar.md` | Secondary references cannot reorder, replace, or visually dominate the Attio-led spine. |
| Carry over only the canonical logo/wordmark and Signal orange | ACCEPTED | `src/components/brand/ArchestimatorLogo.tsx`; `src/components/brand/ArchestimatorLogoMark.tsx`; `src/components/brand/ArchestimatorWordmark.tsx`; `src/app/globals.css` | These are the only existing implementation imports/tokens approved for the new marketing tree. |
| Retain or refactor the current `/new` visual implementation | SUPERSEDED | Conflicting historical direction in `CONTEXT/ARCHESTIMATOR_LANDING_PAGE_CREATIVE_DIRECTION_IMPLEMENTATION_BRIEF_V1_2026-07-20.md`; current tree at `src/components/landing-new/**` | Do not import, copy, adapt, trace, or preserve its code, copy, layout, scene, motion, CSS, or assets. |
| Reuse the current route shell, metadata helper, title, or description | SUPERSEDED | Current implementation at `src/app/new/page.tsx`; `src/components/landing/PublicPageShell.tsx`; `src/lib/landing/seo-metadata.ts` | Author a fresh route composition and a fresh literal `Metadata` object. Re-declaring `dynamic = "force-static"` is a framework configuration decision, not copied implementation. |
| Preserve the old Three/WebGL/GSAP scaffold or use Edra as a reference | SUPERSEDED | Conflicting historical direction in `CONTEXT/ARCHESTIMATOR_LANDING_PAGE_CREATIVE_DIRECTION_IMPLEMENTATION_BRIEF_V1_2026-07-20.md` | New `/new` uses server-rendered DOM/SVG and native browser APIs only. |
| Preserve the prior section scaffold or typography direction | SUPERSEDED | Conflicting historical direction in `CONTEXT/ARCHESTIMATOR_LANDING_PAGE_CREATIVE_DIRECTION_IMPLEMENTATION_BRIEF_V1_2026-07-20.md` | The 18-beat Attio mapping and scoped Inter contract replace the old information architecture and display system. |

## Canonical Public Message

| Material claim | Status | Exact authority / current source | Allowed public form |
|---|---|---|---|
| Category: construction estimating software | ACCEPTED | `CONTEXT/ARCHESTIMATOR_CORE_V2_2026-07-20.md`; `CONTEXT/ARCHESTIMATOR_BRAND_BUSINESS_STARTUP_CORPUS_V2_2026-07-20.md` | Category or eyebrow copy. |
| Descriptor: an estimate-to-proposal workspace built around reusable cost intelligence | ACCEPTED | `CONTEXT/ARCHESTIMATOR_CORE_V2_2026-07-20.md`; `CONTEXT/ARCHESTIMATOR_BRAND_BUSINESS_STARTUP_CORPUS_V2_2026-07-20.md` | Descriptor copy, without AI or pooled-database implications. |
| Hero: “Make every estimate easier to build, clearer to present, and simpler to approve.” | ACCEPTED | `CONTEXT/ARCHESTIMATOR_CORE_V2_2026-07-20.md`; `CONTEXT/ARCHESTIMATOR_CORPUS_V2_P0_CHANGELOG_2026-07-20.md` | Exact H1. “Simpler to approve” is a workflow benefit, not an approval guarantee. |
| Subheadline: “Archestimator helps AEC teams reduce rework, communicate project costs clearly, and move decisions forward without losing context through reviews and revisions.” | ACCEPTED | `CONTEXT/ARCHESTIMATOR_CORE_V2_2026-07-20.md`; `CONTEXT/ARCHESTIMATOR_CORPUS_V2_P0_CHANGELOG_2026-07-20.md` | Exact hero lead. Do not convert “helps” into quantified outcomes. |
| Benefit line: “Less rework. Clearer proposals. Better cost decisions.” | ACCEPTED | `CONTEXT/ARCHESTIMATOR_CORE_V2_2026-07-20.md` | Exact supporting line; no metric or ROI expansion. |
| Primary CTA: “Request early access” | ACCEPTED | Corpus files above; parser in `src/components/landing/ContactForm.tsx` | Every conversion instance uses `/contact?intent=started#contact-form`; no alternate conversion destination. |
| Founder is an architect and software engineer with direct AEC/product experience | ACCEPTED | `CONTEXT/ARCHESTIMATOR_BRAND_BUSINESS_STARTUP_CORPUS_V2_2026-07-20.md`; restrained current public phrasing in `src/app/about/page.tsx` | Use the short founder-practitioner statement only; no unverified customer quote, photo, credential embellishment, or employer logo. |

## Product-Proof Claims

| Material product claim | Status | Exact current source | Allowed representation and boundary |
|---|---|---|---|
| Structured estimate hierarchy, rows, quantities, rates, and totals | ACCEPTED | `src/lib/estimates/types.ts`; `src/lib/estimates/tree-hierarchy.ts`; `src/lib/estimates/d1-intents/nodes.ts` | Sanitized deterministic estimate scene. Phase/location/package/trade/room may appear only as fictional user-authored Area names, not first-class typed dimensions. No autonomous generation, takeoff, price truth, or accuracy guarantee. |
| Reusable components, templates, and project sources can be explicitly selected and inserted into an estimate | ACCEPTED | `src/lib/repositories/component-library-repository.ts`; `src/lib/component-library/component-mutation-d1.ts`; `src/lib/reusable-sources/actions.ts`; `src/lib/estimates/actions.ts` | Search, preview, select, and insert/copy states with source/provenance identity. No automatic reuse, global cost database, pooled customer data, labor/services/assemblies taxonomy, or self-learning claim. |
| Proposal preview and editable Excel `.xlsx` download exist | ACCEPTED | `src/components/workshop/ProposalExportPreviewDialog.tsx`; `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts`; `src/lib/proposal-export/create-proposal-workbook.ts` | Preview and download proof. No live two-way Excel synchronization, legal certification, contract, or purchase-order claim. |
| A shared proposal can be printed or saved as PDF through the browser | PARTIAL | `src/components/share/SharePrintButton.tsx`; `src/app/share/print.css`; `src/components/client-portal/ClientPortalShell.tsx` | If mentioned at all, say “Print or save through your browser.” Do not state or depict native PDF generation/download/export. |
| Issued client-portal proposal versions exist | ACCEPTED | `src/lib/client-portal/issue-builder.ts`; `src/lib/client-portal/preview-service.ts`; `src/app/workshop/projects/[projectId]/client-portals/page.tsx` | Show an issued issue/version identity. Do not call it a signed contract, immutable legal record, or automatic client approval. |
| Contextual review and targeted discussion exist | ACCEPTED | `src/lib/client-portal/contracts.ts`; `src/lib/client-portal/public-thread-handlers.ts`; `src/lib/client-portal/thread-repository.ts`; `src/lib/client-portal/publisher-discussion-service.ts` | Show a discussion attached to issued estimate/Area/row content, replies, and open/resolved state. Do not imply anonymous unrestricted access, real-time comments, inline client editing, or automatic retention through every revision. |
| Approve, request changes, and decline decisions can be recorded against an issued proposal | ACCEPTED | `src/components/client-portal/ClientPortalDecisionSection.tsx`; `src/lib/client-portal/decision-service.ts`; `src/lib/client-portal/public-decision-handlers.ts` | Show a decision receipt tied to the current issue. Do not imply e-signature, contract execution, or guaranteed approval. |
| Versions and activity preserve review/decision context | ACCEPTED | `src/lib/client-portal/issue-builder.ts`; `src/lib/client-portal/activity-service.ts`; `src/lib/activity/activity-composer.ts`; `src/lib/estimates/d1-intents/history-events.ts` | Show issue/version label, content hash, source revision, supersession, actor/time, changed fields, and before/after activity as context a user can consult. |
| Unresolved discussions can carry into a later issue | PARTIAL | `src/components/workshop/publisher/ClientPortalComposer.tsx`; `src/lib/client-portal/publisher-discussion-service.ts` | Show only explicit manual selection and target revalidation; unmatched targets become `requires_revalidation`. Never imply automatic carry-forward. |
| Feedback automatically rewrites an estimate or completes a guided feedback-to-estimate loop | PROHIBITED | Review/decision sources above remain separate from estimate mutation in `src/lib/estimates/actions.ts`; no current source contract bridges them | Never animate, state, or imply an automatic mutation. Revision proof ends at a user-controlled handoff informed by preserved context. |
| Product is controlled early access / pre-release | ACCEPTED | `CONTEXT/ARCHESTIMATOR_BRAND_BUSINESS_STARTUP_CORPUS_V2_2026-07-20.md`; `src/lib/legal/terms-content.ts` | “Now onboarding design partners” and early-access FAQ language are allowed; do not imply general availability or production maturity. |

## Proof, Availability, and Conversion Boundaries

| Material claim or surface | Status | Exact authority / current source | Disposition |
|---|---|---|---|
| Named customers, customer logos, testimonials, traction, scale metrics, ROI, time savings, or accuracy rates | PROHIBITED | Claim discipline in the canonical corpus; current public status source `src/components/landing/claims-ledger/claims-data.ts` | Replace reference proof beats with factual product states, founder perspective, and explicitly labelled principles. |
| AI, autonomous estimating, self-learning cost intelligence, automatic pricing, or agentic workflow claims | PROHIBITED | Canonical corpus; deterministic boundary also represented in `src/components/landing/claims-ledger/claims-data.ts` | Do not use in copy, metadata, diagrams, product theater, or motion labels. |
| Integrations, developer API/SDK/MCP, procurement, payments, e-signature, compliance badges, or enterprise-security claims | PROHIBITED | Canonical corpus claim boundaries; `src/components/landing/claims-ledger/claims-data.ts` | Attio's Signals/Connectivity/Developer beats receive truthful Archestimator substitutes, never a renamed false integration/platform claim. |
| Public sample-proposal CTA | PROHIBITED until a real route exists | No verified public sample route in current `src/app/**/page.tsx`; task contract in `CONTEXT/README.md` | Omit the conversion action. Product tabs/anchors are navigation, not a sample CTA. |
| Existing verified Product, Company, and Legal routes | ACCEPTED | Current routes under `src/app/features/page.tsx`, `src/app/about/page.tsx`, `src/app/contact/page.tsx`, `src/app/trust/page.tsx`, `src/app/security/page.tsx`, `src/app/privacy/page.tsx`, and `src/app/terms/page.tsx` | Footer may link only to routes confirmed during implementation; do not invent docs, integrations, customers, changelog, careers, or pricing promises. |

## Implementation Reconciliation Rule

Unit 001 must copy the ledger statuses into `content.ts`/`fixtures.ts` as an allowlist, not rediscover product truth from old landing files. If any named source changes before implementation, re-open only the affected row, update its status and public boundary, and propagate the change through the architecture, unit, requirement, and evidence records before continuing.
