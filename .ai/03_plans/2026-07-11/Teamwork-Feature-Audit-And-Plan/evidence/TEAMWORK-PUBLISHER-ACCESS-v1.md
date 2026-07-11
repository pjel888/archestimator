# TEAMWORK-PUBLISHER-ACCESS-v1

**Status:** accepted internal-component ownership migration with a Publisher compatibility adapter; not public-recipient or hosted proof.

**Recorded:** 2026-07-11

## Bound Pack State

| Pack | Validation command | Manifest SHA-256 | Baseline head |
| --- | --- | --- | --- |
| Teamwork Feature Audit And Plan | `bun run validate:plan-pack -- .ai/03_plans/2026-07-11/Teamwork-Feature-Audit-And-Plan` | re-frozen with this receipt | `e373bc865b978e237deb1d92011c96b0a3639fb4` |
| Publisher And Shared Pages | `bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Publisher-And-Shared-Pages` | `3a6c664f496656360eeb2978abc0a713d997df258718d0c77c69a2c32c78af52` | owner manifest baseline |

The Publisher owner pack validated on the record date. This receipt does not mutate that pack.

## Ownership Migration

| Path | Role | SHA-256 |
| --- | --- | --- |
| `src/components/workshop/teamwork/ProjectMembersAccessPanel.tsx` | Teamwork-owned private membership/invitation/estimate-access UI and mutation imports | `72b95e432fe58355068cb0797c2eae666d5e76eb6e7a1523c3d3f1fafbf4a49c` |
| `src/components/workshop/teamwork/ProjectTeamAccessPanel.tsx` | Team route composition and authorized presence bridge | source-matched by Teamwork manifest refresh |
| `src/components/workshop/publisher/PublisherProjectMembersPanel.tsx` | compatibility export only | `3bbe8c6c244826a91de88e65b43cfe227c8331c819586d9c2168cf8ded926d38` |
| `src/components/workshop/publisher/PublisherDrawer.tsx` | existing internal Publisher caller through compatibility export | source-matched by Publisher pack |

Publisher callers preserve the exported `PublisherProjectMembersPanel` name while the implementation and all `@/lib/collaboration/actions` imports now live under Teamwork ownership. The adapter is a type/value re-export only and contains no server mutation import.

## Authority Separation

- `ProjectMembersAccessPanel` consumes `ProjectCollaborationSummary`, whose capability fields are derived by the authorized Teamwork repository boundary.
- The component is used only from authenticated internal Workshop surfaces. It is not imported by share/public-recipient surfaces.
- Publisher public-recipient publication/session authority remains in Publisher/publication modules. This migration does not grant a recipient workspace, project, or estimate membership.
- A Teamwork actor does not gain public recipient policy authority through this adapter.

## Verification

```text
bunx vitest run tests/vitest/publisher-access-mode.test.tsx tests/vitest/project-team-presence-bridge.test.tsx tests/vitest/publisher-roster-client.test.tsx --maxWorkers=1
3 files passed, 24 tests passed

bunx tsc --noEmit --pretty false
passed
```

`tests/vitest/publisher-page-contract.test.ts` validates the extraction/import boundary itself. Its unrelated header-routing assertion currently fails because concurrent source changes intentionally route the project access control to `/team` rather than the Publisher access tab; that worktree change is not altered by this receipt. This is an explicit validation gap, not a passing route claim.

## Compatibility Decision

The Publisher shim remains until all internal callers migrate to the Teamwork export directly or the Publisher owner explicitly retires the compatibility API. No public-recipient component may import the Teamwork implementation or collaboration server actions. Any change to the shim, Teamwork DTO/capabilities, Publisher caller inventory, or either owner manifest invalidates this receipt.

**Verifier:** Teamwork integrator, source/test evidence recorded 2026-07-11.
