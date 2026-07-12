# 18 — Industry Research and Benchmarks

**Research date:** 2026-07-12  
**Method:** official product documentation and primary security/accessibility guidance. The goal is not feature imitation; it is to extract proven workflow patterns relevant to an AEC estimate-review portal.

## 1. Executive synthesis

The strongest adjacent systems converge on five principles:

1. **Commercial documents need controlled branding, sharing, identity, analytics, and an audit trail.**
2. **AEC review workflows need explicit roles, current responsibility, revisions, status, and private access.**
3. **Collaboration works best when conversation is attached to context and can be resolved, not buried in a flat chat.**
4. **Access control needs role templates plus resource/relationship checks, with deny-by-default server enforcement.**
5. **Custom domains and realtime collaboration are operational layers, not merely UI toggles.**

The resulting Archestimator strategy is a hybrid:

- Qwilr-like professional presentation, access controls, branding, engagement insight, and audit record;
- Procore-like role/workflow clarity and revision state;
- Bluebeam/Figma/Notion-like contextual collaboration and accountability;
- Slack-like thread organization and unread/notification behavior;
- OWASP/NIST-aligned authorization;
- WCAG-aware full-width responsive UI;
- Cloudflare-native custom-domain path later.

## 2. Proposal and commercial-document systems

### Qwilr — branding governance

Official documentation shows account-level brand colors/fonts controlled by administrators and styling permissions that can restrict what creators change. It also notes that some colors may be limited when readability would suffer.

**Pattern**

- centralized brand defaults;
- admin-controlled styling;
- constrained creator freedom;
- readability safeguards;
- reusable image library.

**Archestimator adaptation**

- workspace brand profile;
- client brand profiles;
- portal override;
- constrained design tokens;
- contrast correction;
- no arbitrary CSS;
- portal managers can apply approved brand options without changing global brand governance.

**Source**

