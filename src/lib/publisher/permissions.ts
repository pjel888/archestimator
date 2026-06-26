import type { CollaborationRole } from "@/lib/collaboration/types";

export function canReadPublisherRosterProject(role: CollaborationRole) {
  return role !== "viewer";
}

export function canManagePublisherRosterProject(role: CollaborationRole) {
  return role === "owner" || role === "admin";
}
