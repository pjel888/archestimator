import { Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";
import { createProject } from "@/lib/projects/actions";

export function NewProjectForm() {
  return (
    <form action={createProject} className="space-y-2">
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

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md" className="h-8 gap-1.5">
          <Plus size={14} weight="bold" aria-hidden="true" />
          Create project
        </Button>
      </div>
    </form>
  );
}
