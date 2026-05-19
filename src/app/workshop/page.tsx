import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

export default async function WorkshopPage() {
  return (
    <WorkshopPageShell
      title="Workshop"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Workshop"]}
      contentClassName=""
      footer={
        <>
          <span>Workshop shell</span>
          <span>Select Projects or Components from the sidebar</span>
        </>
      }
    >
      <div className="h-full bg-white" aria-label="Workshop empty canvas" />
    </WorkshopPageShell>
  );
}
