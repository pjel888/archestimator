"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { reportRealtimeEvent } from "@/lib/collaboration/realtime-telemetry";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Keeps the realtime websocket authenticated across the session lifetime.
 *
 * Plan: 2026-06-14 Teamspace Improvement Plan — T0.4 / §5 / decision R-17 / gap G6.
 * A second-pass repo search found NO `setAuth`/`onAuthStateChange` wiring, so
 * long-lived private channels would silently drop at JWT expiry. This top-level
 * bridge calls `supabase.realtime.setAuth()` on the singleton browser client
 * whenever the session is established or refreshed, so presence/cursor channels
 * stay authorized without a reconnect.
 */
export function RealtimeAuthBridge() {
  const queryClient = useQueryClient();
  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    let active = true;

    async function applyAuth(token: string | undefined) {
      try {
        await supabase.realtime.setAuth(token);
      } catch (error) {
        reportRealtimeEvent({
          type: "auth_refresh_failed",
          detail: error instanceof Error ? error.message : "realtime.setAuth failed",
        });
      }
    }

    // Prime realtime auth with the current access token so private channels can
    // authorize on first paint.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      void applyAuth(data.session?.access_token);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void applyAuth(session?.access_token);
      } else if (event === "SIGNED_OUT") {
        // 13 C5 / QA-17: evict every favorites entry so a signed-out user can't
        // read residual favorites from the prior session's cache.
        queryClient.removeQueries({ queryKey: favoritesQueryKeys.all() });
        void applyAuth(undefined);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  return null;
}
