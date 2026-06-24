# 16 — Edge Case and Test Matrix

## Current test coverage

### Located tests
| File | Type | Coverage |
| --- | --- | --- |
| `tests/vitest/component-library-ui.test.tsx` | Component/integration | Tab contract, folder CRUD inline, bulk add/delete + undo, slash shortcut, source URL sanitization, thumbnail route validation, project-tab template save, lazy-load invalidation count, view-mode prefs hydration, localStorage failure handling, project component read-only verification |
| `tests/vitest/estimate-sheet-library-lazy-load.test.tsx` | Integration | U4 lazy-load contract: skeleton display, cache reuse on remount, error + retry, no-fetch when server-provided, invalidation call-site count |

### Coverage gaps

| Scenario | Current coverage | Recommended test | Priority |
| --- | --- | --- | --- |
| Component Edit persistence | ❌ None | Edit component → refresh → verify DB value | P1 |
| Component Duplicate persistence | ❌ None | Duplicate → refresh → verify new DB row | P1 |
| Component Delete persistence | ❌ None (tests local-only behavior) | Delete → refresh → verify item reappears (or is archived) | P1 |
| Project-source search race | ❌ None | Fire query A (slow) → fire query B (fast) → verify B wins | P1 |
| Template group persistence | ❌ None | Create group → refresh → verify disappearance | P1 |
| "Live source" insert = snapshot | ❌ None | Insert source → modify source estimate → verify no propagation | P1 |
| Folder delete in sidebar | ❌ N/A (feature absent) | N/A | P2 |
| Component move between folders | ❌ N/A (feature absent) | N/A | P2 |
| Below-1024px sidebar access | ❌ None | Resize to tablet → verify sidebar inaccessible | P2 |
| Hover prefetch dedup | ❌ None | Hover same project 3× → verify 1 request | P3 |
| Cross-tab storage event sync | ❌ None | Open 2 tabs → change view-mode in tab A → verify tab B | P3 |
| Panel collapse persistence | ❌ None | Collapse → refresh → verify expanded | P3 |
| Concurrent template insert | ❌ None | Fire 2 inserts simultaneously → verify revision guard | P2 |
| IME composition + Enter | ❌ None | Type with IME → Enter during composition → verify no premature submit | P3 |
| Search query persists across tabs | ❌ None | Search in Library → switch to Templates → verify query filters templates | P2 |

## State-transition matrix (critical paths)

### Folder create lifecycle
| From → To | Transition | Guard | Expected |
| --- | --- | --- | --- |
| Idle → Creating | Click "Add folder" | None | Temp row + input focus |
| Creating → Saving | Enter / blur | `!folderEditCommitInFlightRef.current` | Server call, pending state |
| Creating → Cancelled | Escape | None | Temp row removed |
| Saving → Saved | Server success | None | Temp id → server id, toast |
| Saving → Failed | Server error | None | Row removed, error toast |
| Saving → Idle (double Enter) | Enter while saving | `folderEditCommitInFlightRef.current` | Ignored (single mutation) |

### Component delete lifecycle
| From → To | Transition | Expected |
| --- | --- | --- |
| Idle → Confirm dialog | Click "Delete" | Dialog opens |
| Confirm → Deleted (local) | Click "Delete selected" | Item removed from `libraryItems`, undo toast |
| Confirm → Cancelled | Click "Cancel" / Escape | Dialog closes |
| Deleted → Restored | Click "Undo" | Item restored from ref |
| Deleted → Remount | Refresh / remount | **Item reappears** (DB still has it) |

### Project-source expand lifecycle
| From → To | Transition | Expected |
| --- | --- | --- |
| Collapsed → Loading | Click expand | Skeleton (after 150ms) |
| Loading → Loaded | Server success | Content replaces skeleton |
| Loading → Error | Server failure | Error state, retry on re-expand |
| Loading → Collapsed | Click collapse while loading | Row collapses, promise continues |
| Collapsed → Loading (again) | Click expand again | Dedup check — may skip if already loaded |

## Destructive exhaustive cases

| Case | Precondition | Action | Expected |
| --- | --- | --- | --- |
| Delete during preview | Preview open for item | Delete the item | Preview closes or updates |
| Delete during drag | Drag in progress | Delete (context menu) | Drag cancelled, item removed |
| Rename during search | Search active | Rename folder | Folder renamed in filtered view |
| Create folder during search | Search active | Click "Add folder" | Folder creation clears search? **No** — search persists, temp row may not match filter |
| Switch tab during modal | AddComponentModal open | Click "Project" tab | Modal stays open (no guard) |
| Switch tab during rename | Folder rename active | Click "Project" tab | Rename input loses focus → blur commits |
| Switch estimate during lazy load | Library loading | Navigate to different estimate | Load completes, result discarded |
| Panel resize during drag | Component drag in progress | Resize panel | Drag may be interrupted (pointer leaves drag source) |
| Storage quota exceeded | localStorage full | Any localStorage write | Warning logged, no crash |

## Failure injection matrix

| Failure | Injection method | Expected behavior |
| --- | --- | --- |
| Server action 500 | Mock rejection | Error toast |
| Server action timeout | Mock delayed rejection | Pending state, eventually error toast |
| Network offline | Disable network | Server action fails, error toast |
| RLS denial | Mock `is_workspace_editor` returning false | "Only workspace editors/admins can manage library folders." |
| Malformed drag payload | Set garbage MIME data | Silently ignored |
| Invalid image URL | Set `javascript:alert(1)` | Not rendered as link |
| Path traversal image | Set `../../etc/passwd` | Blocked by route normalizer |
| Concurrent optimistic creates | Fire 2 creates rapidly | Both succeed, IDs reconciled |
| Template insert race | Fire 2 inserts to same target | Revision guard prevents overwrite |
