import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { readPublicationTokenHashSecret } from "@/lib/publication/security";

export type ClientPortalPublicIdentifierKind =
  | "activity"
  | "decision"
  | "issue"
  | "message"
  | "portal"
  | "section"
  | "thread";

type ClientPortalInternalIdentifiers = {
  issueId?: string | null;
  portalId?: string;
  sectionId?: string | null;
};

const internalIdentifiers = Symbol("clientPortalInternalIdentifiers");
const identifierPrefixes: Record<ClientPortalPublicIdentifierKind, string> = {
  activity: "cpa",
  decision: "cpd",
  issue: "cpi",
  message: "cpm",
  portal: "cpp",
  section: "cps",
  thread: "cpt",
};

function equal(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createClientPortalPublicIdentifier(
  token: string,
  kind: ClientPortalPublicIdentifierKind,
  internalId: string,
) {
  const digest = createHmac("sha256", readPublicationTokenHashSecret())
    .update(`${token}\0${kind}\0${internalId}`)
    .digest("base64url");
  return `${identifierPrefixes[kind]}_${digest}`;
}

export function resolveClientPortalPublicIdentifier(
  token: string,
  kind: ClientPortalPublicIdentifierKind,
  publicId: string,
  candidates: readonly string[],
) {
  const prefix = `${identifierPrefixes[kind]}_`;
  if (!publicId.startsWith(prefix) || publicId.length !== prefix.length + 43) return null;
  return candidates.find((candidate) => equal(
    createClientPortalPublicIdentifier(token, kind, candidate),
    publicId,
  )) ?? null;
}

export function createClientPortalPublicCursor(
  token: string,
  kind: ClientPortalPublicIdentifierKind,
  internalCursor: string | null,
) {
  if (!internalCursor) return null;
  const separator = internalCursor.lastIndexOf("|");
  const timestamp = internalCursor.slice(0, separator);
  const internalId = internalCursor.slice(separator + 1);
  if (separator < 1 || !internalId || !Number.isFinite(Date.parse(timestamp))) return null;
  return `${timestamp}|${createClientPortalPublicIdentifier(token, kind, internalId)}`;
}

export function parseClientPortalPublicCursor(value: string | null | undefined) {
  if (!value || value.length > 300) return null;
  const separator = value.lastIndexOf("|");
  const timestamp = value.slice(0, separator);
  const publicId = value.slice(separator + 1);
  return separator > 0 && publicId && Number.isFinite(Date.parse(timestamp))
    ? { publicId, timestamp }
    : null;
}

export function attachClientPortalInternalIdentifiers<T extends object>(
  value: T,
  identifiers: ClientPortalInternalIdentifiers,
) {
  Object.defineProperty(value, internalIdentifiers, {
    configurable: false,
    enumerable: false,
    value: identifiers,
    writable: false,
  });
  return value as T & { [internalIdentifiers]: ClientPortalInternalIdentifiers };
}

export function readClientPortalInternalIdentifiers(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return (value as { [internalIdentifiers]?: ClientPortalInternalIdentifiers })[internalIdentifiers] ?? null;
}
