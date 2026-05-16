# Archestimator MVP npm package landscape — Next.js + Bun candidate stack

Date researched: 2026-05-16
Scope: packages/repos useful for a contractor estimating MVP: spreadsheet/grid editors, tables, forms, validation, DB/ORM, PDF/Excel export, drag/drop, charts, AI SDK, file/PDF parsing. This is research only; it does **not** finalize the tech stack.

## Selection lens for Archestimator

Archestimator likely needs: fast estimate/BOQ line-item editing, formulas/totals, imports from supplier spreadsheets/PDFs, client-ready proposal export, revision history, and later AI-assisted takeoff/scope extraction. Prioritize libraries that are actively maintained, TypeScript-friendly, React/Next compatible, SSR-safe or easy to load client-only, commercially safe, and testable under Bun/Node.

## Spreadsheet / grid editors

- **Glide Data Grid** — npm: https://www.npmjs.com/package/@glideapps/glide-data-grid — GitHub: https://github.com/glideapps/glide-data-grid — latest checked: 6.0.3.
  - Why relevant: high-performance canvas grid for large editable BOQs/estimate line items, copy/paste, custom cells, good fit for spreadsheet-like estimating without full Excel clone.
  - Cautions: canvas UI can complicate accessibility, automated testing, printing, and bespoke cell interactions; likely client-only in Next.js.

- **AG Grid Community / React** — npm: https://www.npmjs.com/package/ag-grid-community and https://www.npmjs.com/package/ag-grid-react — GitHub: https://github.com/ag-grid/ag-grid — latest checked: 35.3.0.
  - Why relevant: mature data grid with sorting/filtering/grouping/pinning/tree data; strong fit for estimates grouped by trade, phase, area, cost code.
  - Cautions: many advanced features are Enterprise-only; verify license/features before building MVP-critical workflows. Bundle size and configuration complexity can be high.

- **Handsontable** — npm: https://www.npmjs.com/package/handsontable — GitHub: https://github.com/handsontable/handsontable — latest checked: 17.0.1.
  - Why relevant: spreadsheet-like editing, copy/paste, formulas ecosystem, familiar for users who live in Excel.
  - Cautions: commercial licensing for many use cases; do license review early. React/Next integration may require client-only boundaries.

- **React Data Grid (Comcast)** — npm: https://www.npmjs.com/package/react-data-grid — GitHub: https://github.com/Comcast/react-data-grid — latest checked: 7.0.0-beta.59.
  - Why relevant: MIT React grid with editing and good ergonomics for line-item tables.
  - Cautions: still beta-tagged; confirm stability, React version support, and API churn risk.

- **ReactGrid** — npm: https://www.npmjs.com/package/@silevis/reactgrid — GitHub: https://github.com/silevis/reactgrid — latest checked: 4.1.17.
  - Why relevant: spreadsheet-like React component; useful for estimate worksheets and quick cell editing.
  - Cautions: smaller ecosystem than AG Grid/Handsontable; check performance with real BOQ sizes.

- **FortuneSheet** — npm: https://www.npmjs.com/package/@fortune-sheet/react — GitHub: https://github.com/ruilisi/fortune-sheet — latest checked: 1.0.4.
  - Why relevant: closer to an Excel/Google Sheets clone; could help if formulas/sheets are central.
  - Cautions: heavier UI model; check maintenance health, localization, import/export quality, and SSR compatibility.

- **Jspreadsheet CE** — npm: https://www.npmjs.com/package/jspreadsheet-ce — GitHub: https://github.com/jspreadsheet/ce — latest checked: 5.0.4.
  - Why relevant: lightweight spreadsheet-like widget with Excel copy/paste behavior.
  - Cautions: community edition feature limits vs paid versions; React integration quality should be verified.

## Tables / non-spreadsheet data displays

