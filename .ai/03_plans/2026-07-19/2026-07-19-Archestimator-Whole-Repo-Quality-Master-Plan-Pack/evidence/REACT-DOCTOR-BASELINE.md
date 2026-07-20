# React Doctor Baseline — 2026-07-19

## Command And Result

```bash
bun run doctor -- --verbose
```

The command exited `1` with 431 diagnostics and a score of 48/100:

| Severity | Count |
| --- | ---: |
| Error | 14 |
| Warning | 417 |

| Category | Count |
| --- | ---: |
| Accessibility | 64 |
| Bugs | 81 |
| Maintainability | 198 |
| Performance | 67 |
| Security | 21 |

The raw machine-readable result is
`evidence/react-doctor-2026-07-19.json`.

## Bounded Interpretation

React Doctor findings are static hypotheses, not automatic requirements:

- ten security errors point to preserved `supabase/migration-evidence/` or
  legacy `supabase/migrations/` history. Those paths are outside this task's
  mutation authority and are not evidence of a current production exploit;
  retain them as historical-tool false-positive candidates.
- four production errors report whole-result TanStack Query subscriptions in
  `SharePageComments.tsx`, `SharedLinkActivityFeed.tsx`,
  `TemplateEditorClient.tsx`, and `proposals-page-client.tsx`. The consolidated
  plan keeps one bounded revalidation unit for these current components.
- 164 diagnostics are `unused-export` or `unused-file`; a graph-aware import and
  route check is required before deletion.
- giant-component, state-shape, effect, accessibility, and micro-optimization
  warnings require behavior and ownership review. They are not silently added
  to the three absorbed packs' scope.

This baseline informs unit verification and future audits. It does not expand
the consolidation stop condition into an unbounded 431-item cleanup campaign.
