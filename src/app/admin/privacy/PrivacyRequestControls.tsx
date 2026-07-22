"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function PrivacyRequestControls(props: {
  executable: boolean;
  expectedRevision: number;
  privacyRequestId: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [requesterUserId, setRequesterUserId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function mutate(payload: Record<string, unknown>) {
    setNotice(null);
    startTransition(() => {
      void fetch(`/api/admin/privacy-requests/${props.privacyRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: props.expectedRevision, ...payload }),
      }).then(async (response) => {
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || "Privacy request action failed.");
        router.refresh();
      }).catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "Privacy request action failed.");
      });
    });
  }

  return (
    <div className="space-y-1.5">
      {!props.verified ? (
        <div className="flex flex-wrap items-end gap-1.5">
          <label className="min-w-56 flex-1 space-y-1">
            <span className="block text-[9px] font-medium leading-3 text-secondary">Verified subject user ID</span>
            <input
              value={requesterUserId}
              onChange={(event) => setRequesterUserId(event.target.value)}
              className="h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
              autoComplete="off"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending || !requesterUserId.trim()}
            onClick={() => mutate({ action: "verify", requesterUserId })}
          >
            Verify subject
          </Button>
        </div>
      ) : null}
      {props.verified && props.executable ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => mutate({ action: "execute" })}
        >
          {pending ? "Working…" : "Execute support fulfillment"}
        </Button>
      ) : null}
      {notice ? <p role="alert" className="text-[9px] leading-3 text-danger">{notice}</p> : null}
    </div>
  );
}
