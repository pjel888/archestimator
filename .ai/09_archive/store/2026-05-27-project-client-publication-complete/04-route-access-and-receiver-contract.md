# Route Access And Receiver Contract

**Date:** 2026-05-27
**Status:** Implemented V1 route/access contract. Keep this aligned with `/share/[token]` and `/api/share/[token]` routes.

## Route Principles

- Protected management stays under `/workshop`.
- Receiver routes live outside `/workshop`.
- Public receiver routes do not render `WorkshopPageShell`.
- API routes do not rely on proxy auth.
- Every receiver/API/password route validates publication token and access state before data access.
- Every receiver/API/password route uses no-store response behavior until revocation/cache behavior is proven.

## Chosen Receiver Route

V1 route:

```txt
/share/[token]
```

Rules:

- `token` is opaque, high entropy, and not a project id or estimate id.
- No raw workspace/project/estimate ids appear in the URL.
- `/share/[token]` must not be redirected to `/login` by proxy.
- `/share/[token]` must not use app/workshop layouts.
- Invalid, revoked, expired, missing, or deleted publications render the same generic unavailable state.

## Protected Manager Surfaces

V1 can be modal-only on existing protected routes:

```txt
/workshop/projects/[projectId]
/workshop/projects/[projectId]/estimates
/workshop/projects/[projectId]/estimates/[nodeId]
```

Header group opens `Public client link` on each route. A future full page is allowed only if modal complexity becomes unwieldy:

```txt
/workshop/projects/[projectId]/publish
```

## Receiver Request State Machine

```txt
raw token received
  -> normalize token
  -> keyed hash token
  -> lookup publication by token hash
  -> not found: generic unavailable
  -> revoked/deleted: generic unavailable
  -> expired: generic unavailable
  -> password required and no valid receiver session: password gate
  -> password accepted or password not required
  -> resolve latest active snapshot
  -> record best-effort open event
  -> render safe receiver view
```

No project data may be loaded for display until the publication status and password/session state pass.

## Manager Request State Machine

```txt
authenticated user
  -> load project through existing protected project boundary
  -> verify project access
  -> verify owner/admin publication-management permission
  -> load publication summary
  -> render header state and settings controls
```

Editors/viewers must not be able to create, revoke, rotate, change password, change expiry, or republish in V1.

## Public API Contract

Future API or route-handler paths must be token/session scoped, not database-id scoped. They may include:

```txt
POST /api/share/[token]/password
POST /api/share/[token]/events
```

or server actions under the receiver route. Either way, public-facing handlers must:

- validate token hash;
- validate status and expiry;
- validate password session when required;
- validate operation permission;
- check rate limits before expensive work;
- use no-store response headers;
- never return private collaboration state;
- never expose database publication ids as public route identifiers;
- never return raw token, token hash, password hash, member emails, collaborator roles, internal audit metadata, or raw ids not needed by the receiver.

## Required Response Headers

Receiver HTML:

```txt
Cache-Control: no-store
Referrer-Policy: no-referrer
X-Robots-Tag: noindex, nofollow
```

Password/API responses:

```txt
Cache-Control: no-store
Referrer-Policy: no-referrer
```

If Next metadata is used, receiver pages must also declare `robots: { index: false, follow: false }`.

## Password Session Contract

- Password submission is server-validated.
- Browser-only password verification is forbidden.
- Successful password validation creates a short-lived, HTTP-only, SameSite=Lax receiver session cookie scoped as narrowly as feasible.
- Password POST requires CSRF protection or a framework-native same-origin server-action boundary.
- Wrong passwords return generic copy and never expose project or publication existence.
- Lockout/rate-limit state must not tell an attacker whether the token exists.

## Publication Scope Contract

V1 stores `scope = 'project'` and selected estimate ids inside snapshot metadata or a normalized child table.

Future scopes:

| Scope | Meaning | V1 status |
| --- | --- | --- |
| `project` | Project package with selected estimate sheets | Active V1 |
| `estimate` | One estimate sheet link | Deferred |
| `artifact` | Future issued PDF/XLSX/snapshot artifact | Deferred |

Do not add separate estimate-only links in V1 unless `00-v1-decision-record.md` changes.

## Preview Contract For Managers

Managers need a safe preview:

- Published links can open the real `/share/[token]` route in a new tab.
- Draft/unpublished settings should use an authenticated preview resolver, not a public token.
- Preview UI must clearly indicate whether it is live published snapshot or draft preview.
- Preview opens must not increment receiver open counts unless explicitly marked as manager preview events.

## Receiver Payload Contract

Receiver routes render a safe view model, not raw database rows.

Minimum payload:

- publication title;
- project name and project code if whitelisted;
- client name and location only if whitelisted;
- published timestamp;
- selected estimate summaries;
- selected grouped totals;
- selected line items if detail permission allows;
- published notes/inclusions/exclusions when implemented.

Fields excluded by default:

- workspace ids;
- member ids and emails;
- collaborator roles;
- Teamspaces invitation state;
- realtime channel names;
- internal audit metadata;
- raw project metadata;
- raw estimate node ids;
- raw row source snapshots;
- private attachment paths;
- Supabase storage paths unless converted to explicitly published media URLs.

See `09-receiver-view-model-and-field-whitelist.md` for exact DTOs.

## Download Contract

Downloads are disabled in V1.

If future downloads are enabled:

- add explicit `canDownload` permission;
- route through a publication-aware export resolver;
- emit `download` events separate from `open`;
- enforce no-store or immutable artifact cache strategy;
- never reuse the private authenticated proposal export route as public access control.
