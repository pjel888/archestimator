#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_PROOF_URL =
  "https://archestimator.com/__cloudflare/observability-proof";

export type ObservabilityProofRouteStatus =
  | "auth-enforced"
  | "route-present-missing-secret"
  | "route-not-found"
  | "auth-bypass"
  | "unexpected-status"
  | "network-error"
  | "invalid-url";

export type ObservabilityProofRouteSmokeReport = {
  generatedAt: string;
  mode: "observability-proof-route-smoke";
  proofBoundary: "non-secret-hosted-route-smoke";
  target: {
    origin: string | null;
    pathname: string | null;
  };
  http: {
    attempted: boolean;
    status: number | null;
    statusText: string | null;
    redirected: boolean;
  };
  routeStatus: ObservabilityProofRouteStatus;
  routeReachable: boolean;
  authorizationEnforced: boolean;
  readyForWorkersLogsProof: boolean;
  nextAction: string;
  note: string;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type BuildOptions = {
  fetcher?: FetchLike;
  generatedAt?: string;
  url?: string;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function readProofUrl() {
  return (
    readEnv("OBSERVABILITY_PROOF_ROUTE_URL") ||
    readEnv("WORKERS_LOGS_PROOF_URL") ||
    readEnv("WORKERS_LOGS_PROOF_TRIGGER_URL") ||
    DEFAULT_PROOF_URL
  );
}

function safeUrlParts(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return {
      url,
      origin: url.origin,
      pathname: url.pathname,
    };
  } catch {
    return null;
  }
}

function classifyStatus(
  status: number,
): Pick<
  ObservabilityProofRouteSmokeReport,
  | "routeStatus"
  | "routeReachable"
  | "authorizationEnforced"
  | "readyForWorkersLogsProof"
  | "nextAction"
> {
  if (status === 401) {
    return {
      routeStatus: "auth-enforced",
      routeReachable: true,
      authorizationEnforced: true,
      readyForWorkersLogsProof: true,
      nextAction:
        "Set WORKERS_LOGS_PROOF_URL to this route, set WORKERS_LOGS_PROOF_SECRET from the production CRON_SECRET, then run `bun run ops:collect-workers-logs-proof`.",
    };
  }

  if (status === 503) {
    return {
      routeStatus: "route-present-missing-secret",
      routeReachable: true,
      authorizationEnforced: false,
      readyForWorkersLogsProof: false,
      nextAction:
        "Configure the production CRON_SECRET Worker secret, rerun `bun run ops:check-observability-route`, then collect Workers Logs proof.",
    };
  }

  if (status === 404) {
    return {
      routeStatus: "route-not-found",
      routeReachable: false,
      authorizationEnforced: false,
      readyForWorkersLogsProof: false,
      nextAction:
        "Deploy the current Worker source from a clean runtime worktree so `/__cloudflare/observability-proof` is live, then rerun `bun run ops:check-observability-route`.",
    };
  }

  if (status >= 200 && status < 300) {
    return {
      routeStatus: "auth-bypass",
      routeReachable: true,
      authorizationEnforced: false,
      readyForWorkersLogsProof: false,
      nextAction:
        "Investigate the hosted proof route immediately; an unauthenticated request succeeded, so proof-route authorization is not enforced.",
    };
  }

  return {
    routeStatus: "unexpected-status",
    routeReachable: false,
    authorizationEnforced: false,
    readyForWorkersLogsProof: false,
    nextAction:
      "Inspect the hosted response status and Worker deployment, then rerun `bun run ops:check-observability-route` before collecting proof.",
  };
}

function reportBase(
  options: BuildOptions,
  target: { origin: string | null; pathname: string | null },
) {
  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    mode: "observability-proof-route-smoke" as const,
    proofBoundary: "non-secret-hosted-route-smoke" as const,
    target,
    note: "Non-secret hosted route smoke. It sends one unauthenticated POST to the observability proof route and records only status-level evidence. It does not read CRON_SECRET, send an authorized proof marker, tail Cloudflare Logs, send webhooks, mutate D1, or prove alert delivery.",
  };
}

export async function buildObservabilityProofRouteSmokeReport(
  options: BuildOptions = {},
): Promise<ObservabilityProofRouteSmokeReport> {
  const rawUrl = options.url ?? readProofUrl();
  const parts = safeUrlParts(rawUrl);
  if (!parts) {
    return {
      ...reportBase(options, { origin: null, pathname: null }),
      http: {
        attempted: false,
        status: null,
        statusText: null,
        redirected: false,
      },
      routeStatus: "invalid-url",
      routeReachable: false,
      authorizationEnforced: false,
      readyForWorkersLogsProof: false,
      nextAction:
        "Set OBSERVABILITY_PROOF_ROUTE_URL or WORKERS_LOGS_PROOF_URL to an HTTPS proof route URL.",
    };
  }

  const fetcher = options.fetcher ?? fetch;
  try {
    const response = await fetcher(parts.url, {
      method: "POST",
      redirect: "manual",
      headers: {
        "cache-control": "no-store",
        "x-observability-proof-id": "route_smoke_check",
      },
    });
    const classified = classifyStatus(response.status);
    return {
      ...reportBase(options, {
        origin: parts.origin,
        pathname: parts.pathname,
      }),
      http: {
        attempted: true,
        status: response.status,
        statusText: response.statusText || null,
        redirected: response.redirected,
      },
      ...classified,
    };
  } catch {
    return {
      ...reportBase(options, {
        origin: parts.origin,
        pathname: parts.pathname,
      }),
      http: {
        attempted: true,
        status: null,
        statusText: null,
        redirected: false,
      },
      routeStatus: "network-error",
      routeReachable: false,
      authorizationEnforced: false,
      readyForWorkersLogsProof: false,
      nextAction:
        "Confirm network access and the hosted Worker route, then rerun `bun run ops:check-observability-route`.",
    };
  }
}

function readOutputFile() {
  return (
    readEnv("OBSERVABILITY_PROOF_ROUTE_OUTPUT_FILE") || readEnv("OUTPUT_FILE")
  );
}

export function writeObservabilityProofRouteSmokeReport(
  report: ObservabilityProofRouteSmokeReport,
  outputFile: string,
) {
  const resolved = resolve(outputFile);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const report = await buildObservabilityProofRouteSmokeReport();
  const outputFile = readOutputFile();
  if (outputFile) writeObservabilityProofRouteSmokeReport(report, outputFile);
  console.log(JSON.stringify(report, null, 2));
  if (!report.readyForWorkersLogsProof) process.exit(1);
}

if (import.meta.main) {
  main();
}
