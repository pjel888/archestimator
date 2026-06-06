"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BETA_FEEDBACK_SEVERITIES, BETA_FEEDBACK_TYPES } from "@/lib/workshop/beta-feedback";
import {
  submitBetaFeedback,
  submitBetaFeedbackInline,
  type BetaFeedbackInlineState,
} from "@/lib/workshop/beta-feedback-actions";

type BetaFeedbackFormProps = {
  mode?: "inline" | "redirect";
};

const feedbackTypeLabels: Record<(typeof BETA_FEEDBACK_TYPES)[number], string> = {
  bug: "Bug",
  confusing_ux: "Confusing UX",
  missing_feature: "Missing feature",
  export_issue: "Export issue",
  estimate_accuracy: "Estimate accuracy",
  other: "Other",
};

const severityLabels: Record<(typeof BETA_FEEDBACK_SEVERITIES)[number], string> = {
  blocker: "Blocker",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const initialInlineState: BetaFeedbackInlineState = { status: "idle" };

export function BetaFeedbackForm({ mode = "redirect" }: BetaFeedbackFormProps) {
  const pathname = usePathname();
  const [inlineState, inlineAction, inlinePending] = useActionState(submitBetaFeedbackInline, initialInlineState);
  const isInline = mode === "inline";
  const action = isInline ? inlineAction : submitBetaFeedback;

  return (
    <form action={action} className="max-w-3xl space-y-3">
      <input type="hidden" name="pagePath" value={pathname ?? "/workshop/feedback"} />
      {isInline && inlineState.status !== "idle" && inlineState.message ? (
        <div
          className={[
            "rounded-xs border p-2 text-[10px] leading-4",
            inlineState.status === "saved"
              ? "border-accent/25 bg-accentSoft text-ink"
              : inlineState.status === "fallback"
                ? "border-warning/25 bg-warningSoft text-warning"
                : "border-dangerSoft bg-dangerSoft/40 text-danger",
          ].join(" ")}
          role="status"
        >
          {inlineState.message}
        </div>
      ) : null}

      <section className="space-y-2 border border-hairline bg-white p-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="block text-[9px] font-medium uppercase leading-3 text-tertiary">Type</span>
            <select
              name="feedbackType"
              defaultValue="bug"
              className="min-h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-ink outline-none focus:border-focus"
            >
              {BETA_FEEDBACK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {feedbackTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[9px] font-medium uppercase leading-3 text-tertiary">Severity</span>
            <select
              name="severity"
              defaultValue="medium"
              className="min-h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-ink outline-none focus:border-focus"
            >
              {BETA_FEEDBACK_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severityLabels[severity]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-1">
          <span className="block text-[9px] font-medium uppercase leading-3 text-tertiary">Project UUID</span>
          <input
            name="projectId"
            className="min-h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-ink outline-none placeholder:text-tertiary focus:border-focus"
            placeholder="Optional"
          />
        </label>

        <label className="space-y-1">
          <span className="block text-[9px] font-medium uppercase leading-3 text-tertiary">Message</span>
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={4000}
            rows={8}
            className="w-full resize-y rounded-xs border border-hairline bg-white px-2 py-2 text-[10px] leading-4 text-ink outline-none placeholder:text-tertiary focus:border-focus"
            placeholder="Describe what happened, what you expected, and whether it blocks your estimating workflow."
          />
        </label>
      </section>

      <div className="flex items-center justify-between gap-2">
        <p className="max-w-xl text-[9px] leading-3 text-tertiary">
          Avoid pasting client-confidential estimate details unless Philip has explicitly asked for them.
        </p>
        <Button type="submit" variant="primary" size="md" disabled={isInline && inlinePending}>
          {isInline && inlinePending ? "Sending" : "Send feedback"}
        </Button>
      </div>
    </form>
  );
}
