import { getCurrentRequestId, getCurrentRequestIdContext } from "@/lib/observability/request-id";

export type CloudflareObservabilityProofEnv = {
  CRON_SECRET?: string;
};

export const CLOUDFLARE_OBSERVABILITY_PROOF_PATH = "/__cloudflare/observability-proof";

const PROOF_ID_HEADER = "x-observability-proof-id";
const SAFE_PROOF_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "cache-control": "no-store, private",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function isAuthorized(request: Request, env: CloudflareObservabilityProofEnv) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return "missing-secret";
  return request.headers.get("authorization") === `Bearer ${secret}` ? "authorized" : "unauthorized";
}

function readProofId(request: Request) {
  const url = new URL(request.url);
  return request.headers.get(PROOF_ID_HEADER)?.trim()
    || url.searchParams.get("proof_id")?.trim()
    || url.searchParams.get("proofId")?.trim()
    || `proof_${crypto.randomUUID()}`;
}

function isSafeProofId(value: string) {
  return SAFE_PROOF_ID_PATTERN.test(value);
}

export async function routeCloudflareObservabilityProofRequest(
  request: Request,
  env: CloudflareObservabilityProofEnv,
) {
  const url = new URL(request.url);
  if (url.pathname !== CLOUDFLARE_OBSERVABILITY_PROOF_PATH) return null;

  const auth = isAuthorized(request, env);
  if (auth === "missing-secret") return jsonResponse({ error: "CRON_SECRET is not configured." }, 503);
  if (auth === "unauthorized") return jsonResponse({ error: "Unauthorized." }, 401);
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const proofId = readProofId(request);
  if (!isSafeProofId(proofId)) return jsonResponse({ error: "Invalid proof id." }, 400);

  const requestIdContext = getCurrentRequestIdContext();
  const requestId = getCurrentRequestId() ?? requestIdContext?.internalId ?? null;
  const emittedAt = new Date().toISOString();

  console.log(
    JSON.stringify({
      timestamp: emittedAt,
      level: "info",
      event: "workers_logs_proof_marker",
      message: "Workers Logs proof marker",
      request_id: requestId,
      context: {
        proof_id: proofId,
        route: CLOUDFLARE_OBSERVABILITY_PROOF_PATH,
        request_id_source: requestIdContext?.source ?? "unavailable",
      },
    }),
  );

  return jsonResponse({
    ok: true,
    mode: "cloudflare-observability-proof",
    proofScope: "workers-logs-correlation-marker",
    proofId,
    requestId,
    route: CLOUDFLARE_OBSERVABILITY_PROOF_PATH,
    emittedAt,
  });
}
