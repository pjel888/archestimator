"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { useLandingAuthHint } from "@/lib/landing/use-landing-auth-hint";
import { cn } from "@/lib/ui/cn";

import { headerCopy, preReleaseCopy } from "../_content";
import { AuthUtilityLink, PrimaryCtaLink } from "./cta-link";
import styles from "../kimi-landing.module.css";

/**
 * Compact route-owned header: pre-release strip, wordmark, primary nav, and
 * the auth-aware CTA. Turns into a thin translucent plate after scroll (one
 * blur layer, opaque fallback handled in CSS). Mobile swaps nav for an
 * accessible menu overlay.
 */
export function KimiSiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoggedIn = useLandingAuthHint();
  const brandLinkRef = useRef<HTMLAnchorElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuDialogRef = useRef<HTMLDivElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback((restoreTriggerFocus = true) => {
    setMenuOpen(false);
    if (restoreTriggerFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    const sentinel = document.querySelector<HTMLElement>(
      "[data-header-sentinel]",
    );
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrolled(!entry?.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const desktopMedia = window.matchMedia("(min-width: 881px)");
    const closeAtDesktop = () => {
      if (!desktopMedia.matches) return;

      setMenuOpen(false);
      requestAnimationFrame(() => brandLinkRef.current?.focus());
    };

    desktopMedia.addEventListener("change", closeAtDesktop);
    closeAtDesktop();

    return () => desktopMedia.removeEventListener("change", closeAtDesktop);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const dialog = menuDialogRef.current;
    const landingRoot = document.querySelector<HTMLElement>(
      "[data-kimi-landing]",
    );
    const backgroundRegions = landingRoot
      ? [
          landingRoot.querySelector<HTMLElement>("header"),
          landingRoot.querySelector<HTMLElement>("main"),
          landingRoot.querySelector<HTMLElement>("footer"),
        ].filter((region): region is HTMLElement => region !== null)
      : [];
    const previousInertStates = backgroundRegions.map(
      (region) => [region, region.inert] as const,
    );
    backgroundRegions.forEach((region) => {
      region.inert = true;
    });

    const focusFrame = requestAnimationFrame(() =>
      menuCloseRef.current?.focus(),
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key === "Tab" && dialog) {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        const first = focusable[0];
        const last = focusable.at(-1);

        if (!first || !last) {
          event.preventDefault();
          return;
        }

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousInertStates.forEach(([region, previousInert]) => {
        region.inert = previousInert;
      });
    };
  }, [closeMenu, menuOpen]);

  return (
    <>
      <header
        className={styles.header}
        data-scrolled={scrolled ? "" : undefined}
      >
        <div className={cn(styles.container, styles.headerMain)}>
          <Link
            ref={brandLinkRef}
            href="/kimi3d"
            className={styles.brandLink}
            aria-label={`${headerCopy.wordmark} home`}
          >
            <ArchestimatorLogo
              tone="dark"
              markSize={24}
              className={styles.headerLogo}
              wordmarkClassName={styles.headerLogoWordmark}
              separatorClassName={styles.headerLogoSeparator}
              priority
            />
          </Link>
          <nav className={styles.headerNav} aria-label="Primary">
            {headerCopy.nav.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.headerActions}>
            {!isLoggedIn ? (
              <AuthUtilityLink className={styles.signInLink} />
            ) : null}
            <PrimaryCtaLink />
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="kimi3d-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.menuButtonBars} aria-hidden="true">
              <span />
              <span />
            </span>
            {headerCopy.menuLabel}
          </button>
        </div>
      </header>

      <div
        ref={menuDialogRef}
        id="kimi3d-menu"
        className={styles.menuOverlay}
        hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label={headerCopy.menuTitle}
      >
        <button
          ref={menuCloseRef}
          type="button"
          className={styles.menuCloseButton}
          aria-label={headerCopy.menuCloseLabel}
          onClick={() => closeMenu()}
        >
          <span aria-hidden="true">×</span>
          {headerCopy.menuCloseText}
        </button>
        <nav className={styles.menuOverlayNav} aria-label="Menu">
          {headerCopy.nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => closeMenu()}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.menuOverlayMeta}>
          <span className={styles.monoLabel}>{preReleaseCopy.status}</span>
          <div>
            <PrimaryCtaLink />
          </div>
          {!isLoggedIn ? (
            <AuthUtilityLink className={styles.signInLink} />
          ) : null}
        </div>
      </div>
    </>
  );
}
