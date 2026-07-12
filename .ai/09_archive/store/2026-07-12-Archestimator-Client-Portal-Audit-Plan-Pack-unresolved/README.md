# Archestimator Client Portal & Publisher — Comprehensive Audit and Plan Pack

**Audit date:** 2026-07-12  
**Repository baseline:** `pjel888/archestimator` on `main`, refreshed at commit `6b59648a70c485cd54bad8f3659b3ec454621530`  
**Primary route family:** `/share/[token]`, `/api/share/[token]/*`, `/workshop/publisher`  
**Deliverable type:** source-grounded product, UX, data, security, and implementation plan  
**Execution status:** local implementation in progress; Units 001–017 and 019
are verified locally, while Units 018, 020, and 021 retain release-only proof
boundaries

## Status capsule

- **Profile:** `high-blast-radius`
- **Package status:** `IMPLEMENTATION_READY`
- **Implementation status:** `IN_PROGRESS`
- **Release status:** `NOT_EVALUATED`
- **Plan lifecycle:** `ACTIVE`
- **Terminal status:** `ACTIVE`
- **Current run scope:** `IMPLEMENT_LOCAL`
- **Canonical execution artifact:** `15-IMPLEMENTATION-ROADMAP-AND-BACKLOG.md`
- **Resume point:** `UNIT-018`, `UNIT-020`, and `UNIT-021` release gates
- **Durable resume state:** `LOOP_LEDGER.md`
- **Manifest:** `plan-pack.json`

## The decision

Archestimator should stop treating the shared link as a centered, fixed-format proposal document. It should become a **full-width, configurable Client Portal**: a stable, branded project-review workspace in which the owner chooses the visible tabs, estimate sheets, financial views, discussion rights, decision rights, and client-safe activity history.

The Publisher should likewise stop being primarily a link drawer. It should become the **Client Portals control center** for composing portal content, applying owner/client branding, managing recipients and capabilities, issuing immutable versions, previewing each role, monitoring discussions and approvals, and seeing the next required action.

The recommended architecture is:

1. **Stable portal identity and URL.**
2. **Immutable issued versions** beneath the portal.
3. **Typed, owner-configurable portal sections**, not an arbitrary page builder.
4. **Threaded, contextual discussions with a chat-like presentation**, not an unstructured live chat.
5. **Role templates plus resource-level capability checks**, not role strings alone.
6. **Snapshot-safe financial and comparison data**, never live public reads from private estimate tables.
7. **Two-brand white-label support**—owner and client—without arbitrary CSS.
8. **A full-width adaptive shell** that uses the available browser canvas.

## Why this pack supersedes narrower prior plans

The repository contains a July 10 Publisher/Shared Pages plan and a July 12 Publisher audit. Those artifacts remain useful evidence, but they predate or intentionally exclude several requirements now established by the owner:

- multiple top-level client-facing tabs;
- financial summaries and comparative visualizations;
- full-width portal layout;
- advanced threaded conversation;
- owner and client logos;
- recipient roles and granular permissions;
- stable portal continuity across issued revisions;
- multiple portals per project or audience;
- optional client-safe activity history.

This pack incorporates the current code that has already landed and replaces the old “make the proposal page clearer” framing with a coherent Client Portal system.

The July 12 `Shared-Estimate-Page` audit has now been source-reviewed and consolidated into this pack. Its valid findings are retained through `21-SHARED-ESTIMATE-PAGE-AUDIT-DELTA.md`; obsolete findings and its audit-stage `COMPLETE/ACHIEVED` status are not inherited as implementation claims. The original pack is preserved only in the canonical archive after consolidation.

## Read order

