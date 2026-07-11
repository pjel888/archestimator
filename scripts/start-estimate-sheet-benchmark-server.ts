#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  cliBoolean,
  cliString,
  ensureContainedRunPath,
  nowIso,
  parseStrictCli,
  readJsonFile,
  sha256Hex,
  writeJsonNoOverwrite,
  assertRunManifest,
  type RunManifestV1,
} from "./lib/estimate-sheet-performance-contract";

const PHASES = new Set(["baseline-all-off", "mode-matrix", "final"]);
const FINAL_STATES = new Set(["off", "on", "all-activated"]);

export type BenchmarkServerDescriptor = {
  schema_version: "estimate-sheet-benchmark-server.v1";
  unit_id: string;
  run_id: string;
  phase: string;
  final_state: string;
  port: number | null;
  base_url: string | null;
  command: string[];
  launched: boolean;
  pid: number | null;
  build_hash: string | null;
  readiness: "NOT_STARTED" | "UNAVAILABLE" | "READY";
  generated_at: string;
};

export function resolveBenchmarkServerCommand(manifest: RunManifestV1, port: number, phase: string, finalState: string): string[] {
  if (!PHASES.has(phase)) throw new Error(`unsupported benchmark phase: ${phase}`);
  if (!FINAL_STATES.has(finalState)) throw new Error(`unsupported final state: ${finalState}`);
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) throw new Error("benchmark port must be between 1024 and 65535");
  const runtimeEnv = manifest.runtimeEnv;
  if (!runtimeEnv && manifest.evidence_class === "local-browser") throw new Error("local-browser benchmark requires run-scoped runtime.env");
  return ["bunx", "opennextjs-cloudflare", "preview", "--", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", resolve(manifest.run_root, "wrangler-state"), ...(runtimeEnv ? ["--env-file", runtimeEnv] : [])];
}

export function startEstimateSheetBenchmarkServer(input: {
  runManifest: string;
  port?: number | null;
  phase?: string;
  finalState?: string;
  launch?: boolean;
}): BenchmarkServerDescriptor {
  const manifest = readJsonFile<RunManifestV1>(resolve(input.runManifest));
  assertRunManifest(manifest);
  const phase = input.phase ?? "baseline-all-off";
  const finalState = input.finalState ?? (phase === "baseline-all-off" ? "off" : "on");
  if (input.port === null || manifest.evidence_class !== "local-browser") {
    const descriptor: BenchmarkServerDescriptor = { schema_version: "estimate-sheet-benchmark-server.v1", unit_id: manifest.unit_id, run_id: manifest.run_id, phase, final_state: finalState, port: null, base_url: null, command: [], launched: false, pid: null, build_hash: null, readiness: "UNAVAILABLE", generated_at: nowIso() };
    writeJsonNoOverwrite(resolve(manifest.run_root, "preview/server-descriptor.json"), descriptor, 0o600);
    return descriptor;
  }
  const port = input.port ?? 3101;
  const command = resolveBenchmarkServerCommand(manifest, port, phase, finalState);
  let launched = false;
  let pid: number | null = null;
  let readiness: BenchmarkServerDescriptor["readiness"] = "NOT_STARTED";
  if (input.launch) {
    const child = spawnSync(command[0], command.slice(1), { cwd: process.cwd(), env: { ...process.env }, shell: false, encoding: "utf8", timeout: 60_000, stdio: "ignore" });
    launched = child.status === 0 && !child.error;
    readiness = launched ? "READY" : "UNAVAILABLE";
    pid = null;
  }
  const descriptor: BenchmarkServerDescriptor = { schema_version: "estimate-sheet-benchmark-server.v1", unit_id: manifest.unit_id, run_id: manifest.run_id, phase, final_state: finalState, port, base_url: `http://127.0.0.1:${port}`, command, launched, pid, build_hash: sha256Hex(`build:${manifest.run_id}`), readiness, generated_at: nowIso() };
  writeJsonNoOverwrite(resolve(manifest.run_root, "preview/server-descriptor.json"), descriptor, 0o600);
  return descriptor;
}

export function main(argv = process.argv.slice(2)): number {
  const values = parseStrictCli(argv);
  if (cliBoolean(values, "help")) { console.log("Usage: bun run scripts/start-estimate-sheet-benchmark-server.ts --run-manifest=PATH [--phase=baseline-all-off] [--final-state=off] [--port=3101] [--launch]"); return 0; }
  const runManifest = cliString(values, "run-manifest") ?? process.env.ESTIMATE_PERF_RUN_MANIFEST;
  if (!runManifest) throw new Error("benchmark server requires --run-manifest");
  const portRaw = cliString(values, "port");
  const descriptor = startEstimateSheetBenchmarkServer({ runManifest, phase: cliString(values, "phase"), finalState: cliString(values, "final-state"), port: portRaw === "none" ? null : (portRaw ? Number(portRaw) : undefined), launch: cliBoolean(values, "launch") });
  process.stdout.write(`${JSON.stringify(descriptor, null, 2)}\n`);
  return descriptor.readiness === "READY" || descriptor.readiness === "UNAVAILABLE" ? 0 : 1;
}

if (import.meta.main) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}

