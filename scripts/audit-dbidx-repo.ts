#!/usr/bin/env bun

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

type QueryReference = {
  filePath: string;
  line: number;
  kind: "table" | "rpc";
  name: string;
  operation: string;
};

type IndexReference = {
  filePath: string;
  line: number;
  statement: string;
};

const DEFAULT_OUTPUT_FILE =
  ".ai/09_archive/store/2026-06-02-CODEX-P0-DBIDX-001/repo-only-query-index-audit.md";

const QUERY_ROOTS = [
  "src/lib/repositories",
  "src/lib/publication",
  "src/lib/collaboration",
  "src/lib/ai",
  "src/app/api",
  "src/app/share",
  "src/app/invite",
];

function readEnv(name: string) {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function walkFiles(root: string, extensions: ReadonlySet<string>) {
  const files: string[] = [];
  if (!exists(root)) return files;

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...walkFiles(path, extensions));
      continue;
    }
    if (extensions.has(path.slice(path.lastIndexOf(".")))) files.push(path);
  }

  return files.sort();
}

function exists(path: string) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function extractOperation(line: string) {
  if (line.includes(".select(")) return "select";
  if (line.includes(".insert(")) return "insert";
  if (line.includes(".update(")) return "update";
  if (line.includes(".upsert(")) return "upsert";
  if (line.includes(".delete(")) return "delete";
  if (line.includes(".rpc(")) return "rpc";
  return "query";
}

function extractQueryReferences() {
  const references: QueryReference[] = [];
  const seen = new Set<string>();

  for (const filePath of QUERY_ROOTS.flatMap((root) => walkFiles(root, new Set([".ts", ".tsx"])))) {
    const lines = readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      const tableMatch = line.match(/\.from\(["']([^"']+)["']\)/);
      const rpcMatch = line.match(/\.rpc\(["']([^"']+)["']/);
      const match = tableMatch ?? rpcMatch;
      if (!match) return;

      const kind = tableMatch ? "table" : "rpc";
      const name = match[1];
      const operation = kind === "rpc" ? "rpc" : extractOperation(line);
      const key = `${filePath}:${index + 1}:${kind}:${name}:${operation}`;
      if (seen.has(key)) return;
      seen.add(key);
      references.push({ filePath, line: index + 1, kind, name, operation });
    });
  }

  return references;
}

function extractIndexReferences() {
  const references: IndexReference[] = [];

  for (const filePath of walkFiles("supabase/migrations", new Set([".sql"]))) {
    const lines = readFileSync(filePath, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (!/^\s*create\s+(unique\s+)?index\b/i.test(line)) return;
      const statementLines: string[] = [];
      for (let nextIndex = index; nextIndex < lines.length; nextIndex += 1) {
        const nextLine = lines[nextIndex].trim();
        if (nextLine.length > 0) statementLines.push(nextLine);
        if (nextLine.includes(";")) break;
      }
      const statement = statementLines.join(" ").replace(/\s+/g, " ").replace(/;.*/, ";");
      references.push({
        filePath,
        line: index + 1,
        statement,
      });
    });
  }

  return references;
}

function tableSummary(references: QueryReference[]) {
  const byName = new Map<string, { operations: Set<string>; files: Set<string> }>();

  references.forEach((reference) => {
    const key = `${reference.kind}:${reference.name}`;
    const current = byName.get(key) ?? { operations: new Set<string>(), files: new Set<string>() };
    current.operations.add(reference.operation);
    current.files.add(reference.filePath);
    byName.set(key, current);
  });

  return Array.from(byName.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      const [kind, name] = key.split(":");
      return `| ${kind} | \`${name}\` | ${Array.from(value.operations).sort().join(", ")} | ${Array.from(value.files)
        .sort()
        .map((filePath) => `\`${filePath}\``)
        .join("<br>")} |`;
    });
}

function renderMarkdown(params: { queryReferences: QueryReference[]; indexReferences: IndexReference[] }) {
  const generatedAt = new Date().toISOString();
  const queryRows = tableSummary(params.queryReferences);
  const indexRows = params.indexReferences.map(
    (reference) => `| \`${reference.filePath}:${reference.line}\` | \`${reference.statement.replaceAll("|", "\\|")}\` |`,
  );

  return `# CODEX-P0-DBIDX-001 Repo-Only Query/Index Audit

**Generated:** ${generatedAt}
**Scope:** Repo-only local audit. No Supabase connection, no live metrics, no DDL, no migration apply.
**Command:** \`bun run dbidx:audit-repo\`

## Output 1: repo-derived query map

The scanner inspected these source roots: ${QUERY_ROOTS.map((root) => `\`${root}\``).join(", ")}.

| Kind | Name | Operations Seen | Source Files |
| --- | --- | --- | --- |
${queryRows.join("\n")}

## Output 2: migration-derived index inventory

The scanner inspected \`supabase/migrations/*.sql\` and captured every \`CREATE INDEX\` / \`CREATE UNIQUE INDEX\` statement it found.

| Source | Statement |
| --- | --- |
${indexRows.join("\n")}

## Output 3: live metrics

Live Supabase metrics were not collected in this repo-only pass.

- Supabase advisor output: not collected.
- \`pg_stat_statements\` snapshot: not collected.
- Live unindexed-FK query results: not collected.
- Live schema parity: not collected.

## Output 4: live-metrics-unavailable note

Live metrics are unavailable for this local implementation slice because the user asked to skip external/provider/manual gates while provider configuration is pending. This artifact intentionally does not fabricate Supabase advisor findings, \`pg_stat_statements\`, live schema parity, live row counts, or EXPLAIN output.

## Follow-up

This completes the repo-only DBIDX-001 audit input. DBIDX-002/003 still require a linked/staging database or an owner-approved local staging database with representative seed data. Do not create candidate index migrations until parity and EXPLAIN evidence exist.
`;
}

function writeOutput(outputFile: string, markdown: string) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, markdown);
  return relative(process.cwd(), resolved);
}

function main() {
  const outputFile = readEnv("OUTPUT_FILE") ?? DEFAULT_OUTPUT_FILE;
  const queryReferences = extractQueryReferences();
  const indexReferences = extractIndexReferences();
  if (queryReferences.length === 0) throw new Error("No Supabase query references were found in local source roots.");
  if (indexReferences.length === 0) throw new Error("No CREATE INDEX statements were found in local migrations.");
  const writtenPath = writeOutput(outputFile, renderMarkdown({ queryReferences, indexReferences }));
  console.log(JSON.stringify({ outputFile: writtenPath, queryReferenceCount: queryReferences.length, indexReferenceCount: indexReferences.length }, null, 2));
}

if (import.meta.main) main();
