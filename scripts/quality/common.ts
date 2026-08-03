import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type QualityStatus = "PASS" | "FAIL" | "QUALITY_BLOCKED";

export interface QualityFinding {
  code: string;
  message: string;
  path?: string;
  detail?: unknown;
}

export interface QualityResult<T = Record<string, unknown>> {
  schema_version: 1;
  kind: string;
  status: QualityStatus;
  generated_at: string;
  summary: string;
  findings: QualityFinding[];
  data: T;
}

export function makeResult<T>(
  kind: string,
  findings: QualityFinding[],
  data: T,
  summary: string,
  status: QualityStatus = findings.length === 0 ? "PASS" : "FAIL",
): QualityResult<T> {
  return {
    schema_version: 1,
    kind,
    status,
    generated_at: new Date().toISOString(),
    summary,
    findings,
    data,
  };
}

export async function readJson<T>(path: string): Promise<T> {
  const text = await readFile(path, "utf8");
  return JSON.parse(text) as T;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function sha256(text: string | Buffer): string {
  return createHash("sha256").update(text).digest("hex");
}

export function gitArgsWithoutReplacementObjects(args: readonly string[]): string[] {
  return ["--no-replace-objects", ...args];
}

export function parseArgs(argv = process.argv.slice(2)): {
  positionals: string[];
  flags: Map<string, string | boolean>;
} {
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const [rawName, inlineValue] = token.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      flags.set(rawName, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(rawName, next);
      index += 1;
    } else {
      flags.set(rawName, true);
    }
  }
  return { positionals, flags };
}

export function flagString(
  flags: Map<string, string | boolean>,
  name: string,
  fallback?: string,
): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : fallback;
}

export function qualityRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

export async function finishCli(
  result: QualityResult,
  outputPath?: string,
): Promise<never> {
  if (outputPath) await writeJson(outputPath, result);
  process.stdout.write(`${JSON.stringify(result)}\n${result.summary}\n`);
  process.exit(result.status === "PASS" ? 0 : 1);
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
