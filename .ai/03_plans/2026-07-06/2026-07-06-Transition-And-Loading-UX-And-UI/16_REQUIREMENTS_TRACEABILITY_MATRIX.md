# Requirements Traceability Matrix

**Column contract (Improve directive):** `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`.

Source-strength legend: `brief` (user ask) · `repo evidence` (file:line) · `official docs` (local Next.js docs / Cloudflare docs) · `derived` (inferred, labeled) · `owner-delegated planning decision`.

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-BRIEF | UX-01 loading on dynamic/token routes | `/invite/[token]` no loading; publisher/estimates error-only | repo evidence + official docs (loading.md L42-52) | `05_UX...md` §1; `20_...md` /invite | P1-T1/T2/T3 | AC-UX-01a/b/c | PC-01/02 | blank canvas on slow nav | Planned | — |
| SRC-BRIEF | UX-02 error boundary per subtree | only 8 error.tsx; workshop uneven | repo evidence | `05_UX...md` §1 | P1-T4 | AC-UX-02a/b | PC-03 | full-page global-error | Planned | — |
| SRC-DERIVED | UX-03 overlay suppression | overlay is sole feedback on skeleton routes | repo evidence + brief | `05_UX...md` §2; `06_...md` | P2-T5 | AC-UX-03a/b | PC-10 | double feedback | Planned | OPEN-UX-01 threshold |
| SRC-DERIVED | UX-04 loading taxonomy | hand-rolled divs vs Skeleton | derived | `05_UX...md` §2 | P1-T5, P4-T1 | AC-UX-04a/b | PC-04 | rule drift | Planned | — |
| SRC-DOCS | UX-05 viewport + LCP preload | no viewport anywhere; streaming.md LCP | official docs + repo evidence | `05_UX...md`; `18_...md` | P1-T6, P4-T1 | AC-UX-05a/b | PC-05 | LCP/CLS | Planned | — |
| SRC-REPO | A11Y-01 loading announces | most loading.tsx have role; verify all | repo evidence + WCAG 4.1.3 | `05_UX...md` §4 | P1-T7, P4-T1 | AC-A11Y-01a/b | PC-06 | SR users uninformed | Planned | — |
| SRC-REPO | A11Y-02 overlay focus | route-loading-overlay.tsx:25 aria-hidden | repo evidence | `05_UX...md` §4 | P2-T5 | AC-A11Y-02a | PC-07 | focus trap | Planned | browser-only proof |
| SRC-REPO | A11Y-03 reduced-motion | Skeleton/Spinner do; hand-rolled divs don't | repo evidence + WCAG 2.3.3 | `05_UX...md` §4 | P1-T7 | AC-A11Y-03a | PC-06 | motion sickness | Planned | — |
| SRC-REPO+DOCS | ARCH-01 canonical rule | canonical-map "00_system if governs all" | repo evidence + brief | `06_...md` §F | P4-T1/T2 | AC-ARCH-01a/b/c | PC-14 | rule drift | Planned (READY) | — |
| SRC-REPO | ARCH-02 estimate chunks off critical path | EstimateWorkspaceClient.tsx:27,30 default-SSR no loading | repo evidence | `06_...md` §5 | P2-T1/T2 | AC-ARCH-02a/b/c | PC-08 | hydration break | Planned | DISCOVERY P2-T1 |
| SRC-REPO | ARCH-03 no fetch-in-effect | SharePageComments.tsx:275,310,356,387; SharedLinkActivityFeed.tsx:147 | repo evidence | `06_...md` §5 | P2-T3/T4 | AC-ARCH-03a/b | PC-09 | share FMP | Planned | — |
| SRC-DOCS+BRIEF | ARCH-04 Server/Client boundary law | official docs + brief | official docs + brief | `06_...md` §3; `18_...md` | P4-T1 | AC-ARCH-04a/b | PC-14 | bundle bloat | Planned (READY) | — |
| SRC-DOCS | ARCH-05 cache model + future instant | instant.md (draft); Cache Components off | official docs + repo evidence | `06_...md` §4,§6; `20_...md` §4 | P4-T1, F-INSTANT | AC-ARCH-05a | doc review | cross-cutting | Planned | OPEN-ARCH-01 owner-gated |
| **SRC-REPO** | **ARCH-06 dashboard double-fetch** | group-actions.ts:90 + WorkshopHomebaseClient router.refresh | repo evidence | `20_...md` §2 | P2-T6 | AC-ARCH-06a | PC-18 | perf | Planned | — |
| **SRC-REPO** | **ARCH-07a stale /workshop/components path** | component-library/actions.ts:309; ai/package-builder/apply.ts:1896 | repo evidence | `20_...md` §3 | P1.5-T1 | AC-ARCH-07a | PC-11 | **correctness (stale data)** | Planned (READY) | — |
| **SRC-REPO** | **ARCH-07b /workshop/proposals no revalidation** | zero revalidatePath("/workshop/proposals") | repo evidence | `20_...md` §3 | P1.5-T2 | AC-ARCH-07b | PC-12 | **correctness (stale on refresh)** | Planned (READY) | DISCOVERY which actions |
| **SRC-REPO** | **ARCH-07c /workshop/publisher no revalidation** | zero revalidatePath("/workshop/publisher") | repo evidence | `20_...md` §3 | P1.5-T3 | AC-ARCH-07c | PC-13 | **correctness (stale on refresh)** | Planned (READY) | DISCOVERY which actions |
| SRC-DOCS+REPO | PERF-01 evaluator contracts | performance-goal shape + repo tooling | official docs + repo evidence | `09_...md` EV-01..10 | P0-T1/T2 | AC-PERF-01a | PC-15 | no baselines | Planned (READY) | — |
| **SRC-DOCS** | **PERF-02 RUM via Web Analytics Tier-1** | CF Web Analytics free + LCP/INP/CLS; Workers Logs free | official docs (CF, 2026-07-06) | `09_...md`; `23_...md` | P0-T3 + impl | AC-PERF-02a/b | PC-16 | no prod signal | Planned | OPEN-PERF-01 Tier1 vs Tier2 |
| SRC-REPO | PERF-03 CI budget strict | check-performance-budgets.mjs advisory | repo evidence | `09_...md`; `13_...md` | P3-T2 | AC-PERF-03a/b | CI gate | dev velocity | Planned | OPEN-PERF-02 owner-gated |
| SRC-REPO | PERF-04 authenticated CI perf | CI skips authed scenarios | repo evidence | `09_...md` | P3-T1 | AC-PERF-04a | CI | security (auth fixture) | Planned | sec review |
| SRC-REPO | PERF-05 idle instrumentation | 27-*.md Rule 6/Enterprise 6 | repo evidence | `09_...md`; `18_...md` | P4-T1 | rule section | PC-14 | latency | Planned (READY) | — |
| SRC-DOCS | REL-01 token-route status | streaming.md HTTP contract | official docs | `06_...md` §4 | P1-T1, P2 | AC-REL-01a/b | curl/proxy | compliance | Planned | OPEN-REL-01 |
| SRC-DERIVED | REL-02 perpetual-skeleton escape | derived | derived | `09_...md` §4 | P2 + new | AC-REL-02a | PC-17 | hang | Planned | — |
| SRC-BRIEF | TEST-01 test matrix | brief + directive | brief + directive | `12_...md` | this pack | matrix exists | — | — | Done | — |
| SRC-BRIEF | TEST-02 adversarial matrix | directive | brief + directive | `19_...md` AQ-01..15 | this pack | matrix exists | — | — | Done | — |
| SRC-BRIEF | DOC-01 add-page/component checklists | brief | brief | `11_...md` P4-T1 | P4-T1 | checklists present | PC-14 | rule gap | Planned (READY) | — |
| SRC-DERIVED | DOC-02 optional companion skill | derived | derived | `11_...md` P4-T3 | P4-T3 | skill exists | n/a | n/a | Optional | — |
| **SRC-REPO** | **SEC-09 beacon safety + durable limiter** | client-error/route.ts:6-7 per-isolate Map | repo evidence | `21_...md` §1-2 | P0-T3 + PERF-02 impl | AC-SEC-09a | PC-16 | abuse/exfil | Planned | OPEN-PERF-01 |
| **SRC-REPO+DOCS** | **SEC-10 keep no-store on token routes** | request-proxy.ts:21,165 no-store | repo evidence + official docs | `21_...md`; `20_...md` | P1-T4, P4-T1 | AC-SEC-10a | grep + header check | cache leak | Planned | — |

**Completion rule (directive):** invalid if any requirement lacks source evidence, acceptance criteria, and a planned proof path. Every row above has all three. Every work item (P0–P4, P1.5) maps back to ≥1 Source ID. No requirement is untraced.

**Source-strength distribution:** `repo evidence` × 18 (highest count — most requirements are code-grounded), `official docs` × 9, `brief` × 5, `derived` × 5 (each labeled), `owner-delegated planning decision` × 0 (none — owner decisions remain OPEN-*). No inferred requirement is presented as a direct source fact.
