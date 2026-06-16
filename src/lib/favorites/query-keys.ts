export const favoritesQueryKeys = {
  all: () => ["favorites"] as const,
  sidebar: (scope: { workspaceId: string; userId: string }) =>
    [...favoritesQueryKeys.all(), "sidebar", scope.workspaceId, scope.userId] as const,
};
