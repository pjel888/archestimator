# Data Classification and Handling Standard

## Classification Levels

### Public

Information intentionally published without authentication.

Examples:

- marketing pages;
- public documentation;
- intentionally public estimate-share content, limited to customer-authorized fields.

### Internal

Operational information not intended for public release.

Examples:

- internal feature flags;
- non-sensitive operational plans;
- system health records without personal identifiers.

### Confidential

Personal information and customer business data requiring access control.

Examples:

- names and business emails;
- memberships;
- project contacts;
- comments;
- proposal metadata;
- IP-derived security signals;
- support conversations.

### Restricted

Sensitive personal information, privileged information, authentication secrets, security credentials, or data whose disclosure could create severe harm.

Examples:

- government identifiers;
- health or legal records inside uploads;
- authentication tokens;
- session secrets;
- password material;
- legal privileged documents;
- encryption keys;
- customer files specifically classified as restricted.

## Handling Rules

| Control | Public | Internal | Confidential | Restricted |
|---|---:|---:|---:|---:|
| Authentication | Optional | Required internally | Required | Strong authentication |
| Least privilege | Basic | Required | Required | Strict and reviewed |
| Encryption in transit | Required | Required | Required | Required |
| Encryption at rest | Recommended | Required | Required | Required with key governance |
| Logging of access | Optional | Recommended | Required for privileged access | Required |
| Public URL exposure | Allowed | Prohibited | Only explicit share workflow | Prohibited |
| Production copy to local | Allowed | Limited | Prohibited without approval | Prohibited |
| Retention schedule | Required | Required | Required | Required |
| Secure deletion | Standard | Required | Required | Verified |

## Upload Controls

Uploads must:

- display a warning not to upload unnecessary sensitive or privileged data;
- enforce file-size and type controls;
- scan for malware where technically feasible;
- isolate storage;
- use short-lived signed access;
- record uploader, workspace, purpose, and retention;
- prevent public indexing;
- support deletion and legal hold;
- avoid filename leakage in public URLs.

## Logging Rule

Never log:

- access tokens;
- magic-link tokens;
- passwords;
- session cookies;
- full authorization headers;
- encryption keys;
- full uploaded file contents;
- highly sensitive request payloads.

Personal identifiers in logs must be minimized, hashed, tokenized, or omitted unless strictly necessary.
