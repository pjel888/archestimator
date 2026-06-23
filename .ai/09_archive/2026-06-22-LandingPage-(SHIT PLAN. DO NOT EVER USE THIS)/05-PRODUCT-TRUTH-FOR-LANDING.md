# Product Truth For Landing

Date: 2026-06-22
Scope: `.ai/03_plans/2026-06-22-LandingPage`

This document is the product-truth brief for future landing-page work. It exists
so a codebase AI can build the public homepage from Archestimator's actual
product, not from stale contractor-first language or generic SaaS instincts.

## Source Hierarchy

Use this order when sources conflict:

1. Current source and current-state fast path.
2. `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` for strategy, positioning, copy, and claims discipline.
3. `.ai/00_corpus/archestimator-app-bible.md` for app-surface inventory, with source/current-state winning on conflicts.
4. `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/` for user journeys, proof gates, trust/recovery concerns, and persona/access-path vocabulary.
5. Existing landing design-reference docs in this folder for visual direction.

The downloaded files named in the task are byte-identical to the repo corpus
copies as checked on 2026-06-22. Use the repo copies as the working references.

## Non-Negotiable Positioning

Archestimator is AEC-first.

Do not write the homepage as contractor-first. The current app bible still says
"contractor-first" in its one-page intro, but that line is stale relative to the
master corpus. The master explicitly says the mission replaces pre-pivot
contractor-first wording and is now AEC-committed
(`.ai/00_corpus/ARCHESTIMATOR_MASTER.md:110`, `:278-280`).

Correct identity:

- Archestimator is a cost proposal workspace for teams that build, send, revise,
  approve, and track commercial estimates (`ARCHESTIMATOR_MASTER.md:58-60`).
- The public hook is the cost intelligence layer, always with an AEC or
  construction qualifier (`ARCHESTIMATOR_MASTER.md:50-53`, `:124`).
- The target market is the AEC ecosystem across people who build estimates and
  people who approve cost proposals (`ARCHESTIMATOR_MASTER.md:75`).
- Contractors/GCs are one Tier 1 role, beside cost estimators/QS, specialty and
  fit-out firms, and architects (`ARCHESTIMATOR_MASTER.md:285-293`).

Landing rule: lead with AEC teams, cost estimates, cost proposals, and
proposal-to-approval trust. Contractors can appear in role sections or use-case
copy, but never as the product's identity.

## What The Product Is

Archestimator turns the spreadsheet-based cost proposal workflow into a
structured workspace where estimating work compounds.

Core thesis:

- Estimates hold supplier choices, product assumptions, pricing logic, proposal
  revisions, and client decisions.
- In spreadsheets, that commercial intelligence dies.
- Archestimator turns it into reusable commercial infrastructure
  (`ARCHESTIMATOR_MASTER.md:69-79`).

Plain landing sentence:

> Archestimator is your cost intelligence layer for AEC cost proposals. Build
> estimates from your own prices and suppliers, keep the revision record
> attached, and share proposals clients can review and approve.

Do not lead with:

- generic productivity;
- generic construction software;
- AI estimating;
- ERP/procurement;
- "the only tool that makes estimates reusable";
- "contractor-first".

## Live Product Proof

The landing page should prove the product with real or faithful Archestimator
surfaces. The strongest proof surfaces are:

| Proof surface | What it proves | Source anchors |
| --- | --- | --- |
| Estimate Sheet / estimate workspace | Project context, tree, sheet rows, quantities, library inserts, tab-aware editing, traceable data entry | `archestimator-app-bible.md:112-123`; UX audit golden path `01-beta-product-thesis-and-prioritization.md:23-37` |
| Component library and templates | The "never start from zero" promise: reusable costs, suppliers, images, attachments, and reusable structures | `archestimator-app-bible.md:125-131`; `ARCHESTIMATOR_MASTER.md:84`, `:336-341` |
| Activity / revision history | Defensible numbers, record attached to the estimate, no broken spreadsheet story | `ARCHESTIMATOR_MASTER.md:84`, `:177-182`, `:538-546` |
| Shared proposal links | Proposal handoff, password protection, comments, decisions, recipient review without full workshop access | `archestimator-app-bible.md:142-148`; `ARCHESTIMATOR_MASTER.md:538-546` |
| XLSX export | Proposal output today, with PDF intentionally not current | `archestimator-app-bible.md:150-155` |
| Project data/charts | AEC cost comparison and project intelligence, but secondary to the estimate-to-proposal loop | `archestimator-app-bible.md:196`; `ARCHESTIMATOR_MASTER.md:84` |
| Collaboration/invites/presence | Team estimation and review context, but do not overclaim broad workflow maturity | `archestimator-app-bible.md:133-140` |

