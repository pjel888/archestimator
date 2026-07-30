"use client";

import { createContext, useContext } from "react";

import type {
  ClientLinkLearningCompletionResult,
  ClientLinkLearningPublishResult,
  ClientLinkLearningVerificationMethod,
} from "@/lib/onboarding/client-link-learning";
import type { ProjectPublicationLocationVisibility } from "@/lib/publication/types";

type ClientLinksLearningContextValue = {
  active: boolean;
  publish: (input: {
    projectId: string;
    selectedEstimateIds: string[];
    password?: string;
    clearPassword?: boolean;
    expiresAt?: string | null;
    locationVisibility?: ProjectPublicationLocationVisibility | null;
    actionKind: "create" | "republish";
  }) => Promise<ClientLinkLearningPublishResult | null>;
  complete: (
    projectId: string,
    method: ClientLinkLearningVerificationMethod,
  ) => Promise<ClientLinkLearningCompletionResult | null>;
};

const ClientLinksLearningContext = createContext<ClientLinksLearningContextValue | null>(null);

export function useClientLinksLearning() {
  return useContext(ClientLinksLearningContext);
}
