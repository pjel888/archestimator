import type { TreeDropPosition, TreeNode } from "./tree";

function containsDescendant(node: TreeNode, targetId: string): boolean {
  for (const child of node.children ?? []) {
    if (child.id === targetId || containsDescendant(child, targetId)) return true;
  }
  return false;
}

/**
 * Apply a drop immutably to a plain `TreeNode[]`. For consumers without their
 * own reorder domain logic (and for Storybook): blocks self drops and
 * descendant cycles, returns the input array when the move is invalid.
 */
export function moveTreeNode(
  nodes: TreeNode[],
  draggedId: string,
  targetId: string,
  position: TreeDropPosition
): TreeNode[] {
  if (draggedId === targetId) return nodes;

  let dragged: TreeNode | null = null;
  const removeDragged = (list: TreeNode[]): TreeNode[] =>
    list.flatMap((node) => {
      if (node.id === draggedId) {
        dragged = node;
        return [];
      }
      if (node.children?.length) return [{ ...node, children: removeDragged(node.children) }];
      return [node];
    });

  const withoutDragged = removeDragged(nodes);
  if (!dragged) return nodes;
  if (containsDescendant(dragged, targetId)) return nodes;

  let placed = false;
  const insertDragged = (list: TreeNode[]): TreeNode[] => {
    const next: TreeNode[] = [];
    for (const node of list) {
      if (node.id === targetId) {
        placed = true;
        if (position === "before") {
          next.push(dragged!, node);
        } else if (position === "after") {
          next.push(node, dragged!);
        } else {
          next.push({ ...node, children: [...(node.children ?? []), dragged!] });
        }
        continue;
      }
      if (node.children?.length) {
        next.push({ ...node, children: insertDragged(node.children) });
        continue;
      }
      next.push(node);
    }
    return next;
  };

  const result = insertDragged(withoutDragged);
  return placed ? result : nodes;
}
