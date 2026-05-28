"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

type NavigateOptions = { scroll?: boolean };

export function useNavigationRouter() {
  const router = useNextRouter();
  const show = useNavigationUiStore((s) => s.show);

  return {
    ...router,
    push: (href: string, options?: NavigateOptions) => {
      show(href);
      return options === undefined
        ? router.push(href)
        : router.push(href, options);
    },
    replace: (href: string, options?: NavigateOptions) => {
      show(href);
      return options === undefined
        ? router.replace(href)
        : router.replace(href, options);
    },
    refresh: () => {
      show("refresh");
      return router.refresh();
    },
  };
}
