#!/usr/bin/env bun

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

type QueryOperation = "select" | "insert" | "update" | "upsert" | "delete" | "rpc" | "query";

type QueryReference = {
  filePath: string;
  line: number;
  bucket: string;
  kind: "table" | "rpc";
  name: string;
  operation: QueryOperation;
  selectedColumnCount: number | null;
  payloadShape: "explicit-columns" | "wildcard" | "mutation-payload" | "rpc" | "unknown";
  selectPreview: string | null;
};

type BucketSummary = {
  bucket: string;
  referenceCount: number;
  tables: string[];
  rpcs: string[];
  operations: Record<string, number>;
  explicitSelects: number;
  wildcardSelects: number;
  mutationPayloads: number;
  unknownPayloads: number;
  maxSelectedColumnCount: number | null;
  files: string[];
};

type InventoryReport = {
  generatedAt: string;
  mode: "repo-static-per-route-query-inventory";
  note: string;
  scannedRoots: string[];
  bucketSummaries: BucketSummary[];
  references: QueryReference[];
};

const DEFAULT_ROOTS = ["src/app", "src/lib/repositories", "src/lib/publication", "src/lib/collaboration", "src/lib/ai"];

const BUCKET_RULES: Array<{ bucket: string; patterns: RegExp[] }> = [
  { bucket: "public-share-publication", patterns: [/src\/app\/api\/share\//, /src\/app\/share\//, /src\/lib\/publication\//] },
  { bucket: "workshop-projects-estimates", patterns: [/src\/app\/workshop\/projects/, /workspace-repository\.ts$/, /estimate-repository\.ts$/] },
  { bucket: "component-library", patterns: [/component-library/, /cost-library-repository\.ts$/] },
  { bucket: "project-charts", patterns: [/project-charts/] },
  { bucket: "ai-ask-package-builder", patterns: [/src\/app\/api\/ai\//, /src\/lib\/ai\//] },
  { bucket: "collaboration-invite", patterns: [/src\/app\/invite\//, /src\/lib\/collaboration\//] },
  { bucket: "media-upload-api", patterns: [/src\/app\/api\/(projects|component-library)\/(images|attachments)/] },
  { bucket: "auth-account", patterns: [/src\/app\/auth\//, /src\/lib\/auth\//] },
];

function exists(path: string) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function walkFiles(root: string): string[] {
  if (!exists(root)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = `${root}/${entry}`;
    const stats = statSync(path);
    if (stats.isDirectory()) files.push(...walkFiles(path));
    else if ([".ts", ".tsx"].includes(extname(path))) files.push(path);
  }
  return files.sort();
}

export function classifyRouteBucket(filePath: string) {
  const normalized = filePath.replaceAll("\\", "/");
  return BUCKET_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(normalized)))?.bucket ?? "other-server-data";
}

function lineNumberForIndex(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

function firstOperation(window: string, kind: "table" | "rpc"): QueryOperation {
  if (kind === "rpc") return "rpc";
  if (/\.select\s*\(/.test(window)) return "select";
  if (/\.insert\s*\(/.test(window)) return "insert";
  if (/\.update\s*\(/.test(window)) return "update";
  if (/\.upsert\s*\(/.test(window)) return "upsert";
  if (/\.delete\s*\(/.test(window)) return "delete";
  return "query";
}

function splitTopLevelColumns(value: string) {
  const columns: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      if (current.trim()) columns.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) columns.push(current.trim());
  return columns;
}

export function summarizeSelectPayload(selectValue: string | null, operation: QueryOperation, kind: "table" | "rpc") {
  if (kind === "rpc") return { selectedColumnCount: null, payloadShape: "rpc" as const, selectPreview: null };
  if (["insert", "update", "upsert", "delete"].includes(operation)) {
    return { selectedColumnCount: null, payloadShape: "mutation-payload" as const, selectPreview: null };
  }
  if (!selectValue) return { selectedColumnCount: null, payloadShape: "unknown" as const, selectPreview: null };
  const normalized = selectValue.replace(/\s+/g, " ").trim();
  if (normalized === "*") return { selectedColumnCount: null, payloadShape: "wildcard" as const, selectPreview: normalized };
  return {
    selectedColumnCount: splitTopLevelColumns(normalized).length,
    payloadShape: "explicit-columns" as const,
    selectPreview: normalized.length > 160 ? `${normalized.slice(0, 157)}…` : normalized,
  };
}

export function extractQueryReferencesFromSource(filePath: string, source: string): QueryReference[] {
  const references: QueryReference[] = [];
  const seen = new Set<string>();
  const bucket = classifyRouteBucket(filePath);
  const regex = /\.(from|rpc)\(\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    const [, method, name] = match;
    const kind = method === "rpc" ? "rpc" : "table";
    const window = source.slice(match.index, Math.min(source.length, match.index + 1200));
    const operation = firstOperation(window, kind);
    const selectMatch = window.match(/\.select\(\s*([`"'])([\s\S]*?)\1\s*(?=,|\))/);
    const payload = summarizeSelectPayload(selectMatch?.[2] ?? null, operation, kind);
    const line = lineNumberForIndex(source, match.index);
    const key = `${filePath}:${line}:${kind}:${name}:${operation}:${payload.selectPreview ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    references.push({ filePath, line, bucket, kind, name, operation, ...payload });
  }
  return references;
}

function extractQueryReferences(roots = DEFAULT_ROOTS): QueryReference[] {
  return roots
    .flatMap((root) => walkFiles(root))
    .flatMap((filePath) => extractQueryReferencesFromSource(filePath, readFileSync(filePath, "utf8")))
    .sort((a, b) => a.bucket.localeCompare(b.bucket) || a.filePath.localeCompare(b.filePath) || a.line - b.line);
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

export function summarizeBuckets(references: QueryReference[]): BucketSummary[] {
  const byBucket = new Map<string, QueryReference[]>();
  for (const reference of references) {
    const list = byBucket.get(reference.bucket) ?? [];
    list.push(reference);
    byBucket.set(reference.bucket, list);
  }
  return Array.from(byBucket.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, refs]) => {
      const operations: Record<string, number> = {};
      for (const reference of refs) increment(operations, reference.operation);
      const selectedCounts = refs.flatMap((reference) => (reference.selectedColumnCount === null ? [] : [reference.selectedColumnCount]));
      return {
        bucket,
        referenceCount: refs.length,
        tables: Array.from(new Set(refs.filter((reference) => reference.kind === "table").map((reference) => reference.name))).sort(),
        rpcs: Array.from(new Set(refs.filter((reference) => reference.kind === "rpc").map((reference) => reference.name))).sort(),
        operations,
        explicitSelects: refs.filter((reference) => reference.payloadShape === "explicit-columns").length,
        wildcardSelects: refs.filter((reference) => reference.payloadShape === "wildcard").length,
        mutationPayloads: refs.filter((reference) => reference.payloadShape === "mutation-payload").length,
        unknownPayloads: refs.filter((reference) => reference.payloadShape === "unknown").length,
        maxSelectedColumnCount: selectedCounts.length ? Math.max(...selectedCounts) : null,
        files: Array.from(new Set(refs.map((reference) => reference.filePath))).sort(),
      };
    });
}

export function buildInventoryReport(roots = DEFAULT_ROOTS): InventoryReport {
  const references = extractQueryReferences(roots);
  if (!references.length) throw new Error("No database table/RPC references found for query inventory.");
  return {
    generatedAt: new Date().toISOString(),
    mode: "repo-static-per-route-query-inventory",
    note: "Repo-static inventory only. Counts database table/RPC client references and selected-column payload shape by route bucket; does not prove live row counts, payload bytes, authorization cost, EXPLAIN plans, or provider latency.",
    scannedRoots: roots,
    bucketSummaries: summarizeBuckets(references),
    references,
  };
}

function renderMarkdown(report: InventoryReport) {
  const bucketRows = report.bucketSummaries
    .map(
      (bucket) =>
        `| ${bucket.bucket} | ${bucket.referenceCount} | ${bucket.tables.length} | ${bucket.rpcs.length} | ${bucket.explicitSelects} | ${bucket.wildcardSelects} | ${bucket.mutationPayloads} | ${bucket.maxSelectedColumnCount ?? "n/a"} | ${bucket.files.map((file) => `\`${file}\``).join("<br>")} |`,
    )
    .join("\n");
  const detailRows = report.references
    .map(
      (reference) =>
        `| ${reference.bucket} | \`${reference.filePath}:${reference.line}\` | ${reference.kind} | \`${reference.name}\` | ${reference.operation} | ${reference.payloadShape} | ${reference.selectedColumnCount ?? "n/a"} | ${reference.selectPreview ? `\`${reference.selectPreview.replaceAll("|", "\\|")}\`` : ""} |`,
    )
    .join("\n");
  return `# Per-route query inventory — ${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(report.generatedAt))}

Status: **REPO-STATIC QUERY INVENTORY CAPTURED / LIVE PROVIDER PROOF OPEN**.

${report.note}

Scanned roots: ${report.scannedRoots.map((root) => `\`${root}\``).join(", ")}.

## Bucket summary

| Bucket | Query refs | Tables | RPCs | Explicit selects | Wildcard selects | Mutations | Max selected columns | Files |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${bucketRows}

## Query reference detail

| Bucket | Source | Kind | Table/RPC | Operation | Payload shape | Selected columns | Select preview |
| --- | --- | --- | --- | --- | --- | ---: | --- |
${detailRows}

## Interpretation

- This is the per-route static inventory required before query consolidation or index proposals.
- Payload size is represented as selected-column shape/count from source, not live bytes.
- Live database EXPLAIN, provider metrics, authorization cost, row counts, and hosted route timing remain open gates.
- Do not create database migrations or RPC rewrites from this artifact alone.
`;
}

function main() {
  const report = buildInventoryReport();
  const outputFile = process.env.OUTPUT_FILE;
  const markdownFile = process.env.MARKDOWN_FILE;
  if (outputFile) {
    const outputPath = resolve(outputFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Wrote query inventory JSON: ${relative(process.cwd(), outputPath)}`);
  }
  if (markdownFile) {
    const outputPath = resolve(markdownFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, renderMarkdown(report));
    console.log(`Wrote query inventory markdown: ${relative(process.cwd(), outputPath)}`);
  }
  if (!outputFile && !markdownFile) {
    console.log(JSON.stringify({ generatedAt: report.generatedAt, buckets: report.bucketSummaries.length, references: report.references.length }, null, 2));
  }
}

if (import.meta.main) main();
