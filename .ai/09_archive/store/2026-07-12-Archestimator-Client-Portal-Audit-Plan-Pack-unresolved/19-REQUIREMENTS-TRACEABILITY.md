# 19 — Requirements Traceability

## 1. Traceability rules

- Every requirement maps to a product contract and implementation unit.
- “Implemented” is not inferred from a plan.
- Evidence must come from source, tests, hosted proof, or release artifacts.
- User requirements override older plan exclusions, including white-labeling.

## 2. Requirement matrix

| ID | Requirement | Source | Design location | Execution unit | Acceptance evidence |
|---|---|---|---|---|---|
| REQ-001 | Owner can share a project and choose estimate sheets | Original request | IA Estimates; Publisher Content | UNIT-004/UNIT-005/UNIT-008/UNIT-017 | Portal issue contains selected sheets; unselected absent |
| REQ-002 | Shared page shows all row items by Group/Area | Original request | Estimates IA/full-width spec | UNIT-008/UNIT-019 | Row count parity; every row reachable |
| REQ-003 | Recipient may comment | Original request | Discussion spec | UNIT-010/UNIT-011 | Commenter creates thread/message |
| REQ-004 | Recipient may approve, request changes, or decline | Original request | Decision model | UNIT-013 | Authorized approver records issue-wide decision |
| REQ-005 | Owner sees recipient views, comments, approvals, and activity | Original request | Activity/analytics | UNIT-014/UNIT-016 | Recipient matrix and audit timeline |
| REQ-006 | Owner may share client-safe activity history | Original request | Activity modes | UNIT-014/UNIT-017 | Enabled Activity section excludes internal/security events |
| REQ-007 | Portal supports white-labeling | Original request | Branding spec | UNIT-014/UNIT-017 | Issue renders configured brand snapshot |
| REQ-008 | Shared page has owner-configured top-level tabs | User follow-up | Section registry/IA | UNIT-004/UNIT-007/UNIT-017 | Added/reordered sections render as navigation |
| REQ-009 | Financial data visualizations can be shown | User follow-up | Financial sections | UNIT-009 | Published financial section reconciles |
| REQ-010 | Comparative charts can be shown | User follow-up | Estimate Comparison | UNIT-009/UNIT-019 | Side-by-side totals/deltas match source |
| REQ-011 | Portal uses full browser width | User follow-up | Full-width UX | UNIT-007 | 1920/2560 proof with no global centered cap |
| REQ-012 | Explore chat-like advanced comments | User follow-up | Hybrid thread/chat spec | UNIT-010/UNIT-011 | General/contextual threads, reply, resolve, unread |
| REQ-013 | Publisher handles increased complexity | User follow-up | Publisher control center | UNIT-016/UNIT-017 | Full-page config across all domains |
| REQ-014 | Owner uploads owner logo | User follow-up | Branding/assets | UNIT-014 | Authorized upload and issue snapshot |
| REQ-015 | Owner uploads client logo | User follow-up | Branding/assets | UNIT-014 | Client brand profile and co-brand render |
| REQ-016 | Owner manages permissions and RBAC | User follow-up | RBAC spec | UNIT-003/UNIT-010/UNIT-016 | Roles/capabilities and role preview |
| REQ-017 | Multiple portals can exist for a project | Derived from audiences/tabs | Product/data model | UNIT-002/UNIT-016 | Two live portals for same project |
| REQ-018 | Portal URL remains stable across revisions | Mission-critical continuity | Product/data model | UNIT-002/UNIT-005/UNIT-006/UNIT-018 | Issue 2 publishes under same portal URL |
| REQ-019 | Issued financial data is immutable | Decision integrity | Issue model/security | UNIT-005/UNIT-013 | Old issue hash/data unchanged |
| REQ-020 | Historic issue is visibly superseded | Industry/version pattern | IA/lifecycle | UNIT-005/UNIT-007 | Current/old issue banners |
| REQ-021 | New issue does not lose recipients | Current-model finding | Recipient model | UNIT-010/UNIT-018 | Stable recipient row across issues |
| REQ-022 | New issue does not lose discussion | Current-model finding | Thread/version model | UNIT-010/UNIT-018 | Historic and carried threads preserved |
| REQ-023 | Formal decision scope is unambiguous | Current-model finding | Decision spec | UNIT-013 | Confirmation names issue, amount, hash |
| REQ-024 | Discussion target can be row/estimate/chart/etc. | Product direction | Target taxonomy | UNIT-004/UNIT-010 | Valid target deep link |
| REQ-025 | Owner can publicly reply | Current capability gap | Discussion Publisher | UNIT-011/UNIT-012 | Owner response visible to recipient |
| REQ-026 | Owner can add internal note without leakage | Security requirement | Discussion/security | UNIT-011/UNIT-012/UNIT-020 | Public API denial/byte inspection |
| REQ-027 | Threads resolve/reopen | Industry benchmark | Discussion spec | UNIT-011 | State and activity event |
| REQ-028 | Threads have unread/waiting state | Advanced workflow | Discussion/activity | UNIT-011/UNIT-014 | Per-participant unread and action queue |
| REQ-029 | All rows means reachable, not every private field exposed | Confidentiality | Financial/RBAC | UNIT-003/UNIT-004/UNIT-008 | Hidden-field serialization proof |
| REQ-030 | Unit rates/suppliers are controlled fields | Confidentiality | Field policy | UNIT-003/UNIT-009 | Off by default; explicit issue config |
| REQ-031 | Client-safe Activity is configurable | Original request/privacy | Activity modes | UNIT-004/UNIT-014/UNIT-017 | None/collaboration/full-safe modes |
| REQ-032 | Anonymous access can be disabled | Security | RBAC/access | UNIT-003/UNIT-006/UNIT-017 | Default recipient verification policy |
| REQ-033 | Recipient can be revoked individually | Mission/security | Recipient model | UNIT-010 | Immediate denial, history preserved |
| REQ-034 | Roles include Viewer/Commenter/Reviewer/Approver | User RBAC request | RBAC | UNIT-003/UNIT-010/UNIT-016 | Role capability matrix |
| REQ-035 | Preview as role matches public behavior | Publisher usability/security | Publisher/RBAC | UNIT-003/UNIT-017 | Shared policy and DTO proof |
| REQ-036 | Branding applies to portal, email, and print | White-label completeness | Branding | UNIT-014 | Three-surface snapshot parity |
| REQ-037 | Branding cannot create inaccessible contrast | Accessibility | Branding/full-width | UNIT-014/UNIT-020 | Contrast validator/fallback |
| REQ-038 | Arbitrary CSS/scripts are disallowed | Security/scope | Product/branding | UNIT-004/UNIT-014 | Registry/theme schema rejects |
| REQ-039 | Custom domains are future-ready but not MVP | Research/cost | Branding/domain | Later | Separate approved project |
| REQ-040 | Financial charts have accessible tables | Accessibility | Finance/full-width | UNIT-009 | Keyboard/screen-reader/table tests |
| REQ-041 | Sticky UI never obscures focus | WCAG | Full-width/QA | UNIT-007/UNIT-020 | 200% zoom/focus test |
| REQ-042 | Owner sees recipient funnel/next action | Notion direction | Activity/Publisher | UNIT-014/UNIT-016 | Generated → viewed → engaged → decided |
| REQ-043 | Bot/preview views do not count as verified humans | Notion/research | Analytics | UNIT-014 | Event classification proof |
| REQ-044 | Public route never reads live private data for issue | Security/integrity | Architecture | UNIT-005/UNIT-006/UNIT-020 | Import/query boundary test |
| REQ-045 | Issue totals match editor/preview/XLSX | Notion release gate | Finance/QA | UNIT-019 | Golden fixture parity |
| REQ-046 | Public responses are no-store and hardened | Security | Security/QA | UNIT-006/UNIT-020 | Hosted Worker header proof |
| REQ-047 | Publish is atomic and idempotent | Integrity | Data/API | UNIT-005 | Fault/retry integration proof |
| REQ-048 | Message/decision retry does not duplicate | Offline/reliability | API/discussion | UNIT-010/UNIT-013 | Idempotency conflict test |
| REQ-049 | Legacy links/history survive migration | Existing users | Migration | UNIT-018 | Backfill report and dual-read E2E |
| REQ-050 | Source project deletion follows explicit retention | Archive direction | Data/security | UNIT-002/UNIT-018/UNIT-021 | Tombstone/retention behavior |
| REQ-051 | Publisher roster scales beyond current broad scans | Current audit | Architecture/Publisher | UNIT-016 | Query count/latency evidence |
| REQ-052 | Complex config uses full-page workspace | User Publisher request | Publisher spec | UNIT-016/UNIT-017 | Route/control-center UI |
| REQ-053 | Portal templates reduce setup burden | Product design | Product/Publisher | UNIT-004/UNIT-017 | Proposal/Cost Review/Executive templates |
| REQ-054 | Owner can carry selected unresolved threads | Revision workflow | Discussion/version | UNIT-010/UNIT-017 | Publish carry-forward flow |
| REQ-055 | Recipient decision confirmation is exportable | Audit record | Decision/activity | UNIT-013/UNIT-014 | PDF/JSON receipt |
| REQ-056 | Internal and client activity are distinct | Privacy | Activity/security | UNIT-014/UNIT-020 | Projection tests |
| REQ-057 | Brand assets are securely processed and delivered | Upload security | Branding/security | UNIT-014/UNIT-020 | Magic/decode/ownership tests |
| REQ-058 | Mobile portal remains operable | External recipients | Full-width/QA | UNIT-007 | 320/390 viewport proof |
| REQ-059 | Print includes all selected rows and issue identity | Proposal output | Full-width/QA | UNIT-008/UNIT-019 | Print package parity |
| REQ-060 | The system stays a typed portal, not arbitrary BI/page builder | Scope | Executive/product | UNIT-004 | Registry-only config |

