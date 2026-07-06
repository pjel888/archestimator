import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import {
  DEFAULT_RETENTION_RULES,
  recordRetentionEventInD1,
  runRetentionPassInD1,
  type RecordRetentionEventInput,
  type RetentionPassOptions,
  type RetentionRule,
} from "@/lib/compliance/retention-core";

export * from "@/lib/compliance/retention-core";

export async function recordRetentionEvent(input: RecordRetentionEventInput): Promise<{ id: string }> {
  return recordRetentionEventInD1(await getCloudflareD1Database(), input);
}

export async function runRetentionPass(
  rules: readonly RetentionRule[] = DEFAULT_RETENTION_RULES,
  options: RetentionPassOptions = {},
) {
  return runRetentionPassInD1(await getCloudflareD1Database(), rules, options);
}
