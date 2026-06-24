"use client";

import {
  CheckCircle,
  CircleNotch,
  Info,
  WarningCircle,
  X,
} from "@phosphor-icons/react/dist/ssr";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/ui/cn";
import { Button } from "./button";

type ToastTone = "neutral" | "loading" | "success" | "error";

type ToastRecord = {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs: number | null;
  action?: ToastAction;
};

type ToastInput = {
  id?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number | null;
  action?: ToastAction;
};

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
};

type ToastProviderProps = {
  children: ReactNode;
  viewportClassName?: string;
};

const DEFAULT_TOAST_DURATION_MS = 3200;
const ERROR_TOAST_DURATION_MS = 5200;
const SUCCESS_TOAST_DURATION_MS = 2400;
const MAX_VISIBLE_TOASTS = 4;

const noopToastContext: ToastContextValue = {
  toast: (input) => input.id ?? "toast-unavailable",
  dismissToast: () => undefined,
  clearToasts: () => undefined,
};

const ToastContext = createContext<ToastContextValue>(noopToastContext);

function getDefaultDuration(tone: ToastTone) {
  if (tone === "loading") return null;
  if (tone === "success") return SUCCESS_TOAST_DURATION_MS;
  if (tone === "error") return ERROR_TOAST_DURATION_MS;
  return DEFAULT_TOAST_DURATION_MS;
}

function makeToastId() {
  return `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "loading") return <CircleNotch size={13} weight="regular" className="animate-spin" aria-hidden="true" />;
  if (tone === "success") return <CheckCircle size={13} weight="regular" aria-hidden="true" />;
  if (tone === "error") return <WarningCircle size={13} weight="regular" aria-hidden="true" />;
  return <Info size={13} weight="regular" aria-hidden="true" />;
}

function toastToneClassName(tone: ToastTone) {
  if (tone === "success") return "border-successSoft bg-white text-success shadow-[0_8px_24px_rgba(21,128,61,0.12)]";
  if (tone === "error") return "border-dangerSoft bg-white text-danger shadow-[0_8px_24px_rgba(185,28,28,0.14)]";
  if (tone === "loading") return "border-accentSoft bg-white text-warning shadow-[0_8px_24px_rgba(255,122,26,0.12)]";
  return "border-hairline bg-white text-ink shadow-[0_8px_24px_rgba(17,17,17,0.10)]";
}

export function ToastProvider({ children, viewportClassName }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(null!);
  if (timersRef.current === null) timersRef.current = new Map();

  const clearToastTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (!timer) return;
    clearTimeout(timer);
    timersRef.current.delete(id);
  }, []);

  const dismissToast = useCallback((id: string) => {
    clearToastTimer(id);
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, [clearToastTimer]);

  const scheduleDismiss = useCallback((id: string, durationMs: number | null) => {
    clearToastTimer(id);
    if (durationMs === null) return;
    timersRef.current.set(
      id,
      setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
      }, durationMs),
    );
  }, [clearToastTimer]);

  const toast = useCallback((input: ToastInput) => {
    const id = input.id ?? makeToastId();
    const tone = input.tone ?? "neutral";
    const durationMs = input.durationMs === undefined ? getDefaultDuration(tone) : input.durationMs;
    const nextToast: ToastRecord = {
      id,
      message: input.message,
      tone,
      durationMs,
      action: input.action,
    };

    setToasts((currentToasts) => {
      const withoutExistingToast = currentToasts.filter((toastRecord) => toastRecord.id !== id);
      return [nextToast, ...withoutExistingToast].slice(0, MAX_VISIBLE_TOASTS);
    });
    scheduleDismiss(id, durationMs);
    return id;
  }, [scheduleDismiss]);

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast, dismissToast, clearToasts }), [clearToasts, dismissToast, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Notifications"
        data-toast-viewport="true"
        className={cn(
          "pointer-events-none fixed bottom-3 left-1/2 z-[100] flex w-[min(320px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-1",
          viewportClassName,
        )}
      >
        {toasts.map((toastRecord) => (
          <div
            key={toastRecord.id}
            role={toastRecord.tone === "error" ? "alert" : "status"}
            aria-live={toastRecord.tone === "error" ? "assertive" : "polite"}
            data-toast-id={toastRecord.id}
            className={cn(
              "pointer-events-auto flex min-h-8 items-start gap-1.5 rounded-xs border px-2 py-1.5 text-[10px] font-medium leading-4",
              toastToneClassName(toastRecord.tone),
            )}
          >
            <span className="mt-0.5 shrink-0" aria-hidden="true">
              <ToastIcon tone={toastRecord.tone} />
            </span>
            <span className="min-w-0 flex-1 break-words">{toastRecord.message}</span>
            {toastRecord.action ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-my-0.5 h-6 min-h-0 shrink-0 rounded-xs px-1.5 text-[10px] font-medium text-current hover:bg-black/5 hover:text-current focus-visible:ring-current focus-visible:ring-offset-0"
                onClick={() => {
                  toastRecord.action?.onClick();
                  dismissToast(toastRecord.id);
                }}
              >
                {toastRecord.action.label}
              </Button>
            ) : null}
            {toastRecord.tone === "loading" ? null : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Dismiss notification"
                className="-mr-1 -mt-0.5 size-5 min-h-0 shrink-0 rounded-xs text-current hover:bg-black/5 hover:text-current focus-visible:ring-current focus-visible:ring-offset-0"
                onClick={() => dismissToast(toastRecord.id)}
              >
                <X size={10} weight="regular" aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return use(ToastContext);
}

export type { ToastAction, ToastInput, ToastTone };
