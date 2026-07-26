"use client";

import { useFormStatus } from "react-dom";

import { AdminStatusSelect } from "@/components/admin/AdminStatusSelect";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateBetaFeedbackReviewStatus } from "@/lib/workshop/beta-feedback-review-actions";

type AdminFeedbackStatusFormProps = {
  id: string;
  label: string;
  mobile?: boolean;
  options: readonly { label: string; value: string }[];
  status: string;
};

function SaveButton({ mobile }: { mobile: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      disabled={pending}
      className={mobile ? "min-h-10 min-w-20" : undefined}
    >
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function AdminFeedbackStatusForm({
  id,
  label,
  mobile = false,
  options,
  status,
}: AdminFeedbackStatusFormProps) {
  const { toast } = useToast();

  return (
    <form
      action={async (formData) => {
        try {
          const result = await updateBetaFeedbackReviewStatus(formData);
          toast({
            id: `admin-feedback-status-${id}`,
            message: result.message,
            tone: result.ok ? (result.stale ? "warning" : "success") : "error",
          });
        } catch {
          toast({
            id: `admin-feedback-status-${id}`,
            message: "Feedback status could not be saved. Please try again.",
            tone: "error",
          });
        }
      }}
      className={mobile ? "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2" : "flex items-center gap-1"}
    >
      <input type="hidden" name="id" value={id} />
      <div className={mobile ? "grid min-w-0 gap-1 text-[9px] font-medium leading-3 text-tertiary" : undefined}>
        {mobile ? <span>Review status</span> : null}
        <AdminStatusSelect
          name="status"
          defaultValue={status}
          options={options}
          aria-label={`Review status for feedback from ${label}`}
          className={mobile ? "min-h-10 w-full" : "min-w-28"}
        />
      </div>
      <SaveButton mobile={mobile} />
    </form>
  );
}
