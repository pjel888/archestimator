"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  canRetryMaterialImageSave,
  canRetryMaterialImageUpload,
  IDLE_MATERIAL_IMAGE_CLIENT_STATE,
  isMaterialImageClientBusy,
  reduceMaterialImageClientState,
} from "@/lib/uploads/client-image-state";
import {
  admitMaterialImageFile,
  createMaterialImageUploadAttemptId,
  uploadOriginalMaterialImage,
  type MaterialImageClientUploadSuccess,
  type MaterialImageUploadFields,
} from "@/lib/uploads/client-image-upload";
import {
  getUploadClientErrorMessage,
  isUploadAbortError,
  UploadClientError,
} from "@/lib/uploads/client-upload";
import type { MaterialImageAssetDescriptor } from "@/lib/uploads/material-image-contract";

type MaybeFactory<T> = T | (() => T);

type MaterialImageObjectUrlApi = {
  create: (file: File) => string;
  revoke: (url: string) => void;
};

export type UseMaterialImageUploadOptions = {
  endpoint: MaybeFactory<string>;
  fields?: MaybeFactory<MaterialImageUploadFields>;
  timeoutMs?: number;
  uploadImage?: typeof uploadOriginalMaterialImage;
  saveDescriptor?: (descriptor: MaterialImageAssetDescriptor) => Promise<void>;
  cleanupProvisionalDescriptor?: (descriptor: MaterialImageAssetDescriptor) => Promise<void>;
  removeSavedDescriptor?: (descriptor: MaterialImageAssetDescriptor) => Promise<void>;
  objectUrls?: MaterialImageObjectUrlApi;
};

function resolveFactory<T>(value: MaybeFactory<T>): T {
  return typeof value === "function" ? (value as () => T)() : value;
}

function retryableFromError(error: unknown) {
  if (error instanceof UploadClientError) return error.retryable;
  if (error && typeof error === "object" && "retryable" in error) {
    return (error as { retryable?: unknown }).retryable !== false;
  }
  return true;
}

