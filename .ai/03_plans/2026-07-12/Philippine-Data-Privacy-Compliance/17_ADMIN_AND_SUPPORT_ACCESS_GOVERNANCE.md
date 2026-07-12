# Admin and Support Access Governance

## Principle

The `/admin` route is the founder’s operational homebase and therefore one of the highest privacy risks in the product.

## Required Controls

### Authentication

- separate admin authorization;
- MFA;
- session freshness;
- device and location anomaly detection where practical;
- no development bypass in production;
- emergency access procedure.

### Authorization

- capability-based permissions;
- tenant-scoped queries by default;
- no universal data view unless required;
- destructive actions separated from read access;
- privacy and incident roles separated where possible.

### Support access

Every access to customer data for support must record:

- operator;
- customer and workspace;
- ticket or reason;
- scope;
- start and end;
- fields accessed;
- actions taken;
- approval where required;
- customer notification where promised.

### Impersonation

Prefer scoped support views over impersonation. If impersonation exists:

- explicit banner;
- reauthentication;
- reason;
- time limit;
- no hidden action;
- full audit trail;
- restricted high-risk actions;
- customer-visible audit where appropriate.

### Sensitive operations

Require confirmation and reauthentication for:

- user deletion;
- workspace transfer;
- export;
- privacy request completion;
- legal hold;
- token revocation;
- share revocation;
- bulk deletion;
- processor deletion;
- incident notification.

## Periodic Review

Monthly during beta:

- list admin users;
- list privileged capabilities;
- review recent support access;
- review anomalous queries;
- remove unused credentials;
- verify MFA;
- confirm no exposed development tools.
