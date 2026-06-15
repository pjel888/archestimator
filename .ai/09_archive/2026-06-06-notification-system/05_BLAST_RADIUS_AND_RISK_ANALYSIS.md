# Blast Radius And Risk Analysis

Refinement status: `REFINED_READY_FOR_IMPLEMENTATION`. This analysis is paired with `22_GITNEXUS_CODE_GRAPH_IMPACT_PLAN.md`, which defines the required fresh impact-analysis commands for the future implementation session.

## Expected Blast Radius

| Area | Files/Modules | Risk | Reason |
| --- | --- | --- | --- |
| App provider tree | `src/app/providers.tsx` | Medium | Global client provider changes can affect all routes. |
| Workshop shell | `src/components/workshop/WorkshopPageShell.tsx` or current shell equivalent | Medium | Header/action layout is visible across core authenticated flows. |
| Supabase schema | `supabase/migrations/*notification_system*.sql`, `src/lib/supabase/types.ts` | High | RLS and user data isolation are security-critical. |
| Notification domain | `src/lib/notifications/*`, `src/features/notifications/*` | Medium | New subsystem with cross-cutting UI. |
| Existing toast/modal primitives | `src/components/ui/toast.tsx`, `src/components/ui/modal.tsx` | Low if reused unchanged; High if modified | Reuse avoids regression; modification touches shared UI. |
| Collaboration/publication | `src/hooks/use-project-presence.ts`, `src/components/share/SharedLinkActivityFeed.tsx` | Low if only referenced | Must not alter existing Realtime and shared-link flows. |
| Public share pages | `src/app/share/[token]/*`, `src/components/share/*` | Low | Provider must not add authenticated notification UI there. |

## User Flows At Risk

- Signed-in workshop load.
- Project list and project workspace header.
- Estimate editing, row mutations, and transient save/error toasts.
- Shared-link owner activity feed and publication header indicators.
- Teamspaces presence and cursor collaboration.
- Beta feedback entry point if the notification bell competes for footer/header space.
- Public share recipient pages if global provider gating is wrong.

## Security Risks

| Risk | Severity | Likelihood | Mitigation |
| --- | --- | ---: | --- |
| Cross-user notification read/update | Critical | Medium | RLS policies tied to `auth.uid()`, server actions using `requireCurrentUserContext()`, cross-user denial tests. |
| Browser creates notification definitions | High | Medium | Revoke insert/update/delete from authenticated users; service-role/admin-only creation. |
| Metadata leaks share tokens or provider payloads | High | Medium | Plain payload schema, redaction rules, tests for forbidden keys. |
| Realtime policy is too broad | High | Medium | Durable first; simple `user:{auth.uid()}:notifications` authorization; private channel tests. |
| Release action link enables open redirect | Medium | Medium | Allow only internal relative paths or vetted same-origin links. |

## Performance Risks

| Risk | Severity | Likelihood | Mitigation |
| --- | --- | ---: | --- |
| Notifications block first workshop render | Medium | Medium | Load asynchronously inside provider; render shell immediately. |
| Unread count query scans all deliveries | Medium | Medium | Partial index on `(user_id, delivered_at desc)` where unread and not dismissed/archived. |
| Bad freshness defaults leave badges stale | Medium | High without explicit hooks | Notification query hooks must override global 5-minute stale time and invalidate on actions/Broadcast. |
| Realtime join latency grows from complex RLS | Medium | Low beta, Medium later | Keep Realtime topic authorization simple and user-only. |
| Modal/center mounts too much UI globally | Low | Medium | Lazy render center contents only when opened; keep initial payload small. |
| Notification payload grows unbounded | Medium | Low | Body length checks, payload schema version, delivery pagination. |

## UX Risks

- Release modal could interrupt first-run or critical estimating tasks. Mitigation: show only after shell mount, never during route transition/loading overlay, and only one modal at a time.
- Notification center could visually clutter dense product UI. Mitigation: compact icon button, tiny unread badge, no card-in-card layout.
- Users may confuse toasts and durable notifications. Mitigation: toasts remain bottom transient status; center handles persistent items.
- Modal focus behavior may be incomplete. Mitigation: test focus return and add a minimal primitive fix only if necessary.

