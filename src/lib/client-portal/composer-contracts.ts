import type { ClientPortalSectionDraft } from "@/lib/client-portal/section-registry";

export type ClientPortalReadiness = {
  blockers: string[];
  ready: boolean;
  warnings: string[];
};

export type ClientPortalComposerData = {
  drafts: ClientPortalSectionDraft[];
  readiness: ClientPortalReadiness;
  sources: Array<{ id: string; name: string; sheetCode: string | null }>;
  unresolvedThreads: Array<{ id: string; issueLabel: string; subject: string }>;
};

export const CLIENT_PORTAL_COMPOSER_TEMPLATES = {
  proposal: ["overview", "estimate_browser", "discussion", "decision"],
  cost_review: ["overview", "estimate_browser", "financial_summary", "cost_breakdown", "discussion"],
  executive: ["overview", "financial_summary", "cost_breakdown", "decision"],
} as const satisfies Record<string, readonly ClientPortalSectionDraft["kind"][]>;

export type ClientPortalComposerTemplate = keyof typeof CLIENT_PORTAL_COMPOSER_TEMPLATES;
