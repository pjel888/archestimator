"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type RefObject } from "react";
import { Paperclip, WarningCircle, X } from "@phosphor-icons/react/dist/ssr";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ControlField, ControlTextarea } from "@/components/ui/control-input";
import { cn } from "@/lib/ui/cn";

import type { SupportDraft, SupportScreenshot } from "./support-center-types";

const SCREENSHOT_LIMIT = 3 * 1024 * 1024;
const SCREENSHOT_MAX_EDGE = 4_096;
const SCREENSHOT_MAX_PIXELS = 24_000_000;
const ALLOWED_SCREENSHOT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function validateScreenshot(file: File): Promise<SupportScreenshot> {
  if (file.size <= 0) throw new Error("The screenshot is empty. Choose another image.");
  if (file.size > SCREENSHOT_LIMIT) throw new Error("The screenshot is larger than 3 MiB. Choose a smaller image.");
  if (!ALLOWED_SCREENSHOT_TYPES.has(file.type.toLowerCase())) {
    throw new Error("Choose a JPG, PNG, or WebP screenshot.");
  }

  const previewUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ height: number; width: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth });
      image.onerror = () => reject(new Error("The screenshot could not be decoded. Choose another image."));
      image.src = previewUrl;
    });
    if (
      dimensions.width > SCREENSHOT_MAX_EDGE
      || dimensions.height > SCREENSHOT_MAX_EDGE
      || dimensions.width * dimensions.height > SCREENSHOT_MAX_PIXELS
    ) {
      throw new Error("The screenshot is too large to process. Keep each edge at 4,096 pixels or less.");
    }
    return { file, previewUrl };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

