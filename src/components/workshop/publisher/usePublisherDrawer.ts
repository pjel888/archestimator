"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  readPublisherPublicationDrawerData,
} from "@/lib/publisher/drawer-actions";
import {
  republishProjectPublication,
  revokeProjectPublication,
  rotateProjectPublicationLink,
} from "@/lib/publication/actions";
import {
  migrateLegacyPublicationToClientPortalAction,
  rollbackLegacyPublicationClientPortalMigrationAction,
} from "@/lib/client-portal/legacy-migration-actions";
import { publisherRosterQueryKeys } from "./publisher-queries";

export function usePublisherDrawer(projectId: string | null, open: boolean) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const query = useQuery({
    enabled: open && Boolean(projectId),
    queryFn: () => readPublisherPublicationDrawerData(projectId!),
    queryKey: publisherRosterQueryKeys.drawer(projectId ?? "none"),
    staleTime: 10_000,
  });

  async function invalidatePublisherQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: publisherRosterQueryKeys.all }),
      projectId
        ? queryClient.invalidateQueries({ queryKey: publisherRosterQueryKeys.drawer(projectId) })
        : Promise.resolve(),
    ]);
  }

  async function refreshPublisherSurface(result: { ok: boolean }) {
    if (!result.ok) return;
    await invalidatePublisherQueries();
    router.refresh();
  }

  const republishMutation = useMutation({
    mutationFn: (input: Parameters<typeof republishProjectPublication>[0]) =>
      republishProjectPublication(input),
    onSuccess: refreshPublisherSurface,
  });

  const rotateMutation = useMutation({
    mutationFn: (input: Parameters<typeof rotateProjectPublicationLink>[0]) =>
      rotateProjectPublicationLink(input),
    onSuccess: refreshPublisherSurface,
  });

  const revokeMutation = useMutation({
    mutationFn: (input: Parameters<typeof revokeProjectPublication>[0]) =>
      revokeProjectPublication(input),
    onSuccess: refreshPublisherSurface,
  });

  const migrateLegacyMutation = useMutation({
    mutationFn: async (input: { legacyPublicationId: string; projectId: string }) => {
      const report = await migrateLegacyPublicationToClientPortalAction({
        apply: true,
        legacyPublicationId: input.legacyPublicationId,
        projectId: input.projectId,
      });
      return {
        message: report.status === "already_migrated"
          ? "This legacy link is already mapped to a Client Portal."
          : `Legacy link migrated to a Client Portal. Verified ${report.recipients.imported} recipients, ${report.comments.imported} discussions, and ${report.decisions.imported} decisions; existing client URLs remain available.`,
        ok: true,
      };
    },
    onSuccess: refreshPublisherSurface,
  });

  const rollbackLegacyMigrationMutation = useMutation({
    mutationFn: async (input: { legacyPublicationId: string; projectId: string }) => {
      await rollbackLegacyPublicationClientPortalMigrationAction(input);
      return {
        message: "Client Portal routing was rolled back. Existing legacy client URLs are active again; imported Client Portal history remains preserved for fix-forward.",
        ok: true,
      };
    },
    onSuccess: refreshPublisherSurface,
  });

  return {
    data: query.data,
    isMutating: republishMutation.isPending || rotateMutation.isPending || revokeMutation.isPending || migrateLegacyMutation.isPending || rollbackLegacyMigrationMutation.isPending,
    migrateLegacyMutation,
    query,
    republishMutation,
    rollbackLegacyMigrationMutation,
    revokeMutation,
    rotateMutation,
  };
}
