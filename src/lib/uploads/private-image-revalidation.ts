import { createHash } from "node:crypto";

type PrivateImageObjectIdentity = {
  etag?: string | null;
  checksumSha256?: string | null;
};

export const PRIVATE_IMAGE_SUCCESS_CACHE_CONTROL =
  "private, no-cache, max-age=0, must-revalidate";

export function createPrivateImageEntityTag(
  object: PrivateImageObjectIdentity,
  body: ArrayBuffer,
): string;
export function createPrivateImageEntityTag(
  object: PrivateImageObjectIdentity,
): string | null;
export function createPrivateImageEntityTag(
  object: PrivateImageObjectIdentity,
  body?: ArrayBuffer,
): string | null {
  const checksum = object.checksumSha256?.trim();
  const providerEtag = object.etag?.trim();
  const hash = createHash("sha256");

  if (checksum) {
    hash.update("checksum\0").update(checksum);
  } else if (providerEtag) {
    hash.update("etag\0").update(providerEtag);
  } else if (body) {
    hash.update("body\0").update(new Uint8Array(body));
  } else {
    return null;
  }

  return `"${hash.digest("base64url")}"`;
}

export function matchesIfNoneMatch(
  ifNoneMatch: string | null,
  entityTag: string,
): boolean {
  if (!ifNoneMatch) return false;

  const comparableEntityTag = toWeakComparableEntityTag(entityTag);
  return ifNoneMatch.split(",").some((candidate) => {
    const trimmedCandidate = candidate.trim();
    return (
      trimmedCandidate === "*" ||
      toWeakComparableEntityTag(trimmedCandidate) === comparableEntityTag
    );
  });
}

function toWeakComparableEntityTag(entityTag: string) {
  return entityTag.trim().replace(/^W\//i, "");
}
