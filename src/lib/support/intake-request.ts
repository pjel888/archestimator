import "server-only";

import type { CurrentUserContext } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/roles";
import {
  canAccessEstimateInD1,
  canAccessProjectInD1,
  readEstimateInProjectFromD1,
  readProjectInWorkspaceFromD1,
} from "@/lib/authz/d1-access";
import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { readBoundedFormData } from "@/lib/http/read-bounded-body";

export const SUPPORT_INTAKE_BODY_LIMIT = 4_194_304;
export const SUPPORT_SCREENSHOT_LIMIT = 3 * 1024 * 1024;
export const SUPPORT_SCREENSHOT_OUTPUT_LIMIT = 3 * 1024 * 1024;
export const SUPPORT_SCREENSHOT_MAX_PIXELS = 24_000_000;
export const SUPPORT_SCREENSHOT_MAX_EDGE = 4_096;
export const UNKNOWN_AUTHENTICATED_ROUTE = "authenticated_route_unknown";

const ALLOWED_FIELDS = new Set([
  "message",
  "clientMessageId",
  "sourcePathname",
  "diagnosticsShared",
  "workspaceId",
  "projectId",
  "estimateId",
  "appRelease",
  "viewportWidth",
  "viewportHeight",
  "timezone",
  "browserFamily",
  "osFamily",
  "screenshot",
]);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const STATIC_AUTHENTICATED_ROUTES = new Set([
  "/workshop",
  "/workshop/components",
  "/workshop/feedback",
  "/workshop/getting-started",
  "/workshop/library",
  "/workshop/library/components",
  "/workshop/library/templates",
  "/workshop/onboarding",
  "/workshop/projects",
  "/workshop/proposals",
  "/workshop/publisher",
  "/workshop/settings",
  "/workshop/settings/feedback",
  "/workshop/settings/organization",
  "/workshop/settings/profile",
  "/workshop/settings/scan-overrides",
  "/workshop/settings/upload-operations",
  "/workshop/settings/users",
  "/workshop/settings/workspace",
  "/workshop/templates",
  "/workshop/terms",
  "/admin",
  "/admin/accounts",
  "/admin/allowlist",
  "/admin/analytics",
  "/admin/audit",
  "/admin/communications",
  "/admin/copilot",
  "/admin/data-quality",
  "/admin/estimate-system",
  "/admin/financials",
  "/admin/flags",
  "/admin/notifications",
  "/admin/observability",
  "/admin/projects",
  "/admin/releases",
  "/admin/saved-replies",
  "/admin/support",
  "/admin/today",
  "/admin/users",
]);

const BROWSER_FAMILIES: Record<string, string> = {
  chrome: "chrome",
  chromium: "chromium",
  edge: "edge",
  firefox: "firefox",
  safari: "safari",
  other: "other",
};
const OS_FAMILIES: Record<string, string> = {
  android: "android",
  chromeos: "chromeos",
  ios: "ios",
  linux: "linux",
  macos: "macos",
  other: "other",
  windows: "windows",
};

export type SupportIntakeContext = {
  appRelease: string | null;
  browserFamily: string | null;
  diagnosticsShared: boolean;
  estimateId: string | null;
  osFamily: string | null;
  projectId: string | null;
  routeTemplate: string;
  timezone: string | null;
  viewportHeight: number | null;
  viewportWidth: number | null;
  workspaceId: string | null;
};

export type ValidatedSupportIntake = {
  attachment: {
    bytes: Uint8Array;
    declaredMime: string;
    magicMime: string;
    sourceSha256: string;
  } | null;
  clientMessageId: string;
  context: SupportIntakeContext;
  message: string;
};

export class SupportIntakeValidationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415 = 400,
  ) {
    super(message);
  }
}

function readAscii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function readMagicMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes.length >= 12
    && readAscii(bytes, 0, 4) === "RIFF"
    && readAscii(bytes, 8, 12) === "WEBP"
  ) return "image/webp";
  return null;
}

async function sha256Hex(bytes: Uint8Array | string) {
  const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function multipartBoundary(contentType: string | null) {
  if (!contentType) return null;
  const parts = contentType.split(";").map((part) => part.trim());
  if (parts.shift()?.toLowerCase() !== "multipart/form-data" || parts.length !== 1) return null;
  const match = /^boundary=(?:"([\x20-\x7e]{1,200})"|([^\s";,]{1,200}))$/i.exec(parts[0] ?? "");
  return match?.[1] ?? match?.[2] ?? null;
}

function singleString(form: FormData, name: string, required = false) {
  const values = form.getAll(name);
  if (values.length === 0) {
    if (required) throw new SupportIntakeValidationError(`${name} is required.`);
    return "";
  }
  if (values.length !== 1 || typeof values[0] !== "string") {
    throw new SupportIntakeValidationError(`${name} must be provided once as text.`);
  }
  return values[0];
}

function optionalText(value: string, maxLength: number, field: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new SupportIntakeValidationError(`${field} is invalid.`);
  }
  return normalized;
}

function optionalInteger(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d{1,5}$/u.test(normalized)) {
    throw new SupportIntakeValidationError(`${field} is invalid.`);
  }
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 32_768) {
    throw new SupportIntakeValidationError(`${field} is invalid.`);
  }
  return parsed;
}

function diagnosticsFlag(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "0" || normalized === "false") return false;
  if (normalized === "1" || normalized === "true") return true;
  throw new SupportIntakeValidationError("diagnosticsShared is invalid.");
}