type SupportMessageComposerProps = {
  draft: SupportDraft;
  initialFocus?: boolean;
  isOnline: boolean;
  kind: "new" | "reply";
  onChange: (update: (draft: SupportDraft) => SupportDraft) => void;
  onRemoveScreenshot: () => void;
  onRetry: () => void;
  onScreenshot: (screenshot: SupportScreenshot | null, error?: string | null) => Promise<void>;
  onSend: () => void;
  onSendWithoutScreenshot: () => void;
  onStartNewAttempt: () => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

export function SupportMessageComposer({
  draft,
  initialFocus = false,
  isOnline,
  kind,
  onChange,
  onRemoveScreenshot,
  onRetry,
  onScreenshot,
  onSend,
  onSendWithoutScreenshot,
  onStartNewAttempt,
  textareaRef,
}: SupportMessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionVersionRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const locked = ["sending", "pending", "uncertain", "conflict", "screenshot_error", "rate_limited"].includes(draft.phase);
  const screenshotLocked = (locked && draft.phase !== "screenshot_error") || draft.screenshotReplacementPending;
  const canSend = isOnline
    && !locked
    && !draft.screenshotReplacementPending
    && draft.message.trim().length >= 2
    && draft.message.trim().length <= 4_000;

  useEffect(() => () => {
    selectionVersionRef.current += 1;
  }, []);

  async function selectFiles(files: File[]) {
    if (screenshotLocked || files.length === 0) return;
    if (files.length > 1) {
      await onScreenshot(null, "Attach one screenshot at a time.");
      fileInputRef.current?.focus();
      return;
    }

    const version = ++selectionVersionRef.current;
    const file = files[0];
    if (!file) return;
    let screenshot: SupportScreenshot | null = null;
    try {
      screenshot = await validateScreenshot(file);
      if (selectionVersionRef.current !== version) {
        URL.revokeObjectURL(screenshot.previewUrl);
        return;
      }
      await onScreenshot(screenshot, null);
    } catch (error) {
      if (selectionVersionRef.current !== version) return;
      if (screenshot) URL.revokeObjectURL(screenshot.previewUrl);
      await onScreenshot(null, error instanceof Error ? error.message : "The screenshot could not be used.");
      fileInputRef.current?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    const files = Array.from(event.clipboardData.files ?? []);
    if (files.length === 0) return;
    event.preventDefault();
    void selectFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    void selectFiles(Array.from(event.dataTransfer.files ?? []));
  }

  const isScreenshotFailure = draft.phase === "screenshot_error";
  const isRetryState = draft.phase === "pending"
    || draft.phase === "uncertain"
    || draft.phase === "rate_limited"
    || draft.phase === "screenshot_error";
  const progressCopy = draft.screenshotReplacementPending
    ? "Checking the previous screenshot attempt before replacing it…"
    : draft.phase === "sending"
    ? draft.screenshot
      ? "Uploading screenshot and sending your message…"
      : "Sending your message…"
    : draft.phase === "pending"
      ? `Still saving. Try again${draft.retryAfterSeconds ? ` in ${draft.retryAfterSeconds} seconds` : " in a moment"}.`
      : !isOnline
        ? "You are offline. Send when your connection returns."
        : null;

  return (
    <form
      className="flex min-h-0 flex-col gap-3"
      onPaste={handlePaste}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <ControlField
        label={kind === "new" ? "How can we help?" : "Reply"}
        required
        helperText={`${draft.message.length.toLocaleString()} / 4,000 characters`}
        errorText={draft.message.length > 0 && draft.message.trim().length < 2 ? "Enter at least 2 characters." : undefined}
      >
        <ControlTextarea
          ref={textareaRef}
          value={draft.message}
          minLength={2}
          maxLength={4_000}
          rows={kind === "new" ? 7 : 4}
          required
          disabled={locked || draft.screenshotReplacementPending}
          data-dialog-initial-focus={initialFocus ? "true" : undefined}
          placeholder="Tell us what happened or what you need help with."
          className={cn("min-h-24 resize-y", kind === "new" && "min-h-32")}
          onChange={(event) => onChange((current) => ({
            ...current,
            error: null,
            message: event.currentTarget.value,
            phase: current.phase === "offline" ? "idle" : current.phase,
          }))}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              if (canSend) onSend();
            }
          }}
        />
      </ControlField>

      <div
        className={cn(
          "rounded-xs border border-dashed p-2 transition",
          dragActive ? "border-ink bg-surfaceMuted" : "border-hairline bg-white",
          draft.fileError && "border-danger bg-dangerSoft/20",
        )}
        role="group"
        aria-labelledby={`${kind}-support-screenshot-label`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!screenshotLocked) setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p id={`${kind}-support-screenshot-label`} className="text-[10px] font-medium leading-4 text-ink">
              Add a screenshot <span className="font-normal text-tertiary">(recommended)</span>
            </p>
            <p className="text-[10px] leading-4 text-tertiary">Pick, paste, or drop one JPG, PNG, or WebP up to 3 MiB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={screenshotLocked}
            onChange={(event) => {
              void selectFiles(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          <Button type="button" size="sm" variant="secondary" disabled={screenshotLocked} onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={12} weight="regular" aria-hidden="true" />
            {draft.screenshot ? "Replace screenshot" : "Choose screenshot"}
          </Button>
        </div>

        {draft.screenshot ? (
          <div className="mt-2 grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2 border-t border-hairline pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL preview is revoked on replace, remove, success, and unmount. */}
            <img src={draft.screenshot.previewUrl} alt="Screenshot preview" className="h-12 w-[72px] rounded-xs border border-hairline object-cover" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium leading-4 text-ink">support-screenshot.webp</p>
              <p className="text-[10px] leading-4 text-tertiary">Source size {formatBytes(draft.screenshot.file.size)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove support-screenshot.webp"
              title="Remove screenshot"
              disabled={locked}
              onClick={onRemoveScreenshot}
            >
              <X size={12} weight="regular" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
        {draft.fileError ? <p role="alert" className="mt-2 text-[10px] leading-4 text-danger">{draft.fileError}</p> : null}
      </div>

      <details className="rounded-xs border border-hairline bg-surfaceMuted/50 px-2 py-1.5">
        <summary className="cursor-pointer text-[10px] font-medium leading-4 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          Included details
        </summary>
        <div className="mt-2 space-y-2 border-t border-hairline pt-2 text-[10px] leading-4 text-secondary">
          <p>Your signed-in account, send time, a private request reference, and a sanitized route are always included.</p>
          <Checkbox
            checked={draft.diagnosticsShared}
            disabled={locked}
            onChange={(event) => onChange((current) => ({ ...current, diagnosticsShared: event.currentTarget.checked, error: null }))}
            label="Include current workspace and device details for this message"
          />
          <p className="text-tertiary">When enabled, Archestimator may include validated project or estimate references, viewport, timezone, browser/OS family, and app release. This choice applies only to this message.</p>
        </div>
      </details>

      <div className="space-y-1 text-[10px] leading-4 text-tertiary">
        <p>Do not include client secrets or unrelated sensitive information in your message or screenshot.</p>
        <p>After sending, the screenshot stays with the private support record until authorized retention handling or a verified privacy erasure.</p>
      </div>

      {progressCopy ? <p role="status" aria-live="polite" className="text-[10px] leading-4 text-secondary">{progressCopy}</p> : null}
      {draft.error ? (
        <Alert
          tone={draft.phase === "uncertain" || draft.phase === "pending" ? "warning" : "danger"}
          icon={<WarningCircle size={14} weight="regular" aria-hidden="true" />}
          title={draft.phase === "uncertain" ? "Result not confirmed" : "Message not sent"}
          description={draft.error}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {isScreenshotFailure && draft.screenshot ? (
          <Button type="button" size="sm" variant="secondary" disabled={draft.screenshotReplacementPending} onClick={onSendWithoutScreenshot}>
            Send without screenshot
          </Button>
        ) : null}
        {draft.phase === "conflict" ? (
          <Button type="button" size="sm" variant="secondary" onClick={onStartNewAttempt}>
            Start new attempt
          </Button>
        ) : null}
        {isRetryState ? (
          <Button type="button" size="sm" variant="primary" disabled={!isOnline || draft.screenshotReplacementPending || (draft.retryAfterSeconds ?? 0) > 0} onClick={onRetry}>
            Retry
          </Button>
        ) : (
          <Button type="submit" size="sm" variant="primary" disabled={!canSend}>
            {draft.phase === "sending" ? "Sending" : kind === "new" ? "Send to support" : "Send reply"}
          </Button>
        )}
      </div>

      <p className="sr-only">Press Control or Command plus Enter to send. Enter inserts a new line.</p>
    </form>
  );
}
