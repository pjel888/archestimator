import { randomUUID } from "node:crypto";

import { getUploadPolicy, safeUploadName, type UploadSurface } from "./policy";

type BuildUploadObjectKeyInput = {
  surface: UploadSurface;
  workspaceId: string;
  userId: string;
  fileName: string;
  extension: string;
  targetEntityId?: string | null;
  suffix?: string;
};

export function buildUploadObjectKey(input: BuildUploadObjectKeyInput) {
  const policy = getUploadPolicy(input.surface);
  const extension = input.extension.replace(/^\./, "");
  const baseName = `${safeUploadName(input.fileName, policy.kind === "image" ? "image" : "attachment")}-${input.suffix ?? randomUUID()}`;
  const pathSegments = [input.workspaceId, input.userId];

  if (policy.keyPrefix) {
    if (!input.targetEntityId) throw new Error(`${input.surface} upload keys require a target entity id.`);
    pathSegments.push(policy.keyPrefix, input.targetEntityId);
  }

  pathSegments.push(`${baseName}.${extension}`);
  return pathSegments.join("/");
}

