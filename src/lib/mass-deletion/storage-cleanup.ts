import type { UploadStorageProvider } from "@/lib/uploads/storage-provider";
import type { Json } from "@/lib/types/json";

import type { StorageCleanupReport, StorageCleanupTarget } from "./bulk-action";

const PROJECT_IMAGE_BUCKET = "project-images";
const COMPONENT_IMAGE_BUCKET = "component-images";
const COMPONENT_ATTACHMENT_BUCKET = "component-attachments";
const STORAGE_REMOVE_CHUNK_SIZE = 100;

function isSafeStoragePath(path: string) {
  return Boolean(path && path.trim() === path && !path.startsWith("/") && !path.includes("..") && !path.includes("//"));
}

function getWorkspacePrefix(path: string) {
  return path.split("/")[0] ?? "";
}

function dedupeTargets(targets: StorageCleanupTarget[]) {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.bucket}:${target.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isAllowedProjectImageCleanupTarget(target: StorageCleanupTarget) {
  return target.bucket === PROJECT_IMAGE_BUCKET
    && target.path.endsWith(".webp")
    && target.path.includes("/project-images/")
    && isSafeStoragePath(target.path);
}

export function isAllowedComponentImageCleanupTarget(target: StorageCleanupTarget, workspaceId: string) {
  return target.bucket === COMPONENT_IMAGE_BUCKET
    && target.path.endsWith(".webp")
    && getWorkspacePrefix(target.path) === workspaceId
    && isSafeStoragePath(target.path);
}

export function isAllowedComponentAttachmentCleanupTarget(target: StorageCleanupTarget, workspaceId: string) {
  return target.bucket === COMPONENT_ATTACHMENT_BUCKET
    && getWorkspacePrefix(target.path) === workspaceId
    && isSafeStoragePath(target.path);
}

export function splitAllowedStorageCleanupTargets(
  targets: readonly StorageCleanupTarget[] | undefined,
  options:
    | { kind: "project" }
    | { kind: "component"; workspaceId: string },
) {
  const allowed: StorageCleanupTarget[] = [];
  const rejected: StorageCleanupTarget[] = [];

  for (const target of dedupeTargets([...(targets ?? [])])) {
    const accepted = options.kind === "project"
      ? isAllowedProjectImageCleanupTarget(target)
      : isAllowedComponentImageCleanupTarget(target, options.workspaceId)
        || isAllowedComponentAttachmentCleanupTarget(target, options.workspaceId);

    if (accepted) allowed.push(target);
    else rejected.push(target);
  }

  return { allowed, rejected };
}

export async function cleanupStorageTargets(
  storageProvider: Pick<UploadStorageProvider, "removeObjects">,
  targets: readonly StorageCleanupTarget[] | undefined,
  options:
    | { kind: "project" }
    | { kind: "component"; workspaceId: string },
): Promise<StorageCleanupReport> {
  const { allowed, rejected } = splitAllowedStorageCleanupTargets(targets, options);
  const removed: StorageCleanupTarget[] = [];
  const failed: Array<StorageCleanupTarget & { message: string }> = [];
  const targetsByBucket = new Map<string, string[]>();

  for (const target of allowed) {
    targetsByBucket.set(target.bucket, [...(targetsByBucket.get(target.bucket) ?? []), target.path]);
  }

  for (const [bucket, paths] of targetsByBucket.entries()) {
    for (let index = 0; index < paths.length; index += STORAGE_REMOVE_CHUNK_SIZE) {
      const chunk = paths.slice(index, index + STORAGE_REMOVE_CHUNK_SIZE);
      try {
        await storageProvider.removeObjects(bucket, chunk);
        removed.push(...chunk.map((path) => ({ bucket, path })));
      } catch (error) {
        failed.push(...chunk.map((path) => ({
          bucket,
          path,
          message: error instanceof Error ? error.message : "Storage cleanup failed.",
        })));
      }
    }
  }

  return { removed, rejected, failed };
}

export function storageCleanupReportToJson(report: StorageCleanupReport): Json {
  return report as unknown as Json;
}
