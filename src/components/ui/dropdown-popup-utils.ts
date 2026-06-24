import type * as React from "react";

/**
 * Scrolls a panel item into view with plain scrollTop arithmetic.
 * `element.scrollIntoView()` would also scroll every scrollable ancestor -
 * including the document - which both moves the page under a fixed panel and
 * trips the popup's own close-on-ancestor-scroll handler on open.
 */
export function scrollPopupItemIntoView(panel: HTMLElement, item: HTMLElement) {
  const itemTop = item.offsetTop;
  const itemBottom = itemTop + item.offsetHeight;
  if (itemTop < panel.scrollTop) {
    panel.scrollTop = itemTop;
    return;
  }
  if (itemBottom > panel.scrollTop + panel.clientHeight) {
    panel.scrollTop = itemBottom - panel.clientHeight;
  }
}

export function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
        return;
      }
      (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}
