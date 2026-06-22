# 15 Supabase Project Naming Plan

This file adds an optional provider-metadata cleanup to the reset plan pack.
It does not authorize any provider mutation.

## Naming Reality

The current live audit found:

- project display name: `Archestimator`;
- project ref/id: `ebxxqidacheyapmmzavr`.

The display name can be normalized to `archestimator` if the owner wants
lowercase naming in the Supabase dashboard and Management API responses.

The project ref `ebxxqidacheyapmmzavr` remains the stable project identifier.
Do not plan on changing it in place. It is used by:

- Supabase project URLs;
- CLI project linking;
- Management API path parameters;
- local `supabase/.temp/project-ref`;
- all project-boundary checks in this plan pack.

## Recommended Plan

Recommended action:

- keep the existing project;
- rename only the display name from `Archestimator` to `archestimator` if the owner explicitly wants the lowercase dashboard/API label;
- continue using `ebxxqidacheyapmmzavr` for every safety gate, script, evidence file, and project-boundary check.

Do not replace `ebxxqidacheyapmmzavr` with `archestimator` in code, env vars,
CLI flags, backup metadata, Supabase URLs, or plan-pack project-boundary checks.

## Official-Source Basis

Current Supabase docs and API metadata support display-name changes:

- Supabase access-control docs list project management `Update (Name)` as a project-level permission.
- Supabase Management API OpenAPI metadata exposes `PATCH /v1/projects/{ref}` with a required `name` body field and `projects:write` scope.

The same API metadata treats `{ref}` as a 20-character lowercase project ref.
That is why this pack treats the ref as the immutable safety identifier.

## Execution Boundary

Provider display-name rename is lower risk than the destructive data reset, but
it is still an external provider mutation. It requires explicit owner instruction
before execution.

Allowed after explicit naming instruction:

- verify current project ref is `ebxxqidacheyapmmzavr`;
- verify current display name;
- update the display name to `archestimator`;
- verify the project ref did not change;
- record sanitized evidence.

Not allowed as part of this naming add-on:

- creating a new Supabase project;
- deleting or transferring the existing project;
- changing database name, schemas, Auth users, data, Storage objects, RLS,
  functions, grants, secrets, API keys, custom domains, or billing add-ons;
- changing application environment variables from the ref URL to a guessed
  `archestimator` URL.

## Verification

Future verification must prove:

- project ref before rename: `ebxxqidacheyapmmzavr`;
- display name before rename: current live value;
- display name after rename: `archestimator`;
- project ref after rename: still `ebxxqidacheyapmmzavr`;
- app/env/config references still use the correct project URL/ref;
- no database/Auth/Storage counts changed because of the rename.

## If The Real Goal Is A Better URL

Changing the display name does not make the default Supabase URL pretty.
If the concern is the visible API/Auth URL, use a separate custom-domain or
vanity-subdomain plan.

Custom-domain/vanity-subdomain work has different risk:

- it can affect Auth callback URLs and OAuth provider configuration;
- it may require a paid plan or add-on;
- it needs DNS proof and rollback planning;
- it should not be bundled into the destructive data reset unless the owner
  explicitly approves that broader provider-surface change.

## Score Impact

Adding this naming add-on does not reduce the reset plan's readiness score
because it is isolated from destructive database/Storage scope and has its own
verification boundary.