- **TanStack Table** — npm: https://www.npmjs.com/package/@tanstack/react-table — GitHub: https://github.com/TanStack/table — latest checked: 8.21.3.
  - Why relevant: headless, highly composable tables for estimate lists, revisions, clients, materials, templates; pairs well with shadcn/Radix/custom UI.
  - Cautions: not a spreadsheet/editor out of the box; you build pagination, virtualization, row editing, keyboard UX.

- **Material React Table** — npm: https://www.npmjs.com/package/material-react-table — GitHub: https://github.com/KevinVandy/material-react-table — latest checked: 3.2.1.
  - Why relevant: batteries-included TanStack Table implementation if using MUI.
  - Cautions: pulls app toward Material UI; less aligned if choosing Tailwind/shadcn.

- **Mantine React Table** — npm: https://www.npmjs.com/package/mantine-react-table — GitHub: https://github.com/KevinVandy/mantine-react-table — latest checked: 1.3.4.
  - Why relevant: batteries-included TanStack Table for Mantine-based admin screens.
  - Cautions: package appears less recently updated than core TanStack; commits/releases should be checked before adopting.

- **ka-table** — npm: https://www.npmjs.com/package/ka-table — GitHub: https://github.com/komarovalexander/ka-table — latest checked: 12.0.3.
  - Why relevant: lightweight React table with editing/grouping capabilities.
  - Cautions: smaller community; validate docs and edge cases.

## Forms and validation

- **React Hook Form** — npm: https://www.npmjs.com/package/react-hook-form — GitHub: https://github.com/react-hook-form/react-hook-form — latest checked: 7.76.0.
  - Why relevant: performant forms for quote metadata, client details, proposal settings, onboarding; common with Next.js.
  - Cautions: dynamic nested estimate forms still need careful architecture; grid editing should not be forced into RHF if it becomes slow/awkward.

- **@hookform/resolvers** — npm: https://www.npmjs.com/package/@hookform/resolvers — GitHub: https://github.com/react-hook-form/resolvers — latest checked: 5.2.2.
  - Why relevant: connects RHF to Zod/Valibot/ArkType/Yup/Effect schemas.
  - Cautions: keep resolver and validator versions aligned.

- **Zod** — npm: https://www.npmjs.com/package/zod — GitHub: https://github.com/colinhacks/zod — latest checked: 4.4.3.
  - Why relevant: de facto TypeScript-first validation; useful for API contracts, estimate import validation, structured AI outputs.
  - Cautions: large/deep schemas can have runtime cost; Zod v4 migration details matter if examples target v3.

- **Valibot** — npm: https://www.npmjs.com/package/valibot — GitHub: https://github.com/open-circle/valibot — latest checked: 1.4.0.
  - Why relevant: modular, potentially smaller/faster alternative to Zod.
  - Cautions: smaller ecosystem; team familiarity may be lower.

- **ArkType** — npm: https://www.npmjs.com/package/arktype — GitHub: https://github.com/arktypeio/arktype — latest checked: 2.2.0.
  - Why relevant: concise TS-like runtime validation; useful for typed domain models.
  - Cautions: less conventional than Zod; check integrations and learning curve.

- **Yup** — npm: https://www.npmjs.com/package/yup — GitHub: https://github.com/jquense/yup — latest checked: 1.7.1.
  - Why relevant: mature validation library.
  - Cautions: weaker TypeScript-first story vs Zod/Valibot; probably an alternative rather than default for a new TS app.

## DB / ORM / auth-adjacent

- **Prisma** — npm: https://www.npmjs.com/package/prisma — GitHub: https://github.com/prisma/prisma — latest checked: 7.8.0.
  - Why relevant: productive schema/migrations/client; strong for relational data such as projects, estimates, revisions, line items, assemblies, clients.
  - Cautions: Bun/serverless/edge/runtime compatibility should be tested for the chosen deployment target; generated client and migrations add workflow constraints.

