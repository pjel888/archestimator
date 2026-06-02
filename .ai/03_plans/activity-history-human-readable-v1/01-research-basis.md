# 01 — Research Basis: Activity Feed UX, Audit Copy, Privacy & Accessibility

**Date:** 2026-06-02  
**Note:** Browser-based research was not available during this phase. The following principles are drawn from known industry standards and applied specifically to Archestimator's activity history. All references are cited; direct URL verification was not possible — assumptions are marked.

---

## Sources Reviewed (via known principles)

| Source | Focus Area | Key Heuristics/Guidelines |
|--------|-----------|--------------------------|
| Nielsen Norman Group (NN/g) | Usability heuristics, activity feed design | Visibility of system status, match between system and real world, consistency and standards, recognition rather than recall, aesthetic and minimalist design |
| GOV.UK Content Design | Plain language, active voice, content patterns | Write for scanning, use active voice, front-load meaning, avoid jargon |
| Microsoft Writing Style Guide | UI copy, grammar patterns | Friendly but professional, use second person for instructions, use active voice, simple sentences |
| WCAG 2.2 (Web Content Accessibility Guidelines) | Status messages, screen readers | Success Criterion 4.1.3 (Status Messages), semantic regions, aria-live |
| OWASP Logging Cheat Sheet | Audit log security | Log integrity, PII minimization, event structure, tamper evidence |
| WAI-ARIA Authoring Practices | Interactive timeline patterns | Feed pattern, aria-label on timeline items, keyboard navigation |
| Material Design (Google) | Timeline and list patterns | Chronological grouping, card-based events, progressive disclosure |

---

## 1. Activity Feed UX Patterns

### Principle: Front-load meaning, support scanning

**Source:** NN/g "How Users Read on the Web", GOV.UK content principles

Users scan activity feeds quickly. The primary sentence must convey the action without requiring secondary detail. A user should know "what happened" from the first 5–8 words.

**Applied to Archestimator:**
- **Primary line must be a complete sentence.** "Changed quantity for Hardwood Oak Flooring from 5 sqm to 10 sqm." — not "Row updated · quantity".
- **Actor-verb-object before details.** The first text on a timeline card must be the primary sentence, not a timestamp or type badge.
- **Timestamp and metadata are secondary.** They belong below the primary sentence or in a sidebar column.

### Principle: Use active voice for system events

**Source:** GOV.UK content design, Microsoft Writing Style Guide

Active voice makes it clear who did what. Passive voice ("Row was updated") hides agency and feels bureaucratic.

**Applied to Archestimator:**
- **"Philip changed quantity..."** — not "Quantity was changed..."
- **"Maria approved the proposal."** — not "Proposal was approved."
- **"Unknown user changed sheet code..."** when actor is unknown

### Principle: Recognition over recall

**Source:** NN/g heuristic #6

Users should recognize event types from natural language, not decode technical strings. `"Row updated"` is better than `"ROW_UPDATED"` but still requires mental translation. `"Changed quantity"` is immediately understood.

**Applied to Archestimator:**
- Ban `"ROW_UPDATED"`, `"revision_requested"`, `"accepted"` from primary copy
- Replace with: `"Changed quantity"`, `"Requested revisions"`, `"Approved the proposal"`

### Principle: Grouping and chronology

**Source:** NN/g activity feed studies, Material Design timeline pattern

Events grouped by day reduce cognitive load. Related events (same action, correlation ID) should be visually connected.

**Applied to Archestimator:**
- Day headers already exist — keep them.
- Correlation grouping already exists — keep it.
- Add visual hierarchy: primary sentence > context > timestamp > audit details.

### Principle: Progressive disclosure for audit details

**Source:** NN/g progressive disclosure pattern

Don't overwhelm with technical details. Show the human sentence first, then allow expanding for audit facts.

**Applied to Archestimator:**
- Primary card: sentence + context + delta
- Expandable section: "View details" → diff table, actor metadata, event ID, timestamp
- Owner-only audit facts should still be expandable, not forced-visible

---

## 2. Human-Readable Audit Copy

### Principle: Actor / Action / Object / Before-After structure

**Source:** GOV.UK content design, technical writing best practices

The gold standard for audit copy: who did what to what, with before and after.

**Applied to Archestimator:**

Format: `{Actor} {verb} {field/object} [for {target}] [from {old} to {new}].`

Examples:
- "Philip changed quantity for Hardwood Oak Flooring from 5 sqm to 10 sqm."
- "Maria approved the proposal."
- "Client commented on Living Area."
- "Replaced Hardwood Oak Flooring with HEMLINGBY Loveseat."
- "Changed sheet code from ES-001 to ES-002."

### Principle: Copy hierarchy

**Source:** GOV.UK inverted pyramid, NN/g eye-tracking studies

Three levels of detail:
1. **Primary line** — Complete sentence. Stands alone.
2. **Context line** — Target location, timestamp, actor, delta.
3. **Audit facts** — Expandable: previous value, current value, event ID, source.

