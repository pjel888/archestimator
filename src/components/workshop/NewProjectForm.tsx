import { Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { createProject } from "@/lib/projects/actions";

export function NewProjectForm() {
  return (
    <form action={createProject} className="rounded-lg border border-hairline bg-white p-2 shadow-[0_16px_42px_-36px_rgba(17,24,39,0.42)]">
      <div className="mb-2 flex items-start justify-between gap-2 border-b border-hairline pb-2">
        <div className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-tertiary">Live Supabase</p>
          <h2 className="mt-0.5 text-[12px] font-bold tracking-[-0.025em] text-ink">Create project</h2>
          <p className="mt-1 text-[10px] leading-4 text-tertiary">Adds a project to your authenticated workspace.</p>
        </div>
        <Button type="submit" variant="primary" size="md" className="h-8 shrink-0">
          <Plus size={14} weight="bold" aria-hidden="true" />
          Save
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <label className="space-y-1 md:col-span-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary">Project name</span>
          <ControlInput name="name" placeholder="e.g. Lewis Residence Renovation" required className="h-8 px-2" />
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary">Client</span>
          <ControlInput name="clientName" placeholder="Client name" className="h-8 px-2" />
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary">Code</span>
          <ControlInput name="projectCode" placeholder="PRJ-001" className="h-8 px-2" />
        </label>
        <label className="space-y-1 md:col-span-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-tertiary">Location</span>
          <ControlInput name="location" placeholder="City / site location" className="h-8 px-2" />
        </label>
      </div>
    </form>
  );
}
