import type { CloudflareBetterAuthProofEnv } from "./better-auth-proof-router";
import type { CloudflareD1PerformanceProofEnv } from "./d1-performance-proof-router";
import type { CloudflareJobsProofEnv } from "./jobs-proof-router";
import type { CloudflareObservabilityProofEnv } from "./observability-proof-router";
import type { CloudflareProviderProofEnv } from "./provider-proof-router";

export type CloudflareProtectedProofEnv =
  & CloudflareProviderProofEnv
  & CloudflareJobsProofEnv
  & CloudflareD1PerformanceProofEnv
  & CloudflareBetterAuthProofEnv
  & CloudflareObservabilityProofEnv;

const PROVIDER_PROOF_PATH = "/__cloudflare/provider-proof";
const JOBS_PROOF_PATH = "/__cloudflare/jobs-proof";
const D1_PERFORMANCE_PROOF_PATH = "/__cloudflare/d1-performance-proof";
const BETTER_AUTH_PROOF_PATH = "/__cloudflare/better-auth-proof";
const OBSERVABILITY_PROOF_PATH = "/__cloudflare/observability-proof";

export async function routeCloudflareProtectedProofRequest(
  request: Request,
  env: CloudflareProtectedProofEnv,
) {
  const pathname = new URL(request.url).pathname;

  if (pathname === PROVIDER_PROOF_PATH) {
    const { routeCloudflareProviderProofRequest } = await import("./provider-proof-router");
    return routeCloudflareProviderProofRequest(request, env);
  }

  if (pathname === JOBS_PROOF_PATH) {
    const { routeCloudflareJobsProofRequest } = await import("./jobs-proof-router");
    return routeCloudflareJobsProofRequest(request, env);
  }

  if (pathname === D1_PERFORMANCE_PROOF_PATH) {
    const { routeCloudflareD1PerformanceProofRequest } = await import("./d1-performance-proof-router");
    return routeCloudflareD1PerformanceProofRequest(request, env);
  }

  if (pathname === BETTER_AUTH_PROOF_PATH) {
    const { routeCloudflareBetterAuthProofRequest } = await import("./better-auth-proof-router");
    return routeCloudflareBetterAuthProofRequest(request, env);
  }

  if (pathname === OBSERVABILITY_PROOF_PATH) {
    const { routeCloudflareObservabilityProofRequest } = await import("./observability-proof-router");
    return routeCloudflareObservabilityProofRequest(request, env);
  }

  return null;
}
