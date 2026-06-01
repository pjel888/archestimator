"use client";

import { useEffect } from "react";

type SharePageRecipientSessionInitializerProps = {
  recipientToken: string;
  token: string;
};

export function SharePageRecipientSessionInitializer({
  recipientToken,
  token,
}: SharePageRecipientSessionInitializerProps) {
  useEffect(() => {
    const controller = new AbortController();

    async function establishRecipientSession() {
      const response = await fetch(`/api/share/${encodeURIComponent(token)}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientToken }),
        signal: controller.signal,
      }).catch(() => null);

      if (response?.ok) {
        window.location.replace(`/share/${encodeURIComponent(token)}`);
      }
    }

    establishRecipientSession();

    return () => controller.abort();
  }, [recipientToken, token]);

  return null;
}
