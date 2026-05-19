# UX/UI Typology, Data Relationship, and Hierarchy Calibration

Date: 2026-05-19

## Why this note exists

Philip clarified a recurring UI failure: before designing an interface, the agent must understand the space, domain context, data model, and relationship between fields. UI layout is not just arranging text into available space. It is communicating typology, ownership, hierarchy, and relationship.

A specific failure pattern: placing client name and project address on the same line. These are not the same information type. They also have different length behavior. If either value is long, a single-line bundle shifts or breaks layout unnecessarily. They should be separated into distinct typological rows or blocks.

## Terms

### Typology
The kind or class of information being shown: identity, person/organization, location, financial value, status, action, provenance, timestamp, quantity, code, legal/source proof, etc.

### Typological hierarchy
The ordering and visual treatment of information by its type and role, not merely by database field order. A project name, client, address, budget, estimate total, and backend source are different typologies and must not receive the same visual weight or be forced into the same line just because they are available fields.

### Visual hierarchy
The scan order created by scale, contrast, grouping, spacing, alignment, position, and repetition. Visual hierarchy must follow the typological hierarchy. If unrelated data is visually grouped, users infer a relationship that may not exist.

### Data relationship
The semantic relationship between fields: same object, same category, parent/child, comparison pair, status/value pair, cause/effect, metadata, debug/provenance, or unrelated attributes.

## Core correction principles

1. Understand the space before styling.
   - What domain is this? Estimating, learning, compliance, project management, admin review?
   - What does the user need to understand first?
   - Which data exists, which is missing, and which is only implementation/debug metadata?

2. Classify data before layout.
   - Identity: project name, code.
   - Party: client, owner, contractor.
   - Location: address, city, site.
   - Financial: budget, estimate total, variance.
   - Status: revision state, export state, stale/fresh.
   - Activity: last edited, recent change.
   - Provenance/debug: Supabase, sample source, internal IDs.

3. Do not bundle unrelated data into one line.
   - Do not put client + address in one inline sentence.
   - Do not put status + budget + date in one text run.
   - Do not make metadata chips when a simple label/value row is clearer.
   - If two fields do not form a natural phrase or comparison, they usually need separate rows.

4. Respect length behavior.
   - Client names can be long.
   - Addresses can be much longer.
   - Project codes are short.
   - Financial values need tabular alignment.
   - Long text should have its own row/container rules, not push unrelated fields.

5. Use proximity only for true relationships.
   - NNGroup proximity principle: elements near each other are perceived as related; spaced elements are perceived as separate groups.
   - Therefore, spacing/grouping is meaning. Do not visually glue unrelated typologies.

6. Avoid cramping content in the middle.
   - Center-heavy layouts often weaken scanability for operational tools.
   - Dashboards and data surfaces usually need clear left alignment, shared x-axes, column rhythm, and predictable row starts.
   - Centering is appropriate for empty states, hero messages, and single-number emphasis only when it supports comprehension.

7. Avoid unnecessary wrappers and containers.
   - Every border/card/div must earn its place by grouping related information, isolating a state, enabling layout, or supporting interaction.
   - Card-in-card and wrapper-in-wrapper layouts create noise and false grouping.
   - Delete before decorating.

## Practical UI rule: one line equals one relationship

A single line should usually contain:
- one field;
- a label/value pair;
- a true comparison pair;
- a status/value pair;
- a short phrase whose parts naturally belong together.

A single line should not contain:
- two independent metadata fields;
- a person/org and a location;
- a financial value and unrelated status;
- a long free-text field plus another field;
- source/provenance plus user-facing project data.

## Project dashboard application

For `/workshop/projects/[projectId]`:

Bad:
`ACME Development · 123 Very Long Project Address, City, Province`

Better:
`Client`
`ACME Development Corporation`

`Project address`
`123 Very Long Project Address, City, Province`

Bad:
`₱ 12.4M · 8 estimates · Updated yesterday`

Better if these are separate typologies:
- Financial summary block: current total, budget, variance.
- Estimate state block: active estimate/revision, item count.
- Activity row: last edited, latest changed area.

Good comparison pair:
- Planned budget vs current estimate total, because these form a variance relationship.

Bad comparison pair:
- Client name vs project address, because no comparison relationship exists.

## Research basis captured

- Nielsen Norman Group, Visual Hierarchy in UX: clear hierarchy guides the eye to the most important elements through color/contrast, scale, and grouping.
- Nielsen Norman Group, Proximity Principle: elements near each other are perceived as related; spacing apart signals separate groups.
- Nielsen Norman Group, 5 Principles of Visual Design: scale, hierarchy, balance, contrast, and Gestalt principles improve usability when applied correctly.
- Material Design layout principle: layout organizes content into coherent regions and alignment systems; this supports meaning and scanability.

## Pre-code checklist for future UI work

Before touching JSX/CSS:

1. Name the domain space and screen job.
2. List the data fields and classify their typology.
3. Mark relationships: same group, comparison, parent/child, status/value, unrelated, debug.
4. Decide which data deserves separate rows because of length or typology.
5. Design hierarchy from relationships, not database order.
6. Remove or demote unrelated/debug data.
7. Use the fewest containers that preserve meaning.
8. Verify live layout with long realistic strings, not only short happy-path labels.

## Acceptance criteria added to UX skills

- No unrelated fields bundled into one text line.
- Long client names and long addresses cannot push each other around.
- Proximity/grouping must reflect real data relationships.
- Containers must have a stated grouping or interaction purpose.
- Typography and visual hierarchy must express typology, not arbitrary decoration.
