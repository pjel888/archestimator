# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-MOBILE-1 | Over-building mobile parity (scope creep into heavy editing) | impl chooses Option A without owner sign-off | Medium | Medium | Medium | publisher UI | review | DEC-MOBILE Option B default; owner gate for A | scope task 1.3 as BLOCKED-EXTERNAL | revert to Option B | owner | low | open (planning) |
| RISK-MOBILE-2 | Mobile drawer focus trap / scroll disruption | full-width drawer on mobile (Option A) | Low (Option B avoids) | Medium | Low | a11y | Playwright @375px | keep Option B | targeted a11y test | fix-forward | impl | low | open |
| RISK-COORD-1 | Conflict with workflow pack on `PublisherDrawer.tsx`/`RecipientEmailComposer.tsx` | both packs edit concurrently | Medium | High | High | shared files | git status + ledger | file-scope lease + serialize (workflow first) | rebase on top | coordinate revert | lead | low (with serialization) | open |
| RISK-COORD-2 | Workflow pack's honest-delivery labels not landed when this pack needs them | dependency slip | Medium | Medium | Medium | composer/activity | sibling README status | consume defensively (fallback label) | graceful degradation label | ship this pack's states first, labels later | lead | low | open |
| RISK-DUP-1 | Accidental duplication of readiness/Preflight/gating | scope drift | Low | High | Medium | actions.ts/UX | cross-doc review | REQ-PS-02 + ownership matrix | re-scope | remove duplicate | lead | low | open |
| RISK-A11Y-1 | Live-region / focus regression on existing desktop flow | new state toasts | Low | Medium | Low | a11y | DOM tests | extend existing aria-live pattern | targeted tests | revert | impl | low | open |
| RISK-PERF-1 | Publisher route chunk growth | Option A mobile layout | Low (Option B) | Low | Low | bundle | PERF-01 | Option B | chunk compare | revert | impl | low | open |
| RISK-SEC-1 | "Copy URL" leaks sensitive material | impl copies wrong URL | Low | High | Medium | security | review | copy page URL only (no raw token) | `08` analysis | revert | lead | low | open |
| RISK-RELIABILITY-1 | Resend send-before-persist assumption broken by future refactor | someone reorders persist/send | Low | High | Medium | actions.ts | test | existing test asserts prior-link-intact | extend test | revert order | impl | low | open |
| RISK-PROOF-1 | Owner audit/proof claims exceed provider evidence | labeling `sent` as delivered | Medium | Medium | Medium | activity UI | review | honest labels (ASSUMP-4) | consume workflow-pack labels | downgrade label | lead | low | open |
| RISK-EXT-1 | Closed-beta owners primarily on phones → Option B insufficient | beta signal | Medium | Medium | Medium | product | beta feedback | DEC-MOBILE revisit condition | escalate to Option A/C | plan upgrade | owner | medium | open (deferred to beta) |
| RISK-SCOPE-1 | Sibling recipient-inbox/activity packs change shared boundary | their impl lands | Low | Low | Low | coordination | sibling READMEs | ownership matrix | re-validate | n/a | lead | low | open |

No unmitigated **High/Critical** residual risk remains after mitigations. RISK-COORD-1 is the highest-priority coordination risk and is controlled by serialization.
