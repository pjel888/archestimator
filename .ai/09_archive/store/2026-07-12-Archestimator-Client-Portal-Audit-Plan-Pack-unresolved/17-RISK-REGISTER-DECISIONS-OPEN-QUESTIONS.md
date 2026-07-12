# 17 — Risk Register, Decisions, and Open Questions

## 1. Canonical risk register

| ID | Risk | Severity | Likelihood | Mitigation / decision |
|---|---|---:|---:|---|
| RISK-001 | New issue breaks recipient/thread continuity | P0 | High in current model | Stable portal parent; issue child; migrate recipients to portal |
| RISK-002 | Formal decision appears row-specific but is publication-wide | P0 | Existing | Make first-release decision explicitly issue-wide |
| RISK-003 | Hidden rates/margins leak through payload | P0 | Medium | Allowlist serialization; section field policy; response-byte tests |
| RISK-004 | One portal per project blocks multiple audiences | P0 | Certain | Remove partial unique model; many portals/project |
| RISK-005 | Owner reply accidentally saved as internal/public wrong audience | P0 | Medium | Separate components/actions/tables or hard query paths |
| RISK-006 | Stable link points to changed content without issue clarity | P0 | Medium | Current issue banner, issue history, immutable issue, stale write token |
| RISK-007 | Legacy backfill merges unrelated audiences | P0 | Medium | Conservative mapping; split ambiguous records; audit report |
| RISK-008 | Current cascade deletion destroys retained proposal record | P1/P0 before archive claim | High | Retention policy, issue-owned snapshot, tombstone/archive |
| RISK-009 | Publisher complexity becomes an unusable settings maze | P1 | High | Full-page control center, templates, progressive disclosure, readiness |
| RISK-010 | Full-width layout harms readability | P1 | Medium | Local prose measures; typed layout modes |
| RISK-011 | Discussion becomes noisy chat | P1 | Medium | Threads, targets, resolution, waiting state, inbox |
| RISK-012 | Too many nested tabs confuse users | P1 | High | Left portal nav; nested estimate switchers clearly separated |
| RISK-013 | Financial charts disagree with editor/export | P0 | Medium | Canonical calculation and parity fixtures |
| RISK-014 | Chart reveals supplier/private commercial data | P0 | Medium | Safe dimensions; explicit opt-in; snapshot sanitizer |
| RISK-015 | Recipient role UI diverges from server authorization | P0 | Medium | Central policy evaluator and preview parity |
| RISK-016 | Public portal caches sensitive HTML/data | P0/P1 | Medium | Explicit hosted no-store and cache-rule proof |
| RISK-017 | Brand asset upload introduces active content/cross-tenant read | P0 | Medium | Raster formats, magic/decode validation, scoped metadata, safe delivery |
| RISK-018 | Custom domains add cost/support/security before product fit | P2 | High | Later phase; explicit Cloudflare/pricing/ops approval |
| RISK-019 | Real-time transport becomes source of truth | P1 | Medium | D1 authoritative; DO notification only |
| RISK-020 | Offline retries duplicate messages/decisions | P0/P1 | High | Idempotency keys and unique constraints |
| RISK-021 | Analytics misclassifies bots as humans | P1 | High | Verified recipient metrics; bot/preview separation; honest definitions |
| RISK-022 | Activity exposes security/internal events | P0 | Medium | Client-safe projection and explicit mode |
| RISK-023 | Legal/e-signature claims exceed actual controls | P0 commercial | Medium | Specific control claims only; counsel before broad/paid launch |
| RISK-024 | Large issue payload overloads D1/response | P1 | Medium | Per-section payloads, R2, lazy loads, size budgets |
| RISK-025 | Portfolio query becomes slower than current Publisher | P1 | High | SQL pagination/aggregates, summary evaluator, performance gate |
| RISK-026 | Feature expands into arbitrary page/BI builder | P1 scope | High | Typed registry, safe templates, explicit non-goals |
| RISK-027 | Client logo usage implies unauthorized representation | P1/legal | Medium | Owner attestation/rights language; visible prepared-by identity |
| RISK-028 | Historic issue inaccessible after portal token rotation | P1 | Medium | Token separate from issue; portal identity stable |
| RISK-029 | Recipient revocation erases evidence | P1 | Existing remove behavior | Status/revoke; never delete history in routine UI |
| RISK-030 | Sticky UI hides keyboard focus | P1 accessibility | Medium | WCAG focus-not-obscured acceptance and viewport/zoom QA |

## 2. Decisions already resolved

- Client Portal, not fixed proposal document.
- Full-width adaptive shell.
- Stable portal and immutable issue.
- Multiple portals per project.
- Typed section registry.
- Hybrid contextual threaded discussion.
- Issue-wide formal decision for first release.
- External role templates plus capability checks.
- Owner and client logos in MVP.
- Activity is optional and client-safe.
- Custom domains later.
- No arbitrary CSS or page builder.
- No legal e-signature/payment/client archive in MVP.

## 3. Recommended resolutions for remaining product questions

### Q-001 — Should anonymous viewing be allowed?

**Recommendation:** supported but off by default for new portals. Owners explicitly enable it. Anonymous users are view-only.