### Principle: Ban technical jargon from primary copy

**Source:** GOV.UK plain English, NN/g "match between system and real world"

Terms users don't understand should never appear in primary copy.

**Banned from primary copy:**
- `row_updated`, `row_replaced`, `row_deleted`, `row_blank_added`
- `sheet_metadata_updated`, `sheet_code_updated`
- `revision_requested`, `accepted`, `declined`
- `server_action`, `metadata_json`, `sourceSnapshot`, `oldSnapshot`, `newSnapshot`
- `changedFields`, `correlation_id`, `target_row_id`, `estimate_node_id`
- `linked-clean`, `linked-overridden`, `source-changed`, `detached`
- Raw UUIDs

**Allowed in primary copy:**
- Plain verbs: changed, added, removed, replaced, commented, approved, declined, requested
- Human field labels: Quantity, Unit cost, Adjustment, Discount, Material, Sheet code
- Target names: material names, node names, estimate names
- Formatted values: 5 sqm, ₱ 1,200.00, 10%

### Principle: Value formatting must be locale-aware

**Source:** Microsoft Writing Style Guide, CLDR standards

Numbers, currencies, percentages, and units must be formatted for the user's locale.

**Applied to Archestimator (Philippines locale):**
- Currency: `₱ 1,200.00` (PHP with thousands separator, 2 decimal places)
- Percentages: `10%`, `-5%` (discounts as negative)
- Quantities: `5 sqm`, `12 pcs` (number + unit from snapshot)
- Large numbers: `1,200` (thousands separator)

---

## 3. Empty States, Loading States, and Realtime Updates

### Principle: Empty states should guide, not dead-end

**Source:** NN/g empty-state patterns, Material Design

An empty activity feed should explain what will appear here and why it's empty now. Not just "No activity yet."

**Applied to Archestimator:**
- Estimate history empty: "Activity events will appear here when rows are added, updated, or removed." (current — good)
- Shared link empty: "No activity yet." (current — needs improvement)
  - Proposed: "Activity will appear here when comments are added or the proposal is accepted."

### Principle: Loading states should communicate progress

**Source:** NN/g response time guidelines (<1s = no indicator needed, 1–10s = spinner/skeleton)

**Applied to Archestimator:**
- Current: "Loading activity…" — minimal but functional
- Proposed: Skeleton cards matching card layout (2–3 placeholder cards during load)

### Principle: Realtime updates must not disrupt user flow

**Source:** WCAG 4.1.3 (Status Messages), NN/g change blindness

New activity appearing in the feed should be announced but not cause layout shift or scroll position loss.

**Applied to Archestimator:**
- Use `aria-live="polite"` region for new activity announcements
- "New activity" banner at top of feed (not auto-scrolling)
- "Load new activity" button instead of automatic insertion
- Preserve scroll position when new activity loads
- No animation that causes layout shift

---

## 4. Audit Logging Best Practices

### Principle: Log what changed, not just that something changed

**Source:** OWASP Logging Cheat Sheet, SOC 2 audit requirements

Audit logs must be complete, immutable, and contain enough context to reconstruct the state before and after.

**Applied to Archestimator:**
- `estimate_sheet_events` already stores `old_snapshot`, `new_snapshot`, `changed_fields` — strong foundation
- `shared_link_responses` stores `decision` and `note` — good
- `shared_link_events` stores `event_type` and `metadata_json` — could use richer metadata (actor, IP hash, user agent hash)
- Audit facts view in UI should show: event ID, event type (for debugging), correlation ID, timestamp, source
- Audit trail must never be deletable by users

### Principle: Separate audit storage from operational storage

**Source:** OWASP Logging Cheat Sheet

Audit events should be append-only and ideally in a separate table or schema.

**Applied to Archestimator:**
- `estimate_sheet_events` is already a dedicated audit table — good
- `shared_link_comments` and `shared_link_responses` serve dual purpose (operational + audit) — acceptable for MVP, but consider event mirroring in the future

### Principle: Include correlation IDs for grouped operations

**Source:** OWASP Logging Cheat Sheet

Multi-step operations (transaction, batch update) should share a correlation ID.

**Applied to Archestimator:**
- `correlation_id` already exists on `estimate_sheet_events` and is used for grouping — excellent
- Not yet used on shared-link tables — gap

---

## 5. Privacy and Visibility Boundaries

### Principle: Internal comments must never leak to clients

**Source:** General data protection principles, SOC 2 confidentiality

Any comment marked as internal should be invisible to client views, API responses, and email digests (for non-owners).

**Applied to Archestimator:**
- Public API route already filters `is_internal=true` — verified and working
- Need to ensure email digests never include internal comment bodies
- Owner view should visually distinguish internal comments from public ones (amber "Internal" badge — current, good)

### Principle: Minimum necessary disclosure in public APIs

**Source:** OWASP API Security Top 10, GDPR data minimization

