# Unit 018 — Cursor Broadcast Re-Subscribes + Cleanup Resets Stale Refs (MEDIUM)

**Finding:** F-18 + F-19 (same file; `DEC-002` batch) · **Severity:** MEDIUM · **Priority:** P3 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-010` (items) · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

Two related defects in `src/hooks/use-estimate-cursor-broadcast.ts`:

**F-18:** The subscribe `useEffect` dependency array is
`[channelTopic, displayName, enabled, estimateId, userId]`, but a dedicated effect
already syncs `displayName`/`userId` into refs. A parent that passes an unstable
`displayName` (e.g. derived inline) tears down and reopens the realtime channel on
every render.

**F-19:** The cleanup writes `ownUserIdRef.current = userId ?? null` and
`ownDisplayNameRef.current = displayName ?? null` from the effect closure's prop
values. On re-subscription, the OLD effect's cleanup runs and overwrites the
freshly-provisioned ref with the older prop value, racing the newer effect's
`provisionIdentity` write — briefly broadcasting under the wrong identity.

## Evidence

`src/hooks/use-estimate-cursor-broadcast.ts`:
```ts
// 166-173: dedicated sync effect
useEffect(() => {
  ownUserIdRef.current = userId ?? ownUserIdRef.current;
  ownDisplayNameRef.current = displayName ?? ownDisplayNameRef.current;
}, [displayName, userId]);

// 430-431: cleanup writes back (F-19)
return () => {
  cancelled = true;
  ...
  ownUserIdRef.current = userId ?? null;       // ← stale closure props
  ownDisplayNameRef.current = displayName ?? null;
  ...
};

// 438: subscribe deps include the synced values (F-18)
}, [channelTopic, displayName, enabled, estimateId, userId]);
```

The header comment claims overrides are "held in refs so an inline identity changes
the deps used for nothing," but the deps contradict that.

## Fix Direction

Per the documented intent:

1. **F-18:** drop `displayName` and `userId` from the main subscribe effect's dep
   array. They are already covered by the synced refs (`ownUserIdRef`,
   `ownDisplayNameRef`) and the dedicated sync effect. Keep
   `[channelTopic, enabled, estimateId]`.
2. **F-19:** remove the two ref-reset lines from cleanup (the dedicated sync effect
   owns those refs). If a reset is genuinely needed on full unmount, gate it behind
   a true unmount check, not every re-subscription.

### Owned paths
- `src/hooks/use-estimate-cursor-broadcast.ts`

### Prohibited
- Do not change the realtime channel provisioning logic itself (`provisionIdentity`
  stays).
- Do not remove the dedicated sync effect (it's the correct owner of those refs).

## Acceptance Evidence

- `AC-001`: an unstable `displayName` prop no longer re-subscribes the channel.
- `AC-002`: after a re-subscription, the cleanup of the old effect does not stomp
  the new identity ref.

## Recovery

If removing `displayName`/`userId` from deps causes a stale identity in some path,
keep them but wrap the parent's value in `useMemo`/`useCallback` at the call site
instead.
