# 13 — North Star and Product Principles

**Date:** 2026-06-02  
**Status:** Second-pass proposed

---

## North Star Statement

**Every meaningful project, estimate, and client action should be understandable in three seconds, traceable in thirty seconds, and safe to show to the right audience.**

---

## Product Promise

Activity History tells the story of a project's evolution — who did what, when, to what, and (when relevant) why. It should feel like a trusted colleague summarizing events, not a database dump dressed in UI chrome.

---

## User Outcomes

### For Owners / Project Managers

- **Scan what changed:** Open activity history, see the most recent changes immediately, understand the nature of each change without expanding details.
- **Investigate cost deltas:** Spot cost increases/decreases at a glance, trace them to specific actions and actors.
- **Understand client activity:** See which clients have viewed the proposal, commented, approved, declined, or requested revisions — all in one timeline.
- **Reconstruct state:** Expand audit details to see exact before/after values, event IDs, and correlation groupings.
- **Trust the audit trail:** Know that events are immutable, complete, and provide enough context for disputes or compliance.

### For Clients / Recipients

- **See their own activity:** Comments they've made, decisions they've submitted, and when they viewed the proposal.
- **Understand the process:** Clear indicators of what will happen next after they approve, decline, or request revisions.
- **No technical confusion:** Never see raw IDs, internal comments, database jargon, or information about other recipients.
- **Privacy confidence:** Know that internal team notes are not visible, their email is only shown where they intentionally provided it.

### For Support / Admin

- **Debug disputes:** Trace exact event IDs, correlation IDs, timestamps, and before/after snapshots.
- **Audit compliance:** Verify that events are complete and unmodified.
- **Identify gaps:** See which event types have fallback copy, which snapshots are missing, and where the system needs richer metadata.

---

## Design Principles

1. **Human sentence first, data second.** The primary line on every activity card is a complete sentence a human would say. Timestamps, deltas, badges, and audit details are secondary — they support the sentence, not replace it.

2. **Recognizable, not decodable.** Users should recognize what happened from natural language, not decode technical strings. "Approved the proposal" not "DECISION: accepted".

3. **Progressive disclosure.** Show the minimum to understand, offer more to investigate. Primary sentence always visible. Context line always visible. Audit facts expandable. Raw event IDs only for debugging.

4. **Safe by default, explicit when unsafe.** Internal comments are invisible to clients unless the owner explicitly toggles them. Raw metadata is never sent to client APIs. Actor labels are anonymized for client views.

5. **Consistent across surfaces.** Whether in the estimate history modal, shared-link activity tab, email digest, or AI context, the same event should produce the same primary copy using the same composer.

6. **Fast and responsive.** First page of activity loads in under one second. Realtime updates don't disrupt scrolling. Load-more is smooth.

---

## Copy Principles

1. **Active voice always.** "Philip changed quantity..." never "Quantity was changed..."
2. **Complete sentences.** Primary line must stand alone without secondary text.
3. **Front-load the action.** Actor and verb in the first 3-5 words.
4. **Show what was and is.** "from X to Y" for changes, not just the field name.
5. **No technical terms in primary copy.** See forbidden terms list in `02-activity-copywriting-system.md`.
6. **Graceful fallbacks.** Missing actor → "Unknown user". Missing values → "—". Unknown event type → "Activity recorded."
7. **Client-safe by design.** Client views never show internal notes, raw IDs, internal emails, or server_action source.

---

## Trust and Audit Principles

1. **Immutability.** Activity events are append-only. No user-facing delete or modify. Database constraints enforce this.
2. **Completeness.** Every meaningful action (row CRUD, tree reorder, sheet metadata change, client comment, client decision, shared-link open) generates an event.
3. **Correlation.** Related events from the same action share a correlation ID for grouped display and tracing.
4. **Before/after.** Every mutation event captures the state before and after through JSONB snapshots.
5. **Actor attribution.** Every event records who performed the action (user or system).
6. **Non-repudiation.** Audit facts include event ID, correlation ID, actor user ID, and timestamp — enough to verify a claim.

---

## Client-Safety Principles

1. **Internal comments never leak.** Filtered at query level, composer level, and API response level — defense in depth.
2. **Raw identifiers never leak.** No UUIDs, no event_source strings, no metadata_json in client-facing responses.
3. **Technical terms never reach clients.** The same copy transformation applies to public API responses as to owner views.
4. **Actor privacy.** Clients see "Client" or their own display name. Never internal user emails or other recipients' emails.
5. **Minimum necessary data.** Public API returns only what the client needs to render the view — no extra fields that could be misused.

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|------------|
| Zero raw technical terms in primary copy | 0 occurrences across all surfaces | Automated copy regression tests on every deploy |
| Zero internal-comment leaks | 0 leaks | Automated security tests on public API |
| 100% known event types mapped | All 13 estimate types, 3 decision types, 5 shared-link types | Composer test coverage |
| 100% unknown event fallback coverage | Every possible event_type value produces a safe fallback | Composer test with exhaustive type list |
| Activity first page under 1s | <1000ms for 20 events | Server timing header / manual profiling |
| Users can identify what changed without expanding | 80%+ in user testing | Qualitative research |
| Owner can reconstruct before/after state | All fields with oldSnapshot/newSnapshot available | Audit card expand test |
| No regression into technical copy | Zero banned terms in deployed `main` | CI pipeline on every PR |

---

## Non-Goals for V1

1. **Unified project activity timeline** — Estimate history and shared-link activity remain separate surfaces in V1.
2. **Client-visible estimate change feed** — Clients see only shared-link activity, not raw estimate mutations.
3. **Localization beyond PHP/Philippines** — Currency, number, and percentage formatting is PH-only.
4. **Real-time push notifications** — In-app notification center is out of scope. Email digest only.
5. **AI-generated activity summaries** — Ask Flip uses structured activity data but doesn't generate natural language summaries in V1.
6. **Export/print activity report** — No PDF/CSV export of activity timeline.
7. **Activity search across projects** — Search is scoped to a single estimate/sheet or a single shared link.

---

## V2/V3 Vision

1. **Unified project timeline** — Single chronological feed merging estimate changes, client comments, client decisions, shared-link events, recipient management, and internal notes.
2. **Client-visible estimate change feed** — On the shared page, clients see a simplified, anonymized timeline of estimate changes alongside their own activity.
3. **In-app notification center** — Bell icon with unseen count, dropdown of recent activity across all projects.
4. **Rich filters by actor, event type, date range, cost impact** — More granular filtering for large projects.
5. **Activity analytics** — "Most active collaborators", "Average response time from share to decision", "Estimate change frequency".
6. **Multi-locale formatting** — User profile locale drives currency, number, and date formatting.
7. **Comment threading** — Replies to client comments from within the activity feed.

---

## Cross-References

- See `14-user-journeys-and-ux-paths.md` for detailed user journey maps
- See `02-activity-copywriting-system.md` for full copy specification
- See `03-data-contract-and-event-model-plan.md` for view model design
- See `16-event-taxonomy-and-lifecycle-map.md` for canonical event types
