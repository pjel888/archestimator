# 16 - Requirements Traceability Matrix

| Requirement ID | Source | User Outcome | Implementation Phase | Task IDs | Code Areas | Acceptance Criteria | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-01 | User URL and route audit | Same route still works | Phase 1 | P1-T1 | `estimates/[nodeId]/page.tsx` | Final path and sheet marker visible | E2E target route | Before/after route summary | Planned |
| FR-02 | Security review | No data leak or broken invalid routes | Phase 1 | P1-T1 | repositories, page route | Invalid route still notFound/redirects | Negative route tests | Security checklist | Planned |
| FR-03 | UX review | Shell stays stable | Phase 0/1 | P0-T1, P1-T1 | `WorkshopPageShell`, layout | Shell remains mounted | E2E MutationObserver | Timeline summary | Planned |
| UX-01 | User complaint | No ancestor skeleton cascade | Phase 0/1 | P0-T1, P1-T1 | loading files, page/layout | Parent fallback episodes 0 | E2E timeline | Readiness JSON | Planned |
| UX-02 | Designer lane | No repeated full-page sheet skeleton | Phase 1 | P1-T2 | page tail Suspense | Sheet skeleton episodes <= 1 | Delayed-tail E2E | Summary table | Planned |
| UX-03 | Analyst lane | Local tail fallback if needed | Phase 1 | P1-T2 | `EstimateWorkspaceResolved` | No full skeleton after content | E2E delayed tail | Review note | Evidence-gated |
| A11Y-01 | Designer lane | Loading states are understandable | Phase 1 | P1-T1/P1-T2 | skeletons | One status role per region | DOM tests | A11y checklist | Planned |
| A11Y-02 | Overlay audit | Screen readers not hidden after load | Phase 2 | P2-T2 | overlay/store | Overlay does not outlive budget | E2E + DOM | Overlay readiness | Evidence-gated |
| ARCH-01 | React/Next docs | Closest boundary owns loading | Phase 1 | P1-T1 | leaf page | Route-context await behind leaf Suspense | Static test | Code review | Planned |
| ARCH-02 | Blast-radius audit | Shared layout only touched if needed | Phase 2 | P2-T1 | project layout | Layout edit has benchmark justification | Review + E2E | Expanded smoke | Evidence-gated |
| ARCH-03 | Overlay blast radius | No cross-route regression | Phase 2 | P2-T2 | overlay/store/listener | Route-transition suite passes | E2E perf | Release check | Evidence-gated |
| DATA-01 | Code audit | No unnecessary schema work | Phase 1 | P1-T1 | none | No migrations touched | Diff review | Release diff | Planned |
| API-01 | Benchmark lane | Network does not regress | Phase 0/4 | P0-T1/P4-T1 | RSC route | RSC after <= before + 1 | Benchmark | Readiness JSON | Planned |
| SEC-01 | Security lane | No prefetch data leak | Phase 1/3 | P1-T1/P3-T1 | auth/repositories/prefetch | Unauthorized route still fail-closed | Negative E2E | Security review | Planned |
| SEC-02 | Security lane | Safe evidence artifacts | Phase 0/4 | P0-T3/P4-T1 | logs/evidence | No tokens/cookies/raw rows | Artifact review | Final review | Planned |
| SEC-03 | Security lane | No cross-user data leak | Phase 1/3 | P1-T1A/P3-T1 | route data/cache/prefetch | No static/shared protected data caches | Source guard + review | Security check | Planned |
| PERF-01 | User benchmark request | Trustworthy before/after | Phase 0 | P0-T1/P0-T3 | evidence/harness | Enhanced baseline exists before app optimization diff; harness-only diff is recorded if used | Artifact check | Final summary | Planned |
| PERF-02 | Test engineer lane | Complete scenario coverage | Phase 0 | P0-T1/P0-T3 | benchmark script | Cold/warm/hover/no-hover covered | Benchmark JSON | Readiness check | Planned |
| PERF-03 | User performance request | Fast intent-prefetched route | Phase 4 | P4-T1 | route | Warm/prefetched p50 <=500 ms, <=250 ms stretch | Benchmark | Delta table | Planned |
| PERF-04 | User skeleton complaint | Zero parent skeleton flashes | Phase 0/1 | P0-T1/P1-T1 | loading/layout/page | Parent fallback count 0 | E2E timeline | Readiness check | Planned |
| PERF-05 | Performance lane | No hidden server/network regression | Phase 4 | P4-T1 | repositories/RSC | Round trips not increased | PERF_TRACE | Perf summary | Planned |
| PERF-06 | Performance lane | Server wins not lost to client cost | Phase 3/4 | P3-T2/P3-T4/P4-T1 | estimate workspace chunks | JS transfer and long tasks recorded | Analyzer/browser trace | Perf summary | Planned |
| PERF-07 | User performance request | Faster no-hover route | Phase 4 | P4-T1 | route | No-hover/general >=30 percent faster or <=1000 ms | Benchmark | Delta table | Planned |
| REL-01 | Reliability review | No stuck overlay | Phase 2/4 | P2-T2/P4-T1 | overlay/store | Overlay hidden after nav/bfcache | E2E | Release check | Planned |
| TEST-01 | Planning directive | Symptom captured objectively | Phase 0 | P0-T1 | e2e/script | Timeline in JSON | E2E + script tests | Evidence review | Planned |
| TEST-02 | Regression protection | Boundary stays fixed | Phase 1 | P1-T1 | Vitest | Static guard fails on top-level await regression | Vitest | CI/final check | Planned |
| TEST-03 | Requested skill | React quality gate | Phase 4 | P4-T2 | changed React files | React Doctor output recorded | Command log | Final report | Planned |
| DOC-01 | Project memory rules | Durable state after change | Phase 4 | P4-T3 | `.ai/10_state/current-state.md` | State updated only after real code change | Diff review | Final report | Planned |
| DOC-02 | Next 16 local docs | No overclaiming | Phase 0/4 | P0-T4/P4-T1 | final docs/PR | No "instant" claim unless validated | Review | Final report | Planned |
