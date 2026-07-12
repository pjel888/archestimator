# 01 — Evidence and Current-State Audit

## 1. Current product truth

The July 10 Notion product-truth page says public proposal snapshots, password protection, recipient sessions, contextual comments, decisions, signer names, event tracking, mobile review, and the Publisher roster are live. It classifies recipient funnel, follow-up state, issue identity, and immutable issued-record policy as partial or planned.

That matches the current repository.

### Live public flow

`src/app/share/[token]/page.tsx` currently:

1. resolves and normalizes a publication token;
2. checks publication status and password access;
3. establishes or verifies a personalized recipient session;
4. loads a sanitized snapshot;
5. creates a view token bound to the current snapshot version;
6. records open/activity analytics asynchronously;
7. renders the proposal header, summary, hero, estimate workspace, comments, and decision controls.

The implementation already has sound primitives worth preserving:

- HMAC-hashed and encrypted publication credentials;
- password hashing and lockout;
- recipient-specific session cookies;
- CSRF and same-origin checks for public writes;
- stale-snapshot conflict detection;
- public ID obfuscation;
- client-safe error envelopes;
- server-side row-total calculation;
- contextual target validation;
- owner activity digests.

### Live estimate presentation

`SharePageTabs.tsx`, `ShareEstimateTreePanel.tsx`, and `ShareEstimateTreeView.tsx` already provide:

- multiple selected estimate sheets;
- nested estimate tabs;
- area/group hierarchy;
- tree and detailed row views;
- row filtering;
- row-level review targets;
- print packaging;
- a cost donut;
- mobile adaptations.

This means the project does **not** need to rebuild basic estimate rendering. It needs to move that renderer inside a larger portal architecture.

### Live discussion and decision flow

`SharePageComments.tsx` currently supports:

- recipient-only posting;
- proposal, estimate, and row targets;
- optimistic rendering;
- retry and offline queue;
- cursor pagination;
- stale-snapshot handling;
- public visibility;
- owner digest.

`SharePageDecision.tsx` currently supports:

- accept;
- decline;
- request changes;
- a confirmation dialog;
- signer name;
- optional note;
- immutable first response;
- stale-snapshot conflict;
- a persisted decision read.

### Live owner flow

`/workshop/publisher` currently provides:

- a project/publication roster;
- master-detail presentation;
- one client-link editor;
- selected estimate scope;
- password control;
- recipient invitations;
- copy, preview, rotate, and revoke;
- owner activity.

That is a useful management foundation, but it is not a control center for a multi-section, branded, permissioned portal.

## 2. Structural findings

### FIND-001 — One active publication per project blocks multiple audiences

The D1 partial unique index `idx_project_publications_one_published_per_project` permits only one published record per project. This prevents different client, executive, consultant, or procurement portals from coexisting.

**Severity:** P0 product architecture  
**Required change:** stable `client_portals` parent with many portals per project.

### FIND-002 — “Save changes” creates a new relationship

`republishProjectPublication` calls `replace_project_publication`, revokes the current row, creates a new publication ID, creates a new token, and writes a new snapshot. Existing recipients, comments, decisions, and events remain attached to the prior publication.

This is valid for issuing a completely new link, but it is wrong for an owner editing one continuing client portal.

**Severity:** P0 continuity/data model  
**Required change:** stable portal identity and separate immutable issue rows.

### FIND-003 — Current decision target semantics are contradictory

The UI can display that a decision applies to a selected estimate or row. The database enforces a unique response on `(recipient_id, publication_id)`, so a recipient can submit only one response for the entire publication.

The current UI therefore presents per-target meaning without supporting a per-target workflow.

**Severity:** P0 decision integrity  
**Required change:** separate comment target from explicit decision scope.

### FIND-004 — Current comments are messages, not a collaboration system

The data model has no thread ID, root subject, parent/reply relation, open/resolved state, assignee, unread state, subscriptions, mentions, or owner reply workflow. Owner-authored public comments are technically representable, but there is no complete owner reply action or UI.

**Severity:** P1 workflow  
**Required change:** portal threads and messages.

### FIND-005 — The page-level layout is still centered and capped

`ShareContainer.tsx` applies `mx-auto` and max widths from 820 to 1440 pixels. Although this improved the previous 960-pixel cap, the page is still fundamentally a centered document column.

This wastes space on large screens and prevents a persistent navigation rail, wide comparisons, and contextual discussion.

**Severity:** P1 UX  
**Required change:** full-width shell with local content measures.

### FIND-006 — There is no top-level portal section manifest

The current “tabs” represent estimate sheets and estimate sub-tabs. The owner cannot compose top-level sections such as Financial Summary, Comparisons, Discussion, Activity, Documents, or Decision.