- **Drizzle ORM** — npm: https://www.npmjs.com/package/drizzle-orm — GitHub: https://github.com/drizzle-team/drizzle-orm — latest checked: 0.45.2.
  - Why relevant: TypeScript-first SQL, lightweight, strong with serverless Postgres/SQLite; good for explicit schemas and migrations.
  - Cautions: more SQL-oriented; fewer high-level ORM conveniences than Prisma.

- **Kysely** — npm: https://www.npmjs.com/package/kysely — GitHub: https://github.com/kysely-org/kysely — latest checked: 0.29.1.
  - Why relevant: excellent type-safe query builder when you want SQL control without full ORM.
  - Cautions: migrations/schema generation are separate choices; more plumbing.

- **postgres.js** — npm: https://www.npmjs.com/package/postgres — GitHub: https://github.com/porsager/postgres — latest checked: 3.4.9.
  - Why relevant: fast Postgres driver; often used under Drizzle/Kysely or direct SQL.
  - Cautions: direct SQL means building your own patterns for migrations/types.

- **Neon serverless driver** — npm: https://www.npmjs.com/package/@neondatabase/serverless — GitHub: https://github.com/neondatabase/serverless — latest checked: 1.1.0.
  - Why relevant: serverless Postgres option for Next deployments; fits low-ops MVP.
  - Cautions: vendor/runtime coupling; test transactions, pooling, and local dev.

- **Vercel Postgres / Blob** — npm: https://www.npmjs.com/package/@vercel/postgres and https://www.npmjs.com/package/@vercel/blob — GitHub: https://github.com/vercel/storage.
  - Why relevant: simple hosted DB/blob integration if deploying to Vercel; blob useful for imported PDFs, generated proposals, logos.
  - Cautions: deployment/vendor coupling; pricing and portability need review.

- **Better Auth** — npm: https://www.npmjs.com/package/better-auth — GitHub: https://github.com/better-auth/better-auth — latest checked: 1.6.11.
  - Why relevant: modern TS auth framework; useful if multi-user contractor teams are in MVP.
  - Cautions: auth is not the research focus; evaluate adapters, security maturity, and account/team model.

- **Auth.js / NextAuth** — npm: https://www.npmjs.com/package/next-auth — GitHub: https://github.com/nextauthjs/next-auth — latest checked: 4.24.14.
  - Why relevant: common Next.js authentication path.
  - Cautions: package/version naming around Auth.js vs next-auth can be confusing; verify current recommended install path for Next app router.

## PDF / Excel / document export

- **ExcelJS** — npm: https://www.npmjs.com/package/exceljs — GitHub: https://github.com/exceljs/exceljs — latest checked: 4.4.0.
  - Why relevant: generate styled .xlsx estimates/BOQs; read supplier sheets; more programmable formatting than CSV.
  - Cautions: release cadence slower; browser bundle may be heavy. Prefer server-side generation for large workbooks.

- **SheetJS xlsx** — npm: https://www.npmjs.com/package/xlsx — GitHub: https://github.com/SheetJS/sheetjs — latest checked: 0.18.5.
  - Why relevant: popular spreadsheet parse/write library, broad format handling.
  - Cautions: npm version appears old vs ecosystem; clarify CE/pro licensing, security/update expectations, and advanced formatting limits.

- **@react-pdf/renderer** — npm: https://www.npmjs.com/package/@react-pdf/renderer — GitHub: https://github.com/diegomura/react-pdf — latest checked: 4.5.1.
  - Why relevant: React component model for client-ready proposals/quotes; deterministic PDF templates.
  - Cautions: CSS subset differs from browser; complex layouts need testing. Font handling and pagination can be tricky.

- **Playwright** — npm: https://www.npmjs.com/package/playwright — GitHub: https://github.com/microsoft/playwright — latest checked: 1.60.0.
  - Why relevant: HTML-to-PDF via browser rendering, plus E2E testing. Good if proposals are first built as responsive HTML.
  - Cautions: browser binaries, deployment size, serverless constraints; may need a dedicated rendering worker/service.