## Merge Conflict Risks

- `src/app/providers.tsx` is small and commonly touched by global features.
- `src/components/workshop/WorkshopPageShell.tsx` may change during beta shell work.
- `src/lib/supabase/types.ts` may regenerate from concurrent migrations.
- Supabase migration timestamp order must be reconciled after rebase.

## Mitigations Before Editing

- Rebase on `origin/main`.
- Inspect current shell/provider paths before changing.
- Run GitNexus/code-review graph impact analysis if the index is available before modifying symbols.
- Keep modal/toast primitive changes out of scope unless tests prove necessary.
- Add tests before implementation where practical.
- If graph tooling reports an empty or stale index, document the fallback, run targeted file/symbol searches, and refresh the index when available before committing source changes.
- Report HIGH or CRITICAL impact to the owner before continuing with code edits.

## Rollback Strategy

- UI rollback: remove provider mount and shell bell; database state remains harmless.
- Realtime rollback: disable hook; durable query path remains canonical.
- Data rollback: expire release definition and mark deliveries dismissed if an announcement is wrong.
- Migration rollback before linked apply: revert migration file. After linked apply: create forward rollback migration that disables/archives rows rather than dropping user data.

## Deliberate Pre-Mortem

### Scenario 1: Cross-User Leakage

Failure: User A can read User B notification definition or delivery because `notification_definitions` select policy is too broad or joins bypass delivery ownership.

Prevention:

- Definition reads are allowed only through an own delivery row.
- Delivery reads and state updates require `auth.uid() = user_id`.
- No browser insert/update/delete on definitions.
- Server actions never accept browser-provided user ids.

Verification:

- RLS test: User A reads own delivered definition.
- RLS test: User A cannot read definition delivered only to User B.
- RLS test: User A cannot update User B delivery state.
- Static SQL test asserts scoped definition select policy exists.

### Scenario 2: Provider Freshness Regression

Failure: Notification badge, modal, or center state remains stale because global query defaults have 5-minute `staleTime` and no window-focus refetch.

Prevention:

- Notification hooks set explicit 30-second unread/modal stale time and 60-second feed stale time.
- Mark-read, dismiss, and modal acknowledgement mutations update or invalidate feed/count/modal query keys.
- Optional Realtime invalidates only; canonical database fetch follows.

Verification:

- Query hook test asserts notification-specific stale times are configured.
- Mutation tests assert cache update or invalidation for all notification query keys.
- E2E flow marks a notification read and sees badge update without waiting five minutes.
- Browser/network log review confirms no repeated fetch loop.

### Scenario 3: Modal Focus/Restore Failure

Failure: Release modal closes but focus is lost, trapped incorrectly, or sent behind the app shell, making keyboard navigation painful.

Prevention:

- Release modal test must assert focus return.
- If current `Modal` primitive cannot satisfy focus return, implementation adds the smallest shared primitive enhancement with regression tests.
- Only one modal is shown at a time.

Verification:

- Component test: Escape closes and returns focus.
- Component test: close button returns focus.
- Manual keyboard QA at 320px and desktop widths.
- Existing modal/tooltip regression tests still pass.

## Blast Radius Closure Checklist

- [ ] App provider impact analyzed before editing `src/app/providers.tsx`.
- [ ] Workshop shell/header impact analyzed before editing workshop shell files.
- [ ] Modal primitive impact analyzed before any shared dialog changes.
- [ ] Toast primitive left unchanged unless a targeted regression test proves a required change.
- [ ] Shared-link activity and collaboration Realtime files left unchanged unless future producers explicitly require integration.
- [ ] `gitnexus_detect_changes()` or code-review graph `detect_changes` run before commit.
- [ ] Final implementation log names every affected symbol/file and explains why the blast radius stayed acceptable.