### Q-002 — Should Approver inherit commenting?

**Recommendation:** yes. Approvers need to ask questions before deciding. Owner can explicitly deny thread creation for unusual cases.

### Q-003 — Can a recipient see other recipients?

**Recommendation:** not by default. Show display names only in shared threads/activity when they actually participated and the portal policy permits it. Never expose the roster or emails.

### Q-004 — Can the owner edit an issued issue?

**Recommendation:** no. Create a new draft and issue. Access policy and moderation actions remain mutable/audited.

### Q-005 — Can a decision be changed?

**Recommendation:** no silent edit. Owner may void with reason; recipient can submit a superseding decision only if workflow policy allows. Preserve both.

### Q-006 — Should unresolved comments block approval?

**Recommendation:** warn by default, do not block. Allow owner to configure “must resolve all blocking threads” later when thread severity exists.

### Q-007 — Should threads carry automatically to new issues?

**Recommendation:** no. Owner explicitly carries unresolved relevant threads during publish. General portal threads can remain portal-wide.

### Q-008 — Should every estimate row show a permanent comment button?

**Recommendation:** no. Make the row/select target interactive with a contextual “Discuss” action in the rail or on hover/focus. Avoid hundreds of visual buttons.

### Q-009 — Should owner/client logos be mandatory?

**Recommendation:** no. Portal must work with zero, one, or two. Branding readiness can warn, not block.

### Q-010 — Should Activity be enabled by default?

**Recommendation:** no for pure proposal templates; optional “Collaboration only” for review-workspace templates.

### Q-011 — Should unit costs be visible by default?

**Recommendation:** no. Line totals, quantities, and units can be default; unit rates are explicit sensitive opt-in.

### Q-012 — Should clients upload files in comments?

**Recommendation:** later/P2. Reserve schema and UI affordance but do not block core discussions on attachment security/processing.

### Q-013 — Should custom domains be built alongside branding?

**Recommendation:** no. Ship branding first. Custom domains are a separate operational and pricing product.

### Q-014 — Should there be live chat?

**Recommendation:** not as the first record model. Add real-time transport to durable threads after the asynchronous workflow is validated.

### Q-015 — Should one recipient be able to approve individual estimate sheets?

**Recommendation:** later. First-release issue-wide decisions avoid current ambiguity. Add explicit decision packages/scopes only after product demand.

## 4. Autonomous defaults locked for implementation

These are ordinary reversible product decisions, not owner authorization boundaries. They are resolved for implementation and may be revisited only when user research, legal review, or current source evidence triggers the stated revision condition.

| ID | Decision | Locked decision |
|---|---|---|
| DEC-AUTO-010 | User-facing route label | Client Portals |
| DEC-AUTO-011 | Anonymous view default | Off |
| DEC-AUTO-012 | Attribution | Discreet Archestimator security/delivery footer |
| DEC-AUTO-013 | Unit cost default | Hidden |
| DEC-AUTO-014 | Activity template default | Off in Proposal; collaboration-only in Cost Review |
| DEC-AUTO-015 | Multiple approver rule | All required |
| DEC-AUTO-016 | Client recipient visibility | Participant names only, no roster/email |
| DEC-AUTO-017 | Brand color freedom | Approved constrained tokens with contrast correction |
| DEC-AUTO-018 | Legacy active link migration | Preserve old URL plus issue mapping; send stable URL going forward |
| DEC-AUTO-019 | Historic issue recipient access | Current recipients can view issues they were entitled to at issue time, unless revoked by policy |
| DEC-AUTO-020 | Message edit window | 15 minutes, with edited state/audit |
| DEC-AUTO-021 | Owner moderation | Tombstone with reason/audit |
| DEC-AUTO-022 | Project deletion retention | Preserve issued records until formal retention policy says otherwise |
| DEC-AUTO-023 | Client logo rights attestation | Owner confirms right to use uploaded mark |

## 5. Explicitly rejected alternatives

### Extend `project_publications` with more JSON

Rejected because it leaves stable link, issue, recipients, discussion, and decisions coupled to one row. More JSON does not solve lifecycle or relational permissions.

### One giant issue JSON only

Rejected because large portals need lazy sections, independent payload hashes, R2 support, and bounded reads.

### Arbitrary drag-and-drop page builder

Rejected because it multiplies security, accessibility, rendering, print, data, and testing complexity before validated demand.

### Slack-like single chat feed

Rejected because financial review needs exact context, resolution, action queues, and issue history.

### One permission boolean per recipient

Rejected because Viewer/Commenter/Reviewer/Approver and section/field policies require composable authority.

### New URL for every revision only

Rejected as the primary experience because it breaks the stable client relationship and recipient continuity. Historic issue URLs can remain.

### Custom domain in MVP

Rejected because branding delivers most immediate trust value without domain lifecycle and paid platform complexity.

## 6. Decision review triggers

Revisit decisions when:

- design partners request per-estimate approval;
- attachment demand is repeated;
- clients require persistent account/archive;
- custom domain willingness to pay is demonstrated;
- legal review approves signature/record claims;
- real-time discussion latency materially blocks use;
- portal templates prove too restrictive;
- supplier visibility becomes a validated use case.
