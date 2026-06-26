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

  return {
    data: query.data,
    isMutating: republishMutation.isPending || rotateMutation.isPending || revokeMutation.isPending,
    query,
    republishMutation,
    revokeMutation,
    rotateMutation,
  };
}