**Severity:** P0 product model  
**Required change:** typed portal section registry and issue manifest.

### FIND-007 — White-label branding is absent

The snapshot carries project cover, sender, client name, and location, but no formal owner logo, client logo, branding profile, co-branding mode, accessible palette, email brand, or print brand.

`workspace_account_settings` stores organization identity and default currency, but no brand asset references.

**Severity:** P1 trust/positioning  
**Required change:** workspace brand profile + client brand profile + portal override + issued brand snapshot.

### FIND-008 — External permissions are binary

Public visitors can read. Verified recipients can comment and decide. There is no distinction among viewer, commenter, reviewer, and approver. Per-section visibility and downloads are not modeled.

**Severity:** P0 authorization  
**Required change:** recipient roles plus evaluated capabilities.

### FIND-009 — The activity system exists but is not a configured portal feature

A public-safe activity API and `SharedLinkActivityFeed` exist. Publisher uses the feed, but the share page does not expose Activity as an owner-configured top-level section.

The current public activity projection also needs a stronger privacy contract before it is shown broadly.

**Severity:** P1 integration  
**Required change:** explicit activity visibility mode and client-safe event policy.

### FIND-010 — Current project deletion cascades publication data

The current foreign keys cascade from workspaces/projects to publications and from publications to recipients, comments, decisions, and events. This is incompatible with any retention or paid archive promise.

**Severity:** P1 data lifecycle now; P0 before archive/legal record claims  
**Required change:** approved retention policy, tombstone/archive path, and issue-owned immutable content.

### FIND-011 — All rows are not equivalent to all internal fields

Current public rows include description, designation, discipline, material, quantity, unit, row total, image, node, and tab. They do not expose unit cost, misc cost, contingency, supplier provenance, or internal source data.

The owner's requirement should be interpreted as **all published row records must be reachable**, not that every internal commercial field must be exposed. Field visibility must be explicit.

**Severity:** P0 confidentiality  
**Required change:** client-field allowlist and per-section field policy.

### FIND-012 — Current chart infrastructure is reusable and safer than raw-row charting

The project chart repository already aggregates data server-side into space, category, and supplier buckets, estimate comparisons, and cost composition. Its type contract explicitly avoids sending raw unit costs and supplier IDs to the browser.

This should be adapted into immutable issue-section payloads rather than duplicated in the public route.

**Severity:** positive architectural finding  
**Required change:** issue snapshot adapters around the existing aggregation domain.

### FIND-013 — The public route lacks an explicit page-level no-store response contract

API routes generally send `Cache-Control: no-store`; the RSC page uses `force-dynamic` but does not itself define a durable explicit response-header contract. The July 12 Publisher audit also flags this.

**Severity:** P1 security hardening  
**Required change:** Worker/middleware route header contract verified on hosted responses.

### FIND-014 — Large client components are already at their safe complexity limit

`SharePageTabs.tsx`, `SharePageComments.tsx`, `SharePageDecision.tsx`, `ShareWizard.tsx`, and `PublisherDrawer.tsx` are substantial stateful modules. Adding portal sections, roles, branding, and threads directly to them would create fragile coupling.

**Severity:** P1 maintainability  
**Required change:** capability-oriented decomposition before feature expansion.

### FIND-015 — Publisher read performance will deteriorate with portal complexity

The current Publisher audit documents eight D1 round trips per page load and in-memory filtering/pagination. Adding portal counts, unresolved threads, recipient states, issues, and next actions on top of that shape would over-fetch and multiply query work.

**Severity:** P1 performance  
**Required change:** SQL-side roster query, aggregate summary table/view, server pagination, and stable next-action evaluator.

## 3. Existing capabilities to preserve

Do not replace these without evidence:

- security primitives in `src/lib/publication/security.ts`;
- public ID mapping and snapshot sanitization;
- server-side canonical row totals;
- current estimate tree and detailed table components;
- pre-aggregated project chart domain;
- recipient invitation and email pipeline;
- owner activity composer;
- stale-snapshot version token;
- route-level bounded body parsing;
- public error redaction;
- request IDs and structured logging;
- R2/Image upload processing primitives.

## 4. Stale or superseded repository documentation

`.ai/06_specs/shared-link-and-publication-spec.md` is dated 2026-05-29 and still describes older provider and security details. It remains useful history but is not current product truth.

The July 10 Publisher/Shared Pages plan explicitly put white-label branding out of scope. The owner has now reversed that boundary.

The July 12 Publisher audit intentionally did not exhaustively re-audit the public share route. This pack closes that combined product boundary.

## 5. Audit conclusion

The correct path is neither a cosmetic redesign nor a complete rewrite. Preserve the hardened publication and estimate-view foundations, introduce a stable portal/issue boundary, then rebuild both public and owner surfaces around a typed portal contract.