## 3. Current-state mapping

| Existing capability | Reuse status |
|---|---|
| Publication token/password/session security | Preserve/generalize |
| Public ID sanitization | Preserve/generalize |
| Estimate snapshot builder | Extract into issue section builders |
| Estimate tree/detail views | Reuse after decomposition |
| Cost donut/project chart aggregation | Reuse through immutable adapters |
| Flat comments | Migrate to threads/messages |
| Decision route | Replace with explicit issue-wide model |
| Public-safe activity endpoint | Rework as configured section |
| Recipient email flow | Adapt to stable portal recipient/outbox |
| Publisher roster/detail | Retain patterns; replace data and control center |
| Manager preview | Migrate to portal/role preview |
| Project image processing | Extract secure branding asset pipeline |

## 4. Release-gate traceability

| Gate | Requirements |
|---|---|
| Authorization | REQ-016, 029–035, 044, 046, 056 |
| Data integrity | REQ-018–023, 045, 047–050 |
| Portal UX | REQ-008–013, 040–041, 052, 058 |
| Collaboration | REQ-003–006, 012, 024–028, 048, 054 |
| Branding | REQ-007, 014–015, 036–039, 057 |
| Financial intelligence | REQ-009–010, 029–030, 040, 045, 059 |
| Publisher operations | REQ-013, 016, 035, 042, 051–053 |
| Migration/recovery | REQ-049–050 |
