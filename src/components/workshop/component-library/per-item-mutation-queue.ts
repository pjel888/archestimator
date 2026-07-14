export type PerItemMutationQueue = Map<string, Promise<void>>;

export function enqueuePerItemMutation(
  queue: PerItemMutationQueue,
  itemId: string,
  mutation: () => Promise<void>,
): Promise<void> {
  const preceding = queue.get(itemId) ?? Promise.resolve();
  const current = preceding.catch(() => undefined).then(mutation);
  queue.set(itemId, current);

  const clearIfCurrent = () => {
    if (queue.get(itemId) === current) queue.delete(itemId);
  };
  void current.then(clearIfCurrent, clearIfCurrent);

  return current;
}
