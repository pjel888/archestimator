"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { WarningDiamond } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  type DeleteAccountPreview,
} from "@/lib/auth/delete-account-shared";
import {
  deleteAccountAction,
  getDeleteAccountPreviewAction,
  type DeleteAccountActionState,
} from "@/lib/auth/delete-account-actions";

const initialState: DeleteAccountActionState = { ok: false };

export function DeleteAccountDangerZone() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<DeleteAccountPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, startPreviewTransition] = useTransition();
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialState);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPreviewError(null);
    setConfirmation("");
    startPreviewTransition(() => {
      void getDeleteAccountPreviewAction()
        .then((result) => setPreview(result))
        .catch(() => setPreviewError("Could not check account deletion readiness."));
    });
  }, [open]);

  const blockers = state.blockers ?? preview?.blockers ?? [];
  const blocked = Boolean(preview && !preview.ok) || blockers.length > 0;
  const canSubmit =
    Boolean(preview?.ok) &&
    confirmation.trim() === DELETE_ACCOUNT_CONFIRMATION_PHRASE &&
    !pending &&
    !loadingPreview &&
    !blocked;

  return (
    <section
      id="delete-account"
      className="space-y-2 border border-dangerSoft bg-dangerSoft/20 p-2"
      aria-labelledby="delete-account-title"
    >
      <div className="flex items-start gap-2">
        <WarningDiamond size={14} weight="regular" className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h2 id="delete-account-title" className="text-[10px] font-medium leading-4 text-ink">
            Delete account
          </h2>
          <p className="text-[10px] leading-4 text-secondary">
            Closes your account and removes workshop access. Your projects and estimate sheets will no longer appear
            if you sign up again. Archestimator retains internal records for operations. This account closure is not a
            verified privacy erasure request; use the Privacy Notice process for erasure.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="danger" size="md" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </div>

      <Modal
        open={open}
        title="Delete account"
        description="This signs you out and closes access to your solely owned workshop data."
        tone="danger"
        className="max-w-lg"
        onOpenChange={setOpen}
      >
        <div className="space-y-3">
          {loadingPreview ? (
            <p className="text-[10px] leading-4 text-tertiary">Checking ownership and shared access…</p>
          ) : null}

          {previewError ? (
            <p className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
              {previewError}
            </p>
          ) : null}

          {state.error ? (
            <p className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger" role="alert">
              {state.error}
            </p>
          ) : null}

          {blockers.length > 0 ? (
            <ul className="space-y-1 rounded-xs border border-dangerSoft bg-white p-2">
              {blockers.map((blocker) => (
                <li key={`${blocker.code}:${blocker.workspaceId ?? blocker.corporateAccountId ?? blocker.message}`} className="text-[10px] leading-4 text-danger">
                  {blocker.message}
                </li>
              ))}
            </ul>
          ) : null}

          {preview?.ok ? (
            <div className="space-y-1 rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 text-secondary">
              <p>
                Sole-owned workspaces to close:{" "}
                {preview.closedWorkspaceNames.length > 0 ? preview.closedWorkspaceNames.join(", ") : "none"}
              </p>
              <p>
                Shared workspaces to leave:{" "}
                {preview.leftWorkspaceNames.length > 0 ? preview.leftWorkspaceNames.join(", ") : "none"}
              </p>
              <p>
                Public links to revoke: {preview.publicationRevokeCount}. Client portals to disable:{" "}
                {preview.portalDisableCount}. Pending invites to revoke: {preview.pendingInviteRevokeCount}.
              </p>
              <p>Signing up again with the same email starts a fresh empty account.</p>
            </div>
          ) : null}

          <form action={formAction} className="space-y-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-medium leading-4 text-ink">
                Type {DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm
              </span>
              <input
                name="confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={blocked || loadingPreview || pending}
                className="h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="md" onClick={() => setOpen(false)} disabled={pending}>
                Keep account
              </Button>
              <Button type="submit" variant="danger" size="md" disabled={!canSubmit}>
                {pending ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </section>
  );
}
