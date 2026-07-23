#!/usr/bin/env bun

const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
const apiToken = process.env.CLOUDFLARE_CACHE_PURGE_TOKEN?.trim();
const checkOnly = Bun.argv.includes("--check");

if (!zoneId || !apiToken) {
  throw new Error(
    "Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_CACHE_PURGE_TOKEN before deploying. The token needs Zone > Cache Purge permission for archestimator.com.",
  );
}

if (checkOnly) {
  console.log("Cloudflare cache purge credentials are configured.");
  process.exit(0);
}

const response = await fetch(
  `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ purge_everything: true }),
  },
);

const payload = (await response.json().catch(() => null)) as {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
};

if (!response.ok || payload?.success !== true) {
  const details = payload?.errors
    ?.map(
      (error) =>
        `${error.code ?? "unknown"}: ${error.message ?? "Unknown error"}`,
    )
    .join("; ");
  throw new Error(
    `Cloudflare cache purge failed (${response.status})${details ? `: ${details}` : ""}.`,
  );
}

console.log(`Purged the Cloudflare cache for zone ${zoneId}.`);
