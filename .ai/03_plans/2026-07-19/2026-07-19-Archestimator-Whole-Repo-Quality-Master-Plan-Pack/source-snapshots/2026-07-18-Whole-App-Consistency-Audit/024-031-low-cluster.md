# Units 024–031 — LOW Cluster

Eight small, disjoint, low-severity inconsistencies. Each is independently
reversible; batch them or do them opportunistically. None is a blocker.

---

## Unit 024 — Share Snapshot GET Labels Opaque Project Id As `publicationId` (LOW)

**Finding:** F-24 · **Priority:** P4 · **Effort:** S · **Risk:** LOW · **Depends on:** —
**Location:** `src/app/api/share/[token]/route.ts:88`

The response field `publicationId` is populated from
`publication.snapshot.project.id`, but
`sanitizeProjectPublicationSnapshotForPublicRead` already remapped `project.id` to
the opaque `proj_…` form. The real publication id is
`publicationAccess.publicationId` (a different variable). The field name is
misleading and inconsistent with the client-portal manifest (which returns the real
portal id under `portal.id`).

**Fix:** thread `publicationAccess.publicationId` into the response, or rename the
field to reflect that it holds the opaque project id. Coordinate with any client
reading this field.

---

## Unit 025 — `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN` Default Semantics Inverted (LOW)

**Finding:** F-25 · **Priority:** P3 · **Effort:** S · **Risk:** LOW · **Depends on:** —
**Location:** `src/lib/cloudflare/scheduled-upload-jobs.ts:63-65`

```ts
function shouldDryRun(env) {
  return env.UPLOAD_JOBS_ENABLED?.trim() !== "1" || env.CLOUDFLARE_UPLOAD_JOBS_DRY_RUN?.trim() !== "0";
}
```

With `UPLOAD_JOBS_ENABLED=1` and the dry-run var **unset** (undefined), jobs
silently run in dry-run. The two gates disagree on the default. The route handler
(`upload-cleanup/route.ts:109`) gates real execution on `UPLOAD_JOBS_ENABLED`
separately, so this is defense-in-depth, but the inverted default is confusing.

**Fix:** make the dry-run default explicit — dry-run only when
`UPLOAD_JOBS_ENABLED !== "1"`. When enabled and dry-run var is unset, run for real
(or require an explicit `=1` to dry-run).

---

## Unit 026 — `GlobalPresence` DO Leaks Broadcast Timer On Idle (LOW)

**Finding:** F-26 · **Priority:** P4 · **Effort:** S · **Risk:** LOW · **Depends on:** —
**Location:** `src/lib/cloudflare/global-presence.ts:74,187-193`

`broadcastTimer` (`setTimeout`) is scheduled on every connect/message and never
cleared on `webSocketClose`/`webSocketError` or DO eviction. The timer holds the DO
alive (prevents eviction) for up to `PRESENCE_BROADCAST_DEBOUNCE_MS` per event. No
`alarm()` exists, so there's no guaranteed teardown. (CollaborationRoom and
SupportInbox are stateless across hibernation — correct.)

**Fix:** clear `broadcastTimer` in `webSocketClose` when no authorized sockets
remain.

---

## Unit 027 — `NotificationListItem` Locale Drift (LOW)

**Finding:** F-27 · **Priority:** P4 · **Effort:** S · **Risk:** LOW · **Depends on:** —
**Location:** `src/features/notifications/components/NotificationListItem.tsx:47`

```tsx
<span>{new Date(notification.deliveredAt).toLocaleDateString()}</span>
```

Uses the runtime default locale, whereas every other date/money formatter in scope
(`relative-time.ts`, `project-charts/format.ts`, `activity-formatters.ts`,
`build-insight-sentence.ts`) pins `en-PH`. A user on a non-`en-PH` browser sees
mixed locale formats side-by-side.

**Fix:** pin to `en-PH` via the shared `formatRelativeTime` / `absoluteDateFormatter`.

---

## Unit 028 — `clampNotificationLimit` Swallows NaN / Empty-String Cursor (LOW)

**Finding:** F-28 · **Priority:** P4 · **Effort:** S · **Risk:** LOW · **Depends on:** —
**Location:** `src/lib/notifications/repository.ts:66-69`

```ts
if (!Number.isFinite(limit)) return 20;
return Math.min(Math.max(Math.trunc(limit ?? 20), 1), 50);
```

`NaN` silently clamps to 20 (same branch as a missing limit). Separately, an
empty-string cursor is treated as "first page" via `input.cursor ? …` falsy
handling rather than rejected.

**Fix:** distinguish `undefined`/`null` (default 20) from non-numeric (reject) at
the action boundary. Treat empty-string cursor as invalid.

---

## Unit 029 — Support Inbox Caps At 100 With No Total (LOW)

**Finding:** F-29 · **Priority:** P4 · **Effort:** S · **Risk:** LOW · **Depends on:** —
**Location:** `src/app/api/admin/support/conversations/route.ts:10` + `src/lib/repositories/support-conversations-repository.ts:148`

The inbox hard-caps to 100 conversations (`Math.min(input.limit ?? 50, 100)`) and
the API returns no `total`. An operator with >100 conversations sees only the 100
most recent with no indication older ones exist.

**Fix:** return a total count, or surface "showing newest 100" when the result is
exactly 100.

---

## Unit 030 — Bearer-Auth Secret Loop Runs Past A Match (LOW)

**Finding:** F-30 · **Priority:** P4 · **Effort:** S · **Risk:** LOW · **Depends on:** —
**Location:** `src/lib/security/bearer-auth.ts:30-33`

```ts
for (const secret of secrets) {
  const currentMatch = timingSafeEqual(suppliedDigest, digestSecret(secret));
  matched = currentMatch || matched;
}
```

The loop continues after a match, so total time leaks how many secrets are
configured and which position matched. Minor (secrets are few, digests precomputed
per request).

**Fix:** precompute the valid digests once at module load (not per request) and
compare in constant time across the set. Pairs with unit 014 (same theme).

---

## Unit 031 — `buildAcceptedInviteRedirect` Trusts Form-Body Display Fields (LOW)

**Finding:** F-31 · **Priority:** P4 · **Effort:** S · **Risk:** LOW · **Depends on:** —
**Location:** `src/app/invite/[token]/accept/route.ts:35-71`

`readAcceptedInviteDisplayContext` reads `projectName` (max 96) and `roleLabel`
(max 32) from the form body and forwards them as query params on the redirect to
`/workshop`. They're length-capped and same-origin/React-escaped downstream, but
the poster can set them freely regardless of the actual invitation row.

**Fix:** source `projectName`/`roleLabel` from the server-resolved invitation row
(`resolveCollaborationInvitationFromD1`) rather than trusting the form. Pairs with
unit 017.