function normalizeFamily(value: string, families: Record<string, string>, field: string) {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/gu, "");
  if (!normalized) return null;
  const aliases: Record<string, string> = {
    googlechrome: "chrome",
    microsoftedge: "edge",
    macosx: "macos",
    osx: "macos",
    chromeos: "chromeos",
  };
  const key = aliases[normalized] ?? normalized;
  const family = families[key];
  if (!family) throw new SupportIntakeValidationError(`${field} is invalid.`);
  return family;
}

function normalizedPathname(value: string) {
  const pathname = value.trim();
  if (
    !pathname
    || pathname.length > 500
    || !pathname.startsWith("/")
    || pathname.startsWith("//")
    || /[?#\\\u0000-\u001f\u007f]/u.test(pathname)
    || /%(?:2f|5c)/iu.test(pathname)
  ) return null;
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function matchAuthenticatedRouteTemplate(value: string | null | undefined) {
  const pathname = normalizedPathname(value ?? "");
  if (!pathname) return UNKNOWN_AUTHENTICATED_ROUTE;
  if (STATIC_AUTHENTICATED_ROUTES.has(pathname)) return pathname;

  const segments = pathname.split("/").slice(1);
  const uuidAt = (index: number) => Boolean(segments[index] && isUuid(segments[index]));

  if (segments[0] === "workshop" && segments[1] === "library" && segments[2] === "templates" && uuidAt(3) && segments.length === 4) {
    return "/workshop/library/templates/[templateId]";
  }
  if (segments[0] === "workshop" && segments[1] === "publisher" && segments[2] === "preview" && uuidAt(3) && segments.length === 4) {
    return "/workshop/publisher/preview/[projectId]";
  }
  if (segments[0] === "workshop" && segments[1] === "projects" && uuidAt(2)) {
    if (segments.length === 3) return "/workshop/projects/[projectId]";
    const projectLeafs = new Set(["activity", "charts", "data", "estimates", "team"]);
    if (segments.length === 4 && projectLeafs.has(segments[3] ?? "")) {
      return `/workshop/projects/[projectId]/${segments[3]}`;
    }
    if (segments[3] === "estimates" && uuidAt(4) && segments.length === 5) {
      return "/workshop/projects/[projectId]/estimates/[estimateId]";
    }
    if (segments[3] === "client-portals") {
      if (segments.length === 4) return "/workshop/projects/[projectId]/client-portals";
      if (uuidAt(4) && segments.length === 5) return "/workshop/projects/[projectId]/client-portals/[portalId]";
      if (uuidAt(4) && segments[5] === "discussions" && segments.length === 6) {
        return "/workshop/projects/[projectId]/client-portals/[portalId]/discussions";
      }
    }
  }
  if (segments[0] === "admin" && segments.length === 3 && uuidAt(2)) {
    if (segments[1] === "accounts") return "/admin/accounts/[accountId]";
    if (segments[1] === "projects") return "/admin/projects/[projectId]";
    if (segments[1] === "users") return "/admin/users/[userId]";
  }
  return UNKNOWN_AUTHENTICATED_ROUTE;
}

async function resolveResourceContext(
  database: D1DatabaseLike,
  user: CurrentUserContext,
  input: { workspaceId: string; projectId: string; estimateId: string },
) {
  const workspaceId = input.workspaceId.trim();
  const projectId = input.projectId.trim();
  const estimateId = input.estimateId.trim();
  if (!workspaceId && !projectId && !estimateId) {
    return { workspaceId: null, projectId: null, estimateId: null };
  }
  if (!isUuid(workspaceId) || (projectId && !isUuid(projectId)) || (estimateId && !isUuid(estimateId))) {
    return { workspaceId: null, projectId: null, estimateId: null };
  }
  if ((!projectId && estimateId) || (!workspaceId && projectId)) {
    return { workspaceId: null, projectId: null, estimateId: null };
  }

  const workspaceAllowed = isPlatformAdmin(user) || Boolean(await database
    .prepare<{ allowed: number }>(
      `SELECT 1 AS allowed
       FROM workspace_members
       WHERE workspace_id = ? AND user_id = ?
       LIMIT 1`,
    )
    .bind(workspaceId, user.userId)
    .first<{ allowed: number }>());
  if (!workspaceAllowed) return { workspaceId: null, projectId: null, estimateId: null };
  if (!projectId) return { workspaceId, projectId: null, estimateId: null };

  const project = await readProjectInWorkspaceFromD1(database, projectId, workspaceId);
  if (!project || !(await canAccessProjectInD1(database, projectId, user))) {
    return { workspaceId: null, projectId: null, estimateId: null };
  }
  if (!estimateId) return { workspaceId, projectId, estimateId: null };

  const estimate = await readEstimateInProjectFromD1(database, estimateId, projectId);
  if (!estimate || !(await canAccessEstimateInD1(database, estimateId, user))) {
    return { workspaceId: null, projectId: null, estimateId: null };
  }
  return { workspaceId, projectId, estimateId };
}

export async function readValidatedSupportIntake(
  request: Request,
  database: D1DatabaseLike,
  user: CurrentUserContext,
): Promise<ValidatedSupportIntake> {
  if (!multipartBoundary(request.headers.get("content-type"))) {
    throw new SupportIntakeValidationError("Expected multipart form data with one boundary.", 415);
  }
  const bounded = await readBoundedFormData(request, SUPPORT_INTAKE_BODY_LIMIT);
  if (!bounded.ok) throw new SupportIntakeValidationError(bounded.error, bounded.status);
  const form = bounded.value;

  for (const name of form.keys()) {
    if (!ALLOWED_FIELDS.has(name)) {
      throw new SupportIntakeValidationError("Unsupported support intake field.");
    }
  }

  const message = singleString(form, "message", true).trim();
  if (message.length < 2 || message.length > 4_000) {
    throw new SupportIntakeValidationError("Message must be between 2 and 4,000 characters.");
  }
  const clientMessageId = singleString(form, "clientMessageId", true).trim().toLowerCase();
  if (!isUuid(clientMessageId)) {
    throw new SupportIntakeValidationError("clientMessageId must be a UUID.");
  }

  const screenshotValues = form.getAll("screenshot");
  if (screenshotValues.length > 1 || (screenshotValues[0] !== undefined && !(screenshotValues[0] instanceof File))) {
    throw new SupportIntakeValidationError("Only one screenshot may be attached.");
  }
  let attachment: ValidatedSupportIntake["attachment"] = null;
  const screenshot = screenshotValues[0];
  if (screenshot instanceof File) {
    if (screenshot.size <= 0) throw new SupportIntakeValidationError("Screenshot is empty.");
    if (screenshot.size > SUPPORT_SCREENSHOT_LIMIT) {
      throw new SupportIntakeValidationError("Screenshot exceeds the 3 MiB limit.", 413);
    }
    const declaredMime = screenshot.type.trim().toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(declaredMime)) {
      throw new SupportIntakeValidationError("Use a JPG, PNG, or WebP screenshot.", 415);
    }
    const bytes = new Uint8Array(await screenshot.arrayBuffer());
    const magicMime = readMagicMime(bytes.subarray(0, 64));
    if (!magicMime || magicMime !== declaredMime) {
      throw new SupportIntakeValidationError("Screenshot encoding does not match its declared type.", 415);
    }
    attachment = {
      bytes,
      declaredMime,
      magicMime,
      sourceSha256: await sha256Hex(bytes),
    };
  }

  const diagnosticsShared = diagnosticsFlag(singleString(form, "diagnosticsShared"));
  const routeTemplate = matchAuthenticatedRouteTemplate(singleString(form, "sourcePathname"));
  const resources = diagnosticsShared
    ? await resolveResourceContext(database, user, {
        workspaceId: singleString(form, "workspaceId"),
        projectId: singleString(form, "projectId"),
        estimateId: singleString(form, "estimateId"),
      })
    : { workspaceId: null, projectId: null, estimateId: null };

  const context: SupportIntakeContext = diagnosticsShared
    ? {
        ...resources,
        appRelease: optionalText(singleString(form, "appRelease"), 120, "appRelease"),
        browserFamily: normalizeFamily(singleString(form, "browserFamily"), BROWSER_FAMILIES, "browserFamily"),
        diagnosticsShared,
        osFamily: normalizeFamily(singleString(form, "osFamily"), OS_FAMILIES, "osFamily"),
        routeTemplate,
        timezone: optionalText(singleString(form, "timezone"), 100, "timezone"),
        viewportHeight: optionalInteger(singleString(form, "viewportHeight"), "viewportHeight"),
        viewportWidth: optionalInteger(singleString(form, "viewportWidth"), "viewportWidth"),
      }
    : {
        ...resources,
        appRelease: null,
        browserFamily: null,
        diagnosticsShared,
        osFamily: null,
        routeTemplate,
        timezone: null,
        viewportHeight: null,
        viewportWidth: null,
      };

  return { attachment, clientMessageId, context, message };
}

export async function supportSha256Hex(value: string | Uint8Array) {
  return sha256Hex(value);
}
