# 02 - Blast Radius and Dependency Audit

## Scope of This Audit

This is a planning audit for likely future work. No source symbols were edited in this task.

Code-review graph was used before broad file reads. The graph was current for this branch and reported:

- 356 files.
- 3205 nodes.
- 45330 edges.
- Last updated: 2026-05-31T17:27:06.

Keyword search in the graph did not surface share-page nodes directly, so the audit fell back to file-level graph queries and targeted file reads.

## File-Level Impact Probe

A future change set touching the receiver route and main share components was modeled against:

- `src/app/share/[token]/page.tsx`
- `src/components/share/SharePageTabs.tsx`
- `src/components/share/SharePageHero.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/components/share/SharePageSessionBanner.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/share/ShareFloatingTreeNav.tsx`
- `src/lib/publication/public-repository.ts`

Code-review graph result:

| Check | Result |
| --- | --- |
| Impact radius | High file-level risk |
| Direct nodes changed in modeled set | 40 |
| Impacted nodes within 2 hops | 500 shown, 502 total |
| Additional files affected | 110 |
| Affected execution flows | 0 reported |

Interpretation: source changes in this area are user-visible and cross several components, even though the graph does not currently attach them to named execution flows. Treat broad receiver UI work as medium-to-high blast radius unless split into smaller phases.

## Known Existing Graph Notes

Existing source comments in `src/app/share/[token]/page.tsx` and `src/components/share/SharePageTabs.tsx` record prior graph checks during earlier share-page work:

- Prior `get_affected_flows` on `SharePageTabs.tsx` and `page.tsx` reported 0 affected flows.
- Prior impact was described as isolated to the public share receiver surface.

These notes are useful context, but every future implementation phase must rerun graph impact on exact symbols/files before editing.

## GitNexus Note

`npx gitnexus --help` was attempted during this planning pass and failed with:

```text
Cannot destructure property 'package' of 'node.target' as it is null.
```

Use code-review-graph first, and retry GitNexus only after the CLI issue is resolved or the index is rebuilt. Do not treat this planning pack as satisfying future symbol-edit impact requirements.

## Touchpoint Risk Matrix

| Touchpoint | Risk | Why |
| --- | --- | --- |
| Receiver shell width in `page.tsx` | Medium | Visible on every shared link; low code complexity |
| Right rail layout in `page.tsx` | Medium | Affects comments/decision visibility and mobile stacking |
| `SharePageTabs` layout state | High | Central orchestrator for active sheet, chart, tabs, tree, grid |
| `CostDonutChart` compact sizing | Medium | Shared chart component also used outside share page |
| `ShareEstimateTreeView` row density | Medium | Affects tree readability, keyboard, mobile collapse |
| `ShareEstimateTreePanel` navigation/sidebar | Medium | Search/expand behavior and width compete with content |
| `ShareFloatingTreeNav` integration | Medium | Currently unused; wiring it can duplicate navigation |
| Comments/decision movement | High | Session-gated, API-backed, security-sensitive |
| Snapshot tree data usage | Medium | Could improve fidelity, but must preserve old snapshots |
| Public APIs | High | Token, CSRF, cookies, rate limiting, audit events |

## Dependency Boundaries to Preserve

1. Public receiver remains outside Workshop shell.
2. Shared Link and Teamspaces remain separate systems.
3. Recipient sessions do not create membership.
4. Snapshot JSON remains the receiver data source.
5. Comments and decisions remain session-gated.
6. Public share pages must avoid landing analytics/tracking scripts.
7. No service-role access should be introduced into the public receiver route.

## Recommended Future Blast-Radius Slices

| Slice | Expected blast | Files |
| --- | --- | --- |
| P0 shell width and desktop column rebalance | Medium | `page.tsx`, maybe `SharePageSessionBanner.tsx` |
| P1 estimate workspace reorganization | High | `SharePageTabs.tsx`, new extracted share components |
| P2 mobile chart/tree/readability fix | Medium | `SharePageTabs.tsx`, `CostDonutChart.tsx`, tree components |
| P3 search/filter/sort inside estimate content | Medium | `SharePageTabs.tsx`, possible extracted toolbar |
| P4 comments/decision rail redesign | High | `page.tsx`, `SharePageDecision.tsx`, `SharePageComments.tsx` |
| P5 route loading/error/empty states | Low-medium | new `loading.tsx`, `error.tsx`, `SharePageTabs` empty state |

## Future Pre-Edit Requirements

Before any implementation, this gate must be completed and recorded in the implementation closeout.

### Required GitNexus Gate

1. Read `gitnexus://repo/archestimator/context` and confirm the index is present and not stale.
2. If stale, run:

```bash
npx gitnexus analyze
```

3. For every symbol that will be edited, run:

```text
gitnexus_impact({ target: "<symbolName>", direction: "upstream", minConfidence: 0.8, maxDepth: 3 })
```

4. Read `gitnexus://repo/archestimator/processes` and note affected flows.
5. If any result is HIGH or CRITICAL, stop implementation and report the blast radius before editing.
6. Before commit, run:

```text
gitnexus_detect_changes({ scope: "all" })
```

### Allowed GitNexus Waiver

A waiver is allowed only if GitNexus remains broken with a concrete tool or CLI error. The closeout must include:

- exact command/tool attempted,
- exact error text,
- whether `npx gitnexus analyze` was attempted,
- code-review-graph `get_impact_radius` or `detect_changes` fallback results,
- explicit statement that AGENTS-required GitNexus impact could not be completed.

The current known error is:

```text
Cannot destructure property 'package' of 'node.target' as it is null.
```

Do not silently proceed on GitNexus failure. Use the waiver only after recording the fallback evidence.

### Required Code-Review-Graph Fallback

Even when GitNexus works, use the code-review graph to verify file-level blast radius:

1. `get_impact_radius` for exact files or symbols.
2. `get_affected_flows` for the changed files.
3. `detect_changes` after edits.
4. `get_review_context` for any HIGH or CRITICAL risk area before final review.

High or critical graph results require a short risk note before editing and targeted tests before claiming the slice is complete.

### Required Project Context

Before editing, also read:

1. `DESIGN.md`.
2. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`.
3. `12-selected-ui-strategy-and-wireframe-contract.md`.
4. `15-implementation-test-spec.md`.

Write or update targeted tests before layout edits when behavior is changing. Preserve existing tests for password, recipient session, comments, decisions, tabs, and metadata.
