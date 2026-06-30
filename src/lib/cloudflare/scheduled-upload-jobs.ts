export const CLOUDFLARE_UPLOAD_CLEANUP_CRON = "0 3 * * *";
export const CLOUDFLARE_UPLOAD_SCAN_CRON = "15 3 * * *";

const DEFAULT_UPLOAD_JOB_LIMIT = 100;
const DEFAULT_INTERNAL_ORIGIN = "https://archestimator.internal";

type ScheduledUploadJob = {
  name: "upload-cleanup" | "upload-scan";
  cron: string;
  path: string;
  routeSpecificSecretName: "UPLOAD_CLEANUP_JOB_SECRET" | "UPLOAD_SCAN_JOB_SECRET";
};

export type CloudflareScheduledUploadJobEnv = {
  CLOUDFLARE_UPLOAD_JOBS_DRY_RUN?: string;
  CLOUDFLARE_UPLOAD_JOBS_ORIGIN?: string;
  CRON_SECRET?: string;
  UPLOAD_CLEANUP_JOB_SECRET?: string;
  UPLOAD_JOBS_ENABLED?: string;
  UPLOAD_SCAN_JOB_SECRET?: string;
};

export type CloudflareScheduledUploadJobFetch = (request: Request) => Promise<Response> | Response;

export type CloudflareScheduledUploadJobSummary = {
  cron: string;
  dryRun: boolean;
  executed: Array<{
    name: ScheduledUploadJob["name"];
    path: string;
    status: number;
    ok: boolean;
  }>;
  skipped: Array<{
    name: ScheduledUploadJob["name"] | "unknown";
    reason: "missing_secret" | "unmatched_cron";
  }>;
};

export const CLOUDFLARE_SCHEDULED_UPLOAD_JOBS: ScheduledUploadJob[] = [
  {
    name: "upload-cleanup",
    cron: CLOUDFLARE_UPLOAD_CLEANUP_CRON,
    path: "/api/internal/upload-cleanup",
    routeSpecificSecretName: "UPLOAD_CLEANUP_JOB_SECRET",
  },
  {
    name: "upload-scan",
    cron: CLOUDFLARE_UPLOAD_SCAN_CRON,
    path: "/api/internal/upload-scan",
    routeSpecificSecretName: "UPLOAD_SCAN_JOB_SECRET",
  },
];

function normalizeEnvValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function readJobSecret(env: CloudflareScheduledUploadJobEnv, job: ScheduledUploadJob) {
  return normalizeEnvValue(env[job.routeSpecificSecretName]) ?? normalizeEnvValue(env.CRON_SECRET);
}

function shouldDryRun(env: CloudflareScheduledUploadJobEnv) {
  return env.UPLOAD_JOBS_ENABLED?.trim() !== "1" || env.CLOUDFLARE_UPLOAD_JOBS_DRY_RUN?.trim() !== "0";
}

function readOrigin(env: CloudflareScheduledUploadJobEnv) {
  return normalizeEnvValue(env.CLOUDFLARE_UPLOAD_JOBS_ORIGIN) ?? DEFAULT_INTERNAL_ORIGIN;
}

function buildJobRequest(job: ScheduledUploadJob, env: CloudflareScheduledUploadJobEnv, secret: string, dryRun: boolean) {
  const url = new URL(job.path, readOrigin(env));
  url.searchParams.set("limit", String(DEFAULT_UPLOAD_JOB_LIMIT));
  if (dryRun) url.searchParams.set("dryRun", "1");

  return new Request(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${secret}`,
      "x-archestimator-scheduled-cron": job.cron,
      "x-archestimator-scheduled-source": "cloudflare-cron",
    },
  });
}

export function getCloudflareScheduledUploadJobsForCron(cron: string) {
  return CLOUDFLARE_SCHEDULED_UPLOAD_JOBS.filter((job) => job.cron === cron);
}

export async function runCloudflareScheduledUploadJobs({
  cron,
  env,
  fetcher,
}: {
  cron: string;
  env: CloudflareScheduledUploadJobEnv;
  fetcher: CloudflareScheduledUploadJobFetch;
}): Promise<CloudflareScheduledUploadJobSummary> {
  const jobs = getCloudflareScheduledUploadJobsForCron(cron);
  const dryRun = shouldDryRun(env);
  const summary: CloudflareScheduledUploadJobSummary = {
    cron,
    dryRun,
    executed: [],
    skipped: [],
  };

  if (jobs.length === 0) {
    summary.skipped.push({ name: "unknown", reason: "unmatched_cron" });
    return summary;
  }

  for (const job of jobs) {
    const secret = readJobSecret(env, job);
    if (!secret) {
      summary.skipped.push({ name: job.name, reason: "missing_secret" });
      continue;
    }

    const response = await fetcher(buildJobRequest(job, env, secret, dryRun));
    summary.executed.push({
      name: job.name,
      path: job.path,
      status: response.status,
      ok: response.ok,
    });
  }

  return summary;
}
