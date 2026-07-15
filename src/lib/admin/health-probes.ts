import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { emitLogRecord } from "@/lib/observability/logger";

export type AdminHealthProbeResult = {
  name: string;
  ok: boolean;
  // F0-8: honesty label so consumers never read "binding is present" as
  // "binding is healthy." Level 0 = presence only (binding exists, not
  // exercised); Level 1 = actually exercised (a real query/operation ran).
  level: 0 | 1;
  detail: string;
};

type CloudflareBindingContext = {
  env?: object;
};

const OPTIONAL_BINDING_NAMES = ["ARCH_UPLOADS_R2", "COLLAB_ROOMS", "UPLOAD_JOBS_QUEUE", "EMAIL", "IMAGES"] as const;
type OptionalBindingName = (typeof OPTIONAL_BINDING_NAMES)[number];

function bindingPresent(context: CloudflareBindingContext | null, name: OptionalBindingName): boolean {
  return Boolean(context?.env && Reflect.get(context.env, name));
}

async function loadCloudflareBindingContext(): Promise<CloudflareBindingContext | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    return { env: context.env };
  } catch (error) {
    emitLogRecord({
      level: "warn",
      event: "admin_health_cloudflare_context_unavailable",
      message: "Cloudflare context was unavailable during admin health probes.",
      context: {
        error_name: error instanceof Error ? error.name : "unknown",
      },
    });
    return null;
  }
}

export async function runAdminHealthProbes(): Promise<AdminHealthProbeResult[]> {
  const probes: AdminHealthProbeResult[] = [];

  try {
    const db = await getCloudflareD1Database();
    if (!db) {
      probes.push({ name: "d1", ok: false, level: 1, detail: "ARCH_DB binding is unavailable." });
    } else {
      await db.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      probes.push({
        name: "d1",
        ok: true,
        level: 1,
        detail: "ARCH_DB responded to a lightweight query (exercised).",
      });
    }
  } catch (error) {
    emitLogRecord({
      level: "error",
      event: "admin_health_d1_probe_failed",
      message: "Admin D1 health probe failed.",
      context: {
        error_name: error instanceof Error ? error.name : "unknown",
      },
    });
    probes.push({ name: "d1", ok: false, level: 1, detail: "ARCH_DB query failed." });
  }

  const context = await loadCloudflareBindingContext();
  for (const bindingName of OPTIONAL_BINDING_NAMES) {
    const present = bindingPresent(context, bindingName);
    probes.push({
      name: bindingName.toLowerCase(),
      ok: present,
      // F0-8: presence only — never call this "healthy." The detail text and
      // level both communicate that the binding was not exercised.
      level: 0,
      detail: present
        ? `${bindingName} binding is present (Level 0: not exercised).`
        : `${bindingName} binding is not available in this runtime.`,
    });
  }

  return probes;
}
