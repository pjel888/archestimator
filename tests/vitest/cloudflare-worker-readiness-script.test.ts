import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkCloudflareWorkerReadiness,
  extractCloudflareSecretNames,
  extractEnvAssignmentStates,
  writeMarkdown,
} from "../../scripts/check-cloudflare-worker-readiness";

const COMPLETE_ENV_EXAMPLE = `
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARCHESTIMATOR_ALLOWED_APP_ORIGINS=http://localhost:3000
CLOSED_BETA_ACCESS_ENABLED=false
PUBLICATION_TOKEN_ENCRYPTION_SECRET=
PUBLICATION_TOKEN_HASH_SECRET=
PUBLICATION_ACCESS_COOKIE_SECRET=
ARCHESTIMATOR_AI_ENABLED=false
NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false
NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN=
ARCHESTIMATOR_AUTH_PROVIDER=
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
BETTER_AUTH_GOOGLE_CLIENT_ID=
BETTER_AUTH_GOOGLE_CLIENT_SECRET=
ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false
ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email
CLOUDFLARE_EMAIL_FROM=
CLOUDFLARE_EMAIL_REPLY_TO=support@archestimator.com
CRON_SECRET=
UPLOAD_CLEANUP_JOB_SECRET=
UPLOAD_SCAN_JOB_SECRET=
UPLOAD_JOBS_ENABLED=0
CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=1
CLOUDFLARE_UPLOAD_JOBS_ORIGIN=https://archestimator.internal
ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2
ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=node-sharp
`;

const COMPLETE_DEV_VARS_EXAMPLE = `
CRON_SECRET=
UPLOAD_CLEANUP_JOB_SECRET=
UPLOAD_SCAN_JOB_SECRET=
UPLOAD_JOBS_ENABLED=0
CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=1
CLOUDFLARE_UPLOAD_JOBS_ORIGIN=https://archestimator.internal
ARCHESTIMATOR_AUTH_PROVIDER=
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
BETTER_AUTH_GOOGLE_CLIENT_ID=
BETTER_AUTH_GOOGLE_CLIENT_SECRET=
ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false
ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email
CLOUDFLARE_EMAIL_FROM=
CLOUDFLARE_EMAIL_REPLY_TO=support@archestimator.com
PUBLICATION_TOKEN_ENCRYPTION_SECRET=
PUBLICATION_TOKEN_HASH_SECRET=
PUBLICATION_ACCESS_COOKIE_SECRET=
ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2
ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=node-sharp
`;

const COMPLETE_WRANGLER = JSON.stringify({
  workers_dev: true,
  routes: [
    { pattern: "archestimator.com", custom_domain: true },
    { pattern: "www.archestimator.com", custom_domain: true },
  ],
  assets: { binding: "ASSETS" },
  images: { binding: "IMAGES" },
  send_email: [{ name: "EMAIL" }],
  r2_buckets: [{ binding: "ARCH_UPLOADS_R2", bucket_name: "proof", preview_bucket_name: "proof-dev" }],
  queues: {
    producers: [{ binding: "UPLOAD_JOBS_QUEUE", queue: "archestimator-upload-jobs" }],
    consumers: [{ queue: "archestimator-upload-jobs", dead_letter_queue: "archestimator-upload-jobs-dlq" }],
  },
  triggers: { crons: ["0 3 * * *", "15 3 * * *"] },
  observability: {
    enabled: true,
    head_sampling_rate: 0.1,
    logs: {
      enabled: true,
      head_sampling_rate: 0.1,
      invocation_logs: true,
      persist: true,
    },
    traces: {
      enabled: true,
      head_sampling_rate: 0.05,
      persist: true,
    },
  },
});

const COMPLETE_PACKAGE_JSON = JSON.stringify({
  scripts: {
    "cf:build": "opennextjs-cloudflare build",
    "cf:preview": "opennextjs-cloudflare preview",
    "cf:deploy": "opennextjs-cloudflare build && OPEN_NEXT_DEPLOY=true wrangler deploy --keep-vars",
    "cf:typegen": "wrangler types",
    "cf:verify-preview-routes": "bun run scripts/verify-cloudflare-worker-preview-routes.ts",
    "cf:check-readiness": "bun run scripts/check-cloudflare-worker-readiness.ts",
  },
});

