import { toUserFacingErrorMessage } from "@/lib/observability/user-facing-error";

export type UploadClientErrorKind = "aborted" | "timeout" | "http" | "network" | "invalid-response";

export class UploadClientError extends Error {
  readonly kind: UploadClientErrorKind;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(message: string, options: { kind: UploadClientErrorKind; retryable: boolean; status?: number }) {
    super(message);
    this.name = "UploadClientError";
    this.kind = options.kind;
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

type LinkedAbortSignal = {
  signal: AbortSignal;
  cleanup: () => void;
};

type PostUploadFormDataOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  fallbackMessage?: string;
  timeoutMessage?: string;
};

const DEFAULT_UPLOAD_TIMEOUT_MS = 45_000;

function isAbortLikeError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function linkAbortSignals(signals: AbortSignal[]): LinkedAbortSignal {
  const controller = new AbortController();
  const listeners: Array<() => void> = [];

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    listeners.push(() => signal.removeEventListener("abort", abort));
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const cleanup of listeners) cleanup();
    },
  };
}

async function readUploadErrorMessage(response: Response, fallbackMessage: string) {
  const result = await response.json().catch(() => null);
  const serverMessage = result && typeof result.error === "string" ? result.error : fallbackMessage;
  return toUserFacingErrorMessage(new Error(serverMessage), fallbackMessage);
}

export function isUploadAbortError(error: unknown) {
  return error instanceof UploadClientError && error.kind === "aborted";
}

export function getUploadClientErrorMessage(error: unknown, fallbackMessage: string) {
  return toUserFacingErrorMessage(error, fallbackMessage);
}

export async function postUploadFormData<T>(
  url: string,
  formData: FormData,
  options: PostUploadFormDataOptions = {},
): Promise<T> {
  const fallbackMessage = options.fallbackMessage ?? "Could not upload file.";
  const timeoutMessage = options.timeoutMessage ?? "Upload timed out. Try again.";
  const timeoutController = new AbortController();
  let didTimeout = false;
  const timeoutId = window.setTimeout(() => {
    didTimeout = true;
    timeoutController.abort();
  }, options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS);
  const linked = linkAbortSignals([timeoutController.signal, ...(options.signal ? [options.signal] : [])]);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: linked.signal,
    });

    if (!response.ok) {
      const message = await readUploadErrorMessage(response, fallbackMessage);
      throw new UploadClientError(message, {
        kind: "http",
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        status: response.status,
      });
    }

    const result = await response.json().catch(() => {
      throw new UploadClientError("Upload response was not valid JSON.", {
        kind: "invalid-response",
        retryable: true,
      });
    });
    return result as T;
  } catch (error) {
    if (error instanceof UploadClientError) throw error;
    if (didTimeout) {
      throw new UploadClientError(timeoutMessage, {
        kind: "timeout",
        retryable: true,
      });
    }
    if (isAbortLikeError(error) || linked.signal.aborted || options.signal?.aborted) {
      throw new UploadClientError("Upload cancelled.", {
        kind: "aborted",
        retryable: true,
      });
    }
    throw new UploadClientError(getUploadClientErrorMessage(error, fallbackMessage), {
      kind: "network",
      retryable: true,
    });
  } finally {
    window.clearTimeout(timeoutId);
    linked.cleanup();
  }
}
