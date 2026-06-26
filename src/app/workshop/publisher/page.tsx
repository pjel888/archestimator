import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

export default function PublisherPage() {
  return (
    <WorkshopPageShell
      title="Publisher"
      eyebrow="Workspace"
      showEyebrow={false}
      breadcrumbs={["Publisher"]}
      contentClassName=""
    >
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-tertiary">Publisher is coming soon.</p>
      </div>
    </WorkshopPageShell>
  );
}