- **Puppeteer** — npm: https://www.npmjs.com/package/puppeteer — GitHub: https://github.com/puppeteer/puppeteer — latest checked: 25.0.2.
  - Why relevant: HTML-to-PDF generation from proposal pages.
  - Cautions: similar deployment/browser binary issues as Playwright; Playwright may be preferable if also used for tests.

- **jsPDF** — npm: https://www.npmjs.com/package/jspdf — GitHub: https://github.com/parallax/jsPDF — latest checked: 4.2.1.
  - Why relevant: direct PDF generation from JS for simple invoices/quotes.
  - Cautions: manual layout can become painful for polished multi-page proposals.

- **pdf-lib** — npm: https://www.npmjs.com/package/pdf-lib — GitHub: https://github.com/Hopding/pdf-lib — latest checked: 1.17.1.
  - Why relevant: fill/merge/stamp PDFs, attach terms, manipulate generated proposals.
  - Cautions: old release; not ideal for HTML layout or text extraction.

- **docx** — npm: https://www.npmjs.com/package/docx — GitHub: https://github.com/dolanmiu/docx — latest checked: 9.6.1.
  - Why relevant: optional Word proposal generation if contractors/clients need editable documents.
  - Cautions: adds template/export surface area; not needed unless DOCX is an MVP requirement.

## Drag/drop and interactions

- **dnd kit** — npm: https://www.npmjs.com/package/@dnd-kit/core and https://www.npmjs.com/package/@dnd-kit/sortable — GitHub: https://github.com/clauderic/dnd-kit — latest checked: core 6.3.1, sortable 10.0.0.
  - Why relevant: reorder quote sections, estimate groups, assemblies, inclusions/exclusions; accessible React DnD primitives.
  - Cautions: last npm publish dates are older; check React 19/Next compatibility and maintained forks/issues.

- **React DnD** — npm: https://www.npmjs.com/package/react-dnd — GitHub: https://github.com/react-dnd/react-dnd — latest checked: 16.0.1.
  - Why relevant: mature lower-level drag/drop for complex interactions.
  - Cautions: older release cadence and more boilerplate; may be overkill for sortable lists.

- **react-beautiful-dnd** — npm: https://www.npmjs.com/package/react-beautiful-dnd — GitHub: https://github.com/atlassian/react-beautiful-dnd — latest checked: 13.1.1.
  - Why relevant: historically popular list reordering.
  - Cautions: Atlassian project is archived/deprecated historically; avoid new adoption unless using a maintained fork such as @hello-pangea/dnd after separate evaluation.

- **Framer Motion / Motion** — npm: https://www.npmjs.com/package/framer-motion — GitHub: https://github.com/motiondivision/motion — latest checked: 12.38.0.
  - Why relevant: polished UI transitions for estimate rows, drawers, onboarding; can complement DnD.
  - Cautions: not a DnD solution by itself; watch bundle size and animation performance in grids.

## Charts / dashboards

- **Recharts** — npm: https://www.npmjs.com/package/recharts — GitHub: https://github.com/recharts/recharts — latest checked: 3.8.1.
  - Why relevant: quick React charts for cost breakdowns by trade, margin, revision deltas, cashflow snapshots.
  - Cautions: SVG charts can struggle with very large datasets; not for deep BI.

- **Apache ECharts React wrapper** — npm: https://www.npmjs.com/package/echarts-for-react — GitHub: https://github.com/hustcc/echarts-for-react — latest checked: 3.0.6.
  - Why relevant: powerful charts with large-data capabilities and rich interactions.
  - Cautions: wrapper plus echarts bundle can be large; SSR/client-only considerations.

- **react-chartjs-2** — npm: https://www.npmjs.com/package/react-chartjs-2 — GitHub: https://github.com/reactchartjs/react-chartjs-2 — latest checked: 5.3.1.
  - Why relevant: Chart.js ecosystem for common bar/pie/line charts.
  - Cautions: imperative Chart.js model under React; customize carefully.

