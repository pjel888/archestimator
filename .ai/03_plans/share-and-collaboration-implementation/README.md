# Share & Collaboration Implementation Readiness

**Date consolidated:** 2026-05-31
**Status:** Canonical combined planning folder. Planning/audit complete; implementation not started from this folder.
**Scope:** Collaboration Invites, Shared Link manager hardening, and `/share/[token]` receiver UX.

This folder supersedes the separate planning surfaces:

- `.ai/03_plans/collaboration-and-sharing-audit/`
- `.ai/03_plans/share-page-ux-ui-maximization/`

The source documents were not pasted together. They are organized into one implementation-ready folder with one canonical flow, one conflict-resolution map, and one verification handoff.

## Read First

1. `09-unified-implementation-flow.md` — canonical sequencing and dependencies.
2. `10-source-map-and-conflict-resolution.md` — what each source doc owns and which doc wins on conflicts.
3. `11-validation-and-agent-handoff.md` — QA gates, agent lanes, and stop conditions.
4. `05-security-threat-model-and-hardening.md` — token, cookie, rate-limit, CSRF, and audit constraints.
5. `07-implementation-acceptance-criteria.md` — detailed acceptance criteria for collaboration invite and shared-link manager work.
6. `shared-link-receiver-ux/13-implementation-prd-and-slice-contract.md` and `shared-link-receiver-ux/15-implementation-test-spec.md` — receiver-page PRD and tests.

## Lanes

| Lane | Folder | Current status | Direct implementation dependency |
| --- | --- | --- | --- |
| Collaboration Invites | `collaboration-invite/` | Config-blocked / non-functional | Supabase Auth email + invite env vars before live-flow claims |
| Shared Link Manager | `shared-link-manager/` | Functional, below parity / hardening incomplete | Can start manager visibility and safety work independently |
| Shared Link Receiver UX | `shared-link-receiver-ux/` | Planning-only UX maximization pack | Can start no-API layout work after evidence refresh |
| Cross-cutting Security/Performance | root `05`, `06`, `07`, `08` | Required for all lanes | Must gate public/interacting endpoints and shared data changes |

## Canonical Strategy

Use a staged implementation, not a broad rewrite:

1. Refresh current evidence and graph impact.
2. Do external invite unblocking separately from code work.
3. Fix safety and false-positive behavior before expanding collaboration UX.
4. Build one shared project-list data extension for publication status and invite status.
5. Improve shared-link manager visibility.
6. Improve `/share/[token]` receiver layout in no-API slices.
7. Add invite visibility only after acceptance can be safely performed without raw tokens.
8. Close email/compliance and advanced feature work last.

## Non-Negotiables

- Do not treat this folder as implementation evidence.
- Do not claim collaboration invites work until the external provider/env path and gated E2E prove it.
- Do not mutate invite acceptance on GET.
- Do not widen public share interactivity without durable rate limiting or a written exception approved for local-only work.
- Do not mix Teamspaces membership semantics into `/share/[token]`; Shared Link remains view-only publication.
- Do not touch schema/API/security in receiver layout slices unless the unified flow explicitly schedules that work.
- Do not use lane-local phase numbers when they conflict with `09-unified-implementation-flow.md`.

## Preserved Evidence

The receiver UX evidence remains under:

- `shared-link-receiver-ux/evidence/share-page-audit-desktop.png`
- `shared-link-receiver-ux/evidence/share-page-audit-mobile.png`

The measured baseline from the receiver plan is:

| Viewport | Content cap | Main flex width | Estimate pane | Right rail | Page height |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1440 x 1000 | 1280px | 1216px | 876px | 320px | 3589px |
| 390 x 844 | 390px | 358px | 358px | 358px stacked | 1122px |

## Document Inventory

### Root