| File | Purpose |
|---|---|
| `00-EXECUTIVE-DECISION.md` | Product verdict, key architecture choices, MVP boundary |
| `01-EVIDENCE-AND-CURRENT-STATE-AUDIT.md` | What exists, what is strong, and what is structurally wrong |
| `02-PRODUCT-MODEL-AND-TERMINOLOGY.md` | Canonical concepts, lifecycle, naming, product principles |
| `03-CLIENT-PORTAL-INFORMATION-ARCHITECTURE.md` | Portal navigation, section registry, recipient journeys |
| `04-FULL-WIDTH-UX-UI-SPEC.md` | Edge-to-edge responsive shell and interaction specification |
| `05-DISCUSSIONS-THREADS-AND-CHAT-SPEC.md` | Recommended hybrid discussion model |
| `06-PUBLISHER-CONTROL-CENTER-SPEC.md` | Owner-side portal management redesign |
| `07-RBAC-RECIPIENTS-AND-ACCESS-CONTROL.md` | Internal and external roles, capabilities, policy evaluation |
| `08-DATA-MODEL-VERSIONING-AND-MIGRATION.md` | Stable portal + immutable issue schema and legacy migration |
| `09-FINANCIAL-TABS-CHARTS-AND-DATA-GOVERNANCE.md` | Financial section catalog, chart safety, totals parity |
| `10-ACTIVITY-ANALYTICS-NOTIFICATIONS.md` | Audit events, client activity, recipient funnel, reminders |
| `11-WHITE-LABEL-BRANDING-ASSETS-DOMAINS.md` | Owner/client branding, uploads, emails, print, custom domains |
| `12-SECURITY-PRIVACY-AUDIT-AND-RECORDS.md` | Threat model, secure sharing, issued-record boundaries |
| `13-TECHNICAL-ARCHITECTURE-AND-CODE-CHANGE-MAP.md` | Component, route, repository, storage, and refactor map |
| `14-API-CONTRACTS-AND-EVENT-TAXONOMY.md` | Public/manager API shapes and canonical events |
| `15-IMPLEMENTATION-ROADMAP-AND-BACKLOG.md` | Dependency-ordered execution units |
| `16-QUALITY-TEST-RELEASE-AND-OPERATIONS.md` | Proposed evidence, QA, migration, rollout, rollback |
| `17-RISK-REGISTER-DECISIONS-OPEN-QUESTIONS.md` | Risks and recommended resolutions |
| `18-INDUSTRY-RESEARCH-AND-BENCHMARKS.md` | Proposal, AEC, collaboration, security, and platform research |
| `19-REQUIREMENTS-TRACEABILITY.md` | User requirement → design → implementation → evidence mapping |
| `20-SOURCE-REGISTRY.md` | GitHub, Notion, and official industry source registry |
| `21-SHARED-ESTIMATE-PAGE-AUDIT-DELTA.md` | Retained, superseded, and reconciled findings from the older pack |
| `LOOP_LEDGER.md` | Durable planning checkpoint, decisions, evidence, and resume state |
| `plan-pack.json` | Machine-readable status, traceability, DAG, and artifact manifest |

## Evidence boundary

The original audit used:

- the current GitHub repository through the connected GitHub application;
- current Notion product-truth, architecture, security, roadmap, feature, and archive pages;
- official product documentation from Qwilr, Procore, Bluebeam, Figma, Notion, Slack, Cloudflare, NIST, OWASP, and W3C.

The supplied localhost URL was not visually opened during the original audit.
The shared page was therefore audited through its current route, components,
APIs, repositories, migrations, and prior repository evidence. Since then,
local source, migrations, and user-authorized focused tests have implemented
the verified execution units recorded in `LOOP_LEDGER.md` and `evidence/`.
No browser automation, screenshots, or hosted-provider proof is claimed; those
surfaces remain subject to current-task authorization and explicit release
boundaries.

## Recommended delivery boundary

The first production-worthy release should include the Client Portal foundation, not every possible portal feature.

**Core release:** stable portal, immutable issues, full-width shell, typed sections, estimate browser, basic financial insight sections, owner/client branding, recipient roles, contextual threaded discussion, issue-wide formal decision, optional client-safe activity, and a full Publisher control center.

**Later:** custom domains, client-managed recipients, arbitrary report builder, deep e-signature, payments, persistent paid archive, private recipient-to-recipient channels, and real-time chat presence.

The critical rule is simple: **build an extensible portal system now, but ship a constrained section registry and constrained workflow first.**
