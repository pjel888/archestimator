import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { WorkshopSettingsModal } from "@/components/workshop/WorkshopSettingsModal";
import { WorkshopSettingsModalContent } from "@/components/workshop/WorkshopSettingsModalContent";
import { isPlatformAdminRole } from "@/lib/auth/roles";
import { requireCurrentUserContext } from "@/lib/auth/session";

export default async function WorkshopSettingsPage() {
  const context = await requireCurrentUserContext();
  const canManagePlatform = isPlatformAdminRole(context.role);

  return (
    <WorkshopRouteHeader
      title="Settings"
      eyebrow="Workshop"
      breadcrumbs={["Settings"]}
      contentClassName="p-2"
    >

      <div className="h-full" aria-hidden="true" />
      <WorkshopSettingsModal
        initialOpen
        closeHref="/workshop/projects"
        trigger="none"
        location="Workshop / Settings"
      >
        <WorkshopSettingsModalContent canManagePlatform={canManagePlatform} />
      </WorkshopSettingsModal>
    </WorkshopRouteHeader>
  );
}