| File | Purpose |
| --- | --- |
| `00-executive-brief-and-north-star.md` | Feature distinction, quality bar, health assessment, cross-feature framing |
| `05-security-threat-model-and-hardening.md` | Security constraints, rate-limit matrix, token/cookie lifecycle, audit events |
| `06-performance-and-observability-plan.md` | Index/query strategy, rate-limit storage, metrics, alerts |
| `07-implementation-acceptance-criteria.md` | Detailed acceptance criteria for invite and shared-link manager work |
| `08-codebase-ai-implementation-prompts.md` | Source prompt blocks; use after checking `09` and `11` |
| `09-unified-implementation-flow.md` | Canonical implementation order and dependency gates |
| `10-source-map-and-conflict-resolution.md` | Source ownership, duplicate resolution, conflict precedence |
| `11-validation-and-agent-handoff.md` | QA protocol, agent lanes, review gates, stop conditions |

### Collaboration Invite

| File | Purpose |
| --- | --- |
| `collaboration-invite/01-current-inventory.md` | Current invite routes, actions, DB, env, tests |
| `collaboration-invite/02-feature-gap-analysis.md` | 33 invite gaps: 3 critical, 12 high, 10 medium, 8 low |
| `collaboration-invite/03-ux-paths-and-happy-paths.md` | Invite journeys, broken states, signed-out/signed-in/wrong-account paths |
| `collaboration-invite/04-prioritized-improvement-roadmap.md` | Invite lane roadmap and code-level proposals |
| `collaboration-invite/appendix-ux-signifiers-and-visibility.md` | Cross-surface invite status/signifier study |

### Shared Link Manager

| File | Purpose |
| --- | --- |
| `shared-link-manager/01-current-inventory.md` | Current manager/recipient/shared-link inventory |
| `shared-link-manager/02-feature-gap-analysis.md` | 34 shared-link gaps: 0 critical, 5 high, 13 medium, 16 low |
| `shared-link-manager/03-ux-paths-and-happy-paths.md` | Manager/recipient journeys and friction points |
| `shared-link-manager/04-prioritized-improvement-roadmap.md` | Manager/hardening roadmap |
| `shared-link-manager/appendix-industry-comparison.md` | Dropbox, Google Drive, Figma, Notion comparison |
| `shared-link-manager/appendix-technical-analysis.md` | Publish/view/session/security architecture deep dive |

### Shared Link Receiver UX

| File | Purpose |
| --- | --- |
| `shared-link-receiver-ux/README.md` | Original receiver UX pack index and baseline measurements |
| `shared-link-receiver-ux/00-north-star-and-success-criteria.md` | Receiver UX north star and non-goals |
| `shared-link-receiver-ux/01-current-implementation-inventory.md` | `/share/[token]` route/component/API/test inventory |
| `shared-link-receiver-ux/02-blast-radius-and-dependency-audit.md` | Receiver-specific graph and risk gates |
| `shared-link-receiver-ux/03-live-layout-and-visual-audit.md` | Desktop/mobile visual measurements |
| `shared-link-receiver-ux/04-ux-paths-happy-sad-edge-cases.md` | Receiver journeys and edge cases |
| `shared-link-receiver-ux/05-ui-layout-maximization-plan.md` | Layout option history and selected direction context |
| `shared-link-receiver-ux/06-feature-opportunities-roadmap.md` | Receiver UX feature opportunities and deferrals |
| `shared-link-receiver-ux/07-component-architecture-and-data-plan.md` | Receiver component/state/data plan |
| `shared-link-receiver-ux/08-readiness-risks-open-questions.md` | Receiver readiness and residual questions |
| `shared-link-receiver-ux/09-validation-qa-acceptance-gates.md` | Receiver visual/browser acceptance matrix |
| `shared-link-receiver-ux/10-agent-handoff-and-execution-sequence.md` | Historical handoff; superseded by `13`, `15`, and root `09` where slice order conflicts |
| `shared-link-receiver-ux/11-personas-jobs-and-scenario-fit.md` | Receiver personas and jobs |
| `shared-link-receiver-ux/12-selected-ui-strategy-and-wireframe-contract.md` | Canonical receiver UI strategy and breakpoint contracts |
| `shared-link-receiver-ux/13-implementation-prd-and-slice-contract.md` | Canonical receiver PRD and slice gates |
| `shared-link-receiver-ux/14-third-pass-quality-review.md` | Receiver plan review log |
| `shared-link-receiver-ux/15-implementation-test-spec.md` | Canonical receiver test spec |
