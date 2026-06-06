import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { WorkshopSettingsModal } from "@/components/workshop/WorkshopSettingsModal";
import { WorkshopSettingsModalContent } from "@/components/workshop/WorkshopSettingsModalContent";
import { requireCurrentUserContext } from "@/lib/auth/session";

export default async function WorkshopSettingsPage() {
  const context = await requireCurrentUserContext();
  const canManagePlatform = context.role === "ceo" || context.role === "admin";

  return (
    <WorkshopPageShell
      title="Settings"
      eyebrow="Workshop"
      breadcrumbs={["Settings"]}
      contentClassName="p-2"
    >
      <div className="h-full bg-white" aria-label="Settings modal canvas" />
      <WorkshopSettingsModal initialOpen closeHref="/workshop/projects" trigger="none">
        <WorkshopSettingsModalContent canManagePlatform={canManagePlatform} />
      </WorkshopSettingsModal>
    </WorkshopPageShell>
  );
}
