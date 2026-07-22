# User Support System: Dependency Decision

## Decision

Add **no runtime dependencies** for the initial user support system.

The repository already contains the UI, form, upload, query, realtime, and
notification primitives needed for a fast and coherent implementation. Adding a
second dialog, form, dropzone, editor, socket, virtual-list, or toast package
would duplicate behavior and expand the supply-chain and bundle surface without
solving a missing capability.

## Current stack baseline

- Next `16.2.10`, React `19.2.7`, Tailwind v4.
- TanStack Query `5.100.14`, TanStack Virtual `3.14.7`.
- Tiptap `3.28.0` already exists for the heavy admin email composer.
- shadcn `4.13.1` is a development CLI, not a runtime component layer.
- Direct Radix runtime packages currently cover menus, not Dialog.
- Repository-owned Dialog, Modal, Sheet/Drawer, controls, upload UI, toast, and
  support message components already exist.

## Capability matrix

| Need | Use | Do not add | Reason |
| --- | --- | --- | --- |
| Feedback modal / mobile panel | `src/components/ui/modal.tsx`, `src/components/ui/overlays/dialog.tsx`, `sheet-drawer.tsx` | `@radix-ui/react-dialog`, Base UI, Vaul | Existing components already portal, trap focus, handle Escape, mark background inert, describe the dialog, and return focus. |
| Message form | `ControlTextarea`, native constraints, `FormData`, local state or `useActionState`, server validation | React Hook Form, direct Zod | One short form has no complex cross-field state that justifies another runtime. |
| Screenshot picker | native `<input type="file">`, `DataTransfer.files`, `ClipboardEvent.clipboardData.files`; adapt the existing `FileUpload` pattern | `react-dropzone` | Pick, drop, and paste are already available browser APIs and current code uses them. |
| Local preview | `URL.createObjectURL` plus `URL.revokeObjectURL` | image preview package | Native object URLs are sufficient; server acceptance remains authoritative. |
| Screenshot capture | Defer. If later required, explicit feature-detected `getDisplayMedia()` | `html2canvas`, `dom-to-image`, `modern-screenshot` | DOM reconstruction is not a true screenshot, misses CSS, creates privacy risk, and is unnecessary when users can paste or upload. |
| User composer | Plain textarea | Tiptap or another rich editor | Customer complaints need fast plain text, not a ProseMirror graph or HTML sanitation surface. |
| Conversation data | TanStack Query | custom fetch-in-effect store | Query keys, invalidation, retry, and cache already exist. |
| Realtime | native WebSocket plus D1 refetch | Socket.IO, Pusher, Ably | The current DO endpoint is raw WebSocket and already follows identifier-only invalidation. |
| Notifications | existing `useToast`, unread flags and badges | Sonner, react-hot-toast, browser Notification permission | Current global providers cover transient state; durable unread is D1 data. |
| Long lists | simple mapped lists; existing TanStack Virtual only if measured need appears | `react-window` | Current mailbox and thread limits do not justify virtualization. |

## shadcn and Radix conclusion

Do not run `shadcn add dialog` and do not add Radix Dialog for this work. shadcn
distributes repository-owned component source; it is not itself the missing
runtime. The local Dialog/Sheet implementation already supplies the relevant
accessibility contract. If a future audit proves a concrete defect that cannot
be repaired locally, Radix Dialog is a compatible fallback, not the default.

## Attachment implementation decision

- One optional screenshot per user message in MVP.
- PNG, JPEG, or WebP only.
- 3 MiB maximum per screenshot so the complete multipart request remains below
  the hosted Worker request-body ceiling.
- Use the authenticated Worker relay and private `ARCH_UPLOADS_R2` binding.
- Do not add R2 S3 signing credentials or `aws4fetch` for this scope.
- Use content signatures, normalized filename/type, SHA-256, stable idempotency
  keys, private cache headers, and owner/admin authorization.
- Do not reuse the admin-only upload route for users.

## Dependency trigger for future reconsideration

Reopen this decision only if evidence establishes one of these requirements:

1. screenshots larger than the hosted relay ceiling;
2. multiple or non-image user attachments;
3. server-side malware/content scanning beyond the current private-image model;
4. true in-app screen capture requested by users;
5. measured thread/list size that exceeds current rendering performance; or
6. an accessibility defect in the repository Dialog/Sheet that cannot be fixed
   without replacing it.

Any reconsideration must compare maintenance, license, React 19/Next 16 and
Worker compatibility, bundle cost, security surface, and migration impact. The
current decision makes no claim that rejected packages are abandoned or unsafe;
they are unnecessary for this product shape.