- [Adding branding (colors & fonts) to your account](https://help.qwilr.com/article/61-brand-setup)

### Qwilr — custom domains

Qwilr uses a DNS CNAME flow, limits setup to owners/admins, and keeps standard-domain links working after custom-domain activation. Its documentation also highlights that changing a custom domain can break previously shared custom-domain links.

**Pattern**

- admin-only domain configuration;
- DNS validation;
- standard URL fallback;
- domain lifecycle has link-continuity consequences.

**Archestimator adaptation**

- defer custom domains;
- retain stable Archestimator URL;
- model validation/certificate/status states;
- never make domain activation the only access path;
- treat domain changes as a migration/operations event.

**Source**

- [Setting up a Custom Domain](https://help.qwilr.com/article/63-custom-domain)

### Qwilr — security and identity

Qwilr supports email verification, domain restrictions, passwords, expiry, and view limits. Verified identity can feed analytics.

**Pattern**

- layered access modes;
- identity verification separate from simple name/email identification;
- templates can apply security defaults;
- domain restriction is supplementary.

**Archestimator adaptation**

- anonymous bearer view off by default;
- personalized recipient identity;
- optional email verification;
- optional password/expiry;
- role templates and portal templates carry safe defaults;
- domain restriction later and never treated as sufficient identity alone.

**Sources**

- [Adding security to a Qwilr Page](https://help.qwilr.com/article/151-adding-security)
- [Adding Identity Verification to a Page](https://help.qwilr.com/article/154-can-i-see-who-viewed-my-projects)

### Qwilr — analytics

Qwilr reports page views, viewer/session information, section/block visibility, time spent, and interactions. Its documentation explicitly warns that bots and preview services can trigger apparent views.

**Pattern**

- engagement by section, not only page open;
- session-level view;
- owner/admin views excluded;
- bot ambiguity acknowledged.

**Archestimator adaptation**

- verified recipient funnel;
- issue/section engagement;
- owner preview excluded;
- bot/anonymous separation;
- no vanity “open count” as decision intelligence;
- privacy/retention contract before production use.

**Source**

- [Qwilr Analytics](https://help.qwilr.com/article/156-analytics-insights)

### Qwilr — audit trail

Qwilr's audit trail covers creation, publishing, first visit, acceptor identity, signatures/forms/payments where used, backups, and notification emails. It supports downloadable formats and standardizes formal PDF timestamps in UTC.

**Pattern**

- commercial workflow milestones form a separate audit record;
- decision/acceptance produces a recipient and owner confirmation;
- exportable record;
- stable time standard for formal artifacts.

**Archestimator adaptation**

- separate audit from analytics;
- issue/decision/content hash;
- notification-delivery record;
- PDF/JSON decision record;
- UTC in formal export, localized display in UI;
- no e-signature claim without further controls and legal review.

**Source**

- [Accessing and downloading the Audit Trail](https://help.qwilr.com/article/157-the-audit-trail)

### Qwilr — internal role separation

Qwilr distinguishes full account administrators from limited creators.

**Pattern**

- governance users and content creators have different powers;
- brand/domain/default-sharing controls remain administrative.

**Archestimator adaptation**

- project/portal managers can compose and publish assigned portals;
- workspace owner/admin controls organization branding, templates, and high-risk policies;
- a portal responder can reply without being able to alter access or content.

**Sources**

- [What can an Account Admin do?](https://help.qwilr.com/article/143-account-administrators)
- [What can a Creator do?](https://help.qwilr.com/article/680-what-can-a-creator-do)

## 3. AEC review and approval systems

### Procore Submittals

Procore's Submittals surface emphasizes current status, the person currently responsible, workflows with multiple submitters/approvers, workflow templates, packages, revisions, and private access.

**Pattern**

- make the next responsible actor explicit;
- separate submitters and approvers;
- preserve revision history;
- template repeatable workflows;
- privacy is relationship- and role-aware.

**Archestimator adaptation**

- action-required/next-action state in Publisher;
- Viewer/Commenter/Reviewer/Approver roles;
- explicit issue/revision history;
- portal templates;
- required approver matrix;
- no vague “shared” status after a client has requested changes.

**Sources**

- [Submittals](https://support.procore.com/products/online/user-guide/project-level/submittals)
- [User Permissions Matrix — Web](https://support.procore.com/references/user-permissions-matrix-web)

### Bluebeam Studio

Bluebeam Studio Sessions allow external/read-only users to collaborate with comments and markups, preserve a record of who added/modified/removed content, synchronize after offline periods, and restrict edits/removal to the original creator. Studio Projects separate document management/revision history from collaborative sessions. Hosts manage attendee permissions and security.

**Pattern**

- accessible external participation;
- real-time can coexist with durable accountability;
- creator ownership of markups;
- offline recovery;
- collaboration session and source document/revision are distinct;
- host controls attendees and permissions.

**Archestimator adaptation**

- recipient can collaborate without a full workspace account;
- messages are attributable;
- limited self-edit/tombstone;
- offline idempotency;
- issued issue distinct from live source estimate;
- owner controls portal participants;
- realtime is transport over durable D1 records.

**Sources**

- [Collaborate in Studio with teammates who don't own Revu](https://support.bluebeam.com/studio/how-to/collaborate-with-teammates-who-dont-own-revu.html)
- [Studio FAQs](https://support.bluebeam.com/studio/resources/studio-faqs.html)

## 4. Contextual discussion systems

### Figma comments

Figma attaches comments to pinned locations or regions, supports replies, mentions, attachments, and notifications.

**Pattern**

- context anchor;
- conversation follows the object;
- mentions pull relevant people into a thread;
- attachments can be bounded.

**Archestimator adaptation**

- target threads to section/chart/estimate/area/row;
- stable target labels and public IDs;
- mention only authorized participants;
- attachments later with strict file pipeline;
- clicking a thread returns to exact target.

**Source**

- [Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files)

### Notion comments

Notion supports top-level page discussions and inline comments, replies, resolution/reopen, edit/delete, a comments pane, unread indicators, and filtering by person/status.

**Pattern**

- both general and contextual discussion;
- one aggregated pane;
- resolution without deletion;
- unread and filtering;
- jump from thread to context.

**Archestimator adaptation**

- General portal thread plus contextual threads;
- Discussion inbox plus right context rail;
- resolve/reopen;
- per-participant unread;
- filter by target/author/status;
- tombstone/audit rather than destructive erase.

**Source**

- [Comments, mentions & reactions](https://www.notion.com/help/comments-mentions-and-reminders)

### Slack threads

Slack uses threads to keep side discussions organized beneath a parent message and provides thread-centric follow/unread behavior.

**Pattern**

- avoid cluttering the primary stream;
- thread subscriptions and replies;
- unread follow-up.

**Archestimator adaptation**

- conversational message UI within structured threads;
- thread subscriptions;
- waiting/unread states;
- no single endless portal chat feed.

**Source**

- [Use threads to organise discussions](https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions-)

## 5. Authorization standards

### NIST RBAC

NIST's RBAC work formalizes assigning permissions to roles rather than directly to every user.

**Pattern**

- reusable role templates;
- administrative clarity;
- separation of roles and permissions.

### OWASP Authorization

OWASP recommends least privilege, deny by default, validation on every request, and favoring attribute/relationship-aware approaches over pure role checks where appropriate.

**Pattern**

- server-side authorization;
- every request checked;
- resource and relationship context;
- safe failure;
- logging and testing.

**Archestimator adaptation**

- Viewer/Commenter/Reviewer/Approver templates;
- capability evaluator;
- recipient/portal/issue/section/field/context relationships;
- sparse overrides;
- deny by default;
- preview uses the same evaluator.

**Sources**

- [NIST Role Based Access Control](https://csrc.nist.gov/projects/role-based-access-control)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## 6. Audit logging

OWASP's logging guidance frames application logging around when, where, who, and what, while avoiding sensitive-data leakage.

**Archestimator adaptation**

Audit event envelope contains:

- when;
- actor;
- action;
- portal/issue/target;
- result/reason;
- request ID.

It excludes:

- raw tokens;
- passwords;
- raw IP/user-agent where not explicitly approved;
- hidden financial content;
- message bodies in general analytics.

**Source**

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## 7. Accessibility and full-width UI

WCAG 2.2 includes “Focus Not Obscured,” directly relevant to sticky portal headers, side rails, and mobile action bars.

**Pattern**

- sticky navigation must not cover keyboard focus;
- zoom and responsive layout must remain operable;
- equivalent non-visual representation for charts.

**Archestimator adaptation**

- scroll padding;
- focus restoration;
- no competing sticky bars;
- 200% zoom proof;
- chart tables/text equivalents;
- minimum target sizes for primary mobile actions.

**Source**

- [How to Meet WCAG 2.2 — Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)

## 8. Cloudflare custom-hostname architecture

Cloudflare for SaaS documents a custom-hostname model around a zone, fallback origin, custom hostnames, certificate issuance, and hostname validation.

**Pattern**

- custom domain is a routed/certificate-managed platform capability;
- fallback origin required;
- ownership/hostname validation;
- lifecycle states and operational monitoring.

**Archestimator adaptation**

- custom domains remain later;
- standard portal URL is fallback;
- hostname-to-workspace binding;
- validation/certificate lifecycle;
- anti-takeover/tombstone;
- explicit cost approval under current repository policy.

**Source**

- [Configuring Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/)

## 9. Comparative matrix

| Capability | Qwilr | Procore | Bluebeam | Figma/Notion/Slack | Archestimator target |
|---|---|---|---|---|---|
| Branded external presentation | Strong | Moderate | Limited/document-centric | Not primary | Owner/client co-branding |
| Typed financial sections | Quote-focused | Workflow/document-focused | No | No | AEC estimate + cost intelligence |
| Revisions/issues | Commercial page lifecycle | Strong | Strong document revision | File/page history | Immutable issued portal versions |
| Contextual comments | Page/content | Workflow comments | Markups | Strong | Section/chart/estimate/row threads |
| Chat-like conversation | Limited | Limited | Realtime markup | Strong thread patterns | Chat-like thread UI |
| External roles | Access/security | Strong workflow roles | Host/attendee | File/page access | Viewer/Commenter/Reviewer/Approver |
| Formal decision | Acceptance | Approver workflows | Session record, not proposal decision | No | Explicit issue-wide decision |
| Client-safe activity | Audit/analytics | Workflow history | Activity record | Comment history | Configurable client activity |
| Stable branded URL | Yes/custom domain | Project app | Session/project | File URL | Stable portal URL, custom later |
| AEC cost hierarchy | No | Adjacent | No | No | Native differentiator |

## 10. What Archestimator should not copy

- Qwilr's broad visual page customization before governance and parity are mature.
- Procore's enterprise workflow complexity before small-team demand exists.
- Bluebeam's document/markup metaphor when the core object is structured estimate data.
- Slack's channel/chat primacy, which would detach decisions from financial scope.
- Figma's unrestricted “viewer can comment” default; external roles should be owner-controlled.
- Notion's destructive delete semantics without a formal business-record audit policy.

## 11. Strategic differentiation

The differentiated product is not merely “proposal software with comments.” It is:

> A branded, versioned client decision workspace where structured AEC estimates, financial comparisons, contextual discussion, and formal issue decisions share one traceable record.

The portal should make structured cost data understandable and actionable, while the Publisher tells the owner exactly what the recipient saw, discussed, decided, and what needs attention next.
