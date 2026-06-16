// Project Groups caps (Q2 soft-cap). SINGLE source of truth, imported by both the
// server action module (group-actions.ts) and the client popover (ManageGroupsPopover.tsx).
// Plain module — NO "use server" — so a client component may import it.
export const MAX_PROJECT_GROUPS = 50;
export const MAX_PROJECT_GROUP_NAME_LENGTH = 40;
export const MAX_BULK_ASSIGN_PROJECTS = 50;
