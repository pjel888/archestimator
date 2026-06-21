#!/usr/bin/env bun

import { createClient } from "@supabase/supabase-js";

import {
  decryptPublicationToken,
  readPublicationTokenEncryptionSecret,
} from "../src/lib/publication/security";
import type { Database } from "../src/lib/supabase/types";

type SeedInputs = {
  supabaseUrl: string;
  serviceRoleKey: string;
  baseUrl: string;
};

type PublicationCandidate = {
  encrypted_token: string;
  expires_at: string | null;
  password_hash: string | null;
  published_at: string | null;
  revoked_at: string | null;
  status: "published" | "expired" | "revoked";
};

function readEnv(name: string, env: NodeJS.ProcessEnv = process.env) {
  return env[name]?.trim() || undefined;
}

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function isLocalDevBaseUrl(value: string) {
  const url = new URL(value);
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
}

export function parseSeedInputs(env: NodeJS.ProcessEnv = process.env): SeedInputs {
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL", env);
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY", env);
  const baseUrl = readEnv("SHARE_BASE_URL", env) ?? readEnv("NEXT_PUBLIC_APP_URL", env) ?? readEnv("NEXT_PUBLIC_SITE_URL", env);
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
    ["SHARE_BASE_URL or NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL", baseUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) throw new Error(`Missing required shared-link smoke seed input(s): ${missing.join(", ")}.`);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl!);
  if (!isLocalDevBaseUrl(normalizedBaseUrl) && env.SHARE_SMOKE_ALLOW_HOSTED !== "1") {
    throw new Error("Refusing to seed a share smoke URL for a non-local base URL unless SHARE_SMOKE_ALLOW_HOSTED=1.");
  }

  return {
    supabaseUrl: supabaseUrl!,
    serviceRoleKey: serviceRoleKey!,
    baseUrl: normalizedBaseUrl,
  };
}

export function selectSeedCandidate(rows: PublicationCandidate[], now = new Date()) {
  return rows.find((row) => {
    if (row.status !== "published") return false;
    if (row.password_hash) return false;
    if (row.revoked_at) return false;
    if (row.expires_at && new Date(row.expires_at).getTime() <= now.getTime()) return false;
    return true;
  }) ?? null;
}

export function buildShareUrl(baseUrl: string, token: string) {
  return new URL(`/share/${token}`, normalizeBaseUrl(baseUrl)).toString();
}

export function renderShareUrlEnv(shareUrl: string) {
  return `SHARE_URL=${shareUrl}\n`;
}

async function findExistingNoPasswordPublication(inputs: SeedInputs) {
  const supabase = createClient<Database>(inputs.supabaseUrl, inputs.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "archestimator-shared-link-smoke-seed",
      },
    },
  });

  const { data, error } = await supabase
    .from("project_publications")
    .select("encrypted_token, expires_at, password_hash, published_at, revoked_at, status")
    .eq("status", "published")
    .is("password_hash", null)
    .is("revoked_at", null)
    .order("published_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return selectSeedCandidate((data ?? []) as PublicationCandidate[]);
}

async function main() {
  const inputs = parseSeedInputs();
  const candidate = await findExistingNoPasswordPublication(inputs);
  if (!candidate) {
    throw new Error("No active no-password published share link was found for local smoke testing.");
  }

  const token = decryptPublicationToken(candidate.encrypted_token, readPublicationTokenEncryptionSecret());
  process.stdout.write(renderShareUrlEnv(buildShareUrl(inputs.baseUrl, token)));
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
