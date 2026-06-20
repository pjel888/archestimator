"use client";

import { useEffect, useState } from "react";
import { SHARE_CONTAINER_WIDTH } from "@/components/share/ShareContainer";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

type SharePageRecipientSessionInitializerProps = {
  recipientToken: string;
  token: string;
};

export function SharePageRecipientSessionInitializer({
  recipientToken,
  token,
}: SharePageRecipientSessionInitializerProps) {
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const sessionKey = `${token}\u001f${recipientToken}`;

  useEffect(() => {
    const controller = new AbortController();

    async function establishRecipientSession() {
      const response = await fetch(`/api/share/${encodeURIComponent(token)}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...createPublicationCsrfHeaders() },
        body: JSON.stringify({ recipientToken }),
        signal: controller.signal,
      }).catch(() => null);

      if (response?.ok) {
        window.location.replace(`/share/${encodeURIComponent(token)}`);
        return;
      }

      if (!controller.signal.aborted) {
        setFailedFor(sessionKey);
      }
    }

    establishRecipientSession();

    return () => controller.abort();
  }, [recipientToken, sessionKey, token]);

  if (failedFor !== sessionKey) return null;

  return (
    <div className="share-print-hidden border-b border-amber-200 bg-amber-50" role="alert">
      <div className={`${SHARE_CONTAINER_WIDTH} py-2.5`}>
        <p className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-amber-900">
          We could not verify this personalized review link.
        </p>
        <p className="mt-1 text-[12px] leading-[16px] tracking-normal text-amber-900/80">
          You can still read the proposal, but commenting and response actions need a fresh link from the project team.
        </p>
      </div>
    </div>
  );
}
