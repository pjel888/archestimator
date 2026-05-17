import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

export default function ComponentsPage() {
  return (
    <WorkshopPageShell
      title="Components"
      eyebrow="Library"
      description="Shared header, body, and footer shell for the future component library. The library manager itself remains intentionally empty for this slice."
      footer={
        <>
          <span>Component library shell</span>
          <span>Content pending approved workflow</span>
        </>
      }
    >
      <div className="min-h-[360px] rounded-xl border border-dashed border-divider bg-white" aria-label="Components empty state" />
    </WorkshopPageShell>
  );
}
