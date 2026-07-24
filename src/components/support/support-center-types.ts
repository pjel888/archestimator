import type { OnboardingSupportContext } from "@/lib/onboarding/support-context";

export type SupportConversationStatus = "open" | "pending" | "resolved" | "archived";

export type SupportConversationSummary = {
  id: string;
  lastMessageAt: string;
  lastPreview: string;
  stableReference: string;
  status: SupportConversationStatus;
  unread: boolean;
};

export type SupportConversationPage = {
  conversations: SupportConversationSummary[];
  nextCursor: string | null;
  totalUnread: number;
};

export type SupportMessage = {
  attachments: Array<{
    contentType: "image/webp";
    id: string;
    sizeBytes: number;
    url: string;
  }>;
  bodyText: string;
  context: {
    appRelease: string | null;
    browserFamily: string | null;
    diagnosticsShared: boolean;
    estimateId: string | null;
    osFamily: string | null;
    onboarding: OnboardingSupportContext | null;
    projectId: string | null;
    routeTemplate: string;
    timezone: string | null;
    viewportHeight: number | null;
    viewportWidth: number | null;
    workspaceId: string | null;
  } | null;
  createdAt: string;
  id: string;
  senderRole: "user" | "admin" | "system";
};

export type SupportMessagePage = {
  messages: SupportMessage[];
  nextCursor: string | null;
};

export type SupportIntakeResponse = {
  conversation: {
    id: string;
  };
  message: {
    id: string;
  };
  realtimeDegraded: boolean;
};

export type SupportScreenshot = {
  file: File;
  previewUrl: string;
};

export type SupportDraftPhase =
  | "idle"
  | "offline"
  | "sending"
  | "pending"
  | "uncertain"
  | "error"
  | "conflict"
  | "screenshot_error"
  | "rate_limited";

export type SupportDraft = {
  clientMessageId: string;
  diagnosticsShared: boolean;
  error: string | null;
  fileError: string | null;
  message: string;
  phase: SupportDraftPhase;
  retryAfterSeconds: number | null;
  screenshot: SupportScreenshot | null;
  screenshotReplacementPending: boolean;
};

export type SupportCenterHost = "overlay" | "page";
export type SupportCenterView = "requests" | "new" | "conversation";
