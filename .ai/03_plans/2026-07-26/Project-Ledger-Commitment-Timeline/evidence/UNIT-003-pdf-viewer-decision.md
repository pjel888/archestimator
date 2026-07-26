# UNIT-003 PDF Viewer Decision

## Decision

Use the browser-native PDF viewer for the first Project Ledger artifact experience.

## Evidence

- Internal and portal viewers use the same private, authorization-gated content routes.
- Single byte ranges are capped at 8 MiB and return `206` or `416`; range reads fail closed when the storage provider cannot perform a bounded read.
- Responses are `private, no-store`, use `nosniff`, and preserve inline versus attachment disposition.
- Issued portal files must match the immutable issue snapshot for artifact id, version id, file name, MIME type, size, and SHA-256 before bytes are served.
- The native viewer adds no client bundle, worker, canvas renderer, font payload, or PDF parsing dependency.

## Rejected Alternative

PDF.js is not justified for this unit because annotation, text-layer search customization, page thumbnails, and programmatic page rendering are not required by the accepted scope. Adding it would increase bundle/runtime cost and create another security-sensitive parser without improving the current acceptance path.

## Revisit Trigger

Re-evaluate PDF.js only when a committed requirement needs in-app annotations, controlled page rendering, custom search, or cross-browser behavior that the native viewer cannot satisfy.
