"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import type { SupportDraft, SupportScreenshot } from "./support-center-types";

function createClientMessageId() {
  return crypto.randomUUID();
}

function createDraft(): SupportDraft {
  return {
    clientMessageId: createClientMessageId(),
    diagnosticsShared: true,
    error: null,
    fileError: null,
    message: "",
    phase: "idle",
    retryAfterSeconds: null,
    screenshot: null,
    screenshotReplacementPending: false,
  };
}

function revokeScreenshot(screenshot: SupportScreenshot | null) {
  if (screenshot) URL.revokeObjectURL(screenshot.previewUrl);
}

export function useSupportDrafts() {
  const draftsRef = useRef(new Map<string, SupportDraft>());
  const [, render] = useReducer((revision: number) => revision + 1, 0);

  const getDraft = useCallback((key: string) => {
    const existing = draftsRef.current.get(key);
    if (existing) return existing;
    const created = createDraft();
    draftsRef.current.set(key, created);
    return created;
  }, []);

  const updateDraft = useCallback((key: string, update: (draft: SupportDraft) => SupportDraft) => {
    const current = draftsRef.current.get(key) ?? createDraft();
    draftsRef.current.set(key, update(current));
    render();
  }, []);

  const setScreenshot = useCallback((key: string, screenshot: SupportScreenshot | null, fileError: string | null = null) => {
    updateDraft(key, (draft) => {
      if (!screenshot && fileError) return { ...draft, fileError };
      if (draft.screenshot?.previewUrl !== screenshot?.previewUrl) revokeScreenshot(draft.screenshot);
      return { ...draft, error: null, fileError, phase: "idle", screenshot, screenshotReplacementPending: false };
    });
  }, [updateDraft]);

  const installScreenshotForNewAttempt = useCallback((key: string, screenshot: SupportScreenshot) => {
    updateDraft(key, (draft) => {
      if (draft.screenshot?.previewUrl !== screenshot.previewUrl) revokeScreenshot(draft.screenshot);
      return {
        ...draft,
        clientMessageId: createClientMessageId(),
        error: null,
        fileError: null,
        phase: "idle",
        retryAfterSeconds: null,
        screenshot,
        screenshotReplacementPending: false,
      };
    });
  }, [updateDraft]);

  const startNewAttempt = useCallback((key: string) => {
    updateDraft(key, (draft) => ({
      ...draft,
      clientMessageId: createClientMessageId(),
      error: null,
      fileError: null,
      phase: "idle",
      retryAfterSeconds: null,
      screenshotReplacementPending: false,
    }));
  }, [updateDraft]);

  const clearDraft = useCallback((key: string) => {
    const current = draftsRef.current.get(key);
    revokeScreenshot(current?.screenshot ?? null);
    draftsRef.current.set(key, createDraft());
    render();
  }, []);

  useEffect(() => () => {
    for (const draft of draftsRef.current.values()) revokeScreenshot(draft.screenshot);
    draftsRef.current.clear();
  }, []);

  return { clearDraft, getDraft, installScreenshotForNewAttempt, setScreenshot, startNewAttempt, updateDraft };
}