Public APIs should return only what the client needs to render the view. No raw IDs, no internal metadata.

**Applied to Archestimator:**
- Public activity route already filters is_internal comments — good
- But returns raw `decision` values, raw `event_type` strings, and full `metadata_json` — needs transformation
- Should never return `actor_user_id` UUIDs — currently doesn't, but verify with tests

### Principle: Actor identity in client views

**Source:** General privacy principles

Clients should see safe actor labels: "Client", known recipient names, or "Unknown user". Never raw UUIDs or internal account emails.

**Applied to Archestimator:**
- Comments show `author_email` — this is intentionally visible in the shared context (recipient submitted it) — acceptable
- Decisions show no actor (they're recipient actions with known session) — acceptable
- Estimate history events never show to clients currently — if they do in the future, must anonymize actor labels

---

## 6. Accessibility

### Principle: Status messages must be announced by screen readers

**Source:** WCAG 2.2 Success Criterion 4.1.3 (Status Messages)

When new activity loads, the screen reader must announce it. When a new comment appears via realtime, the screen reader must announce it.

**Applied to Archestimator:**
- `aria-live="polite"` on the activity feed container
- `aria-atomic="false"` to announce only new items, not re-read entire feed
- `role="feed"` on the activity list (WAI-ARIA feed pattern)
- Each activity card: `role="article"` with `aria-label` containing the human-readable sentence

### Principle: Timeline items must be keyboard-navigable

**Source:** WAI-ARIA Authoring Practices (Feed pattern)

Users should be able to tab through activity items, expand audit details with Enter/Space.

**Applied to Archestimator:**
- Each `AuditEventCard` should be focusable
- Expand/collapse audit facts triggered by Enter/Space
- Load more button reachable by Tab
- No keyboard traps in filters or scope tree

### Principle: Semantic HTML for timeline

**Source:** WCAG 2.2, semantic structure guidelines

Use appropriate landmark roles, heading levels, and list structures for the activity timeline.

**Applied to Archestimator:**
- Day groups as `<section>` with `aria-label="Activity on May 24, 2026"`
- Activity list as `<ul>` with `<li>` items (already `<ul>` in shared link feed)
- Search and filter region with `role="search"` and `aria-label`
- Scope tree as `role="tree"` with `aria-label="Activity scope navigation"`

---

## 7. Specific Copy Rules Derived from Research

1. **Active voice only.** "Philip changed..." not "Was changed..."
2. **Complete sentences in primary line.** Must stand alone without secondary text.
3. **Front-load the action.** Actor + verb in first 3–5 words.
4. **Use "from...to..." for changes.** Shows what was and what is now.
5. **Use "approved", "declined", "requested revisions"** — never raw enum values.
6. **Show delta where meaningful.** "+₱ 7,200.00" in a badge.
7. **Never show technical identifiers.** No UUIDs, no event_type strings, no enum values.
8. **Fallback gracefully.** "Unknown user" not "User <uuid>". "Activity recorded" not "UNKNOWN_EVENT".
9. **Deleted targets get named gracefully.** "Hardwood Oak Flooring (removed)" not "Deleted row".
10. **Internal comments always marked.** Amber "Internal" badge for owners.

## 8. Specific UI Rules Derived from Research

1. **Timeline layout with day headers.** Already implemented — keep.
2. **Card-based events with clear visual hierarchy.** Primary sentence → context → meta → audit.
3. **Progressive disclosure for audit facts.** Expandable, not forced-visible.
4. **Badges for event type categories.** "Changed", "Added", "Approved", "Comment".
5. **Realtime indicator.** "New activity" banner, not auto-scroll.
6. **Skeleton loading.** Match card layout during load.
7. **Empty state with guidance.** Explain what will appear and why it's empty now.
8. **Accessible status announcements.** aria-live regions for new activity.

## 9. Specific Audit/Security Rules Derived from Research

1. **Append-only audit trail.** Never modify or delete `estimate_sheet_events` rows.
2. **Correlation IDs for grouped operations.** Continue grouping related events.
3. **Audit metadata in expandable section.** Event ID, correlation ID, timestamp, source.
4. **Never expose internal metadata to clients.** Transform all public API responses.
5. **Rate limit all activity endpoints.** Already implemented — maintain.
6. **Validate session before returning activity.** Already implemented — maintain.
7. **Hash PII in logs.** IP hashes instead of raw IPs (currently done in shared-link events).
8. **No secrets in audit metadata.** Audit fields must not contain API keys, tokens, or passwords.

---

## Research Completeness Note

Browser-based research was unavailable during this planning phase. The principles above are drawn from well-established, publicly documented standards. If deeper validation is needed, the following should be reviewed via browser:
- NN/g specific articles on activity feed design for SaaS apps
- GOV.UK Design System timeline/activity log component
- WCAG 2.2 feed pattern implementation examples from WAI-ARIA APG
- OWASP Logging Cheat Sheet current version for event structure recommendations