function completeSecretTranscript() {
  return [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SITE_URL",
    "ARCHESTIMATOR_ALLOWED_APP_ORIGINS",
    "CLOSED_BETA_ACCESS_ENABLED",
    "PUBLICATION_TOKEN_ENCRYPTION_SECRET",
    "PUBLICATION_TOKEN_HASH_SECRET",
    "PUBLICATION_ACCESS_COOKIE_SECRET",
    "ARCHESTIMATOR_AI_ENABLED",
    "NEXT_PUBLIC_ASK_FLIP_UI_ENABLED",
    "ARCHESTIMATOR_AUTH_PROVIDER",
    "BETTER_AUTH_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_TRUSTED_ORIGINS",
    "BETTER_AUTH_GOOGLE_CLIENT_ID",
    "BETTER_AUTH_GOOGLE_CLIENT_SECRET",
    "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
    "ARCHESTIMATOR_EMAIL_PROVIDER",
    "CLOUDFLARE_EMAIL_FROM",
    "CLOUDFLARE_EMAIL_REPLY_TO",
    "CRON_SECRET",
    "UPLOAD_CLEANUP_JOB_SECRET",
    "UPLOAD_SCAN_JOB_SECRET",
    "UPLOAD_JOBS_ENABLED",
    "CLOUDFLARE_UPLOAD_JOBS_DRY_RUN",
    "CLOUDFLARE_UPLOAD_JOBS_ORIGIN",
    "ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER",
    "ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER",
  ].join("\n");
}

