import { SupportChatWidget } from "@/components/support/SupportChatWidget";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";

export default function WorkshopFeedbackPage() {
  return (
    <WorkshopRouteHeader
      title="Support Center"
      eyebrow="Support"
      description="Read private support replies, continue a request, or send a new message."
      breadcrumbs={[{ label: "Workshop", href: "/workshop" }, "Support Center"]}
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-2"
    >
      <SupportChatWidget />
    </WorkshopRouteHeader>
  );
}
