# Branch Evidence Snapshot

Collected: 2026-06-16T06:11:00Z

## PR #83

```text
branch: codex/fix-expired-envelope-issue-in-cursor-broadcasts
push: 1df48983..6582d0a7
post-push divergence origin...HEAD: 0 0
latest commit: 6582d0a7 Keep cursor identity refresh recoverable
```

## PR #81

```text
branch: codex/fix-non-atomic-batched-template-insert
push: a96ec4b4..95da9d27
post-push divergence origin...HEAD: 0 0
latest commit: 95da9d27 Reconcile partial template insert failures
```

## PR #79

```text
branch: codex/fix-indefinite-drag-auto-scroll-issue
push: 4a9ab039..b622c054
post-push divergence origin...HEAD: 0 0
latest commits:
- b622c054 Stop drag autoscroll on child exits
- fb5b19a1 Keep drag autoscroll alive across child leave events
```

## PR #78

```text
branch: codex/propose-fix-for-supabase-pat-leak
push: 67185b4a..a91a6314
post-push divergence origin...HEAD: 0 0
latest commit: a91a6314 Tolerate EOF for token-file reads
```

## PR #76

```text
branch: codex/propose-fix-for-notification-action-href-vulnerability
push: ed8fbeb1..f626c04d
post-push divergence origin...HEAD: 0 0
latest commit: f626c04d Ensure notification href hardening deploys cleanly
```

## PR #72

```text
branch: codex/fix-terms-acceptance-bypass-in-api-routes
push: ce0bc60a..aed3c86c
post-push divergence origin...HEAD: 0 0
latest commit: aed3c86c Close Terms gate bypasses in protected flows
```

## PR #69

```text
branch: codex/fix-resource-exhaustion-in-search-action
push: 91bc47f0..b2e173eb
post-push divergence origin...HEAD: 0 0
latest commit: b2e173eb Bound reusable source search work before materializing results
```

## PR #68

```text
branch: codex/propose-fix-for-dos-vulnerability
push: 31dfa8aa..367df6f0
post-push divergence origin...HEAD: 0 0
latest commit: 367df6f0 Keep reusable-source caps on matched results
```

## PR #67

```text
branch: codex/fix-search-prefilter-row-truncation
push: 91d707a1..576c090a
post-push divergence origin...HEAD: 0 0
latest commit: 576c090a Keep reusable source prefilter paging bounded
```

## Final GitHub Thread Audit

```text
open PRs inspected: 21
Codex review threads inspected: 21
active unresolved non-outdated threads: 0
all tracked thread IDs resolved on GitHub: yes
```

## Second-Pass Branch Evidence

Collected: 2026-06-16T06:33:18Z

```text
PR #83 codex/fix-expired-envelope-issue-in-cursor-broadcasts
head: 2b3c7ae173a5520b8c1230f893958cc82996e810
threads resolved: PRRT_kwDOSfSDcs6JysOe
mergeability: CLEAN / MERGEABLE

PR #79 codex/fix-indefinite-drag-auto-scroll-issue
head: 1c29b961b526cd7ab2b70dc5dfff4818ce39367d
threads resolved: PRRT_kwDOSfSDcs6Jyoo8
mergeability: CLEAN / MERGEABLE

PR #78 codex/propose-fix-for-supabase-pat-leak
head: cdbe7e40af729eefdbebed53834e4ad4bced7812
threads resolved: PRRT_kwDOSfSDcs6JyyLp
mergeability: CLEAN / MERGEABLE

PR #72 codex/fix-terms-acceptance-bypass-in-api-routes
head: 1216b6ea5a0422823905eb080fdfd4059bb047b0
threads resolved: PRRT_kwDOSfSDcs6JyuNN, PRRT_kwDOSfSDcs6JyuNO, PRRT_kwDOSfSDcs6JyuNP
mergeability: CLEAN / MERGEABLE

PR #69 codex/fix-resource-exhaustion-in-search-action
head: 440b6fe8c12037a9f1060a6e59a0da35c22c3d8c
threads resolved: PRRT_kwDOSfSDcs6JysyE, PRRT_kwDOSfSDcs6JysyG, PRRT_kwDOSfSDcs6JysyK, PRRT_kwDOSfSDcs6JysyL
mergeability: CLEAN / MERGEABLE

PR #68 codex/propose-fix-for-dos-vulnerability
head: d419f97e876a460d89b4f6aa782f01a6dcc74291
threads resolved: PRRT_kwDOSfSDcs6Jys-9, PRRT_kwDOSfSDcs6Jys-_, PRRT_kwDOSfSDcs6Jys_E
mergeability: CLEAN / MERGEABLE

PR #67 codex/fix-search-prefilter-row-truncation
head: 54964215f5897571f7a13d6f0f032dbab39f37a4
threads resolved: PRRT_kwDOSfSDcs6JyoMO
mergeability: CLEAN / MERGEABLE
```

## Second-Pass Final GitHub Thread Audit

```text
open PRs inspected: 21
review threads inspected: 35
active unresolved non-outdated Codex threads: 0
active unresolved non-outdated threads from any author: 0
touched PRs clean and mergeable: yes
remaining merge concern outside comment scope: PR #66 DIRTY / CONFLICTING, with 0 active Codex review threads
```

## Late-Wave Branch Evidence

Collected: 2026-06-16T06:49:17Z

```text
PR #81 codex/fix-non-atomic-batched-template-insert
head: 2c47b6d37058522cc6ae8cd2fe21e2df95f4a247
threads resolved: PRRT_kwDOSfSDcs6Jy7iM, PRRT_kwDOSfSDcs6Jy7iQ
mergeability: CLEAN / MERGEABLE

PR #69 codex/fix-resource-exhaustion-in-search-action
head: b77f48dd71ca06ed6174e039a0c7278a3c5bb1e9
threads resolved: PRRT_kwDOSfSDcs6Jy9_-
mergeability: CLEAN / MERGEABLE

PR #68 codex/propose-fix-for-dos-vulnerability
head: 8fdd9b0ca27e71e16a14bac3508f950badf740fa
threads resolved: PRRT_kwDOSfSDcs6JzEFn
mergeability: CLEAN / MERGEABLE
```

## Late-Wave Final GitHub Thread Audit

```text
open PRs inspected: 21
review threads inspected: 39
active unresolved non-outdated Codex threads: 0
active unresolved non-outdated threads from any author: 0
touched PRs #67, #68, #69, #72, #78, #79, #81, #83 clean and mergeable: yes
remaining merge concern outside comment scope: PR #66 DIRTY / CONFLICTING, with 0 active Codex review threads
```
