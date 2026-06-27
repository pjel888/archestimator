export type UploadClientState =
  | { state: "idle"; message: "" }
  | { state: "selected"; message: string }
  | { state: "validating"; message: string }
  | { state: "processing"; message: string }
  | { state: "uploading"; message: string; progress?: number }
  | { state: "finalizing"; message: string }
  | { state: "uploaded"; message: string }
  | { state: "saved"; message: string }
  | { state: "retryable_error"; message: string }
  | { state: "blocking_error"; message: string }
  | { state: "cancelled"; message: string }
  | { state: "removing"; message: string }
  | { state: "remove_failed"; message: string };

export type UploadClientAction =
  | { type: "reset" }
  | { type: "select"; message: string }
  | { type: "validating"; message: string }
  | { type: "processing"; message: string }
  | { type: "uploading"; message: string; progress?: number }
  | { type: "finalizing"; message: string }
  | { type: "uploaded"; message: string }
  | { type: "saved"; message: string }
  | { type: "retryable-error"; message: string }
  | { type: "blocking-error"; message: string }
  | { type: "cancelled"; message?: string }
  | { type: "removing"; message: string }
  | { type: "remove-failed"; message: string };

export const IDLE_UPLOAD_CLIENT_STATE: UploadClientState = { state: "idle", message: "" };

export function reduceUploadClientState(_state: UploadClientState, action: UploadClientAction): UploadClientState {
  switch (action.type) {
    case "reset":
      return IDLE_UPLOAD_CLIENT_STATE;
    case "select":
      return { state: "selected", message: action.message };
    case "validating":
      return { state: "validating", message: action.message };
    case "processing":
      return { state: "processing", message: action.message };
    case "uploading":
      return { state: "uploading", message: action.message, progress: action.progress };
    case "finalizing":
      return { state: "finalizing", message: action.message };
    case "uploaded":
      return { state: "uploaded", message: action.message };
    case "saved":
      return { state: "saved", message: action.message };
    case "retryable-error":
      return { state: "retryable_error", message: action.message };
    case "blocking-error":
      return { state: "blocking_error", message: action.message };
    case "cancelled":
      return { state: "cancelled", message: action.message ?? "Upload cancelled." };
    case "removing":
      return { state: "removing", message: action.message };
    case "remove-failed":
      return { state: "remove_failed", message: action.message };
  }
}

export function isUploadClientBusy(state: UploadClientState) {
  return state.state === "validating" || state.state === "processing" || state.state === "uploading" || state.state === "finalizing" || state.state === "removing";
}

export function isUploadClientRetryable(state: UploadClientState) {
  return state.state === "retryable_error" || state.state === "cancelled" || state.state === "remove_failed";
}

export function getUploadClientStatusRole(state: UploadClientState): "status" | "alert" {
  return state.state === "retryable_error" || state.state === "blocking_error" || state.state === "remove_failed" ? "alert" : "status";
}