export function useMaterialImageUpload(options: UseMaterialImageUploadOptions) {
  const [state, dispatch] = useReducer(
    reduceMaterialImageClientState,
    IDLE_MATERIAL_IMAGE_CLIENT_STATE,
  );
  const stateRef = useRef(state);
  const optionsRef = useRef(options);
  const abortControllerRef = useRef<AbortController | null>(null);
  const savingRef = useRef(false);
  const operationIdRef = useRef(0);
  const uploadAttemptIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const objectUrlApi = useCallback((): MaterialImageObjectUrlApi => (
    optionsRef.current.objectUrls ?? {
      create: (file) => URL.createObjectURL(file),
      revoke: (url) => URL.revokeObjectURL(url),
    }
  ), []);

  const revokePreview = useCallback((previewUrl: string | null) => {
    if (previewUrl) objectUrlApi().revoke(previewUrl);
  }, [objectUrlApi]);

  const invalidateUpload = useCallback(() => {
    operationIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const cleanupProvisional = useCallback(async (descriptor: MaterialImageAssetDescriptor) => {
    const cleanup = optionsRef.current.cleanupProvisionalDescriptor;
    if (!cleanup) throw new Error("Provisional image cleanup is unavailable.");
    await cleanup(descriptor);
  }, []);

  const selectFile = useCallback(async (file: File) => {
    const current = stateRef.current;
    if (current.phase === "uploading" || current.phase === "saving" || current.phase === "removing") {
      return false;
    }
    const admission = admitMaterialImageFile(file);
    if (!admission.ok) {
      dispatch({ type: "selection-error", message: admission.error.message });
      return false;
    }

    if (current.descriptor && current.phase !== "saved") {
      dispatch({ type: "remove-start" });
      try {
        await cleanupProvisional(current.descriptor);
      } catch (error) {
        dispatch({
          type: "remove-error",
          message: getUploadClientErrorMessage(error, "Could not discard the previous image."),
          retryable: retryableFromError(error),
        });
        return false;
      }
    }

    invalidateUpload();
    revokePreview(current.previewUrl);
    const previewUrl = objectUrlApi().create(file);
    uploadAttemptIdRef.current = createMaterialImageUploadAttemptId();
    dispatch({ type: "select", file, previewUrl });
    return true;
  }, [cleanupProvisional, invalidateUpload, objectUrlApi, revokePreview]);

  const startUpload = useCallback(async (): Promise<MaterialImageClientUploadSuccess | null> => {
    const current = stateRef.current;
    if (!current.file || current.descriptor || current.phase === "uploading" || abortControllerRef.current) {
      return null;
    }

    invalidateUpload();
    const operationId = operationIdRef.current;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    dispatch({ type: "upload-start" });

    try {
      const currentOptions = optionsRef.current;
      const uploadImage = currentOptions.uploadImage ?? uploadOriginalMaterialImage;
      const uploaded = await uploadImage({
        endpoint: resolveFactory(currentOptions.endpoint),
        file: current.file,
        fields: {
          ...(currentOptions.fields ? resolveFactory(currentOptions.fields) : {}),
          uploadAttemptId: uploadAttemptIdRef.current ?? createMaterialImageUploadAttemptId(),
        },
        signal: abortController.signal,
        timeoutMs: currentOptions.timeoutMs,
      });
      if (!mountedRef.current || operationId !== operationIdRef.current) {
        await currentOptions.cleanupProvisionalDescriptor?.(uploaded.descriptor).catch(() => undefined);
        return null;
      }
      abortControllerRef.current = null;
      dispatch({ type: "upload-success", result: uploaded.result, descriptor: uploaded.descriptor });
      return uploaded;
    } catch (error) {
      if (!mountedRef.current || operationId !== operationIdRef.current) return null;
      abortControllerRef.current = null;
      if (isUploadAbortError(error)) {
        dispatch({ type: "upload-cancelled" });
      } else {
        dispatch({
          type: "upload-error",
          message: getUploadClientErrorMessage(error, "Could not upload image."),
          retryable: retryableFromError(error),
        });
      }
      return null;
    }
  }, [invalidateUpload]);

  const retryUpload = useCallback(async () => {
    if (!canRetryMaterialImageUpload(stateRef.current)) return null;
    return startUpload();
  }, [startUpload]);

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const save = useCallback(async () => {
    const current = stateRef.current;
    const saveDescriptor = optionsRef.current.saveDescriptor;
    if (!current.descriptor || !saveDescriptor || current.phase === "saving" || savingRef.current) return false;

    savingRef.current = true;
    dispatch({ type: "save-start" });
    try {
      await saveDescriptor(current.descriptor);
      if (!mountedRef.current) return false;
      revokePreview(current.previewUrl);
      dispatch({ type: "save-success" });
      return true;
    } catch (error) {
      if (!mountedRef.current) return false;
      dispatch({
        type: "save-error",
        message: getUploadClientErrorMessage(error, "Could not save image."),
        retryable: retryableFromError(error),
      });
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [revokePreview]);

  const retrySave = useCallback(async () => {
    if (!canRetryMaterialImageSave(stateRef.current)) return false;
    return save();
  }, [save]);

  const markSaved = useCallback(() => {
    const current = stateRef.current;
    if (!current.descriptor) return false;
    revokePreview(current.previewUrl);
    dispatch({ type: "save-success" });
    return true;
  }, [revokePreview]);

  const remove = useCallback(async () => {
    const current = stateRef.current;
    invalidateUpload();
    if (!current.descriptor) {
      revokePreview(current.previewUrl);
      dispatch({ type: "reset" });
      return true;
    }

    const removeDescriptor = current.phase === "saved"
      ? optionsRef.current.removeSavedDescriptor
      : optionsRef.current.cleanupProvisionalDescriptor;
    if (!removeDescriptor) {
      dispatch({
        type: "remove-error",
        message: "Image removal is unavailable.",
        retryable: false,
      });
      return false;
    }

    dispatch({ type: "remove-start" });
    try {
      await removeDescriptor(current.descriptor);
      if (!mountedRef.current) return false;
      revokePreview(current.previewUrl);
      dispatch({ type: "remove-success" });
      return true;
    } catch (error) {
      if (!mountedRef.current) return false;
      dispatch({
        type: "remove-error",
        message: getUploadClientErrorMessage(error, "Could not remove image."),
        retryable: retryableFromError(error),
      });
      return false;
    }
  }, [invalidateUpload, revokePreview]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      savingRef.current = false;
      invalidateUpload();
      const current = stateRef.current;
      revokePreview(current.previewUrl);
      if (current.descriptor && current.phase !== "saved") {
        void optionsRef.current.cleanupProvisionalDescriptor?.(current.descriptor).catch(() => undefined);
      }
    };
  }, [invalidateUpload, revokePreview]);

  return {
    state,
    isBusy: isMaterialImageClientBusy(state),
    canRetryUpload: canRetryMaterialImageUpload(state),
    canRetrySave: canRetryMaterialImageSave(state),
    selectFile,
    startUpload,
    retryUpload,
    cancelUpload,
    save,
    retrySave,
    markSaved,
    remove,
  };
}
