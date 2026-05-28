"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

function isInternalLink(href: string): boolean {
  if (href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("javascript:")) return false;
  if (href.startsWith("http") || href.startsWith("//")) {
    return href.startsWith(window.location.origin);
  }
  return true;
}

export function NavigationListener() {
  const pathname = usePathname();
  const show = useNavigationUiStore((s) => s.show);
  const hide = useNavigationUiStore((s) => s.hide);

  useEffect(() => {
    hide();
  }, [pathname, hide]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (!isInternalLink(href)) return;

      show(href);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [show]);

  useEffect(() => {
    function handlePopstate() {
      show(window.location.pathname);
    }
    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [show]);

  return null;
}
