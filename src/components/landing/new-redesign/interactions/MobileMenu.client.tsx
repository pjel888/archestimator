"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import menuStyles from "./mobile-menu.module.css";

type NavItem = { readonly label: string; readonly href: string };

export function MobileMenu({ items, primary, secondary }: { items: readonly NavItem[]; primary: NavItem; secondary?: NavItem }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigationId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className={menuStyles.menu}>
      <button ref={triggerRef} type="button" aria-expanded={open} aria-controls={navigationId} onClick={() => setOpen((value) => !value)}>
        {open ? "Close" : "Menu"}
      </button>
      {open ? (
        <nav id={navigationId} aria-label="Mobile navigation" className={menuStyles.panel}>
          {items.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}
          {secondary ? <Link href={secondary.href} onClick={() => setOpen(false)}>{secondary.label}</Link> : null}
          <Link href={primary.href} onClick={() => setOpen(false)}>{primary.label}</Link>
        </nav>
      ) : null}
    </div>
  );
}
