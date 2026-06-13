import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const repo = process.cwd();

export function read(path: string): string {
  return readFileSync(join(repo, path), "utf8");
}

export function listDirectory(path: string): string[] {
  return readdirSync(join(repo, path));
}

export const migrations = readdirSync(join(repo, "supabase/migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort();

export const migrationText = migrations
  .map((file) => `-- ${file}\n${read(`supabase/migrations/${file}`)}`)
  .join("\n");

export function latestFunction(functionName: string): string {
  const functionPattern = new RegExp(
    `create or replace function public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`,
    "g",
  );
  const matches = migrationText.match(functionPattern) ?? [];
  return matches.at(-1) ?? "";
}

export function latestMigrationBySuffix(suffix: string): string {
  const file = migrations.filter((migration) => migration.endsWith(suffix)).at(-1);
  return file ? read(`supabase/migrations/${file}`) : "";
}
