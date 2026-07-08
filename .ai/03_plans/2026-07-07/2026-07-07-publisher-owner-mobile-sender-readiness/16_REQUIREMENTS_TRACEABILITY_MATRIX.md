# 16 — Requirements Traceability Matrix

Column shape per `Improve-Plan-Prompt.md` §2:
`Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`

Source-strength tags: `brief`, `repo evidence`, `official docs`, `assumption`, `derived`, `owner-delegated decision`. Source IDs (`SRC-*`) index the evidence map in `25_INVENTORY_AND_SOURCE_MAP.md`.

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-PROMPT, SRC-mobileblock | REQ-PS-01 (mobile reach) | PROMPT (mobile width messaging can block owner) + `PublisherRosterClient.tsx:224,228` | brief + repo evidence | `05` DEC-MOBILE; `11` P1 T1.1/1.2 | 1.1, 1.2 | AC1-3 (`04`): decision documented; Option B mobile message + copy-URL + deep-link at 375px | DOM @375px + Playwright | RISK-MOBILE-1/2 | planning-complete | DEC-MOBILE owner sign-off external; Option B default |
| SRC-siblings | REQ-PS-02 (no duplication) | sibling READMEs (workflow/deliverable/inbox/activity) | repo evidence | `00` ownership; `10`; `11` P0/P4 T0.1/4.2 | 0.1, 4.2 | AC1-2 (`04`): ownership matrix + serialized shared-file tasks | cross-doc review | RISK-COORD-1, RISK-DUP-1 | planning-complete | serialize on `PublisherDrawer.tsx`/`RecipientEmailComposer.tsx` |
| SRC-PROMPT, SRC-actions | REQ-FR-01 (generate states) | PROMPT ("generate") + `actions.ts:775,845` | brief + repo evidence | `04` S1; `11` P2 T2.1 | 2.1 | AC1-4 (`04`) | `project-publication-actions.test.ts` | RISK-RELIABILITY-1 | planning-complete | — |
| SRC-PROMPT, SRC-rosterclient | REQ-FR-02 (copy fallback) | PROMPT ("copy") + `PublisherRosterClient.tsx:154` | brief + repo evidence | `04` S2; `11` P2 T2.1/2.3 | 2.1, 2.3 | AC1-3 (`04`) | `publisher-roster-client.test.tsx` | RISK-A11Y-1 | planning-complete | — |
| SRC-PROMPT, SRC-actions | REQ-FR-03 (email add) | PROMPT ("email") + `actions.ts:1352` | brief + repo evidence | `04` S3; `11` P2 T2.2 | 2.2 | AC1-6 (`04`) | `recipient-email-composer.test.tsx` + action unit | RISK-RELIABILITY-1 | planning-complete | batch-abort covered |
| SRC-PROMPT, SRC-actions | REQ-FR-04 (resend honesty) | PROMPT ("resend") + `actions.ts:1554,1243,261-262` | brief + repo evidence | `04` S4; `11` P2 T2.2 | 2.2 | AC1-4 (`04`) | `project-publication-rotate-resend.test.ts` + DOM | RISK-RELIABILITY-1 | planning-complete | send-before-persist surfaced |
| SRC-PROMPT, SRC-actions | REQ-FR-05 (revoke confirm) | PROMPT ("revoke") + `actions.ts:1012` | brief + repo evidence | `04` S5; `11` P2 T2.1 | 2.1 | AC1-3 (`04`) | `project-publication-actions.test.ts` + DOM | — | planning-complete | idempotent |
| SRC-PROMPT, SRC-actions, SRC-assump4 | REQ-FR-06 (confirm-access honest) | PROMPT ("confirm client access") + `actions.ts:304` + ASSUMP-4 | brief + repo evidence + assumption | `04` S6; `11` P3 T3.1 | 3.1 | AC1-3 (`04`) | `publisher-activity-feed.test.tsx` | RISK-PROOF-1, RISK-COORD-2 | planning-complete | consumes workflow-pack labels; fallback if delayed |
| SRC-actions (derived) | REQ-FR-07 (rotate confirm) | `actions.ts:938` + `admin-d1-client.ts:581-593` | repo evidence + **derived** (labeled) | `04` FR-07; `11` P2 T2.1 | 2.1 | AC1-2 (`04`) | `project-publication-rotate-resend.test.ts` + DOM | — | planning-complete | rotate is the mechanism behind resend-invalidation; not in brief's 6-list, explicitly derived |
| SRC-PROMPT, SRC-improveplan | REQ-UX-01 (state matrix) | PROMPT ("sender states") + Improve-Plan §3 | brief + official docs | `05` matrix | (doc) | matrix complete (every cell) | doc review | — | planning-complete | — |
| SRC-PROMPT, SRC-improveplan, SRC-design | REQ-A11Y-01 (keyboard/focus/SR) | PROMPT ("accessibility checks") + Improve-Plan §3 + DESIGN.md | brief + official docs | `05` a11y proof matrix; `11` P2/P4 | 2.1, 2.3, 4.1 | AC (`04`): keyboard reaches actions; focus restore; live-region | DOM + Playwright | RISK-A11Y-1 | planning-complete | — |
| SRC-design, SRC-improveplan | REQ-A11Y-02 (responsive/motion) | DESIGN.md:519-524,581,585 + Improve-Plan §3 | official docs | `05`; `11` P4 | 4.1 | no clipped actions; reduced-motion | Playwright @320/375/768 | RISK-MOBILE-2 | planning-complete | — |
| SRC-audit | REQ-ARCH-01 (boundary preserved) | `03` + `23` (existing `"use client"` scope) | repo evidence | `06`; `18`; `23` | (audit) | boundary unchanged | type-check | — | planning-complete | no boundary change |
| SRC-derived | REQ-DATA-01 (no migration) | `07`/`10` sibling-migration analysis | derived | `07`; `10` | (none) | no migration in this pack | n/a | — | planning-complete | delegate `0037` to workflow pack |
| SRC-actions | REQ-SEC-01 (authz unchanged) | `actions.ts:394-441`; `22` | repo evidence | `08`; `22` | (audit) | manager gate intact | `publisher-rbac.test.ts` | — | planning-complete | — |
| SRC-improveplan | REQ-TEST-01 (test matrix) | Improve-Plan §11 + Creating-Plan §17 | official docs | `12` (+ proof-contract rows) | 4.1 | matrix covers all REQs | review | — | planning-complete | — |

**Performance-sensitive requirements** (REQ-PS-01, REQ-FR-0*) also map to PERF-01 in `09`/`13`: baseline = publisher route chunk gzip + drawer-open Profiler median; target = ≤2% chunk / ≤50ms regression; measurement = `bun run build` + React Profiler; threshold = stated; rollback trigger = breach or P0 regression.

**Coverage check:** every REQ has source evidence + AC + planned proof. Every work item in `11` traces back to ≥1 REQ. No requirement is untraced. The derived requirement (REQ-FR-07) is explicitly labeled `derived` with rationale, not presented as a direct source fact.
