# Requirements Traceability Matrix

| Requirement ID | Source (strength) | User outcome | Implementation phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| UX-01 | brief + repo evidence + official docs | No blank canvas on dynamic routes | Phase 1 | P1-T1..T3 | `src/app/invite/[token]`, `workshop/publisher`, estimates list | AC-UX-01a/b/c | Playwright route-transition + error-boundary specs | Closed-beta: no blank canvas in RUM | Planned |
| UX-02 | repo evidence | Subtree errors recover in-place | Phase 1 | P1-T4 | `src/app/workshop/**/error.tsx` | AC-UX-02a/b | error-boundary spec | n/a | Planned |
| UX-03 | repo evidence + brief | Overlay not sole feedback on skeleton routes | Phase 2 | P2-T5 | `route-loading-overlay.tsx`, nav store | AC-UX-03a/b | route-transition spec | Slow-3G spec | Planned (owner threshold) |
| UX-04 | derived | Consistent loading taxonomy | Phase 4 (rule) + P1-T5 | P4-T1, P1-T5 | protocol, activity loading | AC-UX-04a/b | doc review + design lint | n/a | Planned |
| UX-05 | official docs + repo | viewport + LCP preload discipline | Phase 1/4 | P1-T6, P4-T1 | root layout, protocol | AC-UX-05a/b | `rg` + build | n/a | Planned |
| A11Y-01 | repo + WCAG | Loading announces | Phase 1/4 | P1-T7, P4-T1 | loading UIs, protocol | AC-A11Y-01a/b | DOM assertions | n/a | Planned |
| A11Y-02 | repo | Overlay focus correct | Phase 2 | P2-T5 (new e2e) | overlay | AC-A11Y-02a | new e2e overlay-focus | n/a | Planned |
| A11Y-03 | repo + WCAG | Reduced-motion respected | Phase 1/2 | P1-T7, P4-T1 | loading UIs | AC-A11Y-03a | CSS audit + Playwright emulate | n/a | Planned |
| ARCH-01 | repo evidence + brief | Single canonical rule | Phase 4 | P4-T1,T2 | `00_system/` + AGENTS.md | AC-ARCH-01a/b/c | `validate:agents` | n/a | Planned (READY) |
| ARCH-02 | repo evidence | Heavy chunks off critical path | Phase 2 | P2-T1,T2 | `EstimateWorkspaceClient`, sheet chunks | AC-ARCH-02a/b/c | shell-streaming + CRUD latency + analyzer | EV-04/09 gate | Planned (DISCOVERY) |
| ARCH-03 | repo evidence | No fetch-in-effect | Phase 2 | P2-T3,T4 | share components, proposals client | AC-ARCH-03a/b | `rg` + shared-link-receiver spec | EV-02 | Planned |
| ARCH-04 | official docs + brief | Server/Client boundary law | Phase 4 | P4-T1 | protocol | AC-ARCH-04a/b | rule audit | n/a | Planned (READY) |
| ARCH-05 | official docs + repo | Cache model documented + future path | Phase 4 + Future | P4-T1, F-INSTANT | protocol, next.config | AC-ARCH-05a | doc review | owner-gated | Planned (owner-gated) |
| PERF-01 | official docs + repo | Evaluator contracts | Phase 0 | P0-T1,T2 | `09_...md`, `metrics/` | AC-PERF-01a | baselines reproducible | n/a | Planned (READY) |
| PERF-02 | repo + brief | Production RUM | Phase 0 (design) + impl | P0-T3 + impl | beacon route, client | AC-PERF-02a/b/c | beacon unit + denial/redaction | sink readback | Planned (owner-gated) |
| PERF-03 | repo | CI budget strict | Phase 3 | P3-T2 | CI, budget script | AC-PERF-03a/b | CI gate | strict green | Planned (owner-gated) |
| PERF-04 | repo | Authenticated CI perf | Phase 3 | P3-T1 | CI, fixture | AC-PERF-04a | CI scenario posted | n/a | Planned (sec review) |
| PERF-05 | repo (27-*.md) | Idle-deferred instrumentation | Phase 4 | P4-T1 | protocol | rule section | n/a | n/a | Planned (READY) |
| REL-01 | official docs | Token-route status handling | Phase 1/2 | P1-T1, P2 | `/share`,`/invite` | AC-REL-01a/b | curl/proxy check | hosted probe | Planned |
| REL-02 | derived | Perpetual-skeleton escape | Phase 2/3 | P2 + new test | error boundaries | AC-REL-02a | adversarial scenario | n/a | Planned |
| TEST-01 | brief + directive | Test execution matrix | this pack | — | this doc | matrix exists | — | — | Done (this pack) |
| TEST-02 | directive | Adversarial matrix | this pack | — | `19_RESEARCH...md` | matrix exists | — | — | Done (this pack) |
| DOC-01 | brief | Add-page/component checklists | Phase 4 | P4-T1 | protocol | checklists present | doc review | n/a | Planned (READY) |
| DOC-02 | derived | Optional companion skill | Phase 4 | P4-T3 | `.ai/11_skills/` | skill exists | n/a | n/a | Optional |

**No requirement is untraced.** Every implementation task (P0–P4) maps back to ≥1 requirement. Open decisions (OPEN-PERF-01/02, OPEN-ARCH-01, OPEN-UX-01, OPEN-REL-01) are recorded in `04_REQUIREMENTS_SPECIFICATION.md` §Open decisions and `15_...md`.
