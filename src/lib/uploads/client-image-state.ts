import {
  IDLE_UPLOAD_CLIENT_STATE,
  isUploadClientBusy,
  reduceUploadClientState,
  type UploadClientState,
} from "./client-state";
import type {
  MaterialImageAssetDescriptor,
  MaterialImageUploadResult,
} from "./material-image-contract";

export type MaterialImageClientPhase =
  | "idle"
  | "selection_error"
  | "selected"
  | "uploading"
  | "upload_error"
  | "cancelled"
  | "uploaded"
  | "saving"
  | "save_error"
  | "saved"
  | "removing"
  | "remove_error";

export type MaterialImageClientIssue = {
  phase: "selection" | "upload" | "save" | "remove";
  message: string;
  retryable: boolean;
};

export type MaterialImageClientState = {
  phase: MaterialImageClientPhase;
  transportState: UploadClientState;
  file: File | null;
  previewUrl: string | null;
  uploadResult: MaterialImageUploadResult | null;
  descriptor: MaterialImageAssetDescriptor | null;
  issue: MaterialImageClientIssue | null;
};

export const IDLE_MATERIAL_IMAGE_CLIENT_STATE: MaterialImageClientState = {
  phase: "idle",
  transportState: IDLE_UPLOAD_CLIENT_STATE,
  file: null,
  previewUrl: null,
  uploadResult: null,
  descriptor: null,
  issue: null,
};

export type MaterialImageClientAction =
  | { type: "reset" }
  | { type: "selection-error"; message: string }
  | { type: "select"; file: File; previewUrl: string }
  | { type: "upload-start" }
  | { type: "upload-success"; result: MaterialImageUploadResult; descriptor: MaterialImageAssetDescriptor }
  | { type: "upload-error"; message: string; retryable: boolean }
  | { type: "upload-cancelled"; message?: string }
  | { type: "save-start" }
  | { type: "save-success" }
  | { type: "save-error"; message: string; retryable: boolean }
  | { type: "remove-start" }
  | { type: "remove-success" }
  | { type: "remove-error"; message: string; retryable: boolean };

export function reduceMaterialImageClientState(
  state: MaterialImageClientState,
  action: MaterialImageClientAction,
): MaterialImageClientState {
  switch (action.type) {
    case "reset":
    case "remove-success":
      return IDLE_MATERIAL_IMAGE_CLIENT_STATE;
    case "selection-error":
      return {
        ...state,
        phase: state.phase === "idle" ? "selection_error" : state.phase,
        transportState: reduceUploadClientState(state.transportState, {
          type: "blocking-error",
          message: action.message,
        }),
        issue: { phase: "selection", message: action.message, retryable: false },
      };
    case "select":
      return {
        phase: "selected",
        transportState: reduceUploadClientState(state.transportState, {
          type: "select",
          message: `${action.file.name} selected.`,
        }),
        file: action.file,
        previewUrl: action.previewUrl,
        uploadResult: null,
        descriptor: null,
        issue: null,
      };
    case "upload-start":
      return {
        ...state,
        phase: "uploading",
        transportState: reduceUploadClientState(state.transportState, {
          type: "uploading",
          message: "Uploading image.",
        }),
        issue: null,
      };
    case "upload-success":
      return {
        ...state,
        phase: "uploaded",
        transportState: reduceUploadClientState(state.transportState, {
          type: "uploaded",
          message: "Image uploaded. Ready to save.",
        }),
        uploadResult: action.result,
        descriptor: action.descriptor,
        issue: null,
      };
    case "upload-error":
      return {
        ...state,
        phase: "upload_error",
        transportState: reduceUploadClientState(state.transportState, {
          type: action.retryable ? "retryable-error" : "blocking-error",
          message: action.message,
        }),
        uploadResult: null,
        descriptor: null,
        issue: { phase: "upload", message: action.message, retryable: action.retryable },
      };
    case "upload-cancelled":
      return {
        ...state,
        phase: "cancelled",
        transportState: reduceUploadClientState(state.transportState, {
          type: "cancelled",
          message: action.message,
        }),
        uploadResult: null,
        descriptor: null,
        issue: {
          phase: "upload",
          message: action.message ?? "Upload cancelled.",
          retryable: true,
        },
      };
    case "save-start":
      return {
        ...state,
        phase: "saving",
        transportState: reduceUploadClientState(state.transportState, {
          type: "finalizing",
          message: "Saving image.",
        }),
        issue: null,
      };
    case "save-success":
      return {
        ...state,
        phase: "saved",
        transportState: reduceUploadClientState(state.transportState, {
          type: "saved",
          message: "Image saved.",
        }),
        previewUrl: null,
        issue: null,
      };
    case "save-error":
      return {
        ...state,
        phase: "save_error",
        transportState: reduceUploadClientState(state.transportState, {
          type: action.retryable ? "retryable-error" : "blocking-error",
          message: action.message,
        }),
        issue: { phase: "save", message: action.message, retryable: action.retryable },
      };
    case "remove-start":
      return {
        ...state,
        phase: "removing",
        transportState: reduceUploadClientState(state.transportState, {
          type: "removing",
          message: "Removing image.",
        }),
        issue: null,
      };
    case "remove-error":
      return {
        ...state,
        phase: "remove_error",
        transportState: reduceUploadClientState(state.transportState, {
          type: "remove-failed",
          message: action.message,
        }),
        issue: { phase: "remove", message: action.message, retryable: action.retryable },
      };
  }
}

export function isMaterialImageClientBusy(state: MaterialImageClientState) {
  return isUploadClientBusy(state.transportState);
}

export function canRetryMaterialImageUpload(state: MaterialImageClientState) {
  return Boolean(
    state.file
    && !state.descriptor
    && state.issue?.phase === "upload"
    && state.issue.retryable,
  );
}

export function canRetryMaterialImageSave(state: MaterialImageClientState) {
  return Boolean(
    state.descriptor
    && state.phase === "save_error"
    && state.issue?.phase === "save"
    && state.issue.retryable,
  );
}
