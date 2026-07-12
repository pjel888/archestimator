# 03 — Research-Backed React Performance Playbook

## 1. Governing principle: profile the interaction, not the architecture

React's `<Profiler>` reports actual and base render duration for a selected subtree. React also warns that profiling itself adds overhead and should be used only where needed.

Applied here:

- profile `EstimateSheetContent`, the active branch/table, and the active row;
- profile one row edit, one shared-component update, one search, or one expand;
- do not wrap the whole app in permanent profilers;
- do not create a new reporting platform before reading the trace.

React Performance tracks can show:

- the update that triggered a render;
- render/commit/effect phases;
- component flamegraphs;
- changed props;
- cascading updates.

Applied here:

- use changed-prop evidence to prove why unrelated rows render;
- inspect whether root state or context invalidates subtrees;
- use one trace as diagnosis, not as a release bureaucracy.

## 2. Fix the state boundary before adding memoization

React states that `memo` is only a performance optimization and code must work without it. It also notes that granular editor-like interactions are where memoization can be valuable.

Applied here:

- the estimate sheet is granular/editor-like;
- memoization is appropriate at row/branch boundaries;
- a custom comparator scanning every row is not the desired architecture;
- first make each row receive or subscribe to only the state it needs;
- then retain memo only where a trace proves benefit.

### Rule

```text
Bad boundary + memo everywhere = fragile and expensive.
Narrow state subscription + simple memo = predictable.
```

## 3. Measure expensive calculations before caching

React recommends measuring transformations, especially those looping over thousands of objects, and treating `useMemo` only as an optimization.

Applied here:

- full-tree totals and transformations over thousands of rows qualify;
- selected node code/path lookups should become indexed rather than separately memoized recursive scans;
- a memo whose dependency is the entire `editableRows` object still recomputes every keystroke;
- dependency design matters more than adding another `useMemo`.

## 4. Avoid cascading state and effect synchronization

React recommends deriving render data directly rather than using Effects to transform data, because effect-driven derived state creates extra render passes and can become error-prone.

Applied here:

- keep pure derived values pure;
- do not build an effect network that copies query tree into another tree store;
- initialize the transient draft store explicitly from the confirmed tree;
- reconcile only on confirmed row revision/tree replacement events;
- mutation events update both authoritative cache and draft baseline through explicit actions.

## 5. Use external-store subscriptions only for the high-frequency boundary

React's `useSyncExternalStore` exists to subscribe to a store outside React and re-render only when the selected immutable snapshot changes. Archestimator's protocol routes high-frequency UI state to Zustand.

Applied here:

- use one vanilla store per mounted estimate;
- store transient row drafts and incremental totals;
- expose row-specific selectors;
- do not move server/query state into the store;
- do not make it global;
- snapshots must be immutable/stable;
- subscription functions must be stable.

This is narrower than rewriting the app around global state.

## 6. Preserve structural sharing

TanStack Query keeps unchanged data references where possible. This helps React avoid rerendering unaffected consumers.

Applied here:

- tree patches must clone only affected nodes and ancestors;
- never rebuild the entire tree after a row mutation;
- direct query-cache patches should preserve unrelated references;
- avoid materializing a new full tree for every input draft;
- query result consumers should use exact `data` fields and selectors where useful.

TanStack Query's `select` can subscribe a component to a subset of cached data. Use it only when a component genuinely needs a subset and the selector is stable.

## 7. Virtualization controls mount, not all computation

TanStack Virtual renders visible items and positions them in a virtual container.

Applied here:

- keep current row/branch virtualization;
- do not assume virtualization fixes full-tree flattening, totals, indexing, filtering, or parent renders;
- optimize upstream derivation first;
- virtualizer changes need a mount/commit trace.

## 8. Keep controlled inputs synchronous

React explicitly says a state variable controlling an input cannot be updated in a Transition.

Applied here:

- the active input draft updates synchronously;
- save requests and non-urgent views can be transitioned;
- search result rendering can use deferred input;
- never wrap row input state itself in `startTransition`.

## 9. Use `useDeferredValue` for slow secondary rendering

React describes `useDeferredValue` as useful when typing must remain responsive while a slow list or chart catches up. It does not make the slow rendering faster.

Applied here:

- first eliminate avoidable full-tree work;
- then pass a deferred search query to the filtered tree;
- keep the search input synchronous;
- show a subtle stale-results state if delay is visible;
- do not use deferral to hide an O(n) keystroke architecture.

## 10. Keep client boundaries and bundles narrow

Next.js recommends placing `'use client'` on specific interactive components to reduce client JavaScript. It also recommends lazy loading client components/libraries when they are not needed for initial render.

Applied here:

- preserve current dynamic imports for modals, library panel, proposal preview, and heavy editors;
- splitting `EstimateSheetContent` should create smaller interactive islands where practical;
- do not turn server route/config logic into client context;
- remove the performance-mode client provider and DOM metadata;
- do not add new heavy packages.

## 11. Measure response to paint

Interaction to Next Paint evaluates how quickly the page presents visual feedback after interactions. A good field threshold is at or below 200 ms; Archestimator's own target for row-edit perceived latency is tighter at 100 ms for the enterprise target.

Applied here:

- primary user metric is input event → next paint;
- React render duration is diagnostic, not the sole user metric;
- server mutation completion is a separate metric;
- optimistic UI must paint before network completion;
- use CPU throttling for a sanity check when browser testing is authorized.

## 12. Practical optimization order

For this estimate editor, apply tactics in this order:

1. remove needless work;
2. narrow state subscriptions;
3. preserve object identity;
4. index repeated lookups;
5. update aggregates incrementally;
6. defer secondary rendering;
7. virtualize large mounted lists;
8. split/lazy-load code;
9. optimize server queries;
10. add concurrency/worker/toolchain complexity only if still proven necessary.

## 13. Anti-patterns forbidden by this plan

- memoizing every function by default;
- deep custom comparators over large collections;
- duplicating server tree in global client state;
- copying derived state through Effects;
- full-tree materialization on each draft;
- adding a graph abstraction before a measured indexed lookup;
- adding a worker before main-thread work is minimized;
- adding feature modes before an alternate implementation exists;
- using jsdom timing as final browser responsiveness proof;
- creating tests for receipts instead of behavior;
- adding benchmarks for every code path;
- optimizing route load because a stub is named “fast path”;
- enabling React Compiler as a shortcut.

## 14. Decision table

| Symptom | First diagnostic | Preferred first tactic |
|---|---|---|
| Input typing lag | React trace + event→paint | isolate row draft subscription |
| Totals lag | function timing/probe | delta-based ancestor totals |
| Shared component save lag | inspected-row count | component identity index + grouped patch |
| Search typing lag | input→paint + render flamegraph | gate work, then deferred query |
| Expand/collapse lag | branch render count | preserve references; virtualizer only if mount dominates |
| Route open slow | existing Server-Timing | optimize dominant query/span only |
| Memory growth | heap/DOM count | verify virtualization/store cleanup |
| Modal open slow | import/render trace | dynamic import or compute-on-open |
