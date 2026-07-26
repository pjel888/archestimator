"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateCorporateAccountStatusAction } from "@/lib/admin/corporate-account-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type AccountStatus = "active" | "suspended" | "archived";

export function AdminAccountStatusControls({
  accountId,
  status,
  accountName,
}: {
  accountId: string;
  status: string;
  accountName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [requestedStatus, setRequestedStatus] = useState<AccountStatus | null>(null);

  const actionLabel =
    requestedStatus === "active"
      ? status === "archived"
        ? "Restore"
        : "Reactivate"
      : requestedStatus === "suspended"
        ? "Suspend"
        : requestedStatus === "archived"
          ? "Archive"
          : "Update";
  const completedAction =
    requestedStatus === "active"
      ? status === "archived"
        ? "restored"
        : "reactivated"
      : requestedStatus === "suspended"
        ? "suspended"
        : "archived";

  function handleStatusChange(newStatus: AccountStatus) {
    setRequestedStatus(newStatus);
  }

  function confirmStatusChange() {
    const newStatus = requestedStatus;
    if (!newStatus || isPending) return;
    startTransition(async () => {
      try {
        const result = await updateCorporateAccountStatusAction({ accountId, status: newStatus });
        if (!result.ok) {
          toast({
            id: `admin-account-status-${accountId}`,
            message: "Account status could not be updated. Please try again.",
            tone: "error",
          });
          return;
        }

        toast({
          id: `admin-account-status-${accountId}`,
          message: `${accountName} ${completedAction}.`,
          tone: "success",
        });
        router.refresh();
      } catch {
        toast({
          id: `admin-account-status-${accountId}`,
          message: "Account status could not be updated. Please try again.",
          tone: "error",
        });
      }
    });
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <Badge
        tone={status === "active" ? "success" : status === "suspended" ? "warning" : "danger"}
        size="xs"
        className="min-w-0 px-1"
      >
        {status}
      </Badge>

      {status === "active" && (
        <>
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleStatusChange("suspended")}
            title="Temporarily disable the account"
          >
            Suspend
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={isPending}
            onClick={() => handleStatusChange("archived")}
            title="Hide from the default list (reversible)"
          >
            Archive
          </Button>
        </>
      )}

      {status === "suspended" && (
        <>
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleStatusChange("active")}
          >
            Reactivate
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={isPending}
            onClick={() => handleStatusChange("archived")}
          >
            Archive
          </Button>
        </>
      )}

      {status === "archived" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => handleStatusChange("active")}
        >
          Restore
        </Button>
      )}

      <ConfirmDialog
        open={requestedStatus !== null}
        onOpenChange={(open) => {
          if (!open) setRequestedStatus(null);
        }}
        title={`${actionLabel} "${accountName}"?`}
        description={
          requestedStatus === "archived"
            ? "Archived accounts are hidden from the default list but can be restored."
            : "This account status change takes effect immediately."
        }
        confirmLabel={`${actionLabel} account`}
        cancelLabel="Keep current status"
        tone={
          requestedStatus === "archived"
            ? "danger"
            : requestedStatus === "suspended"
              ? "warning"
              : "default"
        }
        busy={isPending}
        initialFocus="cancel"
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}
