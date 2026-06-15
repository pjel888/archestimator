# 06 - Feature Opportunities Roadmap

## Priority Rule

Feature work should follow layout repair, not precede it. The current page already has many features; the first win is making the existing data easier to read.

## Feature Fit Rule

Every feature must map to a receiver job. If it does not help inspect, trust, navigate, or respond to the estimate, it stays out of the first implementation sequence.

## P0 - Layout and Reading Experience

| Item | Why | Files likely touched |
| --- | --- | --- |
| Wider receiver shell | Reduces centered/narrow feel | `page.tsx`, `SharePageSessionBanner.tsx` |
| Estimate-first content order | Gets users to rows sooner | `SharePageTabs.tsx` and extracted components |
| Contextual chart placement | Prevents chart from dominating first screen | `SharePageTabs.tsx`, `CostDonutChart.tsx` |
| Remove debug badge | Client-facing polish | `CostDonutChart.tsx` |
| Mobile chart collapse | Improves mobile first viewport | `SharePageTabs.tsx`, chart wrapper |
| Snapshot date/status in project strip | Builds trust in what recipient is reviewing | `page.tsx`, summary strip |

P0 is mandatory before P1-P4. Do not add search, comments polish, exports, or advanced response features while the chart-first/narrow-canvas issue remains.

## P1 - Navigation and Findability

| Item | Why | Notes |
| --- | --- | --- |
| Row search/filter | Large estimates need direct lookup | Filter description, designation, material, discipline |
| Sticky estimate toolbar | Keeps sheet/view/search controls available | Must not overlap content |
| Section scrollspy or tree rail | Better long-estimate navigation | Choose between `ShareEstimateTreePanel` and `ShareFloatingTreeNav` |
| Back-to-top/return-to-tabs affordance | Helps after long scroll | Icon button with tooltip |
| Use snapshot `treeNodes` first | Better hierarchy fidelity | Prefer `getBestShareTree` over direct reconstruction |

## P2 - Response and Collaboration Experience

| Item | Why | Notes |
| --- | --- | --- |
| Recipient identity indicator | Clarifies session-enabled state | Needs safe non-secret display data |
| Collapsible comments/decision rail | Frees estimate width | Keep response state discoverable |
| Mobile response bar | Makes accept/comment reachable | Session-gated only |
| Decision note visibility | Increases confidence after response | Already stored client-side after decision |
| Comment anchors to rows/sections | Makes feedback actionable | Requires product decision and API/data plan |

Minimum viable comment context for the layout pass: comments remain general to the shared link, but the UI should preserve visible sheet/section context near the composer. Row/section-scoped persistence is deferred until an API/data slice.

## P3 - Snapshot Trust and Communication

| Item | Why | Notes |
| --- | --- | --- |
| Snapshot generated date | Shows when the estimate was published | Data already has `generatedAt` |
| Sheet updated date | Helps understand staleness | Estimate has `updatedAt` |
| Manager-side stale snapshot warning | Prevents outdated links | Existing collaboration audit also recommends |
| View-only explanation | Clarifies recipient cannot edit | Keep concise |
| Contact sender affordance | Helps password/clarification cases | Must avoid exposing private emails incorrectly |

## P4 - Output and Review Utilities

| Item | Why | Notes |
| --- | --- | --- |
| Print stylesheet | Clients may print or save PDF via browser | Pure CSS first |
| Download/export | Useful but higher scope | Needs product/legal/security review |
| Compare sheets | Helps alternatives | Needs careful layout and data model |
| Row detail drawer | Lets users inspect images/notes without widening table | Must stay view-only |
| Comments with attachments | Useful but schema/API heavy | Not in first layout pass |

## Explicit Deferrals

Do not include these in the first UI/layout implementation unless separately approved:

- Threaded comments.
- File attachments.
- PDF generation pipeline.
- Real-time receiver collaboration.
- Recipient account creation.
- Workspace/project membership grants.
- Legal approval workflow.
- Purchase order or signature execution.

## Feature-to-UX Fit Matrix

| Feature | Client decision-maker | Cost reviewer | Procurement buyer | Mobile executive | First pass? |
| --- | --- | --- | --- | --- | --- |
| Wider receiver shell | High | High | Medium | Low | Yes |
| Estimate toolbar | High | High | High | High | Yes |
| Row search/filter | Medium | High | High | Medium | Yes, after layout extraction |
| Contextual chart | High | Medium | High | Medium | Yes |
| Collapsible response rail | High | Medium | Medium | High | Yes |
| Snapshot generated date | High | High | Medium | Medium | Yes |
| Print stylesheet | Medium | Medium | Medium | Low | Later |
| PDF export | High | Medium | Medium | Low | Later |
| Threaded comments | Low | Medium | Medium | Low | Later |
| Attachments | Low | Low | Medium | Low | Later |