describe("Cloudflare Worker readiness checker", () => {
  it("extracts env assignment names and non-empty states without exposing values", () => {
    const state = extractEnvAssignmentStates(`
      # ignored
      PUBLICATION_TOKEN_HASH_SECRET=super-secret-value
      export UPLOAD_JOBS_ENABLED=0
      EMPTY_SECRET=
    `);

    expect(state.names).toEqual(["EMPTY_SECRET", "PUBLICATION_TOKEN_HASH_SECRET", "UPLOAD_JOBS_ENABLED"]);
    expect(state.nonEmptyNames).toEqual(["PUBLICATION_TOKEN_HASH_SECRET", "UPLOAD_JOBS_ENABLED"]);
  });

  it("extracts Cloudflare secret names from sanitized transcripts", () => {
    expect(extractCloudflareSecretNames("PUBLICATION_TOKEN_HASH_SECRET Added\nNo values here")).toEqual([
      "PUBLICATION_TOKEN_HASH_SECRET",
    ]);
  });

  it("passes manifest readiness while keeping deployment evidence separate", () => {
    const result = checkCloudflareWorkerReadiness({
      envExampleText: COMPLETE_ENV_EXAMPLE,
      devVarsExampleText: COMPLETE_DEV_VARS_EXAMPLE,
      wranglerConfigText: COMPLETE_WRANGLER,
      packageJsonText: COMPLETE_PACKAGE_JSON,
      localDevVarsText: `
        PUBLICATION_TOKEN_ENCRYPTION_SECRET=local-proof-only
        PUBLICATION_TOKEN_HASH_SECRET=local-proof-only
        PUBLICATION_ACCESS_COOKIE_SECRET=local-proof-only
        UPLOAD_JOBS_ENABLED=0
        CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=1
        CLOUDFLARE_UPLOAD_JOBS_ORIGIN=https://archestimator.internal
        ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2
        ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=node-sharp
      `,
    });

    expect(result.manifestReady).toBe(true);
    expect(result.wranglerObservability.ready).toBe(true);
    expect(result.localPreviewReady).toBe(true);
    expect(result.providerSecretList.checked).toBe(false);
    expect(result.deploymentSecretsReady).toBe(false);
    expect(result.deploymentReady).toBe(false);
    expect(result.note).toContain("never prints secret values");
  });

  it("fails closed when Worker manifests drift", () => {
    const result = checkCloudflareWorkerReadiness({
      envExampleText: COMPLETE_ENV_EXAMPLE.replace("NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN=\n", ""),
      devVarsExampleText: COMPLETE_DEV_VARS_EXAMPLE.replace("PUBLICATION_TOKEN_HASH_SECRET=\n", ""),
      wranglerConfigText: JSON.stringify({
        assets: { binding: "ASSETS" },
        r2_buckets: [{ binding: "ARCH_UPLOADS_R2" }],
        triggers: { crons: ["0 3 * * *"] },
        observability: {
          enabled: true,
          head_sampling_rate: 1,
          logs: {
            enabled: true,
            head_sampling_rate: 1,
          },
        },
      }),
      packageJsonText: JSON.stringify({
        scripts: {
          "cf:build": "opennextjs-cloudflare build",
        },
      }),
    });

    expect(result.manifestReady).toBe(false);
    expect(result.envExample.missing).toContain("NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN");
    expect(result.devVarsExample.missing).toContain("PUBLICATION_TOKEN_HASH_SECRET");
    expect(result.wranglerBindings.missing).toContain("IMAGES");
    expect(result.wranglerBindings.missing).toContain("UPLOAD_JOBS_QUEUE");
    expect(result.wranglerBindings.missing).toContain("EMAIL");
    expect(result.wranglerCustomDomains.missing).toEqual(["archestimator.com", "www.archestimator.com"]);
    expect(result.wranglerCrons.missing).toContain("15 3 * * *");
    expect(result.wranglerObservability.missing).toContain("observability.head_sampling_rate<=0.1");
    expect(result.wranglerObservability.missing).toContain("observability.logs.head_sampling_rate<=0.1");
    expect(result.wranglerObservability.missing).toContain("observability.logs.invocation_logs");
    expect(result.wranglerObservability.missing).toContain("observability.traces.enabled");
    expect(result.packageScripts.missing).toContain("cf:check-readiness");
  });

  it("checks provider secret-list evidence only when a sanitized transcript is supplied", () => {
    const result = checkCloudflareWorkerReadiness({
      envExampleText: COMPLETE_ENV_EXAMPLE,
      devVarsExampleText: COMPLETE_DEV_VARS_EXAMPLE,
      wranglerConfigText: COMPLETE_WRANGLER,
      packageJsonText: COMPLETE_PACKAGE_JSON,
      providerSecretListText: completeSecretTranscript(),
      providerSecretListSource: "sanitized-wrangler-secret-list.txt",
    });

    expect(result.providerSecretList.checked).toBe(true);
    expect(result.deploymentSecretsReady).toBe(true);
    expect(result.deploymentReady).toBe(true);
  });

  it("keeps the repository Cloudflare manifests aligned", () => {
    const result = checkCloudflareWorkerReadiness({
      envExampleText: readFileSync(".env.example", "utf8"),
      devVarsExampleText: readFileSync(".dev.vars.example", "utf8"),
      wranglerConfigText: readFileSync("wrangler.jsonc", "utf8"),
      packageJsonText: readFileSync("package.json", "utf8"),
    });

    expect(result.manifestReady).toBe(true);
    expect(result.wranglerCustomDomains.ready).toBe(true);
    expect(result.wranglerObservability.ready).toBe(true);
    expect(result.deploymentReady).toBe(false);
  });

  it("writes markdown without leaking local secret values", () => {
    const result = checkCloudflareWorkerReadiness({
      envExampleText: COMPLETE_ENV_EXAMPLE,
      devVarsExampleText: COMPLETE_DEV_VARS_EXAMPLE,
      wranglerConfigText: COMPLETE_WRANGLER,
      packageJsonText: COMPLETE_PACKAGE_JSON,
      localDevVarsText: `
        PUBLICATION_TOKEN_ENCRYPTION_SECRET=secret-encryption-value
        PUBLICATION_TOKEN_HASH_SECRET=secret-hash-value
        PUBLICATION_ACCESS_COOKIE_SECRET=secret-cookie-value
        UPLOAD_JOBS_ENABLED=0
        CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=1
        CLOUDFLARE_UPLOAD_JOBS_ORIGIN=https://archestimator.internal
        ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2
        ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=node-sharp
      `,
    });
    const dir = mkdtempSync(join(tmpdir(), "cloudflare-readiness-"));
    try {
      const file = join(dir, "report.md");
      writeMarkdown(result, file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown).toContain("Local preview secrets");
      expect(markdown).not.toContain("secret-encryption-value");
      expect(markdown).not.toContain("secret-hash-value");
      expect(markdown).not.toContain("secret-cookie-value");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
