# 11 — White-Label Branding, Assets, and Custom Domains

## 1. MVP branding scope

White-labeling should make the portal feel intentionally prepared by the project team for the client.

### Included

- owner organization name;
- owner logo;
- client organization name;
- client logo;
- co-branding mode;
- approved accent color;
- neutral surface preference;
- cover image;
- sender contact;
- footer/contact/legal copy;
- branded invitation/reminder email;
- branded print/PDF;
- accessible alt text;
- optional “Powered by Archestimator” policy.

### Excluded from MVP

- arbitrary CSS;
- custom fonts uploaded per portal;
- arbitrary HTML;
- scripts/widgets;
- custom favicon;
- per-recipient theme;
- custom domain.

## 2. Brand profile hierarchy

```text
Archestimator safe defaults
  → workspace brand defaults
  → client brand profile
  → portal override
  → immutable issue brand snapshot
```

The owner sees the effective result before publishing.

Changing workspace branding does not mutate historic issue records.

## 3. Two-logo model

### Owner-led

Owner logo is primary. Client appears under “Prepared for.”

Best for proposals and professional service offers.

### Co-branded

Owner and client logos receive equal visual weight, separated by a neutral divider.

Best for collaborative cost-review workspaces.

### Client-led

Client logo is primary. Owner appears as “Prepared by.”

Best for owner/developer internal stakeholder review.

The client-led mode still cannot impersonate the client or hide the preparing organization where disclosure is required.

## 4. Brand tokens

Allow a constrained token set:

- accent;
- accent text;
- surface;
- muted surface;
- ink;
- secondary ink;
- border;
- proposal/print paper.

The system validates contrast and may substitute a safe text color.

Do not permit arbitrary element-level colors. The typed section renderer owns component styling.

## 5. Typography

MVP uses Archestimator's licensed/available portal fonts. Owners can select from an approved list if needed.

Custom font upload creates:

- licensing risk;
- rendering/performance variance;
- CSP/font delivery complexity;
- print mismatch.

Defer custom fonts until branding demand is proven.

## 6. Asset model

Each asset records:

- workspace owner;
- type;
- original filename;
- content type;
- dimensions;
- processed variants;
- content hash;
- storage key;
- alt text;
- created by/time;
- archived/replaced state;
- usage references;
- public-safe status.

### Asset classes

- `owner_logo`
- `client_logo`
- `portal_cover`
- `email_header`
- `client_visible_document` — later

## 7. Upload pipeline

Reuse the current project-image safeguards:

- authenticated owner/manager;
- authorization before final write;
- bounded request/body;
- MIME allowlist and magic-byte validation;
- image decoding limits;
- transformed WebP/PNG variants;
- thumbnails;
- R2 storage;
- D1 metadata;
- request logging and rate limits.

Create a dedicated brand-asset route and storage namespace.

Recommended MVP formats:

- PNG;
- JPEG;
- WebP;
- AVIF.

SVG should be rejected initially or passed through a robust sanitizer and rasterizer; raw SVG is an active-content risk.

## 8. Public delivery

Do not expose general authenticated project-image routes or raw R2 keys.

Options:

1. issue copies a processed logo to a content-addressed public-safe object;
2. token-scoped asset broker verifies portal/issue access;
3. immutable opaque asset URL that contains no tenant identifier and serves only approved issue assets.

For performance and print reliability, content-addressed immutable issue assets are preferred.

## 9. Brand management UX

Publisher Branding tab:

- upload/select owner logo;
- upload/select client logo;
- edit alt text;
- choose mode;
- choose accent;
- preview header;
- preview email;
- preview print;
- contrast check;
- reset to workspace default;
- usage warning before replacing/archive.

A client logo can be reused across portals through a client brand profile.

## 10. Email branding

Invitation/reminder emails include:

- owner logo/name;
- client/project/portal name;
- issue number;
- clear action;
- access/expiry note;
- sender contact;
- unsubscribe where applicable;
- Archestimator delivery attribution according to policy.

Email HTML and text versions must remain functional if images are blocked.

## 11. Print branding

- owner/client logos;
- issue identity;
- project and client;
- prepared by/for;
- page footer;
- total/currency;
- issue content hash or reference;
- decision record when present;
- no interactive-only styling.

## 12. Attribution policy

Recommended first-release rule:

- always include a discreet “Secured and delivered by Archestimator” or equivalent in the footer/access/security surfaces;
- allow reduced visual prominence in paid white-label tiers later;
- never remove necessary privacy, security, or service contact disclosures;
- do not misrepresent the owner/client as the software operator.

## 13. Custom domains — later phase

Custom domains are valuable, but they introduce an operational product:

- domain ownership proof;
- CNAME instructions;
- certificate validation and renewal;
- hostname validation;
- DNS status;
- fallback origin;
- anti-takeover controls;
- custom-hostname removal;
- canonical URL;
- cookie domain behavior;
- CSP and security headers;
- email link generation;
- support/rollback;
- plan/pricing.

Cloudflare for SaaS can provide custom hostnames and certificates, but the repository's current policy prohibits enabling paid add-ons without explicit approval. Verify current pricing and limits before implementation.

### Recommended custom-domain model

```text
portal.customer.com
  CNAME → customer target
  → Cloudflare custom hostname
  → Archestimator Worker fallback origin
  → hostname lookup
  → workspace/portal routing
```

### Required states

- pending DNS;
- pending certificate;
- active;
- validation failed;
- suspended;
- removing;
- removed.

Keep the standard Archestimator portal URL as a fallback whenever policy permits.

## 14. Domain security

- verify ownership before activation;
- never allow arbitrary Host header routing without active record;
- bind hostname to workspace;
- prevent reassignment while old DNS remains;
- reserve/tombstone removed domains;
- support secure cookie behavior;
- no cross-tenant cache;
- rate-limit validation;
- log lifecycle;
- remove certificate/route on deletion.

## 15. Branding acceptance criteria

- Owner can upload and select owner and client logos.
- Portal supports owner-led, co-branded, and client-led headers.
- Theme cannot create inaccessible contrast.
- Historic issues retain their branding.
- Invitation and print use the same issue brand snapshot.
- Raw R2 keys and private project-image paths are not exposed.
- A malformed asset cannot bypass MIME/decode validation.
- Custom domains remain visibly later-phase until operational and cost gates are approved.
