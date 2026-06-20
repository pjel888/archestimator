# 11 - Source Trust State Matrix

## Purpose

Source trust tells users whether a reusable cost item is safe to reuse, needs
review, or must be blocked from new work. It appears near price and insertion
actions, not hidden in advanced metadata.

## Freshness States

| State | Rule | UI Treatment | Insert Behavior |
| --- | --- | --- | --- |
| Current | Pricing date within configured freshness window. | Neutral/positive label near price. | Allowed. |
| Stale | Pricing date outside freshness window. | Warning label near price. | Allowed with warning. |
| Very stale | Pricing date far outside window, such as 180+ days if adopted. | Strong warning. | Require explicit confirmation or review. |
| Missing date | No pricing date. | Incomplete label. | Allowed for draft/internal use with warning. |
| Unknown | Legacy item cannot compute freshness. | Incomplete label. | Warn; encourage review. |

The existing 90-day stale-pricing constant is the starting point. Any changed
threshold must update code, tests, and copy together.

## Confidence States

| State | Meaning | UI Treatment | Insert Behavior |
| --- | --- | --- | --- |
| High | Verified or trusted internal source. | Subtle trusted label. | Allowed. |
| Medium | Plausible but not fully verified. | Neutral label. | Allowed. |
| Low | User-entered or uncertain source. | Warning label. | Allowed with warning. |
| Missing | No confidence recorded. | Incomplete label. | Allowed with warning. |

Confidence is not a substitute for freshness. A high-confidence old price is
still stale.

## Lifecycle States

| State | Meaning | Browse Behavior | Insert Behavior |
| --- | --- | --- | --- |
| Active | Usable for new estimates. | Normal visibility. | Allowed. |
| Draft | Incomplete or internal-only. | Visible to editors/admins; optional for viewers. | Warn or hide from insert depending permission. |
| Discontinued | Historical item no longer recommended. | Visible when referenced or filtered. | Block or require explicit override. |
| Archived | Removed from normal active use. | Hidden by default. | Block by default. |
| Deleted | No longer available. | Not listed. | Invalid route/result recovery. |

## Link/Snapshot States

| State | Meaning | Required User Signal |
| --- | --- | --- |
| Linked | Estimate item still references a current library component/template. | Show source link and update availability. |
| Source changed | Library source changed after insertion. | Show changed-fields review before update/reuse. |
| Overridden | Estimate item has local values that differ from library source. | Show local override state; do not auto-overwrite. |
| Detached | Estimate item no longer has an active library link. | Show detached state and reconnect option if safe. |
| Missing source | Linked source is deleted/inaccessible. | Show missing-source warning and recovery options. |

## Precedence

When multiple states apply, show the most action-relevant state first:

1. Permission denied or inaccessible source.
2. Deleted/missing source.
3. Archived/discontinued lifecycle.
4. Source changed or overridden snapshot.
5. Very stale/stale/missing freshness.
6. Low/missing confidence.
7. Current/healthy state.

## Public Exposure Rule

Protected Library surfaces can show internal trust details. Public or shared
proposal surfaces default to client-safe summaries and must not expose:

- raw source URLs
- internal supplier notes
- internal confidence labels
- workspace-only price history
- provider evidence attachments

## Copy Guidelines

Use plain labels that state the issue:

- "Price stale"
- "Source missing"
- "Low confidence"
- "Source changed"
- "Local override"
- "Discontinued"
- "Archived"

Avoid vague labels like "Needs attention" unless paired with specific detail.