- **Victory** — npm: https://www.npmjs.com/package/victory — GitHub: https://github.com/FormidableLabs/victory — latest checked: 37.3.6.
  - Why relevant: composable React-native-friendly charting alternative.
  - Cautions: less common in current Next dashboards than Recharts/ECharts.

- **Nivo packages** — npm umbrella checked `nivo` 0.31.0, repo: https://github.com/plouc/nivo.
  - Why relevant: beautiful dataviz components if choosing its individual `@nivo/*` packages.
  - Cautions: use individual maintained packages, not the old umbrella package; verify React/Next compatibility.

- **visx** — repo: https://github.com/airbnb/visx, npm packages under `@visx/*`.
  - Why relevant: low-level D3-powered primitives for custom estimate analytics.
  - Cautions: not a single `visx` npm package; more engineering effort than Recharts.

## AI SDK / LLM orchestration

- **Vercel AI SDK** — npm: https://www.npmjs.com/package/ai — GitHub: https://github.com/vercel/ai — latest checked: 6.0.184.
  - Why relevant: strong Next.js fit for AI chat/extraction flows, streaming UI, structured outputs, provider abstraction.
  - Cautions: APIs evolve quickly; pin versions and isolate provider code. AI extraction for construction docs needs validation/human review.

- **AI SDK providers** — npm: https://www.npmjs.com/package/@ai-sdk/openai and https://www.npmjs.com/package/@ai-sdk/anthropic — GitHub: https://github.com/vercel/ai — latest checked: OpenAI 3.0.64, Anthropic 3.0.78.
  - Why relevant: direct provider integrations for estimate/scope extraction, proposal drafting, normalization of messy supplier input.
  - Cautions: provider terms, data retention, privacy, and cost controls must be explicit; never auto-trust AI-generated costs.

- **LangChain JS** — npm: https://www.npmjs.com/package/langchain — GitHub: https://github.com/langchain-ai/langchainjs — latest checked: 1.4.0.
  - Why relevant: broader chains/tools/retrieval workflows if AI scope grows beyond simple extraction.
  - Cautions: more abstraction and dependency weight; likely unnecessary for first MVP unless RAG/tool orchestration is central.

- **LlamaIndex.TS** — npm: https://www.npmjs.com/package/llamaindex — GitHub: https://github.com/run-llama/LlamaIndexTS — latest checked: 0.12.1.
  - Why relevant: document/RAG framework for indexing specs, past estimates, supplier catalogs.
  - Cautions: adds complexity; TS ecosystem maturity should be evaluated against actual document workflow.

## File, CSV, Excel, PDF parsing / uploads

- **pdf-parse** — npm: https://www.npmjs.com/package/pdf-parse — GitHub: https://github.com/mehmet-kozan/pdf-parse — latest checked: 2.4.5.
  - Why relevant: extract text/images/tabular data from PDFs for scope docs, supplier quotes, previous estimates.
  - Cautions: PDF extraction quality varies widely; scanned PDFs require OCR; tables may need manual correction.

- **pdfjs-dist** — npm: https://www.npmjs.com/package/pdfjs-dist — GitHub: https://github.com/mozilla/pdf.js — latest checked: 5.7.284.
  - Why relevant: lower-level PDF rendering/parsing in browser or Node; useful for preview/highlight workflows.
  - Cautions: worker bundling with Next can be fiddly; direct text/table extraction is more work than wrappers.

- **Mammoth** — npm: https://www.npmjs.com/package/mammoth — GitHub: https://github.com/mwilliamson/mammoth.js — latest checked: 1.12.0.
  - Why relevant: convert DOCX specs/scope docs to HTML/Markdown for review or AI extraction.
  - Cautions: focuses on semantic content, not exact formatting; not for PDF-level rendering fidelity.

