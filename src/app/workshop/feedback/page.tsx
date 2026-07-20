import Link from "next/link";

import { SupportChatWidget } from "@/components/support/SupportChatWidget";
import { BetaFeedbackForm } from "@/components/workshop/BetaFeedbackForm";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";

function feedbackErrorMessage(error?: string) {
  if (error === "message_too_short") return "Add at least 10 characters so the feedback is actionable.";
  if (error === "message_too_long") return "Keep feedback under 4,000 characters.";
  if (error === "invalid_project") return "Project context must be a valid UUID or left blank.";
  if (error === "invalid_type" || error === "invalid_severity") return "Choose a valid feedback type and severity.";
  return null;
}

export default async function WorkshopFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; fallback?: string; saved?: string; support?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = feedbackErrorMessage(params.error);
  const fallbackMailto = "mailto:support@archestimator.com?subject=Archestimator%20feedback";

  return (
    <WorkshopRouteHeader
      title="Feedback"
      eyebrow="Support"
      description="Report workflow blockers, confusing screens, export issues, and missing estimating details."
      breadcrumbs={[{ label: "Workshop", href: "/workshop" }, "Feedback"]}
      contentClassName="overflow-y-auto p-2"
    >

      <div className="space-y-3">
        {params.saved ? (
          <output className="rounded-xs border border-accent/25 bg-accentSoft p-2 text-[10px] leading-4 text-ink">
            Feedback saved. Philip will review submitted issues.
          </output>
        ) : null}
        {params.support ? (
          <output className="rounded-xs border border-accent/25 bg-accentSoft p-2 text-[10px] leading-4 text-ink">
            Support message sent. The team will see it in the admin support inbox.
          </output>
        ) : null}
        {params.fallback ? (
          <output className="rounded-xs border border-warning/25 bg-warningSoft p-2 text-[10px] leading-4 text-warning">
            Feedback could not be saved in the app.{" "}
            <Link href={fallbackMailto} className="font-medium underline underline-offset-2">
              Open an email draft instead
            </Link>
            .
          </output>
        ) : null}
        {errorMessage ? (
          <output className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
            {errorMessage}
          </output>
        ) : null}

        <SupportChatWidget />
        <BetaFeedbackForm />
      </div>
    </WorkshopRouteHeader>
  );
}
