# GOAL — Estimate Sheet Loading Performance

## Concrete deliverables (this pack)

1. **A verified root-cause** of the loading-skeleton cascade on the path to the
   Estimate Sheet, stated as a mechanism (Suspense boundary order + triggers),
   not a hunch.
2. **A query-by-query server critical path** for `estimates/[nodeId]/page.tsx`,
   with sequential hops flagged and parallelization/prefetch opportunities
   marked.
3. **A layout critical-path map** showing which layout awaits block first paint
   and whether they re-run per navigation.
4. **A client hydration map** of `EstimateWorkspaceClient` (query fan-out,
   lazy server action, bundle weight).
5. **Real measurements**: `[perf-json]` trace breakdown + browser perf trace +
   screenshot skeleton sequence (with the network-bound local caveat). Real
   HTTP `Server-Timing` headers are optional future instrumentation, not assumed.
6. **A blast-radius matrix** for every candidate change.
7. **A phased, blast-radius-ordered roadmap** with a validation method per phase.
8. **An adversarial review** that tries to break the root-cause and the roadmap.

## Success looks like

Philip can read `01-CURRENT-STATE-AUDIT.md` + `05-IMPLEMENTATION-ROADMAP.md` and
make approve/reject decisions on each optimization without any further
investigation — every claim is backed by evidence and every risk is mapped.

## Anti-goal

Writing speculative "we could also…" filler. Every finding either cites a file
+ line / a query / a measurement, or it is marked **UNVERIFIED** with the test
that would verify it.
