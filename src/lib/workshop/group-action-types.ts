// Typed errors + result shape shared by the Project Groups server actions and their
// consumers. These live OUTSIDE group-actions.ts on purpose: a "use server" module may
// only export async functions (Next.js server-action constraint) — exporting a class or
// type from it is a build error ("Only async functions are allowed to be exported in a
// 'use server' file"). group-actions.ts imports these to throw / annotate its return.

/** Thrown when the 50-group-per-user cap is hit (app-layer soft cap; no DB constraint). */
export class ProjectGroupCapError extends Error {}

/** Thrown on an empty, >40-char, or duplicate (case-insensitive) group name. */
export class ProjectGroupNameError extends Error {}

/**
 * Result the client (§5.5) branches on to keep optimistic state for moved ids and roll
 * back skipped ids (forged / foreign / non-owned ids that failed the LD-2 ownership gate).
 */
export type BulkAssignProjectsToGroupResult = {
  movedProjectIds: string[];
  skippedProjectIds: string[];
};