Hero proof priority: Estimate Sheet plus right-side library/templates plus a
small revision/proposal record rail. The user specifically wants real app
screenshots eventually; until those exist, use faithful product compositions
that mirror the real surfaces and avoid fake customer adoption.

## UX Audit Implications

The UX audit says the beta story is the project-to-estimate-to-proposal loop,
not a broad platform story.

Golden path:

1. User signs in and reaches a project.
2. User creates or opens an estimate.
3. User edits rows, costs, library inserts, versions, and attachments with clear
   pending/saved/failed state.
4. User reviews proposal/share package.
5. Owner shares or exports.
6. Recipient understands, comments or decides, and can recover from failure
   (`01-beta-product-thesis-and-prioritization.md:23-37`).

Landing implications:

- Show the Estimate Sheet as a working surface, not an abstract dashboard.
- Show client-recipient comprehension as part of the value, not a footnote.
- Preserve evidence honesty: source evidence, related tests, browser proof, and
  provider proof are different proof levels.
- Keep public copy from drifting ahead of implementation
  (`04-ux-state-accessibility-and-content-contracts.md:13-21`).
- Use "Primary App User", "Project Collaborator", and "Shared-Link Recipient"
  when discussing access paths. Personas are not permission roles
  (`10-access-path-and-persona-taxonomy.md:1-21`).

## Claims Discipline

Allowed present-tense claims:

- structured quote/estimate workspace proof case;
- reusable library;
- templates;
- charts;
- Activity and version history;
- shared proposal links with comments, decisions, and password protection;
- XLSX proposal export.

Forbidden or future-only:

- public self-serve maturity;
- production-hardened claims;
- legal automation;
- immutable issued records;
- full procurement/ERP;
- PO execution, payments, or transaction layer;
- mature enterprise SaaS;
- fake adoption, fake logos, fake integrations, fake ROI, fake accuracy;
- AI as current hero capability;
- cross-project client/typology recall as shipped;
- supplier catalog/quote requests as shipped.

The master corpus is explicit: AI is deferred, planned work must be labeled, and
the cost intelligence layer is marketed as the direction with the live foundation
as proof (`ARCHESTIMATOR_MASTER.md:682-691`).

## Copy Voice

Voice: Controlled Confidence.

Use:

- cost intelligence layer;
- cost estimate;
- cost proposal;
- BOQ;
- unit costs;
- proposal-ready;
- reusable cost logic;
- revision context;
- defensible estimates;
- commercial control;
- AEC teams;
- proposal handoff.

Avoid:

- generic AI/productivity/automation language;
- fake category leadership;
- taunting competitors or users;
- "only the smart ones";
- "the only tool";
- guaranteed accuracy;
- legal/compliance guarantees.

The master copy pack gives the strongest homepage control:

- Hero: "Your cost intelligence layer."
- Support: build estimates from a library of your own prices and suppliers, keep
  every revision on record, and send proposals clients can review and approve
  (`ARCHESTIMATOR_MASTER.md:533-536`).
- Who it is for: built for AEC teams enterprise tools overlook
  (`ARCHESTIMATOR_MASTER.md:548-550`).
- Spreadsheet contrast: a spreadsheet resets every project; Archestimator keeps
  the knowledge (`ARCHESTIMATOR_MASTER.md:551-553`).

## Product Maturity Boundary

The product is pre-launch MVP / owner-only closed beta. That does not mean fake
or unused, but it does mean the landing page must avoid general-availability
language.

Use:

- "Request early access";
- "Book a walkthrough";
- "Pre-launch MVP preview" where maturity matters;
- "built for AEC teams" with live features as proof.

Do not publish unvalidated pricing. The master corpus records pricing numbers as
pre-publication hypotheses, not public truth (`ARCHESTIMATOR_MASTER.md:88-90`).

## Product Narrative For The Page

The landing page should use one clean narrative:

1. AEC teams build cost proposals from work, judgment, suppliers, and revisions.
2. Spreadsheets make that knowledge restart every project.
3. Archestimator structures the estimate so the work becomes reusable.
4. The Estimate Sheet, library, revision record, shared proposal, and export are
   the live proof.
5. The long-term direction is a supplier-linked AEC cost intelligence layer, but
   roadmap items stay labeled.

The result should feel professional, finance-aware, and progressive. The page
can be visually innovative, but the product proof must make it clear this is
software for commercial decisions, not a decorative brand concept.

## Historical Source Note

The older executive-summary folder reinforces the useful thesis: Archestimator
is a structured quote, estimate, and proposal workspace where commercial work
stops dying in disposable files. It also frames construction as a wedge into a
broader quote-heavy B2B opportunity, which supports the current AEC-first
positioning without reverting to contractor-first copy.

The older pitch-deck PDF was present but did not expose useful text through
local extraction in this pass, so future landing copy should not cite or infer
specific pitch-deck claims unless the implementer reviews the visual deck
directly.