- **Papa Parse** — npm: https://www.npmjs.com/package/papaparse — GitHub: https://github.com/mholt/PapaParse — latest checked: 5.5.3.
  - Why relevant: browser CSV import/export with streaming/web workers; ideal for supplier price lists or legacy estimates.
  - Cautions: CSV typing/mapping/validation still must be built.

- **fast-csv** — npm: https://www.npmjs.com/package/fast-csv — GitHub: https://github.com/C2FO/fast-csv — latest checked: 5.0.7.
  - Why relevant: server-side CSV parsing/writing for imports/exports and background jobs.
  - Cautions: Node/server-side focus; browser use is not the main target.

- **Formidable** — npm: https://www.npmjs.com/package/formidable — GitHub: https://github.com/node-formidable/formidable — latest checked: 3.5.4.
  - Why relevant: parse multipart file uploads in Node route handlers if not using platform upload primitives.
  - Cautions: Next app router/serverless upload patterns may favor direct-to-blob storage instead.

- **UploadThing** — npm: https://www.npmjs.com/package/uploadthing — GitHub: https://github.com/pingdotgg/uploadthing — latest checked: 7.7.4.
  - Why relevant: quick file-upload UX for PDFs, spreadsheets, images, signed proposal attachments.
  - Cautions: third-party service dependency; pricing/data residency/vendor risk.

- **Tesseract.js** — npm: https://www.npmjs.com/package/tesseract.js — GitHub: https://github.com/naptha/tesseract.js — latest checked: 7.0.0.
  - Why relevant: OCR for scanned supplier quotes/spec pages/images.
  - Cautions: browser/node OCR is CPU-heavy and imperfect; for production document extraction, cloud OCR may be better.

- **Unstructured JS client** — npm: https://www.npmjs.com/package/unstructured-client — GitHub: https://github.com/Unstructured-IO/unstructured-js-client — latest checked: 0.31.0.
  - Why relevant: API client for document partitioning/extraction across PDFs, docs, HTML; useful before LLM processing.
  - Cautions: external service/API, cost/privacy; evaluate extraction quality on actual contractor documents.

## Practical shortlists to prototype, not decisions

- **Estimate grid prototypes:** Glide Data Grid, AG Grid Community, React Data Grid, Handsontable if spreadsheet fidelity/licensing is acceptable.
- **Admin/list tables:** TanStack Table directly, or Material/Mantine React Table only if that UI framework is selected.
- **Forms/contracts:** React Hook Form + a validator; compare Zod vs Valibot for ergonomics/perf.
- **DB access:** prototype Prisma and Drizzle against the target DB/deployment; use Kysely if SQL control is preferred.
- **Exports:** compare React-PDF vs Playwright HTML-to-PDF for proposal fidelity; use ExcelJS/SheetJS for workbook import/export tests.
- **Document ingestion:** combine Papa Parse/Excel parser/PDF parser with schema validation; reserve OCR/Unstructured/AI for messy inputs.
- **AI:** start with Vercel AI SDK for provider abstraction and structured extraction; avoid committing to LangChain/LlamaIndex unless retrieval workflows are proven necessary.

## Cross-cutting cautions

- Next.js SSR/client boundary: grids, PDF viewers, charts, drag/drop, and browser file parsers often need `dynamic(..., { ssr: false })` or client components.
- Bun compatibility: test install, build, and runtime for each candidate; many packages assume Node APIs, native browser binaries, or postinstall scripts.
- Licensing: spreadsheet/grid packages are the highest license risk, especially Handsontable, AG Grid Enterprise features, Jspreadsheet paid tiers, and SheetJS CE/pro differences.
- Construction estimates need auditability: every import, AI extraction, formula, markup, and revision should be traceable and user-reviewable.
- Large estimate performance should be tested with realistic datasets: thousands of line items, grouped sections, copy/paste, formulas, undo/redo, and PDF/XLSX export.
